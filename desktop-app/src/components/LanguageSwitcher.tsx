/**
 * Language Switcher Component
 * Subtask 18.6: Implement language switcher component
 *
 * Provides a UI component for switching between supported languages.
 * Supports three display variants:
 * - dropdown: Select dropdown with flag icons
 * - buttons: Button group for each language
 * - compact: Simple toggle showing language code
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Language option with metadata
 */
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Props for the LanguageSwitcher component
 */
export interface LanguageSwitcherProps {
  /** Override current language (defaults to i18n.language) */
  currentLanguage?: string;
  /** Callback when language changes */
  onLanguageChange?: (lng: string) => void;
  /** Show flag emoji icons */
  showFlags?: boolean;
  /** Show native language name (e.g., "Español" vs "Spanish") */
  showNativeName?: boolean;
  /** Display variant */
  variant?: 'dropdown' | 'buttons' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported languages with metadata
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇲🇽',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get language option by code
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Check if a language code is valid/supported
 */
export function isValidLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Get all other languages (not the current one)
 */
export function getOtherLanguages(currentCode: string): LanguageOption[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.code !== currentCode);
}

/**
 * Get the next language in rotation (for compact toggle)
 */
export function getNextLanguage(currentCode: string): string {
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  const currentIndex = codes.indexOf(currentCode);
  const nextIndex = (currentIndex + 1) % codes.length;
  return codes[nextIndex];
}

/**
 * Format language display text
 */
export function formatLanguageDisplay(
  lang: LanguageOption,
  showFlag: boolean,
  showNativeName: boolean
): string {
  const parts: string[] = [];
  if (showFlag) parts.push(lang.flag);
  if (showNativeName) {
    parts.push(lang.nativeName);
  } else {
    parts.push(lang.name);
  }
  return parts.join(' ');
}

/**
 * Get flag for language code
 */
export function getFlagForLanguage(code: string): string | null {
  const lang = getLanguageByCode(code);
  return lang?.flag || null;
}

// =============================================================================
// Styling Helper Functions
// =============================================================================

/**
 * Get container classes for dropdown variant
 */
export function getContainerClasses(additionalClasses?: string): string {
  const base = 'relative inline-block text-left';
  return additionalClasses ? `${base} ${additionalClasses}` : base;
}

/**
 * Get button classes for dropdown trigger
 */
export function getDropdownButtonClasses(isOpen: boolean): string {
  const base =
    'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  if (isOpen) {
    return `${base} ring-2 ring-primary-500`;
  }
  return base;
}

/**
 * Get classes for dropdown menu
 */
export function getMenuClasses(isOpen: boolean): string {
  const base =
    'absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none';
  if (isOpen) {
    return base;
  }
  return `${base} hidden`;
}

/**
 * Get classes for menu items
 */
export function getMenuItemClasses(isSelected: boolean): string {
  const base = 'flex items-center gap-2 px-4 py-2 text-sm cursor-pointer';
  if (isSelected) {
    return `${base} bg-gray-100 text-gray-900`;
  }
  return `${base} text-gray-700 hover:bg-gray-50`;
}

/**
 * Get button classes for button variant
 */
export function getButtonVariantClasses(isActive: boolean): string {
  const base = 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors';
  if (isActive) {
    return `${base} bg-primary-600 text-white`;
  }
  return `${base} bg-gray-100 text-gray-700 hover:bg-gray-200`;
}

/**
 * Get classes for compact variant
 */
export function getCompactClasses(): string {
  return 'px-2 py-1 text-xs font-bold uppercase text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer';
}

// =============================================================================
// Accessibility Helpers
// =============================================================================

/**
 * Get ARIA attributes for dropdown button
 */
export function getDropdownButtonAria(
  isOpen: boolean,
  currentLangName: string
): Record<string, unknown> {
  return {
    role: 'combobox',
    'aria-label': `Language selector. Current language: ${currentLangName}`,
    'aria-expanded': isOpen,
    'aria-haspopup': true,
  };
}

/**
 * Get ARIA attributes for language option
 */
export function getLanguageOptionAria(
  langCode: string,
  currentLang: string
): Record<string, unknown> {
  return {
    role: 'option',
    'aria-current': langCode === currentLang ? 'true' : undefined,
  };
}

/**
 * Handle keyboard navigation
 */
export function handleKeyDown(
  key: string,
  isOpen: boolean
): 'toggle' | 'close' | 'select' | 'none' {
  switch (key) {
    case 'Enter':
    case ' ':
      return isOpen ? 'select' : 'toggle';
    case 'Escape':
      return isOpen ? 'close' : 'none';
    case 'ArrowDown':
    case 'ArrowUp':
      return isOpen ? 'none' : 'toggle';
    default:
      return 'none';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Dropdown variant of the language switcher
 */
function DropdownVariant({
  currentLang,
  showFlags,
  showNativeName,
  onSelect,
  className,
}: {
  currentLang: LanguageOption;
  showFlags: boolean;
  showNativeName: boolean;
  onSelect: (code: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      const action = handleKeyDown(event.key, isOpen);
      switch (action) {
        case 'toggle':
          setIsOpen((prev) => !prev);
          event.preventDefault();
          break;
        case 'close':
          setIsOpen(false);
          event.preventDefault();
          break;
        case 'select':
          // Select first non-current language
          const others = getOtherLanguages(currentLang.code);
          if (others.length > 0) {
            onSelect(others[0].code);
          }
          setIsOpen(false);
          event.preventDefault();
          break;
      }
    },
    [isOpen, currentLang.code, onSelect]
  );

  const handleSelect = (code: string) => {
    if (code !== currentLang.code) {
      onSelect(code);
    }
    setIsOpen(false);
  };

  const displayText = formatLanguageDisplay(
    currentLang,
    showFlags,
    showNativeName
  );

  return (
    <div ref={containerRef} className={getContainerClasses(className)}>
      <button
        type="button"
        className={getDropdownButtonClasses(isOpen)}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyPress}
        {...getDropdownButtonAria(isOpen, currentLang.name)}
      >
        <span>{displayText}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div className={getMenuClasses(isOpen)} role="listbox">
        <div className="py-1">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className={getMenuItemClasses(lang.code === currentLang.code)}
              onClick={() => handleSelect(lang.code)}
              {...getLanguageOptionAria(lang.code, currentLang.code)}
            >
              {showFlags && <span className="text-base">{lang.flag}</span>}
              <span>
                {showNativeName ? lang.nativeName : lang.name}
              </span>
              {lang.code === currentLang.code && (
                <svg
                  className="w-4 h-4 ml-auto text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Button group variant of the language switcher
 */
function ButtonsVariant({
  currentLang,
  showFlags,
  showNativeName,
  onSelect,
  className,
}: {
  currentLang: LanguageOption;
  showFlags: boolean;
  showNativeName: boolean;
  onSelect: (code: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex gap-1 p-1 bg-gray-50 rounded-lg ${className || ''}`}
      role="group"
      aria-label="Language selection"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = lang.code === currentLang.code;
        return (
          <button
            key={lang.code}
            type="button"
            className={getButtonVariantClasses(isActive)}
            onClick={() => onSelect(lang.code)}
            aria-pressed={isActive}
            aria-label={`Select ${lang.name}`}
          >
            {showFlags && <span className="mr-1">{lang.flag}</span>}
            {showNativeName ? lang.nativeName : lang.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact toggle variant of the language switcher
 */
function CompactVariant({
  currentLang,
  onSelect,
  className,
}: {
  currentLang: LanguageOption;
  onSelect: (code: string) => void;
  className?: string;
}) {
  const handleToggle = () => {
    const nextLang = getNextLanguage(currentLang.code);
    onSelect(nextLang);
  };

  return (
    <button
      type="button"
      className={`${getCompactClasses()} ${className || ''}`}
      onClick={handleToggle}
      aria-label={`Current language: ${currentLang.name}. Click to switch.`}
    >
      {currentLang.code.toUpperCase()}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Language Switcher Component
 *
 * A flexible language selection component that supports multiple display variants.
 *
 * @example
 * // Default dropdown
 * <LanguageSwitcher />
 *
 * @example
 * // Button group variant
 * <LanguageSwitcher variant="buttons" />
 *
 * @example
 * // Compact toggle
 * <LanguageSwitcher variant="compact" />
 *
 * @example
 * // Without flags
 * <LanguageSwitcher showFlags={false} />
 */
export function LanguageSwitcher({
  currentLanguage,
  onLanguageChange,
  showFlags = true,
  showNativeName = true,
  variant = 'dropdown',
  className,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  // Use provided language or get from i18n
  const langCode = currentLanguage || i18n.language || 'en';
  const currentLang = getLanguageByCode(langCode) || SUPPORTED_LANGUAGES[0];

  const handleSelect = async (code: string) => {
    // Don't do anything if selecting the same language
    if (code === langCode) return;

    // Validate language code
    if (!isValidLanguageCode(code)) {
      console.warn(`Invalid language code: ${code}`);
      return;
    }

    // Call the i18n changeLanguage
    try {
      await i18n.changeLanguage(code);
      // Also save to localStorage for persistence
      localStorage.setItem('i18nextLng', code);
    } catch (error) {
      console.error('Failed to change language:', error);
    }

    // Call optional callback
    if (onLanguageChange) {
      onLanguageChange(code);
    }
  };

  // Render the appropriate variant
  switch (variant) {
    case 'buttons':
      return (
        <ButtonsVariant
          currentLang={currentLang}
          showFlags={showFlags}
          showNativeName={showNativeName}
          onSelect={handleSelect}
          className={className}
        />
      );
    case 'compact':
      return (
        <CompactVariant
          currentLang={currentLang}
          onSelect={handleSelect}
          className={className}
        />
      );
    case 'dropdown':
    default:
      return (
        <DropdownVariant
          currentLang={currentLang}
          showFlags={showFlags}
          showNativeName={showNativeName}
          onSelect={handleSelect}
          className={className}
        />
      );
  }
}

// Default export
export default LanguageSwitcher;
