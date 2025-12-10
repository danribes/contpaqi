"""
Test Suite for Subtask 17.5: Implement silent Docker image loading

This module tests the Docker image loading PowerShell script
that loads the bundled ContPAQi MCP Docker image during installation.

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
def load_script_path(scripts_dir):
    """Get the path to the load-docker-image.ps1 script."""
    return scripts_dir / "load-docker-image.ps1"


@pytest.fixture
def load_script_content(load_script_path):
    """Read the Docker loading script content."""
    if load_script_path.exists():
        return load_script_path.read_text(encoding='utf-8')
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
    """Test that the Docker loading script exists."""

    def test_load_docker_script_exists(self, load_script_path):
        """Test that load-docker-image.ps1 exists."""
        assert load_script_path.exists(), \
            f"load-docker-image.ps1 should exist at {load_script_path}"

    def test_script_is_not_empty(self, load_script_content):
        """Test that the script is not empty."""
        assert load_script_content is not None, "Script should exist"
        assert len(load_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, load_script_content):
        """Test that the script has substantial content."""
        assert load_script_content is not None, "Script should exist"
        assert len(load_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, load_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert load_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', load_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_image_path_parameter(self, load_script_content):
        """Test that the script accepts an -ImagePath parameter."""
        assert load_script_content is not None, "Script should exist"
        has_param = re.search(r'\$ImagePath', load_script_content, re.IGNORECASE)
        assert has_param, "Script should have -ImagePath parameter"

    def test_has_quiet_parameter(self, load_script_content):
        """Test that the script accepts a -Quiet parameter for silent mode."""
        assert load_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Quiet|\$Silent', load_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Quiet or -Silent parameter"


# =============================================================================
# Test: Docker Load Functionality
# =============================================================================

class TestDockerLoad:
    """Test Docker load functionality."""

    def test_uses_docker_load_command(self, load_script_content):
        """Test that the script uses docker load command."""
        assert load_script_content is not None, "Script should exist"
        has_docker_load = re.search(r'docker\s+load', load_script_content, re.IGNORECASE)
        assert has_docker_load, "Script should use 'docker load' command"

    def test_specifies_input_file(self, load_script_content):
        """Test that the script specifies input file with -i flag."""
        assert load_script_content is not None, "Script should exist"
        has_input_flag = re.search(r'-i\s|--input', load_script_content, re.IGNORECASE)
        assert has_input_flag, "Script should use -i or --input flag for docker load"

    def test_references_tar_file(self, load_script_content):
        """Test that the script references .tar file."""
        assert load_script_content is not None, "Script should exist"
        has_tar = re.search(r'\.tar', load_script_content, re.IGNORECASE)
        assert has_tar, "Script should reference .tar file"

    def test_references_contpaqi_image(self, load_script_content):
        """Test that the script references the ContPAQi MCP image."""
        assert load_script_content is not None, "Script should exist"
        has_image_ref = re.search(r'contpaqi-mcp|contpaqi', load_script_content, re.IGNORECASE)
        assert has_image_ref, "Script should reference ContPAQi MCP image"


# =============================================================================
# Test: Docker Validation
# =============================================================================

class TestDockerValidation:
    """Test Docker availability validation."""

    def test_checks_docker_available(self, load_script_content):
        """Test that the script checks if Docker is available."""
        assert load_script_content is not None, "Script should exist"
        has_docker_check = re.search(r'Get-Command.*docker|docker\s+--version|docker\s+info',
                                      load_script_content, re.IGNORECASE)
        assert has_docker_check, "Script should check Docker availability"

    def test_checks_docker_running(self, load_script_content):
        """Test that the script checks if Docker daemon is running."""
        assert load_script_content is not None, "Script should exist"
        has_running_check = re.search(r'docker\s+info|daemon|running',
                                       load_script_content, re.IGNORECASE)
        assert has_running_check, "Script should check if Docker is running"


# =============================================================================
# Test: Input File Validation
# =============================================================================

class TestInputValidation:
    """Test input file validation."""

    def test_checks_file_exists(self, load_script_content):
        """Test that the script checks if input file exists."""
        assert load_script_content is not None, "Script should exist"
        has_file_check = re.search(r'Test-Path|exist|file',
                                    load_script_content, re.IGNORECASE)
        assert has_file_check, "Script should check if input file exists"

    def test_handles_missing_file(self, load_script_content):
        """Test that the script handles missing input file."""
        assert load_script_content is not None, "Script should exist"
        has_error_handling = re.search(r'not.*found|not.*exist|error|throw',
                                        load_script_content, re.IGNORECASE)
        assert has_error_handling, "Script should handle missing file error"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, load_script_content):
        """Test that the script uses try-catch blocks."""
        assert load_script_content is not None, "Script should exist"
        assert 'try' in load_script_content.lower() and 'catch' in load_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, load_script_content):
        """Test that the script returns appropriate exit codes."""
        assert load_script_content is not None, "Script should exist"
        has_exit = 'exit' in load_script_content.lower() or \
                   '$LASTEXITCODE' in load_script_content
        assert has_exit, "Script should use exit codes"

    def test_handles_load_failure(self, load_script_content):
        """Test that the script handles docker load failure."""
        assert load_script_content is not None, "Script should exist"
        has_failure_handling = re.search(r'fail|error|LASTEXITCODE',
                                          load_script_content, re.IGNORECASE)
        assert has_failure_handling, "Script should handle load failures"


# =============================================================================
# Test: Silent Mode
# =============================================================================

class TestSilentMode:
    """Test silent/quiet mode functionality."""

    def test_supports_silent_execution(self, load_script_content):
        """Test that the script supports silent execution."""
        assert load_script_content is not None, "Script should exist"
        has_silent = re.search(r'quiet|silent|hidden', load_script_content, re.IGNORECASE)
        assert has_silent, "Script should support silent execution"

    def test_can_suppress_output(self, load_script_content):
        """Test that output can be suppressed."""
        assert load_script_content is not None, "Script should exist"
        # Check for conditional logging based on quiet mode
        has_conditional = re.search(r'if.*quiet|Write-Host|Write-Output',
                                     load_script_content, re.IGNORECASE)
        assert has_conditional, "Script should be able to suppress output"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, load_script_content):
        """Test that the script has logging/output."""
        assert load_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in load_script_content or \
                      'Write-Output' in load_script_content or \
                      'Write-Verbose' in load_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_progress(self, load_script_content):
        """Test that the script logs progress information."""
        assert load_script_content is not None, "Script should exist"
        has_progress = re.search(r'loading|import|progress|complet',
                                  load_script_content, re.IGNORECASE)
        assert has_progress, "Script should log progress"

    def test_logs_success(self, load_script_content):
        """Test that the script logs success."""
        assert load_script_content is not None, "Script should exist"
        has_success = re.search(r'success|loaded|complete|done',
                                 load_script_content, re.IGNORECASE)
        assert has_success, "Script should log success"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_references_load_script(self, iss_script_content):
        """Test that ISS references the load-docker-image.ps1 script."""
        assert iss_script_content is not None, "ISS script should exist"
        assert 'load-docker-image.ps1' in iss_script_content, \
            "ISS should reference load-docker-image.ps1"

    def test_iss_runs_after_file_copy(self, iss_script_content):
        """Test that ISS runs load script in [Run] section."""
        assert iss_script_content is not None, "ISS script should exist"
        # Should be in [Run] section for post-install
        has_run_section = re.search(r'\[Run\].*load-docker-image',
                                     iss_script_content, re.DOTALL)
        assert has_run_section, "ISS should run load script in [Run] section"

    def test_iss_checks_docker_installed(self, iss_script_content):
        """Test that ISS only runs if Docker is installed."""
        assert iss_script_content is not None, "ISS script should exist"
        has_docker_check = re.search(r'load-docker.*Check.*Docker|DockerInstalled',
                                      iss_script_content, re.DOTALL)
        assert has_docker_check, "ISS should check Docker before loading image"


# =============================================================================
# Test: Image Verification
# =============================================================================

class TestImageVerification:
    """Test loaded image verification."""

    def test_verifies_image_loaded(self, load_script_content):
        """Test that the script verifies the image was loaded."""
        assert load_script_content is not None, "Script should exist"
        has_verify = re.search(r'docker\s+images|docker\s+image|verify|check',
                                load_script_content, re.IGNORECASE)
        assert has_verify, "Script should verify image was loaded"

    def test_reports_image_info(self, load_script_content):
        """Test that the script reports loaded image info."""
        assert load_script_content is not None, "Script should exist"
        has_info = re.search(r'image|tag|loaded|size',
                              load_script_content, re.IGNORECASE)
        assert has_info, "Script should report image information"


# =============================================================================
# Test: Default Paths
# =============================================================================

class TestDefaultPaths:
    """Test default path handling."""

    def test_has_default_image_path(self, load_script_content):
        """Test that the script has a default image path."""
        assert load_script_content is not None, "Script should exist"
        has_default = re.search(r'docker.*\.tar|default|PSScriptRoot',
                                 load_script_content, re.IGNORECASE)
        assert has_default, "Script should have default image path"

    def test_references_docker_directory(self, load_script_content):
        """Test that the script references the docker directory."""
        assert load_script_content is not None, "Script should exist"
        has_docker_dir = re.search(r'docker|\.tar',
                                    load_script_content, re.IGNORECASE)
        assert has_docker_dir, "Script should reference docker directory or tar file"


# =============================================================================
# Test: Force/Skip Options
# =============================================================================

class TestForceOptions:
    """Test force and skip options."""

    def test_has_force_parameter(self, load_script_content):
        """Test that the script has a -Force parameter."""
        assert load_script_content is not None, "Script should exist"
        has_force = re.search(r'\$Force', load_script_content, re.IGNORECASE)
        assert has_force, "Script should have -Force parameter"

    def test_can_skip_if_loaded(self, load_script_content):
        """Test that the script can skip if image already loaded."""
        assert load_script_content is not None, "Script should exist"
        has_skip = re.search(r'already|exist|skip|loaded',
                              load_script_content, re.IGNORECASE)
        assert has_skip, "Script should be able to skip if image exists"
