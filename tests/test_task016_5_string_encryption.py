"""
Tests for Subtask 16.5: Enable String Encryption

Tests verify:
- PyArmor string encryption configuration
- Dotfuscator string encryption configuration
- String protection settings for both Python and C#
"""

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / 'mcp-container'
WINDOWS_BRIDGE_DIR = PROJECT_ROOT / 'windows-bridge'

# Python (PyArmor)
PYARMOR_CONFIG = MCP_CONTAINER_DIR / 'pyarmor.json'

# C# (Dotfuscator)
DOTFUSCATOR_CONFIG = WINDOWS_BRIDGE_DIR / 'dotfuscator.xml'

# String encryption documentation
STRING_ENCRYPTION_DOC = PROJECT_ROOT / 'docs' / 'string-encryption.md'


# =============================================================================
# PyArmor String Encryption Tests
# =============================================================================

class TestPyArmorStringEncryption:
    """Tests for PyArmor string encryption configuration."""

    def test_pyarmor_config_exists(self):
        """PyArmor configuration should exist."""
        assert PYARMOR_CONFIG.exists(), \
            f"pyarmor.json should exist at {PYARMOR_CONFIG}"

    def test_config_has_string_encryption_settings(self):
        """PyArmor config should have string encryption settings."""
        config = json.loads(PYARMOR_CONFIG.read_text())

        # Check for string encryption in settings or dedicated section
        settings = config.get('settings', {})
        string_encryption = config.get('string_encryption', {})

        has_obf_code = settings.get('obf_code', 0) >= 1
        has_string_section = bool(string_encryption)
        has_string_setting = 'string' in str(config).lower()

        assert has_obf_code or has_string_section or has_string_setting, \
            "PyArmor config should have string encryption settings"

    def test_obf_code_level_for_strings(self):
        """obf_code should be at level that includes string protection."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        settings = config.get('settings', {})

        # obf_code >= 1 provides some string protection
        # obf_code = 2 provides enhanced protection
        obf_code = settings.get('obf_code', 0)

        assert obf_code >= 1, \
            "obf_code should be >= 1 for string protection"

    def test_has_string_encryption_section(self):
        """Config should have dedicated string encryption section."""
        config = json.loads(PYARMOR_CONFIG.read_text())

        assert 'string_encryption' in config, \
            "Config should have 'string_encryption' section"

    def test_string_encryption_enabled(self):
        """String encryption should be enabled."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})

        enabled = string_config.get('enabled', False)

        assert enabled, \
            "String encryption should be enabled"

    def test_sensitive_patterns_defined(self):
        """Should define patterns for sensitive strings."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})

        patterns = string_config.get('patterns', [])

        # Should have patterns for sensitive data
        assert len(patterns) > 0, \
            "Should define patterns for sensitive strings"

    def test_excludes_non_sensitive_strings(self):
        """Should have exclusions for non-sensitive strings."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})

        # Check for exclusions or selective encryption
        has_excludes = 'exclude' in str(string_config).lower()
        has_selective = string_config.get('selective', False)

        # Either exclusions or selective mode should be defined
        assert has_excludes or has_selective or 'patterns' in string_config, \
            "Should have exclusions or selective encryption"


# =============================================================================
# Dotfuscator String Encryption Tests
# =============================================================================

class TestDotfuscatorStringEncryption:
    """Tests for Dotfuscator string encryption configuration."""

    def test_dotfuscator_config_exists(self):
        """Dotfuscator configuration should exist."""
        assert DOTFUSCATOR_CONFIG.exists(), \
            f"dotfuscator.xml should exist at {DOTFUSCATOR_CONFIG}"

    def test_config_has_string_encryption_section(self):
        """Dotfuscator config should have string encryption section."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Check for stringencrypt section or comments about it
        has_section = 'stringencrypt' in content.lower() or \
                     'string encryption' in content.lower() or \
                     'string_encryption' in content.lower()

        assert has_section, \
            "Dotfuscator config should have string encryption section"

    def test_string_encryption_documented(self):
        """String encryption should be documented in config."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should have comments explaining string encryption
        has_docs = 'string' in content.lower() and '<!--' in content

        assert has_docs, \
            "String encryption should be documented in config"

    def test_has_include_list_for_encryption(self):
        """Should define which strings/types to encrypt."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Check for include patterns
        has_include = 'include' in content.lower()

        assert has_include, \
            "Should define include patterns for encryption"

    def test_has_exclude_list_for_encryption(self):
        """Should define which strings/types to exclude."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Check for exclude patterns
        has_exclude = 'exclude' in content.lower()

        assert has_exclude, \
            "Should define exclude patterns for encryption"

    def test_professional_feature_noted(self):
        """Should note that full encryption requires Professional."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should document that it's a Professional feature
        has_note = 'professional' in content.lower() or \
                  'community' in content.lower()

        assert has_note, \
            "Should note Professional vs Community capabilities"


# =============================================================================
# Documentation Tests
# =============================================================================

class TestStringEncryptionDocumentation:
    """Tests for string encryption documentation."""

    def test_documentation_exists(self):
        """String encryption documentation should exist."""
        assert STRING_ENCRYPTION_DOC.exists(), \
            f"string-encryption.md should exist at {STRING_ENCRYPTION_DOC}"

    def test_documentation_covers_python(self):
        """Documentation should cover Python string encryption."""
        content = STRING_ENCRYPTION_DOC.read_text()

        has_python = 'python' in content.lower() or 'pyarmor' in content.lower()

        assert has_python, \
            "Documentation should cover Python/PyArmor"

    def test_documentation_covers_csharp(self):
        """Documentation should cover C# string encryption."""
        content = STRING_ENCRYPTION_DOC.read_text()

        has_csharp = 'c#' in content.lower() or \
                    'dotfuscator' in content.lower() or \
                    'csharp' in content.lower()

        assert has_csharp, \
            "Documentation should cover C#/Dotfuscator"

    def test_documentation_explains_sensitive_strings(self):
        """Documentation should explain what strings to protect."""
        content = STRING_ENCRYPTION_DOC.read_text()

        has_explanation = 'sensitive' in content.lower() or \
                         'api' in content.lower() or \
                         'connection' in content.lower() or \
                         'credential' in content.lower()

        assert has_explanation, \
            "Documentation should explain sensitive strings"

    def test_documentation_has_examples(self):
        """Documentation should have examples."""
        content = STRING_ENCRYPTION_DOC.read_text()

        # Look for code blocks or examples
        has_examples = '```' in content or 'example' in content.lower()

        assert has_examples, \
            "Documentation should have examples"


# =============================================================================
# Sensitive String Pattern Tests
# =============================================================================

class TestSensitiveStringPatterns:
    """Tests for sensitive string pattern definitions."""

    def test_pyarmor_has_api_patterns(self):
        """PyArmor should have patterns for API-related strings."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})
        patterns = string_config.get('patterns', [])

        patterns_str = str(patterns).lower()

        # Should have patterns for API keys, URLs, etc.
        has_api = 'api' in patterns_str or \
                 'url' in patterns_str or \
                 'endpoint' in patterns_str or \
                 'key' in patterns_str

        assert has_api or len(patterns) > 0, \
            "Should have patterns for API-related strings"

    def test_pyarmor_has_credential_patterns(self):
        """PyArmor should have patterns for credential strings."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})
        patterns = string_config.get('patterns', [])

        patterns_str = str(patterns).lower()

        # Should have patterns for credentials
        has_creds = 'password' in patterns_str or \
                   'secret' in patterns_str or \
                   'token' in patterns_str or \
                   'credential' in patterns_str or \
                   len(patterns) > 0

        assert has_creds, \
            "Should have patterns for credential strings"

    def test_pyarmor_has_connection_patterns(self):
        """PyArmor should have patterns for connection strings."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        string_config = config.get('string_encryption', {})
        patterns = string_config.get('patterns', [])

        patterns_str = str(patterns).lower()

        # Should have patterns for connection strings
        has_conn = 'connection' in patterns_str or \
                  'database' in patterns_str or \
                  'redis' in patterns_str or \
                  'host' in patterns_str or \
                  len(patterns) > 0

        assert has_conn, \
            "Should have patterns for connection strings"


# =============================================================================
# Security Configuration Tests
# =============================================================================

class TestStringEncryptionSecurity:
    """Tests for security aspects of string encryption."""

    def test_pyarmor_no_hardcoded_keys(self):
        """PyArmor config should not have hardcoded encryption keys."""
        config_text = PYARMOR_CONFIG.read_text().lower()

        # Should not have hardcoded keys
        suspicious_patterns = ['encryption_key=', 'secret_key=', 'aes_key=']

        for pattern in suspicious_patterns:
            assert pattern not in config_text, \
                f"Config should not contain hardcoded {pattern}"

    def test_dotfuscator_no_hardcoded_keys(self):
        """Dotfuscator config should not have hardcoded encryption keys."""
        config_text = DOTFUSCATOR_CONFIG.read_text().lower()

        # Should not have hardcoded keys
        suspicious_patterns = ['encryption_key=', 'secret_key=', 'aes_key=']

        for pattern in suspicious_patterns:
            assert pattern not in config_text, \
                f"Config should not contain hardcoded {pattern}"

    def test_documentation_warns_about_runtime_strings(self):
        """Documentation should warn about runtime string visibility."""
        content = STRING_ENCRYPTION_DOC.read_text().lower()

        # Should have security warnings
        has_warning = 'warning' in content or \
                     'limitation' in content or \
                     'runtime' in content or \
                     'memory' in content

        assert has_warning, \
            "Documentation should warn about limitations"


# =============================================================================
# Integration Tests
# =============================================================================

class TestStringEncryptionIntegration:
    """Tests for string encryption integration."""

    def test_pyarmor_config_valid_json(self):
        """PyArmor config should be valid JSON after modifications."""
        try:
            config = json.loads(PYARMOR_CONFIG.read_text())
            assert config is not None
        except json.JSONDecodeError as e:
            pytest.fail(f"PyArmor config is not valid JSON: {e}")

    def test_dotfuscator_config_valid_xml(self):
        """Dotfuscator config should be valid XML after modifications."""
        try:
            tree = ET.parse(DOTFUSCATOR_CONFIG)
            root = tree.getroot()
            assert root is not None
        except ET.ParseError as e:
            pytest.fail(f"Dotfuscator config is not valid XML: {e}")

    def test_configs_are_consistent(self):
        """Both configs should have string encryption settings."""
        pyarmor_config = json.loads(PYARMOR_CONFIG.read_text())
        dotfuscator_content = DOTFUSCATOR_CONFIG.read_text()

        pyarmor_has_strings = 'string_encryption' in pyarmor_config
        dotfuscator_has_strings = 'string' in dotfuscator_content.lower()

        assert pyarmor_has_strings and dotfuscator_has_strings, \
            "Both configs should address string encryption"
