const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let win;
let tray;

function createWindow () {
  win = new BrowserWindow({
    width: 300,
    height: 400,
    show: false, // hide at launch
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
    win.hide(); // hide instead of close
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, 'tray-icon.png')); // use a real PNG file here!
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Timer',
      click: () => win.show()
    },
    {
      label: 'Quit',
      click: () => {
        app.exit();
      }
    }
  ]);
  tray.setToolTip('Pomodoro Timer');
  tray.setContextMenu(contextMenu);
});
