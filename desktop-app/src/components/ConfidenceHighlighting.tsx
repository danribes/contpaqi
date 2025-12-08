/**
 * Confidence Highlighting Components and Utilities
 * Subtask 14.4: Implement confidence-based highlighting (orange <0.90)
 *
 * Provides:
 * - Utility functions for confidence thresholds and colors
 * - ConfidenceSummary component showing field status
 * - PDFHighlightOverlay component for bounding box highlighting
 * - ConfidenceBadge component for individual field indicators
 */

import { useMemo } from 'react';

// ============= Types =============

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface HighlightConfig {
  bbox: BoundingBox;
  color: string;
  opacity: number;
  fieldName: string;
}

export interface FieldConfidence {
  fieldName: string;
  confidence: number;
  bbox?: BoundingBox;
  value: string;
}

export interface ConfidenceSummaryData {
  totalFields: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  needsReview: number;
  averageConfidence: number;
}

// ============= Constants =============

export const HIGH_CONFIDENCE_THRESHOLD = 0.90;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.70;

// ============= Utility Functions =============

/**
 * Check if a field needs review based on confidence threshold
 */
export function needsReview(confidence: number): boolean {
  return confidence < HIGH_CONFIDENCE_THRESHOLD;
}

/**
 * Get highlight color based on confidence level
 */
export function getHighlightColor(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'green';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'orange';
  return 'red';
}

/**
 * Get Tailwind CSS classes for highlight color
 */
export function getHighlightColorClass(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return 'bg-green-500';
  }
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return 'bg-orange-500';
  }
  return 'bg-red-500';
}

/**
 * Get highlight opacity based on confidence level
 * Lower confidence = higher opacity (more visible)
 */
export function getHighlightOpacity(confidence: number): number {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 0.1;
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 0.25;
  return 0.4;
}

/**
 * Calculate highlight configuration for a field
 */
export function calculateHighlightConfig(
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

/**
 * Normalize bounding box coordinates from 0-1000 scale to page dimensions
 */
export function normalizeBoxToPage(
  bbox: BoundingBox,
  pageWidth: number,
  pageHeight: number
): BoundingBox {
  return {
    x1: (bbox.x1 / 1000) * pageWidth,
    y1: (bbox.y1 / 1000) * pageHeight,
    x2: (bbox.x2 / 1000) * pageWidth,
    y2: (bbox.y2 / 1000) * pageHeight,
  };
}

/**
 * Calculate confidence summary from array of fields
 */
export function calculateConfidenceSummary(
  fields: FieldConfidence[]
): ConfidenceSummaryData {
  const validFields = fields.filter((f) => f.confidence !== undefined);

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

  const highConfidence = validFields.filter(
    (f) => f.confidence >= HIGH_CONFIDENCE_THRESHOLD
  ).length;
  const mediumConfidence = validFields.filter(
    (f) =>
      f.confidence >= MEDIUM_CONFIDENCE_THRESHOLD &&
      f.confidence < HIGH_CONFIDENCE_THRESHOLD
  ).length;
  const lowConfidence = validFields.filter(
    (f) => f.confidence < MEDIUM_CONFIDENCE_THRESHOLD
  ).length;

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

/**
 * Get fields that need review, sorted by confidence (lowest first)
 */
export function getFieldsNeedingReview(
  fields: FieldConfidence[]
): FieldConfidence[] {
  return fields
    .filter((f) => f.confidence < HIGH_CONFIDENCE_THRESHOLD)
    .sort((a, b) => a.confidence - b.confidence);
}

/**
 * Get summary status indicator
 */
export function getSummaryStatus(
  summary: ConfidenceSummaryData
): 'good' | 'review' | 'attention' {
  if (summary.lowConfidence > 0) return 'attention';
  if (summary.mediumConfidence > 0) return 'review';
  return 'good';
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(summary: ConfidenceSummaryData): string {
  const status = getSummaryStatus(summary);
  if (status === 'good') return 'All fields have high confidence';
  if (status === 'review')
    return `${summary.mediumConfidence} field(s) need review`;
  return `${summary.lowConfidence} field(s) require attention`;
}

/**
 * Get badge variant based on confidence
 */
export function getBadgeVariant(
  confidence: number
): 'success' | 'warning' | 'error' {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'success';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'warning';
  return 'error';
}

/**
 * Format confidence as percentage string
 */
export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// ============= Components =============

interface ConfidenceSummaryProps {
  fields: FieldConfidence[];
  onFieldClick?: (fieldName: string) => void;
  className?: string;
}

/**
 * Confidence Summary Component
 * Shows overview of field confidence levels and highlights fields needing review
 */
export function ConfidenceSummary({
  fields,
  onFieldClick,
  className = '',
}: ConfidenceSummaryProps) {
  const summary = useMemo(() => calculateConfidenceSummary(fields), [fields]);
  const fieldsNeedingReview = useMemo(
    () => getFieldsNeedingReview(fields),
    [fields]
  );
  const status = getSummaryStatus(summary);

  const statusColors = {
    good: 'bg-green-100 border-green-300 text-green-800',
    review: 'bg-orange-100 border-orange-300 text-orange-800',
    attention: 'bg-red-100 border-red-300 text-red-800',
  };

  const statusIcons = {
    good: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    review: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    attention: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]} ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {statusIcons[status]}
        <span className="font-semibold">{getStatusMessage(summary)}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div className="text-center">
          <div className="font-bold text-green-600">{summary.highConfidence}</div>
          <div className="text-xs text-gray-600">High</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-orange-600">{summary.mediumConfidence}</div>
          <div className="text-xs text-gray-600">Medium</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-red-600">{summary.lowConfidence}</div>
          <div className="text-xs text-gray-600">Low</div>
        </div>
      </div>

      {/* Average confidence */}
      <div className="text-sm text-center border-t border-current/20 pt-2">
        Average: <span className="font-semibold">{formatConfidencePercent(summary.averageConfidence)}</span>
      </div>

      {/* Fields needing review */}
      {fieldsNeedingReview.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="text-xs font-semibold mb-2">Fields to review:</div>
          <div className="flex flex-wrap gap-1">
            {fieldsNeedingReview.map((field) => (
              <button
                key={field.fieldName}
                onClick={() => onFieldClick?.(field.fieldName)}
                className={`
                  text-xs px-2 py-1 rounded
                  ${field.confidence < MEDIUM_CONFIDENCE_THRESHOLD
                    ? 'bg-red-200 hover:bg-red-300'
                    : 'bg-orange-200 hover:bg-orange-300'}
                  transition-colors cursor-pointer
                `}
              >
                {field.fieldName} ({formatConfidencePercent(field.confidence)})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ConfidenceBadgeProps {
  confidence: number;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Confidence Badge Component
 * Shows confidence level as a colored badge
 */
export function ConfidenceBadge({
  confidence,
  showPercent = true,
  size = 'sm',
  className = '',
}: ConfidenceBadgeProps) {
  const variant = getBadgeVariant(confidence);

  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-orange-100 text-orange-800 border-orange-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded border font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showPercent ? formatConfidencePercent(confidence) : ''}
      {!showPercent && (
        <span
          className={`w-2 h-2 rounded-full ${getHighlightColorClass(confidence)}`}
        />
      )}
    </span>
  );
}

interface PDFHighlightOverlayProps {
  highlights: HighlightConfig[];
  activeField?: string;
  pageWidth: number;
  pageHeight: number;
  scale?: number;
}

/**
 * PDF Highlight Overlay Component
 * Renders colored rectangles over PDF to highlight fields
 */
export function PDFHighlightOverlay({
  highlights,
  activeField,
  pageWidth,
  pageHeight,
  scale = 1,
}: PDFHighlightOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {highlights.map((highlight) => {
        const normalized = normalizeBoxToPage(
          highlight.bbox,
          pageWidth * scale,
          pageHeight * scale
        );
        const isActive = highlight.fieldName === activeField;

        // Map color names to Tailwind colors
        const colorMap: Record<string, string> = {
          green: 'rgba(34, 197, 94, ',   // green-500
          orange: 'rgba(249, 115, 22, ', // orange-500
          red: 'rgba(239, 68, 68, ',     // red-500
        };

        const baseColor = colorMap[highlight.color] || 'rgba(59, 130, 246, ';
        const opacity = isActive ? highlight.opacity + 0.2 : highlight.opacity;

        return (
          <div
            key={highlight.fieldName}
            className={`absolute transition-all duration-200 ${
              isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''
            }`}
            style={{
              left: `${normalized.x1}px`,
              top: `${normalized.y1}px`,
              width: `${normalized.x2 - normalized.x1}px`,
              height: `${normalized.y2 - normalized.y1}px`,
              backgroundColor: `${baseColor}${opacity})`,
              borderRadius: '2px',
            }}
            title={`${highlight.fieldName}`}
          />
        );
      })}
    </div>
  );
}

interface FieldHighlightIndicatorProps {
  confidence: number;
  isActive?: boolean;
  className?: string;
}

/**
 * Field Highlight Indicator
 * Visual indicator for form field highlighting
 */
export function FieldHighlightIndicator({
  confidence,
  isActive = false,
  className = '',
}: FieldHighlightIndicatorProps) {
  const needsAttention = confidence < HIGH_CONFIDENCE_THRESHOLD;

  if (!needsAttention && !isActive) return null;

  const baseClasses = confidence < MEDIUM_CONFIDENCE_THRESHOLD
    ? 'border-red-500 bg-red-50'
    : 'border-orange-500 bg-orange-50';

  return (
    <div
      className={`
        absolute inset-0 border-2 rounded pointer-events-none
        ${baseClasses}
        ${isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        ${className}
      `}
    />
  );
}

// Export all utilities and components
export default {
  // Constants
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
  // Utility functions
  needsReview,
  getHighlightColor,
  getHighlightColorClass,
  getHighlightOpacity,
  calculateHighlightConfig,
  normalizeBoxToPage,
  calculateConfidenceSummary,
  getFieldsNeedingReview,
  getSummaryStatus,
  getStatusMessage,
  getBadgeVariant,
  formatConfidencePercent,
  // Components
  ConfidenceSummary,
  ConfidenceBadge,
  PDFHighlightOverlay,
  FieldHighlightIndicator,
};
