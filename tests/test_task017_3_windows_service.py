"""
Test Suite for Subtask 17.3: Implement Windows Service installation

This module tests the Windows Service installation PowerShell script
that installs/uninstalls the ContPAQi AI Bridge as a Windows Service.

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
def service_script_path(scripts_dir):
    """Get the path to the install-service.ps1 script."""
    return scripts_dir / "install-service.ps1"


@pytest.fixture
def service_script_content(service_script_path):
    """Read the service installation script content."""
    if service_script_path.exists():
        return service_script_path.read_text(encoding='utf-8')
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
    """Test that the service installation script exists."""

    def test_install_service_script_exists(self, service_script_path):
        """Test that install-service.ps1 exists."""
        assert service_script_path.exists(), \
            f"install-service.ps1 should exist at {service_script_path}"

    def test_script_is_not_empty(self, service_script_content):
        """Test that the script is not empty."""
        assert service_script_content is not None, "Script should exist"
        assert len(service_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, service_script_content):
        """Test that the script has substantial content."""
        assert service_script_content is not None, "Script should exist"
        assert len(service_script_content) > 500, \
            "Script should have substantial content (>500 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, service_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', service_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_install_parameter(self, service_script_content):
        """Test that the script accepts an -Install parameter."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'\[switch\]\s*\$Install', service_script_content, re.IGNORECASE), \
            "Script should have -Install switch parameter"

    def test_has_uninstall_parameter(self, service_script_content):
        """Test that the script accepts an -Uninstall parameter."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'\[switch\]\s*\$Uninstall', service_script_content, re.IGNORECASE), \
            "Script should have -Uninstall switch parameter"

    def test_has_start_parameter(self, service_script_content):
        """Test that the script accepts a -Start parameter."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'\[switch\]\s*\$Start', service_script_content, re.IGNORECASE), \
            "Script should have -Start switch parameter"

    def test_has_stop_parameter(self, service_script_content):
        """Test that the script accepts a -Stop parameter."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'\[switch\]\s*\$Stop', service_script_content, re.IGNORECASE), \
            "Script should have -Stop switch parameter"

    def test_has_service_name_constant(self, service_script_content):
        """Test that the script defines a service name."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'\$ServiceName\s*=', service_script_content), \
            "Script should define $ServiceName variable"

    def test_service_name_is_contpaqi(self, service_script_content):
        """Test that the service name references ContPAQi."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'ContPAQi', service_script_content, re.IGNORECASE), \
            "Service name should reference ContPAQi"


# =============================================================================
# Test: Service Installation Functions
# =============================================================================

class TestServiceInstallation:
    """Test service installation functionality."""

    def test_has_install_function(self, service_script_content):
        """Test that the script has an installation function."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'function\s+Install-', service_script_content, re.IGNORECASE), \
            "Script should have an Install-* function"

    def test_uses_new_service_or_sc(self, service_script_content):
        """Test that the script uses New-Service cmdlet or sc.exe."""
        assert service_script_content is not None, "Script should exist"
        has_new_service = 'New-Service' in service_script_content
        has_sc_create = re.search(r'sc\.exe.*create', service_script_content, re.IGNORECASE)
        has_sc_create_alt = re.search(r'sc\s+create', service_script_content, re.IGNORECASE)
        assert has_new_service or has_sc_create or has_sc_create_alt, \
            "Script should use New-Service cmdlet or sc.exe create"

    def test_sets_service_start_type(self, service_script_content):
        """Test that the script sets service startup type."""
        assert service_script_content is not None, "Script should exist"
        # Check for automatic or delayed-auto start
        has_startup_type = re.search(r'StartupType|start=', service_script_content, re.IGNORECASE)
        assert has_startup_type, "Script should configure service startup type"

    def test_sets_service_description(self, service_script_content):
        """Test that the script sets a service description."""
        assert service_script_content is not None, "Script should exist"
        has_description = re.search(r'description|Set-Service.*-Description', service_script_content, re.IGNORECASE)
        assert has_description, "Script should set service description"

    def test_configures_binary_path(self, service_script_content):
        """Test that the script configures the service binary path."""
        assert service_script_content is not None, "Script should exist"
        has_binary_path = re.search(r'BinaryPathName|binPath', service_script_content, re.IGNORECASE)
        assert has_binary_path, "Script should configure service binary path"


# =============================================================================
# Test: Service Uninstallation Functions
# =============================================================================

class TestServiceUninstallation:
    """Test service uninstallation functionality."""

    def test_has_uninstall_function(self, service_script_content):
        """Test that the script has an uninstallation function."""
        assert service_script_content is not None, "Script should exist"
        assert re.search(r'function\s+Uninstall-', service_script_content, re.IGNORECASE), \
            "Script should have an Uninstall-* function"

    def test_stops_service_before_removal(self, service_script_content):
        """Test that the script stops the service before removing it."""
        assert service_script_content is not None, "Script should exist"
        has_stop = 'Stop-Service' in service_script_content or re.search(r'sc\s+stop', service_script_content, re.IGNORECASE)
        assert has_stop, "Script should stop service before removal"

    def test_removes_service(self, service_script_content):
        """Test that the script removes the service."""
        assert service_script_content is not None, "Script should exist"
        has_remove = 'Remove-Service' in service_script_content or \
                     re.search(r'sc\.exe.*delete', service_script_content, re.IGNORECASE) or \
                     re.search(r'sc\s+delete', service_script_content, re.IGNORECASE)
        assert has_remove, "Script should remove/delete the service"


# =============================================================================
# Test: Service Control Functions
# =============================================================================

class TestServiceControl:
    """Test service start/stop functionality."""

    def test_has_start_function(self, service_script_content):
        """Test that the script can start the service."""
        assert service_script_content is not None, "Script should exist"
        has_start = 'Start-Service' in service_script_content or \
                    re.search(r'sc\s+start', service_script_content, re.IGNORECASE)
        assert has_start, "Script should be able to start the service"

    def test_has_stop_function(self, service_script_content):
        """Test that the script can stop the service."""
        assert service_script_content is not None, "Script should exist"
        has_stop = 'Stop-Service' in service_script_content or \
                   re.search(r'sc\s+stop', service_script_content, re.IGNORECASE)
        assert has_stop, "Script should be able to stop the service"

    def test_checks_service_status(self, service_script_content):
        """Test that the script checks service status."""
        assert service_script_content is not None, "Script should exist"
        has_status_check = 'Get-Service' in service_script_content or \
                          re.search(r'sc\s+query', service_script_content, re.IGNORECASE)
        assert has_status_check, "Script should check service status"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, service_script_content):
        """Test that the script uses try-catch blocks."""
        assert service_script_content is not None, "Script should exist"
        assert 'try' in service_script_content.lower() and 'catch' in service_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_admin_check(self, service_script_content):
        """Test that the script checks for admin privileges."""
        assert service_script_content is not None, "Script should exist"
        has_admin_check = re.search(r'Administrator|IsInRole|RunAsAdministrator', service_script_content, re.IGNORECASE)
        assert has_admin_check, "Script should check for admin privileges"

    def test_has_exit_codes(self, service_script_content):
        """Test that the script returns appropriate exit codes."""
        assert service_script_content is not None, "Script should exist"
        has_exit = 'exit' in service_script_content.lower() or \
                   '$LASTEXITCODE' in service_script_content
        assert has_exit, "Script should use exit codes"


# =============================================================================
# Test: Service Recovery Options
# =============================================================================

class TestServiceRecovery:
    """Test service recovery configuration."""

    def test_configures_failure_actions(self, service_script_content):
        """Test that the script configures service failure actions."""
        assert service_script_content is not None, "Script should exist"
        # sc.exe failure command or similar
        has_failure_config = re.search(r'failure|recovery|restart', service_script_content, re.IGNORECASE)
        assert has_failure_config, "Script should configure failure/recovery actions"

    def test_restart_on_failure(self, service_script_content):
        """Test that service is configured to restart on failure."""
        assert service_script_content is not None, "Script should exist"
        has_restart = re.search(r'restart|reset', service_script_content, re.IGNORECASE)
        assert has_restart, "Script should configure restart on failure"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, service_script_content):
        """Test that the script has logging/output."""
        assert service_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in service_script_content or \
                      'Write-Output' in service_script_content or \
                      'Write-Verbose' in service_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_installation_status(self, service_script_content):
        """Test that the script logs installation status."""
        assert service_script_content is not None, "Script should exist"
        has_install_log = re.search(r'install.*success|installed|creating.*service',
                                     service_script_content, re.IGNORECASE)
        assert has_install_log, "Script should log installation status"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_references_install_service_script(self, iss_script_content):
        """Test that ISS references the install-service.ps1 script."""
        assert iss_script_content is not None, "ISS script should exist"
        assert 'install-service.ps1' in iss_script_content, \
            "ISS should reference install-service.ps1"

    def test_iss_calls_with_install_parameter(self, iss_script_content):
        """Test that ISS calls script with -Install parameter."""
        assert iss_script_content is not None, "ISS script should exist"
        assert '-Install' in iss_script_content, \
            "ISS should call script with -Install parameter"

    def test_iss_calls_with_uninstall_parameter(self, iss_script_content):
        """Test that ISS calls script with -Uninstall parameter."""
        assert iss_script_content is not None, "ISS script should exist"
        assert '-Uninstall' in iss_script_content, \
            "ISS should call script with -Uninstall parameter"


# =============================================================================
# Test: Service Configuration Values
# =============================================================================

class TestServiceConfiguration:
    """Test service configuration values."""

    def test_service_display_name(self, service_script_content):
        """Test that the script sets a display name."""
        assert service_script_content is not None, "Script should exist"
        has_display_name = re.search(r'DisplayName|displayname', service_script_content, re.IGNORECASE)
        assert has_display_name, "Script should set service display name"

    def test_service_executable_reference(self, service_script_content):
        """Test that the script references the correct executable."""
        assert service_script_content is not None, "Script should exist"
        has_exe_ref = re.search(r'ContpaqiBridge\.exe|\.exe', service_script_content, re.IGNORECASE)
        assert has_exe_ref, "Script should reference the executable"

    def test_configures_working_directory(self, service_script_content):
        """Test that the script can handle working directory setup."""
        assert service_script_content is not None, "Script should exist"
        # Either explicit working dir or PSScriptRoot usage
        has_workdir = re.search(r'PSScriptRoot|working.*dir|binPath', service_script_content, re.IGNORECASE)
        assert has_workdir, "Script should handle working directory"


# =============================================================================
# Test: Status Check Function
# =============================================================================

class TestStatusCheck:
    """Test service status checking functionality."""

    def test_has_status_parameter(self, service_script_content):
        """Test that the script accepts a -Status parameter."""
        assert service_script_content is not None, "Script should exist"
        has_status_param = re.search(r'\[switch\]\s*\$Status', service_script_content, re.IGNORECASE)
        assert has_status_param, "Script should have -Status switch parameter"

    def test_returns_service_state(self, service_script_content):
        """Test that the script can return service state."""
        assert service_script_content is not None, "Script should exist"
        has_state_return = re.search(r'Status|State|Running|Stopped', service_script_content, re.IGNORECASE)
        assert has_state_return, "Script should return service state information"
