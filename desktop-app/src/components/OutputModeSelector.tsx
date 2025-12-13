/**
 * OutputModeSelector Component
 *
 * Allows users to select how to process invoices:
 * - ContPAQi: Send directly to ContPAQi accounting software
 * - JSON: Export to JSON file for testing/review
 * - CSV: Export to CSV file for spreadsheet import
 * - Both: Export to both JSON and CSV files
 *
 * Features:
 * - Radio button selection for mutually exclusive modes
 * - Visual indicators for ContPAQi availability
 * - Internationalization support
 * - Accessible keyboard navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// =============================================================================
// Types
// =============================================================================

export type OutputMode = 'contpaqi' | 'json' | 'csv' | 'both';

export interface OutputModeOption {
  id: OutputMode;
  name: string;
  description: string;
  available: boolean;
  icon: React.ReactNode;
}

export interface OutputModeSelectorProps {
  /** Currently selected output mode */
  value: OutputMode;
  /** Callback when output mode changes */
  onChange: (mode: OutputMode) => void;
  /** Whether ContPAQi is available (SDK initialized) */
  contpaqiAvailable?: boolean;
  /** Export path for file exports */
  exportPath?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ContpaqiIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const JsonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 13h2m-2 3h4" />
  </svg>
);

const CsvIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BothIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function OutputModeSelector({
  value,
  onChange,
  contpaqiAvailable = false,
  exportPath,
  disabled = false,
  className = '',
}: OutputModeSelectorProps) {
  const { t } = useTranslation();

  // Define available options
  const options: OutputModeOption[] = [
    {
      id: 'contpaqi',
      name: t('outputMode.contpaqi.name'),
      description: t('outputMode.contpaqi.description'),
      available: contpaqiAvailable,
      icon: <ContpaqiIcon />,
    },
    {
      id: 'json',
      name: t('outputMode.json.name'),
      description: t('outputMode.json.description'),
      available: true,
      icon: <JsonIcon />,
    },
    {
      id: 'csv',
      name: t('outputMode.csv.name'),
      description: t('outputMode.csv.description'),
      available: true,
      icon: <CsvIcon />,
    },
    {
      id: 'both',
      name: t('outputMode.both.name'),
      description: t('outputMode.both.description'),
      available: true,
      icon: <BothIcon />,
    },
  ];

  const handleOptionClick = useCallback((option: OutputModeOption) => {
    if (disabled || !option.available) return;
    onChange(option.id);
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, option: OutputModeOption) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOptionClick(option);
    }
  }, [handleOptionClick]);

  // Determine if we're in export mode (any file export selected)
  const isExportMode = value === 'json' || value === 'csv' || value === 'both';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          {t('outputMode.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {t('outputMode.description')}
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.id;
          const isDisabled = disabled || !option.available;

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => handleOptionClick(option)}
              onKeyDown={(e) => handleKeyDown(e, option)}
              className={`
                relative flex items-start p-3 rounded-lg border-2 cursor-pointer
                transition-all duration-150 ease-in-out
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : ''
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              `}
            >
              {/* Radio indicator */}
              <div className={`
                flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2
                ${isSelected
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300 bg-white'
                }
                ${isDisabled ? 'border-gray-200' : ''}
              `}>
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`
                    ${isSelected ? 'text-primary-600' : 'text-gray-600'}
                    ${isDisabled ? 'text-gray-400' : ''}
                  `}>
                    {option.icon}
                  </span>
                  <span className={`
                    text-sm font-medium
                    ${isSelected ? 'text-primary-900' : 'text-gray-900'}
                    ${isDisabled ? 'text-gray-500' : ''}
                  `}>
                    {option.name}
                  </span>
                </div>
                <p className={`
                  mt-1 text-xs
                  ${isSelected ? 'text-primary-700' : 'text-gray-500'}
                  ${isDisabled ? 'text-gray-400' : ''}
                `}>
                  {option.description}
                </p>

                {/* Unavailable notice for ContPAQi */}
                {option.id === 'contpaqi' && !option.available && (
                  <p className="mt-1 text-xs text-amber-600">
                    {t('outputMode.contpaqi.unavailable')}
                  </p>
                )}
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export path info */}
      {isExportMode && exportPath && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-700">
            <span className="font-medium">
              {t('outputMode.exportPath', { path: exportPath })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Variant for Inline Use
// =============================================================================

export interface OutputModeCompactProps {
  value: OutputMode;
  onChange: (mode: OutputMode) => void;
  contpaqiAvailable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function OutputModeCompact({
  value,
  onChange,
  contpaqiAvailable = false,
  disabled = false,
  className = '',
}: OutputModeCompactProps) {
  const { t } = useTranslation();

  const options: { id: OutputMode; label: string; available: boolean }[] = [
    { id: 'contpaqi', label: 'ContPAQi', available: contpaqiAvailable },
    { id: 'json', label: 'JSON', available: true },
    { id: 'csv', label: 'CSV', available: true },
    { id: 'both', label: t('outputMode.both.name'), available: true },
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-sm font-medium text-gray-700">
        {t('outputMode.title')}:
      </span>
      <div className="flex items-center gap-3">
        {options.map((option) => {
          const isDisabled = disabled || !option.available;
          return (
            <label
              key={option.id}
              className={`
                flex items-center gap-1.5 cursor-pointer
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="outputMode"
                value={option.id}
                checked={value === option.id}
                onChange={() => !isDisabled && onChange(option.id)}
                disabled={isDisabled}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <span className={`text-sm ${value === option.id ? 'font-medium text-primary-700' : 'text-gray-600'}`}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default OutputModeSelector;
