/**
 * Electron Preload Script
 * Subtask 13.2: Configure Electron main process
 * Subtask 13.3: Docker status checking
 * Subtask 13.4: Container lifecycle management
 * Subtask 13.5: Handle Docker daemon not running scenario
 * Subtask 13.6: Implement health check polling with retry
 * Subtask 18.7: Language preference persistence
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

/**
 * Docker error codes for daemon issues
 */
export type DockerErrorCode =
  | 'DAEMON_NOT_RUNNING'
  | 'DOCKER_NOT_INSTALLED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Docker error information for user-friendly messages
 */
export interface DockerError {
  code: DockerErrorCode;
  message: string;
  suggestion: string;
  originalError?: string;
}

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'unknown';

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  status?: string;
  error?: string;
  retryCount?: number;
  timestamp: string;
}

/**
 * Health status info from the manager
 */
export interface HealthStatusInfo {
  status: HealthStatus;
  isPolling: boolean;
  lastCheckTime: string | null;
}

/**
 * Health status change event
 */
export interface HealthStatusChangeEvent {
  status: HealthStatus;
  error?: string;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Docker management
  dockerStatus: () => ipcRenderer.invoke('docker:status'),
  dockerStart: () => ipcRenderer.invoke('docker:start'),
  dockerStop: () => ipcRenderer.invoke('docker:stop'),
  dockerRestart: () => ipcRenderer.invoke('docker:restart'),
  getDaemonError: () => ipcRenderer.invoke('docker:getDaemonError'),

  // Health check
  healthCheck: () => ipcRenderer.invoke('health:check'),
  healthCheckWithRetry: (options?: object) => ipcRenderer.invoke('health:checkWithRetry', options),
  waitForHealthy: (options?: object) => ipcRenderer.invoke('health:waitForHealthy', options),
  startHealthPolling: (intervalMs?: number) => ipcRenderer.invoke('health:startPolling', intervalMs),
  stopHealthPolling: () => ipcRenderer.invoke('health:stopPolling'),
  getHealthStatus: () => ipcRenderer.invoke('health:getStatus'),

  // Health status change listener
  onHealthStatusChange: (callback: (event: { status: string; error?: string }) => void) => {
    ipcRenderer.on('health:statusChanged', (_event, data) => callback(data));
  },
  onHealthError: (callback: (event: { error: string }) => void) => {
    ipcRenderer.on('health:error', (_event, data) => callback(data));
  },
  removeHealthListeners: () => {
    ipcRenderer.removeAllListeners('health:statusChanged');
    ipcRenderer.removeAllListeners('health:error');
  },

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

  // Language management (Subtask 18.7)
  getRegistryLanguage: () => ipcRenderer.invoke('language:getFromRegistry'),
  setRegistryLanguage: (lang: string) => ipcRenderer.invoke('language:setToRegistry', lang),
  getSystemLocale: () => ipcRenderer.invoke('language:getSystemLocale'),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      // Docker management
      dockerStatus: () => Promise<DockerStatusInfo>;
      dockerStart: () => Promise<{ success: boolean; error?: string }>;
      dockerStop: () => Promise<{ success: boolean; error?: string }>;
      dockerRestart: () => Promise<{ success: boolean; error?: string }>;
      getDaemonError: () => Promise<DockerError | null>;

      // Health check
      healthCheck: () => Promise<HealthCheckResult>;
      healthCheckWithRetry: (options?: object) => Promise<HealthCheckResult>;
      waitForHealthy: (options?: object) => Promise<{ success: boolean; checkCount: number; error?: string }>;
      startHealthPolling: (intervalMs?: number) => Promise<{ success: boolean }>;
      stopHealthPolling: () => Promise<{ success: boolean }>;
      getHealthStatus: () => Promise<HealthStatusInfo>;

      // Health status listeners
      onHealthStatusChange: (callback: (event: HealthStatusChangeEvent) => void) => void;
      onHealthError: (callback: (event: { error: string }) => void) => void;
      removeHealthListeners: () => void;

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

      // Language management (Subtask 18.7)
      getRegistryLanguage: () => Promise<string | null>;
      setRegistryLanguage: (lang: string) => Promise<{ success: boolean; error?: string }>;
      getSystemLocale: () => Promise<string>;
    };
  }
}
