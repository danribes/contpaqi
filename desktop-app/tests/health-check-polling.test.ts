/**
 * Health Check Polling Tests
 * Subtask 13.6: Implement health check polling with retry
 *
 * Tests for:
 * - Health check execution
 * - Retry logic with backoff
 * - Polling intervals
 * - Status change callbacks
 * - Start/stop polling
 */

import {
  HealthCheckManager,
  HealthStatus,
} from '../electron/health-check-manager';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HealthCheckManager', () => {
  let healthCheckManager: HealthCheckManager;
  const healthUrl = 'http://localhost:8000/health';

  beforeEach(() => {
    jest.clearAllMocks();
    healthCheckManager = new HealthCheckManager(healthUrl);
  });

  afterEach(() => {
    healthCheckManager.stopPolling();
  });

  // ===========================================================================
  // Single Health Check
  // ===========================================================================

  describe('checkHealth', () => {
    it('should return healthy when endpoint responds with healthy status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await healthCheckManager.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when endpoint responds with unhealthy status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'unhealthy' }),
      });

      const result = await healthCheckManager.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.status).toBe('unhealthy');
    });

    it('should return unhealthy when HTTP status is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await healthCheckManager.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('503');
    });

    it('should return unhealthy when fetch throws network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await healthCheckManager.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should return unhealthy on timeout', async () => {
      const shortTimeoutManager = new HealthCheckManager(healthUrl, {
        timeoutMs: 50,
      });

      // Mock a request that respects the AbortSignal
      mockFetch.mockImplementationOnce(
        (_url: string, options: { signal?: AbortSignal }) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ status: 'healthy' }),
                }),
              200
            );
            // Handle abort signal
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('Request aborted due to timeout'));
              });
            }
          })
      );

      const result = await shortTimeoutManager.checkHealth();
      expect(result.healthy).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);
  });

  // ===========================================================================
  // Retry Logic
  // ===========================================================================

  describe('checkHealthWithRetry', () => {
    it('should succeed on first attempt without retries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await healthCheckManager.checkHealthWithRetry();

      expect(result.healthy).toBe(true);
      expect(result.retryCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

      const result = await healthCheckManager.checkHealthWithRetry({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result.healthy).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should fail after exhausting all retries', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await healthCheckManager.checkHealthWithRetry({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 30,
      });

      expect(result.healthy).toBe(false);
      expect(result.retryCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should call onRetry callback on each retry', async () => {
      const onRetry = jest.fn();

      mockFetch
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

      await healthCheckManager.checkHealthWithRetry({
        maxRetries: 3,
        initialDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(String));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(String));
    }, 10000);

    it('should use exponential backoff for retries', async () => {
      const startTime = Date.now();
      const delays: number[] = [];
      let lastCheckTime = startTime;

      mockFetch.mockImplementation(() => {
        const now = Date.now();
        delays.push(now - lastCheckTime);
        lastCheckTime = now;
        return Promise.reject(new Error('Connection refused'));
      });

      await healthCheckManager.checkHealthWithRetry({
        maxRetries: 2,
        initialDelayMs: 20,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      // First call should be immediate, subsequent calls should have delays
      expect(delays[0]).toBeLessThan(50); // First call - near immediate
      expect(delays[1]).toBeGreaterThanOrEqual(15); // ~20ms delay
      expect(delays[2]).toBeGreaterThanOrEqual(35); // ~40ms delay (2x)
    }, 10000);
  });

  // ===========================================================================
  // Polling
  // ===========================================================================

  describe('startPolling', () => {
    it('should call health check immediately on start', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 1000 });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      healthCheckManager.stopPolling();
    });

    it('should poll at specified intervals', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 50 });

      await new Promise((resolve) => setTimeout(resolve, 180));

      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
      healthCheckManager.stopPolling();
    }, 10000);

    it('should call onStatusChange when status changes', async () => {
      const onStatusChange = jest.fn();
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'healthy' }),
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'unhealthy' }),
          });
        }
      });

      healthCheckManager.startPolling({
        intervalMs: 100,
        onStatusChange,
      });

      // Wait for initial check + one interval
      await new Promise((resolve) => setTimeout(resolve, 180));
      healthCheckManager.stopPolling();

      // Should have 2 calls: initial healthy, then unhealthy
      expect(onStatusChange).toHaveBeenCalledTimes(2);
      expect(onStatusChange).toHaveBeenNthCalledWith(1, 'healthy', undefined);
      expect(onStatusChange).toHaveBeenNthCalledWith(2, 'unhealthy', undefined);
    }, 10000);

    it('should not call onStatusChange if status remains the same', async () => {
      const onStatusChange = jest.fn();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({
        intervalMs: 50,
        onStatusChange,
      });

      await new Promise((resolve) => setTimeout(resolve, 180));

      expect(onStatusChange).toHaveBeenCalledTimes(1);
      healthCheckManager.stopPolling();
    }, 10000);

    it('should call onError when check fails', async () => {
      const onError = jest.fn();

      mockFetch.mockRejectedValue(new Error('Network error'));

      healthCheckManager.startPolling({
        intervalMs: 1000,
        onError,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onError).toHaveBeenCalledWith('Network error');
      healthCheckManager.stopPolling();
    });

    it('should report error status when health check fails', async () => {
      const onStatusChange = jest.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      healthCheckManager.startPolling({
        intervalMs: 50,
        onStatusChange,
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(onStatusChange).toHaveBeenCalledTimes(2);
      expect(onStatusChange).toHaveBeenNthCalledWith(2, 'error', 'Network error');
      healthCheckManager.stopPolling();
    }, 10000);
  });

  describe('stopPolling', () => {
    it('should stop polling when called', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 30 });

      await new Promise((resolve) => setTimeout(resolve, 80));
      const callCountBeforeStop = mockFetch.mock.calls.length;

      healthCheckManager.stopPolling();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch.mock.calls.length).toBe(callCountBeforeStop);
    }, 10000);

    it('should be safe to call multiple times', () => {
      expect(() => {
        healthCheckManager.stopPolling();
        healthCheckManager.stopPolling();
        healthCheckManager.stopPolling();
      }).not.toThrow();
    });

    it('should allow restarting polling after stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 1000 });
      await new Promise((resolve) => setTimeout(resolve, 50));

      healthCheckManager.stopPolling();
      mockFetch.mockClear();

      healthCheckManager.startPolling({ intervalMs: 1000 });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalled();
      healthCheckManager.stopPolling();
    });
  });

  // ===========================================================================
  // Status Getters
  // ===========================================================================

  describe('getCurrentStatus', () => {
    it('should return unknown before first check', () => {
      expect(healthCheckManager.getCurrentStatus()).toBe('unknown');
    });

    it('should return latest status after check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      await healthCheckManager.checkHealth();

      expect(healthCheckManager.getCurrentStatus()).toBe('healthy');
    });

    it('should return error status after failed check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await healthCheckManager.checkHealth();

      expect(healthCheckManager.getCurrentStatus()).toBe('error');
    });
  });

  describe('isPolling', () => {
    it('should return false initially', () => {
      expect(healthCheckManager.isPolling()).toBe(false);
    });

    it('should return true after starting polling', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 1000 });

      expect(healthCheckManager.isPolling()).toBe(true);
      healthCheckManager.stopPolling();
    });

    it('should return false after stopping polling', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      healthCheckManager.startPolling({ intervalMs: 1000 });
      healthCheckManager.stopPolling();

      expect(healthCheckManager.isPolling()).toBe(false);
    });
  });

  describe('getLastCheckTime', () => {
    it('should return null before first check', () => {
      expect(healthCheckManager.getLastCheckTime()).toBeNull();
    });

    it('should return timestamp after check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const before = Date.now();
      await healthCheckManager.checkHealth();
      const after = Date.now();

      const lastCheckTime = healthCheckManager.getLastCheckTime();
      expect(lastCheckTime).not.toBeNull();
      expect(lastCheckTime!.getTime()).toBeGreaterThanOrEqual(before);
      expect(lastCheckTime!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ===========================================================================
  // Configuration
  // ===========================================================================

  describe('configuration', () => {
    it('should use custom health URL', async () => {
      const customUrl = 'http://custom:9000/api/health';
      const customManager = new HealthCheckManager(customUrl);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      await customManager.checkHealth();

      expect(mockFetch).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });
  });

  // ===========================================================================
  // Wait for Healthy
  // ===========================================================================

  describe('waitForHealthy', () => {
    it('should resolve immediately if already healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await healthCheckManager.waitForHealthy({ timeoutMs: 10000 });

      expect(result.success).toBe(true);
      expect(result.checkCount).toBe(1);
    });

    it('should poll until healthy', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

      const result = await healthCheckManager.waitForHealthy({
        timeoutMs: 5000,
        intervalMs: 30,
      });

      expect(result.success).toBe(true);
      expect(result.checkCount).toBe(3);
    }, 10000);

    it('should timeout if never becomes healthy', async () => {
      mockFetch.mockRejectedValue(new Error('Not ready'));

      const result = await healthCheckManager.waitForHealthy({
        timeoutMs: 150,
        intervalMs: 30,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);

    it('should call onProgress callback', async () => {
      const onProgress = jest.fn();

      mockFetch
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

      await healthCheckManager.waitForHealthy({
        timeoutMs: 5000,
        intervalMs: 30,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, false, expect.any(String));
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, true, undefined);
    }, 10000);
  });
});
