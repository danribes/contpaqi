/**
 * Docker Manager Module
 * Subtask 13.3: Implement Docker status checking (docker ps)
 *
 * Provides comprehensive Docker status checking including:
 * - Docker daemon status
 * - Container status (running/stopped)
 * - Container health status
 * - Container details
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
 * Docker Manager class for checking Docker and container status
 */
export class DockerManager {
  private containerName: string;
  private timeout: number;

  /**
   * Create a new DockerManager instance
   * @param containerName - Name of the container to monitor
   * @param timeout - Timeout for Docker commands in milliseconds (default: 10000)
   */
  constructor(containerName: string, timeout: number = 10000) {
    this.containerName = containerName;
    this.timeout = timeout;
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
}

// Export a default instance for the MCP container
export const mcpDockerManager = new DockerManager('mcp-container');
