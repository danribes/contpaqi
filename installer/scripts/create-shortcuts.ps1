# =============================================================================
# ContPAQi AI Bridge - Shortcut Creation Script
# =============================================================================
#
# This PowerShell script creates and manages desktop and Start Menu shortcuts
# for the ContPAQi AI Bridge application. It uses the WScript.Shell COM object
# to create Windows shortcuts (.lnk files).
#
# Usage:
#   .\create-shortcuts.ps1 -Create                    # Create all shortcuts
#   .\create-shortcuts.ps1 -Create -Desktop           # Desktop only
#   .\create-shortcuts.ps1 -Create -StartMenu         # Start Menu only
#   .\create-shortcuts.ps1 -Remove                    # Remove all shortcuts
#   .\create-shortcuts.ps1 -Create -AllUsers          # For all users
#   .\create-shortcuts.ps1 -Create -CurrentUser       # For current user only
#
# Called by Inno Setup during installation or can be run manually.
#
# Author: ContPAQi AI Bridge Team
# Version: 1.0.0
# =============================================================================

#Requires -Version 5.1

param(
    [Parameter(HelpMessage="Create shortcuts")]
    [switch]$Create,

    [Parameter(HelpMessage="Remove shortcuts")]
    [switch]$Remove,

    [Parameter(HelpMessage="Create/remove desktop shortcut")]
    [switch]$Desktop,

    [Parameter(HelpMessage="Create/remove Start Menu shortcuts")]
    [switch]$StartMenu,

    [Parameter(HelpMessage="Apply to all users (requires admin)")]
    [switch]$AllUsers,

    [Parameter(HelpMessage="Apply to current user only")]
    [switch]$CurrentUser,

    [Parameter(HelpMessage="Installation path")]
    [string]$InstallPath,

    [Parameter(HelpMessage="Custom shortcut name")]
    [string]$ShortcutName,

    [Parameter(HelpMessage="Suppress output")]
    [switch]$Quiet
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"

# Application configuration
$AppName = "ContPAQi AI Bridge"
$AppExeName = "ContpaqiBridge.exe"
$AppDescription = "ContPAQi AI Bridge - Invoice processing with AI/ML capabilities"

# Default installation path
if (-not $InstallPath) {
    $ScriptDir = $PSScriptRoot
    if ($ScriptDir) {
        $InstallPath = Split-Path -Parent $ScriptDir
    } else {
        $InstallPath = "C:\Program Files\ContPAQi AI Bridge"
    }
}

# Shortcut name
if (-not $ShortcutName) {
    $ShortcutName = $AppName
}

# Executable path
$ExePath = Join-Path $InstallPath "bin\$AppExeName"
$WorkingDir = Join-Path $InstallPath "bin"
$IconPath = $ExePath  # Use executable icon

# Exit codes
$EXIT_SUCCESS = 0
$EXIT_CREATE_FAILED = 1
$EXIT_REMOVE_FAILED = 2
$EXIT_NOT_FOUND = 3

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

function Get-DesktopPath {
    <#
    .SYNOPSIS
        Gets the desktop path for the specified scope.
    #>
    param([bool]$ForAllUsers = $false)

    if ($ForAllUsers) {
        # Public Desktop (All Users)
        return [Environment]::GetFolderPath('CommonDesktopDirectory')
    } else {
        # Current User Desktop
        return [Environment]::GetFolderPath('Desktop')
    }
}

function Get-StartMenuPath {
    <#
    .SYNOPSIS
        Gets the Start Menu Programs path for the specified scope.
    #>
    param([bool]$ForAllUsers = $false)

    if ($ForAllUsers) {
        # All Users Start Menu
        return [Environment]::GetFolderPath('CommonPrograms')
    } else {
        # Current User Start Menu
        return [Environment]::GetFolderPath('Programs')
    }
}

# =============================================================================
# Shortcut Creation Functions
# =============================================================================

function New-Shortcut {
    <#
    .SYNOPSIS
        Creates a Windows shortcut (.lnk file) using WScript.Shell COM object.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ShortcutPath,

        [Parameter(Mandatory=$true)]
        [string]$TargetPath,

        [string]$WorkingDirectory,
        [string]$Description,
        [string]$IconLocation,
        [string]$Arguments,
        [int]$WindowStyle = 1  # 1=Normal, 3=Maximized, 7=Minimized
    )

    try {
        # Create WScript.Shell COM object
        $WshShell = New-Object -ComObject WScript.Shell

        # Create shortcut object
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)

        # Set properties
        $Shortcut.TargetPath = $TargetPath

        if ($WorkingDirectory) {
            $Shortcut.WorkingDirectory = $WorkingDirectory
        }

        if ($Description) {
            $Shortcut.Description = $Description
        }

        if ($IconLocation) {
            $Shortcut.IconLocation = "$IconLocation,0"
        }

        if ($Arguments) {
            $Shortcut.Arguments = $Arguments
        }

        $Shortcut.WindowStyle = $WindowStyle

        # Save the shortcut
        $Shortcut.Save()

        # Release COM object
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null

        return $true
    }
    catch {
        Write-Log "Failed to create shortcut: $($_.Exception.Message)" -Level Error
        return $false
    }
}

function New-DesktopShortcut {
    <#
    .SYNOPSIS
        Creates a desktop shortcut for the application.
    #>
    param([bool]$ForAllUsers = $false)

    $scope = if ($ForAllUsers) { "All Users" } else { "Current User" }
    Write-Log "Creating desktop shortcut ($scope)..."

    $desktopPath = Get-DesktopPath -ForAllUsers $ForAllUsers
    $shortcutPath = Join-Path $desktopPath "$ShortcutName.lnk"

    if (-not (Test-Path $ExePath)) {
        Write-Log "Executable not found: $ExePath" -Level Error
        return $false
    }

    $result = New-Shortcut -ShortcutPath $shortcutPath `
                           -TargetPath $ExePath `
                           -WorkingDirectory $WorkingDir `
                           -Description $AppDescription `
                           -IconLocation $IconPath

    if ($result) {
        Write-Log "Desktop shortcut created: $shortcutPath" -Level Success
    }

    return $result
}

function New-StartMenuShortcuts {
    <#
    .SYNOPSIS
        Creates Start Menu shortcuts for the application.
    #>
    param([bool]$ForAllUsers = $false)

    $scope = if ($ForAllUsers) { "All Users" } else { "Current User" }
    Write-Log "Creating Start Menu shortcuts ($scope)..."

    $startMenuPath = Get-StartMenuPath -ForAllUsers $ForAllUsers
    $appFolder = Join-Path $startMenuPath $AppName

    # Create application folder in Start Menu
    if (-not (Test-Path $appFolder)) {
        New-Item -ItemType Directory -Path $appFolder -Force | Out-Null
        Write-Log "Created Start Menu folder: $appFolder"
    }

    $success = $true

    # Main application shortcut
    $mainShortcut = Join-Path $appFolder "$ShortcutName.lnk"
    if (-not (Test-Path $ExePath)) {
        Write-Log "Executable not found: $ExePath" -Level Error
        return $false
    }

    $result = New-Shortcut -ShortcutPath $mainShortcut `
                           -TargetPath $ExePath `
                           -WorkingDirectory $WorkingDir `
                           -Description $AppDescription `
                           -IconLocation $IconPath

    if ($result) {
        Write-Log "Start Menu shortcut created: $mainShortcut" -Level Success
    } else {
        $success = $false
    }

    # Configuration folder shortcut
    $configPath = Join-Path $InstallPath "config"
    if (Test-Path $configPath) {
        $configShortcut = Join-Path $appFolder "$AppName Configuration.lnk"
        $result = New-Shortcut -ShortcutPath $configShortcut `
                               -TargetPath $configPath `
                               -Description "Open $AppName configuration folder"

        if ($result) {
            Write-Log "Configuration shortcut created" -Level Success
        }
    }

    # Logs folder shortcut
    $logsPath = Join-Path $InstallPath "logs"
    if (Test-Path $logsPath) {
        $logsShortcut = Join-Path $appFolder "$AppName Logs.lnk"
        $result = New-Shortcut -ShortcutPath $logsShortcut `
                               -TargetPath $logsPath `
                               -Description "Open $AppName logs folder"

        if ($result) {
            Write-Log "Logs shortcut created" -Level Success
        }
    }

    return $success
}

# =============================================================================
# Shortcut Removal Functions
# =============================================================================

function Remove-DesktopShortcut {
    <#
    .SYNOPSIS
        Removes the desktop shortcut.
    #>
    param([bool]$ForAllUsers = $false)

    $scope = if ($ForAllUsers) { "All Users" } else { "Current User" }
    Write-Log "Removing desktop shortcut ($scope)..."

    $desktopPath = Get-DesktopPath -ForAllUsers $ForAllUsers
    $shortcutPath = Join-Path $desktopPath "$ShortcutName.lnk"

    if (Test-Path $shortcutPath) {
        try {
            Remove-Item -Path $shortcutPath -Force
            Write-Log "Desktop shortcut removed: $shortcutPath" -Level Success
            return $true
        }
        catch {
            Write-Log "Failed to remove desktop shortcut: $($_.Exception.Message)" -Level Error
            return $false
        }
    } else {
        Write-Log "Desktop shortcut not found: $shortcutPath" -Level Warning
        return $true
    }
}

function Remove-StartMenuShortcuts {
    <#
    .SYNOPSIS
        Removes Start Menu shortcuts and folder.
    #>
    param([bool]$ForAllUsers = $false)

    $scope = if ($ForAllUsers) { "All Users" } else { "Current User" }
    Write-Log "Removing Start Menu shortcuts ($scope)..."

    $startMenuPath = Get-StartMenuPath -ForAllUsers $ForAllUsers
    $appFolder = Join-Path $startMenuPath $AppName

    if (Test-Path $appFolder) {
        try {
            Remove-Item -Path $appFolder -Recurse -Force
            Write-Log "Start Menu folder removed: $appFolder" -Level Success
            return $true
        }
        catch {
            Write-Log "Failed to remove Start Menu folder: $($_.Exception.Message)" -Level Error
            return $false
        }
    } else {
        Write-Log "Start Menu folder not found: $appFolder" -Level Warning
        return $true
    }
}

# =============================================================================
# Main Functions
# =============================================================================

function Invoke-CreateShortcuts {
    <#
    .SYNOPSIS
        Creates shortcuts based on parameters.
    #>

    Write-Log "ContPAQi AI Bridge - Shortcut Creation"
    Write-Log "======================================"
    Write-Log ""

    # Determine scope
    $forAllUsers = $AllUsers -and -not $CurrentUser
    $forCurrentUser = $CurrentUser -or -not $AllUsers

    # If neither Desktop nor StartMenu specified, do both
    $doDesktop = $Desktop -or (-not $Desktop -and -not $StartMenu)
    $doStartMenu = $StartMenu -or (-not $Desktop -and -not $StartMenu)

    $success = $true

    # Create for All Users if requested
    if ($forAllUsers) {
        if ($doDesktop) {
            if (-not (New-DesktopShortcut -ForAllUsers $true)) {
                $success = $false
            }
        }
        if ($doStartMenu) {
            if (-not (New-StartMenuShortcuts -ForAllUsers $true)) {
                $success = $false
            }
        }
    }

    # Create for Current User
    if ($forCurrentUser) {
        if ($doDesktop) {
            if (-not (New-DesktopShortcut -ForAllUsers $false)) {
                $success = $false
            }
        }
        if ($doStartMenu) {
            if (-not (New-StartMenuShortcuts -ForAllUsers $false)) {
                $success = $false
            }
        }
    }

    Write-Log ""
    if ($success) {
        Write-Log "Shortcut creation completed successfully!" -Level Success
        return $EXIT_SUCCESS
    } else {
        Write-Log "Some shortcuts could not be created" -Level Warning
        return $EXIT_CREATE_FAILED
    }
}

function Invoke-RemoveShortcuts {
    <#
    .SYNOPSIS
        Removes shortcuts based on parameters.
    #>

    Write-Log "ContPAQi AI Bridge - Shortcut Removal"
    Write-Log "====================================="
    Write-Log ""

    # Determine scope
    $forAllUsers = $AllUsers -and -not $CurrentUser
    $forCurrentUser = $CurrentUser -or -not $AllUsers

    # If neither Desktop nor StartMenu specified, do both
    $doDesktop = $Desktop -or (-not $Desktop -and -not $StartMenu)
    $doStartMenu = $StartMenu -or (-not $Desktop -and -not $StartMenu)

    $success = $true

    # Remove for All Users if requested
    if ($forAllUsers) {
        if ($doDesktop) {
            if (-not (Remove-DesktopShortcut -ForAllUsers $true)) {
                $success = $false
            }
        }
        if ($doStartMenu) {
            if (-not (Remove-StartMenuShortcuts -ForAllUsers $true)) {
                $success = $false
            }
        }
    }

    # Remove for Current User
    if ($forCurrentUser) {
        if ($doDesktop) {
            if (-not (Remove-DesktopShortcut -ForAllUsers $false)) {
                $success = $false
            }
        }
        if ($doStartMenu) {
            if (-not (Remove-StartMenuShortcuts -ForAllUsers $false)) {
                $success = $false
            }
        }
    }

    Write-Log ""
    if ($success) {
        Write-Log "Shortcut removal completed successfully!" -Level Success
        return $EXIT_SUCCESS
    } else {
        Write-Log "Some shortcuts could not be removed" -Level Warning
        return $EXIT_REMOVE_FAILED
    }
}

# =============================================================================
# Entry Point
# =============================================================================

if ($Create) {
    $exitCode = Invoke-CreateShortcuts
    exit $exitCode
} elseif ($Remove) {
    $exitCode = Invoke-RemoveShortcuts
    exit $exitCode
} else {
    Write-Log "No action specified. Use -Create or -Remove" -Level Warning
    Write-Log ""
    Write-Log "Examples:"
    Write-Log "  .\create-shortcuts.ps1 -Create                 # Create all shortcuts"
    Write-Log "  .\create-shortcuts.ps1 -Create -Desktop        # Desktop only"
    Write-Log "  .\create-shortcuts.ps1 -Create -StartMenu      # Start Menu only"
    Write-Log "  .\create-shortcuts.ps1 -Remove                 # Remove all shortcuts"
    Write-Log "  .\create-shortcuts.ps1 -Create -AllUsers       # For all users"
    exit $EXIT_SUCCESS
}
