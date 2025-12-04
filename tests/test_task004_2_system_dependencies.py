"""
Tests for Task 4.2: Install system dependencies (tesseract-ocr, tesseract-ocr-spa, poppler)

TDD tests for verifying system dependencies are properly configured in the Dockerfile.
These dependencies are critical for:
- tesseract-ocr: OCR text extraction from invoice images
- tesseract-ocr-spa: Spanish language support for Mexican invoices
- poppler-utils: PDF to image conversion
- libgl1-mesa-glx: OpenCV GUI dependencies
- libglib2.0-0: GLib library for image processing
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
DOCKERFILE_PATH = MCP_CONTAINER_DIR / "Dockerfile"


# ============================================================================
# Tesseract OCR Tests
# ============================================================================

class TestTesseractOCR:
    """Tests for Tesseract OCR installation in Dockerfile."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_tesseract_ocr_installed(self, dockerfile_content):
        """Dockerfile should install tesseract-ocr package."""
        assert "tesseract-ocr" in dockerfile_content

    def test_tesseract_ocr_spa_installed(self, dockerfile_content):
        """Dockerfile should install Spanish language pack for Tesseract."""
        assert "tesseract-ocr-spa" in dockerfile_content

    def test_tesseract_version_verified(self, dockerfile_content):
        """Dockerfile should verify tesseract installation with --version."""
        assert "tesseract --version" in dockerfile_content

    def test_tesseract_languages_verified(self, dockerfile_content):
        """Dockerfile should verify language packs with --list-langs."""
        assert "tesseract --list-langs" in dockerfile_content

    def test_tesseract_installed_in_runtime_stage(self, dockerfile_content):
        """Tesseract should be installed in runtime stage, not builder."""
        # Find the runtime stage (second FROM statement)
        lines = dockerfile_content.split('\n')
        in_runtime_stage = False
        tesseract_in_runtime = False

        from_count = 0
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('FROM'):
                from_count += 1
                if from_count == 2:  # Runtime stage
                    in_runtime_stage = True

            if in_runtime_stage and 'tesseract-ocr' in stripped:
                tesseract_in_runtime = True
                break

        assert tesseract_in_runtime, "tesseract-ocr should be installed in runtime stage"


# ============================================================================
# Poppler Tests
# ============================================================================

class TestPoppler:
    """Tests for Poppler PDF utilities installation."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_poppler_utils_installed(self, dockerfile_content):
        """Dockerfile should install poppler-utils for PDF conversion."""
        assert "poppler-utils" in dockerfile_content

    def test_libpoppler_cpp_dev_installed(self, dockerfile_content):
        """Dockerfile should install libpoppler-cpp-dev for PDF library."""
        assert "libpoppler-cpp-dev" in dockerfile_content

    def test_poppler_in_single_apt_get(self, dockerfile_content):
        """Poppler packages should be installed in single apt-get call."""
        # Find apt-get install command that contains poppler
        pattern = r'apt-get install.*poppler-utils'
        assert re.search(pattern, dockerfile_content, re.DOTALL)


# ============================================================================
# OpenGL/OpenCV Dependencies Tests
# ============================================================================

class TestOpenGLDependencies:
    """Tests for OpenGL and image processing dependencies."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_libgl1_mesa_glx_installed(self, dockerfile_content):
        """Dockerfile should install libgl1-mesa-glx for OpenGL support."""
        assert "libgl1-mesa-glx" in dockerfile_content

    def test_libglib2_installed(self, dockerfile_content):
        """Dockerfile should install libglib2.0-0 for GLib support."""
        assert "libglib2.0-0" in dockerfile_content


# ============================================================================
# Curl Dependency Tests
# ============================================================================

class TestCurlDependency:
    """Tests for curl installation (needed for health checks)."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_curl_installed(self, dockerfile_content):
        """Dockerfile should install curl for health checks."""
        assert "curl" in dockerfile_content

    def test_curl_used_in_healthcheck(self, dockerfile_content):
        """Curl should be used in HEALTHCHECK command."""
        healthcheck_pattern = r'HEALTHCHECK.*curl'
        assert re.search(healthcheck_pattern, dockerfile_content, re.DOTALL)


# ============================================================================
# APT Best Practices Tests
# ============================================================================

class TestAptBestPractices:
    """Tests for APT package management best practices."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_apt_get_update_before_install(self, dockerfile_content):
        """apt-get update should run before apt-get install."""
        # Find the runtime stage apt-get commands
        pattern = r'apt-get update.*apt-get install'
        assert re.search(pattern, dockerfile_content, re.DOTALL)

    def test_no_install_recommends_used(self, dockerfile_content):
        """--no-install-recommends should be used to minimize image size."""
        assert "--no-install-recommends" in dockerfile_content

    def test_apt_cache_cleaned(self, dockerfile_content):
        """APT cache should be cleaned after installation."""
        assert "rm -rf /var/lib/apt/lists/*" in dockerfile_content

    def test_all_deps_in_single_run(self, dockerfile_content):
        """All system deps should be installed in single RUN to minimize layers."""
        # Count RUN commands with apt-get install in runtime stage
        lines = dockerfile_content.split('\n')
        in_runtime_stage = False
        apt_install_count = 0

        from_count = 0
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('FROM'):
                from_count += 1
                if from_count == 2:
                    in_runtime_stage = True

            if in_runtime_stage and 'apt-get install' in line:
                apt_install_count += 1

        # Should only have one apt-get install in runtime stage
        assert apt_install_count == 1, \
            f"Expected 1 apt-get install in runtime, got {apt_install_count}"


# ============================================================================
# Complete Dependencies List Tests
# ============================================================================

class TestCompleteDependenciesList:
    """Tests verifying all required dependencies are present."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    @pytest.fixture
    def required_dependencies(self):
        """List of all required system dependencies for Task 4.2."""
        return [
            "tesseract-ocr",
            "tesseract-ocr-spa",
            "libpoppler-cpp-dev",
            "poppler-utils",
            "libgl1-mesa-glx",
            "libglib2.0-0",
        ]

    def test_all_required_deps_present(self, dockerfile_content, required_dependencies):
        """All required system dependencies should be present."""
        for dep in required_dependencies:
            assert dep in dockerfile_content, f"Missing dependency: {dep}"

    def test_dependencies_count(self, dockerfile_content, required_dependencies):
        """Should have at least 6 required system dependencies."""
        found_deps = [dep for dep in required_dependencies if dep in dockerfile_content]
        assert len(found_deps) >= 6, \
            f"Expected at least 6 dependencies, found: {found_deps}"


# ============================================================================
# Runtime Stage Dependencies Tests
# ============================================================================

class TestRuntimeStageDependencies:
    """Tests for runtime stage specific dependency configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    @pytest.fixture
    def runtime_stage_content(self, dockerfile_content):
        """Extract runtime stage content from Dockerfile."""
        lines = dockerfile_content.split('\n')
        runtime_lines = []
        in_runtime_stage = False

        from_count = 0
        for line in lines:
            if line.strip().startswith('FROM'):
                from_count += 1
                if from_count == 2:
                    in_runtime_stage = True

            if in_runtime_stage:
                runtime_lines.append(line)

        return '\n'.join(runtime_lines)

    def test_runtime_has_tesseract(self, runtime_stage_content):
        """Runtime stage should have tesseract-ocr."""
        assert "tesseract-ocr" in runtime_stage_content

    def test_runtime_has_poppler(self, runtime_stage_content):
        """Runtime stage should have poppler utilities."""
        assert "poppler-utils" in runtime_stage_content

    def test_runtime_cleans_apt_cache(self, runtime_stage_content):
        """Runtime stage should clean APT cache."""
        assert "rm -rf /var/lib/apt/lists/*" in runtime_stage_content

    def test_verification_step_present(self, runtime_stage_content):
        """Runtime stage should verify tesseract installation."""
        assert "tesseract --version" in runtime_stage_content


# ============================================================================
# Dependency Order Tests
# ============================================================================

class TestDependencyOrder:
    """Tests for proper ordering of dependency installation."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_verification_after_install(self, dockerfile_content):
        """Tesseract verification should come after installation."""
        install_pos = dockerfile_content.find("apt-get install")
        verify_pos = dockerfile_content.find("tesseract --version")

        assert install_pos < verify_pos, \
            "Tesseract verification should come after installation"

    def test_cleanup_after_install(self, dockerfile_content):
        """APT cache cleanup should be in same RUN as install."""
        # Find the RUN command with apt-get install
        lines = dockerfile_content.split('\n')
        in_runtime_stage = False
        install_run_lines = []
        collecting = False

        from_count = 0
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('FROM'):
                from_count += 1
                if from_count == 2:
                    in_runtime_stage = True

            if in_runtime_stage:
                if 'apt-get install' in line:
                    collecting = True
                    install_run_lines.append(line)
                elif collecting:
                    if stripped.startswith('RUN') or stripped.startswith('COPY') or \
                       stripped.startswith('USER') or stripped.startswith('EXPOSE') or \
                       stripped.startswith('CMD') or stripped.startswith('HEALTHCHECK'):
                        break
                    install_run_lines.append(line)

        install_run_content = '\n'.join(install_run_lines)
        assert "rm -rf /var/lib/apt/lists/*" in install_run_content, \
            "APT cache cleanup should be in same RUN command as install"


# ============================================================================
# Integration Tests
# ============================================================================

class TestDependencyIntegration:
    """Integration tests for system dependencies."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_dependencies_support_pdf_processing(self, dockerfile_content):
        """Dependencies should support full PDF processing pipeline."""
        # Check all components needed for PDF → Image → OCR pipeline
        assert "poppler-utils" in dockerfile_content, "Need poppler for PDF to image"
        assert "tesseract-ocr" in dockerfile_content, "Need tesseract for OCR"
        assert "tesseract-ocr-spa" in dockerfile_content, "Need Spanish for Mexican invoices"

    def test_dependencies_support_opencv(self, dockerfile_content):
        """Dependencies should support OpenCV if used."""
        # These are commonly needed for OpenCV/image processing
        assert "libgl1-mesa-glx" in dockerfile_content
        assert "libglib2.0-0" in dockerfile_content

    def test_curl_for_health_checks(self, dockerfile_content):
        """Curl should be available for container health checks."""
        assert "curl" in dockerfile_content
        assert "HEALTHCHECK" in dockerfile_content
        assert "curl -f http://localhost:8000/health" in dockerfile_content


# ============================================================================
# Documentation Tests
# ============================================================================

class TestDependencyDocumentation:
    """Tests for dependency documentation in Dockerfile."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_has_comment_for_system_deps(self, dockerfile_content):
        """Dockerfile should have comment explaining system dependencies."""
        # Look for comment near system dependencies
        patterns = [
            r'#.*system.*dependenc',
            r'#.*runtime.*dependenc',
            r'#.*Install.*runtime',
        ]
        found_comment = any(
            re.search(pattern, dockerfile_content, re.IGNORECASE)
            for pattern in patterns
        )
        assert found_comment, "Should have comment explaining system dependencies"

    def test_dockerfile_has_tesseract_verification_comment(self, dockerfile_content):
        """Dockerfile should have comment for tesseract verification."""
        # Look for comment explaining verification
        patterns = [
            r'#.*[Vv]erify.*tesseract',
            r'#.*[Cc]heck.*tesseract',
            r'#.*tesseract.*install',
        ]
        found_comment = any(
            re.search(pattern, dockerfile_content, re.IGNORECASE)
            for pattern in patterns
        )
        assert found_comment, "Should have comment for tesseract verification step"
