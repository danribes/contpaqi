<#
.SYNOPSIS
    Checks Docker Desktop installation and status for ContPAQi AI Bridge.

.DESCRIPTION
    This script performs comprehensive checks for Docker Desktop:
    - Verifies Docker Desktop is installed
    - Checks if Docker daemon is running
    - Validates Docker version meets minimum requirements
    - Returns structured status information

    Used by the Inno Setup installer to verify prerequisites.

.PARAMETER MinVersion
    Minimum required Docker version (default: 20.10.0)

.PARAMETER JsonOutput
    Output results as JSON for parsing

.PARAMETER Quiet
    Suppress console output, only return exit code

.EXAMPLE
    .\check-docker.ps1
    Runs all checks and displays status.

.EXAMPLE
    .\check-docker.ps1 -JsonOutput
    Returns JSON-formatted status.

.EXAMPLE
    .\check-docker.ps1 -MinVersion "24.0.0"
    Checks against specific minimum version.

.OUTPUTS
    PSCustomObject with properties:
    - Installed: Boolean
    - Running: Boolean
    - Version: String
    - VersionOK: Boolean
    - Path: String
    - Message: String

.NOTES
    Author: ContPAQi AI Bridge Team
    Requires: Windows 10/11 64-bit
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$MinVersion = "20.10.0",

    [Parameter()]
    [switch]$JsonOutput,

    [Parameter()]
    [switch]$Quiet,

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

$ErrorActionPreference = "SilentlyContinue"

# Common Docker Desktop installation paths
$DockerPaths = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
)

# Registry keys for Docker Desktop
$DockerRegKeys = @(
    "HKLM:\SOFTWARE\Docker Inc.\Docker Desktop",
    "HKLM:\SOFTWARE\WOW6432Node\Docker Inc.\Docker Desktop",
    "HKCU:\SOFTWARE\Docker Inc.\Docker Desktop"
)

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Status {
    param(
        [string]$Message,
        [string]$Status = "INFO"
    )

    if (-not $Quiet) {
        $color = switch ($Status) {
            "OK"      { "Green" }
            "WARN"    { "Yellow" }
            "ERROR"   { "Red" }
            default   { "White" }
        }
        # Use localized status labels if module is available
        $statusLabel = switch ($Status) {
            "OK"      { if (Get-Command Get-LocalizedMessage -ErrorAction SilentlyContinue) { Get-LocalizedMessage -Key 'common.success' } else { "OK" } }
            "WARN"    { if (Get-Command Get-LocalizedMessage -ErrorAction SilentlyContinue) { Get-LocalizedMessage -Key 'common.warning' } else { "WARN" } }
            "ERROR"   { if (Get-Command Get-LocalizedMessage -ErrorAction SilentlyContinue) { Get-LocalizedMessage -Key 'common.error' } else { "ERROR" } }
            default   { if (Get-Command Get-LocalizedMessage -ErrorAction SilentlyContinue) { Get-LocalizedMessage -Key 'common.info' } else { "INFO" } }
        }
        Write-Host "[$statusLabel] $Message" -ForegroundColor $color
    }
}

function Test-DockerInstalled {
    <#
    .SYNOPSIS
        Check if Docker Desktop is installed.
    #>

    # Method 1: Check common file paths
    foreach ($path in $DockerPaths) {
        if (Test-Path $path) {
            return @{
                Installed = $true
                Path = $path
                Method = "FilePath"
            }
        }
    }

    # Method 2: Check registry
    foreach ($regKey in $DockerRegKeys) {
        if (Test-Path $regKey) {
            $installPath = (Get-ItemProperty -Path $regKey -ErrorAction SilentlyContinue).InstallPath
            if ($installPath) {
                return @{
                    Installed = $true
                    Path = $installPath
                    Method = "Registry"
                }
            }
        }
    }

    # Method 3: Check if docker CLI is in PATH
    $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        return @{
            Installed = $true
            Path = $dockerCmd.Source
            Method = "PATH"
        }
    }

    return @{
        Installed = $false
        Path = $null
        Method = $null
    }
}

function Test-DockerRunning {
    <#
    .SYNOPSIS
        Check if Docker daemon is running.
    #>

    try {
        # Try docker info command
        $result = & docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            return @{
                Running = $true
                Message = "Docker daemon is running"
            }
        }

        # Check if error is about daemon not running
        $errorStr = $result | Out-String
        if ($errorStr -match "Cannot connect to the Docker daemon" -or
            $errorStr -match "docker daemon is not running" -or
            $errorStr -match "Is the docker daemon running") {
            return @{
                Running = $false
                Message = "Docker daemon is not running. Please start Docker Desktop."
            }
        }

        return @{
            Running = $false
            Message = "Docker check failed: $errorStr"
        }
    }
    catch {
        return @{
            Running = $false
            Message = "Docker check error: $_"
        }
    }
}

function Get-DockerVersionInfo {
    <#
    .SYNOPSIS
        Get Docker version information.
    #>

    try {
        $versionOutput = & docker --version 2>&1

        if ($LASTEXITCODE -eq 0) {
            # Parse version from output like "Docker version 24.0.5, build ced0996"
            if ($versionOutput -match "Docker version (\d+\.\d+\.\d+)") {
                return @{
                    Success = $true
                    Version = $Matches[1]
                    FullOutput = $versionOutput
                }
            }
        }

        return @{
            Success = $false
            Version = $null
            FullOutput = $versionOutput
        }
    }
    catch {
        return @{
            Success = $false
            Version = $null
            FullOutput = "Error: $_"
        }
    }
}

function Compare-DockerVersion {
    <#
    .SYNOPSIS
        Compare Docker version against minimum required.
    #>
    param(
        [string]$CurrentVersion,
        [string]$RequiredVersion
    )

    try {
        $current = [version]$CurrentVersion
        $required = [version]$RequiredVersion

        return @{
            MeetsRequirement = ($current -ge $required)
            Current = $CurrentVersion
            Required = $RequiredVersion
        }
    }
    catch {
        return @{
            MeetsRequirement = $false
            Current = $CurrentVersion
            Required = $RequiredVersion
            Error = "Version comparison failed: $_"
        }
    }
}

function Test-DockerService {
    <#
    .SYNOPSIS
        Check Docker service status.
    #>

    # Check for Docker Desktop service
    $services = @("com.docker.service", "docker")

    foreach ($serviceName in $services) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($service) {
            return @{
                Found = $true
                Name = $service.Name
                Status = $service.Status.ToString()
                Running = ($service.Status -eq 'Running')
            }
        }
    }

    return @{
        Found = $false
        Name = $null
        Status = "Not Found"
        Running = $false
    }
}

# =============================================================================
# Main Execution
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
        'docker.checking_installation' = 'Checking Docker Desktop installation...'
        'docker.found_at' = 'Docker Desktop found at:'
        'docker.checking_service' = 'Checking Docker service...'
        'docker.checking_daemon' = 'Checking if Docker daemon is running...'
        'docker.daemon_running' = 'Docker daemon is running'
        'docker.getting_version' = 'Getting Docker version...'
        'docker.version' = 'Docker version:'
        'docker.version_meets_requirement' = 'Version meets minimum requirement'
        'docker.version_below_minimum' = 'Version {0} is below minimum required ({1})'
        'docker.not_installed' = 'Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop'
        'docker.could_not_determine_version' = 'Could not determine Docker version'
        'docker.all_good' = 'Docker Desktop is installed, running, and meets version requirements.'
        'docker.installed_not_running' = 'Docker Desktop is installed but not running. Please start Docker Desktop.'
        'docker.version_too_low' = 'Docker Desktop is running but version is below minimum required ({0}).'
        'docker.status_summary' = 'Docker Desktop Status Summary'
        'docker.installed' = 'Installed:'
        'docker.running' = 'Running:'
        'docker.version_ok' = 'Version OK:'
        'docker.path' = 'Path:'
        'docker.service_status' = 'Service:'
        'docker.message' = 'Message:'
    }
    $msg = $fallback[$Key]
    if ($msg -and $Args) { $msg = $msg -f $Args }
    return $msg
}

function Get-DockerStatus {
    <#
    .SYNOPSIS
        Get comprehensive Docker Desktop status.
    #>

    $result = [PSCustomObject]@{
        Installed = $false
        Running = $false
        Version = "Not installed"
        VersionOK = $false
        Path = $null
        ServiceStatus = "Unknown"
        Message = ""
        MinVersionRequired = $MinVersion
    }

    # Check installation
    Write-Status (Get-Msg 'docker.checking_installation')
    $installCheck = Test-DockerInstalled

    if (-not $installCheck.Installed) {
        $result.Message = Get-Msg 'docker.not_installed'
        Write-Status $result.Message "ERROR"
        return $result
    }

    $result.Installed = $true
    $result.Path = $installCheck.Path
    Write-Status "$(Get-Msg 'docker.found_at') $($installCheck.Path)" "OK"

    # Check service
    Write-Status (Get-Msg 'docker.checking_service')
    $serviceCheck = Test-DockerService
    $result.ServiceStatus = $serviceCheck.Status

    # Check if running
    Write-Status (Get-Msg 'docker.checking_daemon')
    $runningCheck = Test-DockerRunning
    $result.Running = $runningCheck.Running

    if (-not $runningCheck.Running) {
        $result.Message = $runningCheck.Message
        Write-Status $result.Message "WARN"

        # Still try to get version if docker CLI exists
    }
    else {
        Write-Status (Get-Msg 'docker.daemon_running') "OK"
    }

    # Get version
    Write-Status (Get-Msg 'docker.getting_version')
    $versionInfo = Get-DockerVersionInfo

    if ($versionInfo.Success) {
        $result.Version = $versionInfo.Version
        Write-Status "$(Get-Msg 'docker.version') $($versionInfo.Version)" "OK"

        # Compare version
        $versionCompare = Compare-DockerVersion -CurrentVersion $versionInfo.Version -RequiredVersion $MinVersion
        $result.VersionOK = $versionCompare.MeetsRequirement

        if ($versionCompare.MeetsRequirement) {
            Write-Status "$(Get-Msg 'docker.version_meets_requirement') ($MinVersion)" "OK"
        }
        else {
            Write-Status (Get-Msg 'docker.version_below_minimum' -Args @($versionInfo.Version, $MinVersion)) "WARN"
        }
    }
    else {
        Write-Status (Get-Msg 'docker.could_not_determine_version') "WARN"
    }

    # Final status message
    if ($result.Installed -and $result.Running -and $result.VersionOK) {
        $result.Message = Get-Msg 'docker.all_good'
    }
    elseif ($result.Installed -and -not $result.Running) {
        $result.Message = Get-Msg 'docker.installed_not_running'
    }
    elseif ($result.Installed -and $result.Running -and -not $result.VersionOK) {
        $result.Message = Get-Msg 'docker.version_too_low' -Args @($MinVersion)
    }

    return $result
}

# Run the check
$status = Get-DockerStatus

# Output results
if ($JsonOutput) {
    $status | ConvertTo-Json
}
else {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host (Get-Msg 'docker.status_summary') -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "$(Get-Msg 'docker.installed') $($status.Installed)"
    Write-Host "$(Get-Msg 'docker.running') $($status.Running)"
    Write-Host "$(Get-Msg 'docker.version') $($status.Version)"
    Write-Host "$(Get-Msg 'docker.version_ok') $($status.VersionOK) (minimum: $MinVersion)"
    Write-Host "$(Get-Msg 'docker.path') $($status.Path)"
    Write-Host "$(Get-Msg 'docker.service_status') $($status.ServiceStatus)"
    Write-Host ""
    Write-Host "$(Get-Msg 'docker.message') $($status.Message)"
    Write-Host ""
}

# Return exit code based on status
if ($status.Installed -and $status.Running -and $status.VersionOK) {
    exit 0  # All good
}
elseif ($status.Installed -and -not $status.Running) {
    exit 1  # Installed but not running
}
elseif (-not $status.Installed) {
    exit 2  # Not installed
}
else {
    exit 3  # Other issue
}
