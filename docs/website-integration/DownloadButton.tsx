/**
 * Download Button Component for ContPAQi Website
 *
 * This component fetches the latest download information and displays
 * a download button with version and file details.
 *
 * INSTALLATION:
 * 1. Copy this file to contpaqi-website/src/components/DownloadButton.tsx
 * 2. Import and use in your download page
 *
 * Usage:
 * ```tsx
 * import { DownloadButton } from '@/components/DownloadButton';
 *
 * export default function DownloadPage() {
 *   return <DownloadButton />;
 * }
 * ```
 */

'use client';

import { useEffect, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

interface DownloadInfo {
  version: string;
  downloadUrl: string;
  releaseUrl: string;
  sha256?: string;
  fileSize?: number;
  updatedAt: string;
  requirements: {
    os: string;
    docker: string;
    dotnet: string;
  };
}

interface DownloadButtonProps {
  className?: string;
  showDetails?: boolean;
  showChecksum?: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// Download Info Hook
// =============================================================================

export function useDownloadInfo() {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDownloadInfo() {
      try {
        // Try fetching from public JSON file
        const response = await fetch('/download-info.json');

        if (!response.ok) {
          throw new Error('Failed to fetch download information');
        }

        const data = await response.json();
        setDownloadInfo(data);
      } catch (err) {
        console.error('Error fetching download info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Fallback to environment variables or defaults
        setDownloadInfo({
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          downloadUrl:
            process.env.NEXT_PUBLIC_DOWNLOAD_URL ||
            'https://github.com/danribes/contpaqi/releases/latest',
          releaseUrl: 'https://github.com/danribes/contpaqi/releases/latest',
          updatedAt: new Date().toISOString(),
          requirements: {
            os: 'Windows 10/11 (64-bit)',
            docker: 'Docker Desktop',
            dotnet: '.NET 6.0 Runtime',
          },
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDownloadInfo();
  }, []);

  return { downloadInfo, loading, error };
}

// =============================================================================
// Download Button Component
// =============================================================================

export function DownloadButton({
  className = '',
  showDetails = true,
  showChecksum = false,
}: DownloadButtonProps) {
  const { downloadInfo, loading, error } = useDownloadInfo();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-14 bg-gray-200 rounded-lg w-64"></div>
      </div>
    );
  }

  if (!downloadInfo) {
    return (
      <a
        href="https://github.com/danribes/contpaqi/releases/latest"
        className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download Latest Version
      </a>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Main Download Button */}
      <a
        href={downloadInfo.downloadUrl}
        className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
        download
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download v{downloadInfo.version}
      </a>

      {/* Version Details */}
      {showDetails && (
        <div className="text-sm text-gray-600 text-center">
          <p>
            Version {downloadInfo.version} •{' '}
            {formatFileSize(downloadInfo.fileSize)} • Windows 64-bit
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Released {formatDate(downloadInfo.updatedAt)}
          </p>
        </div>
      )}

      {/* Checksum */}
      {showChecksum && downloadInfo.sha256 && (
        <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 max-w-md break-all">
          <span className="font-semibold">SHA256:</span> {downloadInfo.sha256}
        </div>
      )}

      {/* Release Notes Link */}
      <a
        href={downloadInfo.releaseUrl}
        className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Release Notes →
      </a>
    </div>
  );
}

// =============================================================================
// Download Card Component (Alternative Layout)
// =============================================================================

export function DownloadCard({ className = '' }: { className?: string }) {
  const { downloadInfo, loading } = useDownloadInfo();

  if (loading) {
    return (
      <div className={`animate-pulse bg-white rounded-xl shadow-lg p-8 ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
        <div className="h-12 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!downloadInfo) return null;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            ContPAQi AI Bridge
          </h3>
          <p className="text-gray-600">Version {downloadInfo.version}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>{formatFileSize(downloadInfo.fileSize)}</p>
          <p>Windows 64-bit</p>
        </div>
      </div>

      <a
        href={downloadInfo.downloadUrl}
        className="flex items-center justify-center gap-3 w-full px-6 py-4 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        download
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download Now
      </a>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">System Requirements</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {downloadInfo.requirements.os}
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {downloadInfo.requirements.docker}
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {downloadInfo.requirements.dotnet}
          </li>
        </ul>
      </div>

      {downloadInfo.sha256 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Verify Download (SHA256)
          </summary>
          <code className="mt-2 block p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 break-all">
            {downloadInfo.sha256}
          </code>
        </details>
      )}
    </div>
  );
}

export default DownloadButton;
