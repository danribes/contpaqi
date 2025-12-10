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
    [switch]$Quiet
)

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
        Write-Host "[$Status] $Message" -ForegroundColor $color
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
    Write-Status "Checking Docker Desktop installation..."
    $installCheck = Test-DockerInstalled

    if (-not $installCheck.Installed) {
        $result.Message = "Docker Desktop is not installed. Please download from https://www.docker.com/products/docker-desktop"
        Write-Status $result.Message "ERROR"
        return $result
    }

    $result.Installed = $true
    $result.Path = $installCheck.Path
    Write-Status "Docker Desktop found at: $($installCheck.Path)" "OK"

    # Check service
    Write-Status "Checking Docker service..."
    $serviceCheck = Test-DockerService
    $result.ServiceStatus = $serviceCheck.Status

    # Check if running
    Write-Status "Checking if Docker daemon is running..."
    $runningCheck = Test-DockerRunning
    $result.Running = $runningCheck.Running

    if (-not $runningCheck.Running) {
        $result.Message = $runningCheck.Message
        Write-Status $result.Message "WARN"

        # Still try to get version if docker CLI exists
    }
    else {
        Write-Status "Docker daemon is running" "OK"
    }

    # Get version
    Write-Status "Getting Docker version..."
    $versionInfo = Get-DockerVersionInfo

    if ($versionInfo.Success) {
        $result.Version = $versionInfo.Version
        Write-Status "Docker version: $($versionInfo.Version)" "OK"

        # Compare version
        $versionCompare = Compare-DockerVersion -CurrentVersion $versionInfo.Version -RequiredVersion $MinVersion
        $result.VersionOK = $versionCompare.MeetsRequirement

        if ($versionCompare.MeetsRequirement) {
            Write-Status "Version meets minimum requirement ($MinVersion)" "OK"
        }
        else {
            Write-Status "Version $($versionInfo.Version) is below minimum required ($MinVersion)" "WARN"
        }
    }
    else {
        Write-Status "Could not determine Docker version" "WARN"
    }

    # Final status message
    if ($result.Installed -and $result.Running -and $result.VersionOK) {
        $result.Message = "Docker Desktop is installed, running, and meets version requirements."
    }
    elseif ($result.Installed -and -not $result.Running) {
        $result.Message = "Docker Desktop is installed but not running. Please start Docker Desktop."
    }
    elseif ($result.Installed -and $result.Running -and -not $result.VersionOK) {
        $result.Message = "Docker Desktop is running but version is below minimum required ($MinVersion)."
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
    Write-Host "Docker Desktop Status Summary" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Installed:      $($status.Installed)"
    Write-Host "Running:        $($status.Running)"
    Write-Host "Version:        $($status.Version)"
    Write-Host "Version OK:     $($status.VersionOK) (minimum: $MinVersion)"
    Write-Host "Path:           $($status.Path)"
    Write-Host "Service:        $($status.ServiceStatus)"
    Write-Host ""
    Write-Host "Message: $($status.Message)"
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
