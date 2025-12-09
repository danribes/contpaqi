/**
 * Job Queue Service Tests
 * Subtask 15.7: Integrate license check into JobQueueService
 *
 * Tests for the license-aware job queue service that validates
 * licenses before processing jobs and enforces license limits.
 */

import {
  // Types
  Job,
  JobStatus,
  JobType,
  JobPriority,
  JobQueueConfig,
  JobQueueState,
  JobResult,
  LicenseCheckResult,
  JobQueueEvent,
  JobQueueEventType,
  // Job functions
  createJob,
  createJobWithPriority,
  updateJobStatus,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  markJobBlocked,
  // Queue functions
  createJobQueue,
  addJob,
  removeJob,
  getNextJob,
  getJobById,
  getJobsByStatus,
  getJobsByType,
  clearCompletedJobs,
  clearAllJobs,
  // License check functions
  checkLicenseForJob,
  canProcessJob,
  isLicenseValid,
  hasRequiredFeature,
  getMaxConcurrentJobs,
  getMaxBatchSize,
  isWithinRateLimit,
  // Config functions
  createDefaultConfig,
  mergeQueueConfig,
  // Statistics functions
  getQueueStatistics,
  getProcessingRate,
  getAverageProcessingTime,
  // Serialization
  serializeJob,
  deserializeJob,
  serializeQueue,
  deserializeQueue,
  // Display functions
  getJobStatusText,
  getJobTypeText,
  formatJobDuration,
  // Event functions
  createQueueEvent,
  // Class
  JobQueueService,
  createJobQueueService,
} from '../src/services/JobQueueService';

import { License, LicenseType, LicenseStatus } from '../src/services/LicensingServer';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'lic-test-123',
    key: 'TEST-1234-5678-ABCD',
    type: 'professional',
    status: 'active',
    userId: 'user-123',
    email: 'test@example.com',
    hardwareFingerprint: 'fp-abc123',
    activatedAt: new Date('2024-01-01'),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    maxActivations: 5,
    currentActivations: 1,
    features: ['basic', 'export', 'batch', 'api'],
    metadata: {},
    ...overrides,
  };
}

function createExpiredLicense(): License {
  return createTestLicense({
    expiresAt: new Date('2023-01-01'),
    status: 'expired',
  });
}

function createTrialLicense(): License {
  return createTestLicense({
    type: 'trial',
    features: ['basic'],
    maxActivations: 1,
  });
}

function createEnterpriseLicense(): License {
  return createTestLicense({
    type: 'enterprise',
    features: ['basic', 'export', 'batch', 'api', 'unlimited'],
    maxActivations: 100,
  });
}

// =============================================================================
// Job Creation Tests
// =============================================================================

describe('Job Creation', () => {
  describe('createJob', () => {
    it('should create job with default values', () => {
      const job = createJob('pdf-process', { filePath: '/test.pdf' });

      expect(job.id).toBeDefined();
      expect(job.id.length).toBeGreaterThan(0);
      expect(job.type).toBe('pdf-process');
      expect(job.status).toBe('pending');
      expect(job.data.filePath).toBe('/test.pdf');
      expect(job.priority).toBe('normal');
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.startedAt).toBeNull();
      expect(job.completedAt).toBeNull();
      expect(job.error).toBeNull();
      expect(job.retryCount).toBe(0);
      expect(job.licenseChecked).toBe(false);
    });

    it('should generate unique IDs', () => {
      const job1 = createJob('test', {});
      const job2 = createJob('test', {});
      expect(job1.id).not.toBe(job2.id);
    });
  });

  describe('createJobWithPriority', () => {
    it('should create high priority job', () => {
      const job = createJobWithPriority('urgent-task', {}, 'high');
      expect(job.priority).toBe('high');
    });

    it('should create low priority job', () => {
      const job = createJobWithPriority('background-task', {}, 'low');
      expect(job.priority).toBe('low');
    });

    it('should create critical priority job', () => {
      const job = createJobWithPriority('critical-task', {}, 'critical');
      expect(job.priority).toBe('critical');
    });
  });
});

// =============================================================================
// Job Status Tests
// =============================================================================

describe('Job Status Management', () => {
  describe('updateJobStatus', () => {
    it('should update job status', () => {
      const job = createJob('test', {});
      const updated = updateJobStatus(job, 'processing');
      expect(updated.status).toBe('processing');
    });
  });

  describe('markJobProcessing', () => {
    it('should mark job as processing with start time', () => {
      const job = createJob('test', {});
      const processing = markJobProcessing(job);

      expect(processing.status).toBe('processing');
      expect(processing.startedAt).toBeInstanceOf(Date);
      expect(processing.licenseChecked).toBe(true);
    });
  });

  describe('markJobCompleted', () => {
    it('should mark job as completed with result', () => {
      const job = markJobProcessing(createJob('test', {}));
      const result: JobResult = { success: true, data: { processed: true } };
      const completed = markJobCompleted(job, result);

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.result).toEqual(result);
    });
  });

  describe('markJobFailed', () => {
    it('should mark job as failed with error', () => {
      const job = markJobProcessing(createJob('test', {}));
      const failed = markJobFailed(job, 'Processing error');

      expect(failed.status).toBe('failed');
      expect(failed.completedAt).toBeInstanceOf(Date);
      expect(failed.error).toBe('Processing error');
    });

    it('should increment retry count', () => {
      const job = createJob('test', {});
      const failed = markJobFailed(job, 'Error');
      expect(failed.retryCount).toBe(1);
    });
  });

  describe('markJobBlocked', () => {
    it('should mark job as blocked with license reason', () => {
      const job = createJob('test', {});
      const blocked = markJobBlocked(job, 'LICENSE_EXPIRED');

      expect(blocked.status).toBe('blocked');
      expect(blocked.blockReason).toBe('LICENSE_EXPIRED');
    });
  });
});

// =============================================================================
// Queue Management Tests
// =============================================================================

describe('Queue Management', () => {
  describe('createJobQueue', () => {
    it('should create empty queue', () => {
      const queue = createJobQueue();

      expect(queue.jobs).toEqual([]);
      expect(queue.isProcessing).toBe(false);
      expect(queue.currentLicense).toBeNull();
      expect(queue.isLicenseValid).toBe(false);
    });
  });

  describe('addJob', () => {
    it('should add job to queue', () => {
      const queue = createJobQueue();
      const job = createJob('test', {});
      const updated = addJob(queue, job);

      expect(updated.jobs).toHaveLength(1);
      expect(updated.jobs[0].id).toBe(job.id);
    });

    it('should add multiple jobs', () => {
      let queue = createJobQueue();
      queue = addJob(queue, createJob('test1', {}));
      queue = addJob(queue, createJob('test2', {}));
      queue = addJob(queue, createJob('test3', {}));

      expect(queue.jobs).toHaveLength(3);
    });
  });

  describe('removeJob', () => {
    it('should remove job by ID', () => {
      let queue = createJobQueue();
      const job = createJob('test', {});
      queue = addJob(queue, job);
      queue = removeJob(queue, job.id);

      expect(queue.jobs).toHaveLength(0);
    });

    it('should not affect other jobs', () => {
      let queue = createJobQueue();
      const job1 = createJob('test1', {});
      const job2 = createJob('test2', {});
      queue = addJob(queue, job1);
      queue = addJob(queue, job2);
      queue = removeJob(queue, job1.id);

      expect(queue.jobs).toHaveLength(1);
      expect(queue.jobs[0].id).toBe(job2.id);
    });
  });

  describe('getNextJob', () => {
    it('should get next pending job', () => {
      let queue = createJobQueue();
      const job1 = createJob('test1', {});
      const job2 = createJob('test2', {});
      queue = addJob(queue, job1);
      queue = addJob(queue, job2);

      const next = getNextJob(queue);
      expect(next?.id).toBe(job1.id);
    });

    it('should prioritize high priority jobs', () => {
      let queue = createJobQueue();
      const normalJob = createJob('normal', {});
      const highJob = createJobWithPriority('high', {}, 'high');
      queue = addJob(queue, normalJob);
      queue = addJob(queue, highJob);

      const next = getNextJob(queue);
      expect(next?.id).toBe(highJob.id);
    });

    it('should prioritize critical over high', () => {
      let queue = createJobQueue();
      const highJob = createJobWithPriority('high', {}, 'high');
      const criticalJob = createJobWithPriority('critical', {}, 'critical');
      queue = addJob(queue, highJob);
      queue = addJob(queue, criticalJob);

      const next = getNextJob(queue);
      expect(next?.id).toBe(criticalJob.id);
    });

    it('should skip blocked jobs', () => {
      let queue = createJobQueue();
      const blockedJob = markJobBlocked(createJob('blocked', {}), 'LICENSE_EXPIRED');
      const pendingJob = createJob('pending', {});
      queue = addJob(queue, blockedJob);
      queue = addJob(queue, pendingJob);

      const next = getNextJob(queue);
      expect(next?.id).toBe(pendingJob.id);
    });

    it('should return null when no pending jobs', () => {
      const queue = createJobQueue();
      const next = getNextJob(queue);
      expect(next).toBeNull();
    });
  });

  describe('getJobById', () => {
    it('should find job by ID', () => {
      let queue = createJobQueue();
      const job = createJob('test', {});
      queue = addJob(queue, job);

      const found = getJobById(queue, job.id);
      expect(found?.id).toBe(job.id);
    });

    it('should return undefined for unknown ID', () => {
      const queue = createJobQueue();
      const found = getJobById(queue, 'unknown-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getJobsByStatus', () => {
    it('should filter jobs by status', () => {
      let queue = createJobQueue();
      const pending = createJob('pending', {});
      const processing = markJobProcessing(createJob('processing', {}));
      queue = addJob(queue, pending);
      queue = addJob(queue, processing);

      const pendingJobs = getJobsByStatus(queue, 'pending');
      expect(pendingJobs).toHaveLength(1);
      expect(pendingJobs[0].id).toBe(pending.id);
    });
  });

  describe('getJobsByType', () => {
    it('should filter jobs by type', () => {
      let queue = createJobQueue();
      const pdfJob = createJob('pdf-process', {});
      const exportJob = createJob('export', {});
      queue = addJob(queue, pdfJob);
      queue = addJob(queue, exportJob);

      const pdfJobs = getJobsByType(queue, 'pdf-process');
      expect(pdfJobs).toHaveLength(1);
      expect(pdfJobs[0].id).toBe(pdfJob.id);
    });
  });

  describe('clearCompletedJobs', () => {
    it('should remove only completed jobs', () => {
      let queue = createJobQueue();
      const pending = createJob('pending', {});
      const completed = markJobCompleted(
        markJobProcessing(createJob('completed', {})),
        { success: true }
      );
      queue = addJob(queue, pending);
      queue = addJob(queue, completed);
      queue = clearCompletedJobs(queue);

      expect(queue.jobs).toHaveLength(1);
      expect(queue.jobs[0].id).toBe(pending.id);
    });
  });

  describe('clearAllJobs', () => {
    it('should remove all jobs', () => {
      let queue = createJobQueue();
      queue = addJob(queue, createJob('test1', {}));
      queue = addJob(queue, createJob('test2', {}));
      queue = clearAllJobs(queue);

      expect(queue.jobs).toHaveLength(0);
    });
  });
});

// =============================================================================
// License Check Tests
// =============================================================================

describe('License Check Functions', () => {
  describe('checkLicenseForJob', () => {
    it('should return valid for active license', () => {
      const license = createTestLicense();
      const job = createJob('pdf-process', {});
      const result = checkLicenseForJob(license, job);

      expect(result.canProcess).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should return invalid for null license', () => {
      const job = createJob('test', {});
      const result = checkLicenseForJob(null, job);

      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('NO_LICENSE');
    });

    it('should return invalid for expired license', () => {
      const license = createExpiredLicense();
      const job = createJob('test', {});
      const result = checkLicenseForJob(license, job);

      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('LICENSE_EXPIRED');
    });

    it('should return invalid for revoked license', () => {
      const license = createTestLicense({ status: 'revoked' });
      const job = createJob('test', {});
      const result = checkLicenseForJob(license, job);

      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('LICENSE_REVOKED');
    });

    it('should return invalid for suspended license', () => {
      const license = createTestLicense({ status: 'suspended' });
      const job = createJob('test', {});
      const result = checkLicenseForJob(license, job);

      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('LICENSE_SUSPENDED');
    });

    it('should check feature requirements for batch jobs', () => {
      const trialLicense = createTrialLicense(); // No batch feature
      const job = createJob('batch-process', { requiredFeature: 'batch' });
      const result = checkLicenseForJob(trialLicense, job);

      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('should allow batch jobs with professional license', () => {
      const proLicense = createTestLicense(); // Has batch feature
      const job = createJob('batch-process', { requiredFeature: 'batch' });
      const result = checkLicenseForJob(proLicense, job);

      expect(result.canProcess).toBe(true);
    });
  });

  describe('canProcessJob', () => {
    it('should check both license and feature', () => {
      const license = createTestLicense();
      const job = createJob('export', { requiredFeature: 'export' });
      const canProcess = canProcessJob(license, job);

      expect(canProcess).toBe(true);
    });

    it('should return false for missing feature', () => {
      const trialLicense = createTrialLicense();
      const job = createJob('api-call', { requiredFeature: 'api' });
      const canProcess = canProcessJob(trialLicense, job);

      expect(canProcess).toBe(false);
    });
  });

  describe('isLicenseValid', () => {
    it('should return true for active license', () => {
      const license = createTestLicense();
      expect(isLicenseValid(license)).toBe(true);
    });

    it('should return false for expired license', () => {
      const license = createExpiredLicense();
      expect(isLicenseValid(license)).toBe(false);
    });

    it('should return false for revoked license', () => {
      const license = createTestLicense({ status: 'revoked' });
      expect(isLicenseValid(license)).toBe(false);
    });

    it('should return false for null license', () => {
      expect(isLicenseValid(null)).toBe(false);
    });
  });

  describe('hasRequiredFeature', () => {
    it('should return true when feature is present', () => {
      const license = createTestLicense();
      expect(hasRequiredFeature(license, 'batch')).toBe(true);
    });

    it('should return false when feature is missing', () => {
      const trialLicense = createTrialLicense();
      expect(hasRequiredFeature(trialLicense, 'batch')).toBe(false);
    });

    it('should return true for null feature requirement', () => {
      const license = createTestLicense();
      expect(hasRequiredFeature(license, null)).toBe(true);
    });
  });
});

// =============================================================================
// License Limits Tests
// =============================================================================

describe('License Limits', () => {
  describe('getMaxConcurrentJobs', () => {
    it('should return 1 for trial', () => {
      const license = createTrialLicense();
      expect(getMaxConcurrentJobs(license)).toBe(1);
    });

    it('should return 3 for standard', () => {
      const license = createTestLicense({ type: 'standard' });
      expect(getMaxConcurrentJobs(license)).toBe(3);
    });

    it('should return 10 for professional', () => {
      const license = createTestLicense({ type: 'professional' });
      expect(getMaxConcurrentJobs(license)).toBe(10);
    });

    it('should return unlimited for enterprise', () => {
      const license = createEnterpriseLicense();
      expect(getMaxConcurrentJobs(license)).toBe(Infinity);
    });

    it('should return 0 for null license', () => {
      expect(getMaxConcurrentJobs(null)).toBe(0);
    });
  });

  describe('getMaxBatchSize', () => {
    it('should return 5 for trial', () => {
      const license = createTrialLicense();
      expect(getMaxBatchSize(license)).toBe(5);
    });

    it('should return 25 for standard', () => {
      const license = createTestLicense({ type: 'standard' });
      expect(getMaxBatchSize(license)).toBe(25);
    });

    it('should return 100 for professional', () => {
      const license = createTestLicense({ type: 'professional' });
      expect(getMaxBatchSize(license)).toBe(100);
    });

    it('should return unlimited for enterprise', () => {
      const license = createEnterpriseLicense();
      expect(getMaxBatchSize(license)).toBe(Infinity);
    });
  });

  describe('isWithinRateLimit', () => {
    it('should return true when under limit', () => {
      const license = createTestLicense({ type: 'professional' });
      expect(isWithinRateLimit(license, 5)).toBe(true);
    });

    it('should return false when at limit', () => {
      const license = createTestLicense({ type: 'professional' });
      expect(isWithinRateLimit(license, 10)).toBe(false);
    });

    it('should always return true for enterprise', () => {
      const license = createEnterpriseLicense();
      expect(isWithinRateLimit(license, 1000)).toBe(true);
    });
  });
});

// =============================================================================
// Config Tests
// =============================================================================

describe('Queue Config', () => {
  describe('createDefaultConfig', () => {
    it('should create default config', () => {
      const config = createDefaultConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayMs).toBe(1000);
      expect(config.processingTimeoutMs).toBe(60000);
      expect(config.checkLicenseBeforeProcess).toBe(true);
      expect(config.blockOnInvalidLicense).toBe(true);
    });
  });

  describe('mergeQueueConfig', () => {
    it('should merge partial config', () => {
      const config = mergeQueueConfig({ maxRetries: 5 });

      expect(config.maxRetries).toBe(5);
      expect(config.retryDelayMs).toBe(1000); // Default preserved
    });
  });
});

// =============================================================================
// Statistics Tests
// =============================================================================

describe('Queue Statistics', () => {
  describe('getQueueStatistics', () => {
    it('should calculate queue statistics', () => {
      let queue = createJobQueue();
      const pending = createJob('pending', {});
      const processing = markJobProcessing(createJob('processing', {}));
      const completed = markJobCompleted(
        markJobProcessing(createJob('completed', {})),
        { success: true }
      );
      const failed = markJobFailed(
        markJobProcessing(createJob('failed', {})),
        'Error'
      );
      const blocked = markJobBlocked(createJob('blocked', {}), 'LICENSE_EXPIRED');

      queue = addJob(queue, pending);
      queue = addJob(queue, processing);
      queue = addJob(queue, completed);
      queue = addJob(queue, failed);
      queue = addJob(queue, blocked);

      const stats = getQueueStatistics(queue);

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(1);
    });
  });

  describe('getProcessingRate', () => {
    it('should calculate processing rate', () => {
      let queue = createJobQueue();
      for (let i = 0; i < 10; i++) {
        const job = markJobCompleted(
          markJobProcessing(createJob(`job-${i}`, {})),
          { success: true }
        );
        queue = addJob(queue, job);
      }

      const rate = getProcessingRate(queue, 60000); // Per minute
      expect(rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAverageProcessingTime', () => {
    it('should return 0 for no completed jobs', () => {
      const queue = createJobQueue();
      expect(getAverageProcessingTime(queue)).toBe(0);
    });
  });
});

// =============================================================================
// Serialization Tests
// =============================================================================

describe('Serialization', () => {
  describe('serializeJob / deserializeJob', () => {
    it('should serialize and deserialize job', () => {
      const job = createJob('test', { key: 'value' });
      const json = serializeJob(job);
      const restored = deserializeJob(json);

      expect(restored).not.toBeNull();
      expect(restored!.id).toBe(job.id);
      expect(restored!.type).toBe(job.type);
      expect(restored!.data.key).toBe('value');
    });

    it('should preserve dates', () => {
      const job = markJobProcessing(createJob('test', {}));
      const json = serializeJob(job);
      const restored = deserializeJob(json);

      expect(restored!.createdAt).toBeInstanceOf(Date);
      expect(restored!.startedAt).toBeInstanceOf(Date);
    });

    it('should return null for invalid JSON', () => {
      const restored = deserializeJob('invalid json');
      expect(restored).toBeNull();
    });
  });

  describe('serializeQueue / deserializeQueue', () => {
    it('should serialize and deserialize queue', () => {
      let queue = createJobQueue();
      queue = addJob(queue, createJob('test1', {}));
      queue = addJob(queue, createJob('test2', {}));

      const json = serializeQueue(queue);
      const restored = deserializeQueue(json);

      expect(restored).not.toBeNull();
      expect(restored!.jobs).toHaveLength(2);
    });
  });
});

// =============================================================================
// Display Functions Tests
// =============================================================================

describe('Display Functions', () => {
  describe('getJobStatusText', () => {
    it('should return status text', () => {
      expect(getJobStatusText('pending')).toBe('Pending');
      expect(getJobStatusText('processing')).toBe('Processing');
      expect(getJobStatusText('completed')).toBe('Completed');
      expect(getJobStatusText('failed')).toBe('Failed');
      expect(getJobStatusText('blocked')).toBe('Blocked');
    });
  });

  describe('getJobTypeText', () => {
    it('should return type text', () => {
      expect(getJobTypeText('pdf-process')).toBe('PDF Processing');
      expect(getJobTypeText('batch-process')).toBe('Batch Processing');
      expect(getJobTypeText('export')).toBe('Export');
    });

    it('should format unknown types', () => {
      expect(getJobTypeText('custom-type')).toBe('Custom Type');
    });
  });

  describe('formatJobDuration', () => {
    it('should format short duration', () => {
      expect(formatJobDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatJobDuration(5000)).toBe('5.0s');
    });

    it('should format minutes', () => {
      expect(formatJobDuration(120000)).toBe('2m 0s');
    });
  });
});

// =============================================================================
// Event Tests
// =============================================================================

describe('Queue Events', () => {
  describe('createQueueEvent', () => {
    it('should create event with timestamp', () => {
      const event = createQueueEvent('JOB_ADDED', { jobId: 'job-123' });

      expect(event.type).toBe('JOB_ADDED');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.details.jobId).toBe('job-123');
    });
  });
});

// =============================================================================
// JobQueueService Class Tests
// =============================================================================

describe('JobQueueService', () => {
  describe('constructor', () => {
    it('should create service with default config', () => {
      const service = new JobQueueService();
      expect(service.getConfig().checkLicenseBeforeProcess).toBe(true);
    });

    it('should create service with custom config', () => {
      const service = new JobQueueService({ maxRetries: 5 });
      expect(service.getConfig().maxRetries).toBe(5);
    });
  });

  describe('license management', () => {
    it('should set license', () => {
      const service = new JobQueueService();
      const license = createTestLicense();
      service.setLicense(license);

      expect(service.isLicenseValid()).toBe(true);
    });

    it('should detect invalid license', () => {
      const service = new JobQueueService();
      const license = createExpiredLicense();
      service.setLicense(license);

      expect(service.isLicenseValid()).toBe(false);
    });

    it('should clear license', () => {
      const service = new JobQueueService();
      service.setLicense(createTestLicense());
      service.clearLicense();

      expect(service.isLicenseValid()).toBe(false);
    });
  });

  describe('job management', () => {
    it('should add job to queue', () => {
      const service = new JobQueueService();
      const jobId = service.addJob('test', { key: 'value' });

      expect(jobId).toBeDefined();
      expect(service.getJobCount()).toBe(1);
    });

    it('should remove job from queue', () => {
      const service = new JobQueueService();
      const jobId = service.addJob('test', {});
      service.removeJob(jobId);

      expect(service.getJobCount()).toBe(0);
    });

    it('should get job by ID', () => {
      const service = new JobQueueService();
      const jobId = service.addJob('test', { key: 'value' });
      const job = service.getJob(jobId);

      expect(job).toBeDefined();
      expect(job!.data.key).toBe('value');
    });
  });

  describe('license-gated processing', () => {
    it('should block jobs without license', async () => {
      const service = new JobQueueService();
      const jobId = service.addJob('test', {});

      const result = await service.processNextJob();

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('NO_LICENSE');
    });

    it('should process jobs with valid license', async () => {
      const service = new JobQueueService();
      service.setLicense(createTestLicense());
      const jobId = service.addJob('test', {});

      service.setProcessor(async (job) => ({ success: true, data: {} }));
      const result = await service.processNextJob();

      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should block jobs with expired license', async () => {
      const service = new JobQueueService();
      service.setLicense(createExpiredLicense());
      const jobId = service.addJob('test', {});

      const result = await service.processNextJob();

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('LICENSE_EXPIRED');
    });

    it('should block jobs requiring unavailable features', async () => {
      const service = new JobQueueService();
      service.setLicense(createTrialLicense()); // No batch feature
      const jobId = service.addJob('batch-process', { requiredFeature: 'batch' });

      const result = await service.processNextJob();

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('should allow feature-restricted jobs with proper license', async () => {
      const service = new JobQueueService();
      service.setLicense(createTestLicense()); // Has batch feature
      service.addJob('batch-process', { requiredFeature: 'batch' });

      service.setProcessor(async (job) => ({ success: true, data: {} }));
      const result = await service.processNextJob();

      expect(result.success).toBe(true);
    });
  });

  describe('concurrent job limits', () => {
    it('should enforce concurrent job limit for trial', async () => {
      const service = new JobQueueService();
      service.setLicense(createTrialLicense());

      // Add multiple jobs
      service.addJob('test1', {});
      service.addJob('test2', {});

      // Start first job (but don't complete it)
      service.setProcessor(async (job) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, data: {} };
      });

      // First job should start
      const promise1 = service.processNextJob();

      // Second job should be rate limited
      const result2 = await service.processNextJob();

      expect(result2.blocked).toBe(true);
      expect(result2.reason).toBe('RATE_LIMIT_EXCEEDED');

      await promise1;
    });

    it('should allow more concurrent jobs for professional', async () => {
      const service = new JobQueueService();
      service.setLicense(createTestLicense({ type: 'professional' }));

      expect(service.getMaxConcurrentJobs()).toBe(10);
    });
  });

  describe('event handling', () => {
    it('should emit job added event', () => {
      const service = new JobQueueService();
      const events: JobQueueEvent[] = [];
      service.onEvent((event) => events.push(event));

      service.addJob('test', {});

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'JOB_ADDED')).toBe(true);
    });

    it('should emit job blocked event', async () => {
      const service = new JobQueueService();
      const events: JobQueueEvent[] = [];
      service.onEvent((event) => events.push(event));
      service.addJob('test', {});

      await service.processNextJob();

      expect(events.some(e => e.type === 'JOB_BLOCKED')).toBe(true);
    });

    it('should emit license check event', async () => {
      const service = new JobQueueService();
      const events: JobQueueEvent[] = [];
      service.onEvent((event) => events.push(event));
      service.setLicense(createTestLicense());
      service.addJob('test', {});

      service.setProcessor(async () => ({ success: true, data: {} }));
      await service.processNextJob();

      expect(events.some(e => e.type === 'LICENSE_CHECKED')).toBe(true);
    });
  });

  describe('retry handling', () => {
    it('should retry failed jobs', async () => {
      const service = new JobQueueService({ maxRetries: 3 });
      service.setLicense(createTestLicense());

      let attempts = 0;
      service.setProcessor(async (job) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, data: {} };
      });

      const jobId = service.addJob('test', {});
      await service.processNextJob();
      await service.retryFailedJobs();
      await service.retryFailedJobs();

      expect(attempts).toBe(3);
    });

    it('should not retry beyond max retries', async () => {
      const service = new JobQueueService({ maxRetries: 2 });
      service.setLicense(createTestLicense());

      let attempts = 0;
      service.setProcessor(async (job) => {
        attempts++;
        throw new Error('Always fails');
      });

      const jobId = service.addJob('test', {});

      // Process multiple times
      await service.processNextJob();
      await service.retryFailedJobs();
      await service.retryFailedJobs();
      await service.retryFailedJobs(); // Should not increment

      expect(attempts).toBeLessThanOrEqual(3);
    });
  });

  describe('batch processing', () => {
    it('should enforce batch size limits', () => {
      const service = new JobQueueService();
      service.setLicense(createTrialLicense());

      const maxBatch = service.getMaxBatchSize();
      expect(maxBatch).toBe(5);
    });

    it('should allow larger batches for enterprise', () => {
      const service = new JobQueueService();
      service.setLicense(createEnterpriseLicense());

      const maxBatch = service.getMaxBatchSize();
      expect(maxBatch).toBe(Infinity);
    });
  });

  describe('queue state', () => {
    it('should get queue statistics', () => {
      const service = new JobQueueService();
      service.addJob('test1', {});
      service.addJob('test2', {});

      const stats = service.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });

    it('should save and restore state', () => {
      const service = new JobQueueService();
      service.addJob('test1', {});
      service.addJob('test2', {});

      const state = service.saveState();
      const newService = new JobQueueService();
      newService.loadState(state);

      expect(newService.getJobCount()).toBe(2);
    });

    it('should clear queue', () => {
      const service = new JobQueueService();
      service.addJob('test1', {});
      service.addJob('test2', {});
      service.clearAll();

      expect(service.getJobCount()).toBe(0);
    });
  });

  describe('offline mode', () => {
    it('should track offline status', () => {
      const service = new JobQueueService();
      service.setOfflineMode(true);

      expect(service.isOffline()).toBe(true);
    });

    it('should still validate cached license in offline mode', async () => {
      const service = new JobQueueService();
      service.setLicense(createTestLicense());
      service.setOfflineMode(true);
      service.addJob('test', {});

      service.setProcessor(async () => ({ success: true, data: {} }));
      const result = await service.processNextJob();

      // Should still work with cached valid license
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createJobQueueService', () => {
  it('should create service instance', () => {
    const service = createJobQueueService();
    expect(service).toBeInstanceOf(JobQueueService);
  });

  it('should accept config', () => {
    const service = createJobQueueService({ maxRetries: 10 });
    expect(service.getConfig().maxRetries).toBe(10);
  });
});
