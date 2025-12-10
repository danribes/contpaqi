# =============================================================================
# ContPAQi AI Bridge - Code Signing Script
# =============================================================================
#
# This PowerShell script signs Windows executables, DLLs, and installers
# using a code signing certificate. It uses Microsoft's signtool.exe
# from the Windows SDK.
#
# Usage:
#   .\code-sign.ps1 -FilePath "installer.exe" -CertPath "cert.pfx" -Password "secret"
#   .\code-sign.ps1 -Directory ".\bin" -CertPath "cert.pfx" -Password "secret"
#   .\code-sign.ps1 -FilePath "app.exe" -Verify
#
# Requirements:
#   - Windows SDK with signtool.exe
#   - Code signing certificate (PFX file)
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Path to file to sign")]
    [string]$FilePath,

    [Parameter(HelpMessage="Path to files (alias)")]
    [string]$Path,

    [Parameter(HelpMessage="Directory containing files to sign")]
    [string]$Directory,

    [Parameter(HelpMessage="Array of files to sign")]
    [string[]]$Files,

    [Parameter(HelpMessage="Path to PFX certificate file")]
    [string]$CertPath,

    [Parameter(HelpMessage="Certificate path (alias)")]
    [string]$PfxPath,

    [Parameter(HelpMessage="Certificate password")]
    [string]$Password,

    [Parameter(HelpMessage="Certificate password (alias)")]
    [string]$CertPassword,

    [Parameter(HelpMessage="Certificate password as SecureString")]
    [SecureString]$SecurePassword,

    [Parameter(HelpMessage="Timestamp server URL")]
    [string]$TimestampServer,

    [Parameter(HelpMessage="Timestamp server (alias)")]
    [string]$Timestamp,

    [Parameter(HelpMessage="Hash algorithm (sha256, sha384, sha512)")]
    [ValidateSet("sha256", "sha384", "sha512")]
    [string]$HashAlgorithm = "sha256",

    [Parameter(HelpMessage="Verify signature only, don't sign")]
    [switch]$Verify,

    [Parameter(HelpMessage="Sign all supported files in directory")]
    [switch]$Recursive,

    [Parameter(HelpMessage="Suppress output")]
    [switch]$Quiet,

    [Parameter(HelpMessage="Silent mode (alias)")]
    [switch]$Silent,

    [Parameter(HelpMessage="Custom signtool path")]
    [string]$SignToolPath
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"

# Supported file extensions for signing
$SupportedExtensions = @(".exe", ".dll", ".msi", ".msix", ".appx", ".cab", ".ocx", ".sys")

# Default timestamp servers (RFC3161)
$DefaultTimestampServers = @(
    "http://timestamp.digicert.com",
    "http://timestamp.sectigo.com",
    "http://timestamp.comodoca.com",
    "http://tsa.starfieldtech.com"
)

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_FILE_NOT_FOUND = 1
$EXIT_CERT_NOT_FOUND = 2
$EXIT_SIGNTOOL_NOT_FOUND = 3
$EXIT_SIGNING_FAILED = 4
$EXIT_VERIFICATION_FAILED = 5
$EXIT_INVALID_PARAMS = 6

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

    if (($Quiet -or $Silent) -and $Level -ne "Error") {
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

# =============================================================================
# SignTool Detection Functions
# =============================================================================

function Find-SignTool {
    <#
    .SYNOPSIS
        Finds the signtool.exe from Windows SDK.
    #>

    # Check custom path first
    if ($SignToolPath -and (Test-Path $SignToolPath)) {
        return $SignToolPath
    }

    # Common Windows SDK locations
    $sdkPaths = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x86\signtool.exe",
        "${env:ProgramFiles(x86)}\Windows Kits\8.1\bin\x64\signtool.exe",
        "${env:ProgramFiles(x86)}\Windows Kits\8.1\bin\x86\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles}\Microsoft SDKs\Windows\*\bin\signtool.exe"
    )

    foreach ($sdkPath in $sdkPaths) {
        $found = Get-ChildItem -Path $sdkPath -ErrorAction SilentlyContinue |
                 Sort-Object { [version]($_.Directory.Name -replace '[^\d.]', '') } -Descending |
                 Select-Object -First 1

        if ($found) {
            Write-Log "Found signtool at: $($found.FullName)"
            return $found.FullName
        }
    }

    # Try PATH
    $inPath = Get-Command signtool -ErrorAction SilentlyContinue
    if ($inPath) {
        return $inPath.Source
    }

    return $null
}

function Test-SignToolAvailable {
    <#
    .SYNOPSIS
        Tests if signtool is available.
    #>

    $signtool = Find-SignTool
    if (-not $signtool) {
        Write-Log "SignTool not found. Please install Windows SDK." -Level Error
        return $false
    }

    return $true
}

# =============================================================================
# Certificate Functions
# =============================================================================

function Test-CertificateExists {
    <#
    .SYNOPSIS
        Validates that the certificate file exists.
    #>
    param([string]$CertificatePath)

    if (-not $CertificatePath) {
        Write-Log "Certificate path not specified" -Level Error
        return $false
    }

    if (-not (Test-Path $CertificatePath)) {
        Write-Log "Certificate not found: $CertificatePath" -Level Error
        return $false
    }

    # Check if it's a PFX file
    if (-not $CertificatePath.EndsWith(".pfx", [StringComparison]::OrdinalIgnoreCase) -and
        -not $CertificatePath.EndsWith(".p12", [StringComparison]::OrdinalIgnoreCase)) {
        Write-Log "Certificate must be a PFX/PKCS12 file (.pfx or .p12)" -Level Warning
    }

    return $true
}

function Get-CertificatePassword {
    <#
    .SYNOPSIS
        Gets the certificate password from parameters.
    #>

    # Check for SecureString first
    if ($SecurePassword) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }

    # Check regular password parameters
    if ($Password) { return $Password }
    if ($CertPassword) { return $CertPassword }

    return $null
}

# =============================================================================
# Signing Functions
# =============================================================================

function Invoke-SignFile {
    <#
    .SYNOPSIS
        Signs a single file using signtool.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$File,

        [Parameter(Mandatory=$true)]
        [string]$SignToolExe,

        [Parameter(Mandatory=$true)]
        [string]$Certificate,

        [string]$CertificatePassword,

        [string]$TimestampUrl,

        [string]$Algorithm = "sha256"
    )

    if (-not (Test-Path $File)) {
        Write-Log "File not found: $File" -Level Error
        return $false
    }

    Write-Log "Signing: $File"

    # Build signtool arguments
    $arguments = @("sign")

    # Certificate file
    $arguments += "/f"
    $arguments += "`"$Certificate`""

    # Password if provided
    if ($CertificatePassword) {
        $arguments += "/p"
        $arguments += "`"$CertificatePassword`""
    }

    # Hash algorithm (file digest)
    $arguments += "/fd"
    $arguments += $Algorithm

    # Timestamp (RFC3161)
    if ($TimestampUrl) {
        $arguments += "/tr"
        $arguments += $TimestampUrl
        $arguments += "/td"
        $arguments += $Algorithm
    }

    # Description
    $arguments += "/d"
    $arguments += "`"ContPAQi AI Bridge`""

    # File to sign
    $arguments += "`"$File`""

    try {
        $argString = $arguments -join " "
        Write-Log "Running: signtool $argString" -Level Info

        $process = Start-Process -FilePath $SignToolExe `
                                 -ArgumentList $arguments `
                                 -NoNewWindow `
                                 -Wait `
                                 -PassThru `
                                 -RedirectStandardOutput "$env:TEMP\signtool_out.txt" `
                                 -RedirectStandardError "$env:TEMP\signtool_err.txt"

        $stdout = Get-Content "$env:TEMP\signtool_out.txt" -Raw -ErrorAction SilentlyContinue
        $stderr = Get-Content "$env:TEMP\signtool_err.txt" -Raw -ErrorAction SilentlyContinue

        if ($process.ExitCode -ne 0) {
            Write-Log "Signing failed with exit code: $($process.ExitCode)" -Level Error
            if ($stderr) { Write-Log $stderr -Level Error }
            return $false
        }

        Write-Log "Successfully signed: $File" -Level Success
        return $true
    }
    catch {
        Write-Log "Exception during signing: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function Invoke-VerifySignature {
    <#
    .SYNOPSIS
        Verifies the signature of a file.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$File,

        [string]$SignToolExe
    )

    if (-not (Test-Path $File)) {
        Write-Log "File not found: $File" -Level Error
        return $false
    }

    Write-Log "Verifying signature: $File"

    # Use Get-AuthenticodeSignature for verification
    try {
        $signature = Get-AuthenticodeSignature -FilePath $File

        if ($signature.Status -eq "Valid") {
            Write-Log "Signature is Valid" -Level Success
            Write-Log "  Subject: $($signature.SignerCertificate.Subject)"
            Write-Log "  Issuer: $($signature.SignerCertificate.Issuer)"
            Write-Log "  Timestamp: $($signature.TimeStamperCertificate.Subject)"
            return $true
        }
        elseif ($signature.Status -eq "NotSigned") {
            Write-Log "File is not signed" -Level Warning
            return $false
        }
        else {
            Write-Log "Signature status: $($signature.Status)" -Level Warning
            Write-Log "  Status Message: $($signature.StatusMessage)"
            return $false
        }
    }
    catch {
        Write-Log "Error verifying signature: $($_.Exception.Message)" -Level Error
        return $false
    }
}

# =============================================================================
# Batch Signing Functions
# =============================================================================

function Get-FilesToSign {
    <#
    .SYNOPSIS
        Gets all files that should be signed.
    #>
    param(
        [string]$DirectoryPath,
        [bool]$RecurseSubdirs = $false
    )

    $filesToSign = @()

    if (-not (Test-Path $DirectoryPath)) {
        Write-Log "Directory not found: $DirectoryPath" -Level Error
        return $filesToSign
    }

    $searchOption = if ($RecurseSubdirs) { "AllDirectories" } else { "TopDirectoryOnly" }

    foreach ($ext in $SupportedExtensions) {
        $pattern = "*$ext"
        $files = Get-ChildItem -Path $DirectoryPath -Filter $pattern -File -Recurse:$RecurseSubdirs -ErrorAction SilentlyContinue
        $filesToSign += $files
    }

    Write-Log "Found $($filesToSign.Count) files to sign in $DirectoryPath"
    return $filesToSign
}

function Invoke-BatchSign {
    <#
    .SYNOPSIS
        Signs multiple files.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [array]$FilesToSign,

        [Parameter(Mandatory=$true)]
        [string]$SignToolExe,

        [Parameter(Mandatory=$true)]
        [string]$Certificate,

        [string]$CertificatePassword,

        [string]$TimestampUrl,

        [string]$Algorithm = "sha256"
    )

    $successCount = 0
    $failCount = 0
    $totalFiles = $FilesToSign.Count

    Write-Log "Signing $totalFiles files..."

    foreach ($file in $FilesToSign) {
        $filePath = if ($file -is [System.IO.FileInfo]) { $file.FullName } else { $file }

        $result = Invoke-SignFile -File $filePath `
                                  -SignToolExe $SignToolExe `
                                  -Certificate $Certificate `
                                  -CertificatePassword $CertificatePassword `
                                  -TimestampUrl $TimestampUrl `
                                  -Algorithm $Algorithm

        if ($result) {
            $successCount++
        } else {
            $failCount++
        }
    }

    Write-Log ""
    Write-Log "Signing complete: $successCount succeeded, $failCount failed"

    return ($failCount -eq 0)
}

# =============================================================================
# Main Functions
# =============================================================================

function Start-CodeSigning {
    <#
    .SYNOPSIS
        Main entry point for code signing.
    #>

    Write-Log "ContPAQi AI Bridge - Code Signing"
    Write-Log "================================="
    Write-Log ""

    # Resolve parameter aliases
    $effectiveFilePath = if ($FilePath) { $FilePath } elseif ($Path) { $Path } else { $null }
    $effectiveCertPath = if ($CertPath) { $CertPath } elseif ($PfxPath) { $PfxPath } else { $null }
    $effectiveTimestamp = if ($TimestampServer) { $TimestampServer } elseif ($Timestamp) { $Timestamp } else { $DefaultTimestampServers[0] }
    $effectivePassword = Get-CertificatePassword

    # Find signtool
    $signtool = Find-SignTool
    if (-not $signtool) {
        Write-Log "SignTool not found. Install Windows SDK." -Level Error
        return $EXIT_SIGNTOOL_NOT_FOUND
    }

    # Verify-only mode
    if ($Verify) {
        if (-not $effectiveFilePath) {
            Write-Log "No file specified for verification" -Level Error
            return $EXIT_INVALID_PARAMS
        }

        $result = Invoke-VerifySignature -File $effectiveFilePath -SignToolExe $signtool
        return $(if ($result) { $EXIT_SUCCESS } else { $EXIT_VERIFICATION_FAILED })
    }

    # Validate certificate
    if (-not (Test-CertificateExists -CertificatePath $effectiveCertPath)) {
        return $EXIT_CERT_NOT_FOUND
    }

    # Determine files to sign
    $filesToSign = @()

    if ($Directory) {
        $filesToSign = Get-FilesToSign -DirectoryPath $Directory -RecurseSubdirs $Recursive
    }
    elseif ($Files -and $Files.Count -gt 0) {
        $filesToSign = $Files
    }
    elseif ($effectiveFilePath) {
        $filesToSign = @($effectiveFilePath)
    }
    else {
        Write-Log "No files specified for signing" -Level Error
        Write-Log "Use -FilePath, -Directory, or -Files parameter"
        return $EXIT_INVALID_PARAMS
    }

    if ($filesToSign.Count -eq 0) {
        Write-Log "No supported files found to sign" -Level Warning
        return $EXIT_FILE_NOT_FOUND
    }

    # Perform signing
    $result = Invoke-BatchSign -FilesToSign $filesToSign `
                               -SignToolExe $signtool `
                               -Certificate $effectiveCertPath `
                               -CertificatePassword $effectivePassword `
                               -TimestampUrl $effectiveTimestamp `
                               -Algorithm $HashAlgorithm

    if ($result) {
        Write-Log ""
        Write-Log "All files signed successfully!" -Level Success
        return $EXIT_SUCCESS
    } else {
        Write-Log ""
        Write-Log "Some files failed to sign" -Level Error
        return $EXIT_SIGNING_FAILED
    }
}

# =============================================================================
# Entry Point
# =============================================================================

try {
    $exitCode = Start-CodeSigning
    exit $exitCode
}
catch {
    Write-Log "Unexpected error: $($_.Exception.Message)" -Level Error
    Write-Log $_.ScriptStackTrace -Level Error
    exit $EXIT_SIGNING_FAILED
}
