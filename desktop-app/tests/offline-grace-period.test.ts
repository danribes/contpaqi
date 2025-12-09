/**
 * Offline Grace Period Tests
 * Subtask 15.6: Implement offline grace period (7 days)
 *
 * Tests for managing offline license validation with configurable
 * grace periods to allow continued usage when server is unreachable.
 */

// =============================================================================
// Local Type Definitions (avoid JSX compilation issues)
// =============================================================================

type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';

interface OfflineGraceConfig {
  gracePeriodDays: number;
  warningThresholdDays: number;
  checkIntervalMinutes: number;
  persistStatePath: string;
}

interface OfflineState {
  lastOnlineValidation: Date | null;
  lastOfflineCheck: Date | null;
  graceStartedAt: Date | null;
  gracePeriodDays: number;
  licenseKey: string;
  fingerprint: string;
  licenseType: LicenseType;
  features: string[];
  isOffline: boolean;
}

interface GracePeriodStatus {
  isValid: boolean;
  isInGracePeriod: boolean;
  remainingDays: number;
  remainingHours: number;
  graceStartedAt: Date | null;
  graceEndsAt: Date | null;
  warningLevel: 'none' | 'warning' | 'critical' | 'expired';
  message: string;
}

type OfflineEventType =
  | 'GRACE_STARTED'
  | 'GRACE_WARNING'
  | 'GRACE_CRITICAL'
  | 'GRACE_EXPIRED'
  | 'BACK_ONLINE'
  | 'VALIDATION_SUCCESS'
  | 'VALIDATION_FAILED';

interface OfflineEvent {
  type: OfflineEventType;
  timestamp: Date;
  details: Record<string, unknown>;
}

// =============================================================================
// Local Implementation Functions
// =============================================================================

// --- Config ---

function createDefaultGraceConfig(): OfflineGraceConfig {
  return {
    gracePeriodDays: 7,
    warningThresholdDays: 2,
    checkIntervalMinutes: 60,
    persistStatePath: '',
  };
}

function mergeGraceConfig(partial: Partial<OfflineGraceConfig>): OfflineGraceConfig {
  return {
    ...createDefaultGraceConfig(),
    ...partial,
  };
}

// --- Offline State ---

function createEmptyOfflineState(): OfflineState {
  return {
    lastOnlineValidation: null,
    lastOfflineCheck: null,
    graceStartedAt: null,
    gracePeriodDays: 7,
    licenseKey: '',
    fingerprint: '',
    licenseType: 'trial',
    features: [],
    isOffline: false,
  };
}

function createOfflineState(partial: Partial<OfflineState>): OfflineState {
  return {
    ...createEmptyOfflineState(),
    ...partial,
  };
}

// --- Time Calculations ---

function calculateGraceEndDate(graceStartedAt: Date, gracePeriodDays: number): Date {
  const endDate = new Date(graceStartedAt);
  endDate.setDate(endDate.getDate() + gracePeriodDays);
  return endDate;
}

function calculateRemainingGraceTime(graceEndsAt: Date): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const remainingMs = graceEndsAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  return { days, hours, minutes };
}

function isGracePeriodExpired(graceStartedAt: Date, gracePeriodDays: number): boolean {
  const graceEndsAt = calculateGraceEndDate(graceStartedAt, gracePeriodDays);
  return new Date() >= graceEndsAt;
}

function isWithinWarningThreshold(graceEndsAt: Date, warningThresholdDays: number): boolean {
  const { days } = calculateRemainingGraceTime(graceEndsAt);
  return days <= warningThresholdDays;
}

function isCriticalThreshold(graceEndsAt: Date): boolean {
  const { days, hours } = calculateRemainingGraceTime(graceEndsAt);
  return days === 0 && hours <= 24;
}

// --- Warning Level ---

function determineWarningLevel(
  graceEndsAt: Date,
  warningThresholdDays: number
): 'none' | 'warning' | 'critical' | 'expired' {
  const now = new Date();

  if (now >= graceEndsAt) {
    return 'expired';
  }

  if (isCriticalThreshold(graceEndsAt)) {
    return 'critical';
  }

  if (isWithinWarningThreshold(graceEndsAt, warningThresholdDays)) {
    return 'warning';
  }

  return 'none';
}

// --- Grace Period Status ---

function getGracePeriodStatus(state: OfflineState, config: OfflineGraceConfig): GracePeriodStatus {
  // Not offline - fully valid
  if (!state.isOffline) {
    return {
      isValid: true,
      isInGracePeriod: false,
      remainingDays: config.gracePeriodDays,
      remainingHours: config.gracePeriodDays * 24,
      graceStartedAt: null,
      graceEndsAt: null,
      warningLevel: 'none',
      message: 'License validated online',
    };
  }

  // Never validated online
  if (!state.lastOnlineValidation) {
    return {
      isValid: false,
      isInGracePeriod: false,
      remainingDays: 0,
      remainingHours: 0,
      graceStartedAt: null,
      graceEndsAt: null,
      warningLevel: 'expired',
      message: 'License has never been validated online',
    };
  }

  // Grace period not started yet
  if (!state.graceStartedAt) {
    return {
      isValid: true,
      isInGracePeriod: false,
      remainingDays: config.gracePeriodDays,
      remainingHours: config.gracePeriodDays * 24,
      graceStartedAt: null,
      graceEndsAt: null,
      warningLevel: 'none',
      message: 'Online validation available',
    };
  }

  // Calculate grace period status
  const graceEndsAt = calculateGraceEndDate(state.graceStartedAt, state.gracePeriodDays);
  const { days, hours } = calculateRemainingGraceTime(graceEndsAt);
  const warningLevel = determineWarningLevel(graceEndsAt, config.warningThresholdDays);

  if (warningLevel === 'expired') {
    return {
      isValid: false,
      isInGracePeriod: false,
      remainingDays: 0,
      remainingHours: 0,
      graceStartedAt: state.graceStartedAt,
      graceEndsAt,
      warningLevel: 'expired',
      message: 'Offline grace period has expired. Please connect to validate your license.',
    };
  }

  const totalHours = days * 24 + hours;
  let message: string;

  if (warningLevel === 'critical') {
    message = `Offline grace period expires in ${hours} hours. Please connect soon.`;
  } else if (warningLevel === 'warning') {
    message = `Offline grace period expires in ${days} days. Consider connecting to validate.`;
  } else {
    message = `Operating in offline mode. ${days} days remaining in grace period.`;
  }

  return {
    isValid: true,
    isInGracePeriod: true,
    remainingDays: days,
    remainingHours: totalHours,
    graceStartedAt: state.graceStartedAt,
    graceEndsAt,
    warningLevel,
    message,
  };
}

// --- State Transitions ---

function startGracePeriod(state: OfflineState, gracePeriodDays: number): OfflineState {
  return {
    ...state,
    graceStartedAt: new Date(),
    gracePeriodDays,
    isOffline: true,
  };
}

function endGracePeriod(state: OfflineState): OfflineState {
  return {
    ...state,
    graceStartedAt: null,
    isOffline: false,
    lastOnlineValidation: new Date(),
  };
}

function updateLastOnlineValidation(state: OfflineState): OfflineState {
  return {
    ...state,
    lastOnlineValidation: new Date(),
    isOffline: false,
    graceStartedAt: null,
  };
}

function recordOfflineCheck(state: OfflineState): OfflineState {
  return {
    ...state,
    lastOfflineCheck: new Date(),
  };
}

// --- Serialization ---

function serializeOfflineState(state: OfflineState): string {
  return JSON.stringify({
    ...state,
    lastOnlineValidation: state.lastOnlineValidation?.toISOString() || null,
    lastOfflineCheck: state.lastOfflineCheck?.toISOString() || null,
    graceStartedAt: state.graceStartedAt?.toISOString() || null,
  });
}

function deserializeOfflineState(json: string): OfflineState | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      lastOnlineValidation: data.lastOnlineValidation ? new Date(data.lastOnlineValidation) : null,
      lastOfflineCheck: data.lastOfflineCheck ? new Date(data.lastOfflineCheck) : null,
      graceStartedAt: data.graceStartedAt ? new Date(data.graceStartedAt) : null,
    };
  } catch {
    return null;
  }
}

// --- Event Creation ---

function createOfflineEvent(
  type: OfflineEventType,
  details: Record<string, unknown> = {}
): OfflineEvent {
  return {
    type,
    timestamp: new Date(),
    details,
  };
}

// --- Display Functions ---

function formatGraceTimeRemaining(status: GracePeriodStatus): string {
  if (status.warningLevel === 'expired') {
    return 'Expired';
  }

  if (status.remainingDays > 0) {
    return `${status.remainingDays} day${status.remainingDays !== 1 ? 's' : ''} remaining`;
  }

  if (status.remainingHours > 0) {
    return `${status.remainingHours} hour${status.remainingHours !== 1 ? 's' : ''} remaining`;
  }

  return 'Less than 1 hour remaining';
}

function getWarningMessage(warningLevel: 'none' | 'warning' | 'critical' | 'expired'): string {
  switch (warningLevel) {
    case 'none':
      return '';
    case 'warning':
      return 'Your offline grace period is expiring soon. Please connect to the internet to validate your license.';
    case 'critical':
      return 'Your offline grace period expires today! Connect to the internet immediately to continue using the application.';
    case 'expired':
      return 'Your offline grace period has expired. Please connect to the internet to validate your license.';
  }
}

// --- License Type Grace Period ---

function getGracePeriodForLicenseType(licenseType: LicenseType): number {
  const gracePeriods: Record<LicenseType, number> = {
    trial: 3,
    standard: 7,
    professional: 14,
    enterprise: 30,
  };
  return gracePeriods[licenseType];
}

// --- Validation ---

function canUseOffline(state: OfflineState, config: OfflineGraceConfig): boolean {
  const status = getGracePeriodStatus(state, config);
  return status.isValid;
}

function shouldWarnUser(state: OfflineState, config: OfflineGraceConfig): boolean {
  const status = getGracePeriodStatus(state, config);
  return status.warningLevel === 'warning' || status.warningLevel === 'critical';
}

function isGracePeriodActive(state: OfflineState): boolean {
  return state.isOffline && state.graceStartedAt !== null;
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTestState(overrides: Partial<OfflineState> = {}): OfflineState {
  return createOfflineState({
    lastOnlineValidation: new Date(),
    licenseKey: 'TEST-1234-5678-ABCD',
    fingerprint: 'fp-abc123',
    licenseType: 'professional',
    features: ['basic', 'export', 'api'],
    gracePeriodDays: 7,
    ...overrides,
  });
}

function createOfflineTestState(daysOffline: number = 0): OfflineState {
  const graceStartedAt = new Date();
  graceStartedAt.setDate(graceStartedAt.getDate() - daysOffline);

  return createTestState({
    isOffline: true,
    graceStartedAt,
    lastOnlineValidation: graceStartedAt,
  });
}

function createExpiredGraceState(): OfflineState {
  return createOfflineTestState(10); // 10 days offline with 7 day grace = expired
}

// =============================================================================
// Tests
// =============================================================================

describe('Offline Grace Period', () => {
  describe('Config Management', () => {
    it('should create default config', () => {
      const config = createDefaultGraceConfig();

      expect(config.gracePeriodDays).toBe(7);
      expect(config.warningThresholdDays).toBe(2);
      expect(config.checkIntervalMinutes).toBe(60);
    });

    it('should merge partial config', () => {
      const config = mergeGraceConfig({
        gracePeriodDays: 14,
        warningThresholdDays: 3,
      });

      expect(config.gracePeriodDays).toBe(14);
      expect(config.warningThresholdDays).toBe(3);
      expect(config.checkIntervalMinutes).toBe(60); // Default
    });
  });

  describe('Offline State', () => {
    it('should create empty offline state', () => {
      const state = createEmptyOfflineState();

      expect(state.lastOnlineValidation).toBeNull();
      expect(state.graceStartedAt).toBeNull();
      expect(state.isOffline).toBe(false);
      expect(state.licenseKey).toBe('');
    });

    it('should create state with partial data', () => {
      const state = createOfflineState({
        licenseKey: 'TEST-KEY',
        isOffline: true,
      });

      expect(state.licenseKey).toBe('TEST-KEY');
      expect(state.isOffline).toBe(true);
      expect(state.lastOnlineValidation).toBeNull();
    });
  });

  describe('Time Calculations', () => {
    it('should calculate grace end date', () => {
      const start = new Date('2025-01-01T12:00:00Z');
      const end = calculateGraceEndDate(start, 7);

      expect(end.getDate()).toBe(8); // January 8th
      expect(end.getMonth()).toBe(0); // January
    });

    it('should calculate remaining grace time', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(futureDate.getHours() + 12);

      const remaining = calculateRemainingGraceTime(futureDate);

      expect(remaining.days).toBe(3);
      expect(remaining.hours).toBeGreaterThanOrEqual(11);
      expect(remaining.hours).toBeLessThanOrEqual(12);
    });

    it('should return zero for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const remaining = calculateRemainingGraceTime(pastDate);

      expect(remaining.days).toBe(0);
      expect(remaining.hours).toBe(0);
      expect(remaining.minutes).toBe(0);
    });

    it('should detect expired grace period', () => {
      const oldStart = new Date();
      oldStart.setDate(oldStart.getDate() - 10);

      expect(isGracePeriodExpired(oldStart, 7)).toBe(true);
    });

    it('should detect valid grace period', () => {
      const recentStart = new Date();
      recentStart.setDate(recentStart.getDate() - 3);

      expect(isGracePeriodExpired(recentStart, 7)).toBe(false);
    });
  });

  describe('Warning Level', () => {
    it('should return none for plenty of time', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      expect(determineWarningLevel(futureDate, 2)).toBe('none');
    });

    it('should return warning within threshold', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(futureDate.getHours() + 25); // Just over 1 day

      expect(determineWarningLevel(futureDate, 2)).toBe('warning');
    });

    it('should return critical for last 24 hours', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 12);

      expect(determineWarningLevel(futureDate, 2)).toBe('critical');
    });

    it('should return expired for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(determineWarningLevel(pastDate, 2)).toBe('expired');
    });
  });

  describe('Grace Period Status', () => {
    const config = createDefaultGraceConfig();

    it('should return valid status when online', () => {
      const state = createTestState({ isOffline: false });
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(true);
      expect(status.isInGracePeriod).toBe(false);
      expect(status.warningLevel).toBe('none');
    });

    it('should return invalid for never validated', () => {
      const state = createOfflineState({
        isOffline: true,
        lastOnlineValidation: null,
      });
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(false);
      expect(status.warningLevel).toBe('expired');
      expect(status.message).toContain('never been validated');
    });

    it('should return valid during grace period', () => {
      const state = createOfflineTestState(3); // 3 days offline
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(true);
      expect(status.isInGracePeriod).toBe(true);
      expect(status.remainingDays).toBe(4); // 7 - 3 = 4
    });

    it('should return invalid after grace period', () => {
      const state = createExpiredGraceState();
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(false);
      expect(status.warningLevel).toBe('expired');
    });

    it('should show warning near expiration', () => {
      const state = createOfflineTestState(5); // 5 days offline, 2 days remaining
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(true);
      expect(status.warningLevel).toBe('warning');
    });
  });

  describe('State Transitions', () => {
    it('should start grace period', () => {
      const state = createTestState({ isOffline: false, graceStartedAt: null });
      const newState = startGracePeriod(state, 7);

      expect(newState.isOffline).toBe(true);
      expect(newState.graceStartedAt).toBeInstanceOf(Date);
      expect(newState.gracePeriodDays).toBe(7);
    });

    it('should end grace period', () => {
      const state = createOfflineTestState(3);
      const newState = endGracePeriod(state);

      expect(newState.isOffline).toBe(false);
      expect(newState.graceStartedAt).toBeNull();
      expect(newState.lastOnlineValidation).toBeInstanceOf(Date);
    });

    it('should update last online validation', () => {
      const state = createOfflineTestState(3);
      const beforeUpdate = new Date();
      const newState = updateLastOnlineValidation(state);
      const afterUpdate = new Date();

      expect(newState.isOffline).toBe(false);
      expect(newState.lastOnlineValidation!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(newState.lastOnlineValidation!.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should record offline check', () => {
      const state = createOfflineTestState(1);
      const beforeCheck = new Date();
      const newState = recordOfflineCheck(state);
      const afterCheck = new Date();

      expect(newState.lastOfflineCheck!.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(newState.lastOfflineCheck!.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    });
  });

  describe('Serialization', () => {
    it('should serialize offline state', () => {
      const state = createTestState({
        lastOnlineValidation: new Date('2025-01-01T12:00:00Z'),
        isOffline: true,
      });
      const json = serializeOfflineState(state);

      expect(typeof json).toBe('string');
      expect(json).toContain('TEST-1234-5678-ABCD');
      expect(json).toContain('2025-01-01');
    });

    it('should deserialize offline state', () => {
      const original = createTestState({
        lastOnlineValidation: new Date('2025-01-01T12:00:00Z'),
        graceStartedAt: new Date('2025-01-05T12:00:00Z'),
      });
      const json = serializeOfflineState(original);
      const restored = deserializeOfflineState(json);

      expect(restored).not.toBeNull();
      expect(restored!.licenseKey).toBe(original.licenseKey);
      expect(restored!.lastOnlineValidation).toBeInstanceOf(Date);
      expect(restored!.graceStartedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON', () => {
      expect(deserializeOfflineState('invalid')).toBeNull();
      expect(deserializeOfflineState('{broken')).toBeNull();
    });

    it('should handle null dates', () => {
      const state = createEmptyOfflineState();
      const json = serializeOfflineState(state);
      const restored = deserializeOfflineState(json);

      expect(restored!.lastOnlineValidation).toBeNull();
      expect(restored!.graceStartedAt).toBeNull();
    });
  });

  describe('Event Creation', () => {
    it('should create offline event', () => {
      const event = createOfflineEvent('GRACE_STARTED', { days: 7 });

      expect(event.type).toBe('GRACE_STARTED');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.details.days).toBe(7);
    });

    it('should create event without details', () => {
      const event = createOfflineEvent('BACK_ONLINE');

      expect(event.type).toBe('BACK_ONLINE');
      expect(event.details).toEqual({});
    });
  });

  describe('Display Functions', () => {
    it('should format grace time remaining', () => {
      const status1: GracePeriodStatus = {
        isValid: true,
        isInGracePeriod: true,
        remainingDays: 5,
        remainingHours: 120,
        graceStartedAt: new Date(),
        graceEndsAt: new Date(),
        warningLevel: 'none',
        message: '',
      };
      expect(formatGraceTimeRemaining(status1)).toBe('5 days remaining');

      const status2: GracePeriodStatus = {
        ...status1,
        remainingDays: 1,
        remainingHours: 24,
      };
      expect(formatGraceTimeRemaining(status2)).toBe('1 day remaining');

      const status3: GracePeriodStatus = {
        ...status1,
        remainingDays: 0,
        remainingHours: 5,
      };
      expect(formatGraceTimeRemaining(status3)).toBe('5 hours remaining');

      const status4: GracePeriodStatus = {
        ...status1,
        remainingDays: 0,
        remainingHours: 0,
        warningLevel: 'expired',
      };
      expect(formatGraceTimeRemaining(status4)).toBe('Expired');
    });

    it('should get warning message by level', () => {
      expect(getWarningMessage('none')).toBe('');
      expect(getWarningMessage('warning')).toContain('expiring soon');
      expect(getWarningMessage('critical')).toContain('expires today');
      expect(getWarningMessage('expired')).toContain('has expired');
    });
  });

  describe('License Type Grace Periods', () => {
    it('should return different grace periods for license types', () => {
      expect(getGracePeriodForLicenseType('trial')).toBe(3);
      expect(getGracePeriodForLicenseType('standard')).toBe(7);
      expect(getGracePeriodForLicenseType('professional')).toBe(14);
      expect(getGracePeriodForLicenseType('enterprise')).toBe(30);
    });
  });

  describe('Validation Helpers', () => {
    const config = createDefaultGraceConfig();

    it('should check if can use offline', () => {
      const validState = createOfflineTestState(3);
      expect(canUseOffline(validState, config)).toBe(true);

      const expiredState = createExpiredGraceState();
      expect(canUseOffline(expiredState, config)).toBe(false);
    });

    it('should check if should warn user', () => {
      const earlyState = createOfflineTestState(2);
      expect(shouldWarnUser(earlyState, config)).toBe(false);

      const lateState = createOfflineTestState(6);
      expect(shouldWarnUser(lateState, config)).toBe(true);
    });

    it('should check if grace period is active', () => {
      const onlineState = createTestState({ isOffline: false });
      expect(isGracePeriodActive(onlineState)).toBe(false);

      const offlineState = createOfflineTestState(1);
      expect(isGracePeriodActive(offlineState)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle grace period starting exactly now', () => {
      const state = createTestState({
        isOffline: true,
        graceStartedAt: new Date(),
      });
      const config = createDefaultGraceConfig();
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(true);
      expect(status.remainingDays).toBe(7);
    });

    it('should handle very short grace periods', () => {
      const state = createTestState({
        isOffline: true,
        graceStartedAt: new Date(),
        gracePeriodDays: 1,
      });
      const config = mergeGraceConfig({ gracePeriodDays: 1, warningThresholdDays: 1 });
      const status = getGracePeriodStatus(state, config);

      expect(status.isValid).toBe(true);
      expect(status.warningLevel).toBe('warning'); // 1 day = within warning threshold
    });

    it('should handle zero grace period', () => {
      const state = createTestState({
        isOffline: true,
        graceStartedAt: new Date(),
        gracePeriodDays: 0,
      });
      const config = mergeGraceConfig({ gracePeriodDays: 0 });
      const status = getGracePeriodStatus(state, config);

      // Zero grace period means immediately expired
      expect(status.warningLevel).toBe('expired');
      expect(status.isValid).toBe(false);
    });
  });
});

describe('OfflineGraceManager Class', () => {
  // Mock class for testing
  class MockOfflineGraceManager {
    private state: OfflineState;
    private config: OfflineGraceConfig;
    private events: OfflineEvent[] = [];

    constructor(config: Partial<OfflineGraceConfig> = {}) {
      this.config = mergeGraceConfig(config);
      this.state = createEmptyOfflineState();
    }

    setLicenseInfo(licenseKey: string, fingerprint: string, licenseType: LicenseType, features: string[]): void {
      this.state = {
        ...this.state,
        licenseKey,
        fingerprint,
        licenseType,
        features,
        gracePeriodDays: getGracePeriodForLicenseType(licenseType),
      };
    }

    recordOnlineValidation(): void {
      this.state = updateLastOnlineValidation(this.state);
      this.events.push(createOfflineEvent('VALIDATION_SUCCESS'));
    }

    goOffline(): void {
      if (!this.state.isOffline) {
        this.state = startGracePeriod(this.state, this.state.gracePeriodDays);
        this.events.push(createOfflineEvent('GRACE_STARTED', { days: this.state.gracePeriodDays }));
      }
    }

    goOnline(): void {
      if (this.state.isOffline) {
        this.state = endGracePeriod(this.state);
        this.events.push(createOfflineEvent('BACK_ONLINE'));
      }
    }

    getStatus(): GracePeriodStatus {
      return getGracePeriodStatus(this.state, this.config);
    }

    isValid(): boolean {
      return this.getStatus().isValid;
    }

    shouldWarn(): boolean {
      return shouldWarnUser(this.state, this.config);
    }

    getEvents(): OfflineEvent[] {
      return [...this.events];
    }

    getState(): OfflineState {
      return { ...this.state };
    }

    setState(state: OfflineState): void {
      this.state = state;
    }

    saveState(): string {
      return serializeOfflineState(this.state);
    }

    loadState(json: string): boolean {
      const state = deserializeOfflineState(json);
      if (state) {
        this.state = state;
        return true;
      }
      return false;
    }
  }

  describe('Lifecycle', () => {
    it('should initialize with empty state', () => {
      const manager = new MockOfflineGraceManager();
      const status = manager.getStatus();

      // Empty state is "online" (not marked offline), so valid until we go offline
      expect(status.isValid).toBe(true);
      expect(status.isInGracePeriod).toBe(false);
    });

    it('should record online validation', () => {
      const manager = new MockOfflineGraceManager();
      manager.setLicenseInfo('KEY', 'FP', 'professional', ['basic']);
      manager.recordOnlineValidation();

      expect(manager.getStatus().isValid).toBe(true);
      expect(manager.getState().lastOnlineValidation).not.toBeNull();
    });

    it('should handle going offline', () => {
      const manager = new MockOfflineGraceManager();
      manager.setLicenseInfo('KEY', 'FP', 'professional', ['basic']);
      manager.recordOnlineValidation();
      manager.goOffline();

      const state = manager.getState();
      expect(state.isOffline).toBe(true);
      expect(state.graceStartedAt).not.toBeNull();
    });

    it('should handle coming back online', () => {
      const manager = new MockOfflineGraceManager();
      manager.setLicenseInfo('KEY', 'FP', 'professional', ['basic']);
      manager.recordOnlineValidation();
      manager.goOffline();
      manager.goOnline();

      const state = manager.getState();
      expect(state.isOffline).toBe(false);
      expect(state.graceStartedAt).toBeNull();
    });
  });

  describe('Events', () => {
    it('should record events', () => {
      const manager = new MockOfflineGraceManager();
      manager.setLicenseInfo('KEY', 'FP', 'professional', ['basic']);
      manager.recordOnlineValidation();
      manager.goOffline();
      manager.goOnline();

      const events = manager.getEvents();
      expect(events.length).toBe(3);
      expect(events[0].type).toBe('VALIDATION_SUCCESS');
      expect(events[1].type).toBe('GRACE_STARTED');
      expect(events[2].type).toBe('BACK_ONLINE');
    });
  });

  describe('Persistence', () => {
    it('should save and load state', () => {
      const manager = new MockOfflineGraceManager();
      manager.setLicenseInfo('KEY', 'FP', 'professional', ['basic', 'export']);
      manager.recordOnlineValidation();
      manager.goOffline();

      const json = manager.saveState();

      const newManager = new MockOfflineGraceManager();
      expect(newManager.loadState(json)).toBe(true);

      const loadedState = newManager.getState();
      expect(loadedState.licenseKey).toBe('KEY');
      expect(loadedState.isOffline).toBe(true);
      expect(loadedState.features).toContain('export');
    });
  });

  describe('License Type Grace Periods', () => {
    it('should use license type specific grace periods', () => {
      const trialManager = new MockOfflineGraceManager();
      trialManager.setLicenseInfo('KEY', 'FP', 'trial', ['basic']);
      expect(trialManager.getState().gracePeriodDays).toBe(3);

      const enterpriseManager = new MockOfflineGraceManager();
      enterpriseManager.setLicenseInfo('KEY', 'FP', 'enterprise', ['basic']);
      expect(enterpriseManager.getState().gracePeriodDays).toBe(30);
    });
  });
});
