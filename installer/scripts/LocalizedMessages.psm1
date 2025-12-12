<#
.SYNOPSIS
    Localized Messages Module for ContPAQi AI Bridge Installer Scripts

.DESCRIPTION
    This module provides localized message support for all PowerShell installer scripts.
    Supports English (en) and Spanish (es) languages.

    Language detection priority:
    1. -Language parameter passed to Get-LocalizedMessage
    2. Script-level $script:CurrentLanguage variable
    3. Registry value: HKCU:\SOFTWARE\ContPAQi AI Bridge\Language
    4. Default: 'en' (English)

.NOTES
    Author: ContPAQi AI Bridge Team
    Version: 1.0.0
    Subtask: 18.8 - Update installer scripts with localized messages
#>

# =============================================================================
# Configuration
# =============================================================================

$script:SupportedLanguages = @('en', 'es')
$script:DefaultLanguage = 'en'
$script:CurrentLanguage = $null
$script:RegistryPath = 'HKCU:\SOFTWARE\ContPAQi AI Bridge'
$script:RegistryValueName = 'Language'

# =============================================================================
# Message Definitions
# =============================================================================

$script:Messages = @{
    # =========================================================================
    # Docker Messages (check-docker.ps1)
    # =========================================================================
    'docker.checking_installation' = @{
        en = 'Checking Docker Desktop installation...'
        es = 'Verificando instalación de Docker Desktop...'
    }
    'docker.found_at' = @{
        en = 'Docker Desktop found at:'
        es = 'Docker Desktop encontrado en:'
    }
    'docker.checking_service' = @{
        en = 'Checking Docker service...'
        es = 'Verificando servicio de Docker...'
    }
    'docker.checking_daemon' = @{
        en = 'Checking if Docker daemon is running...'
        es = 'Verificando si el demonio de Docker está ejecutándose...'
    }
    'docker.daemon_running' = @{
        en = 'Docker daemon is running'
        es = 'El demonio de Docker está ejecutándose'
    }
    'docker.daemon_not_running' = @{
        en = 'Docker daemon is not running. Please start Docker Desktop.'
        es = 'El demonio de Docker no está ejecutándose. Por favor inicie Docker Desktop.'
    }
    'docker.getting_version' = @{
        en = 'Getting Docker version...'
        es = 'Obteniendo versión de Docker...'
    }
    'docker.version' = @{
        en = 'Docker version:'
        es = 'Versión de Docker:'
    }
    'docker.version_meets_requirement' = @{
        en = 'Version meets minimum requirement'
        es = 'La versión cumple con el requisito mínimo'
    }
    'docker.version_below_minimum' = @{
        en = 'Version {0} is below minimum required ({1})'
        es = 'La versión {0} está por debajo del mínimo requerido ({1})'
    }
    'docker.not_installed' = @{
        en = 'Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop'
        es = 'Docker Desktop no está instalado. Por favor descárguelo de https://www.docker.com/products/docker-desktop'
    }
    'docker.status_summary' = @{
        en = 'Docker Desktop Status Summary'
        es = 'Resumen de Estado de Docker Desktop'
    }
    'docker.installed' = @{
        en = 'Installed:'
        es = 'Instalado:'
    }
    'docker.running' = @{
        en = 'Running:'
        es = 'Ejecutándose:'
    }
    'docker.version_ok' = @{
        en = 'Version OK:'
        es = 'Versión correcta:'
    }
    'docker.path' = @{
        en = 'Path:'
        es = 'Ruta:'
    }
    'docker.service_status' = @{
        en = 'Service:'
        es = 'Servicio:'
    }
    'docker.all_good' = @{
        en = 'Docker Desktop is installed, running, and meets version requirements.'
        es = 'Docker Desktop está instalado, ejecutándose y cumple con los requisitos de versión.'
    }
    'docker.installed_not_running' = @{
        en = 'Docker Desktop is installed but not running. Please start Docker Desktop.'
        es = 'Docker Desktop está instalado pero no se está ejecutando. Por favor inicie Docker Desktop.'
    }
    'docker.version_too_low' = @{
        en = 'Docker Desktop is running but version is below minimum required ({0}).'
        es = 'Docker Desktop se está ejecutando pero la versión está por debajo del mínimo requerido ({0}).'
    }
    'docker.could_not_determine_version' = @{
        en = 'Could not determine Docker version'
        es = 'No se pudo determinar la versión de Docker'
    }
    'docker.message' = @{
        en = 'Message:'
        es = 'Mensaje:'
    }

    # =========================================================================
    # Service Messages (install-service.ps1)
    # =========================================================================
    'service.manager_title' = @{
        en = 'ContPAQi AI Bridge Service Manager v1.0.0'
        es = 'Administrador de Servicio ContPAQi AI Bridge v1.0.0'
    }
    'service.starting_installation' = @{
        en = 'Starting ContPAQi AI Bridge service installation...'
        es = 'Iniciando instalación del servicio ContPAQi AI Bridge...'
    }
    'service.already_exists' = @{
        en = "Service '{0}' already exists. Use -Force to reinstall."
        es = "El servicio '{0}' ya existe. Use -Force para reinstalar."
    }
    'service.removing_existing' = @{
        en = 'Service already exists. Removing existing service...'
        es = 'El servicio ya existe. Eliminando servicio existente...'
    }
    'service.binary_not_found' = @{
        en = 'Binary not found at: {0}'
        es = 'Binario no encontrado en: {0}'
    }
    'service.binary_path' = @{
        en = 'Binary path: {0}'
        es = 'Ruta del binario: {0}'
    }
    'service.working_directory' = @{
        en = 'Working directory: {0}'
        es = 'Directorio de trabajo: {0}'
    }
    'service.creating' = @{
        en = "Creating service '{0}'..."
        es = "Creando servicio '{0}'..."
    }
    'service.created_successfully' = @{
        en = 'Service created successfully'
        es = 'Servicio creado exitosamente'
    }
    'service.configuring_delayed_start' = @{
        en = 'Configuring delayed auto-start...'
        es = 'Configurando inicio automático diferido...'
    }
    'service.could_not_set_delayed_start' = @{
        en = 'Warning: Could not set delayed auto-start: {0}'
        es = 'Advertencia: No se pudo configurar el inicio diferido: {0}'
    }
    'service.configuring_recovery' = @{
        en = 'Configuring failure recovery actions...'
        es = 'Configurando acciones de recuperación por falla...'
    }
    'service.recovery_configured' = @{
        en = 'Recovery options configured (restart on failure)'
        es = 'Opciones de recuperación configuradas (reiniciar en caso de falla)'
    }
    'service.could_not_configure_recovery' = @{
        en = 'Warning: Could not configure recovery options: {0}'
        es = 'Advertencia: No se pudieron configurar las opciones de recuperación: {0}'
    }
    'service.installed_successfully' = @{
        en = "Service '{0}' installed successfully!"
        es = "¡Servicio '{0}' instalado exitosamente!"
    }
    'service.failed_to_install' = @{
        en = 'Failed to install service: {0}'
        es = 'Error al instalar el servicio: {0}'
    }
    'service.starting_uninstallation' = @{
        en = 'Starting ContPAQi AI Bridge service uninstallation...'
        es = 'Iniciando desinstalación del servicio ContPAQi AI Bridge...'
    }
    'service.not_installed' = @{
        en = "Service '{0}' is not installed."
        es = "El servicio '{0}' no está instalado."
    }
    'service.stopping' = @{
        en = 'Stopping service...'
        es = 'Deteniendo servicio...'
    }
    'service.stopped_successfully' = @{
        en = 'Service stopped successfully'
        es = 'Servicio detenido exitosamente'
    }
    'service.did_not_stop' = @{
        en = 'Service did not stop within timeout. Forcing removal...'
        es = 'El servicio no se detuvo dentro del tiempo límite. Forzando eliminación...'
    }
    'service.removing' = @{
        en = "Removing service '{0}'..."
        es = "Eliminando servicio '{0}'..."
    }
    'service.removed_successfully' = @{
        en = 'Service removed successfully'
        es = 'Servicio eliminado exitosamente'
    }
    'service.uninstalled_successfully' = @{
        en = "Service '{0}' uninstalled successfully!"
        es = "¡Servicio '{0}' desinstalado exitosamente!"
    }
    'service.failed_to_uninstall' = @{
        en = 'Failed to uninstall service: {0}'
        es = 'Error al desinstalar el servicio: {0}'
    }
    'service.starting' = @{
        en = 'Starting ContPAQi AI Bridge service...'
        es = 'Iniciando servicio ContPAQi AI Bridge...'
    }
    'service.already_running' = @{
        en = 'Service is already running.'
        es = 'El servicio ya está ejecutándose.'
    }
    'service.started_successfully' = @{
        en = 'Service started successfully'
        es = 'Servicio iniciado exitosamente'
    }
    'service.did_not_start' = @{
        en = 'Service did not start within timeout'
        es = 'El servicio no inició dentro del tiempo límite'
    }
    'service.failed_to_start' = @{
        en = 'Failed to start service: {0}'
        es = 'Error al iniciar el servicio: {0}'
    }
    'service.stopping_service' = @{
        en = 'Stopping ContPAQi AI Bridge service...'
        es = 'Deteniendo servicio ContPAQi AI Bridge...'
    }
    'service.already_stopped' = @{
        en = 'Service is already stopped.'
        es = 'El servicio ya está detenido.'
    }
    'service.failed_to_stop' = @{
        en = 'Failed to stop service: {0}'
        es = 'Error al detener el servicio: {0}'
    }
    'service.checking_status' = @{
        en = 'Checking ContPAQi AI Bridge service status...'
        es = 'Verificando estado del servicio ContPAQi AI Bridge...'
    }
    'service.service_name' = @{
        en = 'Service Name: {0}'
        es = 'Nombre del Servicio: {0}'
    }
    'service.display_name' = @{
        en = 'Display Name: {0}'
        es = 'Nombre para Mostrar: {0}'
    }
    'service.status' = @{
        en = 'Status: {0}'
        es = 'Estado: {0}'
    }
    'service.start_type' = @{
        en = 'Start Type: {0}'
        es = 'Tipo de Inicio: {0}'
    }
    'service.requires_admin' = @{
        en = 'This script requires Administrator privileges.'
        es = 'Este script requiere privilegios de Administrador.'
    }
    'service.run_as_admin' = @{
        en = 'Please run PowerShell as Administrator and try again.'
        es = 'Por favor ejecute PowerShell como Administrador e intente de nuevo.'
    }
    'service.running_with_admin' = @{
        en = 'Running with Administrator privileges'
        es = 'Ejecutando con privilegios de Administrador'
    }
    'service.no_action_specified' = @{
        en = 'No action specified. Use -Install, -Uninstall, -Start, -Stop, or -Status'
        es = 'No se especificó acción. Use -Install, -Uninstall, -Start, -Stop, o -Status'
    }
    'service.one_action_only' = @{
        en = 'Please specify only one action at a time.'
        es = 'Por favor especifique solo una acción a la vez.'
    }

    # =========================================================================
    # First-Run Wizard Messages (first-run-wizard.ps1)
    # =========================================================================
    'wizard.welcome_title' = @{
        en = 'Welcome to ContPAQi AI Bridge - First Run Setup'
        es = 'Bienvenido a ContPAQi AI Bridge - Configuración Inicial'
    }
    'wizard.welcome_description' = @{
        en = 'This wizard will help you verify your installation and configure the application for first use.'
        es = 'Este asistente le ayudará a verificar su instalación y configurar la aplicación para su primer uso.'
    }
    'wizard.installation_path' = @{
        en = 'Installation Path: {0}'
        es = 'Ruta de Instalación: {0}'
    }
    'wizard.system_status_summary' = @{
        en = 'System Status Summary'
        es = 'Resumen de Estado del Sistema'
    }
    'wizard.docker_desktop' = @{
        en = 'Docker Desktop'
        es = 'Docker Desktop'
    }
    'wizard.dotnet_runtime' = @{
        en = '.NET Runtime'
        es = 'Runtime de .NET'
    }
    'wizard.application_service' = @{
        en = 'Application Service'
        es = 'Servicio de Aplicación'
    }
    'wizard.configuration' = @{
        en = 'Configuration'
        es = 'Configuración'
    }
    'wizard.pass' = @{
        en = 'PASS'
        es = 'CORRECTO'
    }
    'wizard.fail' = @{
        en = 'FAIL'
        es = 'FALLO'
    }
    'wizard.all_checks_passed' = @{
        en = 'All checks passed! Your installation is ready.'
        es = '¡Todas las verificaciones pasaron! Su instalación está lista.'
    }
    'wizard.some_checks_failed' = @{
        en = 'Some checks did not pass. Review the issues above.'
        es = 'Algunas verificaciones no pasaron. Revise los problemas anteriores.'
    }
    'wizard.checking_docker' = @{
        en = 'Checking Docker availability...'
        es = 'Verificando disponibilidad de Docker...'
    }
    'wizard.docker_available' = @{
        en = 'Docker is available and running'
        es = 'Docker está disponible y ejecutándose'
    }
    'wizard.docker_not_installed' = @{
        en = 'Docker is not installed or not in PATH'
        es = 'Docker no está instalado o no está en el PATH'
    }
    'wizard.docker_not_running' = @{
        en = 'Docker is installed but not running'
        es = 'Docker está instalado pero no se está ejecutando'
    }
    'wizard.checking_dotnet' = @{
        en = 'Checking .NET runtime...'
        es = 'Verificando runtime de .NET...'
    }
    'wizard.dotnet_available' = @{
        en = '.NET version {0} is available'
        es = '.NET versión {0} está disponible'
    }
    'wizard.dotnet_not_installed' = @{
        en = '.NET is not installed or not in PATH'
        es = '.NET no está instalado o no está en el PATH'
    }
    'wizard.checking_service' = @{
        en = 'Checking service status...'
        es = 'Verificando estado del servicio...'
    }
    'wizard.service_installed_running' = @{
        en = 'Service is installed and Running'
        es = 'El servicio está instalado y Ejecutándose'
    }
    'wizard.service_not_installed' = @{
        en = "Service '{0}' is not installed"
        es = "El servicio '{0}' no está instalado"
    }
    'wizard.service_installed_status' = @{
        en = 'Service is installed but status is: {0}'
        es = 'El servicio está instalado pero su estado es: {0}'
    }
    'wizard.checking_configuration' = @{
        en = 'Checking configuration...'
        es = 'Verificando configuración...'
    }
    'wizard.config_valid' = @{
        en = 'Configuration is valid'
        es = 'La configuración es válida'
    }
    'wizard.config_dir_not_found' = @{
        en = 'Configuration directory not found: {0}'
        es = 'Directorio de configuración no encontrado: {0}'
    }
    'wizard.appsettings_not_found' = @{
        en = 'appsettings.json not found'
        es = 'appsettings.json no encontrado'
    }
    'wizard.appsettings_invalid' = @{
        en = 'appsettings.json is not valid JSON'
        es = 'appsettings.json no es un JSON válido'
    }
    'wizard.system_requirements_check' = @{
        en = 'System Requirements Check'
        es = 'Verificación de Requisitos del Sistema'
    }
    'wizard.skipping_checks' = @{
        en = 'Skipping system checks as requested'
        es = 'Omitiendo verificaciones del sistema según lo solicitado'
    }
    'wizard.would_you_like_start_service' = @{
        en = 'Would you like to start the service now?'
        es = '¿Desea iniciar el servicio ahora?'
    }
    'wizard.starting_service' = @{
        en = 'Starting Application Service'
        es = 'Iniciando Servicio de Aplicación'
    }
    'wizard.service_not_installed_cannot_start' = @{
        en = 'Service is not installed, cannot start'
        es = 'El servicio no está instalado, no se puede iniciar'
    }
    'wizard.service_already_running' = @{
        en = 'Service is already running'
        es = 'El servicio ya está ejecutándose'
    }
    'wizard.starting_service_name' = @{
        en = "Starting service '{0}'..."
        es = "Iniciando servicio '{0}'..."
    }
    'wizard.service_started_successfully' = @{
        en = 'Service started successfully'
        es = 'Servicio iniciado exitosamente'
    }
    'wizard.service_did_not_start' = @{
        en = 'Service did not start within {0} seconds'
        es = 'El servicio no inició dentro de {0} segundos'
    }
    'wizard.failed_to_start_service' = @{
        en = 'Failed to start service: {0}'
        es = 'Error al iniciar el servicio: {0}'
    }
    'wizard.next_steps' = @{
        en = 'Next Steps'
        es = 'Próximos Pasos'
    }
    'wizard.installation_ready' = @{
        en = 'Your ContPAQi AI Bridge installation is ready to use!'
        es = '¡Su instalación de ContPAQi AI Bridge está lista para usar!'
    }
    'wizard.to_get_started' = @{
        en = 'To get started:'
        es = 'Para comenzar:'
    }
    'wizard.step_1_docker' = @{
        en = '1. Ensure Docker Desktop is running'
        es = '1. Asegúrese de que Docker Desktop esté ejecutándose'
    }
    'wizard.step_2_service' = @{
        en = '2. The service will start automatically on system boot'
        es = '2. El servicio iniciará automáticamente al arrancar el sistema'
    }
    'wizard.step_3_access' = @{
        en = '3. Access the application at: {0}'
        es = '3. Acceda a la aplicación en: {0}'
    }
    'wizard.for_more_info' = @{
        en = 'For more information:'
        es = 'Para más información:'
    }
    'wizard.documentation' = @{
        en = 'Documentation: {0}'
        es = 'Documentación: {0}'
    }
    'wizard.config_location' = @{
        en = 'Configuration: {0}'
        es = 'Configuración: {0}'
    }
    'wizard.logs_location' = @{
        en = 'Logs: {0}'
        es = 'Registros: {0}'
    }
    'wizard.setup_complete' = @{
        en = 'Setup Complete - Ready to Use!'
        es = '¡Configuración Completa - Listo para Usar!'
    }
    'wizard.setup_complete_warnings' = @{
        en = 'Setup Complete with Warnings - Review Above'
        es = 'Configuración Completa con Advertencias - Revise Arriba'
    }
    'wizard.already_initialized' = @{
        en = 'Application has already been initialized.'
        es = 'La aplicación ya ha sido inicializada.'
    }
    'wizard.use_force' = @{
        en = 'Use -Force to run the wizard again.'
        es = 'Use -Force para ejecutar el asistente nuevamente.'
    }
    'wizard.would_you_like_open_browser' = @{
        en = 'Would you like to open the application in your browser?'
        es = '¿Desea abrir la aplicación en su navegador?'
    }
    'wizard.opening_browser' = @{
        en = 'Opening application in browser...'
        es = 'Abriendo aplicación en navegador...'
    }
    'wizard.browser_opened' = @{
        en = 'Browser opened to {0}'
        es = 'Navegador abierto en {0}'
    }
    'wizard.failed_open_browser' = @{
        en = 'Failed to open browser: {0}'
        es = 'No se pudo abrir el navegador: {0}'
    }
    'wizard.navigate_manually' = @{
        en = 'You can manually navigate to: {0}'
        es = 'Puede navegar manualmente a: {0}'
    }
    'wizard.first_run_marker_created' = @{
        en = 'First-run marker created'
        es = 'Marcador de primera ejecución creado'
    }
    'wizard.failed_create_marker' = @{
        en = 'Failed to create first-run marker: {0}'
        es = 'Error al crear marcador de primera ejecución: {0}'
    }
    'wizard.error_checking_docker' = @{
        en = 'Error checking Docker: {0}'
        es = 'Error al verificar Docker: {0}'
    }
    'wizard.error_checking_dotnet' = @{
        en = 'Error checking .NET: {0}'
        es = 'Error al verificar .NET: {0}'
    }
    'wizard.error_checking_service' = @{
        en = 'Error checking service: {0}'
        es = 'Error al verificar el servicio: {0}'
    }
    'wizard.error_checking_configuration' = @{
        en = 'Error checking configuration: {0}'
        es = 'Error al verificar la configuración: {0}'
    }

    # =========================================================================
    # Installation Test Messages (test-installation.ps1)
    # =========================================================================
    'test.title' = @{
        en = 'ContPAQi AI Bridge - Installation Verification Test'
        es = 'ContPAQi AI Bridge - Prueba de Verificación de Instalación'
    }
    'test.subtitle' = @{
        en = 'Testing on clean Windows 10/11 machine'
        es = 'Probando en máquina Windows 10/11 limpia'
    }
    'test.installation_path' = @{
        en = 'Installation Path: {0}'
        es = 'Ruta de Instalación: {0}'
    }
    'test.test_started' = @{
        en = 'Test Started: {0}'
        es = 'Prueba Iniciada: {0}'
    }
    'test.windows_version_tests' = @{
        en = 'Windows Version Tests'
        es = 'Pruebas de Versión de Windows'
    }
    'test.detected' = @{
        en = 'Detected: {0}'
        es = 'Detectado: {0}'
    }
    'test.windows_10_11_detected' = @{
        en = 'Windows 10/11 Detected'
        es = 'Windows 10/11 Detectado'
    }
    'test.64bit_os' = @{
        en = '64-bit Operating System'
        es = 'Sistema Operativo de 64 bits'
    }
    'test.prerequisite_tests' = @{
        en = 'Prerequisite Tests'
        es = 'Pruebas de Prerrequisitos'
    }
    'test.powershell_5_1' = @{
        en = 'PowerShell 5.1+'
        es = 'PowerShell 5.1+'
    }
    'test.dotnet_runtime_available' = @{
        en = '.NET Runtime Available'
        es = 'Runtime de .NET Disponible'
    }
    'test.docker_installed' = @{
        en = 'Docker Installed'
        es = 'Docker Instalado'
    }
    'test.docker_daemon_running' = @{
        en = 'Docker Daemon Running'
        es = 'Demonio de Docker Ejecutándose'
    }
    'test.installation_tests' = @{
        en = 'Installation Tests'
        es = 'Pruebas de Instalación'
    }
    'test.installation_dir_exists' = @{
        en = 'Installation Directory Exists'
        es = 'Directorio de Instalación Existe'
    }
    'test.executable_exists' = @{
        en = 'Executable Exists'
        es = 'Ejecutable Existe'
    }
    'test.config_dir_exists' = @{
        en = 'Config Directory Exists'
        es = 'Directorio de Configuración Existe'
    }
    'test.appsettings_exists' = @{
        en = 'appsettings.json Exists'
        es = 'appsettings.json Existe'
    }
    'test.appsettings_valid' = @{
        en = 'appsettings.json Valid JSON'
        es = 'appsettings.json es JSON Válido'
    }
    'test.logs_dir_exists' = @{
        en = 'Logs Directory Exists'
        es = 'Directorio de Registros Existe'
    }
    'test.scripts_dir_exists' = @{
        en = 'Scripts Directory Exists'
        es = 'Directorio de Scripts Existe'
    }
    'test.service_tests' = @{
        en = 'Service Tests'
        es = 'Pruebas de Servicio'
    }
    'test.service_installed' = @{
        en = 'Service Installed (ContPAQiBridge)'
        es = 'Servicio Instalado (ContPAQiBridge)'
    }
    'test.service_running' = @{
        en = 'Service Running'
        es = 'Servicio Ejecutándose'
    }
    'test.service_auto_start' = @{
        en = 'Service Auto-Start Enabled'
        es = 'Inicio Automático de Servicio Habilitado'
    }
    'test.docker_tests' = @{
        en = 'Docker Tests'
        es = 'Pruebas de Docker'
    }
    'test.docker_available' = @{
        en = 'Docker Available'
        es = 'Docker Disponible'
    }
    'test.docker_image_loaded' = @{
        en = 'Docker Image Loaded ({0})'
        es = 'Imagen de Docker Cargada ({0})'
    }
    'test.shortcut_tests' = @{
        en = 'Shortcut Tests'
        es = 'Pruebas de Accesos Directos'
    }
    'test.desktop_shortcut_exists' = @{
        en = 'Desktop Shortcut Exists'
        es = 'Acceso Directo de Escritorio Existe'
    }
    'test.start_menu_folder_exists' = @{
        en = 'Start Menu Folder Exists'
        es = 'Carpeta del Menú Inicio Existe'
    }
    'test.start_menu_main_shortcut' = @{
        en = 'Start Menu Main Shortcut'
        es = 'Acceso Directo Principal del Menú Inicio'
    }
    'test.health_check_tests' = @{
        en = 'Health Check Tests'
        es = 'Pruebas de Verificación de Salud'
    }
    'test.health_endpoint_reachable' = @{
        en = 'Health Endpoint Reachable'
        es = 'Endpoint de Salud Accesible'
    }
    'test.health_status_ok' = @{
        en = 'Health Status OK'
        es = 'Estado de Salud OK'
    }
    'test.results_summary' = @{
        en = 'TEST RESULTS SUMMARY'
        es = 'RESUMEN DE RESULTADOS DE PRUEBAS'
    }
    'test.total_tests' = @{
        en = 'Total Tests:'
        es = 'Pruebas Totales:'
    }
    'test.passed' = @{
        en = 'Passed:'
        es = 'Pasadas:'
    }
    'test.failed' = @{
        en = 'Failed:'
        es = 'Fallidas:'
    }
    'test.skipped' = @{
        en = 'Skipped:'
        es = 'Omitidas:'
    }
    'test.results_by_category' = @{
        en = 'Results by Category:'
        es = 'Resultados por Categoría:'
    }
    'test.all_passed' = @{
        en = 'ALL TESTS PASSED - Installation verified successfully!'
        es = '¡TODAS LAS PRUEBAS PASARON - Instalación verificada exitosamente!'
    }
    'test.some_failed' = @{
        en = 'SOME TESTS FAILED - Review issues above'
        es = 'ALGUNAS PRUEBAS FALLARON - Revise los problemas anteriores'
    }
    'test.report_saved' = @{
        en = 'Report saved to: {0}'
        es = 'Reporte guardado en: {0}'
    }
    'test.cannot_continue' = @{
        en = 'Cannot continue installation tests - directory not found'
        es = 'No se pueden continuar las pruebas de instalación - directorio no encontrado'
    }
    'test.skipped_by_user' = @{
        en = 'Skipped by user'
        es = 'Omitido por el usuario'
    }

    # =========================================================================
    # Common Messages
    # =========================================================================
    'common.info' = @{
        en = 'INFO'
        es = 'INFO'
    }
    'common.warning' = @{
        en = 'WARN'
        es = 'ADVERT'
    }
    'common.error' = @{
        en = 'ERROR'
        es = 'ERROR'
    }
    'common.success' = @{
        en = 'OK'
        es = 'OK'
    }
    'common.yes' = @{
        en = 'Yes'
        es = 'Sí'
    }
    'common.no' = @{
        en = 'No'
        es = 'No'
    }
    'common.true' = @{
        en = 'true'
        es = 'verdadero'
    }
    'common.false' = @{
        en = 'false'
        es = 'falso'
    }
    'common.version' = @{
        en = 'Version:'
        es = 'Versión:'
    }
    'common.status' = @{
        en = 'Status:'
        es = 'Estado:'
    }
    'common.path' = @{
        en = 'Path:'
        es = 'Ruta:'
    }
    'common.found' = @{
        en = 'Found'
        es = 'Encontrado'
    }
    'common.not_found' = @{
        en = 'Not found'
        es = 'No encontrado'
    }
    'common.failed' = @{
        en = 'Failed:'
        es = 'Falló:'
    }
    'common.unexpected_error' = @{
        en = 'Unexpected error:'
        es = 'Error inesperado:'
    }
    'common.y_n' = @{
        en = 'Y/n'
        es = 'S/n'
    }
    'common.yes_no' = @{
        en = 'y/N'
        es = 's/N'
    }
}

# =============================================================================
# Public Functions
# =============================================================================

function Get-CurrentLanguage {
    <#
    .SYNOPSIS
        Gets the current language setting.

    .DESCRIPTION
        Returns the current language in order of priority:
        1. Script-level CurrentLanguage variable
        2. Registry setting
        3. Default language (en)

    .OUTPUTS
        String - Language code ('en' or 'es')
    #>

    # If already set, return it
    if ($script:CurrentLanguage) {
        return $script:CurrentLanguage
    }

    # Try to read from registry
    try {
        if (Test-Path $script:RegistryPath) {
            $regValue = Get-ItemProperty -Path $script:RegistryPath -Name $script:RegistryValueName -ErrorAction SilentlyContinue
            if ($regValue -and $regValue.$($script:RegistryValueName)) {
                $lang = $regValue.$($script:RegistryValueName)
                if ($lang -in $script:SupportedLanguages) {
                    $script:CurrentLanguage = $lang
                    return $lang
                }
            }
        }
    }
    catch {
        # Registry read failed, use default
    }

    # Return default
    return $script:DefaultLanguage
}

function Set-CurrentLanguage {
    <#
    .SYNOPSIS
        Sets the current language for the session.

    .PARAMETER Language
        Language code ('en' or 'es')

    .EXAMPLE
        Set-CurrentLanguage -Language 'es'
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('en', 'es')]
        [string]$Language
    )

    $script:CurrentLanguage = $Language
}

function Get-LocalizedMessage {
    <#
    .SYNOPSIS
        Gets a localized message by key.

    .DESCRIPTION
        Retrieves a message in the current or specified language.
        Supports string formatting with {0}, {1}, etc. placeholders.

    .PARAMETER Key
        The message key (e.g., 'docker.checking_installation')

    .PARAMETER Language
        Optional language override ('en' or 'es')

    .PARAMETER Args
        Optional arguments for string formatting

    .EXAMPLE
        Get-LocalizedMessage -Key 'docker.checking_installation'

    .EXAMPLE
        Get-LocalizedMessage -Key 'service.already_exists' -Args 'ContPAQiBridge'

    .EXAMPLE
        Get-LocalizedMessage -Key 'wizard.dotnet_available' -Language 'es' -Args '6.0.0'
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Key,

        [Parameter()]
        [ValidateSet('en', 'es')]
        [string]$Language,

        [Parameter()]
        [object[]]$Args
    )

    # Determine language
    $lang = if ($Language) { $Language } else { Get-CurrentLanguage }

    # Get message
    if ($script:Messages.ContainsKey($Key)) {
        $messageObj = $script:Messages[$Key]
        $message = $messageObj[$lang]

        # Fallback to English if translation missing
        if (-not $message -and $lang -ne 'en') {
            $message = $messageObj['en']
        }

        # Apply string formatting if args provided
        if ($message -and $Args) {
            try {
                $message = $message -f $Args
            }
            catch {
                # If formatting fails, return original message
            }
        }

        return $message
    }

    # Key not found - return key itself for debugging
    return "[Missing: $Key]"
}

function Get-AllMessages {
    <#
    .SYNOPSIS
        Gets all messages for a specific language.

    .PARAMETER Language
        Language code ('en' or 'es')

    .OUTPUTS
        Hashtable - All messages for the specified language
    #>
    param(
        [Parameter()]
        [ValidateSet('en', 'es')]
        [string]$Language = 'en'
    )

    $result = @{}
    foreach ($key in $script:Messages.Keys) {
        $result[$key] = $script:Messages[$key][$Language]
    }
    return $result
}

# =============================================================================
# Export Functions
# =============================================================================

Export-ModuleMember -Function @(
    'Get-CurrentLanguage',
    'Set-CurrentLanguage',
    'Get-LocalizedMessage',
    'Get-AllMessages'
)
