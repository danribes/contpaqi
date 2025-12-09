/**
 * Hardware Fingerprint Service
 * Subtask 15.1: Implement hardware fingerprint collection (UUID)
 *
 * Provides:
 * - Collection of unique hardware identifiers
 * - UUID extraction from system SMBIOS/DMI data
 * - Cross-platform support (Windows primary)
 * - Fingerprint generation, validation, and caching
 */

import { createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

// =============================================================================
// Types
// =============================================================================

export interface HardwareIdentifiers {
  machineId: string;
  systemUuid: string | null;
  hostname: string;
  platform: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
}

export interface FingerprintResult {
  fingerprint: string;
  identifiers: HardwareIdentifiers;
  generatedAt: Date;
  version: string;
}

export interface FingerprintConfig {
  includeHostname?: boolean;
  includeCpuInfo?: boolean;
  includeMemory?: boolean;
  hashAlgorithm?: 'sha256' | 'sha512';
}

export type FingerprintStatus = 'valid' | 'invalid' | 'expired' | 'mismatch';

export interface FingerprintValidation {
  status: FingerprintStatus;
  isValid: boolean;
  message: string;
}

// Service version
const FINGERPRINT_VERSION = '1.0.0';

// =============================================================================
// Hash Functions
// =============================================================================

/**
 * Generate hash of input string using crypto module
 */
export function hashString(input: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  return createHash(algorithm).update(input).digest('hex');
}

// =============================================================================
// UUID Functions
// =============================================================================

/**
 * Normalize UUID format to uppercase with dashes
 */
export function normalizeUuid(uuid: string): string {
  const cleaned = uuid.trim().toUpperCase();

  // Check if already in UUID format
  const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  if (uuidRegex.test(cleaned)) {
    return cleaned;
  }

  // Try to format raw hex into UUID
  const hex = cleaned.replace(/[^0-9A-F]/g, '');
  if (hex.length === 32) {
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return cleaned;
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  if (!uuid) return false;
  const normalized = normalizeUuid(uuid);
  const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  return uuidRegex.test(normalized);
}

// =============================================================================
// Platform-Specific UUID Collection
// =============================================================================

/**
 * Parse WMIC UUID output
 */
export function parseWmicUuidOutput(output: string): string | null {
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if (isValidUuid(line)) {
      return normalizeUuid(line);
    }
  }

  return null;
}

/**
 * Parse Windows Machine GUID from registry
 */
export function parseMachineGuid(output: string): string | null {
  const match = output.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
  if (match && match[1]) {
    return normalizeUuid(match[1]);
  }
  return null;
}

/**
 * Get system UUID on Windows using WMIC
 */
async function getWindowsSystemUuid(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('wmic csproduct get uuid', { timeout: 5000 });
    return parseWmicUuidOutput(stdout);
  } catch {
    return null;
  }
}

/**
 * Get Machine GUID from Windows registry
 */
async function getWindowsMachineGuid(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
      { timeout: 5000 }
    );
    return parseMachineGuid(stdout);
  } catch {
    return null;
  }
}

/**
 * Get system UUID on Linux from /sys/class/dmi
 */
async function getLinuxSystemUuid(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('cat /sys/class/dmi/id/product_uuid 2>/dev/null || cat /etc/machine-id', { timeout: 5000 });
    const uuid = stdout.trim();
    if (uuid && uuid.length >= 32) {
      return normalizeUuid(uuid);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get system UUID on macOS using ioreg
 */
async function getMacSystemUuid(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'ioreg -d2 -c IOPlatformExpertDevice | grep IOPlatformUUID',
      { timeout: 5000 }
    );
    const match = stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return normalizeUuid(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get system UUID based on platform
 */
export async function getSystemUuid(): Promise<string | null> {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return getWindowsSystemUuid();
    case 'linux':
      return getLinuxSystemUuid();
    case 'darwin':
      return getMacSystemUuid();
    default:
      return null;
  }
}

/**
 * Get machine ID (Windows Machine GUID or fallback)
 */
export async function getMachineId(): Promise<string> {
  const platform = os.platform();

  if (platform === 'win32') {
    const guid = await getWindowsMachineGuid();
    if (guid) return guid;
  }

  // Fallback: generate ID from hostname + cpu + platform
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
  const fallbackId = hashString(`${os.hostname()}|${cpuModel}|${platform}`, 'sha256');
  return fallbackId.substring(0, 36);
}

// =============================================================================
// Hardware Identifiers Collection
// =============================================================================

/**
 * Create hardware identifiers object
 */
export function createHardwareIdentifiers(
  machineId: string,
  systemUuid: string | null,
  hostname: string,
  platform: string,
  cpuModel: string,
  cpuCores: number,
  totalMemory: number
): HardwareIdentifiers {
  return {
    machineId,
    systemUuid: systemUuid ? normalizeUuid(systemUuid) : null,
    hostname,
    platform,
    cpuModel,
    cpuCores,
    totalMemory,
  };
}

/**
 * Create empty identifiers for error cases
 */
export function createEmptyIdentifiers(): HardwareIdentifiers {
  return {
    machineId: '',
    systemUuid: null,
    hostname: '',
    platform: '',
    cpuModel: '',
    cpuCores: 0,
    totalMemory: 0,
  };
}

/**
 * Collect hardware identifiers from system
 */
export async function collectHardwareIdentifiers(): Promise<HardwareIdentifiers> {
  try {
    const [machineId, systemUuid] = await Promise.all([
      getMachineId(),
      getSystemUuid(),
    ]);

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
    const cpuCores = cpus.length;
    const totalMemory = os.totalmem();
    const hostname = os.hostname();
    const platform = os.platform();

    return createHardwareIdentifiers(
      machineId,
      systemUuid,
      hostname,
      platform,
      cpuModel,
      cpuCores,
      totalMemory
    );
  } catch {
    return createEmptyIdentifiers();
  }
}

/**
 * Check if fingerprint identifiers are sufficient
 */
export function hasMinimumIdentifiers(identifiers: HardwareIdentifiers): boolean {
  return !!(identifiers.machineId || identifiers.systemUuid);
}

// =============================================================================
// Fingerprint Generation
// =============================================================================

/**
 * Generate fingerprint from identifiers
 */
export function generateFingerprint(
  identifiers: HardwareIdentifiers,
  config: FingerprintConfig = {}
): string {
  const {
    includeHostname = false,
    includeCpuInfo = true,
    includeMemory = false,
    hashAlgorithm = 'sha256',
  } = config;

  // Build fingerprint components
  const components: string[] = [
    identifiers.machineId,
    identifiers.platform,
  ];

  if (identifiers.systemUuid) {
    components.push(identifiers.systemUuid);
  }

  if (includeHostname) {
    components.push(identifiers.hostname);
  }

  if (includeCpuInfo) {
    components.push(identifiers.cpuModel);
    components.push(identifiers.cpuCores.toString());
  }

  if (includeMemory) {
    components.push(identifiers.totalMemory.toString());
  }

  // Join and hash
  const fingerprint = components.join('|');
  return hashString(fingerprint, hashAlgorithm);
}

/**
 * Create fingerprint result
 */
export function createFingerprintResult(
  identifiers: HardwareIdentifiers,
  config: FingerprintConfig = {}
): FingerprintResult {
  return {
    fingerprint: generateFingerprint(identifiers, config),
    identifiers,
    generatedAt: new Date(),
    version: FINGERPRINT_VERSION,
  };
}

/**
 * Generate fingerprint from current system
 */
export async function generateSystemFingerprint(
  config: FingerprintConfig = {}
): Promise<FingerprintResult> {
  const identifiers = await collectHardwareIdentifiers();
  return createFingerprintResult(identifiers, config);
}

// =============================================================================
// Fingerprint Validation
// =============================================================================

/**
 * Validate fingerprint format
 */
export function validateFingerprintFormat(fingerprint: string): boolean {
  const sha256Regex = /^[a-f0-9]{64}$/i;
  const sha512Regex = /^[a-f0-9]{128}$/i;
  return sha256Regex.test(fingerprint) || sha512Regex.test(fingerprint);
}

/**
 * Compare two fingerprints
 */
export function compareFingerprints(fp1: string, fp2: string): boolean {
  if (!fp1 || !fp2) return false;
  return fp1.toLowerCase() === fp2.toLowerCase();
}

/**
 * Validate fingerprint result
 */
export function validateFingerprint(
  result: FingerprintResult,
  expectedFingerprint?: string,
  maxAgeMs?: number
): FingerprintValidation {
  // Check format
  if (!validateFingerprintFormat(result.fingerprint)) {
    return {
      status: 'invalid',
      isValid: false,
      message: 'Invalid fingerprint format',
    };
  }

  // Check age
  if (maxAgeMs !== undefined) {
    const age = Date.now() - result.generatedAt.getTime();
    if (age > maxAgeMs) {
      return {
        status: 'expired',
        isValid: false,
        message: `Fingerprint expired (age: ${age}ms, max: ${maxAgeMs}ms)`,
      };
    }
  }

  // Check match
  if (expectedFingerprint !== undefined) {
    if (!compareFingerprints(result.fingerprint, expectedFingerprint)) {
      return {
        status: 'mismatch',
        isValid: false,
        message: 'Fingerprint does not match expected value',
      };
    }
  }

  return {
    status: 'valid',
    isValid: true,
    message: 'Fingerprint is valid',
  };
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize fingerprint result for storage
 */
export function serializeFingerprint(result: FingerprintResult): string {
  return JSON.stringify({
    ...result,
    generatedAt: result.generatedAt.toISOString(),
  });
}

/**
 * Deserialize fingerprint result from storage
 */
export function deserializeFingerprint(json: string): FingerprintResult | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      generatedAt: new Date(data.generatedAt),
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Display and Utility Functions
// =============================================================================

/**
 * Mask fingerprint for display (security)
 */
export function maskFingerprint(fingerprint: string, visibleChars: number = 8): string {
  if (fingerprint.length <= visibleChars * 2) {
    return fingerprint;
  }
  const start = fingerprint.slice(0, visibleChars);
  const end = fingerprint.slice(-visibleChars);
  return `${start}...${end}`;
}

/**
 * Get fingerprint strength score (0-100)
 */
export function getFingerprintStrength(identifiers: HardwareIdentifiers): number {
  let score = 0;

  // Machine ID is most important
  if (identifiers.machineId) score += 40;

  // System UUID is very reliable
  if (identifiers.systemUuid) score += 30;

  // CPU info adds uniqueness
  if (identifiers.cpuModel) score += 15;
  if (identifiers.cpuCores > 0) score += 5;

  // Platform for context
  if (identifiers.platform) score += 10;

  return Math.min(score, 100);
}

// =============================================================================
// Caching
// =============================================================================

let cachedFingerprint: FingerprintResult | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get fingerprint with caching
 */
export async function getCachedFingerprint(
  config: FingerprintConfig = {},
  forceRefresh: boolean = false
): Promise<FingerprintResult> {
  const now = Date.now();

  // Return cached if valid
  if (!forceRefresh && cachedFingerprint && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedFingerprint;
  }

  // Generate new fingerprint
  cachedFingerprint = await generateSystemFingerprint(config);
  cacheTimestamp = now;

  return cachedFingerprint;
}

/**
 * Clear fingerprint cache
 */
export function clearFingerprintCache(): void {
  cachedFingerprint = null;
  cacheTimestamp = 0;
}

// =============================================================================
// Main Service Class
// =============================================================================

/**
 * Hardware Fingerprint Service
 * Main service class for fingerprint operations
 */
export class HardwareFingerprintService {
  private config: FingerprintConfig;
  private fingerprint: FingerprintResult | null = null;

  constructor(config: FingerprintConfig = {}) {
    this.config = {
      includeHostname: false,
      includeCpuInfo: true,
      includeMemory: false,
      hashAlgorithm: 'sha256',
      ...config,
    };
  }

  /**
   * Initialize and collect fingerprint
   */
  async initialize(): Promise<FingerprintResult> {
    this.fingerprint = await generateSystemFingerprint(this.config);
    return this.fingerprint;
  }

  /**
   * Get current fingerprint (initialize if needed)
   */
  async getFingerprint(): Promise<FingerprintResult> {
    if (!this.fingerprint) {
      return this.initialize();
    }
    return this.fingerprint;
  }

  /**
   * Get fingerprint string only
   */
  async getFingerprintString(): Promise<string> {
    const result = await this.getFingerprint();
    return result.fingerprint;
  }

  /**
   * Validate current fingerprint against expected value
   */
  async validate(expectedFingerprint: string): Promise<FingerprintValidation> {
    const result = await this.getFingerprint();
    return validateFingerprint(result, expectedFingerprint);
  }

  /**
   * Check if fingerprint matches expected value
   */
  async matches(expectedFingerprint: string): Promise<boolean> {
    const validation = await this.validate(expectedFingerprint);
    return validation.isValid;
  }

  /**
   * Refresh fingerprint
   */
  async refresh(): Promise<FingerprintResult> {
    this.fingerprint = null;
    return this.initialize();
  }

  /**
   * Get fingerprint strength
   */
  async getStrength(): Promise<number> {
    const result = await this.getFingerprint();
    return getFingerprintStrength(result.identifiers);
  }

  /**
   * Get masked fingerprint for display
   */
  async getMaskedFingerprint(visibleChars: number = 8): Promise<string> {
    const result = await this.getFingerprint();
    return maskFingerprint(result.fingerprint, visibleChars);
  }

  /**
   * Serialize fingerprint for storage
   */
  async serialize(): Promise<string> {
    const result = await this.getFingerprint();
    return serializeFingerprint(result);
  }

  /**
   * Load fingerprint from serialized data
   */
  loadFromSerialized(json: string): boolean {
    const result = deserializeFingerprint(json);
    if (result) {
      this.fingerprint = result;
      return true;
    }
    return false;
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default HardwareFingerprintService;
