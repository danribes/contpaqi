; =============================================================================
; ContPAQi AI Bridge Installer Script
; Inno Setup 6.x
;
; This script creates a Windows installer for the ContPAQi AI Bridge
; application, which includes:
; - Windows Bridge Service (C# ASP.NET Core)
; - Docker container for AI/ML processing
; - Configuration files and utilities
;
; Requirements:
; - Windows 10/11 (64-bit)
; - Docker Desktop installed
; - .NET 6.0 Runtime
;
; Author: ContPAQi AI Bridge Team
; Version: 1.0.0
; =============================================================================

#define MyAppName "ContPAQi AI Bridge"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "ContPAQi AI Bridge"
#define MyAppURL "https://github.com/contpaqi/ai-bridge"
#define MyAppExeName "ContpaqiBridge.exe"
#define MyAppId "{{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"

[Setup]
; Application identification
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation paths
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output settings
OutputDir=output
OutputBaseFilename=ContPAQi-AI-Bridge-Setup-{#MyAppVersion}
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

; Compression settings
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Windows compatibility
MinVersion=10.0
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Wizard settings
WizardStyle=modern
WizardSizePercent=120

; License and info
LicenseFile=assets\license.txt
InfoBeforeFile=assets\readme.txt

; Signing (uncomment when certificate is available)
; SignTool=signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a $f

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[CustomMessages]
; Language Selection Page Messages
english.SelectLanguage=Select Installation Language
spanish.SelectLanguage=Seleccione el Idioma de Instalación

english.AppLanguage=Application Language
spanish.AppLanguage=Idioma de la Aplicación

english.LanguageSelectionPrompt=Select the language for the application interface:
spanish.LanguageSelectionPrompt=Seleccione el idioma para la interfaz de la aplicación:

english.LanguageEnglish=English
spanish.LanguageEnglish=Inglés

english.LanguageSpanish=Spanish
spanish.LanguageSpanish=Español

english.LanguageNote=This setting can be changed later in the application settings.
spanish.LanguageNote=Esta configuración se puede cambiar más tarde en la configuración de la aplicación.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Dirs]
; Application directories
Name: "{app}\bin"; Permissions: users-modify
Name: "{app}\config"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
Name: "{app}\data"; Permissions: users-modify
Name: "{app}\docker"; Permissions: users-modify

[Files]
; Main application files
Source: "dist\windows-bridge\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs

; Docker image (saved tar)
Source: "dist\docker\contpaqi-mcp.tar"; DestDir: "{app}\docker"; Flags: ignoreversion

; Configuration files
Source: "dist\config\appsettings.json"; DestDir: "{app}\config"; Flags: ignoreversion onlyifdoesntexist
Source: "dist\config\appsettings.Production.json"; DestDir: "{app}\config"; Flags: ignoreversion onlyifdoesntexist

; Documentation
Source: "assets\readme.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\license.txt"; DestDir: "{app}"; Flags: ignoreversion

; Utilities
Source: "dist\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcuts
Name: "{group}\{#MyAppName}"; Filename: "{app}\bin\{#MyAppExeName}"
Name: "{group}\{#MyAppName} Configuration"; Filename: "{app}\config"
Name: "{group}\{#MyAppName} Logs"; Filename: "{app}\logs"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut (optional)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\bin\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Application registration (machine-wide)
Root: HKLM; Subkey: "SOFTWARE\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"
Root: HKLM; Subkey: "SOFTWARE\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "DataPath"; ValueData: "{app}\data"

; Language preference (user-specific, set by SaveLanguagePreference() in [Code] section)
; Uses HKCU to match PowerShell LocalizedMessages.psm1 registry path
Root: HKCU; Subkey: "SOFTWARE\ContPAQi AI Bridge"; ValueType: string; ValueName: "Language"; ValueData: "en"; Flags: createvalueifdoesntexist

; Environment variables (optional)
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: expandsz; ValueName: "CONTPAQI_BRIDGE_HOME"; ValueData: "{app}"; Flags: uninsdeletevalue

[Run]
; Post-installation tasks
Filename: "{app}\scripts\install-service.ps1"; Parameters: "-Install"; Flags: runhidden waituntilterminated; StatusMsg: "Installing Windows Service..."; Check: IsAdminInstallMode
Filename: "{app}\scripts\load-docker-image.ps1"; Flags: runhidden waituntilterminated; StatusMsg: "Loading Docker image..."; Check: DockerInstalled

; Launch application after install (optional)
Filename: "{app}\bin\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Pre-uninstallation tasks
Filename: "{app}\scripts\install-service.ps1"; Parameters: "-Uninstall"; Flags: runhidden waituntilterminated
Filename: "docker"; Parameters: "rmi contpaqi-mcp:latest"; Flags: runhidden waituntilterminated

[UninstallDelete]
; Clean up logs and temporary files
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\data\temp"

[Code]
// =============================================================================
// Pascal Script Functions
// =============================================================================

var
  DockerPage: TInputQueryWizardPage;
  DockerStatus: String;
  LanguagePage: TInputOptionWizardPage;
  SelectedLanguageCode: String;

// Check if Docker Desktop is installed
function DockerInstalled(): Boolean;
var
  DockerPath: String;
begin
  Result := False;

  // Check common Docker Desktop paths
  if FileExists(ExpandConstant('{commonpf}\Docker\Docker\Docker Desktop.exe')) then
    Result := True
  else if FileExists(ExpandConstant('{localappdata}\Docker\Docker Desktop.exe')) then
    Result := True
  else if RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\Docker Inc.\Docker Desktop') then
    Result := True;
end;

// Check if .NET Runtime is installed
function DotNetInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('dotnet', '--list-runtimes', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0);
end;

// Get Docker version
function GetDockerVersion(): String;
var
  TempFile: String;
  ResultCode: Integer;
  Version: AnsiString;
begin
  Result := 'Not installed';
  TempFile := ExpandConstant('{tmp}\docker_version.txt');

  if Exec('cmd', '/c docker --version > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if LoadStringFromFile(TempFile, Version) then
      Result := Trim(String(Version));
    DeleteFile(TempFile);
  end;
end;

// =============================================================================
// Language Selection Functions
// =============================================================================

// Get the selected language code ('en' or 'es')
function GetSelectedLanguage(): String;
begin
  if LanguagePage <> nil then
  begin
    // Index 0 = English, Index 1 = Spanish
    if LanguagePage.SelectedValueIndex = 1 then
      Result := 'es'
    else
      Result := 'en';
  end
  else
    Result := 'en'; // Default to English
end;

// Save language preference to registry (HKCU for user preference)
procedure SaveLanguagePreference();
var
  LanguageCode: String;
begin
  LanguageCode := GetSelectedLanguage();
  SelectedLanguageCode := LanguageCode;

  // Write to registry under user key (matches PowerShell LocalizedMessages.psm1)
  RegWriteStringValue(HKEY_CURRENT_USER,
    'SOFTWARE\ContPAQi AI Bridge',
    'Language',
    LanguageCode);
end;

// Load language preference from registry (HKCU for user preference)
function LoadLanguagePreference(): String;
var
  LanguageCode: String;
begin
  if RegQueryStringValue(HKEY_CURRENT_USER,
    'SOFTWARE\ContPAQi AI Bridge',
    'Language',
    LanguageCode) then
    Result := LanguageCode
  else
    Result := 'en'; // Default to English
end;

// Initialize wizard
procedure InitializeWizard();
begin
  // ==========================================================================
  // Create Language Selection Page
  // ==========================================================================
  LanguagePage := CreateInputOptionPage(wpWelcome,
    ExpandConstant('{cm:SelectLanguage}'),
    ExpandConstant('{cm:AppLanguage}'),
    ExpandConstant('{cm:LanguageSelectionPrompt}'),
    True,   // Exclusive (radio buttons)
    False); // Not required

  // Add language options
  LanguagePage.Add(ExpandConstant('{cm:LanguageEnglish}') + ' (English)');
  LanguagePage.Add(ExpandConstant('{cm:LanguageSpanish}') + ' (Español)');

  // Set default selection based on installer language or previous preference
  if ActiveLanguage = 'spanish' then
    LanguagePage.SelectedValueIndex := 1
  else
    LanguagePage.SelectedValueIndex := 0;

  // Initialize language code
  SelectedLanguageCode := 'en';

  // ==========================================================================
  // Create Docker Status Page
  // ==========================================================================
  DockerPage := CreateInputQueryPage(wpSelectDir,
    'Docker Desktop Status',
    'Checking Docker Desktop installation...',
    'The ContPAQi AI Bridge requires Docker Desktop to run the AI/ML container.');

  // Check Docker status
  if DockerInstalled() then
    DockerStatus := 'Docker Desktop: Installed (' + GetDockerVersion() + ')'
  else
    DockerStatus := 'Docker Desktop: NOT INSTALLED - Please install Docker Desktop first!';

  DockerPage.Add('Status:', False);
  DockerPage.Values[0] := DockerStatus;
end;

// Pre-installation checks
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  // On Docker page, warn if Docker is not installed
  if CurPageID = DockerPage.ID then
  begin
    if not DockerInstalled() then
    begin
      if MsgBox('Docker Desktop is not installed. The AI/ML features will not work without Docker.' + #13#10 + #13#10 +
                'Do you want to continue anyway?', mbConfirmation, MB_YESNO) = IDNO then
        Result := False;
    end;
  end;
end;

// Check for prerequisites before installation
function InitializeSetup(): Boolean;
begin
  Result := True;

  // Check Windows version
  if not IsWin64 then
  begin
    MsgBox('This application requires 64-bit Windows.', mbError, MB_OK);
    Result := False;
    Exit;
  end;

  // Check .NET Runtime
  if not DotNetInstalled() then
  begin
    if MsgBox('.NET 6.0 Runtime is required but not detected.' + #13#10 + #13#10 +
              'Would you like to open the download page?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://dotnet.microsoft.com/download/dotnet/6.0', '', '', SW_SHOW, ewNoWait, Result);
    end;

    if MsgBox('Continue installation without .NET Runtime?', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;

// Post-installation message
procedure CurStepChanged(CurStep: TSetupStep);
var
  LanguageMsg: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Save the selected language preference to registry
    SaveLanguagePreference();

    // Build language info message
    if GetSelectedLanguage() = 'es' then
      LanguageMsg := 'Idioma de la aplicación: Español'
    else
      LanguageMsg := 'Application language: English';

    // Show completion message
    if DockerInstalled() then
      MsgBox('Installation complete!' + #13#10 + #13#10 +
             'The ContPAQi AI Bridge service has been installed.' + #13#10 +
             'You can start it from the Start Menu or Services panel.' + #13#10 + #13#10 +
             LanguageMsg,
             mbInformation, MB_OK)
    else
      MsgBox('Installation complete!' + #13#10 + #13#10 +
             'WARNING: Docker Desktop was not detected.' + #13#10 +
             'Please install Docker Desktop to enable AI/ML features.' + #13#10 + #13#10 +
             LanguageMsg,
             mbInformation, MB_OK);
  end;
end;

// Cleanup on uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Ask about removing data
    if MsgBox('Do you want to remove all application data (logs, configuration)?',
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      DelTree(ExpandConstant('{app}\data'), True, True, True);
      DelTree(ExpandConstant('{app}\config'), True, True, True);
    end;
  end;
end;
