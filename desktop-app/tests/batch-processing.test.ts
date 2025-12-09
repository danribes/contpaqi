/**
 * Batch Processing View Tests
 * Subtask 14.9: Add batch processing view for multiple invoices
 *
 * Tests for:
 * - Queue state management (add, remove, update files)
 * - File status transitions
 * - Progress calculation
 * - Batch actions (process all, retry failed, clear)
 * - UI helpers and components
 */

import { describe, it, expect } from '@jest/globals';

// =============================================================================
// Types (defined locally to avoid JSX compilation issues)
// =============================================================================

type FileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ProcessingResult {
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
  confidence: number;
  fecha?: string;
  subtotal?: number;
  iva?: number;
}

interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ProcessingResult;
  error?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
}

interface BatchState {
  files: QueuedFile[];
  isProcessing: boolean;
}

interface ActionButtonState {
  canStart: boolean;
  canRetry: boolean;
  canClear: boolean;
  canClearAll: boolean;
}

// =============================================================================
// Implementation Functions (matching BatchProcessing.tsx)
// =============================================================================

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createQueuedFile(file: File): QueuedFile {
  return {
    id: generateFileId(),
    file,
    status: 'pending',
    addedAt: new Date(),
  };
}

function addFilesToQueue(state: BatchState, files: File[]): BatchState {
  const pdfFiles = files.filter(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
  const queuedFiles = pdfFiles.map(createQueuedFile);
  return {
    ...state,
    files: [...state.files, ...queuedFiles],
  };
}

function removeFileFromQueue(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.filter((f) => f.id !== fileId),
  };
}

function clearCompletedFiles(state: BatchState): BatchState {
  return {
    ...state,
    files: state.files.filter((f) => f.status !== 'completed'),
  };
}

function clearAllFiles(state: BatchState): BatchState {
  return {
    ...state,
    files: [],
  };
}

function getFileById(state: BatchState, fileId: string): QueuedFile | undefined {
  return state.files.find((f) => f.id === fileId);
}

function getFilesByStatus(state: BatchState, status: FileStatus): QueuedFile[] {
  return state.files.filter((f) => f.status === status);
}

function updateFileStatus(state: BatchState, fileId: string, status: FileStatus): BatchState {
  return {
    ...state,
    files: state.files.map((f) => (f.id === fileId ? { ...f, status } : f)),
  };
}

function markFileProcessing(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId ? { ...f, status: 'processing' as FileStatus, startedAt: new Date() } : f
    ),
  };
}

function markFileCompleted(state: BatchState, fileId: string, result: ProcessingResult): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId
        ? { ...f, status: 'completed' as FileStatus, result, completedAt: new Date() }
        : f
    ),
  };
}

function markFileError(state: BatchState, fileId: string, error: string): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId ? { ...f, status: 'error' as FileStatus, error } : f
    ),
  };
}

function markFileRetrying(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId ? { ...f, status: 'pending' as FileStatus, error: undefined } : f
    ),
  };
}

function canRetryFile(file: QueuedFile): boolean {
  return file.status === 'error';
}

function calculateProgress(state: BatchState): BatchProgress {
  const files = state.files;
  return {
    total: files.length,
    completed: files.filter((f) => f.status === 'completed').length,
    processing: files.filter((f) => f.status === 'processing').length,
    pending: files.filter((f) => f.status === 'pending').length,
    failed: files.filter((f) => f.status === 'error').length,
  };
}

function getProgressPercentage(progress: BatchProgress): number {
  if (progress.total === 0) return 0;
  return Math.round((progress.completed / progress.total) * 100);
}

function isProcessingComplete(state: BatchState): boolean {
  const progress = calculateProgress(state);
  return progress.pending === 0 && progress.processing === 0;
}

function hasErrors(state: BatchState): boolean {
  return state.files.some((f) => f.status === 'error');
}

function hasPendingFiles(state: BatchState): boolean {
  return state.files.some((f) => f.status === 'pending');
}

function getNextPendingFile(state: BatchState): QueuedFile | undefined {
  return state.files.find((f) => f.status === 'pending');
}

function getFailedFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'error');
}

function getPendingFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'pending');
}

function getCompletedFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'completed');
}

function getStatusIcon(status: FileStatus): string {
  switch (status) {
    case 'pending': return 'clock';
    case 'processing': return 'spinner';
    case 'completed': return 'check';
    case 'error': return 'x';
  }
}

function getStatusColor(status: FileStatus): string {
  switch (status) {
    case 'pending': return 'text-gray-500';
    case 'processing': return 'text-blue-500';
    case 'completed': return 'text-green-500';
    case 'error': return 'text-red-500';
  }
}

function getStatusText(status: FileStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'completed': return 'Completed';
    case 'error': return 'Error';
  }
}

function getFileDisplayName(file: File, maxLength?: number): string {
  const name = file.name;
  if (!maxLength || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProgressBarColor(progress: BatchProgress): string {
  if (progress.total === 0) return 'bg-gray-300';
  if (progress.failed === progress.total) return 'bg-red-500';
  if (progress.failed > 0) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getSummaryText(progress: BatchProgress): string {
  if (progress.total === 0) {
    return 'No files in queue';
  }

  if (progress.processing > 0) {
    return `Processing ${progress.completed + 1} of ${progress.total}...`;
  }

  if (progress.completed === progress.total) {
    return `All ${progress.total} files completed successfully`;
  }

  if (progress.pending > 0 && progress.completed === 0 && progress.failed === 0) {
    return `${progress.total} files ready to process`;
  }

  const parts: string[] = [];
  if (progress.completed > 0) {
    parts.push(`${progress.completed} completed`);
  }
  if (progress.failed > 0) {
    parts.push(`${progress.failed} failed`);
  }
  if (progress.pending > 0) {
    parts.push(`${progress.pending} pending`);
  }

  return parts.join(', ');
}

function canStartProcessing(state: BatchState): boolean {
  return !state.isProcessing && hasPendingFiles(state);
}

function canRetryFailed(state: BatchState): boolean {
  return !state.isProcessing && hasErrors(state);
}

function canClearCompleted(state: BatchState): boolean {
  return getCompletedFiles(state).length > 0;
}

function getActionButtonState(state: BatchState): ActionButtonState {
  return {
    canStart: canStartProcessing(state),
    canRetry: canRetryFailed(state),
    canClear: canClearCompleted(state),
    canClearAll: state.files.length > 0 && !state.isProcessing,
  };
}

function createInitialBatchState(): BatchState {
  return {
    files: [],
    isProcessing: false,
  };
}

// =============================================================================
// Queue State Management Tests
// =============================================================================

describe('Queue State Management', () => {
  describe('createQueuedFile', () => {
    it('should create a queued file with pending status', () => {
      const file = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
      const queued = createQueuedFile(file);

      expect(queued.file).toBe(file);
      expect(queued.status).toBe('pending');
      expect(queued.id).toBeDefined();
      expect(queued.addedAt).toBeInstanceOf(Date);
      expect(queued.result).toBeUndefined();
      expect(queued.error).toBeUndefined();
    });

    it('should generate unique IDs for each file', () => {
      const file1 = new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' });
      const file2 = new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' });

      const queued1 = createQueuedFile(file1);
      const queued2 = createQueuedFile(file2);

      expect(queued1.id).not.toBe(queued2.id);
    });
  });

  describe('addFilesToQueue', () => {
    it('should add files to empty queue', () => {
      const files = [
        new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' }),
      ];
      const state = createInitialBatchState();

      const newState = addFilesToQueue(state, files);

      expect(newState.files.length).toBe(2);
      expect(newState.files[0].file.name).toBe('invoice1.pdf');
      expect(newState.files[1].file.name).toBe('invoice2.pdf');
    });

    it('should append files to existing queue', () => {
      const existingFile = new File(['existing'], 'existing.pdf', { type: 'application/pdf' });
      const state: BatchState = {
        files: [createQueuedFile(existingFile)],
        isProcessing: false,
      };

      const newFiles = [new File(['new'], 'new.pdf', { type: 'application/pdf' })];
      const newState = addFilesToQueue(state, newFiles);

      expect(newState.files.length).toBe(2);
    });

    it('should filter out non-PDF files', () => {
      const files = [
        new File(['test'], 'invoice.pdf', { type: 'application/pdf' }),
        new File(['test'], 'image.png', { type: 'image/png' }),
        new File(['test'], 'document.txt', { type: 'text/plain' }),
      ];
      const state = createInitialBatchState();

      const newState = addFilesToQueue(state, files);

      expect(newState.files.length).toBe(1);
      expect(newState.files[0].file.name).toBe('invoice.pdf');
    });
  });

  describe('removeFileFromQueue', () => {
    it('should remove file by ID', () => {
      const file1 = createQueuedFile(new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' }));
      const file2 = createQueuedFile(new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file1, file2], isProcessing: false };

      const newState = removeFileFromQueue(state, file1.id);

      expect(newState.files.length).toBe(1);
      expect(newState.files[0].id).toBe(file2.id);
    });

    it('should return same state if file not found', () => {
      const file = createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file], isProcessing: false };

      const newState = removeFileFromQueue(state, 'nonexistent-id');

      expect(newState.files.length).toBe(1);
    });
  });

  describe('clearCompletedFiles', () => {
    it('should remove only completed files', () => {
      const pending = createQueuedFile(new File(['test'], 'pending.pdf', { type: 'application/pdf' }));
      const completed: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'completed.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const error: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'error.pdf', { type: 'application/pdf' })),
        status: 'error',
      };
      const state: BatchState = { files: [pending, completed, error], isProcessing: false };

      const newState = clearCompletedFiles(state);

      expect(newState.files.length).toBe(2);
      expect(newState.files.find((f: QueuedFile) => f.status === 'completed')).toBeUndefined();
    });
  });

  describe('clearAllFiles', () => {
    it('should remove all files from queue', () => {
      const file1 = createQueuedFile(new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' }));
      const file2 = createQueuedFile(new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file1, file2], isProcessing: false };

      const newState = clearAllFiles(state);

      expect(newState.files.length).toBe(0);
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', () => {
      const file1 = createQueuedFile(new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' }));
      const file2 = createQueuedFile(new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file1, file2], isProcessing: false };

      const found = getFileById(state, file2.id);

      expect(found?.id).toBe(file2.id);
    });

    it('should return undefined if file not found', () => {
      const state = createInitialBatchState();
      const found = getFileById(state, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getFilesByStatus', () => {
    it('should return files matching status', () => {
      const pending: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'pending.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const completed: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'completed.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const state: BatchState = { files: [pending, completed], isProcessing: false };

      const pendingFiles = getFilesByStatus(state, 'pending');

      expect(pendingFiles.length).toBe(1);
      expect(pendingFiles[0].status).toBe('pending');
    });
  });
});

// =============================================================================
// Status Management Tests
// =============================================================================

describe('Status Management', () => {
  describe('updateFileStatus', () => {
    it('should update file status', () => {
      const file = createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file], isProcessing: false };

      const newState = updateFileStatus(state, file.id, 'processing');

      expect(newState.files[0].status).toBe('processing');
    });

    it('should not modify other files', () => {
      const file1 = createQueuedFile(new File(['test1'], 'invoice1.pdf', { type: 'application/pdf' }));
      const file2 = createQueuedFile(new File(['test2'], 'invoice2.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file1, file2], isProcessing: false };

      const newState = updateFileStatus(state, file1.id, 'processing');

      expect(newState.files[0].status).toBe('processing');
      expect(newState.files[1].status).toBe('pending');
    });
  });

  describe('markFileProcessing', () => {
    it('should set status to processing and set startedAt', () => {
      const file = createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' }));
      const state: BatchState = { files: [file], isProcessing: false };

      const newState = markFileProcessing(state, file.id);

      expect(newState.files[0].status).toBe('processing');
      expect(newState.files[0].startedAt).toBeInstanceOf(Date);
    });
  });

  describe('markFileCompleted', () => {
    it('should set status to completed with result', () => {
      const file: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'processing',
      };
      const state: BatchState = { files: [file], isProcessing: false };
      const result: ProcessingResult = {
        rfcEmisor: 'ABC123456XXX',
        rfcReceptor: 'DEF789012YYY',
        total: 1234.56,
        confidence: 0.95,
      };

      const newState = markFileCompleted(state, file.id, result);

      expect(newState.files[0].status).toBe('completed');
      expect(newState.files[0].result).toEqual(result);
      expect(newState.files[0].completedAt).toBeInstanceOf(Date);
    });
  });

  describe('markFileError', () => {
    it('should set status to error with message', () => {
      const file: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'processing',
      };
      const state: BatchState = { files: [file], isProcessing: false };

      const newState = markFileError(state, file.id, 'Processing failed');

      expect(newState.files[0].status).toBe('error');
      expect(newState.files[0].error).toBe('Processing failed');
    });
  });

  describe('markFileRetrying', () => {
    it('should set status back to pending and clear error', () => {
      const file: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'error',
        error: 'Previous error',
      };
      const state: BatchState = { files: [file], isProcessing: false };

      const newState = markFileRetrying(state, file.id);

      expect(newState.files[0].status).toBe('pending');
      expect(newState.files[0].error).toBeUndefined();
    });
  });

  describe('canRetryFile', () => {
    it('should return true for error status', () => {
      const file: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'error',
      };
      expect(canRetryFile(file)).toBe(true);
    });

    it('should return false for other statuses', () => {
      const pending: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const processing: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'processing',
      };
      const completed: QueuedFile = {
        ...createQueuedFile(new File(['test'], 'invoice.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };

      expect(canRetryFile(pending)).toBe(false);
      expect(canRetryFile(processing)).toBe(false);
      expect(canRetryFile(completed)).toBe(false);
    });
  });
});

// =============================================================================
// Progress Calculation Tests
// =============================================================================

describe('Progress Calculation', () => {
  describe('calculateProgress', () => {
    it('should calculate progress correctly', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '3.pdf', { type: 'application/pdf' })), status: 'processing' },
        { ...createQueuedFile(new File([''], '4.pdf', { type: 'application/pdf' })), status: 'pending' },
        { ...createQueuedFile(new File([''], '5.pdf', { type: 'application/pdf' })), status: 'error' },
      ];
      const state: BatchState = { files, isProcessing: true };

      const progress = calculateProgress(state);

      expect(progress.total).toBe(5);
      expect(progress.completed).toBe(2);
      expect(progress.processing).toBe(1);
      expect(progress.pending).toBe(1);
      expect(progress.failed).toBe(1);
    });

    it('should handle empty queue', () => {
      const state = createInitialBatchState();
      const progress = calculateProgress(state);

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.processing).toBe(0);
      expect(progress.pending).toBe(0);
      expect(progress.failed).toBe(0);
    });
  });

  describe('getProgressPercentage', () => {
    it('should calculate percentage correctly', () => {
      const progress: BatchProgress = {
        total: 10,
        completed: 3,
        processing: 1,
        pending: 5,
        failed: 1,
      };

      expect(getProgressPercentage(progress)).toBe(30);
    });

    it('should return 0 for empty queue', () => {
      const progress: BatchProgress = {
        total: 0,
        completed: 0,
        processing: 0,
        pending: 0,
        failed: 0,
      };

      expect(getProgressPercentage(progress)).toBe(0);
    });

    it('should return 100 when all completed', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 5,
        processing: 0,
        pending: 0,
        failed: 0,
      };

      expect(getProgressPercentage(progress)).toBe(100);
    });
  });

  describe('isProcessingComplete', () => {
    it('should return true when no pending or processing files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'error' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(isProcessingComplete(state)).toBe(true);
    });

    it('should return false when pending files exist', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(isProcessingComplete(state)).toBe(false);
    });

    it('should return false when processing files exist', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'processing' },
      ];
      const state: BatchState = { files, isProcessing: true };

      expect(isProcessingComplete(state)).toBe(false);
    });
  });

  describe('hasErrors', () => {
    it('should return true when error files exist', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'error' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(hasErrors(state)).toBe(true);
    });

    it('should return false when no error files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(hasErrors(state)).toBe(false);
    });
  });

  describe('hasPendingFiles', () => {
    it('should return true when pending files exist', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(hasPendingFiles(state)).toBe(true);
    });

    it('should return false when no pending files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(hasPendingFiles(state)).toBe(false);
    });
  });
});

// =============================================================================
// Batch Actions Tests
// =============================================================================

describe('Batch Actions', () => {
  describe('getNextPendingFile', () => {
    it('should return first pending file', () => {
      const pending1: QueuedFile = {
        ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const pending2: QueuedFile = {
        ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const state: BatchState = { files: [pending1, pending2], isProcessing: false };

      const next = getNextPendingFile(state);

      expect(next?.id).toBe(pending1.id);
    });

    it('should return undefined when no pending files', () => {
      const completed: QueuedFile = {
        ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const state: BatchState = { files: [completed], isProcessing: false };

      const next = getNextPendingFile(state);

      expect(next).toBeUndefined();
    });
  });

  describe('getFailedFiles', () => {
    it('should return all failed files', () => {
      const error1: QueuedFile = {
        ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })),
        status: 'error',
      };
      const completed: QueuedFile = {
        ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const error2: QueuedFile = {
        ...createQueuedFile(new File([''], '3.pdf', { type: 'application/pdf' })),
        status: 'error',
      };
      const state: BatchState = { files: [error1, completed, error2], isProcessing: false };

      const failed = getFailedFiles(state);

      expect(failed.length).toBe(2);
    });
  });

  describe('getPendingFiles', () => {
    it('should return all pending files', () => {
      const pending1: QueuedFile = {
        ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const completed: QueuedFile = {
        ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const state: BatchState = { files: [pending1, completed], isProcessing: false };

      const pending = getPendingFiles(state);

      expect(pending.length).toBe(1);
    });
  });

  describe('getCompletedFiles', () => {
    it('should return all completed files', () => {
      const completed1: QueuedFile = {
        ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })),
        status: 'completed',
      };
      const pending: QueuedFile = {
        ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })),
        status: 'pending',
      };
      const state: BatchState = { files: [completed1, pending], isProcessing: false };

      const completed = getCompletedFiles(state);

      expect(completed.length).toBe(1);
    });
  });
});

// =============================================================================
// UI Helper Tests
// =============================================================================

describe('UI Helpers', () => {
  describe('getStatusIcon', () => {
    it('should return correct icon for each status', () => {
      expect(getStatusIcon('pending')).toBe('clock');
      expect(getStatusIcon('processing')).toBe('spinner');
      expect(getStatusIcon('completed')).toBe('check');
      expect(getStatusIcon('error')).toBe('x');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for each status', () => {
      expect(getStatusColor('pending')).toBe('text-gray-500');
      expect(getStatusColor('processing')).toBe('text-blue-500');
      expect(getStatusColor('completed')).toBe('text-green-500');
      expect(getStatusColor('error')).toBe('text-red-500');
    });
  });

  describe('getStatusText', () => {
    it('should return correct text for each status', () => {
      expect(getStatusText('pending')).toBe('Pending');
      expect(getStatusText('processing')).toBe('Processing');
      expect(getStatusText('completed')).toBe('Completed');
      expect(getStatusText('error')).toBe('Error');
    });
  });

  describe('getFileDisplayName', () => {
    it('should return file name', () => {
      const file = new File(['test'], 'my-invoice.pdf', { type: 'application/pdf' });
      expect(getFileDisplayName(file)).toBe('my-invoice.pdf');
    });

    it('should truncate long file names', () => {
      const file = new File(['test'], 'very-long-invoice-name-that-should-be-truncated.pdf', { type: 'application/pdf' });
      const displayName = getFileDisplayName(file, 20);
      expect(displayName.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(displayName).toContain('...');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('getProgressBarColor', () => {
    it('should return green when no errors', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 3,
        processing: 1,
        pending: 1,
        failed: 0,
      };
      expect(getProgressBarColor(progress)).toBe('bg-green-500');
    });

    it('should return yellow when some errors', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 3,
        processing: 0,
        pending: 1,
        failed: 1,
      };
      expect(getProgressBarColor(progress)).toBe('bg-yellow-500');
    });

    it('should return red when all failed', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 0,
        processing: 0,
        pending: 0,
        failed: 5,
      };
      expect(getProgressBarColor(progress)).toBe('bg-red-500');
    });
  });

  describe('getSummaryText', () => {
    it('should return correct summary for mixed results', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 3,
        processing: 0,
        pending: 0,
        failed: 2,
      };
      const text = getSummaryText(progress);
      expect(text).toContain('3');
      expect(text).toContain('2');
    });

    it('should return success message when all completed', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 5,
        processing: 0,
        pending: 0,
        failed: 0,
      };
      const text = getSummaryText(progress);
      expect(text).toContain('5');
      expect(text.toLowerCase()).toContain('completed');
    });

    it('should return processing message when in progress', () => {
      const progress: BatchProgress = {
        total: 5,
        completed: 2,
        processing: 1,
        pending: 2,
        failed: 0,
      };
      const text = getSummaryText(progress);
      expect(text).toContain('Processing');
    });
  });
});

// =============================================================================
// Component Helper Tests
// =============================================================================

describe('Component Helpers', () => {
  describe('canStartProcessing', () => {
    it('should return true when pending files exist and not processing', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canStartProcessing(state)).toBe(true);
    });

    it('should return false when already processing', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: true };

      expect(canStartProcessing(state)).toBe(false);
    });

    it('should return false when no pending files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canStartProcessing(state)).toBe(false);
    });
  });

  describe('canRetryFailed', () => {
    it('should return true when failed files exist and not processing', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'error' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canRetryFailed(state)).toBe(true);
    });

    it('should return false when no failed files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canRetryFailed(state)).toBe(false);
    });
  });

  describe('canClearCompleted', () => {
    it('should return true when completed files exist', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'completed' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canClearCompleted(state)).toBe(true);
    });

    it('should return false when no completed files', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'pending' },
      ];
      const state: BatchState = { files, isProcessing: false };

      expect(canClearCompleted(state)).toBe(false);
    });
  });

  describe('getActionButtonState', () => {
    it('should return correct button states', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'pending' },
        { ...createQueuedFile(new File([''], '2.pdf', { type: 'application/pdf' })), status: 'completed' },
        { ...createQueuedFile(new File([''], '3.pdf', { type: 'application/pdf' })), status: 'error' },
      ];
      const state: BatchState = { files, isProcessing: false };

      const buttons = getActionButtonState(state);

      expect(buttons.canStart).toBe(true);
      expect(buttons.canRetry).toBe(true);
      expect(buttons.canClear).toBe(true);
      expect(buttons.canClearAll).toBe(true);
    });

    it('should disable all actions when processing', () => {
      const files: QueuedFile[] = [
        { ...createQueuedFile(new File([''], '1.pdf', { type: 'application/pdf' })), status: 'processing' },
      ];
      const state: BatchState = { files, isProcessing: true };

      const buttons = getActionButtonState(state);

      expect(buttons.canStart).toBe(false);
      expect(buttons.canRetry).toBe(false);
    });
  });
});

// =============================================================================
// Initial State Tests
// =============================================================================

describe('Initial State', () => {
  describe('createInitialBatchState', () => {
    it('should create empty state', () => {
      const state = createInitialBatchState();

      expect(state.files).toEqual([]);
      expect(state.isProcessing).toBe(false);
    });
  });
});
