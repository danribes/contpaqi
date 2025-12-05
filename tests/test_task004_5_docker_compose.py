"""
Tests for Task 4.5: Create docker-compose.yml for local development

TDD tests for verifying docker-compose.yml configuration including:
- Service configuration
- Port mappings
- Volume mounts
- Environment variables
- Resource limits
- Health checks
"""

import os
import re
import pytest
import yaml
from pathlib import Path


# ============================================================================
# Test Configuration
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / "mcp-container"
DOCKER_COMPOSE_PATH = MCP_CONTAINER_DIR / "docker-compose.yml"


# ============================================================================
# Helper Functions
# ============================================================================

def load_docker_compose():
    """Load and parse docker-compose.yml."""
    with open(DOCKER_COMPOSE_PATH) as f:
        return yaml.safe_load(f)


# ============================================================================
# File Existence Tests
# ============================================================================

class TestDockerComposeExists:
    """Tests for docker-compose.yml existence and basic structure."""

    def test_mcp_container_directory_exists(self):
        """MCP container directory should exist."""
        assert MCP_CONTAINER_DIR.exists()
        assert MCP_CONTAINER_DIR.is_dir()

    def test_docker_compose_exists(self):
        """docker-compose.yml should exist in mcp-container directory."""
        assert DOCKER_COMPOSE_PATH.exists()
        assert DOCKER_COMPOSE_PATH.is_file()

    def test_docker_compose_not_empty(self):
        """docker-compose.yml should not be empty."""
        content = DOCKER_COMPOSE_PATH.read_text()
        assert len(content.strip()) > 0

    def test_docker_compose_valid_yaml(self):
        """docker-compose.yml should be valid YAML."""
        try:
            config = load_docker_compose()
            assert config is not None
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML: {e}")


# ============================================================================
# Version Tests
# ============================================================================

class TestDockerComposeVersion:
    """Tests for docker-compose version specification."""

    @pytest.fixture
    def config(self):
        """Load docker-compose configuration."""
        return load_docker_compose()

    def test_has_version(self, config):
        """docker-compose.yml should specify a version."""
        assert 'version' in config

    def test_version_is_3_8(self, config):
        """docker-compose version should be 3.8."""
        assert config['version'] == '3.8'


# ============================================================================
# Services Tests
# ============================================================================

class TestDockerComposeServices:
    """Tests for docker-compose services configuration."""

    @pytest.fixture
    def config(self):
        """Load docker-compose configuration."""
        return load_docker_compose()

    @pytest.fixture
    def mcp_service(self, config):
        """Get the mcp-container service configuration."""
        return config.get('services', {}).get('mcp-container', {})

    def test_has_services(self, config):
        """docker-compose.yml should have services section."""
        assert 'services' in config

    def test_has_mcp_container_service(self, config):
        """Should have mcp-container service defined."""
        assert 'mcp-container' in config.get('services', {})

    def test_service_has_build(self, mcp_service):
        """mcp-container service should have build configuration."""
        assert 'build' in mcp_service

    def test_build_has_context(self, mcp_service):
        """Build should specify context."""
        build = mcp_service.get('build', {})
        assert 'context' in build

    def test_build_context_is_current_dir(self, mcp_service):
        """Build context should be current directory."""
        build = mcp_service.get('build', {})
        assert build.get('context') == '.'

    def test_build_specifies_dockerfile(self, mcp_service):
        """Build should specify Dockerfile."""
        build = mcp_service.get('build', {})
        assert 'dockerfile' in build
        assert build.get('dockerfile') == 'Dockerfile'


# ============================================================================
# Port Mapping Tests
# ============================================================================

class TestDockerComposePorts:
    """Tests for docker-compose port mappings."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_ports(self, mcp_service):
        """mcp-container service should have ports defined."""
        assert 'ports' in mcp_service

    def test_exposes_port_8000(self, mcp_service):
        """Should expose port 8000."""
        ports = mcp_service.get('ports', [])
        port_strings = [str(p) for p in ports]
        assert any('8000' in p for p in port_strings)

    def test_port_mapping_format(self, mcp_service):
        """Port mapping should be host:container format."""
        ports = mcp_service.get('ports', [])
        # Should have format "8000:8000"
        assert any('8000:8000' in str(p) for p in ports)


# ============================================================================
# Volume Tests
# ============================================================================

class TestDockerComposeVolumes:
    """Tests for docker-compose volume mounts."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_volumes(self, mcp_service):
        """mcp-container service should have volumes defined."""
        assert 'volumes' in mcp_service

    def test_has_src_volume(self, mcp_service):
        """Should mount src directory."""
        volumes = mcp_service.get('volumes', [])
        volume_strings = [str(v) for v in volumes]
        assert any('src' in v for v in volume_strings)

    def test_src_volume_is_readonly(self, mcp_service):
        """src volume should be read-only."""
        volumes = mcp_service.get('volumes', [])
        volume_strings = [str(v) for v in volumes]
        src_volume = next((v for v in volume_strings if 'src' in v), None)
        assert src_volume is not None
        assert ':ro' in src_volume

    def test_has_models_volume(self, mcp_service):
        """Should mount models directory."""
        volumes = mcp_service.get('volumes', [])
        volume_strings = [str(v) for v in volumes]
        assert any('models' in v for v in volume_strings)

    def test_models_volume_is_readonly(self, mcp_service):
        """models volume should be read-only."""
        volumes = mcp_service.get('volumes', [])
        volume_strings = [str(v) for v in volumes]
        models_volume = next((v for v in volume_strings if 'models' in v), None)
        assert models_volume is not None
        assert ':ro' in models_volume


# ============================================================================
# Environment Tests
# ============================================================================

class TestDockerComposeEnvironment:
    """Tests for docker-compose environment variables."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_environment(self, mcp_service):
        """mcp-container service should have environment defined."""
        assert 'environment' in mcp_service

    def test_has_log_level(self, mcp_service):
        """Should have LOG_LEVEL environment variable."""
        env = mcp_service.get('environment', [])
        env_strings = [str(e) for e in env]
        assert any('LOG_LEVEL' in e for e in env_strings)

    def test_log_level_is_debug(self, mcp_service):
        """LOG_LEVEL should be DEBUG for development."""
        env = mcp_service.get('environment', [])
        env_strings = [str(e) for e in env]
        log_level = next((e for e in env_strings if 'LOG_LEVEL' in e), None)
        assert log_level is not None
        assert 'DEBUG' in log_level

    def test_has_pythonunbuffered(self, mcp_service):
        """Should have PYTHONUNBUFFERED environment variable."""
        env = mcp_service.get('environment', [])
        env_strings = [str(e) for e in env]
        assert any('PYTHONUNBUFFERED' in e for e in env_strings)

    def test_pythonunbuffered_is_1(self, mcp_service):
        """PYTHONUNBUFFERED should be 1."""
        env = mcp_service.get('environment', [])
        env_strings = [str(e) for e in env]
        unbuffered = next((e for e in env_strings if 'PYTHONUNBUFFERED' in e), None)
        assert unbuffered is not None
        assert '1' in unbuffered


# ============================================================================
# Restart Policy Tests
# ============================================================================

class TestDockerComposeRestart:
    """Tests for docker-compose restart policy."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_restart_policy(self, mcp_service):
        """mcp-container service should have restart policy."""
        assert 'restart' in mcp_service

    def test_restart_unless_stopped(self, mcp_service):
        """Restart policy should be unless-stopped."""
        assert mcp_service.get('restart') == 'unless-stopped'


# ============================================================================
# Resource Limits Tests
# ============================================================================

class TestDockerComposeResources:
    """Tests for docker-compose resource limits."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_deploy_section(self, mcp_service):
        """mcp-container service should have deploy section."""
        assert 'deploy' in mcp_service

    def test_has_resources(self, mcp_service):
        """Deploy should have resources configuration."""
        deploy = mcp_service.get('deploy', {})
        assert 'resources' in deploy

    def test_has_memory_limit(self, mcp_service):
        """Should have memory limit defined."""
        resources = mcp_service.get('deploy', {}).get('resources', {})
        limits = resources.get('limits', {})
        assert 'memory' in limits

    def test_memory_limit_is_4g(self, mcp_service):
        """Memory limit should be 4G."""
        resources = mcp_service.get('deploy', {}).get('resources', {})
        limits = resources.get('limits', {})
        assert limits.get('memory') == '4G'

    def test_has_memory_reservation(self, mcp_service):
        """Should have memory reservation defined."""
        resources = mcp_service.get('deploy', {}).get('resources', {})
        reservations = resources.get('reservations', {})
        assert 'memory' in reservations

    def test_memory_reservation_is_2g(self, mcp_service):
        """Memory reservation should be 2G."""
        resources = mcp_service.get('deploy', {}).get('resources', {})
        reservations = resources.get('reservations', {})
        assert reservations.get('memory') == '2G'


# ============================================================================
# Health Check Tests
# ============================================================================

class TestDockerComposeHealthCheck:
    """Tests for docker-compose health check configuration."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_has_healthcheck(self, mcp_service):
        """mcp-container service should have healthcheck defined."""
        assert 'healthcheck' in mcp_service

    def test_healthcheck_has_test(self, mcp_service):
        """Health check should have test command."""
        healthcheck = mcp_service.get('healthcheck', {})
        assert 'test' in healthcheck

    def test_healthcheck_uses_curl(self, mcp_service):
        """Health check test should use curl."""
        healthcheck = mcp_service.get('healthcheck', {})
        test = healthcheck.get('test', [])
        test_str = str(test)
        assert 'curl' in test_str

    def test_healthcheck_checks_health_endpoint(self, mcp_service):
        """Health check should check /health endpoint."""
        healthcheck = mcp_service.get('healthcheck', {})
        test = healthcheck.get('test', [])
        test_str = str(test)
        assert '/health' in test_str

    def test_healthcheck_has_interval(self, mcp_service):
        """Health check should have interval."""
        healthcheck = mcp_service.get('healthcheck', {})
        assert 'interval' in healthcheck

    def test_healthcheck_has_timeout(self, mcp_service):
        """Health check should have timeout."""
        healthcheck = mcp_service.get('healthcheck', {})
        assert 'timeout' in healthcheck

    def test_healthcheck_has_retries(self, mcp_service):
        """Health check should have retries."""
        healthcheck = mcp_service.get('healthcheck', {})
        assert 'retries' in healthcheck

    def test_healthcheck_has_start_period(self, mcp_service):
        """Health check should have start_period."""
        healthcheck = mcp_service.get('healthcheck', {})
        assert 'start_period' in healthcheck


# ============================================================================
# Integration Tests
# ============================================================================

class TestDockerComposeIntegration:
    """Integration tests for docker-compose configuration."""

    @pytest.fixture
    def config(self):
        """Load docker-compose configuration."""
        return load_docker_compose()

    @pytest.fixture
    def mcp_service(self, config):
        """Get the mcp-container service configuration."""
        return config.get('services', {}).get('mcp-container', {})

    def test_complete_service_configuration(self, mcp_service):
        """Service should have all required configurations."""
        # Check all main sections exist
        assert 'build' in mcp_service
        assert 'ports' in mcp_service
        assert 'volumes' in mcp_service
        assert 'environment' in mcp_service
        assert 'restart' in mcp_service
        assert 'deploy' in mcp_service

    def test_dockerfile_exists_for_build(self):
        """Dockerfile referenced in build should exist."""
        dockerfile_path = MCP_CONTAINER_DIR / "Dockerfile"
        assert dockerfile_path.exists()

    def test_src_directory_exists_for_volume(self):
        """src directory referenced in volume should exist."""
        src_path = MCP_CONTAINER_DIR / "src"
        assert src_path.exists()


# ============================================================================
# YAML Structure Tests
# ============================================================================

class TestDockerComposeYAMLStructure:
    """Tests for YAML structure and formatting."""

    @pytest.fixture
    def content(self):
        """Read raw docker-compose.yml content."""
        return DOCKER_COMPOSE_PATH.read_text()

    def test_has_comments(self, content):
        """docker-compose.yml should have comments for clarity."""
        assert '#' in content

    def test_proper_indentation(self, content):
        """YAML should use consistent indentation."""
        lines = content.split('\n')
        # Check that indentation is consistent (spaces, not tabs)
        for line in lines:
            if line.strip() and line != line.lstrip():
                # Has indentation, should be spaces
                indent = len(line) - len(line.lstrip())
                assert indent % 2 == 0, f"Indentation should be multiple of 2: {line}"

    def test_no_tabs(self, content):
        """YAML should not use tabs."""
        assert '\t' not in content


# ============================================================================
# Development Configuration Tests
# ============================================================================

class TestDevelopmentConfiguration:
    """Tests for development-specific configurations."""

    @pytest.fixture
    def mcp_service(self):
        """Get the mcp-container service configuration."""
        config = load_docker_compose()
        return config.get('services', {}).get('mcp-container', {})

    def test_debug_logging_enabled(self, mcp_service):
        """DEBUG logging should be enabled for development."""
        env = mcp_service.get('environment', [])
        env_strings = [str(e) for e in env]
        assert any('LOG_LEVEL=DEBUG' in e or 'LOG_LEVEL' in e and 'DEBUG' in e
                   for e in env_strings)

    def test_volumes_enable_hot_reload(self, mcp_service):
        """Volumes should enable hot-reload of source code."""
        volumes = mcp_service.get('volumes', [])
        # Should have src mounted for development
        volume_strings = [str(v) for v in volumes]
        assert any('./src:' in v or 'src:' in v for v in volume_strings)

    def test_restart_policy_not_always(self, mcp_service):
        """Restart policy should not be 'always' for development."""
        # 'unless-stopped' is better for development
        restart = mcp_service.get('restart', '')
        assert restart != 'always'
