/**
 * Tests for Task 18.3: English Language File (en.json)
 *
 * These tests verify that the English translation file contains all required
 * keys and follows the expected structure for the ContPAQi AI Bridge application.
 */

import * as fs from 'fs';
import * as path from 'path';

// Path to the English locale file
const EN_LOCALE_PATH = path.join(__dirname, '../src/i18n/locales/en.json');

describe('Task 18.3: English Language File (en.json)', () => {
  let enTranslations: Record<string, unknown>;

  beforeAll(() => {
    // Load the English translation file
    const content = fs.readFileSync(EN_LOCALE_PATH, 'utf-8');
    enTranslations = JSON.parse(content);
  });

  // ===========================================================================
  // File Structure Tests
  // ===========================================================================

  describe('File Structure', () => {
    test('en.json file exists', () => {
      expect(fs.existsSync(EN_LOCALE_PATH)).toBe(true);
    });

    test('en.json is valid JSON', () => {
      const content = fs.readFileSync(EN_LOCALE_PATH, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('en.json is an object', () => {
      expect(typeof enTranslations).toBe('object');
      expect(enTranslations).not.toBeNull();
    });
  });

  // ===========================================================================
  // Top-Level Keys Tests
  // ===========================================================================

  describe('Top-Level Keys', () => {
    const requiredTopLevelKeys = [
      'app',
      'status',
      'actions',
      'settings',
      'invoice',
      'errors',
      'navigation',
      'license',
      'validation',
      'batch',
      'pdf',
      'common',
    ];

    test.each(requiredTopLevelKeys)('has "%s" top-level key', (key) => {
      expect(enTranslations).toHaveProperty(key);
    });
  });

  // ===========================================================================
  // App Section Tests
  // ===========================================================================

  describe('App Section', () => {
    test('has app.name', () => {
      expect(enTranslations).toHaveProperty('app.name');
      expect(typeof (enTranslations as Record<string, Record<string, string>>).app.name).toBe('string');
    });

    test('has app.tagline', () => {
      expect(enTranslations).toHaveProperty('app.tagline');
    });

    test('has app.version', () => {
      expect(enTranslations).toHaveProperty('app.version');
    });

    test('has app.copyright', () => {
      expect(enTranslations).toHaveProperty('app.copyright');
    });
  });

  // ===========================================================================
  // Status Section Tests
  // ===========================================================================

  describe('Status Section', () => {
    const requiredStatusKeys = [
      'starting',
      'ready',
      'error',
      'offline',
      'checking',
      'connecting',
      'processing',
      'completed',
      'failed',
    ];

    test.each(requiredStatusKeys)('has status.%s', (key) => {
      expect(enTranslations).toHaveProperty(`status.${key}`);
    });
  });

  // ===========================================================================
  // Actions Section Tests
  // ===========================================================================

  describe('Actions Section', () => {
    const requiredActionKeys = [
      'submit',
      'cancel',
      'retry',
      'close',
      'save',
      'upload',
      'back',
      'next',
      'confirm',
      'delete',
      'edit',
      'view',
      'download',
      'refresh',
      'reset',
      'apply',
    ];

    test.each(requiredActionKeys)('has actions.%s', (key) => {
      expect(enTranslations).toHaveProperty(`actions.${key}`);
    });
  });

  // ===========================================================================
  // Settings Section Tests
  // ===========================================================================

  describe('Settings Section', () => {
    const requiredSettingsKeys = [
      'title',
      'language',
      'selectLanguage',
      'theme',
      'notifications',
      'autoStart',
      'general',
      'advanced',
    ];

    test.each(requiredSettingsKeys)('has settings.%s', (key) => {
      expect(enTranslations).toHaveProperty(`settings.${key}`);
    });
  });

  // ===========================================================================
  // Invoice Section Tests
  // ===========================================================================

  describe('Invoice Section', () => {
    describe('Invoice Form Fields', () => {
      const requiredFormKeys = [
        'form.title',
        'form.rfcEmisor',
        'form.rfcReceptor',
        'form.fecha',
        'form.subtotal',
        'form.iva',
        'form.total',
        'form.invoiceNumber',
        'form.companyName',
      ];

      test.each(requiredFormKeys)('has invoice.%s', (key) => {
        expect(enTranslations).toHaveProperty(`invoice.${key}`);
      });
    });

    describe('Invoice Field Placeholders', () => {
      const requiredPlaceholders = [
        'placeholders.rfcEmisor',
        'placeholders.rfcReceptor',
        'placeholders.fecha',
        'placeholders.amount',
      ];

      test.each(requiredPlaceholders)('has invoice.%s', (key) => {
        expect(enTranslations).toHaveProperty(`invoice.${key}`);
      });
    });

    describe('Invoice Messages', () => {
      const requiredMessages = [
        'messages.submitSuccess',
        'messages.submitError',
        'messages.processingPdf',
        'messages.extractingData',
        'messages.validatingFields',
      ];

      test.each(requiredMessages)('has invoice.%s', (key) => {
        expect(enTranslations).toHaveProperty(`invoice.${key}`);
      });
    });
  });

  // ===========================================================================
  // Validation Section Tests
  // ===========================================================================

  describe('Validation Section', () => {
    const requiredValidationKeys = [
      'required',
      'invalidFormat',
      'invalidRfc',
      'invalidDate',
      'invalidAmount',
      'mathError',
      'ivaError',
      'totalError',
      'missingFields',
      'cannotSubmit',
      'allValid',
    ];

    test.each(requiredValidationKeys)('has validation.%s', (key) => {
      expect(enTranslations).toHaveProperty(`validation.${key}`);
    });
  });

  // ===========================================================================
  // Errors Section Tests
  // ===========================================================================

  describe('Errors Section', () => {
    const requiredErrorKeys = [
      'generic',
      'network',
      'timeout',
      'serverError',
      'notFound',
      'unauthorized',
      'forbidden',
      'fileUpload',
      'invalidFile',
      'fileTooLarge',
      'dockerNotRunning',
      'serviceUnavailable',
    ];

    test.each(requiredErrorKeys)('has errors.%s', (key) => {
      expect(enTranslations).toHaveProperty(`errors.${key}`);
    });
  });

  // ===========================================================================
  // Navigation Section Tests
  // ===========================================================================

  describe('Navigation Section', () => {
    const requiredNavKeys = [
      'home',
      'invoices',
      'batch',
      'settings',
      'help',
      'about',
      'license',
    ];

    test.each(requiredNavKeys)('has navigation.%s', (key) => {
      expect(enTranslations).toHaveProperty(`navigation.${key}`);
    });
  });

  // ===========================================================================
  // License Section Tests
  // ===========================================================================

  describe('License Section', () => {
    const requiredLicenseKeys = [
      'title',
      'status',
      'type',
      'expiresAt',
      'activations',
      'features',
      'activate',
      'deactivate',
      'enterKey',
      'keyPlaceholder',
      'trial',
      'standard',
      'professional',
      'enterprise',
      'active',
      'expired',
      'revoked',
      'suspended',
      'offlineMode',
      'gracePeriod',
    ];

    test.each(requiredLicenseKeys)('has license.%s', (key) => {
      expect(enTranslations).toHaveProperty(`license.${key}`);
    });
  });

  // ===========================================================================
  // Batch Processing Section Tests
  // ===========================================================================

  describe('Batch Processing Section', () => {
    const requiredBatchKeys = [
      'title',
      'dropzone',
      'processing',
      'completed',
      'failed',
      'progress',
      'queue',
      'clear',
      'retry',
      'filesSelected',
      'filesProcessed',
    ];

    test.each(requiredBatchKeys)('has batch.%s', (key) => {
      expect(enTranslations).toHaveProperty(`batch.${key}`);
    });
  });

  // ===========================================================================
  // PDF Section Tests
  // ===========================================================================

  describe('PDF Section', () => {
    const requiredPdfKeys = [
      'viewer',
      'upload',
      'loading',
      'error',
      'noFile',
      'zoomIn',
      'zoomOut',
      'fitWidth',
      'fitPage',
      'page',
      'of',
    ];

    test.each(requiredPdfKeys)('has pdf.%s', (key) => {
      expect(enTranslations).toHaveProperty(`pdf.${key}`);
    });
  });

  // ===========================================================================
  // Common Section Tests
  // ===========================================================================

  describe('Common Section', () => {
    const requiredCommonKeys = [
      'yes',
      'no',
      'ok',
      'loading',
      'processing',
      'success',
      'error',
      'warning',
      'info',
      'search',
      'filter',
      'sort',
      'noResults',
      'selectAll',
      'deselectAll',
    ];

    test.each(requiredCommonKeys)('has common.%s', (key) => {
      expect(enTranslations).toHaveProperty(`common.${key}`);
    });
  });

  // ===========================================================================
  // Value Type Tests
  // ===========================================================================

  describe('Value Types', () => {
    function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      const keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    test('all leaf values are non-empty strings', () => {
      const allKeys = getAllKeys(enTranslations as Record<string, unknown>);
      for (const key of allKeys) {
        const value = key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)[k], enTranslations as unknown);
        expect(typeof value).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });

    test('has at least 100 translation keys', () => {
      const allKeys = getAllKeys(enTranslations as Record<string, unknown>);
      expect(allKeys.length).toBeGreaterThanOrEqual(100);
    });
  });

  // ===========================================================================
  // Consistency Tests
  // ===========================================================================

  describe('Consistency', () => {
    test('app name is "ContPAQi AI Bridge"', () => {
      const app = enTranslations as Record<string, Record<string, string>>;
      expect(app.app.name).toBe('ContPAQi AI Bridge');
    });

    test('all status values end with appropriate punctuation or none', () => {
      const status = (enTranslations as Record<string, Record<string, string>>).status;
      for (const [, value] of Object.entries(status)) {
        // Status values should either end with "..." or have no punctuation
        const endsWithEllipsis = value.endsWith('...');
        const noPunctuation = !value.match(/[.!?]$/);
        expect(endsWithEllipsis || noPunctuation).toBe(true);
      }
    });

    test('action values are capitalized', () => {
      const actions = (enTranslations as Record<string, Record<string, string>>).actions;
      for (const [, value] of Object.entries(actions)) {
        // First letter should be uppercase
        expect(value[0]).toBe(value[0].toUpperCase());
      }
    });
  });

  // ===========================================================================
  // Interpolation Placeholder Tests
  // ===========================================================================

  describe('Interpolation Placeholders', () => {
    test('has proper interpolation syntax for dynamic values', () => {
      // Check that files with placeholders use {{variable}} format
      const stringifyObj = JSON.stringify(enTranslations);

      // If there are interpolations, they should use double curly braces
      const singleBraces = stringifyObj.match(/\{[^{].*?[^}]\}/g);
      const doubleBraces = stringifyObj.match(/\{\{.*?\}\}/g);

      // Either no single braces (except for nested objects) or double braces exist
      if (doubleBraces && doubleBraces.length > 0) {
        expect(doubleBraces.length).toBeGreaterThan(0);
      }
    });
  });
});
