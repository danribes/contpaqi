/**
 * License Management Utility Functions
 * Subtask 15.8: Create license management UI
 *
 * Non-JSX utility functions for license management UI:
 * - State management
 * - License display info creation
 * - Input formatting and validation
 * - Feature display helpers
 * - Expiration calculations
 * - Offline status display
 */

import { License, LicenseType, LicenseStatus } from './LicensingServer';

// =============================================================================
// Types
// =============================================================================

export interface LicenseDisplayInfo {
  type: LicenseType;
  status: LicenseStatus;
  email: string;
  activatedAt: Date | null;
  expiresAt: Date | null;
  features: string[];
  activationsUsed: number;
  maxActivations: number;
  isPerpetual: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
}

export interface LicenseUIState {
  license: License | null;
  isLoading: boolean;
  error: string | null;
  isActivating: boolean;
  isDeactivating: boolean;
  showActivationForm: boolean;
  isOffline: boolean;
  offlineGraceDaysRemaining: number | null;
}

export interface LicenseInputState {
  value: string;
  isValid: boolean;
  error: string | null;
  isTouched: boolean;
}

export interface ActivationResult {
  success: boolean;
  error?: string;
  license?: License;
}

export interface FeatureDisplayItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export interface ExpirationWarning {
  level: 'warning' | 'critical' | 'expired';
  message: string;
  daysRemaining: number;
}

export type ExpirationStatus = 'active' | 'warning' | 'critical' | 'expired' | 'perpetual';

export interface OfflineStatusDisplay {
  isOffline: boolean;
  remainingDays: number | null;
  message: string;
}

export interface GracePeriodDisplay {
  remainingDays: number;
  totalDays: number;
  percentage: number;
  isExpired: boolean;
}

export interface ButtonState {
  disabled: boolean;
  loading: boolean;
  label: string;
}

export type LicenseUIEventType =
  | 'ACTIVATION_STARTED'
  | 'ACTIVATION_SUCCESS'
  | 'ACTIVATION_FAILED'
  | 'DEACTIVATION_STARTED'
  | 'DEACTIVATION_SUCCESS'
  | 'DEACTIVATION_FAILED'
  | 'KEY_INPUT_CHANGED'
  | 'VALIDATION_ERROR';

export interface LicenseUIEvent {
  type: LicenseUIEventType;
  timestamp: Date;
  details: Record<string, unknown>;
}

export interface FormState {
  licenseKey: string;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// =============================================================================
// Constants
// =============================================================================

const LICENSE_TYPE_NAMES: Record<LicenseType, string> = {
  trial: 'Trial',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const LICENSE_STATUS_NAMES: Record<LicenseStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
  suspended: 'Suspended',
  pending: 'Pending',
};

const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  active: 'text-green-600 bg-green-100',
  expired: 'text-red-600 bg-red-100',
  revoked: 'text-red-600 bg-red-100',
  suspended: 'text-yellow-600 bg-yellow-100',
  pending: 'text-gray-600 bg-gray-100',
};

const LICENSE_TYPE_BADGE_COLORS: Record<LicenseType, string> = {
  trial: 'text-gray-700 bg-gray-200',
  standard: 'text-blue-700 bg-blue-100',
  professional: 'text-purple-700 bg-purple-100',
  enterprise: 'text-yellow-700 bg-yellow-100 border border-yellow-300',
};

const FEATURE_INFO: Record<string, { name: string; description: string; icon: string }> = {
  basic: {
    name: 'Basic Processing',
    description: 'Process individual PDF invoices',
    icon: 'document',
  },
  export: {
    name: 'Export Data',
    description: 'Export processed data to CSV/Excel',
    icon: 'download',
  },
  batch: {
    name: 'Batch Processing',
    description: 'Process multiple invoices at once',
    icon: 'collection',
  },
  api: {
    name: 'API Access',
    description: 'Integrate with external systems via API',
    icon: 'code',
  },
  unlimited: {
    name: 'Unlimited Processing',
    description: 'No limits on processing volume',
    icon: 'infinity',
  },
};

const ALL_FEATURES = ['basic', 'export', 'batch', 'api', 'unlimited'];

const WARNING_THRESHOLD_DAYS = 30;
const CRITICAL_THRESHOLD_DAYS = 7;

// =============================================================================
// State Functions
// =============================================================================

/**
 * Create empty license UI state
 */
export function createEmptyLicenseUIState(): LicenseUIState {
  return {
    license: null,
    isLoading: false,
    error: null,
    isActivating: false,
    isDeactivating: false,
    showActivationForm: true,
    isOffline: false,
    offlineGraceDaysRemaining: null,
  };
}

/**
 * Create license display info from license
 */
export function createLicenseDisplayInfo(license: License): LicenseDisplayInfo {
  const daysRemaining = license.expiresAt ? getDaysUntilExpiration(license.expiresAt) : null;
  const isExpiringSoon =
    daysRemaining !== null && daysRemaining <= WARNING_THRESHOLD_DAYS && daysRemaining > 0;

  return {
    type: license.type,
    status: license.status,
    email: license.email,
    activatedAt: license.activatedAt,
    expiresAt: license.expiresAt,
    features: license.features,
    activationsUsed: license.currentActivations,
    maxActivations: license.maxActivations,
    isPerpetual: license.expiresAt === null,
    isExpiringSoon,
    daysRemaining,
  };
}

/**
 * Create expiration warning if applicable
 */
export function createExpirationWarning(license: License): ExpirationWarning | null {
  if (!license.expiresAt) return null;

  const daysRemaining = getDaysUntilExpiration(license.expiresAt);
  if (daysRemaining === null || daysRemaining > WARNING_THRESHOLD_DAYS) return null;

  if (daysRemaining <= 0) {
    return {
      level: 'expired',
      message: 'Your license has expired. Please renew to continue using all features.',
      daysRemaining: 0,
    };
  }

  if (daysRemaining <= CRITICAL_THRESHOLD_DAYS) {
    return {
      level: 'critical',
      message: `Your license expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}! Please renew immediately.`,
      daysRemaining,
    };
  }

  return {
    level: 'warning',
    message: `Your license expires in ${daysRemaining} days. Consider renewing soon.`,
    daysRemaining,
  };
}

/**
 * Update license UI state
 */
export function updateLicenseUIState(
  state: LicenseUIState,
  updates: Partial<LicenseUIState>
): LicenseUIState {
  return { ...state, ...updates };
}

// =============================================================================
// License Key Input Functions
// =============================================================================

/**
 * Create license input state
 */
export function createLicenseInputState(initialValue: string = ''): LicenseInputState {
  return {
    value: initialValue,
    isValid: validateLicenseKeyFormat(initialValue),
    error: null,
    isTouched: false,
  };
}

/**
 * Format license key input (auto-add dashes, uppercase)
 */
export function formatLicenseKeyInput(input: string): string {
  // Remove non-alphanumeric characters and convert to uppercase
  const cleaned = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Limit to 16 characters (without dashes)
  const limited = cleaned.slice(0, 16);

  // Add dashes every 4 characters
  const segments: string[] = [];
  for (let i = 0; i < limited.length; i += 4) {
    segments.push(limited.slice(i, i + 4));
  }

  return segments.join('-');
}

/**
 * Validate license key format
 */
export function validateLicenseKeyFormat(key: string): boolean {
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Check if license key is complete
 */
export function isLicenseKeyComplete(key: string): boolean {
  return key.replace(/-/g, '').length === 16;
}

/**
 * Get license key segments
 */
export function getLicenseKeySegments(key: string): string[] {
  return key.split('-').filter((s) => s.length > 0);
}

// =============================================================================
// Feature Display Functions
// =============================================================================

/**
 * Create feature display items from license
 */
export function createFeatureDisplayItems(license: License): FeatureDisplayItem[] {
  return ALL_FEATURES.map((featureId) => {
    const info = FEATURE_INFO[featureId] || {
      name: featureId,
      description: '',
      icon: 'default',
    };

    return {
      id: featureId,
      name: info.name,
      description: info.description,
      icon: info.icon,
      available: license.features.includes(featureId),
    };
  });
}

/**
 * Get feature icon name
 */
export function getFeatureIcon(featureId: string): string {
  return FEATURE_INFO[featureId]?.icon || 'default';
}

/**
 * Get feature description
 */
export function getFeatureDescription(featureId: string): string {
  return FEATURE_INFO[featureId]?.description || '';
}

/**
 * Check if feature is available
 */
export function isFeatureAvailable(license: License, featureId: string): boolean {
  return license.features.includes(featureId);
}

// =============================================================================
// Expiration Functions
// =============================================================================

/**
 * Get expiration status
 */
export function getExpirationStatus(license: License): ExpirationStatus {
  if (!license.expiresAt) return 'perpetual';

  const daysRemaining = getDaysUntilExpiration(license.expiresAt);
  if (daysRemaining === null) return 'perpetual';

  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= CRITICAL_THRESHOLD_DAYS) return 'critical';
  if (daysRemaining <= WARNING_THRESHOLD_DAYS) return 'warning';
  return 'active';
}

/**
 * Get expiration color class
 */
export function getExpirationColor(status: ExpirationStatus): string {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
    case 'expired':
      return 'text-red-700';
    case 'perpetual':
      return 'text-blue-600';
  }
}

/**
 * Get expiration message
 */
export function getExpirationMessage(
  status: ExpirationStatus,
  daysRemaining: number | null
): string {
  switch (status) {
    case 'active':
      return `${daysRemaining} days remaining`;
    case 'warning':
      return `Expires in ${daysRemaining} days`;
    case 'critical':
      return `Expires in ${daysRemaining} days!`;
    case 'expired':
      return 'License has expired';
    case 'perpetual':
      return 'Perpetual license (never expires)';
  }
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

// =============================================================================
// Display Helper Functions
// =============================================================================

/**
 * Get license type display name
 */
export function getLicenseTypeDisplayName(type: LicenseType): string {
  return LICENSE_TYPE_NAMES[type];
}

/**
 * Get license status display name
 */
export function getLicenseStatusDisplayName(status: LicenseStatus): string {
  return LICENSE_STATUS_NAMES[status];
}

/**
 * Get license status color class
 */
export function getLicenseStatusColor(status: LicenseStatus): string {
  return LICENSE_STATUS_COLORS[status];
}

/**
 * Get license type badge color class
 */
export function getLicenseTypeBadgeColor(type: LicenseType): string {
  return LICENSE_TYPE_BADGE_COLORS[type];
}

/**
 * Format activation count display
 */
export function formatActivationCount(used: number, max: number): string {
  if (max === Infinity) {
    return `${used} (unlimited)`;
  }
  return `${used} / ${max}`;
}

// =============================================================================
// Offline Display Functions
// =============================================================================

/**
 * Get offline status display info
 */
export function getOfflineStatusDisplay(
  isOffline: boolean,
  graceDaysRemaining: number | null
): OfflineStatusDisplay {
  if (!isOffline) {
    return {
      isOffline: false,
      remainingDays: null,
      message: 'Connected - online license validation',
    };
  }

  return {
    isOffline: true,
    remainingDays: graceDaysRemaining,
    message:
      graceDaysRemaining !== null
        ? `Offline mode - ${graceDaysRemaining} days remaining`
        : 'Offline mode - grace period active',
  };
}

/**
 * Get grace period display info
 */
export function getGracePeriodDisplay(
  remainingDays: number,
  totalDays: number
): GracePeriodDisplay {
  const percentage = totalDays > 0 ? Math.round((remainingDays / totalDays) * 100) : 0;

  return {
    remainingDays,
    totalDays,
    percentage,
    isExpired: remainingDays <= 0,
  };
}

/**
 * Format grace period remaining for display
 */
export function formatGracePeriodRemaining(days: number): string {
  if (days <= 0) return 'Grace period expired';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

// =============================================================================
// Button State Functions
// =============================================================================

/**
 * Get activation button state
 */
export function getActivationButtonState(
  licenseKey: string,
  isActivating: boolean,
  hasExistingLicense: boolean
): ButtonState {
  if (isActivating) {
    return { disabled: true, loading: true, label: 'Activating...' };
  }

  if (!validateLicenseKeyFormat(licenseKey)) {
    return { disabled: true, loading: false, label: 'Enter valid license key' };
  }

  return {
    disabled: false,
    loading: false,
    label: hasExistingLicense ? 'Change License' : 'Activate License',
  };
}

/**
 * Get deactivation button state
 */
export function getDeactivationButtonState(
  license: License | null,
  isDeactivating: boolean
): ButtonState {
  if (isDeactivating) {
    return { disabled: true, loading: true, label: 'Deactivating...' };
  }

  if (!license) {
    return { disabled: true, loading: false, label: 'No license to deactivate' };
  }

  return { disabled: false, loading: false, label: 'Deactivate License' };
}

// =============================================================================
// Event Functions
// =============================================================================

/**
 * Create license UI event
 */
export function createLicenseUIEvent(
  type: LicenseUIEventType,
  details: Record<string, unknown> = {}
): LicenseUIEvent {
  return {
    type,
    timestamp: new Date(),
    details,
  };
}

// =============================================================================
// Form State Functions
// =============================================================================

/**
 * Get initial form state
 */
export function getInitialFormState(): FormState {
  return {
    licenseKey: '',
    errors: {},
    isSubmitting: false,
  };
}

/**
 * Validate form
 */
export function validateForm(state: FormState): ValidationResult {
  const errors: Record<string, string> = {};

  if (!state.licenseKey) {
    errors.licenseKey = 'License key is required';
  } else if (!validateLicenseKeyFormat(state.licenseKey)) {
    errors.licenseKey = 'Invalid license key format (XXXX-XXXX-XXXX-XXXX)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get form errors
 */
export function getFormErrors(state: FormState): Record<string, string> {
  return validateForm(state).errors;
}
