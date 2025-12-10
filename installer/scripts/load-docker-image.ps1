# =============================================================================
# ContPAQi AI Bridge - Docker Image Loading Script
# =============================================================================
#
# This PowerShell script loads the bundled ContPAQi MCP Docker image from a
# tar file during installation. It runs silently in the background as part
# of the Inno Setup installer post-installation process.
#
# Usage:
#   .\load-docker-image.ps1                          # Use defaults
#   .\load-docker-image.ps1 -ImagePath "C:\img.tar"  # Custom path
#   .\load-docker-image.ps1 -Quiet                   # Silent mode
#   .\load-docker-image.ps1 -Force                   # Reload even if exists
#   .\load-docker-image.ps1 -SkipIfLoaded            # Skip if already loaded
#
# The script:
#   1. Checks Docker Desktop is available and running
#   2. Verifies the tar file exists
#   3. Optionally checks if image is already loaded
#   4. Loads the image using 'docker load -i'
#   5. Verifies the image was loaded successfully
#
# Requirements:
#   - Docker Desktop installed and running
#   - Bundled tar file from bundle-docker.ps1
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Path to the Docker image tar file")]
    [string]$ImagePath,

    [Parameter(HelpMessage="Expected image name after loading")]
    [string]$ImageName = "contpaqi-mcp",

    [Parameter(HelpMessage="Expected image tag")]
    [string]$Tag = "latest",

    [switch]$Force,
    [switch]$SkipIfLoaded,
    [switch]$Quiet,
    [switch]$Silent
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"

# Treat -Silent as alias for -Quiet
if ($Silent) { $Quiet = $true }

# Default image path: {app}\docker\contpaqi-mcp.tar
if (-not $ImagePath) {
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        # Script is in {app}\scripts, tar is in {app}\docker
        $AppDir = Split-Path -Parent $ScriptDir
        $ImagePath = Join-Path $AppDir "docker\contpaqi-mcp.tar"
    } else {
        $ImagePath = ".\docker\contpaqi-mcp.tar"
    }
}

# Full image reference
$FullImageName = "${ImageName}:${Tag}"

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_DOCKER_NOT_FOUND = 1
$EXIT_DOCKER_NOT_RUNNING = 2
$EXIT_FILE_NOT_FOUND = 3
$EXIT_LOAD_FAILED = 4
$EXIT_VERIFY_FAILED = 5
$EXIT_ALREADY_LOADED = 6

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

function Format-FileSize {
    <#
    .SYNOPSIS
        Formats a file size in bytes to a human-readable format.
    #>
    param([long]$Bytes)

    if ($Bytes -ge 1GB) {
        return "{0:N2} GB" -f ($Bytes / 1GB)
    } elseif ($Bytes -ge 1MB) {
        return "{0:N2} MB" -f ($Bytes / 1MB)
    } elseif ($Bytes -ge 1KB) {
        return "{0:N2} KB" -f ($Bytes / 1KB)
    } else {
        return "$Bytes bytes"
    }
}

function Test-DockerAvailable {
    <#
    .SYNOPSIS
        Checks if Docker CLI is available.
    #>
    $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
    return $null -ne $dockerCmd
}

function Test-DockerRunning {
    <#
    .SYNOPSIS
        Checks if Docker daemon is running.
    #>
    try {
        $result = & docker info 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Test-DockerImageExists {
    <#
    .SYNOPSIS
        Checks if a Docker image exists locally.
    #>
    param([string]$Image)

    try {
        $result = & docker image inspect $Image 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Get-DockerImageInfo {
    <#
    .SYNOPSIS
        Gets information about a loaded Docker image.
    #>
    param([string]$Image)

    try {
        $sizeStr = & docker image inspect $Image --format "{{.Size}}" 2>&1
        $created = & docker image inspect $Image --format "{{.Created}}" 2>&1
        $id = & docker image inspect $Image --format "{{.Id}}" 2>&1

        if ($LASTEXITCODE -eq 0) {
            return @{
                Size = [long]$sizeStr
                Created = $created
                Id = $id.Substring(7, 12)  # Short ID
            }
        }
    }
    catch {}
    return $null
}

# =============================================================================
# Main Functions
# =============================================================================

function Import-DockerImage {
    <#
    .SYNOPSIS
        Loads a Docker image from a tar file using docker load.
    #>

    Write-Log "ContPAQi AI Bridge - Docker Image Loading"
    Write-Log "========================================="
    Write-Log ""
    Write-Log "Image file: $ImagePath"
    Write-Log "Expected image: $FullImageName"
    Write-Log ""

    # Check Docker is available
    Write-Log "Checking Docker availability..."
    if (-not (Test-DockerAvailable)) {
        Write-Log "Docker CLI not found. Please install Docker Desktop." -Level Error
        return $EXIT_DOCKER_NOT_FOUND
    }
    Write-Log "Docker CLI found" -Level Success

    # Check Docker is running
    Write-Log "Checking Docker daemon..."
    if (-not (Test-DockerRunning)) {
        Write-Log "Docker daemon is not running. Please start Docker Desktop." -Level Error
        return $EXIT_DOCKER_NOT_RUNNING
    }
    Write-Log "Docker daemon is running" -Level Success

    # Check if image already exists
    if (Test-DockerImageExists $FullImageName) {
        if ($SkipIfLoaded -and -not $Force) {
            Write-Log "Image '$FullImageName' is already loaded. Skipping." -Level Success
            return $EXIT_ALREADY_LOADED
        } elseif (-not $Force) {
            Write-Log "Image '$FullImageName' already exists. Use -Force to reload." -Level Warning
            return $EXIT_ALREADY_LOADED
        } else {
            Write-Log "Image exists but -Force specified. Reloading..." -Level Warning
        }
    }

    # Check tar file exists
    Write-Log "Checking image file..."
    if (-not (Test-Path $ImagePath)) {
        Write-Log "Image file not found: $ImagePath" -Level Error
        return $EXIT_FILE_NOT_FOUND
    }

    $fileInfo = Get-Item $ImagePath
    $fileSize = Format-FileSize $fileInfo.Length
    Write-Log "Image file found ($fileSize)" -Level Success

    # Load the image
    Write-Log ""
    Write-Log "Loading Docker image..."
    Write-Log "This may take a few minutes depending on image size..."

    try {
        # Use docker load with input file
        $loadResult = & docker load -i $ImagePath 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Log "Docker load failed: $loadResult" -Level Error
            return $EXIT_LOAD_FAILED
        }

        Write-Log "Docker load completed" -Level Success

        # Parse the loaded image name from output
        # Output is typically: "Loaded image: imagename:tag"
        if ($loadResult -match "Loaded image:\s*(.+)") {
            $loadedImage = $Matches[1].Trim()
            Write-Log "Loaded image: $loadedImage"
        }

        # Verify image was loaded
        Write-Log ""
        Write-Log "Verifying image..."

        if (-not (Test-DockerImageExists $FullImageName)) {
            Write-Log "Image verification failed. Image not found after load." -Level Error
            return $EXIT_VERIFY_FAILED
        }

        # Get image information
        $imageInfo = Get-DockerImageInfo $FullImageName
        if ($imageInfo) {
            Write-Log "Image ID: $($imageInfo.Id)"
            Write-Log "Image size: $(Format-FileSize $imageInfo.Size)"
        }

        Write-Log ""
        Write-Log "Docker image loaded successfully!" -Level Success
        Write-Log "Image: $FullImageName"
        Write-Log ""
        Write-Log "You can verify with: docker images | findstr $ImageName"

        return $EXIT_SUCCESS
    }
    catch {
        Write-Log "Failed to load Docker image: $($_.Exception.Message)" -Level Error
        return $EXIT_LOAD_FAILED
    }
}

# =============================================================================
# Main Entry Point
# =============================================================================

$exitCode = Import-DockerImage
exit $exitCode
