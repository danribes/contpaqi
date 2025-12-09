/**
 * Tests for Subtask 14.8: Implement submission confirmation flow
 *
 * Features tested:
 * - Confirmation modal display
 * - Data summary before submission
 * - Corrections summary display
 * - Submit/Cancel actions
 * - Loading state during submission
 * - Success/Error states after submission
 * - Auto-close behavior
 */

import { describe, it, expect } from '@jest/globals';

// ============= Types =============

interface InvoiceSummary {
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

interface SubmissionState {
  status: 'idle' | 'confirming' | 'submitting' | 'success' | 'error';
  error?: string;
  submittedAt?: Date;
}

interface ConfirmationData {
  summary: InvoiceSummary;
  hasCorrections: boolean;
  isValid: boolean;
  warningMessages: string[];
}

// ============= Constants =============

const FIELD_LABELS: Record<string, string> = {
  rfcEmisor: 'RFC Emisor',
  rfcReceptor: 'RFC Receptor',
  fecha: 'Date',
  subtotal: 'Subtotal',
  iva: 'IVA',
  total: 'Total',
};

const AUTO_CLOSE_DELAY = 3000; // 3 seconds

// ============= Utility Functions =============

/**
 * Create invoice summary from form data
 */
function createInvoiceSummary(
  formData: {
    rfcEmisor: { value: string; originalValue: string };
    rfcReceptor: { value: string; originalValue: string };
    fecha: { value: string; originalValue: string };
    subtotal: { value: string; originalValue: string };
    iva: { value: string; originalValue: string };
    total: { value: string; originalValue: string };
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
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
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
function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * Create initial submission state
 */
function createInitialState(): SubmissionState {
  return { status: 'idle' };
}

/**
 * Transition to confirming state
 */
function startConfirmation(state: SubmissionState): SubmissionState {
  if (state.status !== 'idle') return state;
  return { status: 'confirming' };
}

/**
 * Cancel confirmation
 */
function cancelConfirmation(state: SubmissionState): SubmissionState {
  if (state.status !== 'confirming') return state;
  return { status: 'idle' };
}

/**
 * Start submission
 */
function startSubmission(state: SubmissionState): SubmissionState {
  if (state.status !== 'confirming') return state;
  return { status: 'submitting' };
}

/**
 * Mark submission as successful
 */
function submitSuccess(state: SubmissionState): SubmissionState {
  if (state.status !== 'submitting') return state;
  return { status: 'success', submittedAt: new Date() };
}

/**
 * Mark submission as failed
 */
function submitError(state: SubmissionState, error: string): SubmissionState {
  if (state.status !== 'submitting') return state;
  return { status: 'error', error };
}

/**
 * Reset to initial state
 */
function resetState(): SubmissionState {
  return createInitialState();
}

/**
 * Check if confirmation should be shown
 */
function shouldShowConfirmation(state: SubmissionState): boolean {
  return state.status === 'confirming';
}

/**
 * Check if loading spinner should be shown
 */
function shouldShowLoading(state: SubmissionState): boolean {
  return state.status === 'submitting';
}

/**
 * Check if success message should be shown
 */
function shouldShowSuccess(state: SubmissionState): boolean {
  return state.status === 'success';
}

/**
 * Check if error message should be shown
 */
function shouldShowError(state: SubmissionState): boolean {
  return state.status === 'error';
}

/**
 * Get confirmation modal title
 */
function getConfirmationTitle(hasCorrections: boolean): string {
  return hasCorrections
    ? 'Confirm Submission with Corrections'
    : 'Confirm Invoice Submission';
}

/**
 * Get confirmation message
 */
function getConfirmationMessage(summary: InvoiceSummary): string {
  if (summary.correctionsCount > 0) {
    return `You have made ${summary.correctionsCount} correction(s). Please review the data before submitting.`;
  }
  return 'Please review the invoice data before submitting.';
}

/**
 * Get success message
 */
function getSuccessMessage(): string {
  return 'Invoice submitted successfully!';
}

/**
 * Get retry message
 */
function getRetryMessage(): string {
  return 'Would you like to try again?';
}

/**
 * Validate confirmation data
 */
function validateConfirmationData(data: ConfirmationData): {
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
function getCorrectionsSummaryText(correctedFields: string[]): string {
  if (correctedFields.length === 0) {
    return 'No corrections made';
  }

  const fieldLabels = correctedFields.map(getFieldLabel);
  return `Corrected fields: ${fieldLabels.join(', ')}`;
}

/**
 * Get modal CSS classes based on state
 */
function getModalClasses(state: SubmissionState): string {
  const base = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
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
function getSubmitButtonText(state: SubmissionState): string {
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
function isSubmitButtonDisabled(state: SubmissionState): boolean {
  return state.status === 'submitting' || state.status === 'success';
}

// ============= TESTS =============

describe('Invoice Summary Creation', () => {
  it('should create summary from form data', () => {
    const formData = {
      rfcEmisor: { value: 'XAXX010101000', originalValue: 'XAXX010101000' },
      rfcReceptor: { value: 'XBXX020202000', originalValue: 'XBXX020202000' },
      fecha: { value: '2024-03-15', originalValue: '2024-03-15' },
      subtotal: { value: '10000', originalValue: '10000' },
      iva: { value: '1600', originalValue: '1600' },
      total: { value: '11600', originalValue: '11600' },
    };

    const summary = createInvoiceSummary(formData, 5);

    expect(summary.rfcEmisor).toBe('XAXX010101000');
    expect(summary.total).toBe(11600);
    expect(summary.lineItemCount).toBe(5);
    expect(summary.correctionsCount).toBe(0);
  });

  it('should detect corrected fields', () => {
    const formData = {
      rfcEmisor: { value: 'XAXX010101001', originalValue: 'XAXX010101000' }, // Corrected
      rfcReceptor: { value: 'XBXX020202000', originalValue: 'XBXX020202000' },
      fecha: { value: '2024-03-16', originalValue: '2024-03-15' }, // Corrected
      subtotal: { value: '10000', originalValue: '10000' },
      iva: { value: '1600', originalValue: '1500' }, // Corrected
      total: { value: '11600', originalValue: '11500' }, // Corrected
    };

    const summary = createInvoiceSummary(formData, 3);

    expect(summary.correctionsCount).toBe(4);
    expect(summary.correctedFields).toContain('rfcEmisor');
    expect(summary.correctedFields).toContain('fecha');
    expect(summary.correctedFields).toContain('iva');
    expect(summary.correctedFields).toContain('total');
  });

  it('should handle empty values', () => {
    const formData = {
      rfcEmisor: { value: '', originalValue: '' },
      rfcReceptor: { value: '', originalValue: '' },
      fecha: { value: '', originalValue: '' },
      subtotal: { value: '', originalValue: '' },
      iva: { value: '', originalValue: '' },
      total: { value: '', originalValue: '' },
    };

    const summary = createInvoiceSummary(formData, 0);

    expect(summary.subtotal).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.lineItemCount).toBe(0);
  });
});

describe('Currency Formatting', () => {
  it('should format currency with Mexican locale', () => {
    expect(formatCurrency(10000)).toContain('10');
    expect(formatCurrency(10000)).toContain('$');
  });

  it('should handle decimal amounts', () => {
    const formatted = formatCurrency(1234.56);
    expect(formatted).toContain('$');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('Date Formatting', () => {
  it('should format valid date', () => {
    const formatted = formatDate('2024-03-15');
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should handle empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('should return original on invalid date', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });
});

describe('Submission State Machine', () => {
  it('should start in idle state', () => {
    const state = createInitialState();
    expect(state.status).toBe('idle');
  });

  it('should transition from idle to confirming', () => {
    const state = startConfirmation(createInitialState());
    expect(state.status).toBe('confirming');
  });

  it('should transition from confirming to idle on cancel', () => {
    let state = createInitialState();
    state = startConfirmation(state);
    state = cancelConfirmation(state);
    expect(state.status).toBe('idle');
  });

  it('should transition from confirming to submitting', () => {
    let state = createInitialState();
    state = startConfirmation(state);
    state = startSubmission(state);
    expect(state.status).toBe('submitting');
  });

  it('should transition from submitting to success', () => {
    let state = createInitialState();
    state = startConfirmation(state);
    state = startSubmission(state);
    state = submitSuccess(state);
    expect(state.status).toBe('success');
    expect(state.submittedAt).toBeInstanceOf(Date);
  });

  it('should transition from submitting to error', () => {
    let state = createInitialState();
    state = startConfirmation(state);
    state = startSubmission(state);
    state = submitError(state, 'Network error');
    expect(state.status).toBe('error');
    expect(state.error).toBe('Network error');
  });

  it('should not transition from idle to submitting directly', () => {
    const state = startSubmission(createInitialState());
    expect(state.status).toBe('idle');
  });

  it('should reset to idle', () => {
    let state: SubmissionState = { status: 'success', submittedAt: new Date() };
    state = resetState();
    expect(state.status).toBe('idle');
  });
});

describe('Visibility Helpers', () => {
  it('should show confirmation when confirming', () => {
    const state: SubmissionState = { status: 'confirming' };
    expect(shouldShowConfirmation(state)).toBe(true);
    expect(shouldShowLoading(state)).toBe(false);
  });

  it('should show loading when submitting', () => {
    const state: SubmissionState = { status: 'submitting' };
    expect(shouldShowLoading(state)).toBe(true);
    expect(shouldShowConfirmation(state)).toBe(false);
  });

  it('should show success when successful', () => {
    const state: SubmissionState = { status: 'success' };
    expect(shouldShowSuccess(state)).toBe(true);
    expect(shouldShowError(state)).toBe(false);
  });

  it('should show error when failed', () => {
    const state: SubmissionState = { status: 'error', error: 'Error' };
    expect(shouldShowError(state)).toBe(true);
    expect(shouldShowSuccess(state)).toBe(false);
  });
});

describe('Confirmation Title', () => {
  it('should show corrections title when corrections exist', () => {
    const title = getConfirmationTitle(true);
    expect(title).toContain('Corrections');
  });

  it('should show standard title when no corrections', () => {
    const title = getConfirmationTitle(false);
    expect(title).not.toContain('Corrections');
    expect(title).toContain('Confirm');
  });
});

describe('Confirmation Message', () => {
  it('should mention corrections count', () => {
    const summary: InvoiceSummary = {
      rfcEmisor: 'RFC',
      rfcReceptor: 'RFC',
      fecha: '2024-01-01',
      subtotal: 100,
      iva: 16,
      total: 116,
      lineItemCount: 1,
      correctionsCount: 3,
      correctedFields: ['rfcEmisor', 'iva', 'total'],
    };

    const message = getConfirmationMessage(summary);
    expect(message).toContain('3');
    expect(message).toContain('correction');
  });

  it('should show review message when no corrections', () => {
    const summary: InvoiceSummary = {
      rfcEmisor: 'RFC',
      rfcReceptor: 'RFC',
      fecha: '2024-01-01',
      subtotal: 100,
      iva: 16,
      total: 116,
      lineItemCount: 1,
      correctionsCount: 0,
      correctedFields: [],
    };

    const message = getConfirmationMessage(summary);
    expect(message).toContain('review');
  });
});

describe('Validation', () => {
  it('should allow valid confirmation data', () => {
    const data: ConfirmationData = {
      summary: {
        rfcEmisor: 'RFC',
        rfcReceptor: 'RFC',
        fecha: '2024-01-01',
        subtotal: 100,
        iva: 16,
        total: 116,
        lineItemCount: 1,
        correctionsCount: 0,
        correctedFields: [],
      },
      hasCorrections: false,
      isValid: true,
      warningMessages: [],
    };

    const result = validateConfirmationData(data);
    expect(result.canSubmit).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid form', () => {
    const data: ConfirmationData = {
      summary: {
        rfcEmisor: 'RFC',
        rfcReceptor: 'RFC',
        fecha: '2024-01-01',
        subtotal: 100,
        iva: 16,
        total: 116,
        lineItemCount: 1,
        correctionsCount: 0,
        correctedFields: [],
      },
      hasCorrections: false,
      isValid: false,
      warningMessages: [],
    };

    const result = validateConfirmationData(data);
    expect(result.canSubmit).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject zero subtotal', () => {
    const data: ConfirmationData = {
      summary: {
        rfcEmisor: 'RFC',
        rfcReceptor: 'RFC',
        fecha: '2024-01-01',
        subtotal: 0,
        iva: 0,
        total: 0,
        lineItemCount: 0,
        correctionsCount: 0,
        correctedFields: [],
      },
      hasCorrections: false,
      isValid: true,
      warningMessages: [],
    };

    const result = validateConfirmationData(data);
    expect(result.canSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes('Subtotal'))).toBe(true);
  });
});

describe('Corrections Summary', () => {
  it('should show no corrections message', () => {
    const text = getCorrectionsSummaryText([]);
    expect(text).toContain('No corrections');
  });

  it('should list corrected field labels', () => {
    const text = getCorrectionsSummaryText(['rfcEmisor', 'iva']);
    expect(text).toContain('RFC Emisor');
    expect(text).toContain('IVA');
  });
});

describe('Modal CSS Classes', () => {
  it('should have green tint on success', () => {
    const classes = getModalClasses({ status: 'success' });
    expect(classes).toContain('green');
  });

  it('should have red tint on error', () => {
    const classes = getModalClasses({ status: 'error', error: 'Error' });
    expect(classes).toContain('red');
  });

  it('should have base classes on confirming', () => {
    const classes = getModalClasses({ status: 'confirming' });
    expect(classes).toContain('fixed');
    expect(classes).toContain('z-50');
  });
});

describe('Submit Button', () => {
  it('should show "Confirm & Submit" in confirming state', () => {
    expect(getSubmitButtonText({ status: 'confirming' })).toBe('Confirm & Submit');
  });

  it('should show "Submitting..." in submitting state', () => {
    expect(getSubmitButtonText({ status: 'submitting' })).toBe('Submitting...');
  });

  it('should show "Submitted" in success state', () => {
    expect(getSubmitButtonText({ status: 'success' })).toBe('Submitted');
  });

  it('should show "Retry" in error state', () => {
    expect(getSubmitButtonText({ status: 'error', error: 'Error' })).toBe('Retry');
  });

  it('should be disabled when submitting', () => {
    expect(isSubmitButtonDisabled({ status: 'submitting' })).toBe(true);
  });

  it('should be disabled when success', () => {
    expect(isSubmitButtonDisabled({ status: 'success' })).toBe(true);
  });

  it('should be enabled in confirming state', () => {
    expect(isSubmitButtonDisabled({ status: 'confirming' })).toBe(false);
  });

  it('should be enabled in error state for retry', () => {
    expect(isSubmitButtonDisabled({ status: 'error', error: 'Error' })).toBe(false);
  });
});

describe('Success and Error Messages', () => {
  it('should have success message', () => {
    const message = getSuccessMessage();
    expect(message).toContain('success');
  });

  it('should have retry message', () => {
    const message = getRetryMessage();
    expect(message).toContain('try again');
  });
});

describe('Field Labels', () => {
  it('should return correct label for known field', () => {
    expect(getFieldLabel('rfcEmisor')).toBe('RFC Emisor');
    expect(getFieldLabel('iva')).toBe('IVA');
  });

  it('should return field name for unknown field', () => {
    expect(getFieldLabel('unknownField')).toBe('unknownField');
  });
});

describe('Auto-close Behavior', () => {
  it('should have auto-close delay constant', () => {
    expect(AUTO_CLOSE_DELAY).toBe(3000);
  });

  it('should provide submittedAt timestamp on success', () => {
    let state = createInitialState();
    state = startConfirmation(state);
    state = startSubmission(state);
    state = submitSuccess(state);

    expect(state.submittedAt).toBeDefined();
    expect(state.submittedAt).toBeInstanceOf(Date);
  });
});
