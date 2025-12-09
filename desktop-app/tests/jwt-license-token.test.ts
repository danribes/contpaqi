/**
 * JWT License Token Tests
 * Subtask 15.5: Implement JWT signing and validation
 *
 * Tests for JWT-based license token creation, signing, and validation
 * for secure license authentication between client and server.
 */

// =============================================================================
// Local Type Definitions (avoid JSX compilation issues)
// =============================================================================

type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';

interface JwtHeader {
  alg: 'HS256' | 'HS384' | 'HS512';
  typ: 'JWT';
}

interface LicenseTokenPayload {
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

interface TokenValidationResult {
  valid: boolean;
  payload: LicenseTokenPayload | null;
  error?: string;
  errorCode?: TokenErrorCode;
}

type TokenErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_NOT_YET_VALID'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'FINGERPRINT_MISMATCH'
  | 'DECODE_ERROR';

interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'HS384' | 'HS512';
  tokenLifetimeMinutes: number;
}

// =============================================================================
// Local Implementation Functions
// =============================================================================

// --- Base64URL Encoding ---

function base64UrlEncode(str: string): string {
  // Convert string to base64, then make URL-safe
  const base64 = Buffer.from(str).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  // Restore standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function base64UrlEncodeJson(obj: object): string {
  return base64UrlEncode(JSON.stringify(obj));
}

function base64UrlDecodeJson<T>(str: string): T | null {
  try {
    return JSON.parse(base64UrlDecode(str)) as T;
  } catch {
    return null;
  }
}

// --- HMAC Signing ---

function createHmacSignature(data: string, secret: string, algorithm: 'HS256' | 'HS384' | 'HS512'): string {
  const crypto = require('crypto');
  const algoMap: Record<string, string> = {
    'HS256': 'sha256',
    'HS384': 'sha384',
    'HS512': 'sha512',
  };
  const hmac = crypto.createHmac(algoMap[algorithm], secret);
  hmac.update(data);
  const signature = hmac.digest('base64');
  // Make URL-safe
  return signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function verifyHmacSignature(data: string, signature: string, secret: string, algorithm: 'HS256' | 'HS384' | 'HS512'): boolean {
  const expectedSignature = createHmacSignature(data, secret, algorithm);
  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// --- JWT Structure ---

function createJwtHeader(algorithm: 'HS256' | 'HS384' | 'HS512'): JwtHeader {
  return {
    alg: algorithm,
    typ: 'JWT',
  };
}

function generateJti(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

function createTokenPayload(
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

// --- Token Creation ---

function createToken(payload: LicenseTokenPayload, config: JwtConfig): string {
  const header = createJwtHeader(config.algorithm);
  const headerEncoded = base64UrlEncodeJson(header);
  const payloadEncoded = base64UrlEncodeJson(payload);
  const dataToSign = `${headerEncoded}.${payloadEncoded}`;
  const signature = createHmacSignature(dataToSign, config.secret, config.algorithm);
  return `${dataToSign}.${signature}`;
}

function signToken(
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

// --- Token Parsing ---

function parseToken(token: string): { header: JwtHeader; payload: LicenseTokenPayload; signature: string } | null {
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

function getTokenParts(token: string): string[] {
  return token.split('.');
}

function extractPayload(token: string): LicenseTokenPayload | null {
  const parsed = parseToken(token);
  return parsed?.payload || null;
}

function extractHeader(token: string): JwtHeader | null {
  const parsed = parseToken(token);
  return parsed?.header || null;
}

// --- Token Validation ---

function isTokenFormatValid(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  // Each part should be non-empty
  return parts.every(part => part.length > 0);
}

function isSignatureValid(token: string, secret: string, algorithm: 'HS256' | 'HS384' | 'HS512'): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const data = `${parts[0]}.${parts[1]}`;
  return verifyHmacSignature(data, parts[2], secret, algorithm);
}

function isTokenExpired(payload: LicenseTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp;
}

function isTokenNotYetValid(payload: LicenseTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now < payload.nbf;
}

function isIssuerValid(payload: LicenseTokenPayload, expectedIssuer: string): boolean {
  return payload.iss === expectedIssuer;
}

function isAudienceValid(payload: LicenseTokenPayload, expectedAudience: string): boolean {
  return payload.aud === expectedAudience;
}

function isFingerprintValid(payload: LicenseTokenPayload, fingerprint: string): boolean {
  return payload.fingerprint === fingerprint;
}

function validateToken(token: string, fingerprint: string, config: JwtConfig): TokenValidationResult {
  // Check format
  if (!isTokenFormatValid(token)) {
    return { valid: false, payload: null, error: 'Invalid token format', errorCode: 'INVALID_FORMAT' };
  }

  // Parse token
  const parsed = parseToken(token);
  if (!parsed) {
    return { valid: false, payload: null, error: 'Failed to decode token', errorCode: 'DECODE_ERROR' };
  }

  // Verify signature
  if (!isSignatureValid(token, config.secret, config.algorithm)) {
    return { valid: false, payload: null, error: 'Invalid signature', errorCode: 'INVALID_SIGNATURE' };
  }

  // Check issuer
  if (!isIssuerValid(parsed.payload, config.issuer)) {
    return { valid: false, payload: parsed.payload, error: 'Invalid issuer', errorCode: 'INVALID_ISSUER' };
  }

  // Check audience
  if (!isAudienceValid(parsed.payload, config.audience)) {
    return { valid: false, payload: parsed.payload, error: 'Invalid audience', errorCode: 'INVALID_AUDIENCE' };
  }

  // Check not before
  if (isTokenNotYetValid(parsed.payload)) {
    return { valid: false, payload: parsed.payload, error: 'Token not yet valid', errorCode: 'TOKEN_NOT_YET_VALID' };
  }

  // Check expiration
  if (isTokenExpired(parsed.payload)) {
    return { valid: false, payload: parsed.payload, error: 'Token has expired', errorCode: 'TOKEN_EXPIRED' };
  }

  // Check fingerprint
  if (!isFingerprintValid(parsed.payload, fingerprint)) {
    return { valid: false, payload: parsed.payload, error: 'Fingerprint mismatch', errorCode: 'FINGERPRINT_MISMATCH' };
  }

  return { valid: true, payload: parsed.payload };
}

// --- Config Functions ---

function createDefaultJwtConfig(): JwtConfig {
  return {
    secret: '',
    issuer: 'contpaqi-license-server',
    audience: 'contpaqi-ai-bridge',
    algorithm: 'HS256',
    tokenLifetimeMinutes: 60,
  };
}

function mergeJwtConfig(partial: Partial<JwtConfig>): JwtConfig {
  return {
    ...createDefaultJwtConfig(),
    ...partial,
  };
}

// --- Token Refresh ---

function shouldRefreshToken(payload: LicenseTokenPayload, thresholdMinutes: number = 5): boolean {
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - now;
  return remainingSeconds <= thresholdMinutes * 60;
}

function getTokenRemainingSeconds(payload: LicenseTokenPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

function getTokenRemainingMinutes(payload: LicenseTokenPayload): number {
  return Math.floor(getTokenRemainingSeconds(payload) / 60);
}

// --- Display Functions ---

function formatTokenExpiry(payload: LicenseTokenPayload): string {
  const remaining = getTokenRemainingMinutes(payload);
  if (remaining <= 0) return 'Expired';
  if (remaining < 60) return `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`;
  const hours = Math.floor(remaining / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
}

function getTokenErrorMessage(code: TokenErrorCode): string {
  const messages: Record<TokenErrorCode, string> = {
    INVALID_FORMAT: 'The token format is invalid',
    INVALID_SIGNATURE: 'The token signature could not be verified',
    TOKEN_EXPIRED: 'The token has expired',
    TOKEN_NOT_YET_VALID: 'The token is not yet valid',
    INVALID_ISSUER: 'The token issuer is not trusted',
    INVALID_AUDIENCE: 'The token is not intended for this application',
    FINGERPRINT_MISMATCH: 'The token is not valid for this device',
    DECODE_ERROR: 'The token could not be decoded',
  };
  return messages[code];
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTestConfig(overrides: Partial<JwtConfig> = {}): JwtConfig {
  return {
    secret: 'test-secret-key-for-signing-tokens-12345',
    issuer: 'contpaqi-license-server',
    audience: 'contpaqi-ai-bridge',
    algorithm: 'HS256',
    tokenLifetimeMinutes: 60,
    ...overrides,
  };
}

function createTestPayload(overrides: Partial<LicenseTokenPayload> = {}): LicenseTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'contpaqi-license-server',
    sub: 'TEST-1234-5678-ABCD',
    aud: 'contpaqi-ai-bridge',
    exp: now + 3600, // 1 hour from now
    iat: now,
    nbf: now,
    jti: 'test-jti-12345',
    licenseId: 'license-123',
    licenseType: 'professional',
    fingerprint: 'fp-abc123',
    features: ['basic', 'export', 'api'],
    maxActivations: 5,
    currentActivations: 1,
    ...overrides,
  };
}

function createExpiredPayload(): LicenseTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return createTestPayload({
    exp: now - 3600, // 1 hour ago
    iat: now - 7200, // 2 hours ago
    nbf: now - 7200,
  });
}

function createFuturePayload(): LicenseTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return createTestPayload({
    nbf: now + 3600, // 1 hour from now
    iat: now,
    exp: now + 7200, // 2 hours from now
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('JWT License Token', () => {
  describe('Base64URL Encoding', () => {
    it('should encode string to base64url', () => {
      const encoded = base64UrlEncode('Hello World');
      expect(encoded).toBe('SGVsbG8gV29ybGQ');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should decode base64url to string', () => {
      const decoded = base64UrlDecode('SGVsbG8gV29ybGQ');
      expect(decoded).toBe('Hello World');
    });

    it('should handle special characters', () => {
      const original = '{"alg":"HS256","typ":"JWT"}';
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toBe(original);
    });

    it('should encode and decode JSON objects', () => {
      const obj = { foo: 'bar', num: 123 };
      const encoded = base64UrlEncodeJson(obj);
      const decoded = base64UrlDecodeJson<typeof obj>(encoded);
      expect(decoded).toEqual(obj);
    });
  });

  describe('HMAC Signing', () => {
    it('should create consistent signatures with HS256', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      const sig1 = createHmacSignature(data, secret, 'HS256');
      const sig2 = createHmacSignature(data, secret, 'HS256');
      expect(sig1).toBe(sig2);
    });

    it('should create different signatures with different secrets', () => {
      const data = 'test-data';
      const sig1 = createHmacSignature(data, 'secret1', 'HS256');
      const sig2 = createHmacSignature(data, 'secret2', 'HS256');
      expect(sig1).not.toBe(sig2);
    });

    it('should verify valid signatures', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      const signature = createHmacSignature(data, secret, 'HS256');
      expect(verifyHmacSignature(data, signature, secret, 'HS256')).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      expect(verifyHmacSignature(data, 'invalid-signature', secret, 'HS256')).toBe(false);
    });

    it('should support HS384 algorithm', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      const sig256 = createHmacSignature(data, secret, 'HS256');
      const sig384 = createHmacSignature(data, secret, 'HS384');
      expect(sig256).not.toBe(sig384);
      expect(verifyHmacSignature(data, sig384, secret, 'HS384')).toBe(true);
    });

    it('should support HS512 algorithm', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      const sig512 = createHmacSignature(data, secret, 'HS512');
      expect(verifyHmacSignature(data, sig512, secret, 'HS512')).toBe(true);
    });
  });

  describe('JWT Header', () => {
    it('should create header with correct algorithm', () => {
      const header = createJwtHeader('HS256');
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });

    it('should support different algorithms', () => {
      expect(createJwtHeader('HS384').alg).toBe('HS384');
      expect(createJwtHeader('HS512').alg).toBe('HS512');
    });
  });

  describe('Token Payload Creation', () => {
    it('should create payload with all required fields', () => {
      const config = createTestConfig();
      const payload = createTokenPayload(
        'TEST-1234-5678-ABCD',
        'license-123',
        'professional',
        'fp-abc123',
        ['basic', 'export'],
        5,
        1,
        config
      );

      expect(payload.sub).toBe('TEST-1234-5678-ABCD');
      expect(payload.licenseId).toBe('license-123');
      expect(payload.licenseType).toBe('professional');
      expect(payload.fingerprint).toBe('fp-abc123');
      expect(payload.features).toEqual(['basic', 'export']);
      expect(payload.maxActivations).toBe(5);
      expect(payload.currentActivations).toBe(1);
    });

    it('should set correct issuer and audience', () => {
      const config = createTestConfig({
        issuer: 'my-issuer',
        audience: 'my-audience',
      });
      const payload = createTokenPayload(
        'TEST-1234-5678-ABCD',
        'license-123',
        'professional',
        'fp-abc123',
        [],
        1,
        0,
        config
      );

      expect(payload.iss).toBe('my-issuer');
      expect(payload.aud).toBe('my-audience');
    });

    it('should set correct expiration based on config', () => {
      const config = createTestConfig({ tokenLifetimeMinutes: 30 });
      const beforeCreate = Math.floor(Date.now() / 1000);
      const payload = createTokenPayload(
        'TEST-1234-5678-ABCD',
        'license-123',
        'professional',
        'fp-abc123',
        [],
        1,
        0,
        config
      );
      const afterCreate = Math.floor(Date.now() / 1000);

      // exp should be ~30 minutes from now
      expect(payload.exp).toBeGreaterThanOrEqual(beforeCreate + 30 * 60);
      expect(payload.exp).toBeLessThanOrEqual(afterCreate + 30 * 60 + 1);
    });

    it('should generate unique JTI for each token', () => {
      const config = createTestConfig();
      const payload1 = createTokenPayload('KEY1', 'id1', 'trial', 'fp1', [], 1, 0, config);
      const payload2 = createTokenPayload('KEY2', 'id2', 'trial', 'fp2', [], 1, 0, config);
      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });

  describe('Token Creation', () => {
    it('should create valid JWT format (header.payload.signature)', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should create verifiable tokens', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      expect(isSignatureValid(token, config.secret, config.algorithm)).toBe(true);
    });

    it('should use signToken helper correctly', () => {
      const config = createTestConfig();
      const token = signToken(
        'TEST-1234-5678-ABCD',
        'license-123',
        'professional',
        'fp-abc123',
        ['basic', 'export'],
        5,
        1,
        config
      );

      expect(isTokenFormatValid(token)).toBe(true);
      expect(isSignatureValid(token, config.secret, config.algorithm)).toBe(true);
    });
  });

  describe('Token Parsing', () => {
    it('should parse valid token', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      const parsed = parseToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed!.header.alg).toBe('HS256');
      expect(parsed!.header.typ).toBe('JWT');
      expect(parsed!.payload.sub).toBe(payload.sub);
    });

    it('should return null for invalid token', () => {
      expect(parseToken('invalid')).toBeNull();
      expect(parseToken('a.b')).toBeNull();
      expect(parseToken('')).toBeNull();
    });

    it('should extract payload correctly', () => {
      const config = createTestConfig();
      const originalPayload = createTestPayload({ licenseType: 'enterprise' });
      const token = createToken(originalPayload, config);

      const extracted = extractPayload(token);
      expect(extracted).not.toBeNull();
      expect(extracted!.licenseType).toBe('enterprise');
    });

    it('should extract header correctly', () => {
      const config = createTestConfig({ algorithm: 'HS512' });
      const payload = createTestPayload();
      const token = createToken(payload, config);

      const header = extractHeader(token);
      expect(header).not.toBeNull();
      expect(header!.alg).toBe('HS512');
    });

    it('should get token parts', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      const parts = getTokenParts(token);
      expect(parts).toHaveLength(3);
    });
  });

  describe('Token Format Validation', () => {
    it('should accept valid format', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      expect(isTokenFormatValid(token)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isTokenFormatValid('not-a-token')).toBe(false);
      expect(isTokenFormatValid('only.two.parts')).toBe(true); // Has 3 parts
      expect(isTokenFormatValid('a.b')).toBe(false);
      expect(isTokenFormatValid('')).toBe(false);
      expect(isTokenFormatValid('...')).toBe(false); // Empty parts
    });
  });

  describe('Signature Validation', () => {
    it('should validate correct signature', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      expect(isSignatureValid(token, config.secret, config.algorithm)).toBe(true);
    });

    it('should reject wrong secret', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      expect(isSignatureValid(token, 'wrong-secret', config.algorithm)).toBe(false);
    });

    it('should reject tampered payload', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      // Tamper with payload
      const parts = token.split('.');
      const tamperedPayload = { ...payload, licenseType: 'enterprise' };
      parts[1] = base64UrlEncodeJson(tamperedPayload);
      const tamperedToken = parts.join('.');

      expect(isSignatureValid(tamperedToken, config.secret, config.algorithm)).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    it('should detect non-expired token', () => {
      const payload = createTestPayload(); // 1 hour from now
      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should detect expired token', () => {
      const payload = createExpiredPayload();
      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should detect not-yet-valid token', () => {
      const payload = createFuturePayload();
      expect(isTokenNotYetValid(payload)).toBe(true);
    });

    it('should accept currently valid token', () => {
      const payload = createTestPayload();
      expect(isTokenNotYetValid(payload)).toBe(false);
    });
  });

  describe('Issuer and Audience Validation', () => {
    it('should validate correct issuer', () => {
      const payload = createTestPayload({ iss: 'expected-issuer' });
      expect(isIssuerValid(payload, 'expected-issuer')).toBe(true);
    });

    it('should reject incorrect issuer', () => {
      const payload = createTestPayload({ iss: 'wrong-issuer' });
      expect(isIssuerValid(payload, 'expected-issuer')).toBe(false);
    });

    it('should validate correct audience', () => {
      const payload = createTestPayload({ aud: 'expected-audience' });
      expect(isAudienceValid(payload, 'expected-audience')).toBe(true);
    });

    it('should reject incorrect audience', () => {
      const payload = createTestPayload({ aud: 'wrong-audience' });
      expect(isAudienceValid(payload, 'expected-audience')).toBe(false);
    });
  });

  describe('Fingerprint Validation', () => {
    it('should validate matching fingerprint', () => {
      const payload = createTestPayload({ fingerprint: 'fp-abc123' });
      expect(isFingerprintValid(payload, 'fp-abc123')).toBe(true);
    });

    it('should reject non-matching fingerprint', () => {
      const payload = createTestPayload({ fingerprint: 'fp-abc123' });
      expect(isFingerprintValid(payload, 'fp-different')).toBe(false);
    });
  });

  describe('Full Token Validation', () => {
    it('should validate fully correct token', () => {
      const config = createTestConfig();
      const payload = createTestPayload({ fingerprint: 'fp-abc123' });
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-abc123', config);
      expect(result.valid).toBe(true);
      expect(result.payload).not.toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid format', () => {
      const config = createTestConfig();
      const result = validateToken('invalid', 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('should reject invalid signature', () => {
      const config = createTestConfig();
      const payload = createTestPayload();
      const token = createToken(payload, config);

      const wrongConfig = createTestConfig({ secret: 'wrong-secret' });
      const result = validateToken(token, 'fp-abc123', wrongConfig);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('should reject expired token', () => {
      const config = createTestConfig();
      const payload = createExpiredPayload();
      payload.fingerprint = 'fp-abc123';
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should reject not-yet-valid token', () => {
      const config = createTestConfig();
      const payload = createFuturePayload();
      payload.fingerprint = 'fp-abc123';
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TOKEN_NOT_YET_VALID');
    });

    it('should reject wrong issuer', () => {
      const config = createTestConfig();
      const payload = createTestPayload({
        iss: 'wrong-issuer',
        fingerprint: 'fp-abc123',
      });
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_ISSUER');
    });

    it('should reject wrong audience', () => {
      const config = createTestConfig();
      const payload = createTestPayload({
        aud: 'wrong-audience',
        fingerprint: 'fp-abc123',
      });
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-abc123', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_AUDIENCE');
    });

    it('should reject fingerprint mismatch', () => {
      const config = createTestConfig();
      const payload = createTestPayload({ fingerprint: 'fp-abc123' });
      const token = createToken(payload, config);

      const result = validateToken(token, 'fp-different', config);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FINGERPRINT_MISMATCH');
    });
  });

  describe('Config Management', () => {
    it('should create default config', () => {
      const config = createDefaultJwtConfig();

      expect(config.issuer).toBe('contpaqi-license-server');
      expect(config.audience).toBe('contpaqi-ai-bridge');
      expect(config.algorithm).toBe('HS256');
      expect(config.tokenLifetimeMinutes).toBe(60);
    });

    it('should merge partial config', () => {
      const config = mergeJwtConfig({
        secret: 'my-secret',
        tokenLifetimeMinutes: 120,
      });

      expect(config.secret).toBe('my-secret');
      expect(config.tokenLifetimeMinutes).toBe(120);
      expect(config.algorithm).toBe('HS256'); // Default
    });
  });

  describe('Token Refresh', () => {
    it('should detect when token needs refresh', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = createTestPayload({
        exp: now + 4 * 60, // 4 minutes from now
      });

      expect(shouldRefreshToken(payload, 5)).toBe(true);
    });

    it('should not refresh token with plenty of time', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = createTestPayload({
        exp: now + 30 * 60, // 30 minutes from now
      });

      expect(shouldRefreshToken(payload, 5)).toBe(false);
    });

    it('should calculate remaining seconds', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = createTestPayload({
        exp: now + 120, // 2 minutes from now
      });

      const remaining = getTokenRemainingSeconds(payload);
      expect(remaining).toBeGreaterThanOrEqual(118);
      expect(remaining).toBeLessThanOrEqual(120);
    });

    it('should calculate remaining minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = createTestPayload({
        exp: now + 300, // 5 minutes from now
      });

      expect(getTokenRemainingMinutes(payload)).toBe(5);
    });

    it('should return 0 for expired tokens', () => {
      const payload = createExpiredPayload();
      expect(getTokenRemainingSeconds(payload)).toBe(0);
      expect(getTokenRemainingMinutes(payload)).toBe(0);
    });
  });

  describe('Display Functions', () => {
    it('should format token expiry', () => {
      const now = Math.floor(Date.now() / 1000);

      const expired = createTestPayload({ exp: now - 60 });
      expect(formatTokenExpiry(expired)).toBe('Expired');

      const minutes = createTestPayload({ exp: now + 45 * 60 });
      expect(formatTokenExpiry(minutes)).toBe('45 minutes remaining');

      const oneMinute = createTestPayload({ exp: now + 60 });
      expect(formatTokenExpiry(oneMinute)).toBe('1 minute remaining');

      const hours = createTestPayload({ exp: now + 3 * 60 * 60 });
      expect(formatTokenExpiry(hours)).toBe('3 hours remaining');

      const oneHour = createTestPayload({ exp: now + 60 * 60 });
      expect(formatTokenExpiry(oneHour)).toBe('1 hour remaining');
    });

    it('should return error messages', () => {
      expect(getTokenErrorMessage('INVALID_FORMAT')).toContain('format');
      expect(getTokenErrorMessage('INVALID_SIGNATURE')).toContain('signature');
      expect(getTokenErrorMessage('TOKEN_EXPIRED')).toContain('expired');
      expect(getTokenErrorMessage('FINGERPRINT_MISMATCH')).toContain('device');
    });
  });

  describe('JTI Generation', () => {
    it('should generate unique JTIs', () => {
      const jti1 = generateJti();
      const jti2 = generateJti();

      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });
});
