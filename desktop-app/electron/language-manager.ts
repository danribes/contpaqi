/**
 * Language Manager for Electron Main Process
 * Subtask 18.7: Persist language preference across sessions
 *
 * Handles language preference persistence:
 * - Reading/writing to Windows Registry
 * - Getting system locale
 * - IPC handlers for renderer communication
 */

import { app, ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported language codes
 */
export type SupportedLanguage = 'en' | 'es';

/**
 * All supported languages
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es'];

/**
 * Default language when no preference is found
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Windows Registry configuration
 */
export const REGISTRY_CONFIG = {
  /** Registry key path */
  KEY: 'HKCU\\Software\\ContPAQi\\AIBridge',
  /** Value name for language preference */
  VALUE_NAME: 'Language',
  /** Value type for registry */
  VALUE_TYPE: 'REG_SZ',
} as const;

/**
 * IPC channel names for language operations
 */
export const LANGUAGE_IPC_CHANNELS = {
  GET_REGISTRY: 'language:getFromRegistry',
  SET_REGISTRY: 'language:setToRegistry',
  GET_SYSTEM_LOCALE: 'language:getSystemLocale',
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Language preference source
 */
export type LanguageSource = 'registry' | 'localStorage' | 'systemLocale' | 'default';

/**
 * Language preference result
 */
export interface LanguagePreference {
  language: SupportedLanguage;
  source: LanguageSource;
}

/**
 * Registry operation result
 */
export interface RegistryResult {
  success: boolean;
  value?: string;
  error?: string;
}

/**
 * Registry error codes
 */
export type RegistryErrorCode =
  | 'KEY_NOT_FOUND'
  | 'VALUE_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'INVALID_VALUE'
  | 'WRITE_FAILED'
  | 'NOT_WINDOWS'
  | 'UNKNOWN_ERROR';

/**
 * Registry error
 */
export interface RegistryError {
  code: RegistryErrorCode;
  message: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if we're running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string | null | undefined): lang is SupportedLanguage {
  if (!lang) return false;
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Normalize a locale string to a supported language
 * @param locale - Locale string (e.g., "en-US", "es-MX")
 * @returns Supported language code
 */
export function normalizeLanguageCode(locale: string | null | undefined): SupportedLanguage {
  if (!locale) return DEFAULT_LANGUAGE;

  // Extract primary language from locale (e.g., "en-US" -> "en")
  const primaryLang = locale.split(/[-_]/)[0].toLowerCase();

  // Map to supported language
  if (primaryLang === 'es') return 'es';
  return 'en'; // Default to English for all other languages
}

/**
 * Parse a locale string into components
 */
export function parseLocale(locale: string): { language: string; region?: string } {
  if (!locale) return { language: 'en' };

  const parts = locale.split(/[-_]/);
  return {
    language: parts[0].toLowerCase(),
    region: parts[1]?.toUpperCase(),
  };
}

/**
 * Create a registry error
 */
export function createRegistryError(
  code: RegistryErrorCode,
  details?: string
): RegistryError {
  const messages: Record<RegistryErrorCode, string> = {
    KEY_NOT_FOUND: 'Registry key not found',
    VALUE_NOT_FOUND: 'Registry value not found',
    ACCESS_DENIED: 'Access to registry denied',
    INVALID_VALUE: 'Invalid registry value',
    WRITE_FAILED: 'Failed to write to registry',
    NOT_WINDOWS: 'Registry is only available on Windows',
    UNKNOWN_ERROR: 'Unknown registry error',
  };

  return {
    code,
    message: details ? `${messages[code]}: ${details}` : messages[code],
  };
}

// =============================================================================
// Registry Operations
// =============================================================================

/**
 * Read a value from Windows Registry
 * @param key - Registry key path
 * @param valueName - Value name to read
 * @returns Registry result with value or error
 */
export async function readRegistry(
  key: string,
  valueName: string
): Promise<RegistryResult> {
  if (!isWindows()) {
    return {
      success: false,
      error: createRegistryError('NOT_WINDOWS').message,
    };
  }

  try {
    // Use reg.exe to query the registry
    const command = `reg query "${key}" /v "${valueName}"`;
    const { stdout } = await execAsync(command);

    // Parse the output to extract the value
    // Output format: "    Language    REG_SZ    es"
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes(valueName)) {
        const match = line.match(/REG_SZ\s+(.+)/);
        if (match) {
          return {
            success: true,
            value: match[1].trim(),
          };
        }
      }
    }

    return {
      success: false,
      error: createRegistryError('VALUE_NOT_FOUND').message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for common error patterns
    if (errorMessage.includes('not find')) {
      return {
        success: false,
        error: createRegistryError('KEY_NOT_FOUND').message,
      };
    }
    if (errorMessage.includes('Access is denied')) {
      return {
        success: false,
        error: createRegistryError('ACCESS_DENIED').message,
      };
    }

    return {
      success: false,
      error: createRegistryError('UNKNOWN_ERROR', errorMessage).message,
    };
  }
}

/**
 * Write a value to Windows Registry
 * @param key - Registry key path
 * @param valueName - Value name to write
 * @param value - Value to write
 * @returns Registry result indicating success or error
 */
export async function writeRegistry(
  key: string,
  valueName: string,
  value: string
): Promise<RegistryResult> {
  if (!isWindows()) {
    return {
      success: false,
      error: createRegistryError('NOT_WINDOWS').message,
    };
  }

  try {
    // Use reg.exe to add/update the registry value
    // /f forces overwrite without prompt
    const command = `reg add "${key}" /v "${valueName}" /t REG_SZ /d "${value}" /f`;
    await execAsync(command);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Access is denied')) {
      return {
        success: false,
        error: createRegistryError('ACCESS_DENIED').message,
      };
    }

    return {
      success: false,
      error: createRegistryError('WRITE_FAILED', errorMessage).message,
    };
  }
}

// =============================================================================
// Language Operations
// =============================================================================

/**
 * Get language preference from Windows Registry
 * @returns Language code or null if not found/invalid
 */
export async function getLanguageFromRegistry(): Promise<string | null> {
  const result = await readRegistry(
    REGISTRY_CONFIG.KEY,
    REGISTRY_CONFIG.VALUE_NAME
  );

  if (result.success && result.value && isSupportedLanguage(result.value)) {
    return result.value;
  }

  return null;
}

/**
 * Set language preference in Windows Registry
 * @param language - Language code to set
 * @returns Result indicating success or error
 */
export async function setLanguageToRegistry(
  language: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupportedLanguage(language)) {
    return {
      success: false,
      error: `Invalid language code: ${language}`,
    };
  }

  const result = await writeRegistry(
    REGISTRY_CONFIG.KEY,
    REGISTRY_CONFIG.VALUE_NAME,
    language
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Get the system locale from Electron
 * @returns System locale string (e.g., "en-US")
 */
export function getSystemLocale(): string {
  return app.getLocale();
}

/**
 * Get normalized system language
 * @returns Supported language code based on system locale
 */
export function getSystemLanguage(): SupportedLanguage {
  const locale = getSystemLocale();
  return normalizeLanguageCode(locale);
}

/**
 * Resolve language preference from all sources
 * @param localStorage - Value from localStorage (passed from renderer)
 * @returns Language preference with source
 */
export async function resolveLanguagePreference(
  localStorage?: string | null
): Promise<LanguagePreference> {
  // Priority 1: localStorage (user preference from renderer)
  if (localStorage && isSupportedLanguage(localStorage)) {
    return { language: localStorage, source: 'localStorage' };
  }

  // Priority 2: Registry (installer preference)
  const registryLang = await getLanguageFromRegistry();
  if (registryLang && isSupportedLanguage(registryLang)) {
    return { language: registryLang, source: 'registry' };
  }

  // Priority 3: System locale
  const systemLang = getSystemLanguage();
  if (systemLang) {
    return { language: systemLang, source: 'systemLocale' };
  }

  // Priority 4: Default
  return { language: DEFAULT_LANGUAGE, source: 'default' };
}

// =============================================================================
// IPC Handlers
// =============================================================================

/**
 * Register all language-related IPC handlers
 * Call this from the main process during app initialization
 */
export function registerLanguageIpcHandlers(): void {
  // Handler: Get language from registry
  ipcMain.handle(LANGUAGE_IPC_CHANNELS.GET_REGISTRY, async () => {
    return await getLanguageFromRegistry();
  });

  // Handler: Set language to registry
  ipcMain.handle(
    LANGUAGE_IPC_CHANNELS.SET_REGISTRY,
    async (_event, language: string) => {
      return await setLanguageToRegistry(language);
    }
  );

  // Handler: Get system locale
  ipcMain.handle(LANGUAGE_IPC_CHANNELS.GET_SYSTEM_LOCALE, () => {
    return getSystemLocale();
  });
}

/**
 * Remove all language-related IPC handlers
 * Call this during app cleanup if needed
 */
export function removeLanguageIpcHandlers(): void {
  ipcMain.removeHandler(LANGUAGE_IPC_CHANNELS.GET_REGISTRY);
  ipcMain.removeHandler(LANGUAGE_IPC_CHANNELS.SET_REGISTRY);
  ipcMain.removeHandler(LANGUAGE_IPC_CHANNELS.GET_SYSTEM_LOCALE);
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize language preference on app startup
 * This should be called after the app is ready
 * @returns The resolved language preference
 */
export async function initializeLanguage(): Promise<LanguagePreference> {
  // Register IPC handlers
  registerLanguageIpcHandlers();

  // Resolve initial language (without localStorage, as we're in main process)
  const preference = await resolveLanguagePreference();

  console.log(
    `[LanguageManager] Initialized with language: ${preference.language} (source: ${preference.source})`
  );

  return preference;
}
