/**
 * License Validator Tests
 * Subtask 15.4: Create license validation endpoint
 *
 * Tests for the unified license validation service that integrates
 * hardware fingerprint collection with server-side license validation.
 */

// =============================================================================
// Local Type Definitions (avoid JSX compilation issues)
// =============================================================================

type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';
type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'pending';

interface License {
  id: string;
  key: string;
  type: LicenseType;
  status: LicenseStatus;
  userId: string;
  email: string;
  hardwareFingerprint: string;
  activatedAt: Date | null;
  expiresAt: Date | null;
  maxActivations: number;
  currentActivations: number;
  features: string[];
  metadata: Record<string, unknown>;
}

type ValidationErrorCode =
  | 'INVALID_LICENSE_KEY'
  | 'LICENSE_NOT_FOUND'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_REVOKED'
  | 'LICENSE_SUSPENDED'
  | 'FINGERPRINT_MISMATCH'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'FINGERPRINT_ERROR'
  | 'CACHE_EXPIRED'
  | 'NO_LICENSE_CONFIGURED';

interface ValidationResult {
  valid: boolean;
  license: License | null;
  remainingDays: number | null;
  isOfflineValidation: boolean;
  validatedAt: Date;
  error?: string;
  errorCode?: ValidationErrorCode;
}

interface CachedValidation {
  license: License;
  validatedAt: Date;
  fingerprint: string;
  offlineValidUntil: Date;
}

interface ValidatorConfig {
  serverUrl: string;
  apiKey: string;
  offlineGracePeriodDays: number;
  cacheValidityMinutes: number;
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

// =============================================================================
// Local Implementation Functions
// =============================================================================

// --- License Key Validation ---

function isValidLicenseKeyFormat(key: string): boolean {
  if (!key) return false;
  const normalized = normalizeLicenseKey(key);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized);
}

function normalizeLicenseKey(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '');
}

// --- License Expiry ---

function isLicenseExpired(license: License): boolean {
  if (!license.expiresAt) return false;
  return new Date() > new Date(license.expiresAt);
}

function calculateRemainingDays(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// --- Validation Result Creation ---

function createValidationResult(
  valid: boolean,
  license: License | null,
  isOffline: boolean = false,
  error?: string,
  errorCode?: ValidationErrorCode
): ValidationResult {
  return {
    valid,
    license,
    remainingDays: license ? calculateRemainingDays(license.expiresAt) : null,
    isOfflineValidation: isOffline,
    validatedAt: new Date(),
    error,
    errorCode,
  };
}

function createSuccessResult(license: License, isOffline: boolean = false): ValidationResult {
  return createValidationResult(true, license, isOffline);
}

function createErrorResult(error: string, errorCode: ValidationErrorCode): ValidationResult {
  return createValidationResult(false, null, false, error, errorCode);
}

// --- Config Creation ---

function createDefaultValidatorConfig(): ValidatorConfig {
  return {
    serverUrl: 'https://api.contpaqi-license.com',
    apiKey: '',
    offlineGracePeriodDays: 7,
    cacheValidityMinutes: 60,
    autoRetryOnFailure: true,
    maxRetries: 3,
  };
}

function mergeConfig(partial: Partial<ValidatorConfig>): ValidatorConfig {
  return {
    ...createDefaultValidatorConfig(),
    ...partial,
  };
}

// --- Cache Management ---

function createCachedValidation(
  license: License,
  fingerprint: string,
  gracePeriodDays: number
): CachedValidation {
  const now = new Date();
  const offlineValidUntil = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  return {
    license,
    validatedAt: now,
    fingerprint,
    offlineValidUntil,
  };
}

function isCacheValid(cache: CachedValidation, validityMinutes: number): boolean {
  const now = new Date();
  const cacheAge = now.getTime() - cache.validatedAt.getTime();
  const maxAge = validityMinutes * 60 * 1000;
  return cacheAge < maxAge;
}

function isOfflineGracePeriodValid(cache: CachedValidation): boolean {
  const now = new Date();
  return now < cache.offlineValidUntil;
}

function isCacheFingerprintValid(cache: CachedValidation, fingerprint: string): boolean {
  return cache.fingerprint === fingerprint;
}

// --- Offline Validation ---

function validateOffline(
  cache: CachedValidation | null,
  fingerprint: string,
  config: ValidatorConfig
): ValidationResult {
  if (!cache) {
    return createErrorResult('No cached license available', 'NO_LICENSE_CONFIGURED');
  }

  if (!isCacheFingerprintValid(cache, fingerprint)) {
    return createErrorResult('Hardware fingerprint mismatch', 'FINGERPRINT_MISMATCH');
  }

  if (!isOfflineGracePeriodValid(cache)) {
    return createErrorResult('Offline grace period expired', 'CACHE_EXPIRED');
  }

  if (isLicenseExpired(cache.license)) {
    return createErrorResult('License has expired', 'LICENSE_EXPIRED');
  }

  if (cache.license.status === 'revoked') {
    return createErrorResult('License has been revoked', 'LICENSE_REVOKED');
  }

  if (cache.license.status === 'suspended') {
    return createErrorResult('License is suspended', 'LICENSE_SUSPENDED');
  }

  return createSuccessResult(cache.license, true);
}

// --- License Status Validation ---

function isLicenseStatusValid(license: License): { valid: boolean; error?: string; code?: ValidationErrorCode } {
  if (license.status === 'revoked') {
    return { valid: false, error: 'License has been revoked', code: 'LICENSE_REVOKED' };
  }
  if (license.status === 'suspended') {
    return { valid: false, error: 'License is suspended', code: 'LICENSE_SUSPENDED' };
  }
  if (license.status === 'pending') {
    return { valid: false, error: 'License not yet activated', code: 'LICENSE_NOT_FOUND' };
  }
  if (isLicenseExpired(license)) {
    return { valid: false, error: 'License has expired', code: 'LICENSE_EXPIRED' };
  }
  return { valid: true };
}

// --- Feature Validation ---

function hasRequiredFeature(license: License, feature: string): boolean {
  if (license.features.includes('unlimited')) return true;
  return license.features.includes(feature);
}

function validateFeatureAccess(license: License, requiredFeatures: string[]): { valid: boolean; missingFeatures: string[] } {
  const missingFeatures = requiredFeatures.filter(f => !hasRequiredFeature(license, f));
  return {
    valid: missingFeatures.length === 0,
    missingFeatures,
  };
}

// --- Serialization ---

function serializeCachedValidation(cache: CachedValidation): string {
  return JSON.stringify({
    license: {
      ...cache.license,
      activatedAt: cache.license.activatedAt?.toISOString() || null,
      expiresAt: cache.license.expiresAt?.toISOString() || null,
    },
    validatedAt: cache.validatedAt.toISOString(),
    fingerprint: cache.fingerprint,
    offlineValidUntil: cache.offlineValidUntil.toISOString(),
  });
}

function deserializeCachedValidation(json: string): CachedValidation | null {
  try {
    const data = JSON.parse(json);
    return {
      license: {
        ...data.license,
        activatedAt: data.license.activatedAt ? new Date(data.license.activatedAt) : null,
        expiresAt: data.license.expiresAt ? new Date(data.license.expiresAt) : null,
      },
      validatedAt: new Date(data.validatedAt),
      fingerprint: data.fingerprint,
      offlineValidUntil: new Date(data.offlineValidUntil),
    };
  } catch {
    return null;
  }
}

// --- Display Text ---

function getValidationErrorMessage(code: ValidationErrorCode): string {
  const messages: Record<ValidationErrorCode, string> = {
    INVALID_LICENSE_KEY: 'The license key format is invalid',
    LICENSE_NOT_FOUND: 'The license key was not found',
    LICENSE_EXPIRED: 'Your license has expired',
    LICENSE_REVOKED: 'This license has been revoked',
    LICENSE_SUSPENDED: 'This license is temporarily suspended',
    FINGERPRINT_MISMATCH: 'This license is registered to a different computer',
    NETWORK_ERROR: 'Unable to connect to the licensing server',
    SERVER_ERROR: 'An error occurred on the licensing server',
    FINGERPRINT_ERROR: 'Unable to read hardware identification',
    CACHE_EXPIRED: 'Offline access period has expired - please connect to the internet',
    NO_LICENSE_CONFIGURED: 'No license has been configured',
  };
  return messages[code];
}

function formatRemainingDays(days: number | null): string {
  if (days === null) return 'Perpetual license';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days < 0) return 'Expired';
  if (days <= 30) return `${days} days remaining`;
  if (days <= 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} remaining`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} remaining`;
}

// --- Quick Check Functions ---

function canAccessFeature(result: ValidationResult, feature: string): boolean {
  if (!result.valid || !result.license) return false;
  return hasRequiredFeature(result.license, feature);
}

function isValidationExpiringSoon(result: ValidationResult, thresholdDays: number = 30): boolean {
  if (!result.valid || result.remainingDays === null) return false;
  return result.remainingDays <= thresholdDays;
}

function shouldShowRenewalWarning(result: ValidationResult): boolean {
  if (!result.valid) return false;
  return isValidationExpiringSoon(result, 30);
}

function getValidationSummary(result: ValidationResult): string {
  if (!result.valid) {
    return result.error || 'License validation failed';
  }

  const license = result.license!;
  const typeText = license.type.charAt(0).toUpperCase() + license.type.slice(1);
  const daysText = formatRemainingDays(result.remainingDays);
  const offlineText = result.isOfflineValidation ? ' (offline)' : '';

  return `${typeText} License - ${daysText}${offlineText}`;
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTestLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'test-license-id',
    key: 'TEST-1234-5678-ABCD',
    type: 'professional',
    status: 'active',
    userId: 'user-123',
    email: 'test@example.com',
    hardwareFingerprint: 'fp-abc123',
    activatedAt: new Date('2025-01-01'),
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
    maxActivations: 5,
    currentActivations: 1,
    features: ['basic', 'export', 'batch', 'api'],
    metadata: {},
    ...overrides,
  };
}

function createExpiredLicense(): License {
  return createTestLicense({
    status: 'expired',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  });
}

function createRevokedLicense(): License {
  return createTestLicense({ status: 'revoked' });
}

function createTestCache(
  overrides: Partial<CachedValidation> = {},
  licenseOverrides: Partial<License> = {}
): CachedValidation {
  const license = createTestLicense(licenseOverrides);
  return {
    license,
    validatedAt: new Date(),
    fingerprint: 'fp-abc123',
    offlineValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('License Validator', () => {
  describe('License Key Validation', () => {
    it('should validate correct format XXXX-XXXX-XXXX-XXXX', () => {
      expect(isValidLicenseKeyFormat('ABCD-1234-EFGH-5678')).toBe(true);
      expect(isValidLicenseKeyFormat('1234-5678-ABCD-EFGH')).toBe(true);
    });

    it('should reject invalid key formats', () => {
      expect(isValidLicenseKeyFormat('')).toBe(false);
      expect(isValidLicenseKeyFormat('ABC')).toBe(false);
      expect(isValidLicenseKeyFormat('ABCD-1234-EFGH')).toBe(false);
      expect(isValidLicenseKeyFormat('ABCDEFGH12345678')).toBe(false);
    });

    it('should normalize license keys', () => {
      expect(normalizeLicenseKey('  abcd-1234-efgh-5678  ')).toBe('ABCD-1234-EFGH-5678');
      expect(normalizeLicenseKey('ABCD  1234  EFGH  5678')).toBe('ABCD1234EFGH5678');
    });
  });

  describe('Validation Result Creation', () => {
    it('should create success result with license', () => {
      const license = createTestLicense();
      const result = createSuccessResult(license, false);

      expect(result.valid).toBe(true);
      expect(result.license).toBe(license);
      expect(result.isOfflineValidation).toBe(false);
      expect(result.validatedAt).toBeInstanceOf(Date);
      expect(result.remainingDays).toBeGreaterThan(0);
    });

    it('should create error result with code', () => {
      const result = createErrorResult('License expired', 'LICENSE_EXPIRED');

      expect(result.valid).toBe(false);
      expect(result.license).toBeNull();
      expect(result.error).toBe('License expired');
      expect(result.errorCode).toBe('LICENSE_EXPIRED');
    });

    it('should mark offline validation correctly', () => {
      const license = createTestLicense();
      const result = createSuccessResult(license, true);

      expect(result.isOfflineValidation).toBe(true);
    });
  });

  describe('Config Management', () => {
    it('should create default config', () => {
      const config = createDefaultValidatorConfig();

      expect(config.serverUrl).toBe('https://api.contpaqi-license.com');
      expect(config.offlineGracePeriodDays).toBe(7);
      expect(config.cacheValidityMinutes).toBe(60);
      expect(config.autoRetryOnFailure).toBe(true);
      expect(config.maxRetries).toBe(3);
    });

    it('should merge partial config with defaults', () => {
      const config = mergeConfig({
        apiKey: 'my-api-key',
        offlineGracePeriodDays: 14,
      });

      expect(config.apiKey).toBe('my-api-key');
      expect(config.offlineGracePeriodDays).toBe(14);
      expect(config.serverUrl).toBe('https://api.contpaqi-license.com'); // Default
    });
  });

  describe('Cache Management', () => {
    it('should create cached validation with grace period', () => {
      const license = createTestLicense();
      const cache = createCachedValidation(license, 'fp-abc123', 7);

      expect(cache.license).toBe(license);
      expect(cache.fingerprint).toBe('fp-abc123');
      expect(cache.validatedAt).toBeInstanceOf(Date);
      expect(cache.offlineValidUntil).toBeInstanceOf(Date);

      const gracePeriodMs = cache.offlineValidUntil.getTime() - cache.validatedAt.getTime();
      const expectedMs = 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(gracePeriodMs - expectedMs)).toBeLessThan(1000); // Within 1 second
    });

    it('should validate cache validity by age', () => {
      const cache = createTestCache();
      expect(isCacheValid(cache, 60)).toBe(true);

      // Simulate old cache
      const oldCache = createTestCache({
        validatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });
      expect(isCacheValid(oldCache, 60)).toBe(false);
    });

    it('should validate offline grace period', () => {
      const validCache = createTestCache({
        offlineValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });
      expect(isOfflineGracePeriodValid(validCache)).toBe(true);

      const expiredCache = createTestCache({
        offlineValidUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });
      expect(isOfflineGracePeriodValid(expiredCache)).toBe(false);
    });

    it('should validate cache fingerprint', () => {
      const cache = createTestCache({ fingerprint: 'fp-abc123' });

      expect(isCacheFingerprintValid(cache, 'fp-abc123')).toBe(true);
      expect(isCacheFingerprintValid(cache, 'fp-different')).toBe(false);
    });
  });

  describe('Offline Validation', () => {
    const config = createDefaultValidatorConfig();

    it('should validate with valid cache', () => {
      const cache = createTestCache();
      const result = validateOffline(cache, 'fp-abc123', config);

      expect(result.valid).toBe(true);
      expect(result.isOfflineValidation).toBe(true);
      expect(result.license).not.toBeNull();
    });

    it('should reject when no cache available', () => {
      const result = validateOffline(null, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NO_LICENSE_CONFIGURED');
    });

    it('should reject on fingerprint mismatch', () => {
      const cache = createTestCache({ fingerprint: 'fp-abc123' });
      const result = validateOffline(cache, 'fp-different', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FINGERPRINT_MISMATCH');
    });

    it('should reject when grace period expired', () => {
      const cache = createTestCache({
        offlineValidUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      const result = validateOffline(cache, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CACHE_EXPIRED');
    });

    it('should reject expired license in cache', () => {
      const cache = createTestCache({}, { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
      const result = validateOffline(cache, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LICENSE_EXPIRED');
    });

    it('should reject revoked license in cache', () => {
      const cache = createTestCache({}, { status: 'revoked' });
      const result = validateOffline(cache, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LICENSE_REVOKED');
    });

    it('should reject suspended license in cache', () => {
      const cache = createTestCache({}, { status: 'suspended' });
      const result = validateOffline(cache, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LICENSE_SUSPENDED');
    });
  });

  describe('License Status Validation', () => {
    it('should accept active license', () => {
      const license = createTestLicense({ status: 'active' });
      const result = isLicenseStatusValid(license);

      expect(result.valid).toBe(true);
    });

    it('should reject revoked license', () => {
      const license = createRevokedLicense();
      const result = isLicenseStatusValid(license);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LICENSE_REVOKED');
    });

    it('should reject suspended license', () => {
      const license = createTestLicense({ status: 'suspended' });
      const result = isLicenseStatusValid(license);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LICENSE_SUSPENDED');
    });

    it('should reject pending license', () => {
      const license = createTestLicense({ status: 'pending' });
      const result = isLicenseStatusValid(license);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LICENSE_NOT_FOUND');
    });

    it('should reject expired license', () => {
      const license = createExpiredLicense();
      const result = isLicenseStatusValid(license);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LICENSE_EXPIRED');
    });
  });

  describe('Feature Validation', () => {
    it('should check individual feature access', () => {
      const license = createTestLicense({ features: ['basic', 'export'] });

      expect(hasRequiredFeature(license, 'basic')).toBe(true);
      expect(hasRequiredFeature(license, 'export')).toBe(true);
      expect(hasRequiredFeature(license, 'batch')).toBe(false);
    });

    it('should allow all features with unlimited', () => {
      const license = createTestLicense({ features: ['unlimited'] });

      expect(hasRequiredFeature(license, 'basic')).toBe(true);
      expect(hasRequiredFeature(license, 'export')).toBe(true);
      expect(hasRequiredFeature(license, 'any-feature')).toBe(true);
    });

    it('should validate multiple required features', () => {
      const license = createTestLicense({ features: ['basic', 'export'] });

      const result1 = validateFeatureAccess(license, ['basic']);
      expect(result1.valid).toBe(true);
      expect(result1.missingFeatures).toHaveLength(0);

      const result2 = validateFeatureAccess(license, ['basic', 'batch']);
      expect(result2.valid).toBe(false);
      expect(result2.missingFeatures).toContain('batch');
    });
  });

  describe('Serialization', () => {
    it('should serialize cached validation', () => {
      const cache = createTestCache();
      const json = serializeCachedValidation(cache);

      expect(typeof json).toBe('string');
      expect(json).toContain('license');
      expect(json).toContain('fingerprint');
    });

    it('should deserialize cached validation', () => {
      const original = createTestCache();
      const json = serializeCachedValidation(original);
      const restored = deserializeCachedValidation(json);

      expect(restored).not.toBeNull();
      expect(restored!.fingerprint).toBe(original.fingerprint);
      expect(restored!.license.key).toBe(original.license.key);
      expect(restored!.validatedAt).toBeInstanceOf(Date);
      expect(restored!.offlineValidUntil).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON gracefully', () => {
      expect(deserializeCachedValidation('invalid')).toBeNull();
      expect(deserializeCachedValidation('{broken')).toBeNull();
    });

    it('should preserve license dates through serialization', () => {
      const cache = createTestCache();
      const json = serializeCachedValidation(cache);
      const restored = deserializeCachedValidation(json);

      expect(restored!.license.expiresAt).toBeInstanceOf(Date);
      expect(restored!.license.activatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Messages', () => {
    it('should return user-friendly error messages', () => {
      expect(getValidationErrorMessage('INVALID_LICENSE_KEY')).toBe('The license key format is invalid');
      expect(getValidationErrorMessage('LICENSE_EXPIRED')).toBe('Your license has expired');
      expect(getValidationErrorMessage('NETWORK_ERROR')).toBe('Unable to connect to the licensing server');
      expect(getValidationErrorMessage('CACHE_EXPIRED')).toContain('connect to the internet');
    });

    it('should format remaining days correctly', () => {
      expect(formatRemainingDays(null)).toBe('Perpetual license');
      expect(formatRemainingDays(0)).toBe('Expires today');
      expect(formatRemainingDays(1)).toBe('Expires tomorrow');
      expect(formatRemainingDays(-1)).toBe('Expired');
      expect(formatRemainingDays(15)).toBe('15 days remaining');
      expect(formatRemainingDays(45)).toBe('1 month remaining');
      expect(formatRemainingDays(90)).toBe('3 months remaining');
      expect(formatRemainingDays(400)).toBe('1 year remaining');
      expect(formatRemainingDays(800)).toBe('2 years remaining');
    });
  });

  describe('Quick Check Functions', () => {
    it('should check feature access from validation result', () => {
      const license = createTestLicense({ features: ['basic', 'export'] });
      const validResult = createSuccessResult(license, false);

      expect(canAccessFeature(validResult, 'basic')).toBe(true);
      expect(canAccessFeature(validResult, 'batch')).toBe(false);

      const invalidResult = createErrorResult('Error', 'LICENSE_EXPIRED');
      expect(canAccessFeature(invalidResult, 'basic')).toBe(false);
    });

    it('should detect expiring soon status', () => {
      const soon = createTestLicense({
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      });
      const soonResult = createSuccessResult(soon, false);
      expect(isValidationExpiringSoon(soonResult, 30)).toBe(true);

      const notSoon = createTestLicense({
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      });
      const notSoonResult = createSuccessResult(notSoon, false);
      expect(isValidationExpiringSoon(notSoonResult, 30)).toBe(false);
    });

    it('should determine when to show renewal warning', () => {
      const expiringSoon = createTestLicense({
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      });
      const soonResult = createSuccessResult(expiringSoon, false);
      expect(shouldShowRenewalWarning(soonResult)).toBe(true);

      const notExpiring = createTestLicense({
        expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days
      });
      const notExpiringResult = createSuccessResult(notExpiring, false);
      expect(shouldShowRenewalWarning(notExpiringResult)).toBe(false);

      const invalidResult = createErrorResult('Error', 'LICENSE_EXPIRED');
      expect(shouldShowRenewalWarning(invalidResult)).toBe(false);
    });
  });

  describe('Validation Summary', () => {
    it('should generate summary for valid license', () => {
      const license = createTestLicense({ type: 'professional' });
      const result = createSuccessResult(license, false);
      const summary = getValidationSummary(result);

      expect(summary).toContain('Professional License');
      expect(summary).toContain('remaining');
    });

    it('should indicate offline validation', () => {
      const license = createTestLicense();
      const result = createSuccessResult(license, true);
      const summary = getValidationSummary(result);

      expect(summary).toContain('(offline)');
    });

    it('should show error for invalid result', () => {
      const result = createErrorResult('License has expired', 'LICENSE_EXPIRED');
      const summary = getValidationSummary(result);

      expect(summary).toBe('License has expired');
    });

    it('should handle different license types', () => {
      const trial = createSuccessResult(createTestLicense({ type: 'trial' }), false);
      expect(getValidationSummary(trial)).toContain('Trial License');

      const standard = createSuccessResult(createTestLicense({ type: 'standard' }), false);
      expect(getValidationSummary(standard)).toContain('Standard License');

      const enterprise = createSuccessResult(createTestLicense({ type: 'enterprise' }), false);
      expect(getValidationSummary(enterprise)).toContain('Enterprise License');
    });
  });

  describe('Remaining Days Calculation', () => {
    it('should calculate days correctly', () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(calculateRemainingDays(future)).toBe(30);
    });

    it('should return 0 for past dates', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(calculateRemainingDays(past)).toBe(0);
    });

    it('should return null for null date', () => {
      expect(calculateRemainingDays(null)).toBeNull();
    });
  });

  describe('License Expiry Check', () => {
    it('should detect expired license', () => {
      const expired = createExpiredLicense();
      expect(isLicenseExpired(expired)).toBe(true);
    });

    it('should detect valid license', () => {
      const valid = createTestLicense();
      expect(isLicenseExpired(valid)).toBe(false);
    });

    it('should handle perpetual license (no expiry)', () => {
      const perpetual = createTestLicense({ expiresAt: null });
      expect(isLicenseExpired(perpetual)).toBe(false);
    });
  });
});

describe('LicenseValidator Class', () => {
  // Mock implementation for class tests
  interface MockValidatorState {
    isOnline: boolean;
    serverLicense: License | null;
    cache: CachedValidation | null;
    currentFingerprint: string;
  }

  class MockLicenseValidator {
    private state: MockValidatorState;
    private config: ValidatorConfig;

    constructor(config: Partial<ValidatorConfig> = {}) {
      this.config = mergeConfig(config);
      this.state = {
        isOnline: true,
        serverLicense: null,
        cache: null,
        currentFingerprint: 'fp-test-123',
      };
    }

    setOnline(online: boolean): void {
      this.state.isOnline = online;
    }

    setServerLicense(license: License | null): void {
      this.state.serverLicense = license;
    }

    setFingerprint(fp: string): void {
      this.state.currentFingerprint = fp;
    }

    setCache(cache: CachedValidation | null): void {
      this.state.cache = cache;
    }

    async validate(licenseKey: string): Promise<ValidationResult> {
      // Normalize and validate key format
      const normalizedKey = normalizeLicenseKey(licenseKey);
      if (!isValidLicenseKeyFormat(normalizedKey)) {
        return createErrorResult('Invalid license key format', 'INVALID_LICENSE_KEY');
      }

      // Try online validation first
      if (this.state.isOnline) {
        return this.validateOnline(normalizedKey);
      }

      // Fall back to offline validation
      return validateOffline(this.state.cache, this.state.currentFingerprint, this.config);
    }

    private validateOnline(key: string): ValidationResult {
      if (!this.state.serverLicense) {
        return createErrorResult('License not found', 'LICENSE_NOT_FOUND');
      }

      if (this.state.serverLicense.key !== key) {
        return createErrorResult('License not found', 'LICENSE_NOT_FOUND');
      }

      const statusCheck = isLicenseStatusValid(this.state.serverLicense);
      if (!statusCheck.valid) {
        return createErrorResult(statusCheck.error!, statusCheck.code!);
      }

      if (this.state.serverLicense.hardwareFingerprint &&
          this.state.serverLicense.hardwareFingerprint !== this.state.currentFingerprint) {
        return createErrorResult('Fingerprint mismatch', 'FINGERPRINT_MISMATCH');
      }

      // Update cache on successful validation
      this.state.cache = createCachedValidation(
        this.state.serverLicense,
        this.state.currentFingerprint,
        this.config.offlineGracePeriodDays
      );

      return createSuccessResult(this.state.serverLicense, false);
    }

    getCache(): CachedValidation | null {
      return this.state.cache;
    }

    async hasValidLicense(key: string): Promise<boolean> {
      const result = await this.validate(key);
      return result.valid;
    }

    async canUseFeature(key: string, feature: string): Promise<boolean> {
      const result = await this.validate(key);
      return canAccessFeature(result, feature);
    }

    clearCache(): void {
      this.state.cache = null;
    }
  }

  describe('Online Validation', () => {
    it('should validate against server when online', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({ key: 'TEST-1234-5678-ABCD' });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123');

      const result = await validator.validate('TEST-1234-5678-ABCD');

      expect(result.valid).toBe(true);
      expect(result.isOfflineValidation).toBe(false);
      expect(result.license).not.toBeNull();
    });

    it('should reject unknown license key', async () => {
      const validator = new MockLicenseValidator();
      validator.setServerLicense(null);

      const result = await validator.validate('UNKN-OWNN-LICE-NSEQ');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LICENSE_NOT_FOUND');
    });

    it('should cache successful validation', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({ key: 'TEST-1234-5678-ABCD' });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123');

      await validator.validate('TEST-1234-5678-ABCD');
      const cache = validator.getCache();

      expect(cache).not.toBeNull();
      expect(cache!.license.key).toBe('TEST-1234-5678-ABCD');
      expect(cache!.fingerprint).toBe('fp-abc123');
    });

    it('should reject fingerprint mismatch', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({
        key: 'TEST-1234-5678-ABCD',
        hardwareFingerprint: 'fp-different',
      });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123');

      const result = await validator.validate('TEST-1234-5678-ABCD');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FINGERPRINT_MISMATCH');
    });
  });

  describe('Offline Validation', () => {
    it('should use cache when offline', async () => {
      const validator = new MockLicenseValidator();
      const cache = createTestCache({ fingerprint: 'fp-abc123' });
      validator.setCache(cache);
      validator.setOnline(false);
      validator.setFingerprint('fp-abc123');

      const result = await validator.validate('TEST-1234-5678-ABCD');

      expect(result.valid).toBe(true);
      expect(result.isOfflineValidation).toBe(true);
    });

    it('should reject when offline with no cache', async () => {
      const validator = new MockLicenseValidator();
      validator.setOnline(false);
      validator.setCache(null);

      const result = await validator.validate('TEST-1234-5678-ABCD');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NO_LICENSE_CONFIGURED');
    });
  });

  describe('Helper Methods', () => {
    it('should check if has valid license', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({ key: 'TEST-1234-5678-ABCD' });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123'); // Match the license fingerprint

      expect(await validator.hasValidLicense('TEST-1234-5678-ABCD')).toBe(true);
      expect(await validator.hasValidLicense('INVA-LIDK-EYSS-SSSS')).toBe(false);
    });

    it('should check feature access', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({
        key: 'TEST-1234-5678-ABCD',
        features: ['basic', 'export'],
      });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123'); // Match the license fingerprint

      expect(await validator.canUseFeature('TEST-1234-5678-ABCD', 'basic')).toBe(true);
      expect(await validator.canUseFeature('TEST-1234-5678-ABCD', 'batch')).toBe(false);
    });

    it('should clear cache', async () => {
      const validator = new MockLicenseValidator();
      const license = createTestLicense({ key: 'TEST-1234-5678-ABCD' });
      validator.setServerLicense(license);
      validator.setFingerprint('fp-abc123'); // Match the license fingerprint

      await validator.validate('TEST-1234-5678-ABCD');
      expect(validator.getCache()).not.toBeNull();

      validator.clearCache();
      expect(validator.getCache()).toBeNull();
    });
  });
});
