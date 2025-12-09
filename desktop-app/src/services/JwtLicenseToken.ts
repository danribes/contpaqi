/**
 * JWT License Token Service
 * Subtask 15.5: Implement JWT signing and validation
 *
 * Provides JWT-based token creation, signing, and validation
 * for secure license authentication between client and server.
 */

import * as crypto from 'crypto';
import { LicenseType } from './LicensingServer';

// =============================================================================
// Types
// =============================================================================

export interface JwtHeader {
  alg: 'HS256' | 'HS384' | 'HS512';
  typ: 'JWT';
}

export interface LicenseTokenPayload {
  // Standard JWT claims
  iss: string;           // Issuer
  sub: string;           // Subject (license key)
  aud: string;           // Audience (app identifier)
  exp: number;           // Expiration timestamp
  iat: number;           // Issued at timestamp
  nbf: number;           // Not before timestamp
  jti: string;           // JWT ID (unique token ID)

  // Custom license claims
  licenseId: string;
  licenseType: LicenseType;
  fingerprint: string;
  features: string[];
  maxActivations: number;
  currentActivations: number;
}

export interface TokenValidationResult {
  valid: boolean;
  payload: LicenseTokenPayload | null;
  error?: string;
  errorCode?: TokenErrorCode;
}

export type TokenErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_NOT_YET_VALID'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'FINGERPRINT_MISMATCH'
  | 'DECODE_ERROR';

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'HS384' | 'HS512';
  tokenLifetimeMinutes: number;
}

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_JWT_CONFIG: JwtConfig = {
  secret: '',
  issuer: 'contpaqi-license-server',
  audience: 'contpaqi-ai-bridge',
  algorithm: 'HS256',
  tokenLifetimeMinutes: 60,
};

const ALGORITHM_MAP: Record<JwtAlgorithm, string> = {
  'HS256': 'sha256',
  'HS384': 'sha384',
  'HS512': 'sha512',
};

const ERROR_MESSAGES: Record<TokenErrorCode, string> = {
  INVALID_FORMAT: 'The token format is invalid',
  INVALID_SIGNATURE: 'The token signature could not be verified',
  TOKEN_EXPIRED: 'The token has expired',
  TOKEN_NOT_YET_VALID: 'The token is not yet valid',
  INVALID_ISSUER: 'The token issuer is not trusted',
  INVALID_AUDIENCE: 'The token is not intended for this application',
  FINGERPRINT_MISMATCH: 'The token is not valid for this device',
  DECODE_ERROR: 'The token could not be decoded',
};

// =============================================================================
// Base64URL Encoding Functions
// =============================================================================

/**
 * Encode string to base64url
 */
export function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode base64url to string
 */
export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Encode object to base64url JSON
 */
export function base64UrlEncodeJson(obj: object): string {
  return base64UrlEncode(JSON.stringify(obj));
}

/**
 * Decode base64url JSON to object
 */
export function base64UrlDecodeJson<T>(str: string): T | null {
  try {
    return JSON.parse(base64UrlDecode(str)) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// HMAC Signing Functions
// =============================================================================

/**
 * Create HMAC signature
 */
export function createHmacSignature(
  data: string,
  secret: string,
  algorithm: JwtAlgorithm
): string {
  const hmac = crypto.createHmac(ALGORITHM_MAP[algorithm], secret);
  hmac.update(data);
  const signature = hmac.digest('base64');
  return signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verify HMAC signature with constant-time comparison
 */
export function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string,
  algorithm: JwtAlgorithm
): boolean {
  const expectedSignature = createHmacSignature(data, secret, algorithm);
  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// =============================================================================
// JWT Structure Functions
// =============================================================================

/**
 * Create JWT header
 */
export function createJwtHeader(algorithm: JwtAlgorithm): JwtHeader {
  return {
    alg: algorithm,
    typ: 'JWT',
  };
}

/**
 * Generate unique JWT ID
 */
export function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create token payload
 */
export function createTokenPayload(
  licenseKey: string,
  licenseId: string,
  licenseType: LicenseType,
  fingerprint: string,
  features: string[],
  maxActivations: number,
  currentActivations: number,
  config: JwtConfig
): LicenseTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + config.tokenLifetimeMinutes * 60;

  return {
    iss: config.issuer,
    sub: licenseKey,
    aud: config.audience,
    exp,
    iat: now,
    nbf: now,
    jti: generateJti(),
    licenseId,
    licenseType,
    fingerprint,
    features,
    maxActivations,
    currentActivations,
  };
}

// =============================================================================
// Token Creation Functions
// =============================================================================

/**
 * Create JWT token from payload
 */
export function createToken(payload: LicenseTokenPayload, config: JwtConfig): string {
  const header = createJwtHeader(config.algorithm);
  const headerEncoded = base64UrlEncodeJson(header);
  const payloadEncoded = base64UrlEncodeJson(payload);
  const dataToSign = `${headerEncoded}.${payloadEncoded}`;
  const signature = createHmacSignature(dataToSign, config.secret, config.algorithm);
  return `${dataToSign}.${signature}`;
}

/**
 * Sign and create token with license data
 */
export function signToken(
  licenseKey: string,
  licenseId: string,
  licenseType: LicenseType,
  fingerprint: string,
  features: string[],
  maxActivations: number,
  currentActivations: number,
  config: JwtConfig
): string {
  const payload = createTokenPayload(
    licenseKey,
    licenseId,
    licenseType,
    fingerprint,
    features,
    maxActivations,
    currentActivations,
    config
  );
  return createToken(payload, config);
}

// =============================================================================
// Token Parsing Functions
// =============================================================================

/**
 * Parse JWT token
 */
export function parseToken(token: string): {
  header: JwtHeader;
  payload: LicenseTokenPayload;
  signature: string;
} | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = base64UrlDecodeJson<JwtHeader>(parts[0]);
  const payload = base64UrlDecodeJson<LicenseTokenPayload>(parts[1]);

  if (!header || !payload) return null;

  return {
    header,
    payload,
    signature: parts[2],
  };
}

/**
 * Get token parts
 */
export function getTokenParts(token: string): string[] {
  return token.split('.');
}

/**
 * Extract payload from token
 */
export function extractPayload(token: string): LicenseTokenPayload | null {
  const parsed = parseToken(token);
  return parsed?.payload || null;
}

/**
 * Extract header from token
 */
export function extractHeader(token: string): JwtHeader | null {
  const parsed = parseToken(token);
  return parsed?.header || null;
}

// =============================================================================
// Token Validation Functions
// =============================================================================

/**
 * Check if token format is valid
 */
export function isTokenFormatValid(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  return parts.every(part => part.length > 0);
}

/**
 * Check if signature is valid
 */
export function isSignatureValid(
  token: string,
  secret: string,
  algorithm: JwtAlgorithm
): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const data = `${parts[0]}.${parts[1]}`;
  return verifyHmacSignature(data, parts[2], secret, algorithm);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: LicenseTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp;
}

/**
 * Check if token is not yet valid
 */
export function isTokenNotYetValid(payload: LicenseTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now < payload.nbf;
}

/**
 * Check if issuer is valid
 */
export function isIssuerValid(payload: LicenseTokenPayload, expectedIssuer: string): boolean {
  return payload.iss === expectedIssuer;
}

/**
 * Check if audience is valid
 */
export function isAudienceValid(payload: LicenseTokenPayload, expectedAudience: string): boolean {
  return payload.aud === expectedAudience;
}

/**
 * Check if fingerprint is valid
 */
export function isFingerprintValid(payload: LicenseTokenPayload, fingerprint: string): boolean {
  return payload.fingerprint === fingerprint;
}

/**
 * Full token validation
 */
export function validateToken(
  token: string,
  fingerprint: string,
  config: JwtConfig
): TokenValidationResult {
  // Check format
  if (!isTokenFormatValid(token)) {
    return {
      valid: false,
      payload: null,
      error: 'Invalid token format',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Parse token
  const parsed = parseToken(token);
  if (!parsed) {
    return {
      valid: false,
      payload: null,
      error: 'Failed to decode token',
      errorCode: 'DECODE_ERROR',
    };
  }

  // Verify signature
  if (!isSignatureValid(token, config.secret, config.algorithm)) {
    return {
      valid: false,
      payload: null,
      error: 'Invalid signature',
      errorCode: 'INVALID_SIGNATURE',
    };
  }

  // Check issuer
  if (!isIssuerValid(parsed.payload, config.issuer)) {
    return {
      valid: false,
      payload: parsed.payload,
      error: 'Invalid issuer',
      errorCode: 'INVALID_ISSUER',
    };
  }

  // Check audience
  if (!isAudienceValid(parsed.payload, config.audience)) {
    return {
      valid: false,
      payload: parsed.payload,
      error: 'Invalid audience',
      errorCode: 'INVALID_AUDIENCE',
    };
  }

  // Check not before
  if (isTokenNotYetValid(parsed.payload)) {
    return {
      valid: false,
      payload: parsed.payload,
      error: 'Token not yet valid',
      errorCode: 'TOKEN_NOT_YET_VALID',
    };
  }

  // Check expiration
  if (isTokenExpired(parsed.payload)) {
    return {
      valid: false,
      payload: parsed.payload,
      error: 'Token has expired',
      errorCode: 'TOKEN_EXPIRED',
    };
  }

  // Check fingerprint
  if (!isFingerprintValid(parsed.payload, fingerprint)) {
    return {
      valid: false,
      payload: parsed.payload,
      error: 'Fingerprint mismatch',
      errorCode: 'FINGERPRINT_MISMATCH',
    };
  }

  return { valid: true, payload: parsed.payload };
}

// =============================================================================
// Config Functions
// =============================================================================

/**
 * Create default JWT config
 */
export function createDefaultJwtConfig(): JwtConfig {
  return { ...DEFAULT_JWT_CONFIG };
}

/**
 * Merge partial config with defaults
 */
export function mergeJwtConfig(partial: Partial<JwtConfig>): JwtConfig {
  return {
    ...DEFAULT_JWT_CONFIG,
    ...partial,
  };
}

// =============================================================================
// Token Refresh Functions
// =============================================================================

/**
 * Check if token should be refreshed
 */
export function shouldRefreshToken(
  payload: LicenseTokenPayload,
  thresholdMinutes: number = 5
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - now;
  return remainingSeconds <= thresholdMinutes * 60;
}

/**
 * Get remaining seconds until token expires
 */
export function getTokenRemainingSeconds(payload: LicenseTokenPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

/**
 * Get remaining minutes until token expires
 */
export function getTokenRemainingMinutes(payload: LicenseTokenPayload): number {
  return Math.floor(getTokenRemainingSeconds(payload) / 60);
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Format token expiry for display
 */
export function formatTokenExpiry(payload: LicenseTokenPayload): string {
  const remaining = getTokenRemainingMinutes(payload);
  if (remaining <= 0) return 'Expired';
  if (remaining < 60) return `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`;
  const hours = Math.floor(remaining / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
}

/**
 * Get error message for error code
 */
export function getTokenErrorMessage(code: TokenErrorCode): string {
  return ERROR_MESSAGES[code];
}

// =============================================================================
// JWT Token Manager Class
// =============================================================================

/**
 * JWT Token Manager
 * Manages token creation, validation, and refresh
 */
export class JwtTokenManager {
  private config: JwtConfig;
  private currentToken: string | null = null;
  private currentPayload: LicenseTokenPayload | null = null;

  constructor(config: Partial<JwtConfig> = {}) {
    this.config = mergeJwtConfig(config);
  }

  /**
   * Set secret
   */
  setSecret(secret: string): void {
    this.config.secret = secret;
  }

  /**
   * Get config
   */
  getConfig(): JwtConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(partial: Partial<JwtConfig>): void {
    this.config = mergeJwtConfig({ ...this.config, ...partial });
  }

  /**
   * Create and store token
   */
  createToken(
    licenseKey: string,
    licenseId: string,
    licenseType: LicenseType,
    fingerprint: string,
    features: string[],
    maxActivations: number,
    currentActivations: number
  ): string {
    const payload = createTokenPayload(
      licenseKey,
      licenseId,
      licenseType,
      fingerprint,
      features,
      maxActivations,
      currentActivations,
      this.config
    );

    this.currentToken = createToken(payload, this.config);
    this.currentPayload = payload;

    return this.currentToken;
  }

  /**
   * Validate token
   */
  validateToken(token: string, fingerprint: string): TokenValidationResult {
    return validateToken(token, fingerprint, this.config);
  }

  /**
   * Get current token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Get current payload
   */
  getCurrentPayload(): LicenseTokenPayload | null {
    return this.currentPayload;
  }

  /**
   * Set current token (e.g., received from server)
   */
  setCurrentToken(token: string): boolean {
    const parsed = parseToken(token);
    if (!parsed) return false;

    this.currentToken = token;
    this.currentPayload = parsed.payload;
    return true;
  }

  /**
   * Clear current token
   */
  clearToken(): void {
    this.currentToken = null;
    this.currentPayload = null;
  }

  /**
   * Check if has valid token
   */
  hasValidToken(fingerprint: string): boolean {
    if (!this.currentToken) return false;
    const result = this.validateToken(this.currentToken, fingerprint);
    return result.valid;
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(thresholdMinutes: number = 5): boolean {
    if (!this.currentPayload) return true;
    return shouldRefreshToken(this.currentPayload, thresholdMinutes);
  }

  /**
   * Get remaining minutes
   */
  getRemainingMinutes(): number {
    if (!this.currentPayload) return 0;
    return getTokenRemainingMinutes(this.currentPayload);
  }

  /**
   * Get formatted expiry
   */
  getFormattedExpiry(): string {
    if (!this.currentPayload) return 'No token';
    return formatTokenExpiry(this.currentPayload);
  }

  /**
   * Get license type from current token
   */
  getLicenseType(): LicenseType | null {
    return this.currentPayload?.licenseType || null;
  }

  /**
   * Get features from current token
   */
  getFeatures(): string[] {
    return this.currentPayload?.features || [];
  }

  /**
   * Check if has feature
   */
  hasFeature(feature: string): boolean {
    const features = this.getFeatures();
    return features.includes('unlimited') || features.includes(feature);
  }

  /**
   * Serialize token for storage
   */
  serializeToken(): string | null {
    return this.currentToken;
  }

  /**
   * Restore token from storage
   */
  restoreToken(token: string): boolean {
    return this.setCurrentToken(token);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create JWT token manager
 */
export function createJwtTokenManager(config: Partial<JwtConfig> = {}): JwtTokenManager {
  return new JwtTokenManager(config);
}

// =============================================================================
// Default Export
// =============================================================================

export default JwtTokenManager;
