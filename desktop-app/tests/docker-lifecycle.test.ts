/**
 * Tests for Docker container lifecycle management
 * Subtask 13.4: Implement container lifecycle management (start/stop)
 */

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Import after mocking
import { DockerManager, ContainerLifecycleResult } from '../electron/docker-manager';

describe('Container Lifecycle Management', () => {
  let dockerManager: DockerManager;
  const composePath = '/path/to/mcp-container';

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container', 10000, composePath);
  });

  describe('startContainer', () => {
    it('should start container with docker-compose up -d', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.startContainer();

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['up', '-d'],
        expect.objectContaining({
          cwd: composePath,
          shell: true,
        })
      );
    });

    it('should return error when docker-compose up fails', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Error: Cannot connect to Docker daemon',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.startContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot connect to Docker daemon');
    });

    it('should handle spawn error', async () => {
      const mockProcess = createMockProcessWithError('spawn ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.startContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should timeout after configured duration', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        delay: 15000, // 15 second delay
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.startContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    }, 15000);

    it('should capture stdout messages', async () => {
      const mockProcess = createMockProcess({
        closeCode: 0,
        stdout: 'Creating mcp-container ... done',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.startContainer();

      expect(result.success).toBe(true);
      expect(result.message).toContain('done');
    });

    it('should build images if --build flag is passed', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.startContainer({ build: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['up', '-d', '--build'],
        expect.any(Object)
      );
    });

    it('should force recreate if --force-recreate flag is passed', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.startContainer({ forceRecreate: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['up', '-d', '--force-recreate'],
        expect.any(Object)
      );
    });
  });

  describe('stopContainer', () => {
    it('should stop container with docker-compose down', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.stopContainer();

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['down'],
        expect.objectContaining({
          cwd: composePath,
          shell: true,
        })
      );
    });

    it('should return error when docker-compose down fails', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Error stopping container',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.stopContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('stopping container');
    });

    it('should handle spawn error', async () => {
      const mockProcess = createMockProcessWithError('spawn ENOENT');
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.stopContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should remove volumes if --volumes flag is passed', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.stopContainer({ removeVolumes: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['down', '--volumes'],
        expect.any(Object)
      );
    });

    it('should remove orphans if flag is passed', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.stopContainer({ removeOrphans: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['down', '--remove-orphans'],
        expect.any(Object)
      );
    });
  });

  describe('restartContainer', () => {
    it('should restart by stopping then starting', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.restartContainer();

      expect(result.success).toBe(true);
      // Should call docker-compose down, then docker-compose up -d
      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });

    it('should fail if stop fails', async () => {
      const failProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Failed to stop',
      });
      mockSpawn.mockReturnValue(failProcess);

      const result = await dockerManager.restartContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to stop');
    });

    it('should fail if start fails after successful stop', async () => {
      const stopProcess = createMockProcess({ closeCode: 0 });
      const startProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Failed to start',
      });

      mockSpawn
        .mockReturnValueOnce(stopProcess)
        .mockReturnValueOnce(startProcess);

      const result = await dockerManager.restartContainer();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start');
    });
  });

  describe('pullImages', () => {
    it('should pull images with docker-compose pull', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.pullImages();

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['pull'],
        expect.objectContaining({
          cwd: composePath,
          shell: true,
        })
      );
    });

    it('should return error when pull fails', async () => {
      const mockProcess = createMockProcess({
        closeCode: 1,
        stderr: 'Error pulling image',
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.pullImages();

      expect(result.success).toBe(false);
      expect(result.error).toContain('pulling image');
    });
  });

  describe('buildImages', () => {
    it('should build images with docker-compose build', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await dockerManager.buildImages();

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['build'],
        expect.objectContaining({
          cwd: composePath,
          shell: true,
        })
      );
    });

    it('should use --no-cache flag when specified', async () => {
      const mockProcess = createMockProcess({ closeCode: 0 });
      mockSpawn.mockReturnValue(mockProcess);

      await dockerManager.buildImages({ noCache: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        ['build', '--no-cache'],
        expect.any(Object)
      );
    });
  });

  describe('ContainerLifecycleResult', () => {
    it('should have success and optional fields', () => {
      const successResult: ContainerLifecycleResult = {
        success: true,
        message: 'Container started',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.message).toBe('Container started');

      const errorResult: ContainerLifecycleResult = {
        success: false,
        error: 'Failed to start',
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Failed to start');
    });
  });
});

describe('Container Lifecycle Edge Cases', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager('mcp-container', 10000, '/path/to/compose');
  });

  it('should handle empty stderr on failure', async () => {
    const mockProcess = createMockProcess({
      closeCode: 1,
      stderr: '',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const result = await dockerManager.startContainer();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to start container');
  });

  it('should handle mixed stdout and stderr', async () => {
    const mockProcess = createMockProcess({
      closeCode: 0,
      stdout: 'Creating network...\nCreating container...',
      stderr: 'Warning: some deprecation notice',
    });
    mockSpawn.mockReturnValue(mockProcess);

    const result = await dockerManager.startContainer();

    expect(result.success).toBe(true);
    // Should capture both stdout and warnings
    expect(result.message).toContain('Creating');
  });

  it('should use docker compose (v2) command when available', async () => {
    const dockerManager = new DockerManager('mcp-container', 10000, '/path', true);
    const mockProcess = createMockProcess({ closeCode: 0 });
    mockSpawn.mockReturnValue(mockProcess);

    await dockerManager.startContainer();

    expect(mockSpawn).toHaveBeenCalledWith(
      'docker',
      ['compose', 'up', '-d'],
      expect.any(Object)
    );
  });

  it('should handle concurrent lifecycle operations', async () => {
    const mockProcess = createMockProcess({ closeCode: 0, delay: 100 });
    mockSpawn.mockReturnValue(mockProcess);

    // Start multiple operations concurrently
    const results = await Promise.all([
      dockerManager.startContainer(),
      dockerManager.stopContainer(),
    ]);

    // Both should complete (though in real use, this would be problematic)
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it('should pass environment variables to docker-compose', async () => {
    const mockProcess = createMockProcess({ closeCode: 0 });
    mockSpawn.mockReturnValue(mockProcess);

    await dockerManager.startContainer({ env: { NODE_ENV: 'production' } });

    expect(mockSpawn).toHaveBeenCalledWith(
      'docker-compose',
      ['up', '-d'],
      expect.objectContaining({
        env: expect.objectContaining({
          NODE_ENV: 'production',
        }),
      })
    );
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
