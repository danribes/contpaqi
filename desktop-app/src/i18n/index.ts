/**
 * i18n Configuration for ContPAQi AI Bridge Desktop App
 * Subtask 18.2: Set up i18n framework in Electron/React app
 *
 * This module initializes i18next with React bindings for
 * internationalization support with English and Spanish languages.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';

// =============================================================================
// Translation Resources
// =============================================================================

const resources = {
  en: {
    translation: enTranslation,
  },
  es: {
    translation: esTranslation,
  },
};

// =============================================================================
// i18n Configuration
// =============================================================================

i18n
  // Detect user language from browser/localStorage
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Translation resources
    resources,

    // Fallback language when translation is missing
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: ['en', 'es'],

    // Default namespace
    defaultNS: 'translation',

    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache detected language in localStorage
      caches: ['localStorage'],
      // Key used in localStorage
      lookupLocalStorage: 'i18nextLng',
    },

    // Interpolation configuration
    interpolation: {
      // React already escapes values to prevent XSS
      escapeValue: false,
    },

    // React-specific options
    react: {
      // Wait for all translations to be loaded
      useSuspense: true,
    },

    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
  });

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the current language code
 * @returns Current language code ('en' or 'es')
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Change the application language
 * @param lng - Language code ('en' or 'es')
 */
export async function changeLanguage(lng: string): Promise<void> {
  await i18n.changeLanguage(lng);
  // Save to localStorage for persistence
  localStorage.setItem('i18nextLng', lng);
}

/**
 * Get list of supported languages
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): string[] {
  return ['en', 'es'];
}

/**
 * Check if a language is supported
 * @param lng - Language code to check
 * @returns true if language is supported
 */
export function isLanguageSupported(lng: string): boolean {
  return getSupportedLanguages().includes(lng);
}

/**
 * Get language display name
 * @param lng - Language code
 * @returns Human-readable language name
 */
export function getLanguageDisplayName(lng: string): string {
  const displayNames: Record<string, string> = {
    en: 'English',
    es: 'Español',
  };
  return displayNames[lng] || lng;
}

/**
 * Load language preference from Windows registry (Electron only)
 * This function attempts to read the language set by the installer
 */
export async function loadLanguageFromRegistry(): Promise<string | null> {
  try {
    const electronAPI = (window as { electronAPI?: { getRegistryLanguage?: () => Promise<string | null> } }).electronAPI;
    if (electronAPI?.getRegistryLanguage) {
      const registryLang = await electronAPI.getRegistryLanguage();
      if (registryLang && isLanguageSupported(registryLang)) {
        return registryLang;
      }
    }
  } catch (error) {
    console.warn('Failed to load language from registry:', error);
  }
  return null;
}

/**
 * Initialize language from installer preference (if available)
 * Should be called once on app startup
 */
export async function initializeLanguagePreference(): Promise<void> {
  // First, check if there's a saved preference in localStorage
  const savedLang = localStorage.getItem('i18nextLng');
  if (savedLang && isLanguageSupported(savedLang)) {
    // Already have a user preference, use it
    return;
  }

  // Try to load from Windows registry (set by installer)
  const registryLang = await loadLanguageFromRegistry();
  if (registryLang) {
    await changeLanguage(registryLang);
  }
}

// Export the i18n instance as default
export default i18n;
