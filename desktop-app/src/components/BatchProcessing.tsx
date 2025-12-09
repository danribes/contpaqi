/**
 * Batch Processing Components and Utilities
 * Subtask 14.9: Add batch processing view for multiple invoices
 *
 * Provides:
 * - Queue management for multiple PDF files
 * - Status tracking for each file (pending, processing, completed, error)
 * - Progress display and calculations
 * - Batch actions (process all, retry failed, clear)
 * - File list UI with status indicators
 */

import { useState, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export type FileStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ProcessingResult {
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
  confidence: number;
  fecha?: string;
  subtotal?: number;
  iva?: number;
}

export interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ProcessingResult;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
}

export interface BatchState {
  files: QueuedFile[];
  isProcessing: boolean;
}

export interface ActionButtonState {
  canStart: boolean;
  canRetry: boolean;
  canClear: boolean;
  canClearAll: boolean;
}

// =============================================================================
// Queue Management Functions
// =============================================================================

/**
 * Generate unique ID for queued file
 */
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a queued file from a File object
 */
export function createQueuedFile(file: File): QueuedFile {
  return {
    id: generateFileId(),
    file,
    status: 'pending',
    addedAt: new Date(),
  };
}

/**
 * Add files to the queue
 */
export function addFilesToQueue(state: BatchState, files: File[]): BatchState {
  // Filter to only PDF files
  const pdfFiles = files.filter(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );

  const queuedFiles = pdfFiles.map(createQueuedFile);

  return {
    ...state,
    files: [...state.files, ...queuedFiles],
  };
}

/**
 * Remove a file from the queue by ID
 */
export function removeFileFromQueue(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.filter((f) => f.id !== fileId),
  };
}

/**
 * Clear all completed files from the queue
 */
export function clearCompletedFiles(state: BatchState): BatchState {
  return {
    ...state,
    files: state.files.filter((f) => f.status !== 'completed'),
  };
}

/**
 * Clear all files from the queue
 */
export function clearAllFiles(state: BatchState): BatchState {
  return {
    ...state,
    files: [],
  };
}

/**
 * Get a file by ID
 */
export function getFileById(state: BatchState, fileId: string): QueuedFile | undefined {
  return state.files.find((f) => f.id === fileId);
}

/**
 * Get files by status
 */
export function getFilesByStatus(state: BatchState, status: FileStatus): QueuedFile[] {
  return state.files.filter((f) => f.status === status);
}

// =============================================================================
// Status Management Functions
// =============================================================================

/**
 * Update file status
 */
export function updateFileStatus(
  state: BatchState,
  fileId: string,
  status: FileStatus
): BatchState {
  return {
    ...state,
    files: state.files.map((f) => (f.id === fileId ? { ...f, status } : f)),
  };
}

/**
 * Mark file as processing
 */
export function markFileProcessing(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId
        ? { ...f, status: 'processing' as FileStatus, startedAt: new Date() }
        : f
    ),
  };
}

/**
 * Mark file as completed with result
 */
export function markFileCompleted(
  state: BatchState,
  fileId: string,
  result: ProcessingResult
): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId
        ? {
            ...f,
            status: 'completed' as FileStatus,
            result,
            completedAt: new Date(),
          }
        : f
    ),
  };
}

/**
 * Mark file as error
 */
export function markFileError(
  state: BatchState,
  fileId: string,
  error: string
): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId ? { ...f, status: 'error' as FileStatus, error } : f
    ),
  };
}

/**
 * Mark file for retry (reset to pending)
 */
export function markFileRetrying(state: BatchState, fileId: string): BatchState {
  return {
    ...state,
    files: state.files.map((f) =>
      f.id === fileId
        ? { ...f, status: 'pending' as FileStatus, error: undefined }
        : f
    ),
  };
}

/**
 * Check if file can be retried
 */
export function canRetryFile(file: QueuedFile): boolean {
  return file.status === 'error';
}

// =============================================================================
// Progress Calculation Functions
// =============================================================================

/**
 * Calculate batch progress
 */
export function calculateProgress(state: BatchState): BatchProgress {
  const files = state.files;
  return {
    total: files.length,
    completed: files.filter((f) => f.status === 'completed').length,
    processing: files.filter((f) => f.status === 'processing').length,
    pending: files.filter((f) => f.status === 'pending').length,
    failed: files.filter((f) => f.status === 'error').length,
  };
}

/**
 * Get progress percentage (0-100)
 */
export function getProgressPercentage(progress: BatchProgress): number {
  if (progress.total === 0) return 0;
  return Math.round((progress.completed / progress.total) * 100);
}

/**
 * Check if all processing is complete
 */
export function isProcessingComplete(state: BatchState): boolean {
  const progress = calculateProgress(state);
  return progress.pending === 0 && progress.processing === 0;
}

/**
 * Check if there are any errors
 */
export function hasErrors(state: BatchState): boolean {
  return state.files.some((f) => f.status === 'error');
}

/**
 * Check if there are pending files
 */
export function hasPendingFiles(state: BatchState): boolean {
  return state.files.some((f) => f.status === 'pending');
}

// =============================================================================
// Batch Action Functions
// =============================================================================

/**
 * Get next pending file
 */
export function getNextPendingFile(state: BatchState): QueuedFile | undefined {
  return state.files.find((f) => f.status === 'pending');
}

/**
 * Get all failed files
 */
export function getFailedFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'error');
}

/**
 * Get all pending files
 */
export function getPendingFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'pending');
}

/**
 * Get all completed files
 */
export function getCompletedFiles(state: BatchState): QueuedFile[] {
  return state.files.filter((f) => f.status === 'completed');
}

// =============================================================================
// UI Helper Functions
// =============================================================================

/**
 * Get status icon name
 */
export function getStatusIcon(status: FileStatus): string {
  switch (status) {
    case 'pending':
      return 'clock';
    case 'processing':
      return 'spinner';
    case 'completed':
      return 'check';
    case 'error':
      return 'x';
  }
}

/**
 * Get status color class
 */
export function getStatusColor(status: FileStatus): string {
  switch (status) {
    case 'pending':
      return 'text-gray-500';
    case 'processing':
      return 'text-blue-500';
    case 'completed':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
  }
}

/**
 * Get status text
 */
export function getStatusText(status: FileStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
  }
}

/**
 * Get file display name (optionally truncated)
 */
export function getFileDisplayName(file: File, maxLength?: number): string {
  const name = file.name;
  if (!maxLength || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get progress bar color
 */
export function getProgressBarColor(progress: BatchProgress): string {
  if (progress.total === 0) return 'bg-gray-300';
  if (progress.failed === progress.total) return 'bg-red-500';
  if (progress.failed > 0) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get summary text
 */
export function getSummaryText(progress: BatchProgress): string {
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

// =============================================================================
// Component Helper Functions
// =============================================================================

/**
 * Check if processing can be started
 */
export function canStartProcessing(state: BatchState): boolean {
  return !state.isProcessing && hasPendingFiles(state);
}

/**
 * Check if failed files can be retried
 */
export function canRetryFailed(state: BatchState): boolean {
  return !state.isProcessing && hasErrors(state);
}

/**
 * Check if completed files can be cleared
 */
export function canClearCompleted(state: BatchState): boolean {
  return getCompletedFiles(state).length > 0;
}

/**
 * Get action button states
 */
export function getActionButtonState(state: BatchState): ActionButtonState {
  return {
    canStart: canStartProcessing(state),
    canRetry: canRetryFailed(state),
    canClear: canClearCompleted(state),
    canClearAll: state.files.length > 0 && !state.isProcessing,
  };
}

/**
 * Create initial batch state
 */
export function createInitialBatchState(): BatchState {
  return {
    files: [],
    isProcessing: false,
  };
}

// =============================================================================
// React Components
// =============================================================================

interface StatusIconProps {
  status: FileStatus;
  className?: string;
}

/**
 * Status icon component
 */
export function StatusIcon({ status, className = '' }: StatusIconProps) {
  const colorClass = getStatusColor(status);

  if (status === 'pending') {
    return (
      <svg
        className={`w-5 h-5 ${colorClass} ${className}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (status === 'processing') {
    return (
      <svg
        className={`w-5 h-5 ${colorClass} ${className} animate-spin`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    );
  }

  if (status === 'completed') {
    return (
      <svg
        className={`w-5 h-5 ${colorClass} ${className}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }

  // error
  return (
    <svg
      className={`w-5 h-5 ${colorClass} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

interface ProgressBarProps {
  progress: BatchProgress;
  className?: string;
}

/**
 * Progress bar component
 */
export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  const percentage = getProgressPercentage(progress);
  const color = getProgressBarColor(progress);

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className={`h-2.5 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface FileListItemProps {
  queuedFile: QueuedFile;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onView?: (id: string) => void;
}

/**
 * Individual file list item
 */
export function FileListItem({
  queuedFile,
  onRemove,
  onRetry,
  onView,
}: FileListItemProps) {
  const { id, file, status, error, result } = queuedFile;

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <StatusIcon status={status} />
        <div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
            {status === 'error' && error && (
              <span className="ml-2 text-red-500">{error}</span>
            )}
            {status === 'completed' && result && (
              <span className="ml-2 text-green-600">
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === 'completed' && onView && (
          <button
            onClick={() => onView(id)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            View
          </button>
        )}
        {status === 'error' && onRetry && (
          <button
            onClick={() => onRetry(id)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Retry
          </button>
        )}
        {(status === 'pending' || status === 'completed' || status === 'error') &&
          onRemove && (
            <button
              onClick={() => onRemove(id)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          )}
      </div>
    </div>
  );
}

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * File drop zone for uploading PDFs
 */
export function FileDropZone({
  onFilesSelected,
  disabled = false,
  className = '',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    },
    [disabled, onFilesSelected]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
        e.target.value = '';
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="mt-2 text-sm text-gray-600">
        Drag and drop PDF files here, or click to select
      </p>
      <p className="mt-1 text-xs text-gray-500">Only PDF files will be accepted</p>
    </div>
  );
}

interface BatchActionsProps {
  state: BatchState;
  onStart: () => void;
  onRetryFailed: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

/**
 * Batch action buttons
 */
export function BatchActions({
  state,
  onStart,
  onRetryFailed,
  onClearCompleted,
  onClearAll,
}: BatchActionsProps) {
  const buttons = getActionButtonState(state);
  const progress = calculateProgress(state);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onStart}
        disabled={!buttons.canStart}
        className={`
          px-4 py-2 text-sm font-medium rounded-md
          ${
            buttons.canStart
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {state.isProcessing ? 'Processing...' : `Process ${progress.pending} Files`}
      </button>

      {buttons.canRetry && (
        <button
          onClick={onRetryFailed}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          Retry Failed ({progress.failed})
        </button>
      )}

      {buttons.canClear && (
        <button
          onClick={onClearCompleted}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Clear Completed
        </button>
      )}

      {buttons.canClearAll && (
        <button
          onClick={onClearAll}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
        >
          Clear All
        </button>
      )}
    </div>
  );
}

interface BatchSummaryProps {
  progress: BatchProgress;
  className?: string;
}

/**
 * Batch processing summary
 */
export function BatchSummary({ progress, className = '' }: BatchSummaryProps) {
  const percentage = getProgressPercentage(progress);
  const summaryText = getSummaryText(progress);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Progress</span>
        <span className="text-sm text-gray-500">{percentage}%</span>
      </div>
      <ProgressBar progress={progress} />
      <p className="mt-2 text-sm text-gray-600">{summaryText}</p>
    </div>
  );
}

// =============================================================================
// Hook
// =============================================================================

export interface UseBatchProcessingOptions {
  onProcessFile?: (file: File) => Promise<ProcessingResult>;
  onComplete?: () => void;
  onError?: (fileId: string, error: Error) => void;
}

/**
 * Hook for batch processing
 */
export function useBatchProcessing(options: UseBatchProcessingOptions = {}) {
  const [state, setState] = useState<BatchState>(createInitialBatchState);
  const { onProcessFile, onComplete, onError } = options;

  const addFiles = useCallback((files: File[]) => {
    setState((prev) => addFilesToQueue(prev, files));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setState((prev) => removeFileFromQueue(prev, fileId));
  }, []);

  const clearCompleted = useCallback(() => {
    setState((prev) => clearCompletedFiles(prev));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => clearAllFiles(prev));
  }, []);

  const retryFile = useCallback((fileId: string) => {
    setState((prev) => markFileRetrying(prev, fileId));
  }, []);

  const retryAllFailed = useCallback(() => {
    setState((prev) => {
      let newState = prev;
      getFailedFiles(prev).forEach((file) => {
        newState = markFileRetrying(newState, file.id);
      });
      return newState;
    });
  }, []);

  const processNext = useCallback(async () => {
    const current = getNextPendingFile(state);
    if (!current || state.isProcessing) return;

    setState((prev) => ({ ...markFileProcessing(prev, current.id), isProcessing: true }));

    try {
      if (onProcessFile) {
        const result = await onProcessFile(current.file);
        setState((prev) => {
          const newState = markFileCompleted(prev, current.id, result);
          const progress = calculateProgress(newState);
          if (progress.pending === 0 && progress.processing === 0) {
            onComplete?.();
          }
          return { ...newState, isProcessing: false };
        });
      } else {
        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockResult: ProcessingResult = {
          rfcEmisor: 'ABC123456XXX',
          rfcReceptor: 'DEF789012YYY',
          total: 1234.56,
          confidence: 0.95,
        };
        setState((prev) => ({ ...markFileCompleted(prev, current.id, mockResult), isProcessing: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      setState((prev) => ({ ...markFileError(prev, current.id, errorMessage), isProcessing: false }));
      onError?.(current.id, error instanceof Error ? error : new Error(errorMessage));
    }
  }, [state, onProcessFile, onComplete, onError]);

  const processAll = useCallback(async () => {
    const pending = getPendingFiles(state);
    for (const file of pending) {
      await processNext();
    }
  }, [state, processNext]);

  const progress = calculateProgress(state);
  const buttons = getActionButtonState(state);

  return {
    state,
    progress,
    buttons,
    addFiles,
    removeFile,
    clearCompleted,
    clearAll,
    retryFile,
    retryAllFailed,
    processNext,
    processAll,
  };
}

// =============================================================================
// Main Component
// =============================================================================

interface BatchProcessingViewProps {
  onProcessFile?: (file: File) => Promise<ProcessingResult>;
  onFileView?: (file: QueuedFile) => void;
  className?: string;
}

/**
 * Main batch processing view component
 */
export function BatchProcessingView({
  onProcessFile,
  onFileView,
  className = '',
}: BatchProcessingViewProps) {
  const {
    state,
    progress,
    addFiles,
    removeFile,
    clearCompleted,
    clearAll,
    retryFile,
    retryAllFailed,
    processAll,
  } = useBatchProcessing({ onProcessFile });

  const handleStart = useCallback(() => {
    processAll();
  }, [processAll]);

  const handleView = useCallback(
    (fileId: string) => {
      const file = getFileById(state, fileId);
      if (file && onFileView) {
        onFileView(file);
      }
    },
    [state, onFileView]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Batch Processing</h2>
        <span className="text-sm text-gray-500">
          {progress.total} file{progress.total !== 1 ? 's' : ''} in queue
        </span>
      </div>

      <FileDropZone onFilesSelected={addFiles} disabled={state.isProcessing} />

      {state.files.length > 0 && (
        <>
          <BatchSummary progress={progress} />

          <BatchActions
            state={state}
            onStart={handleStart}
            onRetryFailed={retryAllFailed}
            onClearCompleted={clearCompleted}
            onClearAll={clearAll}
          />

          <div className="space-y-2">
            {state.files.map((file) => (
              <FileListItem
                key={file.id}
                queuedFile={file}
                onRemove={removeFile}
                onRetry={retryFile}
                onView={handleView}
              />
            ))}
          </div>
        </>
      )}

      {state.files.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No files in queue. Add PDF files to start batch processing.
        </p>
      )}
    </div>
  );
}

export default BatchProcessingView;
