/**
 * Keyboard Shortcuts Component
 * Subtask 14.10: Add keyboard shortcuts for efficiency
 *
 * Provides:
 * - Shortcut registration and management
 * - Key combination parsing and matching
 * - Platform-aware display formatting
 * - React hooks for keyboard shortcut handling
 * - Help panel component
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';

// =============================================================================
// Types
// =============================================================================

export type ShortcutCategory = 'navigation' | 'actions' | 'form' | 'batch' | 'pdf';

export interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
  category: ShortcutCategory;
  handler: () => void;
  enabled?: boolean;
}

export interface ParsedKeyCombination {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface ShortcutGroup {
  category: ShortcutCategory;
  label: string;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutRegistry {
  shortcuts: Map<string, KeyboardShortcut>;
  enabled: boolean;
}

export interface ActionButtonState {
  canStart: boolean;
  canRetry: boolean;
  canClear: boolean;
  canClearAll: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse key combination string into components
 */
export function parseKeyCombination(keys: string): ParsedKeyCombination {
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
export function normalizeKeyCombination(keys: string): string {
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
export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const parsed = parseKeyCombination(shortcut.keys);

  // Check modifiers - treat Cmd (metaKey) as Ctrl for cross-platform support
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

// =============================================================================
// Registry Functions
// =============================================================================

/**
 * Create shortcut registry
 */
export function createShortcutRegistry(): ShortcutRegistry {
  return {
    shortcuts: new Map(),
    enabled: true,
  };
}

/**
 * Register a shortcut
 */
export function registerShortcut(
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
export function unregisterShortcut(
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
export function getShortcut(
  registry: ShortcutRegistry,
  keys: string
): KeyboardShortcut | undefined {
  const normalized = normalizeKeyCombination(keys);
  return registry.shortcuts.get(normalized);
}

/**
 * Check for shortcut conflicts
 */
export function hasConflict(registry: ShortcutRegistry, keys: string): boolean {
  const normalized = normalizeKeyCombination(keys);
  return registry.shortcuts.has(normalized);
}

/**
 * Get all shortcuts grouped by category
 */
export function getShortcutsByCategory(registry: ShortcutRegistry): ShortcutGroup[] {
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

// =============================================================================
// Enable/Disable Functions
// =============================================================================

/**
 * Enable/disable all shortcuts
 */
export function setShortcutsEnabled(
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
export function setShortcutEnabled(
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

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Format shortcut for display
 */
export function formatShortcutDisplay(keys: string, isMac: boolean = false): string {
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
export function getPlatformModifier(isMac: boolean = false): string {
  return isMac ? 'Cmd' : 'Ctrl';
}

/**
 * Check if shortcut should be prevented (form elements)
 */
export function shouldPreventShortcut(event: KeyboardEvent): boolean {
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

// =============================================================================
// Default Shortcuts Factory Functions
// =============================================================================

/**
 * Create default shortcuts for invoice form
 */
export function createDefaultFormShortcuts(handlers: {
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

  if (handlers.focusNext) {
    shortcuts.push({
      id: 'focusNext',
      keys: 'Tab',
      description: 'Next field',
      category: 'form',
      handler: handlers.focusNext,
    });
  }

  if (handlers.focusPrev) {
    shortcuts.push({
      id: 'focusPrev',
      keys: 'Shift+Tab',
      description: 'Previous field',
      category: 'form',
      handler: handlers.focusPrev,
    });
  }

  return shortcuts;
}

/**
 * Create default shortcuts for batch processing
 */
export function createDefaultBatchShortcuts(handlers: {
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

  if (handlers.clearCompleted) {
    shortcuts.push({
      id: 'clearCompleted',
      keys: 'Ctrl+Shift+C',
      description: 'Clear completed files',
      category: 'batch',
      handler: handlers.clearCompleted,
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
export function createDefaultNavigationShortcuts(handlers: {
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

/**
 * Create default PDF viewer shortcuts
 */
export function createDefaultPdfShortcuts(handlers: {
  zoomIn?: () => void;
  zoomOut?: () => void;
  fitToWidth?: () => void;
  nextPage?: () => void;
  prevPage?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.zoomIn) {
    shortcuts.push({
      id: 'zoomIn',
      keys: 'Ctrl+=',
      description: 'Zoom in',
      category: 'pdf',
      handler: handlers.zoomIn,
    });
  }

  if (handlers.zoomOut) {
    shortcuts.push({
      id: 'zoomOut',
      keys: 'Ctrl+-',
      description: 'Zoom out',
      category: 'pdf',
      handler: handlers.zoomOut,
    });
  }

  if (handlers.fitToWidth) {
    shortcuts.push({
      id: 'fitToWidth',
      keys: 'Ctrl+0',
      description: 'Fit to width',
      category: 'pdf',
      handler: handlers.fitToWidth,
    });
  }

  if (handlers.nextPage) {
    shortcuts.push({
      id: 'nextPage',
      keys: 'PageDown',
      description: 'Next page',
      category: 'pdf',
      handler: handlers.nextPage,
    });
  }

  if (handlers.prevPage) {
    shortcuts.push({
      id: 'prevPage',
      keys: 'PageUp',
      description: 'Previous page',
      category: 'pdf',
      handler: handlers.prevPage,
    });
  }

  return shortcuts;
}

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Detect if running on Mac
 */
export function isMacPlatform(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toLowerCase().includes('mac');
  }
  return false;
}

// =============================================================================
// React Context
// =============================================================================

interface KeyboardShortcutsContextValue {
  registry: ShortcutRegistry;
  isMac: boolean;
  register: (shortcut: KeyboardShortcut) => void;
  unregister: (shortcutId: string) => void;
  setEnabled: (enabled: boolean) => void;
  showHelp: () => void;
  hideHelp: () => void;
  isHelpVisible: boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

// =============================================================================
// React Hook: useKeyboardShortcuts
// =============================================================================

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

/**
 * Hook to register and handle keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { shortcuts, enabled = true, onShortcutTriggered } = options;

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should prevent the shortcut
      if (shouldPreventShortcut(event)) return;

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          onShortcutTriggered?.(shortcut);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled, onShortcutTriggered]);
}

// =============================================================================
// React Hook: useShortcutRegistry
// =============================================================================

interface UseShortcutRegistryReturn {
  registry: ShortcutRegistry;
  register: (shortcut: KeyboardShortcut) => void;
  unregister: (shortcutId: string) => void;
  setEnabled: (enabled: boolean) => void;
  setShortcutEnabled: (shortcutId: string, enabled: boolean) => void;
  getGroups: () => ShortcutGroup[];
}

/**
 * Hook to manage a shortcut registry
 */
export function useShortcutRegistry(): UseShortcutRegistryReturn {
  const [registry, setRegistry] = useState<ShortcutRegistry>(createShortcutRegistry);

  const register = useCallback((shortcut: KeyboardShortcut) => {
    setRegistry(r => registerShortcut(r, shortcut));
  }, []);

  const unregister = useCallback((shortcutId: string) => {
    setRegistry(r => unregisterShortcut(r, shortcutId));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setRegistry(r => setShortcutsEnabled(r, enabled));
  }, []);

  const setShortcutEnabledFn = useCallback((shortcutId: string, enabled: boolean) => {
    setRegistry(r => setShortcutEnabled(r, shortcutId, enabled));
  }, []);

  const getGroups = useCallback(() => {
    return getShortcutsByCategory(registry);
  }, [registry]);

  return {
    registry,
    register,
    unregister,
    setEnabled,
    setShortcutEnabled: setShortcutEnabledFn,
    getGroups,
  };
}

// =============================================================================
// React Components
// =============================================================================

interface ShortcutBadgeProps {
  keys: string;
  className?: string;
}

/**
 * Display a keyboard shortcut as a badge
 */
export const ShortcutBadge: React.FC<ShortcutBadgeProps> = ({ keys, className = '' }) => {
  const isMac = isMacPlatform();
  const display = formatShortcutDisplay(keys, isMac);

  return (
    <kbd
      className={`px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm ${className}`}
    >
      {display}
    </kbd>
  );
};

interface ShortcutItemProps {
  shortcut: KeyboardShortcut;
}

/**
 * Display a single shortcut item with description
 */
export const ShortcutItem: React.FC<ShortcutItemProps> = ({ shortcut }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-700">{shortcut.description}</span>
      <ShortcutBadge keys={shortcut.keys} />
    </div>
  );
};

interface ShortcutGroupDisplayProps {
  group: ShortcutGroup;
}

/**
 * Display a group of shortcuts
 */
export const ShortcutGroupDisplay: React.FC<ShortcutGroupDisplayProps> = ({ group }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {group.label}
      </h3>
      <div className="divide-y divide-gray-100">
        {group.shortcuts.map(shortcut => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
};

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ShortcutGroup[];
  title?: string;
}

/**
 * Modal displaying all keyboard shortcuts
 */
export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  groups,
  title = 'Keyboard Shortcuts',
}) => {
  // Handle escape key to close
  useKeyboardShortcuts({
    shortcuts: [
      {
        id: 'closeHelp',
        keys: 'Escape',
        description: 'Close help',
        category: 'navigation',
        handler: onClose,
      },
    ],
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="shortcuts-modal" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {groups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No keyboard shortcuts configured</p>
            ) : (
              groups.map(group => (
                <ShortcutGroupDisplay key={group.category} group={group} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500 text-center">
              Press <ShortcutBadge keys="Escape" className="mx-1" /> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Provider Component
// =============================================================================

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  initialShortcuts?: KeyboardShortcut[];
}

/**
 * Provider component for keyboard shortcuts context
 */
export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
  initialShortcuts = [],
}) => {
  const [registry, setRegistry] = useState<ShortcutRegistry>(() => {
    let initial = createShortcutRegistry();
    for (const shortcut of initialShortcuts) {
      initial = registerShortcut(initial, shortcut);
    }
    return initial;
  });

  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const isMac = useMemo(() => isMacPlatform(), []);

  const register = useCallback((shortcut: KeyboardShortcut) => {
    setRegistry(r => registerShortcut(r, shortcut));
  }, []);

  const unregister = useCallback((shortcutId: string) => {
    setRegistry(r => unregisterShortcut(r, shortcutId));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setRegistry(r => setShortcutsEnabled(r, enabled));
  }, []);

  const showHelp = useCallback(() => setIsHelpVisible(true), []);
  const hideHelp = useCallback(() => setIsHelpVisible(false), []);

  // Register global keyboard event handler
  useEffect(() => {
    if (!registry.enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should prevent the shortcut
      if (shouldPreventShortcut(event)) return;

      // Find matching shortcut
      for (const shortcut of registry.shortcuts.values()) {
        if (shortcut.enabled === false) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [registry]);

  const value: KeyboardShortcutsContextValue = {
    registry,
    isMac,
    register,
    unregister,
    setEnabled,
    showHelp,
    hideHelp,
    isHelpVisible,
  };

  const groups = getShortcutsByCategory(registry);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsHelpModal
        isOpen={isHelpVisible}
        onClose={hideHelp}
        groups={groups}
      />
    </KeyboardShortcutsContext.Provider>
  );
};

/**
 * Hook to access keyboard shortcuts context
 */
export function useKeyboardShortcutsContext(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider');
  }
  return context;
}

// =============================================================================
// Inline Shortcut Display Component
// =============================================================================

interface InlineShortcutProps {
  shortcut: KeyboardShortcut;
  showDescription?: boolean;
  className?: string;
}

/**
 * Inline display of a shortcut with optional description
 */
export const InlineShortcut: React.FC<InlineShortcutProps> = ({
  shortcut,
  showDescription = false,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {showDescription && (
        <span className="text-gray-600">{shortcut.description}</span>
      )}
      <ShortcutBadge keys={shortcut.keys} />
    </span>
  );
};

// =============================================================================
// Button with Shortcut Component
// =============================================================================

interface ButtonWithShortcutProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shortcut?: KeyboardShortcut;
  showShortcut?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Button that displays its associated keyboard shortcut
 */
export const ButtonWithShortcut: React.FC<ButtonWithShortcutProps> = ({
  children,
  shortcut,
  showShortcut = true,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}) => {
  // Register shortcut handler
  useKeyboardShortcuts({
    shortcuts: shortcut ? [shortcut] : [],
    enabled: !disabled && !!shortcut,
  });

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300',
  };

  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors inline-flex items-center gap-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
      {shortcut && showShortcut && (
        <ShortcutBadge
          keys={shortcut.keys}
          className={variant === 'primary' || variant === 'danger' ? 'bg-white/20 border-white/30 text-white' : ''}
        />
      )}
    </button>
  );
};

// =============================================================================
// Export all types and functions
// =============================================================================

export {
  ShortcutCategory as KeyboardShortcutCategory,
};
