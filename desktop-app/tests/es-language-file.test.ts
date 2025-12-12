/**
 * Tests for Task 18.4: Spanish Language File (es.json)
 *
 * These tests verify that the Spanish translation file contains all required
 * keys, matches the structure of en.json, and follows the expected patterns.
 */

import * as fs from 'fs';
import * as path from 'path';

// Paths to locale files
const ES_LOCALE_PATH = path.join(__dirname, '../src/i18n/locales/es.json');
const EN_LOCALE_PATH = path.join(__dirname, '../src/i18n/locales/en.json');

describe('Task 18.4: Spanish Language File (es.json)', () => {
  let esTranslations: Record<string, unknown>;
  let enTranslations: Record<string, unknown>;

  beforeAll(() => {
    // Load both translation files
    const esContent = fs.readFileSync(ES_LOCALE_PATH, 'utf-8');
    esTranslations = JSON.parse(esContent);

    const enContent = fs.readFileSync(EN_LOCALE_PATH, 'utf-8');
    enTranslations = JSON.parse(enContent);
  });

  // ===========================================================================
  // File Structure Tests
  // ===========================================================================

  describe('File Structure', () => {
    test('es.json file exists', () => {
      expect(fs.existsSync(ES_LOCALE_PATH)).toBe(true);
    });

    test('es.json is valid JSON', () => {
      const content = fs.readFileSync(ES_LOCALE_PATH, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('es.json is an object', () => {
      expect(typeof esTranslations).toBe('object');
      expect(esTranslations).not.toBeNull();
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
      expect(esTranslations).toHaveProperty(key);
    });
  });

  // ===========================================================================
  // App Section Tests
  // ===========================================================================

  describe('App Section', () => {
    test('has app.name', () => {
      expect(esTranslations).toHaveProperty('app.name');
    });

    test('app.name is same as English (brand name)', () => {
      const esApp = esTranslations as Record<string, Record<string, string>>;
      const enApp = enTranslations as Record<string, Record<string, string>>;
      expect(esApp.app.name).toBe(enApp.app.name);
    });

    test('has app.tagline in Spanish', () => {
      const esApp = esTranslations as Record<string, Record<string, string>>;
      expect(esApp.app.tagline).toBe('Procesamiento Inteligente de Facturas');
    });

    test('has app.version', () => {
      expect(esTranslations).toHaveProperty('app.version');
    });

    test('has app.copyright', () => {
      expect(esTranslations).toHaveProperty('app.copyright');
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
      expect(esTranslations).toHaveProperty(`status.${key}`);
    });

    test('status.ready is "Listo"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.status.ready).toBe('Listo');
    });

    test('status.offline is "Sin conexión"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.status.offline).toBe('Sin conexión');
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
      expect(esTranslations).toHaveProperty(`actions.${key}`);
    });

    test('actions.submit is "Enviar"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.actions.submit).toBe('Enviar');
    });

    test('actions.cancel is "Cancelar"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.actions.cancel).toBe('Cancelar');
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
      expect(esTranslations).toHaveProperty(`settings.${key}`);
    });

    test('settings.title is "Configuración"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.settings.title).toBe('Configuración');
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
        expect(esTranslations).toHaveProperty(`invoice.${key}`);
      });

      test('invoice.form.fecha is "Fecha"', () => {
        const es = esTranslations as Record<string, { form: Record<string, string> }>;
        expect(es.invoice.form.fecha).toBe('Fecha');
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
        expect(esTranslations).toHaveProperty(`invoice.${key}`);
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
        expect(esTranslations).toHaveProperty(`invoice.${key}`);
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
      expect(esTranslations).toHaveProperty(`validation.${key}`);
    });

    test('validation.required contains "obligatorio" or "requerido"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      const value = es.validation.required.toLowerCase();
      expect(value.includes('obligatorio') || value.includes('requerido')).toBe(true);
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
      expect(esTranslations).toHaveProperty(`errors.${key}`);
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
      expect(esTranslations).toHaveProperty(`navigation.${key}`);
    });

    test('navigation.home is "Inicio"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.navigation.home).toBe('Inicio');
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
      expect(esTranslations).toHaveProperty(`license.${key}`);
    });

    test('license.keyPlaceholder matches English format', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.license.keyPlaceholder).toBe('XXXX-XXXX-XXXX-XXXX');
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
      expect(esTranslations).toHaveProperty(`batch.${key}`);
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
      expect(esTranslations).toHaveProperty(`pdf.${key}`);
    });

    test('pdf.page is "Página"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.pdf.page).toBe('Página');
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
      expect(esTranslations).toHaveProperty(`common.${key}`);
    });

    test('common.yes is "Sí"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.common.yes).toBe('Sí');
    });

    test('common.no is "No"', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      expect(es.common.no).toBe('No');
    });
  });

  // ===========================================================================
  // Key Parity Tests (es.json must have same keys as en.json)
  // ===========================================================================

  describe('Key Parity with en.json', () => {
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

    test('es.json has the same number of keys as en.json', () => {
      const esKeys = getAllKeys(esTranslations as Record<string, unknown>);
      const enKeys = getAllKeys(enTranslations as Record<string, unknown>);
      expect(esKeys.length).toBe(enKeys.length);
    });

    test('all en.json keys exist in es.json', () => {
      const esKeys = new Set(getAllKeys(esTranslations as Record<string, unknown>));
      const enKeys = getAllKeys(enTranslations as Record<string, unknown>);

      const missingKeys = enKeys.filter(key => !esKeys.has(key));
      expect(missingKeys).toEqual([]);
    });

    test('es.json has at least 100 translation keys', () => {
      const esKeys = getAllKeys(esTranslations as Record<string, unknown>);
      expect(esKeys.length).toBeGreaterThanOrEqual(100);
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
      const allKeys = getAllKeys(esTranslations as Record<string, unknown>);
      for (const key of allKeys) {
        const value = key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)[k], esTranslations as unknown);
        expect(typeof value).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // Interpolation Placeholder Tests
  // ===========================================================================

  describe('Interpolation Placeholders', () => {
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

    function getNestedValue(obj: unknown, path: string): string {
      return path.split('.').reduce((o, k) => (o as Record<string, unknown>)[k], obj) as string;
    }

    test('es.json has same interpolation placeholders as en.json', () => {
      const allKeys = getAllKeys(enTranslations as Record<string, unknown>);

      for (const key of allKeys) {
        const enValue = getNestedValue(enTranslations, key);
        const esValue = getNestedValue(esTranslations, key);

        // Extract interpolation placeholders ({{variable}})
        const enPlaceholders = enValue.match(/\{\{[\w]+\}\}/g) || [];
        const esPlaceholders = esValue.match(/\{\{[\w]+\}\}/g) || [];

        // Both should have the same placeholders
        expect(esPlaceholders.sort()).toEqual(enPlaceholders.sort());
      }
    });
  });

  // ===========================================================================
  // Spanish Language Quality Tests
  // ===========================================================================

  describe('Spanish Language Quality', () => {
    test('contains Spanish characters (accents, ñ)', () => {
      const content = JSON.stringify(esTranslations);
      // Spanish should have accented characters
      const hasSpanishChars = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/.test(content);
      expect(hasSpanishChars).toBe(true);
    });

    test('status messages use Spanish punctuation', () => {
      const es = esTranslations as Record<string, Record<string, string>>;
      // "Iniciando..." should have ellipsis
      expect(es.status.starting).toContain('...');
    });

    test('action values are capitalized in Spanish', () => {
      const actions = (esTranslations as Record<string, Record<string, string>>).actions;
      for (const [, value] of Object.entries(actions)) {
        // First letter should be uppercase
        expect(value[0]).toBe(value[0].toUpperCase());
      }
    });
  });
});
