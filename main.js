const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');

const path = require('path');
const { exec } = require('child_process');

let win, tray, timerInterval;
let timerState = 'Idle';
let elapsedTime = 0;
let intervalDuration = 0;
let focusCount = 0;
let breakCount = 0;
let isPaused = false;
// User preference: start in non-intrusive mode (no forced window focus)
let intrusivePopupsEnabled = false; // can be toggled from tray menu
// (Disabled) previous flashing mechanism state holders (kept for potential re-enable)
let completionTitleTimeout = null; // unused now
let completionFlashInterval = null; // unused now
let autoStartEnabled = false; // user toggle: auto start focus at 8AM
let lastAutoStartDay = null; // to ensure single auto-start per calendar day
let autoStartHour = 8; // default auto start hour (24h format)

// (Flashing disabled) constants retained for easy future restoration
const COMPLETION_FLASH_INTERVAL_MS = 650;
const COMPLETION_FLASH_CYCLES = 8;

/* ---------- configurable defaults (minutes) ---------- */
// Central place to tweak default session lengths used by tray quick actions.
// Renderer UI still allows custom overrides and sends explicit minutes.
const DEFAULT_FOCUS_MINUTES = 10;
const DEFAULT_BREAK_MINUTES = 5;
// For debugging you can change this (e.g. set to 1 or 5) to accelerate sessions
// const SECONDS_PER_MINUTE = 1;
const SECONDS_PER_MINUTE = 60;
// Mutable user-selected durations (updated from renderer inputs)
let userFocusMinutes = DEFAULT_FOCUS_MINUTES;
let userBreakMinutes = DEFAULT_BREAK_MINUTES;
// User-controlled (via renderer settings) speak-time preference
let speakTimeEnabled = true;

/* ---------- helpers ---------- */
function createWindow () {
  win = new BrowserWindow({
    width: 400,
    height: 450,
    minWidth: 300,
    minHeight: 400,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  win.loadFile('index.html');
  win.on('close', e => { e.preventDefault(); win.hide(); });
}

// Safely send IPC to renderer (skip if destroyed)
function safeSend (channel, payload) {
  if (!win) return false;
  if (win.isDestroyed()) return false;
  const wc = win.webContents;
  if (!wc || wc.isDestroyed()) return false;
  try {
    wc.send(channel, payload);
    return true;
  } catch (e) {
    return false;
  }
}

// Fallback system sound if renderer is gone
function playSystemSoundFallback (state) {
  try {
    const sound = state === 'Focus' ? 'focus-alert.mp3' : 'break-alert.mp3';
    const filePath = path.join(__dirname, 'assets', sound);
    exec(`afplay "${filePath.replace(/"/g, '\"')}"`);
  } catch (_) { /* ignore */ }
}

const formatTime = s => `${Math.floor(s / SECONDS_PER_MINUTE)}m ${s % SECONDS_PER_MINUTE}s`;

function playSound (state) {
  // Trigger renderer to play appropriate sound asset (focus-alert/break-alert)
  const sent = safeSend('play-sound', state);
  if (!sent) {
    // Renderer not available; play a native sound fallback
    playSystemSoundFallback(state);
  }

  // Always show a native notification (lets macOS handle presentation / DND)
  new Notification({
    title: state === 'Focus' ? 'Focus complete' : 'Break complete',
    body: state === 'Focus' ? 'Time for a break.' : 'Back to work!',
    silent: false
  }).show();

  // Update renderer silently (in case window is already open)
    safeSend('timer-update', { elapsedTime, timerState, focusCount, breakCount, intervalDuration });
    safeSend('session-ended', state);
    if (speakTimeEnabled) {
      safeSend('speak-time', { iso: new Date().toISOString(), state });
  }

  // Tray title no longer overridden on completion (requested: keep stable menubar text)

  // Optional intrusive behavior (user-toggleable) replicates old popup focus
  if (intrusivePopupsEnabled && win) {
    win.show();
    win.focus();
    app.dock?.bounce();
  }
}

// NOTE: indicateSessionCompletion disabled per request (menubar text should not change)
function indicateSessionCompletion () { /* intentionally no-op */ }


function updateTray () {
  const status = isPaused ? '⏸ Paused' : (timerState === 'Focus' ? 'Focusing' : timerState === 'Break' ? 'On Break' : 'Idle');
  tray.setTitle(`${status}: ${formatTime(elapsedTime)}`);
}


/* ---------- timer logic ---------- */
function tickTimer (state) {
  if (isPaused) return;

  elapsedTime++;
  updateTray();

  safeSend('timer-update', { elapsedTime, timerState, focusCount, breakCount, intervalDuration });

  if (elapsedTime % intervalDuration === 0) {
    playSound(state);
    if (state === 'Focus') focusCount++; else breakCount++;
  }
}

function startTimer (duration, state) {
  timerState = state;
  elapsedTime = 0;
  intervalDuration = duration;
  isPaused = false; // ✅ Always resume on new timer
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    // Stop if renderer destroyed completely to avoid error spam
    if (!win || win.isDestroyed() || (win.webContents && win.webContents.isDestroyed())) {
      clearInterval(timerInterval);
      timerInterval = null;
      return;
    }
    tickTimer(state);
  }, 1000);
  tray.setContextMenu(buildContextMenu()); // refresh tray to show correct pause label
  // Play an immediate preview sound so user hears start cue (no notification)
  if (!safeSend('play-sound', state)) {
    playSystemSoundFallback(state); // fallback preview
  }
}


/* ---------- tray menu ---------- */
function buildContextMenu () {
  const menu = [
  { label: `Start Focus (${userFocusMinutes}m)`, click: () => startTimer(userFocusMinutes * SECONDS_PER_MINUTE, 'Focus') },
  { label: `Start Break (${userBreakMinutes}m)`, click: () => startTimer(userBreakMinutes * SECONDS_PER_MINUTE, 'Break') },
  ];

  if (timerState !== 'Idle') {
    menu.push({
      label: isPaused ? 'Resume Timer' : 'Pause Timer',
      click: () => {
        isPaused = !isPaused;
        tray.setContextMenu(buildContextMenu());
      }
    });
  }

  menu.push(
    {
      label: intrusivePopupsEnabled ? 'Disable Popups on Complete' : 'Enable Popups on Complete',
      type: 'checkbox',
      checked: intrusivePopupsEnabled,
      click: () => {
        intrusivePopupsEnabled = !intrusivePopupsEnabled;
        tray.setContextMenu(buildContextMenu());
      }
    },
    {
      label: 'Auto Start Focus 8AM',
      type: 'checkbox',
      checked: autoStartEnabled,
      click: () => {
        autoStartEnabled = !autoStartEnabled;
        // Reset last auto start day so if toggled on before today's 8AM and time hasn't passed, it can trigger
        if (!lastAutoStartDay) lastAutoStartDay = null;
        tray.setContextMenu(buildContextMenu());
      }
    },
    {
      label: 'Show Window', click: () => {
        win.show();
        win.webContents.on('did-finish-load', () => {
          win.webContents.setZoomFactor(1.0);
        });
        win.webContents.send('timer-update', {
          elapsedTime,
          timerState,
          focusCount,
          breakCount,
          intervalDuration
        });
      }
    },
    { label: 'Quit', click: () => { clearInterval(timerInterval); app.exit(); } }
  );

  return Menu.buildFromTemplate(menu);
}


/* ---------- app lifecycle ---------- */
app.whenReady().then(() => {
  createWindow();
  tray = new Tray(nativeImage.createEmpty());
  tray.setContextMenu(buildContextMenu());
  updateTray();
  // Start periodic check for 8AM auto start (every 15s keeps power usage low)
  setInterval(() => maybeAutoStartFocus(), 15000);
});

/* ---------- renderer pause toggle ---------- */
ipcMain.on('toggle-pause', (_e, pauseState) => {
  isPaused = pauseState;
  tray.setContextMenu(buildContextMenu());
});

ipcMain.on('start-timer', (_e, { mode, minutes }) => {
  const duration = minutes * SECONDS_PER_MINUTE;
  // Update remembered durations based on last explicit user input
  if (mode === 'Focus') {
    userFocusMinutes = minutes;
  } else if (mode === 'Break') {
    userBreakMinutes = minutes;
  }
  tray.setContextMenu(buildContextMenu()); // reflect new values in tray labels
  startTimer(duration, mode);
});

// Renderer reports content size for auto-resize
ipcMain.on('content-size', (_e, { width, height }) => {
  if (!win) return;
  const bounds = win.getBounds();
  const targetWidth = Math.max(300, Math.round(width));
  const targetHeight = Math.max(400, Math.round(height));
  if (bounds.width !== targetWidth || bounds.height !== targetHeight) {
    win.setSize(targetWidth, targetHeight, false);
  }
});

// Speak time toggle from renderer
ipcMain.on('toggle-speak-time', (_e, enabled) => {
  speakTimeEnabled = !!enabled;
});

// Renderer can request current preferences
ipcMain.on('request-prefs', (e) => {
  e.sender.send('preferences-state', { speakTimeEnabled, autoStartHour, autoStartEnabled });
});

// Update auto-start hour from renderer (expects integer 0-23)
ipcMain.on('update-auto-start-hour', (_e, hour) => {
  const h = parseInt(hour, 10);
  if (!Number.isNaN(h) && h >= 0 && h <= 23) {
    autoStartHour = h;
    // Allow re-trigger if new hour not yet passed today
    // (Do not reset lastAutoStartDay if already triggered and hour changed to past)
  }
});

ipcMain.on('toggle-auto-start', (_e, enabled) => {
  autoStartEnabled = !!enabled;
});

/* ---------- auto start (8AM) logic ---------- */
function maybeAutoStartFocus () {
  if (!autoStartEnabled) return;
  if (timerState !== 'Idle') return; // don't interrupt active session
  const now = new Date();
  // Only trigger exactly during configured hour at minute 0 (00–59s) once per day
  if (now.getHours() === autoStartHour && now.getMinutes() === 0) {
    const dayKey = now.toDateString();
    if (lastAutoStartDay !== dayKey) {
      lastAutoStartDay = dayKey;
      startTimer(userFocusMinutes * SECONDS_PER_MINUTE, 'Focus');
    }
  }
}