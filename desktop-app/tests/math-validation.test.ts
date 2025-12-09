/**
 * Tests for Subtask 14.5: Math error highlighting (red)
 *
 * Features tested:
 * - IVA calculation validation (16% of subtotal)
 * - Total calculation validation (subtotal + IVA)
 * - Line item amount validation (quantity * unit price)
 * - Error message generation
 * - Visual highlighting states
 * - Real-time validation
 */

import { describe, it, expect } from '@jest/globals';

// ============= Types =============

interface MathValidationResult {
  isValid: boolean;
  errors: MathError[];
}

interface MathError {
  field: string;
  message: string;
  expected: number;
  actual: number;
  difference: number;
}

interface LineItemValidation {
  id: string;
  isValid: boolean;
  error?: string;
  expected?: number;
  actual?: number;
}

interface InvoiceAmounts {
  subtotal: number;
  iva: number;
  total: number;
}

// ============= Constants =============

const IVA_RATE = 0.16; // Mexican IVA rate
const DEFAULT_TOLERANCE = 0.01; // 1 cent tolerance for rounding

// ============= Utility Functions =============

/**
 * Calculate expected IVA from subtotal
 */
function calculateExpectedIva(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE * 100) / 100;
}

/**
 * Calculate expected total from subtotal and IVA
 */
function calculateExpectedTotal(subtotal: number, iva: number): number {
  return Math.round((subtotal + iva) * 100) / 100;
}

/**
 * Check if two numbers are equal within tolerance
 * Uses epsilon adjustment for floating point precision
 */
function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  const epsilon = 1e-10; // Small value to handle floating point precision
  return Math.abs(actual - expected) <= tolerance + epsilon;
}

/**
 * Validate IVA amount
 */
function validateIva(
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
 * Validate total amount
 */
function validateTotal(
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
 * Validate all invoice math
 */
function validateInvoiceMath(
  amounts: InvoiceAmounts,
  tolerance: number = DEFAULT_TOLERANCE
): MathValidationResult {
  const errors: MathError[] = [];

  const ivaError = validateIva(amounts.subtotal, amounts.iva, tolerance);
  if (ivaError) errors.push(ivaError);

  const totalError = validateTotal(amounts.subtotal, amounts.iva, amounts.total, tolerance);
  if (totalError) errors.push(totalError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate line item calculation
 */
function validateLineItem(
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
function validateLineItems(
  items: Array<{ id: string; quantity: number; unitPrice: number; amount: number }>,
  tolerance: number = DEFAULT_TOLERANCE
): LineItemValidation[] {
  return items.map((item) =>
    validateLineItem(item.id, item.quantity, item.unitPrice, item.amount, tolerance)
  );
}

/**
 * Get highlight class for math error
 */
function getMathErrorHighlightClass(hasError: boolean): string {
  return hasError
    ? 'border-red-500 bg-red-50 ring-2 ring-red-300'
    : '';
}

/**
 * Get error indicator visibility
 */
function shouldShowErrorIndicator(hasError: boolean): boolean {
  return hasError;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse currency string to number
 */
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate subtotal from line items
 */
function calculateSubtotalFromItems(
  items: Array<{ amount: number }>
): number {
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

/**
 * Check if subtotal matches line items sum
 */
function validateSubtotalMatchesItems(
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

// ============= TESTS =============

describe('IVA Calculation Validation', () => {
  it('should validate correct 16% IVA', () => {
    const error = validateIva(10000, 1600);
    expect(error).toBeNull();
  });

  it('should detect incorrect IVA', () => {
    const error = validateIva(10000, 1500);
    expect(error).not.toBeNull();
    expect(error?.field).toBe('iva');
    expect(error?.expected).toBe(1600);
    expect(error?.actual).toBe(1500);
  });

  it('should show expected value in error message', () => {
    const error = validateIva(10000, 1500);
    expect(error?.message).toContain('16%');
    expect(error?.message).toContain('$1,600.00');
  });

  it('should calculate difference', () => {
    const error = validateIva(10000, 1700);
    expect(error?.difference).toBe(100);
  });

  it('should allow small tolerance for rounding', () => {
    const error = validateIva(10000, 1600.005);
    expect(error).toBeNull();
  });
});

describe('Total Calculation Validation', () => {
  it('should validate correct total', () => {
    const error = validateTotal(10000, 1600, 11600);
    expect(error).toBeNull();
  });

  it('should detect incorrect total', () => {
    const error = validateTotal(10000, 1600, 12000);
    expect(error).not.toBeNull();
    expect(error?.field).toBe('total');
    expect(error?.expected).toBe(11600);
    expect(error?.actual).toBe(12000);
  });

  it('should show expected value in error message', () => {
    const error = validateTotal(10000, 1600, 12000);
    expect(error?.message).toContain('subtotal + IVA');
    expect(error?.message).toContain('$11,600.00');
  });

  it('should handle decimal amounts', () => {
    const error = validateTotal(1234.56, 197.53, 1432.09);
    expect(error).toBeNull();
  });
});

describe('Complete Invoice Math Validation', () => {
  it('should pass for valid invoice', () => {
    const result = validateInvoiceMath({
      subtotal: 10000,
      iva: 1600,
      total: 11600,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect IVA error only', () => {
    const result = validateInvoiceMath({
      subtotal: 10000,
      iva: 1500,
      total: 11500,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('iva');
  });

  it('should detect total error only', () => {
    const result = validateInvoiceMath({
      subtotal: 10000,
      iva: 1600,
      total: 12000,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('total');
  });

  it('should detect multiple errors', () => {
    const result = validateInvoiceMath({
      subtotal: 10000,
      iva: 1500,
      total: 12000,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe('Line Item Amount Validation', () => {
  it('should validate correct line item amount', () => {
    const result = validateLineItem('item1', 5, 100, 500);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should detect incorrect line item amount', () => {
    const result = validateLineItem('item1', 5, 100, 600);
    expect(result.isValid).toBe(false);
    expect(result.expected).toBe(500);
    expect(result.actual).toBe(600);
  });

  it('should include calculation in error message', () => {
    const result = validateLineItem('item1', 3, 250, 800);
    expect(result.error).toContain('750');
    expect(result.error).toContain('3');
    expect(result.error).toContain('250');
  });

  it('should handle decimal calculations', () => {
    const result = validateLineItem('item1', 2.5, 99.99, 249.98);
    expect(result.isValid).toBe(true);
  });

  it('should validate multiple line items', () => {
    const items = [
      { id: '1', quantity: 2, unitPrice: 100, amount: 200 },
      { id: '2', quantity: 3, unitPrice: 50, amount: 160 }, // Wrong
      { id: '3', quantity: 1, unitPrice: 500, amount: 500 },
    ];
    const results = validateLineItems(items);

    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[2].isValid).toBe(true);
  });
});

describe('Subtotal vs Line Items Validation', () => {
  it('should validate matching subtotal', () => {
    const items = [
      { amount: 500 },
      { amount: 300 },
      { amount: 200 },
    ];
    const error = validateSubtotalMatchesItems(1000, items);
    expect(error).toBeNull();
  });

  it('should detect subtotal mismatch', () => {
    const items = [
      { amount: 500 },
      { amount: 300 },
    ];
    const error = validateSubtotalMatchesItems(1000, items);
    expect(error).not.toBeNull();
    expect(error?.expected).toBe(800);
    expect(error?.actual).toBe(1000);
  });

  it('should handle empty line items', () => {
    const error = validateSubtotalMatchesItems(1000, []);
    expect(error).not.toBeNull();
    expect(error?.expected).toBe(0);
  });
});

describe('Math Error Highlighting Classes', () => {
  it('should return red highlight class for error', () => {
    const className = getMathErrorHighlightClass(true);
    expect(className).toContain('border-red-500');
    expect(className).toContain('bg-red-50');
    expect(className).toContain('ring-red-300');
  });

  it('should return empty class for no error', () => {
    const className = getMathErrorHighlightClass(false);
    expect(className).toBe('');
  });
});

describe('Error Indicator Visibility', () => {
  it('should show indicator when error exists', () => {
    expect(shouldShowErrorIndicator(true)).toBe(true);
  });

  it('should hide indicator when no error', () => {
    expect(shouldShowErrorIndicator(false)).toBe(false);
  });
});

describe('Currency Formatting', () => {
  it('should format currency with Mexican locale', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format large amounts', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57');
  });
});

describe('Currency Parsing', () => {
  it('should parse currency string to number', () => {
    expect(parseCurrency('$1,000.00')).toBe(1000);
    expect(parseCurrency('1234.56')).toBe(1234.56);
    expect(parseCurrency('$10,000')).toBe(10000);
  });

  it('should handle invalid input', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('abc')).toBe(0);
    expect(parseCurrency('$')).toBe(0);
  });
});

describe('Expected IVA Calculation', () => {
  it('should calculate 16% of subtotal', () => {
    expect(calculateExpectedIva(10000)).toBe(1600);
    expect(calculateExpectedIva(5000)).toBe(800);
    expect(calculateExpectedIva(1234.56)).toBe(197.53);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateExpectedIva(100.33)).toBe(16.05);
  });
});

describe('Expected Total Calculation', () => {
  it('should sum subtotal and IVA', () => {
    expect(calculateExpectedTotal(10000, 1600)).toBe(11600);
    expect(calculateExpectedTotal(5000, 800)).toBe(5800);
  });

  it('should handle decimal amounts', () => {
    expect(calculateExpectedTotal(1234.56, 197.53)).toBe(1432.09);
  });
});

describe('Subtotal from Line Items Calculation', () => {
  it('should sum all line item amounts', () => {
    const items = [
      { amount: 500 },
      { amount: 300 },
      { amount: 200 },
    ];
    expect(calculateSubtotalFromItems(items)).toBe(1000);
  });

  it('should handle decimal amounts', () => {
    const items = [
      { amount: 123.45 },
      { amount: 67.89 },
    ];
    expect(calculateSubtotalFromItems(items)).toBe(191.34);
  });

  it('should return 0 for empty array', () => {
    expect(calculateSubtotalFromItems([])).toBe(0);
  });
});

describe('Tolerance Handling', () => {
  it('should accept values within default tolerance', () => {
    expect(isWithinTolerance(100.00, 100.005)).toBe(true);
    expect(isWithinTolerance(100.00, 100.009)).toBe(true);
  });

  it('should accept values at exactly the tolerance boundary', () => {
    // Default tolerance is 0.01, so difference of 0.01 should pass
    expect(isWithinTolerance(100, 100.01, 0.01)).toBe(true);
    expect(isWithinTolerance(100, 99.99, 0.01)).toBe(true);
  });

  it('should reject values outside tolerance', () => {
    expect(isWithinTolerance(100.00, 100.02)).toBe(false);
    expect(isWithinTolerance(100.00, 99.98)).toBe(false);
  });

  it('should respect custom tolerance', () => {
    expect(isWithinTolerance(100, 101, 1)).toBe(true);
    expect(isWithinTolerance(100, 102, 1)).toBe(false);
  });
});

describe('Real-time Validation Flow', () => {
  it('should validate on each field change', () => {
    // Simulate typing in subtotal
    let amounts: InvoiceAmounts = { subtotal: 0, iva: 0, total: 0 };

    // User types subtotal
    amounts.subtotal = 10000;
    let result = validateInvoiceMath(amounts);
    expect(result.isValid).toBe(false); // IVA and total are wrong

    // User types IVA
    amounts.iva = 1600;
    result = validateInvoiceMath(amounts);
    expect(result.isValid).toBe(false); // Total still wrong

    // User types total
    amounts.total = 11600;
    result = validateInvoiceMath(amounts);
    expect(result.isValid).toBe(true); // All correct now
  });

  it('should detect error immediately when value changes', () => {
    const amounts: InvoiceAmounts = { subtotal: 10000, iva: 1600, total: 11600 };

    // User changes subtotal, breaking the math
    amounts.subtotal = 12000;
    const result = validateInvoiceMath(amounts);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'iva')).toBe(true);
    expect(result.errors.some(e => e.field === 'total')).toBe(true);
  });
});
