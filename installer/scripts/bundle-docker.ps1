# =============================================================================
# ContPAQi AI Bridge - Docker Image Bundling Script
# =============================================================================
#
# This PowerShell script exports the ContPAQi MCP Docker image to a tar file
# for distribution with the Windows installer. The bundled image allows
# offline installation without requiring internet access.
#
# Usage:
#   .\bundle-docker.ps1                           # Use defaults
#   .\bundle-docker.ps1 -ImageName "myimage"      # Custom image
#   .\bundle-docker.ps1 -OutputPath "C:\dist"     # Custom output path
#   .\bundle-docker.ps1 -Tag "v1.0.0"             # Specific tag
#   .\bundle-docker.ps1 -Force                    # Overwrite existing
#   .\bundle-docker.ps1 -Compress                 # Create .tar.gz
#
# Output:
#   Creates a .tar file (uncompressed) or .tar.gz (if -Compress) containing
#   the Docker image that can be loaded with 'docker load -i <file>'.
#
# Requirements:
#   - Docker Desktop installed and running
#   - Image must be pulled/built before bundling
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Name of the Docker image to bundle")]
    [ValidateNotNullOrEmpty()]
    [string]$ImageName = "contpaqi-mcp",

    [Parameter(HelpMessage="Tag of the Docker image")]
    [ValidateNotNullOrEmpty()]
    [string]$Tag = "latest",

    [Parameter(HelpMessage="Output directory for the tar file")]
    [string]$OutputPath,

    [Parameter(HelpMessage="Output filename (without extension)")]
    [string]$OutputFilename,

    [switch]$Force,
    [switch]$Compress,
    [switch]$Quiet
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"

# Default output path: installer/dist/docker relative to script location
if (-not $OutputPath) {
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        $OutputPath = Join-Path (Split-Path -Parent $ScriptDir) "dist\docker"
    } else {
        $OutputPath = ".\dist\docker"
    }
}

# Default output filename based on image name
if (-not $OutputFilename) {
    $OutputFilename = $ImageName
}

# Full image reference
$FullImageName = "${ImageName}:${Tag}"

# Output file extension
$Extension = if ($Compress) { ".tar.gz" } else { ".tar" }
$OutputFile = Join-Path $OutputPath "${OutputFilename}${Extension}"

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_DOCKER_NOT_FOUND = 1
$EXIT_DOCKER_NOT_RUNNING = 2
$EXIT_IMAGE_NOT_FOUND = 3
$EXIT_SAVE_FAILED = 4
$EXIT_FILE_EXISTS = 5
$EXIT_COMPRESS_FAILED = 6

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

        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )

    if ($Quiet -and $Level -eq "Info") {
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

function Get-DockerImageSize {
    <#
    .SYNOPSIS
        Gets the size of a Docker image.
    #>
    param([string]$Image)

    try {
        $sizeStr = & docker image inspect $Image --format "{{.Size}}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            return [long]$sizeStr
        }
    }
    catch {}
    return 0
}

# =============================================================================
# Main Functions
# =============================================================================

function Export-DockerImage {
    <#
    .SYNOPSIS
        Exports a Docker image to a tar file using docker save.
    #>

    Write-Log "ContPAQi AI Bridge - Docker Image Bundling"
    Write-Log "=========================================="
    Write-Log ""
    Write-Log "Image: $FullImageName"
    Write-Log "Output: $OutputFile"
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

    # Check image exists
    Write-Log "Checking if image exists..."
    if (-not (Test-DockerImageExists $FullImageName)) {
        Write-Log "Image '$FullImageName' not found locally." -Level Error
        Write-Log "Please build or pull the image first:" -Level Error
        Write-Log "  docker build -t $FullImageName ." -Level Error
        Write-Log "  docker pull $FullImageName" -Level Error
        return $EXIT_IMAGE_NOT_FOUND
    }

    $imageSize = Get-DockerImageSize $FullImageName
    Write-Log "Image found ($(Format-FileSize $imageSize))" -Level Success

    # Create output directory if needed
    if (-not (Test-Path $OutputPath)) {
        Write-Log "Creating output directory: $OutputPath"
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }

    # Check if output file already exists
    if (Test-Path $OutputFile) {
        if ($Force) {
            Write-Log "Removing existing file (Force mode)..." -Level Warning
            Remove-Item $OutputFile -Force
        } else {
            Write-Log "Output file already exists: $OutputFile" -Level Error
            Write-Log "Use -Force to overwrite" -Level Error
            return $EXIT_FILE_EXISTS
        }
    }

    # Export the image
    Write-Log ""
    Write-Log "Saving Docker image to tar file..."
    Write-Log "This may take several minutes depending on image size..."

    try {
        $tempFile = if ($Compress) {
            Join-Path $OutputPath "${OutputFilename}.tar"
        } else {
            $OutputFile
        }

        # Use docker save with output redirection
        $saveResult = & docker save -o $tempFile $FullImageName 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Log "Docker save failed: $saveResult" -Level Error
            return $EXIT_SAVE_FAILED
        }

        # Compress if requested
        if ($Compress) {
            Write-Log "Compressing tar file with gzip..."
            try {
                # Use .NET GZipStream for compression
                $inputStream = [System.IO.File]::OpenRead($tempFile)
                $outputStream = [System.IO.File]::Create($OutputFile)
                $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)

                $inputStream.CopyTo($gzipStream)

                $gzipStream.Close()
                $outputStream.Close()
                $inputStream.Close()

                # Remove uncompressed file
                Remove-Item $tempFile -Force
            }
            catch {
                Write-Log "Compression failed: $($_.Exception.Message)" -Level Error
                return $EXIT_COMPRESS_FAILED
            }
        }

        # Verify output file exists
        if (-not (Test-Path $OutputFile)) {
            Write-Log "Output file was not created" -Level Error
            return $EXIT_SAVE_FAILED
        }

        $fileInfo = Get-Item $OutputFile
        $fileSize = Format-FileSize $fileInfo.Length

        Write-Log ""
        Write-Log "Docker image bundled successfully!" -Level Success
        Write-Log "Output file: $OutputFile"
        Write-Log "File size: $fileSize"
        Write-Log ""
        Write-Log "To load this image on another machine:"
        Write-Log "  docker load -i `"$($fileInfo.Name)`""

        # Return the output path for build integration
        Write-Output $OutputFile

        return $EXIT_SUCCESS
    }
    catch {
        Write-Log "Failed to save Docker image: $($_.Exception.Message)" -Level Error
        return $EXIT_SAVE_FAILED
    }
}

# =============================================================================
# Main Entry Point
# =============================================================================

$exitCode = Export-DockerImage
exit $exitCode
