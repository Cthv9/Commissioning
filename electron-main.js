const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

let serverProcess;
const appId = 'com.portalecommissioning.app';

function getAppIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.ico');
  }
  return path.join(__dirname, 'build', 'icon.ico');
}

// Dialog nativo per scegliere cartelle (utile su PC aziendali senza Dev Mode)
ipcMain.handle('df:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});


function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
    const backupDir = path.join(app.getPath('userData'), 'backup');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORTALE_BACKUP_DIR: backupDir },
    stdio: 'inherit',
  });

  serverProcess.on('error', (error) => {
    console.error('Errore avvio server:', error);
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}

function waitForServer(url, attempts = 30, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (attempts <= 0) {
          reject(new Error('Server non raggiungibile'));
          return;
        }
        attempts -= 1;
        setTimeout(tryRequest, delayMs);
      });
    };

    tryRequest();
  });
}

function createWindow() {
  // Remove the default menu ("File", "Help", ...) so the app feels native
  Menu.setApplicationMenu(null);

  const iconPath = getAppIconPath();
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    useContentSize: true,
    autoHideMenuBar: true,
    icon: iconPath,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL('http://127.0.0.1:3000/index.html');
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(appId);
  }
  startServer();
  try {
    await waitForServer('http://127.0.0.1:3000/index.html');
  } catch (error) {
    console.error(error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
