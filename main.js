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
    width: 300,
    height: 400,
    show: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      contextIsolation: false,
      nodeIntegration: true,
    },
  });
  win.loadFile('index.html');
  win.on('close', e => { e.preventDefault(); win.hide(); });
}

const formatTime = s => `${Math.floor(s / 60)}m ${s % 60}s`;

function playSound (state) {
  const sound = state === 'Focus'
    ? 'focus-alert.mp3'
    : 'break-alert.mp3';

  const filePath = path.join(__dirname, sound);

  exec(`afplay "${filePath}"`, (err) => {
    if (err) {
      console.error('Error playing sound:', err);
    }
  });

  new Notification({
    title: state === 'Focus' ? 'Focus Done!' : 'Break Done!',
    body: '⏰ Time is up!',
    silent: false
  }).show();
}


function updateTray () {
  tray.setTitle(`${isPaused ? '⏸' : timerState} | ${formatTime(elapsedTime)} | Focus: ${focusCount} | Breaks: ${breakCount}`);
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
  clearInterval(timerInterval);
  timerInterval = setInterval(() => tickTimer(state), 1000);
}

/* ---------- tray menu ---------- */
function buildContextMenu () {
  return Menu.buildFromTemplate([
    { label: 'Start Focus Timer', click: () => startTimer(15 * 6, 'Focus') }, // 15 min
    { label: 'Start Break Timer', click: () => startTimer(5 * 6, 'Break') },  // 5 min
    {
      label: isPaused ? 'Resume Timer' : 'Pause Timer',
      click: () => { isPaused = !isPaused; tray.setContextMenu(buildContextMenu()); }
    },
    { label: 'Show Timer', click: () => win.show() },
    { label: 'Quit', click: () => { clearInterval(timerInterval); app.exit(); } },
  ]);
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
