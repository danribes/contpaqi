"""
Test Suite for Subtask 17.8: Implement first-run wizard

This module tests the first-run wizard PowerShell script that provides
initial setup and configuration experience after application installation.

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
def wizard_script_path(scripts_dir):
    """Get the path to the first-run-wizard.ps1 script."""
    return scripts_dir / "first-run-wizard.ps1"


@pytest.fixture
def wizard_script_content(wizard_script_path):
    """Read the first-run wizard script content."""
    if wizard_script_path.exists():
        return wizard_script_path.read_text(encoding='utf-8')
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
    """Test that the first-run wizard script exists."""

    def test_wizard_script_exists(self, wizard_script_path):
        """Test that first-run-wizard.ps1 exists."""
        assert wizard_script_path.exists(), \
            f"first-run-wizard.ps1 should exist at {wizard_script_path}"

    def test_script_is_not_empty(self, wizard_script_content):
        """Test that the script is not empty."""
        assert wizard_script_content is not None, "Script should exist"
        assert len(wizard_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, wizard_script_content):
        """Test that the script has substantial content."""
        assert wizard_script_content is not None, "Script should exist"
        assert len(wizard_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, wizard_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert wizard_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', wizard_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_skip_checks_parameter(self, wizard_script_content):
        """Test that the script accepts a -SkipChecks parameter."""
        assert wizard_script_content is not None, "Script should exist"
        has_param = re.search(r'\$SkipChecks|\$Skip', wizard_script_content, re.IGNORECASE)
        assert has_param, "Script should have -SkipChecks parameter"

    def test_has_quiet_parameter(self, wizard_script_content):
        """Test that the script accepts a -Quiet parameter."""
        assert wizard_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Quiet|\$Silent', wizard_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Quiet parameter"

    def test_has_install_path_parameter(self, wizard_script_content):
        """Test that the script accepts an -InstallPath parameter."""
        assert wizard_script_content is not None, "Script should exist"
        has_param = re.search(r'\$InstallPath', wizard_script_content, re.IGNORECASE)
        assert has_param, "Script should have -InstallPath parameter"


# =============================================================================
# Test: System Requirements Check
# =============================================================================

class TestSystemChecks:
    """Test system requirements checking functionality."""

    def test_checks_docker(self, wizard_script_content):
        """Test that the script checks Docker availability."""
        assert wizard_script_content is not None, "Script should exist"
        has_docker_check = re.search(r'docker|Docker', wizard_script_content)
        assert has_docker_check, "Script should check Docker"

    def test_checks_dotnet(self, wizard_script_content):
        """Test that the script checks .NET availability."""
        assert wizard_script_content is not None, "Script should exist"
        has_dotnet_check = re.search(r'dotnet|\.NET', wizard_script_content)
        assert has_dotnet_check, "Script should check .NET"

    def test_checks_service_status(self, wizard_script_content):
        """Test that the script checks service status."""
        assert wizard_script_content is not None, "Script should exist"
        has_service_check = re.search(r'service|Service|Get-Service',
                                       wizard_script_content, re.IGNORECASE)
        assert has_service_check, "Script should check service status"


# =============================================================================
# Test: Configuration Setup
# =============================================================================

class TestConfigurationSetup:
    """Test configuration setup functionality."""

    def test_handles_configuration(self, wizard_script_content):
        """Test that the script handles configuration."""
        assert wizard_script_content is not None, "Script should exist"
        has_config = re.search(r'config|settings|appsettings',
                                wizard_script_content, re.IGNORECASE)
        assert has_config, "Script should handle configuration"

    def test_creates_first_run_marker(self, wizard_script_content):
        """Test that the script creates a first-run marker."""
        assert wizard_script_content is not None, "Script should exist"
        has_marker = re.search(r'first.*run|marker|\.firstrun|initialized',
                                wizard_script_content, re.IGNORECASE)
        assert has_marker, "Script should create first-run marker"


# =============================================================================
# Test: Service Management
# =============================================================================

class TestServiceManagement:
    """Test service management functionality."""

    def test_can_start_service(self, wizard_script_content):
        """Test that the script can start the service."""
        assert wizard_script_content is not None, "Script should exist"
        has_start = re.search(r'Start-Service|start.*service|sc\s+start',
                               wizard_script_content, re.IGNORECASE)
        assert has_start, "Script should be able to start service"

    def test_checks_service_running(self, wizard_script_content):
        """Test that the script checks if service is running."""
        assert wizard_script_content is not None, "Script should exist"
        has_running_check = re.search(r'Running|Status|service.*status',
                                       wizard_script_content, re.IGNORECASE)
        assert has_running_check, "Script should check if service is running"


# =============================================================================
# Test: Welcome Information
# =============================================================================

class TestWelcomeInfo:
    """Test welcome and getting started information."""

    def test_displays_welcome(self, wizard_script_content):
        """Test that the script displays welcome message."""
        assert wizard_script_content is not None, "Script should exist"
        has_welcome = re.search(r'welcome|Welcome|getting.*started',
                                 wizard_script_content, re.IGNORECASE)
        assert has_welcome, "Script should display welcome message"

    def test_references_contpaqi(self, wizard_script_content):
        """Test that the script references ContPAQi."""
        assert wizard_script_content is not None, "Script should exist"
        has_name = re.search(r'ContPAQi', wizard_script_content, re.IGNORECASE)
        assert has_name, "Script should reference ContPAQi"

    def test_shows_status_summary(self, wizard_script_content):
        """Test that the script shows status summary."""
        assert wizard_script_content is not None, "Script should exist"
        has_summary = re.search(r'summary|status|check|ready',
                                 wizard_script_content, re.IGNORECASE)
        assert has_summary, "Script should show status summary"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, wizard_script_content):
        """Test that the script uses try-catch blocks."""
        assert wizard_script_content is not None, "Script should exist"
        assert 'try' in wizard_script_content.lower() and 'catch' in wizard_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, wizard_script_content):
        """Test that the script returns appropriate exit codes."""
        assert wizard_script_content is not None, "Script should exist"
        has_exit = 'exit' in wizard_script_content.lower() or \
                   '$LASTEXITCODE' in wizard_script_content
        assert has_exit, "Script should use exit codes"

    def test_handles_failures_gracefully(self, wizard_script_content):
        """Test that the script handles failures gracefully."""
        assert wizard_script_content is not None, "Script should exist"
        has_error_handling = re.search(r'error|fail|warning|SilentlyContinue',
                                        wizard_script_content, re.IGNORECASE)
        assert has_error_handling, "Script should handle failures"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, wizard_script_content):
        """Test that the script has logging/output."""
        assert wizard_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in wizard_script_content or \
                      'Write-Output' in wizard_script_content or \
                      'Write-Verbose' in wizard_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_check_results(self, wizard_script_content):
        """Test that the script logs check results."""
        assert wizard_script_content is not None, "Script should exist"
        has_result_log = re.search(r'pass|fail|ok|error|check',
                                    wizard_script_content, re.IGNORECASE)
        assert has_result_log, "Script should log check results"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_has_postinstall_launch(self, iss_script_content):
        """Test that ISS has postinstall launch option."""
        assert iss_script_content is not None, "ISS script should exist"
        has_postinstall = re.search(r'postinstall', iss_script_content, re.IGNORECASE)
        assert has_postinstall, "ISS should have postinstall option"

    def test_iss_has_wizard_style(self, iss_script_content):
        """Test that ISS has modern wizard style."""
        assert iss_script_content is not None, "ISS script should exist"
        has_wizard = re.search(r'WizardStyle', iss_script_content)
        assert has_wizard, "ISS should have WizardStyle setting"


# =============================================================================
# Test: First Run Detection
# =============================================================================

class TestFirstRunDetection:
    """Test first run detection functionality."""

    def test_detects_first_run(self, wizard_script_content):
        """Test that the script can detect first run."""
        assert wizard_script_content is not None, "Script should exist"
        has_detection = re.search(r'first.*run|Test-Path|exist|marker',
                                   wizard_script_content, re.IGNORECASE)
        assert has_detection, "Script should detect first run"

    def test_can_force_run(self, wizard_script_content):
        """Test that the script can be forced to run."""
        assert wizard_script_content is not None, "Script should exist"
        has_force = re.search(r'\$Force', wizard_script_content, re.IGNORECASE)
        assert has_force, "Script should have -Force parameter"


# =============================================================================
# Test: User Interaction
# =============================================================================

class TestUserInteraction:
    """Test user interaction features."""

    def test_supports_interactive_mode(self, wizard_script_content):
        """Test that the script supports interactive mode."""
        assert wizard_script_content is not None, "Script should exist"
        has_interactive = re.search(r'Read-Host|prompt|input|interactive',
                                     wizard_script_content, re.IGNORECASE)
        assert has_interactive, "Script should support interactive mode"

    def test_can_open_browser(self, wizard_script_content):
        """Test that the script can open browser/documentation."""
        assert wizard_script_content is not None, "Script should exist"
        has_browser = re.search(r'Start-Process|browser|http|url|localhost',
                                 wizard_script_content, re.IGNORECASE)
        assert has_browser, "Script should be able to open browser"


# =============================================================================
# Test: Results Reporting
# =============================================================================

class TestResultsReporting:
    """Test results reporting functionality."""

    def test_reports_overall_status(self, wizard_script_content):
        """Test that the script reports overall status."""
        assert wizard_script_content is not None, "Script should exist"
        has_status = re.search(r'success|complete|ready|all.*check',
                                wizard_script_content, re.IGNORECASE)
        assert has_status, "Script should report overall status"

    def test_provides_next_steps(self, wizard_script_content):
        """Test that the script provides next steps."""
        assert wizard_script_content is not None, "Script should exist"
        has_next = re.search(r'next|step|start|begin|ready',
                              wizard_script_content, re.IGNORECASE)
        assert has_next, "Script should provide next steps"
