const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const focusBtn = document.getElementById('startFocusBtn');
  const breakBtn = document.getElementById('startBreakBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const altBtn = document.getElementById('altSessionBtn');

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
  });
  ipcRenderer.on('play-sound', (_e, state) => {
    const audio = new Audio(`assets/${state === 'Focus' ? 'focus-alert.mp3' : 'break-alert.mp3'}`);
    audio.play().catch(console.error);
  });
});