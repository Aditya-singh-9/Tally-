'use strict';

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function initUpdater(mainWindow) {
  // Silent check on startup
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Update check failed:', err.message);
  });

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Tally Software v${info.version} is available!`,
      detail: 'A new version has been released. Download and install it now?',
      buttons: ['Download & Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Tally Software is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    if (mainWindow) {
      mainWindow.setProgressBar(progress.percent / 100);
      mainWindow.setTitle(`Tally Software — Downloading Update ${percent}% (${formatBytes(progress.transferred)} / ${formatBytes(progress.total)})`);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
      mainWindow.setTitle('Tally Software');
    }
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded!',
      detail: 'Restart Tally Software now to apply the latest update.',
      buttons: ['Restart & Update', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
  });
}

function checkManually(mainWindow) {
  autoUpdater.checkForUpdates()
    .then((result) => {
      if (!result || !result.updateInfo) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'No Updates',
          message: 'Tally Software is up to date.',
          buttons: ['OK'],
        });
      }
    })
    .catch((err) => {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not reach the update server.',
        detail: err.message,
        buttons: ['OK'],
      });
    });
}

module.exports = { initUpdater, checkManually };
