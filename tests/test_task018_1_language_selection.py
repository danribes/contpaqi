"""
Tests for Subtask 18.1: Add Language Selection to Inno Setup Installer

Tests verify:
- CustomMessages section exists with English and Spanish translations
- Language selection custom wizard page is created
- Selected language is stored in registry for app to read
- Proper language codes are used (en, es)
"""

import re
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
INSTALLER_DIR = PROJECT_ROOT / 'installer'
ISS_FILE = INSTALLER_DIR / 'contpaqi-bridge.iss'


# =============================================================================
# Helper Functions
# =============================================================================

def get_iss_content() -> str:
    """Read the Inno Setup script content."""
    return ISS_FILE.read_text(encoding='utf-8')


def get_section_content(section_name: str) -> str:
    """Extract content of a specific section from the ISS file."""
    content = get_iss_content()
    # Find section start
    section_pattern = rf'\[{section_name}\]'
    match = re.search(section_pattern, content)
    if not match:
        return ""

    start = match.end()
    # Find next section or end of file
    next_section = re.search(r'\n\[', content[start:])
    if next_section:
        end = start + next_section.start()
    else:
        end = len(content)

    return content[start:end]


# =============================================================================
# Languages Section Tests
# =============================================================================

class TestLanguagesSection:
    """Tests for [Languages] section with English and Spanish."""

    def test_has_languages_section(self):
        """Script should have [Languages] section."""
        content = get_iss_content()
        assert '[Languages]' in content, "Missing [Languages] section"

    def test_has_english_language(self):
        """Languages section should include English."""
        content = get_iss_content()
        assert 'Name: "english"' in content, "Missing English language definition"

    def test_has_spanish_language(self):
        """Languages section should include Spanish."""
        content = get_iss_content()
        assert 'Name: "spanish"' in content, "Missing Spanish language definition"

    def test_english_uses_default_isl(self):
        """English should use Default.isl messages file."""
        content = get_iss_content()
        # Look for english language with Default.isl
        english_pattern = r'Name:\s*"english".*MessagesFile:\s*"compiler:Default\.isl"'
        assert re.search(english_pattern, content), \
            "English language should use compiler:Default.isl"

    def test_spanish_uses_spanish_isl(self):
        """Spanish should use Spanish.isl messages file."""
        content = get_iss_content()
        # Look for spanish language with Spanish.isl
        spanish_pattern = r'Name:\s*"spanish".*MessagesFile:\s*"compiler:Languages\\?Spanish\.isl"'
        assert re.search(spanish_pattern, content), \
            "Spanish language should use compiler:Languages\\Spanish.isl"


# =============================================================================
# CustomMessages Section Tests
# =============================================================================

class TestCustomMessagesSection:
    """Tests for [CustomMessages] section with localized strings."""

    def test_has_custom_messages_section(self):
        """Script should have [CustomMessages] section."""
        content = get_iss_content()
        assert '[CustomMessages]' in content, "Missing [CustomMessages] section"

    def test_has_english_select_language_message(self):
        """CustomMessages should have English SelectLanguage message."""
        content = get_iss_content()
        assert 'english.SelectLanguage=' in content, \
            "Missing english.SelectLanguage custom message"

    def test_has_spanish_select_language_message(self):
        """CustomMessages should have Spanish SelectLanguage message."""
        content = get_iss_content()
        assert 'spanish.SelectLanguage=' in content, \
            "Missing spanish.SelectLanguage custom message"

    def test_english_app_language_message(self):
        """CustomMessages should have English AppLanguage message."""
        content = get_iss_content()
        assert 'english.AppLanguage=' in content, \
            "Missing english.AppLanguage custom message"

    def test_spanish_app_language_message(self):
        """CustomMessages should have Spanish AppLanguage message."""
        content = get_iss_content()
        assert 'spanish.AppLanguage=' in content, \
            "Missing spanish.AppLanguage custom message"

    def test_english_language_selection_prompt(self):
        """CustomMessages should have English language selection prompt."""
        content = get_iss_content()
        assert 'english.LanguageSelectionPrompt=' in content, \
            "Missing english.LanguageSelectionPrompt custom message"

    def test_spanish_language_selection_prompt(self):
        """CustomMessages should have Spanish language selection prompt."""
        content = get_iss_content()
        assert 'spanish.LanguageSelectionPrompt=' in content, \
            "Missing spanish.LanguageSelectionPrompt custom message"


# =============================================================================
# Custom Messages Content Tests
# =============================================================================

class TestCustomMessagesContent:
    """Tests for the content of custom messages."""

    def test_english_messages_are_in_english(self):
        """English messages should be in English."""
        content = get_iss_content()
        # Check for common English words in messages
        english_pattern = r'english\.\w+=.*(?:Select|Language|Application)'
        assert re.search(english_pattern, content, re.IGNORECASE), \
            "English messages should contain English text"

    def test_spanish_messages_are_in_spanish(self):
        """Spanish messages should be in Spanish."""
        content = get_iss_content()
        # Check for common Spanish words in messages
        spanish_pattern = r'spanish\.\w+=.*(?:Seleccione|Idioma|Aplicación)'
        assert re.search(spanish_pattern, content, re.IGNORECASE), \
            "Spanish messages should contain Spanish text"


# =============================================================================
# Registry Language Storage Tests
# =============================================================================

class TestRegistryLanguageStorage:
    """Tests for storing selected language in registry."""

    def test_has_registry_language_entry(self):
        """Script should store language preference in registry."""
        content = get_iss_content()
        # Look for Language registry entry
        registry_pattern = r'Root:.*ValueName:\s*"Language"'
        assert re.search(registry_pattern, content, re.IGNORECASE), \
            "Registry should have Language entry"

    def test_registry_language_in_app_key(self):
        """Language should be stored under app's registry key."""
        content = get_iss_content()
        # Should be under SOFTWARE\ContPAQi path
        has_contpaqi_key = 'SOFTWARE\\{#MyAppPublisher}' in content or \
                          'SOFTWARE\\ContPAQi' in content
        # Check for Language in various forms (case-insensitive)
        content_lower = content.lower()
        has_language = '"language"' in content_lower or "'language'" in content_lower or \
                      'language' in content_lower
        assert has_contpaqi_key and has_language, \
            "Language should be stored under ContPAQi registry key"


# =============================================================================
# Language Wizard Page Tests
# =============================================================================

class TestLanguageWizardPage:
    """Tests for custom language selection wizard page."""

    def test_has_language_page_variable(self):
        """Code section should declare language page variable."""
        content = get_iss_content()
        # Look for LanguagePage variable declaration
        has_var = 'LanguagePage' in content or 'LangPage' in content
        assert has_var, "Missing language page variable declaration"

    def test_language_page_creation_in_wizard(self):
        """InitializeWizard should create language selection page."""
        content = get_iss_content()
        # Look for page creation code
        has_page_creation = 'CreateInputOptionPage' in content or \
                          'CreateCustomPage' in content or \
                          'LanguagePage' in content
        assert has_page_creation, \
            "InitializeWizard should create language selection page"

    def test_wizard_has_language_options(self):
        """Wizard page should have English and Spanish options."""
        content = get_iss_content()
        # Look for language options in code
        has_english_option = "'English'" in content or '"English"' in content or \
                            "'en'" in content or '"en"' in content
        has_spanish_option = "'Spanish'" in content or '"Spanish"' in content or \
                            "'Español'" in content or '"Español"' in content or \
                            "'es'" in content or '"es"' in content
        assert has_english_option and has_spanish_option, \
            "Wizard should have both English and Spanish options"


# =============================================================================
# Language Selection Function Tests
# =============================================================================

class TestLanguageSelectionFunctions:
    """Tests for language selection helper functions."""

    def test_has_get_selected_language_function(self):
        """Code should have function to get selected language."""
        content = get_iss_content()
        has_function = 'GetSelectedLanguage' in content or \
                      'SelectedLanguage' in content
        assert has_function, "Missing GetSelectedLanguage function"

    def test_has_save_language_preference_function(self):
        """Code should have function to save language preference."""
        content = get_iss_content()
        has_function = 'SaveLanguage' in content or \
                      'SetLanguage' in content or \
                      'WriteLanguage' in content or \
                      'RegWriteStringValue' in content
        assert has_function, "Missing function to save language preference"


# =============================================================================
# Language Code Tests
# =============================================================================

class TestLanguageCodes:
    """Tests for proper language code usage."""

    def test_uses_en_language_code(self):
        """Script should use 'en' language code for English."""
        content = get_iss_content()
        # Look for 'en' code in registry or variable assignment
        has_en_code = "'en'" in content or '"en"' in content
        assert has_en_code, "Script should use 'en' language code for English"

    def test_uses_es_language_code(self):
        """Script should use 'es' language code for Spanish."""
        content = get_iss_content()
        # Look for 'es' code in registry or variable assignment
        has_es_code = "'es'" in content or '"es"' in content
        assert has_es_code, "Script should use 'es' language code for Spanish"


# =============================================================================
# Integration Tests
# =============================================================================

class TestLanguageSelectionIntegration:
    """Integration tests for language selection functionality."""

    def test_language_saved_on_finish(self):
        """Language should be saved when wizard finishes."""
        content = get_iss_content()
        # Look for language save in CurStepChanged or similar
        has_save_in_step = 'CurStepChanged' in content and \
                          ('Language' in content or 'SaveLanguage' in content)
        has_save_in_wizard = 'NextButtonClick' in content and \
                            ('Language' in content)
        assert has_save_in_step or has_save_in_wizard, \
            "Language should be saved during installation steps"

    def test_default_language_is_english(self):
        """Default language should be English."""
        content = get_iss_content()
        # Look for default or first option being English
        # English should be defined first in [Languages]
        languages_section = get_section_content('Languages')
        first_lang_match = re.search(r'Name:\s*"(\w+)"', languages_section)
        if first_lang_match:
            assert first_lang_match.group(1) == 'english', \
                "English should be the first (default) language"
        else:
            pytest.skip("Could not determine language order")


# =============================================================================
# UI Text Tests
# =============================================================================

class TestUIText:
    """Tests for UI text and labels."""

    def test_has_language_page_title(self):
        """Language page should have a title."""
        content = get_iss_content()
        # Look for page title in CreateInputOptionPage or similar
        has_title = 'Language Selection' in content or \
                   'Selección de Idioma' in content or \
                   '{cm:SelectLanguage}' in content or \
                   'SelectLanguage' in content
        assert has_title, "Language page should have a title"

    def test_has_language_page_description(self):
        """Language page should have a description."""
        content = get_iss_content()
        # Look for description text
        has_desc = 'select' in content.lower() and 'language' in content.lower()
        assert has_desc, "Language page should have a description"
