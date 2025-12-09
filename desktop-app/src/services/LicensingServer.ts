/**
 * Licensing Server Service
 * Subtask 15.3: Set up cloud licensing server (Lambda/Firebase)
 *
 * Provides:
 * - License data structures and types
 * - License validation and activation logic
 * - Server communication client
 * - Local license caching and persistence
 * - Offline support preparation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// =============================================================================
// Types
// =============================================================================

export type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'pending';

export interface License {
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

export interface LicenseActivationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  machineInfo?: {
    hostname: string;
    platform: string;
    cpuModel: string;
  };
}

export interface LicenseActivationResponse {
  success: boolean;
  license: License | null;
  token: string | null;
  expiresAt: Date | null;
  error?: string;
  errorCode?: ErrorCode;
}

export interface LicenseValidationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  token?: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  license: License | null;
  remainingDays: number | null;
  error?: string;
  errorCode?: ErrorCode;
}

export interface LicenseDeactivationRequest {
  licenseKey: string;
  hardwareFingerprint: string;
  token: string;
}

export interface LicenseDeactivationResponse {
  success: boolean;
  error?: string;
}

export interface ServerConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

export type ErrorCode =
  | 'INVALID_LICENSE_KEY'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_REVOKED'
  | 'FINGERPRINT_MISMATCH'
  | 'MAX_ACTIVATIONS_REACHED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'INVALID_TOKEN';

export interface LicenseTypeLimits {
  maxActivations: number;
  features: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  baseUrl: 'https://api.contpaqi-license.com',
  apiKey: '',
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
};

const LICENSE_TYPE_LIMITS: Record<LicenseType, LicenseTypeLimits> = {
  trial: { maxActivations: 1, features: ['basic'] },
  standard: { maxActivations: 2, features: ['basic', 'export'] },
  professional: { maxActivations: 5, features: ['basic', 'export', 'batch', 'api'] },
  enterprise: { maxActivations: 100, features: ['basic', 'export', 'batch', 'api', 'unlimited'] },
};

const STATUS_TEXTS: Record<LicenseStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
  suspended: 'Suspended',
  pending: 'Pending Activation',
};

const TYPE_TEXTS: Record<LicenseType, string> = {
  trial: 'Trial',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

// =============================================================================
// License Key Functions
// =============================================================================

/**
 * Validate license key format (XXXX-XXXX-XXXX-XXXX)
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  if (!key) return false;
  const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return keyRegex.test(key);
}

/**
 * Normalize license key (uppercase, trim, remove spaces)
 */
export function normalizeLicenseKey(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Generate random license key
 */
export function generateLicenseKey(): string {
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

// =============================================================================
// License Creation Functions
// =============================================================================

/**
 * Create empty license with defaults
 */
export function createEmptyLicense(): License {
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
 * Create license with partial data
 */
export function createLicense(partial: Partial<License>): License {
  return {
    ...createEmptyLicense(),
    ...partial,
  };
}

// =============================================================================
// License Validation Functions
// =============================================================================

/**
 * Check if license is expired
 */
export function isLicenseExpired(license: License): boolean {
  if (!license.expiresAt) return false;
  return new Date() > new Date(license.expiresAt);
}

/**
 * Check if license can be activated
 */
export function canActivateLicense(license: License): boolean {
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
 * Calculate remaining days until expiry
 */
export function calculateRemainingDays(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Validate license against hardware fingerprint
 */
export function validateLicenseFingerprint(license: License, fingerprint: string): boolean {
  if (!license.hardwareFingerprint) return true; // Not yet bound
  return license.hardwareFingerprint === fingerprint;
}

// =============================================================================
// License Type Functions
// =============================================================================

/**
 * Get license type limits
 */
export function getLicenseTypeLimits(type: LicenseType): LicenseTypeLimits {
  return LICENSE_TYPE_LIMITS[type];
}

/**
 * Check if license has a specific feature
 */
export function hasFeature(license: License, feature: string): boolean {
  return license.features.includes(feature) || license.features.includes('unlimited');
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Get license status display text
 */
export function getLicenseStatusText(status: LicenseStatus): string {
  return STATUS_TEXTS[status];
}

/**
 * Get license type display text
 */
export function getLicenseTypeText(type: LicenseType): string {
  return TYPE_TEXTS[type];
}

// =============================================================================
// Response Creation Functions
// =============================================================================

/**
 * Create activation response
 */
export function createActivationResponse(
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
export function createValidationResponse(
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
export function createDeactivationResponse(
  success: boolean,
  error?: string
): LicenseDeactivationResponse {
  return {
    success,
    error,
  };
}

// =============================================================================
// Server Configuration Functions
// =============================================================================

/**
 * Create default server config
 */
export function createDefaultServerConfig(): ServerConfig {
  return { ...DEFAULT_SERVER_CONFIG };
}

/**
 * Build API URL
 */
export function buildApiUrl(config: ServerConfig, endpoint: string): string {
  const base = config.baseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Create request headers
 */
export function createRequestHeaders(config: ServerConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    'User-Agent': 'ContpaqiAIBridge/1.0',
  };
}

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize license for storage
 */
export function serializeLicense(license: License): string {
  return JSON.stringify({
    ...license,
    activatedAt: license.activatedAt?.toISOString() || null,
    expiresAt: license.expiresAt?.toISOString() || null,
  });
}

/**
 * Deserialize license from storage
 */
export function deserializeLicense(json: string): License | null {
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

// =============================================================================
// Licensing Server Client Class
// =============================================================================

/**
 * Licensing Server Client
 * Handles communication with the cloud licensing server
 */
export class LicensingServerClient {
  private config: ServerConfig;
  private httpClient: AxiosInstance;
  private cachedLicense: License | null = null;
  private cachedToken: string | null = null;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      ...DEFAULT_SERVER_CONFIG,
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: createRequestHeaders(this.config),
    });
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.httpClient.defaults.headers['X-API-Key'] = apiKey;
  }

  /**
   * Activate license
   */
  async activate(request: LicenseActivationRequest): Promise<LicenseActivationResponse> {
    const normalizedKey = normalizeLicenseKey(request.licenseKey);

    if (!isValidLicenseKeyFormat(normalizedKey)) {
      return createActivationResponse(
        false,
        null,
        null,
        'Invalid license key format',
        'INVALID_LICENSE_KEY'
      );
    }

    try {
      const response = await this.httpClient.post<LicenseActivationResponse>(
        '/licenses/activate',
        {
          ...request,
          licenseKey: normalizedKey,
        }
      );

      if (response.data.success && response.data.license) {
        this.cachedLicense = {
          ...response.data.license,
          activatedAt: response.data.license.activatedAt
            ? new Date(response.data.license.activatedAt)
            : null,
          expiresAt: response.data.license.expiresAt
            ? new Date(response.data.license.expiresAt)
            : null,
        };
        this.cachedToken = response.data.token;
      }

      return response.data;
    } catch (error) {
      return this.handleError(error, 'Activation failed');
    }
  }

  /**
   * Validate license
   */
  async validate(request: LicenseValidationRequest): Promise<LicenseValidationResponse> {
    const normalizedKey = normalizeLicenseKey(request.licenseKey);

    if (!isValidLicenseKeyFormat(normalizedKey)) {
      return createValidationResponse(
        false,
        null,
        'Invalid license key format',
        'INVALID_LICENSE_KEY'
      );
    }

    try {
      const response = await this.httpClient.post<LicenseValidationResponse>(
        '/licenses/validate',
        {
          ...request,
          licenseKey: normalizedKey,
          token: request.token || this.cachedToken,
        }
      );

      if (response.data.valid && response.data.license) {
        this.cachedLicense = {
          ...response.data.license,
          activatedAt: response.data.license.activatedAt
            ? new Date(response.data.license.activatedAt)
            : null,
          expiresAt: response.data.license.expiresAt
            ? new Date(response.data.license.expiresAt)
            : null,
        };
      }

      return response.data;
    } catch (error) {
      return this.handleValidationError(error);
    }
  }

  /**
   * Deactivate license
   */
  async deactivate(request: LicenseDeactivationRequest): Promise<LicenseDeactivationResponse> {
    try {
      const response = await this.httpClient.post<LicenseDeactivationResponse>(
        '/licenses/deactivate',
        request
      );

      if (response.data.success) {
        this.cachedLicense = null;
        this.cachedToken = null;
      }

      return response.data;
    } catch (error) {
      return this.handleDeactivationError(error);
    }
  }

  /**
   * Get cached license
   */
  getCachedLicense(): License | null {
    return this.cachedLicense;
  }

  /**
   * Get cached token
   */
  getCachedToken(): string | null {
    return this.cachedToken;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedLicense = null;
    this.cachedToken = null;
  }

  /**
   * Load cached license from storage
   */
  loadCachedLicense(json: string): boolean {
    const license = deserializeLicense(json);
    if (license) {
      this.cachedLicense = license;
      return true;
    }
    return false;
  }

  /**
   * Save cached license to storage
   */
  saveCachedLicense(): string | null {
    if (!this.cachedLicense) return null;
    return serializeLicense(this.cachedLicense);
  }

  /**
   * Check if has valid cached license
   */
  hasValidCachedLicense(): boolean {
    if (!this.cachedLicense) return false;
    if (this.cachedLicense.status !== 'active') return false;
    if (isLicenseExpired(this.cachedLicense)) return false;
    return true;
  }

  /**
   * Handle HTTP errors for activation
   */
  private handleError(error: unknown, defaultMessage: string): LicenseActivationResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<LicenseActivationResponse>;

      if (axiosError.response?.data) {
        return axiosError.response.data;
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return createActivationResponse(
          false,
          null,
          null,
          'Network error: Unable to reach licensing server',
          'NETWORK_ERROR'
        );
      }
    }

    return createActivationResponse(
      false,
      null,
      null,
      defaultMessage,
      'SERVER_ERROR'
    );
  }

  /**
   * Handle HTTP errors for validation
   */
  private handleValidationError(error: unknown): LicenseValidationResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<LicenseValidationResponse>;

      if (axiosError.response?.data) {
        return axiosError.response.data;
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        // Return cached license if network fails
        if (this.hasValidCachedLicense()) {
          return createValidationResponse(true, this.cachedLicense);
        }

        return createValidationResponse(
          false,
          null,
          'Network error: Unable to reach licensing server',
          'NETWORK_ERROR'
        );
      }
    }

    return createValidationResponse(
      false,
      null,
      'Validation failed',
      'SERVER_ERROR'
    );
  }

  /**
   * Handle HTTP errors for deactivation
   */
  private handleDeactivationError(error: unknown): LicenseDeactivationResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<LicenseDeactivationResponse>;

      if (axiosError.response?.data) {
        return axiosError.response.data;
      }
    }

    return createDeactivationResponse(false, 'Deactivation failed');
  }
}

// =============================================================================
// Mock Server (for development/testing)
// =============================================================================

/**
 * Mock Licensing Server
 * Simulates server responses for development and testing
 */
export class MockLicensingServer {
  private licenses: Map<string, License> = new Map();

  /**
   * Add a license to the mock server
   */
  addLicense(license: License): void {
    this.licenses.set(normalizeLicenseKey(license.key), license);
  }

  /**
   * Remove a license from the mock server
   */
  removeLicense(key: string): void {
    this.licenses.delete(normalizeLicenseKey(key));
  }

  /**
   * Get a license from the mock server
   */
  getLicense(key: string): License | undefined {
    return this.licenses.get(normalizeLicenseKey(key));
  }

  /**
   * Simulate activation
   */
  activate(request: LicenseActivationRequest): LicenseActivationResponse {
    const normalizedKey = normalizeLicenseKey(request.licenseKey);

    if (!isValidLicenseKeyFormat(normalizedKey)) {
      return createActivationResponse(
        false,
        null,
        null,
        'Invalid license key format',
        'INVALID_LICENSE_KEY'
      );
    }

    const license = this.licenses.get(normalizedKey);

    if (!license) {
      return createActivationResponse(
        false,
        null,
        null,
        'License key not found',
        'INVALID_LICENSE_KEY'
      );
    }

    if (license.status === 'revoked') {
      return createActivationResponse(
        false,
        null,
        null,
        'License has been revoked',
        'LICENSE_REVOKED'
      );
    }

    if (isLicenseExpired(license)) {
      return createActivationResponse(
        false,
        null,
        null,
        'License has expired',
        'LICENSE_EXPIRED'
      );
    }

    if (license.hardwareFingerprint && license.hardwareFingerprint !== request.hardwareFingerprint) {
      return createActivationResponse(
        false,
        null,
        null,
        'Hardware fingerprint mismatch',
        'FINGERPRINT_MISMATCH'
      );
    }

    if (!canActivateLicense(license)) {
      return createActivationResponse(
        false,
        null,
        null,
        'Maximum activations reached',
        'MAX_ACTIVATIONS_REACHED'
      );
    }

    // Activate license
    const activatedLicense: License = {
      ...license,
      status: 'active',
      hardwareFingerprint: request.hardwareFingerprint,
      activatedAt: new Date(),
      currentActivations: license.currentActivations + 1,
    };

    this.licenses.set(normalizedKey, activatedLicense);

    const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return createActivationResponse(true, activatedLicense, token);
  }

  /**
   * Simulate validation
   */
  validate(request: LicenseValidationRequest): LicenseValidationResponse {
    const normalizedKey = normalizeLicenseKey(request.licenseKey);

    if (!isValidLicenseKeyFormat(normalizedKey)) {
      return createValidationResponse(
        false,
        null,
        'Invalid license key format',
        'INVALID_LICENSE_KEY'
      );
    }

    const license = this.licenses.get(normalizedKey);

    if (!license) {
      return createValidationResponse(
        false,
        null,
        'License key not found',
        'INVALID_LICENSE_KEY'
      );
    }

    if (license.status === 'revoked' || license.status === 'suspended') {
      return createValidationResponse(
        false,
        license,
        'License has been revoked',
        'LICENSE_REVOKED'
      );
    }

    if (isLicenseExpired(license)) {
      return createValidationResponse(
        false,
        license,
        'License has expired',
        'LICENSE_EXPIRED'
      );
    }

    if (!validateLicenseFingerprint(license, request.hardwareFingerprint)) {
      return createValidationResponse(
        false,
        license,
        'Hardware fingerprint mismatch',
        'FINGERPRINT_MISMATCH'
      );
    }

    return createValidationResponse(true, license);
  }

  /**
   * Simulate deactivation
   */
  deactivate(request: LicenseDeactivationRequest): LicenseDeactivationResponse {
    const normalizedKey = normalizeLicenseKey(request.licenseKey);
    const license = this.licenses.get(normalizedKey);

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

    this.licenses.set(normalizedKey, deactivatedLicense);

    return createDeactivationResponse(true);
  }

  /**
   * Clear all licenses
   */
  clear(): void {
    this.licenses.clear();
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default LicensingServerClient;
