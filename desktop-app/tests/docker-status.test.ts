/**
 * Tests for Docker status checking
 * Subtask 13.3: Implement Docker status checking (docker ps)
 */

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Import after mocking
import { DockerStatus, DockerManager } from '../electron/docker-manager';

describe('Docker Status Checking', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container');
  });

  describe('checkDaemonStatus', () => {
    it('should return running=true when Docker daemon responds', async () => {
      const mockProcess = createMockProcess({ closeCode: 0, stdout: '' });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker',
        ['info', '--format', '{{.ServerVersion}}'],
        expect.objectContaining({ shell: true })
      );
    });

    it('should return running=false when Docker daemon is not responding', async () => {
      const mockProcess = createMockProcess({ closeCode: 1, stderr: 'Cannot connect to Docker daemon' });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.error).toContain('Cannot connect');
    });

    it('should return running=false on spawn error', async () => {
      const mockProcess = createMockProcessWithError('spawn ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.error).toContain('ENOENT');
    });

    it('should capture Docker version when available', async () => {
      const mockProcess = createMockProcess({ closeCode: 0, stdout: '24.0.7' });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkDaemonStatus();

      expect(status.isDaemonRunning).toBe(true);
      expect(status.version).toBe('24.0.7');
    });
  });

  describe('checkContainerStatus', () => {
    it('should return running when container is in docker ps output', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'mcp-container\nother-container\n',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkContainerStatus();

      expect(status.containerState).toBe('running');
      expect(status.containerName).toBe('mcp-container');
    });

    it('should return stopped when container is not in docker ps', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'other-container\n',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkContainerStatus();

      expect(status.containerState).toBe('stopped');
    });

    it('should return not_found when no containers are running', async () => {
      const mockProcess = createMockProcess({ closeCode: 0, stdout: '' });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkContainerStatus();

      expect(status.containerState).toBe('stopped');
    });

    it('should return unknown when docker ps fails', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Error',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.checkContainerStatus();

      expect(status.containerState).toBe('unknown');
    });

    it('should use docker ps with --format flag', async () => {
      const mockProcess = createMockProcess({ closeCode: 0, stdout: '' });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.checkContainerStatus();

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker',
        ['ps', '--format', '{{.Names}}'],
        expect.any(Object)
      );
    });
  });

  describe('getContainerDetails', () => {
    it('should return container details when running', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: JSON.stringify({
          Name: 'mcp-container',
          State: { Status: 'running', Health: { Status: 'healthy' } },
          Config: { Image: 'mcp-container:latest' },
        }),
      });
      mockSpawn.mockReturnValue(mockProcess);

      const details = await dockerManager.getContainerDetails();

      expect(details).toBeDefined();
      expect(details?.name).toBe('mcp-container');
      expect(details?.state).toBe('running');
      expect(details?.healthStatus).toBe('healthy');
    });

    it('should return null when container does not exist', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'No such container',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const details = await dockerManager.getContainerDetails();

      expect(details).toBeNull();
    });

    it('should use docker inspect command', async () => {
      const mockProcess = createMockProcess({ closeCode: 1, stderr: '' });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.getContainerDetails();

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker',
        ['inspect', 'mcp-container', '--format', expect.any(String)],
        expect.any(Object)
      );
    });
  });

  describe('getFullStatus', () => {
    it('should return comprehensive status object', async () => {
      // First call for daemon check
      const daemonProcess = createMockProcess({ closeCode: 0, stdout: '24.0.7' });
      // Second call for container check
      const containerProcess = createMockProcess({
        closeCode: 0,
        stdout: 'mcp-container\n',
      });

      mockSpawn
        .mockReturnValueOnce(daemonProcess)
        .mockReturnValueOnce(containerProcess);

      const status = await dockerManager.getFullStatus();

      expect(status).toMatchObject({
        isDaemonRunning: true,
        version: '24.0.7',
        containerState: 'running',
        containerName: 'mcp-container',
      });
    });

    it('should return daemon_not_running when Docker is not available', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Cannot connect to Docker daemon',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.getFullStatus();

      expect(status.isDaemonRunning).toBe(false);
      expect(status.containerState).toBe('unknown');
    });

    it('should include timestamp in status', async () => {
      const mockProcess = createMockProcess({ closeCode: 0, stdout: '' });
      mockSpawn.mockReturnValue(mockProcess);

      const status = await dockerManager.getFullStatus();

      expect(status.timestamp).toBeDefined();
      expect(new Date(status.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('isContainerHealthy', () => {
    it('should return true when container is healthy', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'healthy',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const isHealthy = await dockerManager.isContainerHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false when container is unhealthy', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'unhealthy',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const isHealthy = await dockerManager.isContainerHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should return false when health check not configured', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'No health check defined',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const isHealthy = await dockerManager.isContainerHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('DockerStatus type', () => {
    it('should have all required properties', () => {
      const status: DockerStatus = {
        isDaemonRunning: true,
        version: '24.0.7',
        containerState: 'running',
        containerName: 'mcp-container',
        healthStatus: 'healthy',
        timestamp: new Date().toISOString(),
      };

      expect(status.isDaemonRunning).toBe(true);
      expect(status.containerState).toBe('running');
    });

    it('should allow optional error property', () => {
      const status: DockerStatus = {
        isDaemonRunning: false,
        containerState: 'unknown',
        error: 'Docker daemon not running',
        timestamp: new Date().toISOString(),
      };

      expect(status.error).toBe('Docker daemon not running');
    });
  });
});

describe('Docker Status Edge Cases', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container');
  });

  it('should handle partial container name match', async () => {
    const mockProcess = createMockProcess({
      closeCode: 0,
      stdout: 'mcp-container-dev\nmcp-container\ntest-container',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const status = await dockerManager.checkContainerStatus();

    // Should match exact name, not partial
    expect(status.containerState).toBe('running');
  });

  it('should handle container names with special characters', async () => {
    const specialManager = new DockerManager('my-container_v1.2');
    const mockProcess = createMockProcess({
      closeCode: 0,
      stdout: 'my-container_v1.2\n',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const status = await specialManager.checkContainerStatus();

    expect(status.containerState).toBe('running');
  });

  it('should timeout after 10 seconds', async () => {
    const mockProcess = createMockProcess({
      closeCode: 0,
      stdout: '',
      delay: 15000, // 15 second delay
    });
    mockSpawn.mockReturnValue(mockProcess);

    const startTime = Date.now();
    const status = await dockerManager.checkDaemonStatus();
    const duration = Date.now() - startTime;

    // Should timeout before 15 seconds
    expect(duration).toBeLessThan(11000);
    expect(status.isDaemonRunning).toBe(false);
  }, 15000);

  it('should handle empty stdout gracefully', async () => {
    const mockProcess = createMockProcess({ closeCode: 0, stdout: '\n\n' });
    mockSpawn.mockReturnValue(mockProcess);

    const status = await dockerManager.checkContainerStatus();

    expect(status.containerState).toBe('stopped');
  });

  it('should handle whitespace in container names', async () => {
    const mockProcess = createMockProcess({
      closeCode: 0,
      stdout: '  mcp-container  \n',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const status = await dockerManager.checkContainerStatus();

    expect(status.containerState).toBe('running');
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
