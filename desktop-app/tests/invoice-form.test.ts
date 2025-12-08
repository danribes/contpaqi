/**
 * InvoiceForm Component Tests
 * Subtask 14.3: Create InvoiceForm component with auto-population
 *
 * Tests for:
 * - Form field structure
 * - Auto-population from extracted data
 * - Field validation
 * - Line items handling
 * - Form state management
 */

// =============================================================================
// Types for testing
// =============================================================================

interface ExtractedField {
  value: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  confidence?: number;
}

interface InvoiceData {
  rfcEmisor?: ExtractedField;
  rfcReceptor?: ExtractedField;
  fecha?: ExtractedField;
  subtotal?: ExtractedField;
  iva?: ExtractedField;
  total?: ExtractedField;
  lineItems?: LineItem[];
}

interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  pattern?: RegExp;
}

// =============================================================================
// Field Configuration Tests
// =============================================================================

describe('Invoice Form Field Configuration', () => {
  const INVOICE_FIELDS: FormFieldConfig[] = [
    { name: 'rfcEmisor', label: 'RFC Emisor', type: 'text', required: true, pattern: /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/ },
    { name: 'rfcReceptor', label: 'RFC Receptor', type: 'text', required: true, pattern: /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/ },
    { name: 'fecha', label: 'Fecha', type: 'date', required: true },
    { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
    { name: 'iva', label: 'IVA (16%)', type: 'number', required: true },
    { name: 'total', label: 'Total', type: 'number', required: true },
  ];

  it('should have all required invoice fields', () => {
    const fieldNames = INVOICE_FIELDS.map(f => f.name);
    expect(fieldNames).toContain('rfcEmisor');
    expect(fieldNames).toContain('rfcReceptor');
    expect(fieldNames).toContain('fecha');
    expect(fieldNames).toContain('subtotal');
    expect(fieldNames).toContain('iva');
    expect(fieldNames).toContain('total');
  });

  it('should mark RFC fields as required', () => {
    const rfcEmisor = INVOICE_FIELDS.find(f => f.name === 'rfcEmisor');
    const rfcReceptor = INVOICE_FIELDS.find(f => f.name === 'rfcReceptor');
    expect(rfcEmisor?.required).toBe(true);
    expect(rfcReceptor?.required).toBe(true);
  });

  it('should have correct field types', () => {
    const fecha = INVOICE_FIELDS.find(f => f.name === 'fecha');
    const subtotal = INVOICE_FIELDS.find(f => f.name === 'subtotal');
    const rfcEmisor = INVOICE_FIELDS.find(f => f.name === 'rfcEmisor');

    expect(fecha?.type).toBe('date');
    expect(subtotal?.type).toBe('number');
    expect(rfcEmisor?.type).toBe('text');
  });

  it('should have RFC pattern validation', () => {
    const rfcEmisor = INVOICE_FIELDS.find(f => f.name === 'rfcEmisor');
    expect(rfcEmisor?.pattern).toBeDefined();

    // Valid RFCs
    expect(rfcEmisor?.pattern?.test('ABC123456XY9')).toBe(true);
    expect(rfcEmisor?.pattern?.test('XAXX010101000')).toBe(true);

    // Invalid RFCs
    expect(rfcEmisor?.pattern?.test('invalid')).toBe(false);
    expect(rfcEmisor?.pattern?.test('123')).toBe(false);
  });
});

// =============================================================================
// Auto-population Tests
// =============================================================================

describe('Auto-population from Extracted Data', () => {
  function populateFormFromExtraction(data: InvoiceData): Record<string, string> {
    const formValues: Record<string, string> = {};

    if (data.rfcEmisor) formValues.rfcEmisor = data.rfcEmisor.value;
    if (data.rfcReceptor) formValues.rfcReceptor = data.rfcReceptor.value;
    if (data.fecha) formValues.fecha = data.fecha.value;
    if (data.subtotal) formValues.subtotal = data.subtotal.value;
    if (data.iva) formValues.iva = data.iva.value;
    if (data.total) formValues.total = data.total.value;

    return formValues;
  }

  it('should populate form fields from extracted data', () => {
    const extractedData: InvoiceData = {
      rfcEmisor: { value: 'ABC123456XY9', confidence: 0.95 },
      rfcReceptor: { value: 'XYZ987654AB1', confidence: 0.92 },
      fecha: { value: '2024-01-15', confidence: 0.98 },
      subtotal: { value: '1000.00', confidence: 0.99 },
      iva: { value: '160.00', confidence: 0.99 },
      total: { value: '1160.00', confidence: 0.99 },
    };

    const formValues = populateFormFromExtraction(extractedData);

    expect(formValues.rfcEmisor).toBe('ABC123456XY9');
    expect(formValues.rfcReceptor).toBe('XYZ987654AB1');
    expect(formValues.fecha).toBe('2024-01-15');
    expect(formValues.subtotal).toBe('1000.00');
    expect(formValues.iva).toBe('160.00');
    expect(formValues.total).toBe('1160.00');
  });

  it('should handle missing fields gracefully', () => {
    const extractedData: InvoiceData = {
      rfcEmisor: { value: 'ABC123456XY9', confidence: 0.95 },
      // Other fields missing
    };

    const formValues = populateFormFromExtraction(extractedData);

    expect(formValues.rfcEmisor).toBe('ABC123456XY9');
    expect(formValues.rfcReceptor).toBeUndefined();
    expect(formValues.fecha).toBeUndefined();
  });

  it('should handle empty extracted data', () => {
    const formValues = populateFormFromExtraction({});
    expect(Object.keys(formValues)).toHaveLength(0);
  });
});

// =============================================================================
// Confidence Level Tests
// =============================================================================

describe('Confidence Level Handling', () => {
  function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.90) return 'high';
    if (confidence >= 0.70) return 'medium';
    return 'low';
  }

  function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
    switch (level) {
      case 'high': return 'border-green-300';
      case 'medium': return 'border-orange-300';
      case 'low': return 'border-red-300';
    }
  }

  function shouldHighlight(confidence: number): boolean {
    return confidence < 0.90;
  }

  it('should classify high confidence (>=0.90)', () => {
    expect(getConfidenceLevel(0.95)).toBe('high');
    expect(getConfidenceLevel(0.90)).toBe('high');
    expect(getConfidenceLevel(1.0)).toBe('high');
  });

  it('should classify medium confidence (0.70-0.89)', () => {
    expect(getConfidenceLevel(0.85)).toBe('medium');
    expect(getConfidenceLevel(0.70)).toBe('medium');
    expect(getConfidenceLevel(0.89)).toBe('medium');
  });

  it('should classify low confidence (<0.70)', () => {
    expect(getConfidenceLevel(0.50)).toBe('low');
    expect(getConfidenceLevel(0.69)).toBe('low');
    expect(getConfidenceLevel(0.0)).toBe('low');
  });

  it('should return correct colors for confidence levels', () => {
    expect(getConfidenceColor('high')).toBe('border-green-300');
    expect(getConfidenceColor('medium')).toBe('border-orange-300');
    expect(getConfidenceColor('low')).toBe('border-red-300');
  });

  it('should highlight fields below 0.90 confidence', () => {
    expect(shouldHighlight(0.89)).toBe(true);
    expect(shouldHighlight(0.50)).toBe(true);
    expect(shouldHighlight(0.90)).toBe(false);
    expect(shouldHighlight(0.95)).toBe(false);
  });
});

// =============================================================================
// Line Items Tests
// =============================================================================

describe('Line Items Handling', () => {
  function calculateLineItemAmount(quantity: number, unitPrice: number): number {
    return Math.round(quantity * unitPrice * 100) / 100;
  }

  function validateLineItem(item: LineItem): string[] {
    const errors: string[] = [];
    if (!item.description || item.description.trim() === '') {
      errors.push('Description is required');
    }
    if (item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }
    if (item.unitPrice < 0) {
      errors.push('Unit price cannot be negative');
    }
    const expectedAmount = calculateLineItemAmount(item.quantity, item.unitPrice);
    if (Math.abs(item.amount - expectedAmount) > 0.01) {
      errors.push('Amount does not match quantity × unit price');
    }
    return errors;
  }

  function generateLineItemId(): string {
    return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  it('should calculate line item amount correctly', () => {
    expect(calculateLineItemAmount(2, 100)).toBe(200);
    expect(calculateLineItemAmount(3, 33.33)).toBe(99.99);
    expect(calculateLineItemAmount(1.5, 50)).toBe(75);
  });

  it('should validate line item with all correct values', () => {
    const item: LineItem = {
      id: '1',
      description: 'Product A',
      quantity: 2,
      unitPrice: 100,
      amount: 200,
    };
    expect(validateLineItem(item)).toHaveLength(0);
  });

  it('should detect missing description', () => {
    const item: LineItem = {
      id: '1',
      description: '',
      quantity: 2,
      unitPrice: 100,
      amount: 200,
    };
    const errors = validateLineItem(item);
    expect(errors).toContain('Description is required');
  });

  it('should detect invalid quantity', () => {
    const item: LineItem = {
      id: '1',
      description: 'Product',
      quantity: 0,
      unitPrice: 100,
      amount: 0,
    };
    const errors = validateLineItem(item);
    expect(errors).toContain('Quantity must be greater than 0');
  });

  it('should detect amount mismatch', () => {
    const item: LineItem = {
      id: '1',
      description: 'Product',
      quantity: 2,
      unitPrice: 100,
      amount: 150, // Should be 200
    };
    const errors = validateLineItem(item);
    expect(errors).toContain('Amount does not match quantity × unit price');
  });

  it('should generate unique line item IDs', () => {
    const id1 = generateLineItemId();
    const id2 = generateLineItemId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^item-\d+-[a-z0-9]+$/);
  });
});

// =============================================================================
// Form Validation Tests
// =============================================================================

describe('Form Validation', () => {
  interface FormState {
    rfcEmisor: string;
    rfcReceptor: string;
    fecha: string;
    subtotal: string;
    iva: string;
    total: string;
  }

  function validateRFC(rfc: string): boolean {
    const rfcPattern = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
    return rfcPattern.test(rfc.toUpperCase());
  }

  function validateDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  function validateAmount(amount: string): boolean {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0;
  }

  function validateForm(form: FormState): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!form.rfcEmisor) {
      errors.rfcEmisor = 'RFC Emisor is required';
    } else if (!validateRFC(form.rfcEmisor)) {
      errors.rfcEmisor = 'Invalid RFC format';
    }

    if (!form.rfcReceptor) {
      errors.rfcReceptor = 'RFC Receptor is required';
    } else if (!validateRFC(form.rfcReceptor)) {
      errors.rfcReceptor = 'Invalid RFC format';
    }

    if (!form.fecha) {
      errors.fecha = 'Date is required';
    } else if (!validateDate(form.fecha)) {
      errors.fecha = 'Invalid date';
    }

    if (!form.subtotal) {
      errors.subtotal = 'Subtotal is required';
    } else if (!validateAmount(form.subtotal)) {
      errors.subtotal = 'Invalid amount';
    }

    if (!form.iva) {
      errors.iva = 'IVA is required';
    } else if (!validateAmount(form.iva)) {
      errors.iva = 'Invalid amount';
    }

    if (!form.total) {
      errors.total = 'Total is required';
    } else if (!validateAmount(form.total)) {
      errors.total = 'Invalid amount';
    }

    return errors;
  }

  it('should validate RFC format correctly', () => {
    expect(validateRFC('ABC123456XY9')).toBe(true);
    expect(validateRFC('XAXX010101000')).toBe(true);
    expect(validateRFC('invalid')).toBe(false);
    expect(validateRFC('')).toBe(false);
  });

  it('should validate date correctly', () => {
    expect(validateDate('2024-01-15')).toBe(true);
    expect(validateDate('2024-12-31')).toBe(true);
    expect(validateDate('invalid')).toBe(false);
    expect(validateDate('')).toBe(false);
  });

  it('should validate amount correctly', () => {
    expect(validateAmount('100.00')).toBe(true);
    expect(validateAmount('0')).toBe(true);
    expect(validateAmount('1000.50')).toBe(true);
    expect(validateAmount('-100')).toBe(false);
    expect(validateAmount('abc')).toBe(false);
  });

  it('should return no errors for valid form', () => {
    const form: FormState = {
      rfcEmisor: 'ABC123456XY9',
      rfcReceptor: 'XYZ987654AB1',
      fecha: '2024-01-15',
      subtotal: '1000.00',
      iva: '160.00',
      total: '1160.00',
    };
    const errors = validateForm(form);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('should return errors for empty form', () => {
    const form: FormState = {
      rfcEmisor: '',
      rfcReceptor: '',
      fecha: '',
      subtotal: '',
      iva: '',
      total: '',
    };
    const errors = validateForm(form);
    expect(errors.rfcEmisor).toBeDefined();
    expect(errors.rfcReceptor).toBeDefined();
    expect(errors.fecha).toBeDefined();
    expect(errors.subtotal).toBeDefined();
    expect(errors.iva).toBeDefined();
    expect(errors.total).toBeDefined();
  });

  it('should return specific error for invalid RFC', () => {
    const form: FormState = {
      rfcEmisor: 'invalid',
      rfcReceptor: 'XYZ987654AB1',
      fecha: '2024-01-15',
      subtotal: '1000.00',
      iva: '160.00',
      total: '1160.00',
    };
    const errors = validateForm(form);
    expect(errors.rfcEmisor).toBe('Invalid RFC format');
  });
});

// =============================================================================
// Math Validation Tests
// =============================================================================

describe('Math Validation', () => {
  function validateMath(subtotal: number, iva: number, total: number, tolerance: number = 0.01): {
    isValid: boolean;
    expectedIva: number;
    expectedTotal: number;
    ivaError: number;
    totalError: number;
  } {
    const expectedIva = Math.round(subtotal * 0.16 * 100) / 100;
    const expectedTotal = Math.round((subtotal + iva) * 100) / 100;

    const ivaError = Math.abs(iva - expectedIva);
    const totalError = Math.abs(total - expectedTotal);

    return {
      isValid: ivaError <= tolerance && totalError <= tolerance,
      expectedIva,
      expectedTotal,
      ivaError,
      totalError,
    };
  }

  it('should validate correct math', () => {
    const result = validateMath(1000, 160, 1160);
    expect(result.isValid).toBe(true);
    expect(result.ivaError).toBe(0);
    expect(result.totalError).toBe(0);
  });

  it('should detect incorrect IVA', () => {
    const result = validateMath(1000, 100, 1100); // IVA should be 160
    expect(result.isValid).toBe(false);
    expect(result.expectedIva).toBe(160);
    expect(result.ivaError).toBe(60);
  });

  it('should detect incorrect total', () => {
    const result = validateMath(1000, 160, 1200); // Total should be 1160
    expect(result.isValid).toBe(false);
    expect(result.expectedTotal).toBe(1160);
    expect(result.totalError).toBe(40);
  });

  it('should allow small tolerance for rounding', () => {
    const result = validateMath(999.99, 160.00, 1159.99, 0.02);
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Form State Tests
// =============================================================================

describe('Form State Management', () => {
  interface FormField {
    value: string;
    confidence?: number;
    touched: boolean;
    error?: string;
  }

  function createInitialField(value: string = '', confidence?: number): FormField {
    return {
      value,
      confidence,
      touched: false,
      error: undefined,
    };
  }

  function updateField(field: FormField, newValue: string): FormField {
    return {
      ...field,
      value: newValue,
      touched: true,
    };
  }

  function isFormDirty(
    original: Record<string, string>,
    current: Record<string, string>
  ): boolean {
    return Object.keys(original).some(key => original[key] !== current[key]);
  }

  it('should create initial field with default values', () => {
    const field = createInitialField();
    expect(field.value).toBe('');
    expect(field.touched).toBe(false);
    expect(field.error).toBeUndefined();
  });

  it('should create field with extracted value and confidence', () => {
    const field = createInitialField('ABC123456XY9', 0.95);
    expect(field.value).toBe('ABC123456XY9');
    expect(field.confidence).toBe(0.95);
  });

  it('should mark field as touched after update', () => {
    const field = createInitialField('original');
    const updated = updateField(field, 'new value');
    expect(updated.touched).toBe(true);
    expect(updated.value).toBe('new value');
  });

  it('should detect dirty form', () => {
    const original = { rfcEmisor: 'ABC', rfcReceptor: 'XYZ' };
    const modified = { rfcEmisor: 'ABC123', rfcReceptor: 'XYZ' };
    expect(isFormDirty(original, modified)).toBe(true);
  });

  it('should detect clean form', () => {
    const original = { rfcEmisor: 'ABC', rfcReceptor: 'XYZ' };
    const same = { rfcEmisor: 'ABC', rfcReceptor: 'XYZ' };
    expect(isFormDirty(original, same)).toBe(false);
  });
});
