/**
 * Fallback Identifiers Service
 * Subtask 15.2: Add fallback identifiers (MAC address)
 *
 * Provides:
 * - MAC address collection and validation
 * - Disk serial number collection
 * - BIOS and motherboard serial collection
 * - Network interface filtering (physical vs virtual)
 * - Enhanced fingerprint with fallback identifiers
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import {
  HardwareIdentifiers,
  FingerprintResult,
  FingerprintConfig,
  hashString,
  normalizeUuid,
  collectHardwareIdentifiers,
  generateFingerprint as baseGenerateFingerprint,
} from './HardwareFingerprint';

const execAsync = promisify(exec);

// =============================================================================
// Types
// =============================================================================

export interface NetworkInterface {
  name: string;
  mac: string;
  internal: boolean;
  family: 'IPv4' | 'IPv6';
  address: string;
}

export interface FallbackIdentifiers {
  primaryMac: string | null;
  allMacs: string[];
  diskSerial: string | null;
  biosSerial: string | null;
  motherboardSerial: string | null;
}

export interface EnhancedHardwareIdentifiers extends HardwareIdentifiers {
  fallback: FallbackIdentifiers;
}

export type IdentifierPriority = 'uuid' | 'machineId' | 'mac' | 'disk' | 'bios';

export interface IdentifierStrength {
  identifier: IdentifierPriority;
  available: boolean;
  score: number;
}

export interface EnhancedFingerprintResult extends FingerprintResult {
  identifiers: EnhancedHardwareIdentifiers;
  fallbackUsed: boolean;
  strengthScore: number;
}

export interface EnhancedFingerprintConfig extends FingerprintConfig {
  includeMac?: boolean;
  includeDiskSerial?: boolean;
  includeBiosSerial?: boolean;
}

// Service version
const ENHANCED_FINGERPRINT_VERSION = '1.1.0';

// Known virtual machine OUIs (Organizationally Unique Identifiers)
const VIRTUAL_OUIS = [
  '00:50:56', // VMware
  '00:0C:29', // VMware
  '00:05:69', // VMware
  '00:1C:14', // VMware
  '08:00:27', // VirtualBox
  '52:54:00', // QEMU/KVM
  '00:16:3E', // Xen
  '00:15:5D', // Hyper-V
  '00:03:FF', // Microsoft Virtual PC
];

// =============================================================================
// MAC Address Functions
// =============================================================================

/**
 * Validate MAC address format
 */
export function isValidMacAddress(mac: string): boolean {
  if (!mac) return false;
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Normalize MAC address format to uppercase with colons
 */
export function normalizeMacAddress(mac: string): string {
  if (!mac) return '';

  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();

  if (!/^[0-9A-F]{12}$/.test(cleaned)) {
    return mac.toUpperCase();
  }

  return cleaned.match(/.{2}/g)?.join(':') || mac.toUpperCase();
}

/**
 * Check if MAC address is a virtual/local address
 */
export function isVirtualMacAddress(mac: string): boolean {
  if (!mac) return true;

  const normalized = normalizeMacAddress(mac);
  const firstByte = parseInt(normalized.substring(0, 2), 16);

  // Check locally administered bit (second least significant bit)
  return (firstByte & 0x02) !== 0;
}

/**
 * Check if MAC address is from a known virtual vendor
 */
export function isKnownVirtualVendor(mac: string): boolean {
  const normalized = normalizeMacAddress(mac);
  const oui = normalized.substring(0, 8);
  return VIRTUAL_OUIS.includes(oui);
}

// =============================================================================
// Network Interface Functions
// =============================================================================

/**
 * Get network interfaces from OS
 */
export function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces: NetworkInterface[] = [];
  const osInterfaces = os.networkInterfaces();

  for (const [name, addrs] of Object.entries(osInterfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      interfaces.push({
        name,
        mac: addr.mac,
        internal: addr.internal,
        family: addr.family as 'IPv4' | 'IPv6',
        address: addr.address,
      });
    }
  }

  return interfaces;
}

/**
 * Filter network interfaces to get valid physical interfaces
 */
export function filterPhysicalInterfaces(interfaces: NetworkInterface[]): NetworkInterface[] {
  return interfaces.filter(iface => {
    if (iface.internal) return false;
    if (!iface.mac || iface.mac === '00:00:00:00:00:00') return false;
    if (isVirtualMacAddress(iface.mac)) return false;
    if (isKnownVirtualVendor(iface.mac)) return false;
    return true;
  });
}

/**
 * Get primary MAC address from interfaces
 */
export function getPrimaryMacAddress(interfaces: NetworkInterface[]): string | null {
  const physical = filterPhysicalInterfaces(interfaces);

  if (physical.length === 0) return null;

  // Prefer Ethernet over WiFi
  const ethernet = physical.find(iface =>
    iface.name.toLowerCase().includes('eth') ||
    iface.name.toLowerCase().includes('en0') ||
    iface.name.toLowerCase().includes('ethernet')
  );

  if (ethernet) {
    return normalizeMacAddress(ethernet.mac);
  }

  return normalizeMacAddress(physical[0].mac);
}

/**
 * Get all valid MAC addresses
 */
export function getAllMacAddresses(interfaces: NetworkInterface[]): string[] {
  const physical = filterPhysicalInterfaces(interfaces);
  return physical.map(iface => normalizeMacAddress(iface.mac));
}

// =============================================================================
// Serial Number Collection (Windows)
// =============================================================================

/**
 * Parse WMIC disk serial output
 */
export function parseWmicDiskSerial(output: string): string | null {
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if (line.toLowerCase() === 'serialnumber') continue;
    if (line.length >= 4) {
      return line;
    }
  }

  return null;
}

/**
 * Parse WMIC BIOS serial output
 */
export function parseWmicBiosSerial(output: string): string | null {
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if (line.toLowerCase() === 'serialnumber') continue;
    if (line.length >= 4 && line !== 'To Be Filled By O.E.M.') {
      return line;
    }
  }

  return null;
}

/**
 * Parse WMIC baseboard serial output
 */
export function parseWmicBaseboardSerial(output: string): string | null {
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if (line.toLowerCase() === 'serialnumber') continue;
    if (line.length >= 4 && line !== 'To Be Filled By O.E.M.' && line !== 'Default string') {
      return line;
    }
  }

  return null;
}

/**
 * Get disk serial number
 */
async function getDiskSerial(): Promise<string | null> {
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const { stdout } = await execAsync('wmic diskdrive get serialnumber', { timeout: 5000 });
      return parseWmicDiskSerial(stdout);
    } catch {
      return null;
    }
  }

  if (platform === 'linux') {
    try {
      const { stdout } = await execAsync('lsblk -dno SERIAL /dev/sda 2>/dev/null || echo ""', { timeout: 5000 });
      const serial = stdout.trim();
      return serial.length >= 4 ? serial : null;
    } catch {
      return null;
    }
  }

  if (platform === 'darwin') {
    try {
      const { stdout } = await execAsync(
        'system_profiler SPSerialATADataType 2>/dev/null | grep "Serial Number" | head -1 | awk -F": " \'{print $2}\'',
        { timeout: 5000 }
      );
      const serial = stdout.trim();
      return serial.length >= 4 ? serial : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get BIOS serial number
 */
async function getBiosSerial(): Promise<string | null> {
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const { stdout } = await execAsync('wmic bios get serialnumber', { timeout: 5000 });
      return parseWmicBiosSerial(stdout);
    } catch {
      return null;
    }
  }

  if (platform === 'linux') {
    try {
      const { stdout } = await execAsync('cat /sys/class/dmi/id/product_serial 2>/dev/null || echo ""', { timeout: 5000 });
      const serial = stdout.trim();
      return serial.length >= 4 && serial !== 'To Be Filled By O.E.M.' ? serial : null;
    } catch {
      return null;
    }
  }

  if (platform === 'darwin') {
    try {
      const { stdout } = await execAsync('system_profiler SPHardwareDataType | grep "Serial Number" | awk -F": " \'{print $2}\'', { timeout: 5000 });
      const serial = stdout.trim();
      return serial.length >= 4 ? serial : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get motherboard serial number
 */
async function getMotherboardSerial(): Promise<string | null> {
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const { stdout } = await execAsync('wmic baseboard get serialnumber', { timeout: 5000 });
      return parseWmicBaseboardSerial(stdout);
    } catch {
      return null;
    }
  }

  if (platform === 'linux') {
    try {
      const { stdout } = await execAsync('cat /sys/class/dmi/id/board_serial 2>/dev/null || echo ""', { timeout: 5000 });
      const serial = stdout.trim();
      return serial.length >= 4 && serial !== 'To Be Filled By O.E.M.' ? serial : null;
    } catch {
      return null;
    }
  }

  return null;
}

// =============================================================================
// Fallback Identifiers Collection
// =============================================================================

/**
 * Create fallback identifiers object
 */
export function createFallbackIdentifiers(
  primaryMac: string | null,
  allMacs: string[],
  diskSerial: string | null,
  biosSerial: string | null,
  motherboardSerial: string | null
): FallbackIdentifiers {
  return {
    primaryMac,
    allMacs,
    diskSerial,
    biosSerial,
    motherboardSerial,
  };
}

/**
 * Create empty fallback identifiers
 */
export function createEmptyFallbackIdentifiers(): FallbackIdentifiers {
  return {
    primaryMac: null,
    allMacs: [],
    diskSerial: null,
    biosSerial: null,
    motherboardSerial: null,
  };
}

/**
 * Collect all fallback identifiers
 */
export async function collectFallbackIdentifiers(): Promise<FallbackIdentifiers> {
  try {
    const interfaces = getNetworkInterfaces();
    const primaryMac = getPrimaryMacAddress(interfaces);
    const allMacs = getAllMacAddresses(interfaces);

    const [diskSerial, biosSerial, motherboardSerial] = await Promise.all([
      getDiskSerial(),
      getBiosSerial(),
      getMotherboardSerial(),
    ]);

    return createFallbackIdentifiers(
      primaryMac,
      allMacs,
      diskSerial,
      biosSerial,
      motherboardSerial
    );
  } catch {
    return createEmptyFallbackIdentifiers();
  }
}

/**
 * Check if fallback identifiers have minimum data
 */
export function hasMinimumFallbackIdentifiers(fallback: FallbackIdentifiers): boolean {
  return !!(
    fallback.primaryMac ||
    fallback.allMacs.length > 0 ||
    fallback.diskSerial ||
    fallback.biosSerial ||
    fallback.motherboardSerial
  );
}

/**
 * Validate fallback identifiers format
 */
export function validateFallbackIdentifiers(fallback: FallbackIdentifiers): boolean {
  if (fallback.primaryMac && !isValidMacAddress(fallback.primaryMac)) {
    return false;
  }

  for (const mac of fallback.allMacs) {
    if (!isValidMacAddress(mac)) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Identifier Strength Calculation
// =============================================================================

/**
 * Get identifier priority scores
 */
export function getIdentifierStrengths(
  hasUuid: boolean,
  hasMachineId: boolean,
  fallback: FallbackIdentifiers
): IdentifierStrength[] {
  return [
    { identifier: 'uuid', available: hasUuid, score: hasUuid ? 40 : 0 },
    { identifier: 'machineId', available: hasMachineId, score: hasMachineId ? 35 : 0 },
    { identifier: 'mac', available: !!fallback.primaryMac, score: fallback.primaryMac ? 25 : 0 },
    { identifier: 'disk', available: !!fallback.diskSerial, score: fallback.diskSerial ? 20 : 0 },
    { identifier: 'bios', available: !!fallback.biosSerial, score: fallback.biosSerial ? 15 : 0 },
  ];
}

/**
 * Calculate total identifier strength
 */
export function calculateTotalStrength(
  hasUuid: boolean,
  hasMachineId: boolean,
  fallback: FallbackIdentifiers
): number {
  const strengths = getIdentifierStrengths(hasUuid, hasMachineId, fallback);
  const total = strengths.reduce((sum, s) => sum + s.score, 0);
  return Math.min(total, 100);
}

/**
 * Get best available identifier for fingerprint
 */
export function getBestIdentifier(
  uuid: string | null,
  machineId: string | null,
  fallback: FallbackIdentifiers
): string | null {
  if (uuid) return uuid;
  if (machineId) return machineId;
  if (fallback.primaryMac) return fallback.primaryMac;
  if (fallback.diskSerial) return fallback.diskSerial;
  if (fallback.biosSerial) return fallback.biosSerial;
  if (fallback.motherboardSerial) return fallback.motherboardSerial;
  return null;
}

// =============================================================================
// Enhanced Fingerprint Generation
// =============================================================================

/**
 * Generate fallback fingerprint component
 */
export function generateFallbackComponent(fallback: FallbackIdentifiers): string {
  const components: string[] = [];

  if (fallback.primaryMac) {
    components.push(`mac:${fallback.primaryMac}`);
  }

  if (fallback.diskSerial) {
    components.push(`disk:${fallback.diskSerial}`);
  }

  if (fallback.biosSerial) {
    components.push(`bios:${fallback.biosSerial}`);
  }

  if (fallback.motherboardSerial) {
    components.push(`mb:${fallback.motherboardSerial}`);
  }

  return components.join('|');
}

/**
 * Collect enhanced hardware identifiers
 */
export async function collectEnhancedIdentifiers(): Promise<EnhancedHardwareIdentifiers> {
  const [baseIdentifiers, fallback] = await Promise.all([
    collectHardwareIdentifiers(),
    collectFallbackIdentifiers(),
  ]);

  return {
    ...baseIdentifiers,
    fallback,
  };
}

/**
 * Generate enhanced fingerprint
 */
export function generateEnhancedFingerprint(
  identifiers: EnhancedHardwareIdentifiers,
  config: EnhancedFingerprintConfig = {}
): string {
  const {
    includeMac = true,
    includeDiskSerial = false,
    includeBiosSerial = false,
    hashAlgorithm = 'sha256',
  } = config;

  // Start with base fingerprint components
  const components: string[] = [
    identifiers.machineId,
    identifiers.platform,
  ];

  if (identifiers.systemUuid) {
    components.push(identifiers.systemUuid);
  }

  if (config.includeHostname) {
    components.push(identifiers.hostname);
  }

  if (config.includeCpuInfo !== false) {
    components.push(identifiers.cpuModel);
    components.push(identifiers.cpuCores.toString());
  }

  // Add fallback components
  if (includeMac && identifiers.fallback.primaryMac) {
    components.push(identifiers.fallback.primaryMac);
  }

  if (includeDiskSerial && identifiers.fallback.diskSerial) {
    components.push(identifiers.fallback.diskSerial);
  }

  if (includeBiosSerial && identifiers.fallback.biosSerial) {
    components.push(identifiers.fallback.biosSerial);
  }

  const fingerprint = components.join('|');
  return hashString(fingerprint, hashAlgorithm);
}

/**
 * Create enhanced fingerprint result
 */
export async function createEnhancedFingerprintResult(
  config: EnhancedFingerprintConfig = {}
): Promise<EnhancedFingerprintResult> {
  const identifiers = await collectEnhancedIdentifiers();
  const fingerprint = generateEnhancedFingerprint(identifiers, config);

  // Determine if fallback was used
  const fallbackUsed = !identifiers.systemUuid && !identifiers.machineId &&
    hasMinimumFallbackIdentifiers(identifiers.fallback);

  // Calculate strength
  const strengthScore = calculateTotalStrength(
    !!identifiers.systemUuid,
    !!identifiers.machineId,
    identifiers.fallback
  );

  return {
    fingerprint,
    identifiers,
    generatedAt: new Date(),
    version: ENHANCED_FINGERPRINT_VERSION,
    fallbackUsed,
    strengthScore,
  };
}

// =============================================================================
// Enhanced Fingerprint Service Class
// =============================================================================

/**
 * Enhanced Hardware Fingerprint Service with fallback identifiers
 */
export class EnhancedFingerprintService {
  private config: EnhancedFingerprintConfig;
  private fingerprint: EnhancedFingerprintResult | null = null;

  constructor(config: EnhancedFingerprintConfig = {}) {
    this.config = {
      includeHostname: false,
      includeCpuInfo: true,
      includeMemory: false,
      hashAlgorithm: 'sha256',
      includeMac: true,
      includeDiskSerial: false,
      includeBiosSerial: false,
      ...config,
    };
  }

  /**
   * Initialize and collect fingerprint
   */
  async initialize(): Promise<EnhancedFingerprintResult> {
    this.fingerprint = await createEnhancedFingerprintResult(this.config);
    return this.fingerprint;
  }

  /**
   * Get current fingerprint (initialize if needed)
   */
  async getFingerprint(): Promise<EnhancedFingerprintResult> {
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
   * Get fallback identifiers
   */
  async getFallbackIdentifiers(): Promise<FallbackIdentifiers> {
    const result = await this.getFingerprint();
    return result.identifiers.fallback;
  }

  /**
   * Get strength score
   */
  async getStrength(): Promise<number> {
    const result = await this.getFingerprint();
    return result.strengthScore;
  }

  /**
   * Check if fallback was used
   */
  async isFallbackUsed(): Promise<boolean> {
    const result = await this.getFingerprint();
    return result.fallbackUsed;
  }

  /**
   * Get best identifier
   */
  async getBestIdentifier(): Promise<string | null> {
    const result = await this.getFingerprint();
    return getBestIdentifier(
      result.identifiers.systemUuid,
      result.identifiers.machineId,
      result.identifiers.fallback
    );
  }

  /**
   * Refresh fingerprint
   */
  async refresh(): Promise<EnhancedFingerprintResult> {
    this.fingerprint = null;
    return this.initialize();
  }

  /**
   * Get all available identifiers summary
   */
  async getIdentifiersSummary(): Promise<IdentifierStrength[]> {
    const result = await this.getFingerprint();
    return getIdentifierStrengths(
      !!result.identifiers.systemUuid,
      !!result.identifiers.machineId,
      result.identifiers.fallback
    );
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default EnhancedFingerprintService;
