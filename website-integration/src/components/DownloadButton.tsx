import React, { useState, useEffect } from 'react';

// Type definitions
interface DownloadConfig {
  version: string;
  downloadUrl: string;
  releaseUrl: string;
  repository: string;
  fileName: string;
  updatedAt: string;
  requirements: {
    os: string;
    docker: string;
    dotnet: string;
  };
}

// =============================================================================
// Download Button Component
// =============================================================================
// Fetches download configuration and renders a download button with version info.
// Automatically updates when new releases are published.

interface DownloadButtonProps {
  className?: string;
  showRequirements?: boolean;
  showVersion?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  className = '',
  showRequirements = false,
  showVersion = true,
}) => {
  const [config, setConfig] = useState<DownloadConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/config/download.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load download config');
        return res.json();
      })
      .then((data: DownloadConfig) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading download config:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <button
        disabled
        className={`bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  if (error || !config) {
    // Fallback to latest release URL
    return (
      <a
        href="https://github.com/danribes/contpaqi/releases/latest"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors ${className}`}
      >
        Download Latest
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Download Button */}
      <a
        href={config.downloadUrl}
        className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl ${className}`}
      >
        <DownloadIcon />
        <span>
          Download {showVersion && `v${config.version}`}
        </span>
      </a>

      {/* File info */}
      <p className="text-sm text-gray-500">
        {config.fileName} • Windows Installer
      </p>

      {/* Requirements */}
      {showRequirements && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">System Requirements:</h4>
          <ul className="list-disc list-inside text-gray-600">
            <li>{config.requirements.os}</li>
            <li>{config.requirements.docker}</li>
            <li>{config.requirements.dotnet}</li>
          </ul>
        </div>
      )}

      {/* Release notes link */}
      <a
        href={config.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        View release notes →
      </a>
    </div>
  );
};

// =============================================================================
// Compact Download Link
// =============================================================================
// Simple inline link for use in navigation or footers

export const DownloadLink: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [version, setVersion] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>(
    'https://github.com/danribes/contpaqi/releases/latest'
  );

  useEffect(() => {
    fetch('/config/download.json')
      .then((res) => res.json())
      .then((data: DownloadConfig) => {
        setVersion(data.version);
        setDownloadUrl(data.downloadUrl);
      })
      .catch(() => {
        // Use fallback URL
      });
  }, []);

  return (
    <a
      href={downloadUrl}
      className={`text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      Download {version && `v${version}`}
    </a>
  );
};

// =============================================================================
// Download Icon (SVG)
// =============================================================================

const DownloadIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

// =============================================================================
// Hero Download Section
// =============================================================================
// Full download section for landing page hero

export const HeroDownloadSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          ContPAQi AI Bridge
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Procesamiento inteligente de facturas con inteligencia artificial.
          Extrae datos automáticamente y envíalos a ContPAQi.
        </p>

        <DownloadButton showRequirements={true} />

        <div className="mt-8 flex justify-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <CheckIcon /> Instalación fácil
          </span>
          <span className="flex items-center gap-1">
            <CheckIcon /> Soporte en español
          </span>
          <span className="flex items-center gap-1">
            <CheckIcon /> Actualizaciones automáticas
          </span>
        </div>
      </div>
    </section>
  );
};

const CheckIcon: React.FC = () => (
  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

export default DownloadButton;
