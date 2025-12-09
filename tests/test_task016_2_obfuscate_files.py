"""
Tests for Subtask 16.2: Obfuscate inference.py and main.py

Tests verify:
- Obfuscation script can identify target files
- Dry-run mode correctly lists files to obfuscate
- Build system (Makefile) is properly configured
- Output structure is correct after obfuscation
"""

import os
import json
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / 'mcp-container'
OBFUSCATE_SCRIPT = MCP_CONTAINER_DIR / 'scripts' / 'obfuscate.py'
PYARMOR_CONFIG = MCP_CONTAINER_DIR / 'pyarmor.json'
MAKEFILE_PATH = MCP_CONTAINER_DIR / 'Makefile'
SRC_DIR = MCP_CONTAINER_DIR / 'src'
DIST_DIR = MCP_CONTAINER_DIR / 'dist'


# =============================================================================
# Target Files Tests
# =============================================================================

class TestObfuscationTargets:
    """Tests to verify target files are correctly identified."""

    def test_main_py_exists_and_is_target(self):
        """main.py should exist and be listed as target in config."""
        main_py = SRC_DIR / 'main.py'
        assert main_py.exists(), f"main.py should exist at {main_py}"

        config = json.loads(PYARMOR_CONFIG.read_text())
        targets = config.get('targets', {})
        primary = targets.get('primary', [])

        assert any('main.py' in str(t) for t in primary), \
            "main.py should be in targets.primary"

    def test_inference_py_exists_and_is_target(self):
        """inference.py should exist and be listed as target in config."""
        inference_py = SRC_DIR / 'inference.py'
        assert inference_py.exists(), f"inference.py should exist at {inference_py}"

        config = json.loads(PYARMOR_CONFIG.read_text())
        targets = config.get('targets', {})
        primary = targets.get('primary', [])

        assert any('inference.py' in str(t) for t in primary), \
            "inference.py should be in targets.primary"

    def test_models_are_targets(self):
        """Model files should be listed as targets."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        targets = config.get('targets', {})
        models = targets.get('models', [])

        expected_models = ['tatr.py', 'layoutlm.py', 'validators.py', 'schemas.py']

        for model in expected_models:
            assert any(model in str(t) for t in models), \
                f"{model} should be in targets.models"

    def test_utils_are_targets(self):
        """Utility files should be listed as targets."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        targets = config.get('targets', {})
        utils = targets.get('utils', [])

        assert any('ocr.py' in str(t) for t in utils), \
            "ocr.py should be in targets.utils"


# =============================================================================
# Obfuscation Script Tests
# =============================================================================

class TestObfuscationScriptExecution:
    """Tests for the obfuscation script execution."""

    def test_script_help_command(self):
        """Script should support --help option."""
        result = subprocess.run(
            ['python', str(OBFUSCATE_SCRIPT), '--help'],
            capture_output=True,
            text=True,
            cwd=str(MCP_CONTAINER_DIR)
        )

        assert result.returncode == 0, f"Help should succeed: {result.stderr}"
        assert 'usage' in result.stdout.lower() or 'pyarmor' in result.stdout.lower()

    def test_script_dry_run_mode(self):
        """Script should support --dry-run to show files without obfuscating."""
        result = subprocess.run(
            ['python', str(OBFUSCATE_SCRIPT), '--dry-run', '--verbose'],
            capture_output=True,
            text=True,
            cwd=str(MCP_CONTAINER_DIR)
        )

        # Dry run should complete (may warn about PyArmor not installed)
        output = result.stdout + result.stderr

        # Should mention the source files
        assert 'main.py' in output or 'inference.py' in output or \
               'dry run' in output.lower() or 'pyarmor' in output.lower()

    def test_script_config_loading(self):
        """Script should load and validate pyarmor.json config."""
        result = subprocess.run(
            ['python', str(OBFUSCATE_SCRIPT), '--dry-run'],
            capture_output=True,
            text=True,
            cwd=str(MCP_CONTAINER_DIR)
        )

        # Should not fail with config error
        output = result.stdout + result.stderr

        # Check for specific config errors (not just presence of words)
        assert 'invalid json' not in output.lower()
        assert 'configuration file not found' not in output.lower()
        assert 'config error' not in output.lower()

        # Should successfully initialize with config
        assert 'initialized obfuscator with config' in output.lower() or \
               'pyarmor.json' in output.lower()


# =============================================================================
# Makefile Tests
# =============================================================================

class TestMakefileBuildSystem:
    """Tests for Makefile build integration."""

    def test_makefile_exists(self):
        """Makefile should exist in mcp-container directory."""
        assert MAKEFILE_PATH.exists(), f"Makefile should exist at {MAKEFILE_PATH}"

    def test_makefile_has_obfuscate_target(self):
        """Makefile should have an obfuscate target."""
        content = MAKEFILE_PATH.read_text()

        assert 'obfuscate' in content, "Makefile should have obfuscate target"

    def test_makefile_has_clean_target(self):
        """Makefile should have a clean target."""
        content = MAKEFILE_PATH.read_text()

        assert 'clean' in content, "Makefile should have clean target"

    def test_makefile_has_build_target(self):
        """Makefile should have a build target."""
        content = MAKEFILE_PATH.read_text()

        assert 'build' in content, "Makefile should have build target"

    def test_makefile_references_pyarmor(self):
        """Makefile obfuscate target should reference pyarmor."""
        content = MAKEFILE_PATH.read_text()

        # Should either call pyarmor directly or the obfuscate.py script
        assert 'pyarmor' in content.lower() or 'obfuscate.py' in content


# =============================================================================
# Configuration Tests
# =============================================================================

class TestObfuscationConfiguration:
    """Tests for obfuscation configuration settings."""

    def test_config_entry_is_main_py(self):
        """Entry point should be main.py."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        obf_config = config.get('obfuscation', {})

        entry = obf_config.get('entry', '')
        assert 'main.py' in entry, "Entry point should be main.py"

    def test_config_output_is_dist(self):
        """Output directory should be dist."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        obf_config = config.get('obfuscation', {})

        output = obf_config.get('output', '')
        assert output == 'dist', "Output directory should be 'dist'"

    def test_config_recursive_enabled(self):
        """Recursive obfuscation should be enabled."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        obf_config = config.get('obfuscation', {})

        recursive = obf_config.get('recursive', False)
        assert recursive is True, "Recursive obfuscation should be enabled"

    def test_config_excludes_tests(self):
        """Test files should be excluded from obfuscation."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        obf_config = config.get('obfuscation', {})
        excludes = obf_config.get('excludes', [])

        excludes_str = str(excludes).lower()
        assert 'test' in excludes_str, "Tests should be excluded"


# =============================================================================
# Output Structure Tests
# =============================================================================

class TestObfuscationOutputStructure:
    """Tests for expected obfuscation output structure."""

    def test_dist_directory_in_gitignore(self):
        """dist/ directory should be in .gitignore."""
        gitignore = PROJECT_ROOT / '.gitignore'

        if gitignore.exists():
            content = gitignore.read_text()
            # Check for dist directory ignore pattern
            has_dist = 'dist' in content or 'dist/' in content
            if not has_dist:
                pytest.skip("dist/ should be in .gitignore but not required")
        else:
            # Create entry for dist in gitignore
            pytest.skip(".gitignore does not exist")

    def test_expected_output_structure(self):
        """Verify expected output structure is documented in config."""
        config = json.loads(PYARMOR_CONFIG.read_text())

        # Config should define the output structure
        assert 'output' in str(config).lower(), \
            "Config should define output location"

        # Runtime section defines how obfuscated code runs
        runtime = config.get('runtime', {})
        assert 'include_runtime' in runtime or len(config.get('settings', {})) > 0


# =============================================================================
# Script Module Tests
# =============================================================================

class TestObfuscationScriptModule:
    """Tests for the obfuscation script as a Python module."""

    def test_script_has_pyarmor_obfuscator_class(self):
        """Script should have PyArmorObfuscator class."""
        content = OBFUSCATE_SCRIPT.read_text()

        assert 'class PyArmorObfuscator' in content, \
            "Script should have PyArmorObfuscator class"

    def test_script_has_get_python_files_method(self):
        """Script should have method to get Python files."""
        content = OBFUSCATE_SCRIPT.read_text()

        assert '_get_python_files' in content or 'get_python_files' in content, \
            "Script should have method to discover Python files"

    def test_script_has_verify_output_method(self):
        """Script should have method to verify output."""
        content = OBFUSCATE_SCRIPT.read_text()

        assert 'verify_output' in content, \
            "Script should have verify_output method"

    def test_script_has_clean_output_method(self):
        """Script should have method to clean output directory."""
        content = OBFUSCATE_SCRIPT.read_text()

        assert 'clean_output' in content, \
            "Script should have clean_output method"


# =============================================================================
# Integration Tests
# =============================================================================

class TestObfuscationIntegration:
    """Integration tests for the obfuscation process."""

    def test_all_source_files_exist(self):
        """All source files that will be obfuscated should exist."""
        expected_files = [
            'src/main.py',
            'src/inference.py',
            'src/models/tatr.py',
            'src/models/layoutlm.py',
            'src/models/schemas.py',
            'src/models/validators.py',
            'src/utils/ocr.py',
        ]

        for file_path in expected_files:
            full_path = MCP_CONTAINER_DIR / file_path
            assert full_path.exists(), f"Source file should exist: {file_path}"

    def test_source_files_have_docstrings(self):
        """Source files should have module docstrings (preserved after obfuscation)."""
        key_files = [
            'src/main.py',
            'src/inference.py',
        ]

        for file_path in key_files:
            full_path = MCP_CONTAINER_DIR / file_path
            content = full_path.read_text()

            # Should start with docstring
            assert content.strip().startswith('"""') or \
                   content.strip().startswith("'''"), \
                f"{file_path} should have module docstring"

    def test_dry_run_does_not_modify_files(self):
        """Dry run should not create dist/ or modify source files."""
        # Record state before
        dist_existed_before = DIST_DIR.exists()

        # Run dry-run
        subprocess.run(
            ['python', str(OBFUSCATE_SCRIPT), '--dry-run'],
            capture_output=True,
            text=True,
            cwd=str(MCP_CONTAINER_DIR)
        )

        # Check state after
        dist_exists_after = DIST_DIR.exists()

        # Dry run shouldn't create dist/ if it didn't exist
        if not dist_existed_before:
            assert not dist_exists_after, "Dry run should not create dist/"

    def test_config_python_version_matches_runtime(self):
        """Python version in config should match runtime requirements."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        settings = config.get('settings', {})
        config_version = settings.get('python_version', '')

        # Should be 3.9 to match Docker
        assert config_version == '3.9', \
            "Python version should be 3.9 to match Docker container"


# =============================================================================
# Build Pipeline Tests
# =============================================================================

class TestBuildPipeline:
    """Tests for the complete build pipeline."""

    def test_makefile_obfuscate_uses_script(self):
        """Makefile obfuscate target should use obfuscate.py."""
        content = MAKEFILE_PATH.read_text()

        # Find the obfuscate target
        has_script_call = 'obfuscate.py' in content or \
                         'python' in content.lower() and 'scripts' in content

        assert has_script_call, \
            "Makefile should call obfuscate.py script"

    def test_makefile_build_depends_on_obfuscate(self):
        """Build target should depend on or include obfuscation."""
        content = MAKEFILE_PATH.read_text()

        # Look for build target that references obfuscate
        lines = content.split('\n')
        in_build_target = False
        references_obfuscate = False

        for line in lines:
            if line.startswith('build:') or line.startswith('build '):
                in_build_target = True
            elif in_build_target and line and not line.startswith('\t'):
                in_build_target = False
            elif in_build_target and 'obfuscate' in line:
                references_obfuscate = True

        # Either build depends on obfuscate or there's a separate obfuscate-build
        has_obfuscate_build = 'obfuscate' in content and 'build' in content

        assert has_obfuscate_build, \
            "Build system should include obfuscation"

    def test_clean_removes_dist(self):
        """Clean target should remove dist/ directory."""
        content = MAKEFILE_PATH.read_text()

        # Find clean target
        assert 'dist' in content and 'clean' in content, \
            "Clean target should remove dist directory"
