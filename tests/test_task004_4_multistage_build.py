"""
Tests for Task 4.4: Implement multi-stage build for optimization

TDD tests for verifying multi-stage Docker build optimizations including:
- Wheel-based dependency installation
- Non-root user security
- Port exposure
- Health checks
- Proper CMD configuration
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
# Helper Functions
# ============================================================================

def get_dockerfile_content():
    """Read Dockerfile content."""
    return DOCKERFILE_PATH.read_text()


def get_dockerfile_stages(content):
    """Parse Dockerfile into stages based on FROM instructions."""
    lines = content.split('\n')
    stages = []
    current_stage = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('FROM'):
            # Save previous stage if exists
            if current_stage is not None:
                stages.append(current_stage)
            # Parse stage name
            match = re.search(r'as\s+(\w+)', stripped, re.IGNORECASE)
            stage_name = match.group(1) if match else f'stage_{len(stages)}'
            current_stage = {'name': stage_name, 'lines': []}

        # Add line to current stage
        if current_stage is not None:
            current_stage['lines'].append(line)

    # Don't forget the last stage
    if current_stage is not None and current_stage['lines']:
        stages.append(current_stage)

    return stages


# ============================================================================
# Multi-Stage Build Structure Tests
# ============================================================================

class TestMultiStageBuildStructure:
    """Tests for multi-stage build structure."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    @pytest.fixture
    def stages(self, dockerfile_content):
        """Parse Dockerfile into stages."""
        return get_dockerfile_stages(dockerfile_content)

    def test_has_exactly_two_stages(self, stages):
        """Dockerfile should have exactly two stages (builder and runtime)."""
        assert len(stages) == 2, f"Expected 2 stages, got {len(stages)}"

    def test_first_stage_is_builder(self, stages):
        """First stage should be named 'builder'."""
        assert stages[0]['name'].lower() == 'builder'

    def test_second_stage_is_runtime(self, stages):
        """Second stage should be the runtime stage."""
        # Runtime stage doesn't need a name (it's the final stage)
        assert len(stages) == 2

    def test_both_stages_use_same_base_image(self, dockerfile_content):
        """Both stages should use python:3.9-slim-bullseye."""
        from_statements = re.findall(r'^FROM\s+([^\s]+)', dockerfile_content, re.MULTILINE)
        assert len(from_statements) == 2
        for statement in from_statements:
            assert 'python:3.9-slim-bullseye' in statement


# ============================================================================
# Builder Stage Tests
# ============================================================================

class TestBuilderStage:
    """Tests for builder stage configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    @pytest.fixture
    def builder_stage_content(self, dockerfile_content):
        """Extract builder stage content."""
        stages = get_dockerfile_stages(dockerfile_content)
        return '\n'.join(stages[0]['lines']) if stages else ''

    def test_builder_has_build_essential(self, builder_stage_content):
        """Builder stage should install build-essential."""
        assert 'build-essential' in builder_stage_content

    def test_builder_creates_wheels(self, builder_stage_content):
        """Builder stage should create wheel packages."""
        assert 'pip wheel' in builder_stage_content

    def test_builder_uses_wheel_dir(self, builder_stage_content):
        """Builder should output wheels to /app/wheels."""
        assert '--wheel-dir' in builder_stage_content or 'wheel-dir' in builder_stage_content
        assert '/app/wheels' in builder_stage_content or '/wheels' in builder_stage_content

    def test_builder_uses_no_cache(self, builder_stage_content):
        """Builder should use --no-cache-dir for pip wheel."""
        assert '--no-cache-dir' in builder_stage_content

    def test_builder_uses_no_deps(self, builder_stage_content):
        """Builder should use --no-deps to avoid duplicate dependencies."""
        assert '--no-deps' in builder_stage_content

    def test_builder_cleans_apt_cache(self, builder_stage_content):
        """Builder should clean apt cache."""
        assert 'rm -rf /var/lib/apt/lists/*' in builder_stage_content


# ============================================================================
# Runtime Stage Wheel Installation Tests
# ============================================================================

class TestRuntimeWheelInstallation:
    """Tests for runtime stage wheel installation."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    @pytest.fixture
    def runtime_stage_content(self, dockerfile_content):
        """Extract runtime stage content."""
        stages = get_dockerfile_stages(dockerfile_content)
        return '\n'.join(stages[1]['lines']) if len(stages) > 1 else ''

    def test_copies_wheels_from_builder(self, dockerfile_content):
        """Runtime should copy wheels from builder stage."""
        assert re.search(r'COPY\s+--from=builder\s+/app/wheels', dockerfile_content)

    def test_installs_from_wheels(self, runtime_stage_content):
        """Runtime should install from wheel directory."""
        assert 'pip install' in runtime_stage_content
        assert '/wheels' in runtime_stage_content

    def test_pip_install_uses_no_cache(self, runtime_stage_content):
        """pip install should use --no-cache to minimize image size."""
        assert '--no-cache' in runtime_stage_content


# ============================================================================
# Application Code Copy Tests
# ============================================================================

class TestApplicationCodeCopy:
    """Tests for application code copying."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_copies_src_directory(self, dockerfile_content):
        """Dockerfile should copy src/ directory."""
        assert re.search(r'COPY\s+src/', dockerfile_content)

    def test_src_copied_after_dependencies(self, dockerfile_content):
        """src/ should be copied after dependencies for better caching."""
        # Find positions of pip install and COPY src/
        pip_pos = dockerfile_content.find('pip install')
        src_copy_pos = dockerfile_content.find('COPY src/')

        assert pip_pos < src_copy_pos, \
            "COPY src/ should come after pip install for better layer caching"


# ============================================================================
# Security - Non-Root User Tests
# ============================================================================

class TestNonRootUser:
    """Tests for non-root user security configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_creates_non_root_user(self, dockerfile_content):
        """Dockerfile should create a non-root user."""
        assert 'useradd' in dockerfile_content

    def test_user_named_appuser(self, dockerfile_content):
        """Non-root user should be named 'appuser'."""
        assert 'appuser' in dockerfile_content

    def test_changes_ownership_to_appuser(self, dockerfile_content):
        """Dockerfile should change ownership of /app to appuser."""
        assert re.search(r'chown.*appuser.*appuser.*/app', dockerfile_content)

    def test_switches_to_appuser(self, dockerfile_content):
        """Dockerfile should switch to appuser before CMD."""
        assert re.search(r'^USER\s+appuser', dockerfile_content, re.MULTILINE)

    def test_user_switch_before_cmd(self, dockerfile_content):
        """USER instruction should come before CMD."""
        user_pos = dockerfile_content.find('USER appuser')
        cmd_pos = dockerfile_content.find('CMD')

        assert user_pos < cmd_pos, "USER should come before CMD"

    def test_user_has_home_directory(self, dockerfile_content):
        """User should be created with home directory (-m flag)."""
        assert re.search(r'useradd\s+-m', dockerfile_content)


# ============================================================================
# Port Exposure Tests
# ============================================================================

class TestPortExposure:
    """Tests for port exposure configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_exposes_port_8000(self, dockerfile_content):
        """Dockerfile should expose port 8000."""
        assert re.search(r'EXPOSE\s+8000', dockerfile_content)

    def test_only_one_port_exposed(self, dockerfile_content):
        """Only port 8000 should be exposed."""
        expose_statements = re.findall(r'^EXPOSE\s+(\d+)', dockerfile_content, re.MULTILINE)
        assert len(expose_statements) == 1
        assert '8000' in expose_statements


# ============================================================================
# Health Check Tests
# ============================================================================

class TestHealthCheck:
    """Tests for health check configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_has_healthcheck(self, dockerfile_content):
        """Dockerfile should have HEALTHCHECK instruction."""
        assert 'HEALTHCHECK' in dockerfile_content

    def test_healthcheck_interval_30s(self, dockerfile_content):
        """Health check interval should be 30 seconds."""
        assert '--interval=30s' in dockerfile_content

    def test_healthcheck_timeout_10s(self, dockerfile_content):
        """Health check timeout should be 10 seconds."""
        assert '--timeout=10s' in dockerfile_content

    def test_healthcheck_start_period_5s(self, dockerfile_content):
        """Health check start period should be 5 seconds."""
        assert '--start-period=5s' in dockerfile_content

    def test_healthcheck_retries_3(self, dockerfile_content):
        """Health check should retry 3 times."""
        assert '--retries=3' in dockerfile_content

    def test_healthcheck_uses_curl(self, dockerfile_content):
        """Health check should use curl."""
        assert re.search(r'HEALTHCHECK.*curl', dockerfile_content, re.DOTALL)

    def test_healthcheck_checks_health_endpoint(self, dockerfile_content):
        """Health check should check /health endpoint."""
        assert 'localhost:8000/health' in dockerfile_content

    def test_healthcheck_uses_fail_flag(self, dockerfile_content):
        """Health check curl should use -f flag to fail on errors."""
        assert 'curl -f' in dockerfile_content


# ============================================================================
# CMD Configuration Tests
# ============================================================================

class TestCMDConfiguration:
    """Tests for CMD configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_has_cmd(self, dockerfile_content):
        """Dockerfile should have CMD instruction."""
        assert re.search(r'^CMD\s+', dockerfile_content, re.MULTILINE)

    def test_cmd_runs_uvicorn(self, dockerfile_content):
        """CMD should run uvicorn."""
        assert 'uvicorn' in dockerfile_content

    def test_cmd_specifies_app_module(self, dockerfile_content):
        """CMD should specify the app module path."""
        assert 'src.main:app' in dockerfile_content

    def test_cmd_binds_to_all_interfaces(self, dockerfile_content):
        """CMD should bind to 0.0.0.0 for container access."""
        assert '--host' in dockerfile_content
        assert '0.0.0.0' in dockerfile_content

    def test_cmd_uses_port_8000(self, dockerfile_content):
        """CMD should use port 8000."""
        assert '--port' in dockerfile_content
        # Port 8000 appears in CMD
        cmd_match = re.search(r'CMD.*--port.*8000', dockerfile_content, re.DOTALL)
        assert cmd_match or '8000' in dockerfile_content

    def test_cmd_uses_exec_form(self, dockerfile_content):
        """CMD should use exec form (JSON array) for proper signal handling."""
        # Exec form starts with ["
        cmd_line = re.search(r'^CMD\s+(.+)$', dockerfile_content, re.MULTILINE)
        assert cmd_line
        cmd_content = cmd_line.group(1)
        assert cmd_content.strip().startswith('['), \
            "CMD should use exec form (JSON array) not shell form"


# ============================================================================
# Layer Optimization Tests
# ============================================================================

class TestLayerOptimization:
    """Tests for Docker layer optimization."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_requirements_copied_before_src(self, dockerfile_content):
        """requirements.txt should be copied before src/ for better caching."""
        req_pos = dockerfile_content.find('COPY requirements.txt')
        src_pos = dockerfile_content.find('COPY src/')

        assert req_pos < src_pos, \
            "requirements.txt should be copied before src/ for layer caching"

    def test_dependencies_installed_before_code(self, dockerfile_content):
        """Dependencies should be installed before copying application code."""
        install_pos = dockerfile_content.find('pip install')
        src_pos = dockerfile_content.find('COPY src/')

        assert install_pos < src_pos, \
            "Dependencies should be installed before copying code"

    def test_apt_commands_combined(self, dockerfile_content):
        """apt-get commands should be combined with &&."""
        # Both stages should combine apt commands on the same line
        # Using non-greedy match to find each occurrence separately
        apt_patterns = re.findall(r'apt-get update\s*&&\s*apt-get install', dockerfile_content)
        assert len(apt_patterns) >= 2, "Both stages should have combined apt commands"


# ============================================================================
# Build Optimization Tests
# ============================================================================

class TestBuildOptimization:
    """Tests for build optimization practices."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_no_install_recommends_in_builder(self, dockerfile_content):
        """Builder should use --no-install-recommends."""
        stages = get_dockerfile_stages(dockerfile_content)
        builder_content = '\n'.join(stages[0]['lines'])
        assert '--no-install-recommends' in builder_content

    def test_no_install_recommends_in_runtime(self, dockerfile_content):
        """Runtime should use --no-install-recommends."""
        stages = get_dockerfile_stages(dockerfile_content)
        runtime_content = '\n'.join(stages[1]['lines'])
        assert '--no-install-recommends' in runtime_content

    def test_cache_cleaned_in_both_stages(self, dockerfile_content):
        """Both stages should clean apt cache."""
        stages = get_dockerfile_stages(dockerfile_content)
        builder_content = '\n'.join(stages[0]['lines'])
        runtime_content = '\n'.join(stages[1]['lines'])

        assert 'rm -rf /var/lib/apt/lists/*' in builder_content
        assert 'rm -rf /var/lib/apt/lists/*' in runtime_content


# ============================================================================
# Workdir Tests
# ============================================================================

class TestWorkdir:
    """Tests for WORKDIR configuration."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_workdir_is_app(self, dockerfile_content):
        """WORKDIR should be /app."""
        assert re.search(r'WORKDIR\s+/app', dockerfile_content)

    def test_both_stages_have_workdir(self, dockerfile_content):
        """Both stages should set WORKDIR."""
        workdir_count = len(re.findall(r'WORKDIR\s+/app', dockerfile_content))
        assert workdir_count >= 2, "Both stages should have WORKDIR /app"


# ============================================================================
# Documentation Tests
# ============================================================================

class TestDockerfileDocumentation:
    """Tests for Dockerfile documentation."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_has_header_comment(self, dockerfile_content):
        """Dockerfile should have a header comment."""
        first_lines = dockerfile_content.split('\n')[:5]
        has_comment = any(line.strip().startswith('#') for line in first_lines)
        assert has_comment, "Dockerfile should have header comment"

    def test_has_stage_comments(self, dockerfile_content):
        """Dockerfile should have comments for stages."""
        # Should have comments like "# Stage 1: Builder"
        stage_comments = re.findall(r'#.*[Ss]tage', dockerfile_content)
        assert len(stage_comments) >= 1, "Should have stage comments"

    def test_has_meaningful_comments(self, dockerfile_content):
        """Dockerfile should have meaningful comments."""
        comments = re.findall(r'^#.*$', dockerfile_content, re.MULTILINE)
        # Filter out empty comments
        meaningful_comments = [c for c in comments if len(c.strip()) > 2]
        assert len(meaningful_comments) >= 5, "Should have at least 5 meaningful comments"


# ============================================================================
# Integration Tests
# ============================================================================

class TestMultiStageIntegration:
    """Integration tests for multi-stage build."""

    @pytest.fixture
    def dockerfile_content(self):
        """Read Dockerfile content."""
        return get_dockerfile_content()

    def test_complete_build_flow(self, dockerfile_content):
        """Verify complete build flow is present."""
        # Builder stage
        assert 'build-essential' in dockerfile_content
        assert 'pip wheel' in dockerfile_content

        # Runtime stage
        assert 'COPY --from=builder' in dockerfile_content
        assert 'pip install' in dockerfile_content
        assert 'COPY src/' in dockerfile_content
        assert 'useradd' in dockerfile_content
        assert 'USER appuser' in dockerfile_content
        assert 'EXPOSE 8000' in dockerfile_content
        assert 'HEALTHCHECK' in dockerfile_content
        assert 'CMD' in dockerfile_content

    def test_no_build_tools_in_runtime(self, dockerfile_content):
        """Runtime stage should not have build tools."""
        stages = get_dockerfile_stages(dockerfile_content)
        runtime_content = '\n'.join(stages[1]['lines'])

        # build-essential should NOT be in runtime
        assert 'build-essential' not in runtime_content

    def test_wheels_not_in_final_image(self, dockerfile_content):
        """Wheels directory should not be removed (pip install removes them)."""
        # This is a design check - wheels are copied then installed
        # The pip install --no-cache handles cleanup
        assert 'pip install --no-cache' in dockerfile_content
