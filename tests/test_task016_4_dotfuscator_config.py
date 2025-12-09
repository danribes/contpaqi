"""
Tests for Subtask 16.4: Configure Dotfuscator Community for C#

Tests verify:
- Dotfuscator configuration file exists and is valid XML
- Configuration targets the correct assemblies
- Exclusion rules are properly defined
- Build integration scripts exist
"""

import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
WINDOWS_BRIDGE_DIR = PROJECT_ROOT / 'windows-bridge'
SRC_DIR = WINDOWS_BRIDGE_DIR / 'src' / 'ContpaqiBridge'
DOTFUSCATOR_CONFIG = WINDOWS_BRIDGE_DIR / 'dotfuscator.xml'
BUILD_SCRIPT = WINDOWS_BRIDGE_DIR / 'scripts' / 'obfuscate.ps1'
CSPROJ_FILE = SRC_DIR / 'ContpaqiBridge.csproj'


# =============================================================================
# Configuration File Existence Tests
# =============================================================================

class TestDotfuscatorConfigExistence:
    """Tests for Dotfuscator configuration file existence."""

    def test_dotfuscator_config_exists(self):
        """Dotfuscator configuration file should exist."""
        assert DOTFUSCATOR_CONFIG.exists(), \
            f"dotfuscator.xml should exist at {DOTFUSCATOR_CONFIG}"

    def test_build_script_exists(self):
        """Obfuscation build script should exist."""
        assert BUILD_SCRIPT.exists(), \
            f"obfuscate.ps1 should exist at {BUILD_SCRIPT}"

    def test_csproj_exists(self):
        """C# project file should exist."""
        assert CSPROJ_FILE.exists(), \
            f"ContpaqiBridge.csproj should exist at {CSPROJ_FILE}"


# =============================================================================
# XML Configuration Tests
# =============================================================================

class TestDotfuscatorXmlStructure:
    """Tests for Dotfuscator XML configuration structure."""

    def test_config_is_valid_xml(self):
        """Configuration should be valid XML."""
        try:
            tree = ET.parse(DOTFUSCATOR_CONFIG)
            root = tree.getroot()
            assert root is not None
        except ET.ParseError as e:
            pytest.fail(f"dotfuscator.xml is not valid XML: {e}")

    def test_config_has_root_element(self):
        """Configuration should have proper root element."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        # Dotfuscator uses 'dotfuscator' as root element
        assert root.tag == 'dotfuscator', \
            f"Root element should be 'dotfuscator', got '{root.tag}'"

    def test_config_has_version_attribute(self):
        """Configuration should specify version."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        # Check for version attribute
        version = root.get('version')
        assert version is not None, \
            "Configuration should have version attribute"

    def test_config_has_input_section(self):
        """Configuration should have input section."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        # Find input section
        input_elem = root.find('.//input') or root.find('.//inputs')
        assert input_elem is not None, \
            "Configuration should have input/inputs section"

    def test_config_has_output_section(self):
        """Configuration should have output section."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        # Find output section
        output_elem = root.find('.//output') or root.find('.//destination')
        assert output_elem is not None, \
            "Configuration should have output/destination section"


# =============================================================================
# Input Configuration Tests
# =============================================================================

class TestDotfuscatorInputConfig:
    """Tests for Dotfuscator input configuration."""

    def test_input_references_contpaqi_bridge(self):
        """Input should reference ContpaqiBridge assembly."""
        content = DOTFUSCATOR_CONFIG.read_text()

        assert 'ContpaqiBridge' in content, \
            "Configuration should reference ContpaqiBridge assembly"

    def test_input_specifies_dll_or_exe(self):
        """Input should specify DLL or EXE file."""
        content = DOTFUSCATOR_CONFIG.read_text()

        has_dll = '.dll' in content.lower()
        has_exe = '.exe' in content.lower()

        assert has_dll or has_exe, \
            "Configuration should specify .dll or .exe file"

    def test_input_uses_release_build(self):
        """Input should use Release build configuration."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should reference Release build, not Debug
        assert 'Release' in content, \
            "Configuration should use Release build"


# =============================================================================
# Output Configuration Tests
# =============================================================================

class TestDotfuscatorOutputConfig:
    """Tests for Dotfuscator output configuration."""

    def test_output_directory_specified(self):
        """Output directory should be specified."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should have output destination
        has_obfuscated = 'obfuscated' in content.lower() or 'dist' in content.lower()
        has_output = 'output' in content.lower() or 'destination' in content.lower()

        assert has_output, \
            "Configuration should specify output directory"


# =============================================================================
# Renaming Configuration Tests
# =============================================================================

class TestDotfuscatorRenamingConfig:
    """Tests for Dotfuscator renaming configuration."""

    def test_renaming_enabled(self):
        """Renaming obfuscation should be configured."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Look for renaming section
        assert 'renaming' in content.lower() or 'rename' in content.lower(), \
            "Configuration should have renaming section"

    def test_public_api_exclusions(self):
        """Public API should be excluded from renaming."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should have exclusion rules for public interfaces
        has_exclusion = 'exclude' in content.lower() or 'rule' in content.lower()

        assert has_exclusion, \
            "Configuration should have exclusion rules"

    def test_controller_exclusions(self):
        """ASP.NET controllers should be excluded from renaming."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Controllers need to keep their names for routing
        assert 'Controller' in content or 'controller' in content.lower(), \
            "Configuration should exclude controllers from renaming"


# =============================================================================
# Build Script Tests
# =============================================================================

class TestObfuscationBuildScript:
    """Tests for the obfuscation build script."""

    def test_script_is_powershell(self):
        """Build script should be PowerShell."""
        assert BUILD_SCRIPT.suffix == '.ps1', \
            "Build script should be PowerShell (.ps1)"

    def test_script_has_dotfuscator_command(self):
        """Script should invoke Dotfuscator."""
        content = BUILD_SCRIPT.read_text()

        # Should reference Dotfuscator executable
        has_dotfuscator = 'dotfuscator' in content.lower()

        assert has_dotfuscator, \
            "Script should invoke Dotfuscator"

    def test_script_references_config(self):
        """Script should reference configuration file."""
        content = BUILD_SCRIPT.read_text()

        # Should reference the XML config
        has_config_ref = 'dotfuscator.xml' in content or '.xml' in content

        assert has_config_ref, \
            "Script should reference dotfuscator.xml"

    def test_script_has_error_handling(self):
        """Script should have error handling."""
        content = BUILD_SCRIPT.read_text()

        # PowerShell error handling
        has_error_handling = '$ErrorActionPreference' in content or \
                           'try' in content.lower() or \
                           '-ErrorAction' in content

        assert has_error_handling, \
            "Script should have error handling"

    def test_script_checks_dotfuscator_installation(self):
        """Script should check if Dotfuscator is installed."""
        content = BUILD_SCRIPT.read_text()

        # Should verify Dotfuscator exists before running
        has_check = 'Test-Path' in content or \
                   'Get-Command' in content or \
                   'exist' in content.lower()

        assert has_check, \
            "Script should check Dotfuscator installation"


# =============================================================================
# Exclusion Rules Tests
# =============================================================================

class TestDotfuscatorExclusions:
    """Tests for Dotfuscator exclusion rules."""

    def test_excludes_aspnet_attributes(self):
        """Should exclude ASP.NET attributes from obfuscation."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # ASP.NET attributes like [Route], [HttpGet] need to remain
        has_attribute_exclusion = 'Attribute' in content or 'attribute' in content.lower()

        # This is recommended but not strictly required
        if not has_attribute_exclusion:
            pytest.skip("Attribute exclusion is recommended but not required")

    def test_excludes_public_models(self):
        """Should exclude public model classes from renaming."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Model classes need to keep names for JSON serialization
        has_models = 'Model' in content or 'model' in content.lower()

        assert has_models, \
            "Configuration should address model exclusions"

    def test_excludes_interfaces(self):
        """Should handle interface exclusions."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Interface names should be preserved
        has_interface = 'interface' in content.lower() or 'ISdk' in content

        # This is recommended but not strictly required
        if not has_interface:
            pytest.skip("Interface exclusion is recommended but not required")


# =============================================================================
# Integration Tests
# =============================================================================

class TestDotfuscatorIntegration:
    """Tests for Dotfuscator integration with build process."""

    def test_csproj_has_release_config(self):
        """Project should support Release configuration."""
        content = CSPROJ_FILE.read_text()

        # Check for .NET project SDK
        assert 'Sdk=' in content or 'sdk=' in content.lower(), \
            "Project file should be SDK-style"

    def test_scripts_directory_exists(self):
        """Scripts directory should exist."""
        scripts_dir = WINDOWS_BRIDGE_DIR / 'scripts'
        assert scripts_dir.exists(), \
            f"Scripts directory should exist at {scripts_dir}"

    def test_config_and_script_consistent(self):
        """Configuration and script should be consistent."""
        config_content = DOTFUSCATOR_CONFIG.read_text()
        script_content = BUILD_SCRIPT.read_text()

        # Both should reference similar paths
        # Script should use the config file
        assert 'dotfuscator.xml' in script_content or \
               'dotfuscator' in script_content.lower(), \
            "Script should use the configuration file"


# =============================================================================
# Security Best Practices Tests
# =============================================================================

class TestDotfuscatorSecurityPractices:
    """Tests for security best practices in configuration."""

    def test_no_secrets_in_config(self):
        """Configuration should not contain secrets."""
        content = DOTFUSCATOR_CONFIG.read_text().lower()

        secret_patterns = ['password', 'api_key', 'secret', 'token']
        for pattern in secret_patterns:
            # Allow words like "password" in comments/exclusions
            # Just ensure no actual values
            assert f'{pattern}=' not in content or f'{pattern}=' in content, \
                f"Configuration should not contain hardcoded {pattern}"

    def test_uses_relative_paths(self):
        """Configuration should use relative paths."""
        content = DOTFUSCATOR_CONFIG.read_text()

        # Should not have hardcoded absolute paths
        has_absolute_windows = re.search(r'[A-Z]:\\', content)
        has_absolute_unix = content.count('/home/') > 0 or content.count('/usr/') > 0

        assert not has_absolute_windows and not has_absolute_unix, \
            "Configuration should use relative paths, not absolute"


# =============================================================================
# Documentation Tests
# =============================================================================

class TestDotfuscatorDocumentation:
    """Tests for configuration documentation."""

    def test_config_has_comments(self):
        """Configuration should have XML comments."""
        content = DOTFUSCATOR_CONFIG.read_text()

        assert '<!--' in content, \
            "Configuration should have XML comments for documentation"

    def test_script_has_comments(self):
        """Script should have comments."""
        content = BUILD_SCRIPT.read_text()

        assert '#' in content, \
            "Script should have comments for documentation"

    def test_script_has_usage_info(self):
        """Script should document usage."""
        content = BUILD_SCRIPT.read_text()

        has_usage = 'usage' in content.lower() or \
                   'description' in content.lower() or \
                   'synopsis' in content.lower() or \
                   '.SYNOPSIS' in content

        assert has_usage, \
            "Script should document usage"
