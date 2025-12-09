/**
 * InvoiceForm Component
 * Subtask 14.3: Create InvoiceForm component with auto-population
 * Subtask 14.5: Implement math error highlighting (red)
 * Subtask 14.6: Implement validation blocking (disable Submit)
 * Subtask 14.7: Create manual correction interface
 * Subtask 14.8: Implement submission confirmation flow
 *
 * Features:
 * - Form fields for Mexican invoice data (RFC, dates, amounts)
 * - Auto-population from AI-extracted data
 * - Confidence-based field highlighting
 * - Line items table
 * - Form validation
 * - Math validation with red highlighting (subtotal + IVA = total, IVA = 16%)
 * - Validation blocking with submit button disable
 * - Manual correction with original value tracking
 * - Submission confirmation modal with summary and corrections display
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  validateInvoiceMath,
  validateLineItems,
  MathErrorBanner,
  CalculationHelper,
  getMathErrorHighlightClass,
  type MathError,
  type LineItemValidation,
} from './MathValidation';
import {
  calculateValidationState,
  shouldDisableSubmit,
  getSubmitButtonClasses,
  getSubmitButtonTooltip,
  ValidationBlockerBanner,
  MiniValidationIndicator,
  type FormValues,
  type ValidationState,
} from './ValidationBlocking';
import {
  CorrectionBadge,
  OriginalValueDisplay,
  RevertButton,
  CorrectionSummaryPanel,
  hasBeenCorrected,
  getConfidenceAfterCorrection,
  MANUAL_OVERRIDE_CONFIDENCE,
  type CorrectionState,
} from './ManualCorrection';
import {
  ConfirmationModal,
  createInvoiceSummary,
  useSubmissionFlow,
  type InvoiceSummary,
} from './SubmissionConfirmation';

// =============================================================================
// Types
// =============================================================================

export interface ExtractedField {
  value: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  confidence?: number;
}

export interface InvoiceData {
  rfcEmisor?: ExtractedField;
  rfcReceptor?: ExtractedField;
  fecha?: ExtractedField;
  subtotal?: ExtractedField;
  iva?: ExtractedField;
  total?: ExtractedField;
  lineItems?: LineItem[];
}

interface FormField {
  value: string;
  originalValue: string; // Original extracted value for correction tracking (Subtask 14.7)
  confidence?: number;
  touched: boolean;
  error?: string;
}

interface FormState {
  rfcEmisor: FormField;
  rfcReceptor: FormField;
  fecha: FormField;
  subtotal: FormField;
  iva: FormField;
  total: FormField;
}

export interface InvoiceFormProps {
  /** Extracted invoice data for auto-population */
  extractedData?: InvoiceData;
  /** Callback when form is submitted */
  onSubmit?: (data: InvoiceData) => void;
  /** Callback when a field is focused (for PDF highlighting) */
  onFieldFocus?: (fieldName: string, bbox?: [number, number, number, number]) => void;
  /** Whether the form is in read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions (exported for testing)
// =============================================================================

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.90) return 'high';
  if (confidence >= 0.70) return 'medium';
  return 'low';
}

export function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'border-green-300';
    case 'medium': return 'border-orange-300';
    case 'low': return 'border-red-300';
  }
}

export function getConfidenceBgColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'bg-green-50';
    case 'medium': return 'bg-orange-50';
    case 'low': return 'bg-red-50';
  }
}

export function shouldHighlight(confidence: number): boolean {
  return confidence < 0.90;
}

export function validateRFC(rfc: string): boolean {
  const rfcPattern = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcPattern.test(rfc.toUpperCase());
}

export function validateDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
}

export function validateMath(
  subtotal: number,
  iva: number,
  total: number,
  tolerance: number = 0.01
): { isValid: boolean; expectedIva: number; expectedTotal: number } {
  const expectedIva = Math.round(subtotal * 0.16 * 100) / 100;
  const expectedTotal = Math.round((subtotal + iva) * 100) / 100;

  const ivaError = Math.abs(iva - expectedIva);
  const totalError = Math.abs(total - expectedTotal);

  return {
    isValid: ivaError <= tolerance && totalError <= tolerance,
    expectedIva,
    expectedTotal,
  };
}

export function calculateLineItemAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function generateLineItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// Form Field Component
// =============================================================================

interface FormFieldProps {
  label: string;
  name: string;
  type: 'text' | 'number' | 'date';
  value: string;
  originalValue?: string; // Original extracted value (for correction tracking)
  confidence?: number;
  error?: string;
  mathError?: string; // Math validation error (red highlighting)
  required?: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onRevert?: () => void; // Revert to original value
}

function FormFieldInput({
  label,
  name,
  type,
  value,
  originalValue,
  confidence,
  error,
  mathError,
  required,
  readOnly,
  onChange,
  onFocus,
  onRevert,
}: FormFieldProps) {
  // Check if field has been manually corrected (Subtask 14.7)
  const isCorrected = originalValue !== undefined && hasBeenCorrected(originalValue, value);

  // Get display confidence (100% for corrected fields)
  const displayConfidence = isCorrected
    ? MANUAL_OVERRIDE_CONFIDENCE
    : confidence;

  const confidenceLevel = displayConfidence !== undefined
    ? getConfidenceLevel(displayConfidence)
    : undefined;

  // Math error takes precedence, then form error, then correction, then confidence highlighting
  const hasMathError = !!mathError;
  const hasFormError = !!error;

  const borderColor = hasMathError
    ? 'border-red-500'
    : hasFormError
    ? 'border-red-500'
    : isCorrected
    ? 'border-blue-300'
    : confidenceLevel
    ? getConfidenceColor(confidenceLevel)
    : 'border-gray-300';

  const bgColor = hasMathError
    ? 'bg-red-50'
    : isCorrected
    ? 'bg-blue-50'
    : confidenceLevel
    ? getConfidenceBgColor(confidenceLevel)
    : 'bg-white';

  // Additional highlighting for math errors
  const mathHighlightClass = hasMathError ? 'ring-2 ring-red-300' : '';

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {hasMathError && (
          <span className="ml-2 text-red-500 text-xs font-normal">
            (Math error)
          </span>
        )}
        {isCorrected && !hasMathError && (
          <CorrectionBadge hasBeenCorrected={true} className="ml-2" />
        )}
      </label>
      <div className="relative">
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          readOnly={readOnly}
          className={`w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${borderColor} ${bgColor} ${mathHighlightClass} ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          } ${isCorrected && onRevert ? 'pr-20' : ''}`}
          step={type === 'number' ? '0.01' : undefined}
        />
        {/* Revert button for corrected fields */}
        {isCorrected && onRevert && !readOnly && (
          <RevertButton
            onRevert={onRevert}
            className="absolute right-12 top-1/2 -translate-y-1/2"
          />
        )}
        {displayConfidence !== undefined && !hasMathError && (
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded ${
              isCorrected
                ? 'bg-blue-100 text-blue-700'
                : confidenceLevel === 'high'
                ? 'bg-green-100 text-green-700'
                : confidenceLevel === 'medium'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {Math.round(displayConfidence * 100)}%
          </span>
        )}
        {hasMathError && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      {/* Show original value when corrected (Subtask 14.7) */}
      {isCorrected && originalValue && (
        <OriginalValueDisplay
          originalValue={originalValue}
          hasBeenCorrected={true}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {mathError && !error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {mathError}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Line Items Table Component
// =============================================================================

interface LineItemsTableProps {
  items: LineItem[];
  readOnly?: boolean;
  onItemChange?: (id: string, field: keyof LineItem, value: string | number) => void;
  onItemAdd?: () => void;
  onItemRemove?: (id: string) => void;
}

function LineItemsTable({
  items,
  readOnly,
  onItemChange,
  onItemAdd,
  onItemRemove,
}: LineItemsTableProps) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Line Items</h3>
        {!readOnly && onItemAdd && (
          <button
            type="button"
            onClick={onItemAdd}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            + Add Item
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">
                Qty
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                Unit Price
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                Amount
              </th>
              {!readOnly && (
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">

                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 4 : 5}
                  className="px-3 py-4 text-center text-sm text-gray-500"
                >
                  No line items
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const confidenceLevel = item.confidence
                  ? getConfidenceLevel(item.confidence)
                  : undefined;
                const rowBg = confidenceLevel
                  ? getConfidenceBgColor(confidenceLevel)
                  : '';

                return (
                  <tr key={item.id} className={rowBg}>
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span className="text-sm">{item.description}</span>
                      ) : (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            onItemChange?.(item.id, 'description', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {readOnly ? (
                        <span className="text-sm">{item.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            onItemChange?.(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded"
                          step="0.01"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {readOnly ? (
                        <span className="text-sm">${item.unitPrice.toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            onItemChange?.(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded"
                          step="0.01"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      ${item.amount.toFixed(2)}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onItemRemove?.(item.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Main InvoiceForm Component
// =============================================================================

function createInitialFormState(data?: InvoiceData): FormState {
  const rfcEmisorValue = data?.rfcEmisor?.value || '';
  const rfcReceptorValue = data?.rfcReceptor?.value || '';
  const fechaValue = data?.fecha?.value || '';
  const subtotalValue = data?.subtotal?.value || '';
  const ivaValue = data?.iva?.value || '';
  const totalValue = data?.total?.value || '';

  return {
    rfcEmisor: {
      value: rfcEmisorValue,
      originalValue: rfcEmisorValue, // Track original for corrections (Subtask 14.7)
      confidence: data?.rfcEmisor?.confidence,
      touched: false,
    },
    rfcReceptor: {
      value: rfcReceptorValue,
      originalValue: rfcReceptorValue,
      confidence: data?.rfcReceptor?.confidence,
      touched: false,
    },
    fecha: {
      value: fechaValue,
      originalValue: fechaValue,
      confidence: data?.fecha?.confidence,
      touched: false,
    },
    subtotal: {
      value: subtotalValue,
      originalValue: subtotalValue,
      confidence: data?.subtotal?.confidence,
      touched: false,
    },
    iva: {
      value: ivaValue,
      originalValue: ivaValue,
      confidence: data?.iva?.confidence,
      touched: false,
    },
    total: {
      value: totalValue,
      originalValue: totalValue,
      confidence: data?.total?.confidence,
      touched: false,
    },
  };
}

export function InvoiceForm({
  extractedData,
  onSubmit,
  onFieldFocus,
  readOnly = false,
  className = '',
}: InvoiceFormProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialFormState(extractedData)
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    extractedData?.lineItems || []
  );

  // Re-populate when extracted data changes
  useEffect(() => {
    if (extractedData) {
      setFormState(createInitialFormState(extractedData));
      setLineItems(extractedData.lineItems || []);
    }
  }, [extractedData]);

  // Enhanced math validation with detailed errors (Subtask 14.5)
  const mathValidation = useMemo(() => {
    const subtotal = parseFloat(formState.subtotal.value) || 0;
    const iva = parseFloat(formState.iva.value) || 0;
    const total = parseFloat(formState.total.value) || 0;

    // Only validate if all values are entered
    if (subtotal === 0 && iva === 0 && total === 0) {
      return { isValid: true, errors: [], ivaError: null, totalError: null };
    }

    const result = validateInvoiceMath({ subtotal, iva, total });
    const ivaError = result.errors.find(e => e.field === 'iva') || null;
    const totalError = result.errors.find(e => e.field === 'total') || null;

    return {
      ...result,
      ivaError,
      totalError,
    };
  }, [formState.subtotal.value, formState.iva.value, formState.total.value]);

  // Line item validation
  const lineItemValidations = useMemo(() => {
    if (lineItems.length === 0) return [];
    return validateLineItems(lineItems);
  }, [lineItems]);

  // Legacy mathError for form validation (backwards compatibility)
  const mathError = mathValidation.errors.length > 0
    ? mathValidation.errors.map(e => e.message).join('; ')
    : null;

  // Validation blocking state (Subtask 14.6)
  const validationState = useMemo((): ValidationState => {
    const formValues: FormValues = {
      rfcEmisor: formState.rfcEmisor.value,
      rfcReceptor: formState.rfcReceptor.value,
      fecha: formState.fecha.value,
      subtotal: formState.subtotal.value,
      iva: formState.iva.value,
      total: formState.total.value,
    };
    return calculateValidationState(formValues);
  }, [
    formState.rfcEmisor.value,
    formState.rfcReceptor.value,
    formState.fecha.value,
    formState.subtotal.value,
    formState.iva.value,
    formState.total.value,
  ]);

  // Submit button state
  const canSubmit = validationState.canSubmit;
  const submitButtonClasses = getSubmitButtonClasses(canSubmit);
  const submitButtonTooltip = getSubmitButtonTooltip(validationState);

  // Create invoice summary for confirmation modal (Subtask 14.8)
  const invoiceSummary = useMemo((): InvoiceSummary => {
    return createInvoiceSummary(
      {
        rfcEmisor: { value: formState.rfcEmisor.value, originalValue: formState.rfcEmisor.originalValue },
        rfcReceptor: { value: formState.rfcReceptor.value, originalValue: formState.rfcReceptor.originalValue },
        fecha: { value: formState.fecha.value, originalValue: formState.fecha.originalValue },
        subtotal: { value: formState.subtotal.value, originalValue: formState.subtotal.originalValue },
        iva: { value: formState.iva.value, originalValue: formState.iva.originalValue },
        total: { value: formState.total.value, originalValue: formState.total.originalValue },
      },
      lineItems.length
    );
  }, [formState, lineItems.length]);

  // Submission flow state management (Subtask 14.8)
  const performSubmission = useCallback(async () => {
    const data: InvoiceData = {
      rfcEmisor: { value: formState.rfcEmisor.value, confidence: 1.0 },
      rfcReceptor: { value: formState.rfcReceptor.value, confidence: 1.0 },
      fecha: { value: formState.fecha.value, confidence: 1.0 },
      subtotal: { value: formState.subtotal.value, confidence: 1.0 },
      iva: { value: formState.iva.value, confidence: 1.0 },
      total: { value: formState.total.value, confidence: 1.0 },
      lineItems,
    };

    // Simulate async submission - in real app this would be an API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSubmit?.(data);
  }, [formState, lineItems, onSubmit]);

  const {
    state: submissionState,
    showConfirmation,
    cancelConfirmation,
    confirmAndSubmit,
    closeModal,
  } = useSubmissionFlow(performSubmission);

  // Handle field change
  const handleFieldChange = useCallback(
    (fieldName: keyof FormState, value: string) => {
      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
          touched: true,
          error: undefined,
        },
      }));
    },
    []
  );

  // Handle field focus
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      const bboxMap: Record<string, [number, number, number, number] | undefined> = {
        rfcEmisor: extractedData?.rfcEmisor?.bbox,
        rfcReceptor: extractedData?.rfcReceptor?.bbox,
        fecha: extractedData?.fecha?.bbox,
        subtotal: extractedData?.subtotal?.bbox,
        iva: extractedData?.iva?.bbox,
        total: extractedData?.total?.bbox,
      };
      onFieldFocus?.(fieldName, bboxMap[fieldName]);
    },
    [extractedData, onFieldFocus]
  );

  // Handle revert field to original value (Subtask 14.7)
  const handleRevertField = useCallback(
    (fieldName: keyof FormState) => {
      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value: prev[fieldName].originalValue,
          touched: true,
          error: undefined,
        },
      }));
    },
    []
  );

  // Handle line item change
  const handleLineItemChange = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updated = { ...item, [field]: value };

          // Recalculate amount if quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updated.amount = calculateLineItemAmount(
              field === 'quantity' ? (value as number) : item.quantity,
              field === 'unitPrice' ? (value as number) : item.unitPrice
            );
          }

          return updated;
        })
      );
    },
    []
  );

  // Add new line item
  const handleAddLineItem = useCallback(() => {
    const newItem: LineItem = {
      id: generateLineItemId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
  }, []);

  // Remove line item
  const handleRemoveLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    // Validate RFC Emisor
    if (!formState.rfcEmisor.value) {
      newState.rfcEmisor = { ...newState.rfcEmisor, error: 'RFC Emisor is required' };
      isValid = false;
    } else if (!validateRFC(formState.rfcEmisor.value)) {
      newState.rfcEmisor = { ...newState.rfcEmisor, error: 'Invalid RFC format' };
      isValid = false;
    }

    // Validate RFC Receptor
    if (!formState.rfcReceptor.value) {
      newState.rfcReceptor = { ...newState.rfcReceptor, error: 'RFC Receptor is required' };
      isValid = false;
    } else if (!validateRFC(formState.rfcReceptor.value)) {
      newState.rfcReceptor = { ...newState.rfcReceptor, error: 'Invalid RFC format' };
      isValid = false;
    }

    // Validate date
    if (!formState.fecha.value) {
      newState.fecha = { ...newState.fecha, error: 'Date is required' };
      isValid = false;
    } else if (!validateDate(formState.fecha.value)) {
      newState.fecha = { ...newState.fecha, error: 'Invalid date' };
      isValid = false;
    }

    // Validate amounts
    if (!formState.subtotal.value || !validateAmount(formState.subtotal.value)) {
      newState.subtotal = { ...newState.subtotal, error: 'Valid subtotal is required' };
      isValid = false;
    }
    if (!formState.iva.value || !validateAmount(formState.iva.value)) {
      newState.iva = { ...newState.iva, error: 'Valid IVA is required' };
      isValid = false;
    }
    if (!formState.total.value || !validateAmount(formState.total.value)) {
      newState.total = { ...newState.total, error: 'Valid total is required' };
      isValid = false;
    }

    setFormState(newState);
    return isValid && !mathError;
  }, [formState, mathError]);

  // Handle form submission - show confirmation modal (Subtask 14.8)
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Show confirmation modal instead of direct submission
      showConfirmation();
    },
    [validateForm, showConfirmation]
  );

  return (
    <form onSubmit={handleSubmit} className={`p-4 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Invoice Data</h2>
        <p className="text-sm text-gray-500">
          Review and correct the extracted information
        </p>
      </div>

      {/* Math Error Warning Banner (Subtask 14.5) */}
      {mathValidation.errors.length > 0 && (
        <MathErrorBanner errors={mathValidation.errors} className="mb-4" />
      )}

      {/* Calculation Helper - shown when subtotal is entered */}
      {parseFloat(formState.subtotal.value) > 0 && !readOnly && (
        <CalculationHelper
          subtotal={parseFloat(formState.subtotal.value)}
          onAutoCalculate={(iva, total) => {
            handleFieldChange('iva', iva.toFixed(2));
            handleFieldChange('total', total.toFixed(2));
          }}
          className="mb-4"
        />
      )}

      {/* RFC Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormFieldInput
          label="RFC Emisor"
          name="rfcEmisor"
          type="text"
          value={formState.rfcEmisor.value}
          originalValue={formState.rfcEmisor.originalValue}
          confidence={formState.rfcEmisor.confidence}
          error={formState.rfcEmisor.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('rfcEmisor', v)}
          onFocus={() => handleFieldFocus('rfcEmisor')}
          onRevert={() => handleRevertField('rfcEmisor')}
        />
        <FormFieldInput
          label="RFC Receptor"
          name="rfcReceptor"
          type="text"
          value={formState.rfcReceptor.value}
          originalValue={formState.rfcReceptor.originalValue}
          confidence={formState.rfcReceptor.confidence}
          error={formState.rfcReceptor.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('rfcReceptor', v)}
          onFocus={() => handleFieldFocus('rfcReceptor')}
          onRevert={() => handleRevertField('rfcReceptor')}
        />
      </div>

      {/* Date Field */}
      <FormFieldInput
        label="Fecha"
        name="fecha"
        type="date"
        value={formState.fecha.value}
        originalValue={formState.fecha.originalValue}
        confidence={formState.fecha.confidence}
        error={formState.fecha.error}
        required
        readOnly={readOnly}
        onChange={(v) => handleFieldChange('fecha', v)}
        onFocus={() => handleFieldFocus('fecha')}
        onRevert={() => handleRevertField('fecha')}
      />

      {/* Amount Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormFieldInput
          label="Subtotal"
          name="subtotal"
          type="number"
          value={formState.subtotal.value}
          originalValue={formState.subtotal.originalValue}
          confidence={formState.subtotal.confidence}
          error={formState.subtotal.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('subtotal', v)}
          onFocus={() => handleFieldFocus('subtotal')}
          onRevert={() => handleRevertField('subtotal')}
        />
        <FormFieldInput
          label="IVA (16%)"
          name="iva"
          type="number"
          value={formState.iva.value}
          originalValue={formState.iva.originalValue}
          confidence={formState.iva.confidence}
          error={formState.iva.error}
          mathError={mathValidation.ivaError?.message}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('iva', v)}
          onFocus={() => handleFieldFocus('iva')}
          onRevert={() => handleRevertField('iva')}
        />
        <FormFieldInput
          label="Total"
          name="total"
          type="number"
          value={formState.total.value}
          originalValue={formState.total.originalValue}
          confidence={formState.total.confidence}
          error={formState.total.error}
          mathError={mathValidation.totalError?.message}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('total', v)}
          onFocus={() => handleFieldFocus('total')}
          onRevert={() => handleRevertField('total')}
        />
      </div>

      {/* Line Items */}
      <LineItemsTable
        items={lineItems}
        readOnly={readOnly}
        onItemChange={handleLineItemChange}
        onItemAdd={handleAddLineItem}
        onItemRemove={handleRemoveLineItem}
      />

      {/* Validation Blocking Banner (Subtask 14.6) */}
      {!readOnly && !validationState.canSubmit && (
        <ValidationBlockerBanner
          validationState={validationState}
          className="mt-6"
        />
      )}

      {/* Submit Button */}
      {!readOnly && (
        <div className="mt-6 flex items-center justify-between">
          <MiniValidationIndicator validationState={validationState} />
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              title={submitButtonTooltip}
              className={submitButtonClasses}
            >
              Submit Invoice
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal (Subtask 14.8) */}
      <ConfirmationModal
        isOpen={submissionState.status !== 'idle'}
        summary={invoiceSummary}
        state={submissionState}
        onConfirm={confirmAndSubmit}
        onCancel={cancelConfirmation}
        onClose={closeModal}
        onRetry={confirmAndSubmit}
      />
    </form>
  );
}

export default InvoiceForm;
