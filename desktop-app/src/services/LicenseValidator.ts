/**
 * License Validator Service
 * Subtask 15.4: Create license validation endpoint
 *
 * Provides a unified API for validating licenses by integrating:
 * - Hardware fingerprint collection
 * - Server-side license validation
 * - Local caching for offline support
 * - Feature access control
 */

import {
  License,
  LicenseType,
  LicenseStatus,
  LicenseValidationRequest,
  LicenseValidationResponse,
  LicensingServerClient,
  isValidLicenseKeyFormat,
  normalizeLicenseKey,
  isLicenseExpired,
  calculateRemainingDays,
  hasFeature,
  serializeLicense,
  deserializeLicense,
} from './LicensingServer';

// =============================================================================
// Types
// =============================================================================

export type ValidationErrorCode =
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

export interface ValidationResult {
  valid: boolean;
  license: License | null;
  remainingDays: number | null;
  isOfflineValidation: boolean;
  validatedAt: Date;
  error?: string;
  errorCode?: ValidationErrorCode;
}

export interface CachedValidation {
  license: License;
  validatedAt: Date;
  fingerprint: string;
  offlineValidUntil: Date;
}

export interface ValidatorConfig {
  serverUrl: string;
  apiKey: string;
  offlineGracePeriodDays: number;
  cacheValidityMinutes: number;
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

export interface FeatureAccessResult {
  valid: boolean;
  missingFeatures: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  serverUrl: 'https://api.contpaqi-license.com',
  apiKey: '',
  offlineGracePeriodDays: 7,
  cacheValidityMinutes: 60,
  autoRetryOnFailure: true,
  maxRetries: 3,
};

const ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
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

// =============================================================================
// Validation Result Functions
// =============================================================================

/**
 * Create validation result
 */
export function createValidationResult(
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

/**
 * Create success validation result
 */
export function createSuccessResult(license: License, isOffline: boolean = false): ValidationResult {
  return createValidationResult(true, license, isOffline);
}

/**
 * Create error validation result
 */
export function createErrorResult(error: string, errorCode: ValidationErrorCode): ValidationResult {
  return createValidationResult(false, null, false, error, errorCode);
}

// =============================================================================
// Config Functions
// =============================================================================

/**
 * Create default validator config
 */
export function createDefaultValidatorConfig(): ValidatorConfig {
  return { ...DEFAULT_VALIDATOR_CONFIG };
}

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial: Partial<ValidatorConfig>): ValidatorConfig {
  return {
    ...DEFAULT_VALIDATOR_CONFIG,
    ...partial,
  };
}

// =============================================================================
// Cache Management Functions
// =============================================================================

/**
 * Create cached validation entry
 */
export function createCachedValidation(
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

/**
 * Check if cache is still valid by age
 */
export function isCacheValid(cache: CachedValidation, validityMinutes: number): boolean {
  const now = new Date();
  const cacheAge = now.getTime() - cache.validatedAt.getTime();
  const maxAge = validityMinutes * 60 * 1000;
  return cacheAge < maxAge;
}

/**
 * Check if offline grace period is still valid
 */
export function isOfflineGracePeriodValid(cache: CachedValidation): boolean {
  const now = new Date();
  return now < cache.offlineValidUntil;
}

/**
 * Check if cache fingerprint matches current fingerprint
 */
export function isCacheFingerprintValid(cache: CachedValidation, fingerprint: string): boolean {
  return cache.fingerprint === fingerprint;
}

// =============================================================================
// License Status Validation
// =============================================================================

/**
 * Check if license status allows usage
 */
export function isLicenseStatusValid(license: License): {
  valid: boolean;
  error?: string;
  code?: ValidationErrorCode;
} {
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

// =============================================================================
// Offline Validation
// =============================================================================

/**
 * Validate license using cached data (offline mode)
 */
export function validateOffline(
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

// =============================================================================
// Feature Validation
// =============================================================================

/**
 * Check if license has required feature
 */
export function hasRequiredFeature(license: License, feature: string): boolean {
  return hasFeature(license, feature);
}

/**
 * Validate access to multiple features
 */
export function validateFeatureAccess(license: License, requiredFeatures: string[]): FeatureAccessResult {
  const missingFeatures = requiredFeatures.filter(f => !hasRequiredFeature(license, f));
  return {
    valid: missingFeatures.length === 0,
    missingFeatures,
  };
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize cached validation for storage
 */
export function serializeCachedValidation(cache: CachedValidation): string {
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

/**
 * Deserialize cached validation from storage
 */
export function deserializeCachedValidation(json: string): CachedValidation | null {
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

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Get user-friendly error message for error code
 */
export function getValidationErrorMessage(code: ValidationErrorCode): string {
  return ERROR_MESSAGES[code];
}

/**
 * Format remaining days for display
 */
export function formatRemainingDays(days: number | null): string {
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

// =============================================================================
// Quick Check Functions
// =============================================================================

/**
 * Check if validation result allows feature access
 */
export function canAccessFeature(result: ValidationResult, feature: string): boolean {
  if (!result.valid || !result.license) return false;
  return hasRequiredFeature(result.license, feature);
}

/**
 * Check if license is expiring soon
 */
export function isValidationExpiringSoon(result: ValidationResult, thresholdDays: number = 30): boolean {
  if (!result.valid || result.remainingDays === null) return false;
  return result.remainingDays <= thresholdDays;
}

/**
 * Determine if renewal warning should be shown
 */
export function shouldShowRenewalWarning(result: ValidationResult): boolean {
  if (!result.valid) return false;
  return isValidationExpiringSoon(result, 30);
}

/**
 * Generate validation summary for display
 */
export function getValidationSummary(result: ValidationResult): string {
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
// License Validator Class
// =============================================================================

/**
 * License Validator
 * Unified license validation service with online/offline support
 */
export class LicenseValidator {
  private config: ValidatorConfig;
  private serverClient: LicensingServerClient;
  private cache: CachedValidation | null = null;
  private currentFingerprint: string = '';
  private isOnline: boolean = true;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = mergeConfig(config);
    this.serverClient = new LicensingServerClient({
      baseUrl: this.config.serverUrl,
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.serverClient.setApiKey(apiKey);
  }

  /**
   * Set hardware fingerprint
   */
  setFingerprint(fingerprint: string): void {
    this.currentFingerprint = fingerprint;
  }

  /**
   * Get current fingerprint
   */
  getFingerprint(): string {
    return this.currentFingerprint;
  }

  /**
   * Set online status
   */
  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Validate license key
   */
  async validate(licenseKey: string): Promise<ValidationResult> {
    // Normalize and validate key format
    const normalizedKey = normalizeLicenseKey(licenseKey);
    if (!isValidLicenseKeyFormat(normalizedKey)) {
      return createErrorResult('Invalid license key format', 'INVALID_LICENSE_KEY');
    }

    // Check fingerprint
    if (!this.currentFingerprint) {
      return createErrorResult('Hardware fingerprint not available', 'FINGERPRINT_ERROR');
    }

    // Try online validation first
    if (this.isOnline) {
      const onlineResult = await this.validateOnline(normalizedKey);
      if (onlineResult.valid || onlineResult.errorCode !== 'NETWORK_ERROR') {
        return onlineResult;
      }
      // Fall through to offline on network error
    }

    // Fall back to offline validation
    return validateOffline(this.cache, this.currentFingerprint, this.config);
  }

  /**
   * Validate license online against server
   */
  private async validateOnline(licenseKey: string): Promise<ValidationResult> {
    try {
      const request: LicenseValidationRequest = {
        licenseKey,
        hardwareFingerprint: this.currentFingerprint,
      };

      const response = await this.serverClient.validate(request);

      if (response.valid && response.license) {
        // Update cache on successful validation
        this.cache = createCachedValidation(
          response.license,
          this.currentFingerprint,
          this.config.offlineGracePeriodDays
        );

        return createSuccessResult(response.license, false);
      }

      // Map server error to validation error
      const errorCode = this.mapServerError(response.errorCode);
      return createErrorResult(response.error || 'Validation failed', errorCode);
    } catch (error) {
      return createErrorResult('Network error', 'NETWORK_ERROR');
    }
  }

  /**
   * Map server error code to validation error code
   */
  private mapServerError(serverCode?: string): ValidationErrorCode {
    switch (serverCode) {
      case 'INVALID_LICENSE_KEY':
        return 'INVALID_LICENSE_KEY';
      case 'LICENSE_EXPIRED':
        return 'LICENSE_EXPIRED';
      case 'LICENSE_REVOKED':
        return 'LICENSE_REVOKED';
      case 'FINGERPRINT_MISMATCH':
        return 'FINGERPRINT_MISMATCH';
      case 'NETWORK_ERROR':
        return 'NETWORK_ERROR';
      default:
        return 'SERVER_ERROR';
    }
  }

  /**
   * Check if has valid license
   */
  async hasValidLicense(licenseKey: string): Promise<boolean> {
    const result = await this.validate(licenseKey);
    return result.valid;
  }

  /**
   * Check if feature is accessible
   */
  async canUseFeature(licenseKey: string, feature: string): Promise<boolean> {
    const result = await this.validate(licenseKey);
    return canAccessFeature(result, feature);
  }

  /**
   * Check multiple features
   */
  async validateFeatures(licenseKey: string, features: string[]): Promise<FeatureAccessResult> {
    const result = await this.validate(licenseKey);
    if (!result.valid || !result.license) {
      return { valid: false, missingFeatures: features };
    }
    return validateFeatureAccess(result.license, features);
  }

  /**
   * Get cached validation
   */
  getCache(): CachedValidation | null {
    return this.cache;
  }

  /**
   * Set cache from stored data
   */
  setCache(cache: CachedValidation | null): void {
    this.cache = cache;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Load cache from storage
   */
  loadCache(json: string): boolean {
    const cache = deserializeCachedValidation(json);
    if (cache) {
      this.cache = cache;
      return true;
    }
    return false;
  }

  /**
   * Save cache to storage
   */
  saveCache(): string | null {
    if (!this.cache) return null;
    return serializeCachedValidation(this.cache);
  }

  /**
   * Check if cache is fresh
   */
  isCacheFresh(): boolean {
    if (!this.cache) return false;
    return isCacheValid(this.cache, this.config.cacheValidityMinutes);
  }

  /**
   * Check if can work offline
   */
  canWorkOffline(): boolean {
    if (!this.cache) return false;
    return isOfflineGracePeriodValid(this.cache);
  }

  /**
   * Get validation summary
   */
  async getValidationSummary(licenseKey: string): Promise<string> {
    const result = await this.validate(licenseKey);
    return getValidationSummary(result);
  }

  /**
   * Check if renewal warning should be shown
   */
  async shouldShowRenewalWarning(licenseKey: string): Promise<boolean> {
    const result = await this.validate(licenseKey);
    return shouldShowRenewalWarning(result);
  }

  /**
   * Get remaining days
   */
  async getRemainingDays(licenseKey: string): Promise<number | null> {
    const result = await this.validate(licenseKey);
    return result.remainingDays;
  }

  /**
   * Get license type
   */
  async getLicenseType(licenseKey: string): Promise<LicenseType | null> {
    const result = await this.validate(licenseKey);
    return result.license?.type || null;
  }

  /**
   * Get config
   */
  getConfig(): ValidatorConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(partial: Partial<ValidatorConfig>): void {
    this.config = mergeConfig({ ...this.config, ...partial });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create license validator with optional config
 */
export function createLicenseValidator(config: Partial<ValidatorConfig> = {}): LicenseValidator {
  return new LicenseValidator(config);
}

// =============================================================================
// Default Export
// =============================================================================

export default LicenseValidator;

// Re-export types from LicensingServer for convenience
export type { License, LicenseType, LicenseStatus };
