/**
 * License Management UI Components
 * Subtask 15.8: Create license management UI
 *
 * Provides UI components for:
 * - License information display
 * - License key input and activation
 * - Feature availability display
 * - Expiration warnings
 * - Offline grace period display
 */

import { useState, useCallback } from 'react';
import { License } from '../services/LicensingServer';
import {
  // Re-export types
  LicenseDisplayInfo,
  LicenseUIState,
  LicenseInputState,
  ActivationResult,
  FeatureDisplayItem,
  ExpirationWarning,
  ExpirationStatus,
  OfflineStatusDisplay,
  GracePeriodDisplay,
  ButtonState,
  LicenseUIEventType,
  LicenseUIEvent,
  FormState,
  ValidationResult,
  // Functions
  createEmptyLicenseUIState,
  createLicenseDisplayInfo,
  createExpirationWarning,
  updateLicenseUIState,
  createLicenseInputState,
  formatLicenseKeyInput,
  validateLicenseKeyFormat,
  isLicenseKeyComplete,
  getLicenseKeySegments,
  createFeatureDisplayItems,
  getFeatureIcon,
  getFeatureDescription,
  isFeatureAvailable,
  getExpirationStatus,
  getExpirationColor,
  getExpirationMessage,
  formatExpirationDate,
  getDaysUntilExpiration,
  getLicenseTypeDisplayName,
  getLicenseStatusDisplayName,
  getLicenseStatusColor,
  getLicenseTypeBadgeColor,
  formatActivationCount,
  getOfflineStatusDisplay,
  getGracePeriodDisplay,
  formatGracePeriodRemaining,
  getActivationButtonState,
  getDeactivationButtonState,
  createLicenseUIEvent,
  getInitialFormState,
  validateForm,
  getFormErrors,
} from '../services/LicenseManagementUtils';

// Re-export all types and functions
export {
  // Types
  LicenseDisplayInfo,
  LicenseUIState,
  LicenseInputState,
  ActivationResult,
  FeatureDisplayItem,
  ExpirationWarning,
  ExpirationStatus,
  OfflineStatusDisplay,
  GracePeriodDisplay,
  ButtonState,
  LicenseUIEventType,
  LicenseUIEvent,
  FormState,
  ValidationResult,
  // Functions
  createEmptyLicenseUIState,
  createLicenseDisplayInfo,
  createExpirationWarning,
  updateLicenseUIState,
  createLicenseInputState,
  formatLicenseKeyInput,
  validateLicenseKeyFormat,
  isLicenseKeyComplete,
  getLicenseKeySegments,
  createFeatureDisplayItems,
  getFeatureIcon,
  getFeatureDescription,
  isFeatureAvailable,
  getExpirationStatus,
  getExpirationColor,
  getExpirationMessage,
  formatExpirationDate,
  getDaysUntilExpiration,
  getLicenseTypeDisplayName,
  getLicenseStatusDisplayName,
  getLicenseStatusColor,
  getLicenseTypeBadgeColor,
  formatActivationCount,
  getOfflineStatusDisplay,
  getGracePeriodDisplay,
  formatGracePeriodRemaining,
  getActivationButtonState,
  getDeactivationButtonState,
  createLicenseUIEvent,
  getInitialFormState,
  validateForm,
  getFormErrors,
};

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function KeyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function WifiOffIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  );
}

// =============================================================================
// Components
// =============================================================================

/**
 * License Key Input Component
 */
interface LicenseKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function LicenseKeyInput({
  value,
  onChange,
  onSubmit,
  error,
  disabled = false,
  placeholder = 'XXXX-XXXX-XXXX-XXXX',
}: LicenseKeyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatLicenseKeyInput(e.target.value);
      onChange(formatted);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSubmit && validateLicenseKeyFormat(value)) {
        onSubmit();
      }
    },
    [onSubmit, value]
  );

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <KeyIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm
            font-mono text-lg tracking-wider uppercase
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          `}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * License Status Badge
 */
interface LicenseStatusBadgeProps {
  status: License['status'];
  className?: string;
}

export function LicenseStatusBadge({ status, className = '' }: LicenseStatusBadgeProps) {
  const colorClass = getLicenseStatusColor(status);
  const displayName = getLicenseStatusDisplayName(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {displayName}
    </span>
  );
}

/**
 * License Type Badge
 */
interface LicenseTypeBadgeProps {
  type: License['type'];
  className?: string;
}

export function LicenseTypeBadge({ type, className = '' }: LicenseTypeBadgeProps) {
  const colorClass = getLicenseTypeBadgeColor(type);
  const displayName = getLicenseTypeDisplayName(type);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colorClass} ${className}`}>
      {displayName}
    </span>
  );
}

/**
 * Expiration Warning Alert
 */
interface ExpirationWarningAlertProps {
  warning: ExpirationWarning;
  onRenew?: () => void;
}

export function ExpirationWarningAlert({ warning, onRenew }: ExpirationWarningAlertProps) {
  const bgColor =
    warning.level === 'expired'
      ? 'bg-red-50 border-red-200'
      : warning.level === 'critical'
      ? 'bg-red-50 border-red-200'
      : 'bg-yellow-50 border-yellow-200';

  const iconColor =
    warning.level === 'expired' || warning.level === 'critical'
      ? 'text-red-500'
      : 'text-yellow-500';

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex">
        <WarningIcon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
        <div className="ml-3 flex-1">
          <p className="text-sm text-gray-700">{warning.message}</p>
          {onRenew && (
            <button
              onClick={onRenew}
              className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Renew License
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Feature List Item
 */
interface FeatureListItemProps {
  feature: FeatureDisplayItem;
}

export function FeatureListItem({ feature }: FeatureListItemProps) {
  return (
    <div className="flex items-center py-2">
      <div className={`flex-shrink-0 ${feature.available ? 'text-green-500' : 'text-gray-300'}`}>
        {feature.available ? (
          <CheckIcon className="h-5 w-5" />
        ) : (
          <XIcon className="h-5 w-5" />
        )}
      </div>
      <div className="ml-3">
        <p className={`text-sm font-medium ${feature.available ? 'text-gray-900' : 'text-gray-400'}`}>
          {feature.name}
        </p>
        <p className={`text-xs ${feature.available ? 'text-gray-500' : 'text-gray-300'}`}>
          {feature.description}
        </p>
      </div>
    </div>
  );
}

/**
 * Feature List
 */
interface FeatureListProps {
  features: FeatureDisplayItem[];
}

export function FeatureList({ features }: FeatureListProps) {
  return (
    <div className="divide-y divide-gray-100">
      {features.map((feature) => (
        <FeatureListItem key={feature.id} feature={feature} />
      ))}
    </div>
  );
}

/**
 * Offline Status Indicator
 */
interface OfflineStatusIndicatorProps {
  isOffline: boolean;
  graceDaysRemaining: number | null;
}

export function OfflineStatusIndicator({
  isOffline,
  graceDaysRemaining,
}: OfflineStatusIndicatorProps) {
  if (!isOffline) {
    return (
      <div className="flex items-center text-green-600">
        <ShieldCheckIcon className="h-4 w-4 mr-1" />
        <span className="text-sm">Online</span>
      </div>
    );
  }

  const isExpiring = graceDaysRemaining !== null && graceDaysRemaining <= 3;

  return (
    <div className={`flex items-center ${isExpiring ? 'text-red-600' : 'text-yellow-600'}`}>
      <WifiOffIcon className="h-4 w-4 mr-1" />
      <span className="text-sm">
        {graceDaysRemaining !== null
          ? formatGracePeriodRemaining(graceDaysRemaining)
          : 'Offline Mode'}
      </span>
    </div>
  );
}

/**
 * License Info Card
 */
interface LicenseInfoCardProps {
  license: License;
  isOffline?: boolean;
  graceDaysRemaining?: number | null;
  onDeactivate?: () => void;
  isDeactivating?: boolean;
}

export function LicenseInfoCard({
  license,
  isOffline = false,
  graceDaysRemaining = null,
  onDeactivate,
  isDeactivating = false,
}: LicenseInfoCardProps) {
  const displayInfo = createLicenseDisplayInfo(license);
  const expirationStatus = getExpirationStatus(license);
  const warning = createExpirationWarning(license);
  const features = createFeatureDisplayItems(license);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LicenseTypeBadge type={license.type} />
            <LicenseStatusBadge status={license.status} />
          </div>
          <OfflineStatusIndicator isOffline={isOffline} graceDaysRemaining={graceDaysRemaining} />
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="px-6 pt-4">
          <ExpirationWarningAlert warning={warning} />
        </div>
      )}

      {/* Details */}
      <div className="p-6">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">License Key</dt>
            <dd className="text-sm font-mono text-gray-900">{license.key}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900">{license.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Expires</dt>
            <dd className={`text-sm font-medium ${getExpirationColor(expirationStatus)}`}>
              {formatExpirationDate(license.expiresAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Activations</dt>
            <dd className="text-sm text-gray-900">
              {formatActivationCount(displayInfo.activationsUsed, displayInfo.maxActivations)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Features */}
      <div className="px-6 pb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
        <FeatureList features={features} />
      </div>

      {/* Actions */}
      {onDeactivate && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onDeactivate}
            disabled={isDeactivating}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate License'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * License Activation Form
 */
interface LicenseActivationFormProps {
  onActivate: (licenseKey: string) => Promise<ActivationResult>;
  isActivating?: boolean;
  error?: string | null;
}

export function LicenseActivationForm({
  onActivate,
  isActivating = false,
  error,
}: LicenseActivationFormProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!validateLicenseKeyFormat(licenseKey)) {
      setLocalError('Invalid license key format');
      return;
    }

    setLocalError(null);
    const result = await onActivate(licenseKey);

    if (!result.success && result.error) {
      setLocalError(result.error);
    }
  }, [licenseKey, onActivate]);

  const displayError = error || localError;
  const buttonState = getActivationButtonState(licenseKey, isActivating, false);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <KeyIcon className="h-6 w-6 text-primary-600" />
        <h3 className="ml-2 text-lg font-medium text-gray-900">Activate License</h3>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Enter your license key to activate the full version. License keys are in the format
        XXXX-XXXX-XXXX-XXXX.
      </p>

      <div className="space-y-4">
        <LicenseKeyInput
          value={licenseKey}
          onChange={setLicenseKey}
          onSubmit={handleSubmit}
          error={displayError}
          disabled={isActivating}
        />

        <button
          onClick={handleSubmit}
          disabled={buttonState.disabled}
          className={`
            w-full flex justify-center items-center px-4 py-2
            border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            bg-primary-600 hover:bg-primary-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {buttonState.loading && (
            <RefreshIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
          )}
          {buttonState.label}
        </button>
      </div>
    </div>
  );
}

/**
 * Main License Management Panel
 */
interface LicenseManagementPanelProps {
  license: License | null;
  isOffline?: boolean;
  graceDaysRemaining?: number | null;
  onActivate: (licenseKey: string) => Promise<ActivationResult>;
  onDeactivate?: () => Promise<void>;
  isActivating?: boolean;
  isDeactivating?: boolean;
  error?: string | null;
  className?: string;
}

export function LicenseManagementPanel({
  license,
  isOffline = false,
  graceDaysRemaining = null,
  onActivate,
  onDeactivate,
  isActivating = false,
  isDeactivating = false,
  error,
  className = '',
}: LicenseManagementPanelProps) {
  const [showChangeForm, setShowChangeForm] = useState(false);

  const handleDeactivate = useCallback(async () => {
    if (onDeactivate) {
      await onDeactivate();
    }
  }, [onDeactivate]);

  const handleActivate = useCallback(
    async (licenseKey: string) => {
      const result = await onActivate(licenseKey);
      if (result.success) {
        setShowChangeForm(false);
      }
      return result;
    },
    [onActivate]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">License Management</h2>
        {license && !showChangeForm && (
          <button
            onClick={() => setShowChangeForm(true)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Change License
          </button>
        )}
      </div>

      {(showChangeForm || !license) && (
        <LicenseActivationForm
          onActivate={handleActivate}
          isActivating={isActivating}
          error={error}
        />
      )}

      {license && !showChangeForm && (
        <LicenseInfoCard
          license={license}
          isOffline={isOffline}
          graceDaysRemaining={graceDaysRemaining}
          onDeactivate={handleDeactivate}
          isDeactivating={isDeactivating}
        />
      )}

      {showChangeForm && license && (
        <button
          onClick={() => setShowChangeForm(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel and keep current license
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default LicenseManagementPanel;
