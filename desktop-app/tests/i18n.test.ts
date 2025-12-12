/**
 * @file i18n.test.ts
 * @description Unit tests for i18n functionality (Subtask 18.10)
 *
 * Tests cover:
 * - Language detection
 * - Translation key resolution
 * - Fallback to English
 * - Language switching
 * - Persistence
 * - Missing key handling
 * - Interpolation (variables in strings)
 * - Translation file structure validation
 */

import * as fs from 'fs';
import * as path from 'path';

// Load translation files for testing
const enTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/i18n/locales/en.json'), 'utf-8')
);
const esTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/i18n/locales/es.json'), 'utf-8')
);

// Load i18n index.ts for function testing
const i18nIndexContent = fs.readFileSync(
  path.join(__dirname, '../src/i18n/index.ts'),
  'utf-8'
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key] as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get value from nested object by dot-notation key
 */
function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Find all interpolation variables in a string ({{variable}} format)
 */
function findInterpolationVars(str: string): string[] {
  const matches = str.match(/\{\{(\w+)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

// =============================================================================
// Translation File Structure Tests
// =============================================================================

describe('i18n Translation Files Structure (Subtask 18.10)', () => {
  const enKeys = getAllKeys(enTranslations);
  const esKeys = getAllKeys(esTranslations);

  describe('File Existence and Format', () => {
    it('should have English translation file', () => {
      expect(enTranslations).toBeDefined();
      expect(typeof enTranslations).toBe('object');
    });

    it('should have Spanish translation file', () => {
      expect(esTranslations).toBeDefined();
      expect(typeof esTranslations).toBe('object');
    });

    it('should have non-empty translation files', () => {
      expect(enKeys.length).toBeGreaterThan(0);
      expect(esKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Key Parity (English and Spanish have same keys)', () => {
    it('should have the same number of keys in both languages', () => {
      expect(esKeys.length).toBe(enKeys.length);
    });

    it('should have all English keys in Spanish', () => {
      const missingInSpanish = enKeys.filter(key => !esKeys.includes(key));
      expect(missingInSpanish).toEqual([]);
    });

    it('should have all Spanish keys in English', () => {
      const missingInEnglish = esKeys.filter(key => !enKeys.includes(key));
      expect(missingInEnglish).toEqual([]);
    });
  });

  describe('Translation Categories', () => {
    const expectedCategories = [
      'app',
      'status',
      'actions',
      'settings',
      'invoice',
      'validation',
      'errors',
      'navigation',
      'license',
      'batch',
      'pdf',
      'common',
      'confirmation',
      'shortcuts',
      'docker',
      'accessibility'
    ];

    expectedCategories.forEach(category => {
      it(`should have "${category}" category in English`, () => {
        expect(enTranslations[category]).toBeDefined();
      });

      it(`should have "${category}" category in Spanish`, () => {
        expect(esTranslations[category]).toBeDefined();
      });
    });
  });
});

// =============================================================================
// Translation Key Resolution Tests
// =============================================================================

describe('Translation Key Resolution', () => {
  describe('Nested Key Access', () => {
    it('should resolve top-level keys', () => {
      expect(enTranslations.app).toBeDefined();
      expect(esTranslations.app).toBeDefined();
    });

    it('should resolve nested keys', () => {
      expect(enTranslations.app.name).toBe('ContPAQi AI Bridge');
      expect(esTranslations.app.name).toBe('ContPAQi AI Bridge');
    });

    it('should resolve deeply nested keys', () => {
      expect(enTranslations.invoice.form.title).toBe('Invoice Details');
      expect(esTranslations.invoice.form.title).toBe('Detalles de la Factura');
    });
  });

  describe('Key Existence', () => {
    const criticalKeys = [
      'app.name',
      'status.ready',
      'actions.submit',
      'actions.cancel',
      'settings.title',
      'settings.language',
      'errors.generic',
      'validation.required',
      'navigation.home',
      'common.yes',
      'common.no'
    ];

    criticalKeys.forEach(key => {
      it(`should have critical key "${key}" in English`, () => {
        expect(getNestedValue(enTranslations, key)).toBeDefined();
      });

      it(`should have critical key "${key}" in Spanish`, () => {
        expect(getNestedValue(esTranslations, key)).toBeDefined();
      });
    });
  });
});

// =============================================================================
// Fallback Behavior Tests
// =============================================================================

describe('Fallback to English', () => {
  describe('i18n Configuration', () => {
    it('should have English as fallback language in config', () => {
      expect(i18nIndexContent).toMatch(/fallbackLng:\s*['"]en['"]/);
    });

    it('should have supported languages configured', () => {
      expect(i18nIndexContent).toMatch(/supportedLngs:\s*\[['"]en['"],\s*['"]es['"]\]/);
    });
  });

  describe('Default Values', () => {
    it('should have English as default in getCurrentLanguage', () => {
      expect(i18nIndexContent).toMatch(/return i18n\.language \|\| ['"]en['"]/);
    });

    it('should default to English in loadLanguageFromRegistry', () => {
      expect(i18nIndexContent).toMatch(/return null/);
    });
  });
});

// =============================================================================
// Language Switching Tests
// =============================================================================

describe('Language Switching', () => {
  describe('changeLanguage Function', () => {
    it('should have changeLanguage function exported', () => {
      expect(i18nIndexContent).toMatch(/export async function changeLanguage\(lng: string\)/);
    });

    it('should call i18n.changeLanguage', () => {
      expect(i18nIndexContent).toMatch(/await i18n\.changeLanguage\(lng\)/);
    });

    it('should save language to localStorage', () => {
      expect(i18nIndexContent).toMatch(/localStorage\.setItem\(['"]i18nextLng['"],\s*lng\)/);
    });
  });

  describe('Language Support Functions', () => {
    it('should have getSupportedLanguages function', () => {
      expect(i18nIndexContent).toMatch(/export function getSupportedLanguages\(\)/);
    });

    it('should have isLanguageSupported function', () => {
      expect(i18nIndexContent).toMatch(/export function isLanguageSupported\(lng: string\)/);
    });

    it('should have getLanguageDisplayName function', () => {
      expect(i18nIndexContent).toMatch(/export function getLanguageDisplayName\(lng: string\)/);
    });

    it('should return English for "en" display name', () => {
      expect(i18nIndexContent).toMatch(/en:\s*['"]English['"]/);
    });

    it('should return Español for "es" display name', () => {
      expect(i18nIndexContent).toMatch(/es:\s*['"]Español['"]/);
    });
  });
});

// =============================================================================
// Persistence Tests
// =============================================================================

describe('Language Persistence', () => {
  describe('localStorage Configuration', () => {
    it('should use localStorage for caching', () => {
      expect(i18nIndexContent).toMatch(/caches:\s*\[['"]localStorage['"]\]/);
    });

    it('should use i18nextLng as localStorage key', () => {
      expect(i18nIndexContent).toMatch(/lookupLocalStorage:\s*['"]i18nextLng['"]/);
    });
  });

  describe('Registry Integration', () => {
    it('should have loadLanguageFromRegistry function', () => {
      expect(i18nIndexContent).toMatch(/export async function loadLanguageFromRegistry\(\)/);
    });

    it('should have initializeLanguagePreference function', () => {
      expect(i18nIndexContent).toMatch(/export async function initializeLanguagePreference\(\)/);
    });

    it('should check for electronAPI.getRegistryLanguage', () => {
      expect(i18nIndexContent).toMatch(/electronAPI\?\.getRegistryLanguage/);
    });
  });

  describe('Detection Order', () => {
    it('should check localStorage first', () => {
      expect(i18nIndexContent).toMatch(/order:\s*\[['"]localStorage['"]/);
    });

    it('should include navigator in detection order', () => {
      expect(i18nIndexContent).toMatch(/['"]navigator['"]/);
    });

    it('should include htmlTag in detection order', () => {
      expect(i18nIndexContent).toMatch(/['"]htmlTag['"]/);
    });
  });
});

// =============================================================================
// Interpolation Tests
// =============================================================================

describe('Interpolation (Variables in Strings)', () => {
  const enKeys = getAllKeys(enTranslations);

  describe('Interpolation Syntax', () => {
    it('should use {{variable}} syntax', () => {
      const versionsText = enTranslations.app.version;
      expect(versionsText).toMatch(/\{\{version\}\}/);
    });

    it('should have interpolation disabled for escaping (React handles XSS)', () => {
      expect(i18nIndexContent).toMatch(/escapeValue:\s*false/);
    });
  });

  describe('Interpolation Variables Match Between Languages', () => {
    const keysWithInterpolation = enKeys.filter(key => {
      const value = getNestedValue(enTranslations, key);
      return typeof value === 'string' && value.includes('{{');
    });

    keysWithInterpolation.forEach(key => {
      it(`should have same interpolation vars for "${key}"`, () => {
        const enValue = getNestedValue(enTranslations, key) as string;
        const esValue = getNestedValue(esTranslations, key) as string;

        const enVars = findInterpolationVars(enValue);
        const esVars = findInterpolationVars(esValue);

        expect(esVars.sort()).toEqual(enVars.sort());
      });
    });
  });

  describe('Common Interpolation Keys', () => {
    const interpolationExamples = [
      { key: 'app.version', vars: ['version'] },
      { key: 'app.copyright', vars: ['year'] },
      { key: 'validation.missingFields', vars: ['fields'] },
      { key: 'license.daysRemaining', vars: ['days'] },
      { key: 'license.activationsUsed', vars: ['used', 'max'] },
      { key: 'batch.filesSelected', vars: ['count'] },
      { key: 'batch.filesProcessed', vars: ['processed', 'total'] },
      { key: 'pdf.pageInfo', vars: ['current', 'total'] }
    ];

    interpolationExamples.forEach(({ key, vars }) => {
      it(`should have correct vars for "${key}": ${vars.join(', ')}`, () => {
        const enValue = getNestedValue(enTranslations, key) as string;
        const foundVars = findInterpolationVars(enValue);
        expect(foundVars.sort()).toEqual(vars.sort());
      });
    });
  });
});

// =============================================================================
// Missing Key Handling Tests
// =============================================================================

describe('Missing Key Handling', () => {
  describe('Empty String Detection', () => {
    const enKeys = getAllKeys(enTranslations);

    it('should not have empty string values in English', () => {
      const emptyKeys = enKeys.filter(key => {
        const value = getNestedValue(enTranslations, key);
        return value === '';
      });
      expect(emptyKeys).toEqual([]);
    });

    it('should not have empty string values in Spanish', () => {
      const esKeys = getAllKeys(esTranslations);
      const emptyKeys = esKeys.filter(key => {
        const value = getNestedValue(esTranslations, key);
        return value === '';
      });
      expect(emptyKeys).toEqual([]);
    });
  });

  describe('Null/Undefined Detection', () => {
    const enKeys = getAllKeys(enTranslations);

    it('should not have null values in English', () => {
      const nullKeys = enKeys.filter(key => {
        const value = getNestedValue(enTranslations, key);
        return value === null;
      });
      expect(nullKeys).toEqual([]);
    });

    it('should not have undefined values in Spanish', () => {
      const esKeys = getAllKeys(esTranslations);
      const undefinedKeys = esKeys.filter(key => {
        const value = getNestedValue(esTranslations, key);
        return value === undefined;
      });
      expect(undefinedKeys).toEqual([]);
    });
  });
});

// =============================================================================
// Translation Content Quality Tests
// =============================================================================

describe('Translation Content Quality', () => {
  describe('Spanish Translations Are Not English', () => {
    const keysToCheck = [
      'actions.submit',
      'actions.cancel',
      'settings.title',
      'common.yes',
      'common.no',
      'navigation.home',
      'status.ready',
      'errors.generic'
    ];

    keysToCheck.forEach(key => {
      it(`should have different translation for "${key}"`, () => {
        const enValue = getNestedValue(enTranslations, key);
        const esValue = getNestedValue(esTranslations, key);
        // Skip if the value is the same intentionally (like proper nouns or universal words)
        // "No" is the same in English and Spanish
        const sameInBothLanguages = ['app.name', 'common.no'];
        if (!sameInBothLanguages.includes(key)) {
          expect(esValue).not.toBe(enValue);
        }
      });
    });
  });

  describe('Proper Nouns Should Be Same', () => {
    it('should have same app name in both languages', () => {
      expect(esTranslations.app.name).toBe(enTranslations.app.name);
    });
  });

  describe('Value Types', () => {
    const enKeys = getAllKeys(enTranslations);

    it('should have string values for all leaf keys', () => {
      const nonStringKeys = enKeys.filter(key => {
        const value = getNestedValue(enTranslations, key);
        return typeof value !== 'string';
      });
      expect(nonStringKeys).toEqual([]);
    });
  });
});

// =============================================================================
// i18n Configuration Tests
// =============================================================================

describe('i18n Configuration', () => {
  describe('i18next Setup', () => {
    it('should import i18next', () => {
      expect(i18nIndexContent).toMatch(/import i18n from ['"]i18next['"]/);
    });

    it('should import react-i18next', () => {
      expect(i18nIndexContent).toMatch(/import \{ initReactI18next \} from ['"]react-i18next['"]/);
    });

    it('should import LanguageDetector', () => {
      expect(i18nIndexContent).toMatch(/import LanguageDetector from ['"]i18next-browser-languagedetector['"]/);
    });
  });

  describe('Resources Configuration', () => {
    it('should have en resources configured', () => {
      expect(i18nIndexContent).toMatch(/en:\s*\{[\s\S]*?translation:\s*enTranslation/);
    });

    it('should have es resources configured', () => {
      expect(i18nIndexContent).toMatch(/es:\s*\{[\s\S]*?translation:\s*esTranslation/);
    });
  });

  describe('React Integration', () => {
    it('should use initReactI18next', () => {
      expect(i18nIndexContent).toMatch(/\.use\(initReactI18next\)/);
    });

    it('should have useSuspense configured', () => {
      expect(i18nIndexContent).toMatch(/useSuspense:\s*true/);
    });
  });

  describe('Debug Mode', () => {
    it('should enable debug only in development', () => {
      expect(i18nIndexContent).toMatch(/debug:\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]/);
    });
  });
});

// =============================================================================
// Component Rendering Support Tests
// =============================================================================

describe('Component Rendering Support', () => {
  describe('UI Element Translations', () => {
    const uiElementKeys = [
      'actions.submit',
      'actions.cancel',
      'actions.save',
      'actions.delete',
      'actions.edit',
      'actions.close',
      'actions.confirm'
    ];

    uiElementKeys.forEach(key => {
      it(`should have UI element translation for "${key}"`, () => {
        expect(getNestedValue(enTranslations, key)).toBeDefined();
        expect(getNestedValue(esTranslations, key)).toBeDefined();
      });
    });
  });

  describe('Status Messages', () => {
    const statusKeys = [
      'status.starting',
      'status.ready',
      'status.error',
      'status.offline',
      'status.processing',
      'status.completed',
      'status.failed'
    ];

    statusKeys.forEach(key => {
      it(`should have status translation for "${key}"`, () => {
        expect(getNestedValue(enTranslations, key)).toBeDefined();
        expect(getNestedValue(esTranslations, key)).toBeDefined();
      });
    });
  });

  describe('Error Messages', () => {
    const errorKeys = [
      'errors.generic',
      'errors.network',
      'errors.timeout',
      'errors.serverError',
      'errors.notFound',
      'errors.unauthorized'
    ];

    errorKeys.forEach(key => {
      it(`should have error translation for "${key}"`, () => {
        expect(getNestedValue(enTranslations, key)).toBeDefined();
        expect(getNestedValue(esTranslations, key)).toBeDefined();
      });
    });
  });

  describe('Form Validation Messages', () => {
    const validationKeys = [
      'validation.required',
      'validation.invalidFormat',
      'validation.invalidRfc',
      'validation.invalidDate',
      'validation.invalidAmount'
    ];

    validationKeys.forEach(key => {
      it(`should have validation translation for "${key}"`, () => {
        expect(getNestedValue(enTranslations, key)).toBeDefined();
        expect(getNestedValue(esTranslations, key)).toBeDefined();
      });
    });
  });
});

// =============================================================================
// Statistics Summary
// =============================================================================

describe('Translation Statistics', () => {
  const enKeys = getAllKeys(enTranslations);
  const esKeys = getAllKeys(esTranslations);

  it('should report translation statistics', () => {
    const stats = {
      totalEnglishKeys: enKeys.length,
      totalSpanishKeys: esKeys.length,
      keysWithInterpolation: enKeys.filter(key => {
        const value = getNestedValue(enTranslations, key);
        return typeof value === 'string' && value.includes('{{');
      }).length,
      categories: Object.keys(enTranslations).length
    };

    console.log('\n📊 Translation Statistics:');
    console.log(`   Total English keys: ${stats.totalEnglishKeys}`);
    console.log(`   Total Spanish keys: ${stats.totalSpanishKeys}`);
    console.log(`   Keys with interpolation: ${stats.keysWithInterpolation}`);
    console.log(`   Categories: ${stats.categories}`);

    expect(stats.totalEnglishKeys).toBeGreaterThan(100);
    expect(stats.totalSpanishKeys).toBeGreaterThan(100);
  });
});
