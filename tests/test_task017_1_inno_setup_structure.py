"""
Tests for Subtask 17.1: Create Inno Setup Script Structure

Tests verify:
- Inno Setup script exists and has valid structure
- Required sections are present
- Application metadata is configured
- File installation paths are defined
- Registry entries are configured
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
ASSETS_DIR = INSTALLER_DIR / 'assets'


# =============================================================================
# File Existence Tests
# =============================================================================

class TestInnoSetupFileExistence:
    """Tests for Inno Setup file existence."""

    def test_installer_directory_exists(self):
        """Installer directory should exist."""
        assert INSTALLER_DIR.exists(), \
            f"Installer directory not found: {INSTALLER_DIR}"

    def test_iss_file_exists(self):
        """Inno Setup script should exist."""
        assert ISS_FILE.exists(), \
            f"Inno Setup script not found: {ISS_FILE}"

    def test_assets_directory_exists(self):
        """Assets directory should exist."""
        assert ASSETS_DIR.exists(), \
            f"Assets directory not found: {ASSETS_DIR}"


# =============================================================================
# Setup Section Tests
# =============================================================================

class TestInnoSetupSection:
    """Tests for [Setup] section."""

    def test_has_setup_section(self):
        """Script should have [Setup] section."""
        content = ISS_FILE.read_text()
        assert '[Setup]' in content, "Missing [Setup] section"

    def test_has_app_name(self):
        """Script should define AppName."""
        content = ISS_FILE.read_text()
        assert 'AppName=' in content, "Missing AppName"

    def test_has_app_version(self):
        """Script should define AppVersion."""
        content = ISS_FILE.read_text()
        assert 'AppVersion=' in content, "Missing AppVersion"

    def test_has_app_publisher(self):
        """Script should define AppPublisher."""
        content = ISS_FILE.read_text()
        assert 'AppPublisher=' in content, "Missing AppPublisher"

    def test_has_default_dir_name(self):
        """Script should define DefaultDirName."""
        content = ISS_FILE.read_text()
        assert 'DefaultDirName=' in content, "Missing DefaultDirName"

    def test_has_output_base_filename(self):
        """Script should define OutputBaseFilename."""
        content = ISS_FILE.read_text()
        assert 'OutputBaseFilename=' in content, "Missing OutputBaseFilename"

    def test_has_compression(self):
        """Script should define compression settings."""
        content = ISS_FILE.read_text()
        assert 'Compression=' in content, "Missing Compression setting"

    def test_has_privileges_required(self):
        """Script should define PrivilegesRequired."""
        content = ISS_FILE.read_text()
        assert 'PrivilegesRequired=' in content, "Missing PrivilegesRequired"


# =============================================================================
# Files Section Tests
# =============================================================================

class TestFilesSection:
    """Tests for [Files] section."""

    def test_has_files_section(self):
        """Script should have [Files] section."""
        content = ISS_FILE.read_text()
        assert '[Files]' in content, "Missing [Files] section"

    def test_files_section_has_source(self):
        """Files section should have Source entries."""
        content = ISS_FILE.read_text()
        assert 'Source:' in content, "Missing Source entries in [Files]"

    def test_files_section_has_destdir(self):
        """Files section should have DestDir entries."""
        content = ISS_FILE.read_text()
        assert 'DestDir:' in content, "Missing DestDir entries in [Files]"


# =============================================================================
# Directories Section Tests
# =============================================================================

class TestDirectoriesSection:
    """Tests for [Dirs] section."""

    def test_has_dirs_section(self):
        """Script should have [Dirs] section."""
        content = ISS_FILE.read_text()
        assert '[Dirs]' in content, "Missing [Dirs] section"


# =============================================================================
# Icons Section Tests
# =============================================================================

class TestIconsSection:
    """Tests for [Icons] section."""

    def test_has_icons_section(self):
        """Script should have [Icons] section."""
        content = ISS_FILE.read_text()
        assert '[Icons]' in content, "Missing [Icons] section"

    def test_has_desktop_icon(self):
        """Script should create desktop shortcut."""
        content = ISS_FILE.read_text().lower()
        assert 'desktop' in content, "Missing desktop shortcut"

    def test_has_start_menu_icon(self):
        """Script should create Start Menu entry."""
        content = ISS_FILE.read_text().lower()
        has_programs = 'group' in content or 'programs' in content
        assert has_programs, "Missing Start Menu entry"


# =============================================================================
# Registry Section Tests
# =============================================================================

class TestRegistrySection:
    """Tests for [Registry] section."""

    def test_has_registry_section(self):
        """Script should have [Registry] section."""
        content = ISS_FILE.read_text()
        assert '[Registry]' in content, "Missing [Registry] section"

    def test_registry_has_root(self):
        """Registry entries should specify Root."""
        content = ISS_FILE.read_text()
        assert 'Root:' in content, "Missing Root in registry entries"


# =============================================================================
# Run Section Tests
# =============================================================================

class TestRunSection:
    """Tests for [Run] section."""

    def test_has_run_section(self):
        """Script should have [Run] section."""
        content = ISS_FILE.read_text()
        assert '[Run]' in content, "Missing [Run] section"


# =============================================================================
# Code Section Tests
# =============================================================================

class TestCodeSection:
    """Tests for [Code] section (Pascal Script)."""

    def test_has_code_section(self):
        """Script should have [Code] section."""
        content = ISS_FILE.read_text()
        assert '[Code]' in content, "Missing [Code] section"

    def test_code_has_functions(self):
        """Code section should have Pascal functions."""
        content = ISS_FILE.read_text()
        has_function = 'function' in content.lower() or 'procedure' in content.lower()
        assert has_function, "Missing functions in [Code] section"


# =============================================================================
# Application Metadata Tests
# =============================================================================

class TestApplicationMetadata:
    """Tests for application metadata configuration."""

    def test_app_name_is_contpaqi(self):
        """App name should include ContPAQi."""
        content = ISS_FILE.read_text()
        assert 'ContPAQi' in content or 'contpaqi' in content.lower(), \
            "App name should include ContPAQi"

    def test_has_app_id(self):
        """Script should have AppId (GUID)."""
        content = ISS_FILE.read_text()
        # GUID pattern
        has_guid = re.search(r'\{[A-Fa-f0-9\-]{36}\}', content)
        assert has_guid or 'AppId=' in content, "Missing AppId"

    def test_has_uninstall_display_name(self):
        """Script should define UninstallDisplayName."""
        content = ISS_FILE.read_text()
        has_uninstall = 'UninstallDisplayName=' in content or \
                       'uninstall' in content.lower()
        assert has_uninstall, "Missing uninstall configuration"


# =============================================================================
# Installation Path Tests
# =============================================================================

class TestInstallationPaths:
    """Tests for installation path configuration."""

    def test_uses_program_files(self):
        """Default install path should use Program Files."""
        content = ISS_FILE.read_text()
        has_pf = '{pf}' in content or '{commonpf}' in content or \
                'ProgramFiles' in content or '{autopf}' in content
        assert has_pf, "Should install to Program Files"

    def test_has_app_directory(self):
        """Should define application directory structure."""
        content = ISS_FILE.read_text()
        assert '{app}' in content, "Missing {app} directory reference"


# =============================================================================
# Windows Compatibility Tests
# =============================================================================

class TestWindowsCompatibility:
    """Tests for Windows compatibility settings."""

    def test_minimum_windows_version(self):
        """Script should specify minimum Windows version."""
        content = ISS_FILE.read_text()
        has_min_version = 'MinVersion=' in content or 'min' in content.lower()
        assert has_min_version, "Missing minimum Windows version"

    def test_architecture_mode(self):
        """Script should specify architecture mode."""
        content = ISS_FILE.read_text()
        has_arch = 'ArchitecturesInstallIn64BitMode=' in content or \
                  'x64' in content.lower() or 'architectures' in content.lower()
        assert has_arch, "Missing architecture specification"


# =============================================================================
# Documentation Tests
# =============================================================================

class TestScriptDocumentation:
    """Tests for script documentation."""

    def test_has_comments(self):
        """Script should have comments."""
        content = ISS_FILE.read_text()
        assert ';' in content, "Script should have comments (;)"

    def test_has_header_comment(self):
        """Script should have header comment."""
        content = ISS_FILE.read_text()
        lines = content.split('\n')
        # First non-empty line should be a comment
        for line in lines:
            if line.strip():
                assert line.strip().startswith(';'), \
                    "Script should start with header comment"
                break
