/**
 * Math Validation Components and Utilities
 * Subtask 14.5: Implement math error highlighting (red)
 *
 * Provides:
 * - Invoice math validation (IVA 16%, total calculation)
 * - Line item amount validation (qty * price)
 * - Error highlighting components
 * - Real-time validation utilities
 */

import { useMemo } from 'react';

// ============= Types =============

export interface MathValidationResult {
  isValid: boolean;
  errors: MathError[];
}

export interface MathError {
  field: string;
  message: string;
  expected: number;
  actual: number;
  difference: number;
}

export interface LineItemValidation {
  id: string;
  isValid: boolean;
  error?: string;
  expected?: number;
  actual?: number;
}

export interface InvoiceAmounts {
  subtotal: number;
  iva: number;
  total: number;
}

// ============= Constants =============

export const IVA_RATE = 0.16; // Mexican IVA rate (16%)
export const DEFAULT_TOLERANCE = 0.01; // 1 cent tolerance for rounding

// ============= Utility Functions =============

/**
 * Format currency for display (Mexican locale)
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate expected IVA from subtotal (16%)
 */
export function calculateExpectedIva(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE * 100) / 100;
}

/**
 * Calculate expected total from subtotal and IVA
 */
export function calculateExpectedTotal(subtotal: number, iva: number): number {
  return Math.round((subtotal + iva) * 100) / 100;
}

/**
 * Check if two numbers are equal within tolerance
 * Uses epsilon adjustment for floating point precision
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  const epsilon = 1e-10;
  return Math.abs(actual - expected) <= tolerance + epsilon;
}

/**
 * Validate IVA amount (should be 16% of subtotal)
 */
export function validateIva(
  subtotal: number,
  iva: number,
  tolerance: number = DEFAULT_TOLERANCE
): MathError | null {
  const expectedIva = calculateExpectedIva(subtotal);

  if (!isWithinTolerance(iva, expectedIva, tolerance)) {
    return {
      field: 'iva',
      message: `IVA should be 16% of subtotal (${formatCurrency(expectedIva)})`,
      expected: expectedIva,
      actual: iva,
      difference: Math.round((iva - expectedIva) * 100) / 100,
    };
  }

  return null;
}

/**
 * Validate total amount (should be subtotal + IVA)
 */
export function validateTotal(
  subtotal: number,
  iva: number,
  total: number,
  tolerance: number = DEFAULT_TOLERANCE
): MathError | null {
  const expectedTotal = calculateExpectedTotal(subtotal, iva);

  if (!isWithinTolerance(total, expectedTotal, tolerance)) {
    return {
      field: 'total',
      message: `Total should equal subtotal + IVA (${formatCurrency(expectedTotal)})`,
      expected: expectedTotal,
      actual: total,
      difference: Math.round((total - expectedTotal) * 100) / 100,
    };
  }

  return null;
}

/**
 * Validate all invoice math calculations
 */
export function validateInvoiceMath(
  amounts: InvoiceAmounts,
  tolerance: number = DEFAULT_TOLERANCE
): MathValidationResult {
  const errors: MathError[] = [];

  const ivaError = validateIva(amounts.subtotal, amounts.iva, tolerance);
  if (ivaError) errors.push(ivaError);

  const totalError = validateTotal(
    amounts.subtotal,
    amounts.iva,
    amounts.total,
    tolerance
  );
  if (totalError) errors.push(totalError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate line item calculation (quantity * unitPrice = amount)
 */
export function validateLineItem(
  id: string,
  quantity: number,
  unitPrice: number,
  amount: number,
  tolerance: number = DEFAULT_TOLERANCE
): LineItemValidation {
  const expectedAmount = Math.round(quantity * unitPrice * 100) / 100;

  if (!isWithinTolerance(amount, expectedAmount, tolerance)) {
    return {
      id,
      isValid: false,
      error: `Amount should be ${formatCurrency(expectedAmount)} (${quantity} × ${formatCurrency(unitPrice)})`,
      expected: expectedAmount,
      actual: amount,
    };
  }

  return { id, isValid: true };
}

/**
 * Validate all line items
 */
export function validateLineItems(
  items: Array<{ id: string; quantity: number; unitPrice: number; amount: number }>,
  tolerance: number = DEFAULT_TOLERANCE
): LineItemValidation[] {
  return items.map((item) =>
    validateLineItem(item.id, item.quantity, item.unitPrice, item.amount, tolerance)
  );
}

/**
 * Calculate subtotal from line items
 */
export function calculateSubtotalFromItems(
  items: Array<{ amount: number }>
): number {
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

/**
 * Check if subtotal matches line items sum
 */
export function validateSubtotalMatchesItems(
  subtotal: number,
  items: Array<{ amount: number }>,
  tolerance: number = DEFAULT_TOLERANCE
): MathError | null {
  const itemsTotal = calculateSubtotalFromItems(items);

  if (!isWithinTolerance(subtotal, itemsTotal, tolerance)) {
    return {
      field: 'subtotal',
      message: `Subtotal should match sum of line items (${formatCurrency(itemsTotal)})`,
      expected: itemsTotal,
      actual: subtotal,
      difference: Math.round((subtotal - itemsTotal) * 100) / 100,
    };
  }

  return null;
}

/**
 * Get highlight class for math error
 */
export function getMathErrorHighlightClass(hasError: boolean): string {
  return hasError ? 'border-red-500 bg-red-50 ring-2 ring-red-300' : '';
}

/**
 * Check if error indicator should be shown
 */
export function shouldShowErrorIndicator(hasError: boolean): boolean {
  return hasError;
}

// ============= Components =============

interface MathErrorBannerProps {
  errors: MathError[];
  className?: string;
}

/**
 * Banner showing math validation errors
 */
export function MathErrorBanner({ errors, className = '' }: MathErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="font-bold">Math Validation Errors</p>
          <ul className="mt-1 list-disc list-inside text-sm">
            {errors.map((error, index) => (
              <li key={index}>
                <strong>{error.field}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface MathFieldWrapperProps {
  hasError: boolean;
  errorMessage?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper for form fields with math error highlighting
 */
export function MathFieldWrapper({
  hasError,
  errorMessage,
  children,
  className = '',
}: MathFieldWrapperProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={hasError ? getMathErrorHighlightClass(true) : ''}>
        {children}
      </div>
      {hasError && errorMessage && (
        <div className="mt-1 flex items-center gap-1 text-red-600 text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

interface LineItemRowProps {
  validation: LineItemValidation;
  children: React.ReactNode;
  className?: string;
}

/**
 * Table row wrapper with line item error highlighting
 */
export function LineItemRow({
  validation,
  children,
  className = '',
}: LineItemRowProps) {
  return (
    <tr
      className={`
        ${!validation.isValid ? 'bg-red-50' : ''}
        ${className}
      `}
    >
      {children}
      {!validation.isValid && (
        <td className="px-2 py-1">
          <span className="text-red-600 text-xs" title={validation.error}>
            <svg
              className="w-4 h-4 inline"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </td>
      )}
    </tr>
  );
}

interface MathValidationSummaryProps {
  amounts: InvoiceAmounts;
  lineItems?: Array<{ id: string; quantity: number; unitPrice: number; amount: number }>;
  className?: string;
}

/**
 * Complete math validation summary component
 */
export function MathValidationSummary({
  amounts,
  lineItems = [],
  className = '',
}: MathValidationSummaryProps) {
  const invoiceValidation = useMemo(
    () => validateInvoiceMath(amounts),
    [amounts]
  );

  const lineItemValidations = useMemo(
    () => validateLineItems(lineItems),
    [lineItems]
  );

  const invalidLineItems = lineItemValidations.filter((v) => !v.isValid);
  const allErrors = [
    ...invoiceValidation.errors,
    ...invalidLineItems.map((v) => ({
      field: `Line Item ${v.id}`,
      message: v.error || 'Amount calculation error',
      expected: v.expected || 0,
      actual: v.actual || 0,
      difference: (v.actual || 0) - (v.expected || 0),
    })),
  ];

  if (allErrors.length === 0) {
    return (
      <div
        className={`bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded ${className}`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">All calculations are correct</span>
        </div>
      </div>
    );
  }

  return <MathErrorBanner errors={allErrors} className={className} />;
}

interface CalculationHelperProps {
  subtotal: number;
  onAutoCalculate?: (iva: number, total: number) => void;
  className?: string;
}

/**
 * Helper component to auto-calculate IVA and total
 */
export function CalculationHelper({
  subtotal,
  onAutoCalculate,
  className = '',
}: CalculationHelperProps) {
  const expectedIva = calculateExpectedIva(subtotal);
  const expectedTotal = calculateExpectedTotal(subtotal, expectedIva);

  const handleAutoCalculate = () => {
    onAutoCalculate?.(expectedIva, expectedTotal);
  };

  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded p-3 text-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-blue-800">
          <p>
            Expected IVA (16%): <strong>{formatCurrency(expectedIva)}</strong>
          </p>
          <p>
            Expected Total: <strong>{formatCurrency(expectedTotal)}</strong>
          </p>
        </div>
        {onAutoCalculate && (
          <button
            type="button"
            onClick={handleAutoCalculate}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
          >
            Auto-fill
          </button>
        )}
      </div>
    </div>
  );
}

// ============= Hooks =============

/**
 * Hook for real-time invoice math validation
 */
export function useInvoiceMathValidation(amounts: InvoiceAmounts): {
  validation: MathValidationResult;
  hasIvaError: boolean;
  hasTotalError: boolean;
  ivaError: MathError | null;
  totalError: MathError | null;
} {
  const validation = useMemo(() => validateInvoiceMath(amounts), [amounts]);

  const ivaError = validation.errors.find((e) => e.field === 'iva') || null;
  const totalError = validation.errors.find((e) => e.field === 'total') || null;

  return {
    validation,
    hasIvaError: ivaError !== null,
    hasTotalError: totalError !== null,
    ivaError,
    totalError,
  };
}

/**
 * Hook for line item validation
 */
export function useLineItemValidation(
  items: Array<{ id: string; quantity: number; unitPrice: number; amount: number }>
): {
  validations: LineItemValidation[];
  hasErrors: boolean;
  invalidCount: number;
} {
  const validations = useMemo(() => validateLineItems(items), [items]);
  const invalidCount = validations.filter((v) => !v.isValid).length;

  return {
    validations,
    hasErrors: invalidCount > 0,
    invalidCount,
  };
}

// Export default with all utilities
export default {
  // Constants
  IVA_RATE,
  DEFAULT_TOLERANCE,
  // Utility functions
  formatCurrency,
  parseCurrency,
  calculateExpectedIva,
  calculateExpectedTotal,
  isWithinTolerance,
  validateIva,
  validateTotal,
  validateInvoiceMath,
  validateLineItem,
  validateLineItems,
  calculateSubtotalFromItems,
  validateSubtotalMatchesItems,
  getMathErrorHighlightClass,
  shouldShowErrorIndicator,
  // Components
  MathErrorBanner,
  MathFieldWrapper,
  LineItemRow,
  MathValidationSummary,
  CalculationHelper,
  // Hooks
  useInvoiceMathValidation,
  useLineItemValidation,
};
