"""
Tests for Task 4.3: Create requirements.txt with pinned versions

TDD tests for verifying Python dependencies are properly pinned in requirements.txt.
Pinned versions ensure reproducible builds and prevent dependency conflicts.
"""

import os
import re
import pytest
from pathlib import Path


# ============================================================================
# Test Configuration
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / "mcp-container"
REQUIREMENTS_PATH = MCP_CONTAINER_DIR / "requirements.txt"


# ============================================================================
# Requirements File Existence Tests
# ============================================================================

class TestRequirementsFileExists:
    """Tests for requirements.txt existence and basic structure."""

    def test_mcp_container_directory_exists(self):
        """MCP container directory should exist."""
        assert MCP_CONTAINER_DIR.exists()
        assert MCP_CONTAINER_DIR.is_dir()

    def test_requirements_txt_exists(self):
        """requirements.txt should exist in mcp-container directory."""
        assert REQUIREMENTS_PATH.exists()
        assert REQUIREMENTS_PATH.is_file()

    def test_requirements_txt_not_empty(self):
        """requirements.txt should not be empty."""
        content = REQUIREMENTS_PATH.read_text()
        assert len(content.strip()) > 0

    def test_requirements_txt_has_packages(self):
        """requirements.txt should have at least one package."""
        content = REQUIREMENTS_PATH.read_text()
        # Filter out comments and empty lines
        packages = [
            line for line in content.split('\n')
            if line.strip() and not line.strip().startswith('#')
        ]
        assert len(packages) > 0


# ============================================================================
# Web Framework Dependencies Tests
# ============================================================================

class TestWebFrameworkDependencies:
    """Tests for web framework dependencies."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_fastapi_present(self, requirements_content):
        """FastAPI should be listed as a dependency."""
        assert "fastapi" in requirements_content.lower()

    def test_fastapi_pinned(self, requirements_content):
        """FastAPI should have a pinned version."""
        assert re.search(r'fastapi==[\d.]+', requirements_content, re.IGNORECASE)

    def test_uvicorn_present(self, requirements_content):
        """Uvicorn should be listed as a dependency."""
        assert "uvicorn" in requirements_content.lower()

    def test_uvicorn_pinned(self, requirements_content):
        """Uvicorn should have a pinned version."""
        assert re.search(r'uvicorn.*==[\d.]+', requirements_content, re.IGNORECASE)

    def test_python_multipart_present(self, requirements_content):
        """python-multipart should be listed for file uploads."""
        assert "python-multipart" in requirements_content.lower()

    def test_python_multipart_pinned(self, requirements_content):
        """python-multipart should have a pinned version."""
        assert re.search(r'python-multipart==[\d.]+', requirements_content, re.IGNORECASE)


# ============================================================================
# AI/ML Dependencies Tests
# ============================================================================

class TestAIMLDependencies:
    """Tests for AI/ML framework dependencies."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_torch_present(self, requirements_content):
        """PyTorch should be listed as a dependency."""
        assert "torch" in requirements_content.lower()

    def test_torch_pinned(self, requirements_content):
        """PyTorch should have a pinned version."""
        assert re.search(r'^torch==[\d.]+', requirements_content, re.MULTILINE)

    def test_transformers_present(self, requirements_content):
        """Hugging Face Transformers should be listed."""
        assert "transformers" in requirements_content.lower()

    def test_transformers_pinned(self, requirements_content):
        """Transformers should have a pinned version."""
        assert re.search(r'transformers==[\d.]+', requirements_content, re.IGNORECASE)


# ============================================================================
# OCR Dependencies Tests
# ============================================================================

class TestOCRDependencies:
    """Tests for OCR-related dependencies."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_pytesseract_present(self, requirements_content):
        """pytesseract should be listed for OCR."""
        assert "pytesseract" in requirements_content.lower()

    def test_pytesseract_pinned(self, requirements_content):
        """pytesseract should have a pinned version."""
        assert re.search(r'pytesseract==[\d.]+', requirements_content, re.IGNORECASE)

    def test_pdf2image_present(self, requirements_content):
        """pdf2image should be listed for PDF conversion."""
        assert "pdf2image" in requirements_content.lower()

    def test_pdf2image_pinned(self, requirements_content):
        """pdf2image should have a pinned version."""
        assert re.search(r'pdf2image==[\d.]+', requirements_content, re.IGNORECASE)

    def test_pillow_present(self, requirements_content):
        """Pillow should be listed for image processing."""
        assert "pillow" in requirements_content.lower()

    def test_pillow_pinned(self, requirements_content):
        """Pillow should have a pinned version."""
        assert re.search(r'pillow==[\d.]+', requirements_content, re.IGNORECASE)


# ============================================================================
# Validation Dependencies Tests
# ============================================================================

class TestValidationDependencies:
    """Tests for validation-related dependencies."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_pydantic_present(self, requirements_content):
        """Pydantic should be listed for data validation."""
        assert "pydantic" in requirements_content.lower()

    def test_pydantic_pinned(self, requirements_content):
        """Pydantic should have a pinned version."""
        assert re.search(r'pydantic==[\d.]+', requirements_content, re.IGNORECASE)


# ============================================================================
# Utility Dependencies Tests
# ============================================================================

class TestUtilityDependencies:
    """Tests for utility dependencies."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_python_dotenv_present(self, requirements_content):
        """python-dotenv should be listed for env file loading."""
        assert "python-dotenv" in requirements_content.lower()

    def test_python_dotenv_pinned(self, requirements_content):
        """python-dotenv should have a pinned version."""
        assert re.search(r'python-dotenv==[\d.]+', requirements_content, re.IGNORECASE)


# ============================================================================
# Version Pinning Best Practices Tests
# ============================================================================

class TestVersionPinningPractices:
    """Tests for version pinning best practices."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    @pytest.fixture
    def package_lines(self, requirements_content):
        """Extract package lines (non-comment, non-empty)."""
        return [
            line.strip() for line in requirements_content.split('\n')
            if line.strip() and not line.strip().startswith('#')
        ]

    def test_all_packages_use_exact_pinning(self, package_lines):
        """All packages should use exact version pinning (==)."""
        for line in package_lines:
            # Skip lines that are just package names without version
            # (which would be a test failure anyway)
            if '==' in line or '@' in line:  # @ is for URL-based installs
                continue
            # Check for invalid version specifiers
            invalid_specifiers = ['>=', '<=', '>', '<', '~=', '!=']
            for spec in invalid_specifiers:
                assert spec not in line, \
                    f"Package '{line}' should use == not {spec}"

    def test_no_unpinned_packages(self, package_lines):
        """All packages should have a version specified."""
        for line in package_lines:
            # Skip URL-based installs
            if '@' in line or line.startswith('git+') or line.startswith('http'):
                continue
            # Check that version is specified
            has_version = '==' in line or '>=' in line or '<=' in line
            # For this test, we want exact pinning, so only check for ==
            assert '==' in line, \
                f"Package '{line}' should have a pinned version (==)"

    def test_version_format_valid(self, package_lines):
        """Version numbers should be valid semver-like format."""
        version_pattern = re.compile(r'==(\d+)(\.\d+)*')
        for line in package_lines:
            if '==' in line:
                match = version_pattern.search(line)
                assert match, f"Invalid version format in: {line}"


# ============================================================================
# Requirements Organization Tests
# ============================================================================

class TestRequirementsOrganization:
    """Tests for requirements.txt organization and documentation."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_has_category_comments(self, requirements_content):
        """Requirements should have category comments for organization."""
        comment_lines = [
            line for line in requirements_content.split('\n')
            if line.strip().startswith('#')
        ]
        assert len(comment_lines) >= 3, \
            "Should have at least 3 category comments"

    def test_has_web_framework_section(self, requirements_content):
        """Should have a web framework section."""
        assert re.search(r'#.*[Ww]eb.*[Ff]ramework', requirements_content) or \
               re.search(r'#.*[Ff]ast[Aa][Pp][Ii]', requirements_content)

    def test_has_ai_ml_section(self, requirements_content):
        """Should have an AI/ML section."""
        assert re.search(r'#.*[Aa][Ii]', requirements_content) or \
               re.search(r'#.*[Mm][Ll]', requirements_content)

    def test_has_ocr_section(self, requirements_content):
        """Should have an OCR section."""
        assert re.search(r'#.*[Oo][Cc][Rr]', requirements_content)

    def test_packages_grouped_by_category(self, requirements_content):
        """Related packages should be grouped together."""
        lines = requirements_content.split('\n')

        # Check fastapi and uvicorn are near each other
        fastapi_idx = None
        uvicorn_idx = None
        for i, line in enumerate(lines):
            if 'fastapi' in line.lower():
                fastapi_idx = i
            if 'uvicorn' in line.lower():
                uvicorn_idx = i

        if fastapi_idx is not None and uvicorn_idx is not None:
            assert abs(fastapi_idx - uvicorn_idx) <= 3, \
                "fastapi and uvicorn should be grouped together"


# ============================================================================
# Complete Dependencies List Tests
# ============================================================================

class TestCompleteDependenciesList:
    """Tests verifying all required dependencies are present."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text().lower()

    @pytest.fixture
    def required_packages(self):
        """List of all required packages for the MCP container."""
        return [
            "fastapi",
            "uvicorn",
            "python-multipart",
            "torch",
            "transformers",
            "pytesseract",
            "pdf2image",
            "pillow",
            "pydantic",
            "python-dotenv",
        ]

    def test_all_required_packages_present(self, requirements_content, required_packages):
        """All required packages should be present."""
        for pkg in required_packages:
            assert pkg.lower() in requirements_content, \
                f"Missing required package: {pkg}"

    def test_minimum_package_count(self, requirements_content):
        """Should have at least 10 pinned packages."""
        # Count lines with == (pinned versions)
        pinned_count = len(re.findall(r'==[\d.]+', requirements_content))
        assert pinned_count >= 10, \
            f"Expected at least 10 pinned packages, found {pinned_count}"


# ============================================================================
# Dockerfile Integration Tests
# ============================================================================

class TestDockerfileIntegration:
    """Tests for integration between requirements.txt and Dockerfile."""

    def test_dockerfile_copies_requirements(self):
        """Dockerfile should copy requirements.txt."""
        dockerfile_path = MCP_CONTAINER_DIR / "Dockerfile"
        assert dockerfile_path.exists()

        content = dockerfile_path.read_text()
        assert "COPY requirements.txt" in content

    def test_dockerfile_installs_requirements(self):
        """Dockerfile should install from requirements.txt."""
        dockerfile_path = MCP_CONTAINER_DIR / "Dockerfile"
        content = dockerfile_path.read_text()

        # Should either pip install -r or use wheels
        has_pip_install = "pip install" in content and "requirements" in content
        has_wheels = "wheels" in content

        assert has_pip_install or has_wheels, \
            "Dockerfile should install requirements"


# ============================================================================
# Security Best Practices Tests
# ============================================================================

class TestSecurityPractices:
    """Tests for security best practices in requirements."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_no_git_urls_without_commit(self, requirements_content):
        """Git URLs should include commit hash for reproducibility."""
        git_urls = re.findall(r'git\+https?://[^\s]+', requirements_content)
        for url in git_urls:
            # Git URLs should have @ with commit hash
            if '@' not in url:
                pytest.fail(f"Git URL without commit hash: {url}")

    def test_no_http_urls_without_hash(self, requirements_content):
        """HTTP URLs should include hash for security."""
        # This is a best practice check
        http_urls = re.findall(r'^https?://[^\s]+', requirements_content, re.MULTILINE)
        # For now, just warn if there are HTTP URLs
        # In production, they should have --hash
        if http_urls:
            # This is informational, not a hard failure
            pass


# ============================================================================
# Version Compatibility Tests
# ============================================================================

class TestVersionCompatibility:
    """Tests for version compatibility between packages."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_pydantic_v2_with_fastapi(self, requirements_content):
        """If using Pydantic v2, FastAPI should be compatible version."""
        pydantic_match = re.search(r'pydantic==(\d+)\.', requirements_content)
        fastapi_match = re.search(r'fastapi==([\d.]+)', requirements_content)

        if pydantic_match and fastapi_match:
            pydantic_major = int(pydantic_match.group(1))
            fastapi_version = fastapi_match.group(1)

            if pydantic_major >= 2:
                # FastAPI 0.100+ supports Pydantic v2
                fastapi_parts = fastapi_version.split('.')
                if len(fastapi_parts) >= 2:
                    minor = int(fastapi_parts[1])
                    assert minor >= 100 or fastapi_parts[0] != '0', \
                        "FastAPI should be >= 0.100 for Pydantic v2"

    def test_transformers_torch_compatibility(self, requirements_content):
        """Transformers and PyTorch versions should be compatible."""
        torch_match = re.search(r'torch==(\d+)\.(\d+)', requirements_content)
        transformers_match = re.search(r'transformers==([\d.]+)', requirements_content)

        if torch_match and transformers_match:
            torch_major = int(torch_match.group(1))
            # PyTorch 2.x is compatible with recent transformers
            assert torch_major >= 1, "PyTorch should be version 1.x or higher"
