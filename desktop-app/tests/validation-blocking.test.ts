/**
 * Tests for Subtask 14.6: Validation blocking (disable Submit)
 *
 * Features tested:
 * - Submit button disabled when form has errors
 * - Submit button disabled when math errors exist
 * - Submit button disabled when required fields empty
 * - Submit button enabled when all validations pass
 * - Validation summary showing blocking reasons
 * - Real-time validation state updates
 */

import { describe, it, expect } from '@jest/globals';

// ============= Types =============

interface FormFieldState {
  value: string;
  error?: string;
  touched: boolean;
  required: boolean;
}

interface ValidationState {
  isValid: boolean;
  canSubmit: boolean;
  blockingReasons: string[];
  fieldErrors: Record<string, string>;
  mathErrors: string[];
  missingRequired: string[];
}

interface FormValues {
  rfcEmisor: string;
  rfcReceptor: string;
  fecha: string;
  subtotal: string;
  iva: string;
  total: string;
}

// ============= Constants =============

const REQUIRED_FIELDS = ['rfcEmisor', 'rfcReceptor', 'fecha', 'subtotal', 'iva', 'total'];

const FIELD_LABELS: Record<string, string> = {
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
function isFieldEmpty(value: string): boolean {
  return value.trim() === '';
}

/**
 * Get list of missing required fields
 */
function getMissingRequiredFields(
  values: FormValues,
  requiredFields: string[] = REQUIRED_FIELDS
): string[] {
  return requiredFields.filter((field) => isFieldEmpty(values[field as keyof FormValues]));
}

/**
 * Validate RFC format
 */
function validateRFC(rfc: string): string | null {
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
function validateDate(dateStr: string): string | null {
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
function validateAmount(amount: string): string | null {
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
function getFieldErrors(values: FormValues): Record<string, string> {
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
function getMathErrors(values: FormValues): string[] {
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
    errors.push(`Total should equal subtotal + IVA ($${expectedTotal.toFixed(2)})`);
  }

  return errors;
}

/**
 * Calculate complete validation state
 */
function calculateValidationState(values: FormValues): ValidationState {
  const missingRequired = getMissingRequiredFields(values);
  const fieldErrors = getFieldErrors(values);
  const mathErrors = getMathErrors(values);

  const blockingReasons: string[] = [];

  if (missingRequired.length > 0) {
    const fieldNames = missingRequired.map((f) => FIELD_LABELS[f] || f).join(', ');
    blockingReasons.push(`Missing required fields: ${fieldNames}`);
  }

  if (Object.keys(fieldErrors).length > 0) {
    blockingReasons.push(`${Object.keys(fieldErrors).length} field(s) have validation errors`);
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
function shouldDisableSubmit(validationState: ValidationState): boolean {
  return !validationState.canSubmit;
}

/**
 * Get submit button tooltip/title
 */
function getSubmitButtonTooltip(validationState: ValidationState): string {
  if (validationState.canSubmit) {
    return 'Submit invoice for processing';
  }
  return validationState.blockingReasons.join('\n');
}

/**
 * Get submit button CSS classes
 */
function getSubmitButtonClasses(canSubmit: boolean): string {
  const baseClasses = 'px-4 py-2 text-sm text-white rounded-md transition-colors';
  if (canSubmit) {
    return `${baseClasses} bg-primary-600 hover:bg-primary-700 cursor-pointer`;
  }
  return `${baseClasses} bg-gray-400 cursor-not-allowed opacity-50`;
}

/**
 * Format blocking reasons for display
 */
function formatBlockingReasons(reasons: string[]): string {
  if (reasons.length === 0) return '';
  if (reasons.length === 1) return reasons[0];
  return reasons.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

// ============= TESTS =============

describe('Required Field Validation', () => {
  it('should detect empty required fields', () => {
    const values: FormValues = {
      rfcEmisor: '',
      rfcReceptor: '',
      fecha: '',
      subtotal: '',
      iva: '',
      total: '',
    };
    const missing = getMissingRequiredFields(values);
    expect(missing).toHaveLength(6);
    expect(missing).toContain('rfcEmisor');
    expect(missing).toContain('total');
  });

  it('should detect partially filled form', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '',
      subtotal: '10000',
      iva: '',
      total: '',
    };
    const missing = getMissingRequiredFields(values);
    expect(missing).toHaveLength(3);
    expect(missing).toContain('fecha');
    expect(missing).toContain('iva');
    expect(missing).toContain('total');
  });

  it('should return empty array when all fields filled', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const missing = getMissingRequiredFields(values);
    expect(missing).toHaveLength(0);
  });

  it('should treat whitespace-only as empty', () => {
    const values: FormValues = {
      rfcEmisor: '   ',
      rfcReceptor: '\t',
      fecha: '\n',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const missing = getMissingRequiredFields(values);
    expect(missing).toHaveLength(3);
  });
});

describe('Field Error Validation', () => {
  it('should detect invalid RFC format', () => {
    const values: FormValues = {
      rfcEmisor: 'INVALID',
      rfcReceptor: '12345',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const errors = getFieldErrors(values);
    expect(errors.rfcEmisor).toBe('Invalid RFC format');
    expect(errors.rfcReceptor).toBe('Invalid RFC format');
    expect(errors.fecha).toBeUndefined();
  });

  it('should detect invalid date', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: 'not-a-date',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const errors = getFieldErrors(values);
    expect(errors.fecha).toBe('Invalid date');
  });

  it('should detect invalid amounts', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: 'abc',
      iva: '-100',
      total: '11600',
    };
    const errors = getFieldErrors(values);
    expect(errors.subtotal).toBe('Invalid amount');
    expect(errors.iva).toBe('Invalid amount');
    expect(errors.total).toBeUndefined();
  });

  it('should return no errors for valid form', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const errors = getFieldErrors(values);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('Math Error Detection', () => {
  it('should detect incorrect IVA', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1500', // Should be 1600
      total: '11500',
    };
    const errors = getMathErrors(values);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('16%'))).toBe(true);
  });

  it('should detect incorrect total', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '12000', // Should be 11600
    };
    const errors = getMathErrors(values);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Total'))).toBe(true);
  });

  it('should return no math errors for correct calculations', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const errors = getMathErrors(values);
    expect(errors).toHaveLength(0);
  });

  it('should skip math validation when all amounts empty', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '',
      iva: '',
      total: '',
    };
    const errors = getMathErrors(values);
    expect(errors).toHaveLength(0);
  });
});

describe('Complete Validation State', () => {
  it('should block submit for empty form', () => {
    const values: FormValues = {
      rfcEmisor: '',
      rfcReceptor: '',
      fecha: '',
      subtotal: '',
      iva: '',
      total: '',
    };
    const state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);
    expect(state.missingRequired).toHaveLength(6);
    expect(state.blockingReasons.length).toBeGreaterThan(0);
  });

  it('should block submit for invalid fields', () => {
    const values: FormValues = {
      rfcEmisor: 'INVALID',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);
    expect(Object.keys(state.fieldErrors)).toHaveLength(1);
  });

  it('should block submit for math errors', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1500', // Wrong
      total: '11500',
    };
    const state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);
    expect(state.mathErrors.length).toBeGreaterThan(0);
  });

  it('should allow submit for valid form', () => {
    const values: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const state = calculateValidationState(values);
    expect(state.canSubmit).toBe(true);
    expect(state.blockingReasons).toHaveLength(0);
  });

  it('should accumulate multiple blocking reasons', () => {
    const values: FormValues = {
      rfcEmisor: 'INVALID',
      rfcReceptor: '',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1500',
      total: '11500',
    };
    const state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);
    expect(state.blockingReasons.length).toBe(3); // Missing, Field errors, Math errors
  });
});

describe('Submit Button State', () => {
  it('should disable submit when validation fails', () => {
    const invalidState: ValidationState = {
      isValid: false,
      canSubmit: false,
      blockingReasons: ['Missing required fields'],
      fieldErrors: {},
      mathErrors: [],
      missingRequired: ['rfcEmisor'],
    };
    expect(shouldDisableSubmit(invalidState)).toBe(true);
  });

  it('should enable submit when validation passes', () => {
    const validState: ValidationState = {
      isValid: true,
      canSubmit: true,
      blockingReasons: [],
      fieldErrors: {},
      mathErrors: [],
      missingRequired: [],
    };
    expect(shouldDisableSubmit(validState)).toBe(false);
  });
});

describe('Submit Button Tooltip', () => {
  it('should show positive message when can submit', () => {
    const validState: ValidationState = {
      isValid: true,
      canSubmit: true,
      blockingReasons: [],
      fieldErrors: {},
      mathErrors: [],
      missingRequired: [],
    };
    const tooltip = getSubmitButtonTooltip(validState);
    expect(tooltip).toContain('Submit');
  });

  it('should show blocking reasons when cannot submit', () => {
    const invalidState: ValidationState = {
      isValid: false,
      canSubmit: false,
      blockingReasons: ['Missing required fields: RFC Emisor', '1 math calculation error(s)'],
      fieldErrors: {},
      mathErrors: ['IVA error'],
      missingRequired: ['rfcEmisor'],
    };
    const tooltip = getSubmitButtonTooltip(invalidState);
    expect(tooltip).toContain('Missing required fields');
    expect(tooltip).toContain('math calculation');
  });
});

describe('Submit Button Styling', () => {
  it('should return enabled styles when can submit', () => {
    const classes = getSubmitButtonClasses(true);
    expect(classes).toContain('bg-primary-600');
    expect(classes).toContain('hover:bg-primary-700');
    expect(classes).toContain('cursor-pointer');
    expect(classes).not.toContain('cursor-not-allowed');
  });

  it('should return disabled styles when cannot submit', () => {
    const classes = getSubmitButtonClasses(false);
    expect(classes).toContain('bg-gray-400');
    expect(classes).toContain('cursor-not-allowed');
    expect(classes).toContain('opacity-50');
    expect(classes).not.toContain('bg-primary-600');
  });
});

describe('Blocking Reasons Formatting', () => {
  it('should return empty string for no reasons', () => {
    expect(formatBlockingReasons([])).toBe('');
  });

  it('should return single reason without numbering', () => {
    const reasons = ['Missing required fields'];
    expect(formatBlockingReasons(reasons)).toBe('Missing required fields');
  });

  it('should format multiple reasons with numbers', () => {
    const reasons = ['Missing required fields', 'Math errors'];
    const formatted = formatBlockingReasons(reasons);
    expect(formatted).toContain('1.');
    expect(formatted).toContain('2.');
  });
});

describe('Real-time Validation Updates', () => {
  it('should update validation state as fields are filled', () => {
    // Start with empty form
    let values: FormValues = {
      rfcEmisor: '',
      rfcReceptor: '',
      fecha: '',
      subtotal: '',
      iva: '',
      total: '',
    };
    let state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);

    // Fill in RFC fields
    values = { ...values, rfcEmisor: 'XAXX010101000', rfcReceptor: 'XBXX020202000' };
    state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);
    expect(state.missingRequired).not.toContain('rfcEmisor');

    // Fill in date
    values = { ...values, fecha: '2024-03-15' };
    state = calculateValidationState(values);
    expect(state.canSubmit).toBe(false);

    // Fill in amounts (correct math)
    values = { ...values, subtotal: '10000', iva: '1600', total: '11600' };
    state = calculateValidationState(values);
    expect(state.canSubmit).toBe(true);
  });

  it('should immediately block when error introduced', () => {
    const validValues: FormValues = {
      rfcEmisor: 'XAXX010101000',
      rfcReceptor: 'XBXX020202000',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    let state = calculateValidationState(validValues);
    expect(state.canSubmit).toBe(true);

    // Change IVA to incorrect value
    const invalidValues = { ...validValues, iva: '1500' };
    state = calculateValidationState(invalidValues);
    expect(state.canSubmit).toBe(false);
    expect(state.mathErrors.length).toBeGreaterThan(0);
  });
});

describe('Validation Summary Component Logic', () => {
  it('should categorize blocking reasons correctly', () => {
    const values: FormValues = {
      rfcEmisor: 'INVALID',
      rfcReceptor: '',
      fecha: '2024-03-15',
      subtotal: '10000',
      iva: '1500',
      total: '11600',
    };
    const state = calculateValidationState(values);

    expect(state.missingRequired).toContain('rfcReceptor');
    expect(state.fieldErrors.rfcEmisor).toBeDefined();
    expect(state.mathErrors.length).toBeGreaterThan(0);
  });

  it('should provide user-friendly field names in reasons', () => {
    const values: FormValues = {
      rfcEmisor: '',
      rfcReceptor: 'XBXX020202000',
      fecha: '',
      subtotal: '10000',
      iva: '1600',
      total: '11600',
    };
    const state = calculateValidationState(values);

    const missingReason = state.blockingReasons.find((r) => r.includes('Missing'));
    expect(missingReason).toContain('RFC Emisor');
    expect(missingReason).toContain('Fecha');
  });
});
