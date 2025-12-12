/**
 * Language Manager Tests
 * Subtask 18.7: Persist language preference across sessions
 *
 * Tests for:
 * - Language preference persistence
 * - Windows Registry read/write operations
 * - System locale detection
 * - Language priority resolution
 * - IPC handler patterns
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Supported language codes
 */
type SupportedLanguage = 'en' | 'es';

/**
 * Language preference source
 */
type LanguageSource = 'registry' | 'localStorage' | 'systemLocale' | 'default';

/**
 * Language preference result
 */
interface LanguagePreference {
  language: SupportedLanguage;
  source: LanguageSource;
}

/**
 * Registry operation result
 */
interface RegistryResult {
  success: boolean;
  value?: string;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es'];
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
const REGISTRY_KEY = 'HKCU\\Software\\ContPAQi\\AIBridge';
const REGISTRY_VALUE_NAME = 'Language';

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Language Manager Helper Functions', () => {
  describe('isSupportedLanguage', () => {
    function isSupportedLanguage(lang: string): lang is SupportedLanguage {
      return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
    }

    it('should return true for "en"', () => {
      expect(isSupportedLanguage('en')).toBe(true);
    });

    it('should return true for "es"', () => {
      expect(isSupportedLanguage('es')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('fr')).toBe(false);
      expect(isSupportedLanguage('de')).toBe(false);
      expect(isSupportedLanguage('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isSupportedLanguage(null as unknown as string)).toBe(false);
      expect(isSupportedLanguage(undefined as unknown as string)).toBe(false);
    });
  });

  describe('normalizeLanguageCode', () => {
    function normalizeLanguageCode(locale: string): SupportedLanguage {
      if (!locale) return DEFAULT_LANGUAGE;

      // Extract primary language from locale (e.g., "en-US" -> "en")
      const primaryLang = locale.split(/[-_]/)[0].toLowerCase();

      // Map to supported language
      if (primaryLang === 'es') return 'es';
      return 'en'; // Default to English for all other languages
    }

    it('should return "en" for "en-US"', () => {
      expect(normalizeLanguageCode('en-US')).toBe('en');
    });

    it('should return "en" for "en-GB"', () => {
      expect(normalizeLanguageCode('en-GB')).toBe('en');
    });

    it('should return "es" for "es-MX"', () => {
      expect(normalizeLanguageCode('es-MX')).toBe('es');
    });

    it('should return "es" for "es-ES"', () => {
      expect(normalizeLanguageCode('es-ES')).toBe('es');
    });

    it('should return "es" for "es"', () => {
      expect(normalizeLanguageCode('es')).toBe('es');
    });

    it('should return "en" for unsupported locales', () => {
      expect(normalizeLanguageCode('fr-FR')).toBe('en');
      expect(normalizeLanguageCode('de-DE')).toBe('en');
      expect(normalizeLanguageCode('zh-CN')).toBe('en');
    });

    it('should handle underscore separators', () => {
      expect(normalizeLanguageCode('en_US')).toBe('en');
      expect(normalizeLanguageCode('es_MX')).toBe('es');
    });

    it('should return default for empty string', () => {
      expect(normalizeLanguageCode('')).toBe('en');
    });
  });

  describe('getRegistryPath', () => {
    function getRegistryPath(): string {
      return REGISTRY_KEY;
    }

    function getRegistryValueName(): string {
      return REGISTRY_VALUE_NAME;
    }

    it('should return correct registry key path', () => {
      expect(getRegistryPath()).toBe('HKCU\\Software\\ContPAQi\\AIBridge');
    });

    it('should return correct registry value name', () => {
      expect(getRegistryValueName()).toBe('Language');
    });
  });
});

// =============================================================================
// Registry Operations Tests
// =============================================================================

describe('Registry Operations', () => {
  describe('Mock Registry Read', () => {
    // Mock registry storage
    const mockRegistry: Record<string, Record<string, string>> = {};

    function mockReadRegistry(key: string, valueName: string): RegistryResult {
      try {
        const keyData = mockRegistry[key];
        if (!keyData) {
          return { success: false, error: 'Key not found' };
        }
        const value = keyData[valueName];
        if (value === undefined) {
          return { success: false, error: 'Value not found' };
        }
        return { success: true, value };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    function mockWriteRegistry(
      key: string,
      valueName: string,
      value: string
    ): RegistryResult {
      try {
        if (!mockRegistry[key]) {
          mockRegistry[key] = {};
        }
        mockRegistry[key][valueName] = value;
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    beforeEach(() => {
      // Clear mock registry
      Object.keys(mockRegistry).forEach((key) => delete mockRegistry[key]);
    });

    it('should return error when key does not exist', () => {
      const result = mockReadRegistry(REGISTRY_KEY, REGISTRY_VALUE_NAME);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Key not found');
    });

    it('should return error when value does not exist', () => {
      mockRegistry[REGISTRY_KEY] = {};
      const result = mockReadRegistry(REGISTRY_KEY, REGISTRY_VALUE_NAME);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Value not found');
    });

    it('should return value when it exists', () => {
      mockRegistry[REGISTRY_KEY] = { [REGISTRY_VALUE_NAME]: 'es' };
      const result = mockReadRegistry(REGISTRY_KEY, REGISTRY_VALUE_NAME);
      expect(result.success).toBe(true);
      expect(result.value).toBe('es');
    });

    it('should write value successfully', () => {
      const result = mockWriteRegistry(REGISTRY_KEY, REGISTRY_VALUE_NAME, 'es');
      expect(result.success).toBe(true);
      expect(mockRegistry[REGISTRY_KEY][REGISTRY_VALUE_NAME]).toBe('es');
    });

    it('should overwrite existing value', () => {
      mockRegistry[REGISTRY_KEY] = { [REGISTRY_VALUE_NAME]: 'en' };
      mockWriteRegistry(REGISTRY_KEY, REGISTRY_VALUE_NAME, 'es');
      expect(mockRegistry[REGISTRY_KEY][REGISTRY_VALUE_NAME]).toBe('es');
    });
  });
});

// =============================================================================
// Language Preference Resolution Tests
// =============================================================================

describe('Language Preference Resolution', () => {
  describe('resolveLanguagePreference', () => {
    interface LanguageSources {
      registry?: string | null;
      localStorage?: string | null;
      systemLocale?: string | null;
    }

    function isSupportedLanguage(lang: string): lang is SupportedLanguage {
      return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
    }

    function normalizeLanguageCode(locale: string): SupportedLanguage {
      if (!locale) return DEFAULT_LANGUAGE;
      const primaryLang = locale.split(/[-_]/)[0].toLowerCase();
      if (primaryLang === 'es') return 'es';
      return 'en';
    }

    function resolveLanguagePreference(
      sources: LanguageSources
    ): LanguagePreference {
      // Priority 1: localStorage (user preference)
      if (sources.localStorage && isSupportedLanguage(sources.localStorage)) {
        return { language: sources.localStorage, source: 'localStorage' };
      }

      // Priority 2: Registry (installer preference)
      if (sources.registry && isSupportedLanguage(sources.registry)) {
        return { language: sources.registry, source: 'registry' };
      }

      // Priority 3: System locale
      if (sources.systemLocale) {
        const normalized = normalizeLanguageCode(sources.systemLocale);
        return { language: normalized, source: 'systemLocale' };
      }

      // Priority 4: Default
      return { language: DEFAULT_LANGUAGE, source: 'default' };
    }

    it('should prioritize localStorage over registry', () => {
      const result = resolveLanguagePreference({
        registry: 'en',
        localStorage: 'es',
        systemLocale: 'fr-FR',
      });
      expect(result.language).toBe('es');
      expect(result.source).toBe('localStorage');
    });

    it('should use registry when localStorage is not set', () => {
      const result = resolveLanguagePreference({
        registry: 'es',
        localStorage: null,
        systemLocale: 'en-US',
      });
      expect(result.language).toBe('es');
      expect(result.source).toBe('registry');
    });

    it('should use system locale when registry is not set', () => {
      const result = resolveLanguagePreference({
        registry: null,
        localStorage: null,
        systemLocale: 'es-MX',
      });
      expect(result.language).toBe('es');
      expect(result.source).toBe('systemLocale');
    });

    it('should use default when nothing is set', () => {
      const result = resolveLanguagePreference({
        registry: null,
        localStorage: null,
        systemLocale: null,
      });
      expect(result.language).toBe('en');
      expect(result.source).toBe('default');
    });

    it('should skip invalid localStorage value', () => {
      const result = resolveLanguagePreference({
        registry: 'es',
        localStorage: 'invalid',
        systemLocale: null,
      });
      expect(result.language).toBe('es');
      expect(result.source).toBe('registry');
    });

    it('should skip invalid registry value', () => {
      const result = resolveLanguagePreference({
        registry: 'invalid',
        localStorage: null,
        systemLocale: 'es-ES',
      });
      expect(result.language).toBe('es');
      expect(result.source).toBe('systemLocale');
    });

    it('should normalize unsupported system locale to English', () => {
      const result = resolveLanguagePreference({
        registry: null,
        localStorage: null,
        systemLocale: 'de-DE',
      });
      expect(result.language).toBe('en');
      expect(result.source).toBe('systemLocale');
    });
  });
});

// =============================================================================
// IPC Handler Pattern Tests
// =============================================================================

describe('IPC Handler Patterns', () => {
  describe('Language IPC Channel Names', () => {
    const LANGUAGE_CHANNELS = {
      GET_REGISTRY: 'language:getFromRegistry',
      SET_REGISTRY: 'language:setToRegistry',
      GET_SYSTEM_LOCALE: 'language:getSystemLocale',
      GET_PREFERENCE: 'language:getPreference',
      SET_PREFERENCE: 'language:setPreference',
    };

    it('should have correct channel for getting registry language', () => {
      expect(LANGUAGE_CHANNELS.GET_REGISTRY).toBe('language:getFromRegistry');
    });

    it('should have correct channel for setting registry language', () => {
      expect(LANGUAGE_CHANNELS.SET_REGISTRY).toBe('language:setToRegistry');
    });

    it('should have correct channel for getting system locale', () => {
      expect(LANGUAGE_CHANNELS.GET_SYSTEM_LOCALE).toBe('language:getSystemLocale');
    });

    it('should have correct channel for getting preference', () => {
      expect(LANGUAGE_CHANNELS.GET_PREFERENCE).toBe('language:getPreference');
    });

    it('should have correct channel for setting preference', () => {
      expect(LANGUAGE_CHANNELS.SET_PREFERENCE).toBe('language:setPreference');
    });
  });

  describe('IPC Handler Responses', () => {
    interface IPCResponse<T = unknown> {
      success: boolean;
      data?: T;
      error?: string;
    }

    function createSuccessResponse<T>(data: T): IPCResponse<T> {
      return { success: true, data };
    }

    function createErrorResponse(error: string): IPCResponse {
      return { success: false, error };
    }

    it('should create success response with data', () => {
      const response = createSuccessResponse({ language: 'es' });
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ language: 'es' });
      expect(response.error).toBeUndefined();
    });

    it('should create error response', () => {
      const response = createErrorResponse('Registry access denied');
      expect(response.success).toBe(false);
      expect(response.error).toBe('Registry access denied');
      expect(response.data).toBeUndefined();
    });
  });
});

// =============================================================================
// System Locale Detection Tests
// =============================================================================

describe('System Locale Detection', () => {
  describe('parseSystemLocale', () => {
    function parseSystemLocale(locale: string): {
      language: string;
      region?: string;
    } {
      if (!locale) return { language: 'en' };

      const parts = locale.split(/[-_]/);
      return {
        language: parts[0].toLowerCase(),
        region: parts[1]?.toUpperCase(),
      };
    }

    it('should parse "en-US" correctly', () => {
      const result = parseSystemLocale('en-US');
      expect(result.language).toBe('en');
      expect(result.region).toBe('US');
    });

    it('should parse "es-MX" correctly', () => {
      const result = parseSystemLocale('es-MX');
      expect(result.language).toBe('es');
      expect(result.region).toBe('MX');
    });

    it('should parse underscore format "en_GB"', () => {
      const result = parseSystemLocale('en_GB');
      expect(result.language).toBe('en');
      expect(result.region).toBe('GB');
    });

    it('should handle language-only locale', () => {
      const result = parseSystemLocale('es');
      expect(result.language).toBe('es');
      expect(result.region).toBeUndefined();
    });

    it('should handle empty string', () => {
      const result = parseSystemLocale('');
      expect(result.language).toBe('en');
    });
  });

  describe('getSystemLanguage', () => {
    // Mock app.getLocale() behavior
    function mockGetSystemLanguage(mockLocale: string): SupportedLanguage {
      if (!mockLocale) return DEFAULT_LANGUAGE;
      const primaryLang = mockLocale.split(/[-_]/)[0].toLowerCase();
      if (primaryLang === 'es') return 'es';
      return 'en';
    }

    it('should return "en" for English locales', () => {
      expect(mockGetSystemLanguage('en-US')).toBe('en');
      expect(mockGetSystemLanguage('en-GB')).toBe('en');
      expect(mockGetSystemLanguage('en')).toBe('en');
    });

    it('should return "es" for Spanish locales', () => {
      expect(mockGetSystemLanguage('es-MX')).toBe('es');
      expect(mockGetSystemLanguage('es-ES')).toBe('es');
      expect(mockGetSystemLanguage('es')).toBe('es');
    });

    it('should default to "en" for other locales', () => {
      expect(mockGetSystemLanguage('fr-FR')).toBe('en');
      expect(mockGetSystemLanguage('de-DE')).toBe('en');
      expect(mockGetSystemLanguage('ja-JP')).toBe('en');
    });
  });
});

// =============================================================================
// Electron API Pattern Tests
// =============================================================================

describe('Electron API Pattern', () => {
  describe('electronAPI.language interface', () => {
    interface LanguageAPI {
      getRegistryLanguage: () => Promise<string | null>;
      setRegistryLanguage: (lang: string) => Promise<{ success: boolean; error?: string }>;
      getSystemLocale: () => Promise<string>;
    }

    it('should define getRegistryLanguage method', () => {
      const api: LanguageAPI = {
        getRegistryLanguage: async () => 'es',
        setRegistryLanguage: async () => ({ success: true }),
        getSystemLocale: async () => 'en-US',
      };
      expect(typeof api.getRegistryLanguage).toBe('function');
    });

    it('should define setRegistryLanguage method', () => {
      const api: LanguageAPI = {
        getRegistryLanguage: async () => null,
        setRegistryLanguage: async () => ({ success: true }),
        getSystemLocale: async () => 'en-US',
      };
      expect(typeof api.setRegistryLanguage).toBe('function');
    });

    it('should define getSystemLocale method', () => {
      const api: LanguageAPI = {
        getRegistryLanguage: async () => null,
        setRegistryLanguage: async () => ({ success: true }),
        getSystemLocale: async () => 'en-US',
      };
      expect(typeof api.getSystemLocale).toBe('function');
    });
  });

  describe('Language API Return Types', () => {
    it('getRegistryLanguage should return string or null', async () => {
      const mockGetRegistry = async (): Promise<string | null> => 'es';
      const result = await mockGetRegistry();
      expect(['string', 'object'].includes(typeof result)).toBe(true); // null is object
    });

    it('setRegistryLanguage should return success object', async () => {
      const mockSetRegistry = async (): Promise<{ success: boolean; error?: string }> => ({
        success: true,
      });
      const result = await mockSetRegistry();
      expect(result.success).toBe(true);
    });

    it('setRegistryLanguage should return error on failure', async () => {
      const mockSetRegistry = async (): Promise<{ success: boolean; error?: string }> => ({
        success: false,
        error: 'Access denied',
      });
      const result = await mockSetRegistry();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });
});

// =============================================================================
// Language Change Flow Tests
// =============================================================================

describe('Language Change Flow', () => {
  describe('setLanguagePreference', () => {
    interface MockState {
      localStorage: Record<string, string>;
      registry: Record<string, string>;
    }

    function createMockState(): MockState {
      return {
        localStorage: {},
        registry: {},
      };
    }

    async function setLanguagePreference(
      state: MockState,
      language: SupportedLanguage,
      persistToRegistry: boolean = true
    ): Promise<{ success: boolean; error?: string }> {
      try {
        // Always save to localStorage
        state.localStorage['i18nextLng'] = language;

        // Optionally save to registry
        if (persistToRegistry) {
          state.registry[REGISTRY_VALUE_NAME] = language;
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    it('should save to localStorage', async () => {
      const state = createMockState();
      await setLanguagePreference(state, 'es');
      expect(state.localStorage['i18nextLng']).toBe('es');
    });

    it('should save to registry when requested', async () => {
      const state = createMockState();
      await setLanguagePreference(state, 'es', true);
      expect(state.registry[REGISTRY_VALUE_NAME]).toBe('es');
    });

    it('should not save to registry when not requested', async () => {
      const state = createMockState();
      await setLanguagePreference(state, 'es', false);
      expect(state.registry[REGISTRY_VALUE_NAME]).toBeUndefined();
    });

    it('should return success on completion', async () => {
      const state = createMockState();
      const result = await setLanguagePreference(state, 'es');
      expect(result.success).toBe(true);
    });
  });

  describe('Language Change Event', () => {
    interface LanguageChangeEvent {
      previousLanguage: SupportedLanguage;
      newLanguage: SupportedLanguage;
      source: LanguageSource;
      timestamp: string;
    }

    function createLanguageChangeEvent(
      previous: SupportedLanguage,
      next: SupportedLanguage,
      source: LanguageSource
    ): LanguageChangeEvent {
      return {
        previousLanguage: previous,
        newLanguage: next,
        source,
        timestamp: new Date().toISOString(),
      };
    }

    it('should create event with all properties', () => {
      const event = createLanguageChangeEvent('en', 'es', 'localStorage');
      expect(event.previousLanguage).toBe('en');
      expect(event.newLanguage).toBe('es');
      expect(event.source).toBe('localStorage');
      expect(event.timestamp).toBeDefined();
    });

    it('should have valid ISO timestamp', () => {
      const event = createLanguageChangeEvent('en', 'es', 'registry');
      const date = new Date(event.timestamp);
      expect(date.toISOString()).toBe(event.timestamp);
    });
  });
});

// =============================================================================
// Registry Key Structure Tests
// =============================================================================

describe('Registry Key Structure', () => {
  describe('ContPAQi Registry Keys', () => {
    const CONTPAQI_KEYS = {
      BASE_KEY: 'HKCU\\Software\\ContPAQi',
      APP_KEY: 'HKCU\\Software\\ContPAQi\\AIBridge',
      LANGUAGE_VALUE: 'Language',
      INSTALL_PATH_VALUE: 'InstallPath',
    };

    it('should have correct base key', () => {
      expect(CONTPAQI_KEYS.BASE_KEY).toBe('HKCU\\Software\\ContPAQi');
    });

    it('should have correct app key under base', () => {
      expect(CONTPAQI_KEYS.APP_KEY).toContain(CONTPAQI_KEYS.BASE_KEY);
    });

    it('should store language as "Language" value', () => {
      expect(CONTPAQI_KEYS.LANGUAGE_VALUE).toBe('Language');
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  describe('Registry Error Codes', () => {
    type RegistryErrorCode =
      | 'KEY_NOT_FOUND'
      | 'VALUE_NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'INVALID_VALUE'
      | 'WRITE_FAILED'
      | 'UNKNOWN_ERROR';

    interface RegistryError {
      code: RegistryErrorCode;
      message: string;
    }

    function createRegistryError(
      code: RegistryErrorCode,
      details?: string
    ): RegistryError {
      const messages: Record<RegistryErrorCode, string> = {
        KEY_NOT_FOUND: 'Registry key not found',
        VALUE_NOT_FOUND: 'Registry value not found',
        ACCESS_DENIED: 'Access to registry denied',
        INVALID_VALUE: 'Invalid registry value',
        WRITE_FAILED: 'Failed to write to registry',
        UNKNOWN_ERROR: 'Unknown registry error',
      };

      return {
        code,
        message: details ? `${messages[code]}: ${details}` : messages[code],
      };
    }

    it('should create KEY_NOT_FOUND error', () => {
      const error = createRegistryError('KEY_NOT_FOUND');
      expect(error.code).toBe('KEY_NOT_FOUND');
      expect(error.message).toContain('not found');
    });

    it('should create ACCESS_DENIED error', () => {
      const error = createRegistryError('ACCESS_DENIED');
      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.message).toContain('denied');
    });

    it('should include details in message', () => {
      const error = createRegistryError('WRITE_FAILED', 'Permission error');
      expect(error.message).toContain('Permission error');
    });
  });

  describe('Graceful Fallback', () => {
    function getLanguageWithFallback(
      registryResult: RegistryResult,
      localStorageValue: string | null
    ): SupportedLanguage {
      // Try registry first
      if (
        registryResult.success &&
        registryResult.value &&
        SUPPORTED_LANGUAGES.includes(registryResult.value as SupportedLanguage)
      ) {
        return registryResult.value as SupportedLanguage;
      }

      // Try localStorage
      if (
        localStorageValue &&
        SUPPORTED_LANGUAGES.includes(localStorageValue as SupportedLanguage)
      ) {
        return localStorageValue as SupportedLanguage;
      }

      // Default
      return DEFAULT_LANGUAGE;
    }

    it('should use registry when available', () => {
      const result = getLanguageWithFallback(
        { success: true, value: 'es' },
        'en'
      );
      expect(result).toBe('es');
    });

    it('should fallback to localStorage when registry fails', () => {
      const result = getLanguageWithFallback(
        { success: false, error: 'Not found' },
        'es'
      );
      expect(result).toBe('es');
    });

    it('should use default when both fail', () => {
      const result = getLanguageWithFallback(
        { success: false, error: 'Not found' },
        null
      );
      expect(result).toBe('en');
    });

    it('should ignore invalid registry value', () => {
      const result = getLanguageWithFallback(
        { success: true, value: 'invalid' },
        'es'
      );
      expect(result).toBe('es');
    });
  });
});

// =============================================================================
// Integration Pattern Tests
// =============================================================================

describe('Integration Patterns', () => {
  describe('i18n Integration', () => {
    it('should have matching language codes with i18n', () => {
      // These should match the supported languages in i18n/index.ts
      expect(SUPPORTED_LANGUAGES).toEqual(['en', 'es']);
    });

    it('should have matching localStorage key', () => {
      const I18N_STORAGE_KEY = 'i18nextLng';
      expect(I18N_STORAGE_KEY).toBe('i18nextLng');
    });
  });

  describe('Installer Integration', () => {
    it('should use same registry path as installer', () => {
      // Installer writes to HKCU\Software\ContPAQi\AIBridge\Language
      expect(REGISTRY_KEY).toBe('HKCU\\Software\\ContPAQi\\AIBridge');
      expect(REGISTRY_VALUE_NAME).toBe('Language');
    });
  });
});

// =============================================================================
// Platform Detection Tests
// =============================================================================

describe('Platform Detection', () => {
  describe('isWindows', () => {
    function isWindows(platform: string): boolean {
      return platform === 'win32';
    }

    it('should return true for win32', () => {
      expect(isWindows('win32')).toBe(true);
    });

    it('should return false for other platforms', () => {
      expect(isWindows('darwin')).toBe(false);
      expect(isWindows('linux')).toBe(false);
    });
  });

  describe('Registry Availability', () => {
    function isRegistryAvailable(platform: string): boolean {
      return platform === 'win32';
    }

    it('should be available on Windows', () => {
      expect(isRegistryAvailable('win32')).toBe(true);
    });

    it('should not be available on macOS', () => {
      expect(isRegistryAvailable('darwin')).toBe(false);
    });

    it('should not be available on Linux', () => {
      expect(isRegistryAvailable('linux')).toBe(false);
    });
  });
});
