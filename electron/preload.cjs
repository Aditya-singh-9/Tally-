'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe Electron APIs to the React app
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('get-version'),
  scrapeGSTIN: (gstin) => ipcRenderer.invoke('scrape-gstin', gstin),
});
