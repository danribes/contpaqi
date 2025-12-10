"""
Test Suite for Subtask 17.10: Test on clean Windows 10/11 machines

This module tests the Windows installation validation script that verifies
the complete installation on clean Windows 10/11 machines.

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
def test_script_path(scripts_dir):
    """Get the path to the test-installation.ps1 script."""
    return scripts_dir / "test-installation.ps1"


@pytest.fixture
def test_script_content(test_script_path):
    """Read the test installation script content."""
    if test_script_path.exists():
        return test_script_path.read_text(encoding='utf-8')
    return None


# =============================================================================
# Test: Script File Existence
# =============================================================================

class TestScriptExists:
    """Test that the test installation script exists."""

    def test_script_exists(self, test_script_path):
        """Test that test-installation.ps1 exists."""
        assert test_script_path.exists(), \
            f"test-installation.ps1 should exist at {test_script_path}"

    def test_script_is_not_empty(self, test_script_content):
        """Test that the script is not empty."""
        assert test_script_content is not None, "Script should exist"
        assert len(test_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, test_script_content):
        """Test that the script has substantial content."""
        assert test_script_content is not None, "Script should exist"
        assert len(test_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, test_script_content):
        """Test that the script has a param block."""
        assert test_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', test_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_install_path_parameter(self, test_script_content):
        """Test that the script accepts install path parameter."""
        assert test_script_content is not None, "Script should exist"
        has_param = re.search(r'\$InstallPath', test_script_content, re.IGNORECASE)
        assert has_param, "Script should have -InstallPath parameter"

    def test_has_output_parameter(self, test_script_content):
        """Test that the script accepts output path parameter."""
        assert test_script_content is not None, "Script should exist"
        has_param = re.search(r'\$OutputPath|\$ReportPath|\$Output',
                              test_script_content, re.IGNORECASE)
        assert has_param, "Script should have output parameter"

    def test_has_verbose_parameter(self, test_script_content):
        """Test that the script accepts verbose parameter."""
        assert test_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Verbose|\$Detailed',
                              test_script_content, re.IGNORECASE)
        assert has_param, "Script should have verbose parameter"


# =============================================================================
# Test: Windows Version Detection
# =============================================================================

class TestWindowsVersionDetection:
    """Test Windows version detection functionality."""

    def test_checks_windows_version(self, test_script_content):
        """Test that the script checks Windows version."""
        assert test_script_content is not None, "Script should exist"
        has_version = re.search(r'Windows|OSVersion|BuildNumber|10|11',
                                test_script_content, re.IGNORECASE)
        assert has_version, "Script should check Windows version"

    def test_validates_supported_version(self, test_script_content):
        """Test that the script validates supported versions."""
        assert test_script_content is not None, "Script should exist"
        has_validation = re.search(r'support|compatible|version|19041|22000',
                                   test_script_content, re.IGNORECASE)
        assert has_validation, "Script should validate supported versions"


# =============================================================================
# Test: Installation Verification
# =============================================================================

class TestInstallationVerification:
    """Test installation verification functionality."""

    def test_checks_install_directory(self, test_script_content):
        """Test that the script checks installation directory."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'Test-Path|directory|exist|install',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check installation directory"

    def test_checks_executable_exists(self, test_script_content):
        """Test that the script checks executable exists."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'\.exe|executable|bin|ContpaqiBridge',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check executable exists"

    def test_checks_config_files(self, test_script_content):
        """Test that the script checks configuration files."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'config|appsettings|\.json',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check config files"


# =============================================================================
# Test: Service Verification
# =============================================================================

class TestServiceVerification:
    """Test Windows service verification functionality."""

    def test_checks_service_installed(self, test_script_content):
        """Test that the script checks service is installed."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'Get-Service|service|ContPAQiBridge',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check service installed"

    def test_checks_service_running(self, test_script_content):
        """Test that the script checks service is running."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'Running|Status|Started',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check service running"


# =============================================================================
# Test: Docker Verification
# =============================================================================

class TestDockerVerification:
    """Test Docker verification functionality."""

    def test_checks_docker_installed(self, test_script_content):
        """Test that the script checks Docker is installed."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'docker|Docker', test_script_content)
        assert has_check, "Script should check Docker installed"

    def test_checks_docker_running(self, test_script_content):
        """Test that the script checks Docker is running."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'docker info|running|daemon',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check Docker running"

    def test_checks_docker_image(self, test_script_content):
        """Test that the script checks Docker image exists."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'docker images|image|contpaqi-mcp',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check Docker image"


# =============================================================================
# Test: Shortcut Verification
# =============================================================================

class TestShortcutVerification:
    """Test shortcut verification functionality."""

    def test_checks_desktop_shortcut(self, test_script_content):
        """Test that the script checks desktop shortcut."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'desktop|Desktop|\.lnk',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check desktop shortcut"

    def test_checks_start_menu(self, test_script_content):
        """Test that the script checks Start Menu shortcuts."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'Start.*Menu|Programs|StartMenu',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check Start Menu"


# =============================================================================
# Test: Health Check
# =============================================================================

class TestHealthCheck:
    """Test health check functionality."""

    def test_performs_health_check(self, test_script_content):
        """Test that the script performs health check."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'health|Health|/health|status',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should perform health check"

    def test_checks_api_endpoint(self, test_script_content):
        """Test that the script checks API endpoint."""
        assert test_script_content is not None, "Script should exist"
        has_check = re.search(r'localhost|http|api|endpoint|Invoke-WebRequest|curl',
                              test_script_content, re.IGNORECASE)
        assert has_check, "Script should check API endpoint"


# =============================================================================
# Test: Test Report Generation
# =============================================================================

class TestReportGeneration:
    """Test report generation functionality."""

    def test_generates_report(self, test_script_content):
        """Test that the script generates a test report."""
        assert test_script_content is not None, "Script should exist"
        has_report = re.search(r'report|Report|result|summary',
                               test_script_content, re.IGNORECASE)
        assert has_report, "Script should generate test report"

    def test_outputs_pass_fail(self, test_script_content):
        """Test that the script outputs pass/fail status."""
        assert test_script_content is not None, "Script should exist"
        has_status = re.search(r'pass|fail|PASS|FAIL|success|Success',
                               test_script_content, re.IGNORECASE)
        assert has_status, "Script should output pass/fail status"

    def test_counts_tests(self, test_script_content):
        """Test that the script counts tests."""
        assert test_script_content is not None, "Script should exist"
        has_count = re.search(r'count|total|passed|failed|\d+.*test',
                              test_script_content, re.IGNORECASE)
        assert has_count, "Script should count tests"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, test_script_content):
        """Test that the script uses try-catch blocks."""
        assert test_script_content is not None, "Script should exist"
        assert 'try' in test_script_content.lower() and 'catch' in test_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, test_script_content):
        """Test that the script returns appropriate exit codes."""
        assert test_script_content is not None, "Script should exist"
        has_exit = 'exit' in test_script_content.lower()
        assert has_exit, "Script should use exit codes"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, test_script_content):
        """Test that the script has logging/output."""
        assert test_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in test_script_content or \
                      'Write-Output' in test_script_content or \
                      'Write-Verbose' in test_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_test_names(self, test_script_content):
        """Test that the script logs test names."""
        assert test_script_content is not None, "Script should exist"
        has_names = re.search(r'Test:|Checking|Verifying|Testing',
                              test_script_content, re.IGNORECASE)
        assert has_names, "Script should log test names"


# =============================================================================
# Test: Windows 10/11 Specific
# =============================================================================

class TestWindowsSpecific:
    """Test Windows 10/11 specific functionality."""

    def test_references_windows_10(self, test_script_content):
        """Test that the script references Windows 10."""
        assert test_script_content is not None, "Script should exist"
        has_win10 = re.search(r'Windows 10|Win10|10\.0',
                              test_script_content, re.IGNORECASE)
        assert has_win10, "Script should reference Windows 10"

    def test_references_windows_11(self, test_script_content):
        """Test that the script references Windows 11."""
        assert test_script_content is not None, "Script should exist"
        has_win11 = re.search(r'Windows 11|Win11|22000|22621',
                              test_script_content, re.IGNORECASE)
        assert has_win11, "Script should reference Windows 11"


# =============================================================================
# Test: Clean Machine Validation
# =============================================================================

class TestCleanMachineValidation:
    """Test clean machine validation functionality."""

    def test_checks_prerequisites(self, test_script_content):
        """Test that the script checks prerequisites."""
        assert test_script_content is not None, "Script should exist"
        has_prereq = re.search(r'prerequisite|requirement|depend',
                               test_script_content, re.IGNORECASE)
        assert has_prereq, "Script should check prerequisites"

    def test_validates_fresh_install(self, test_script_content):
        """Test that the script validates fresh install."""
        assert test_script_content is not None, "Script should exist"
        has_fresh = re.search(r'clean|fresh|new|install',
                              test_script_content, re.IGNORECASE)
        assert has_fresh, "Script should validate installation"
