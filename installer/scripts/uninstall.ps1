# =============================================================================
# ContPAQi AI Bridge - Uninstaller Script
# =============================================================================
#
# This PowerShell script handles comprehensive cleanup during uninstallation
# of the ContPAQi AI Bridge application. It performs the following tasks:
#   1. Stops and removes the Windows Service
#   2. Stops and removes Docker containers and images
#   3. Cleans up application data (optional)
#   4. Removes registry entries
#   5. Cleans up environment variables
#
# Usage:
#   .\uninstall.ps1                          # Full cleanup, keep user data
#   .\uninstall.ps1 -KeepData                # Preserve all user data
#   .\uninstall.ps1 -RemoveAll               # Remove everything including data
#   .\uninstall.ps1 -Quiet                   # Silent mode
#   .\uninstall.ps1 -Force                   # Skip confirmations
#
# Called by Inno Setup during uninstallation via [UninstallRun] section.
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Installation path")]
    [string]$InstallPath,

    [Parameter(HelpMessage="Keep user data (logs, config)")]
    [switch]$KeepData,

    [Parameter(HelpMessage="Remove all data including user data")]
    [switch]$RemoveAll,

    [Parameter(HelpMessage="Skip confirmation prompts")]
    [switch]$Force,

    [Parameter(HelpMessage="Suppress output (silent mode)")]
    [switch]$Quiet,

    [Parameter(HelpMessage="Alias for Quiet")]
    [switch]$Silent
)

# =============================================================================
# Configuration
# =============================================================================

# Treat -Silent as alias for -Quiet
if ($Silent) { $Quiet = $true }

# Service configuration
$ServiceName = "ContPAQiBridge"
$ServiceDisplayName = "ContPAQi AI Bridge Service"

# Docker configuration
$DockerImageName = "contpaqi-mcp"
$DockerImageTag = "latest"
$DockerContainerPrefix = "contpaqi"

# Registry paths
$RegistryPath = "HKLM:\SOFTWARE\ContPAQi AI Bridge"
$EnvironmentPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
$EnvironmentVarName = "CONTPAQI_BRIDGE_HOME"

# Default installation path
if (-not $InstallPath) {
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        $InstallPath = Split-Path -Parent $ScriptDir
    } else {
        $InstallPath = "C:\Program Files\ContPAQi AI Bridge"
    }
}

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_PARTIAL_FAILURE = 1
$EXIT_CRITICAL_FAILURE = 2

# Track cleanup status
$script:CleanupErrors = @()

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Log {
    <#
    .SYNOPSIS
        Writes a log message to the console (unless in quiet mode).
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )

    # In quiet mode, only show errors
    if ($Quiet -and $Level -ne "Error") {
        return
    }

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

function Test-ServiceExists {
    <#
    .SYNOPSIS
        Checks if a Windows service exists.
    #>
    param([string]$Name)
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    return $null -ne $service
}

function Test-DockerAvailable {
    <#
    .SYNOPSIS
        Checks if Docker is available and running.
    #>
    try {
        $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
        if (-not $dockerCmd) { return $false }

        $result = & docker info 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# =============================================================================
# Cleanup Functions
# =============================================================================

function Remove-ContPAQiService {
    <#
    .SYNOPSIS
        Stops and removes the ContPAQi AI Bridge Windows Service.
    #>
    Write-Log "Removing Windows Service..."

    if (-not (Test-ServiceExists $ServiceName)) {
        Write-Log "Service '$ServiceName' not found. Skipping." -Level Warning
        return $true
    }

    try {
        # Stop the service if running
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service.Status -eq 'Running') {
            Write-Log "Stopping service '$ServiceName'..."
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop

            # Wait for service to stop
            $timeout = 30
            $elapsed = 0
            while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
                Start-Sleep -Seconds 1
                $elapsed++
            }
        }

        # Remove the service using sc.exe
        Write-Log "Removing service '$ServiceName'..."
        $scResult = & sc.exe delete $ServiceName 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Service removed successfully" -Level Success
            return $true
        } else {
            # Try Remove-Service (PowerShell 6+)
            if (Get-Command Remove-Service -ErrorAction SilentlyContinue) {
                Remove-Service -Name $ServiceName -ErrorAction Stop
                Write-Log "Service removed successfully" -Level Success
                return $true
            }
            throw "Failed to remove service: $scResult"
        }
    }
    catch {
        Write-Log "Failed to remove service: $($_.Exception.Message)" -Level Error
        $script:CleanupErrors += "Service removal: $($_.Exception.Message)"
        return $false
    }
}

function Remove-DockerResources {
    <#
    .SYNOPSIS
        Stops containers and removes Docker images related to ContPAQi.
    #>
    Write-Log "Cleaning up Docker resources..."

    if (-not (Test-DockerAvailable)) {
        Write-Log "Docker is not available or not running. Skipping Docker cleanup." -Level Warning
        return $true
    }

    $success = $true

    try {
        # Find and stop any running containers using our image
        Write-Log "Stopping ContPAQi Docker containers..."
        $containers = & docker ps -a --filter "ancestor=${DockerImageName}:${DockerImageTag}" --format "{{.ID}}" 2>&1

        if ($containers -and $LASTEXITCODE -eq 0) {
            foreach ($containerId in $containers) {
                if ($containerId) {
                    Write-Log "Stopping container $containerId..."
                    & docker stop $containerId 2>&1 | Out-Null
                    & docker rm $containerId 2>&1 | Out-Null
                }
            }
        }

        # Also check for containers with our prefix in the name
        $namedContainers = & docker ps -a --filter "name=$DockerContainerPrefix" --format "{{.ID}}" 2>&1
        if ($namedContainers -and $LASTEXITCODE -eq 0) {
            foreach ($containerId in $namedContainers) {
                if ($containerId) {
                    Write-Log "Stopping container $containerId..."
                    & docker stop $containerId 2>&1 | Out-Null
                    & docker rm $containerId 2>&1 | Out-Null
                }
            }
        }

        Write-Log "Containers cleaned up" -Level Success
    }
    catch {
        Write-Log "Warning during container cleanup: $($_.Exception.Message)" -Level Warning
        $success = $false
    }

    try {
        # Remove the Docker image
        Write-Log "Removing Docker image ${DockerImageName}:${DockerImageTag}..."
        $rmiResult = & docker rmi "${DockerImageName}:${DockerImageTag}" 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker image removed successfully" -Level Success
        } else {
            # Image might not exist or be in use
            Write-Log "Could not remove Docker image (may not exist): $rmiResult" -Level Warning
        }
    }
    catch {
        Write-Log "Warning during image removal: $($_.Exception.Message)" -Level Warning
        $success = $false
    }

    return $success
}

function Remove-ApplicationData {
    <#
    .SYNOPSIS
        Removes application data directories.
    #>

    if ($KeepData) {
        Write-Log "Keeping user data as requested (KeepData flag)" -Level Info
        return $true
    }

    Write-Log "Cleaning up application data..."

    $success = $true
    $foldersToRemove = @()

    if ($RemoveAll) {
        # Remove everything
        $foldersToRemove = @(
            (Join-Path $InstallPath "logs"),
            (Join-Path $InstallPath "data"),
            (Join-Path $InstallPath "config"),
            (Join-Path $InstallPath "docker")
        )
    } else {
        # Default: remove logs and temp data, keep config
        $foldersToRemove = @(
            (Join-Path $InstallPath "logs"),
            (Join-Path $InstallPath "data\temp")
        )
    }

    foreach ($folder in $foldersToRemove) {
        if (Test-Path $folder) {
            try {
                Write-Log "Removing: $folder"
                Remove-Item -Path $folder -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Log "Warning: Could not remove $folder - $($_.Exception.Message)" -Level Warning
                $script:CleanupErrors += "Data cleanup: $folder"
                $success = $false
            }
        }
    }

    if ($success) {
        Write-Log "Application data cleaned up" -Level Success
    }

    return $success
}

function Remove-RegistryEntries {
    <#
    .SYNOPSIS
        Removes registry entries created during installation.
    #>
    Write-Log "Cleaning up registry entries..."

    $success = $true

    # Remove application registry key
    try {
        if (Test-Path $RegistryPath) {
            Write-Log "Removing registry key: $RegistryPath"
            Remove-Item -Path $RegistryPath -Recurse -Force -ErrorAction Stop
            Write-Log "Registry key removed" -Level Success
        } else {
            Write-Log "Registry key not found. Skipping." -Level Warning
        }
    }
    catch {
        Write-Log "Warning: Could not remove registry key - $($_.Exception.Message)" -Level Warning
        $script:CleanupErrors += "Registry cleanup: $RegistryPath"
        $success = $false
    }

    # Remove environment variable
    try {
        $envValue = [Environment]::GetEnvironmentVariable($EnvironmentVarName, "Machine")
        if ($envValue) {
            Write-Log "Removing environment variable: $EnvironmentVarName"
            [Environment]::SetEnvironmentVariable($EnvironmentVarName, $null, "Machine")
            Write-Log "Environment variable removed" -Level Success
        }
    }
    catch {
        # Try registry method
        try {
            if (Test-Path $EnvironmentPath) {
                $currentValue = Get-ItemProperty -Path $EnvironmentPath -Name $EnvironmentVarName -ErrorAction SilentlyContinue
                if ($currentValue) {
                    Remove-ItemProperty -Path $EnvironmentPath -Name $EnvironmentVarName -Force -ErrorAction Stop
                    Write-Log "Environment variable removed via registry" -Level Success
                }
            }
        }
        catch {
            Write-Log "Warning: Could not remove environment variable - $($_.Exception.Message)" -Level Warning
            $success = $false
        }
    }

    return $success
}

# =============================================================================
# Main Uninstall Function
# =============================================================================

function Start-Uninstall {
    <#
    .SYNOPSIS
        Main entry point for the uninstallation process.
    #>

    Write-Log "ContPAQi AI Bridge - Uninstaller"
    Write-Log "================================"
    Write-Log ""
    Write-Log "Installation path: $InstallPath"
    Write-Log "Keep data: $KeepData"
    Write-Log "Remove all: $RemoveAll"
    Write-Log ""

    # Confirmation (unless Force or Quiet)
    if (-not $Force -and -not $Quiet) {
        Write-Log "This will remove the ContPAQi AI Bridge application."
        $confirm = Read-Host "Continue? (Y/N)"
        if ($confirm -ne 'Y' -and $confirm -ne 'y') {
            Write-Log "Uninstallation cancelled by user."
            return $EXIT_SUCCESS
        }
    }

    Write-Log "Starting cleanup process..."
    Write-Log ""

    # Step 1: Remove Windows Service
    $serviceResult = Remove-ContPAQiService

    # Step 2: Remove Docker Resources
    $dockerResult = Remove-DockerResources

    # Step 3: Remove Application Data
    $dataResult = Remove-ApplicationData

    # Step 4: Remove Registry Entries
    $registryResult = Remove-RegistryEntries

    # Summary
    Write-Log ""
    Write-Log "================================"
    Write-Log "Cleanup Summary"
    Write-Log "================================"
    Write-Log "Windows Service: $(if ($serviceResult) { 'Cleaned' } else { 'Partial/Failed' })"
    Write-Log "Docker Resources: $(if ($dockerResult) { 'Cleaned' } else { 'Partial/Failed' })"
    Write-Log "Application Data: $(if ($dataResult) { 'Cleaned' } else { 'Partial/Skipped' })"
    Write-Log "Registry Entries: $(if ($registryResult) { 'Cleaned' } else { 'Partial/Failed' })"
    Write-Log ""

    if ($script:CleanupErrors.Count -gt 0) {
        Write-Log "Some cleanup tasks had issues:" -Level Warning
        foreach ($error in $script:CleanupErrors) {
            Write-Log "  - $error" -Level Warning
        }
        Write-Log ""
        Write-Log "Uninstallation completed with warnings" -Level Warning
        return $EXIT_PARTIAL_FAILURE
    }

    Write-Log "Uninstallation completed successfully!" -Level Success
    return $EXIT_SUCCESS
}

# =============================================================================
# Entry Point
# =============================================================================

$exitCode = Start-Uninstall
exit $exitCode
