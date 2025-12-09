/**
 * Fallback Identifiers Tests
 * Subtask 15.2: Add fallback identifiers (MAC address)
 *
 * Tests for:
 * - MAC address extraction and validation
 * - Network interface filtering
 * - Fallback identifier prioritization
 * - Disk serial number collection
 * - Combined fallback fingerprint
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// =============================================================================
// Types
// =============================================================================

interface NetworkInterface {
  name: string;
  mac: string;
  internal: boolean;
  family: 'IPv4' | 'IPv6';
  address: string;
}

interface FallbackIdentifiers {
  primaryMac: string | null;
  allMacs: string[];
  diskSerial: string | null;
  biosSerial: string | null;
  motherboardSerial: string | null;
}

interface EnhancedHardwareIdentifiers {
  machineId: string;
  systemUuid: string | null;
  hostname: string;
  platform: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  fallback: FallbackIdentifiers;
}

type IdentifierPriority = 'uuid' | 'machineId' | 'mac' | 'disk' | 'bios';

interface IdentifierStrength {
  identifier: IdentifierPriority;
  available: boolean;
  score: number;
}

// =============================================================================
// Implementation Functions (Local for testing)
// =============================================================================

/**
 * Validate MAC address format
 */
function isValidMacAddress(mac: string): boolean {
  if (!mac) return false;

  // Standard formats: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Normalize MAC address format to uppercase with colons
 */
function normalizeMacAddress(mac: string): string {
  if (!mac) return '';

  // Remove all separators and convert to uppercase
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();

  // Must be 12 hex characters
  if (!/^[0-9A-F]{12}$/.test(cleaned)) {
    return mac.toUpperCase();
  }

  // Format as XX:XX:XX:XX:XX:XX
  return cleaned.match(/.{2}/g)?.join(':') || mac.toUpperCase();
}

/**
 * Check if MAC address is a virtual/local address
 */
function isVirtualMacAddress(mac: string): boolean {
  if (!mac) return true;

  const normalized = normalizeMacAddress(mac);
  const firstByte = parseInt(normalized.substring(0, 2), 16);

  // Check locally administered bit (second least significant bit of first byte)
  // If set (1), it's a locally administered (virtual) address
  return (firstByte & 0x02) !== 0;
}

/**
 * Check if MAC address is a known virtual vendor
 */
function isKnownVirtualVendor(mac: string): boolean {
  const normalized = normalizeMacAddress(mac);
  const oui = normalized.substring(0, 8); // First 3 bytes (OUI)

  // Known virtual machine OUIs
  const virtualOuis = [
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

  return virtualOuis.includes(oui);
}

/**
 * Filter network interfaces to get valid physical interfaces
 */
function filterPhysicalInterfaces(interfaces: NetworkInterface[]): NetworkInterface[] {
  return interfaces.filter(iface => {
    // Skip internal interfaces
    if (iface.internal) return false;

    // Skip empty MAC
    if (!iface.mac || iface.mac === '00:00:00:00:00:00') return false;

    // Skip virtual MACs
    if (isVirtualMacAddress(iface.mac)) return false;

    // Skip known virtual vendors
    if (isKnownVirtualVendor(iface.mac)) return false;

    return true;
  });
}

/**
 * Get primary MAC address from interfaces
 */
function getPrimaryMacAddress(interfaces: NetworkInterface[]): string | null {
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

  // Return first physical interface
  return normalizeMacAddress(physical[0].mac);
}

/**
 * Get all valid MAC addresses
 */
function getAllMacAddresses(interfaces: NetworkInterface[]): string[] {
  const physical = filterPhysicalInterfaces(interfaces);
  return physical.map(iface => normalizeMacAddress(iface.mac));
}

/**
 * Parse Windows WMIC disk serial output
 */
function parseWmicDiskSerial(output: string): string | null {
  // WMIC output format:
  // SerialNumber
  // WD-XXXXXXXX
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Skip header
    if (line.toLowerCase() === 'serialnumber') continue;

    // Return first non-empty serial
    if (line.length >= 4) {
      return line;
    }
  }

  return null;
}

/**
 * Parse Windows WMIC BIOS serial output
 */
function parseWmicBiosSerial(output: string): string | null {
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
 * Parse Windows WMIC baseboard serial output
 */
function parseWmicBaseboardSerial(output: string): string | null {
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
 * Create fallback identifiers object
 */
function createFallbackIdentifiers(
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
function createEmptyFallbackIdentifiers(): FallbackIdentifiers {
  return {
    primaryMac: null,
    allMacs: [],
    diskSerial: null,
    biosSerial: null,
    motherboardSerial: null,
  };
}

/**
 * Check if fallback identifiers have minimum data
 */
function hasMinimumFallbackIdentifiers(fallback: FallbackIdentifiers): boolean {
  return !!(
    fallback.primaryMac ||
    fallback.allMacs.length > 0 ||
    fallback.diskSerial ||
    fallback.biosSerial ||
    fallback.motherboardSerial
  );
}

/**
 * Get identifier priority scores
 */
function getIdentifierStrengths(
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
function calculateTotalStrength(
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
function getBestIdentifier(
  uuid: string | null,
  machineId: string | null,
  fallback: FallbackIdentifiers
): string | null {
  // Priority: UUID > Machine ID > Primary MAC > Disk Serial > BIOS Serial
  if (uuid) return uuid;
  if (machineId) return machineId;
  if (fallback.primaryMac) return fallback.primaryMac;
  if (fallback.diskSerial) return fallback.diskSerial;
  if (fallback.biosSerial) return fallback.biosSerial;
  if (fallback.motherboardSerial) return fallback.motherboardSerial;

  return null;
}

/**
 * Generate fallback fingerprint component
 */
function generateFallbackComponent(fallback: FallbackIdentifiers): string {
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
 * Merge primary identifiers with fallback
 */
function mergeIdentifiers(
  machineId: string,
  systemUuid: string | null,
  hostname: string,
  platform: string,
  cpuModel: string,
  cpuCores: number,
  totalMemory: number,
  fallback: FallbackIdentifiers
): EnhancedHardwareIdentifiers {
  return {
    machineId,
    systemUuid,
    hostname,
    platform,
    cpuModel,
    cpuCores,
    totalMemory,
    fallback,
  };
}

/**
 * Validate fallback identifiers format
 */
function validateFallbackIdentifiers(fallback: FallbackIdentifiers): boolean {
  // Check MAC format if present
  if (fallback.primaryMac && !isValidMacAddress(fallback.primaryMac)) {
    return false;
  }

  // Check all MACs format
  for (const mac of fallback.allMacs) {
    if (!isValidMacAddress(mac)) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Tests: MAC Address Validation
// =============================================================================

describe('MAC Address Validation', () => {
  describe('isValidMacAddress', () => {
    it('should accept colon-separated MAC', () => {
      expect(isValidMacAddress('00:1A:2B:3C:4D:5E')).toBe(true);
    });

    it('should accept dash-separated MAC', () => {
      expect(isValidMacAddress('00-1A-2B-3C-4D-5E')).toBe(true);
    });

    it('should accept lowercase MAC', () => {
      expect(isValidMacAddress('00:1a:2b:3c:4d:5e')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidMacAddress('')).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(isValidMacAddress('not-a-mac')).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(isValidMacAddress('00:1A:2B:3C:4D')).toBe(false);
    });

    it('should reject invalid hex characters', () => {
      expect(isValidMacAddress('00:1G:2B:3C:4D:5E')).toBe(false);
    });
  });

  describe('normalizeMacAddress', () => {
    it('should normalize colon-separated MAC', () => {
      expect(normalizeMacAddress('00:1a:2b:3c:4d:5e')).toBe('00:1A:2B:3C:4D:5E');
    });

    it('should convert dashes to colons', () => {
      expect(normalizeMacAddress('00-1A-2B-3C-4D-5E')).toBe('00:1A:2B:3C:4D:5E');
    });

    it('should handle raw hex', () => {
      expect(normalizeMacAddress('001a2b3c4d5e')).toBe('00:1A:2B:3C:4D:5E');
    });

    it('should return empty for empty input', () => {
      expect(normalizeMacAddress('')).toBe('');
    });
  });
});

// =============================================================================
// Tests: Virtual MAC Detection
// =============================================================================

describe('Virtual MAC Detection', () => {
  describe('isVirtualMacAddress', () => {
    it('should return false for physical MAC', () => {
      // Physical MAC (locally administered bit NOT set)
      expect(isVirtualMacAddress('00:1A:2B:3C:4D:5E')).toBe(false);
    });

    it('should return true for locally administered MAC', () => {
      // Locally administered (second bit of first byte is 1)
      // 02 = 00000010 - locally administered bit set
      expect(isVirtualMacAddress('02:00:00:00:00:00')).toBe(true);
    });

    it('should return true for empty MAC', () => {
      expect(isVirtualMacAddress('')).toBe(true);
    });
  });

  describe('isKnownVirtualVendor', () => {
    it('should detect VMware MAC', () => {
      expect(isKnownVirtualVendor('00:50:56:AB:CD:EF')).toBe(true);
      expect(isKnownVirtualVendor('00:0C:29:AB:CD:EF')).toBe(true);
    });

    it('should detect VirtualBox MAC', () => {
      expect(isKnownVirtualVendor('08:00:27:AB:CD:EF')).toBe(true);
    });

    it('should detect Hyper-V MAC', () => {
      expect(isKnownVirtualVendor('00:15:5D:AB:CD:EF')).toBe(true);
    });

    it('should return false for physical vendor', () => {
      expect(isKnownVirtualVendor('00:1A:2B:3C:4D:5E')).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Network Interface Filtering
// =============================================================================

describe('Network Interface Filtering', () => {
  describe('filterPhysicalInterfaces', () => {
    const mockInterfaces: NetworkInterface[] = [
      { name: 'lo', mac: '00:00:00:00:00:00', internal: true, family: 'IPv4', address: '127.0.0.1' },
      { name: 'eth0', mac: '00:1A:2B:3C:4D:5E', internal: false, family: 'IPv4', address: '192.168.1.100' },
      { name: 'wlan0', mac: '00:1A:2B:3C:4D:5F', internal: false, family: 'IPv4', address: '192.168.1.101' },
      { name: 'docker0', mac: '02:42:AC:11:00:01', internal: false, family: 'IPv4', address: '172.17.0.1' },
      { name: 'veth123', mac: '00:50:56:AB:CD:EF', internal: false, family: 'IPv4', address: '172.18.0.1' },
    ];

    it('should filter out internal interfaces', () => {
      const filtered = filterPhysicalInterfaces(mockInterfaces);
      expect(filtered.find(i => i.name === 'lo')).toBeUndefined();
    });

    it('should filter out zero MAC addresses', () => {
      const filtered = filterPhysicalInterfaces(mockInterfaces);
      expect(filtered.find(i => i.mac === '00:00:00:00:00:00')).toBeUndefined();
    });

    it('should filter out virtual/local MACs', () => {
      const filtered = filterPhysicalInterfaces(mockInterfaces);
      expect(filtered.find(i => i.name === 'docker0')).toBeUndefined();
    });

    it('should filter out known virtual vendor MACs', () => {
      const filtered = filterPhysicalInterfaces(mockInterfaces);
      expect(filtered.find(i => i.name === 'veth123')).toBeUndefined();
    });

    it('should keep physical interfaces', () => {
      const filtered = filterPhysicalInterfaces(mockInterfaces);
      expect(filtered.find(i => i.name === 'eth0')).toBeDefined();
      expect(filtered.find(i => i.name === 'wlan0')).toBeDefined();
    });
  });

  describe('getPrimaryMacAddress', () => {
    it('should prefer Ethernet over WiFi', () => {
      const interfaces: NetworkInterface[] = [
        { name: 'wlan0', mac: '00:1A:2B:3C:4D:5F', internal: false, family: 'IPv4', address: '192.168.1.101' },
        { name: 'eth0', mac: '00:1A:2B:3C:4D:5E', internal: false, family: 'IPv4', address: '192.168.1.100' },
      ];
      expect(getPrimaryMacAddress(interfaces)).toBe('00:1A:2B:3C:4D:5E');
    });

    it('should return null for empty interfaces', () => {
      expect(getPrimaryMacAddress([])).toBeNull();
    });

    it('should return null when only virtual interfaces exist', () => {
      const interfaces: NetworkInterface[] = [
        { name: 'docker0', mac: '02:42:AC:11:00:01', internal: false, family: 'IPv4', address: '172.17.0.1' },
      ];
      expect(getPrimaryMacAddress(interfaces)).toBeNull();
    });

    it('should return first physical interface if no Ethernet', () => {
      const interfaces: NetworkInterface[] = [
        { name: 'wlan0', mac: '00:1A:2B:3C:4D:5F', internal: false, family: 'IPv4', address: '192.168.1.101' },
      ];
      expect(getPrimaryMacAddress(interfaces)).toBe('00:1A:2B:3C:4D:5F');
    });
  });

  describe('getAllMacAddresses', () => {
    it('should return all physical MAC addresses', () => {
      const interfaces: NetworkInterface[] = [
        { name: 'eth0', mac: '00:1A:2B:3C:4D:5E', internal: false, family: 'IPv4', address: '192.168.1.100' },
        { name: 'wlan0', mac: '00:1A:2B:3C:4D:5F', internal: false, family: 'IPv4', address: '192.168.1.101' },
        { name: 'docker0', mac: '02:42:AC:11:00:01', internal: false, family: 'IPv4', address: '172.17.0.1' },
      ];
      const macs = getAllMacAddresses(interfaces);
      expect(macs).toHaveLength(2);
      expect(macs).toContain('00:1A:2B:3C:4D:5E');
      expect(macs).toContain('00:1A:2B:3C:4D:5F');
    });

    it('should return empty array when no physical interfaces', () => {
      const interfaces: NetworkInterface[] = [
        { name: 'lo', mac: '00:00:00:00:00:00', internal: true, family: 'IPv4', address: '127.0.0.1' },
      ];
      expect(getAllMacAddresses(interfaces)).toHaveLength(0);
    });
  });
});

// =============================================================================
// Tests: Serial Number Parsing
// =============================================================================

describe('Serial Number Parsing', () => {
  describe('parseWmicDiskSerial', () => {
    it('should parse standard WMIC output', () => {
      const output = `SerialNumber
WD-WX51A90N1234
`;
      expect(parseWmicDiskSerial(output)).toBe('WD-WX51A90N1234');
    });

    it('should handle multiple lines', () => {
      const output = `SerialNumber

WD-WX51A90N1234

`;
      expect(parseWmicDiskSerial(output)).toBe('WD-WX51A90N1234');
    });

    it('should return null for empty output', () => {
      expect(parseWmicDiskSerial('')).toBeNull();
    });

    it('should return null for header-only output', () => {
      const output = `SerialNumber

`;
      expect(parseWmicDiskSerial(output)).toBeNull();
    });
  });

  describe('parseWmicBiosSerial', () => {
    it('should parse valid serial', () => {
      const output = `SerialNumber
ABC123456789
`;
      expect(parseWmicBiosSerial(output)).toBe('ABC123456789');
    });

    it('should ignore placeholder values', () => {
      const output = `SerialNumber
To Be Filled By O.E.M.
`;
      expect(parseWmicBiosSerial(output)).toBeNull();
    });
  });

  describe('parseWmicBaseboardSerial', () => {
    it('should parse valid serial', () => {
      const output = `SerialNumber
123456789012
`;
      expect(parseWmicBaseboardSerial(output)).toBe('123456789012');
    });

    it('should ignore default string placeholder', () => {
      const output = `SerialNumber
Default string
`;
      expect(parseWmicBaseboardSerial(output)).toBeNull();
    });
  });
});

// =============================================================================
// Tests: Fallback Identifiers Management
// =============================================================================

describe('Fallback Identifiers Management', () => {
  describe('createFallbackIdentifiers', () => {
    it('should create fallback identifiers object', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        ['00:1A:2B:3C:4D:5E', '00:1A:2B:3C:4D:5F'],
        'WD-12345',
        'BIOS-12345',
        'MB-12345'
      );

      expect(fallback.primaryMac).toBe('00:1A:2B:3C:4D:5E');
      expect(fallback.allMacs).toHaveLength(2);
      expect(fallback.diskSerial).toBe('WD-12345');
      expect(fallback.biosSerial).toBe('BIOS-12345');
      expect(fallback.motherboardSerial).toBe('MB-12345');
    });

    it('should handle null values', () => {
      const fallback = createFallbackIdentifiers(null, [], null, null, null);
      expect(fallback.primaryMac).toBeNull();
      expect(fallback.allMacs).toHaveLength(0);
    });
  });

  describe('createEmptyFallbackIdentifiers', () => {
    it('should create empty fallback identifiers', () => {
      const fallback = createEmptyFallbackIdentifiers();
      expect(fallback.primaryMac).toBeNull();
      expect(fallback.allMacs).toHaveLength(0);
      expect(fallback.diskSerial).toBeNull();
      expect(fallback.biosSerial).toBeNull();
      expect(fallback.motherboardSerial).toBeNull();
    });
  });

  describe('hasMinimumFallbackIdentifiers', () => {
    it('should return true with primary MAC', () => {
      const fallback = createFallbackIdentifiers('00:1A:2B:3C:4D:5E', [], null, null, null);
      expect(hasMinimumFallbackIdentifiers(fallback)).toBe(true);
    });

    it('should return true with disk serial', () => {
      const fallback = createFallbackIdentifiers(null, [], 'WD-12345', null, null);
      expect(hasMinimumFallbackIdentifiers(fallback)).toBe(true);
    });

    it('should return false with no identifiers', () => {
      const fallback = createEmptyFallbackIdentifiers();
      expect(hasMinimumFallbackIdentifiers(fallback)).toBe(false);
    });
  });

  describe('validateFallbackIdentifiers', () => {
    it('should validate correct identifiers', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        ['00:1A:2B:3C:4D:5E'],
        'WD-12345',
        null,
        null
      );
      expect(validateFallbackIdentifiers(fallback)).toBe(true);
    });

    it('should reject invalid primary MAC', () => {
      const fallback = createFallbackIdentifiers(
        'invalid-mac',
        [],
        null,
        null,
        null
      );
      expect(validateFallbackIdentifiers(fallback)).toBe(false);
    });

    it('should reject invalid MAC in allMacs', () => {
      const fallback = createFallbackIdentifiers(
        null,
        ['00:1A:2B:3C:4D:5E', 'invalid-mac'],
        null,
        null,
        null
      );
      expect(validateFallbackIdentifiers(fallback)).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Identifier Strength Calculation
// =============================================================================

describe('Identifier Strength Calculation', () => {
  describe('getIdentifierStrengths', () => {
    it('should return all identifier strengths', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        [],
        'WD-12345',
        'BIOS-12345',
        null
      );
      const strengths = getIdentifierStrengths(true, true, fallback);

      expect(strengths).toHaveLength(5);
      expect(strengths.find(s => s.identifier === 'uuid')?.score).toBe(40);
      expect(strengths.find(s => s.identifier === 'machineId')?.score).toBe(35);
      expect(strengths.find(s => s.identifier === 'mac')?.score).toBe(25);
    });

    it('should return zero for unavailable identifiers', () => {
      const fallback = createEmptyFallbackIdentifiers();
      const strengths = getIdentifierStrengths(false, false, fallback);

      expect(strengths.every(s => s.score === 0)).toBe(true);
    });
  });

  describe('calculateTotalStrength', () => {
    it('should calculate total strength', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        [],
        'WD-12345',
        null,
        null
      );
      const strength = calculateTotalStrength(true, true, fallback);

      // UUID (40) + MachineId (35) + MAC (25) + Disk (20) = 120, capped at 100
      expect(strength).toBe(100);
    });

    it('should return 0 for no identifiers', () => {
      const fallback = createEmptyFallbackIdentifiers();
      const strength = calculateTotalStrength(false, false, fallback);
      expect(strength).toBe(0);
    });

    it('should cap at 100', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        [],
        'WD-12345',
        'BIOS-12345',
        'MB-12345'
      );
      const strength = calculateTotalStrength(true, true, fallback);
      expect(strength).toBeLessThanOrEqual(100);
    });
  });
});

// =============================================================================
// Tests: Best Identifier Selection
// =============================================================================

describe('Best Identifier Selection', () => {
  describe('getBestIdentifier', () => {
    it('should prefer UUID', () => {
      const fallback = createFallbackIdentifiers('00:1A:2B:3C:4D:5E', [], 'WD-12345', null, null);
      expect(getBestIdentifier('uuid-value', 'machine-id', fallback)).toBe('uuid-value');
    });

    it('should fallback to machine ID', () => {
      const fallback = createFallbackIdentifiers('00:1A:2B:3C:4D:5E', [], 'WD-12345', null, null);
      expect(getBestIdentifier(null, 'machine-id', fallback)).toBe('machine-id');
    });

    it('should fallback to MAC address', () => {
      const fallback = createFallbackIdentifiers('00:1A:2B:3C:4D:5E', [], 'WD-12345', null, null);
      expect(getBestIdentifier(null, null, fallback)).toBe('00:1A:2B:3C:4D:5E');
    });

    it('should fallback to disk serial', () => {
      const fallback = createFallbackIdentifiers(null, [], 'WD-12345', null, null);
      expect(getBestIdentifier(null, null, fallback)).toBe('WD-12345');
    });

    it('should return null when no identifiers available', () => {
      const fallback = createEmptyFallbackIdentifiers();
      expect(getBestIdentifier(null, null, fallback)).toBeNull();
    });
  });
});

// =============================================================================
// Tests: Fallback Component Generation
// =============================================================================

describe('Fallback Component Generation', () => {
  describe('generateFallbackComponent', () => {
    it('should generate component with MAC', () => {
      const fallback = createFallbackIdentifiers('00:1A:2B:3C:4D:5E', [], null, null, null);
      expect(generateFallbackComponent(fallback)).toBe('mac:00:1A:2B:3C:4D:5E');
    });

    it('should generate component with multiple identifiers', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        [],
        'WD-12345',
        'BIOS-12345',
        null
      );
      const component = generateFallbackComponent(fallback);
      expect(component).toContain('mac:00:1A:2B:3C:4D:5E');
      expect(component).toContain('disk:WD-12345');
      expect(component).toContain('bios:BIOS-12345');
    });

    it('should return empty string for no identifiers', () => {
      const fallback = createEmptyFallbackIdentifiers();
      expect(generateFallbackComponent(fallback)).toBe('');
    });
  });
});

// =============================================================================
// Tests: Enhanced Identifiers
// =============================================================================

describe('Enhanced Identifiers', () => {
  describe('mergeIdentifiers', () => {
    it('should merge primary and fallback identifiers', () => {
      const fallback = createFallbackIdentifiers(
        '00:1A:2B:3C:4D:5E',
        ['00:1A:2B:3C:4D:5E'],
        'WD-12345',
        null,
        null
      );

      const enhanced = mergeIdentifiers(
        'machine-123',
        'UUID-12345',
        'DESKTOP-PC',
        'win32',
        'Intel Core i7',
        8,
        16000000000,
        fallback
      );

      expect(enhanced.machineId).toBe('machine-123');
      expect(enhanced.systemUuid).toBe('UUID-12345');
      expect(enhanced.fallback.primaryMac).toBe('00:1A:2B:3C:4D:5E');
      expect(enhanced.fallback.diskSerial).toBe('WD-12345');
    });
  });
});
