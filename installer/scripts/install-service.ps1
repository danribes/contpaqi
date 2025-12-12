# =============================================================================
# ContPAQi AI Bridge - Windows Service Installation Script
# =============================================================================
#
# This PowerShell script installs, uninstalls, and manages the ContPAQi AI Bridge
# Windows Service. It is called by the Inno Setup installer during installation
# and uninstallation.
#
# Usage:
#   .\install-service.ps1 -Install     # Install and start the service
#   .\install-service.ps1 -Uninstall   # Stop and remove the service
#   .\install-service.ps1 -Start       # Start the service
#   .\install-service.ps1 -Stop        # Stop the service
#   .\install-service.ps1 -Status      # Check service status
#
# Requirements:
#   - Administrator privileges
#   - Windows 10/11 (64-bit)
#   - .NET 6.0 Runtime
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Force,
    [string]$InstallPath,
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
# Service Configuration
# =============================================================================

$ServiceName = "ContPAQiBridge"
$ServiceDisplayName = "ContPAQi AI Bridge Service"
$ServiceDescription = "ContPAQi AI Bridge - Windows service that provides AI/ML invoice processing capabilities via integration with Docker container and ContPAQi SDK."

# Determine installation path
if (-not $InstallPath) {
    # Default: script is in {app}\scripts, binary is in {app}\bin
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        $InstallPath = Split-Path -Parent $ScriptDir
    } else {
        $InstallPath = "C:\Program Files\ContPAQi AI Bridge"
    }
}

$BinaryPath = Join-Path $InstallPath "bin\ContpaqiBridge.exe"
$WorkingDirectory = Join-Path $InstallPath "bin"

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_NOT_ADMIN = 1
$EXIT_INSTALL_FAILED = 2
$EXIT_UNINSTALL_FAILED = 3
$EXIT_START_FAILED = 4
$EXIT_STOP_FAILED = 5
$EXIT_SERVICE_NOT_FOUND = 6

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
        'service.starting_installation' = 'Starting ContPAQi AI Bridge service installation...'
        'service.already_exists' = 'Service already exists. Removing existing service...'
        'service.already_exists_use_force' = "Service '{0}' already exists. Use -Force to reinstall."
        'service.binary_not_found' = 'Binary not found at: {0}'
        'service.binary_path' = 'Binary path: {0}'
        'service.working_directory' = 'Working directory: {0}'
        'service.creating' = "Creating service '{0}'..."
        'service.created_successfully' = 'Service created successfully'
        'service.configuring_delayed_start' = 'Configuring delayed auto-start...'
        'service.delayed_start_warning' = 'Warning: Could not set delayed auto-start: {0}'
        'service.configuring_recovery' = 'Configuring failure recovery actions...'
        'service.recovery_warning' = 'Warning: Could not configure recovery options: {0}'
        'service.recovery_configured' = 'Recovery options configured (restart on failure)'
        'service.installed_successfully' = "Service '{0}' installed successfully!"
        'service.install_failed' = 'Failed to install service: {0}'
        'service.starting_uninstallation' = 'Starting ContPAQi AI Bridge service uninstallation...'
        'service.not_installed' = "Service '{0}' is not installed."
        'service.stopping' = 'Stopping service...'
        'service.stopped_successfully' = 'Service stopped successfully'
        'service.stop_timeout' = 'Service did not stop within timeout. Forcing removal...'
        'service.removing' = "Removing service '{0}'..."
        'service.removed_successfully' = 'Service removed successfully'
        'service.removed_successfully_alt' = 'Service removed successfully (Remove-Service)'
        'service.remove_failed' = 'Failed to remove service: {0}'
        'service.uninstalled_successfully' = "Service '{0}' uninstalled successfully!"
        'service.uninstall_failed' = 'Failed to uninstall service: {0}'
        'service.starting' = 'Starting ContPAQi AI Bridge service...'
        'service.already_running' = 'Service is already running.'
        'service.started_successfully' = 'Service started successfully'
        'service.start_timeout' = 'Service did not start within timeout'
        'service.start_failed' = 'Failed to start service: {0}'
        'service.stop_timeout' = 'Service did not stop within timeout'
        'service.stopping_service' = 'Stopping ContPAQi AI Bridge service...'
        'service.already_stopped' = 'Service is already stopped.'
        'service.stop_failed' = 'Failed to stop service: {0}'
        'service.checking_status' = 'Checking ContPAQi AI Bridge service status...'
        'service.name' = 'Service Name: {0}'
        'service.display_name' = 'Display Name: {0}'
        'service.status' = 'Status: {0}'
        'service.start_type' = 'Start Type: {0}'
        'service.manager_version' = 'ContPAQi AI Bridge Service Manager v1.0.0'
        'service.manager_separator' = '========================================='
        'service.requires_admin' = 'This script requires Administrator privileges.'
        'service.run_as_admin' = 'Please run PowerShell as Administrator and try again.'
        'service.running_as_admin' = 'Running with Administrator privileges'
        'service.no_action' = 'No action specified. Use -Install, -Uninstall, -Start, -Stop, or -Status'
        'service.one_action_only' = 'Please specify only one action at a time.'
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
        Writes a log message to the console and optionally to a log file.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $prefix = switch ($Level) {
        "Info"    { "[$(Get-Msg 'common.info')]" }
        "Warning" { "[$(Get-Msg 'common.warning')]" }
        "Error"   { "[$(Get-Msg 'common.error')]" }
        "Success" { "[$(Get-Msg 'common.success')]" }
    }

    $logMessage = "$timestamp $prefix $Message"

    switch ($Level) {
        "Error"   { Write-Host $logMessage -ForegroundColor Red }
        "Warning" { Write-Host $logMessage -ForegroundColor Yellow }
        "Success" { Write-Host $logMessage -ForegroundColor Green }
        default   { Write-Host $logMessage }
    }
}

function Test-Administrator {
    <#
    .SYNOPSIS
        Checks if the script is running with Administrator privileges.
    #>
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-ServiceExists {
    <#
    .SYNOPSIS
        Checks if the service exists.
    #>
    param([string]$Name = $ServiceName)

    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    return $null -ne $service
}

function Get-ServiceState {
    <#
    .SYNOPSIS
        Gets the current state of the service.
    #>
    param([string]$Name = $ServiceName)

    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($service) {
        return $service.Status.ToString()
    }
    return "NotInstalled"
}

# =============================================================================
# Service Installation
# =============================================================================

function Install-ContPAQiService {
    <#
    .SYNOPSIS
        Installs the ContPAQi AI Bridge as a Windows Service.
    #>

    Write-Log (Get-Msg 'service.starting_installation')

    # Check if service already exists
    if (Test-ServiceExists) {
        if ($Force) {
            Write-Log (Get-Msg 'service.already_exists') -Level Warning
            Uninstall-ContPAQiService
            Start-Sleep -Seconds 2
        } else {
            Write-Log (Get-Msg 'service.already_exists_use_force' -Args @($ServiceName)) -Level Warning
            return $true
        }
    }

    # Verify binary exists
    if (-not (Test-Path $BinaryPath)) {
        Write-Log (Get-Msg 'service.binary_not_found' -Args @($BinaryPath)) -Level Error
        return $false
    }

    Write-Log (Get-Msg 'service.binary_path' -Args @($BinaryPath))
    Write-Log (Get-Msg 'service.working_directory' -Args @($WorkingDirectory))

    try {
        # Create the service using New-Service
        Write-Log (Get-Msg 'service.creating' -Args @($ServiceName))

        $serviceParams = @{
            Name = $ServiceName
            BinaryPathName = $BinaryPath
            DisplayName = $ServiceDisplayName
            Description = $ServiceDescription
            StartupType = "Automatic"
        }

        New-Service @serviceParams -ErrorAction Stop | Out-Null
        Write-Log (Get-Msg 'service.created_successfully') -Level Success

        # Configure delayed auto-start using sc.exe
        Write-Log (Get-Msg 'service.configuring_delayed_start')
        $scResult = & sc.exe config $ServiceName start= delayed-auto 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log (Get-Msg 'service.delayed_start_warning' -Args @($scResult)) -Level Warning
        }

        # Configure recovery options (restart on failure)
        Write-Log (Get-Msg 'service.configuring_recovery')
        # reset= 86400 (24 hours in seconds)
        # actions= restart/60000/restart/60000/restart/60000 (restart after 1 min, 3 times)
        $scFailure = & sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log (Get-Msg 'service.recovery_warning' -Args @($scFailure)) -Level Warning
        } else {
            Write-Log (Get-Msg 'service.recovery_configured') -Level Success
        }

        # Set service description (backup method)
        Set-Service -Name $ServiceName -Description $ServiceDescription -ErrorAction SilentlyContinue

        Write-Log (Get-Msg 'service.installed_successfully' -Args @($ServiceDisplayName)) -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'service.install_failed' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

# =============================================================================
# Service Uninstallation
# =============================================================================

function Uninstall-ContPAQiService {
    <#
    .SYNOPSIS
        Uninstalls the ContPAQi AI Bridge Windows Service.
    #>

    Write-Log (Get-Msg 'service.starting_uninstallation')

    # Check if service exists
    if (-not (Test-ServiceExists)) {
        Write-Log (Get-Msg 'service.not_installed' -Args @($ServiceName)) -Level Warning
        return $true
    }

    try {
        # Stop the service first
        $currentState = Get-ServiceState
        if ($currentState -eq "Running") {
            Write-Log (Get-Msg 'service.stopping')
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop

            # Wait for service to stop
            $timeout = 30
            $elapsed = 0
            while ((Get-ServiceState) -ne "Stopped" -and $elapsed -lt $timeout) {
                Start-Sleep -Seconds 1
                $elapsed++
            }

            if ((Get-ServiceState) -eq "Stopped") {
                Write-Log (Get-Msg 'service.stopped_successfully') -Level Success
            } else {
                Write-Log (Get-Msg 'service.stop_timeout') -Level Warning
            }
        }

        # Remove the service
        Write-Log (Get-Msg 'service.removing' -Args @($ServiceName))

        # Use sc.exe delete for broader compatibility
        $scDelete = & sc.exe delete $ServiceName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log (Get-Msg 'service.removed_successfully') -Level Success
        } else {
            # Try Remove-Service (PowerShell 6+)
            if (Get-Command Remove-Service -ErrorAction SilentlyContinue) {
                Remove-Service -Name $ServiceName -ErrorAction Stop
                Write-Log (Get-Msg 'service.removed_successfully_alt') -Level Success
            } else {
                throw (Get-Msg 'service.remove_failed' -Args @($scDelete))
            }
        }

        Write-Log (Get-Msg 'service.uninstalled_successfully' -Args @($ServiceDisplayName)) -Level Success
        return $true
    }
    catch {
        Write-Log (Get-Msg 'service.uninstall_failed' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

# =============================================================================
# Service Control
# =============================================================================

function Start-ContPAQiService {
    <#
    .SYNOPSIS
        Starts the ContPAQi AI Bridge service.
    #>

    Write-Log (Get-Msg 'service.starting')

    if (-not (Test-ServiceExists)) {
        Write-Log (Get-Msg 'service.not_installed' -Args @($ServiceName)) -Level Error
        return $false
    }

    $currentState = Get-ServiceState
    if ($currentState -eq "Running") {
        Write-Log (Get-Msg 'service.already_running') -Level Info
        return $true
    }

    try {
        Start-Service -Name $ServiceName -ErrorAction Stop

        # Wait for service to start
        $timeout = 30
        $elapsed = 0
        while ((Get-ServiceState) -ne "Running" -and $elapsed -lt $timeout) {
            Start-Sleep -Seconds 1
            $elapsed++
        }

        if ((Get-ServiceState) -eq "Running") {
            Write-Log (Get-Msg 'service.started_successfully') -Level Success
            return $true
        } else {
            Write-Log (Get-Msg 'service.start_timeout') -Level Error
            return $false
        }
    }
    catch {
        Write-Log (Get-Msg 'service.start_failed' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Stop-ContPAQiService {
    <#
    .SYNOPSIS
        Stops the ContPAQi AI Bridge service.
    #>

    Write-Log (Get-Msg 'service.stopping_service')

    if (-not (Test-ServiceExists)) {
        Write-Log (Get-Msg 'service.not_installed' -Args @($ServiceName)) -Level Error
        return $false
    }

    $currentState = Get-ServiceState
    if ($currentState -eq "Stopped") {
        Write-Log (Get-Msg 'service.already_stopped') -Level Info
        return $true
    }

    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop

        # Wait for service to stop
        $timeout = 30
        $elapsed = 0
        while ((Get-ServiceState) -ne "Stopped" -and $elapsed -lt $timeout) {
            Start-Sleep -Seconds 1
            $elapsed++
        }

        if ((Get-ServiceState) -eq "Stopped") {
            Write-Log (Get-Msg 'service.stopped_successfully') -Level Success
            return $true
        } else {
            Write-Log (Get-Msg 'service.stop_timeout') -Level Error
            return $false
        }
    }
    catch {
        Write-Log (Get-Msg 'service.stop_failed' -Args @($_.Exception.Message)) -Level Error
        return $false
    }
}

function Get-ContPAQiServiceStatus {
    <#
    .SYNOPSIS
        Gets the status of the ContPAQi AI Bridge service.
    #>

    Write-Log (Get-Msg 'service.checking_status')

    if (-not (Test-ServiceExists)) {
        Write-Log (Get-Msg 'service.not_installed' -Args @($ServiceName)) -Level Warning
        return @{
            Installed = $false
            Status = "NotInstalled"
            DisplayName = $ServiceDisplayName
            ServiceName = $ServiceName
        }
    }

    $service = Get-Service -Name $ServiceName
    $state = $service.Status.ToString()

    Write-Log (Get-Msg 'service.name' -Args @($ServiceName))
    Write-Log (Get-Msg 'service.display_name' -Args @($service.DisplayName))
    Write-Log (Get-Msg 'service.status' -Args @($state))
    Write-Log (Get-Msg 'service.start_type' -Args @($service.StartType))

    return @{
        Installed = $true
        Status = $state
        DisplayName = $service.DisplayName
        ServiceName = $service.ServiceName
        StartType = $service.StartType.ToString()
        Running = ($state -eq "Running")
        Stopped = ($state -eq "Stopped")
    }
}

# =============================================================================
# Main Entry Point
# =============================================================================

function Main {
    Write-Log (Get-Msg 'service.manager_version')
    Write-Log (Get-Msg 'service.manager_separator')

    # Check for administrator privileges
    if (-not (Test-Administrator)) {
        Write-Log (Get-Msg 'service.requires_admin') -Level Error
        Write-Log (Get-Msg 'service.run_as_admin') -Level Error
        exit $EXIT_NOT_ADMIN
    }

    Write-Log (Get-Msg 'service.running_as_admin') -Level Success

    # Determine which action to perform
    $actionCount = @($Install, $Uninstall, $Start, $Stop, $Status).Where({ $_ }).Count

    if ($actionCount -eq 0) {
        Write-Log (Get-Msg 'service.no_action') -Level Warning
        exit $EXIT_SUCCESS
    }

    if ($actionCount -gt 1 -and -not ($Install -and $Start)) {
        Write-Log (Get-Msg 'service.one_action_only') -Level Error
        exit $EXIT_SUCCESS
    }

    # Execute the requested action
    if ($Install) {
        $result = Install-ContPAQiService
        if ($result) {
            if ($Start) {
                $startResult = Start-ContPAQiService
                if (-not $startResult) {
                    exit $EXIT_START_FAILED
                }
            }
            exit $EXIT_SUCCESS
        } else {
            exit $EXIT_INSTALL_FAILED
        }
    }

    if ($Uninstall) {
        $result = Uninstall-ContPAQiService
        if ($result) {
            exit $EXIT_SUCCESS
        } else {
            exit $EXIT_UNINSTALL_FAILED
        }
    }

    if ($Start) {
        $result = Start-ContPAQiService
        if ($result) {
            exit $EXIT_SUCCESS
        } else {
            exit $EXIT_START_FAILED
        }
    }

    if ($Stop) {
        $result = Stop-ContPAQiService
        if ($result) {
            exit $EXIT_SUCCESS
        } else {
            exit $EXIT_STOP_FAILED
        }
    }

    if ($Status) {
        $statusInfo = Get-ContPAQiServiceStatus
        if ($statusInfo.Installed) {
            exit $EXIT_SUCCESS
        } else {
            exit $EXIT_SERVICE_NOT_FOUND
        }
    }
}

# Run main function
Main
