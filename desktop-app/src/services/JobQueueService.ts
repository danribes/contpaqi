/**
 * Job Queue Service
 * Subtask 15.7: Integrate license check into JobQueueService
 *
 * A license-aware job queue service that validates licenses before
 * processing jobs and enforces license-based limits on concurrent
 * jobs, batch sizes, and feature access.
 */

import { License, LicenseType, LicenseStatus } from './LicensingServer';

// =============================================================================
// Types
// =============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';
export type JobType = string;
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export type LicenseBlockReason =
  | 'NO_LICENSE'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_REVOKED'
  | 'LICENSE_SUSPENDED'
  | 'FEATURE_NOT_AVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BATCH_SIZE_EXCEEDED';

export interface JobData {
  [key: string]: unknown;
  requiredFeature?: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  data: JobData;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  result?: JobResult;
  retryCount: number;
  maxRetries: number;
  licenseChecked: boolean;
  blockReason?: LicenseBlockReason;
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface LicenseCheckResult {
  canProcess: boolean;
  reason: LicenseBlockReason | null;
  message?: string;
}

export interface JobQueueState {
  jobs: Job[];
  isProcessing: boolean;
  currentLicense: License | null;
  isLicenseValid: boolean;
  processingCount: number;
}

export interface JobQueueConfig {
  maxRetries: number;
  retryDelayMs: number;
  processingTimeoutMs: number;
  checkLicenseBeforeProcess: boolean;
  blockOnInvalidLicense: boolean;
  enableRateLimiting: boolean;
}

export interface JobQueueStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  blocked: number;
}

export type JobQueueEventType =
  | 'JOB_ADDED'
  | 'JOB_STARTED'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'JOB_BLOCKED'
  | 'JOB_REMOVED'
  | 'LICENSE_CHECKED'
  | 'LICENSE_CHANGED'
  | 'QUEUE_CLEARED';

export interface JobQueueEvent {
  type: JobQueueEventType;
  timestamp: Date;
  details: Record<string, unknown>;
}

export type JobQueueEventHandler = (event: JobQueueEvent) => void;
export type JobProcessor = (job: Job) => Promise<JobResult>;

export interface ProcessResult {
  success: boolean;
  blocked: boolean;
  reason?: LicenseBlockReason;
  jobId?: string;
  result?: JobResult;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_QUEUE_CONFIG: JobQueueConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  processingTimeoutMs: 60000,
  checkLicenseBeforeProcess: true,
  blockOnInvalidLicense: true,
  enableRateLimiting: true,
};

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const MAX_CONCURRENT_JOBS: Record<LicenseType, number> = {
  trial: 1,
  standard: 3,
  professional: 10,
  enterprise: Infinity,
};

const MAX_BATCH_SIZE: Record<LicenseType, number> = {
  trial: 5,
  standard: 25,
  professional: 100,
  enterprise: Infinity,
};

const STATUS_TEXTS: Record<JobStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
};

const TYPE_TEXTS: Record<string, string> = {
  'pdf-process': 'PDF Processing',
  'batch-process': 'Batch Processing',
  'export': 'Export',
  'import': 'Import',
  'api-call': 'API Call',
};

// =============================================================================
// Job Creation Functions
// =============================================================================

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new job with default values
 */
export function createJob(type: JobType, data: JobData): Job {
  return {
    id: generateJobId(),
    type,
    status: 'pending',
    priority: 'normal',
    data,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    error: null,
    retryCount: 0,
    maxRetries: DEFAULT_QUEUE_CONFIG.maxRetries,
    licenseChecked: false,
  };
}

/**
 * Create a job with specific priority
 */
export function createJobWithPriority(
  type: JobType,
  data: JobData,
  priority: JobPriority
): Job {
  const job = createJob(type, data);
  return { ...job, priority };
}

// =============================================================================
// Job Status Functions
// =============================================================================

/**
 * Update job status
 */
export function updateJobStatus(job: Job, status: JobStatus): Job {
  return { ...job, status };
}

/**
 * Mark job as processing
 */
export function markJobProcessing(job: Job): Job {
  return {
    ...job,
    status: 'processing',
    startedAt: new Date(),
    licenseChecked: true,
  };
}

/**
 * Mark job as completed with result
 */
export function markJobCompleted(job: Job, result: JobResult): Job {
  return {
    ...job,
    status: 'completed',
    completedAt: new Date(),
    result,
  };
}

/**
 * Mark job as failed with error
 */
export function markJobFailed(job: Job, error: string): Job {
  return {
    ...job,
    status: 'failed',
    completedAt: new Date(),
    error,
    retryCount: job.retryCount + 1,
  };
}

/**
 * Mark job as blocked due to license issue
 */
export function markJobBlocked(job: Job, reason: LicenseBlockReason): Job {
  return {
    ...job,
    status: 'blocked',
    blockReason: reason,
  };
}

// =============================================================================
// Queue Management Functions
// =============================================================================

/**
 * Create empty job queue
 */
export function createJobQueue(): JobQueueState {
  return {
    jobs: [],
    isProcessing: false,
    currentLicense: null,
    isLicenseValid: false,
    processingCount: 0,
  };
}

/**
 * Add job to queue
 */
export function addJob(state: JobQueueState, job: Job): JobQueueState {
  return {
    ...state,
    jobs: [...state.jobs, job],
  };
}

/**
 * Remove job from queue by ID
 */
export function removeJob(state: JobQueueState, jobId: string): JobQueueState {
  return {
    ...state,
    jobs: state.jobs.filter((j) => j.id !== jobId),
  };
}

/**
 * Get next job to process (respects priority)
 */
export function getNextJob(state: JobQueueState): Job | null {
  const pendingJobs = state.jobs.filter((j) => j.status === 'pending');

  if (pendingJobs.length === 0) {
    return null;
  }

  // Sort by priority (highest first)
  pendingJobs.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);

  return pendingJobs[0];
}

/**
 * Get job by ID
 */
export function getJobById(state: JobQueueState, jobId: string): Job | undefined {
  return state.jobs.find((j) => j.id === jobId);
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(state: JobQueueState, status: JobStatus): Job[] {
  return state.jobs.filter((j) => j.status === status);
}

/**
 * Get jobs by type
 */
export function getJobsByType(state: JobQueueState, type: JobType): Job[] {
  return state.jobs.filter((j) => j.type === type);
}

/**
 * Clear completed jobs
 */
export function clearCompletedJobs(state: JobQueueState): JobQueueState {
  return {
    ...state,
    jobs: state.jobs.filter((j) => j.status !== 'completed'),
  };
}

/**
 * Clear all jobs
 */
export function clearAllJobs(state: JobQueueState): JobQueueState {
  return {
    ...state,
    jobs: [],
  };
}

// =============================================================================
// License Check Functions
// =============================================================================

/**
 * Check if license allows job processing
 */
export function checkLicenseForJob(license: License | null, job: Job): LicenseCheckResult {
  // No license
  if (!license) {
    return {
      canProcess: false,
      reason: 'NO_LICENSE',
      message: 'No license configured',
    };
  }

  // Check license status
  if (license.status === 'expired' || isLicenseExpired(license)) {
    return {
      canProcess: false,
      reason: 'LICENSE_EXPIRED',
      message: 'License has expired',
    };
  }

  if (license.status === 'revoked') {
    return {
      canProcess: false,
      reason: 'LICENSE_REVOKED',
      message: 'License has been revoked',
    };
  }

  if (license.status === 'suspended') {
    return {
      canProcess: false,
      reason: 'LICENSE_SUSPENDED',
      message: 'License is suspended',
    };
  }

  // Check feature requirement
  const requiredFeature = job.data.requiredFeature as string | undefined;
  if (requiredFeature && !license.features.includes(requiredFeature)) {
    return {
      canProcess: false,
      reason: 'FEATURE_NOT_AVAILABLE',
      message: `Feature "${requiredFeature}" not available with current license`,
    };
  }

  return {
    canProcess: true,
    reason: null,
  };
}

/**
 * Quick check if job can be processed
 */
export function canProcessJob(license: License | null, job: Job): boolean {
  return checkLicenseForJob(license, job).canProcess;
}

/**
 * Check if license is valid for any processing
 */
export function isLicenseValid(license: License | null): boolean {
  if (!license) return false;
  if (license.status !== 'active') return false;
  if (isLicenseExpired(license)) return false;
  return true;
}

/**
 * Check if license has required feature
 */
export function hasRequiredFeature(license: License, feature: string | null): boolean {
  if (!feature) return true;
  return license.features.includes(feature);
}

/**
 * Check if license is expired by date
 */
function isLicenseExpired(license: License): boolean {
  if (!license.expiresAt) return false;
  return new Date() > license.expiresAt;
}

// =============================================================================
// License Limits Functions
// =============================================================================

/**
 * Get max concurrent jobs for license type
 */
export function getMaxConcurrentJobs(license: License | null): number {
  if (!license) return 0;
  return MAX_CONCURRENT_JOBS[license.type];
}

/**
 * Get max batch size for license type
 */
export function getMaxBatchSize(license: License | null): number {
  if (!license) return 0;
  return MAX_BATCH_SIZE[license.type];
}

/**
 * Check if current processing count is within rate limit
 */
export function isWithinRateLimit(license: License | null, currentCount: number): boolean {
  const maxConcurrent = getMaxConcurrentJobs(license);
  return currentCount < maxConcurrent;
}

// =============================================================================
// Config Functions
// =============================================================================

/**
 * Create default queue config
 */
export function createDefaultConfig(): JobQueueConfig {
  return { ...DEFAULT_QUEUE_CONFIG };
}

/**
 * Merge partial config with defaults
 */
export function mergeQueueConfig(partial: Partial<JobQueueConfig>): JobQueueConfig {
  return {
    ...DEFAULT_QUEUE_CONFIG,
    ...partial,
  };
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Get queue statistics
 */
export function getQueueStatistics(state: JobQueueState): JobQueueStatistics {
  const jobs = state.jobs;
  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    blocked: jobs.filter((j) => j.status === 'blocked').length,
  };
}

/**
 * Get processing rate (jobs per time period)
 */
export function getProcessingRate(state: JobQueueState, periodMs: number): number {
  const now = new Date().getTime();
  const completedInPeriod = state.jobs.filter((j) => {
    if (j.status !== 'completed' || !j.completedAt) return false;
    return now - j.completedAt.getTime() < periodMs;
  });
  return completedInPeriod.length;
}

/**
 * Get average processing time for completed jobs
 */
export function getAverageProcessingTime(state: JobQueueState): number {
  const completedJobs = state.jobs.filter(
    (j) => j.status === 'completed' && j.startedAt && j.completedAt
  );

  if (completedJobs.length === 0) return 0;

  const totalTime = completedJobs.reduce((sum, job) => {
    const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
    return sum + duration;
  }, 0);

  return totalTime / completedJobs.length;
}

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize job to JSON
 */
export function serializeJob(job: Job): string {
  return JSON.stringify({
    ...job,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() || null,
    completedAt: job.completedAt?.toISOString() || null,
  });
}

/**
 * Deserialize job from JSON
 */
export function deserializeJob(json: string): Job | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      startedAt: data.startedAt ? new Date(data.startedAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Serialize queue state to JSON
 */
export function serializeQueue(state: JobQueueState): string {
  return JSON.stringify({
    ...state,
    jobs: state.jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    })),
    currentLicense: state.currentLicense
      ? {
          ...state.currentLicense,
          activatedAt: state.currentLicense.activatedAt?.toISOString() || null,
          expiresAt: state.currentLicense.expiresAt?.toISOString() || null,
        }
      : null,
  });
}

/**
 * Deserialize queue state from JSON
 */
export function deserializeQueue(json: string): JobQueueState | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      jobs: data.jobs.map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
      })),
      currentLicense: data.currentLicense
        ? {
            ...data.currentLicense,
            activatedAt: data.currentLicense.activatedAt
              ? new Date(data.currentLicense.activatedAt)
              : null,
            expiresAt: data.currentLicense.expiresAt
              ? new Date(data.currentLicense.expiresAt)
              : null,
          }
        : null,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Get status text for display
 */
export function getJobStatusText(status: JobStatus): string {
  return STATUS_TEXTS[status];
}

/**
 * Get type text for display
 */
export function getJobTypeText(type: JobType): string {
  if (TYPE_TEXTS[type]) {
    return TYPE_TEXTS[type];
  }
  // Convert kebab-case to Title Case
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format job duration for display
 */
export function formatJobDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// =============================================================================
// Event Functions
// =============================================================================

/**
 * Create queue event
 */
export function createQueueEvent(
  type: JobQueueEventType,
  details: Record<string, unknown> = {}
): JobQueueEvent {
  return {
    type,
    timestamp: new Date(),
    details,
  };
}

// =============================================================================
// JobQueueService Class
// =============================================================================

/**
 * Job Queue Service
 * License-aware job queue with processing limits and feature gating
 */
export class JobQueueService {
  private state: JobQueueState;
  private config: JobQueueConfig;
  private eventHandlers: JobQueueEventHandler[] = [];
  private processor: JobProcessor | null = null;
  private offlineMode: boolean = false;

  constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = mergeQueueConfig(config);
    this.state = createJobQueue();
  }

  // ---------------------------------------------------------------------------
  // License Management
  // ---------------------------------------------------------------------------

  /**
   * Set current license
   */
  setLicense(license: License): void {
    this.state = {
      ...this.state,
      currentLicense: license,
      isLicenseValid: isLicenseValid(license),
    };
    this.emitEvent(createQueueEvent('LICENSE_CHANGED', { valid: this.state.isLicenseValid }));
  }

  /**
   * Clear license
   */
  clearLicense(): void {
    this.state = {
      ...this.state,
      currentLicense: null,
      isLicenseValid: false,
    };
    this.emitEvent(createQueueEvent('LICENSE_CHANGED', { valid: false }));
  }

  /**
   * Check if current license is valid
   */
  isLicenseValid(): boolean {
    return this.state.isLicenseValid;
  }

  /**
   * Get current license
   */
  getLicense(): License | null {
    return this.state.currentLicense;
  }

  // ---------------------------------------------------------------------------
  // Job Management
  // ---------------------------------------------------------------------------

  /**
   * Add job to queue
   */
  addJob(type: JobType, data: JobData, priority: JobPriority = 'normal'): string {
    const job = createJobWithPriority(type, data, priority);
    job.maxRetries = this.config.maxRetries;
    this.state = addJob(this.state, job);
    this.emitEvent(createQueueEvent('JOB_ADDED', { jobId: job.id, type, priority }));
    return job.id;
  }

  /**
   * Remove job from queue
   */
  removeJob(jobId: string): boolean {
    const job = getJobById(this.state, jobId);
    if (!job) return false;

    this.state = removeJob(this.state, jobId);
    this.emitEvent(createQueueEvent('JOB_REMOVED', { jobId }));
    return true;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return getJobById(this.state, jobId);
  }

  /**
   * Get total job count
   */
  getJobCount(): number {
    return this.state.jobs.length;
  }

  /**
   * Set job processor function
   */
  setProcessor(processor: JobProcessor): void {
    this.processor = processor;
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process next job in queue
   */
  async processNextJob(): Promise<ProcessResult> {
    const job = getNextJob(this.state);

    if (!job) {
      return { success: false, blocked: false, error: 'No pending jobs' };
    }

    // Check license before processing
    if (this.config.checkLicenseBeforeProcess) {
      const licenseCheck = checkLicenseForJob(this.state.currentLicense, job);
      this.emitEvent(
        createQueueEvent('LICENSE_CHECKED', {
          jobId: job.id,
          canProcess: licenseCheck.canProcess,
          reason: licenseCheck.reason,
        })
      );

      if (!licenseCheck.canProcess) {
        // Block the job
        this.updateJob(job.id, markJobBlocked(job, licenseCheck.reason!));
        this.emitEvent(
          createQueueEvent('JOB_BLOCKED', {
            jobId: job.id,
            reason: licenseCheck.reason,
          })
        );
        return {
          success: false,
          blocked: true,
          reason: licenseCheck.reason!,
          jobId: job.id,
        };
      }
    }

    // Check rate limit
    if (this.config.enableRateLimiting) {
      if (!isWithinRateLimit(this.state.currentLicense, this.state.processingCount)) {
        this.updateJob(job.id, markJobBlocked(job, 'RATE_LIMIT_EXCEEDED'));
        this.emitEvent(
          createQueueEvent('JOB_BLOCKED', {
            jobId: job.id,
            reason: 'RATE_LIMIT_EXCEEDED',
          })
        );
        return {
          success: false,
          blocked: true,
          reason: 'RATE_LIMIT_EXCEEDED',
          jobId: job.id,
        };
      }
    }

    // Mark as processing
    this.updateJob(job.id, markJobProcessing(job));
    this.state = { ...this.state, processingCount: this.state.processingCount + 1 };
    this.emitEvent(createQueueEvent('JOB_STARTED', { jobId: job.id }));

    // Process the job
    try {
      if (!this.processor) {
        throw new Error('No processor configured');
      }

      const result = await this.processor(job);
      const updatedJob = getJobById(this.state, job.id);

      if (updatedJob) {
        this.updateJob(job.id, markJobCompleted(updatedJob, result));
        this.emitEvent(createQueueEvent('JOB_COMPLETED', { jobId: job.id, result }));
      }

      this.state = { ...this.state, processingCount: this.state.processingCount - 1 };

      return {
        success: true,
        blocked: false,
        jobId: job.id,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const updatedJob = getJobById(this.state, job.id);

      if (updatedJob) {
        this.updateJob(job.id, markJobFailed(updatedJob, errorMessage));
        this.emitEvent(createQueueEvent('JOB_FAILED', { jobId: job.id, error: errorMessage }));
      }

      this.state = { ...this.state, processingCount: this.state.processingCount - 1 };

      return {
        success: false,
        blocked: false,
        jobId: job.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry all failed jobs
   */
  async retryFailedJobs(): Promise<void> {
    const failedJobs = getJobsByStatus(this.state, 'failed');

    for (const job of failedJobs) {
      if (job.retryCount < job.maxRetries) {
        // Reset to pending for retry
        this.updateJob(job.id, {
          ...job,
          status: 'pending',
          error: null,
        });
        await this.processNextJob();
      }
    }
  }

  /**
   * Update job in state
   */
  private updateJob(jobId: string, updatedJob: Job): void {
    this.state = {
      ...this.state,
      jobs: this.state.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
    };
  }

  // ---------------------------------------------------------------------------
  // License Limits
  // ---------------------------------------------------------------------------

  /**
   * Get max concurrent jobs for current license
   */
  getMaxConcurrentJobs(): number {
    return getMaxConcurrentJobs(this.state.currentLicense);
  }

  /**
   * Get max batch size for current license
   */
  getMaxBatchSize(): number {
    return getMaxBatchSize(this.state.currentLicense);
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get queue statistics
   */
  getStatistics(): JobQueueStatistics {
    return getQueueStatistics(this.state);
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  /**
   * Save queue state to string
   */
  saveState(): string {
    return serializeQueue(this.state);
  }

  /**
   * Load queue state from string
   */
  loadState(json: string): boolean {
    const state = deserializeQueue(json);
    if (state) {
      this.state = state;
      return true;
    }
    return false;
  }

  /**
   * Clear all jobs
   */
  clearAll(): void {
    this.state = clearAllJobs(this.state);
    this.emitEvent(createQueueEvent('QUEUE_CLEARED'));
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    this.state = clearCompletedJobs(this.state);
  }

  // ---------------------------------------------------------------------------
  // Offline Mode
  // ---------------------------------------------------------------------------

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    this.offlineMode = offline;
  }

  /**
   * Check if in offline mode
   */
  isOffline(): boolean {
    return this.offlineMode;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Add event handler
   */
  onEvent(handler: JobQueueEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  offEvent(handler: JobQueueEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: JobQueueEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in job queue event handler:', error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  /**
   * Get current config
   */
  getConfig(): JobQueueConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(partial: Partial<JobQueueConfig>): void {
    this.config = mergeQueueConfig({ ...this.config, ...partial });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create job queue service
 */
export function createJobQueueService(config: Partial<JobQueueConfig> = {}): JobQueueService {
  return new JobQueueService(config);
}

// =============================================================================
// Default Export
// =============================================================================

export default JobQueueService;
