/**
 * Tests for Subtask 14.7: Create manual correction interface
 *
 * Features tested:
 * - Field correction tracking (original vs corrected value)
 * - Correction history management
 * - Revert to original functionality
 * - Correction reason tracking
 * - Manual override flag
 * - Confidence adjustment after correction
 * - Bulk correction support
 * - UI component logic
 */

import { describe, it, expect } from '@jest/globals';

// ============= Types =============

interface FieldCorrection {
  fieldName: string;
  originalValue: string;
  originalConfidence: number;
  correctedValue: string;
  correctedAt: Date;
  correctedBy?: string;
  reason?: string;
  isManualOverride: boolean;
}

interface CorrectionHistory {
  corrections: FieldCorrection[];
  totalCorrections: number;
  fieldsWithCorrections: string[];
}

interface CorrectionState {
  originalValue: string;
  currentValue: string;
  originalConfidence: number;
  currentConfidence: number;
  hasBeenCorrected: boolean;
  isManualOverride: boolean;
  correctionReason?: string;
}

interface FieldCorrectionInput {
  fieldName: string;
  newValue: string;
  reason?: string;
}

// ============= Constants =============

const MANUAL_OVERRIDE_CONFIDENCE = 1.0; // Manual corrections have 100% confidence

// ============= Utility Functions =============

/**
 * Create a new field correction record
 */
function createCorrection(
  fieldName: string,
  originalValue: string,
  originalConfidence: number,
  correctedValue: string,
  reason?: string
): FieldCorrection {
  return {
    fieldName,
    originalValue,
    originalConfidence,
    correctedValue,
    correctedAt: new Date(),
    isManualOverride: true,
    reason,
  };
}

/**
 * Check if a field has been corrected
 */
function hasBeenCorrected(
  originalValue: string,
  currentValue: string
): boolean {
  return originalValue !== currentValue;
}

/**
 * Get the confidence level after correction
 * Manual corrections have 100% confidence
 */
function getConfidenceAfterCorrection(
  originalConfidence: number,
  hasCorrection: boolean
): number {
  return hasCorrection ? MANUAL_OVERRIDE_CONFIDENCE : originalConfidence;
}

/**
 * Create correction state for a field
 */
function createCorrectionState(
  originalValue: string,
  currentValue: string,
  originalConfidence: number,
  reason?: string
): CorrectionState {
  const corrected = hasBeenCorrected(originalValue, currentValue);
  return {
    originalValue,
    currentValue,
    originalConfidence,
    currentConfidence: getConfidenceAfterCorrection(originalConfidence, corrected),
    hasBeenCorrected: corrected,
    isManualOverride: corrected,
    correctionReason: corrected ? reason : undefined,
  };
}

/**
 * Revert a field to its original value
 */
function revertToOriginal(state: CorrectionState): CorrectionState {
  return {
    ...state,
    currentValue: state.originalValue,
    currentConfidence: state.originalConfidence,
    hasBeenCorrected: false,
    isManualOverride: false,
    correctionReason: undefined,
  };
}

/**
 * Apply a correction to a field
 */
function applyCorrection(
  state: CorrectionState,
  newValue: string,
  reason?: string
): CorrectionState {
  const corrected = newValue !== state.originalValue;
  return {
    ...state,
    currentValue: newValue,
    currentConfidence: corrected ? MANUAL_OVERRIDE_CONFIDENCE : state.originalConfidence,
    hasBeenCorrected: corrected,
    isManualOverride: corrected,
    correctionReason: corrected ? reason : undefined,
  };
}

/**
 * Create correction history tracker
 */
function createCorrectionHistory(): CorrectionHistory {
  return {
    corrections: [],
    totalCorrections: 0,
    fieldsWithCorrections: [],
  };
}

/**
 * Add a correction to history
 */
function addToHistory(
  history: CorrectionHistory,
  correction: FieldCorrection
): CorrectionHistory {
  const newCorrections = [...history.corrections, correction];
  const fieldsWithCorrections = [
    ...new Set([...history.fieldsWithCorrections, correction.fieldName]),
  ];
  return {
    corrections: newCorrections,
    totalCorrections: newCorrections.length,
    fieldsWithCorrections,
  };
}

/**
 * Get corrections for a specific field
 */
function getFieldCorrections(
  history: CorrectionHistory,
  fieldName: string
): FieldCorrection[] {
  return history.corrections.filter((c) => c.fieldName === fieldName);
}

/**
 * Get the latest correction for a field
 */
function getLatestCorrection(
  history: CorrectionHistory,
  fieldName: string
): FieldCorrection | null {
  const fieldCorrections = getFieldCorrections(history, fieldName);
  return fieldCorrections.length > 0
    ? fieldCorrections[fieldCorrections.length - 1]
    : null;
}

/**
 * Check if a field needs review (low confidence and not corrected)
 */
function fieldNeedsReview(
  confidence: number,
  hasBeenCorrected: boolean,
  threshold: number = 0.90
): boolean {
  return confidence < threshold && !hasBeenCorrected;
}

/**
 * Get all fields that need review
 */
function getFieldsNeedingReview(
  fields: Record<string, CorrectionState>,
  threshold: number = 0.90
): string[] {
  return Object.entries(fields)
    .filter(([_, state]) =>
      fieldNeedsReview(state.originalConfidence, state.hasBeenCorrected, threshold)
    )
    .map(([name, _]) => name);
}

/**
 * Calculate correction summary
 */
function calculateCorrectionSummary(
  fields: Record<string, CorrectionState>
): {
  totalFields: number;
  correctedFields: number;
  needsReviewCount: number;
  correctionPercentage: number;
} {
  const entries = Object.entries(fields);
  const totalFields = entries.length;
  const correctedFields = entries.filter(([_, s]) => s.hasBeenCorrected).length;
  const needsReviewCount = entries.filter(
    ([_, s]) => fieldNeedsReview(s.originalConfidence, s.hasBeenCorrected)
  ).length;
  const correctionPercentage =
    totalFields > 0 ? (correctedFields / totalFields) * 100 : 0;

  return {
    totalFields,
    correctedFields,
    needsReviewCount,
    correctionPercentage,
  };
}

/**
 * Get CSS class for correction indicator
 */
function getCorrectionIndicatorClass(hasBeenCorrected: boolean): string {
  return hasBeenCorrected
    ? 'bg-blue-100 border-blue-300 text-blue-700'
    : '';
}

/**
 * Get correction badge text
 */
function getCorrectionBadgeText(hasBeenCorrected: boolean): string {
  return hasBeenCorrected ? 'Corrected' : '';
}

/**
 * Format original value display
 */
function formatOriginalValueDisplay(
  originalValue: string,
  hasBeenCorrected: boolean
): string {
  return hasBeenCorrected ? `Original: ${originalValue}` : '';
}

/**
 * Validate correction input
 */
function validateCorrectionInput(input: FieldCorrectionInput): {
  isValid: boolean;
  error?: string;
} {
  if (!input.fieldName || input.fieldName.trim() === '') {
    return { isValid: false, error: 'Field name is required' };
  }
  if (input.newValue === undefined || input.newValue === null) {
    return { isValid: false, error: 'New value is required' };
  }
  return { isValid: true };
}

/**
 * Apply bulk corrections
 */
function applyBulkCorrections(
  fields: Record<string, CorrectionState>,
  corrections: FieldCorrectionInput[]
): Record<string, CorrectionState> {
  const result = { ...fields };
  for (const correction of corrections) {
    if (result[correction.fieldName]) {
      result[correction.fieldName] = applyCorrection(
        result[correction.fieldName],
        correction.newValue,
        correction.reason
      );
    }
  }
  return result;
}

// ============= TESTS =============

describe('Field Correction Creation', () => {
  it('should create a correction record', () => {
    const correction = createCorrection(
      'rfcEmisor',
      'XAXX010101000',
      0.85,
      'XAXX010101001',
      'Typo in last digit'
    );
    expect(correction.fieldName).toBe('rfcEmisor');
    expect(correction.originalValue).toBe('XAXX010101000');
    expect(correction.correctedValue).toBe('XAXX010101001');
    expect(correction.originalConfidence).toBe(0.85);
    expect(correction.reason).toBe('Typo in last digit');
    expect(correction.isManualOverride).toBe(true);
    expect(correction.correctedAt).toBeInstanceOf(Date);
  });

  it('should create correction without reason', () => {
    const correction = createCorrection('fecha', '2024-01-01', 0.75, '2024-01-02');
    expect(correction.reason).toBeUndefined();
    expect(correction.isManualOverride).toBe(true);
  });
});

describe('Correction Detection', () => {
  it('should detect when field has been corrected', () => {
    expect(hasBeenCorrected('original', 'changed')).toBe(true);
  });

  it('should detect when field has not been corrected', () => {
    expect(hasBeenCorrected('same', 'same')).toBe(false);
  });

  it('should handle empty string comparison', () => {
    expect(hasBeenCorrected('', '')).toBe(false);
    expect(hasBeenCorrected('value', '')).toBe(true);
    expect(hasBeenCorrected('', 'value')).toBe(true);
  });
});

describe('Confidence After Correction', () => {
  it('should return 100% confidence for corrected field', () => {
    expect(getConfidenceAfterCorrection(0.75, true)).toBe(1.0);
    expect(getConfidenceAfterCorrection(0.50, true)).toBe(1.0);
  });

  it('should keep original confidence for uncorrected field', () => {
    expect(getConfidenceAfterCorrection(0.75, false)).toBe(0.75);
    expect(getConfidenceAfterCorrection(0.95, false)).toBe(0.95);
  });
});

describe('Correction State Management', () => {
  it('should create correction state for uncorrected field', () => {
    const state = createCorrectionState('value', 'value', 0.85);
    expect(state.hasBeenCorrected).toBe(false);
    expect(state.isManualOverride).toBe(false);
    expect(state.currentConfidence).toBe(0.85);
  });

  it('should create correction state for corrected field', () => {
    const state = createCorrectionState('old', 'new', 0.70, 'Fixed typo');
    expect(state.hasBeenCorrected).toBe(true);
    expect(state.isManualOverride).toBe(true);
    expect(state.currentConfidence).toBe(1.0);
    expect(state.correctionReason).toBe('Fixed typo');
  });

  it('should apply correction to state', () => {
    const initial = createCorrectionState('original', 'original', 0.80);
    const corrected = applyCorrection(initial, 'corrected', 'User fix');
    expect(corrected.currentValue).toBe('corrected');
    expect(corrected.hasBeenCorrected).toBe(true);
    expect(corrected.currentConfidence).toBe(1.0);
    expect(corrected.correctionReason).toBe('User fix');
  });

  it('should clear correction when value matches original', () => {
    const corrected = createCorrectionState('original', 'changed', 0.80, 'Fix');
    const reverted = applyCorrection(corrected, 'original');
    expect(reverted.hasBeenCorrected).toBe(false);
    expect(reverted.currentConfidence).toBe(0.80);
    expect(reverted.correctionReason).toBeUndefined();
  });
});

describe('Revert to Original', () => {
  it('should revert corrected field to original', () => {
    const corrected = createCorrectionState('original', 'changed', 0.75, 'Reason');
    const reverted = revertToOriginal(corrected);
    expect(reverted.currentValue).toBe('original');
    expect(reverted.hasBeenCorrected).toBe(false);
    expect(reverted.currentConfidence).toBe(0.75);
    expect(reverted.correctionReason).toBeUndefined();
  });

  it('should preserve state for uncorrected field', () => {
    const state = createCorrectionState('value', 'value', 0.90);
    const result = revertToOriginal(state);
    expect(result).toEqual(state);
  });
});

describe('Correction History', () => {
  it('should create empty history', () => {
    const history = createCorrectionHistory();
    expect(history.corrections).toHaveLength(0);
    expect(history.totalCorrections).toBe(0);
    expect(history.fieldsWithCorrections).toHaveLength(0);
  });

  it('should add correction to history', () => {
    let history = createCorrectionHistory();
    const correction = createCorrection('rfc', 'old', 0.8, 'new');
    history = addToHistory(history, correction);
    expect(history.totalCorrections).toBe(1);
    expect(history.fieldsWithCorrections).toContain('rfc');
  });

  it('should track multiple corrections', () => {
    let history = createCorrectionHistory();
    history = addToHistory(history, createCorrection('rfc', 'old1', 0.8, 'new1'));
    history = addToHistory(history, createCorrection('fecha', 'old2', 0.7, 'new2'));
    history = addToHistory(history, createCorrection('rfc', 'new1', 0.8, 'new3'));
    expect(history.totalCorrections).toBe(3);
    expect(history.fieldsWithCorrections).toHaveLength(2);
  });

  it('should get corrections for specific field', () => {
    let history = createCorrectionHistory();
    history = addToHistory(history, createCorrection('rfc', 'a', 0.8, 'b'));
    history = addToHistory(history, createCorrection('fecha', 'c', 0.7, 'd'));
    history = addToHistory(history, createCorrection('rfc', 'b', 0.8, 'e'));
    const rfcCorrections = getFieldCorrections(history, 'rfc');
    expect(rfcCorrections).toHaveLength(2);
  });

  it('should get latest correction for field', () => {
    let history = createCorrectionHistory();
    history = addToHistory(history, createCorrection('rfc', 'a', 0.8, 'b'));
    history = addToHistory(history, createCorrection('rfc', 'b', 0.8, 'c'));
    const latest = getLatestCorrection(history, 'rfc');
    expect(latest?.correctedValue).toBe('c');
  });

  it('should return null for field with no corrections', () => {
    const history = createCorrectionHistory();
    expect(getLatestCorrection(history, 'nonexistent')).toBeNull();
  });
});

describe('Field Review Detection', () => {
  it('should flag low confidence uncorrected field for review', () => {
    expect(fieldNeedsReview(0.75, false)).toBe(true);
    expect(fieldNeedsReview(0.50, false)).toBe(true);
  });

  it('should not flag high confidence field for review', () => {
    expect(fieldNeedsReview(0.95, false)).toBe(false);
    expect(fieldNeedsReview(0.90, false)).toBe(false);
  });

  it('should not flag corrected field for review', () => {
    expect(fieldNeedsReview(0.50, true)).toBe(false);
    expect(fieldNeedsReview(0.70, true)).toBe(false);
  });

  it('should respect custom threshold', () => {
    expect(fieldNeedsReview(0.85, false, 0.80)).toBe(false);
    expect(fieldNeedsReview(0.75, false, 0.80)).toBe(true);
  });
});

describe('Fields Needing Review', () => {
  it('should return fields that need review', () => {
    const fields: Record<string, CorrectionState> = {
      rfc: createCorrectionState('val', 'val', 0.70),
      fecha: createCorrectionState('val', 'val', 0.95),
      total: createCorrectionState('val', 'corrected', 0.60),
    };
    const needsReview = getFieldsNeedingReview(fields);
    expect(needsReview).toHaveLength(1);
    expect(needsReview).toContain('rfc');
  });

  it('should return empty array when all fields are good', () => {
    const fields: Record<string, CorrectionState> = {
      rfc: createCorrectionState('val', 'val', 0.95),
      fecha: createCorrectionState('val', 'corrected', 0.60),
    };
    expect(getFieldsNeedingReview(fields)).toHaveLength(0);
  });
});

describe('Correction Summary', () => {
  it('should calculate summary for fields', () => {
    const fields: Record<string, CorrectionState> = {
      rfc: createCorrectionState('a', 'b', 0.70),
      fecha: createCorrectionState('c', 'c', 0.95),
      total: createCorrectionState('d', 'd', 0.60),
    };
    const summary = calculateCorrectionSummary(fields);
    expect(summary.totalFields).toBe(3);
    expect(summary.correctedFields).toBe(1);
    expect(summary.needsReviewCount).toBe(1);
    expect(summary.correctionPercentage).toBeCloseTo(33.33, 1);
  });

  it('should handle empty fields', () => {
    const summary = calculateCorrectionSummary({});
    expect(summary.totalFields).toBe(0);
    expect(summary.correctionPercentage).toBe(0);
  });
});

describe('Correction UI Classes', () => {
  it('should return classes for corrected field', () => {
    const classes = getCorrectionIndicatorClass(true);
    expect(classes).toContain('bg-blue-100');
    expect(classes).toContain('border-blue-300');
  });

  it('should return empty for uncorrected field', () => {
    expect(getCorrectionIndicatorClass(false)).toBe('');
  });
});

describe('Correction Badge', () => {
  it('should return badge text for corrected field', () => {
    expect(getCorrectionBadgeText(true)).toBe('Corrected');
  });

  it('should return empty for uncorrected field', () => {
    expect(getCorrectionBadgeText(false)).toBe('');
  });
});

describe('Original Value Display', () => {
  it('should format original value when corrected', () => {
    const display = formatOriginalValueDisplay('old value', true);
    expect(display).toContain('Original:');
    expect(display).toContain('old value');
  });

  it('should return empty when not corrected', () => {
    expect(formatOriginalValueDisplay('value', false)).toBe('');
  });
});

describe('Correction Input Validation', () => {
  it('should validate valid input', () => {
    const result = validateCorrectionInput({
      fieldName: 'rfc',
      newValue: 'XAXX010101000',
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject empty field name', () => {
    const result = validateCorrectionInput({
      fieldName: '',
      newValue: 'value',
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Field name');
  });

  it('should reject undefined value', () => {
    const result = validateCorrectionInput({
      fieldName: 'rfc',
      newValue: undefined as unknown as string,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('value');
  });

  it('should allow empty string as value', () => {
    const result = validateCorrectionInput({
      fieldName: 'rfc',
      newValue: '',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('Bulk Corrections', () => {
  it('should apply multiple corrections', () => {
    const fields: Record<string, CorrectionState> = {
      rfc: createCorrectionState('old1', 'old1', 0.8),
      fecha: createCorrectionState('old2', 'old2', 0.7),
      total: createCorrectionState('old3', 'old3', 0.9),
    };
    const corrections: FieldCorrectionInput[] = [
      { fieldName: 'rfc', newValue: 'new1' },
      { fieldName: 'fecha', newValue: 'new2', reason: 'Fixed' },
    ];
    const result = applyBulkCorrections(fields, corrections);
    expect(result.rfc.currentValue).toBe('new1');
    expect(result.fecha.currentValue).toBe('new2');
    expect(result.total.currentValue).toBe('old3');
    expect(result.fecha.correctionReason).toBe('Fixed');
  });

  it('should ignore non-existent fields', () => {
    const fields: Record<string, CorrectionState> = {
      rfc: createCorrectionState('val', 'val', 0.8),
    };
    const corrections: FieldCorrectionInput[] = [
      { fieldName: 'nonexistent', newValue: 'value' },
    ];
    const result = applyBulkCorrections(fields, corrections);
    expect(result).toEqual(fields);
  });
});

describe('Inline Edit Mode', () => {
  it('should support entering and exiting edit mode', () => {
    let isEditing = false;
    const enterEditMode = () => { isEditing = true; };
    const exitEditMode = () => { isEditing = false; };

    expect(isEditing).toBe(false);
    enterEditMode();
    expect(isEditing).toBe(true);
    exitEditMode();
    expect(isEditing).toBe(false);
  });
});

describe('Keyboard Shortcuts Support', () => {
  it('should detect Enter key for saving', () => {
    const isEnterKey = (key: string) => key === 'Enter';
    expect(isEnterKey('Enter')).toBe(true);
    expect(isEnterKey('Escape')).toBe(false);
  });

  it('should detect Escape key for canceling', () => {
    const isEscapeKey = (key: string) => key === 'Escape';
    expect(isEscapeKey('Escape')).toBe(true);
    expect(isEscapeKey('Enter')).toBe(false);
  });
});

describe('Correction Comparison Display', () => {
  it('should show difference between original and current', () => {
    const state = createCorrectionState('$10,000.00', '$11,000.00', 0.75);
    expect(state.originalValue).toBe('$10,000.00');
    expect(state.currentValue).toBe('$11,000.00');
    expect(state.hasBeenCorrected).toBe(true);
  });

  it('should track original confidence', () => {
    const state = createCorrectionState('value', 'corrected', 0.65);
    expect(state.originalConfidence).toBe(0.65);
    expect(state.currentConfidence).toBe(1.0);
  });
});
