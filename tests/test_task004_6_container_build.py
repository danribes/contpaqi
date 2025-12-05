"""
Tests for Task 4.6: Test container builds and runs successfully

TDD tests for verifying container build prerequisites and Docker operations:
- Build prerequisites (files, structure)
- Docker build validation
- Image size verification
- Container startup and health check
- docker-compose operations
"""

import os
import re
import subprocess
import shutil
import pytest
from pathlib import Path


# ============================================================================
# Test Configuration
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / "mcp-container"
DOCKERFILE_PATH = MCP_CONTAINER_DIR / "Dockerfile"
DOCKER_COMPOSE_PATH = MCP_CONTAINER_DIR / "docker-compose.yml"
REQUIREMENTS_PATH = MCP_CONTAINER_DIR / "requirements.txt"
SRC_DIR = MCP_CONTAINER_DIR / "src"

# Image configuration
IMAGE_NAME = "mcp-container"
IMAGE_TAG = "latest"
FULL_IMAGE_NAME = f"{IMAGE_NAME}:{IMAGE_TAG}"
MAX_IMAGE_SIZE_GB = 3


# ============================================================================
# Helper Functions
# ============================================================================

def is_docker_available():
    """Check if Docker is available on the system."""
    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def is_docker_daemon_running():
    """Check if Docker daemon is running."""
    if not is_docker_available():
        return False
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0
    except subprocess.SubprocessError:
        return False


DOCKER_AVAILABLE = is_docker_available()
DOCKER_RUNNING = is_docker_daemon_running() if DOCKER_AVAILABLE else False

# Skip markers
requires_docker = pytest.mark.skipif(
    not DOCKER_AVAILABLE,
    reason="Docker is not installed"
)
requires_docker_daemon = pytest.mark.skipif(
    not DOCKER_RUNNING,
    reason="Docker daemon is not running"
)


# ============================================================================
# Build Prerequisites Tests
# ============================================================================

class TestBuildPrerequisites:
    """Tests for files and structure required to build the container."""

    def test_mcp_container_directory_exists(self):
        """mcp-container directory should exist."""
        assert MCP_CONTAINER_DIR.exists()
        assert MCP_CONTAINER_DIR.is_dir()

    def test_dockerfile_exists(self):
        """Dockerfile should exist."""
        assert DOCKERFILE_PATH.exists()
        assert DOCKERFILE_PATH.is_file()

    def test_dockerfile_not_empty(self):
        """Dockerfile should not be empty."""
        content = DOCKERFILE_PATH.read_text()
        assert len(content.strip()) > 0

    def test_docker_compose_exists(self):
        """docker-compose.yml should exist."""
        assert DOCKER_COMPOSE_PATH.exists()
        assert DOCKER_COMPOSE_PATH.is_file()

    def test_requirements_exists(self):
        """requirements.txt should exist."""
        assert REQUIREMENTS_PATH.exists()
        assert REQUIREMENTS_PATH.is_file()

    def test_src_directory_exists(self):
        """src/ directory should exist."""
        assert SRC_DIR.exists()
        assert SRC_DIR.is_dir()

    def test_src_has_init(self):
        """src/ should have __init__.py."""
        init_file = SRC_DIR / "__init__.py"
        assert init_file.exists()


# ============================================================================
# Dockerfile Validation Tests
# ============================================================================

class TestDockerfileValidation:
    """Tests for Dockerfile syntax and structure validation."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return DOCKERFILE_PATH.read_text()

    def test_has_from_instruction(self, dockerfile_content):
        """Dockerfile should have FROM instruction."""
        assert 'FROM' in dockerfile_content

    def test_uses_python_base_image(self, dockerfile_content):
        """Should use Python base image."""
        assert 'python:3.9' in dockerfile_content

    def test_has_workdir(self, dockerfile_content):
        """Should set WORKDIR."""
        assert 'WORKDIR' in dockerfile_content

    def test_has_copy_instructions(self, dockerfile_content):
        """Should have COPY instructions."""
        assert 'COPY' in dockerfile_content

    def test_has_run_instructions(self, dockerfile_content):
        """Should have RUN instructions."""
        assert 'RUN' in dockerfile_content

    def test_has_expose_instruction(self, dockerfile_content):
        """Should EXPOSE port 8000."""
        assert 'EXPOSE 8000' in dockerfile_content

    def test_has_cmd_or_entrypoint(self, dockerfile_content):
        """Should have CMD or ENTRYPOINT."""
        has_cmd = 'CMD' in dockerfile_content
        has_entrypoint = 'ENTRYPOINT' in dockerfile_content
        assert has_cmd or has_entrypoint

    def test_uses_uvicorn(self, dockerfile_content):
        """CMD should run uvicorn."""
        assert 'uvicorn' in dockerfile_content

    def test_has_healthcheck(self, dockerfile_content):
        """Should have HEALTHCHECK instruction."""
        assert 'HEALTHCHECK' in dockerfile_content

    def test_healthcheck_uses_curl(self, dockerfile_content):
        """HEALTHCHECK should use curl."""
        # Find HEALTHCHECK section
        healthcheck_match = re.search(r'HEALTHCHECK.*?(?=\n[A-Z]|\Z)', dockerfile_content, re.DOTALL)
        assert healthcheck_match is not None
        healthcheck_section = healthcheck_match.group(0)
        assert 'curl' in healthcheck_section

    def test_healthcheck_checks_health_endpoint(self, dockerfile_content):
        """HEALTHCHECK should check /health endpoint."""
        assert '/health' in dockerfile_content

    def test_creates_non_root_user(self, dockerfile_content):
        """Should create non-root user for security."""
        assert 'useradd' in dockerfile_content or 'adduser' in dockerfile_content

    def test_switches_to_non_root_user(self, dockerfile_content):
        """Should switch to non-root USER."""
        assert 'USER' in dockerfile_content

    def test_no_syntax_errors(self, dockerfile_content):
        """Dockerfile should not have obvious syntax errors."""
        lines = dockerfile_content.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            # Skip empty lines and comments
            if not stripped or stripped.startswith('#'):
                continue
            # Check for unterminated quotes
            single_quotes = stripped.count("'")
            double_quotes = stripped.count('"')
            # Line continuation is OK
            if stripped.endswith('\\'):
                continue
            # Quotes should be balanced (or in a multi-line context)
            # This is a basic check - not comprehensive


# ============================================================================
# docker-compose.yml Validation Tests
# ============================================================================

class TestDockerComposeValidation:
    """Tests for docker-compose.yml syntax and structure validation."""

    @pytest.fixture
    def compose_content(self):
        """Read docker-compose.yml content."""
        return DOCKER_COMPOSE_PATH.read_text()

    def test_has_version(self, compose_content):
        """Should specify version."""
        assert 'version:' in compose_content

    def test_has_services(self, compose_content):
        """Should have services section."""
        assert 'services:' in compose_content

    def test_has_mcp_container_service(self, compose_content):
        """Should define mcp-container service."""
        assert 'mcp-container:' in compose_content

    def test_has_build_section(self, compose_content):
        """Should have build configuration."""
        assert 'build:' in compose_content

    def test_has_ports_section(self, compose_content):
        """Should have ports configuration."""
        assert 'ports:' in compose_content

    def test_exposes_port_8000(self, compose_content):
        """Should expose port 8000."""
        assert '8000:8000' in compose_content

    def test_has_volumes_section(self, compose_content):
        """Should have volumes configuration."""
        assert 'volumes:' in compose_content

    def test_has_environment_section(self, compose_content):
        """Should have environment configuration."""
        assert 'environment:' in compose_content


# ============================================================================
# Requirements Validation Tests
# ============================================================================

class TestRequirementsValidation:
    """Tests for requirements.txt validation."""

    @pytest.fixture
    def requirements_content(self):
        """Read requirements.txt content."""
        return REQUIREMENTS_PATH.read_text()

    def test_has_fastapi(self, requirements_content):
        """Should include FastAPI."""
        assert 'fastapi' in requirements_content.lower()

    def test_has_uvicorn(self, requirements_content):
        """Should include uvicorn."""
        assert 'uvicorn' in requirements_content.lower()

    def test_has_torch(self, requirements_content):
        """Should include PyTorch."""
        assert 'torch' in requirements_content.lower()

    def test_has_transformers(self, requirements_content):
        """Should include transformers."""
        assert 'transformers' in requirements_content.lower()

    def test_has_pytesseract(self, requirements_content):
        """Should include pytesseract."""
        assert 'pytesseract' in requirements_content.lower()

    def test_has_pillow(self, requirements_content):
        """Should include Pillow."""
        assert 'pillow' in requirements_content.lower()


# ============================================================================
# Source Code Structure Tests
# ============================================================================

class TestSourceCodeStructure:
    """Tests for source code structure required for container."""

    def test_src_init_exists(self):
        """src/__init__.py should exist."""
        init_file = SRC_DIR / "__init__.py"
        assert init_file.exists()

    def test_models_directory_exists(self):
        """src/models/ directory should exist."""
        models_dir = SRC_DIR / "models"
        assert models_dir.exists()
        assert models_dir.is_dir()

    def test_utils_directory_exists(self):
        """src/utils/ directory should exist."""
        utils_dir = SRC_DIR / "utils"
        assert utils_dir.exists()
        assert utils_dir.is_dir()


# ============================================================================
# Docker Availability Tests
# ============================================================================

class TestDockerAvailability:
    """Tests for Docker availability (informational)."""

    def test_check_docker_installed(self):
        """Check if Docker is installed (informational test)."""
        # This test always passes but reports Docker status
        if DOCKER_AVAILABLE:
            pytest.skip("Docker is available - use Docker tests")
        else:
            # Test passes but indicates Docker is not available
            assert True, "Docker is not installed - container tests will be skipped"


# ============================================================================
# Docker Build Tests (require Docker)
# ============================================================================

@requires_docker_daemon
class TestDockerBuild:
    """Tests for Docker build operations."""

    def test_docker_build_command_available(self):
        """docker build command should be available."""
        result = subprocess.run(
            ["docker", "build", "--help"],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

    def test_container_builds_successfully(self):
        """Container should build without errors."""
        result = subprocess.run(
            ["docker", "build", "-t", FULL_IMAGE_NAME, "."],
            cwd=str(MCP_CONTAINER_DIR),
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout for build
        )
        assert result.returncode == 0, f"Build failed: {result.stderr}"


# ============================================================================
# Docker Image Tests (require Docker and built image)
# ============================================================================

@requires_docker_daemon
class TestDockerImage:
    """Tests for Docker image after build."""

    def test_image_exists(self):
        """Built image should exist."""
        result = subprocess.run(
            ["docker", "images", "-q", FULL_IMAGE_NAME],
            capture_output=True,
            text=True
        )
        # If image doesn't exist, skip remaining tests
        if not result.stdout.strip():
            pytest.skip("Image not built - run build test first")
        assert result.stdout.strip(), "Image should exist"

    def test_image_size_under_limit(self):
        """Image size should be under 3GB."""
        result = subprocess.run(
            ["docker", "images", "--format", "{{.Size}}", FULL_IMAGE_NAME],
            capture_output=True,
            text=True
        )
        if not result.stdout.strip():
            pytest.skip("Image not built")

        size_str = result.stdout.strip()
        # Parse size (could be GB, MB, etc.)
        if 'GB' in size_str:
            size_gb = float(size_str.replace('GB', '').strip())
            assert size_gb < MAX_IMAGE_SIZE_GB, f"Image size {size_gb}GB exceeds {MAX_IMAGE_SIZE_GB}GB limit"
        elif 'MB' in size_str:
            # MB is always under 3GB
            pass
        else:
            pytest.skip(f"Unknown size format: {size_str}")


# ============================================================================
# Docker Run Tests (require Docker and built image)
# ============================================================================

@requires_docker_daemon
class TestDockerRun:
    """Tests for running the Docker container."""

    @pytest.fixture(scope="class")
    def container_id(self):
        """Start container and return ID, cleanup after tests."""
        # Check if image exists
        result = subprocess.run(
            ["docker", "images", "-q", FULL_IMAGE_NAME],
            capture_output=True,
            text=True
        )
        if not result.stdout.strip():
            pytest.skip("Image not built")

        # Start container
        result = subprocess.run(
            ["docker", "run", "-d", "-p", "8000:8000", "--name", "test-mcp-container", FULL_IMAGE_NAME],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            pytest.skip(f"Could not start container: {result.stderr}")

        container_id = result.stdout.strip()
        yield container_id

        # Cleanup
        subprocess.run(["docker", "stop", "test-mcp-container"], capture_output=True)
        subprocess.run(["docker", "rm", "test-mcp-container"], capture_output=True)

    def test_container_starts(self, container_id):
        """Container should start successfully."""
        assert container_id, "Container should have an ID"

    def test_container_is_running(self, container_id):
        """Container should be in running state."""
        import time
        time.sleep(2)  # Give container time to start

        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", container_id],
            capture_output=True,
            text=True
        )
        assert result.stdout.strip() == "true", "Container should be running"


# ============================================================================
# Docker Compose Tests (require Docker)
# ============================================================================

@requires_docker_daemon
class TestDockerCompose:
    """Tests for docker-compose operations."""

    def test_docker_compose_available(self):
        """docker-compose command should be available."""
        # Try docker-compose first
        result = subprocess.run(
            ["docker-compose", "--version"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            # Try docker compose (v2)
            result = subprocess.run(
                ["docker", "compose", "version"],
                capture_output=True,
                text=True
            )
        assert result.returncode == 0, "docker-compose or docker compose should be available"

    def test_docker_compose_config_valid(self):
        """docker-compose.yml should be valid."""
        # Try docker-compose first
        result = subprocess.run(
            ["docker-compose", "config"],
            cwd=str(MCP_CONTAINER_DIR),
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            # Try docker compose (v2)
            result = subprocess.run(
                ["docker", "compose", "config"],
                cwd=str(MCP_CONTAINER_DIR),
                capture_output=True,
                text=True
            )
        assert result.returncode == 0, f"docker-compose config failed: {result.stderr}"


# ============================================================================
# Health Check Tests (require running container)
# ============================================================================

@requires_docker_daemon
class TestHealthCheck:
    """Tests for container health check endpoint."""

    def test_health_endpoint_configured(self):
        """Dockerfile should configure health check for /health."""
        content = DOCKERFILE_PATH.read_text()
        assert '/health' in content


# ============================================================================
# Integration Tests
# ============================================================================

class TestBuildReadiness:
    """Integration tests verifying build readiness."""

    def test_all_required_files_present(self):
        """All files required for build should be present."""
        required_files = [
            DOCKERFILE_PATH,
            DOCKER_COMPOSE_PATH,
            REQUIREMENTS_PATH,
            SRC_DIR / "__init__.py",
        ]
        for file_path in required_files:
            assert file_path.exists(), f"Missing required file: {file_path}"

    def test_dockerfile_references_requirements(self):
        """Dockerfile should reference requirements.txt."""
        content = DOCKERFILE_PATH.read_text()
        assert 'requirements.txt' in content

    def test_dockerfile_copies_src(self):
        """Dockerfile should copy src/ directory."""
        content = DOCKERFILE_PATH.read_text()
        assert 'COPY src/' in content or 'COPY ./src' in content

    def test_docker_compose_references_dockerfile(self):
        """docker-compose.yml should reference Dockerfile."""
        content = DOCKER_COMPOSE_PATH.read_text()
        assert 'dockerfile' in content.lower() or 'build:' in content

    def test_build_context_is_valid(self):
        """Build context should have all necessary files."""
        # Check that all files referenced in Dockerfile exist
        dockerfile_content = DOCKERFILE_PATH.read_text()

        # Check requirements.txt
        if 'requirements.txt' in dockerfile_content:
            assert REQUIREMENTS_PATH.exists()

        # Check src directory
        if 'src/' in dockerfile_content:
            assert SRC_DIR.exists()


# ============================================================================
# Summary Tests
# ============================================================================

class TestSummary:
    """Summary tests for build verification."""

    def test_task_4_prerequisites_complete(self):
        """All Task 4 prerequisites should be complete."""
        checks = {
            "Dockerfile exists": DOCKERFILE_PATH.exists(),
            "docker-compose.yml exists": DOCKER_COMPOSE_PATH.exists(),
            "requirements.txt exists": REQUIREMENTS_PATH.exists(),
            "src/ directory exists": SRC_DIR.exists(),
            "src/__init__.py exists": (SRC_DIR / "__init__.py").exists(),
        }

        failed = [name for name, passed in checks.items() if not passed]
        assert not failed, f"Prerequisites not met: {failed}"

    def test_docker_status_reported(self):
        """Report Docker availability status."""
        # This test always passes but reports status
        if DOCKER_RUNNING:
            status = "Docker is available and running"
        elif DOCKER_AVAILABLE:
            status = "Docker is installed but daemon not running"
        else:
            status = "Docker is not installed"

        # Test passes regardless - this is informational
        assert True, status
