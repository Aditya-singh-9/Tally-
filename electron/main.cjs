'use strict';

const { app, BrowserWindow, dialog, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
    backgroundColor: '#0f0f23',
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();

    // Initialize auto updater 3 seconds after launch (production only)
    if (!isDev) {
      setTimeout(() => {
        const { initUpdater } = require('./updater.cjs');
        initUpdater(mainWindow);
      }, 3000);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // App menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [{ label: 'Quit Tally', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            if (process.env.NODE_ENV !== 'development') {
              const { checkManually } = require('./updater.cjs');
              checkManually(mainWindow);
            } else {
              dialog.showMessageBox(mainWindow, { type: 'info', message: 'Auto-update not available in dev mode.', buttons: ['OK'] });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'About Tally Software',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Tally Software',
              message: 'Tally Software',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
