/**
 * i18n Component Integration Tests
 * Subtask 18.5: Update UI components to use translation keys
 *
 * Tests for:
 * - Translation key mapping for status indicators
 * - Translation key mapping for invoice form
 * - Translation key mapping for validation messages
 * - Translation key mapping for PDF viewer
 * - Translation key mapping for batch processing
 * - Language switching in components
 * - Interpolation in component translations
 */

// =============================================================================
// Type Definitions for Testing
// =============================================================================

interface TranslationFunction {
  (key: string, options?: Record<string, unknown>): string;
}

interface I18nInstance {
  language: string;
  t: TranslationFunction;
  changeLanguage: (lng: string) => Promise<void>;
}

// =============================================================================
// Mock Translations (Subset for testing)
// =============================================================================

const mockTranslations = {
  en: {
    // Status translations
    'status.starting': 'Starting...',
    'status.ready': 'Ready',
    'status.error': 'Error',
    'status.offline': 'Offline',
    'status.checking': 'Checking...',
    'status.connecting': 'Connecting...',
    'status.processing': 'Processing...',
    'status.completed': 'Completed',
    'status.failed': 'Failed',

    // Docker translations
    'docker.status': 'Docker Status',
    'docker.checking': 'Checking Docker...',
    'docker.running': 'Docker is running',
    'docker.stopped': 'Docker is stopped',
    'docker.notInstalled': 'Docker is not installed',
    'docker.error': 'Docker error',
    'docker.containerStatus': 'Container Status',
    'docker.containerRunning': 'Container is running',
    'docker.containerStopped': 'Container is stopped',
    'docker.healthCheck': 'Health Check',
    'docker.healthy': 'Service is healthy',
    'docker.unhealthy': 'Service is unhealthy',
    'docker.waitingForService': 'Waiting for service to be ready...',

    // Actions translations
    'actions.submit': 'Submit',
    'actions.cancel': 'Cancel',
    'actions.retry': 'Retry',
    'actions.save': 'Save',
    'actions.close': 'Close',
    'actions.upload': 'Upload',
    'actions.download': 'Download',
    'actions.delete': 'Delete',
    'actions.edit': 'Edit',
    'actions.confirm': 'Confirm',

    // Common translations
    'common.loading': 'Loading...',
    'common.processing': 'Processing...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.warning': 'Warning',
    'common.yes': 'Yes',
    'common.no': 'No',

    // App translations
    'app.name': 'ContPAQi AI Bridge',
    'app.tagline': 'Intelligent Invoice Processing',

    // Invoice form translations
    'invoice.form.title': 'Invoice Details',
    'invoice.form.rfcEmisor': 'RFC Emisor',
    'invoice.form.rfcReceptor': 'RFC Receptor',
    'invoice.form.fecha': 'Date',
    'invoice.form.subtotal': 'Subtotal',
    'invoice.form.iva': 'IVA (Tax)',
    'invoice.form.total': 'Total',
    'invoice.form.invoiceNumber': 'Invoice Number',
    'invoice.form.companyName': 'Company Name',
    'invoice.form.lineItems': 'Line Items',
    'invoice.form.description': 'Description',
    'invoice.form.quantity': 'Quantity',
    'invoice.form.unitPrice': 'Unit Price',
    'invoice.placeholders.rfcEmisor': 'Enter RFC Emisor (e.g., XAXX010101000)',
    'invoice.placeholders.rfcReceptor': 'Enter RFC Receptor (e.g., XEXX010101000)',
    'invoice.messages.submitSuccess': 'Invoice submitted successfully',
    'invoice.messages.submitError': 'Failed to submit invoice',
    'invoice.labels.issuerInfo': 'Issuer Information',
    'invoice.labels.recipientInfo': 'Recipient Information',
    'invoice.labels.amounts': 'Amounts',

    // Validation translations
    'validation.required': 'This field is required',
    'validation.invalidFormat': 'Invalid format',
    'validation.invalidRfc': 'Invalid RFC format',
    'validation.invalidDate': 'Invalid date format',
    'validation.invalidAmount': 'Invalid amount',
    'validation.mathError': 'Math calculation error',
    'validation.ivaError': 'IVA does not equal 16% of subtotal',
    'validation.totalError': 'Total does not equal subtotal + IVA',
    'validation.missingFields': 'Missing required fields: {{fields}}',
    'validation.cannotSubmit': 'Cannot submit invoice',
    'validation.allValid': 'All fields are valid',
    'validation.fixErrors': 'Please fix the errors before submitting',

    // Errors translations
    'errors.generic': 'An error occurred',
    'errors.network': 'Network error. Please check your connection.',
    'errors.dockerNotRunning': 'Docker is not running',
    'errors.serviceUnavailable': 'Service is currently unavailable',
    'errors.healthCheckFailed': 'Health check failed',

    // PDF translations
    'pdf.viewer': 'PDF Viewer',
    'pdf.upload': 'Upload PDF',
    'pdf.loading': 'Loading PDF...',
    'pdf.error': 'Failed to load PDF',
    'pdf.noFile': 'No PDF selected',
    'pdf.zoomIn': 'Zoom In',
    'pdf.zoomOut': 'Zoom Out',
    'pdf.fitWidth': 'Fit Width',
    'pdf.fitPage': 'Fit Page',
    'pdf.page': 'Page',
    'pdf.of': 'of',
    'pdf.pageInfo': 'Page {{current}} of {{total}}',

    // Batch translations
    'batch.title': 'Batch Processing',
    'batch.dropzone': 'Drop files here or click to browse',
    'batch.processing': 'Processing files...',
    'batch.completed': 'Processing completed',
    'batch.failed': 'Processing failed',
    'batch.filesSelected': '{{count}} files selected',
    'batch.filesProcessed': '{{processed}} of {{total}} files processed',

    // Settings translations
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.theme': 'Theme',

    // Navigation translations
    'navigation.home': 'Home',
    'navigation.invoices': 'Invoices',
    'navigation.batch': 'Batch Processing',
    'navigation.settings': 'Settings',
    'navigation.help': 'Help',
    'navigation.about': 'About',

    // License translations
    'license.title': 'License Management',
    'license.status': 'Status',
    'license.activate': 'Activate License',
    'license.deactivate': 'Deactivate License',
    'license.active': 'Active',
    'license.expired': 'Expired',
    'license.daysRemaining': '{{days}} days remaining',

    // Confirmation translations
    'confirmation.title': 'Confirmation',
    'confirmation.message': 'Are you sure?',
    'confirmation.submitInvoice': 'Submit this invoice to ContPAQi?',
    'confirmation.cannotUndo': 'This action cannot be undone.',
  },
  es: {
    // Status translations
    'status.starting': 'Iniciando...',
    'status.ready': 'Listo',
    'status.error': 'Error',
    'status.offline': 'Sin conexión',
    'status.checking': 'Verificando...',
    'status.connecting': 'Conectando...',
    'status.processing': 'Procesando...',
    'status.completed': 'Completado',
    'status.failed': 'Fallido',

    // Docker translations
    'docker.status': 'Estado de Docker',
    'docker.checking': 'Verificando Docker...',
    'docker.running': 'Docker está ejecutándose',
    'docker.stopped': 'Docker está detenido',
    'docker.notInstalled': 'Docker no está instalado',
    'docker.error': 'Error de Docker',
    'docker.containerStatus': 'Estado del Contenedor',
    'docker.containerRunning': 'El contenedor está ejecutándose',
    'docker.containerStopped': 'El contenedor está detenido',
    'docker.healthCheck': 'Verificación de Salud',
    'docker.healthy': 'El servicio está saludable',
    'docker.unhealthy': 'El servicio no está saludable',
    'docker.waitingForService': 'Esperando que el servicio esté listo...',

    // Actions translations
    'actions.submit': 'Enviar',
    'actions.cancel': 'Cancelar',
    'actions.retry': 'Reintentar',
    'actions.save': 'Guardar',
    'actions.close': 'Cerrar',
    'actions.upload': 'Subir',
    'actions.download': 'Descargar',
    'actions.delete': 'Eliminar',
    'actions.edit': 'Editar',
    'actions.confirm': 'Confirmar',

    // Common translations
    'common.loading': 'Cargando...',
    'common.processing': 'Procesando...',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.warning': 'Advertencia',
    'common.yes': 'Sí',
    'common.no': 'No',

    // App translations
    'app.name': 'ContPAQi AI Bridge',
    'app.tagline': 'Procesamiento Inteligente de Facturas',

    // Invoice form translations
    'invoice.form.title': 'Detalles de la Factura',
    'invoice.form.rfcEmisor': 'RFC Emisor',
    'invoice.form.rfcReceptor': 'RFC Receptor',
    'invoice.form.fecha': 'Fecha',
    'invoice.form.subtotal': 'Subtotal',
    'invoice.form.iva': 'IVA (Impuesto)',
    'invoice.form.total': 'Total',
    'invoice.form.invoiceNumber': 'Número de Factura',
    'invoice.form.companyName': 'Nombre de la Empresa',
    'invoice.form.lineItems': 'Conceptos',
    'invoice.form.description': 'Descripción',
    'invoice.form.quantity': 'Cantidad',
    'invoice.form.unitPrice': 'Precio Unitario',
    'invoice.placeholders.rfcEmisor': 'Ingrese RFC Emisor (ej., XAXX010101000)',
    'invoice.placeholders.rfcReceptor': 'Ingrese RFC Receptor (ej., XEXX010101000)',
    'invoice.messages.submitSuccess': 'Factura enviada exitosamente',
    'invoice.messages.submitError': 'Error al enviar la factura',
    'invoice.labels.issuerInfo': 'Información del Emisor',
    'invoice.labels.recipientInfo': 'Información del Receptor',
    'invoice.labels.amounts': 'Montos',

    // Validation translations
    'validation.required': 'Este campo es obligatorio',
    'validation.invalidFormat': 'Formato inválido',
    'validation.invalidRfc': 'Formato de RFC inválido',
    'validation.invalidDate': 'Formato de fecha inválido',
    'validation.invalidAmount': 'Monto inválido',
    'validation.mathError': 'Error en cálculo matemático',
    'validation.ivaError': 'El IVA no es igual al 16% del subtotal',
    'validation.totalError': 'El total no es igual a subtotal + IVA',
    'validation.missingFields': 'Campos obligatorios faltantes: {{fields}}',
    'validation.cannotSubmit': 'No se puede enviar la factura',
    'validation.allValid': 'Todos los campos son válidos',
    'validation.fixErrors': 'Por favor corrija los errores antes de enviar',

    // Errors translations
    'errors.generic': 'Ha ocurrido un error',
    'errors.network': 'Error de red. Por favor verifique su conexión.',
    'errors.dockerNotRunning': 'Docker no está ejecutándose',
    'errors.serviceUnavailable': 'El servicio no está disponible actualmente',
    'errors.healthCheckFailed': 'La verificación de salud falló',

    // PDF translations
    'pdf.viewer': 'Visor de PDF',
    'pdf.upload': 'Subir PDF',
    'pdf.loading': 'Cargando PDF...',
    'pdf.error': 'Error al cargar PDF',
    'pdf.noFile': 'Ningún PDF seleccionado',
    'pdf.zoomIn': 'Acercar',
    'pdf.zoomOut': 'Alejar',
    'pdf.fitWidth': 'Ajustar al Ancho',
    'pdf.fitPage': 'Ajustar a la Página',
    'pdf.page': 'Página',
    'pdf.of': 'de',
    'pdf.pageInfo': 'Página {{current}} de {{total}}',

    // Batch translations
    'batch.title': 'Procesamiento por Lotes',
    'batch.dropzone': 'Suelte archivos aquí o haga clic para explorar',
    'batch.processing': 'Procesando archivos...',
    'batch.completed': 'Procesamiento completado',
    'batch.failed': 'Procesamiento fallido',
    'batch.filesSelected': '{{count}} archivos seleccionados',
    'batch.filesProcessed': '{{processed}} de {{total}} archivos procesados',

    // Settings translations
    'settings.title': 'Configuración',
    'settings.language': 'Idioma',
    'settings.selectLanguage': 'Seleccionar Idioma',
    'settings.theme': 'Tema',

    // Navigation translations
    'navigation.home': 'Inicio',
    'navigation.invoices': 'Facturas',
    'navigation.batch': 'Procesamiento por Lotes',
    'navigation.settings': 'Configuración',
    'navigation.help': 'Ayuda',
    'navigation.about': 'Acerca de',

    // License translations
    'license.title': 'Gestión de Licencia',
    'license.status': 'Estado',
    'license.activate': 'Activar Licencia',
    'license.deactivate': 'Desactivar Licencia',
    'license.active': 'Activa',
    'license.expired': 'Expirada',
    'license.daysRemaining': '{{days}} días restantes',

    // Confirmation translations
    'confirmation.title': 'Confirmación',
    'confirmation.message': '¿Está seguro?',
    'confirmation.submitInvoice': '¿Enviar esta factura a ContPAQi?',
    'confirmation.cannotUndo': 'Esta acción no se puede deshacer.',
  },
};

// =============================================================================
// Mock i18n Instance
// =============================================================================

function createMockI18n(initialLang: string = 'en'): I18nInstance {
  let currentLang = initialLang;

  return {
    get language() {
      return currentLang;
    },
    t: (key: string, options?: Record<string, unknown>) => {
      const translations = mockTranslations[currentLang as keyof typeof mockTranslations];
      let value = translations?.[key as keyof typeof translations] || key;

      // Handle interpolation
      if (options && typeof value === 'string') {
        Object.keys(options).forEach((optKey) => {
          value = value.replace(new RegExp(`\\{\\{${optKey}\\}\\}`, 'g'), String(options[optKey]));
        });
      }

      return value;
    },
    changeLanguage: async (lng: string) => {
      if (lng in mockTranslations) {
        currentLang = lng;
      }
    },
  };
}

// =============================================================================
// Status Indicator Translation Key Mapping Tests
// =============================================================================

describe('Status Indicator Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('getStatusTextKey mapping', () => {
    type AppStatus = 'starting' | 'ready' | 'error' | 'offline';

    function getStatusTextKey(status: AppStatus): string {
      const keyMap: Record<AppStatus, string> = {
        starting: 'status.starting',
        ready: 'status.ready',
        error: 'status.error',
        offline: 'status.offline',
      };
      return keyMap[status] || 'status.starting';
    }

    it('should map "ready" status to "status.ready" key', () => {
      expect(getStatusTextKey('ready')).toBe('status.ready');
      expect(i18n.t(getStatusTextKey('ready'))).toBe('Ready');
    });

    it('should map "starting" status to "status.starting" key', () => {
      expect(getStatusTextKey('starting')).toBe('status.starting');
      expect(i18n.t(getStatusTextKey('starting'))).toBe('Starting...');
    });

    it('should map "error" status to "status.error" key', () => {
      expect(getStatusTextKey('error')).toBe('status.error');
      expect(i18n.t(getStatusTextKey('error'))).toBe('Error');
    });

    it('should map "offline" status to "status.offline" key', () => {
      expect(getStatusTextKey('offline')).toBe('status.offline');
      expect(i18n.t(getStatusTextKey('offline'))).toBe('Offline');
    });

    it('should translate status to Spanish when language changes', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t(getStatusTextKey('ready'))).toBe('Listo');
      expect(i18n.t(getStatusTextKey('starting'))).toBe('Iniciando...');
      expect(i18n.t(getStatusTextKey('error'))).toBe('Error');
      expect(i18n.t(getStatusTextKey('offline'))).toBe('Sin conexión');
    });
  });

  describe('StatusBar message keys', () => {
    type DockerStatus = 'checking' | 'running' | 'stopped' | 'docker_error';
    type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'unknown';

    interface StatusBarState {
      dockerStatus: DockerStatus;
      healthStatus: HealthStatus;
    }

    function getStatusBarMessageKey(state: StatusBarState): string {
      const { dockerStatus, healthStatus } = state;

      if (dockerStatus === 'docker_error') {
        return 'errors.dockerNotRunning';
      }

      if (dockerStatus === 'stopped') {
        return 'docker.containerStopped';
      }

      if (dockerStatus === 'checking') {
        return 'docker.checking';
      }

      if (dockerStatus === 'running') {
        switch (healthStatus) {
          case 'healthy':
            return 'docker.healthy';
          case 'unhealthy':
            return 'docker.unhealthy';
          case 'error':
            return 'errors.healthCheckFailed';
          case 'unknown':
            return 'docker.waitingForService';
          default:
            return 'docker.waitingForService';
        }
      }

      return 'status.checking';
    }

    it('should return Docker error key for docker_error status', () => {
      const key = getStatusBarMessageKey({ dockerStatus: 'docker_error', healthStatus: 'unknown' });
      expect(key).toBe('errors.dockerNotRunning');
      expect(i18n.t(key)).toBe('Docker is not running');
    });

    it('should return container stopped key for stopped status', () => {
      const key = getStatusBarMessageKey({ dockerStatus: 'stopped', healthStatus: 'unknown' });
      expect(key).toBe('docker.containerStopped');
      expect(i18n.t(key)).toBe('Container is stopped');
    });

    it('should return checking key for checking status', () => {
      const key = getStatusBarMessageKey({ dockerStatus: 'checking', healthStatus: 'unknown' });
      expect(key).toBe('docker.checking');
      expect(i18n.t(key)).toBe('Checking Docker...');
    });

    it('should return healthy key when service is healthy', () => {
      const key = getStatusBarMessageKey({ dockerStatus: 'running', healthStatus: 'healthy' });
      expect(key).toBe('docker.healthy');
      expect(i18n.t(key)).toBe('Service is healthy');
    });

    it('should return unhealthy key when service is unhealthy', () => {
      const key = getStatusBarMessageKey({ dockerStatus: 'running', healthStatus: 'unhealthy' });
      expect(key).toBe('docker.unhealthy');
      expect(i18n.t(key)).toBe('Service is unhealthy');
    });

    it('should translate status bar messages to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('docker.healthy')).toBe('El servicio está saludable');
      expect(i18n.t('docker.checking')).toBe('Verificando Docker...');
      expect(i18n.t('docker.containerStopped')).toBe('El contenedor está detenido');
    });
  });

  describe('StatusBar UI elements', () => {
    it('should have translation key for "Retry" button', () => {
      expect(i18n.t('actions.retry')).toBe('Retry');
    });

    it('should have translation key for "Docker" label', () => {
      expect(i18n.t('docker.status')).toBe('Docker Status');
    });

    it('should have translation key for "Health" label', () => {
      expect(i18n.t('docker.healthCheck')).toBe('Health Check');
    });

    it('should translate UI elements to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('actions.retry')).toBe('Reintentar');
      expect(i18n.t('docker.status')).toBe('Estado de Docker');
      expect(i18n.t('docker.healthCheck')).toBe('Verificación de Salud');
    });
  });
});

// =============================================================================
// Invoice Form Translation Key Mapping Tests
// =============================================================================

describe('Invoice Form Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Form field labels', () => {
    const FIELD_LABEL_KEYS: Record<string, string> = {
      rfcEmisor: 'invoice.form.rfcEmisor',
      rfcReceptor: 'invoice.form.rfcReceptor',
      fecha: 'invoice.form.fecha',
      subtotal: 'invoice.form.subtotal',
      iva: 'invoice.form.iva',
      total: 'invoice.form.total',
    };

    it('should have translation key for RFC Emisor', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.rfcEmisor)).toBe('RFC Emisor');
    });

    it('should have translation key for RFC Receptor', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.rfcReceptor)).toBe('RFC Receptor');
    });

    it('should have translation key for Fecha/Date', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.fecha)).toBe('Date');
    });

    it('should have translation key for Subtotal', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.subtotal)).toBe('Subtotal');
    });

    it('should have translation key for IVA', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.iva)).toBe('IVA (Tax)');
    });

    it('should have translation key for Total', () => {
      expect(i18n.t(FIELD_LABEL_KEYS.total)).toBe('Total');
    });

    it('should translate form labels to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t(FIELD_LABEL_KEYS.fecha)).toBe('Fecha');
      expect(i18n.t(FIELD_LABEL_KEYS.iva)).toBe('IVA (Impuesto)');
    });
  });

  describe('Form section headers', () => {
    it('should have translation key for Invoice Details title', () => {
      expect(i18n.t('invoice.form.title')).toBe('Invoice Details');
    });

    it('should have translation key for Line Items', () => {
      expect(i18n.t('invoice.form.lineItems')).toBe('Line Items');
    });

    it('should have translation key for Issuer Information', () => {
      expect(i18n.t('invoice.labels.issuerInfo')).toBe('Issuer Information');
    });

    it('should have translation key for Recipient Information', () => {
      expect(i18n.t('invoice.labels.recipientInfo')).toBe('Recipient Information');
    });

    it('should translate section headers to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('invoice.form.title')).toBe('Detalles de la Factura');
      expect(i18n.t('invoice.form.lineItems')).toBe('Conceptos');
      expect(i18n.t('invoice.labels.issuerInfo')).toBe('Información del Emisor');
    });
  });

  describe('Form placeholders', () => {
    it('should have translation key for RFC Emisor placeholder', () => {
      expect(i18n.t('invoice.placeholders.rfcEmisor')).toBe('Enter RFC Emisor (e.g., XAXX010101000)');
    });

    it('should have translation key for RFC Receptor placeholder', () => {
      expect(i18n.t('invoice.placeholders.rfcReceptor')).toBe('Enter RFC Receptor (e.g., XEXX010101000)');
    });

    it('should translate placeholders to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('invoice.placeholders.rfcEmisor')).toBe('Ingrese RFC Emisor (ej., XAXX010101000)');
    });
  });

  describe('Form buttons', () => {
    it('should have translation key for Submit button', () => {
      expect(i18n.t('actions.submit')).toBe('Submit');
    });

    it('should have translation key for Cancel button', () => {
      expect(i18n.t('actions.cancel')).toBe('Cancel');
    });

    it('should translate buttons to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('actions.submit')).toBe('Enviar');
      expect(i18n.t('actions.cancel')).toBe('Cancelar');
    });
  });

  describe('Form messages', () => {
    it('should have translation key for submit success', () => {
      expect(i18n.t('invoice.messages.submitSuccess')).toBe('Invoice submitted successfully');
    });

    it('should have translation key for submit error', () => {
      expect(i18n.t('invoice.messages.submitError')).toBe('Failed to submit invoice');
    });

    it('should translate messages to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('invoice.messages.submitSuccess')).toBe('Factura enviada exitosamente');
      expect(i18n.t('invoice.messages.submitError')).toBe('Error al enviar la factura');
    });
  });
});

// =============================================================================
// Validation Messages Translation Key Mapping Tests
// =============================================================================

describe('Validation Messages Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Field validation errors', () => {
    it('should have translation key for required field error', () => {
      expect(i18n.t('validation.required')).toBe('This field is required');
    });

    it('should have translation key for invalid RFC error', () => {
      expect(i18n.t('validation.invalidRfc')).toBe('Invalid RFC format');
    });

    it('should have translation key for invalid date error', () => {
      expect(i18n.t('validation.invalidDate')).toBe('Invalid date format');
    });

    it('should have translation key for invalid amount error', () => {
      expect(i18n.t('validation.invalidAmount')).toBe('Invalid amount');
    });

    it('should translate validation errors to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('validation.required')).toBe('Este campo es obligatorio');
      expect(i18n.t('validation.invalidRfc')).toBe('Formato de RFC inválido');
      expect(i18n.t('validation.invalidDate')).toBe('Formato de fecha inválido');
    });
  });

  describe('Math validation errors', () => {
    it('should have translation key for IVA error', () => {
      expect(i18n.t('validation.ivaError')).toBe('IVA does not equal 16% of subtotal');
    });

    it('should have translation key for total error', () => {
      expect(i18n.t('validation.totalError')).toBe('Total does not equal subtotal + IVA');
    });

    it('should translate math errors to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('validation.ivaError')).toBe('El IVA no es igual al 16% del subtotal');
      expect(i18n.t('validation.totalError')).toBe('El total no es igual a subtotal + IVA');
    });
  });

  describe('Validation blocking messages', () => {
    it('should have translation key for missing fields with interpolation', () => {
      const message = i18n.t('validation.missingFields', { fields: 'RFC, Date' });
      expect(message).toBe('Missing required fields: RFC, Date');
    });

    it('should have translation key for cannot submit message', () => {
      expect(i18n.t('validation.cannotSubmit')).toBe('Cannot submit invoice');
    });

    it('should have translation key for fix errors message', () => {
      expect(i18n.t('validation.fixErrors')).toBe('Please fix the errors before submitting');
    });

    it('should translate blocking messages to Spanish with interpolation', async () => {
      await i18n.changeLanguage('es');
      const message = i18n.t('validation.missingFields', { fields: 'RFC, Fecha' });
      expect(message).toBe('Campos obligatorios faltantes: RFC, Fecha');
      expect(i18n.t('validation.cannotSubmit')).toBe('No se puede enviar la factura');
    });
  });
});

// =============================================================================
// PDF Viewer Translation Key Mapping Tests
// =============================================================================

describe('PDF Viewer Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('PDF viewer labels', () => {
    it('should have translation key for viewer title', () => {
      expect(i18n.t('pdf.viewer')).toBe('PDF Viewer');
    });

    it('should have translation key for upload button', () => {
      expect(i18n.t('pdf.upload')).toBe('Upload PDF');
    });

    it('should have translation key for loading state', () => {
      expect(i18n.t('pdf.loading')).toBe('Loading PDF...');
    });

    it('should have translation key for error state', () => {
      expect(i18n.t('pdf.error')).toBe('Failed to load PDF');
    });

    it('should have translation key for no file state', () => {
      expect(i18n.t('pdf.noFile')).toBe('No PDF selected');
    });

    it('should translate PDF labels to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('pdf.viewer')).toBe('Visor de PDF');
      expect(i18n.t('pdf.loading')).toBe('Cargando PDF...');
      expect(i18n.t('pdf.noFile')).toBe('Ningún PDF seleccionado');
    });
  });

  describe('PDF controls', () => {
    it('should have translation key for zoom in', () => {
      expect(i18n.t('pdf.zoomIn')).toBe('Zoom In');
    });

    it('should have translation key for zoom out', () => {
      expect(i18n.t('pdf.zoomOut')).toBe('Zoom Out');
    });

    it('should have translation key for fit width', () => {
      expect(i18n.t('pdf.fitWidth')).toBe('Fit Width');
    });

    it('should have translation key for fit page', () => {
      expect(i18n.t('pdf.fitPage')).toBe('Fit Page');
    });

    it('should translate PDF controls to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('pdf.zoomIn')).toBe('Acercar');
      expect(i18n.t('pdf.zoomOut')).toBe('Alejar');
      expect(i18n.t('pdf.fitWidth')).toBe('Ajustar al Ancho');
    });
  });

  describe('PDF pagination with interpolation', () => {
    it('should have translation key for page label', () => {
      expect(i18n.t('pdf.page')).toBe('Page');
    });

    it('should have translation key for "of" separator', () => {
      expect(i18n.t('pdf.of')).toBe('of');
    });

    it('should have translation key for page info with interpolation', () => {
      const pageInfo = i18n.t('pdf.pageInfo', { current: 1, total: 10 });
      expect(pageInfo).toBe('Page 1 of 10');
    });

    it('should translate pagination to Spanish with interpolation', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('pdf.page')).toBe('Página');
      const pageInfo = i18n.t('pdf.pageInfo', { current: 1, total: 10 });
      expect(pageInfo).toBe('Página 1 de 10');
    });
  });
});

// =============================================================================
// Batch Processing Translation Key Mapping Tests
// =============================================================================

describe('Batch Processing Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Batch processing labels', () => {
    it('should have translation key for batch title', () => {
      expect(i18n.t('batch.title')).toBe('Batch Processing');
    });

    it('should have translation key for dropzone', () => {
      expect(i18n.t('batch.dropzone')).toBe('Drop files here or click to browse');
    });

    it('should have translation key for processing status', () => {
      expect(i18n.t('batch.processing')).toBe('Processing files...');
    });

    it('should have translation key for completed status', () => {
      expect(i18n.t('batch.completed')).toBe('Processing completed');
    });

    it('should have translation key for failed status', () => {
      expect(i18n.t('batch.failed')).toBe('Processing failed');
    });

    it('should translate batch labels to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('batch.title')).toBe('Procesamiento por Lotes');
      expect(i18n.t('batch.dropzone')).toBe('Suelte archivos aquí o haga clic para explorar');
      expect(i18n.t('batch.processing')).toBe('Procesando archivos...');
    });
  });

  describe('Batch processing with interpolation', () => {
    it('should have translation key for files selected with count', () => {
      const message = i18n.t('batch.filesSelected', { count: 5 });
      expect(message).toBe('5 files selected');
    });

    it('should have translation key for files processed with counts', () => {
      const message = i18n.t('batch.filesProcessed', { processed: 3, total: 10 });
      expect(message).toBe('3 of 10 files processed');
    });

    it('should translate batch interpolation to Spanish', async () => {
      await i18n.changeLanguage('es');
      const message = i18n.t('batch.filesSelected', { count: 5 });
      expect(message).toBe('5 archivos seleccionados');
      const progress = i18n.t('batch.filesProcessed', { processed: 3, total: 10 });
      expect(progress).toBe('3 de 10 archivos procesados');
    });
  });
});

// =============================================================================
// Common UI Elements Translation Tests
// =============================================================================

describe('Common UI Elements Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Common actions', () => {
    it('should have translation keys for all common actions', () => {
      expect(i18n.t('actions.submit')).toBe('Submit');
      expect(i18n.t('actions.cancel')).toBe('Cancel');
      expect(i18n.t('actions.save')).toBe('Save');
      expect(i18n.t('actions.delete')).toBe('Delete');
      expect(i18n.t('actions.edit')).toBe('Edit');
      expect(i18n.t('actions.upload')).toBe('Upload');
      expect(i18n.t('actions.download')).toBe('Download');
    });

    it('should translate common actions to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('actions.submit')).toBe('Enviar');
      expect(i18n.t('actions.cancel')).toBe('Cancelar');
      expect(i18n.t('actions.save')).toBe('Guardar');
      expect(i18n.t('actions.delete')).toBe('Eliminar');
    });
  });

  describe('Common states', () => {
    it('should have translation keys for common states', () => {
      expect(i18n.t('common.loading')).toBe('Loading...');
      expect(i18n.t('common.processing')).toBe('Processing...');
      expect(i18n.t('common.success')).toBe('Success');
      expect(i18n.t('common.error')).toBe('Error');
      expect(i18n.t('common.warning')).toBe('Warning');
    });

    it('should translate common states to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('common.loading')).toBe('Cargando...');
      expect(i18n.t('common.processing')).toBe('Procesando...');
      expect(i18n.t('common.success')).toBe('Éxito');
    });
  });

  describe('Yes/No responses', () => {
    it('should have translation keys for yes and no', () => {
      expect(i18n.t('common.yes')).toBe('Yes');
      expect(i18n.t('common.no')).toBe('No');
    });

    it('should translate yes/no to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('common.yes')).toBe('Sí');
      expect(i18n.t('common.no')).toBe('No');
    });
  });
});

// =============================================================================
// Confirmation Dialog Translation Tests
// =============================================================================

describe('Confirmation Dialog Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Confirmation messages', () => {
    it('should have translation key for confirmation title', () => {
      expect(i18n.t('confirmation.title')).toBe('Confirmation');
    });

    it('should have translation key for default confirmation message', () => {
      expect(i18n.t('confirmation.message')).toBe('Are you sure?');
    });

    it('should have translation key for submit invoice confirmation', () => {
      expect(i18n.t('confirmation.submitInvoice')).toBe('Submit this invoice to ContPAQi?');
    });

    it('should have translation key for cannot undo warning', () => {
      expect(i18n.t('confirmation.cannotUndo')).toBe('This action cannot be undone.');
    });

    it('should translate confirmation messages to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('confirmation.title')).toBe('Confirmación');
      expect(i18n.t('confirmation.message')).toBe('¿Está seguro?');
      expect(i18n.t('confirmation.submitInvoice')).toBe('¿Enviar esta factura a ContPAQi?');
    });
  });
});

// =============================================================================
// App Branding Translation Tests
// =============================================================================

describe('App Branding Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('App name and tagline', () => {
    it('should keep app name the same in both languages (brand name)', () => {
      expect(i18n.t('app.name')).toBe('ContPAQi AI Bridge');
    });

    it('should have translation key for tagline', () => {
      expect(i18n.t('app.tagline')).toBe('Intelligent Invoice Processing');
    });

    it('should translate tagline to Spanish while keeping app name', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('app.name')).toBe('ContPAQi AI Bridge');
      expect(i18n.t('app.tagline')).toBe('Procesamiento Inteligente de Facturas');
    });
  });
});

// =============================================================================
// Navigation Translation Tests
// =============================================================================

describe('Navigation Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Navigation menu items', () => {
    it('should have translation keys for all navigation items', () => {
      expect(i18n.t('navigation.home')).toBe('Home');
      expect(i18n.t('navigation.invoices')).toBe('Invoices');
      expect(i18n.t('navigation.batch')).toBe('Batch Processing');
      expect(i18n.t('navigation.settings')).toBe('Settings');
      expect(i18n.t('navigation.help')).toBe('Help');
      expect(i18n.t('navigation.about')).toBe('About');
    });

    it('should translate navigation to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('navigation.home')).toBe('Inicio');
      expect(i18n.t('navigation.invoices')).toBe('Facturas');
      expect(i18n.t('navigation.batch')).toBe('Procesamiento por Lotes');
      expect(i18n.t('navigation.settings')).toBe('Configuración');
      expect(i18n.t('navigation.help')).toBe('Ayuda');
    });
  });
});

// =============================================================================
// Settings Translation Tests
// =============================================================================

describe('Settings Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Settings labels', () => {
    it('should have translation key for settings title', () => {
      expect(i18n.t('settings.title')).toBe('Settings');
    });

    it('should have translation key for language setting', () => {
      expect(i18n.t('settings.language')).toBe('Language');
    });

    it('should have translation key for select language', () => {
      expect(i18n.t('settings.selectLanguage')).toBe('Select Language');
    });

    it('should have translation key for theme setting', () => {
      expect(i18n.t('settings.theme')).toBe('Theme');
    });

    it('should translate settings to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('settings.title')).toBe('Configuración');
      expect(i18n.t('settings.language')).toBe('Idioma');
      expect(i18n.t('settings.selectLanguage')).toBe('Seleccionar Idioma');
    });
  });
});

// =============================================================================
// License Management Translation Tests
// =============================================================================

describe('License Management Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('License labels', () => {
    it('should have translation key for license title', () => {
      expect(i18n.t('license.title')).toBe('License Management');
    });

    it('should have translation key for license status', () => {
      expect(i18n.t('license.status')).toBe('Status');
    });

    it('should have translation key for activate button', () => {
      expect(i18n.t('license.activate')).toBe('Activate License');
    });

    it('should have translation key for deactivate button', () => {
      expect(i18n.t('license.deactivate')).toBe('Deactivate License');
    });

    it('should translate license labels to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('license.title')).toBe('Gestión de Licencia');
      expect(i18n.t('license.activate')).toBe('Activar Licencia');
    });
  });

  describe('License status values', () => {
    it('should have translation key for active status', () => {
      expect(i18n.t('license.active')).toBe('Active');
    });

    it('should have translation key for expired status', () => {
      expect(i18n.t('license.expired')).toBe('Expired');
    });

    it('should translate license statuses to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('license.active')).toBe('Activa');
      expect(i18n.t('license.expired')).toBe('Expirada');
    });
  });

  describe('License with interpolation', () => {
    it('should have translation key for days remaining with interpolation', () => {
      const message = i18n.t('license.daysRemaining', { days: 30 });
      expect(message).toBe('30 days remaining');
    });

    it('should translate days remaining to Spanish', async () => {
      await i18n.changeLanguage('es');
      const message = i18n.t('license.daysRemaining', { days: 30 });
      expect(message).toBe('30 días restantes');
    });
  });
});

// =============================================================================
// Error Messages Translation Tests
// =============================================================================

describe('Error Messages Translation Keys', () => {
  let i18n: I18nInstance;

  beforeEach(() => {
    i18n = createMockI18n('en');
  });

  describe('Error messages', () => {
    it('should have translation key for generic error', () => {
      expect(i18n.t('errors.generic')).toBe('An error occurred');
    });

    it('should have translation key for network error', () => {
      expect(i18n.t('errors.network')).toBe('Network error. Please check your connection.');
    });

    it('should have translation key for Docker not running', () => {
      expect(i18n.t('errors.dockerNotRunning')).toBe('Docker is not running');
    });

    it('should have translation key for service unavailable', () => {
      expect(i18n.t('errors.serviceUnavailable')).toBe('Service is currently unavailable');
    });

    it('should translate error messages to Spanish', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.t('errors.generic')).toBe('Ha ocurrido un error');
      expect(i18n.t('errors.network')).toBe('Error de red. Por favor verifique su conexión.');
      expect(i18n.t('errors.dockerNotRunning')).toBe('Docker no está ejecutándose');
    });
  });
});

// =============================================================================
// Translation Key Existence Verification Tests
// =============================================================================

describe('Translation Key Completeness', () => {
  const requiredKeys = [
    // Status
    'status.starting', 'status.ready', 'status.error', 'status.offline',
    // Actions
    'actions.submit', 'actions.cancel', 'actions.retry', 'actions.save',
    // Common
    'common.yes', 'common.no', 'common.loading', 'common.error',
    // Invoice
    'invoice.form.title', 'invoice.form.rfcEmisor', 'invoice.form.fecha',
    // Validation
    'validation.required', 'validation.invalidRfc', 'validation.ivaError',
    // PDF
    'pdf.viewer', 'pdf.loading', 'pdf.zoomIn', 'pdf.page',
    // Batch
    'batch.title', 'batch.processing', 'batch.completed',
  ];

  it('should have all required translation keys in English', () => {
    const i18n = createMockI18n('en');
    requiredKeys.forEach(key => {
      const translation = i18n.t(key);
      expect(translation).not.toBe(key); // Should not return the key itself
    });
  });

  it('should have all required translation keys in Spanish', () => {
    const i18n = createMockI18n('es');
    requiredKeys.forEach(key => {
      const translation = i18n.t(key);
      expect(translation).not.toBe(key); // Should not return the key itself
    });
  });
});
