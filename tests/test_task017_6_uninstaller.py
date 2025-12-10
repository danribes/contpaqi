"""
Test Suite for Subtask 17.6: Create uninstaller logic

This module tests the uninstaller PowerShell script that handles
cleanup during application uninstallation - stopping services,
removing Docker images, and cleaning up data.

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
def uninstall_script_path(scripts_dir):
    """Get the path to the uninstall.ps1 script."""
    return scripts_dir / "uninstall.ps1"


@pytest.fixture
def uninstall_script_content(uninstall_script_path):
    """Read the uninstaller script content."""
    if uninstall_script_path.exists():
        return uninstall_script_path.read_text(encoding='utf-8')
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
    """Test that the uninstaller script exists."""

    def test_uninstall_script_exists(self, uninstall_script_path):
        """Test that uninstall.ps1 exists."""
        assert uninstall_script_path.exists(), \
            f"uninstall.ps1 should exist at {uninstall_script_path}"

    def test_script_is_not_empty(self, uninstall_script_content):
        """Test that the script is not empty."""
        assert uninstall_script_content is not None, "Script should exist"
        assert len(uninstall_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, uninstall_script_content):
        """Test that the script has substantial content."""
        assert uninstall_script_content is not None, "Script should exist"
        assert len(uninstall_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, uninstall_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert uninstall_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', uninstall_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_quiet_parameter(self, uninstall_script_content):
        """Test that the script accepts a -Quiet parameter."""
        assert uninstall_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Quiet|\$Silent', uninstall_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Quiet or -Silent parameter"

    def test_has_keep_data_parameter(self, uninstall_script_content):
        """Test that the script accepts a -KeepData parameter."""
        assert uninstall_script_content is not None, "Script should exist"
        has_param = re.search(r'\$KeepData|\$PreserveData', uninstall_script_content, re.IGNORECASE)
        assert has_param, "Script should have -KeepData parameter"

    def test_has_install_path_parameter(self, uninstall_script_content):
        """Test that the script accepts an -InstallPath parameter."""
        assert uninstall_script_content is not None, "Script should exist"
        has_param = re.search(r'\$InstallPath', uninstall_script_content, re.IGNORECASE)
        assert has_param, "Script should have -InstallPath parameter"


# =============================================================================
# Test: Service Cleanup
# =============================================================================

class TestServiceCleanup:
    """Test Windows Service cleanup functionality."""

    def test_stops_service(self, uninstall_script_content):
        """Test that the script stops the service."""
        assert uninstall_script_content is not None, "Script should exist"
        has_stop = re.search(r'Stop-Service|sc\s+stop', uninstall_script_content, re.IGNORECASE)
        assert has_stop, "Script should stop the service"

    def test_removes_service(self, uninstall_script_content):
        """Test that the script removes the service."""
        assert uninstall_script_content is not None, "Script should exist"
        has_remove = re.search(r'Remove-Service|sc\s+delete|Uninstall.*Service',
                                uninstall_script_content, re.IGNORECASE)
        assert has_remove, "Script should remove the service"

    def test_checks_service_exists(self, uninstall_script_content):
        """Test that the script checks if service exists before removal."""
        assert uninstall_script_content is not None, "Script should exist"
        has_check = re.search(r'Get-Service|Test.*Service|service.*exist',
                               uninstall_script_content, re.IGNORECASE)
        assert has_check, "Script should check if service exists"


# =============================================================================
# Test: Docker Cleanup
# =============================================================================

class TestDockerCleanup:
    """Test Docker cleanup functionality."""

    def test_removes_docker_image(self, uninstall_script_content):
        """Test that the script removes the Docker image."""
        assert uninstall_script_content is not None, "Script should exist"
        has_rmi = re.search(r'docker\s+rmi|docker\s+image\s+rm',
                            uninstall_script_content, re.IGNORECASE)
        assert has_rmi, "Script should remove Docker image"

    def test_stops_docker_containers(self, uninstall_script_content):
        """Test that the script stops related Docker containers."""
        assert uninstall_script_content is not None, "Script should exist"
        has_stop = re.search(r'docker\s+stop|docker\s+container',
                              uninstall_script_content, re.IGNORECASE)
        assert has_stop, "Script should stop Docker containers"

    def test_references_contpaqi_image(self, uninstall_script_content):
        """Test that the script references the ContPAQi image."""
        assert uninstall_script_content is not None, "Script should exist"
        has_image = re.search(r'contpaqi-mcp|contpaqi',
                               uninstall_script_content, re.IGNORECASE)
        assert has_image, "Script should reference ContPAQi image"

    def test_handles_docker_not_running(self, uninstall_script_content):
        """Test that the script handles Docker not running gracefully."""
        assert uninstall_script_content is not None, "Script should exist"
        has_check = re.search(r'docker\s+info|Test.*Docker|Docker.*running',
                               uninstall_script_content, re.IGNORECASE)
        assert has_check, "Script should handle Docker not running"


# =============================================================================
# Test: Data Cleanup
# =============================================================================

class TestDataCleanup:
    """Test data cleanup functionality."""

    def test_can_remove_logs(self, uninstall_script_content):
        """Test that the script can remove log files."""
        assert uninstall_script_content is not None, "Script should exist"
        has_logs = re.search(r'logs|Remove-Item.*log',
                              uninstall_script_content, re.IGNORECASE)
        assert has_logs, "Script should handle log cleanup"

    def test_can_remove_data(self, uninstall_script_content):
        """Test that the script can remove data files."""
        assert uninstall_script_content is not None, "Script should exist"
        has_data = re.search(r'data|config|Remove-Item',
                              uninstall_script_content, re.IGNORECASE)
        assert has_data, "Script should handle data cleanup"

    def test_preserves_data_when_requested(self, uninstall_script_content):
        """Test that the script can preserve data when requested."""
        assert uninstall_script_content is not None, "Script should exist"
        has_preserve = re.search(r'KeepData|PreserveData|skip.*data',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_preserve, "Script should support data preservation"


# =============================================================================
# Test: Registry Cleanup
# =============================================================================

class TestRegistryCleanup:
    """Test registry cleanup functionality."""

    def test_removes_registry_entries(self, uninstall_script_content):
        """Test that the script removes registry entries."""
        assert uninstall_script_content is not None, "Script should exist"
        has_registry = re.search(r'Remove-ItemProperty|Remove-Item.*Registry|reg\s+delete|HKLM|HKCU',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_registry, "Script should remove registry entries"

    def test_removes_environment_variables(self, uninstall_script_content):
        """Test that the script removes environment variables."""
        assert uninstall_script_content is not None, "Script should exist"
        has_env = re.search(r'Environment|CONTPAQI|env',
                             uninstall_script_content, re.IGNORECASE)
        assert has_env, "Script should handle environment variables"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, uninstall_script_content):
        """Test that the script uses try-catch blocks."""
        assert uninstall_script_content is not None, "Script should exist"
        assert 'try' in uninstall_script_content.lower() and 'catch' in uninstall_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, uninstall_script_content):
        """Test that the script returns appropriate exit codes."""
        assert uninstall_script_content is not None, "Script should exist"
        has_exit = 'exit' in uninstall_script_content.lower() or \
                   '$LASTEXITCODE' in uninstall_script_content
        assert has_exit, "Script should use exit codes"

    def test_continues_on_error(self, uninstall_script_content):
        """Test that the script continues cleanup even if some steps fail."""
        assert uninstall_script_content is not None, "Script should exist"
        # Should have multiple try-catch or Continue/SilentlyContinue
        has_continue = re.search(r'SilentlyContinue|Continue|catch.*\{',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_continue, "Script should continue on errors"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, uninstall_script_content):
        """Test that the script has logging/output."""
        assert uninstall_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in uninstall_script_content or \
                      'Write-Output' in uninstall_script_content or \
                      'Write-Verbose' in uninstall_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_cleanup_progress(self, uninstall_script_content):
        """Test that the script logs cleanup progress."""
        assert uninstall_script_content is not None, "Script should exist"
        has_progress = re.search(r'removing|cleaning|uninstall|stop',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_progress, "Script should log cleanup progress"

    def test_logs_completion(self, uninstall_script_content):
        """Test that the script logs completion."""
        assert uninstall_script_content is not None, "Script should exist"
        has_complete = re.search(r'complete|done|success|finish',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_complete, "Script should log completion"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_has_uninstall_run_section(self, iss_script_content):
        """Test that ISS has [UninstallRun] section."""
        assert iss_script_content is not None, "ISS script should exist"
        assert '[UninstallRun]' in iss_script_content, \
            "ISS should have [UninstallRun] section"

    def test_iss_has_uninstall_delete_section(self, iss_script_content):
        """Test that ISS has [UninstallDelete] section."""
        assert iss_script_content is not None, "ISS script should exist"
        assert '[UninstallDelete]' in iss_script_content, \
            "ISS should have [UninstallDelete] section"

    def test_iss_has_uninstall_procedure(self, iss_script_content):
        """Test that ISS has CurUninstallStepChanged procedure."""
        assert iss_script_content is not None, "ISS script should exist"
        assert 'CurUninstallStepChanged' in iss_script_content, \
            "ISS should have CurUninstallStepChanged procedure"


# =============================================================================
# Test: Cleanup Order
# =============================================================================

class TestCleanupOrder:
    """Test that cleanup happens in correct order."""

    def test_has_cleanup_function(self, uninstall_script_content):
        """Test that the script has cleanup functions."""
        assert uninstall_script_content is not None, "Script should exist"
        has_function = re.search(r'function\s+\w*(?:Clean|Remove|Uninstall)',
                                  uninstall_script_content, re.IGNORECASE)
        assert has_function, "Script should have cleanup functions"

    def test_has_main_function(self, uninstall_script_content):
        """Test that the script has a main/entry function."""
        assert uninstall_script_content is not None, "Script should exist"
        has_main = re.search(r'function\s+(?:Main|Start-Uninstall|Invoke-Uninstall)',
                              uninstall_script_content, re.IGNORECASE)
        assert has_main, "Script should have main entry function"


# =============================================================================
# Test: Force Options
# =============================================================================

class TestForceOptions:
    """Test force and confirmation options."""

    def test_has_force_parameter(self, uninstall_script_content):
        """Test that the script has a -Force parameter."""
        assert uninstall_script_content is not None, "Script should exist"
        has_force = re.search(r'\$Force', uninstall_script_content, re.IGNORECASE)
        assert has_force, "Script should have -Force parameter"

    def test_can_skip_confirmation(self, uninstall_script_content):
        """Test that confirmation can be skipped."""
        assert uninstall_script_content is not None, "Script should exist"
        has_skip = re.search(r'Force|NoConfirm|Quiet|Silent',
                              uninstall_script_content, re.IGNORECASE)
        assert has_skip, "Script should support skipping confirmation"
