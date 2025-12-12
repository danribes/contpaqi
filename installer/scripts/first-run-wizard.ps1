# =============================================================================
# ContPAQi AI Bridge - First-Run Wizard Script
# =============================================================================
#
# This PowerShell script provides initial setup and configuration experience
# after application installation. It performs system checks, verifies the
# installation, and guides the user through first-time configuration.
#
# Usage:
#   .\first-run-wizard.ps1                           # Interactive mode
#   .\first-run-wizard.ps1 -SkipChecks               # Skip system checks
#   .\first-run-wizard.ps1 -Quiet                    # Minimal output
#   .\first-run-wizard.ps1 -Force                    # Run even if not first run
#
# Called by Inno Setup after installation or can be run manually.
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Skip system requirements checks")]
    [switch]$SkipChecks,

    [Parameter(HelpMessage="Skip system checks (alias)")]
    [switch]$Skip,

    [Parameter(HelpMessage="Suppress output")]
    [switch]$Quiet,

    [Parameter(HelpMessage="Silent mode (alias for Quiet)")]
    [switch]$Silent,

    [Parameter(HelpMessage="Installation path")]
    [string]$InstallPath,

    [Parameter(HelpMessage="Force run even if already initialized")]
    [switch]$Force,

    [Parameter(HelpMessage="Run in non-interactive mode")]
    [switch]$NonInteractive,

    [Parameter(HelpMessage="Open browser to application URL after setup")]
    [switch]$OpenBrowser,

    [Parameter(HelpMessage="Language for messages (en/es)")]
    [ValidateSet('en', 'es')]
    [string]$Language
)

# Import localization module
$ModulePath = Join-Path $PSScriptRoot "LocalizedMessages.psm1"
if (Test-Path $ModulePath) {
    Import-Module $ModulePath -Force
    if ($Language) {
        Set-CurrentLanguage -Language $Language
    }
}

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Continue"

# Application configuration
$AppName = "ContPAQi AI Bridge"
$ServiceName = "ContPAQiBridge"
$ServiceDisplayName = "ContPAQi AI Bridge Service"
$AppExeName = "ContpaqiBridge.exe"
$DefaultPort = 5000
$AppUrl = "http://localhost:$DefaultPort"

# Default installation path
if (-not $InstallPath) {
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        $InstallPath = Split-Path -Parent $ScriptDir
    } else {
        $InstallPath = "C:\Program Files\ContPAQi AI Bridge"
    }
}

# First-run marker file
$MarkerFile = Join-Path $InstallPath ".firstrun"
$ConfigPath = Join-Path $InstallPath "config"
$AppSettingsFile = Join-Path $ConfigPath "appsettings.json"

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_CHECKS_FAILED = 1
$EXIT_SERVICE_FAILED = 2
$EXIT_CONFIG_FAILED = 3
$EXIT_ALREADY_INITIALIZED = 4

# Check results tracking
$script:CheckResults = @{
    Docker = $false
    DotNet = $false
    Service = $false
    Config = $false
}

# =============================================================================
# Helper Functions
# =============================================================================

function Get-Msg {
    <#
    .SYNOPSIS
        Helper function to get localized message or fallback to English.
    #>
    param([string]$Key, [object[]]$Args)

    if (Get-Command Get-LocalizedMessage -ErrorAction SilentlyContinue) {
        return Get-LocalizedMessage -Key $Key -Args $Args
    }
    # Fallback messages
    $fallback = @{
        'wizard.installation_path' = 'Installation Path: {0}'
        'wizard.system_status_summary' = 'System Status Summary'
        'wizard.docker_pass' = 'Docker Desktop........... PASS'
        'wizard.docker_fail' = 'Docker Desktop........... FAIL'
        'wizard.dotnet_pass' = '.NET Runtime............. PASS'
        'wizard.dotnet_fail' = '.NET Runtime............. FAIL'
        'wizard.service_pass' = 'Application Service...... PASS'
        'wizard.service_fail' = 'Application Service...... FAIL'
        'wizard.config_pass' = 'Configuration............ PASS'
        'wizard.config_fail' = 'Configuration............ FAIL'
        'wizard.all_checks_passed' = 'All checks passed! Your installation is ready.'
        'wizard.some_checks_failed' = 'Some checks did not pass. Review the issues above.'
        'wizard.checking_docker' = 'Checking Docker availability...'
        'wizard.docker_not_installed' = 'Docker is not installed or not in PATH'
        'wizard.docker_not_running' = 'Docker is installed but not running'
        'wizard.docker_available' = 'Docker is available and running'
        'wizard.docker_error' = 'Error checking Docker: {0}'
        'wizard.checking_dotnet' = 'Checking .NET runtime...'
        'wizard.dotnet_not_installed' = '.NET is not installed or not in PATH'
        'wizard.dotnet_available' = '.NET version {0} is available'
        'wizard.dotnet_error' = 'Error checking .NET: {0}'
        'wizard.checking_service' = 'Checking service status...'
        'wizard.service_not_installed' = "Service '{0}' is not installed"
        'wizard.service_running' = 'Service is installed and Running'
        'wizard.service_status' = 'Service is installed but status is: {0}'
        'wizard.service_error' = 'Error checking service: {0}'
        'wizard.checking_config' = 'Checking configuration...'
        'wizard.config_dir_not_found' = 'Configuration directory not found: {0}'
        'wizard.appsettings_not_found' = 'appsettings.json not found'
        'wizard.appsettings_invalid' = 'appsettings.json is not valid JSON'
        'wizard.config_valid' = 'Configuration is valid'
        'wizard.config_error' = 'Error checking configuration: {0}'
        'wizard.system_requirements' = 'System Requirements Check'
        'wizard.starting_service_header' = 'Starting Application Service'
        'wizard.service_cannot_start' = 'Service is not installed, cannot start'
        'wizard.service_already_running' = 'Service is already running'
        'wizard.starting_service' = "Starting service '{0}'..."
        'wizard.service_started' = 'Service started successfully'
        'wizard.service_start_timeout' = 'Service did not start within {0} seconds'
        'wizard.service_start_failed' = 'Failed to start service: {0}'
        'wizard.marker_created' = 'First-run marker created'
        'wizard.marker_failed' = 'Failed to create first-run marker: {0}'
        'wizard.opening_browser' = 'Opening application in browser...'
        'wizard.browser_opened' = 'Browser opened to {0}'
        'wizard.browser_failed' = 'Failed to open browser: {0}'
        'wizard.browser_manual' = 'You can manually navigate to: {0}'
        'wizard.next_steps' = 'Next Steps'
        'wizard.ready_to_use' = 'Your ContPAQi AI Bridge installation is ready to use!'
        'wizard.to_get_started' = 'To get started:'
        'wizard.step_docker' = '  1. Ensure Docker Desktop is running'
        'wizard.step_service' = '  2. The service will start automatically on system boot'
        'wizard.step_access' = '  3. Access the application at: {0}'
        'wizard.more_info' = 'For more information:'
        'wizard.docs_path' = '  - Documentation: {0}\docs'
        'wizard.config_path' = '  - Configuration: {0}'
        'wizard.logs_path' = '  - Logs: {0}\logs'
        'wizard.already_initialized' = 'Application has already been initialized.'
        'wizard.use_force' = 'Use -Force to run the wizard again.'
        'wizard.skipping_checks' = 'Skipping system checks as requested'
        'wizard.start_service_prompt' = 'Would you like to start the service now?'
        'wizard.open_browser_prompt' = 'Would you like to open the application in your browser?'
        'wizard.unexpected_error' = 'Unexpected error: {0}'
        'common.success' = 'OK'
        'common.warning' = 'WARN'
        'common.error' = 'ERROR'
        'common.info' = 'INFO'
    }
    $msg = $fallback[$Key]
    if ($msg -and $Args) { $msg = $msg -f $Args }
    return $msg
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a log message to the console.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [ValidateSet("Info", "Warning", "Error", "Success", "Header")]
        [string]$Level = "Info"
    )

    $quietMode = $Quiet -or $Silent
    if ($quietMode -and $Level -notin @("Error", "Header")) {
        return
    }

    switch ($Level) {
        "Error"   { Write-Host "[$(Get-Msg 'common.error')] $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[$(Get-Msg 'common.warning')]  $Message" -ForegroundColor Yellow }
        "Success" { Write-Host "[$(Get-Msg 'common.success')]    $Message" -ForegroundColor Green }
        "Header"  { Write-Host "`n$Message" -ForegroundColor Cyan }
        default   { Write-Host "        $Message" }
    }
}

function Write-WelcomeMessage {
    <#
    .SYNOPSIS
        Displays the welcome message and getting started information.
    #>

    $banner = @"

╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║          Welcome to ContPAQi AI Bridge - First Run Setup                  ║
║                                                                           ║
║  This wizard will help you verify your installation and configure         ║
║  the application for first use.                                           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

"@

    Write-Host $banner -ForegroundColor Cyan
    Write-Log (Get-Msg 'wizard.installation_path' -Args @($InstallPath))
    Write-Log ""
}

function Write-StatusSummary {
    <#
    .SYNOPSIS
        Shows a status summary of all checks performed.
    #>

    Write-Log (Get-Msg 'wizard.system_status_summary') -Level Header
    Write-Log "====================="
    Write-Log ""

    $allPassed = $true

    # Docker status
    if ($script:CheckResults.Docker) {
        Write-Log (Get-Msg 'wizard.docker_pass') -Level Success
    } else {
        Write-Log (Get-Msg 'wizard.docker_fail') -Level Error
        $allPassed = $false
    }

    # .NET status
    if ($script:CheckResults.DotNet) {
        Write-Log (Get-Msg 'wizard.dotnet_pass') -Level Success
    } else {
        Write-Log (Get-Msg 'wizard.dotnet_fail') -Level Error
        $allPassed = $false
    }

    # Service status
    if ($script:CheckResults.Service) {
        Write-Log (Get-Msg 'wizard.service_pass') -Level Success
    } else {
        Write-Log (Get-Msg 'wizard.service_fail') -Level Warning
        $allPassed = $false
    }

    # Configuration status
    if ($script:CheckResults.Config) {
        Write-Log (Get-Msg 'wizard.config_pass') -Level Success
    } else {
        Write-Log (Get-Msg 'wizard.config_fail') -Level Warning
        $allPassed = $false
    }

    Write-Log ""

    if ($allPassed) {
        Write-Log (Get-Msg 'wizard.all_checks_passed') -Level Success
    } else {
        Write-Log (Get-Msg 'wizard.some_checks_failed') -Level Warning
    }

    return $allPassed
}

# =============================================================================
# System Check Functions
# =============================================================================

function Test-DockerAvailable {
    <#
    .SYNOPSIS
        Checks if Docker is available and running.
    #>

    Write-Log (Get-Msg 'wizard.checking_docker')

    try {
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $dockerPath) {
            Write-Log (Get-Msg 'wizard.docker_not_installed') -Level Warning
            return $false
        }

        # Check if Docker daemon is running
        $dockerInfo = & docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log (Get-Msg 'wizard.docker_not_running') -Level Warning
            return $false
        }

        Write-Log (Get-Msg 'wizard.docker_available') -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'wizard.docker_error' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Test-DotNetAvailable {
    <#
    .SYNOPSIS
        Checks if .NET runtime is available.
    #>

    Write-Log (Get-Msg 'wizard.checking_dotnet')

    try {
        $dotnetPath = Get-Command dotnet -ErrorAction SilentlyContinue
        if (-not $dotnetPath) {
            Write-Log (Get-Msg 'wizard.dotnet_not_installed') -Level Warning
            return $false
        }

        # Get .NET version
        $dotnetVersion = & dotnet --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log (Get-Msg 'wizard.dotnet_available' -Args @($dotnetVersion)) -Level Success
            return $true
        }

        return $false
    }
    catch {
        Write-Log (Get-Msg 'wizard.dotnet_error' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Test-ServiceStatus {
    <#
    .SYNOPSIS
        Checks if the application service is installed and running.
    #>

    Write-Log (Get-Msg 'wizard.checking_service')

    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

        if (-not $service) {
            Write-Log (Get-Msg 'wizard.service_not_installed' -Args @($ServiceName)) -Level Warning
            return $false
        }

        if ($service.Status -eq 'Running') {
            Write-Log (Get-Msg 'wizard.service_running') -Level Success
            return $true
        } else {
            Write-Log (Get-Msg 'wizard.service_status' -Args @($service.Status)) -Level Warning
            return $false
        }
    }
    catch {
        Write-Log (Get-Msg 'wizard.service_error' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Test-Configuration {
    <#
    .SYNOPSIS
        Checks if configuration files exist and are valid.
    #>

    Write-Log (Get-Msg 'wizard.checking_config')

    try {
        # Check config directory
        if (-not (Test-Path $ConfigPath)) {
            Write-Log (Get-Msg 'wizard.config_dir_not_found' -Args @($ConfigPath)) -Level Warning
            return $false
        }

        # Check appsettings.json
        if (-not (Test-Path $AppSettingsFile)) {
            Write-Log (Get-Msg 'wizard.appsettings_not_found') -Level Warning
            return $false
        }

        # Try to parse settings file
        $settings = Get-Content $AppSettingsFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if (-not $settings) {
            Write-Log (Get-Msg 'wizard.appsettings_invalid') -Level Warning
            return $false
        }

        Write-Log (Get-Msg 'wizard.config_valid') -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'wizard.config_error' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Invoke-SystemChecks {
    <#
    .SYNOPSIS
        Runs all system requirement checks.
    #>

    Write-Log (Get-Msg 'wizard.system_requirements') -Level Header
    Write-Log "========================="
    Write-Log ""

    $script:CheckResults.Docker = Test-DockerAvailable
    $script:CheckResults.DotNet = Test-DotNetAvailable
    $script:CheckResults.Service = Test-ServiceStatus
    $script:CheckResults.Config = Test-Configuration

    Write-Log ""

    # Return true if critical checks pass (Docker and .NET)
    return ($script:CheckResults.Docker -and $script:CheckResults.DotNet)
}

# =============================================================================
# Service Management Functions
# =============================================================================

function Start-ApplicationService {
    <#
    .SYNOPSIS
        Attempts to start the application service.
    #>

    Write-Log (Get-Msg 'wizard.starting_service_header') -Level Header
    Write-Log "============================"
    Write-Log ""

    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

        if (-not $service) {
            Write-Log (Get-Msg 'wizard.service_cannot_start') -Level Error
            return $false
        }

        if ($service.Status -eq 'Running') {
            Write-Log (Get-Msg 'wizard.service_already_running') -Level Success
            return $true
        }

        Write-Log (Get-Msg 'wizard.starting_service' -Args @($ServiceName))
        Start-Service -Name $ServiceName -ErrorAction Stop

        # Wait for service to start
        $timeout = 30
        $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 1
            $elapsed++
            $service = Get-Service -Name $ServiceName
            if ($service.Status -eq 'Running') {
                Write-Log (Get-Msg 'wizard.service_started') -Level Success
                $script:CheckResults.Service = $true
                return $true
            }
        }

        Write-Log (Get-Msg 'wizard.service_start_timeout' -Args @($timeout)) -Level Warning
        return $false
    }
    catch {
        Write-Log (Get-Msg 'wizard.service_start_failed' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

# =============================================================================
# First Run Detection Functions
# =============================================================================

function Test-FirstRun {
    <#
    .SYNOPSIS
        Checks if this is the first run of the application.
    #>

    if (-not (Test-Path $MarkerFile)) {
        return $true  # First run - marker doesn't exist
    }

    return $false  # Not first run - marker exists
}

function Set-FirstRunComplete {
    <#
    .SYNOPSIS
        Creates the first-run marker to indicate initialization is complete.
    #>

    try {
        $markerContent = @{
            initialized = $true
            timestamp = (Get-Date).ToString("o")
            version = "1.0.0"
        }

        $markerContent | ConvertTo-Json | Set-Content -Path $MarkerFile -Encoding UTF8
        Write-Log (Get-Msg 'wizard.marker_created') -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'wizard.marker_failed' -Args @($_.Exception.Message)) -Level Warning
        return $false
    }
}

# =============================================================================
# User Interaction Functions
# =============================================================================

function Request-UserInput {
    <#
    .SYNOPSIS
        Prompts user for input in interactive mode.
    #>
    param(
        [string]$Prompt,
        [string]$Default = ""
    )

    if ($NonInteractive) {
        return $Default
    }

    $input = Read-Host -Prompt "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($input)) {
        return $Default
    }
    return $input
}

function Request-UserConfirmation {
    <#
    .SYNOPSIS
        Asks user for yes/no confirmation.
    #>
    param(
        [string]$Prompt,
        [bool]$Default = $true
    )

    if ($NonInteractive) {
        return $Default
    }

    $defaultText = if ($Default) { "Y/n" } else { "y/N" }
    $response = Read-Host -Prompt "$Prompt [$defaultText]"

    if ([string]::IsNullOrWhiteSpace($response)) {
        return $Default
    }

    return $response -match "^[Yy]"
}

function Open-ApplicationBrowser {
    <#
    .SYNOPSIS
        Opens the application URL in the default browser.
    #>

    Write-Log (Get-Msg 'wizard.opening_browser')

    try {
        Start-Process $AppUrl
        Write-Log (Get-Msg 'wizard.browser_opened' -Args @($AppUrl)) -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'wizard.browser_failed' -Args @($_.Exception.Message)) -Level Warning
        Write-Log (Get-Msg 'wizard.browser_manual' -Args @($AppUrl))
        return $false
    }
}

# =============================================================================
# Next Steps and Completion Functions
# =============================================================================

function Write-NextSteps {
    <#
    .SYNOPSIS
        Displays next steps for the user to begin using the application.
    #>

    Write-Log (Get-Msg 'wizard.next_steps') -Level Header
    Write-Log "=========="
    Write-Log ""
    Write-Log (Get-Msg 'wizard.ready_to_use')
    Write-Log ""
    Write-Log (Get-Msg 'wizard.to_get_started')
    Write-Log (Get-Msg 'wizard.step_docker')
    Write-Log (Get-Msg 'wizard.step_service')
    Write-Log (Get-Msg 'wizard.step_access' -Args @($AppUrl))
    Write-Log ""
    Write-Log (Get-Msg 'wizard.more_info')
    Write-Log (Get-Msg 'wizard.docs_path' -Args @($InstallPath))
    Write-Log (Get-Msg 'wizard.config_path' -Args @($ConfigPath))
    Write-Log (Get-Msg 'wizard.logs_path' -Args @($InstallPath))
    Write-Log ""
}

function Write-CompletionMessage {
    <#
    .SYNOPSIS
        Displays the completion message.
    #>
    param([bool]$Success)

    Write-Log ""
    if ($Success) {
        $completeBanner = @"

╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    Setup Complete - Ready to Use!                         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

"@
        Write-Host $completeBanner -ForegroundColor Green
    } else {
        $incompleteBanner = @"

╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              Setup Complete with Warnings - Review Above                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

"@
        Write-Host $incompleteBanner -ForegroundColor Yellow
    }
}

# =============================================================================
# Main Wizard Function
# =============================================================================

function Start-FirstRunWizard {
    <#
    .SYNOPSIS
        Main entry point for the first-run wizard.
    #>

    # Check if already initialized
    if (-not $Force -and -not (Test-FirstRun)) {
        if (-not ($Quiet -or $Silent)) {
            Write-Log (Get-Msg 'wizard.already_initialized') -Level Info
            Write-Log (Get-Msg 'wizard.use_force') -Level Info
        }
        return $EXIT_ALREADY_INITIALIZED
    }

    # Show welcome
    Write-WelcomeMessage

    $checksOk = $true
    $serviceOk = $true

    # Run system checks unless skipped
    if (-not ($SkipChecks -or $Skip)) {
        $checksOk = Invoke-SystemChecks
    } else {
        Write-Log (Get-Msg 'wizard.skipping_checks') -Level Warning
        # Set all checks to true when skipped
        $script:CheckResults.Docker = $true
        $script:CheckResults.DotNet = $true
        $script:CheckResults.Service = $true
        $script:CheckResults.Config = $true
    }

    # Try to start service if not running
    if (-not $script:CheckResults.Service) {
        if (-not $NonInteractive) {
            $startService = Request-UserConfirmation -Prompt (Get-Msg 'wizard.start_service_prompt')
            if ($startService) {
                $serviceOk = Start-ApplicationService
            }
        }
    }

    # Show status summary
    $allOk = Write-StatusSummary

    # Show next steps
    Write-NextSteps

    # Mark first run complete
    Set-FirstRunComplete

    # Open browser if requested
    if ($OpenBrowser -or (-not $NonInteractive -and $allOk)) {
        if ($OpenBrowser) {
            Open-ApplicationBrowser
        } elseif (-not $NonInteractive) {
            $openBrowser = Request-UserConfirmation -Prompt (Get-Msg 'wizard.open_browser_prompt')
            if ($openBrowser) {
                Open-ApplicationBrowser
            }
        }
    }

    # Show completion message
    Write-CompletionMessage -Success $allOk

    if ($allOk) {
        return $EXIT_SUCCESS
    } elseif (-not $checksOk) {
        return $EXIT_CHECKS_FAILED
    } elseif (-not $serviceOk) {
        return $EXIT_SERVICE_FAILED
    } else {
        return $EXIT_SUCCESS  # Warnings only, not failures
    }
}

# =============================================================================
# Entry Point
# =============================================================================

try {
    $exitCode = Start-FirstRunWizard
    exit $exitCode
}
catch {
    Write-Log (Get-Msg 'wizard.unexpected_error' -Args @($_.Exception.Message)) -Level Error
    Write-Log $_.ScriptStackTrace -Level Error
    exit $EXIT_CONFIG_FAILED
}
