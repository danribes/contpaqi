<#
.SYNOPSIS
    Obfuscates the ContPAQi Bridge C# assemblies using Dotfuscator Community Edition.

.DESCRIPTION
    This script automates the obfuscation process for the Windows Bridge component.
    It performs the following steps:
    1. Verifies Dotfuscator installation
    2. Builds the project in Release mode
    3. Runs Dotfuscator with the configuration file
    4. Verifies the output

.PARAMETER Configuration
    Build configuration (default: Release)

.PARAMETER Clean
    Clean output directory before obfuscation

.PARAMETER DryRun
    Show what would be done without executing

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    .\obfuscate.ps1
    Runs obfuscation with default settings.

.EXAMPLE
    .\obfuscate.ps1 -Clean -Verbose
    Cleans output and runs with verbose output.

.EXAMPLE
    .\obfuscate.ps1 -DryRun
    Shows what would be done without executing.

.NOTES
    Author: ContPAQi AI Bridge Team
    Requires: Dotfuscator Community Edition (included with Visual Studio)
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",

    [Parameter()]
    [switch]$Clean,

    [Parameter()]
    [switch]$DryRun,

    [Parameter()]
    [switch]$VerboseOutput
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ConfigFile = Join-Path $ProjectRoot "dotfuscator.xml"
$OutputDir = Join-Path $ProjectRoot "obfuscated"
$SolutionFile = Join-Path $ProjectRoot "ContpaqiBridge.sln"
$ProjectFile = Join-Path $ProjectRoot "src\ContpaqiBridge\ContpaqiBridge.csproj"

# Common Dotfuscator installation paths
$DotfuscatorPaths = @(
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\*\Common7\IDE\Extensions\PreEmptiveSolutions\DotfuscatorCE\dotfuscator.exe",
    "${env:ProgramFiles}\Microsoft Visual Studio\2019\*\Common7\IDE\Extensions\PreEmptiveSolutions\DotfuscatorCE\dotfuscator.exe",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\*\Common7\IDE\Extensions\PreEmptiveSolutions\DotfuscatorCE\dotfuscator.exe",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\*\Common7\IDE\Extensions\PreEmptiveSolutions\DotfuscatorCE\dotfuscator.exe"
)

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO"    { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }

    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Find-Dotfuscator {
    <#
    .SYNOPSIS
        Finds Dotfuscator Community Edition installation.
    #>

    Write-Log "Searching for Dotfuscator installation..."

    foreach ($pattern in $DotfuscatorPaths) {
        $paths = Resolve-Path -Path $pattern -ErrorAction SilentlyContinue
        if ($paths) {
            foreach ($path in $paths) {
                if (Test-Path $path.Path) {
                    Write-Log "Found Dotfuscator at: $($path.Path)" -Level "SUCCESS"
                    return $path.Path
                }
            }
        }
    }

    # Check if dotfuscator is in PATH
    $inPath = Get-Command "dotfuscator.exe" -ErrorAction SilentlyContinue
    if ($inPath) {
        Write-Log "Found Dotfuscator in PATH: $($inPath.Source)" -Level "SUCCESS"
        return $inPath.Source
    }

    return $null
}

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Verifies all prerequisites are met.
    #>

    Write-Log "Checking prerequisites..."

    # Check configuration file exists
    if (-not (Test-Path $ConfigFile)) {
        throw "Dotfuscator configuration not found: $ConfigFile"
    }
    Write-Log "Configuration file found: $ConfigFile"

    # Check project file exists
    if (-not (Test-Path $ProjectFile)) {
        throw "Project file not found: $ProjectFile"
    }
    Write-Log "Project file found: $ProjectFile"

    # Check dotnet SDK
    $dotnetVersion = & dotnet --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ".NET SDK not found. Please install .NET 6.0 SDK or later."
    }
    Write-Log ".NET SDK version: $dotnetVersion"

    return $true
}

function Build-Project {
    <#
    .SYNOPSIS
        Builds the project in Release configuration.
    #>

    Write-Log "Building project in $Configuration mode..."

    if ($DryRun) {
        Write-Log "[DRY RUN] Would execute: dotnet build '$ProjectFile' -c $Configuration" -Level "WARNING"
        return $true
    }

    $buildArgs = @(
        "build",
        $ProjectFile,
        "-c", $Configuration,
        "--no-restore"
    )

    if ($VerboseOutput) {
        $buildArgs += "-v", "normal"
    } else {
        $buildArgs += "-v", "minimal"
    }

    & dotnet @buildArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code: $LASTEXITCODE"
    }

    Write-Log "Build completed successfully" -Level "SUCCESS"
    return $true
}

function Invoke-Obfuscation {
    param(
        [string]$DotfuscatorPath
    )

    <#
    .SYNOPSIS
        Runs Dotfuscator with the configuration file.
    #>

    Write-Log "Starting obfuscation process..."

    # Change to project root for relative paths in config
    Push-Location $ProjectRoot

    try {
        if ($DryRun) {
            Write-Log "[DRY RUN] Would execute: $DotfuscatorPath $ConfigFile" -Level "WARNING"
            return $true
        }

        $obfuscateArgs = @($ConfigFile)

        if ($VerboseOutput) {
            $obfuscateArgs += "/v"
        }

        Write-Log "Running: $DotfuscatorPath $($obfuscateArgs -join ' ')"

        & $DotfuscatorPath @obfuscateArgs

        if ($LASTEXITCODE -ne 0) {
            throw "Obfuscation failed with exit code: $LASTEXITCODE"
        }

        Write-Log "Obfuscation completed successfully" -Level "SUCCESS"
        return $true
    }
    finally {
        Pop-Location
    }
}

function Test-Output {
    <#
    .SYNOPSIS
        Verifies obfuscation output exists.
    #>

    Write-Log "Verifying obfuscation output..."

    if ($DryRun) {
        Write-Log "[DRY RUN] Would verify output in: $OutputDir" -Level "WARNING"
        return $true
    }

    if (-not (Test-Path $OutputDir)) {
        throw "Output directory not created: $OutputDir"
    }

    $outputDll = Join-Path $OutputDir "ContpaqiBridge.dll"
    if (-not (Test-Path $outputDll)) {
        throw "Obfuscated assembly not found: $outputDll"
    }

    $originalDll = Join-Path $ProjectRoot "src\ContpaqiBridge\bin\$Configuration\net6.0\ContpaqiBridge.dll"
    if (Test-Path $originalDll) {
        $originalSize = (Get-Item $originalDll).Length
        $obfuscatedSize = (Get-Item $outputDll).Length

        Write-Log "Original size: $originalSize bytes"
        Write-Log "Obfuscated size: $obfuscatedSize bytes"
    }

    # Check for mapping file
    $mappingFile = Join-Path $OutputDir "mapping.xml"
    if (Test-Path $mappingFile) {
        Write-Log "Mapping file created: $mappingFile"
    }

    Write-Log "Output verification passed" -Level "SUCCESS"
    return $true
}

function Clear-Output {
    <#
    .SYNOPSIS
        Cleans the output directory.
    #>

    if (Test-Path $OutputDir) {
        Write-Log "Cleaning output directory: $OutputDir"

        if ($DryRun) {
            Write-Log "[DRY RUN] Would remove: $OutputDir" -Level "WARNING"
            return
        }

        Remove-Item -Path $OutputDir -Recurse -Force
        Write-Log "Output directory cleaned" -Level "SUCCESS"
    }
}

# =============================================================================
# Main Execution
# =============================================================================

function Main {
    Write-Log "ContPAQi Bridge Obfuscation Script"
    Write-Log "=================================="

    if ($DryRun) {
        Write-Log "Running in DRY RUN mode - no changes will be made" -Level "WARNING"
    }

    try {
        # Clean output if requested
        if ($Clean) {
            Clear-Output
        }

        # Check prerequisites
        Test-Prerequisites | Out-Null

        # Find Dotfuscator
        $dotfuscatorPath = Find-Dotfuscator

        if (-not $dotfuscatorPath) {
            Write-Log "Dotfuscator not found. Please install Visual Studio with Dotfuscator CE." -Level "ERROR"
            Write-Log "Alternatively, download from: https://www.preemptive.com/products/dotfuscator/downloads" -Level "INFO"

            if (-not $DryRun) {
                throw "Dotfuscator not found"
            } else {
                Write-Log "[DRY RUN] Would require Dotfuscator to be installed" -Level "WARNING"
            }
        }

        # Build project
        Build-Project | Out-Null

        # Run obfuscation
        if ($dotfuscatorPath -or $DryRun) {
            Invoke-Obfuscation -DotfuscatorPath $dotfuscatorPath | Out-Null
        }

        # Verify output
        if (-not $DryRun) {
            Test-Output | Out-Null
        }

        Write-Log "=================================="
        Write-Log "Obfuscation process completed!" -Level "SUCCESS"

        return 0
    }
    catch {
        Write-Log "Error: $_" -Level "ERROR"
        Write-Log $_.ScriptStackTrace -Level "ERROR"
        return 1
    }
}

# Run main function
$exitCode = Main
exit $exitCode
