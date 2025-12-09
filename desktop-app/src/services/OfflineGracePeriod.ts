/**
 * Offline Grace Period Service
 * Subtask 15.6: Implement offline grace period (7 days)
 *
 * Manages offline license validation with configurable grace periods
 * to allow continued usage when server is unreachable.
 */

import { LicenseType } from './LicensingServer';

// =============================================================================
// Types
// =============================================================================

export interface OfflineGraceConfig {
  gracePeriodDays: number;
  warningThresholdDays: number;
  checkIntervalMinutes: number;
  persistStatePath: string;
}

export interface OfflineState {
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

export interface GracePeriodStatus {
  isValid: boolean;
  isInGracePeriod: boolean;
  remainingDays: number;
  remainingHours: number;
  graceStartedAt: Date | null;
  graceEndsAt: Date | null;
  warningLevel: 'none' | 'warning' | 'critical' | 'expired';
  message: string;
}

export type OfflineEventType =
  | 'GRACE_STARTED'
  | 'GRACE_WARNING'
  | 'GRACE_CRITICAL'
  | 'GRACE_EXPIRED'
  | 'BACK_ONLINE'
  | 'VALIDATION_SUCCESS'
  | 'VALIDATION_FAILED';

export interface OfflineEvent {
  type: OfflineEventType;
  timestamp: Date;
  details: Record<string, unknown>;
}

export type OfflineEventHandler = (event: OfflineEvent) => void;

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_GRACE_CONFIG: OfflineGraceConfig = {
  gracePeriodDays: 7,
  warningThresholdDays: 2,
  checkIntervalMinutes: 60,
  persistStatePath: '',
};

const LICENSE_TYPE_GRACE_PERIODS: Record<LicenseType, number> = {
  trial: 3,
  standard: 7,
  professional: 14,
  enterprise: 30,
};

const WARNING_MESSAGES: Record<'none' | 'warning' | 'critical' | 'expired', string> = {
  none: '',
  warning: 'Your offline grace period is expiring soon. Please connect to the internet to validate your license.',
  critical: 'Your offline grace period expires today! Connect to the internet immediately to continue using the application.',
  expired: 'Your offline grace period has expired. Please connect to the internet to validate your license.',
};

// =============================================================================
// Config Functions
// =============================================================================

/**
 * Create default grace config
 */
export function createDefaultGraceConfig(): OfflineGraceConfig {
  return { ...DEFAULT_GRACE_CONFIG };
}

/**
 * Merge partial config with defaults
 */
export function mergeGraceConfig(partial: Partial<OfflineGraceConfig>): OfflineGraceConfig {
  return {
    ...DEFAULT_GRACE_CONFIG,
    ...partial,
  };
}

// =============================================================================
// Offline State Functions
// =============================================================================

/**
 * Create empty offline state
 */
export function createEmptyOfflineState(): OfflineState {
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

/**
 * Create offline state with partial data
 */
export function createOfflineState(partial: Partial<OfflineState>): OfflineState {
  return {
    ...createEmptyOfflineState(),
    ...partial,
  };
}

// =============================================================================
// Time Calculation Functions
// =============================================================================

/**
 * Calculate when grace period ends
 */
export function calculateGraceEndDate(graceStartedAt: Date, gracePeriodDays: number): Date {
  const endDate = new Date(graceStartedAt);
  endDate.setDate(endDate.getDate() + gracePeriodDays);
  return endDate;
}

/**
 * Calculate remaining grace time
 */
export function calculateRemainingGraceTime(graceEndsAt: Date): {
  days: number;
  hours: number;
  minutes: number;
} {
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

/**
 * Check if grace period is expired
 */
export function isGracePeriodExpired(graceStartedAt: Date, gracePeriodDays: number): boolean {
  const graceEndsAt = calculateGraceEndDate(graceStartedAt, gracePeriodDays);
  return new Date() >= graceEndsAt;
}

/**
 * Check if within warning threshold
 */
export function isWithinWarningThreshold(graceEndsAt: Date, warningThresholdDays: number): boolean {
  const { days } = calculateRemainingGraceTime(graceEndsAt);
  return days <= warningThresholdDays;
}

/**
 * Check if in critical threshold (last 24 hours)
 */
export function isCriticalThreshold(graceEndsAt: Date): boolean {
  const { days, hours } = calculateRemainingGraceTime(graceEndsAt);
  return days === 0 && hours <= 24;
}

// =============================================================================
// Warning Level Functions
// =============================================================================

/**
 * Determine warning level based on remaining time
 */
export function determineWarningLevel(
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

// =============================================================================
// Grace Period Status Functions
// =============================================================================

/**
 * Get comprehensive grace period status
 */
export function getGracePeriodStatus(
  state: OfflineState,
  config: OfflineGraceConfig
): GracePeriodStatus {
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

// =============================================================================
// State Transition Functions
// =============================================================================

/**
 * Start grace period
 */
export function startGracePeriod(state: OfflineState, gracePeriodDays: number): OfflineState {
  return {
    ...state,
    graceStartedAt: new Date(),
    gracePeriodDays,
    isOffline: true,
  };
}

/**
 * End grace period (back online)
 */
export function endGracePeriod(state: OfflineState): OfflineState {
  return {
    ...state,
    graceStartedAt: null,
    isOffline: false,
    lastOnlineValidation: new Date(),
  };
}

/**
 * Update last online validation timestamp
 */
export function updateLastOnlineValidation(state: OfflineState): OfflineState {
  return {
    ...state,
    lastOnlineValidation: new Date(),
    isOffline: false,
    graceStartedAt: null,
  };
}

/**
 * Record offline check timestamp
 */
export function recordOfflineCheck(state: OfflineState): OfflineState {
  return {
    ...state,
    lastOfflineCheck: new Date(),
  };
}

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize offline state for storage
 */
export function serializeOfflineState(state: OfflineState): string {
  return JSON.stringify({
    ...state,
    lastOnlineValidation: state.lastOnlineValidation?.toISOString() || null,
    lastOfflineCheck: state.lastOfflineCheck?.toISOString() || null,
    graceStartedAt: state.graceStartedAt?.toISOString() || null,
  });
}

/**
 * Deserialize offline state from storage
 */
export function deserializeOfflineState(json: string): OfflineState | null {
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

// =============================================================================
// Event Functions
// =============================================================================

/**
 * Create offline event
 */
export function createOfflineEvent(
  type: OfflineEventType,
  details: Record<string, unknown> = {}
): OfflineEvent {
  return {
    type,
    timestamp: new Date(),
    details,
  };
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Format grace time remaining for display
 */
export function formatGraceTimeRemaining(status: GracePeriodStatus): string {
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

/**
 * Get warning message for warning level
 */
export function getWarningMessage(warningLevel: 'none' | 'warning' | 'critical' | 'expired'): string {
  return WARNING_MESSAGES[warningLevel];
}

// =============================================================================
// License Type Functions
// =============================================================================

/**
 * Get grace period days for license type
 */
export function getGracePeriodForLicenseType(licenseType: LicenseType): number {
  return LICENSE_TYPE_GRACE_PERIODS[licenseType];
}

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Check if can use application offline
 */
export function canUseOffline(state: OfflineState, config: OfflineGraceConfig): boolean {
  const status = getGracePeriodStatus(state, config);
  return status.isValid;
}

/**
 * Check if should show warning to user
 */
export function shouldWarnUser(state: OfflineState, config: OfflineGraceConfig): boolean {
  const status = getGracePeriodStatus(state, config);
  return status.warningLevel === 'warning' || status.warningLevel === 'critical';
}

/**
 * Check if grace period is currently active
 */
export function isGracePeriodActive(state: OfflineState): boolean {
  return state.isOffline && state.graceStartedAt !== null;
}

// =============================================================================
// Offline Grace Manager Class
// =============================================================================

/**
 * Offline Grace Period Manager
 * Manages the full lifecycle of offline grace periods
 */
export class OfflineGraceManager {
  private state: OfflineState;
  private config: OfflineGraceConfig;
  private events: OfflineEvent[] = [];
  private eventHandlers: OfflineEventHandler[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<OfflineGraceConfig> = {}) {
    this.config = mergeGraceConfig(config);
    this.state = createEmptyOfflineState();
  }

  /**
   * Set license information
   */
  setLicenseInfo(
    licenseKey: string,
    fingerprint: string,
    licenseType: LicenseType,
    features: string[]
  ): void {
    this.state = {
      ...this.state,
      licenseKey,
      fingerprint,
      licenseType,
      features,
      gracePeriodDays: getGracePeriodForLicenseType(licenseType),
    };
  }

  /**
   * Record successful online validation
   */
  recordOnlineValidation(): void {
    this.state = updateLastOnlineValidation(this.state);
    this.emitEvent(createOfflineEvent('VALIDATION_SUCCESS'));
  }

  /**
   * Record failed validation (go offline)
   */
  recordValidationFailure(): void {
    this.emitEvent(createOfflineEvent('VALIDATION_FAILED'));
  }

  /**
   * Transition to offline mode
   */
  goOffline(): void {
    if (!this.state.isOffline) {
      this.state = startGracePeriod(this.state, this.state.gracePeriodDays);
      this.emitEvent(createOfflineEvent('GRACE_STARTED', { days: this.state.gracePeriodDays }));
      this.startPeriodicCheck();
    }
  }

  /**
   * Transition to online mode
   */
  goOnline(): void {
    if (this.state.isOffline) {
      this.stopPeriodicCheck();
      this.state = endGracePeriod(this.state);
      this.emitEvent(createOfflineEvent('BACK_ONLINE'));
    }
  }

  /**
   * Get current grace period status
   */
  getStatus(): GracePeriodStatus {
    return getGracePeriodStatus(this.state, this.config);
  }

  /**
   * Check if currently valid
   */
  isValid(): boolean {
    return this.getStatus().isValid;
  }

  /**
   * Check if should warn user
   */
  shouldWarn(): boolean {
    return shouldWarnUser(this.state, this.config);
  }

  /**
   * Check if in grace period
   */
  isInGracePeriod(): boolean {
    return isGracePeriodActive(this.state);
  }

  /**
   * Get remaining days
   */
  getRemainingDays(): number {
    return this.getStatus().remainingDays;
  }

  /**
   * Get formatted time remaining
   */
  getFormattedTimeRemaining(): string {
    return formatGraceTimeRemaining(this.getStatus());
  }

  /**
   * Get warning message
   */
  getWarningMessage(): string {
    const status = this.getStatus();
    return getWarningMessage(status.warningLevel);
  }

  /**
   * Get all events
   */
  getEvents(): OfflineEvent[] {
    return [...this.events];
  }

  /**
   * Get current state
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * Set state (for restoration)
   */
  setState(state: OfflineState): void {
    this.state = { ...state };
  }

  /**
   * Get config
   */
  getConfig(): OfflineGraceConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(partial: Partial<OfflineGraceConfig>): void {
    this.config = mergeGraceConfig({ ...this.config, ...partial });
  }

  /**
   * Add event handler
   */
  onEvent(handler: OfflineEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  offEvent(handler: OfflineEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Save state to string
   */
  saveState(): string {
    return serializeOfflineState(this.state);
  }

  /**
   * Load state from string
   */
  loadState(json: string): boolean {
    const state = deserializeOfflineState(json);
    if (state) {
      this.state = state;

      // Resume periodic check if still offline
      if (this.state.isOffline) {
        this.startPeriodicCheck();
      }

      return true;
    }
    return false;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.stopPeriodicCheck();
    this.state = createEmptyOfflineState();
    this.events = [];
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.stopPeriodicCheck();
    this.eventHandlers = [];
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: OfflineEvent): void {
    this.events.push(event);
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in offline event handler:', error);
      }
    });
  }

  /**
   * Start periodic status check
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) return;

    const checkMs = this.config.checkIntervalMinutes * 60 * 1000;
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, checkMs);
  }

  /**
   * Stop periodic status check
   */
  private stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Perform periodic check
   */
  private performCheck(): void {
    this.state = recordOfflineCheck(this.state);
    const status = this.getStatus();

    // Emit warning events based on status changes
    if (status.warningLevel === 'critical') {
      this.emitEvent(createOfflineEvent('GRACE_CRITICAL', {
        remainingHours: status.remainingHours,
      }));
    } else if (status.warningLevel === 'warning') {
      this.emitEvent(createOfflineEvent('GRACE_WARNING', {
        remainingDays: status.remainingDays,
      }));
    } else if (status.warningLevel === 'expired') {
      this.stopPeriodicCheck();
      this.emitEvent(createOfflineEvent('GRACE_EXPIRED'));
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create offline grace manager
 */
export function createOfflineGraceManager(
  config: Partial<OfflineGraceConfig> = {}
): OfflineGraceManager {
  return new OfflineGraceManager(config);
}

// =============================================================================
// Default Export
// =============================================================================

export default OfflineGraceManager;
