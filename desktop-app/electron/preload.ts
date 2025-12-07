/**
 * Electron Preload Script
 * Subtask 13.2: Configure Electron main process
 * Subtask 13.3: Docker status checking
 *
 * Exposes safe APIs to the renderer process via contextBridge.
 * This is the only way for the renderer to communicate with the main process
 * when contextIsolation is enabled.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Docker status information exposed to renderer
 */
export interface DockerStatusInfo {
  isDaemonRunning: boolean;
  version?: string;
  containerState: 'running' | 'stopped' | 'unknown';
  containerName?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'starting' | 'none';
  error?: string;
  timestamp: string;
}

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

  // Window control
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Event listeners for main process events
  onFilesSelected: (callback: (files: string[]) => void) => {
    ipcRenderer.on('files:selected', (_event, files) => callback(files));
  },

  // Remove listener
  removeFilesSelectedListener: () => {
    ipcRenderer.removeAllListeners('files:selected');
  },
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      // Docker management
      dockerStatus: () => Promise<DockerStatusInfo>;
      dockerStart: () => Promise<{ success: boolean; error?: string }>;
      dockerStop: () => Promise<{ success: boolean; error?: string }>;

      // Health check
      healthCheck: () => Promise<{ healthy: boolean; status?: string; error?: string }>;

      // File handling
      selectFiles: () => Promise<string[]>;

      // App info
      getVersion: () => Promise<string>;

      // Window control
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;

      // Event listeners
      onFilesSelected: (callback: (files: string[]) => void) => void;
      removeFilesSelectedListener: () => void;
    };
  }
}
