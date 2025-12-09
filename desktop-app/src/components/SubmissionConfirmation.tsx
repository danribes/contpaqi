/**
 * Submission Confirmation Components and Utilities
 * Subtask 14.8: Implement submission confirmation flow
 *
 * Provides:
 * - Confirmation modal before submission
 * - Data summary display
 * - Corrections summary
 * - Loading/Success/Error states
 * - Auto-close behavior
 */

import { useState, useCallback, useEffect } from 'react';

// ============= Types =============

export interface InvoiceSummary {
  rfcEmisor: string;
  rfcReceptor: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  lineItemCount: number;
  correctionsCount: number;
  correctedFields: string[];
}

export interface SubmissionState {
  status: 'idle' | 'confirming' | 'submitting' | 'success' | 'error';
  error?: string;
  submittedAt?: Date;
}

export interface ConfirmationData {
  summary: InvoiceSummary;
  hasCorrections: boolean;
  isValid: boolean;
  warningMessages: string[];
}

export interface FormFieldData {
  value: string;
  originalValue: string;
}

// ============= Constants =============

export const FIELD_LABELS: Record<string, string> = {
  rfcEmisor: 'RFC Emisor',
  rfcReceptor: 'RFC Receptor',
  fecha: 'Date',
  subtotal: 'Subtotal',
  iva: 'IVA',
  total: 'Total',
};

export const AUTO_CLOSE_DELAY = 3000;

// ============= Utility Functions =============

/**
 * Create invoice summary from form data
 */
export function createInvoiceSummary(
  formData: {
    rfcEmisor: FormFieldData;
    rfcReceptor: FormFieldData;
    fecha: FormFieldData;
    subtotal: FormFieldData;
    iva: FormFieldData;
    total: FormFieldData;
  },
  lineItemCount: number
): InvoiceSummary {
  const correctedFields: string[] = [];

  if (formData.rfcEmisor.value !== formData.rfcEmisor.originalValue) {
    correctedFields.push('rfcEmisor');
  }
  if (formData.rfcReceptor.value !== formData.rfcReceptor.originalValue) {
    correctedFields.push('rfcReceptor');
  }
  if (formData.fecha.value !== formData.fecha.originalValue) {
    correctedFields.push('fecha');
  }
  if (formData.subtotal.value !== formData.subtotal.originalValue) {
    correctedFields.push('subtotal');
  }
  if (formData.iva.value !== formData.iva.originalValue) {
    correctedFields.push('iva');
  }
  if (formData.total.value !== formData.total.originalValue) {
    correctedFields.push('total');
  }

  return {
    rfcEmisor: formData.rfcEmisor.value,
    rfcReceptor: formData.rfcReceptor.value,
    fecha: formData.fecha.value,
    subtotal: parseFloat(formData.subtotal.value) || 0,
    iva: parseFloat(formData.iva.value) || 0,
    total: parseFloat(formData.total.value) || 0,
    lineItemCount,
    correctionsCount: correctedFields.length,
    correctedFields,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get field label
 */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * Create initial submission state
 */
export function createInitialState(): SubmissionState {
  return { status: 'idle' };
}

/**
 * Transition to confirming state
 */
export function startConfirmation(state: SubmissionState): SubmissionState {
  if (state.status !== 'idle') return state;
  return { status: 'confirming' };
}

/**
 * Cancel confirmation
 */
export function cancelConfirmation(state: SubmissionState): SubmissionState {
  if (state.status !== 'confirming') return state;
  return { status: 'idle' };
}

/**
 * Start submission
 */
export function startSubmission(state: SubmissionState): SubmissionState {
  if (state.status !== 'confirming') return state;
  return { status: 'submitting' };
}

/**
 * Mark submission as successful
 */
export function submitSuccess(state: SubmissionState): SubmissionState {
  if (state.status !== 'submitting') return state;
  return { status: 'success', submittedAt: new Date() };
}

/**
 * Mark submission as failed
 */
export function submitError(
  state: SubmissionState,
  error: string
): SubmissionState {
  if (state.status !== 'submitting') return state;
  return { status: 'error', error };
}

/**
 * Reset to initial state
 */
export function resetState(): SubmissionState {
  return createInitialState();
}

/**
 * Check if confirmation should be shown
 */
export function shouldShowConfirmation(state: SubmissionState): boolean {
  return state.status === 'confirming';
}

/**
 * Check if loading spinner should be shown
 */
export function shouldShowLoading(state: SubmissionState): boolean {
  return state.status === 'submitting';
}

/**
 * Check if success message should be shown
 */
export function shouldShowSuccess(state: SubmissionState): boolean {
  return state.status === 'success';
}

/**
 * Check if error message should be shown
 */
export function shouldShowError(state: SubmissionState): boolean {
  return state.status === 'error';
}

/**
 * Get confirmation modal title
 */
export function getConfirmationTitle(hasCorrections: boolean): string {
  return hasCorrections
    ? 'Confirm Submission with Corrections'
    : 'Confirm Invoice Submission';
}

/**
 * Get confirmation message
 */
export function getConfirmationMessage(summary: InvoiceSummary): string {
  if (summary.correctionsCount > 0) {
    return `You have made ${summary.correctionsCount} correction(s). Please review the data before submitting.`;
  }
  return 'Please review the invoice data before submitting.';
}

/**
 * Get success message
 */
export function getSuccessMessage(): string {
  return 'Invoice submitted successfully!';
}

/**
 * Get retry message
 */
export function getRetryMessage(): string {
  return 'Would you like to try again?';
}

/**
 * Validate confirmation data
 */
export function validateConfirmationData(data: ConfirmationData): {
  canSubmit: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.isValid) {
    errors.push('Form validation failed. Please fix errors before submitting.');
  }

  if (data.summary.subtotal <= 0) {
    errors.push('Subtotal must be greater than zero.');
  }

  if (data.summary.total <= 0) {
    errors.push('Total must be greater than zero.');
  }

  return {
    canSubmit: errors.length === 0,
    errors,
  };
}

/**
 * Get corrections summary text
 */
export function getCorrectionsSummaryText(correctedFields: string[]): string {
  if (correctedFields.length === 0) {
    return 'No corrections made';
  }

  const fieldLabels = correctedFields.map(getFieldLabel);
  return `Corrected fields: ${fieldLabels.join(', ')}`;
}

/**
 * Get modal CSS classes based on state
 */
export function getModalClasses(state: SubmissionState): string {
  const base =
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  if (state.status === 'success') {
    return `${base} bg-green-900 bg-opacity-20`;
  }
  if (state.status === 'error') {
    return `${base} bg-red-900 bg-opacity-20`;
  }
  return base;
}

/**
 * Get submit button text based on state
 */
export function getSubmitButtonText(state: SubmissionState): string {
  switch (state.status) {
    case 'submitting':
      return 'Submitting...';
    case 'success':
      return 'Submitted';
    case 'error':
      return 'Retry';
    default:
      return 'Confirm & Submit';
  }
}

/**
 * Check if submit button should be disabled
 */
export function isSubmitButtonDisabled(state: SubmissionState): boolean {
  return state.status === 'submitting' || state.status === 'success';
}

// ============= Components =============

interface DataRowProps {
  label: string;
  value: string;
  isCorrected?: boolean;
}

/**
 * Data row in summary
 */
function DataRow({ label, value, isCorrected = false }: DataRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span
        className={`font-medium ${isCorrected ? 'text-blue-600' : 'text-gray-900'}`}
      >
        {value}
        {isCorrected && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            Corrected
          </span>
        )}
      </span>
    </div>
  );
}

interface InvoiceSummaryDisplayProps {
  summary: InvoiceSummary;
  className?: string;
}

/**
 * Invoice summary display component
 */
export function InvoiceSummaryDisplay({
  summary,
  className = '',
}: InvoiceSummaryDisplayProps) {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Invoice Data</h4>
      <div className="space-y-1 text-sm">
        <DataRow
          label="RFC Emisor"
          value={summary.rfcEmisor}
          isCorrected={summary.correctedFields.includes('rfcEmisor')}
        />
        <DataRow
          label="RFC Receptor"
          value={summary.rfcReceptor}
          isCorrected={summary.correctedFields.includes('rfcReceptor')}
        />
        <DataRow
          label="Date"
          value={formatDate(summary.fecha)}
          isCorrected={summary.correctedFields.includes('fecha')}
        />
        <div className="border-t border-gray-200 my-2" />
        <DataRow
          label="Subtotal"
          value={formatCurrency(summary.subtotal)}
          isCorrected={summary.correctedFields.includes('subtotal')}
        />
        <DataRow
          label="IVA (16%)"
          value={formatCurrency(summary.iva)}
          isCorrected={summary.correctedFields.includes('iva')}
        />
        <DataRow
          label="Total"
          value={formatCurrency(summary.total)}
          isCorrected={summary.correctedFields.includes('total')}
        />
        {summary.lineItemCount > 0 && (
          <>
            <div className="border-t border-gray-200 my-2" />
            <DataRow
              label="Line Items"
              value={`${summary.lineItemCount} item(s)`}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface CorrectionsSummaryProps {
  correctedFields: string[];
  className?: string;
}

/**
 * Corrections summary component
 */
export function CorrectionsSummary({
  correctedFields,
  className = '',
}: CorrectionsSummaryProps) {
  if (correctedFields.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No manual corrections were made
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">
            {correctedFields.length} correction(s) made
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {correctedFields.map(getFieldLabel).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({
  message = 'Submitting invoice...',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <svg
        className="animate-spin h-12 w-12 text-primary-600 mx-auto"
        xmlns="http://www.w3.org/2000/svg"
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

interface SuccessDisplayProps {
  message?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Success display component
 */
export function SuccessDisplay({
  message = 'Invoice submitted successfully!',
  onClose,
  className = '',
}: SuccessDisplayProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600"
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
      </div>
      <p className="mt-4 text-lg font-medium text-gray-900">{message}</p>
      <p className="mt-2 text-sm text-gray-500">
        This dialog will close automatically
      </p>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700"
        >
          Close now
        </button>
      )}
    </div>
  );
}

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Error display component
 */
export function ErrorDisplay({
  error,
  onRetry,
  onCancel,
  className = '',
}: ErrorDisplayProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-red-600"
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
      </div>
      <p className="mt-4 text-lg font-medium text-gray-900">Submission Failed</p>
      <p className="mt-2 text-sm text-red-600">{error}</p>
      <div className="mt-6 flex justify-center gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

interface ConfirmationModalProps {
  isOpen: boolean;
  summary: InvoiceSummary;
  state: SubmissionState;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Confirmation modal component
 */
export function ConfirmationModal({
  isOpen,
  summary,
  state,
  onConfirm,
  onCancel,
  onClose,
  onRetry,
  className = '',
}: ConfirmationModalProps) {
  // Auto-close on success
  useEffect(() => {
    if (state.status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state.status, onClose]);

  if (!isOpen) return null;

  const hasCorrections = summary.correctionsCount > 0;
  const title = getConfirmationTitle(hasCorrections);

  return (
    <div className={getModalClasses(state)}>
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {state.status === 'confirming' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {getConfirmationMessage(summary)}
              </p>
              <InvoiceSummaryDisplay summary={summary} className="mb-4" />
              <CorrectionsSummary correctedFields={summary.correctedFields} />
            </>
          )}

          {state.status === 'submitting' && <LoadingSpinner />}

          {state.status === 'success' && (
            <SuccessDisplay onClose={onClose} />
          )}

          {state.status === 'error' && (
            <ErrorDisplay
              error={state.error || 'Unknown error occurred'}
              onRetry={onRetry}
              onCancel={onCancel}
            />
          )}
        </div>

        {/* Footer - only show in confirming state */}
        {state.status === 'confirming' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitButtonDisabled(state)}
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSubmitButtonText(state)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============= Hooks =============

/**
 * Hook for managing submission state
 */
export function useSubmissionState(): {
  state: SubmissionState;
  showConfirmation: () => void;
  cancel: () => void;
  submit: () => void;
  success: () => void;
  error: (message: string) => void;
  reset: () => void;
} {
  const [state, setState] = useState<SubmissionState>(createInitialState);

  const showConfirmation = useCallback(() => {
    setState((prev) => startConfirmation(prev));
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => cancelConfirmation(prev));
  }, []);

  const submit = useCallback(() => {
    setState((prev) => startSubmission(prev));
  }, []);

  const success = useCallback(() => {
    setState((prev) => submitSuccess(prev));
  }, []);

  const error = useCallback((message: string) => {
    setState((prev) => submitError(prev, message));
  }, []);

  const reset = useCallback(() => {
    setState(resetState());
  }, []);

  return {
    state,
    showConfirmation,
    cancel,
    submit,
    success,
    error,
    reset,
  };
}

/**
 * Hook for handling the full submission flow
 */
export function useSubmissionFlow(
  onSubmit: () => Promise<void>,
  onSuccess?: () => void
): {
  state: SubmissionState;
  showConfirmation: () => void;
  cancelConfirmation: () => void;
  confirmAndSubmit: () => Promise<void>;
  closeModal: () => void;
} {
  const {
    state,
    showConfirmation,
    cancel,
    submit,
    success,
    error,
    reset,
  } = useSubmissionState();

  const confirmAndSubmit = useCallback(async () => {
    submit();
    try {
      await onSubmit();
      success();
      onSuccess?.();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Submission failed');
    }
  }, [submit, onSubmit, success, error, onSuccess]);

  const closeModal = useCallback(() => {
    reset();
  }, [reset]);

  return {
    state,
    showConfirmation,
    cancelConfirmation: cancel,
    confirmAndSubmit,
    closeModal,
  };
}

// ============= Default Export =============

export default {
  // Constants
  FIELD_LABELS,
  AUTO_CLOSE_DELAY,
  // Utility functions
  createInvoiceSummary,
  formatCurrency,
  formatDate,
  getFieldLabel,
  createInitialState,
  startConfirmation,
  cancelConfirmation,
  startSubmission,
  submitSuccess,
  submitError,
  resetState,
  shouldShowConfirmation,
  shouldShowLoading,
  shouldShowSuccess,
  shouldShowError,
  getConfirmationTitle,
  getConfirmationMessage,
  getSuccessMessage,
  getRetryMessage,
  validateConfirmationData,
  getCorrectionsSummaryText,
  getModalClasses,
  getSubmitButtonText,
  isSubmitButtonDisabled,
  // Components
  InvoiceSummaryDisplay,
  CorrectionsSummary,
  LoadingSpinner,
  SuccessDisplay,
  ErrorDisplay,
  ConfirmationModal,
  // Hooks
  useSubmissionState,
  useSubmissionFlow,
};
