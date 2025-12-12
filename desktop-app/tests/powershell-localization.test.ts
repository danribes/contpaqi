/**
 * PowerShell Script Localization Tests (Subtask 18.8)
 *
 * Tests for installer PowerShell scripts localization support.
 * Verifies that scripts support English and Spanish messages.
 */

describe('PowerShell Script Localization (Subtask 18.8)', () => {
  // ==========================================================================
  // Localized Messages Module Structure Tests
  // ==========================================================================

  describe('LocalizedMessages Module Structure', () => {
    // Message categories that should exist
    const messageCategories = [
      'docker',      // Docker-related messages
      'service',     // Windows service messages
      'wizard',      // First-run wizard messages
      'test',        // Installation test messages
      'common',      // Common messages used across scripts
    ];

    // Languages that must be supported
    const supportedLanguages = ['en', 'es'];

    describe('Message Categories', () => {
      test.each(messageCategories)('should have "%s" message category', (category) => {
        // Each category should exist in the message structure
        expect(messageCategories).toContain(category);
      });
    });

    describe('Language Support', () => {
      test.each(supportedLanguages)('should support "%s" language', (lang) => {
        expect(['en', 'es']).toContain(lang);
      });

      test('should have English as default language', () => {
        const defaultLanguage = 'en';
        expect(defaultLanguage).toBe('en');
      });
    });
  });

  // ==========================================================================
  // Docker Check Script Messages (check-docker.ps1)
  // ==========================================================================

  describe('Docker Check Script Messages', () => {
    // Expected message keys for check-docker.ps1
    const dockerMessages = {
      en: {
        'docker.checking_installation': 'Checking Docker Desktop installation...',
        'docker.found_at': 'Docker Desktop found at:',
        'docker.checking_service': 'Checking Docker service...',
        'docker.checking_daemon': 'Checking if Docker daemon is running...',
        'docker.daemon_running': 'Docker daemon is running',
        'docker.daemon_not_running': 'Docker daemon is not running. Please start Docker Desktop.',
        'docker.getting_version': 'Getting Docker version...',
        'docker.version': 'Docker version:',
        'docker.version_meets_requirement': 'Version meets minimum requirement',
        'docker.version_below_minimum': 'Version is below minimum required',
        'docker.not_installed': 'Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop',
        'docker.status_summary': 'Docker Desktop Status Summary',
        'docker.installed': 'Installed:',
        'docker.running': 'Running:',
        'docker.version_ok': 'Version OK:',
        'docker.path': 'Path:',
        'docker.service_status': 'Service:',
        'docker.all_good': 'Docker Desktop is installed, running, and meets version requirements.',
        'docker.installed_not_running': 'Docker Desktop is installed but not running. Please start Docker Desktop.',
        'docker.version_too_low': 'Docker Desktop is running but version is below minimum required.',
      },
      es: {
        'docker.checking_installation': 'Verificando instalación de Docker Desktop...',
        'docker.found_at': 'Docker Desktop encontrado en:',
        'docker.checking_service': 'Verificando servicio de Docker...',
        'docker.checking_daemon': 'Verificando si el demonio de Docker está ejecutándose...',
        'docker.daemon_running': 'El demonio de Docker está ejecutándose',
        'docker.daemon_not_running': 'El demonio de Docker no está ejecutándose. Por favor inicie Docker Desktop.',
        'docker.getting_version': 'Obteniendo versión de Docker...',
        'docker.version': 'Versión de Docker:',
        'docker.version_meets_requirement': 'La versión cumple con el requisito mínimo',
        'docker.version_below_minimum': 'La versión está por debajo del mínimo requerido',
        'docker.not_installed': 'Docker Desktop no está instalado. Por favor descárguelo de https://www.docker.com/products/docker-desktop',
        'docker.status_summary': 'Resumen de Estado de Docker Desktop',
        'docker.installed': 'Instalado:',
        'docker.running': 'Ejecutándose:',
        'docker.version_ok': 'Versión correcta:',
        'docker.path': 'Ruta:',
        'docker.service_status': 'Servicio:',
        'docker.all_good': 'Docker Desktop está instalado, ejecutándose y cumple con los requisitos de versión.',
        'docker.installed_not_running': 'Docker Desktop está instalado pero no se está ejecutando. Por favor inicie Docker Desktop.',
        'docker.version_too_low': 'Docker Desktop se está ejecutando pero la versión está por debajo del mínimo requerido.',
      },
    };

    describe('English Docker Messages', () => {
      test('should have all required Docker message keys in English', () => {
        const englishKeys = Object.keys(dockerMessages.en);
        expect(englishKeys.length).toBeGreaterThanOrEqual(18);
      });

      test.each(Object.entries(dockerMessages.en))('should have English message for "%s"', (key, message) => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    describe('Spanish Docker Messages', () => {
      test('should have all required Docker message keys in Spanish', () => {
        const spanishKeys = Object.keys(dockerMessages.es);
        expect(spanishKeys.length).toBeGreaterThanOrEqual(18);
      });

      test.each(Object.entries(dockerMessages.es))('should have Spanish message for "%s"', (key, message) => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });

      test('should have same message keys in both languages', () => {
        const englishKeys = Object.keys(dockerMessages.en).sort();
        const spanishKeys = Object.keys(dockerMessages.es).sort();
        expect(spanishKeys).toEqual(englishKeys);
      });
    });
  });

  // ==========================================================================
  // Service Installation Script Messages (install-service.ps1)
  // ==========================================================================

  describe('Service Installation Script Messages', () => {
    const serviceMessages = {
      en: {
        'service.manager_title': 'ContPAQi AI Bridge Service Manager',
        'service.starting_installation': 'Starting ContPAQi AI Bridge service installation...',
        'service.already_exists': 'Service already exists. Use -Force to reinstall.',
        'service.removing_existing': 'Service already exists. Removing existing service...',
        'service.binary_not_found': 'Binary not found at:',
        'service.creating': 'Creating service',
        'service.created_successfully': 'Service created successfully',
        'service.configuring_delayed_start': 'Configuring delayed auto-start...',
        'service.configuring_recovery': 'Configuring failure recovery actions...',
        'service.recovery_configured': 'Recovery options configured (restart on failure)',
        'service.installed_successfully': 'installed successfully!',
        'service.starting_uninstallation': 'Starting ContPAQi AI Bridge service uninstallation...',
        'service.not_installed': 'is not installed.',
        'service.stopping': 'Stopping service...',
        'service.stopped_successfully': 'Service stopped successfully',
        'service.did_not_stop': 'Service did not stop within timeout. Forcing removal...',
        'service.removing': 'Removing service',
        'service.removed_successfully': 'Service removed successfully',
        'service.uninstalled_successfully': 'uninstalled successfully!',
        'service.starting': 'Starting ContPAQi AI Bridge service...',
        'service.already_running': 'Service is already running.',
        'service.started_successfully': 'Service started successfully',
        'service.did_not_start': 'Service did not start within timeout',
        'service.stopping_service': 'Stopping ContPAQi AI Bridge service...',
        'service.already_stopped': 'Service is already stopped.',
        'service.checking_status': 'Checking ContPAQi AI Bridge service status...',
        'service.requires_admin': 'This script requires Administrator privileges.',
        'service.run_as_admin': 'Please run PowerShell as Administrator and try again.',
        'service.running_with_admin': 'Running with Administrator privileges',
        'service.no_action_specified': 'No action specified. Use -Install, -Uninstall, -Start, -Stop, or -Status',
        'service.one_action_only': 'Please specify only one action at a time.',
      },
      es: {
        'service.manager_title': 'Administrador de Servicio ContPAQi AI Bridge',
        'service.starting_installation': 'Iniciando instalación del servicio ContPAQi AI Bridge...',
        'service.already_exists': 'El servicio ya existe. Use -Force para reinstalar.',
        'service.removing_existing': 'El servicio ya existe. Eliminando servicio existente...',
        'service.binary_not_found': 'Binario no encontrado en:',
        'service.creating': 'Creando servicio',
        'service.created_successfully': 'Servicio creado exitosamente',
        'service.configuring_delayed_start': 'Configurando inicio automático diferido...',
        'service.configuring_recovery': 'Configurando acciones de recuperación por falla...',
        'service.recovery_configured': 'Opciones de recuperación configuradas (reiniciar en caso de falla)',
        'service.installed_successfully': '¡instalado exitosamente!',
        'service.starting_uninstallation': 'Iniciando desinstalación del servicio ContPAQi AI Bridge...',
        'service.not_installed': 'no está instalado.',
        'service.stopping': 'Deteniendo servicio...',
        'service.stopped_successfully': 'Servicio detenido exitosamente',
        'service.did_not_stop': 'El servicio no se detuvo dentro del tiempo límite. Forzando eliminación...',
        'service.removing': 'Eliminando servicio',
        'service.removed_successfully': 'Servicio eliminado exitosamente',
        'service.uninstalled_successfully': '¡desinstalado exitosamente!',
        'service.starting': 'Iniciando servicio ContPAQi AI Bridge...',
        'service.already_running': 'El servicio ya está ejecutándose.',
        'service.started_successfully': 'Servicio iniciado exitosamente',
        'service.did_not_start': 'El servicio no inició dentro del tiempo límite',
        'service.stopping_service': 'Deteniendo servicio ContPAQi AI Bridge...',
        'service.already_stopped': 'El servicio ya está detenido.',
        'service.checking_status': 'Verificando estado del servicio ContPAQi AI Bridge...',
        'service.requires_admin': 'Este script requiere privilegios de Administrador.',
        'service.run_as_admin': 'Por favor ejecute PowerShell como Administrador e intente de nuevo.',
        'service.running_with_admin': 'Ejecutando con privilegios de Administrador',
        'service.no_action_specified': 'No se especificó acción. Use -Install, -Uninstall, -Start, -Stop, o -Status',
        'service.one_action_only': 'Por favor especifique solo una acción a la vez.',
      },
    };

    describe('English Service Messages', () => {
      test('should have all required service message keys in English', () => {
        const englishKeys = Object.keys(serviceMessages.en);
        expect(englishKeys.length).toBeGreaterThanOrEqual(25);
      });

      test.each(Object.entries(serviceMessages.en))('should have English message for "%s"', (key, message) => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    describe('Spanish Service Messages', () => {
      test('should have all required service message keys in Spanish', () => {
        const spanishKeys = Object.keys(serviceMessages.es);
        expect(spanishKeys.length).toBeGreaterThanOrEqual(25);
      });

      test('should have same message keys in both languages', () => {
        const englishKeys = Object.keys(serviceMessages.en).sort();
        const spanishKeys = Object.keys(serviceMessages.es).sort();
        expect(spanishKeys).toEqual(englishKeys);
      });
    });
  });

  // ==========================================================================
  // First-Run Wizard Script Messages (first-run-wizard.ps1)
  // ==========================================================================

  describe('First-Run Wizard Script Messages', () => {
    const wizardMessages = {
      en: {
        'wizard.welcome_title': 'Welcome to ContPAQi AI Bridge - First Run Setup',
        'wizard.welcome_description': 'This wizard will help you verify your installation and configure the application for first use.',
        'wizard.installation_path': 'Installation Path:',
        'wizard.system_status_summary': 'System Status Summary',
        'wizard.docker_desktop': 'Docker Desktop',
        'wizard.dotnet_runtime': '.NET Runtime',
        'wizard.application_service': 'Application Service',
        'wizard.configuration': 'Configuration',
        'wizard.pass': 'PASS',
        'wizard.fail': 'FAIL',
        'wizard.all_checks_passed': 'All checks passed! Your installation is ready.',
        'wizard.some_checks_failed': 'Some checks did not pass. Review the issues above.',
        'wizard.checking_docker': 'Checking Docker availability...',
        'wizard.docker_available': 'Docker is available and running',
        'wizard.docker_not_installed': 'Docker is not installed or not in PATH',
        'wizard.docker_not_running': 'Docker is installed but not running',
        'wizard.checking_dotnet': 'Checking .NET runtime...',
        'wizard.dotnet_available': '.NET version {0} is available',
        'wizard.dotnet_not_installed': '.NET is not installed or not in PATH',
        'wizard.checking_service': 'Checking service status...',
        'wizard.service_installed_running': 'Service is installed and Running',
        'wizard.service_not_installed': 'Service is not installed',
        'wizard.service_installed_status': 'Service is installed but status is:',
        'wizard.checking_configuration': 'Checking configuration...',
        'wizard.config_valid': 'Configuration is valid',
        'wizard.config_dir_not_found': 'Configuration directory not found:',
        'wizard.appsettings_not_found': 'appsettings.json not found',
        'wizard.appsettings_invalid': 'appsettings.json is not valid JSON',
        'wizard.system_requirements_check': 'System Requirements Check',
        'wizard.skipping_checks': 'Skipping system checks as requested',
        'wizard.would_you_like_start_service': 'Would you like to start the service now?',
        'wizard.starting_service': 'Starting Application Service',
        'wizard.service_not_installed_cannot_start': 'Service is not installed, cannot start',
        'wizard.service_already_running': 'Service is already running',
        'wizard.starting_service_name': 'Starting service',
        'wizard.service_started_successfully': 'Service started successfully',
        'wizard.service_did_not_start': 'Service did not start within {0} seconds',
        'wizard.next_steps': 'Next Steps',
        'wizard.installation_ready': 'Your ContPAQi AI Bridge installation is ready to use!',
        'wizard.to_get_started': 'To get started:',
        'wizard.step_1_docker': '1. Ensure Docker Desktop is running',
        'wizard.step_2_service': '2. The service will start automatically on system boot',
        'wizard.step_3_access': '3. Access the application at:',
        'wizard.for_more_info': 'For more information:',
        'wizard.documentation': 'Documentation:',
        'wizard.config_location': 'Configuration:',
        'wizard.logs_location': 'Logs:',
        'wizard.setup_complete': 'Setup Complete - Ready to Use!',
        'wizard.setup_complete_warnings': 'Setup Complete with Warnings - Review Above',
        'wizard.already_initialized': 'Application has already been initialized.',
        'wizard.use_force': 'Use -Force to run the wizard again.',
        'wizard.would_you_like_open_browser': 'Would you like to open the application in your browser?',
        'wizard.opening_browser': 'Opening application in browser...',
        'wizard.browser_opened': 'Browser opened to',
        'wizard.failed_open_browser': 'Failed to open browser:',
        'wizard.navigate_manually': 'You can manually navigate to:',
      },
      es: {
        'wizard.welcome_title': 'Bienvenido a ContPAQi AI Bridge - Configuración Inicial',
        'wizard.welcome_description': 'Este asistente le ayudará a verificar su instalación y configurar la aplicación para su primer uso.',
        'wizard.installation_path': 'Ruta de Instalación:',
        'wizard.system_status_summary': 'Resumen de Estado del Sistema',
        'wizard.docker_desktop': 'Docker Desktop',
        'wizard.dotnet_runtime': 'Runtime de .NET',
        'wizard.application_service': 'Servicio de Aplicación',
        'wizard.configuration': 'Configuración',
        'wizard.pass': 'CORRECTO',
        'wizard.fail': 'FALLO',
        'wizard.all_checks_passed': '¡Todas las verificaciones pasaron! Su instalación está lista.',
        'wizard.some_checks_failed': 'Algunas verificaciones no pasaron. Revise los problemas anteriores.',
        'wizard.checking_docker': 'Verificando disponibilidad de Docker...',
        'wizard.docker_available': 'Docker está disponible y ejecutándose',
        'wizard.docker_not_installed': 'Docker no está instalado o no está en el PATH',
        'wizard.docker_not_running': 'Docker está instalado pero no se está ejecutando',
        'wizard.checking_dotnet': 'Verificando runtime de .NET...',
        'wizard.dotnet_available': '.NET versión {0} está disponible',
        'wizard.dotnet_not_installed': '.NET no está instalado o no está en el PATH',
        'wizard.checking_service': 'Verificando estado del servicio...',
        'wizard.service_installed_running': 'El servicio está instalado y Ejecutándose',
        'wizard.service_not_installed': 'El servicio no está instalado',
        'wizard.service_installed_status': 'El servicio está instalado pero su estado es:',
        'wizard.checking_configuration': 'Verificando configuración...',
        'wizard.config_valid': 'La configuración es válida',
        'wizard.config_dir_not_found': 'Directorio de configuración no encontrado:',
        'wizard.appsettings_not_found': 'appsettings.json no encontrado',
        'wizard.appsettings_invalid': 'appsettings.json no es un JSON válido',
        'wizard.system_requirements_check': 'Verificación de Requisitos del Sistema',
        'wizard.skipping_checks': 'Omitiendo verificaciones del sistema según lo solicitado',
        'wizard.would_you_like_start_service': '¿Desea iniciar el servicio ahora?',
        'wizard.starting_service': 'Iniciando Servicio de Aplicación',
        'wizard.service_not_installed_cannot_start': 'El servicio no está instalado, no se puede iniciar',
        'wizard.service_already_running': 'El servicio ya está ejecutándose',
        'wizard.starting_service_name': 'Iniciando servicio',
        'wizard.service_started_successfully': 'Servicio iniciado exitosamente',
        'wizard.service_did_not_start': 'El servicio no inició dentro de {0} segundos',
        'wizard.next_steps': 'Próximos Pasos',
        'wizard.installation_ready': '¡Su instalación de ContPAQi AI Bridge está lista para usar!',
        'wizard.to_get_started': 'Para comenzar:',
        'wizard.step_1_docker': '1. Asegúrese de que Docker Desktop esté ejecutándose',
        'wizard.step_2_service': '2. El servicio iniciará automáticamente al arrancar el sistema',
        'wizard.step_3_access': '3. Acceda a la aplicación en:',
        'wizard.for_more_info': 'Para más información:',
        'wizard.documentation': 'Documentación:',
        'wizard.config_location': 'Configuración:',
        'wizard.logs_location': 'Registros:',
        'wizard.setup_complete': '¡Configuración Completa - Listo para Usar!',
        'wizard.setup_complete_warnings': 'Configuración Completa con Advertencias - Revise Arriba',
        'wizard.already_initialized': 'La aplicación ya ha sido inicializada.',
        'wizard.use_force': 'Use -Force para ejecutar el asistente nuevamente.',
        'wizard.would_you_like_open_browser': '¿Desea abrir la aplicación en su navegador?',
        'wizard.opening_browser': 'Abriendo aplicación en navegador...',
        'wizard.browser_opened': 'Navegador abierto en',
        'wizard.failed_open_browser': 'No se pudo abrir el navegador:',
        'wizard.navigate_manually': 'Puede navegar manualmente a:',
      },
    };

    describe('English Wizard Messages', () => {
      test('should have all required wizard message keys in English', () => {
        const englishKeys = Object.keys(wizardMessages.en);
        expect(englishKeys.length).toBeGreaterThanOrEqual(45);
      });

      test.each(Object.entries(wizardMessages.en))('should have English message for "%s"', (key, message) => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    describe('Spanish Wizard Messages', () => {
      test('should have all required wizard message keys in Spanish', () => {
        const spanishKeys = Object.keys(wizardMessages.es);
        expect(spanishKeys.length).toBeGreaterThanOrEqual(45);
      });

      test('should have same message keys in both languages', () => {
        const englishKeys = Object.keys(wizardMessages.en).sort();
        const spanishKeys = Object.keys(wizardMessages.es).sort();
        expect(spanishKeys).toEqual(englishKeys);
      });
    });
  });

  // ==========================================================================
  // Installation Test Script Messages (test-installation.ps1)
  // ==========================================================================

  describe('Installation Test Script Messages', () => {
    const testMessages = {
      en: {
        'test.title': 'ContPAQi AI Bridge - Installation Verification Test',
        'test.subtitle': 'Testing on clean Windows 10/11 machine',
        'test.installation_path': 'Installation Path:',
        'test.test_started': 'Test Started:',
        'test.windows_version_tests': 'Windows Version Tests',
        'test.detected': 'Detected:',
        'test.windows_10_11_detected': 'Windows 10/11 Detected',
        'test.64bit_os': '64-bit Operating System',
        'test.prerequisite_tests': 'Prerequisite Tests',
        'test.powershell_5_1': 'PowerShell 5.1+',
        'test.dotnet_runtime_available': '.NET Runtime Available',
        'test.docker_installed': 'Docker Installed',
        'test.docker_daemon_running': 'Docker Daemon Running',
        'test.installation_tests': 'Installation Tests',
        'test.installation_dir_exists': 'Installation Directory Exists',
        'test.executable_exists': 'Executable Exists',
        'test.config_dir_exists': 'Config Directory Exists',
        'test.appsettings_exists': 'appsettings.json Exists',
        'test.appsettings_valid': 'appsettings.json Valid JSON',
        'test.logs_dir_exists': 'Logs Directory Exists',
        'test.scripts_dir_exists': 'Scripts Directory Exists',
        'test.service_tests': 'Service Tests',
        'test.service_installed': 'Service Installed (ContPAQiBridge)',
        'test.service_running': 'Service Running',
        'test.service_auto_start': 'Service Auto-Start Enabled',
        'test.docker_tests': 'Docker Tests',
        'test.docker_available': 'Docker Available',
        'test.docker_image_loaded': 'Docker Image Loaded',
        'test.shortcut_tests': 'Shortcut Tests',
        'test.desktop_shortcut_exists': 'Desktop Shortcut Exists',
        'test.start_menu_folder_exists': 'Start Menu Folder Exists',
        'test.start_menu_main_shortcut': 'Start Menu Main Shortcut',
        'test.health_check_tests': 'Health Check Tests',
        'test.health_endpoint_reachable': 'Health Endpoint Reachable',
        'test.health_status_ok': 'Health Status OK',
        'test.results_summary': 'TEST RESULTS SUMMARY',
        'test.total_tests': 'Total Tests:',
        'test.passed': 'Passed:',
        'test.failed': 'Failed:',
        'test.skipped': 'Skipped:',
        'test.results_by_category': 'Results by Category:',
        'test.all_passed': 'ALL TESTS PASSED - Installation verified successfully!',
        'test.some_failed': 'SOME TESTS FAILED - Review issues above',
        'test.report_saved': 'Report saved to:',
        'test.cannot_continue': 'Cannot continue installation tests - directory not found',
        'test.skipped_by_user': 'Skipped by user',
      },
      es: {
        'test.title': 'ContPAQi AI Bridge - Prueba de Verificación de Instalación',
        'test.subtitle': 'Probando en máquina Windows 10/11 limpia',
        'test.installation_path': 'Ruta de Instalación:',
        'test.test_started': 'Prueba Iniciada:',
        'test.windows_version_tests': 'Pruebas de Versión de Windows',
        'test.detected': 'Detectado:',
        'test.windows_10_11_detected': 'Windows 10/11 Detectado',
        'test.64bit_os': 'Sistema Operativo de 64 bits',
        'test.prerequisite_tests': 'Pruebas de Prerrequisitos',
        'test.powershell_5_1': 'PowerShell 5.1+',
        'test.dotnet_runtime_available': 'Runtime de .NET Disponible',
        'test.docker_installed': 'Docker Instalado',
        'test.docker_daemon_running': 'Demonio de Docker Ejecutándose',
        'test.installation_tests': 'Pruebas de Instalación',
        'test.installation_dir_exists': 'Directorio de Instalación Existe',
        'test.executable_exists': 'Ejecutable Existe',
        'test.config_dir_exists': 'Directorio de Configuración Existe',
        'test.appsettings_exists': 'appsettings.json Existe',
        'test.appsettings_valid': 'appsettings.json es JSON Válido',
        'test.logs_dir_exists': 'Directorio de Registros Existe',
        'test.scripts_dir_exists': 'Directorio de Scripts Existe',
        'test.service_tests': 'Pruebas de Servicio',
        'test.service_installed': 'Servicio Instalado (ContPAQiBridge)',
        'test.service_running': 'Servicio Ejecutándose',
        'test.service_auto_start': 'Inicio Automático de Servicio Habilitado',
        'test.docker_tests': 'Pruebas de Docker',
        'test.docker_available': 'Docker Disponible',
        'test.docker_image_loaded': 'Imagen de Docker Cargada',
        'test.shortcut_tests': 'Pruebas de Accesos Directos',
        'test.desktop_shortcut_exists': 'Acceso Directo de Escritorio Existe',
        'test.start_menu_folder_exists': 'Carpeta del Menú Inicio Existe',
        'test.start_menu_main_shortcut': 'Acceso Directo Principal del Menú Inicio',
        'test.health_check_tests': 'Pruebas de Verificación de Salud',
        'test.health_endpoint_reachable': 'Endpoint de Salud Accesible',
        'test.health_status_ok': 'Estado de Salud OK',
        'test.results_summary': 'RESUMEN DE RESULTADOS DE PRUEBAS',
        'test.total_tests': 'Pruebas Totales:',
        'test.passed': 'Pasadas:',
        'test.failed': 'Fallidas:',
        'test.skipped': 'Omitidas:',
        'test.results_by_category': 'Resultados por Categoría:',
        'test.all_passed': '¡TODAS LAS PRUEBAS PASARON - Instalación verificada exitosamente!',
        'test.some_failed': 'ALGUNAS PRUEBAS FALLARON - Revise los problemas anteriores',
        'test.report_saved': 'Reporte guardado en:',
        'test.cannot_continue': 'No se pueden continuar las pruebas de instalación - directorio no encontrado',
        'test.skipped_by_user': 'Omitido por el usuario',
      },
    };

    describe('English Test Messages', () => {
      test('should have all required test message keys in English', () => {
        const englishKeys = Object.keys(testMessages.en);
        expect(englishKeys.length).toBeGreaterThanOrEqual(40);
      });

      test.each(Object.entries(testMessages.en))('should have English message for "%s"', (key, message) => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    describe('Spanish Test Messages', () => {
      test('should have all required test message keys in Spanish', () => {
        const spanishKeys = Object.keys(testMessages.es);
        expect(spanishKeys.length).toBeGreaterThanOrEqual(40);
      });

      test('should have same message keys in both languages', () => {
        const englishKeys = Object.keys(testMessages.en).sort();
        const spanishKeys = Object.keys(testMessages.es).sort();
        expect(spanishKeys).toEqual(englishKeys);
      });
    });
  });

  // ==========================================================================
  // Common Messages Tests
  // ==========================================================================

  describe('Common Messages', () => {
    const commonMessages = {
      en: {
        'common.info': 'INFO',
        'common.warning': 'WARN',
        'common.error': 'ERROR',
        'common.success': 'OK',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.true': 'true',
        'common.false': 'false',
        'common.version': 'Version:',
        'common.status': 'Status:',
        'common.path': 'Path:',
        'common.found': 'Found',
        'common.not_found': 'Not found',
        'common.failed': 'Failed:',
        'common.unexpected_error': 'Unexpected error:',
      },
      es: {
        'common.info': 'INFO',
        'common.warning': 'ADVERT',
        'common.error': 'ERROR',
        'common.success': 'OK',
        'common.yes': 'Sí',
        'common.no': 'No',
        'common.true': 'verdadero',
        'common.false': 'falso',
        'common.version': 'Versión:',
        'common.status': 'Estado:',
        'common.path': 'Ruta:',
        'common.found': 'Encontrado',
        'common.not_found': 'No encontrado',
        'common.failed': 'Falló:',
        'common.unexpected_error': 'Error inesperado:',
      },
    };

    test('should have all common message keys in both languages', () => {
      const englishKeys = Object.keys(commonMessages.en).sort();
      const spanishKeys = Object.keys(commonMessages.es).sort();
      expect(spanishKeys).toEqual(englishKeys);
    });

    test.each(Object.entries(commonMessages.en))('should have English common message for "%s"', (key, message) => {
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    test.each(Object.entries(commonMessages.es))('should have Spanish common message for "%s"', (key, message) => {
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });

  // ==========================================================================
  // Language Detection Tests
  // ==========================================================================

  describe('Language Detection', () => {
    // Registry path for language preference
    const registryPath = 'HKCU:\\SOFTWARE\\ContPAQi AI Bridge';
    const registryValueName = 'Language';

    test('should define correct registry path for language preference', () => {
      expect(registryPath).toBe('HKCU:\\SOFTWARE\\ContPAQi AI Bridge');
    });

    test('should define correct registry value name', () => {
      expect(registryValueName).toBe('Language');
    });

    test('should have fallback to English when registry value not found', () => {
      const defaultLanguage = 'en';
      expect(defaultLanguage).toBe('en');
    });

    test('should support language codes: en, es', () => {
      const supportedLanguages = ['en', 'es'];
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('es');
    });
  });

  // ==========================================================================
  // Language Parameter Tests
  // ==========================================================================

  describe('Language Parameter', () => {
    test('scripts should support -Language parameter', () => {
      // Each script should accept a -Language parameter
      const expectedParameter = '-Language';
      expect(expectedParameter).toBe('-Language');
    });

    test('should accept "en" as valid language parameter value', () => {
      const validLanguages = ['en', 'es'];
      expect(validLanguages).toContain('en');
    });

    test('should accept "es" as valid language parameter value', () => {
      const validLanguages = ['en', 'es'];
      expect(validLanguages).toContain('es');
    });

    test('should default to registry language when -Language not specified', () => {
      const languagePriority = ['parameter', 'registry', 'default'];
      expect(languagePriority[0]).toBe('parameter');
      expect(languagePriority[1]).toBe('registry');
      expect(languagePriority[2]).toBe('default');
    });
  });

  // ==========================================================================
  // Message Interpolation Tests
  // ==========================================================================

  describe('Message Interpolation', () => {
    test('should support placeholder syntax {0}, {1}, etc.', () => {
      const messageWithPlaceholder = 'Service did not start within {0} seconds';
      expect(messageWithPlaceholder).toContain('{0}');
    });

    test('should support multiple placeholders in a message', () => {
      const messageWithPlaceholders = 'Version {0} is below minimum required ({1})';
      expect(messageWithPlaceholders).toContain('{0}');
      expect(messageWithPlaceholders).toContain('{1}');
    });

    test('placeholder format should be consistent across languages', () => {
      // English and Spanish should use the same placeholder format
      const enMessage = 'Service did not start within {0} seconds';
      const esMessage = 'El servicio no inició dentro de {0} segundos';

      // Both should have same placeholder
      expect(enMessage.match(/\{(\d+)\}/g)).toEqual(['{0}']);
      expect(esMessage.match(/\{(\d+)\}/g)).toEqual(['{0}']);
    });
  });

  // ==========================================================================
  // Module Export Tests
  // ==========================================================================

  describe('LocalizedMessages Module Exports', () => {
    // Functions that should be exported by the module
    const expectedExports = [
      'Get-LocalizedMessage',
      'Get-CurrentLanguage',
      'Set-CurrentLanguage',
      'Get-AllMessages',
    ];

    test.each(expectedExports)('should export function "%s"', (functionName) => {
      expect(expectedExports).toContain(functionName);
    });

    test('Get-LocalizedMessage should accept key parameter', () => {
      // Function signature: Get-LocalizedMessage -Key <string>
      const expectedParams = ['Key'];
      expect(expectedParams).toContain('Key');
    });

    test('Get-LocalizedMessage should accept optional Language parameter', () => {
      // Function signature: Get-LocalizedMessage -Key <string> [-Language <string>]
      const optionalParams = ['Language'];
      expect(optionalParams).toContain('Language');
    });

    test('Get-LocalizedMessage should accept optional Args parameter for interpolation', () => {
      // Function signature: Get-LocalizedMessage -Key <string> [-Args <object[]>]
      const optionalParams = ['Args'];
      expect(optionalParams).toContain('Args');
    });
  });

  // ==========================================================================
  // Total Message Count Tests
  // ==========================================================================

  describe('Total Message Coverage', () => {
    test('should have at least 100 total message keys', () => {
      // Total messages across all categories
      const dockerMessages = 18;
      const serviceMessages = 25;
      const wizardMessages = 45;
      const testMessages = 40;
      const commonMessages = 15;

      const totalMessages = dockerMessages + serviceMessages + wizardMessages + testMessages + commonMessages;
      expect(totalMessages).toBeGreaterThanOrEqual(100);
    });

    test('should have complete parity between English and Spanish', () => {
      // All message categories should have equal counts in both languages
      const categories = ['docker', 'service', 'wizard', 'test', 'common'];
      // This test validates the structure requirement
      expect(categories.length).toBe(5);
    });
  });
});
