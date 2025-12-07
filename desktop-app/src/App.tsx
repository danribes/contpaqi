/**
 * Main Application Component
 * Subtask 13.5: Handle Docker daemon not running scenario
 */

import { useState, useEffect } from 'react';
import { DockerErrorOverlay, DockerError } from './components/DockerStatusAlert';

type DockerStatus = 'checking' | 'running' | 'stopped' | 'docker_error';

function App() {
  const [dockerStatus, setDockerStatus] = useState<DockerStatus>('checking');
  const [dockerError, setDockerError] = useState<DockerError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    checkDockerStatus();
  }, []);

  const checkDockerStatus = async () => {
    setDockerStatus('checking');
    setDockerError(null);

    try {
      // @ts-expect-error - electronAPI is injected by preload
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

      // Check Docker status
      const isRunning = await electronAPI.dockerStatus?.();
      setDockerStatus(isRunning ? 'running' : 'stopped');
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
    await checkDockerStatus();
    setIsRetrying(false);
  };

  const getStatusColor = () => {
    switch (dockerStatus) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-yellow-500';
      case 'docker_error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contpaqi AI Bridge</h1>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${getStatusColor()}`}></span>
            <span className="text-sm capitalize">
              {dockerStatus === 'checking' ? 'Checking...' : dockerStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
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
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
              Select Files
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
