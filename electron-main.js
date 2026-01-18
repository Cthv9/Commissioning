const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

let serverProcess;

function startServer() {
  const serverPath = path.join(__dirname, 'server.js');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
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
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:3000/index.html');
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer('http://localhost:3000/index.html');
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
