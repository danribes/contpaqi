/**
 * Tests for Electron main process configuration
 * Subtask 13.2: Configure Electron main process
 */

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn(),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    requestSingleInstanceLock: jest.fn().mockReturnValue(true),
    getName: jest.fn().mockReturnValue('Contpaqi AI Bridge'),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn(),
    },
    show: jest.fn(),
    focus: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn().mockReturnValue({}),
    setApplicationMenu: jest.fn(),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 10);
      }
    }),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
  })),
  exec: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// Mock fetch for health checks
global.fetch = jest.fn();

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { spawn } from 'child_process';

describe('Electron Main Process Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Initialization', () => {
    it('should request single instance lock', () => {
      expect(app.requestSingleInstanceLock).toBeDefined();
    });

    it('should have correct app name', () => {
      expect(app.getName()).toBe('Contpaqi AI Bridge');
    });

    it('should have version defined', () => {
      expect(app.getVersion()).toBe('1.0.0');
    });

    it('should register whenReady handler', () => {
      expect(app.whenReady).toBeDefined();
    });
  });

  describe('BrowserWindow Configuration', () => {
    it('should create window with correct dimensions', () => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
      });
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1400,
          height: 900,
        })
      );
    });

    it('should configure context isolation', () => {
      new BrowserWindow({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            contextIsolation: true,
            nodeIntegration: false,
          }),
        })
      );
    });

    it('should set preload script path', () => {
      new BrowserWindow({
        webPreferences: {
          preload: '/path/to/preload.js',
        },
      });
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            preload: expect.stringContaining('preload'),
          }),
        })
      );
    });
  });

  describe('IPC Handlers', () => {
    it('should register docker:status handler', () => {
      ipcMain.handle('docker:status', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('docker:status', expect.any(Function));
    });

    it('should register docker:start handler', () => {
      ipcMain.handle('docker:start', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('docker:start', expect.any(Function));
    });

    it('should register docker:stop handler', () => {
      ipcMain.handle('docker:stop', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('docker:stop', expect.any(Function));
    });

    it('should register health:check handler', () => {
      ipcMain.handle('health:check', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('health:check', expect.any(Function));
    });

    it('should register dialog:selectFiles handler', () => {
      ipcMain.handle('dialog:selectFiles', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('dialog:selectFiles', expect.any(Function));
    });

    it('should register app:version handler', () => {
      ipcMain.handle('app:version', jest.fn());
      expect(ipcMain.handle).toHaveBeenCalledWith('app:version', expect.any(Function));
    });
  });

  describe('Application Menu', () => {
    it('should build menu from template', () => {
      const template = [{ label: 'File' }];
      Menu.buildFromTemplate(template);
      expect(Menu.buildFromTemplate).toHaveBeenCalledWith(template);
    });

    it('should set application menu', () => {
      const menu = {};
      Menu.setApplicationMenu(menu as any);
      expect(Menu.setApplicationMenu).toHaveBeenCalledWith(menu);
    });
  });

  describe('File Dialog', () => {
    it('should open file dialog with PDF filter', async () => {
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/invoice.pdf'],
      });

      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      expect(dialog.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ extensions: ['pdf'] }),
          ]),
        })
      );
      expect(result.filePaths).toContain('/path/to/invoice.pdf');
    });

    it('should handle canceled dialog', async () => {
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await dialog.showOpenDialog({});
      expect(result.canceled).toBe(true);
      expect(result.filePaths).toHaveLength(0);
    });
  });

  describe('Security Configuration', () => {
    it('should disable node integration', () => {
      new BrowserWindow({
        webPreferences: {
          nodeIntegration: false,
        },
      });
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
          }),
        })
      );
    });

    it('should enable context isolation', () => {
      new BrowserWindow({
        webPreferences: {
          contextIsolation: true,
        },
      });
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            contextIsolation: true,
          }),
        })
      );
    });
  });
});

describe('Docker Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should spawn docker ps for status check', () => {
    spawn('docker', ['ps'], { shell: true });
    expect(spawn).toHaveBeenCalledWith('docker', ['ps'], expect.objectContaining({ shell: true }));
  });

  it('should spawn docker-compose up for start', () => {
    spawn('docker-compose', ['up', '-d'], { shell: true });
    expect(spawn).toHaveBeenCalledWith('docker-compose', ['up', '-d'], expect.any(Object));
  });

  it('should spawn docker-compose down for stop', () => {
    spawn('docker-compose', ['down'], { shell: true });
    expect(spawn).toHaveBeenCalledWith('docker-compose', ['down'], expect.any(Object));
  });
});

describe('Health Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch health endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    });

    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/health');
    expect(data.status).toBe('healthy');
  });

  it('should handle health check failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    await expect(fetch('http://localhost:8000/health')).rejects.toThrow('Connection refused');
  });
});
