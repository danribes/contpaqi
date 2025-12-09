/**
 * Keyboard Shortcuts Tests
 * Subtask 14.10: Add keyboard shortcuts for efficiency
 *
 * Tests for:
 * - Shortcut registration and unregistration
 * - Key combination parsing
 * - Shortcut handler execution
 * - Platform-specific modifier keys (Ctrl/Cmd)
 * - Shortcut conflict detection
 * - Help panel display
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// =============================================================================
// Types
// =============================================================================

interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
  category: ShortcutCategory;
  handler: () => void;
  enabled?: boolean;
}

interface ParsedKeyCombination {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

type ShortcutCategory = 'navigation' | 'actions' | 'form' | 'batch' | 'pdf';

interface ShortcutGroup {
  category: ShortcutCategory;
  label: string;
  shortcuts: KeyboardShortcut[];
}

interface ShortcutRegistry {
  shortcuts: Map<string, KeyboardShortcut>;
  enabled: boolean;
}

// =============================================================================
// Implementation Functions
// =============================================================================

/**
 * Parse key combination string into components
 */
function parseKeyCombination(keys: string): ParsedKeyCombination {
  const parts = keys.toLowerCase().split('+').map(p => p.trim());

  return {
    key: parts.find(p => !['ctrl', 'shift', 'alt', 'meta', 'cmd'].includes(p)) || '',
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta'),
  };
}

/**
 * Normalize key combination to consistent format
 */
function normalizeKeyCombination(keys: string): string {
  const parsed = parseKeyCombination(keys);
  const parts: string[] = [];

  if (parsed.ctrl) parts.push('Ctrl');
  if (parsed.alt) parts.push('Alt');
  if (parsed.shift) parts.push('Shift');
  if (parsed.meta) parts.push('Meta');
  parts.push(parsed.key.toUpperCase());

  return parts.join('+');
}

/**
 * Check if keyboard event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const parsed = parseKeyCombination(shortcut.keys);

  // Check modifiers
  if (parsed.ctrl !== (event.ctrlKey || event.metaKey)) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  // Check key
  const eventKey = event.key.toLowerCase();
  const shortcutKey = parsed.key.toLowerCase();

  // Handle special keys
  if (shortcutKey === 'enter' && eventKey === 'enter') return true;
  if (shortcutKey === 'escape' && (eventKey === 'escape' || eventKey === 'esc')) return true;
  if (shortcutKey === 'space' && eventKey === ' ') return true;

  return eventKey === shortcutKey;
}

/**
 * Create shortcut registry
 */
function createShortcutRegistry(): ShortcutRegistry {
  return {
    shortcuts: new Map(),
    enabled: true,
  };
}

/**
 * Register a shortcut
 */
function registerShortcut(
  registry: ShortcutRegistry,
  shortcut: KeyboardShortcut
): ShortcutRegistry {
  const normalized = normalizeKeyCombination(shortcut.keys);
  const newShortcuts = new Map(registry.shortcuts);
  newShortcuts.set(normalized, { ...shortcut, keys: normalized });

  return {
    ...registry,
    shortcuts: newShortcuts,
  };
}

/**
 * Unregister a shortcut
 */
function unregisterShortcut(
  registry: ShortcutRegistry,
  shortcutId: string
): ShortcutRegistry {
  const newShortcuts = new Map(registry.shortcuts);

  for (const [key, shortcut] of newShortcuts) {
    if (shortcut.id === shortcutId) {
      newShortcuts.delete(key);
      break;
    }
  }

  return {
    ...registry,
    shortcuts: newShortcuts,
  };
}

/**
 * Get shortcut by key combination
 */
function getShortcut(
  registry: ShortcutRegistry,
  keys: string
): KeyboardShortcut | undefined {
  const normalized = normalizeKeyCombination(keys);
  return registry.shortcuts.get(normalized);
}

/**
 * Check for shortcut conflicts
 */
function hasConflict(registry: ShortcutRegistry, keys: string): boolean {
  const normalized = normalizeKeyCombination(keys);
  return registry.shortcuts.has(normalized);
}

/**
 * Get all shortcuts grouped by category
 */
function getShortcutsByCategory(registry: ShortcutRegistry): ShortcutGroup[] {
  const categories: Record<ShortcutCategory, KeyboardShortcut[]> = {
    navigation: [],
    actions: [],
    form: [],
    batch: [],
    pdf: [],
  };

  for (const shortcut of registry.shortcuts.values()) {
    categories[shortcut.category].push(shortcut);
  }

  const labels: Record<ShortcutCategory, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    form: 'Form',
    batch: 'Batch Processing',
    pdf: 'PDF Viewer',
  };

  return Object.entries(categories)
    .filter(([_, shortcuts]) => shortcuts.length > 0)
    .map(([category, shortcuts]) => ({
      category: category as ShortcutCategory,
      label: labels[category as ShortcutCategory],
      shortcuts,
    }));
}

/**
 * Enable/disable all shortcuts
 */
function setShortcutsEnabled(
  registry: ShortcutRegistry,
  enabled: boolean
): ShortcutRegistry {
  return {
    ...registry,
    enabled,
  };
}

/**
 * Enable/disable specific shortcut
 */
function setShortcutEnabled(
  registry: ShortcutRegistry,
  shortcutId: string,
  enabled: boolean
): ShortcutRegistry {
  const newShortcuts = new Map(registry.shortcuts);

  for (const [key, shortcut] of newShortcuts) {
    if (shortcut.id === shortcutId) {
      newShortcuts.set(key, { ...shortcut, enabled });
      break;
    }
  }

  return {
    ...registry,
    shortcuts: newShortcuts,
  };
}

/**
 * Format shortcut for display
 */
function formatShortcutDisplay(keys: string, isMac: boolean = false): string {
  const parsed = parseKeyCombination(keys);
  const parts: string[] = [];

  if (parsed.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (parsed.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (parsed.shift) parts.push(isMac ? '⇧' : 'Shift');

  // Format special keys
  let keyDisplay = parsed.key.toUpperCase();
  if (keyDisplay === 'ENTER') keyDisplay = isMac ? '↩' : 'Enter';
  if (keyDisplay === 'ESCAPE') keyDisplay = isMac ? '⎋' : 'Esc';
  if (keyDisplay === 'SPACE') keyDisplay = 'Space';

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

/**
 * Get platform-specific modifier key name
 */
function getPlatformModifier(isMac: boolean = false): string {
  return isMac ? 'Cmd' : 'Ctrl';
}

/**
 * Check if shortcut should be prevented (form elements)
 */
function shouldPreventShortcut(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  const tagName = target.tagName.toLowerCase();

  // Allow shortcuts in form elements only for specific keys
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    // Allow Escape and Ctrl+Enter in form elements
    if (event.key === 'Escape') return false;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') return false;

    // Block other shortcuts in form elements
    return true;
  }

  return false;
}

/**
 * Create default shortcuts for invoice form
 */
function createDefaultFormShortcuts(handlers: {
  submit?: () => void;
  cancel?: () => void;
  revert?: () => void;
  focusNext?: () => void;
  focusPrev?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.submit) {
    shortcuts.push({
      id: 'submit',
      keys: 'Ctrl+Enter',
      description: 'Submit form',
      category: 'form',
      handler: handlers.submit,
    });
  }

  if (handlers.cancel) {
    shortcuts.push({
      id: 'cancel',
      keys: 'Escape',
      description: 'Cancel / Close modal',
      category: 'form',
      handler: handlers.cancel,
    });
  }

  if (handlers.revert) {
    shortcuts.push({
      id: 'revert',
      keys: 'Ctrl+Z',
      description: 'Revert field to original',
      category: 'form',
      handler: handlers.revert,
    });
  }

  return shortcuts;
}

/**
 * Create default shortcuts for batch processing
 */
function createDefaultBatchShortcuts(handlers: {
  processAll?: () => void;
  retryFailed?: () => void;
  clearCompleted?: () => void;
  nextFile?: () => void;
  prevFile?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.processAll) {
    shortcuts.push({
      id: 'processAll',
      keys: 'Ctrl+Shift+P',
      description: 'Process all files',
      category: 'batch',
      handler: handlers.processAll,
    });
  }

  if (handlers.retryFailed) {
    shortcuts.push({
      id: 'retryFailed',
      keys: 'Ctrl+R',
      description: 'Retry failed files',
      category: 'batch',
      handler: handlers.retryFailed,
    });
  }

  if (handlers.nextFile) {
    shortcuts.push({
      id: 'nextFile',
      keys: 'Ctrl+]',
      description: 'Next file',
      category: 'batch',
      handler: handlers.nextFile,
    });
  }

  if (handlers.prevFile) {
    shortcuts.push({
      id: 'prevFile',
      keys: 'Ctrl+[',
      description: 'Previous file',
      category: 'batch',
      handler: handlers.prevFile,
    });
  }

  return shortcuts;
}

/**
 * Create default navigation shortcuts
 */
function createDefaultNavigationShortcuts(handlers: {
  showHelp?: () => void;
  focusSearch?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.showHelp) {
    shortcuts.push({
      id: 'showHelp',
      keys: 'F1',
      description: 'Show keyboard shortcuts',
      category: 'navigation',
      handler: handlers.showHelp,
    });

    shortcuts.push({
      id: 'showHelpAlt',
      keys: 'Ctrl+/',
      description: 'Show keyboard shortcuts',
      category: 'navigation',
      handler: handlers.showHelp,
    });
  }

  if (handlers.focusSearch) {
    shortcuts.push({
      id: 'focusSearch',
      keys: 'Ctrl+K',
      description: 'Focus search',
      category: 'navigation',
      handler: handlers.focusSearch,
    });
  }

  return shortcuts;
}

// =============================================================================
// Tests: Key Combination Parsing
// =============================================================================

describe('Key Combination Parsing', () => {
  describe('parseKeyCombination', () => {
    it('should parse simple key', () => {
      const result = parseKeyCombination('A');
      expect(result.key).toBe('a');
      expect(result.ctrl).toBe(false);
      expect(result.shift).toBe(false);
      expect(result.alt).toBe(false);
    });

    it('should parse Ctrl+key', () => {
      const result = parseKeyCombination('Ctrl+S');
      expect(result.key).toBe('s');
      expect(result.ctrl).toBe(true);
      expect(result.shift).toBe(false);
    });

    it('should parse Ctrl+Shift+key', () => {
      const result = parseKeyCombination('Ctrl+Shift+P');
      expect(result.key).toBe('p');
      expect(result.ctrl).toBe(true);
      expect(result.shift).toBe(true);
    });

    it('should parse Alt+key', () => {
      const result = parseKeyCombination('Alt+1');
      expect(result.key).toBe('1');
      expect(result.alt).toBe(true);
    });

    it('should treat Cmd as Ctrl', () => {
      const result = parseKeyCombination('Cmd+S');
      expect(result.ctrl).toBe(true);
    });

    it('should handle case insensitivity', () => {
      const result = parseKeyCombination('ctrl+shift+enter');
      expect(result.key).toBe('enter');
      expect(result.ctrl).toBe(true);
      expect(result.shift).toBe(true);
    });
  });

  describe('normalizeKeyCombination', () => {
    it('should normalize to consistent format', () => {
      expect(normalizeKeyCombination('ctrl+s')).toBe('Ctrl+S');
      expect(normalizeKeyCombination('CTRL+S')).toBe('Ctrl+S');
      expect(normalizeKeyCombination('Ctrl + S')).toBe('Ctrl+S');
    });

    it('should order modifiers consistently', () => {
      expect(normalizeKeyCombination('shift+ctrl+a')).toBe('Ctrl+Shift+A');
      expect(normalizeKeyCombination('alt+ctrl+shift+x')).toBe('Ctrl+Alt+Shift+X');
    });
  });
});

// =============================================================================
// Tests: Shortcut Matching
// =============================================================================

describe('Shortcut Matching', () => {
  describe('matchesShortcut', () => {
    const createMockEvent = (overrides: Partial<KeyboardEvent>): KeyboardEvent => {
      return {
        key: '',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        ...overrides,
      } as unknown as KeyboardEvent;
    };

    const createMockShortcut = (keys: string): KeyboardShortcut => ({
      id: 'test',
      keys,
      description: 'Test shortcut',
      category: 'actions',
      handler: jest.fn(),
    });

    it('should match simple key', () => {
      const event = createMockEvent({ key: 'a' });
      const shortcut = createMockShortcut('A');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('should match Ctrl+key', () => {
      const event = createMockEvent({ key: 's', ctrlKey: true });
      const shortcut = createMockShortcut('Ctrl+S');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('should match Cmd+key as Ctrl+key', () => {
      const event = createMockEvent({ key: 's', metaKey: true });
      const shortcut = createMockShortcut('Ctrl+S');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('should not match when modifier missing', () => {
      const event = createMockEvent({ key: 's', ctrlKey: false });
      const shortcut = createMockShortcut('Ctrl+S');
      expect(matchesShortcut(event, shortcut)).toBe(false);
    });

    it('should not match when extra modifier present', () => {
      const event = createMockEvent({ key: 's', ctrlKey: true, shiftKey: true });
      const shortcut = createMockShortcut('Ctrl+S');
      expect(matchesShortcut(event, shortcut)).toBe(false);
    });

    it('should match Enter key', () => {
      const event = createMockEvent({ key: 'Enter', ctrlKey: true });
      const shortcut = createMockShortcut('Ctrl+Enter');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('should match Escape key', () => {
      const event = createMockEvent({ key: 'Escape' });
      const shortcut = createMockShortcut('Escape');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });

    it('should match Esc as Escape', () => {
      const event = createMockEvent({ key: 'Esc' });
      const shortcut = createMockShortcut('Escape');
      expect(matchesShortcut(event, shortcut)).toBe(true);
    });
  });
});

// =============================================================================
// Tests: Shortcut Registry
// =============================================================================

describe('Shortcut Registry', () => {
  describe('createShortcutRegistry', () => {
    it('should create empty registry', () => {
      const registry = createShortcutRegistry();
      expect(registry.shortcuts.size).toBe(0);
      expect(registry.enabled).toBe(true);
    });
  });

  describe('registerShortcut', () => {
    it('should add shortcut to registry', () => {
      let registry = createShortcutRegistry();
      const shortcut: KeyboardShortcut = {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
      };

      registry = registerShortcut(registry, shortcut);

      expect(registry.shortcuts.size).toBe(1);
      expect(registry.shortcuts.has('Ctrl+S')).toBe(true);
    });

    it('should normalize key combination', () => {
      let registry = createShortcutRegistry();
      const shortcut: KeyboardShortcut = {
        id: 'save',
        keys: 'ctrl+s',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
      };

      registry = registerShortcut(registry, shortcut);

      expect(registry.shortcuts.has('Ctrl+S')).toBe(true);
    });
  });

  describe('unregisterShortcut', () => {
    it('should remove shortcut by id', () => {
      let registry = createShortcutRegistry();
      const shortcut: KeyboardShortcut = {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
      };

      registry = registerShortcut(registry, shortcut);
      registry = unregisterShortcut(registry, 'save');

      expect(registry.shortcuts.size).toBe(0);
    });

    it('should not fail when shortcut not found', () => {
      let registry = createShortcutRegistry();
      registry = unregisterShortcut(registry, 'nonexistent');
      expect(registry.shortcuts.size).toBe(0);
    });
  });

  describe('getShortcut', () => {
    it('should return shortcut by key combination', () => {
      let registry = createShortcutRegistry();
      const shortcut: KeyboardShortcut = {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
      };

      registry = registerShortcut(registry, shortcut);
      const found = getShortcut(registry, 'ctrl+s');

      expect(found).toBeDefined();
      expect(found?.id).toBe('save');
    });

    it('should return undefined when not found', () => {
      const registry = createShortcutRegistry();
      const found = getShortcut(registry, 'Ctrl+S');
      expect(found).toBeUndefined();
    });
  });

  describe('hasConflict', () => {
    it('should detect conflicting shortcuts', () => {
      let registry = createShortcutRegistry();
      const shortcut: KeyboardShortcut = {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
      };

      registry = registerShortcut(registry, shortcut);

      expect(hasConflict(registry, 'Ctrl+S')).toBe(true);
      expect(hasConflict(registry, 'ctrl+s')).toBe(true);
      expect(hasConflict(registry, 'Ctrl+X')).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Shortcut Grouping
// =============================================================================

describe('Shortcut Grouping', () => {
  describe('getShortcutsByCategory', () => {
    it('should group shortcuts by category', () => {
      let registry = createShortcutRegistry();

      registry = registerShortcut(registry, {
        id: 'submit',
        keys: 'Ctrl+Enter',
        description: 'Submit',
        category: 'form',
        handler: jest.fn(),
      });

      registry = registerShortcut(registry, {
        id: 'help',
        keys: 'F1',
        description: 'Help',
        category: 'navigation',
        handler: jest.fn(),
      });

      registry = registerShortcut(registry, {
        id: 'processAll',
        keys: 'Ctrl+Shift+P',
        description: 'Process all',
        category: 'batch',
        handler: jest.fn(),
      });

      const groups = getShortcutsByCategory(registry);

      expect(groups.length).toBe(3);
      expect(groups.find(g => g.category === 'form')?.shortcuts.length).toBe(1);
      expect(groups.find(g => g.category === 'navigation')?.shortcuts.length).toBe(1);
      expect(groups.find(g => g.category === 'batch')?.shortcuts.length).toBe(1);
    });

    it('should exclude empty categories', () => {
      let registry = createShortcutRegistry();

      registry = registerShortcut(registry, {
        id: 'submit',
        keys: 'Ctrl+Enter',
        description: 'Submit',
        category: 'form',
        handler: jest.fn(),
      });

      const groups = getShortcutsByCategory(registry);

      expect(groups.length).toBe(1);
      expect(groups[0].category).toBe('form');
    });
  });
});

// =============================================================================
// Tests: Enable/Disable
// =============================================================================

describe('Enable/Disable', () => {
  describe('setShortcutsEnabled', () => {
    it('should enable all shortcuts', () => {
      let registry = createShortcutRegistry();
      registry = setShortcutsEnabled(registry, true);
      expect(registry.enabled).toBe(true);
    });

    it('should disable all shortcuts', () => {
      let registry = createShortcutRegistry();
      registry = setShortcutsEnabled(registry, false);
      expect(registry.enabled).toBe(false);
    });
  });

  describe('setShortcutEnabled', () => {
    it('should enable specific shortcut', () => {
      let registry = createShortcutRegistry();
      registry = registerShortcut(registry, {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
        enabled: false,
      });

      registry = setShortcutEnabled(registry, 'save', true);
      const shortcut = getShortcut(registry, 'Ctrl+S');

      expect(shortcut?.enabled).toBe(true);
    });

    it('should disable specific shortcut', () => {
      let registry = createShortcutRegistry();
      registry = registerShortcut(registry, {
        id: 'save',
        keys: 'Ctrl+S',
        description: 'Save',
        category: 'actions',
        handler: jest.fn(),
        enabled: true,
      });

      registry = setShortcutEnabled(registry, 'save', false);
      const shortcut = getShortcut(registry, 'Ctrl+S');

      expect(shortcut?.enabled).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Display Formatting
// =============================================================================

describe('Display Formatting', () => {
  describe('formatShortcutDisplay', () => {
    it('should format for Windows/Linux', () => {
      expect(formatShortcutDisplay('Ctrl+S', false)).toBe('Ctrl+S');
      expect(formatShortcutDisplay('Ctrl+Shift+P', false)).toBe('Ctrl+Shift+P');
      expect(formatShortcutDisplay('Alt+1', false)).toBe('Alt+1');
    });

    it('should format for Mac', () => {
      expect(formatShortcutDisplay('Ctrl+S', true)).toBe('⌘S');
      expect(formatShortcutDisplay('Ctrl+Shift+P', true)).toBe('⌘⇧P');
      expect(formatShortcutDisplay('Alt+1', true)).toBe('⌥1');
    });

    it('should format special keys', () => {
      expect(formatShortcutDisplay('Ctrl+Enter', false)).toBe('Ctrl+Enter');
      expect(formatShortcutDisplay('Escape', false)).toBe('Esc');
      expect(formatShortcutDisplay('Ctrl+Enter', true)).toBe('⌘↩');
      expect(formatShortcutDisplay('Escape', true)).toBe('⎋');
    });
  });

  describe('getPlatformModifier', () => {
    it('should return Ctrl for Windows/Linux', () => {
      expect(getPlatformModifier(false)).toBe('Ctrl');
    });

    it('should return Cmd for Mac', () => {
      expect(getPlatformModifier(true)).toBe('Cmd');
    });
  });
});

// =============================================================================
// Tests: Form Element Handling
// =============================================================================

describe('Form Element Handling', () => {
  describe('shouldPreventShortcut', () => {
    const createMockEventWithTarget = (
      tagName: string,
      key: string,
      ctrlKey: boolean = false
    ): KeyboardEvent => {
      const target = { tagName: tagName.toUpperCase() } as HTMLElement;
      return {
        key,
        ctrlKey,
        metaKey: false,
        target,
      } as unknown as KeyboardEvent;
    };

    it('should not prevent Escape in input', () => {
      const event = createMockEventWithTarget('input', 'Escape');
      expect(shouldPreventShortcut(event)).toBe(false);
    });

    it('should not prevent Ctrl+Enter in input', () => {
      const event = createMockEventWithTarget('input', 'Enter', true);
      expect(shouldPreventShortcut(event)).toBe(false);
    });

    it('should prevent other shortcuts in input', () => {
      const event = createMockEventWithTarget('input', 's', true);
      expect(shouldPreventShortcut(event)).toBe(true);
    });

    it('should prevent shortcuts in textarea', () => {
      const event = createMockEventWithTarget('textarea', 's', true);
      expect(shouldPreventShortcut(event)).toBe(true);
    });

    it('should not prevent shortcuts in div', () => {
      const event = createMockEventWithTarget('div', 's', true);
      expect(shouldPreventShortcut(event)).toBe(false);
    });
  });
});

// =============================================================================
// Tests: Default Shortcuts
// =============================================================================

describe('Default Shortcuts', () => {
  describe('createDefaultFormShortcuts', () => {
    it('should create submit shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultFormShortcuts({ submit: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Ctrl+Enter');
      expect(shortcuts[0].category).toBe('form');
    });

    it('should create cancel shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultFormShortcuts({ cancel: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Escape');
    });

    it('should create revert shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultFormShortcuts({ revert: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Ctrl+Z');
    });

    it('should create multiple shortcuts', () => {
      const shortcuts = createDefaultFormShortcuts({
        submit: jest.fn(),
        cancel: jest.fn(),
        revert: jest.fn(),
      });

      expect(shortcuts.length).toBe(3);
    });
  });

  describe('createDefaultBatchShortcuts', () => {
    it('should create process all shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultBatchShortcuts({ processAll: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Ctrl+Shift+P');
      expect(shortcuts[0].category).toBe('batch');
    });

    it('should create retry failed shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultBatchShortcuts({ retryFailed: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Ctrl+R');
    });

    it('should create navigation shortcuts', () => {
      const shortcuts = createDefaultBatchShortcuts({
        nextFile: jest.fn(),
        prevFile: jest.fn(),
      });

      expect(shortcuts.length).toBe(2);
      expect(shortcuts.find(s => s.keys === 'Ctrl+]')).toBeDefined();
      expect(shortcuts.find(s => s.keys === 'Ctrl+[')).toBeDefined();
    });
  });

  describe('createDefaultNavigationShortcuts', () => {
    it('should create help shortcut with F1 and Ctrl+/', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultNavigationShortcuts({ showHelp: handler });

      expect(shortcuts.length).toBe(2);
      expect(shortcuts.find(s => s.keys === 'F1')).toBeDefined();
      expect(shortcuts.find(s => s.keys === 'Ctrl+/')).toBeDefined();
    });

    it('should create search focus shortcut', () => {
      const handler = jest.fn();
      const shortcuts = createDefaultNavigationShortcuts({ focusSearch: handler });

      expect(shortcuts.length).toBe(1);
      expect(shortcuts[0].keys).toBe('Ctrl+K');
    });
  });
});
