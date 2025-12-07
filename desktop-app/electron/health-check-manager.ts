/**
 * Health Check Manager Module
 * Subtask 13.6: Implement health check polling with retry
 *
 * Provides comprehensive health check functionality including:
 * - Single health check with timeout
 * - Retry logic with exponential backoff
 * - Polling at configurable intervals
 * - Status change callbacks
 * - Wait for healthy state
 */

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'unknown';

/**
 * Result from a health check
 */
export interface HealthCheckResult {
  /** Whether the service is healthy */
  healthy: boolean;
  /** The status returned by the service */
  status?: string;
  /** Error message if check failed */
  error?: string;
  /** Number of retries attempted */
  retryCount?: number;
  /** Timestamp of the check */
  timestamp: Date;
}

/**
 * Options for health check with retry
 */
export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay between retries (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Callback called on each retry */
  onRetry?: (attempt: number, error: string) => void;
}

/**
 * Options for polling
 */
export interface PollingOptions {
  /** Interval between health checks in milliseconds (default: 10000) */
  intervalMs?: number;
  /** Callback when health status changes */
  onStatusChange?: (status: HealthStatus, error?: string) => void;
  /** Callback when a check fails */
  onError?: (error: string) => void;
}

/**
 * Options for waiting for healthy state
 */
export interface WaitForHealthyOptions {
  /** Maximum time to wait in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Interval between checks in milliseconds (default: 2000) */
  intervalMs?: number;
  /** Callback called on each check with (checkCount, isHealthy, error?) */
  onProgress?: (checkCount: number, isHealthy: boolean, error?: string) => void;
}

/**
 * Result from waiting for healthy
 */
export interface WaitForHealthyResult {
  /** Whether the service became healthy */
  success: boolean;
  /** Number of checks performed */
  checkCount: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Configuration options for HealthCheckManager
 */
export interface HealthCheckOptions {
  /** Timeout for each health check in milliseconds (default: 5000) */
  timeoutMs?: number;
}

/**
 * Health Check Manager class for monitoring service health
 */
export class HealthCheckManager {
  private healthUrl: string;
  private timeoutMs: number;
  private currentStatus: HealthStatus = 'unknown';
  private lastCheckTime: Date | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private _isPolling: boolean = false;

  /**
   * Create a new HealthCheckManager instance
   * @param healthUrl - URL to health check endpoint
   * @param options - Configuration options
   */
  constructor(healthUrl: string, options: HealthCheckOptions = {}) {
    this.healthUrl = healthUrl;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  /**
   * Perform a single health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.currentStatus = 'error';
        this.lastCheckTime = timestamp;
        return {
          healthy: false,
          error: `HTTP ${response.status}`,
          timestamp,
        };
      }

      const data = await response.json();
      const isHealthy = data.status === 'healthy';

      this.currentStatus = isHealthy ? 'healthy' : 'unhealthy';
      this.lastCheckTime = timestamp;

      return {
        healthy: isHealthy,
        status: data.status,
        timestamp,
      };
    } catch (error) {
      this.currentStatus = 'error';
      this.lastCheckTime = timestamp;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');

      return {
        healthy: false,
        error: isTimeout ? 'Request timeout' : errorMessage,
        timestamp,
      };
    }
  }

  /**
   * Perform a health check with retry logic
   * @param options - Retry options
   */
  async checkHealthWithRetry(options: RetryOptions = {}): Promise<HealthCheckResult> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 30000,
      backoffMultiplier = 2,
      onRetry,
    } = options;

    let lastResult: HealthCheckResult;
    let currentDelay = initialDelayMs;

    // First attempt
    lastResult = await this.checkHealth();

    if (lastResult.healthy) {
      return { ...lastResult, retryCount: 0 };
    }

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait before retry
      await this.delay(currentDelay);

      // Call onRetry callback
      if (onRetry && lastResult.error) {
        onRetry(attempt, lastResult.error);
      }

      // Attempt health check
      lastResult = await this.checkHealth();

      if (lastResult.healthy) {
        return { ...lastResult, retryCount: attempt };
      }

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }

    return { ...lastResult, retryCount: maxRetries };
  }

  /**
   * Start polling for health status
   * @param options - Polling options
   */
  startPolling(options: PollingOptions = {}): void {
    const { intervalMs = 10000, onStatusChange, onError } = options;

    // Stop existing polling if any
    this.stopPolling();

    this._isPolling = true;
    let lastStatus: HealthStatus | null = null;

    const doCheck = async () => {
      const result = await this.checkHealth();

      // Determine current status
      let newStatus: HealthStatus;
      let errorMessage: string | undefined;

      if (result.error) {
        // Network error, timeout, or other failure
        newStatus = 'error';
        errorMessage = result.error;

        if (onError) {
          onError(result.error);
        }
      } else if (result.status) {
        // Got a valid response with a status
        newStatus = result.status === 'healthy' ? 'healthy' : 'unhealthy';
      } else {
        // Unknown state
        newStatus = 'error';
        errorMessage = 'Unknown health check response';
      }

      // Call onStatusChange if status changed or first check
      if (newStatus !== lastStatus && onStatusChange) {
        onStatusChange(newStatus, errorMessage);
      }

      lastStatus = newStatus;
    };

    // Initial check
    doCheck();

    // Start polling interval
    this.pollingInterval = setInterval(doCheck, intervalMs);
  }

  /**
   * Stop polling for health status
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this._isPolling = false;
  }

  /**
   * Wait for the service to become healthy
   * @param options - Wait options
   */
  async waitForHealthy(options: WaitForHealthyOptions = {}): Promise<WaitForHealthyResult> {
    const { timeoutMs = 60000, intervalMs = 2000, onProgress } = options;

    const startTime = Date.now();
    let checkCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      checkCount++;

      const result = await this.checkHealth();

      if (onProgress) {
        onProgress(checkCount, result.healthy, result.error);
      }

      if (result.healthy) {
        return { success: true, checkCount };
      }

      // Wait before next check (unless we've exceeded timeout)
      if (Date.now() - startTime + intervalMs < timeoutMs) {
        await this.delay(intervalMs);
      }
    }

    return {
      success: false,
      checkCount,
      error: `Service did not become healthy within ${timeoutMs / 1000} seconds (timeout)`,
    };
  }

  /**
   * Get the current health status
   */
  getCurrentStatus(): HealthStatus {
    return this.currentStatus;
  }

  /**
   * Check if polling is active
   */
  isPolling(): boolean {
    return this._isPolling;
  }

  /**
   * Get the timestamp of the last health check
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Helper method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export a default instance for the MCP container
export const mcpHealthCheckManager = new HealthCheckManager('http://localhost:8000/health');
