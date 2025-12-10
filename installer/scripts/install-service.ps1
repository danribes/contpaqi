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
    [string]$InstallPath
)

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
        "Info"    { "[INFO]" }
        "Warning" { "[WARN]" }
        "Error"   { "[ERROR]" }
        "Success" { "[OK]" }
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

    Write-Log "Starting ContPAQi AI Bridge service installation..."

    # Check if service already exists
    if (Test-ServiceExists) {
        if ($Force) {
            Write-Log "Service already exists. Removing existing service..." -Level Warning
            Uninstall-ContPAQiService
            Start-Sleep -Seconds 2
        } else {
            Write-Log "Service '$ServiceName' already exists. Use -Force to reinstall." -Level Warning
            return $true
        }
    }

    # Verify binary exists
    if (-not (Test-Path $BinaryPath)) {
        Write-Log "Binary not found at: $BinaryPath" -Level Error
        return $false
    }

    Write-Log "Binary path: $BinaryPath"
    Write-Log "Working directory: $WorkingDirectory"

    try {
        # Create the service using New-Service
        Write-Log "Creating service '$ServiceName'..."

        $serviceParams = @{
            Name = $ServiceName
            BinaryPathName = $BinaryPath
            DisplayName = $ServiceDisplayName
            Description = $ServiceDescription
            StartupType = "Automatic"
        }

        New-Service @serviceParams -ErrorAction Stop | Out-Null
        Write-Log "Service created successfully" -Level Success

        # Configure delayed auto-start using sc.exe
        Write-Log "Configuring delayed auto-start..."
        $scResult = & sc.exe config $ServiceName start= delayed-auto 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Warning: Could not set delayed auto-start: $scResult" -Level Warning
        }

        # Configure recovery options (restart on failure)
        Write-Log "Configuring failure recovery actions..."
        # reset= 86400 (24 hours in seconds)
        # actions= restart/60000/restart/60000/restart/60000 (restart after 1 min, 3 times)
        $scFailure = & sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Warning: Could not configure recovery options: $scFailure" -Level Warning
        } else {
            Write-Log "Recovery options configured (restart on failure)" -Level Success
        }

        # Set service description (backup method)
        Set-Service -Name $ServiceName -Description $ServiceDescription -ErrorAction SilentlyContinue

        Write-Log "Service '$ServiceDisplayName' installed successfully!" -Level Success
        return $true
    }
    catch {
        Write-Log "Failed to install service: $($_.Exception.Message)" -Level Error
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

    Write-Log "Starting ContPAQi AI Bridge service uninstallation..."

    # Check if service exists
    if (-not (Test-ServiceExists)) {
        Write-Log "Service '$ServiceName' is not installed." -Level Warning
        return $true
    }

    try {
        # Stop the service first
        $currentState = Get-ServiceState
        if ($currentState -eq "Running") {
            Write-Log "Stopping service..."
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop

            # Wait for service to stop
            $timeout = 30
            $elapsed = 0
            while ((Get-ServiceState) -ne "Stopped" -and $elapsed -lt $timeout) {
                Start-Sleep -Seconds 1
                $elapsed++
            }

            if ((Get-ServiceState) -eq "Stopped") {
                Write-Log "Service stopped successfully" -Level Success
            } else {
                Write-Log "Service did not stop within timeout. Forcing removal..." -Level Warning
            }
        }

        # Remove the service
        Write-Log "Removing service '$ServiceName'..."

        # Use sc.exe delete for broader compatibility
        $scDelete = & sc.exe delete $ServiceName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Service removed successfully" -Level Success
        } else {
            # Try Remove-Service (PowerShell 6+)
            if (Get-Command Remove-Service -ErrorAction SilentlyContinue) {
                Remove-Service -Name $ServiceName -ErrorAction Stop
                Write-Log "Service removed successfully (Remove-Service)" -Level Success
            } else {
                throw "Failed to remove service: $scDelete"
            }
        }

        Write-Log "Service '$ServiceDisplayName' uninstalled successfully!" -Level Success
        return $true
    }
    catch {
        Write-Log "Failed to uninstall service: $($_.Exception.Message)" -Level Error
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

    Write-Log "Starting ContPAQi AI Bridge service..."

    if (-not (Test-ServiceExists)) {
        Write-Log "Service '$ServiceName' is not installed." -Level Error
        return $false
    }

    $currentState = Get-ServiceState
    if ($currentState -eq "Running") {
        Write-Log "Service is already running." -Level Info
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
            Write-Log "Service started successfully" -Level Success
            return $true
        } else {
            Write-Log "Service did not start within timeout" -Level Error
            return $false
        }
    }
    catch {
        Write-Log "Failed to start service: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Stop-ContPAQiService {
    <#
    .SYNOPSIS
        Stops the ContPAQi AI Bridge service.
    #>

    Write-Log "Stopping ContPAQi AI Bridge service..."

    if (-not (Test-ServiceExists)) {
        Write-Log "Service '$ServiceName' is not installed." -Level Error
        return $false
    }

    $currentState = Get-ServiceState
    if ($currentState -eq "Stopped") {
        Write-Log "Service is already stopped." -Level Info
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
            Write-Log "Service stopped successfully" -Level Success
            return $true
        } else {
            Write-Log "Service did not stop within timeout" -Level Error
            return $false
        }
    }
    catch {
        Write-Log "Failed to stop service: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Get-ContPAQiServiceStatus {
    <#
    .SYNOPSIS
        Gets the status of the ContPAQi AI Bridge service.
    #>

    Write-Log "Checking ContPAQi AI Bridge service status..."

    if (-not (Test-ServiceExists)) {
        Write-Log "Service '$ServiceName' is not installed." -Level Warning
        return @{
            Installed = $false
            Status = "NotInstalled"
            DisplayName = $ServiceDisplayName
            ServiceName = $ServiceName
        }
    }

    $service = Get-Service -Name $ServiceName
    $state = $service.Status.ToString()

    Write-Log "Service Name: $ServiceName"
    Write-Log "Display Name: $($service.DisplayName)"
    Write-Log "Status: $state"
    Write-Log "Start Type: $($service.StartType)"

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
    Write-Log "ContPAQi AI Bridge Service Manager v1.0.0"
    Write-Log "========================================="

    # Check for administrator privileges
    if (-not (Test-Administrator)) {
        Write-Log "This script requires Administrator privileges." -Level Error
        Write-Log "Please run PowerShell as Administrator and try again." -Level Error
        exit $EXIT_NOT_ADMIN
    }

    Write-Log "Running with Administrator privileges" -Level Success

    # Determine which action to perform
    $actionCount = @($Install, $Uninstall, $Start, $Stop, $Status).Where({ $_ }).Count

    if ($actionCount -eq 0) {
        Write-Log "No action specified. Use -Install, -Uninstall, -Start, -Stop, or -Status" -Level Warning
        exit $EXIT_SUCCESS
    }

    if ($actionCount -gt 1 -and -not ($Install -and $Start)) {
        Write-Log "Please specify only one action at a time." -Level Error
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
