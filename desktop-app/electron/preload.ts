import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Docker management
  dockerStatus: () => ipcRenderer.invoke('docker:status'),
  dockerStart: () => ipcRenderer.invoke('docker:start'),
  dockerStop: () => ipcRenderer.invoke('docker:stop'),

  // Health check
  healthCheck: () => ipcRenderer.invoke('health:check'),

  // File handling
  selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      dockerStatus: () => Promise<boolean>;
      dockerStart: () => Promise<boolean>;
      dockerStop: () => Promise<boolean>;
      healthCheck: () => Promise<{ status: string }>;
      selectFiles: () => Promise<string[]>;
      getVersion: () => Promise<string>;
    };
  }
}
