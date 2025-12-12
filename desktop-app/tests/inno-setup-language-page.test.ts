/**
 * @file inno-setup-language-page.test.ts
 * @description Tests for Inno Setup Language Selection Wizard Page (Subtask 18.9)
 *
 * These tests validate the Inno Setup installer script to ensure:
 * - Language selection page is properly configured
 * - Registry path matches PowerShell localization module (HKCU)
 * - Both English and Spanish options are available
 * - Language preference is saved correctly
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Inno Setup Language Selection Page (Subtask 18.9)', () => {
  let issContent: string;
  let psm1Content: string;

  beforeAll(() => {
    // Load the Inno Setup script
    const issPath = path.join(__dirname, '../..', 'installer/contpaqi-bridge.iss');
    issContent = fs.readFileSync(issPath, 'utf-8');

    // Load the PowerShell localization module for comparison
    const psm1Path = path.join(__dirname, '../..', 'installer/scripts/LocalizedMessages.psm1');
    psm1Content = fs.readFileSync(psm1Path, 'utf-8');
  });

  describe('Language Selection Page Structure', () => {
    it('should declare LanguagePage variable', () => {
      expect(issContent).toMatch(/LanguagePage\s*:\s*TInputOptionWizardPage/);
    });

    it('should declare SelectedLanguageCode variable', () => {
      expect(issContent).toMatch(/SelectedLanguageCode\s*:\s*String/);
    });

    it('should create language page after wpWelcome', () => {
      expect(issContent).toMatch(/CreateInputOptionPage\s*\(\s*wpWelcome/);
    });

    it('should have exclusive radio buttons (True parameter)', () => {
      // The 5th parameter (True) indicates exclusive selection (radio buttons)
      // Match multiline format with newlines between parameters
      expect(issContent).toMatch(/CreateInputOptionPage[\s\S]*True,[\s\S]*False\)/);
    });

    it('should add English option', () => {
      expect(issContent).toMatch(/LanguagePage\.Add\(.*English/);
    });

    it('should add Spanish/Español option', () => {
      expect(issContent).toMatch(/LanguagePage\.Add\(.*Español/);
    });

    it('should set default selection index to 0 (English)', () => {
      expect(issContent).toMatch(/LanguagePage\.SelectedValueIndex\s*:=\s*0/);
    });
  });

  describe('Language Functions', () => {
    it('should have GetSelectedLanguage function', () => {
      expect(issContent).toMatch(/function\s+GetSelectedLanguage\s*\(\s*\)\s*:\s*String/);
    });

    it('should return "en" for English (index 0)', () => {
      expect(issContent).toMatch(/Result\s*:=\s*'en'/);
    });

    it('should return "es" for Spanish (index 1)', () => {
      expect(issContent).toMatch(/Result\s*:=\s*'es'/);
    });

    it('should have SaveLanguagePreference procedure', () => {
      expect(issContent).toMatch(/procedure\s+SaveLanguagePreference/);
    });

    it('should have LoadLanguagePreference function', () => {
      expect(issContent).toMatch(/function\s+LoadLanguagePreference\s*\(\s*\)\s*:\s*String/);
    });

    it('should call SaveLanguagePreference in post-install', () => {
      expect(issContent).toMatch(/ssPostInstall[\s\S]*SaveLanguagePreference/);
    });
  });

  describe('Registry Configuration - HKCU Path', () => {
    it('should write to HKCU (user registry)', () => {
      // The SaveLanguagePreference should use HKEY_CURRENT_USER
      expect(issContent).toMatch(/HKEY_CURRENT_USER/);
    });

    it('should NOT write language to HKLM (machine registry)', () => {
      // Language preference should not go to HKLM
      const hklmLanguagePattern = /RegWriteStringValue\s*\(\s*HKEY_LOCAL_MACHINE[\s\S]*?Language/;
      expect(issContent).not.toMatch(hklmLanguagePattern);
    });

    it('should use registry path "SOFTWARE\\ContPAQi AI Bridge"', () => {
      // Match the path used by PowerShell module (single backslash in ISS file)
      expect(issContent).toMatch(/SOFTWARE\\ContPAQi AI Bridge['"]/);
    });

    it('should use "Language" as registry value name', () => {
      expect(issContent).toMatch(/'Language'/);
    });
  });

  describe('Registry Path Consistency with PowerShell Module', () => {
    it('should match PowerShell module registry path', () => {
      // Extract registry path from PowerShell module
      const psm1PathMatch = psm1Content.match(/\$script:RegistryPath\s*=\s*['"]([^'"]+)['"]/);
      expect(psm1PathMatch).not.toBeNull();

      const psm1RegistryPath = psm1PathMatch![1];
      // PowerShell uses HKCU:\SOFTWARE\ContPAQi AI Bridge
      expect(psm1RegistryPath).toContain('HKCU:');
      expect(psm1RegistryPath).toContain('ContPAQi AI Bridge');

      // Verify Inno Setup uses the same base path (single backslash in ISS file)
      expect(issContent).toMatch(/SOFTWARE\\ContPAQi AI Bridge/);
    });

    it('should match PowerShell module registry value name', () => {
      // Extract value name from PowerShell module
      const psm1ValueMatch = psm1Content.match(/\$script:RegistryValueName\s*=\s*['"]([^'"]+)['"]/);
      expect(psm1ValueMatch).not.toBeNull();

      const psm1ValueName = psm1ValueMatch![1];
      expect(psm1ValueName).toBe('Language');

      // Verify Inno Setup uses the same value name
      expect(issContent).toMatch(/'Language'/);
    });
  });

  describe('Custom Messages for Language Page', () => {
    it('should have SelectLanguage custom message', () => {
      expect(issContent).toMatch(/english\.SelectLanguage\s*=/);
      expect(issContent).toMatch(/spanish\.SelectLanguage\s*=/);
    });

    it('should have AppLanguage custom message', () => {
      expect(issContent).toMatch(/english\.AppLanguage\s*=/);
      expect(issContent).toMatch(/spanish\.AppLanguage\s*=/);
    });

    it('should have LanguageSelectionPrompt custom message', () => {
      expect(issContent).toMatch(/english\.LanguageSelectionPrompt\s*=/);
      expect(issContent).toMatch(/spanish\.LanguageSelectionPrompt\s*=/);
    });

    it('should have LanguageEnglish custom message', () => {
      expect(issContent).toMatch(/english\.LanguageEnglish\s*=/);
      expect(issContent).toMatch(/spanish\.LanguageEnglish\s*=/);
    });

    it('should have LanguageSpanish custom message', () => {
      expect(issContent).toMatch(/english\.LanguageSpanish\s*=/);
      expect(issContent).toMatch(/spanish\.LanguageSpanish\s*=/);
    });

    it('should have LanguageNote custom message', () => {
      expect(issContent).toMatch(/english\.LanguageNote\s*=/);
      expect(issContent).toMatch(/spanish\.LanguageNote\s*=/);
    });
  });

  describe('Language Detection Logic', () => {
    it('should detect installer language (ActiveLanguage)', () => {
      expect(issContent).toMatch(/ActiveLanguage\s*=\s*'spanish'/);
    });

    it('should set Spanish as default when installer is in Spanish', () => {
      // When ActiveLanguage = 'spanish', SelectedValueIndex should be 1
      expect(issContent).toMatch(/if\s+ActiveLanguage\s*=\s*'spanish'[\s\S]*?SelectedValueIndex\s*:=\s*1/);
    });

    it('should default to English (index 0) otherwise', () => {
      expect(issContent).toMatch(/else\s*\n?\s*LanguagePage\.SelectedValueIndex\s*:=\s*0/);
    });
  });

  describe('Supported Languages', () => {
    it('should support English installer language', () => {
      expect(issContent).toMatch(/Name:\s*"english"/);
    });

    it('should support Spanish installer language', () => {
      expect(issContent).toMatch(/Name:\s*"spanish"/);
    });

    it('should use Default.isl for English', () => {
      expect(issContent).toMatch(/Name:\s*"english".*MessagesFile:\s*"compiler:Default\.isl"/);
    });

    it('should use Spanish.isl for Spanish', () => {
      // Backslash in ISS file is single, regex needs to match single backslash
      expect(issContent).toMatch(/Name:\s*"spanish".*MessagesFile:\s*"compiler:Languages\\Spanish\.isl"/);
    });
  });

  describe('Language Page Display Text', () => {
    it('should have bilingual title text', () => {
      // Check the custom messages have proper translations
      const englishTitle = issContent.match(/english\.SelectLanguage\s*=\s*(.+)/);
      const spanishTitle = issContent.match(/spanish\.SelectLanguage\s*=\s*(.+)/);

      expect(englishTitle).not.toBeNull();
      expect(spanishTitle).not.toBeNull();

      // English should contain "Language"
      expect(englishTitle![1].toLowerCase()).toContain('language');
      // Spanish should contain "Idioma"
      expect(spanishTitle![1].toLowerCase()).toContain('idioma');
    });

    it('should show both language names with native text', () => {
      // The options should show the native language name in parentheses
      expect(issContent).toMatch(/\(English\)/);
      expect(issContent).toMatch(/\(Español\)/);
    });
  });

  describe('Post-Installation Language Message', () => {
    it('should display language selection in completion message', () => {
      // The installer should confirm the selected language
      expect(issContent).toMatch(/GetSelectedLanguage\(\)\s*=\s*'es'/);
      expect(issContent).toMatch(/LanguageMsg/);
    });

    it('should have English confirmation message', () => {
      expect(issContent).toMatch(/Application language:\s*English/);
    });

    it('should have Spanish confirmation message', () => {
      expect(issContent).toMatch(/Idioma de la aplicación:\s*Español/);
    });
  });

  describe('Integration Requirements', () => {
    it('should initialize SelectedLanguageCode in InitializeWizard', () => {
      expect(issContent).toMatch(/SelectedLanguageCode\s*:=\s*'en'/);
    });

    it('should store language code in procedure variable', () => {
      // SaveLanguagePreference should set SelectedLanguageCode
      expect(issContent).toMatch(/SelectedLanguageCode\s*:=\s*LanguageCode/);
    });
  });
});
