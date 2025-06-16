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

const formatTime = s => `${Math.floor(s / 60)}m ${s % 60}s`;

function playSound (state) {
  // const sound = state === 'Focus'
  //   ? 'focus-alert.mp3'
  //   : 'break-alert.mp3';
  // const filePath = path.join(__dirname, sound);

  // Play sound
  // exec(`afplay "${filePath}"`, err => {
  //   if (err) console.error('Error playing sound:', err);
  // });
  win.webContents.send('play-sound', state);

  // Native notification
  new Notification({
    title: state === 'Focus' ? 'Focus Done!' : 'Break Done!',
    body: '⏰ Time is up!',
    silent: false
  }).show();

  // Show window and flash dock icon
  if (win) {
    win.show();          // bring to front
    win.webContents.send('timer-update', {
      elapsedTime,
      timerState,
      focusCount,
      breakCount
    });
    win.setSize(400, 720)
    win.focus();         // focus if possible
    app.dock?.bounce();  // macOS dock bounce (if supported)
  }

  // Optional: show alert in renderer
  win?.webContents.send('session-ended', state);
}


function updateTray () {
  const status = isPaused ? '⏸ Paused' : (timerState === 'Focus' ? 'Focusing' : timerState === 'Break' ? 'On Break' : 'Idle');
  tray.setTitle(`${status}: ${formatTime(elapsedTime)}`);
}


/* ---------- timer logic ---------- */
function tickTimer (state) {
  if (isPaused) return;

  elapsedTime++;
  updateTray();

  win?.webContents.send('timer-update', { elapsedTime, timerState, focusCount, breakCount });

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
  timerInterval = setInterval(() => tickTimer(state), 1000);
  tray.setContextMenu(buildContextMenu()); // refresh tray to show correct pause label
}


/* ---------- tray menu ---------- */
function buildContextMenu () {
  const menu = [
    { label: 'Start Focus Timer', click: () => startTimer(15 * 60, 'Focus') },
    { label: 'Start Break Timer', click: () => startTimer(5 * 60, 'Break') },
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
      label: 'Show Window', click: () => {
        win.show();
        win.webContents.on('did-finish-load', () => {
          win.webContents.setZoomFactor(1.0);
        });
        win.webContents.send('timer-update', {
          elapsedTime,
          timerState,
          focusCount,
          breakCount
        });
        win.setSize(400, 450);
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
});

/* ---------- renderer pause toggle ---------- */
ipcMain.on('toggle-pause', (_e, pauseState) => {
  isPaused = pauseState;
  tray.setContextMenu(buildContextMenu());
});

ipcMain.on('start-timer', (_e, { mode, minutes }) => {
  const duration = minutes * 60;
  startTimer(duration, mode);
});