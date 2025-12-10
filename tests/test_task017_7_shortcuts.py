"""
Test Suite for Subtask 17.7: Add desktop shortcut creation

This module tests the PowerShell script that creates and manages
desktop and Start Menu shortcuts for the ContPAQi AI Bridge application.

TDD Approach: Tests written first, implementation follows.
"""

import pytest
import os
import re
from pathlib import Path


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def project_root():
    """Get the project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture
def installer_dir(project_root):
    """Get the installer directory."""
    return project_root / "installer"


@pytest.fixture
def scripts_dir(installer_dir):
    """Get the installer scripts directory."""
    return installer_dir / "scripts"


@pytest.fixture
def shortcut_script_path(scripts_dir):
    """Get the path to the create-shortcuts.ps1 script."""
    return scripts_dir / "create-shortcuts.ps1"


@pytest.fixture
def shortcut_script_content(shortcut_script_path):
    """Read the shortcut creation script content."""
    if shortcut_script_path.exists():
        return shortcut_script_path.read_text(encoding='utf-8')
    return None


@pytest.fixture
def iss_script_content(installer_dir):
    """Read the Inno Setup script content."""
    iss_path = installer_dir / "contpaqi-bridge.iss"
    if iss_path.exists():
        return iss_path.read_text(encoding='utf-8')
    return None


# =============================================================================
# Test: Script File Existence
# =============================================================================

class TestScriptExists:
    """Test that the shortcut creation script exists."""

    def test_shortcut_script_exists(self, shortcut_script_path):
        """Test that create-shortcuts.ps1 exists."""
        assert shortcut_script_path.exists(), \
            f"create-shortcuts.ps1 should exist at {shortcut_script_path}"

    def test_script_is_not_empty(self, shortcut_script_content):
        """Test that the script is not empty."""
        assert shortcut_script_content is not None, "Script should exist"
        assert len(shortcut_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, shortcut_script_content):
        """Test that the script has substantial content."""
        assert shortcut_script_content is not None, "Script should exist"
        assert len(shortcut_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, shortcut_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert shortcut_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', shortcut_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_create_parameter(self, shortcut_script_content):
        """Test that the script accepts a -Create parameter."""
        assert shortcut_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Create', shortcut_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Create parameter"

    def test_has_remove_parameter(self, shortcut_script_content):
        """Test that the script accepts a -Remove parameter."""
        assert shortcut_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Remove', shortcut_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Remove parameter"

    def test_has_desktop_parameter(self, shortcut_script_content):
        """Test that the script accepts a -Desktop parameter."""
        assert shortcut_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Desktop', shortcut_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Desktop parameter"

    def test_has_startmenu_parameter(self, shortcut_script_content):
        """Test that the script accepts a -StartMenu parameter."""
        assert shortcut_script_content is not None, "Script should exist"
        has_param = re.search(r'\$StartMenu', shortcut_script_content, re.IGNORECASE)
        assert has_param, "Script should have -StartMenu parameter"


# =============================================================================
# Test: WScript.Shell COM Object
# =============================================================================

class TestWScriptShell:
    """Test WScript.Shell COM object usage for shortcut creation."""

    def test_uses_wscript_shell(self, shortcut_script_content):
        """Test that the script uses WScript.Shell COM object."""
        assert shortcut_script_content is not None, "Script should exist"
        has_wscript = re.search(r'WScript\.Shell|New-Object.*-ComObject',
                                 shortcut_script_content, re.IGNORECASE)
        assert has_wscript, "Script should use WScript.Shell COM object"

    def test_creates_shortcut_object(self, shortcut_script_content):
        """Test that the script creates shortcut objects."""
        assert shortcut_script_content is not None, "Script should exist"
        has_shortcut = re.search(r'CreateShortcut|\.lnk',
                                  shortcut_script_content, re.IGNORECASE)
        assert has_shortcut, "Script should create shortcut objects"

    def test_sets_target_path(self, shortcut_script_content):
        """Test that the script sets the shortcut target path."""
        assert shortcut_script_content is not None, "Script should exist"
        has_target = re.search(r'TargetPath', shortcut_script_content, re.IGNORECASE)
        assert has_target, "Script should set TargetPath property"

    def test_saves_shortcut(self, shortcut_script_content):
        """Test that the script saves the shortcut."""
        assert shortcut_script_content is not None, "Script should exist"
        has_save = re.search(r'\.Save\(\)', shortcut_script_content, re.IGNORECASE)
        assert has_save, "Script should call Save() on shortcut"


# =============================================================================
# Test: Desktop Shortcut
# =============================================================================

class TestDesktopShortcut:
    """Test desktop shortcut creation."""

    def test_references_desktop_path(self, shortcut_script_content):
        """Test that the script references the desktop path."""
        assert shortcut_script_content is not None, "Script should exist"
        has_desktop = re.search(r'Desktop|SpecialFolder',
                                 shortcut_script_content, re.IGNORECASE)
        assert has_desktop, "Script should reference desktop path"

    def test_creates_desktop_shortcut(self, shortcut_script_content):
        """Test that the script can create desktop shortcut."""
        assert shortcut_script_content is not None, "Script should exist"
        has_desktop_create = re.search(r'desktop.*\.lnk|desktop.*shortcut',
                                        shortcut_script_content, re.IGNORECASE)
        assert has_desktop_create, "Script should create desktop shortcut"


# =============================================================================
# Test: Start Menu Shortcut
# =============================================================================

class TestStartMenuShortcut:
    """Test Start Menu shortcut creation."""

    def test_references_startmenu_path(self, shortcut_script_content):
        """Test that the script references the Start Menu path."""
        assert shortcut_script_content is not None, "Script should exist"
        has_startmenu = re.search(r'StartMenu|Programs|Start Menu',
                                   shortcut_script_content, re.IGNORECASE)
        assert has_startmenu, "Script should reference Start Menu path"

    def test_creates_startmenu_folder(self, shortcut_script_content):
        """Test that the script creates Start Menu folder."""
        assert shortcut_script_content is not None, "Script should exist"
        has_folder = re.search(r'New-Item|mkdir|Directory',
                                shortcut_script_content, re.IGNORECASE)
        assert has_folder, "Script should be able to create folders"


# =============================================================================
# Test: Shortcut Properties
# =============================================================================

class TestShortcutProperties:
    """Test shortcut property configuration."""

    def test_sets_working_directory(self, shortcut_script_content):
        """Test that the script sets working directory."""
        assert shortcut_script_content is not None, "Script should exist"
        has_workdir = re.search(r'WorkingDirectory', shortcut_script_content, re.IGNORECASE)
        assert has_workdir, "Script should set WorkingDirectory property"

    def test_sets_description(self, shortcut_script_content):
        """Test that the script sets description."""
        assert shortcut_script_content is not None, "Script should exist"
        has_desc = re.search(r'Description', shortcut_script_content, re.IGNORECASE)
        assert has_desc, "Script should set Description property"

    def test_sets_icon(self, shortcut_script_content):
        """Test that the script can set icon."""
        assert shortcut_script_content is not None, "Script should exist"
        has_icon = re.search(r'IconLocation|icon', shortcut_script_content, re.IGNORECASE)
        assert has_icon, "Script should set IconLocation property"

    def test_references_contpaqi(self, shortcut_script_content):
        """Test that the script references ContPAQi."""
        assert shortcut_script_content is not None, "Script should exist"
        has_name = re.search(r'ContPAQi', shortcut_script_content, re.IGNORECASE)
        assert has_name, "Script should reference ContPAQi"


# =============================================================================
# Test: Shortcut Removal
# =============================================================================

class TestShortcutRemoval:
    """Test shortcut removal functionality."""

    def test_can_remove_shortcuts(self, shortcut_script_content):
        """Test that the script can remove shortcuts."""
        assert shortcut_script_content is not None, "Script should exist"
        has_remove = re.search(r'Remove-Item|delete|remove.*shortcut',
                                shortcut_script_content, re.IGNORECASE)
        assert has_remove, "Script should be able to remove shortcuts"

    def test_checks_shortcut_exists(self, shortcut_script_content):
        """Test that the script checks if shortcut exists before removal."""
        assert shortcut_script_content is not None, "Script should exist"
        has_check = re.search(r'Test-Path|exist',
                               shortcut_script_content, re.IGNORECASE)
        assert has_check, "Script should check if shortcut exists"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, shortcut_script_content):
        """Test that the script uses try-catch blocks."""
        assert shortcut_script_content is not None, "Script should exist"
        assert 'try' in shortcut_script_content.lower() and 'catch' in shortcut_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, shortcut_script_content):
        """Test that the script returns appropriate exit codes."""
        assert shortcut_script_content is not None, "Script should exist"
        has_exit = 'exit' in shortcut_script_content.lower() or \
                   '$LASTEXITCODE' in shortcut_script_content
        assert has_exit, "Script should use exit codes"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, shortcut_script_content):
        """Test that the script has logging/output."""
        assert shortcut_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in shortcut_script_content or \
                      'Write-Output' in shortcut_script_content or \
                      'Write-Verbose' in shortcut_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_creation(self, shortcut_script_content):
        """Test that the script logs shortcut creation."""
        assert shortcut_script_content is not None, "Script should exist"
        has_create_log = re.search(r'creat.*shortcut|shortcut.*creat',
                                    shortcut_script_content, re.IGNORECASE)
        assert has_create_log, "Script should log shortcut creation"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_has_icons_section(self, iss_script_content):
        """Test that ISS has [Icons] section."""
        assert iss_script_content is not None, "ISS script should exist"
        assert '[Icons]' in iss_script_content, \
            "ISS should have [Icons] section"

    def test_iss_has_desktop_task(self, iss_script_content):
        """Test that ISS has desktop icon task."""
        assert iss_script_content is not None, "ISS script should exist"
        assert 'desktopicon' in iss_script_content.lower(), \
            "ISS should have desktop icon task"

    def test_iss_creates_startmenu_shortcuts(self, iss_script_content):
        """Test that ISS creates Start Menu shortcuts."""
        assert iss_script_content is not None, "ISS script should exist"
        has_startmenu = re.search(r'\{group\}', iss_script_content)
        assert has_startmenu, "ISS should create Start Menu shortcuts"


# =============================================================================
# Test: All Users vs Current User
# =============================================================================

class TestUserScope:
    """Test all users vs current user shortcut placement."""

    def test_supports_all_users(self, shortcut_script_content):
        """Test that the script supports all users shortcuts."""
        assert shortcut_script_content is not None, "Script should exist"
        has_all_users = re.search(r'AllUsers|CommonDesktop|Public',
                                   shortcut_script_content, re.IGNORECASE)
        assert has_all_users, "Script should support all users shortcuts"

    def test_supports_current_user(self, shortcut_script_content):
        """Test that the script supports current user shortcuts."""
        assert shortcut_script_content is not None, "Script should exist"
        has_current = re.search(r'CurrentUser|User.*Desktop|Environment',
                                 shortcut_script_content, re.IGNORECASE)
        assert has_current, "Script should support current user shortcuts"
