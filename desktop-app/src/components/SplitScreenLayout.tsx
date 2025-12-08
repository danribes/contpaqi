/**
 * Split Screen Layout Components
 * Subtask 14.1: Create split-screen layout (PDF + form)
 *
 * Provides a resizable split-screen layout for the verification interface:
 * - SplitScreenLayout: Main container with resizable panels
 * - PanelHeader: Header with title and action buttons
 * - ResizeDivider: Draggable divider between panels
 */

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type LayoutMode = 'split' | 'pdf-only' | 'form-only';
export type PanelPosition = 'left' | 'right';
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface SplitScreenLayoutProps {
  /** Content for the left panel (PDF viewer) */
  leftPanel: ReactNode;
  /** Content for the right panel (form) */
  rightPanel: ReactNode;
  /** Initial left panel width as percentage (default: 50) */
  initialLeftWidth?: number;
  /** Minimum left panel width as percentage (default: 25) */
  minLeftWidth?: number;
  /** Maximum left panel width as percentage (default: 75) */
  maxLeftWidth?: number;
  /** Whether panels can be resized (default: true) */
  resizable?: boolean;
  /** Current layout mode */
  mode?: LayoutMode;
  /** Callback when mode changes */
  onModeChange?: (mode: LayoutMode) => void;
  /** Callback when panel is resized */
  onResize?: (leftWidth: number) => void;
  /** Left panel title (default: "PDF Document") */
  leftTitle?: string;
  /** Right panel title (default: "Invoice Data") */
  rightTitle?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the current breakpoint based on window width
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get the default layout mode for a breakpoint
 */
export function getDefaultMode(breakpoint: Breakpoint): LayoutMode {
  switch (breakpoint) {
    case 'mobile':
      return 'pdf-only'; // Show PDF first on mobile
    case 'tablet':
    case 'desktop':
    default:
      return 'split';
  }
}

/**
 * Check if resizing is available at the current breakpoint
 */
export function isResizableAtBreakpoint(breakpoint: Breakpoint): boolean {
  return breakpoint === 'desktop' || breakpoint === 'tablet';
}

/**
 * Constrain width to min/max bounds
 */
export function constrainWidth(
  width: number,
  minWidth: number,
  maxWidth: number
): number {
  return Math.min(Math.max(width, minWidth), maxWidth);
}

/**
 * Check if a panel is visible in the current mode
 */
export function isPanelVisible(panel: PanelPosition, mode: LayoutMode): boolean {
  if (mode === 'split') return true;
  if (mode === 'pdf-only') return panel === 'left';
  if (mode === 'form-only') return panel === 'right';
  return true;
}

/**
 * Get the next mode when cycling
 */
export function getNextMode(
  currentMode: LayoutMode,
  direction: 'left' | 'right'
): LayoutMode {
  const modes: LayoutMode[] = ['pdf-only', 'split', 'form-only'];
  const currentIndex = modes.indexOf(currentMode);

  if (direction === 'right') {
    return modes[(currentIndex + 1) % modes.length];
  } else {
    return modes[(currentIndex - 1 + modes.length) % modes.length];
  }
}

// =============================================================================
// Panel Header Component
// =============================================================================

interface PanelHeaderProps {
  title: string;
  position: PanelPosition;
  mode: LayoutMode;
  onCollapse?: () => void;
  onExpand?: () => void;
  className?: string;
}

/**
 * Header for a panel with title and action buttons
 */
export function PanelHeader({
  title,
  position,
  mode,
  onCollapse,
  onExpand,
  className = '',
}: PanelHeaderProps) {
  const isExpanded = mode !== 'split';
  const showCollapseButton = mode === 'split';

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 ${className}`}
    >
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <div className="flex items-center gap-1">
        {showCollapseButton && onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            title={`Collapse ${title}`}
          >
            <CollapseIcon position={position} />
          </button>
        )}
        {isExpanded && onExpand && (
          <button
            onClick={onExpand}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            title="Return to split view"
          >
            <ExpandIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Resize Divider Component
// =============================================================================

interface ResizeDividerProps {
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
  disabled?: boolean;
}

/**
 * Draggable divider between panels
 */
export function ResizeDivider({
  onDragStart,
  isDragging,
  disabled = false,
}: ResizeDividerProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (disabled) {
    return <div className="w-px bg-gray-200" />;
  }

  const bgColor = isDragging
    ? 'bg-primary-500'
    : isHovered
    ? 'bg-gray-400'
    : 'bg-gray-200';

  return (
    <div
      className={`w-1 cursor-col-resize transition-colors ${bgColor} hover:bg-gray-400 relative group`}
      onMouseDown={onDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Wider hit area for easier grabbing */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
      {/* Visual grip indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col gap-0.5">
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mode Toggle Component
// =============================================================================

interface ModeToggleProps {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  className?: string;
}

/**
 * Toggle buttons for switching between layout modes
 */
export function ModeToggle({ mode, onModeChange, className = '' }: ModeToggleProps) {
  return (
    <div className={`flex items-center gap-1 bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onModeChange('pdf-only')}
        className={`px-3 py-1 text-xs rounded ${
          mode === 'pdf-only'
            ? 'bg-white shadow text-primary-600'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Show PDF only"
      >
        PDF
      </button>
      <button
        onClick={() => onModeChange('split')}
        className={`px-3 py-1 text-xs rounded ${
          mode === 'split'
            ? 'bg-white shadow text-primary-600'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Show split view"
      >
        Split
      </button>
      <button
        onClick={() => onModeChange('form-only')}
        className={`px-3 py-1 text-xs rounded ${
          mode === 'form-only'
            ? 'bg-white shadow text-primary-600'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Show form only"
      >
        Form
      </button>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CollapseIcon({ position }: { position: PanelPosition }) {
  // Point arrow toward the edge to collapse
  const path =
    position === 'left'
      ? 'M15 19l-7-7 7-7' // Left arrow
      : 'M9 5l7 7-7 7'; // Right arrow

  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

// =============================================================================
// Main Split Screen Layout Component
// =============================================================================

/**
 * Split screen layout with resizable panels for PDF and form display
 */
export function SplitScreenLayout({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 25,
  maxLeftWidth = 75,
  resizable = true,
  mode: controlledMode,
  onModeChange,
  onResize,
  leftTitle = 'PDF Document',
  rightTitle = 'Invoice Data',
  className = '',
}: SplitScreenLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [internalMode, setInternalMode] = useState<LayoutMode>('split');
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  // Use controlled mode if provided, otherwise use internal state
  const mode = controlledMode ?? internalMode;

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const newBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(newBreakpoint);

      // Auto-switch to appropriate mode on breakpoint change
      if (newBreakpoint === 'mobile' && mode === 'split') {
        const newMode = getDefaultMode(newBreakpoint);
        if (onModeChange) {
          onModeChange(newMode);
        } else {
          setInternalMode(newMode);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode, onModeChange]);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable || !isResizableAtBreakpoint(breakpoint)) return;

      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startWidth = leftWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / containerRect.width) * 100;
        const newWidth = constrainWidth(
          startWidth + deltaPercent,
          minLeftWidth,
          maxLeftWidth
        );
        setLeftWidth(newWidth);
        onResize?.(newWidth);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [resizable, breakpoint, leftWidth, minLeftWidth, maxLeftWidth, onResize]
  );

  // Handle mode changes
  const handleModeChange = useCallback(
    (newMode: LayoutMode) => {
      if (onModeChange) {
        onModeChange(newMode);
      } else {
        setInternalMode(newMode);
      }
    },
    [onModeChange]
  );

  // Handle panel collapse
  const handleCollapseLeft = useCallback(() => {
    handleModeChange('form-only');
  }, [handleModeChange]);

  const handleCollapseRight = useCallback(() => {
    handleModeChange('pdf-only');
  }, [handleModeChange]);

  const handleExpand = useCallback(() => {
    handleModeChange('split');
  }, [handleModeChange]);

  // Calculate panel styles
  const leftPanelStyle =
    mode === 'split'
      ? { width: `${leftWidth}%` }
      : mode === 'pdf-only'
      ? { width: '100%' }
      : { width: '0%', display: 'none' as const };

  const rightPanelStyle =
    mode === 'split'
      ? { width: `${100 - leftWidth}%` }
      : mode === 'form-only'
      ? { width: '100%' }
      : { width: '0%', display: 'none' as const };

  const showDivider = mode === 'split' && resizable && isResizableAtBreakpoint(breakpoint);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full ${className}`}
    >
      {/* Toolbar with mode toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="text-sm font-medium text-gray-700">Verification</div>
        <ModeToggle mode={mode} onModeChange={handleModeChange} />
      </div>

      {/* Panels container */}
      <div
        className={`flex flex-1 overflow-hidden ${isDragging ? 'select-none' : ''}`}
      >
        {/* Left Panel (PDF) */}
        {isPanelVisible('left', mode) && (
          <div
            className="flex flex-col overflow-hidden bg-white"
            style={leftPanelStyle}
          >
            <PanelHeader
              title={leftTitle}
              position="left"
              mode={mode}
              onCollapse={handleCollapseLeft}
              onExpand={handleExpand}
            />
            <div className="flex-1 overflow-auto">{leftPanel}</div>
          </div>
        )}

        {/* Resize Divider */}
        {showDivider && (
          <ResizeDivider
            onDragStart={handleDragStart}
            isDragging={isDragging}
            disabled={!resizable}
          />
        )}

        {/* Right Panel (Form) */}
        {isPanelVisible('right', mode) && (
          <div
            className="flex flex-col overflow-hidden bg-white"
            style={rightPanelStyle}
          >
            <PanelHeader
              title={rightTitle}
              position="right"
              mode={mode}
              onCollapse={handleCollapseRight}
              onExpand={handleExpand}
            />
            <div className="flex-1 overflow-auto">{rightPanel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Placeholder Components for PDF and Form panels
// =============================================================================

/**
 * Placeholder for PDF viewer panel (to be replaced by react-pdf in 14.2)
 */
export function PDFPanelPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full bg-gray-50 ${className}`}
    >
      <div className="text-center p-8">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">PDF Viewer</h3>
        <p className="text-sm text-gray-500">
          The PDF document will be displayed here
        </p>
        <p className="text-xs text-gray-400 mt-2">
          (Subtask 14.2: react-pdf integration)
        </p>
      </div>
    </div>
  );
}

/**
 * Placeholder for invoice form panel (to be replaced in 14.3)
 */
export function FormPanelPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full bg-gray-50 ${className}`}
    >
      <div className="text-center p-8">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Invoice Form</h3>
        <p className="text-sm text-gray-500">
          The extracted invoice data will be displayed here
        </p>
        <p className="text-xs text-gray-400 mt-2">
          (Subtask 14.3: InvoiceForm component)
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Export default for convenience
// =============================================================================

export default SplitScreenLayout;
