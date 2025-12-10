"""
Test Suite for Subtask 17.9: Code sign the installer

This module tests the code signing PowerShell script that signs
Windows executables and installers with a code signing certificate.

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
def signing_script_path(scripts_dir):
    """Get the path to the code-sign.ps1 script."""
    return scripts_dir / "code-sign.ps1"


@pytest.fixture
def signing_script_content(signing_script_path):
    """Read the code signing script content."""
    if signing_script_path.exists():
        return signing_script_path.read_text(encoding='utf-8')
    return None


# =============================================================================
# Test: Script File Existence
# =============================================================================

class TestScriptExists:
    """Test that the code signing script exists."""

    def test_signing_script_exists(self, signing_script_path):
        """Test that code-sign.ps1 exists."""
        assert signing_script_path.exists(), \
            f"code-sign.ps1 should exist at {signing_script_path}"

    def test_script_is_not_empty(self, signing_script_content):
        """Test that the script is not empty."""
        assert signing_script_content is not None, "Script should exist"
        assert len(signing_script_content.strip()) > 0, "Script should not be empty"

    def test_script_has_minimum_length(self, signing_script_content):
        """Test that the script has substantial content."""
        assert signing_script_content is not None, "Script should exist"
        assert len(signing_script_content) > 300, \
            "Script should have substantial content (>300 chars)"


# =============================================================================
# Test: PowerShell Script Structure
# =============================================================================

class TestScriptStructure:
    """Test the PowerShell script structure and syntax."""

    def test_has_param_block(self, signing_script_content):
        """Test that the script has a param block for command-line parameters."""
        assert signing_script_content is not None, "Script should exist"
        assert re.search(r'param\s*\(', signing_script_content, re.IGNORECASE), \
            "Script should have a param() block"

    def test_has_file_path_parameter(self, signing_script_content):
        """Test that the script accepts a -FilePath parameter."""
        assert signing_script_content is not None, "Script should exist"
        has_param = re.search(r'\$FilePath|\$Path|\$File', signing_script_content, re.IGNORECASE)
        assert has_param, "Script should have -FilePath parameter"

    def test_has_certificate_parameter(self, signing_script_content):
        """Test that the script accepts certificate parameters."""
        assert signing_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Certificate|\$CertPath|\$PfxPath|\$Cert',
                              signing_script_content, re.IGNORECASE)
        assert has_param, "Script should have certificate parameter"

    def test_has_password_parameter(self, signing_script_content):
        """Test that the script accepts a password parameter."""
        assert signing_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Password|\$CertPassword|\$PfxPassword',
                              signing_script_content, re.IGNORECASE)
        assert has_param, "Script should have password parameter"

    def test_has_timestamp_parameter(self, signing_script_content):
        """Test that the script accepts a timestamp server parameter."""
        assert signing_script_content is not None, "Script should exist"
        has_param = re.search(r'\$Timestamp|\$TimestampServer|\$TSA',
                              signing_script_content, re.IGNORECASE)
        assert has_param, "Script should have timestamp parameter"


# =============================================================================
# Test: Signing Tool Detection
# =============================================================================

class TestSigningToolDetection:
    """Test signing tool detection functionality."""

    def test_references_signtool(self, signing_script_content):
        """Test that the script references signtool."""
        assert signing_script_content is not None, "Script should exist"
        has_signtool = re.search(r'signtool|SignTool', signing_script_content)
        assert has_signtool, "Script should reference signtool"

    def test_searches_for_signtool(self, signing_script_content):
        """Test that the script searches for signtool location."""
        assert signing_script_content is not None, "Script should exist"
        has_search = re.search(r'Windows Kits|SDK|Get-ChildItem.*signtool|Program Files',
                               signing_script_content, re.IGNORECASE)
        assert has_search, "Script should search for signtool"

    def test_validates_signtool_exists(self, signing_script_content):
        """Test that the script validates signtool exists."""
        assert signing_script_content is not None, "Script should exist"
        has_validation = re.search(r'Test-Path|exist|found|not found',
                                   signing_script_content, re.IGNORECASE)
        assert has_validation, "Script should validate signtool exists"


# =============================================================================
# Test: Certificate Handling
# =============================================================================

class TestCertificateHandling:
    """Test certificate handling functionality."""

    def test_supports_pfx_certificate(self, signing_script_content):
        """Test that the script supports PFX certificate files."""
        assert signing_script_content is not None, "Script should exist"
        has_pfx = re.search(r'\.pfx|PFX|PKCS12', signing_script_content, re.IGNORECASE)
        assert has_pfx, "Script should support PFX certificates"

    def test_validates_certificate_exists(self, signing_script_content):
        """Test that the script validates certificate exists."""
        assert signing_script_content is not None, "Script should exist"
        has_validation = re.search(r'Test-Path.*cert|certificate.*exist|not found',
                                   signing_script_content, re.IGNORECASE)
        assert has_validation, "Script should validate certificate exists"

    def test_handles_certificate_password(self, signing_script_content):
        """Test that the script handles certificate password."""
        assert signing_script_content is not None, "Script should exist"
        has_password = re.search(r'password|/p\s|SecureString',
                                 signing_script_content, re.IGNORECASE)
        assert has_password, "Script should handle certificate password"


# =============================================================================
# Test: Signing Operations
# =============================================================================

class TestSigningOperations:
    """Test code signing operations."""

    def test_performs_signing(self, signing_script_content):
        """Test that the script performs signing operation."""
        assert signing_script_content is not None, "Script should exist"
        has_sign = re.search(r'signtool\s+sign|/f\s|sign\s+/|Invoke-Sign',
                             signing_script_content, re.IGNORECASE)
        assert has_sign, "Script should perform signing"

    def test_uses_timestamp(self, signing_script_content):
        """Test that the script uses timestamp server."""
        assert signing_script_content is not None, "Script should exist"
        has_timestamp = re.search(r'/t\s|/tr\s|/td\s|timestamp|RFC3161',
                                  signing_script_content, re.IGNORECASE)
        assert has_timestamp, "Script should use timestamp server"

    def test_specifies_hash_algorithm(self, signing_script_content):
        """Test that the script specifies hash algorithm."""
        assert signing_script_content is not None, "Script should exist"
        has_hash = re.search(r'sha256|sha384|sha512|/fd\s',
                             signing_script_content, re.IGNORECASE)
        assert has_hash, "Script should specify hash algorithm"


# =============================================================================
# Test: Signature Verification
# =============================================================================

class TestSignatureVerification:
    """Test signature verification functionality."""

    def test_can_verify_signature(self, signing_script_content):
        """Test that the script can verify signatures."""
        assert signing_script_content is not None, "Script should exist"
        has_verify = re.search(r'verify|Verify|signtool.*verify|Get-AuthenticodeSignature',
                               signing_script_content, re.IGNORECASE)
        assert has_verify, "Script should be able to verify signatures"

    def test_checks_signature_status(self, signing_script_content):
        """Test that the script checks signature status."""
        assert signing_script_content is not None, "Script should exist"
        has_status = re.search(r'Valid|SignatureStatus|signed|NotSigned',
                               signing_script_content, re.IGNORECASE)
        assert has_status, "Script should check signature status"


# =============================================================================
# Test: Error Handling
# =============================================================================

class TestErrorHandling:
    """Test error handling in the script."""

    def test_has_try_catch(self, signing_script_content):
        """Test that the script uses try-catch blocks."""
        assert signing_script_content is not None, "Script should exist"
        assert 'try' in signing_script_content.lower() and 'catch' in signing_script_content.lower(), \
            "Script should use try-catch for error handling"

    def test_has_exit_codes(self, signing_script_content):
        """Test that the script returns appropriate exit codes."""
        assert signing_script_content is not None, "Script should exist"
        has_exit = 'exit' in signing_script_content.lower() or \
                   '$LASTEXITCODE' in signing_script_content
        assert has_exit, "Script should use exit codes"

    def test_handles_signing_failure(self, signing_script_content):
        """Test that the script handles signing failures."""
        assert signing_script_content is not None, "Script should exist"
        has_failure = re.search(r'fail|error|LASTEXITCODE|exception',
                                signing_script_content, re.IGNORECASE)
        assert has_failure, "Script should handle signing failures"


# =============================================================================
# Test: Logging
# =============================================================================

class TestLogging:
    """Test logging functionality in the script."""

    def test_has_logging_output(self, signing_script_content):
        """Test that the script has logging/output."""
        assert signing_script_content is not None, "Script should exist"
        has_logging = 'Write-Host' in signing_script_content or \
                      'Write-Output' in signing_script_content or \
                      'Write-Verbose' in signing_script_content
        assert has_logging, "Script should have logging output"

    def test_logs_signing_result(self, signing_script_content):
        """Test that the script logs signing results."""
        assert signing_script_content is not None, "Script should exist"
        has_result = re.search(r'success|signed|complete|failed',
                               signing_script_content, re.IGNORECASE)
        assert has_result, "Script should log signing results"


# =============================================================================
# Test: Batch Signing Support
# =============================================================================

class TestBatchSigning:
    """Test batch signing functionality."""

    def test_supports_multiple_files(self, signing_script_content):
        """Test that the script can sign multiple files."""
        assert signing_script_content is not None, "Script should exist"
        has_batch = re.search(r'foreach|ForEach|\[\]|array|multiple|files',
                              signing_script_content, re.IGNORECASE)
        assert has_batch, "Script should support multiple files"

    def test_supports_directory_signing(self, signing_script_content):
        """Test that the script can sign files in a directory."""
        assert signing_script_content is not None, "Script should exist"
        has_dir = re.search(r'Get-ChildItem|directory|folder|\*\.exe|\*\.dll',
                            signing_script_content, re.IGNORECASE)
        assert has_dir, "Script should support directory signing"


# =============================================================================
# Test: Timestamp Servers
# =============================================================================

class TestTimestampServers:
    """Test timestamp server configuration."""

    def test_has_default_timestamp_server(self, signing_script_content):
        """Test that the script has a default timestamp server."""
        assert signing_script_content is not None, "Script should exist"
        has_default = re.search(r'http.*timestamp|digicert|comodo|sectigo|verisign',
                                signing_script_content, re.IGNORECASE)
        assert has_default, "Script should have default timestamp server"


# =============================================================================
# Test: File Type Support
# =============================================================================

class TestFileTypeSupport:
    """Test supported file types for signing."""

    def test_supports_exe_files(self, signing_script_content):
        """Test that the script supports EXE files."""
        assert signing_script_content is not None, "Script should exist"
        has_exe = re.search(r'\.exe|EXE', signing_script_content, re.IGNORECASE)
        assert has_exe, "Script should support EXE files"

    def test_supports_dll_files(self, signing_script_content):
        """Test that the script supports DLL files."""
        assert signing_script_content is not None, "Script should exist"
        has_dll = re.search(r'\.dll|DLL', signing_script_content, re.IGNORECASE)
        assert has_dll, "Script should support DLL files"

    def test_supports_msi_files(self, signing_script_content):
        """Test that the script supports MSI files."""
        assert signing_script_content is not None, "Script should exist"
        has_msi = re.search(r'\.msi|MSI', signing_script_content, re.IGNORECASE)
        assert has_msi, "Script should support MSI files"


# =============================================================================
# Test: Quiet Mode
# =============================================================================

class TestQuietMode:
    """Test quiet/silent mode support."""

    def test_has_quiet_parameter(self, signing_script_content):
        """Test that the script has quiet mode parameter."""
        assert signing_script_content is not None, "Script should exist"
        has_quiet = re.search(r'\$Quiet|\$Silent', signing_script_content, re.IGNORECASE)
        assert has_quiet, "Script should have quiet mode parameter"
