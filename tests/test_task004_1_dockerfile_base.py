"""
Tests for Task 4.1: Create Dockerfile with python:3.9-slim-bullseye base

TDD tests for Docker configuration validation.
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
# Module Existence Tests
# ============================================================================

class TestDockerfileExists:
    """Tests for Dockerfile existence and basic structure."""

    def test_mcp_container_directory_exists(self):
        """MCP container directory should exist."""
        assert MCP_CONTAINER_DIR.exists()
        assert MCP_CONTAINER_DIR.is_dir()

    def test_dockerfile_exists(self):
        """Dockerfile should exist in mcp-container directory."""
        assert DOCKERFILE_PATH.exists()
        assert DOCKERFILE_PATH.is_file()

    def test_dockerfile_not_empty(self):
        """Dockerfile should not be empty."""
        content = DOCKERFILE_PATH.read_text()
        assert len(content.strip()) > 0


# ============================================================================
# Base Image Tests
# ============================================================================

class TestDockerfileBaseImage:
    """Tests for Dockerfile base image configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_uses_python_39_slim_bullseye(self, dockerfile_content):
        """Dockerfile should use python:3.9-slim-bullseye base image."""
        assert "python:3.9-slim-bullseye" in dockerfile_content

    def test_has_from_instruction(self, dockerfile_content):
        """Dockerfile should have FROM instruction."""
        assert re.search(r'^FROM\s+', dockerfile_content, re.MULTILINE)

    def test_base_image_is_first_from(self, dockerfile_content):
        """First FROM should use python:3.9-slim-bullseye."""
        lines = dockerfile_content.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('FROM'):
                assert 'python:3.9-slim-bullseye' in line
                break


# ============================================================================
# Multi-Stage Build Tests
# ============================================================================

class TestDockerfileMultiStage:
    """Tests for multi-stage build configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_has_builder_stage(self, dockerfile_content):
        """Dockerfile should have a builder stage."""
        assert re.search(r'FROM.*as\s+builder', dockerfile_content, re.IGNORECASE)

    def test_has_multiple_from_statements(self, dockerfile_content):
        """Dockerfile should have multiple FROM statements for multi-stage."""
        from_count = len(re.findall(r'^FROM\s+', dockerfile_content, re.MULTILINE))
        assert from_count >= 2, f"Expected at least 2 FROM statements, got {from_count}"

    def test_builder_stage_has_workdir(self, dockerfile_content):
        """Builder stage should set WORKDIR."""
        assert "WORKDIR" in dockerfile_content

    def test_has_copy_from_builder(self, dockerfile_content):
        """Should copy artifacts from builder stage."""
        assert re.search(r'COPY\s+--from=builder', dockerfile_content, re.IGNORECASE)


# ============================================================================
# Builder Stage Tests
# ============================================================================

class TestDockerfileBuilderStage:
    """Tests for builder stage configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_builder_has_build_essential(self, dockerfile_content):
        """Builder stage should install build-essential."""
        assert "build-essential" in dockerfile_content

    def test_builder_copies_requirements(self, dockerfile_content):
        """Builder stage should copy requirements.txt."""
        assert re.search(r'COPY\s+requirements\.txt', dockerfile_content)

    def test_builder_creates_wheels(self, dockerfile_content):
        """Builder stage should create wheel packages."""
        assert "pip wheel" in dockerfile_content or "wheels" in dockerfile_content

    def test_builder_cleans_apt_cache(self, dockerfile_content):
        """Builder stage should clean apt cache."""
        assert "rm -rf /var/lib/apt/lists/*" in dockerfile_content


# ============================================================================
# Runtime Stage Tests
# ============================================================================

class TestDockerfileRuntimeStage:
    """Tests for runtime stage configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_runtime_has_workdir(self, dockerfile_content):
        """Runtime stage should set WORKDIR to /app."""
        assert re.search(r'WORKDIR\s+/app', dockerfile_content)

    def test_runtime_copies_wheels(self, dockerfile_content):
        """Runtime stage should copy wheels from builder."""
        assert re.search(r'COPY\s+--from=builder\s+/app/wheels', dockerfile_content)

    def test_runtime_installs_wheels(self, dockerfile_content):
        """Runtime stage should install wheel packages."""
        assert "pip install" in dockerfile_content

    def test_runtime_copies_src(self, dockerfile_content):
        """Runtime stage should copy src directory."""
        assert re.search(r'COPY\s+src/', dockerfile_content)

    def test_runtime_exposes_port(self, dockerfile_content):
        """Runtime stage should expose port 8000."""
        assert re.search(r'EXPOSE\s+8000', dockerfile_content)

    def test_runtime_has_cmd(self, dockerfile_content):
        """Runtime stage should have CMD instruction."""
        assert re.search(r'^CMD\s+', dockerfile_content, re.MULTILINE)

    def test_runtime_runs_uvicorn(self, dockerfile_content):
        """Runtime stage CMD should run uvicorn."""
        assert "uvicorn" in dockerfile_content


# ============================================================================
# Security Tests
# ============================================================================

class TestDockerfileSecurity:
    """Tests for Dockerfile security best practices."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_creates_non_root_user(self, dockerfile_content):
        """Dockerfile should create a non-root user."""
        assert "useradd" in dockerfile_content or "adduser" in dockerfile_content

    def test_switches_to_non_root_user(self, dockerfile_content):
        """Dockerfile should switch to non-root user."""
        assert re.search(r'^USER\s+\w+', dockerfile_content, re.MULTILINE)

    def test_no_cache_pip_install(self, dockerfile_content):
        """Pip install should use --no-cache flag."""
        assert "--no-cache" in dockerfile_content


# ============================================================================
# Health Check Tests
# ============================================================================

class TestDockerfileHealthCheck:
    """Tests for Dockerfile health check configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_has_healthcheck(self, dockerfile_content):
        """Dockerfile should have HEALTHCHECK instruction."""
        assert "HEALTHCHECK" in dockerfile_content

    def test_healthcheck_has_interval(self, dockerfile_content):
        """Health check should have interval setting."""
        assert "--interval=" in dockerfile_content

    def test_healthcheck_has_timeout(self, dockerfile_content):
        """Health check should have timeout setting."""
        assert "--timeout=" in dockerfile_content

    def test_healthcheck_has_retries(self, dockerfile_content):
        """Health check should have retries setting."""
        assert "--retries=" in dockerfile_content

    def test_healthcheck_checks_health_endpoint(self, dockerfile_content):
        """Health check should check /health endpoint."""
        assert "/health" in dockerfile_content


# ============================================================================
# Dockerfile Best Practices Tests
# ============================================================================

class TestDockerfileBestPractices:
    """Tests for Dockerfile best practices."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_uses_apt_get_not_apt(self, dockerfile_content):
        """Should use apt-get instead of apt for scripts."""
        # apt-get is preferred in scripts for non-interactive use
        assert "apt-get" in dockerfile_content

    def test_uses_no_install_recommends(self, dockerfile_content):
        """Should use --no-install-recommends to minimize image size."""
        assert "--no-install-recommends" in dockerfile_content

    def test_combines_run_commands(self, dockerfile_content):
        """RUN commands should be combined with && for efficiency."""
        assert "&&" in dockerfile_content

    def test_has_comments(self, dockerfile_content):
        """Dockerfile should have comments for clarity."""
        comments = re.findall(r'^#.*$', dockerfile_content, re.MULTILINE)
        assert len(comments) >= 3, "Dockerfile should have descriptive comments"


# ============================================================================
# Integration Tests
# ============================================================================

class TestDockerfileIntegration:
    """Integration tests for Dockerfile with other files."""

    def test_requirements_txt_exists(self):
        """requirements.txt should exist for COPY instruction."""
        requirements_path = MCP_CONTAINER_DIR / "requirements.txt"
        assert requirements_path.exists()

    def test_src_directory_exists(self):
        """src directory should exist for COPY instruction."""
        src_path = MCP_CONTAINER_DIR / "src"
        assert src_path.exists()
        assert src_path.is_dir()

    def test_dockerfile_syntax_valid(self):
        """Dockerfile should have valid basic syntax."""
        content = DOCKERFILE_PATH.read_text()
        lines = content.split('\n')

        valid_instructions = {
            'FROM', 'RUN', 'CMD', 'LABEL', 'MAINTAINER', 'EXPOSE',
            'ENV', 'ADD', 'COPY', 'ENTRYPOINT', 'VOLUME', 'USER',
            'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL', 'HEALTHCHECK', 'SHELL'
        }

        in_continuation = False
        for line in lines:
            stripped = line.strip()

            # Skip empty lines and comments
            if not stripped or stripped.startswith('#'):
                continue

            # Check if previous line ended with continuation
            if in_continuation:
                in_continuation = stripped.endswith('\\')
                continue

            # Get first word
            first_word = stripped.split()[0] if stripped.split() else ''

            # Check if it's a valid instruction
            if first_word and not first_word.startswith('--'):
                assert first_word.upper() in valid_instructions, \
                    f"Invalid Dockerfile instruction: {first_word}"

            # Check if this line continues
            in_continuation = stripped.endswith('\\')
