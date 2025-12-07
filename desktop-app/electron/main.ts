/**
 * Electron Main Process
 * Subtask 13.2: Configure Electron main process
 * Subtask 13.3: Docker status checking
 *
 * Handles:
 * - Window creation and lifecycle
 * - Docker container management
 * - IPC communication with renderer
 * - Application menu
 * - File dialogs
 * - Health check polling
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { DockerManager, DockerStatus } from './docker-manager';

// Constants
const CONTAINER_NAME = 'mcp-container';
const HEALTH_URL = 'http://localhost:8000/health';
const MCP_CONTAINER_PATH = path.join(__dirname, '../../mcp-container');

// State
let mainWindow: BrowserWindow | null = null;
let dockerProcess: ChildProcess | null = null;
let isQuitting = false;

// Docker Manager instance
const dockerManager = new DockerManager(CONTAINER_NAME);

/**
 * Request single instance lock to prevent multiple app instances
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Contpaqi AI Bridge',
    backgroundColor: '#1f2937', // Tailwind gray-800
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent closing if processing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      handleAppClose();
    }
  });
}

/**
 * Create application menu
 */
function createMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Invoice...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const files = await selectPdfFiles();
            if (files.length > 0 && mainWindow) {
              mainWindow.webContents.send('files:selected', files);
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://docs.contpaqi.com/ai-bridge');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/contpaqi/ai-bridge/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Contpaqi AI Bridge',
              message: `Contpaqi AI Bridge v${app.getVersion()}`,
              detail: 'AI-powered invoice processing for Contpaqi accounting software.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Handle graceful app close
 */
async function handleAppClose(): Promise<void> {
  const choice = await dialog.showMessageBox(mainWindow!, {
    type: 'question',
    buttons: ['Cancel', 'Quit'],
    defaultId: 1,
    title: 'Confirm',
    message: 'Are you sure you want to quit?',
    detail: 'The Docker container will be stopped.',
  });

  if (choice.response === 1) {
    isQuitting = true;
    await stopContainer();
    app.quit();
  }
}

// =============================================================================
// Docker Management
// =============================================================================

/**
 * Check Docker and container status using DockerManager
 * Returns comprehensive status information
 */
async function checkDockerStatus(): Promise<DockerStatus> {
  return dockerManager.getFullStatus();
}

/**
 * Check if Docker daemon is running (legacy format for backward compatibility)
 */
async function checkDockerStatusLegacy(): Promise<{ running: boolean; containerStatus: string }> {
  const status = await dockerManager.getFullStatus();
  return {
    running: status.isDaemonRunning,
    containerStatus: status.isDaemonRunning
      ? status.containerState
      : 'docker_not_running',
  };
}

/**
 * Start the MCP container
 */
async function startContainer(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    dockerProcess = spawn('docker-compose', ['up', '-d'], {
      cwd: MCP_CONTAINER_PATH,
      shell: true,
    });

    let errorOutput = '';

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: errorOutput || 'Failed to start container' });
      }
    });

    dockerProcess.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Stop the MCP container
 */
async function stopContainer(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const process = spawn('docker-compose', ['down'], {
      cwd: MCP_CONTAINER_PATH,
      shell: true,
    });

    let errorOutput = '';

    process.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      dockerProcess = null;
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: errorOutput || 'Failed to stop container' });
      }
    });

    process.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check MCP container health
 */
async function checkHealth(): Promise<{ healthy: boolean; status?: string; error?: string }> {
  try {
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return { healthy: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      healthy: data.status === 'healthy',
      status: data.status,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// File Dialogs
// =============================================================================

/**
 * Open file dialog to select PDF files
 */
async function selectPdfFiles(): Promise<string[]> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Invoice PDFs',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths;
}

// =============================================================================
// IPC Handlers
// =============================================================================

function registerIpcHandlers(): void {
  // Docker management
  ipcMain.handle('docker:status', async () => {
    return checkDockerStatus();
  });

  ipcMain.handle('docker:start', async () => {
    return startContainer();
  });

  ipcMain.handle('docker:stop', async () => {
    return stopContainer();
  });

  // Health check
  ipcMain.handle('health:check', async () => {
    return checkHealth();
  });

  // File dialogs
  ipcMain.handle('dialog:selectFiles', async () => {
    return selectPdfFiles();
  });

  // App info
  ipcMain.handle('app:version', async () => {
    return app.getVersion();
  });

  // Window control
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
}

// =============================================================================
// App Lifecycle
// =============================================================================

app.whenReady().then(() => {
  createMenu();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  await stopContainer();
});

// Security: Disable navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' &&
        parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});
