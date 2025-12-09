/**
 * Validation Blocking Components and Utilities
 * Subtask 14.6: Implement validation blocking (disable Submit)
 *
 * Provides:
 * - Form validation state calculation
 * - Submit button state management
 * - Blocking reasons display
 * - Real-time validation updates
 */

import { useMemo } from 'react';

// ============= Types =============

export interface FormFieldState {
  value: string;
  error?: string;
  touched: boolean;
  required: boolean;
}

export interface ValidationState {
  isValid: boolean;
  canSubmit: boolean;
  blockingReasons: string[];
  fieldErrors: Record<string, string>;
  mathErrors: string[];
  missingRequired: string[];
}

export interface FormValues {
  rfcEmisor: string;
  rfcReceptor: string;
  fecha: string;
  subtotal: string;
  iva: string;
  total: string;
}

// ============= Constants =============

export const REQUIRED_FIELDS = [
  'rfcEmisor',
  'rfcReceptor',
  'fecha',
  'subtotal',
  'iva',
  'total',
];

export const FIELD_LABELS: Record<string, string> = {
  rfcEmisor: 'RFC Emisor',
  rfcReceptor: 'RFC Receptor',
  fecha: 'Fecha',
  subtotal: 'Subtotal',
  iva: 'IVA',
  total: 'Total',
};

// ============= Utility Functions =============

/**
 * Check if a field value is empty
 */
export function isFieldEmpty(value: string): boolean {
  return value.trim() === '';
}

/**
 * Get list of missing required fields
 */
export function getMissingRequiredFields(
  values: FormValues,
  requiredFields: string[] = REQUIRED_FIELDS
): string[] {
  return requiredFields.filter((field) =>
    isFieldEmpty(values[field as keyof FormValues])
  );
}

/**
 * Validate RFC format (Mexican tax ID)
 */
export function validateRFC(rfc: string): string | null {
  if (!rfc) return null; // Empty handled by required check
  const rfcPattern = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
  if (!rfcPattern.test(rfc.toUpperCase())) {
    return 'Invalid RFC format';
  }
  return null;
}

/**
 * Validate date format
 */
export function validateDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return null;
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: string): string | null {
  if (!amount) return null;
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) {
    return 'Invalid amount';
  }
  return null;
}

/**
 * Get all field validation errors
 */
export function getFieldErrors(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const rfcEmisorError = validateRFC(values.rfcEmisor);
  if (rfcEmisorError) errors.rfcEmisor = rfcEmisorError;

  const rfcReceptorError = validateRFC(values.rfcReceptor);
  if (rfcReceptorError) errors.rfcReceptor = rfcReceptorError;

  const fechaError = validateDate(values.fecha);
  if (fechaError) errors.fecha = fechaError;

  const subtotalError = validateAmount(values.subtotal);
  if (subtotalError) errors.subtotal = subtotalError;

  const ivaError = validateAmount(values.iva);
  if (ivaError) errors.iva = ivaError;

  const totalError = validateAmount(values.total);
  if (totalError) errors.total = totalError;

  return errors;
}

/**
 * Validate math calculations
 */
export function getMathErrors(values: FormValues): string[] {
  const errors: string[] = [];
  const subtotal = parseFloat(values.subtotal) || 0;
  const iva = parseFloat(values.iva) || 0;
  const total = parseFloat(values.total) || 0;

  if (subtotal === 0 && iva === 0 && total === 0) {
    return []; // No math validation if all empty
  }

  const expectedIva = Math.round(subtotal * 0.16 * 100) / 100;
  const expectedTotal = Math.round((subtotal + iva) * 100) / 100;
  const tolerance = 0.01;

  if (Math.abs(iva - expectedIva) > tolerance) {
    errors.push(`IVA should be 16% of subtotal ($${expectedIva.toFixed(2)})`);
  }

  if (Math.abs(total - expectedTotal) > tolerance) {
    errors.push(
      `Total should equal subtotal + IVA ($${expectedTotal.toFixed(2)})`
    );
  }

  return errors;
}

/**
 * Calculate complete validation state
 */
export function calculateValidationState(values: FormValues): ValidationState {
  const missingRequired = getMissingRequiredFields(values);
  const fieldErrors = getFieldErrors(values);
  const mathErrors = getMathErrors(values);

  const blockingReasons: string[] = [];

  if (missingRequired.length > 0) {
    const fieldNames = missingRequired
      .map((f) => FIELD_LABELS[f] || f)
      .join(', ');
    blockingReasons.push(`Missing required fields: ${fieldNames}`);
  }

  if (Object.keys(fieldErrors).length > 0) {
    blockingReasons.push(
      `${Object.keys(fieldErrors).length} field(s) have validation errors`
    );
  }

  if (mathErrors.length > 0) {
    blockingReasons.push(`${mathErrors.length} math calculation error(s)`);
  }

  const canSubmit = blockingReasons.length === 0;

  return {
    isValid: canSubmit,
    canSubmit,
    blockingReasons,
    fieldErrors,
    mathErrors,
    missingRequired,
  };
}

/**
 * Check if submit should be disabled
 */
export function shouldDisableSubmit(validationState: ValidationState): boolean {
  return !validationState.canSubmit;
}

/**
 * Get submit button tooltip/title
 */
export function getSubmitButtonTooltip(
  validationState: ValidationState
): string {
  if (validationState.canSubmit) {
    return 'Submit invoice for processing';
  }
  return validationState.blockingReasons.join('\n');
}

/**
 * Get submit button CSS classes
 */
export function getSubmitButtonClasses(canSubmit: boolean): string {
  const baseClasses = 'px-4 py-2 text-sm text-white rounded-md transition-colors';
  if (canSubmit) {
    return `${baseClasses} bg-primary-600 hover:bg-primary-700 cursor-pointer`;
  }
  return `${baseClasses} bg-gray-400 cursor-not-allowed opacity-50`;
}

/**
 * Format blocking reasons for display
 */
export function formatBlockingReasons(reasons: string[]): string {
  if (reasons.length === 0) return '';
  if (reasons.length === 1) return reasons[0];
  return reasons.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

// ============= Components =============

interface ValidationBlockerBannerProps {
  validationState: ValidationState;
  className?: string;
}

/**
 * Banner showing validation blocking reasons
 */
export function ValidationBlockerBanner({
  validationState,
  className = '',
}: ValidationBlockerBannerProps) {
  if (validationState.canSubmit) return null;

  return (
    <div
      className={`bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="font-bold">Cannot Submit Invoice</p>
          <ul className="mt-1 list-disc list-inside text-sm">
            {validationState.blockingReasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  validationState: ValidationState;
  onClick?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

/**
 * Submit button with validation-aware styling
 */
export function SubmitButton({
  validationState,
  onClick,
  isSubmitting = false,
  className = '',
}: SubmitButtonProps) {
  const disabled = shouldDisableSubmit(validationState) || isSubmitting;
  const tooltip = getSubmitButtonTooltip(validationState);
  const buttonClasses = getSubmitButtonClasses(validationState.canSubmit);

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${buttonClasses} ${className}`}
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
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
          Submitting...
        </span>
      ) : (
        'Submit Invoice'
      )}
    </button>
  );
}

interface ValidationSummaryProps {
  validationState: ValidationState;
  showWhenValid?: boolean;
  className?: string;
}

/**
 * Detailed validation summary component
 */
export function ValidationSummary({
  validationState,
  showWhenValid = false,
  className = '',
}: ValidationSummaryProps) {
  if (validationState.canSubmit && !showWhenValid) return null;

  if (validationState.canSubmit) {
    return (
      <div
        className={`bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded ${className}`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">All validations passed - ready to submit</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-amber-50 border border-amber-300 rounded ${className}`}
    >
      <div className="px-4 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2 text-amber-800">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-bold">Validation Issues</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3 text-sm">
        {validationState.missingRequired.length > 0 && (
          <div>
            <p className="font-medium text-amber-900">Missing Required Fields:</p>
            <ul className="mt-1 list-disc list-inside text-amber-700">
              {validationState.missingRequired.map((field) => (
                <li key={field}>{FIELD_LABELS[field] || field}</li>
              ))}
            </ul>
          </div>
        )}
        {Object.keys(validationState.fieldErrors).length > 0 && (
          <div>
            <p className="font-medium text-amber-900">Field Errors:</p>
            <ul className="mt-1 list-disc list-inside text-amber-700">
              {Object.entries(validationState.fieldErrors).map(
                ([field, error]) => (
                  <li key={field}>
                    {FIELD_LABELS[field] || field}: {error}
                  </li>
                )
              )}
            </ul>
          </div>
        )}
        {validationState.mathErrors.length > 0 && (
          <div>
            <p className="font-medium text-red-700">Math Errors:</p>
            <ul className="mt-1 list-disc list-inside text-red-600">
              {validationState.mathErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface MiniValidationIndicatorProps {
  validationState: ValidationState;
  className?: string;
}

/**
 * Small indicator showing validation status
 */
export function MiniValidationIndicator({
  validationState,
  className = '',
}: MiniValidationIndicatorProps) {
  const issueCount =
    validationState.missingRequired.length +
    Object.keys(validationState.fieldErrors).length +
    validationState.mathErrors.length;

  if (validationState.canSubmit) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-green-600 ${className}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Ready
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-amber-600 ${className}`}
      title={validationState.blockingReasons.join('\n')}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {issueCount} issue{issueCount !== 1 ? 's' : ''}
    </span>
  );
}

// ============= Hooks =============

/**
 * Hook for form validation state management
 */
export function useValidationBlocking(values: FormValues): {
  validationState: ValidationState;
  canSubmit: boolean;
  isBlocked: boolean;
  blockingReasons: string[];
} {
  const validationState = useMemo(
    () => calculateValidationState(values),
    [values]
  );

  return {
    validationState,
    canSubmit: validationState.canSubmit,
    isBlocked: !validationState.canSubmit,
    blockingReasons: validationState.blockingReasons,
  };
}

/**
 * Hook that combines form state into FormValues format
 */
export function useFormValuesFromState(
  formState: Record<string, FormFieldState>
): FormValues {
  return useMemo(
    () => ({
      rfcEmisor: formState.rfcEmisor?.value || '',
      rfcReceptor: formState.rfcReceptor?.value || '',
      fecha: formState.fecha?.value || '',
      subtotal: formState.subtotal?.value || '',
      iva: formState.iva?.value || '',
      total: formState.total?.value || '',
    }),
    [formState]
  );
}

// ============= Default Export =============

export default {
  // Constants
  REQUIRED_FIELDS,
  FIELD_LABELS,
  // Utility functions
  isFieldEmpty,
  getMissingRequiredFields,
  validateRFC,
  validateDate,
  validateAmount,
  getFieldErrors,
  getMathErrors,
  calculateValidationState,
  shouldDisableSubmit,
  getSubmitButtonTooltip,
  getSubmitButtonClasses,
  formatBlockingReasons,
  // Components
  ValidationBlockerBanner,
  SubmitButton,
  ValidationSummary,
  MiniValidationIndicator,
  // Hooks
  useValidationBlocking,
  useFormValuesFromState,
};
