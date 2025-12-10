# =============================================================================
# ContPAQi AI Bridge - Installation Test Script
# =============================================================================
#
# This PowerShell script validates the ContPAQi AI Bridge installation on
# clean Windows 10/11 machines. It performs comprehensive checks to ensure
# all components are correctly installed and functioning.
#
# Usage:
#   .\test-installation.ps1                          # Run all tests
#   .\test-installation.ps1 -Verbose                 # Detailed output
#   .\test-installation.ps1 -ReportPath "report.txt" # Save report to file
#   .\test-installation.ps1 -SkipDocker              # Skip Docker tests
#
# Designed for testing on fresh Windows 10/11 installations.
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Installation path to test")]
    [string]$InstallPath,

    [Parameter(HelpMessage="Path to save test report")]
    [string]$ReportPath,

    [Parameter(HelpMessage="Output path (alias)")]
    [string]$OutputPath,

    [Parameter(HelpMessage="Enable detailed/verbose output")]
    [switch]$Verbose,

    [Parameter(HelpMessage="Detailed output (alias)")]
    [switch]$Detailed,

    [Parameter(HelpMessage="Skip Docker-related tests")]
    [switch]$SkipDocker,

    [Parameter(HelpMessage="Skip service tests")]
    [switch]$SkipService,

    [Parameter(HelpMessage="Only check prerequisites")]
    [switch]$PrerequisitesOnly
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Continue"

# Application configuration
$AppName = "ContPAQi AI Bridge"
$ServiceName = "ContPAQiBridge"
$ExeName = "ContpaqiBridge.exe"
$DockerImageName = "contpaqi-mcp"
$DefaultPort = 5000
$HealthEndpoint = "http://localhost:$DefaultPort/health"

# Windows version requirements
$MinWin10Build = 19041  # Windows 10 2004
$MinWin11Build = 22000  # Windows 11 21H2

# Default installation path
if (-not $InstallPath) {
    $InstallPath = "C:\Program Files\ContPAQi AI Bridge"
}

# Resolve output path alias
$effectiveReportPath = if ($ReportPath) { $ReportPath } elseif ($OutputPath) { $OutputPath } else { $null }
$verboseMode = $Verbose -or $Detailed

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_SOME_FAILED = 1
$EXIT_CRITICAL_FAILED = 2

# Test results tracking
$script:TestResults = @()
$script:PassedCount = 0
$script:FailedCount = 0
$script:SkippedCount = 0

# =============================================================================
# Helper Functions
# =============================================================================

function Write-TestLog {
    <#
    .SYNOPSIS
        Writes a log message to the console.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [ValidateSet("Info", "Warning", "Error", "Success", "Header", "Detail")]
        [string]$Level = "Info"
    )

    if ($Level -eq "Detail" -and -not $verboseMode) {
        return
    }

    switch ($Level) {
        "Error"   { Write-Host "  [FAIL] $Message" -ForegroundColor Red }
        "Warning" { Write-Host "  [WARN] $Message" -ForegroundColor Yellow }
        "Success" { Write-Host "  [PASS] $Message" -ForegroundColor Green }
        "Header"  { Write-Host "`n$Message" -ForegroundColor Cyan }
        "Detail"  { Write-Host "         $Message" -ForegroundColor Gray }
        default   { Write-Host "  $Message" }
    }
}

function Add-TestResult {
    <#
    .SYNOPSIS
        Records a test result.
    #>
    param(
        [string]$TestName,
        [string]$Category,
        [bool]$Passed,
        [string]$Message = "",
        [bool]$Skipped = $false
    )

    $result = [PSCustomObject]@{
        TestName = $TestName
        Category = $Category
        Passed = $Passed
        Skipped = $Skipped
        Message = $Message
        Timestamp = Get-Date
    }

    $script:TestResults += $result

    if ($Skipped) {
        $script:SkippedCount++
        Write-TestLog "$TestName - SKIPPED: $Message" -Level Warning
    }
    elseif ($Passed) {
        $script:PassedCount++
        Write-TestLog "$TestName" -Level Success
    }
    else {
        $script:FailedCount++
        Write-TestLog "$TestName - $Message" -Level Error
    }

    return $Passed
}

# =============================================================================
# Windows Version Tests
# =============================================================================

function Test-WindowsVersion {
    <#
    .SYNOPSIS
        Verifies Windows 10/11 version compatibility.
    #>

    Write-TestLog "Windows Version Tests" -Level Header
    Write-TestLog "====================="

    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $buildNumber = [int]$os.BuildNumber
    $caption = $os.Caption

    Write-TestLog "Detected: $caption (Build $buildNumber)" -Level Detail

    # Test: Windows 10 or 11
    $isWindows10or11 = $caption -match "Windows 10|Windows 11"
    Add-TestResult -TestName "Windows 10/11 Detected" `
                   -Category "Windows Version" `
                   -Passed $isWindows10or11 `
                   -Message "Found: $caption"

    # Test: Minimum build number
    $buildOk = $false
    if ($caption -match "Windows 11") {
        $buildOk = $buildNumber -ge $MinWin11Build
        Add-TestResult -TestName "Windows 11 Build $MinWin11Build+ (22000+)" `
                       -Category "Windows Version" `
                       -Passed $buildOk `
                       -Message "Build: $buildNumber"
    }
    elseif ($caption -match "Windows 10") {
        $buildOk = $buildNumber -ge $MinWin10Build
        Add-TestResult -TestName "Windows 10 Build $MinWin10Build+ (19041+)" `
                       -Category "Windows Version" `
                       -Passed $buildOk `
                       -Message "Build: $buildNumber"
    }

    # Test: 64-bit OS
    $is64Bit = [Environment]::Is64BitOperatingSystem
    Add-TestResult -TestName "64-bit Operating System" `
                   -Category "Windows Version" `
                   -Passed $is64Bit `
                   -Message "Is64Bit: $is64Bit"

    return ($isWindows10or11 -and $buildOk)
}

# =============================================================================
# Prerequisite Tests
# =============================================================================

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Tests prerequisite requirements for a clean install.
    #>

    Write-TestLog "Prerequisite Tests" -Level Header
    Write-TestLog "=================="

    # Test: PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    $psOk = $psVersion.Major -ge 5
    Add-TestResult -TestName "PowerShell 5.1+" `
                   -Category "Prerequisites" `
                   -Passed $psOk `
                   -Message "Version: $psVersion"

    # Test: .NET Framework
    try {
        $dotnetVersion = & dotnet --version 2>&1
        $dotnetOk = $LASTEXITCODE -eq 0
        Add-TestResult -TestName ".NET Runtime Available" `
                       -Category "Prerequisites" `
                       -Passed $dotnetOk `
                       -Message "Version: $dotnetVersion"
    }
    catch {
        Add-TestResult -TestName ".NET Runtime Available" `
                       -Category "Prerequisites" `
                       -Passed $false `
                       -Message ".NET not found in PATH"
    }

    # Test: Docker Desktop (if not skipped)
    if (-not $SkipDocker) {
        $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
        Add-TestResult -TestName "Docker Installed" `
                       -Category "Prerequisites" `
                       -Passed ($null -ne $dockerInstalled) `
                       -Message $(if ($dockerInstalled) { "Found in PATH" } else { "Not found" })

        if ($dockerInstalled) {
            $dockerInfo = & docker info 2>&1
            $dockerRunning = $LASTEXITCODE -eq 0
            Add-TestResult -TestName "Docker Daemon Running" `
                           -Category "Prerequisites" `
                           -Passed $dockerRunning `
                           -Message $(if ($dockerRunning) { "Daemon is running" } else { "Daemon not running" })
        }
    }
    else {
        Add-TestResult -TestName "Docker Tests" `
                       -Category "Prerequisites" `
                       -Passed $true `
                       -Message "Skipped by user" `
                       -Skipped $true
    }

    return $true
}

# =============================================================================
# Installation Tests
# =============================================================================

function Test-Installation {
    <#
    .SYNOPSIS
        Verifies installation directory and files.
    #>

    Write-TestLog "Installation Tests" -Level Header
    Write-TestLog "=================="

    # Test: Installation directory exists
    $dirExists = Test-Path $InstallPath
    Add-TestResult -TestName "Installation Directory Exists" `
                   -Category "Installation" `
                   -Passed $dirExists `
                   -Message "Path: $InstallPath"

    if (-not $dirExists) {
        Write-TestLog "Cannot continue installation tests - directory not found" -Level Warning
        return $false
    }

    # Test: Executable exists
    $exePath = Join-Path $InstallPath "bin\$ExeName"
    $exeExists = Test-Path $exePath
    Add-TestResult -TestName "Executable Exists" `
                   -Category "Installation" `
                   -Passed $exeExists `
                   -Message "ContpaqiBridge.exe"

    # Test: Config directory
    $configPath = Join-Path $InstallPath "config"
    $configExists = Test-Path $configPath
    Add-TestResult -TestName "Config Directory Exists" `
                   -Category "Installation" `
                   -Passed $configExists `
                   -Message "config/"

    # Test: appsettings.json
    $appSettingsPath = Join-Path $configPath "appsettings.json"
    $appSettingsExists = Test-Path $appSettingsPath
    Add-TestResult -TestName "appsettings.json Exists" `
                   -Category "Installation" `
                   -Passed $appSettingsExists `
                   -Message "config/appsettings.json"

    # Test: Valid JSON configuration
    if ($appSettingsExists) {
        try {
            $settings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
            Add-TestResult -TestName "appsettings.json Valid JSON" `
                           -Category "Installation" `
                           -Passed $true `
                           -Message "Configuration is valid"
        }
        catch {
            Add-TestResult -TestName "appsettings.json Valid JSON" `
                           -Category "Installation" `
                           -Passed $false `
                           -Message "Invalid JSON: $($_.Exception.Message)"
        }
    }

    # Test: Logs directory
    $logsPath = Join-Path $InstallPath "logs"
    $logsExists = Test-Path $logsPath
    Add-TestResult -TestName "Logs Directory Exists" `
                   -Category "Installation" `
                   -Passed $logsExists `
                   -Message "logs/"

    # Test: Scripts directory
    $scriptsPath = Join-Path $InstallPath "scripts"
    $scriptsExists = Test-Path $scriptsPath
    Add-TestResult -TestName "Scripts Directory Exists" `
                   -Category "Installation" `
                   -Passed $scriptsExists `
                   -Message "scripts/"

    return $dirExists
}

# =============================================================================
# Service Tests
# =============================================================================

function Test-ServiceInstallation {
    <#
    .SYNOPSIS
        Tests Windows service installation and status.
    #>

    Write-TestLog "Service Tests" -Level Header
    Write-TestLog "============="

    if ($SkipService) {
        Add-TestResult -TestName "Service Tests" `
                       -Category "Service" `
                       -Passed $true `
                       -Message "Skipped by user" `
                       -Skipped $true
        return $true
    }

    # Test: Service installed
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    $serviceInstalled = $null -ne $service
    Add-TestResult -TestName "Service Installed (ContPAQiBridge)" `
                   -Category "Service" `
                   -Passed $serviceInstalled `
                   -Message $(if ($service) { "Service found" } else { "Service not found" })

    if (-not $serviceInstalled) {
        return $false
    }

    # Test: Service status
    $serviceRunning = $service.Status -eq 'Running'
    Add-TestResult -TestName "Service Running" `
                   -Category "Service" `
                   -Passed $serviceRunning `
                   -Message "Status: $($service.Status)"

    # Test: Service startup type
    $startType = $service.StartType
    $autoStart = $startType -in @('Automatic', 'AutomaticDelayedStart')
    Add-TestResult -TestName "Service Auto-Start Enabled" `
                   -Category "Service" `
                   -Passed $autoStart `
                   -Message "StartType: $startType"

    return $serviceRunning
}

# =============================================================================
# Docker Tests
# =============================================================================

function Test-DockerIntegration {
    <#
    .SYNOPSIS
        Tests Docker image and container status.
    #>

    Write-TestLog "Docker Tests" -Level Header
    Write-TestLog "============"

    if ($SkipDocker) {
        Add-TestResult -TestName "Docker Tests" `
                       -Category "Docker" `
                       -Passed $true `
                       -Message "Skipped by user" `
                       -Skipped $true
        return $true
    }

    # Check Docker is available
    $dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerAvailable) {
        Add-TestResult -TestName "Docker Available" `
                       -Category "Docker" `
                       -Passed $false `
                       -Message "Docker not found"
        return $false
    }

    # Test: Docker daemon running
    $dockerInfo = & docker info 2>&1
    $daemonRunning = $LASTEXITCODE -eq 0
    if (-not $daemonRunning) {
        Add-TestResult -TestName "Docker Daemon Running" `
                       -Category "Docker" `
                       -Passed $false `
                       -Message "Docker daemon not running"
        return $false
    }

    # Test: Docker image exists
    $images = & docker images --format "{{.Repository}}:{{.Tag}}" 2>&1
    $imageExists = $images -match $DockerImageName
    Add-TestResult -TestName "Docker Image Loaded ($DockerImageName)" `
                   -Category "Docker" `
                   -Passed $imageExists `
                   -Message $(if ($imageExists) { "Image found" } else { "Image not found" })

    return $imageExists
}

# =============================================================================
# Shortcut Tests
# =============================================================================

function Test-Shortcuts {
    <#
    .SYNOPSIS
        Tests desktop and Start Menu shortcuts.
    #>

    Write-TestLog "Shortcut Tests" -Level Header
    Write-TestLog "=============="

    # Test: Desktop shortcut (All Users)
    $publicDesktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $desktopShortcut = Join-Path $publicDesktop "$AppName.lnk"
    $desktopExists = Test-Path $desktopShortcut
    Add-TestResult -TestName "Desktop Shortcut Exists" `
                   -Category "Shortcuts" `
                   -Passed $desktopExists `
                   -Message "Public Desktop"

    # Also check user desktop
    if (-not $desktopExists) {
        $userDesktop = [Environment]::GetFolderPath('Desktop')
        $userDesktopShortcut = Join-Path $userDesktop "$AppName.lnk"
        $desktopExists = Test-Path $userDesktopShortcut
        if ($desktopExists) {
            Add-TestResult -TestName "Desktop Shortcut (User)" `
                           -Category "Shortcuts" `
                           -Passed $true `
                           -Message "User Desktop"
        }
    }

    # Test: Start Menu folder
    $startMenuPath = [Environment]::GetFolderPath('CommonPrograms')
    $appFolder = Join-Path $startMenuPath $AppName
    $startMenuExists = Test-Path $appFolder
    Add-TestResult -TestName "Start Menu Folder Exists" `
                   -Category "Shortcuts" `
                   -Passed $startMenuExists `
                   -Message "Programs\$AppName"

    # Test: Start Menu main shortcut
    if ($startMenuExists) {
        $mainShortcut = Join-Path $appFolder "$AppName.lnk"
        $mainExists = Test-Path $mainShortcut
        Add-TestResult -TestName "Start Menu Main Shortcut" `
                       -Category "Shortcuts" `
                       -Passed $mainExists `
                       -Message "$AppName.lnk"
    }

    return $desktopExists -or $startMenuExists
}

# =============================================================================
# Health Check Tests
# =============================================================================

function Test-HealthEndpoint {
    <#
    .SYNOPSIS
        Tests the application health endpoint.
    #>

    Write-TestLog "Health Check Tests" -Level Header
    Write-TestLog "=================="

    # Test: API endpoint reachable
    try {
        $response = Invoke-WebRequest -Uri $HealthEndpoint -UseBasicParsing -TimeoutSec 10
        $statusOk = $response.StatusCode -eq 200
        Add-TestResult -TestName "Health Endpoint Reachable" `
                       -Category "Health" `
                       -Passed $statusOk `
                       -Message "http://localhost:$DefaultPort/health"

        # Test: Health status response
        if ($statusOk) {
            $content = $response.Content
            $healthOk = $content -match "healthy|ok|success"
            Add-TestResult -TestName "Health Status OK" `
                           -Category "Health" `
                           -Passed $healthOk `
                           -Message "Response: $content"
        }

        return $statusOk
    }
    catch {
        Add-TestResult -TestName "Health Endpoint Reachable" `
                       -Category "Health" `
                       -Passed $false `
                       -Message "Could not connect: $($_.Exception.Message)"
        return $false
    }
}

# =============================================================================
# Report Generation
# =============================================================================

function Write-TestReport {
    <#
    .SYNOPSIS
        Generates and displays the test report summary.
    #>

    $totalTests = $script:PassedCount + $script:FailedCount + $script:SkippedCount

    Write-TestLog "" -Level Header
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                    TEST RESULTS SUMMARY                        " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Total Tests:  $totalTests"
    Write-Host "  Passed:       $($script:PassedCount)" -ForegroundColor Green
    Write-Host "  Failed:       $($script:FailedCount)" -ForegroundColor $(if ($script:FailedCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  Skipped:      $($script:SkippedCount)" -ForegroundColor Yellow
    Write-Host ""

    # Category breakdown
    Write-Host "  Results by Category:" -ForegroundColor Cyan
    $categories = $script:TestResults | Group-Object Category
    foreach ($cat in $categories) {
        $catPassed = ($cat.Group | Where-Object { $_.Passed -and -not $_.Skipped }).Count
        $catTotal = ($cat.Group | Where-Object { -not $_.Skipped }).Count
        $color = if ($catPassed -eq $catTotal) { "Green" } else { "Yellow" }
        Write-Host "    $($cat.Name): $catPassed/$catTotal passed" -ForegroundColor $color
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

    # Overall result
    if ($script:FailedCount -eq 0) {
        Write-Host ""
        Write-Host "  ✓ ALL TESTS PASSED - Installation verified successfully!" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host ""
        Write-Host "  ✗ SOME TESTS FAILED - Review issues above" -ForegroundColor Red
        Write-Host ""
    }

    # Save report if path specified
    if ($effectiveReportPath) {
        $reportContent = @"
ContPAQi AI Bridge - Installation Test Report
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Installation Path: $InstallPath

SUMMARY
=======
Total Tests: $totalTests
Passed: $($script:PassedCount)
Failed: $($script:FailedCount)
Skipped: $($script:SkippedCount)

DETAILED RESULTS
================
"@
        foreach ($result in $script:TestResults) {
            $status = if ($result.Skipped) { "SKIP" } elseif ($result.Passed) { "PASS" } else { "FAIL" }
            $reportContent += "`n[$status] $($result.Category): $($result.TestName)"
            if ($result.Message) {
                $reportContent += " - $($result.Message)"
            }
        }

        $reportContent | Out-File -FilePath $effectiveReportPath -Encoding UTF8
        Write-Host "  Report saved to: $effectiveReportPath" -ForegroundColor Cyan
    }
}

# =============================================================================
# Main Function
# =============================================================================

function Start-InstallationTest {
    <#
    .SYNOPSIS
        Main entry point for installation testing.
    #>

    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                               ║" -ForegroundColor Cyan
    Write-Host "║     ContPAQi AI Bridge - Installation Verification Test       ║" -ForegroundColor Cyan
    Write-Host "║                                                               ║" -ForegroundColor Cyan
    Write-Host "║     Testing on clean Windows 10/11 machine                    ║" -ForegroundColor Cyan
    Write-Host "║                                                               ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Installation Path: $InstallPath"
    Write-Host "  Test Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host ""

    # Run test categories
    $windowsOk = Test-WindowsVersion
    $prereqOk = Test-Prerequisites

    if ($PrerequisitesOnly) {
        Write-TestReport
        return $(if ($prereqOk) { $EXIT_SUCCESS } else { $EXIT_CRITICAL_FAILED })
    }

    $installOk = Test-Installation
    $serviceOk = Test-ServiceInstallation
    $dockerOk = Test-DockerIntegration
    $shortcutsOk = Test-Shortcuts
    $healthOk = Test-HealthEndpoint

    # Generate report
    Write-TestReport

    # Determine exit code
    if ($script:FailedCount -eq 0) {
        return $EXIT_SUCCESS
    }
    elseif (-not $windowsOk -or -not $installOk) {
        return $EXIT_CRITICAL_FAILED
    }
    else {
        return $EXIT_SOME_FAILED
    }
}

# =============================================================================
# Entry Point
# =============================================================================

try {
    $exitCode = Start-InstallationTest
    exit $exitCode
}
catch {
    Write-Host "[ERROR] Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit $EXIT_CRITICAL_FAILED
}
