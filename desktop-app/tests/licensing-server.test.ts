/**
 * Licensing Server Tests
 * Subtask 15.3: Set up cloud licensing server (Lambda/Firebase)
 *
 * Tests for:
 * - License data structures
 * - License validation logic
 * - Server request/response handling
 * - License activation/deactivation
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// =============================================================================
// Types
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

interface LicenseActivationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  machineInfo?: {
    hostname: string;
    platform: string;
    cpuModel: string;
  };
}

interface LicenseActivationResponse {
  success: boolean;
  license: License | null;
  token: string | null;
  expiresAt: Date | null;
  error?: string;
  errorCode?: string;
}

interface LicenseValidationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  token?: string;
}

interface LicenseValidationResponse {
  valid: boolean;
  license: License | null;
  remainingDays: number | null;
  error?: string;
  errorCode?: string;
}

interface LicenseDeactivationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  token: string;
}

interface LicenseDeactivationResponse {
  success: boolean;
  error?: string;
}

interface ServerConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

type ErrorCode =
  | 'INVALID_LICENSE_KEY'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_REVOKED'
  | 'FINGERPRINT_MISMATCH'
  | 'MAX_ACTIVATIONS_REACHED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'INVALID_TOKEN';

// =============================================================================
// Implementation Functions (Local for testing)
// =============================================================================

/**
 * Validate license key format
 */
function isValidLicenseKeyFormat(key: string): boolean {
  if (!key) return false;

  // Format: XXXX-XXXX-XXXX-XXXX (alphanumeric, uppercase)
  const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return keyRegex.test(key);
}

/**
 * Normalize license key (uppercase, trim)
 */
function normalizeLicenseKey(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Generate license key
 */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments: string[] = [];

  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  return segments.join('-');
}

/**
 * Create empty license
 */
function createEmptyLicense(): License {
  return {
    id: '',
    key: '',
    type: 'trial',
    status: 'pending',
    userId: '',
    email: '',
    hardwareFingerprint: '',
    activatedAt: null,
    expiresAt: null,
    maxActivations: 1,
    currentActivations: 0,
    features: [],
    metadata: {},
  };
}

/**
 * Create license with defaults
 */
function createLicense(partial: Partial<License>): License {
  return {
    ...createEmptyLicense(),
    ...partial,
  };
}

/**
 * Check if license is expired
 */
function isLicenseExpired(license: License): boolean {
  if (!license.expiresAt) return false;
  return new Date() > new Date(license.expiresAt);
}

/**
 * Check if license can be activated
 */
function canActivateLicense(license: License): boolean {
  if (license.status !== 'active' && license.status !== 'pending') {
    return false;
  }

  if (isLicenseExpired(license)) {
    return false;
  }

  if (license.currentActivations >= license.maxActivations) {
    return false;
  }

  return true;
}

/**
 * Calculate remaining days
 */
function calculateRemainingDays(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Validate license against fingerprint
 */
function validateLicenseFingerprint(license: License, fingerprint: string): boolean {
  if (!license.hardwareFingerprint) return true; // Not yet bound
  return license.hardwareFingerprint === fingerprint;
}

/**
 * Get license type limits
 */
function getLicenseTypeLimits(type: LicenseType): { maxActivations: number; features: string[] } {
  switch (type) {
    case 'trial':
      return { maxActivations: 1, features: ['basic'] };
    case 'standard':
      return { maxActivations: 2, features: ['basic', 'export'] };
    case 'professional':
      return { maxActivations: 5, features: ['basic', 'export', 'batch', 'api'] };
    case 'enterprise':
      return { maxActivations: 100, features: ['basic', 'export', 'batch', 'api', 'unlimited'] };
  }
}

/**
 * Create activation response
 */
function createActivationResponse(
  success: boolean,
  license: License | null,
  token: string | null,
  error?: string,
  errorCode?: ErrorCode
): LicenseActivationResponse {
  return {
    success,
    license,
    token,
    expiresAt: license?.expiresAt || null,
    error,
    errorCode,
  };
}

/**
 * Create validation response
 */
function createValidationResponse(
  valid: boolean,
  license: License | null,
  error?: string,
  errorCode?: ErrorCode
): LicenseValidationResponse {
  return {
    valid,
    license,
    remainingDays: license ? calculateRemainingDays(license.expiresAt) : null,
    error,
    errorCode,
  };
}

/**
 * Create deactivation response
 */
function createDeactivationResponse(
  success: boolean,
  error?: string
): LicenseDeactivationResponse {
  return {
    success,
    error,
  };
}

/**
 * Simulate license activation
 */
function simulateActivation(
  request: LicenseActivationRequest,
  licenses: Map<string, License>
): LicenseActivationResponse {
  const normalizedKey = normalizeLicenseKey(request.licenseKey);

  if (!isValidLicenseKeyFormat(normalizedKey)) {
    return createActivationResponse(false, null, null, 'Invalid license key format', 'INVALID_LICENSE_KEY');
  }

  const license = licenses.get(normalizedKey);

  if (!license) {
    return createActivationResponse(false, null, null, 'License key not found', 'INVALID_LICENSE_KEY');
  }

  if (license.status === 'revoked') {
    return createActivationResponse(false, null, null, 'License has been revoked', 'LICENSE_REVOKED');
  }

  if (isLicenseExpired(license)) {
    return createActivationResponse(false, null, null, 'License has expired', 'LICENSE_EXPIRED');
  }

  if (license.hardwareFingerprint && license.hardwareFingerprint !== request.hardwareFingerprint) {
    return createActivationResponse(false, null, null, 'Hardware fingerprint mismatch', 'FINGERPRINT_MISMATCH');
  }

  if (!canActivateLicense(license)) {
    return createActivationResponse(false, null, null, 'Maximum activations reached', 'MAX_ACTIVATIONS_REACHED');
  }

  // Activate license
  const activatedLicense: License = {
    ...license,
    status: 'active',
    hardwareFingerprint: request.hardwareFingerprint,
    activatedAt: new Date(),
    currentActivations: license.currentActivations + 1,
  };

  licenses.set(normalizedKey, activatedLicense);

  const token = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return createActivationResponse(true, activatedLicense, token);
}

/**
 * Simulate license validation
 */
function simulateValidation(
  request: LicenseValidationRequest,
  licenses: Map<string, License>
): LicenseValidationResponse {
  const normalizedKey = normalizeLicenseKey(request.licenseKey);

  if (!isValidLicenseKeyFormat(normalizedKey)) {
    return createValidationResponse(false, null, 'Invalid license key format', 'INVALID_LICENSE_KEY');
  }

  const license = licenses.get(normalizedKey);

  if (!license) {
    return createValidationResponse(false, null, 'License key not found', 'INVALID_LICENSE_KEY');
  }

  if (license.status === 'revoked') {
    return createValidationResponse(false, license, 'License has been revoked', 'LICENSE_REVOKED');
  }

  if (license.status === 'suspended') {
    return createValidationResponse(false, license, 'License has been suspended', 'LICENSE_REVOKED');
  }

  if (isLicenseExpired(license)) {
    return createValidationResponse(false, license, 'License has expired', 'LICENSE_EXPIRED');
  }

  if (!validateLicenseFingerprint(license, request.hardwareFingerprint)) {
    return createValidationResponse(false, license, 'Hardware fingerprint mismatch', 'FINGERPRINT_MISMATCH');
  }

  return createValidationResponse(true, license);
}

/**
 * Simulate license deactivation
 */
function simulateDeactivation(
  request: LicenseDeactivationRequest,
  licenses: Map<string, License>
): LicenseDeactivationResponse {
  const normalizedKey = normalizeLicenseKey(request.licenseKey);
  const license = licenses.get(normalizedKey);

  if (!license) {
    return createDeactivationResponse(false, 'License not found');
  }

  if (license.hardwareFingerprint !== request.hardwareFingerprint) {
    return createDeactivationResponse(false, 'Hardware fingerprint mismatch');
  }

  // Deactivate
  const deactivatedLicense: License = {
    ...license,
    hardwareFingerprint: '',
    currentActivations: Math.max(0, license.currentActivations - 1),
  };

  licenses.set(normalizedKey, deactivatedLicense);

  return createDeactivationResponse(true);
}

/**
 * Create default server config
 */
function createDefaultServerConfig(): ServerConfig {
  return {
    baseUrl: 'https://api.contpaqi-license.com',
    apiKey: '',
    timeout: 10000,
    retryCount: 3,
    retryDelay: 1000,
  };
}

/**
 * Build API URL
 */
function buildApiUrl(config: ServerConfig, endpoint: string): string {
  const base = config.baseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Create request headers
 */
function createRequestHeaders(config: ServerConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    'User-Agent': 'ContpaqiAIBridge/1.0',
  };
}

/**
 * Serialize license for storage
 */
function serializeLicense(license: License): string {
  return JSON.stringify({
    ...license,
    activatedAt: license.activatedAt?.toISOString() || null,
    expiresAt: license.expiresAt?.toISOString() || null,
  });
}

/**
 * Deserialize license from storage
 */
function deserializeLicense(json: string): License | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      activatedAt: data.activatedAt ? new Date(data.activatedAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Get license status display text
 */
function getLicenseStatusText(status: LicenseStatus): string {
  const statusTexts: Record<LicenseStatus, string> = {
    active: 'Active',
    expired: 'Expired',
    revoked: 'Revoked',
    suspended: 'Suspended',
    pending: 'Pending Activation',
  };
  return statusTexts[status];
}

/**
 * Get license type display text
 */
function getLicenseTypeText(type: LicenseType): string {
  const typeTexts: Record<LicenseType, string> = {
    trial: 'Trial',
    standard: 'Standard',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return typeTexts[type];
}

/**
 * Check if license has feature
 */
function hasFeature(license: License, feature: string): boolean {
  return license.features.includes(feature) || license.features.includes('unlimited');
}

// =============================================================================
// Tests: License Key Validation
// =============================================================================

describe('License Key Validation', () => {
  describe('isValidLicenseKeyFormat', () => {
    it('should accept valid license key format', () => {
      expect(isValidLicenseKeyFormat('ABCD-1234-EFGH-5678')).toBe(true);
    });

    it('should accept all uppercase letters', () => {
      expect(isValidLicenseKeyFormat('AAAA-BBBB-CCCC-DDDD')).toBe(true);
    });

    it('should accept all numbers', () => {
      expect(isValidLicenseKeyFormat('1234-5678-9012-3456')).toBe(true);
    });

    it('should reject lowercase letters', () => {
      expect(isValidLicenseKeyFormat('abcd-1234-efgh-5678')).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(isValidLicenseKeyFormat('ABC-1234-EFGH-5678')).toBe(false);
    });

    it('should reject wrong format', () => {
      expect(isValidLicenseKeyFormat('ABCD1234EFGH5678')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidLicenseKeyFormat('')).toBe(false);
    });
  });

  describe('normalizeLicenseKey', () => {
    it('should convert to uppercase', () => {
      expect(normalizeLicenseKey('abcd-1234-efgh-5678')).toBe('ABCD-1234-EFGH-5678');
    });

    it('should trim whitespace', () => {
      expect(normalizeLicenseKey('  ABCD-1234-EFGH-5678  ')).toBe('ABCD-1234-EFGH-5678');
    });

    it('should remove internal spaces', () => {
      expect(normalizeLicenseKey('ABCD - 1234 - EFGH - 5678')).toBe('ABCD-1234-EFGH-5678');
    });
  });

  describe('generateLicenseKey', () => {
    it('should generate valid format key', () => {
      const key = generateLicenseKey();
      expect(isValidLicenseKeyFormat(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateLicenseKey());
      }
      expect(keys.size).toBe(100);
    });
  });
});

// =============================================================================
// Tests: License Creation
// =============================================================================

describe('License Creation', () => {
  describe('createEmptyLicense', () => {
    it('should create empty license with defaults', () => {
      const license = createEmptyLicense();

      expect(license.id).toBe('');
      expect(license.key).toBe('');
      expect(license.type).toBe('trial');
      expect(license.status).toBe('pending');
      expect(license.maxActivations).toBe(1);
      expect(license.currentActivations).toBe(0);
      expect(license.features).toEqual([]);
    });
  });

  describe('createLicense', () => {
    it('should create license with partial data', () => {
      const license = createLicense({
        id: 'lic_123',
        key: 'ABCD-1234-EFGH-5678',
        type: 'professional',
        status: 'active',
      });

      expect(license.id).toBe('lic_123');
      expect(license.key).toBe('ABCD-1234-EFGH-5678');
      expect(license.type).toBe('professional');
      expect(license.status).toBe('active');
      expect(license.maxActivations).toBe(1); // Default
    });
  });
});

// =============================================================================
// Tests: License Expiry
// =============================================================================

describe('License Expiry', () => {
  describe('isLicenseExpired', () => {
    it('should return false for non-expired license', () => {
      const license = createLicense({
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });
      expect(isLicenseExpired(license)).toBe(false);
    });

    it('should return true for expired license', () => {
      const license = createLicense({
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });
      expect(isLicenseExpired(license)).toBe(true);
    });

    it('should return false for license without expiry', () => {
      const license = createLicense({
        expiresAt: null,
      });
      expect(isLicenseExpired(license)).toBe(false);
    });
  });

  describe('calculateRemainingDays', () => {
    it('should calculate remaining days correctly', () => {
      const futureDate = new Date(Date.now() + 5 * 86400000); // 5 days from now
      const remaining = calculateRemainingDays(futureDate);
      expect(remaining).toBeGreaterThanOrEqual(4);
      expect(remaining).toBeLessThanOrEqual(6);
    });

    it('should return 0 for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000);
      expect(calculateRemainingDays(pastDate)).toBe(0);
    });

    it('should return null for null date', () => {
      expect(calculateRemainingDays(null)).toBeNull();
    });
  });
});

// =============================================================================
// Tests: License Activation
// =============================================================================

describe('License Activation', () => {
  describe('canActivateLicense', () => {
    it('should return true for pending license', () => {
      const license = createLicense({
        status: 'pending',
        maxActivations: 1,
        currentActivations: 0,
      });
      expect(canActivateLicense(license)).toBe(true);
    });

    it('should return true for active license with available activations', () => {
      const license = createLicense({
        status: 'active',
        maxActivations: 2,
        currentActivations: 1,
      });
      expect(canActivateLicense(license)).toBe(true);
    });

    it('should return false for revoked license', () => {
      const license = createLicense({
        status: 'revoked',
      });
      expect(canActivateLicense(license)).toBe(false);
    });

    it('should return false for expired license', () => {
      const license = createLicense({
        status: 'active',
        expiresAt: new Date(Date.now() - 86400000),
      });
      expect(canActivateLicense(license)).toBe(false);
    });

    it('should return false when max activations reached', () => {
      const license = createLicense({
        status: 'active',
        maxActivations: 1,
        currentActivations: 1,
      });
      expect(canActivateLicense(license)).toBe(false);
    });
  });

  describe('validateLicenseFingerprint', () => {
    it('should return true for matching fingerprint', () => {
      const license = createLicense({
        hardwareFingerprint: 'fp_12345',
      });
      expect(validateLicenseFingerprint(license, 'fp_12345')).toBe(true);
    });

    it('should return false for non-matching fingerprint', () => {
      const license = createLicense({
        hardwareFingerprint: 'fp_12345',
      });
      expect(validateLicenseFingerprint(license, 'fp_different')).toBe(false);
    });

    it('should return true for empty fingerprint (not yet bound)', () => {
      const license = createLicense({
        hardwareFingerprint: '',
      });
      expect(validateLicenseFingerprint(license, 'fp_any')).toBe(true);
    });
  });
});

// =============================================================================
// Tests: License Type Limits
// =============================================================================

describe('License Type Limits', () => {
  describe('getLicenseTypeLimits', () => {
    it('should return trial limits', () => {
      const limits = getLicenseTypeLimits('trial');
      expect(limits.maxActivations).toBe(1);
      expect(limits.features).toContain('basic');
    });

    it('should return standard limits', () => {
      const limits = getLicenseTypeLimits('standard');
      expect(limits.maxActivations).toBe(2);
      expect(limits.features).toContain('export');
    });

    it('should return professional limits', () => {
      const limits = getLicenseTypeLimits('professional');
      expect(limits.maxActivations).toBe(5);
      expect(limits.features).toContain('batch');
      expect(limits.features).toContain('api');
    });

    it('should return enterprise limits', () => {
      const limits = getLicenseTypeLimits('enterprise');
      expect(limits.maxActivations).toBe(100);
      expect(limits.features).toContain('unlimited');
    });
  });

  describe('hasFeature', () => {
    it('should return true for included feature', () => {
      const license = createLicense({
        features: ['basic', 'export'],
      });
      expect(hasFeature(license, 'export')).toBe(true);
    });

    it('should return false for missing feature', () => {
      const license = createLicense({
        features: ['basic'],
      });
      expect(hasFeature(license, 'batch')).toBe(false);
    });

    it('should return true for any feature with unlimited', () => {
      const license = createLicense({
        features: ['unlimited'],
      });
      expect(hasFeature(license, 'any_feature')).toBe(true);
    });
  });
});

// =============================================================================
// Tests: Server Simulation
// =============================================================================

describe('Server Simulation', () => {
  let licenses: Map<string, License>;

  beforeEach(() => {
    licenses = new Map();

    // Add test license
    licenses.set('TEST-1234-ABCD-5678', createLicense({
      id: 'lic_test',
      key: 'TEST-1234-ABCD-5678',
      type: 'professional',
      status: 'active',
      maxActivations: 2,
      currentActivations: 0,
      expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days
      features: ['basic', 'export', 'batch'],
    }));

    // Add expired license
    licenses.set('EXPR-1234-ABCD-5678', createLicense({
      id: 'lic_expired',
      key: 'EXPR-1234-ABCD-5678',
      type: 'standard',
      status: 'active',
      expiresAt: new Date(Date.now() - 86400000), // Yesterday
    }));

    // Add revoked license
    licenses.set('REVK-1234-ABCD-5678', createLicense({
      id: 'lic_revoked',
      key: 'REVK-1234-ABCD-5678',
      type: 'standard',
      status: 'revoked',
    }));
  });

  describe('simulateActivation', () => {
    it('should activate valid license', () => {
      const response = simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.success).toBe(true);
      expect(response.license).not.toBeNull();
      expect(response.license?.status).toBe('active');
      expect(response.license?.hardwareFingerprint).toBe('fp_123');
      expect(response.token).not.toBeNull();
    });

    it('should reject invalid license key', () => {
      const response = simulateActivation({
        licenseKey: 'INVALID',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('INVALID_LICENSE_KEY');
    });

    it('should reject non-existent license', () => {
      const response = simulateActivation({
        licenseKey: 'NONE-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('INVALID_LICENSE_KEY');
    });

    it('should reject expired license', () => {
      const response = simulateActivation({
        licenseKey: 'EXPR-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('LICENSE_EXPIRED');
    });

    it('should reject revoked license', () => {
      const response = simulateActivation({
        licenseKey: 'REVK-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('LICENSE_REVOKED');
    });

    it('should increment activation count', () => {
      simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      const license = licenses.get('TEST-1234-ABCD-5678');
      expect(license?.currentActivations).toBe(1);
    });
  });

  describe('simulateValidation', () => {
    it('should validate active license', () => {
      // First activate
      simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      const response = simulateValidation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.valid).toBe(true);
      expect(response.remainingDays).toBeGreaterThan(0);
    });

    it('should reject fingerprint mismatch', () => {
      // First activate
      simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      const response = simulateValidation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_different',
      }, licenses);

      expect(response.valid).toBe(false);
      expect(response.errorCode).toBe('FINGERPRINT_MISMATCH');
    });

    it('should reject expired license', () => {
      const response = simulateValidation({
        licenseKey: 'EXPR-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      expect(response.valid).toBe(false);
      expect(response.errorCode).toBe('LICENSE_EXPIRED');
    });
  });

  describe('simulateDeactivation', () => {
    it('should deactivate license', () => {
      // First activate
      simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      const response = simulateDeactivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
        token: 'token_123',
      }, licenses);

      expect(response.success).toBe(true);

      const license = licenses.get('TEST-1234-ABCD-5678');
      expect(license?.currentActivations).toBe(0);
      expect(license?.hardwareFingerprint).toBe('');
    });

    it('should reject fingerprint mismatch on deactivation', () => {
      // First activate
      simulateActivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_123',
      }, licenses);

      const response = simulateDeactivation({
        licenseKey: 'TEST-1234-ABCD-5678',
        hardwareFingerprint: 'fp_different',
        token: 'token_123',
      }, licenses);

      expect(response.success).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Server Configuration
// =============================================================================

describe('Server Configuration', () => {
  describe('createDefaultServerConfig', () => {
    it('should create config with defaults', () => {
      const config = createDefaultServerConfig();

      expect(config.baseUrl).toBe('https://api.contpaqi-license.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryCount).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });
  });

  describe('buildApiUrl', () => {
    it('should build URL with endpoint', () => {
      const config = createDefaultServerConfig();
      const url = buildApiUrl(config, '/licenses/validate');
      expect(url).toBe('https://api.contpaqi-license.com/licenses/validate');
    });

    it('should handle endpoint without leading slash', () => {
      const config = createDefaultServerConfig();
      const url = buildApiUrl(config, 'licenses/validate');
      expect(url).toBe('https://api.contpaqi-license.com/licenses/validate');
    });

    it('should handle base URL with trailing slash', () => {
      const config = { ...createDefaultServerConfig(), baseUrl: 'https://api.example.com/' };
      const url = buildApiUrl(config, '/test');
      expect(url).toBe('https://api.example.com/test');
    });
  });

  describe('createRequestHeaders', () => {
    it('should create headers with API key', () => {
      const config = { ...createDefaultServerConfig(), apiKey: 'test_key_123' };
      const headers = createRequestHeaders(config);

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-API-Key']).toBe('test_key_123');
      expect(headers['User-Agent']).toContain('ContpaqiAIBridge');
    });
  });
});

// =============================================================================
// Tests: Serialization
// =============================================================================

describe('Serialization', () => {
  describe('serializeLicense', () => {
    it('should serialize license to JSON', () => {
      const license = createLicense({
        id: 'lic_123',
        key: 'TEST-1234-ABCD-5678',
        activatedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-12-31'),
      });

      const json = serializeLicense(license);
      expect(json).toContain('lic_123');
      expect(json).toContain('TEST-1234-ABCD-5678');
      expect(json).toContain('2024-01-01');
    });
  });

  describe('deserializeLicense', () => {
    it('should deserialize valid JSON', () => {
      const original = createLicense({
        id: 'lic_123',
        key: 'TEST-1234-ABCD-5678',
        activatedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-12-31'),
      });

      const json = serializeLicense(original);
      const restored = deserializeLicense(json);

      expect(restored).not.toBeNull();
      expect(restored?.id).toBe('lic_123');
      expect(restored?.activatedAt).toBeInstanceOf(Date);
      expect(restored?.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null for invalid JSON', () => {
      expect(deserializeLicense('invalid json')).toBeNull();
    });
  });
});

// =============================================================================
// Tests: Display Text
// =============================================================================

describe('Display Text', () => {
  describe('getLicenseStatusText', () => {
    it('should return correct status text', () => {
      expect(getLicenseStatusText('active')).toBe('Active');
      expect(getLicenseStatusText('expired')).toBe('Expired');
      expect(getLicenseStatusText('revoked')).toBe('Revoked');
      expect(getLicenseStatusText('suspended')).toBe('Suspended');
      expect(getLicenseStatusText('pending')).toBe('Pending Activation');
    });
  });

  describe('getLicenseTypeText', () => {
    it('should return correct type text', () => {
      expect(getLicenseTypeText('trial')).toBe('Trial');
      expect(getLicenseTypeText('standard')).toBe('Standard');
      expect(getLicenseTypeText('professional')).toBe('Professional');
      expect(getLicenseTypeText('enterprise')).toBe('Enterprise');
    });
  });
});
