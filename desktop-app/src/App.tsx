/**
 * Main Application Component
 * Subtask 13.5: Handle Docker daemon not running scenario
 * Subtask 13.7: Create status indicators (Starting/Ready/Error)
 * Subtask 14.1: Create split-screen layout (PDF + form)
 */

import { useState, useEffect, useCallback } from 'react';
import { DockerErrorOverlay, DockerError } from './components/DockerStatusAlert';
import {
  StatusBadge,
  StatusBar,
  StartupScreen,
  deriveAppStatus,
  type DockerStatus,
  type HealthStatus,
  type AppStatus,
} from './components/StatusIndicator';
import {
  SplitScreenLayout,
  PDFPanelPlaceholder,
  FormPanelPlaceholder,
  type LayoutMode,
} from './components/SplitScreenLayout';

type AppView = 'upload' | 'verification';

function App() {
  const [dockerStatus, setDockerStatus] = useState<DockerStatus>('checking');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('unknown');
  const [dockerError, setDockerError] = useState<DockerError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [startupSteps, setStartupSteps] = useState([
    { label: 'Checking Docker status', completed: false },
    { label: 'Starting container', completed: false },
    { label: 'Waiting for service health', completed: false },
  ]);

  // View state for switching between upload and verification
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');

  // Derive the overall app status from Docker and Health statuses
  const appStatus: AppStatus = deriveAppStatus(dockerStatus, healthStatus);

  // Start health polling when Docker is running
  const startHealthPolling = useCallback(async () => {
    try {
      const electronAPI = window.electronAPI;
      if (!electronAPI?.startHealthPolling) return;

      // Set up status change listener
      electronAPI.onHealthStatusChange?.((event: { status: string; error?: string }) => {
        setHealthStatus(event.status as HealthStatus);
        setLastCheckTime(new Date());

        // Update startup steps when healthy
        if (event.status === 'healthy') {
          setStartupSteps(steps => steps.map(s => ({ ...s, completed: true })));
        }
      });

      // Start polling
      await electronAPI.startHealthPolling(10000); // Poll every 10 seconds
    } catch (err) {
      console.error('Failed to start health polling:', err);
    }
  }, []);

  // Stop health polling
  const stopHealthPolling = useCallback(async () => {
    try {
      const electronAPI = window.electronAPI;
      if (!electronAPI?.stopHealthPolling) return;

      electronAPI.removeHealthListeners?.();
      await electronAPI.stopHealthPolling();
    } catch (err) {
      console.error('Failed to stop health polling:', err);
    }
  }, []);

  useEffect(() => {
    checkDockerStatus();

    // Cleanup on unmount
    return () => {
      stopHealthPolling();
    };
  }, [stopHealthPolling]);

  const checkDockerStatus = async () => {
    setDockerStatus('checking');
    setDockerError(null);
    setHealthStatus('unknown');

    // Reset startup steps
    setStartupSteps([
      { label: 'Checking Docker status', completed: false },
      { label: 'Starting container', completed: false },
      { label: 'Waiting for service health', completed: false },
    ]);

    try {
      const electronAPI = window.electronAPI;

      if (!electronAPI) {
        // Running in browser without Electron
        setDockerError({
          code: 'UNKNOWN_ERROR',
          message: 'Electron API not available',
          suggestion: 'Please run this application using the Electron desktop app.',
        });
        setDockerStatus('docker_error');
        return;
      }

      // First check if there's a daemon error
      if (electronAPI.getDaemonError) {
        const error = await electronAPI.getDaemonError();
        if (error) {
          setDockerError(error);
          setDockerStatus('docker_error');
          return;
        }
      }

      // Mark Docker check as complete
      setStartupSteps(steps =>
        steps.map((s, i) => (i === 0 ? { ...s, completed: true } : s))
      );

      // Check Docker status
      const status = await electronAPI.dockerStatus?.();
      // Handle both object response and legacy boolean response
      const isRunning = typeof status === 'object'
        ? status?.containerState === 'running'
        : Boolean(status);

      if (isRunning) {
        setDockerStatus('running');
        // Mark container step as complete
        setStartupSteps(steps =>
          steps.map((s, i) => (i <= 1 ? { ...s, completed: true } : s))
        );
        // Start health polling
        await startHealthPolling();
      } else {
        setDockerStatus('stopped');
      }
    } catch (err) {
      // Handle unexpected errors
      setDockerError({
        code: 'UNKNOWN_ERROR',
        message: 'Failed to check Docker status',
        suggestion: 'Please ensure Docker Desktop is installed and running.',
        originalError: err instanceof Error ? err.message : String(err),
      });
      setDockerStatus('docker_error');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await stopHealthPolling();
    await checkDockerStatus();
    setIsRetrying(false);
  };

  // Get a status message for the startup screen
  const getStartupMessage = () => {
    if (dockerStatus === 'checking') return 'Checking Docker status...';
    if (dockerStatus === 'stopped') return 'Container is not running';
    if (healthStatus === 'unknown') return 'Waiting for service to be ready...';
    if (healthStatus === 'unhealthy') return 'Service is starting up...';
    return 'Starting up...';
  };

  // Show full-page error overlay when Docker is not available
  if (dockerStatus === 'docker_error' && dockerError) {
    return (
      <DockerErrorOverlay
        error={dockerError}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  // Show startup screen while starting
  if (appStatus === 'starting') {
    return (
      <StartupScreen
        status={appStatus}
        message={getStartupMessage()}
        steps={startupSteps}
      />
    );
  }

  // Render verification view with split-screen layout
  if (currentView === 'verification') {
    return (
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-primary-700 text-white p-4 shadow-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('upload')}
                className="flex items-center gap-2 text-sm hover:text-primary-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Upload
              </button>
              <h1 className="text-xl font-bold">Invoice Verification</h1>
            </div>
            <StatusBadge status={appStatus} />
          </div>
        </header>

        {/* Split Screen Layout */}
        <div className="flex-1 overflow-hidden">
          <SplitScreenLayout
            leftPanel={<PDFPanelPlaceholder />}
            rightPanel={<FormPanelPlaceholder />}
            mode={layoutMode}
            onModeChange={setLayoutMode}
            leftTitle="PDF Document"
            rightTitle="Invoice Data"
          />
        </div>
      </div>
    );
  }

  // Render upload view (default)
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contpaqi AI Bridge</h1>
          <StatusBadge status={appStatus} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Status Bar - shown when not fully ready or on error */}
        {(appStatus === 'error' || appStatus === 'offline') && (
          <StatusBar
            dockerStatus={dockerStatus}
            healthStatus={healthStatus}
            lastCheckTime={lastCheckTime}
            onRetry={handleRetry}
            isRetrying={isRetrying}
            className="mb-6"
          />
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Invoice Processing</h2>
          <p className="text-gray-600 mb-4">
            Upload PDF invoices to extract data using AI and create accounting entries in Contpaqi.
          </p>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop PDF files here, or click to select
            </p>
            <button
              onClick={() => setCurrentView('verification')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={appStatus !== 'ready'}
            >
              Select Files
            </button>
            {appStatus !== 'ready' && (
              <p className="mt-2 text-xs text-yellow-600">
                Service must be ready to upload files
              </p>
            )}
          </div>

          {/* Demo button to test verification view */}
          {appStatus === 'ready' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentView('verification')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Demo: Open Verification View
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
