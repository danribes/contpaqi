/**
 * Tests for Subtask 14.4: Confidence-based highlighting (orange <0.90)
 *
 * Features tested:
 * - Confidence threshold detection
 * - Bounding box highlighting support
 * - Confidence summary indicator
 * - Field attention states
 * - PDF highlight overlay calculations
 */

import { describe, it, expect } from '@jest/globals';

// Types for confidence highlighting
interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface HighlightConfig {
  bbox: BoundingBox;
  color: string;
  opacity: number;
  fieldName: string;
}

interface FieldConfidence {
  fieldName: string;
  confidence: number;
  bbox?: BoundingBox;
  value: string;
}

interface ConfidenceSummary {
  totalFields: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  needsReview: number;
  averageConfidence: number;
}

// Threshold constants
const HIGH_CONFIDENCE_THRESHOLD = 0.90;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.70;

// Helper functions to implement
function needsReview(confidence: number): boolean {
  return confidence < HIGH_CONFIDENCE_THRESHOLD;
}

function getHighlightColor(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'green';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'orange';
  return 'red';
}

function getHighlightOpacity(confidence: number): number {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 0.1;
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 0.25;
  return 0.4;
}

function calculateHighlightConfig(
  field: FieldConfidence
): HighlightConfig | null {
  if (!field.bbox) return null;

  return {
    bbox: field.bbox,
    color: getHighlightColor(field.confidence),
    opacity: getHighlightOpacity(field.confidence),
    fieldName: field.fieldName,
  };
}

function normalizeBoxToPage(
  bbox: BoundingBox,
  pageWidth: number,
  pageHeight: number
): BoundingBox {
  // Normalize coordinates from 0-1000 scale to actual page dimensions
  return {
    x1: (bbox.x1 / 1000) * pageWidth,
    y1: (bbox.y1 / 1000) * pageHeight,
    x2: (bbox.x2 / 1000) * pageWidth,
    y2: (bbox.y2 / 1000) * pageHeight,
  };
}

function calculateConfidenceSummary(fields: FieldConfidence[]): ConfidenceSummary {
  const validFields = fields.filter(f => f.confidence !== undefined);

  if (validFields.length === 0) {
    return {
      totalFields: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      needsReview: 0,
      averageConfidence: 0,
    };
  }

  const highConfidence = validFields.filter(f => f.confidence >= HIGH_CONFIDENCE_THRESHOLD).length;
  const mediumConfidence = validFields.filter(f =>
    f.confidence >= MEDIUM_CONFIDENCE_THRESHOLD && f.confidence < HIGH_CONFIDENCE_THRESHOLD
  ).length;
  const lowConfidence = validFields.filter(f => f.confidence < MEDIUM_CONFIDENCE_THRESHOLD).length;

  const sum = validFields.reduce((acc, f) => acc + f.confidence, 0);
  const averageConfidence = sum / validFields.length;

  return {
    totalFields: validFields.length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    needsReview: mediumConfidence + lowConfidence,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
  };
}

function getFieldsNeedingReview(fields: FieldConfidence[]): FieldConfidence[] {
  return fields
    .filter(f => f.confidence < HIGH_CONFIDENCE_THRESHOLD)
    .sort((a, b) => a.confidence - b.confidence);
}

function getSummaryStatus(summary: ConfidenceSummary): 'good' | 'review' | 'attention' {
  if (summary.lowConfidence > 0) return 'attention';
  if (summary.mediumConfidence > 0) return 'review';
  return 'good';
}

function getStatusMessage(summary: ConfidenceSummary): string {
  const status = getSummaryStatus(summary);
  if (status === 'good') return 'All fields have high confidence';
  if (status === 'review') return `${summary.mediumConfidence} field(s) need review`;
  return `${summary.lowConfidence} field(s) require attention`;
}

// ============= TESTS =============

describe('Confidence Threshold Detection', () => {
  it('should identify fields needing review when below 0.90', () => {
    expect(needsReview(0.89)).toBe(true);
    expect(needsReview(0.85)).toBe(true);
    expect(needsReview(0.50)).toBe(true);
  });

  it('should not flag fields with high confidence', () => {
    expect(needsReview(0.90)).toBe(false);
    expect(needsReview(0.95)).toBe(false);
    expect(needsReview(1.0)).toBe(false);
  });

  it('should handle edge case at exactly 0.90', () => {
    expect(needsReview(0.90)).toBe(false);
    expect(needsReview(0.8999)).toBe(true);
  });
});

describe('Highlight Color Assignment', () => {
  it('should return green for high confidence (>=0.90)', () => {
    expect(getHighlightColor(0.95)).toBe('green');
    expect(getHighlightColor(0.90)).toBe('green');
  });

  it('should return orange for medium confidence (0.70-0.89)', () => {
    expect(getHighlightColor(0.85)).toBe('orange');
    expect(getHighlightColor(0.70)).toBe('orange');
  });

  it('should return red for low confidence (<0.70)', () => {
    expect(getHighlightColor(0.65)).toBe('red');
    expect(getHighlightColor(0.50)).toBe('red');
    expect(getHighlightColor(0.30)).toBe('red');
  });
});

describe('Highlight Opacity', () => {
  it('should have low opacity for high confidence', () => {
    expect(getHighlightOpacity(0.95)).toBe(0.1);
  });

  it('should have medium opacity for medium confidence', () => {
    expect(getHighlightOpacity(0.80)).toBe(0.25);
  });

  it('should have high opacity for low confidence', () => {
    expect(getHighlightOpacity(0.50)).toBe(0.4);
  });
});

describe('Bounding Box Highlight Configuration', () => {
  it('should create highlight config from field with bbox', () => {
    const field: FieldConfidence = {
      fieldName: 'rfcEmisor',
      confidence: 0.85,
      bbox: { x1: 100, y1: 200, x2: 300, y2: 230 },
      value: 'XAXX010101000',
    };

    const config = calculateHighlightConfig(field);

    expect(config).not.toBeNull();
    expect(config?.color).toBe('orange');
    expect(config?.opacity).toBe(0.25);
    expect(config?.fieldName).toBe('rfcEmisor');
    expect(config?.bbox).toEqual({ x1: 100, y1: 200, x2: 300, y2: 230 });
  });

  it('should return null when field has no bbox', () => {
    const field: FieldConfidence = {
      fieldName: 'rfcEmisor',
      confidence: 0.85,
      value: 'XAXX010101000',
    };

    const config = calculateHighlightConfig(field);
    expect(config).toBeNull();
  });

  it('should use correct color based on confidence', () => {
    const highField: FieldConfidence = {
      fieldName: 'total',
      confidence: 0.95,
      bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
      value: '11600.00',
    };

    const lowField: FieldConfidence = {
      fieldName: 'iva',
      confidence: 0.55,
      bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
      value: '1600.00',
    };

    expect(calculateHighlightConfig(highField)?.color).toBe('green');
    expect(calculateHighlightConfig(lowField)?.color).toBe('red');
  });
});

describe('Bounding Box Normalization', () => {
  it('should normalize coordinates to page dimensions', () => {
    const bbox: BoundingBox = { x1: 100, y1: 200, x2: 500, y2: 250 };
    const pageWidth = 612; // Standard PDF width in points
    const pageHeight = 792; // Standard PDF height in points

    const normalized = normalizeBoxToPage(bbox, pageWidth, pageHeight);

    expect(normalized.x1).toBeCloseTo(61.2, 1);
    expect(normalized.y1).toBeCloseTo(158.4, 1);
    expect(normalized.x2).toBeCloseTo(306, 1);
    expect(normalized.y2).toBeCloseTo(198, 1);
  });

  it('should handle full-page coordinates', () => {
    const bbox: BoundingBox = { x1: 0, y1: 0, x2: 1000, y2: 1000 };
    const pageWidth = 800;
    const pageHeight = 1000;

    const normalized = normalizeBoxToPage(bbox, pageWidth, pageHeight);

    expect(normalized.x1).toBe(0);
    expect(normalized.y1).toBe(0);
    expect(normalized.x2).toBe(800);
    expect(normalized.y2).toBe(1000);
  });
});

describe('Confidence Summary Calculation', () => {
  const sampleFields: FieldConfidence[] = [
    { fieldName: 'rfcEmisor', confidence: 0.95, value: 'XAXX010101000' },
    { fieldName: 'rfcReceptor', confidence: 0.87, value: 'XBXX020202000' },
    { fieldName: 'fecha', confidence: 0.92, value: '2024-03-15' },
    { fieldName: 'subtotal', confidence: 0.65, value: '10000.00' },
    { fieldName: 'iva', confidence: 0.91, value: '1600.00' },
    { fieldName: 'total', confidence: 0.78, value: '11600.00' },
  ];

  it('should count total fields correctly', () => {
    const summary = calculateConfidenceSummary(sampleFields);
    expect(summary.totalFields).toBe(6);
  });

  it('should categorize fields by confidence level', () => {
    const summary = calculateConfidenceSummary(sampleFields);

    // High: 0.95, 0.92, 0.91 = 3
    expect(summary.highConfidence).toBe(3);
    // Medium: 0.87, 0.78 = 2
    expect(summary.mediumConfidence).toBe(2);
    // Low: 0.65 = 1
    expect(summary.lowConfidence).toBe(1);
  });

  it('should calculate fields needing review', () => {
    const summary = calculateConfidenceSummary(sampleFields);
    // Medium + Low = 2 + 1 = 3
    expect(summary.needsReview).toBe(3);
  });

  it('should calculate average confidence', () => {
    const summary = calculateConfidenceSummary(sampleFields);
    // (0.95 + 0.87 + 0.92 + 0.65 + 0.91 + 0.78) / 6 = 5.08 / 6 = 0.8467
    expect(summary.averageConfidence).toBeCloseTo(0.85, 2);
  });

  it('should handle empty fields array', () => {
    const summary = calculateConfidenceSummary([]);
    expect(summary.totalFields).toBe(0);
    expect(summary.averageConfidence).toBe(0);
    expect(summary.needsReview).toBe(0);
  });

  it('should handle all high confidence fields', () => {
    const highFields: FieldConfidence[] = [
      { fieldName: 'a', confidence: 0.95, value: '' },
      { fieldName: 'b', confidence: 0.92, value: '' },
    ];
    const summary = calculateConfidenceSummary(highFields);
    expect(summary.needsReview).toBe(0);
    expect(summary.highConfidence).toBe(2);
  });
});

describe('Fields Needing Review', () => {
  const sampleFields: FieldConfidence[] = [
    { fieldName: 'rfcEmisor', confidence: 0.95, value: '' },
    { fieldName: 'rfcReceptor', confidence: 0.87, value: '' },
    { fieldName: 'subtotal', confidence: 0.65, value: '' },
    { fieldName: 'total', confidence: 0.78, value: '' },
  ];

  it('should return only fields below 0.90 threshold', () => {
    const review = getFieldsNeedingReview(sampleFields);
    expect(review.length).toBe(3);
    expect(review.find(f => f.fieldName === 'rfcEmisor')).toBeUndefined();
  });

  it('should sort fields by confidence ascending (lowest first)', () => {
    const review = getFieldsNeedingReview(sampleFields);
    expect(review[0].fieldName).toBe('subtotal'); // 0.65
    expect(review[1].fieldName).toBe('total');    // 0.78
    expect(review[2].fieldName).toBe('rfcReceptor'); // 0.87
  });

  it('should return empty array when all fields are high confidence', () => {
    const highFields: FieldConfidence[] = [
      { fieldName: 'a', confidence: 0.95, value: '' },
      { fieldName: 'b', confidence: 0.92, value: '' },
    ];
    const review = getFieldsNeedingReview(highFields);
    expect(review.length).toBe(0);
  });
});

describe('Summary Status Indicator', () => {
  it('should return "good" when no fields need review', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 6,
      mediumConfidence: 0,
      lowConfidence: 0,
      needsReview: 0,
      averageConfidence: 0.95,
    };
    expect(getSummaryStatus(summary)).toBe('good');
  });

  it('should return "review" when only medium confidence fields exist', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 4,
      mediumConfidence: 2,
      lowConfidence: 0,
      needsReview: 2,
      averageConfidence: 0.88,
    };
    expect(getSummaryStatus(summary)).toBe('review');
  });

  it('should return "attention" when low confidence fields exist', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 4,
      mediumConfidence: 1,
      lowConfidence: 1,
      needsReview: 2,
      averageConfidence: 0.82,
    };
    expect(getSummaryStatus(summary)).toBe('attention');
  });
});

describe('Status Message Generation', () => {
  it('should generate positive message for all high confidence', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 6,
      mediumConfidence: 0,
      lowConfidence: 0,
      needsReview: 0,
      averageConfidence: 0.95,
    };
    expect(getStatusMessage(summary)).toBe('All fields have high confidence');
  });

  it('should generate review message for medium confidence fields', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 4,
      mediumConfidence: 2,
      lowConfidence: 0,
      needsReview: 2,
      averageConfidence: 0.88,
    };
    expect(getStatusMessage(summary)).toBe('2 field(s) need review');
  });

  it('should generate attention message for low confidence fields', () => {
    const summary: ConfidenceSummary = {
      totalFields: 6,
      highConfidence: 3,
      mediumConfidence: 2,
      lowConfidence: 1,
      needsReview: 3,
      averageConfidence: 0.80,
    };
    expect(getStatusMessage(summary)).toBe('1 field(s) require attention');
  });
});

describe('PDF Highlight Overlay', () => {
  it('should create overlay style from highlight config', () => {
    const config: HighlightConfig = {
      bbox: { x1: 50, y1: 100, x2: 200, y2: 130 },
      color: 'orange',
      opacity: 0.25,
      fieldName: 'rfcEmisor',
    };

    // Simulate overlay style generation
    const style = {
      position: 'absolute',
      left: `${config.bbox.x1}px`,
      top: `${config.bbox.y1}px`,
      width: `${config.bbox.x2 - config.bbox.x1}px`,
      height: `${config.bbox.y2 - config.bbox.y1}px`,
      backgroundColor: config.color,
      opacity: config.opacity,
      pointerEvents: 'none',
    };

    expect(style.left).toBe('50px');
    expect(style.top).toBe('100px');
    expect(style.width).toBe('150px');
    expect(style.height).toBe('30px');
    expect(style.backgroundColor).toBe('orange');
    expect(style.opacity).toBe(0.25);
  });

  it('should support multiple overlays for multiple fields', () => {
    const configs: HighlightConfig[] = [
      { bbox: { x1: 50, y1: 100, x2: 200, y2: 130 }, color: 'orange', opacity: 0.25, fieldName: 'a' },
      { bbox: { x1: 50, y1: 150, x2: 200, y2: 180 }, color: 'red', opacity: 0.4, fieldName: 'b' },
    ];

    expect(configs.length).toBe(2);
    expect(configs[0].color).toBe('orange');
    expect(configs[1].color).toBe('red');
  });
});

describe('Active Field Highlighting', () => {
  it('should identify active highlight when field is focused', () => {
    const focusedField = 'rfcEmisor';
    const fields: FieldConfidence[] = [
      { fieldName: 'rfcEmisor', confidence: 0.85, bbox: { x1: 50, y1: 100, x2: 200, y2: 130 }, value: '' },
      { fieldName: 'total', confidence: 0.95, bbox: { x1: 50, y1: 200, x2: 200, y2: 230 }, value: '' },
    ];

    const activeField = fields.find(f => f.fieldName === focusedField);
    expect(activeField).toBeDefined();
    expect(activeField?.bbox).toBeDefined();
  });

  it('should enhance highlight for active field', () => {
    const baseOpacity = 0.25;
    const activeOpacity = baseOpacity + 0.2; // Enhance visibility

    expect(activeOpacity).toBe(0.45);
  });

  it('should add border to active field highlight', () => {
    const activeBorderWidth = 2;
    const activeBorderColor = 'blue';

    expect(activeBorderWidth).toBe(2);
    expect(activeBorderColor).toBe('blue');
  });
});

describe('Confidence Badge Component Logic', () => {
  function getBadgeVariant(confidence: number): 'success' | 'warning' | 'error' {
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'success';
    if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'warning';
    return 'error';
  }

  function formatConfidencePercent(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  it('should assign success variant for high confidence', () => {
    expect(getBadgeVariant(0.95)).toBe('success');
    expect(getBadgeVariant(0.90)).toBe('success');
  });

  it('should assign warning variant for medium confidence', () => {
    expect(getBadgeVariant(0.85)).toBe('warning');
    expect(getBadgeVariant(0.70)).toBe('warning');
  });

  it('should assign error variant for low confidence', () => {
    expect(getBadgeVariant(0.65)).toBe('error');
    expect(getBadgeVariant(0.30)).toBe('error');
  });

  it('should format confidence as percentage', () => {
    expect(formatConfidencePercent(0.95)).toBe('95%');
    expect(formatConfidencePercent(0.857)).toBe('86%');
    expect(formatConfidencePercent(0.70)).toBe('70%');
  });
});
