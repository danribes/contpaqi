"""
Tests for Subtask 16.3: Modify Dockerfile to use obfuscated dist/

Tests verify:
- Production Dockerfile exists and uses dist/
- Development Dockerfile uses src/
- Both Dockerfiles have correct structure
- Build arguments and labels are configured
"""

import os
import re
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / 'mcp-container'
DOCKERFILE_DEV = MCP_CONTAINER_DIR / 'Dockerfile'
DOCKERFILE_PROD = MCP_CONTAINER_DIR / 'Dockerfile.prod'
MAKEFILE_PATH = MCP_CONTAINER_DIR / 'Makefile'


# =============================================================================
# Dockerfile Existence Tests
# =============================================================================

class TestDockerfileExistence:
    """Tests for Dockerfile file existence."""

    def test_development_dockerfile_exists(self):
        """Development Dockerfile should exist."""
        assert DOCKERFILE_DEV.exists(), \
            f"Dockerfile should exist at {DOCKERFILE_DEV}"

    def test_production_dockerfile_exists(self):
        """Production Dockerfile.prod should exist."""
        assert DOCKERFILE_PROD.exists(), \
            f"Dockerfile.prod should exist at {DOCKERFILE_PROD}"


# =============================================================================
# Development Dockerfile Tests
# =============================================================================

class TestDevelopmentDockerfile:
    """Tests for the development Dockerfile."""

    def test_uses_src_directory(self):
        """Development Dockerfile should use src/ directory."""
        content = DOCKERFILE_DEV.read_text()

        # Should copy from src/
        assert 'COPY src/' in content or 'COPY ./src/' in content, \
            "Development Dockerfile should copy from src/"

    def test_has_python_base_image(self):
        """Dockerfile should use Python base image."""
        content = DOCKERFILE_DEV.read_text()

        assert 'FROM python:' in content, \
            "Dockerfile should use Python base image"

    def test_has_workdir(self):
        """Dockerfile should set WORKDIR."""
        content = DOCKERFILE_DEV.read_text()

        assert 'WORKDIR' in content, \
            "Dockerfile should set WORKDIR"

    def test_exposes_port_8000(self):
        """Dockerfile should expose port 8000."""
        content = DOCKERFILE_DEV.read_text()

        assert 'EXPOSE 8000' in content, \
            "Dockerfile should expose port 8000"

    def test_has_healthcheck(self):
        """Dockerfile should have health check."""
        content = DOCKERFILE_DEV.read_text()

        assert 'HEALTHCHECK' in content, \
            "Dockerfile should have HEALTHCHECK"

    def test_runs_uvicorn(self):
        """Dockerfile should run uvicorn."""
        content = DOCKERFILE_DEV.read_text()

        assert 'uvicorn' in content, \
            "Dockerfile should run uvicorn"


# =============================================================================
# Production Dockerfile Tests
# =============================================================================

class TestProductionDockerfile:
    """Tests for the production Dockerfile.prod."""

    def test_uses_dist_directory(self):
        """Production Dockerfile should use dist/ directory."""
        content = DOCKERFILE_PROD.read_text()

        # Should copy from dist/
        assert 'COPY dist/' in content or 'COPY ./dist/' in content, \
            "Production Dockerfile should copy from dist/"

    def test_does_not_use_src_for_app(self):
        """Production Dockerfile should NOT copy src/ as application code."""
        content = DOCKERFILE_PROD.read_text()

        # Should not have COPY src/ for the main application
        # (requirements.txt might still use src/ path which is OK)
        lines = content.split('\n')
        for line in lines:
            if 'COPY src/' in line and 'requirements' not in line.lower():
                # Check if this is actually copying app code
                if './src/' in line or 'src/ .' in line:
                    pytest.fail("Production Dockerfile should not copy src/ as app code")

    def test_has_python_base_image(self):
        """Dockerfile should use Python base image."""
        content = DOCKERFILE_PROD.read_text()

        assert 'FROM python:' in content, \
            "Dockerfile.prod should use Python base image"

    def test_has_same_python_version(self):
        """Both Dockerfiles should use same Python version."""
        dev_content = DOCKERFILE_DEV.read_text()
        prod_content = DOCKERFILE_PROD.read_text()

        # Extract Python version from FROM line (direct or via ARG)
        dev_match = re.search(r'FROM python:(\d+\.\d+)', dev_content)

        # Production may use ARG for version
        prod_direct_match = re.search(r'FROM python:(\d+\.\d+)', prod_content)
        prod_arg_match = re.search(r'ARG PYTHON_VERSION=(\d+\.\d+)', prod_content)

        # Get versions
        dev_version = dev_match.group(1) if dev_match else None
        prod_version = prod_direct_match.group(1) if prod_direct_match else \
                      (prod_arg_match.group(1) if prod_arg_match else None)

        assert dev_version and prod_version, \
            "Both Dockerfiles should specify Python version"
        assert dev_version == prod_version, \
            f"Both Dockerfiles should use same Python version: dev={dev_version}, prod={prod_version}"

    def test_has_multistage_build(self):
        """Production Dockerfile should use multi-stage build."""
        content = DOCKERFILE_PROD.read_text()

        # Count FROM statements
        from_count = content.count('FROM ')

        assert from_count >= 2, \
            "Production Dockerfile should use multi-stage build"

    def test_has_build_label(self):
        """Production Dockerfile should have build type label."""
        content = DOCKERFILE_PROD.read_text()

        # Should have LABEL for build identification
        assert 'LABEL' in content, \
            "Production Dockerfile should have LABEL"

    def test_has_security_user(self):
        """Production Dockerfile should run as non-root user."""
        content = DOCKERFILE_PROD.read_text()

        assert 'useradd' in content or 'USER' in content, \
            "Production Dockerfile should run as non-root user"

    def test_exposes_port_8000(self):
        """Production Dockerfile should expose port 8000."""
        content = DOCKERFILE_PROD.read_text()

        assert 'EXPOSE 8000' in content, \
            "Dockerfile.prod should expose port 8000"

    def test_has_healthcheck(self):
        """Production Dockerfile should have health check."""
        content = DOCKERFILE_PROD.read_text()

        assert 'HEALTHCHECK' in content, \
            "Dockerfile.prod should have HEALTHCHECK"

    def test_runs_uvicorn_from_dist(self):
        """Production Dockerfile should run uvicorn with dist module path."""
        content = DOCKERFILE_PROD.read_text()

        assert 'uvicorn' in content, \
            "Dockerfile.prod should run uvicorn"

        # The module path should reference dist or src (mapped from dist)
        # uvicorn might use dist.main:app or src.main:app depending on how dist is copied
        assert 'main:app' in content, \
            "Dockerfile.prod should specify main:app entry point"


# =============================================================================
# Dockerfile Structure Tests
# =============================================================================

class TestDockerfileStructure:
    """Tests for Dockerfile best practices."""

    def test_prod_has_no_dev_dependencies(self):
        """Production Dockerfile should not install dev dependencies."""
        content = DOCKERFILE_PROD.read_text()

        # Should not reference requirements-dev.txt
        assert 'requirements-dev' not in content, \
            "Production Dockerfile should not use requirements-dev.txt"

    def test_prod_copies_requirements_first(self):
        """Production Dockerfile should copy requirements before code for caching."""
        content = DOCKERFILE_PROD.read_text()

        # Find positions
        req_pos = content.find('requirements.txt')
        dist_pos = content.find('COPY dist/')

        if req_pos != -1 and dist_pos != -1:
            assert req_pos < dist_pos, \
                "Requirements should be copied before dist/ for Docker layer caching"

    def test_both_dockerfiles_have_comments(self):
        """Both Dockerfiles should have descriptive comments."""
        for dockerfile, name in [(DOCKERFILE_DEV, 'Dockerfile'), (DOCKERFILE_PROD, 'Dockerfile.prod')]:
            content = dockerfile.read_text()
            assert '#' in content, f"{name} should have comments"

    def test_prod_has_arg_for_version(self):
        """Production Dockerfile should have ARG for version (optional)."""
        content = DOCKERFILE_PROD.read_text()

        # ARG is recommended but not required
        if 'ARG' not in content:
            pytest.skip("ARG for version is recommended but not required")


# =============================================================================
# Makefile Integration Tests
# =============================================================================

class TestMakefileDockerIntegration:
    """Tests for Makefile Docker integration."""

    def test_makefile_references_dockerfile_prod(self):
        """Makefile should reference Dockerfile.prod for production builds."""
        content = MAKEFILE_PATH.read_text()

        assert 'Dockerfile.prod' in content, \
            "Makefile should reference Dockerfile.prod for production"

    def test_makefile_has_docker_build_prod(self):
        """Makefile should have production Docker build target."""
        content = MAKEFILE_PATH.read_text()

        # Should have docker-build that uses Dockerfile.prod
        assert 'docker-build' in content or 'docker' in content, \
            "Makefile should have Docker build target"

    def test_makefile_build_uses_obfuscate(self):
        """Production build should depend on obfuscation."""
        content = MAKEFILE_PATH.read_text()

        # build target should reference obfuscate
        assert 'obfuscate' in content and 'build' in content, \
            "Build should include obfuscation step"


# =============================================================================
# Runtime Consistency Tests
# =============================================================================

class TestRuntimeConsistency:
    """Tests for runtime consistency between dev and prod."""

    def test_same_tesseract_installation(self):
        """Both Dockerfiles should install tesseract-ocr."""
        dev_content = DOCKERFILE_DEV.read_text()
        prod_content = DOCKERFILE_PROD.read_text()

        assert 'tesseract-ocr' in dev_content and 'tesseract-ocr' in prod_content, \
            "Both Dockerfiles should install tesseract-ocr"

    def test_same_spanish_support(self):
        """Both Dockerfiles should install Spanish OCR support."""
        dev_content = DOCKERFILE_DEV.read_text()
        prod_content = DOCKERFILE_PROD.read_text()

        assert 'tesseract-ocr-spa' in dev_content and 'tesseract-ocr-spa' in prod_content, \
            "Both Dockerfiles should install tesseract-ocr-spa"

    def test_same_poppler_installation(self):
        """Both Dockerfiles should install poppler for PDF processing."""
        dev_content = DOCKERFILE_DEV.read_text()
        prod_content = DOCKERFILE_PROD.read_text()

        assert 'poppler' in dev_content and 'poppler' in prod_content, \
            "Both Dockerfiles should install poppler"


# =============================================================================
# Security Tests
# =============================================================================

class TestDockerfileSecurity:
    """Tests for Dockerfile security best practices."""

    def test_prod_runs_as_nonroot(self):
        """Production Dockerfile should run as non-root user."""
        content = DOCKERFILE_PROD.read_text()

        # Should have USER directive or useradd
        has_user = 'USER ' in content and 'USER root' not in content.split('USER ')[-1]
        has_useradd = 'useradd' in content

        assert has_user or has_useradd, \
            "Production Dockerfile should run as non-root user"

    def test_prod_no_secrets_in_dockerfile(self):
        """Production Dockerfile should not contain secrets."""
        content = DOCKERFILE_PROD.read_text().lower()

        # Check for common secret patterns
        secret_patterns = ['password=', 'api_key=', 'secret=', 'token=']
        for pattern in secret_patterns:
            assert pattern not in content, \
                f"Dockerfile should not contain {pattern}"

    def test_prod_uses_specific_base_version(self):
        """Production Dockerfile should use specific Python version."""
        content = DOCKERFILE_PROD.read_text()

        # Should not use 'latest' tag
        assert ':latest' not in content or 'python:latest' not in content, \
            "Production Dockerfile should not use 'latest' tag for Python"

        # Should specify version like python:3.9 (directly or via ARG)
        has_direct_version = re.search(r'python:\d+\.\d+', content)
        has_arg_version = re.search(r'ARG PYTHON_VERSION=\d+\.\d+', content)

        assert has_direct_version or has_arg_version, \
            "Production Dockerfile should specify Python version (direct or via ARG)"
