/**
 * PDF Viewer Component
 * Subtask 14.2: Implement PDF viewer with react-pdf (zoom, navigation)
 * Subtask 14.4: Implement confidence-based highlighting (bounding box overlays)
 *
 * Features:
 * - PDF rendering with react-pdf
 * - Page navigation (prev/next, go to page)
 * - Zoom controls (zoom in/out, fit width/page, presets)
 * - Keyboard shortcuts
 * - Loading and error states
 * - Bounding box highlight overlays for field confidence
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  PDFHighlightOverlay,
  type HighlightConfig,
} from './ConfidenceHighlighting';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =============================================================================
// Types
// =============================================================================

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface PDFViewerProps {
  /** URL or File object of the PDF to display */
  file: string | File | null;
  /** Initial page to display (default: 1) */
  initialPage?: number;
  /** Initial zoom scale (default: 1.0) */
  initialScale?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when document loads */
  onDocumentLoad?: (numPages: number) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Additional CSS classes */
  className?: string;
  /** Highlight configurations for bounding box overlays */
  highlights?: HighlightConfig[];
  /** Currently active/focused field name */
  activeHighlight?: string;
}

interface ZoomOptions {
  minScale: number;
  maxScale: number;
  step: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ZOOM_OPTIONS: ZoomOptions = {
  minScale: 0.5,
  maxScale: 3.0,
  step: 0.25,
};

const PRESET_ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

// =============================================================================
// Helper Functions (exported for testing)
// =============================================================================

export function goToPage(
  targetPage: number,
  totalPages: number
): number {
  if (targetPage < 1) return 1;
  if (targetPage > totalPages) return totalPages;
  return targetPage;
}

export function canGoNext(currentPage: number, totalPages: number): boolean {
  return currentPage < totalPages;
}

export function canGoPrevious(currentPage: number): boolean {
  return currentPage > 1;
}

export function zoomIn(
  currentScale: number,
  options: ZoomOptions = DEFAULT_ZOOM_OPTIONS
): number {
  const newScale = currentScale + options.step;
  return Math.min(newScale, options.maxScale);
}

export function zoomOut(
  currentScale: number,
  options: ZoomOptions = DEFAULT_ZOOM_OPTIONS
): number {
  const newScale = currentScale - options.step;
  return Math.max(newScale, options.minScale);
}

export function setZoom(
  targetScale: number,
  options: ZoomOptions = DEFAULT_ZOOM_OPTIONS
): number {
  return Math.max(options.minScale, Math.min(targetScale, options.maxScale));
}

export function canZoomIn(
  currentScale: number,
  options: ZoomOptions = DEFAULT_ZOOM_OPTIONS
): boolean {
  return currentScale < options.maxScale;
}

export function canZoomOut(
  currentScale: number,
  options: ZoomOptions = DEFAULT_ZOOM_OPTIONS
): boolean {
  return currentScale > options.minScale;
}

export function formatZoomPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

// =============================================================================
// Toolbar Component
// =============================================================================

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  loadingState: LoadingState;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (scale: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
}

function PDFToolbar({
  currentPage,
  totalPages,
  scale,
  loadingState,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitWidth,
  onFitPage,
}: ToolbarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const isEnabled = loadingState === 'loaded' && totalPages > 0;

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      onGoToPage(page);
    }
    setPageInput(String(currentPage));
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevPage}
          disabled={!isEnabled || !canGoPrevious(currentPage)}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page (←)"
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex items-center gap-1 text-sm">
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            disabled={!isEnabled}
            className="w-12 px-2 py-1 text-center border border-gray-300 rounded text-sm disabled:bg-gray-100"
          />
          <span className="text-gray-500">/</span>
          <span className="text-gray-700">{totalPages || '-'}</span>
        </div>

        <button
          onClick={onNextPage}
          disabled={!isEnabled || !canGoNext(currentPage, totalPages)}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page (→)"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          disabled={!isEnabled || !canZoomOut(scale)}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom out (Ctrl+-)"
        >
          <MinusIcon />
        </button>

        <select
          value={scale}
          onChange={(e) => onSetZoom(parseFloat(e.target.value))}
          disabled={!isEnabled}
          className="px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100"
        >
          {PRESET_ZOOM_LEVELS.map((level) => (
            <option key={level} value={level}>
              {formatZoomPercent(level)}
            </option>
          ))}
        </select>

        <button
          onClick={onZoomIn}
          disabled={!isEnabled || !canZoomIn(scale)}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in (Ctrl++)"
        >
          <PlusIcon />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={onFitWidth}
          disabled={!isEnabled}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Fit width (Ctrl+1)"
        >
          Width
        </button>

        <button
          onClick={onFitPage}
          disabled={!isEnabled}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Fit page (Ctrl+0)"
        >
          Page
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <svg
        className="animate-spin h-8 w-8 text-primary-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm text-gray-600">Loading document...</span>
    </div>
  );
}

// =============================================================================
// Main PDF Viewer Component
// =============================================================================

export function PDFViewer({
  file,
  initialPage = 1,
  initialScale = 1.0,
  onPageChange,
  onDocumentLoad,
  onError,
  className = '',
  highlights = [],
  activeHighlight,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  // Handle document load success
  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      setLoadingState('loaded');
      setError(null);
      onDocumentLoad?.(numPages);
    },
    [onDocumentLoad]
  );

  // Handle document load error
  const handleDocumentLoadError = useCallback(
    (err: Error) => {
      setLoadingState('error');
      setError(err.message);
      onError?.(err);
    },
    [onError]
  );

  // Handle page load success (to get page dimensions)
  const handlePageLoadSuccess = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      setPageSize({ width, height });
    },
    []
  );

  // Page navigation
  const handleGoToPage = useCallback(
    (page: number) => {
      const newPage = goToPage(page, totalPages);
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    },
    [totalPages, onPageChange]
  );

  const handlePrevPage = useCallback(() => {
    handleGoToPage(currentPage - 1);
  }, [currentPage, handleGoToPage]);

  const handleNextPage = useCallback(() => {
    handleGoToPage(currentPage + 1);
  }, [currentPage, handleGoToPage]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((s) => zoomIn(s));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => zoomOut(s));
  }, []);

  const handleSetZoom = useCallback((newScale: number) => {
    setScale(setZoom(newScale));
  }, []);

  // Fit options
  const handleFitWidth = useCallback(() => {
    if (!containerRef.current || pageSize.width === 0) return;
    const containerWidth = containerRef.current.clientWidth - 40; // padding
    const newScale = containerWidth / pageSize.width;
    setScale(setZoom(newScale));
  }, [pageSize.width]);

  const handleFitPage = useCallback(() => {
    if (!containerRef.current || pageSize.width === 0 || pageSize.height === 0) return;
    const containerWidth = containerRef.current.clientWidth - 40;
    const containerHeight = containerRef.current.clientHeight - 40;
    const fitW = containerWidth / pageSize.width;
    const fitH = containerHeight / pageSize.height;
    const newScale = Math.min(fitW, fitH);
    setScale(setZoom(newScale));
  }, [pageSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loadingState !== 'loaded') return;

      const cmdOrCtrl = e.ctrlKey || e.metaKey;

      // Page navigation
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
        return;
      }

      // Zoom with Ctrl/Cmd
      if (cmdOrCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Fit options
      if (cmdOrCtrl && e.key === '1') {
        e.preventDefault();
        handleFitWidth();
        return;
      }
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        handleFitPage();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    loadingState,
    handleNextPage,
    handlePrevPage,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleFitPage,
  ]);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setLoadingState('loading');
      setCurrentPage(initialPage);
      setError(null);
    } else {
      setLoadingState('idle');
      setTotalPages(0);
      setCurrentPage(1);
    }
  }, [file, initialPage]);

  // Render idle state (no file)
  if (!file) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <PDFToolbar
          currentPage={0}
          totalPages={0}
          scale={scale}
          loadingState="idle"
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onGoToPage={handleGoToPage}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onFitWidth={handleFitWidth}
          onFitPage={handleFitPage}
        />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
            <p className="text-sm">No document loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <PDFToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        loadingState={loadingState}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onGoToPage={handleGoToPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSetZoom={handleSetZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 flex justify-center"
      >
        {loadingState === 'loading' && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        )}

        {loadingState === 'error' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium">Failed to load document</p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        <Document
          file={file}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading=""
          error=""
          className={loadingState === 'loaded' ? 'py-4' : 'hidden'}
        >
          <div ref={pageRef} className="relative inline-block">
            <Page
              pageNumber={currentPage}
              scale={scale}
              onLoadSuccess={handlePageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
            {/* Confidence highlight overlays */}
            {highlights.length > 0 && pageSize.width > 0 && (
              <PDFHighlightOverlay
                highlights={highlights}
                activeField={activeHighlight}
                pageWidth={pageSize.width}
                pageHeight={pageSize.height}
                scale={scale}
              />
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}

export default PDFViewer;
