/**
 * License Management UI Tests
 * Subtask 15.8: Create license management UI
 *
 * Tests for the license management UI components including:
 * - License display and status
 * - License key input and activation
 * - Feature availability display
 * - Expiration warnings
 * - Offline grace period display
 */

import {
  // Types
  LicenseDisplayInfo,
  LicenseUIState,
  LicenseInputState,
  ActivationResult,
  FeatureDisplayItem,
  ExpirationWarning,
  // State functions
  createEmptyLicenseUIState,
  createLicenseDisplayInfo,
  createExpirationWarning,
  updateLicenseUIState,
  // License key input functions
  createLicenseInputState,
  formatLicenseKeyInput,
  validateLicenseKeyFormat,
  isLicenseKeyComplete,
  getLicenseKeySegments,
  // Feature display functions
  createFeatureDisplayItems,
  getFeatureIcon,
  getFeatureDescription,
  isFeatureAvailable,
  // Expiration functions
  getExpirationStatus,
  getExpirationColor,
  getExpirationMessage,
  formatExpirationDate,
  getDaysUntilExpiration,
  // Display helper functions
  getLicenseTypeDisplayName,
  getLicenseStatusDisplayName,
  getLicenseStatusColor,
  getLicenseTypeBadgeColor,
  formatActivationCount,
  // Offline display functions
  getOfflineStatusDisplay,
  getGracePeriodDisplay,
  formatGracePeriodRemaining,
  // Validation state
  getActivationButtonState,
  getDeactivationButtonState,
  // Event types
  LicenseUIEventType,
  createLicenseUIEvent,
  // Component state helpers
  getInitialFormState,
  validateForm,
  getFormErrors,
} from '../src/services/LicenseManagementUtils';

import { License, LicenseType, LicenseStatus } from '../src/services/LicensingServer';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'lic-test-123',
    key: 'TEST-1234-5678-ABCD',
    type: 'professional',
    status: 'active',
    userId: 'user-123',
    email: 'test@example.com',
    hardwareFingerprint: 'fp-abc123',
    activatedAt: new Date('2024-01-01'),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now (clearly active)
    maxActivations: 5,
    currentActivations: 2,
    features: ['basic', 'export', 'batch', 'api'],
    metadata: {},
    ...overrides,
  };
}

function createExpiringSoonLicense(): License {
  return createTestLicense({
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now (between critical 7 and warning 30)
  });
}

function createExpiredLicense(): License {
  return createTestLicense({
    expiresAt: new Date('2023-01-01'),
    status: 'expired',
  });
}

// =============================================================================
// License UI State Tests
// =============================================================================

describe('License UI State', () => {
  describe('createEmptyLicenseUIState', () => {
    it('should create empty state', () => {
      const state = createEmptyLicenseUIState();

      expect(state.license).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isActivating).toBe(false);
      expect(state.isDeactivating).toBe(false);
      expect(state.showActivationForm).toBe(true);
      expect(state.isOffline).toBe(false);
    });
  });

  describe('createLicenseDisplayInfo', () => {
    it('should create display info from license', () => {
      const license = createTestLicense();
      const info = createLicenseDisplayInfo(license);

      expect(info.type).toBe('professional');
      expect(info.status).toBe('active');
      expect(info.email).toBe('test@example.com');
      expect(info.features).toEqual(['basic', 'export', 'batch', 'api']);
      expect(info.activationsUsed).toBe(2);
      expect(info.maxActivations).toBe(5);
    });

    it('should handle null expiration', () => {
      const license = createTestLicense({ expiresAt: null });
      const info = createLicenseDisplayInfo(license);

      expect(info.expiresAt).toBeNull();
      expect(info.isPerpetual).toBe(true);
    });

    it('should detect expiring soon', () => {
      const license = createExpiringSoonLicense();
      const info = createLicenseDisplayInfo(license);

      expect(info.isExpiringSoon).toBe(true);
    });
  });

  describe('updateLicenseUIState', () => {
    it('should update state with new license', () => {
      const state = createEmptyLicenseUIState();
      const license = createTestLicense();
      const updated = updateLicenseUIState(state, { license });

      expect(updated.license).not.toBeNull();
      expect(updated.license?.key).toBe('TEST-1234-5678-ABCD');
    });
  });
});

// =============================================================================
// License Key Input Tests
// =============================================================================

describe('License Key Input', () => {
  describe('createLicenseInputState', () => {
    it('should create empty input state', () => {
      const state = createLicenseInputState();

      expect(state.value).toBe('');
      expect(state.isValid).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isTouched).toBe(false);
    });

    it('should create state with initial value', () => {
      const state = createLicenseInputState('TEST-1234');

      expect(state.value).toBe('TEST-1234');
    });
  });

  describe('formatLicenseKeyInput', () => {
    it('should format input with dashes', () => {
      expect(formatLicenseKeyInput('TEST1234')).toBe('TEST-1234');
      expect(formatLicenseKeyInput('TEST12345678')).toBe('TEST-1234-5678');
      expect(formatLicenseKeyInput('TEST12345678ABCD')).toBe('TEST-1234-5678-ABCD');
    });

    it('should uppercase input', () => {
      expect(formatLicenseKeyInput('test1234')).toBe('TEST-1234');
    });

    it('should remove invalid characters', () => {
      expect(formatLicenseKeyInput('TEST!@#1234')).toBe('TEST-1234');
    });

    it('should limit to 19 characters (with dashes)', () => {
      expect(formatLicenseKeyInput('TEST12345678ABCDEXTRA')).toBe('TEST-1234-5678-ABCD');
    });

    it('should handle empty input', () => {
      expect(formatLicenseKeyInput('')).toBe('');
    });
  });

  describe('validateLicenseKeyFormat', () => {
    it('should validate correct format', () => {
      expect(validateLicenseKeyFormat('TEST-1234-5678-ABCD')).toBe(true);
      expect(validateLicenseKeyFormat('ABCD-EFGH-IJKL-MNOP')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(validateLicenseKeyFormat('TEST-1234')).toBe(false);
      expect(validateLicenseKeyFormat('TEST1234')).toBe(false);
      expect(validateLicenseKeyFormat('')).toBe(false);
      expect(validateLicenseKeyFormat('TEST-1234-5678-ABC')).toBe(false);
    });
  });

  describe('isLicenseKeyComplete', () => {
    it('should check if key is complete', () => {
      expect(isLicenseKeyComplete('TEST-1234-5678-ABCD')).toBe(true);
      expect(isLicenseKeyComplete('TEST-1234')).toBe(false);
    });
  });

  describe('getLicenseKeySegments', () => {
    it('should split key into segments', () => {
      const segments = getLicenseKeySegments('TEST-1234-5678-ABCD');
      expect(segments).toEqual(['TEST', '1234', '5678', 'ABCD']);
    });

    it('should handle partial key', () => {
      const segments = getLicenseKeySegments('TEST-1234');
      expect(segments).toHaveLength(2);
    });
  });
});

// =============================================================================
// Feature Display Tests
// =============================================================================

describe('Feature Display', () => {
  describe('createFeatureDisplayItems', () => {
    it('should create feature items with availability', () => {
      const license = createTestLicense();
      const items = createFeatureDisplayItems(license);

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i: FeatureDisplayItem) => i.id === 'basic' && i.available)).toBe(true);
      expect(items.some((i: FeatureDisplayItem) => i.id === 'batch' && i.available)).toBe(true);
    });

    it('should mark unavailable features', () => {
      const trialLicense = createTestLicense({
        type: 'trial',
        features: ['basic'],
      });
      const items = createFeatureDisplayItems(trialLicense);

      const batchItem = items.find((i: FeatureDisplayItem) => i.id === 'batch');
      expect(batchItem?.available).toBe(false);
    });
  });

  describe('getFeatureIcon', () => {
    it('should return icon name for feature', () => {
      expect(getFeatureIcon('basic')).toBeDefined();
      expect(getFeatureIcon('export')).toBeDefined();
      expect(getFeatureIcon('batch')).toBeDefined();
    });
  });

  describe('getFeatureDescription', () => {
    it('should return description for feature', () => {
      expect(getFeatureDescription('basic')).toBeDefined();
      expect(getFeatureDescription('basic').length).toBeGreaterThan(0);
    });
  });

  describe('isFeatureAvailable', () => {
    it('should check feature availability', () => {
      const license = createTestLicense();
      expect(isFeatureAvailable(license, 'batch')).toBe(true);
      expect(isFeatureAvailable(license, 'unlimited')).toBe(false);
    });
  });
});

// =============================================================================
// Expiration Tests
// =============================================================================

describe('Expiration Display', () => {
  describe('getExpirationStatus', () => {
    it('should return active for valid license', () => {
      const license = createTestLicense({
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      });
      expect(getExpirationStatus(license)).toBe('active');
    });

    it('should return warning for expiring soon', () => {
      const license = createExpiringSoonLicense();
      expect(getExpirationStatus(license)).toBe('warning');
    });

    it('should return critical for very soon', () => {
      const license = createTestLicense({
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      });
      expect(getExpirationStatus(license)).toBe('critical');
    });

    it('should return expired for past date', () => {
      const license = createExpiredLicense();
      expect(getExpirationStatus(license)).toBe('expired');
    });

    it('should return perpetual for no expiration', () => {
      const license = createTestLicense({ expiresAt: null });
      expect(getExpirationStatus(license)).toBe('perpetual');
    });
  });

  describe('getExpirationColor', () => {
    it('should return correct colors', () => {
      expect(getExpirationColor('active')).toContain('green');
      expect(getExpirationColor('warning')).toContain('yellow');
      expect(getExpirationColor('critical')).toContain('red');
      expect(getExpirationColor('expired')).toContain('red');
    });
  });

  describe('getExpirationMessage', () => {
    it('should return appropriate message', () => {
      expect(getExpirationMessage('active', 30)).toContain('30');
      expect(getExpirationMessage('warning', 7)).toContain('7');
      expect(getExpirationMessage('expired', 0)).toContain('expired');
      expect(getExpirationMessage('perpetual', null).toLowerCase()).toContain('perpetual');
    });
  });

  describe('formatExpirationDate', () => {
    it('should format date', () => {
      const date = new Date('2024-12-31');
      const formatted = formatExpirationDate(date);
      expect(formatted).toContain('2024');
    });

    it('should handle null date', () => {
      expect(formatExpirationDate(null)).toBe('Never');
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate days', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      expect(getDaysUntilExpiration(futureDate)).toBe(10);
    });

    it('should return 0 for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(getDaysUntilExpiration(pastDate)).toBe(0);
    });

    it('should return null for null date', () => {
      expect(getDaysUntilExpiration(null)).toBeNull();
    });
  });

  describe('createExpirationWarning', () => {
    it('should create warning for expiring license', () => {
      const license = createExpiringSoonLicense();
      const warning = createExpirationWarning(license);

      expect(warning).not.toBeNull();
      expect(warning?.level).toBe('warning');
    });

    it('should return null for valid license', () => {
      const license = createTestLicense({
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });
      const warning = createExpirationWarning(license);

      expect(warning).toBeNull();
    });
  });
});

// =============================================================================
// Display Helper Tests
// =============================================================================

describe('Display Helpers', () => {
  describe('getLicenseTypeDisplayName', () => {
    it('should return display names', () => {
      expect(getLicenseTypeDisplayName('trial')).toBe('Trial');
      expect(getLicenseTypeDisplayName('standard')).toBe('Standard');
      expect(getLicenseTypeDisplayName('professional')).toBe('Professional');
      expect(getLicenseTypeDisplayName('enterprise')).toBe('Enterprise');
    });
  });

  describe('getLicenseStatusDisplayName', () => {
    it('should return status names', () => {
      expect(getLicenseStatusDisplayName('active')).toBe('Active');
      expect(getLicenseStatusDisplayName('expired')).toBe('Expired');
      expect(getLicenseStatusDisplayName('revoked')).toBe('Revoked');
      expect(getLicenseStatusDisplayName('suspended')).toBe('Suspended');
    });
  });

  describe('getLicenseStatusColor', () => {
    it('should return correct colors', () => {
      expect(getLicenseStatusColor('active')).toContain('green');
      expect(getLicenseStatusColor('expired')).toContain('red');
      expect(getLicenseStatusColor('revoked')).toContain('red');
      expect(getLicenseStatusColor('suspended')).toContain('yellow');
    });
  });

  describe('getLicenseTypeBadgeColor', () => {
    it('should return badge colors', () => {
      expect(getLicenseTypeBadgeColor('trial')).toContain('gray');
      expect(getLicenseTypeBadgeColor('standard')).toContain('blue');
      expect(getLicenseTypeBadgeColor('professional')).toContain('purple');
      expect(getLicenseTypeBadgeColor('enterprise')).toContain('yellow');
    });
  });

  describe('formatActivationCount', () => {
    it('should format activation count', () => {
      expect(formatActivationCount(2, 5)).toBe('2 / 5');
      expect(formatActivationCount(1, 1)).toBe('1 / 1');
    });

    it('should handle unlimited', () => {
      expect(formatActivationCount(5, Infinity)).toContain('unlimited');
    });
  });
});

// =============================================================================
// Offline Display Tests
// =============================================================================

describe('Offline Display', () => {
  describe('getOfflineStatusDisplay', () => {
    it('should return online status when online', () => {
      const display = getOfflineStatusDisplay(false, null);
      expect(display.isOffline).toBe(false);
      expect(display.message).toContain('online');
    });

    it('should return offline status when offline', () => {
      const display = getOfflineStatusDisplay(true, 5);
      expect(display.isOffline).toBe(true);
      expect(display.remainingDays).toBe(5);
    });
  });

  describe('getGracePeriodDisplay', () => {
    it('should return grace period info', () => {
      const display = getGracePeriodDisplay(5, 7);
      expect(display.remainingDays).toBe(5);
      expect(display.totalDays).toBe(7);
      expect(display.percentage).toBeGreaterThan(0);
    });

    it('should handle zero remaining', () => {
      const display = getGracePeriodDisplay(0, 7);
      expect(display.isExpired).toBe(true);
    });
  });

  describe('formatGracePeriodRemaining', () => {
    it('should format remaining days', () => {
      expect(formatGracePeriodRemaining(5)).toContain('5');
      expect(formatGracePeriodRemaining(1)).toContain('1');
    });

    it('should show expired for zero', () => {
      expect(formatGracePeriodRemaining(0)).toContain('expired');
    });
  });
});

// =============================================================================
// Button State Tests
// =============================================================================

describe('Button States', () => {
  describe('getActivationButtonState', () => {
    it('should be disabled with invalid key', () => {
      const state = getActivationButtonState('TEST', false, false);
      expect(state.disabled).toBe(true);
      expect(state.label).toContain('Enter');
    });

    it('should be enabled with valid key', () => {
      const state = getActivationButtonState('TEST-1234-5678-ABCD', false, false);
      expect(state.disabled).toBe(false);
      expect(state.label).toContain('Activate');
    });

    it('should show loading when activating', () => {
      const state = getActivationButtonState('TEST-1234-5678-ABCD', true, false);
      expect(state.loading).toBe(true);
      expect(state.label).toContain('Activating');
    });
  });

  describe('getDeactivationButtonState', () => {
    it('should be disabled when no license', () => {
      const state = getDeactivationButtonState(null, false);
      expect(state.disabled).toBe(true);
    });

    it('should be enabled with license', () => {
      const license = createTestLicense();
      const state = getDeactivationButtonState(license, false);
      expect(state.disabled).toBe(false);
    });

    it('should show loading when deactivating', () => {
      const license = createTestLicense();
      const state = getDeactivationButtonState(license, true);
      expect(state.loading).toBe(true);
    });
  });
});

// =============================================================================
// Event Tests
// =============================================================================

describe('License UI Events', () => {
  describe('createLicenseUIEvent', () => {
    it('should create event with timestamp', () => {
      const event = createLicenseUIEvent('ACTIVATION_STARTED', { key: 'TEST' });

      expect(event.type).toBe('ACTIVATION_STARTED');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.details.key).toBe('TEST');
    });
  });
});

// =============================================================================
// Form State Tests
// =============================================================================

describe('Form State', () => {
  describe('getInitialFormState', () => {
    it('should create initial form state', () => {
      const state = getInitialFormState();

      expect(state.licenseKey).toBe('');
      expect(state.errors).toEqual({});
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('validateForm', () => {
    it('should validate empty key', () => {
      const result = validateForm({ licenseKey: '', errors: {}, isSubmitting: false });
      expect(result.valid).toBe(false);
      expect(result.errors.licenseKey).toBeDefined();
    });

    it('should validate invalid format', () => {
      const result = validateForm({ licenseKey: 'INVALID', errors: {}, isSubmitting: false });
      expect(result.valid).toBe(false);
      expect(result.errors.licenseKey).toContain('format');
    });

    it('should validate correct key', () => {
      const result = validateForm({
        licenseKey: 'TEST-1234-5678-ABCD',
        errors: {},
        isSubmitting: false,
      });
      expect(result.valid).toBe(true);
      expect(result.errors.licenseKey).toBeUndefined();
    });
  });

  describe('getFormErrors', () => {
    it('should return empty for no errors', () => {
      const errors = getFormErrors({ licenseKey: 'TEST-1234-5678-ABCD', errors: {}, isSubmitting: false });
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return errors for invalid state', () => {
      const errors = getFormErrors({ licenseKey: '', errors: {}, isSubmitting: false });
      expect(errors.licenseKey).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  it('should create complete license display from license', () => {
    const license = createTestLicense();
    const displayInfo = createLicenseDisplayInfo(license);
    const features = createFeatureDisplayItems(license);
    const expirationStatus = getExpirationStatus(license);
    const warning = createExpirationWarning(license);

    expect(displayInfo.type).toBe('professional');
    expect(features.length).toBeGreaterThan(0);
    expect(expirationStatus).toBe('active');
    expect(warning).toBeNull(); // 60 days is not warning
  });

  it('should handle expiring license workflow', () => {
    const license = createExpiringSoonLicense();
    const displayInfo = createLicenseDisplayInfo(license);
    const expirationStatus = getExpirationStatus(license);
    const warning = createExpirationWarning(license);

    expect(displayInfo.isExpiringSoon).toBe(true);
    expect(expirationStatus).toBe('warning');
    expect(warning).not.toBeNull();
  });

  it('should handle trial license with limited features', () => {
    const trialLicense = createTestLicense({
      type: 'trial',
      features: ['basic'],
    });
    const features = createFeatureDisplayItems(trialLicense);
    const availableCount = features.filter((f: FeatureDisplayItem) => f.available).length;
    const unavailableCount = features.filter((f: FeatureDisplayItem) => !f.available).length;

    expect(availableCount).toBeGreaterThan(0);
    expect(unavailableCount).toBeGreaterThan(0);
  });
});
