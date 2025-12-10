"""
Tests for Subtask 17.2: Implement Docker Desktop Prerequisite Check

Tests verify:
- Docker detection logic in ISS script
- PowerShell helper script for Docker checks
- Version detection and validation
- Running state detection
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
SCRIPTS_DIR = INSTALLER_DIR / 'scripts'
DOCKER_CHECK_SCRIPT = SCRIPTS_DIR / 'check-docker.ps1'


# =============================================================================
# ISS Docker Detection Tests
# =============================================================================

class TestISSDockerDetection:
    """Tests for Docker detection in ISS script."""

    def test_iss_has_docker_installed_function(self):
        """ISS should have DockerInstalled function."""
        content = ISS_FILE.read_text()
        assert 'function DockerInstalled' in content, \
            "Missing DockerInstalled function"

    def test_docker_installed_checks_file_paths(self):
        """DockerInstalled should check common file paths."""
        content = ISS_FILE.read_text()

        # Should check Program Files path
        has_pf = 'Docker Desktop.exe' in content
        assert has_pf, "Should check Docker Desktop.exe path"

    def test_docker_installed_checks_registry(self):
        """DockerInstalled should check registry."""
        content = ISS_FILE.read_text()

        has_reg = 'RegKeyExists' in content or 'HKEY_LOCAL_MACHINE' in content
        assert has_reg, "Should check Docker registry key"

    def test_iss_has_get_docker_version_function(self):
        """ISS should have GetDockerVersion function."""
        content = ISS_FILE.read_text()
        assert 'function GetDockerVersion' in content or 'GetDockerVersion' in content, \
            "Missing GetDockerVersion function"

    def test_iss_has_docker_page(self):
        """ISS should create Docker status page."""
        content = ISS_FILE.read_text()
        assert 'DockerPage' in content, "Missing Docker wizard page"

    def test_docker_page_shows_status(self):
        """Docker page should show installation status."""
        content = ISS_FILE.read_text()
        assert 'DockerStatus' in content, "Missing Docker status display"


# =============================================================================
# PowerShell Docker Check Script Tests
# =============================================================================

class TestDockerCheckScript:
    """Tests for PowerShell Docker check script."""

    def test_script_exists(self):
        """Docker check script should exist."""
        assert DOCKER_CHECK_SCRIPT.exists(), \
            f"Script not found: {DOCKER_CHECK_SCRIPT}"

    def test_script_is_powershell(self):
        """Script should be PowerShell."""
        assert DOCKER_CHECK_SCRIPT.suffix == '.ps1', \
            "Script should be PowerShell (.ps1)"

    def test_script_checks_docker_installed(self):
        """Script should check if Docker is installed."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_check = 'docker' in content.lower() and \
                   ('installed' in content.lower() or 'exists' in content.lower() or
                    'Test-Path' in content or 'Get-Command' in content)

        assert has_check, "Script should check Docker installation"

    def test_script_checks_docker_running(self):
        """Script should check if Docker daemon is running."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_running_check = 'running' in content.lower() or \
                          'docker info' in content.lower() or \
                          'docker ps' in content.lower() or \
                          'service' in content.lower()

        assert has_running_check, "Script should check if Docker is running"

    def test_script_gets_docker_version(self):
        """Script should get Docker version."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_version = 'version' in content.lower() or \
                     'docker --version' in content.lower()

        assert has_version, "Script should get Docker version"

    def test_script_has_error_handling(self):
        """Script should have error handling."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_error_handling = '$ErrorActionPreference' in content or \
                           'try' in content.lower() or \
                           '-ErrorAction' in content

        assert has_error_handling, "Script should have error handling"

    def test_script_returns_status(self):
        """Script should return status information."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_return = 'return' in content.lower() or \
                    'Write-Output' in content or \
                    'exit' in content.lower()

        assert has_return, "Script should return status"


# =============================================================================
# Docker Version Validation Tests
# =============================================================================

class TestDockerVersionValidation:
    """Tests for Docker version validation."""

    def test_script_validates_minimum_version(self):
        """Script should validate minimum Docker version."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        # Should have version comparison logic
        has_version_check = 'version' in content.lower() and \
                          ('compare' in content.lower() or
                           '-ge' in content or '-gt' in content or
                           'minimum' in content.lower() or
                           '[version]' in content.lower())

        assert has_version_check, "Script should validate minimum version"

    def test_script_defines_minimum_version(self):
        """Script should define minimum required version."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        # Should have minimum version defined
        has_min_version = 'MinVersion' in content or \
                         'minimum' in content.lower() or \
                         re.search(r'\d+\.\d+', content)  # Version number pattern

        assert has_min_version, "Script should define minimum version"


# =============================================================================
# Docker Desktop Path Tests
# =============================================================================

class TestDockerDesktopPaths:
    """Tests for Docker Desktop path detection."""

    def test_checks_program_files_path(self):
        """Should check Program Files installation path."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_pf = 'Program Files' in content or \
                'ProgramFiles' in content or \
                '{commonpf}' in content or \
                '$env:ProgramFiles' in content

        assert has_pf, "Should check Program Files path"

    def test_checks_local_appdata_path(self):
        """Should check LocalAppData installation path."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_local = 'LocalAppData' in content or \
                   'LOCALAPPDATA' in content or \
                   '{localappdata}' in content or \
                   '$env:LOCALAPPDATA' in content

        assert has_local, "Should check LocalAppData path"

    def test_checks_docker_cli_in_path(self):
        """Should check if docker CLI is in PATH."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_path_check = 'Get-Command' in content or \
                        'where.exe' in content.lower() or \
                        'PATH' in content

        assert has_path_check, "Should check docker CLI in PATH"


# =============================================================================
# Docker Service Status Tests
# =============================================================================

class TestDockerServiceStatus:
    """Tests for Docker service status checking."""

    def test_checks_docker_service(self):
        """Should check Docker service status."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_service = 'service' in content.lower() or \
                     'Get-Service' in content or \
                     'docker info' in content.lower()

        assert has_service, "Should check Docker service"

    def test_handles_docker_not_running(self):
        """Should handle case when Docker is not running."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_not_running = 'not running' in content.lower() or \
                         'stopped' in content.lower() or \
                         'start' in content.lower()

        assert has_not_running, "Should handle Docker not running"


# =============================================================================
# Output Format Tests
# =============================================================================

class TestOutputFormat:
    """Tests for script output format."""

    def test_outputs_json_or_structured(self):
        """Script should output structured data."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_structured = 'json' in content.lower() or \
                        'PSCustomObject' in content or \
                        'hashtable' in content.lower() or \
                        '@{' in content

        assert has_structured, "Should output structured data"

    def test_outputs_installed_status(self):
        """Script should output installed status."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_installed = 'installed' in content.lower() or \
                       'IsInstalled' in content or \
                       'Installed' in content

        assert has_installed, "Should output installed status"

    def test_outputs_running_status(self):
        """Script should output running status."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_running = 'running' in content.lower() or \
                     'IsRunning' in content or \
                     'Running' in content

        assert has_running, "Should output running status"


# =============================================================================
# Documentation Tests
# =============================================================================

class TestDockerCheckDocumentation:
    """Tests for Docker check documentation."""

    def test_script_has_header_comment(self):
        """Script should have header comment."""
        content = DOCKER_CHECK_SCRIPT.read_text()
        lines = content.strip().split('\n')

        # First line should be a comment
        assert lines[0].strip().startswith('#') or lines[0].strip().startswith('<#'), \
            "Script should start with comment"

    def test_script_documents_purpose(self):
        """Script should document its purpose."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_purpose = 'docker' in content.lower() and \
                     ('check' in content.lower() or
                      'detect' in content.lower() or
                      'prerequisite' in content.lower())

        assert has_purpose, "Script should document purpose"

    def test_script_has_usage_info(self):
        """Script should have usage information."""
        content = DOCKER_CHECK_SCRIPT.read_text()

        has_usage = '.SYNOPSIS' in content or \
                   '.DESCRIPTION' in content or \
                   'usage' in content.lower() or \
                   '.EXAMPLE' in content

        assert has_usage, "Script should have usage info"
