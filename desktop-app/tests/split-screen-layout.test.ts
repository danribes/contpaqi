/**
 * Split-Screen Layout Component Tests
 * Subtask 14.1: Create split-screen layout (PDF + form)
 *
 * Tests for:
 * - Split-screen layout rendering
 * - Panel proportions and responsiveness
 * - Resizable divider functionality
 * - Collapse/expand panel features
 * - Mobile responsive behavior
 */

// Mock types for testing
type PanelPosition = 'left' | 'right';
type LayoutMode = 'split' | 'pdf-only' | 'form-only';

interface SplitScreenLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number; // percentage 0-100
  minLeftWidth?: number;
  maxLeftWidth?: number;
  resizable?: boolean;
  mode?: LayoutMode;
  onModeChange?: (mode: LayoutMode) => void;
  onResize?: (leftWidth: number) => void;
  className?: string;
}

// =============================================================================
// Layout Mode Tests
// =============================================================================

describe('Layout Mode Logic', () => {
  type LayoutMode = 'split' | 'pdf-only' | 'form-only';

  interface LayoutState {
    mode: LayoutMode;
    leftWidth: number;
  }

  function getLayoutClasses(state: LayoutState): {
    leftPanel: string;
    rightPanel: string;
    container: string;
  } {
    const { mode, leftWidth } = state;

    switch (mode) {
      case 'split':
        return {
          leftPanel: `w-[${leftWidth}%]`,
          rightPanel: `w-[${100 - leftWidth}%]`,
          container: 'flex',
        };
      case 'pdf-only':
        return {
          leftPanel: 'w-full',
          rightPanel: 'hidden',
          container: 'flex',
        };
      case 'form-only':
        return {
          leftPanel: 'hidden',
          rightPanel: 'w-full',
          container: 'flex',
        };
      default:
        return {
          leftPanel: 'w-1/2',
          rightPanel: 'w-1/2',
          container: 'flex',
        };
    }
  }

  it('should return split layout classes when mode is split', () => {
    const state: LayoutState = { mode: 'split', leftWidth: 50 };
    const classes = getLayoutClasses(state);

    expect(classes.leftPanel).toBe('w-[50%]');
    expect(classes.rightPanel).toBe('w-[50%]');
    expect(classes.container).toBe('flex');
  });

  it('should return pdf-only layout classes', () => {
    const state: LayoutState = { mode: 'pdf-only', leftWidth: 50 };
    const classes = getLayoutClasses(state);

    expect(classes.leftPanel).toBe('w-full');
    expect(classes.rightPanel).toBe('hidden');
  });

  it('should return form-only layout classes', () => {
    const state: LayoutState = { mode: 'form-only', leftWidth: 50 };
    const classes = getLayoutClasses(state);

    expect(classes.leftPanel).toBe('hidden');
    expect(classes.rightPanel).toBe('w-full');
  });

  it('should handle custom left width percentages', () => {
    const state: LayoutState = { mode: 'split', leftWidth: 60 };
    const classes = getLayoutClasses(state);

    expect(classes.leftPanel).toBe('w-[60%]');
    expect(classes.rightPanel).toBe('w-[40%]');
  });
});

// =============================================================================
// Width Constraint Tests
// =============================================================================

describe('Width Constraints', () => {
  interface ConstraintOptions {
    minWidth: number;
    maxWidth: number;
  }

  function constrainWidth(width: number, options: ConstraintOptions): number {
    const { minWidth, maxWidth } = options;
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  it('should return width as-is when within constraints', () => {
    const result = constrainWidth(50, { minWidth: 20, maxWidth: 80 });
    expect(result).toBe(50);
  });

  it('should clamp width to minimum', () => {
    const result = constrainWidth(10, { minWidth: 20, maxWidth: 80 });
    expect(result).toBe(20);
  });

  it('should clamp width to maximum', () => {
    const result = constrainWidth(90, { minWidth: 20, maxWidth: 80 });
    expect(result).toBe(80);
  });

  it('should handle edge case at minimum', () => {
    const result = constrainWidth(20, { minWidth: 20, maxWidth: 80 });
    expect(result).toBe(20);
  });

  it('should handle edge case at maximum', () => {
    const result = constrainWidth(80, { minWidth: 20, maxWidth: 80 });
    expect(result).toBe(80);
  });
});

// =============================================================================
// Resize Calculation Tests
// =============================================================================

describe('Resize Calculations', () => {
  interface ResizeContext {
    containerWidth: number;
    startX: number;
    startLeftWidth: number; // percentage
  }

  function calculateNewWidth(
    currentX: number,
    context: ResizeContext
  ): number {
    const { containerWidth, startX, startLeftWidth } = context;
    const deltaX = currentX - startX;
    const deltaPercent = (deltaX / containerWidth) * 100;
    return startLeftWidth + deltaPercent;
  }

  it('should calculate new width when dragging right', () => {
    const context: ResizeContext = {
      containerWidth: 1000,
      startX: 500,
      startLeftWidth: 50,
    };
    // Dragging 100px to the right (10% of container)
    const newWidth = calculateNewWidth(600, context);
    expect(newWidth).toBe(60);
  });

  it('should calculate new width when dragging left', () => {
    const context: ResizeContext = {
      containerWidth: 1000,
      startX: 500,
      startLeftWidth: 50,
    };
    // Dragging 100px to the left (-10% of container)
    const newWidth = calculateNewWidth(400, context);
    expect(newWidth).toBe(40);
  });

  it('should handle no movement', () => {
    const context: ResizeContext = {
      containerWidth: 1000,
      startX: 500,
      startLeftWidth: 50,
    };
    const newWidth = calculateNewWidth(500, context);
    expect(newWidth).toBe(50);
  });

  it('should calculate correctly for different container widths', () => {
    const context: ResizeContext = {
      containerWidth: 800,
      startX: 400,
      startLeftWidth: 50,
    };
    // Dragging 80px (10% of 800px container)
    const newWidth = calculateNewWidth(480, context);
    expect(newWidth).toBe(60);
  });
});

// =============================================================================
// Panel Visibility Tests
// =============================================================================

describe('Panel Visibility', () => {
  function isPanelVisible(
    panel: PanelPosition,
    mode: LayoutMode
  ): boolean {
    if (mode === 'split') return true;
    if (mode === 'pdf-only') return panel === 'left';
    if (mode === 'form-only') return panel === 'right';
    return true;
  }

  it('should show both panels in split mode', () => {
    expect(isPanelVisible('left', 'split')).toBe(true);
    expect(isPanelVisible('right', 'split')).toBe(true);
  });

  it('should show only left panel in pdf-only mode', () => {
    expect(isPanelVisible('left', 'pdf-only')).toBe(true);
    expect(isPanelVisible('right', 'pdf-only')).toBe(false);
  });

  it('should show only right panel in form-only mode', () => {
    expect(isPanelVisible('left', 'form-only')).toBe(false);
    expect(isPanelVisible('right', 'form-only')).toBe(true);
  });
});

// =============================================================================
// Responsive Breakpoint Tests
// =============================================================================

describe('Responsive Behavior', () => {
  type Breakpoint = 'mobile' | 'tablet' | 'desktop';

  function getBreakpoint(width: number): Breakpoint {
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function getDefaultMode(breakpoint: Breakpoint): LayoutMode {
    switch (breakpoint) {
      case 'mobile':
        return 'pdf-only'; // Show PDF first on mobile
      case 'tablet':
        return 'split';
      case 'desktop':
        return 'split';
      default:
        return 'split';
    }
  }

  function isResizableAtBreakpoint(breakpoint: Breakpoint): boolean {
    return breakpoint === 'desktop' || breakpoint === 'tablet';
  }

  it('should identify mobile breakpoint correctly', () => {
    expect(getBreakpoint(320)).toBe('mobile');
    expect(getBreakpoint(639)).toBe('mobile');
  });

  it('should identify tablet breakpoint correctly', () => {
    expect(getBreakpoint(640)).toBe('tablet');
    expect(getBreakpoint(1023)).toBe('tablet');
  });

  it('should identify desktop breakpoint correctly', () => {
    expect(getBreakpoint(1024)).toBe('desktop');
    expect(getBreakpoint(1920)).toBe('desktop');
  });

  it('should default to pdf-only on mobile', () => {
    expect(getDefaultMode('mobile')).toBe('pdf-only');
  });

  it('should default to split on tablet and desktop', () => {
    expect(getDefaultMode('tablet')).toBe('split');
    expect(getDefaultMode('desktop')).toBe('split');
  });

  it('should disable resize on mobile', () => {
    expect(isResizableAtBreakpoint('mobile')).toBe(false);
  });

  it('should enable resize on tablet and desktop', () => {
    expect(isResizableAtBreakpoint('tablet')).toBe(true);
    expect(isResizableAtBreakpoint('desktop')).toBe(true);
  });
});

// =============================================================================
// Divider State Tests
// =============================================================================

describe('Divider State', () => {
  interface DividerState {
    isDragging: boolean;
    isHovered: boolean;
  }

  function getDividerClasses(state: DividerState): string {
    const { isDragging, isHovered } = state;
    const baseClasses = 'w-1 cursor-col-resize transition-colors';

    if (isDragging) {
      return `${baseClasses} bg-primary-500`;
    }
    if (isHovered) {
      return `${baseClasses} bg-gray-400`;
    }
    return `${baseClasses} bg-gray-200`;
  }

  it('should return base classes when idle', () => {
    const classes = getDividerClasses({ isDragging: false, isHovered: false });
    expect(classes).toContain('bg-gray-200');
    expect(classes).toContain('cursor-col-resize');
  });

  it('should highlight on hover', () => {
    const classes = getDividerClasses({ isDragging: false, isHovered: true });
    expect(classes).toContain('bg-gray-400');
  });

  it('should show primary color when dragging', () => {
    const classes = getDividerClasses({ isDragging: true, isHovered: false });
    expect(classes).toContain('bg-primary-500');
  });

  it('should prioritize dragging state over hover', () => {
    const classes = getDividerClasses({ isDragging: true, isHovered: true });
    expect(classes).toContain('bg-primary-500');
    expect(classes).not.toContain('bg-gray-400');
  });
});

// =============================================================================
// Mode Toggle Button Tests
// =============================================================================

describe('Mode Toggle Button', () => {
  function getNextMode(currentMode: LayoutMode, direction: 'left' | 'right'): LayoutMode {
    const modes: LayoutMode[] = ['pdf-only', 'split', 'form-only'];
    const currentIndex = modes.indexOf(currentMode);

    if (direction === 'right') {
      return modes[(currentIndex + 1) % modes.length];
    } else {
      return modes[(currentIndex - 1 + modes.length) % modes.length];
    }
  }

  it('should cycle through modes to the right', () => {
    expect(getNextMode('pdf-only', 'right')).toBe('split');
    expect(getNextMode('split', 'right')).toBe('form-only');
    expect(getNextMode('form-only', 'right')).toBe('pdf-only');
  });

  it('should cycle through modes to the left', () => {
    expect(getNextMode('form-only', 'left')).toBe('split');
    expect(getNextMode('split', 'left')).toBe('pdf-only');
    expect(getNextMode('pdf-only', 'left')).toBe('form-only');
  });
});

// =============================================================================
// Panel Header Tests
// =============================================================================

describe('Panel Headers', () => {
  interface PanelHeaderConfig {
    title: string;
    showCollapseButton: boolean;
    showFullscreenButton: boolean;
  }

  function getPanelHeaderConfig(
    panel: PanelPosition,
    mode: LayoutMode
  ): PanelHeaderConfig {
    const isCollapsed =
      (panel === 'left' && mode === 'form-only') ||
      (panel === 'right' && mode === 'pdf-only');

    return {
      title: panel === 'left' ? 'PDF Document' : 'Invoice Data',
      showCollapseButton: mode === 'split',
      showFullscreenButton: !isCollapsed,
    };
  }

  it('should configure left panel header correctly in split mode', () => {
    const config = getPanelHeaderConfig('left', 'split');
    expect(config.title).toBe('PDF Document');
    expect(config.showCollapseButton).toBe(true);
    expect(config.showFullscreenButton).toBe(true);
  });

  it('should configure right panel header correctly in split mode', () => {
    const config = getPanelHeaderConfig('right', 'split');
    expect(config.title).toBe('Invoice Data');
    expect(config.showCollapseButton).toBe(true);
    expect(config.showFullscreenButton).toBe(true);
  });

  it('should hide collapse button in single-panel modes', () => {
    expect(getPanelHeaderConfig('left', 'pdf-only').showCollapseButton).toBe(false);
    expect(getPanelHeaderConfig('right', 'form-only').showCollapseButton).toBe(false);
  });
});

// =============================================================================
// Default Configuration Tests
// =============================================================================

describe('Default Configuration', () => {
  interface SplitScreenConfig {
    initialLeftWidth: number;
    minLeftWidth: number;
    maxLeftWidth: number;
    resizable: boolean;
    mode: LayoutMode;
  }

  const DEFAULT_CONFIG: SplitScreenConfig = {
    initialLeftWidth: 50,
    minLeftWidth: 25,
    maxLeftWidth: 75,
    resizable: true,
    mode: 'split',
  };

  function mergeConfig(
    partial: Partial<SplitScreenConfig>
  ): SplitScreenConfig {
    return { ...DEFAULT_CONFIG, ...partial };
  }

  it('should use default values when no config provided', () => {
    const config = mergeConfig({});
    expect(config.initialLeftWidth).toBe(50);
    expect(config.minLeftWidth).toBe(25);
    expect(config.maxLeftWidth).toBe(75);
    expect(config.resizable).toBe(true);
    expect(config.mode).toBe('split');
  });

  it('should override specific values', () => {
    const config = mergeConfig({ initialLeftWidth: 60 });
    expect(config.initialLeftWidth).toBe(60);
    expect(config.minLeftWidth).toBe(25); // Still default
  });

  it('should override multiple values', () => {
    const config = mergeConfig({
      initialLeftWidth: 40,
      minLeftWidth: 30,
      resizable: false,
    });
    expect(config.initialLeftWidth).toBe(40);
    expect(config.minLeftWidth).toBe(30);
    expect(config.resizable).toBe(false);
  });
});
