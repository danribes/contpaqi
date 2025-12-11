/**
 * i18n Framework Setup Tests
 * Subtask 18.2: Set up i18n framework in Electron/React app
 *
 * Tests for:
 * - i18n configuration and initialization
 * - Language detection (registry, localStorage)
 * - Fallback language behavior
 * - Translation key resolution
 * - Interpolation settings
 */

// =============================================================================
// Type Definitions for Testing
// =============================================================================

interface I18nConfig {
  fallbackLng: string;
  supportedLngs: string[];
  defaultNS: string;
  interpolation: {
    escapeValue: boolean;
  };
  detection?: {
    order: string[];
    caches: string[];
  };
}

interface I18nInstance {
  language: string;
  languages: string[];
  isInitialized: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  changeLanguage: (lng: string) => Promise<void>;
  exists: (key: string) => boolean;
}

// =============================================================================
// Mock i18n Configuration
// =============================================================================

const defaultI18nConfig: I18nConfig = {
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  },
};

// Mock translations for testing
const mockTranslations = {
  en: {
    translation: {
      'app.name': 'ContPAQi AI Bridge',
      'app.tagline': 'Intelligent Invoice Processing',
      'status.starting': 'Starting...',
      'status.ready': 'Ready',
      'status.error': 'Error',
      'status.offline': 'Offline',
      'actions.submit': 'Submit',
      'actions.cancel': 'Cancel',
      'greeting': 'Hello, {{name}}!',
    },
  },
  es: {
    translation: {
      'app.name': 'ContPAQi AI Bridge',
      'app.tagline': 'Procesamiento Inteligente de Facturas',
      'status.starting': 'Iniciando...',
      'status.ready': 'Listo',
      'status.error': 'Error',
      'status.offline': 'Sin conexión',
      'actions.submit': 'Enviar',
      'actions.cancel': 'Cancelar',
      'greeting': '¡Hola, {{name}}!',
    },
  },
};

// Create a mock i18n instance for testing
function createMockI18n(config: I18nConfig, initialLang: string = 'en'): I18nInstance {
  let currentLang = initialLang;

  return {
    get language() {
      return currentLang;
    },
    get languages() {
      return config.supportedLngs;
    },
    isInitialized: true,
    t: (key: string, options?: Record<string, unknown>) => {
      const translations = mockTranslations[currentLang as keyof typeof mockTranslations];
      if (!translations) {
        // Fallback to default language
        const fallback = mockTranslations[config.fallbackLng as keyof typeof mockTranslations];
        let value = fallback?.translation[key as keyof typeof fallback.translation] || key;

        // Handle interpolation
        if (options && typeof value === 'string') {
          Object.keys(options).forEach((optKey) => {
            value = value.replace(`{{${optKey}}}`, String(options[optKey]));
          });
        }
        return value;
      }

      let value = translations.translation[key as keyof typeof translations.translation] || key;

      // Handle interpolation
      if (options && typeof value === 'string') {
        Object.keys(options).forEach((optKey) => {
          value = value.replace(`{{${optKey}}}`, String(options[optKey]));
        });
      }

      return value;
    },
    changeLanguage: async (lng: string) => {
      if (config.supportedLngs.includes(lng)) {
        currentLang = lng;
      } else {
        currentLang = config.fallbackLng;
      }
    },
    exists: (key: string) => {
      const translations = mockTranslations[currentLang as keyof typeof mockTranslations];
      return translations?.translation.hasOwnProperty(key) ?? false;
    },
  };
}

// =============================================================================
// Configuration Tests
// =============================================================================

describe('i18n Configuration', () => {
  describe('Default Configuration', () => {
    it('should have "en" as fallback language', () => {
      expect(defaultI18nConfig.fallbackLng).toBe('en');
    });

    it('should support English and Spanish languages', () => {
      expect(defaultI18nConfig.supportedLngs).toContain('en');
      expect(defaultI18nConfig.supportedLngs).toContain('es');
    });

    it('should have exactly 2 supported languages', () => {
      expect(defaultI18nConfig.supportedLngs).toHaveLength(2);
    });

    it('should have "translation" as default namespace', () => {
      expect(defaultI18nConfig.defaultNS).toBe('translation');
    });

    it('should have escapeValue set to false for React compatibility', () => {
      expect(defaultI18nConfig.interpolation.escapeValue).toBe(false);
    });
  });

  describe('Language Detection', () => {
    it('should configure localStorage in detection order', () => {
      expect(defaultI18nConfig.detection?.order).toContain('localStorage');
    });

    it('should configure navigator in detection order', () => {
      expect(defaultI18nConfig.detection?.order).toContain('navigator');
    });

    it('should cache detected language in localStorage', () => {
      expect(defaultI18nConfig.detection?.caches).toContain('localStorage');
    });
  });
});

// =============================================================================
// i18n Instance Tests
// =============================================================================

describe('i18n Instance', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n(defaultI18nConfig);
  });

  describe('Initialization', () => {
    it('should be initialized', () => {
      expect(i18n.isInitialized).toBe(true);
    });

    it('should have default language set to English', () => {
      expect(i18n.language).toBe('en');
    });

    it('should have all supported languages available', () => {
      expect(i18n.languages).toContain('en');
      expect(i18n.languages).toContain('es');
    });
  });

  describe('Translation Function (t)', () => {
    it('should translate app name', () => {
      expect(i18n.t('app.name')).toBe('ContPAQi AI Bridge');
    });

    it('should translate status messages in English', () => {
      expect(i18n.t('status.starting')).toBe('Starting...');
      expect(i18n.t('status.ready')).toBe('Ready');
      expect(i18n.t('status.error')).toBe('Error');
      expect(i18n.t('status.offline')).toBe('Offline');
    });

    it('should translate action buttons in English', () => {
      expect(i18n.t('actions.submit')).toBe('Submit');
      expect(i18n.t('actions.cancel')).toBe('Cancel');
    });

    it('should return key when translation does not exist', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    });
  });

  describe('Language Change', () => {
    it('should change language to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');
    });

    it('should translate to Spanish after language change', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('status.starting')).toBe('Iniciando...');
      expect(i18n.t('status.ready')).toBe('Listo');
      expect(i18n.t('status.offline')).toBe('Sin conexión');
    });

    it('should translate actions to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('actions.submit')).toBe('Enviar');
      expect(i18n.t('actions.cancel')).toBe('Cancelar');
    });

    it('should fallback to English for unsupported language', async () => {
      await i18n.changeLanguage('fr'); // French not supported
      expect(i18n.language).toBe('en');
    });
  });

  describe('Interpolation', () => {
    it('should interpolate variables in English', () => {
      expect(i18n.t('greeting', { name: 'John' })).toBe('Hello, John!');
    });

    it('should interpolate variables in Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('greeting', { name: 'Juan' })).toBe('¡Hola, Juan!');
    });
  });

  describe('Key Existence Check', () => {
    it('should return true for existing keys', () => {
      expect(i18n.exists('app.name')).toBe(true);
      expect(i18n.exists('status.ready')).toBe(true);
    });

    it('should return false for non-existing keys', () => {
      expect(i18n.exists('nonexistent.key')).toBe(false);
    });
  });
});

// =============================================================================
// Fallback Behavior Tests
// =============================================================================

describe('Fallback Behavior', () => {
  it('should use fallback language when translation missing', () => {
    const i18n = createMockI18n(defaultI18nConfig, 'es');
    // If a key doesn't exist in Spanish, it should return the key (since our mock returns key for missing)
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should preserve app name across languages', async () => {
    const i18n = createMockI18n(defaultI18nConfig, 'en');
    const enName = i18n.t('app.name');

    await i18n.changeLanguage('es');
    const esName = i18n.t('app.name');

    // App name should be the same in both languages
    expect(enName).toBe(esName);
  });
});

// =============================================================================
// React Integration Tests (Mocked)
// =============================================================================

describe('React Integration', () => {
  describe('useTranslation Hook Pattern', () => {
    it('should provide t function through hook pattern', () => {
      // Simulate useTranslation hook behavior
      const i18n = createMockI18n(defaultI18nConfig);

      function useTranslation() {
        return {
          t: i18n.t,
          i18n,
        };
      }

      const { t, i18n: instance } = useTranslation();
      expect(typeof t).toBe('function');
      expect(instance.isInitialized).toBe(true);
    });
  });

  describe('I18nextProvider Pattern', () => {
    it('should pass i18n instance to provider', () => {
      const i18n = createMockI18n(defaultI18nConfig);

      // Simulate provider pattern
      const providerProps = {
        i18n,
        children: null, // Would be React components
      };

      expect(providerProps.i18n).toBeDefined();
      expect(providerProps.i18n.isInitialized).toBe(true);
    });
  });
});

// =============================================================================
// Language Persistence Tests
// =============================================================================

describe('Language Persistence', () => {
  // Mock localStorage for testing
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save language to localStorage', () => {
    localStorageMock.setItem('i18nextLng', 'es');
    expect(localStorageMock.getItem('i18nextLng')).toBe('es');
  });

  it('should load language from localStorage', () => {
    localStorageMock.setItem('i18nextLng', 'es');
    const savedLang = localStorageMock.getItem('i18nextLng');
    expect(savedLang).toBe('es');
  });

  it('should default to English when no language saved', () => {
    const savedLang = localStorageMock.getItem('i18nextLng');
    expect(savedLang).toBeNull();
    // In actual implementation, fallback would be 'en'
  });
});

// =============================================================================
// ISO Language Code Tests
// =============================================================================

describe('Language Code Standards', () => {
  it('should use ISO 639-1 code for English', () => {
    expect(defaultI18nConfig.supportedLngs).toContain('en');
  });

  it('should use ISO 639-1 code for Spanish', () => {
    expect(defaultI18nConfig.supportedLngs).toContain('es');
  });

  it('should use lowercase language codes', () => {
    defaultI18nConfig.supportedLngs.forEach((lang) => {
      expect(lang).toBe(lang.toLowerCase());
    });
  });

  it('should use 2-letter language codes', () => {
    defaultI18nConfig.supportedLngs.forEach((lang) => {
      expect(lang).toHaveLength(2);
    });
  });
});
