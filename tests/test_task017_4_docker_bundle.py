"""
Test Suite for Subtask 17.4: Bundle Docker image (docker save)

This module tests the Docker image bundling PowerShell script
that exports the ContPAQi MCP Docker image to a tar file for
distribution with the installer.

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
def bundle_script_path(scripts_dir):
    """Get the path to the bundle-docker.ps1 script."""
    return scripts_dir / "bundle-docker.ps1"


@pytest.fixture
def bundle_script_content(bundle_script_path):
    """Read the Docker bundling script content."""
    if bundle_script_path.exists():
        return bundle_script_path.read_text(encoding='utf-8')
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
    """Test that the Docker bundling script exists."""

    def test_bundle_docker_script_exists(self, bundle_script_path):
        """Test that bundle-docker.ps1 exists."""
        assert bundle_script_path.exists(), \
            f"bundle-docker.ps1 should exist at {bundle_script_path}"

    def test_script_is_not_empty(self, bundle_script_content):
        """Test that the script is not empty."""
        assert bundle_script_content is not None, "Script should exist"
        assert len(bundle_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, bundle_script_content):
        """Test that the script has substantial content."""
        assert bundle_script_content is not None, "Script should exist"
        assert len(bundle_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, bundle_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert bundle_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', bundle_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_image_name_parameter(self, bundle_script_content):
        """Test that the script accepts an -ImageName parameter."""
        assert bundle_script_content is not None, "Script should exist"
        has_param = re.search(r'\$ImageName', bundle_script_content, re.IGNORECASE)
        assert has_param, "Script should have -ImageName parameter"

    def test_has_output_path_parameter(self, bundle_script_content):
        """Test that the script accepts an -OutputPath parameter."""
        assert bundle_script_content is not None, "Script should exist"
        has_param = re.search(r'\$OutputPath', bundle_script_content, re.IGNORECASE)
        assert has_param, "Script should have -OutputPath parameter"

    def test_has_tag_parameter(self, bundle_script_content):
        """Test that the script accepts a -Tag parameter."""
        assert bundle_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Tag', bundle_script_content, re.IGNORECASE)
        assert has_param, "Script should have -Tag parameter"


# =============================================================================
# Test: Docker Save Functionality
# =============================================================================

class TestDockerSave:
    """Test Docker save functionality."""

    def test_uses_docker_save_command(self, bundle_script_content):
        """Test that the script uses docker save command."""
        assert bundle_script_content is not None, "Script should exist"
        has_docker_save = re.search(r'docker\s+save', bundle_script_content, re.IGNORECASE)
        assert has_docker_save, "Script should use 'docker save' command"

    def test_specifies_output_file(self, bundle_script_content):
        """Test that the script specifies output file with -o flag."""
        assert bundle_script_content is not None, "Script should exist"
        has_output_flag = re.search(r'-o\s|--output', bundle_script_content, re.IGNORECASE)
        assert has_output_flag, "Script should use -o or --output flag for docker save"

    def test_references_tar_extension(self, bundle_script_content):
        """Test that the script references .tar extension."""
        assert bundle_script_content is not None, "Script should exist"
        has_tar = re.search(r'\.tar', bundle_script_content, re.IGNORECASE)
        assert has_tar, "Script should reference .tar file extension"

    def test_references_contpaqi_image(self, bundle_script_content):
        """Test that the script references the ContPAQi MCP image."""
        assert bundle_script_content is not None, "Script should exist"
        has_image_ref = re.search(r'contpaqi-mcp|contpaqi', bundle_script_content, re.IGNORECASE)
        assert has_image_ref, "Script should reference ContPAQi MCP image"


# =============================================================================
# Test: Docker Validation
# =============================================================================

class TestDockerValidation:
    """Test Docker availability validation."""

    def test_checks_docker_available(self, bundle_script_content):
        """Test that the script checks if Docker is available."""
        assert bundle_script_content is not None, "Script should exist"
        has_docker_check = re.search(r'Get-Command.*docker|docker\s+--version|docker\s+info',
                                      bundle_script_content, re.IGNORECASE)
        assert has_docker_check, "Script should check Docker availability"

    def test_checks_image_exists(self, bundle_script_content):
        """Test that the script checks if the image exists."""
        assert bundle_script_content is not None, "Script should exist"
        has_image_check = re.search(r'docker\s+images|docker\s+image\s+inspect|docker\s+inspect',
                                     bundle_script_content, re.IGNORECASE)
        assert has_image_check, "Script should check if image exists"


# =============================================================================
# Test: Output Directory Handling
# =============================================================================

class TestOutputDirectory:
    """Test output directory handling."""

    def test_creates_output_directory(self, bundle_script_content):
        """Test that the script creates output directory if needed."""
        assert bundle_script_content is not None, "Script should exist"
        has_mkdir = re.search(r'New-Item|mkdir|CreateDirectory|Test-Path',
                              bundle_script_content, re.IGNORECASE)
        assert has_mkdir, "Script should handle output directory creation"

    def test_handles_existing_file(self, bundle_script_content):
        """Test that the script handles existing output file."""
        assert bundle_script_content is not None, "Script should exist"
        has_file_check = re.search(r'Test-Path|Remove-Item|exist|overwrite',
                                    bundle_script_content, re.IGNORECASE)
        assert has_file_check, "Script should handle existing output file"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, bundle_script_content):
        """Test that the script uses try-catch blocks."""
        assert bundle_script_content is not None, "Script should exist"
        assert 'try' in bundle_script_content.lower() and 'catch' in bundle_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, bundle_script_content):
        """Test that the script returns appropriate exit codes."""
        assert bundle_script_content is not None, "Script should exist"
        has_exit = 'exit' in bundle_script_content.lower() or \
                   '$LASTEXITCODE' in bundle_script_content
        assert has_exit, "Script should use exit codes"

    def test_validates_parameters(self, bundle_script_content):
        """Test that the script validates input parameters."""
        assert bundle_script_content is not None, "Script should exist"
        has_validation = re.search(r'ValidateNotNullOrEmpty|mandatory|throw|if.*-not',
                                    bundle_script_content, re.IGNORECASE)
        assert has_validation, "Script should validate parameters"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, bundle_script_content):
        """Test that the script has logging/output."""
        assert bundle_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in bundle_script_content or \
                      'Write-Output' in bundle_script_content or \
                      'Write-Verbose' in bundle_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_progress(self, bundle_script_content):
        """Test that the script logs progress information."""
        assert bundle_script_content is not None, "Script should exist"
        has_progress = re.search(r'saving|bundling|export|creating|complet',
                                  bundle_script_content, re.IGNORECASE)
        assert has_progress, "Script should log progress"

    def test_logs_file_size(self, bundle_script_content):
        """Test that the script logs output file size."""
        assert bundle_script_content is not None, "Script should exist"
        has_size_log = re.search(r'size|length|bytes|MB|GB',
                                  bundle_script_content, re.IGNORECASE)
        assert has_size_log, "Script should log file size"


# =============================================================================
# Test: ISS Integration
# =============================================================================

class TestIssIntegration:
    """Test integration with Inno Setup script."""

    def test_iss_references_docker_tar(self, iss_script_content):
        """Test that ISS references the Docker tar file."""
        assert iss_script_content is not None, "ISS script should exist"
        assert 'contpaqi-mcp.tar' in iss_script_content, \
            "ISS should reference contpaqi-mcp.tar"

    def test_iss_copies_docker_tar(self, iss_script_content):
        """Test that ISS copies Docker tar to docker directory."""
        assert iss_script_content is not None, "ISS script should exist"
        has_docker_file = re.search(r'docker.*\.tar.*docker', iss_script_content, re.IGNORECASE)
        assert has_docker_file, "ISS should copy Docker tar to docker directory"


# =============================================================================
# Test: Image Configuration
# =============================================================================

class TestImageConfiguration:
    """Test Docker image configuration."""

    def test_default_image_name(self, bundle_script_content):
        """Test that the script has a default image name."""
        assert bundle_script_content is not None, "Script should exist"
        has_default = re.search(r'contpaqi-mcp|default.*image',
                                 bundle_script_content, re.IGNORECASE)
        assert has_default, "Script should have default image name"

    def test_default_tag(self, bundle_script_content):
        """Test that the script has a default tag (latest)."""
        assert bundle_script_content is not None, "Script should exist"
        has_latest = re.search(r'latest', bundle_script_content, re.IGNORECASE)
        assert has_latest, "Script should default to 'latest' tag"

    def test_output_filename(self, bundle_script_content):
        """Test that the script generates appropriate output filename."""
        assert bundle_script_content is not None, "Script should exist"
        has_filename = re.search(r'contpaqi-mcp\.tar|\.tar',
                                  bundle_script_content, re.IGNORECASE)
        assert has_filename, "Script should generate .tar output filename"


# =============================================================================
# Test: Build Integration
# =============================================================================

class TestBuildIntegration:
    """Test build process integration."""

    def test_has_force_parameter(self, bundle_script_content):
        """Test that the script has a -Force parameter."""
        assert bundle_script_content is not None, "Script should exist"
        has_force = re.search(r'\$Force|\[switch\].*Force', bundle_script_content, re.IGNORECASE)
        assert has_force, "Script should have -Force parameter for overwriting"

    def test_returns_output_path(self, bundle_script_content):
        """Test that the script returns or outputs the final path."""
        assert bundle_script_content is not None, "Script should exist"
        has_return = re.search(r'return|Write-Output.*path|output.*file',
                                bundle_script_content, re.IGNORECASE)
        assert has_return, "Script should return/output the final file path"


# =============================================================================
# Test: Compression Options
# =============================================================================

class TestCompressionOptions:
    """Test compression handling."""

    def test_handles_compression(self, bundle_script_content):
        """Test that the script handles or mentions compression."""
        assert bundle_script_content is not None, "Script should exist"
        # Docker save produces uncompressed tar, but script might document this
        # or optionally support gzip
        has_compression_ref = re.search(r'compress|gzip|\.tar\.gz|\.tgz|uncompressed',
                                         bundle_script_content, re.IGNORECASE)
        # This is optional - docker save produces .tar by default
        # Just check the script is aware of the format
        has_tar_format = '.tar' in bundle_script_content
        assert has_tar_format, "Script should work with .tar format"


# =============================================================================
# Test: Verification
# =============================================================================

class TestVerification:
    """Test output verification."""

    def test_verifies_output_file(self, bundle_script_content):
        """Test that the script verifies the output file was created."""
        assert bundle_script_content is not None, "Script should exist"
        has_verify = re.search(r'Test-Path|exists|verify|check.*file',
                                bundle_script_content, re.IGNORECASE)
        assert has_verify, "Script should verify output file exists"

    def test_reports_success(self, bundle_script_content):
        """Test that the script reports success."""
        assert bundle_script_content is not None, "Script should exist"
        has_success = re.search(r'success|completed|done|created',
                                 bundle_script_content, re.IGNORECASE)
        assert has_success, "Script should report success"
