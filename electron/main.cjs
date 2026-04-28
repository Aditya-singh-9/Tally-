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

// Invisible Scraper Logic
const { ipcMain } = require('electron');

ipcMain.handle('scrape-gstin', async (event, gstin) => {
  return new Promise((resolve) => {
    const scraperWindow = new BrowserWindow({
      show: false, // Invisible
      webPreferences: { nodeIntegration: false }
    });

    // 15 sec timeout
    let timeout = setTimeout(() => {
      if (!scraperWindow.isDestroyed()) scraperWindow.destroy();
      resolve({ error: 'Scraping timed out (15s).' });
    }, 15000);

    // Using a simple aggregate site (Quicko / ClearTax style search)
    // We try to load a google search directly since it often shows the company name in the preview snippet
    // This is much faster and doesn't rely on specific button clicks
    scraperWindow.loadURL(`https://html.duckduckgo.com/html/?q=GSTIN+${gstin}`);

    scraperWindow.webContents.on('did-finish-load', async () => {
      try {
        const result = await scraperWindow.webContents.executeJavaScript(`
          new Promise((res) => {
            setTimeout(() => {
              const text = document.body.innerText;
              
              // Basic extraction logic looking for common patterns
              const nameMatch = text.match(/(?:Legal Name|Trade Name|Business Name)[\\s:]+([A-Z0-9\\s\\.\\-]+)/i);
              const addressMatch = text.match(/(?:Principal Place of Business|Address)[\\s:]+([^\\n]+)/i);
              
              if (nameMatch) {
                res({
                  name: nameMatch[1].trim(),
                  address: addressMatch ? addressMatch[1].trim() : 'Address not found'
                });
              } else {
                // Fallback: Just grab the first title result which is usually the business name
                const firstResult = document.querySelector('.result__title');
                if (firstResult && firstResult.innerText) {
                  // Usually looks like "M/S SOME BUSINESS NAME - GSTIN Details..."
                  let name = firstResult.innerText.split('-')[0].replace('GSTIN Details', '').trim();
                  res({ name: name, address: 'Address not found on DuckDuckGo' });
                } else {
                  res({ error: 'Could not extract details automatically.' });
                }
              }
            }, 1000); // give duckduckgo 1s to render text
          });
        `);
        clearTimeout(timeout);
        scraperWindow.destroy();
        resolve(result);
      } catch (err) {
        clearTimeout(timeout);
        scraperWindow.destroy();
        resolve({ error: err.message });
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
