/**
 * Docker Manager Module
 * Subtask 13.3: Implement Docker status checking (docker ps)
 * Subtask 13.4: Implement container lifecycle management (start/stop)
 * Subtask 13.5: Handle Docker daemon not running scenario
 *
 * Provides comprehensive Docker management including:
 * - Docker daemon status
 * - Container status (running/stopped)
 * - Container health status
 * - Container details
 * - Container lifecycle (start/stop/restart)
 * - Docker daemon error detection and handling
 */

import { spawn, ChildProcess } from 'child_process';

/**
 * Docker status information
 */
export interface DockerStatus {
  /** Whether the Docker daemon is running and accessible */
  isDaemonRunning: boolean;
  /** Docker daemon version */
  version?: string;
  /** Container state: running, stopped, unknown */
  containerState: 'running' | 'stopped' | 'unknown';
  /** Container name being monitored */
  containerName?: string;
  /** Container health status if available */
  healthStatus?: 'healthy' | 'unhealthy' | 'starting' | 'none';
  /** Error message if any */
  error?: string;
  /** ISO timestamp of when status was checked */
  timestamp: string;
}

/**
 * Container details from docker inspect
 */
export interface ContainerDetails {
  name: string;
  state: string;
  healthStatus?: string;
  image: string;
  created?: string;
  ports?: string[];
}

/**
 * Result from daemon status check
 */
interface DaemonStatusResult {
  isDaemonRunning: boolean;
  version?: string;
  error?: string;
}

/**
 * Result from container status check
 */
interface ContainerStatusResult {
  containerState: 'running' | 'stopped' | 'unknown';
  containerName?: string;
  error?: string;
}

/**
 * Result from container lifecycle operations (start/stop/restart)
 */
export interface ContainerLifecycleResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Options for starting a container
 */
export interface StartContainerOptions {
  /** Rebuild images before starting */
  build?: boolean;
  /** Force recreation of containers */
  forceRecreate?: boolean;
  /** Environment variables to pass */
  env?: Record<string, string>;
}

/**
 * Options for stopping a container
 */
export interface StopContainerOptions {
  /** Remove volumes when stopping */
  removeVolumes?: boolean;
  /** Remove orphan containers */
  removeOrphans?: boolean;
}

/**
 * Options for building images
 */
export interface BuildImageOptions {
  /** Don't use cache when building */
  noCache?: boolean;
}

/**
 * Docker daemon error codes
 */
export type DockerErrorCode =
  | 'DAEMON_NOT_RUNNING'
  | 'DOCKER_NOT_INSTALLED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * User-friendly Docker error information
 */
export interface DockerError {
  /** Error code for programmatic handling */
  code: DockerErrorCode;
  /** User-friendly error message */
  message: string;
  /** Suggestion to fix the error */
  suggestion: string;
  /** Original error message from Docker */
  originalError?: string;
}

/**
 * Result from waiting for daemon
 */
export interface WaitForDaemonResult {
  success: boolean;
  error?: string;
  retryCount?: number;
}

/**
 * Docker Manager class for checking Docker and container status
 */
export class DockerManager {
  private containerName: string;
  private timeout: number;
  private composePath: string;
  private useComposeV2: boolean;

  /**
   * Create a new DockerManager instance
   * @param containerName - Name of the container to monitor
   * @param timeout - Timeout for Docker commands in milliseconds (default: 10000)
   * @param composePath - Path to docker-compose.yml directory
   * @param useComposeV2 - Use 'docker compose' (v2) instead of 'docker-compose' (default: false)
   */
  constructor(
    containerName: string,
    timeout: number = 10000,
    composePath: string = process.cwd(),
    useComposeV2: boolean = false
  ) {
    this.containerName = containerName;
    this.timeout = timeout;
    this.composePath = composePath;
    this.useComposeV2 = useComposeV2;
  }

  /**
   * Get the compose command based on version setting
   */
  private getComposeCommand(): { cmd: string; baseArgs: string[] } {
    if (this.useComposeV2) {
      return { cmd: 'docker', baseArgs: ['compose'] };
    }
    return { cmd: 'docker-compose', baseArgs: [] };
  }

  /**
   * Check if Docker daemon is running
   * Uses `docker info` to verify daemon connectivity
   */
  async checkDaemonStatus(): Promise<DaemonStatusResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          isDaemonRunning: false,
          error: 'Timeout waiting for Docker daemon',
        });
      }, this.timeout);

      const process = spawn('docker', ['info', '--format', '{{.ServerVersion}}'], {
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            isDaemonRunning: true,
            version: stdout.trim(),
          });
        } else {
          resolve({
            isDaemonRunning: false,
            error: stderr.trim() || 'Docker daemon not responding',
          });
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          isDaemonRunning: false,
          error: err.message,
        });
      });
    });
  }

  /**
   * Check container status using docker ps
   */
  async checkContainerStatus(): Promise<ContainerStatusResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          containerState: 'unknown',
          error: 'Timeout waiting for docker ps',
        });
      }, this.timeout);

      const process = spawn('docker', ['ps', '--format', '{{.Names}}'], {
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          resolve({
            containerState: 'unknown',
            error: stderr.trim() || 'Failed to list containers',
          });
          return;
        }

        // Parse container names from output
        const containers = stdout
          .trim()
          .split('\n')
          .map((name) => name.trim())
          .filter(Boolean);

        // Check if our container is in the list
        const isRunning = containers.some((name) => name === this.containerName);

        resolve({
          containerState: isRunning ? 'running' : 'stopped',
          containerName: isRunning ? this.containerName : undefined,
        });
      });

      process.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          containerState: 'unknown',
          error: err.message,
        });
      });
    });
  }

  /**
   * Get detailed container information using docker inspect
   */
  async getContainerDetails(): Promise<ContainerDetails | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(null);
      }, this.timeout);

      const format = '{{json .}}';
      const process = spawn(
        'docker',
        ['inspect', this.containerName, '--format', format],
        { shell: true }
      );

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0 || !stdout.trim()) {
          resolve(null);
          return;
        }

        try {
          const data = JSON.parse(stdout.trim());
          resolve({
            name: data.Name?.replace(/^\//, '') || this.containerName,
            state: data.State?.Status || 'unknown',
            healthStatus: data.State?.Health?.Status,
            image: data.Config?.Image || '',
            created: data.Created,
            ports: this.extractPorts(data),
          });
        } catch (err) {
          resolve(null);
        }
      });

      process.on('error', () => {
        clearTimeout(timeoutId);
        resolve(null);
      });
    });
  }

  /**
   * Extract port mappings from container data
   */
  private extractPorts(data: any): string[] {
    const ports: string[] = [];
    const portBindings = data.NetworkSettings?.Ports || {};

    for (const [containerPort, hostBindings] of Object.entries(portBindings)) {
      if (Array.isArray(hostBindings) && hostBindings.length > 0) {
        const binding = hostBindings[0] as { HostIp?: string; HostPort?: string };
        if (binding.HostPort) {
          ports.push(`${binding.HostPort}:${containerPort}`);
        }
      }
    }

    return ports;
  }

  /**
   * Check if container is healthy
   * Uses docker inspect to check health status
   */
  async isContainerHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, this.timeout);

      const process = spawn(
        'docker',
        ['inspect', this.containerName, '--format', '{{.State.Health.Status}}'],
        { shell: true }
      );

      let stdout = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          resolve(false);
          return;
        }

        const healthStatus = stdout.trim().toLowerCase();
        resolve(healthStatus === 'healthy');
      });

      process.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });
    });
  }

  /**
   * Get comprehensive Docker status
   * Combines daemon status and container status
   */
  async getFullStatus(): Promise<DockerStatus> {
    const timestamp = new Date().toISOString();

    // First check if daemon is running
    const daemonStatus = await this.checkDaemonStatus();

    if (!daemonStatus.isDaemonRunning) {
      return {
        isDaemonRunning: false,
        containerState: 'unknown',
        error: daemonStatus.error,
        timestamp,
      };
    }

    // If daemon is running, check container status
    const containerStatus = await this.checkContainerStatus();

    // Get health status if container is running
    let healthStatus: 'healthy' | 'unhealthy' | 'starting' | 'none' | undefined;
    if (containerStatus.containerState === 'running') {
      const isHealthy = await this.isContainerHealthy();
      healthStatus = isHealthy ? 'healthy' : 'unhealthy';
    }

    return {
      isDaemonRunning: true,
      version: daemonStatus.version,
      containerState: containerStatus.containerState,
      containerName: containerStatus.containerName || this.containerName,
      healthStatus,
      timestamp,
    };
  }

  /**
   * Check if Docker command is available
   */
  async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000);

      const process = spawn('docker', ['--version'], { shell: true });

      process.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve(code === 0);
      });

      process.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });
    });
  }

  /**
   * Get container logs (last N lines)
   * @param lines - Number of lines to retrieve (default: 100)
   */
  async getContainerLogs(lines: number = 100): Promise<string> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve('');
      }, this.timeout);

      const process = spawn(
        'docker',
        ['logs', '--tail', lines.toString(), this.containerName],
        { shell: true }
      );

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        // Docker logs sends output to stderr
        output += data.toString();
      });

      process.on('close', () => {
        clearTimeout(timeoutId);
        resolve(output);
      });

      process.on('error', () => {
        clearTimeout(timeoutId);
        resolve('');
      });
    });
  }

  // ===========================================================================
  // Container Lifecycle Management (Subtask 13.4)
  // ===========================================================================

  /**
   * Start the container using docker-compose up -d
   * @param options - Start options (build, forceRecreate, env)
   */
  async startContainer(options: StartContainerOptions = {}): Promise<ContainerLifecycleResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout waiting for container to start',
        });
      }, this.timeout);

      const { cmd, baseArgs } = this.getComposeCommand();
      const args = [...baseArgs, 'up', '-d'];

      if (options.build) {
        args.push('--build');
      }
      if (options.forceRecreate) {
        args.push('--force-recreate');
      }

      const env = options.env
        ? { ...process.env, ...options.env }
        : process.env;

      const childProcess = spawn(cmd, args, {
        cwd: this.composePath,
        shell: true,
        env,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            success: true,
            message: stdout.trim() || stderr.trim() || 'Container started successfully',
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || 'Failed to start container',
          });
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err.message,
        });
      });
    });
  }

  /**
   * Stop the container using docker-compose down
   * @param options - Stop options (removeVolumes, removeOrphans)
   */
  async stopContainer(options: StopContainerOptions = {}): Promise<ContainerLifecycleResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout waiting for container to stop',
        });
      }, this.timeout);

      const { cmd, baseArgs } = this.getComposeCommand();
      const args = [...baseArgs, 'down'];

      if (options.removeVolumes) {
        args.push('--volumes');
      }
      if (options.removeOrphans) {
        args.push('--remove-orphans');
      }

      const childProcess = spawn(cmd, args, {
        cwd: this.composePath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            success: true,
            message: stdout.trim() || stderr.trim() || 'Container stopped successfully',
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || 'Failed to stop container',
          });
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err.message,
        });
      });
    });
  }

  /**
   * Restart the container (stop then start)
   */
  async restartContainer(): Promise<ContainerLifecycleResult> {
    // First stop
    const stopResult = await this.stopContainer();
    if (!stopResult.success) {
      return stopResult;
    }

    // Then start
    return this.startContainer();
  }

  /**
   * Pull the latest images using docker-compose pull
   */
  async pullImages(): Promise<ContainerLifecycleResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout waiting for image pull',
        });
      }, this.timeout);

      const { cmd, baseArgs } = this.getComposeCommand();
      const args = [...baseArgs, 'pull'];

      const childProcess = spawn(cmd, args, {
        cwd: this.composePath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            success: true,
            message: stdout.trim() || stderr.trim() || 'Images pulled successfully',
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || 'Failed to pull images',
          });
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err.message,
        });
      });
    });
  }

  /**
   * Build images using docker-compose build
   * @param options - Build options (noCache)
   */
  async buildImages(options: BuildImageOptions = {}): Promise<ContainerLifecycleResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout waiting for image build',
        });
      }, this.timeout);

      const { cmd, baseArgs } = this.getComposeCommand();
      const args = [...baseArgs, 'build'];

      if (options.noCache) {
        args.push('--no-cache');
      }

      const childProcess = spawn(cmd, args, {
        cwd: this.composePath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({
            success: true,
            message: stdout.trim() || stderr.trim() || 'Images built successfully',
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || 'Failed to build images',
          });
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err.message,
        });
      });
    });
  }

  // ===========================================================================
  // Docker Daemon Error Handling (Subtask 13.5)
  // ===========================================================================

  /**
   * Classify Docker error from error message
   */
  private classifyError(errorMessage: string): DockerErrorCode {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('enoent') || lowerError.includes('not found')) {
      return 'DOCKER_NOT_INSTALLED';
    }

    if (lowerError.includes('permission denied')) {
      return 'PERMISSION_DENIED';
    }

    if (
      lowerError.includes('cannot connect') ||
      lowerError.includes('daemon') ||
      lowerError.includes('is the docker daemon running')
    ) {
      return 'DAEMON_NOT_RUNNING';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message based on error code
   */
  private getErrorDetails(code: DockerErrorCode, originalError?: string): DockerError {
    const errors: Record<DockerErrorCode, Omit<DockerError, 'code' | 'originalError'>> = {
      DOCKER_NOT_INSTALLED: {
        message: 'Docker is not installed on this system',
        suggestion: 'Please install Docker Desktop from https://www.docker.com/products/docker-desktop',
      },
      DAEMON_NOT_RUNNING: {
        message: 'Docker daemon is not running',
        suggestion: 'Please start Docker Desktop and wait for it to fully initialize',
      },
      PERMISSION_DENIED: {
        message: 'Permission denied when accessing Docker',
        suggestion: 'Please ensure your user has permission to access Docker. You may need to add your user to the "docker" group or run as administrator.',
      },
      UNKNOWN_ERROR: {
        message: 'An unknown Docker error occurred',
        suggestion: 'Please check that Docker is properly installed and running',
      },
    };

    return {
      code,
      ...errors[code],
      originalError,
    };
  }

  /**
   * Get detailed Docker daemon error if daemon is not running
   * Returns null if daemon is running properly
   */
  async getDaemonError(): Promise<DockerError | null> {
    const status = await this.checkDaemonStatus();

    if (status.isDaemonRunning) {
      return null;
    }

    const errorCode = this.classifyError(status.error || '');
    return this.getErrorDetails(errorCode, status.error);
  }

  /**
   * Wait for Docker daemon to become available
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @param intervalMs - Time between checks in milliseconds
   * @param onRetry - Optional callback called on each retry with (attempt, error)
   */
  async waitForDaemon(
    timeoutMs: number = 30000,
    intervalMs: number = 2000,
    onRetry?: (attempt: number, error: string) => void
  ): Promise<WaitForDaemonResult> {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkDaemonStatus();

      if (status.isDaemonRunning) {
        return { success: true, retryCount: attempt };
      }

      attempt++;

      if (onRetry && status.error) {
        onRetry(attempt, status.error);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return {
      success: false,
      error: `Docker daemon did not start within ${timeoutMs / 1000} seconds (timeout)`,
      retryCount: attempt,
    };
  }

  /**
   * Check Docker availability and return detailed status
   * Useful for startup checks in the UI
   */
  async getStartupStatus(): Promise<{
    dockerInstalled: boolean;
    daemonRunning: boolean;
    error?: DockerError;
  }> {
    // First check if Docker CLI is installed
    const isInstalled = await this.isDockerAvailable();

    if (!isInstalled) {
      return {
        dockerInstalled: false,
        daemonRunning: false,
        error: this.getErrorDetails('DOCKER_NOT_INSTALLED'),
      };
    }

    // Check if daemon is running
    const daemonStatus = await this.checkDaemonStatus();

    if (!daemonStatus.isDaemonRunning) {
      const errorCode = this.classifyError(daemonStatus.error || '');
      return {
        dockerInstalled: true,
        daemonRunning: false,
        error: this.getErrorDetails(errorCode, daemonStatus.error),
      };
    }

    return {
      dockerInstalled: true,
      daemonRunning: true,
    };
  }
}

// Export a default instance for the MCP container
export const mcpDockerManager = new DockerManager('mcp-container');
