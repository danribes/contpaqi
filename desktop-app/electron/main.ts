import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let dockerProcess: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Docker management
async function checkDockerStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('docker', ['ps'], { shell: true });
    process.on('close', (code) => {
      resolve(code === 0);
    });
    process.on('error', () => {
      resolve(false);
    });
  });
}

async function startContainer(): Promise<boolean> {
  return new Promise((resolve) => {
    dockerProcess = spawn('docker-compose', ['up', '-d'], {
      cwd: path.join(__dirname, '../../mcp-container'),
      shell: true,
    });

    dockerProcess.on('close', (code) => {
      resolve(code === 0);
    });

    dockerProcess.on('error', () => {
      resolve(false);
    });
  });
}

async function stopContainer(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('docker-compose', ['down'], {
      cwd: path.join(__dirname, '../../mcp-container'),
      shell: true,
    });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}

// IPC handlers
ipcMain.handle('docker:status', async () => {
  return checkDockerStatus();
});

ipcMain.handle('docker:start', async () => {
  return startContainer();
});

ipcMain.handle('docker:stop', async () => {
  return stopContainer();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Stop container on app close
  await stopContainer();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
