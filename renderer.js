const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const focusBtn = document.getElementById('startFocusBtn');
  const breakBtn = document.getElementById('startBreakBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const altBtn = document.getElementById('altSessionBtn');
  const speakToggle = document.getElementById('speakTimeToggle');
  const autoStartHourInput = document.getElementById('autoStartHour');
  const autoStartEnable = document.getElementById('autoStartEnable');

  let isPaused = false;

  document.getElementById('startFocusBtn').addEventListener('click', () => {
    const focusMinutes = parseInt(document.getElementById('focusMinutes').value, 10) || 15;
    ipcRenderer.send('start-timer', { mode: 'Focus', minutes: focusMinutes });
    window.close();
  });

  document.getElementById('startBreakBtn').addEventListener('click', () => {
    const breakMinutes = parseInt(document.getElementById('breakMinutes').value, 10) || 5;
    ipcRenderer.send('start-timer', { mode: 'Break', minutes: breakMinutes });
    window.close();
  });

  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    ipcRenderer.send('toggle-pause', isPaused);
  });

  altBtn.addEventListener('click', () => {
    const mode = altBtn.dataset.mode;
    const minutes = mode === 'Focus'
      ? parseInt(document.getElementById('focusMinutes').value, 10) || 15
      : parseInt(document.getElementById('breakMinutes').value, 10) || 5;

    ipcRenderer.send('start-timer', { mode, minutes });
    window.close();
  });

  document.getElementById('dismissBtn').addEventListener('click', () => {
    window.close();
  });

  // Speak time toggle -> main process
  if (speakToggle) {
    speakToggle.addEventListener('change', () => {
      ipcRenderer.send('toggle-speak-time', speakToggle.checked);
    });
  }

  if (autoStartHourInput) {
    autoStartHourInput.addEventListener('change', () => {
      const v = parseInt(autoStartHourInput.value, 10);
      if (!Number.isNaN(v) && v >= 0 && v <= 23) {
        ipcRenderer.send('update-auto-start-hour', v);
      }
    });
  }
  if (autoStartEnable) {
    autoStartEnable.addEventListener('change', () => {
      // reuse existing mechanism: toggling autoStartEnabled only in main through manual editing currently
      // we simulate toggle by sending hour again (already handler) and request main to enable via existing tray? For now just send IPC for enabling logic extension.
      ipcRenderer.send('update-auto-start-hour', parseInt(autoStartHourInput.value,10));
      ipcRenderer.send('toggle-auto-start', autoStartEnable.checked);
    });
  }

  // Request initial preferences (in case default changes later)
  ipcRenderer.send('request-prefs');
  ipcRenderer.on('preferences-state', (_e, prefs) => {
    if (speakToggle) speakToggle.checked = !!prefs.speakTimeEnabled;
    if (autoStartHourInput && typeof prefs.autoStartHour === 'number') autoStartHourInput.value = prefs.autoStartHour;
    if (autoStartEnable) autoStartEnable.checked = !!prefs.autoStartEnabled;
  });

  // ✅ Now safe: listener just updates UI
  ipcRenderer.on('timer-update', (event, { elapsedTime, timerState, focusCount, breakCount }) => {
    document.getElementById('timer').textContent = `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`;
    document.getElementById('mode').textContent = `Mode: ${timerState}`;
    document.getElementById('counts').textContent = `Focus: ${focusCount} | Breaks: ${breakCount}`;

    if (timerState === 'Idle') {
      focusBtn.style.display = 'inline-block';
      breakBtn.style.display = 'inline-block';
    } else if (timerState === 'Focus') {
      // focusBtn.style.display = 'none';
      // breakBtn.style.display = 'inline-block'; // not needed, since already inside the alert block
    } else if (timerState === 'Break') {
      // focusBtn.style.display = 'inline-block'; // not needed, since already inside the alert block
      // breakBtn.style.display = 'none';
    }
    
    if (timerState === 'Idle') {
      pauseBtn.style.display = 'none';
    } else {
      pauseBtn.style.display = 'inline-block';
      focusBtn.style.display = 'inline-block'; // now needed this because to apply timer
      breakBtn.style.display = 'inline-block'; // now needed this because to apply timer
      altBtn.style.display = 'none'; // not need this now.
    }
  });

  ipcRenderer.on('session-ended', (_e, state) => {
    const box = document.getElementById('sessionMessage');
    const title = document.getElementById('messageTitle');
    const text = document.getElementById('messageText');

    title.textContent = state === 'Focus' ? '🎉 Focus Complete!' : '☕ Break Over!';
    text.textContent = state === 'Focus' ? 'Time for a break.' : 'Back to work!';

    // altBtn.textContent = state === 'Focus' ? 'Start Break' : 'Start Focus';
    // altBtn.dataset.mode = state === 'Focus' ? 'Break' : 'Focus';

    box.style.display = 'block';
    queueMicrotask(reportSize);
  });
  // --- Sound amplification strategy ---
  // 1. Prefer Web Audio API (allows gain > 1.0 without layering hack)
  // 2. Fallback to layered HTMLAudio elements if context creation fails
  const SOUND_GAIN = 1.8; // raise/lower to taste; >2.0 may introduce clipping
  const LAYER_FALLBACK_COUNT = 3; // used only if Web Audio not available
  let audioCtx = null;
  const audioBufferCache = new Map(); // filename -> AudioBuffer

  async function ensureContext () {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    return audioCtx;
  }

  async function loadBuffer (file) {
    if (audioBufferCache.has(file)) return audioBufferCache.get(file);
    const res = await fetch(`assets/${file}`);
    const arr = await res.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(arr);
    audioBufferCache.set(file, buf);
    return buf;
  }

  function fallbackLayerPlay (file) {
    for (let i = 0; i < LAYER_FALLBACK_COUNT; i++) {
      const a = new Audio(`assets/${file}`);
      a.volume = 1.0;
      if (i > 0) {
        setTimeout(() => a.play().catch(() => {}), i * 90); // small stagger to thicken
      } else {
        a.play().catch(() => {});
      }
    }
  }

  async function playLoud (file) {
    const ctx = await ensureContext();
    if (!ctx) {
      fallbackLayerPlay(file);
      return;
    }
    try {
      const buffer = await loadBuffer(file);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = SOUND_GAIN;
      source.connect(gain).connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.error('Web Audio playback failed, falling back:', e);
      fallbackLayerPlay(file);
    }
  }

  ipcRenderer.on('play-sound', async (_e, state) => {
    const file = state === 'Focus' ? 'focus-alert.mp3' : 'break-alert.mp3';
    playLoud(file);
  });

  function reportSize () {
    try {
      const bodyRect = document.body.getBoundingClientRect();
      ipcRenderer.send('content-size', { width: bodyRect.width + 20, height: bodyRect.height + 20 });
    } catch (e) { /* ignore */ }
  }

  // Initial size after render
  setTimeout(reportSize, 60);
  window.addEventListener('resize', () => reportSize());

  ipcRenderer.on('speak-time', (_e, payload) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const d = new Date(payload.iso);
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const minutePart = minutes === 0 ? '' : `:${minutes.toString().padStart(2,'0')}`;
      const timeStr = `${h12}${minutePart} ${ampm}`;
      const modeStr = (payload.state || '').toLowerCase(); // 'focus' or 'break'
      // New order: mode first then time -> "on break, 1:30 pm" or "on focus, 2 pm"
      const phrase = `on ${modeStr}, ${timeStr}`;
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch (err) {
      console.error('Speak time failed:', err);
    }
  });
});