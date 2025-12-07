/**
 * Docker Status Alert Component
 * Subtask 13.5: Handle Docker daemon not running scenario
 *
 * Displays user-friendly messages when Docker is not available
 * with suggestions on how to fix the issue.
 */

import { useState } from 'react';

/**
 * Docker error codes matching the main process
 */
export type DockerErrorCode =
  | 'DAEMON_NOT_RUNNING'
  | 'DOCKER_NOT_INSTALLED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Docker error information from main process
 */
export interface DockerError {
  code: DockerErrorCode;
  message: string;
  suggestion: string;
  originalError?: string;
}

/**
 * Props for DockerStatusAlert component
 */
interface DockerStatusAlertProps {
  error: DockerError;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Get icon for error type
 */
function getErrorIcon(code: DockerErrorCode): JSX.Element {
  switch (code) {
    case 'DOCKER_NOT_INSTALLED':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'DAEMON_NOT_RUNNING':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      );
    case 'PERMISSION_DENIED':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

/**
 * Get background color for error type
 */
function getErrorColor(code: DockerErrorCode): string {
  switch (code) {
    case 'DOCKER_NOT_INSTALLED':
      return 'bg-red-50 border-red-200';
    case 'DAEMON_NOT_RUNNING':
      return 'bg-yellow-50 border-yellow-200';
    case 'PERMISSION_DENIED':
      return 'bg-orange-50 border-orange-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

/**
 * Get icon color for error type
 */
function getIconColor(code: DockerErrorCode): string {
  switch (code) {
    case 'DOCKER_NOT_INSTALLED':
      return 'text-red-500';
    case 'DAEMON_NOT_RUNNING':
      return 'text-yellow-500';
    case 'PERMISSION_DENIED':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Docker Status Alert Component
 * Shows user-friendly error messages with suggestions
 */
export function DockerStatusAlert({
  error,
  onRetry,
  isRetrying = false,
}: DockerStatusAlertProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 ${getErrorColor(error.code)}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${getIconColor(error.code)}`}>
          {getErrorIcon(error.code)}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {/* Title */}
          <h3 className="text-sm font-medium text-gray-900">{error.message}</h3>

          {/* Suggestion */}
          <div className="mt-2 text-sm text-gray-700">
            <p>{error.suggestion}</p>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Retry Button */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <>
                    <svg
                      className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Retry
                  </>
                )}
              </button>
            )}

            {/* Show Details Toggle */}
            {error.originalError && (
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}

            {/* Help Link for Installation */}
            {error.code === 'DOCKER_NOT_INSTALLED' && (
              <a
                href="https://www.docker.com/products/docker-desktop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg
                  className="-ml-0.5 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Download Docker
              </a>
            )}
          </div>

          {/* Technical Details */}
          {showDetails && error.originalError && (
            <div className="mt-4 p-3 bg-gray-800 rounded-md">
              <code className="text-xs text-gray-200 font-mono whitespace-pre-wrap break-all">
                {error.originalError}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page Docker error overlay
 * Use when Docker is required and not available
 */
interface DockerErrorOverlayProps {
  error: DockerError;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function DockerErrorOverlay({
  error,
  onRetry,
  isRetrying = false,
}: DockerErrorOverlayProps): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Docker Logo / Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 mb-4">
            <svg
              className="h-8 w-8 text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zm-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186zm5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185zm-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185zM23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Docker Required</h1>
          <p className="text-sm text-gray-500 mt-1">
            This application requires Docker to run the AI processing container.
          </p>
        </div>

        {/* Error Alert */}
        <DockerStatusAlert
          error={error}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      </div>
    </div>
  );
}

export default DockerStatusAlert;
