/**
 * InvoiceForm Component
 * Subtask 14.3: Create InvoiceForm component with auto-population
 *
 * Features:
 * - Form fields for Mexican invoice data (RFC, dates, amounts)
 * - Auto-population from AI-extracted data
 * - Confidence-based field highlighting
 * - Line items table
 * - Form validation
 * - Math validation (subtotal + IVA = total)
 */

import { useState, useCallback, useEffect } from 'react';

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
  confidence?: number;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

function FormFieldInput({
  label,
  name,
  type,
  value,
  confidence,
  error,
  required,
  readOnly,
  onChange,
  onFocus,
}: FormFieldProps) {
  const confidenceLevel = confidence !== undefined ? getConfidenceLevel(confidence) : undefined;
  const borderColor = error
    ? 'border-red-500'
    : confidenceLevel
    ? getConfidenceColor(confidenceLevel)
    : 'border-gray-300';
  const bgColor = confidenceLevel ? getConfidenceBgColor(confidenceLevel) : 'bg-white';

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
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
          className={`w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${borderColor} ${bgColor} ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          step={type === 'number' ? '0.01' : undefined}
        />
        {confidence !== undefined && (
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded ${
              confidenceLevel === 'high'
                ? 'bg-green-100 text-green-700'
                : confidenceLevel === 'medium'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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
  return {
    rfcEmisor: {
      value: data?.rfcEmisor?.value || '',
      confidence: data?.rfcEmisor?.confidence,
      touched: false,
    },
    rfcReceptor: {
      value: data?.rfcReceptor?.value || '',
      confidence: data?.rfcReceptor?.confidence,
      touched: false,
    },
    fecha: {
      value: data?.fecha?.value || '',
      confidence: data?.fecha?.confidence,
      touched: false,
    },
    subtotal: {
      value: data?.subtotal?.value || '',
      confidence: data?.subtotal?.confidence,
      touched: false,
    },
    iva: {
      value: data?.iva?.value || '',
      confidence: data?.iva?.confidence,
      touched: false,
    },
    total: {
      value: data?.total?.value || '',
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
  const [mathError, setMathError] = useState<string | null>(null);

  // Re-populate when extracted data changes
  useEffect(() => {
    if (extractedData) {
      setFormState(createInitialFormState(extractedData));
      setLineItems(extractedData.lineItems || []);
    }
  }, [extractedData]);

  // Validate math whenever amounts change
  useEffect(() => {
    const subtotal = parseFloat(formState.subtotal.value) || 0;
    const iva = parseFloat(formState.iva.value) || 0;
    const total = parseFloat(formState.total.value) || 0;

    if (subtotal > 0 && iva > 0 && total > 0) {
      const result = validateMath(subtotal, iva, total);
      if (!result.isValid) {
        setMathError(
          `Math error: Expected IVA=${result.expectedIva.toFixed(2)}, Total=${result.expectedTotal.toFixed(2)}`
        );
      } else {
        setMathError(null);
      }
    } else {
      setMathError(null);
    }
  }, [formState.subtotal.value, formState.iva.value, formState.total.value]);

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

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      const data: InvoiceData = {
        rfcEmisor: { value: formState.rfcEmisor.value, confidence: 1.0 },
        rfcReceptor: { value: formState.rfcReceptor.value, confidence: 1.0 },
        fecha: { value: formState.fecha.value, confidence: 1.0 },
        subtotal: { value: formState.subtotal.value, confidence: 1.0 },
        iva: { value: formState.iva.value, confidence: 1.0 },
        total: { value: formState.total.value, confidence: 1.0 },
        lineItems,
      };

      onSubmit?.(data);
    },
    [formState, lineItems, validateForm, onSubmit]
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

      {/* Math Error Warning */}
      {mathError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{mathError}</span>
          </div>
        </div>
      )}

      {/* RFC Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormFieldInput
          label="RFC Emisor"
          name="rfcEmisor"
          type="text"
          value={formState.rfcEmisor.value}
          confidence={formState.rfcEmisor.confidence}
          error={formState.rfcEmisor.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('rfcEmisor', v)}
          onFocus={() => handleFieldFocus('rfcEmisor')}
        />
        <FormFieldInput
          label="RFC Receptor"
          name="rfcReceptor"
          type="text"
          value={formState.rfcReceptor.value}
          confidence={formState.rfcReceptor.confidence}
          error={formState.rfcReceptor.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('rfcReceptor', v)}
          onFocus={() => handleFieldFocus('rfcReceptor')}
        />
      </div>

      {/* Date Field */}
      <FormFieldInput
        label="Fecha"
        name="fecha"
        type="date"
        value={formState.fecha.value}
        confidence={formState.fecha.confidence}
        error={formState.fecha.error}
        required
        readOnly={readOnly}
        onChange={(v) => handleFieldChange('fecha', v)}
        onFocus={() => handleFieldFocus('fecha')}
      />

      {/* Amount Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormFieldInput
          label="Subtotal"
          name="subtotal"
          type="number"
          value={formState.subtotal.value}
          confidence={formState.subtotal.confidence}
          error={formState.subtotal.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('subtotal', v)}
          onFocus={() => handleFieldFocus('subtotal')}
        />
        <FormFieldInput
          label="IVA (16%)"
          name="iva"
          type="number"
          value={formState.iva.value}
          confidence={formState.iva.confidence}
          error={formState.iva.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('iva', v)}
          onFocus={() => handleFieldFocus('iva')}
        />
        <FormFieldInput
          label="Total"
          name="total"
          type="number"
          value={formState.total.value}
          confidence={formState.total.confidence}
          error={formState.total.error}
          required
          readOnly={readOnly}
          onChange={(v) => handleFieldChange('total', v)}
          onFocus={() => handleFieldFocus('total')}
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

      {/* Submit Button */}
      {!readOnly && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!!mathError}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Invoice
          </button>
        </div>
      )}
    </form>
  );
}

export default InvoiceForm;
