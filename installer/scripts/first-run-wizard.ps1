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
    [switch]$OpenBrowser
)

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
        "Error"   { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[WARN]  $Message" -ForegroundColor Yellow }
        "Success" { Write-Host "[OK]    $Message" -ForegroundColor Green }
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
    Write-Log "Installation Path: $InstallPath"
    Write-Log ""
}

function Write-StatusSummary {
    <#
    .SYNOPSIS
        Shows a status summary of all checks performed.
    #>

    Write-Log "System Status Summary" -Level Header
    Write-Log "====================="
    Write-Log ""

    $allPassed = $true

    # Docker status
    if ($script:CheckResults.Docker) {
        Write-Log "Docker Desktop........... PASS" -Level Success
    } else {
        Write-Log "Docker Desktop........... FAIL" -Level Error
        $allPassed = $false
    }

    # .NET status
    if ($script:CheckResults.DotNet) {
        Write-Log ".NET Runtime............. PASS" -Level Success
    } else {
        Write-Log ".NET Runtime............. FAIL" -Level Error
        $allPassed = $false
    }

    # Service status
    if ($script:CheckResults.Service) {
        Write-Log "Application Service...... PASS" -Level Success
    } else {
        Write-Log "Application Service...... FAIL" -Level Warning
        $allPassed = $false
    }

    # Configuration status
    if ($script:CheckResults.Config) {
        Write-Log "Configuration............ PASS" -Level Success
    } else {
        Write-Log "Configuration............ FAIL" -Level Warning
        $allPassed = $false
    }

    Write-Log ""

    if ($allPassed) {
        Write-Log "All checks passed! Your installation is ready." -Level Success
    } else {
        Write-Log "Some checks did not pass. Review the issues above." -Level Warning
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

    Write-Log "Checking Docker availability..."

    try {
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $dockerPath) {
            Write-Log "Docker is not installed or not in PATH" -Level Warning
            return $false
        }

        # Check if Docker daemon is running
        $dockerInfo = & docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Docker is installed but not running" -Level Warning
            return $false
        }

        Write-Log "Docker is available and running" -Level Success
        return $true
    }
    catch {
        Write-Log "Error checking Docker: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Test-DotNetAvailable {
    <#
    .SYNOPSIS
        Checks if .NET runtime is available.
    #>

    Write-Log "Checking .NET runtime..."

    try {
        $dotnetPath = Get-Command dotnet -ErrorAction SilentlyContinue
        if (-not $dotnetPath) {
            Write-Log ".NET is not installed or not in PATH" -Level Warning
            return $false
        }

        # Get .NET version
        $dotnetVersion = & dotnet --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log ".NET version $dotnetVersion is available" -Level Success
            return $true
        }

        return $false
    }
    catch {
        Write-Log "Error checking .NET: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Test-ServiceStatus {
    <#
    .SYNOPSIS
        Checks if the application service is installed and running.
    #>

    Write-Log "Checking service status..."

    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

        if (-not $service) {
            Write-Log "Service '$ServiceName' is not installed" -Level Warning
            return $false
        }

        if ($service.Status -eq 'Running') {
            Write-Log "Service is installed and Running" -Level Success
            return $true
        } else {
            Write-Log "Service is installed but status is: $($service.Status)" -Level Warning
            return $false
        }
    }
    catch {
        Write-Log "Error checking service: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Test-Configuration {
    <#
    .SYNOPSIS
        Checks if configuration files exist and are valid.
    #>

    Write-Log "Checking configuration..."

    try {
        # Check config directory
        if (-not (Test-Path $ConfigPath)) {
            Write-Log "Configuration directory not found: $ConfigPath" -Level Warning
            return $false
        }

        # Check appsettings.json
        if (-not (Test-Path $AppSettingsFile)) {
            Write-Log "appsettings.json not found" -Level Warning
            return $false
        }

        # Try to parse settings file
        $settings = Get-Content $AppSettingsFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if (-not $settings) {
            Write-Log "appsettings.json is not valid JSON" -Level Warning
            return $false
        }

        Write-Log "Configuration is valid" -Level Success
        return $true
    }
    catch {
        Write-Log "Error checking configuration: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Invoke-SystemChecks {
    <#
    .SYNOPSIS
        Runs all system requirement checks.
    #>

    Write-Log "System Requirements Check" -Level Header
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

    Write-Log "Starting Application Service" -Level Header
    Write-Log "============================"
    Write-Log ""

    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

        if (-not $service) {
            Write-Log "Service is not installed, cannot start" -Level Error
            return $false
        }

        if ($service.Status -eq 'Running') {
            Write-Log "Service is already running" -Level Success
            return $true
        }

        Write-Log "Starting service '$ServiceName'..."
        Start-Service -Name $ServiceName -ErrorAction Stop

        # Wait for service to start
        $timeout = 30
        $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 1
            $elapsed++
            $service = Get-Service -Name $ServiceName
            if ($service.Status -eq 'Running') {
                Write-Log "Service started successfully" -Level Success
                $script:CheckResults.Service = $true
                return $true
            }
        }

        Write-Log "Service did not start within $timeout seconds" -Level Warning
        return $false
    }
    catch {
        Write-Log "Failed to start service: $($_.Exception.Message)" -Level Error
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
        Write-Log "First-run marker created" -Level Success
        return $true
    }
    catch {
        Write-Log "Failed to create first-run marker: $($_.Exception.Message)" -Level Warning
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

    Write-Log "Opening application in browser..."

    try {
        Start-Process $AppUrl
        Write-Log "Browser opened to $AppUrl" -Level Success
        return $true
    }
    catch {
        Write-Log "Failed to open browser: $($_.Exception.Message)" -Level Warning
        Write-Log "You can manually navigate to: $AppUrl"
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

    Write-Log "Next Steps" -Level Header
    Write-Log "=========="
    Write-Log ""
    Write-Log "Your ContPAQi AI Bridge installation is ready to use!"
    Write-Log ""
    Write-Log "To get started:"
    Write-Log "  1. Ensure Docker Desktop is running"
    Write-Log "  2. The service will start automatically on system boot"
    Write-Log "  3. Access the application at: $AppUrl"
    Write-Log ""
    Write-Log "For more information:"
    Write-Log "  - Documentation: $InstallPath\docs"
    Write-Log "  - Configuration: $ConfigPath"
    Write-Log "  - Logs: $InstallPath\logs"
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
            Write-Log "Application has already been initialized." -Level Info
            Write-Log "Use -Force to run the wizard again." -Level Info
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
        Write-Log "Skipping system checks as requested" -Level Warning
        # Set all checks to true when skipped
        $script:CheckResults.Docker = $true
        $script:CheckResults.DotNet = $true
        $script:CheckResults.Service = $true
        $script:CheckResults.Config = $true
    }

    # Try to start service if not running
    if (-not $script:CheckResults.Service) {
        if (-not $NonInteractive) {
            $startService = Request-UserConfirmation -Prompt "Would you like to start the service now?"
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
            $openBrowser = Request-UserConfirmation -Prompt "Would you like to open the application in your browser?"
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
    Write-Log "Unexpected error: $($_.Exception.Message)" -Level Error
    Write-Log $_.ScriptStackTrace -Level Error
    exit $EXIT_CONFIG_FAILED
}
