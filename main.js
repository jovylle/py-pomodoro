const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let win;
let tray;
let timerInterval;
let timerState = 'Idle';
let elapsedTime = 0;
let intervalDuration = 0;
let focusCount = 0; // Total focus sessions completed today
let breakCount = 0; // Total break sessions completed today

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
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
}

function formatTime (seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function playSound (state) {
  const soundPath =
    state === 'Focus'
      ? path.join(__dirname, 'focus-alert.mp3') // Focus mode sound
      : path.join(__dirname, 'break-alert.mp3'); // Break mode sound

  exec(`afplay "${soundPath}"`, (err) => {
    if (err) {
      console.error('Error playing sound:', err);
    }
  });
}

function updateTray () {
  const title = `${timerState} | ${formatTime(elapsedTime)} | Focus: ${focusCount} | Breaks: ${breakCount}`;
  tray.setTitle(title);
}

function startTimer (duration, state) {
  timerState = state;
  elapsedTime = 0;
  intervalDuration = duration;
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    elapsedTime++;
    updateTray();

    // Send updates to the renderer process
    if (win && win.webContents) {
      win.webContents.send('timer-update', {
        elapsedTime,
        timerState,
        focusCount,
        breakCount,
      });
    }

    // Play sound at regular intervals
    if (elapsedTime % intervalDuration === 0) {
      playSound(state);
      if (state === 'Focus') {
        focusCount++;
      } else if (state === 'Break') {
        breakCount++;
      }
    }
  }, 1000);
}

app.whenReady().then(() => {
  createWindow();

  const emptyImage = nativeImage.createEmpty();
  tray = new Tray(emptyImage);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start Focus Timer',
      click: () => startTimer(15*60, 'Focus'), // 15 seconds for testing
    },
    {
      label: 'Start Break Timer',
      click: () => startTimer(5*60, 'Break'), // 5 seconds for testing
    },
    {
      label: 'Show Timer',
      click: () => win.show(),
    },
    {
      label: 'Quit',
      click: () => {
        clearInterval(timerInterval);
        app.exit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  updateTray();
});