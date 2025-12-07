/**
 * Tests for Docker daemon not running scenario handling
 * Subtask 13.5: Handle Docker daemon not running scenario
 */

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Import after mocking
import { DockerManager, DockerStatus } from '../electron/docker-manager';

describe('Docker Daemon Not Running Detection', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container', 10000, '/path/to/compose');
  });

  describe('checkDaemonStatus', () => {
    it('should detect when Docker daemon is not running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.error).toContain('Cannot connect');
    });

    it('should detect when Docker is not installed (ENOENT)', async () => {
      const mockProcess = createMockProcessWithError('spawn docker ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.error).toContain('ENOENT');
    });

    it('should detect permission denied errors', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Got permission denied while trying to connect to the Docker daemon socket',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.error).toContain('permission denied');
    });

    it('should return running=true when daemon responds', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: '24.0.7',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(true);
      expect(status.version).toBe('24.0.7');
    });
  });

  describe('getFullStatus with daemon not running', () => {
    it('should return containerState=unknown when daemon not running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Cannot connect to the Docker daemon',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.getFullStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.containerState).toBe('unknown');
      expect(status.error).toBeDefined();
    });

    it('should not check container status if daemon not running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Docker daemon not running',
      });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.getFullStatus();

      // Should only call once (daemon check), not twice (daemon + container)
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });

    it('should include timestamp even when daemon not running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Docker daemon not running',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.getFullStatus();

      expect(status.timestamp).toBeDefined();
      expect(new Date(status.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('isDockerAvailable', () => {
    it('should return true when Docker CLI is installed', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'Docker version 24.0.7, build afdd53b',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const isAvailable = await dockerManager.isDockerAvailable();

      expect(isAvailable).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker',
        ['--version'],
        expect.any(Object)
      );
    });

    it('should return false when Docker CLI is not installed', async () => {
      const mockProcess = createMockProcessWithError('spawn docker ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const isAvailable = await dockerManager.isDockerAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should return false on timeout', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        delay: 10000, // 10 second delay
      });
      mockSpawn.mockReturnValue(mockProcess);

      const isAvailable = await dockerManager.isDockerAvailable();

      // Should timeout at 5 seconds
      expect(isAvailable).toBe(false);
    }, 10000);
  });

  describe('getDaemonError', () => {
    it('should provide user-friendly message for daemon not running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Cannot connect to the Docker daemon',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const error = await dockerManager.getDaemonError();

      expect(error.code).toBe('DAEMON_NOT_RUNNING');
      expect(error.message).toContain('Docker');
      expect(error.suggestion).toBeDefined();
    });

    it('should provide user-friendly message for Docker not installed', async () => {
      const mockProcess = createMockProcessWithError('spawn docker ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const error = await dockerManager.getDaemonError();

      expect(error.code).toBe('DOCKER_NOT_INSTALLED');
      expect(error.suggestion).toContain('install');
    });

    it('should provide user-friendly message for permission errors', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'permission denied',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const error = await dockerManager.getDaemonError();

      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.suggestion).toBeDefined();
    });

    it('should return null when daemon is running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: '24.0.7',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const error = await dockerManager.getDaemonError();

      expect(error).toBeNull();
    });
  });

  describe('waitForDaemon', () => {
    it('should resolve immediately if daemon is already running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: '24.0.7',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const startTime = Date.now();
      const result = await dockerManager.waitForDaemon(5000, 1000);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should retry until daemon starts', async () => {
      const failProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Daemon not running',
      });
      const successProcess = createMockProcess({
        closeCode: 0,
        stdout: '24.0.7',
      });

      mockSpawn
        .mockReturnValueOnce(failProcess)
        .mockReturnValueOnce(failProcess)
        .mockReturnValueOnce(successProcess);

      const result = await dockerManager.waitForDaemon(10000, 100);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledTimes(3);
    });

    it('should timeout if daemon never starts', async () => {
      const failProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Daemon not running',
      });
      mockSpawn.mockReturnValue(failProcess);

      const result = await dockerManager.waitForDaemon(1000, 200);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 5000);

    it('should call onRetry callback', async () => {
      const failProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Daemon not running',
      });
      const successProcess = createMockProcess({
        closeCode: 0,
        stdout: '24.0.7',
      });

      mockSpawn
        .mockReturnValueOnce(failProcess)
        .mockReturnValueOnce(successProcess);

      const onRetry = jest.fn();
      await dockerManager.waitForDaemon(5000, 100, onRetry);

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(String));
    });
  });
});

describe('Docker Error Classification', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container');
  });

  it('should classify "Cannot connect" as DAEMON_NOT_RUNNING', async () => {
    const mockProcess = createMockProcess({
      closeCode: 1,
      stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const error = await dockerManager.getDaemonError();
    expect(error?.code).toBe('DAEMON_NOT_RUNNING');
  });

  it('should classify ENOENT as DOCKER_NOT_INSTALLED', async () => {
    const mockProcess = createMockProcessWithError('spawn docker ENOENT');
    mockSpawn.mockReturnValue(mockProcess);

    const error = await dockerManager.getDaemonError();
    expect(error?.code).toBe('DOCKER_NOT_INSTALLED');
  });

  it('should classify "permission denied" as PERMISSION_DENIED', async () => {
    const mockProcess = createMockProcess({
      closeCode: 1,
      stderr: 'Got permission denied while trying to connect',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const error = await dockerManager.getDaemonError();
    expect(error?.code).toBe('PERMISSION_DENIED');
  });

  it('should classify unknown errors as UNKNOWN_ERROR', async () => {
    const mockProcess = createMockProcess({
      closeCode: 1,
      stderr: 'Some unknown error',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const error = await dockerManager.getDaemonError();
    expect(error?.code).toBe('UNKNOWN_ERROR');
  });
});

// Helper functions for creating mock processes
function createMockProcess(options: {
  closeCode: number;
  stdout?: string;
  stderr?: string;
  delay?: number;
}) {
  const { closeCode, stdout = '', stderr = '', delay = 0 } = options;

  const mockStdout = {
    on: jest.fn((event, callback) => {
      if (event === 'data' && stdout) {
        setTimeout(() => callback(Buffer.from(stdout)), delay);
      }
    }),
  };

  const mockStderr = {
    on: jest.fn((event, callback) => {
      if (event === 'data' && stderr) {
        setTimeout(() => callback(Buffer.from(stderr)), delay);
      }
    }),
  };

  const mockProcess = {
    stdout: mockStdout,
    stderr: mockStderr,
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(closeCode), delay + 10);
      }
    }),
  };

  return mockProcess;
}

function createMockProcessWithError(errorMessage: string) {
  return {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'error') {
        callback(new Error(errorMessage));
      }
    }),
  };
}
