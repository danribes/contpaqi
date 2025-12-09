"""
Tests for Subtask 16.1: Install and configure PyArmor for Python

Tests verify:
- PyArmor is added to requirements
- PyArmor configuration file exists
- Obfuscation build script exists
- Configuration is valid and targets correct files
"""

import os
import json
import subprocess
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / 'mcp-container'
REQUIREMENTS_PATH = MCP_CONTAINER_DIR / 'requirements.txt'
REQUIREMENTS_DEV_PATH = MCP_CONTAINER_DIR / 'requirements-dev.txt'
PYARMOR_CONFIG_PATH = MCP_CONTAINER_DIR / 'pyarmor.json'
OBFUSCATE_SCRIPT_PATH = MCP_CONTAINER_DIR / 'scripts' / 'obfuscate.py'
SRC_DIR = MCP_CONTAINER_DIR / 'src'


# =============================================================================
# Requirements Tests
# =============================================================================

class TestPyArmorRequirements:
    """Tests for PyArmor dependency in requirements."""

    def test_pyarmor_in_dev_requirements(self):
        """PyArmor should be in dev requirements for build-time obfuscation."""
        assert REQUIREMENTS_DEV_PATH.exists(), "requirements-dev.txt should exist"

        content = REQUIREMENTS_DEV_PATH.read_text()
        assert 'pyarmor' in content.lower(), "pyarmor should be in requirements-dev.txt"

    def test_pyarmor_version_pinned(self):
        """PyArmor version should be pinned for reproducible builds."""
        content = REQUIREMENTS_DEV_PATH.read_text()

        # Find pyarmor line
        pyarmor_lines = [line for line in content.split('\n')
                        if line.strip().lower().startswith('pyarmor')]

        assert len(pyarmor_lines) > 0, "PyArmor should be in requirements"
        pyarmor_line = pyarmor_lines[0]

        # Should have version specifier
        assert '==' in pyarmor_line or '>=' in pyarmor_line, \
            "PyArmor version should be pinned (e.g., pyarmor==8.x.x)"

    def test_pyarmor_not_in_runtime_requirements(self):
        """PyArmor should NOT be in runtime requirements (only needed at build time)."""
        content = REQUIREMENTS_PATH.read_text()

        # PyArmor should not be in runtime requirements
        assert 'pyarmor' not in content.lower(), \
            "PyArmor should not be in runtime requirements (it's a build-time tool)"


# =============================================================================
# Configuration File Tests
# =============================================================================

class TestPyArmorConfig:
    """Tests for PyArmor configuration file."""

    def test_config_file_exists(self):
        """PyArmor configuration file should exist."""
        assert PYARMOR_CONFIG_PATH.exists(), \
            f"PyArmor config should exist at {PYARMOR_CONFIG_PATH}"

    def test_config_is_valid_json(self):
        """Configuration file should be valid JSON."""
        content = PYARMOR_CONFIG_PATH.read_text()

        try:
            config = json.loads(content)
        except json.JSONDecodeError as e:
            pytest.fail(f"pyarmor.json is not valid JSON: {e}")

        assert isinstance(config, dict), "Config should be a JSON object"

    def test_config_has_required_sections(self):
        """Configuration should have required sections."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())

        # Check for essential configuration sections
        assert 'pyarmor' in config or 'obfuscation' in config or 'settings' in config, \
            "Config should have pyarmor, obfuscation, or settings section"

    def test_config_targets_src_directory(self):
        """Configuration should target the src directory."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())

        # The config should reference src directory or specific files
        config_str = json.dumps(config).lower()

        assert 'src' in config_str or 'source' in config_str, \
            "Config should reference src directory"

    def test_config_has_output_directory(self):
        """Configuration should specify an output directory."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())

        config_str = json.dumps(config).lower()

        assert 'output' in config_str or 'dist' in config_str or 'dest' in config_str, \
            "Config should specify output/dist directory"


# =============================================================================
# Obfuscation Script Tests
# =============================================================================

class TestObfuscationScript:
    """Tests for the obfuscation build script."""

    def test_script_exists(self):
        """Obfuscation script should exist."""
        assert OBFUSCATE_SCRIPT_PATH.exists(), \
            f"Obfuscation script should exist at {OBFUSCATE_SCRIPT_PATH}"

    def test_script_is_valid_python(self):
        """Obfuscation script should be valid Python."""
        content = OBFUSCATE_SCRIPT_PATH.read_text()

        try:
            compile(content, OBFUSCATE_SCRIPT_PATH, 'exec')
        except SyntaxError as e:
            pytest.fail(f"obfuscate.py has syntax errors: {e}")

    def test_script_has_main_function(self):
        """Script should have a main function."""
        content = OBFUSCATE_SCRIPT_PATH.read_text()

        assert 'def main' in content or 'def obfuscate' in content, \
            "Script should have a main or obfuscate function"

    def test_script_has_docstring(self):
        """Script should have a module docstring."""
        content = OBFUSCATE_SCRIPT_PATH.read_text()

        # Check for docstring at the beginning
        assert content.strip().startswith('"""') or content.strip().startswith("'''"), \
            "Script should have a module docstring"

    def test_script_imports_pyarmor(self):
        """Script should import or invoke PyArmor."""
        content = OBFUSCATE_SCRIPT_PATH.read_text()

        # Check for PyArmor usage
        assert 'pyarmor' in content.lower() or 'subprocess' in content, \
            "Script should use PyArmor (import or subprocess call)"

    def test_script_handles_errors(self):
        """Script should have error handling."""
        content = OBFUSCATE_SCRIPT_PATH.read_text()

        assert 'try' in content or 'except' in content or 'raise' in content, \
            "Script should have error handling"


# =============================================================================
# Target Files Tests
# =============================================================================

class TestObfuscationTargets:
    """Tests to verify target files for obfuscation exist."""

    def test_inference_py_exists(self):
        """inference.py should exist as obfuscation target."""
        target = SRC_DIR / 'inference.py'
        assert target.exists(), f"inference.py should exist at {target}"

    def test_main_py_exists(self):
        """main.py should exist as obfuscation target."""
        target = SRC_DIR / 'main.py'
        assert target.exists(), f"main.py should exist at {target}"

    def test_models_directory_exists(self):
        """models/ directory should exist with AI model code."""
        models_dir = SRC_DIR / 'models'
        assert models_dir.exists() and models_dir.is_dir(), \
            f"models/ directory should exist at {models_dir}"

    def test_utils_directory_exists(self):
        """utils/ directory should exist with utility code."""
        utils_dir = SRC_DIR / 'utils'
        assert utils_dir.exists() and utils_dir.is_dir(), \
            f"utils/ directory should exist at {utils_dir}"


# =============================================================================
# Configuration Content Tests
# =============================================================================

class TestPyArmorConfigContent:
    """Tests for specific PyArmor configuration settings."""

    def test_config_specifies_python_version(self):
        """Configuration should specify Python version compatibility."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())
        config_str = json.dumps(config)

        # Check for Python version reference
        has_python_version = (
            'python' in config_str.lower() and
            ('3.9' in config_str or '3' in config_str)
        ) or 'py3' in config_str.lower()

        assert has_python_version or 'runtime' in config_str.lower(), \
            "Config should reference Python version or runtime settings"

    def test_config_has_license_info(self):
        """Configuration should have license/project info."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())
        config_str = json.dumps(config).lower()

        # Should have some project/license info
        has_info = (
            'name' in config_str or
            'project' in config_str or
            'license' in config_str or
            'contpaqi' in config_str
        )

        assert has_info, "Config should have project name or license info"

    def test_config_excludes_test_files(self):
        """Configuration should exclude test files from obfuscation."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())
        config_str = json.dumps(config).lower()

        # Should have exclusion for tests
        has_exclusion = (
            'exclude' in config_str or
            'ignore' in config_str or
            'test' in config_str
        )

        # This is a soft check - it's good practice but not strictly required
        if not has_exclusion:
            pytest.skip("Test exclusion is recommended but not required")


# =============================================================================
# Build Integration Tests
# =============================================================================

class TestBuildIntegration:
    """Tests for build system integration."""

    def test_scripts_directory_exists(self):
        """scripts/ directory should exist in mcp-container."""
        scripts_dir = MCP_CONTAINER_DIR / 'scripts'
        assert scripts_dir.exists() and scripts_dir.is_dir(), \
            "scripts/ directory should exist"

    def test_makefile_or_build_script_exists(self):
        """There should be a Makefile or build script for obfuscation."""
        makefile = MCP_CONTAINER_DIR / 'Makefile'
        build_script = MCP_CONTAINER_DIR / 'scripts' / 'build.sh'

        has_build_system = makefile.exists() or build_script.exists()

        # It's okay if neither exists, the obfuscate.py can be run directly
        if not has_build_system:
            # Just check that obfuscate.py can be invoked standalone
            content = OBFUSCATE_SCRIPT_PATH.read_text()
            assert "if __name__" in content, \
                "obfuscate.py should be runnable as standalone script"

    def test_gitignore_excludes_dist(self):
        """Git should ignore the dist/ obfuscated output directory."""
        gitignore_path = PROJECT_ROOT / '.gitignore'

        if gitignore_path.exists():
            content = gitignore_path.read_text()
            has_dist_ignore = 'dist' in content or 'dist/' in content

            if not has_dist_ignore:
                pytest.skip("dist/ should be in .gitignore but not required")
        else:
            pytest.skip(".gitignore does not exist")


# =============================================================================
# PyArmor Version Compatibility Tests
# =============================================================================

class TestPyArmorVersionCompatibility:
    """Tests for PyArmor version compatibility."""

    def test_pyarmor_version_is_8x(self):
        """PyArmor version should be 8.x (latest major version)."""
        content = REQUIREMENTS_DEV_PATH.read_text()

        pyarmor_lines = [line for line in content.split('\n')
                        if line.strip().lower().startswith('pyarmor')]

        if not pyarmor_lines:
            pytest.fail("PyArmor not found in requirements-dev.txt")

        pyarmor_line = pyarmor_lines[0]

        # Check for version 8.x
        assert '8.' in pyarmor_line or '>=8' in pyarmor_line, \
            "PyArmor should be version 8.x for latest features and security"

    def test_config_uses_pyarmor_8_format(self):
        """Configuration should use PyArmor 8.x format."""
        config = json.loads(PYARMOR_CONFIG_PATH.read_text())

        # PyArmor 8 uses different config structure than 7.x
        # It should have certain keys like 'pyarmor' or use the new format
        config_keys = set(config.keys())

        # Valid PyArmor 8 config sections
        valid_sections = {'pyarmor', 'obfuscation', 'settings', 'runtime',
                         'bootstrap', 'pack', 'project', 'src', 'output'}

        has_valid_section = bool(config_keys & valid_sections)

        assert has_valid_section, \
            f"Config should have PyArmor 8.x sections. Found: {config_keys}"
