/**
 * Status Indicator Components
 * Subtask 13.7: Create status indicators (Starting/Ready/Error)
 * Subtask 18.5: Updated to use i18n translation keys
 *
 * Provides visual status indicators for the application state:
 * - StatusIndicator: Simple dot with optional text
 * - StatusBar: Full status bar with icon, text, and details
 * - StatusBadge: Compact badge for headers
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Application status values
 */
export type AppStatus = 'starting' | 'ready' | 'error' | 'offline';

/**
 * Docker status values
 */
export type DockerStatus = 'checking' | 'running' | 'stopped' | 'docker_error';

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'unknown';

/**
 * Derive the application status from Docker and Health statuses
 */
export function deriveAppStatus(
  dockerStatus: DockerStatus,
  healthStatus: HealthStatus
): AppStatus {
  // Docker errors take precedence
  if (dockerStatus === 'docker_error') {
    return 'error';
  }

  // Docker not running
  if (dockerStatus === 'stopped') {
    return 'offline';
  }

  // Still checking Docker
  if (dockerStatus === 'checking') {
    return 'starting';
  }

  // Docker is running, check health status
  if (dockerStatus === 'running') {
    switch (healthStatus) {
      case 'healthy':
        return 'ready';
      case 'unhealthy':
        return 'error';
      case 'error':
        return 'error';
      case 'unknown':
        return 'starting';
      default:
        return 'starting';
    }
  }

  return 'starting';
}

/**
 * Get the color class for a status
 */
export function getStatusColor(status: AppStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-green-500';
    case 'starting':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'offline':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Get the text color class for a status
 */
export function getStatusTextColor(status: AppStatus): string {
  switch (status) {
    case 'ready':
      return 'text-green-600';
    case 'starting':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    case 'offline':
      return 'text-gray-600';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get the translation key for a status
 */
export function getStatusTextKey(status: AppStatus): string {
  const keyMap: Record<AppStatus, string> = {
    starting: 'status.starting',
    ready: 'status.ready',
    error: 'status.error',
    offline: 'status.offline',
  };
  return keyMap[status] || 'status.starting';
}

/**
 * Get the display text for a status (fallback for non-React contexts)
 * @deprecated Use getStatusTextKey with useTranslation hook in React components
 */
export function getStatusText(status: AppStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'starting':
      return 'Starting...';
    case 'error':
      return 'Error';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a status should animate
 */
export function shouldAnimate(status: AppStatus): boolean {
  return status === 'starting';
}

/**
 * Get size classes for the indicator
 */
export function getSizeClasses(
  size: 'sm' | 'md' | 'lg'
): { dot: string; text: string } {
  switch (size) {
    case 'sm':
      return { dot: 'w-2 h-2', text: 'text-xs' };
    case 'md':
      return { dot: 'w-3 h-3', text: 'text-sm' };
    case 'lg':
      return { dot: 'w-4 h-4', text: 'text-base' };
    default:
      return { dot: 'w-3 h-3', text: 'text-sm' };
  }
}

// =============================================================================
// Status Icons
// =============================================================================

/**
 * Check icon for ready status
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * Loading spinner icon for starting status
 */
function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/**
 * Error icon for error status
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Offline icon for offline status
 */
function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  );
}

/**
 * Get the appropriate icon component for a status
 */
export function StatusIcon({
  status,
  className = 'w-5 h-5',
}: {
  status: AppStatus;
  className?: string;
}) {
  switch (status) {
    case 'ready':
      return <CheckIcon className={className} />;
    case 'starting':
      return <LoadingIcon className={className} />;
    case 'error':
      return <ErrorIcon className={className} />;
    case 'offline':
      return <OfflineIcon className={className} />;
    default:
      return <LoadingIcon className={className} />;
  }
}

// =============================================================================
// StatusIndicator Component
// =============================================================================

export interface StatusIndicatorProps {
  /** Current application status */
  status: AppStatus;
  /** Optional custom message to display */
  message?: string;
  /** Whether to show the status text */
  showText?: boolean;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Simple status indicator with dot and optional text
 */
export function StatusIndicator({
  status,
  message,
  showText = true,
  size = 'md',
  className = '',
}: StatusIndicatorProps) {
  const { t } = useTranslation();
  const sizeClasses = getSizeClasses(size);
  const colorClass = getStatusColor(status);
  const animate = shouldAnimate(status);
  const displayText = message || t(getStatusTextKey(status));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex">
        <span
          className={`${sizeClasses.dot} rounded-full ${colorClass} ${
            animate ? 'animate-pulse' : ''
          }`}
        />
        {animate && (
          <span
            className={`absolute ${sizeClasses.dot} rounded-full ${colorClass} animate-ping opacity-75`}
          />
        )}
      </span>
      {showText && (
        <span className={`${sizeClasses.text} capitalize`}>{displayText}</span>
      )}
    </div>
  );
}

// =============================================================================
// StatusBadge Component
// =============================================================================

export interface StatusBadgeProps {
  /** Current application status */
  status: AppStatus;
  /** Optional custom message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact status badge for headers
 */
export function StatusBadge({ status, message, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colorClass = getStatusColor(status);
  const textColorClass = getStatusTextColor(status);
  const displayText = message || t(getStatusTextKey(status));
  const animate = shouldAnimate(status);

  const bgColorClass = status === 'ready'
    ? 'bg-green-100'
    : status === 'starting'
    ? 'bg-yellow-100'
    : status === 'error'
    ? 'bg-red-100'
    : 'bg-gray-100';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColorClass} ${className}`}
    >
      <span className="relative flex">
        <span
          className={`w-2 h-2 rounded-full ${colorClass} ${animate ? 'animate-pulse' : ''}`}
        />
        {animate && (
          <span
            className={`absolute w-2 h-2 rounded-full ${colorClass} animate-ping opacity-75`}
          />
        )}
      </span>
      <span className={`text-xs font-medium ${textColorClass}`}>{displayText}</span>
    </div>
  );
}

// =============================================================================
// StatusBar Component
// =============================================================================

export interface StatusBarState {
  dockerStatus: DockerStatus;
  healthStatus: HealthStatus;
  lastCheckTime: Date | null;
}

/**
 * Get the translation key for a status bar message
 */
export function getStatusBarMessageKey(state: StatusBarState): string {
  const { dockerStatus, healthStatus } = state;

  if (dockerStatus === 'docker_error') {
    return 'errors.dockerNotRunning';
  }

  if (dockerStatus === 'stopped') {
    return 'docker.containerStopped';
  }

  if (dockerStatus === 'checking') {
    return 'docker.checking';
  }

  if (dockerStatus === 'running') {
    switch (healthStatus) {
      case 'healthy':
        return 'docker.healthy';
      case 'unhealthy':
        return 'docker.unhealthy';
      case 'error':
        return 'errors.healthCheckFailed';
      case 'unknown':
        return 'docker.waitingForService';
      default:
        return 'docker.waitingForService';
    }
  }

  return 'status.checking';
}

/**
 * Get a descriptive message for the status bar (fallback for non-React contexts)
 * @deprecated Use getStatusBarMessageKey with useTranslation hook in React components
 */
export function getStatusBarMessage(state: StatusBarState): string {
  const { dockerStatus, healthStatus } = state;

  if (dockerStatus === 'docker_error') {
    return 'Docker is not available';
  }

  if (dockerStatus === 'stopped') {
    return 'Container is not running';
  }

  if (dockerStatus === 'checking') {
    return 'Checking Docker status...';
  }

  if (dockerStatus === 'running') {
    switch (healthStatus) {
      case 'healthy':
        return 'Service healthy';
      case 'unhealthy':
        return 'Service is unhealthy';
      case 'error':
        return 'Health check failed';
      case 'unknown':
        return 'Checking service health...';
      default:
        return 'Checking service health...';
    }
  }

  return 'Unknown status';
}

export interface StatusBarProps {
  /** Docker status */
  dockerStatus: DockerStatus;
  /** Health status */
  healthStatus: HealthStatus;
  /** Last health check time */
  lastCheckTime?: Date | null;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full status bar with icon, message, and actions
 */
export function StatusBar({
  dockerStatus,
  healthStatus,
  lastCheckTime = null,
  onRetry,
  isRetrying = false,
  className = '',
}: StatusBarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const appStatus = deriveAppStatus(dockerStatus, healthStatus);
  const messageKey = getStatusBarMessageKey({ dockerStatus, healthStatus, lastCheckTime });
  const textColorClass = getStatusTextColor(appStatus);

  const bgColorClass =
    appStatus === 'ready'
      ? 'bg-green-50 border-green-200'
      : appStatus === 'starting'
      ? 'bg-yellow-50 border-yellow-200'
      : appStatus === 'error'
      ? 'bg-red-50 border-red-200'
      : 'bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-lg ${bgColorClass} ${className}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <StatusIcon status={appStatus} className={`w-5 h-5 ${textColorClass}`} />
          <div>
            <p className={`font-medium ${textColorClass}`}>{t(getStatusTextKey(appStatus))}</p>
            <p className="text-sm text-gray-600">{t(messageKey)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRetry && (appStatus === 'error' || appStatus === 'offline') && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? t('common.processing') : t('actions.retry')}
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <p className="text-gray-500">{t('docker.status')}</p>
              <p className="font-medium capitalize">{dockerStatus.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('docker.healthCheck')}</p>
              <p className="font-medium capitalize">{healthStatus}</p>
            </div>
            {lastCheckTime && (
              <div className="col-span-2">
                <p className="text-gray-500">{t('common.time')}</p>
                <p className="font-medium">{lastCheckTime.toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// StartupScreen Component
// =============================================================================

export interface StartupScreenProps {
  /** Current application status */
  status: AppStatus;
  /** Detailed message */
  message: string;
  /** Progress steps */
  steps?: { label: string; completed: boolean }[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full-page startup screen with progress indication
 */
export function StartupScreen({
  status,
  message,
  steps = [],
  className = '',
}: StartupScreenProps) {
  const { t } = useTranslation();
  const textColorClass = getStatusTextColor(status);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gray-100 ${className}`}
    >
      <div className="text-center">
        {/* Logo/Icon */}
        <div className={`mb-6 ${textColorClass}`}>
          <StatusIcon status={status} className="w-16 h-16 mx-auto" />
        </div>

        {/* Status Text */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {t('app.name')}
        </h1>
        <p className={`text-lg ${textColorClass}`}>{t(getStatusTextKey(status))}</p>
        <p className="text-gray-600 mt-1">{message}</p>

        {/* Progress Steps */}
        {steps.length > 0 && (
          <div className="mt-8 text-left max-w-xs mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 py-2">
                {step.completed ? (
                  <CheckIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <LoadingIcon className="w-5 h-5 text-yellow-500" />
                )}
                <span
                  className={
                    step.completed ? 'text-gray-800' : 'text-gray-500'
                  }
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
