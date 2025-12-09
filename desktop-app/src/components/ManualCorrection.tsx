/**
 * Manual Correction Components and Utilities
 * Subtask 14.7: Create manual correction interface
 *
 * Provides:
 * - Field correction tracking (original vs corrected value)
 * - Correction history management
 * - Revert to original functionality
 * - Inline editing with keyboard support
 * - Correction reason tracking
 * - Visual indicators for corrected fields
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============= Types =============

export interface FieldCorrection {
  fieldName: string;
  originalValue: string;
  originalConfidence: number;
  correctedValue: string;
  correctedAt: Date;
  correctedBy?: string;
  reason?: string;
  isManualOverride: boolean;
}

export interface CorrectionHistory {
  corrections: FieldCorrection[];
  totalCorrections: number;
  fieldsWithCorrections: string[];
}

export interface CorrectionState {
  originalValue: string;
  currentValue: string;
  originalConfidence: number;
  currentConfidence: number;
  hasBeenCorrected: boolean;
  isManualOverride: boolean;
  correctionReason?: string;
}

export interface FieldCorrectionInput {
  fieldName: string;
  newValue: string;
  reason?: string;
}

// ============= Constants =============

export const MANUAL_OVERRIDE_CONFIDENCE = 1.0;

// ============= Utility Functions =============

/**
 * Create a new field correction record
 */
export function createCorrection(
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
export function hasBeenCorrected(
  originalValue: string,
  currentValue: string
): boolean {
  return originalValue !== currentValue;
}

/**
 * Get the confidence level after correction
 */
export function getConfidenceAfterCorrection(
  originalConfidence: number,
  hasCorrection: boolean
): number {
  return hasCorrection ? MANUAL_OVERRIDE_CONFIDENCE : originalConfidence;
}

/**
 * Create correction state for a field
 */
export function createCorrectionState(
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
export function revertToOriginal(state: CorrectionState): CorrectionState {
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
export function applyCorrection(
  state: CorrectionState,
  newValue: string,
  reason?: string
): CorrectionState {
  const corrected = newValue !== state.originalValue;
  return {
    ...state,
    currentValue: newValue,
    currentConfidence: corrected
      ? MANUAL_OVERRIDE_CONFIDENCE
      : state.originalConfidence,
    hasBeenCorrected: corrected,
    isManualOverride: corrected,
    correctionReason: corrected ? reason : undefined,
  };
}

/**
 * Create correction history tracker
 */
export function createCorrectionHistory(): CorrectionHistory {
  return {
    corrections: [],
    totalCorrections: 0,
    fieldsWithCorrections: [],
  };
}

/**
 * Add a correction to history
 */
export function addToHistory(
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
export function getFieldCorrections(
  history: CorrectionHistory,
  fieldName: string
): FieldCorrection[] {
  return history.corrections.filter((c) => c.fieldName === fieldName);
}

/**
 * Get the latest correction for a field
 */
export function getLatestCorrection(
  history: CorrectionHistory,
  fieldName: string
): FieldCorrection | null {
  const fieldCorrections = getFieldCorrections(history, fieldName);
  return fieldCorrections.length > 0
    ? fieldCorrections[fieldCorrections.length - 1]
    : null;
}

/**
 * Check if a field needs review
 */
export function fieldNeedsReview(
  confidence: number,
  hasCorrected: boolean,
  threshold: number = 0.90
): boolean {
  return confidence < threshold && !hasCorrected;
}

/**
 * Get all fields that need review
 */
export function getFieldsNeedingReview(
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
export function calculateCorrectionSummary(
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
  const needsReviewCount = entries.filter(([_, s]) =>
    fieldNeedsReview(s.originalConfidence, s.hasBeenCorrected)
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
export function getCorrectionIndicatorClass(hasCorrected: boolean): string {
  return hasCorrected ? 'bg-blue-100 border-blue-300 text-blue-700' : '';
}

/**
 * Get correction badge text
 */
export function getCorrectionBadgeText(hasCorrected: boolean): string {
  return hasCorrected ? 'Corrected' : '';
}

/**
 * Format original value display
 */
export function formatOriginalValueDisplay(
  originalValue: string,
  hasCorrected: boolean
): string {
  return hasCorrected ? `Original: ${originalValue}` : '';
}

/**
 * Validate correction input
 */
export function validateCorrectionInput(input: FieldCorrectionInput): {
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
export function applyBulkCorrections(
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

// ============= Components =============

interface CorrectionBadgeProps {
  hasBeenCorrected: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge indicating a field has been corrected
 */
export function CorrectionBadge({
  hasBeenCorrected,
  size = 'sm',
  className = '',
}: CorrectionBadgeProps) {
  if (!hasBeenCorrected) return null;

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-blue-100 text-blue-700 ${sizeClasses} ${className}`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
      Corrected
    </span>
  );
}

interface OriginalValueDisplayProps {
  originalValue: string;
  hasBeenCorrected: boolean;
  className?: string;
}

/**
 * Display showing original value when field is corrected
 */
export function OriginalValueDisplay({
  originalValue,
  hasBeenCorrected,
  className = '',
}: OriginalValueDisplayProps) {
  if (!hasBeenCorrected) return null;

  return (
    <div className={`text-xs text-gray-500 mt-1 ${className}`}>
      <span className="line-through">{originalValue}</span>
      <span className="ml-1 text-blue-600">(original)</span>
    </div>
  );
}

interface RevertButtonProps {
  onRevert: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Button to revert field to original value
 */
export function RevertButton({
  onRevert,
  disabled = false,
  className = '',
}: RevertButtonProps) {
  return (
    <button
      type="button"
      onClick={onRevert}
      disabled={disabled}
      title="Revert to original value"
      className={`p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
    </button>
  );
}

interface InlineEditFieldProps {
  value: string;
  originalValue: string;
  originalConfidence: number;
  onSave: (newValue: string, reason?: string) => void;
  onRevert: () => void;
  label: string;
  type?: 'text' | 'number' | 'date';
  readOnly?: boolean;
  className?: string;
}

/**
 * Inline editable field with correction tracking
 */
export function InlineEditField({
  value,
  originalValue,
  originalConfidence,
  onSave,
  onRevert,
  label,
  type = 'text',
  readOnly = false,
  className = '',
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCorrection = hasBeenCorrected(originalValue, value);
  const currentConfidence = getConfidenceAfterCorrection(
    originalConfidence,
    hasCorrection
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (readOnly) return;
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue !== value) {
      if (showReasonInput && reason) {
        onSave(editValue, reason);
      } else {
        onSave(editValue);
      }
    }
    setIsEditing(false);
    setShowReasonInput(false);
    setReason('');
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowReasonInput(false);
    setReason('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showReasonInput) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleRevert = () => {
    onRevert();
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
            step={type === 'number' ? '0.01' : undefined}
          />
          <button
            type="button"
            onClick={handleSave}
            className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            title="Save (Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            title="Cancel (Escape)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!showReasonInput && editValue !== value && (
          <button
            type="button"
            onClick={() => setShowReasonInput(true)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            + Add correction reason
          </button>
        )}
        {showReasonInput && (
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for correction..."
            className="mt-2 w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
        )}
        <OriginalValueDisplay
          originalValue={originalValue}
          hasBeenCorrected={editValue !== originalValue}
        />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <CorrectionBadge hasBeenCorrected={hasCorrection} className="ml-2" />
      </label>
      <div
        className={`relative flex items-center gap-2 px-3 py-2 border-2 rounded-md transition-colors ${
          hasCorrection
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 bg-white'
        } ${readOnly ? '' : 'cursor-pointer hover:border-blue-400'}`}
        onClick={handleStartEdit}
      >
        <span className="flex-1">{value || <span className="text-gray-400">Empty</span>}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            currentConfidence >= 0.90
              ? 'bg-green-100 text-green-700'
              : currentConfidence >= 0.70
              ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {Math.round(currentConfidence * 100)}%
        </span>
        {hasCorrection && !readOnly && (
          <RevertButton
            onRevert={handleRevert}
            className="absolute right-10 top-1/2 -translate-y-1/2"
          />
        )}
      </div>
      <OriginalValueDisplay
        originalValue={originalValue}
        hasBeenCorrected={hasCorrection}
      />
    </div>
  );
}

interface CorrectionSummaryPanelProps {
  fields: Record<string, CorrectionState>;
  className?: string;
}

/**
 * Summary panel showing correction statistics
 */
export function CorrectionSummaryPanel({
  fields,
  className = '',
}: CorrectionSummaryPanelProps) {
  const summary = useMemo(() => calculateCorrectionSummary(fields), [fields]);
  const needsReview = useMemo(() => getFieldsNeedingReview(fields), [fields]);

  if (summary.totalFields === 0) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Correction Summary</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Total Fields:</span>
          <span className="ml-2 font-medium">{summary.totalFields}</span>
        </div>
        <div>
          <span className="text-gray-500">Corrected:</span>
          <span className="ml-2 font-medium text-blue-600">
            {summary.correctedFields}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Needs Review:</span>
          <span
            className={`ml-2 font-medium ${
              summary.needsReviewCount > 0 ? 'text-orange-600' : 'text-green-600'
            }`}
          >
            {summary.needsReviewCount}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Corrections:</span>
          <span className="ml-2 font-medium">
            {summary.correctionPercentage.toFixed(0)}%
          </span>
        </div>
      </div>
      {needsReview.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-orange-600 mb-1">Fields needing review:</p>
          <div className="flex flex-wrap gap-1">
            {needsReview.map((field) => (
              <span
                key={field}
                className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CorrectionHistoryListProps {
  history: CorrectionHistory;
  className?: string;
}

/**
 * List showing correction history
 */
export function CorrectionHistoryList({
  history,
  className = '',
}: CorrectionHistoryListProps) {
  if (history.corrections.length === 0) {
    return (
      <div className={`text-sm text-gray-500 py-4 text-center ${className}`}>
        No corrections made yet
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">
        Correction History ({history.totalCorrections})
      </h4>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {history.corrections.map((correction, index) => (
          <div
            key={index}
            className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                {correction.fieldName}
              </span>
              <span className="text-xs text-gray-500">
                {correction.correctedAt.toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-1 text-xs">
              <span className="line-through text-gray-400">
                {correction.originalValue}
              </span>
              <span className="mx-1">→</span>
              <span className="text-blue-600">{correction.correctedValue}</span>
            </div>
            {correction.reason && (
              <div className="mt-1 text-xs text-gray-500 italic">
                Reason: {correction.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= Hooks =============

/**
 * Hook for managing correction state for a single field
 */
export function useFieldCorrection(
  originalValue: string,
  initialValue: string,
  originalConfidence: number
): {
  state: CorrectionState;
  setValue: (value: string, reason?: string) => void;
  revert: () => void;
} {
  const [state, setState] = useState<CorrectionState>(() =>
    createCorrectionState(originalValue, initialValue, originalConfidence)
  );

  const setValue = useCallback(
    (value: string, reason?: string) => {
      setState((prev) => applyCorrection(prev, value, reason));
    },
    []
  );

  const revert = useCallback(() => {
    setState((prev) => revertToOriginal(prev));
  }, []);

  return { state, setValue, revert };
}

/**
 * Hook for managing correction history
 */
export function useCorrectionHistory(): {
  history: CorrectionHistory;
  addCorrection: (correction: FieldCorrection) => void;
  getCorrectionsForField: (fieldName: string) => FieldCorrection[];
  getLatest: (fieldName: string) => FieldCorrection | null;
} {
  const [history, setHistory] = useState<CorrectionHistory>(() =>
    createCorrectionHistory()
  );

  const addCorrection = useCallback((correction: FieldCorrection) => {
    setHistory((prev) => addToHistory(prev, correction));
  }, []);

  const getCorrectionsForField = useCallback(
    (fieldName: string) => getFieldCorrections(history, fieldName),
    [history]
  );

  const getLatest = useCallback(
    (fieldName: string) => getLatestCorrection(history, fieldName),
    [history]
  );

  return {
    history,
    addCorrection,
    getCorrectionsForField,
    getLatest,
  };
}

/**
 * Hook for managing multiple field corrections
 */
export function useMultiFieldCorrection(
  initialFields: Record<string, { value: string; confidence: number }>
): {
  fields: Record<string, CorrectionState>;
  updateField: (fieldName: string, value: string, reason?: string) => void;
  revertField: (fieldName: string) => void;
  revertAll: () => void;
  summary: ReturnType<typeof calculateCorrectionSummary>;
  fieldsNeedingReview: string[];
} {
  const [fields, setFields] = useState<Record<string, CorrectionState>>(() => {
    const result: Record<string, CorrectionState> = {};
    for (const [name, data] of Object.entries(initialFields)) {
      result[name] = createCorrectionState(
        data.value,
        data.value,
        data.confidence
      );
    }
    return result;
  });

  const updateField = useCallback(
    (fieldName: string, value: string, reason?: string) => {
      setFields((prev) => {
        if (!prev[fieldName]) return prev;
        return {
          ...prev,
          [fieldName]: applyCorrection(prev[fieldName], value, reason),
        };
      });
    },
    []
  );

  const revertField = useCallback((fieldName: string) => {
    setFields((prev) => {
      if (!prev[fieldName]) return prev;
      return {
        ...prev,
        [fieldName]: revertToOriginal(prev[fieldName]),
      };
    });
  }, []);

  const revertAll = useCallback(() => {
    setFields((prev) => {
      const result: Record<string, CorrectionState> = {};
      for (const [name, state] of Object.entries(prev)) {
        result[name] = revertToOriginal(state);
      }
      return result;
    });
  }, []);

  const summary = useMemo(() => calculateCorrectionSummary(fields), [fields]);
  const fieldsNeedingReview = useMemo(
    () => getFieldsNeedingReview(fields),
    [fields]
  );

  return {
    fields,
    updateField,
    revertField,
    revertAll,
    summary,
    fieldsNeedingReview,
  };
}

// ============= Default Export =============

export default {
  // Constants
  MANUAL_OVERRIDE_CONFIDENCE,
  // Utility functions
  createCorrection,
  hasBeenCorrected,
  getConfidenceAfterCorrection,
  createCorrectionState,
  revertToOriginal,
  applyCorrection,
  createCorrectionHistory,
  addToHistory,
  getFieldCorrections,
  getLatestCorrection,
  fieldNeedsReview,
  getFieldsNeedingReview,
  calculateCorrectionSummary,
  getCorrectionIndicatorClass,
  getCorrectionBadgeText,
  formatOriginalValueDisplay,
  validateCorrectionInput,
  applyBulkCorrections,
  // Components
  CorrectionBadge,
  OriginalValueDisplay,
  RevertButton,
  InlineEditField,
  CorrectionSummaryPanel,
  CorrectionHistoryList,
  // Hooks
  useFieldCorrection,
  useCorrectionHistory,
  useMultiFieldCorrection,
};
