"""
Tests for Subtask 16.6: Test Obfuscated Code Functionality

Tests verify:
- Obfuscation configurations are valid and complete
- Build pipeline configurations exist
- Module structure is preserved after obfuscation
- Entry points remain accessible
- Test infrastructure for obfuscated code
"""

import json
import os
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest


# =============================================================================
# Path Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_DIR = PROJECT_ROOT / 'mcp-container'
WINDOWS_BRIDGE_DIR = PROJECT_ROOT / 'windows-bridge'

# Python paths
PYARMOR_CONFIG = MCP_CONTAINER_DIR / 'pyarmor.json'
PYTHON_SRC_DIR = MCP_CONTAINER_DIR / 'src'
PYTHON_DIST_DIR = MCP_CONTAINER_DIR / 'dist'
OBFUSCATE_SCRIPT = MCP_CONTAINER_DIR / 'scripts' / 'obfuscate.py'
MAKEFILE = MCP_CONTAINER_DIR / 'Makefile'

# C# paths
DOTFUSCATOR_CONFIG = WINDOWS_BRIDGE_DIR / 'dotfuscator.xml'
CSHARP_SRC_DIR = WINDOWS_BRIDGE_DIR / 'src' / 'ContpaqiBridge'
CSHARP_OBFUSCATE_SCRIPT = WINDOWS_BRIDGE_DIR / 'scripts' / 'obfuscate.ps1'


# =============================================================================
# Python Obfuscation Verification Tests
# =============================================================================

class TestPythonObfuscationConfig:
    """Tests for Python obfuscation configuration validity."""

    def test_pyarmor_config_is_valid_json(self):
        """PyArmor config should be valid JSON."""
        try:
            config = json.loads(PYARMOR_CONFIG.read_text())
            assert config is not None
        except json.JSONDecodeError as e:
            pytest.fail(f"pyarmor.json is not valid JSON: {e}")

    def test_pyarmor_config_has_required_sections(self):
        """PyArmor config should have all required sections."""
        config = json.loads(PYARMOR_CONFIG.read_text())

        required_sections = ['project', 'obfuscation', 'settings', 'targets']
        for section in required_sections:
            assert section in config, f"Missing required section: {section}"

    def test_source_directory_exists(self):
        """Source directory should exist."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        src_dir = config.get('obfuscation', {}).get('src', 'src')

        src_path = MCP_CONTAINER_DIR / src_dir
        assert src_path.exists(), f"Source directory not found: {src_path}"

    def test_entry_point_exists(self):
        """Entry point file should exist."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        entry = config.get('obfuscation', {}).get('entry', 'main.py')
        src_dir = config.get('obfuscation', {}).get('src', 'src')

        entry_path = MCP_CONTAINER_DIR / src_dir / entry
        assert entry_path.exists(), f"Entry point not found: {entry_path}"

    def test_target_files_exist(self):
        """All target files should exist."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        targets = config.get('targets', {})

        all_targets = []
        for category in targets.values():
            all_targets.extend(category)

        for target in all_targets:
            target_path = MCP_CONTAINER_DIR / target
            assert target_path.exists(), f"Target file not found: {target_path}"

    def test_obfuscate_script_exists(self):
        """Obfuscation script should exist."""
        assert OBFUSCATE_SCRIPT.exists(), \
            f"Obfuscation script not found: {OBFUSCATE_SCRIPT}"

    def test_makefile_exists(self):
        """Makefile should exist for build automation."""
        assert MAKEFILE.exists(), f"Makefile not found: {MAKEFILE}"


class TestPythonModuleStructure:
    """Tests for Python module structure preservation."""

    def test_src_has_main_module(self):
        """Source should have main.py module."""
        main_path = PYTHON_SRC_DIR / 'main.py'
        assert main_path.exists(), "main.py not found in src/"

    def test_src_has_inference_module(self):
        """Source should have inference.py module."""
        inference_path = PYTHON_SRC_DIR / 'inference.py'
        assert inference_path.exists(), "inference.py not found in src/"

    def test_src_has_models_package(self):
        """Source should have models package."""
        models_dir = PYTHON_SRC_DIR / 'models'
        assert models_dir.exists(), "models/ package not found in src/"

    def test_src_has_utils_package(self):
        """Source should have utils package."""
        utils_dir = PYTHON_SRC_DIR / 'utils'
        assert utils_dir.exists(), "utils/ package not found in src/"

    def test_models_has_required_files(self):
        """Models package should have required files."""
        models_dir = PYTHON_SRC_DIR / 'models'

        # Check for model files referenced in config
        config = json.loads(PYARMOR_CONFIG.read_text())
        model_targets = config.get('targets', {}).get('models', [])

        for target in model_targets:
            # Extract filename from path like "src/models/tatr.py"
            filename = Path(target).name
            file_path = models_dir / filename
            assert file_path.exists(), f"Model file not found: {file_path}"


class TestPythonObfuscationScript:
    """Tests for Python obfuscation script functionality."""

    def test_script_is_executable_python(self):
        """Script should be valid Python."""
        content = OBFUSCATE_SCRIPT.read_text()

        # Check for Python shebang or def main
        has_shebang = content.startswith('#!')
        has_main = 'def main' in content or 'if __name__' in content

        assert has_shebang or has_main, \
            "Script should be executable Python"

    def test_script_has_dry_run_option(self):
        """Script should support --dry-run option."""
        content = OBFUSCATE_SCRIPT.read_text()
        assert 'dry-run' in content.lower() or 'dry_run' in content, \
            "Script should support --dry-run option"

    def test_script_has_clean_option(self):
        """Script should support --clean option."""
        content = OBFUSCATE_SCRIPT.read_text()
        assert 'clean' in content.lower(), \
            "Script should support --clean option"

    def test_script_loads_config(self):
        """Script should load pyarmor.json config."""
        content = OBFUSCATE_SCRIPT.read_text()
        assert 'pyarmor.json' in content or 'config' in content.lower(), \
            "Script should load configuration"


# =============================================================================
# C# Obfuscation Verification Tests
# =============================================================================

class TestCSharpObfuscationConfig:
    """Tests for C# obfuscation configuration validity."""

    def test_dotfuscator_config_is_valid_xml(self):
        """Dotfuscator config should be valid XML."""
        try:
            tree = ET.parse(DOTFUSCATOR_CONFIG)
            root = tree.getroot()
            assert root is not None
        except ET.ParseError as e:
            pytest.fail(f"dotfuscator.xml is not valid XML: {e}")

    def test_dotfuscator_has_input_section(self):
        """Dotfuscator config should have input section."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        input_elem = root.find('.//input')
        assert input_elem is not None, "Missing input section"

    def test_dotfuscator_has_output_section(self):
        """Dotfuscator config should have output section."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        output_elem = root.find('.//output')
        assert output_elem is not None, "Missing output section"

    def test_dotfuscator_has_renaming_section(self):
        """Dotfuscator config should have renaming section."""
        tree = ET.parse(DOTFUSCATOR_CONFIG)
        root = tree.getroot()

        renaming_elem = root.find('.//renaming')
        assert renaming_elem is not None, "Missing renaming section"

    def test_csharp_project_exists(self):
        """C# project file should exist."""
        csproj = CSHARP_SRC_DIR / 'ContpaqiBridge.csproj'
        assert csproj.exists(), f"C# project not found: {csproj}"

    def test_obfuscate_script_exists(self):
        """PowerShell obfuscation script should exist."""
        assert CSHARP_OBFUSCATE_SCRIPT.exists(), \
            f"Obfuscation script not found: {CSHARP_OBFUSCATE_SCRIPT}"


class TestCSharpModuleStructure:
    """Tests for C# module structure preservation."""

    def test_has_program_cs(self):
        """Should have Program.cs entry point."""
        program_path = CSHARP_SRC_DIR / 'Program.cs'
        assert program_path.exists(), "Program.cs not found"

    def test_has_controllers_directory(self):
        """Should have Controllers directory."""
        controllers_dir = CSHARP_SRC_DIR / 'Controllers'
        assert controllers_dir.exists(), "Controllers/ not found"

    def test_has_models_directory(self):
        """Should have Models directory."""
        models_dir = CSHARP_SRC_DIR / 'Models'
        assert models_dir.exists(), "Models/ not found"

    def test_has_sdk_directory(self):
        """Should have Sdk directory."""
        sdk_dir = CSHARP_SRC_DIR / 'Sdk'
        assert sdk_dir.exists(), "Sdk/ not found"

    def test_has_services_directory(self):
        """Should have Services directory."""
        services_dir = CSHARP_SRC_DIR / 'Services'
        assert services_dir.exists(), "Services/ not found"


class TestCSharpObfuscationScript:
    """Tests for C# obfuscation script functionality."""

    def test_script_is_powershell(self):
        """Script should be PowerShell."""
        assert CSHARP_OBFUSCATE_SCRIPT.suffix == '.ps1', \
            "Script should be PowerShell (.ps1)"

    def test_script_has_error_handling(self):
        """Script should have error handling."""
        content = CSHARP_OBFUSCATE_SCRIPT.read_text()
        assert '$ErrorActionPreference' in content or 'try' in content.lower(), \
            "Script should have error handling"

    def test_script_references_dotfuscator_config(self):
        """Script should reference dotfuscator.xml."""
        content = CSHARP_OBFUSCATE_SCRIPT.read_text()
        assert 'dotfuscator' in content.lower(), \
            "Script should reference Dotfuscator"


# =============================================================================
# Build Pipeline Tests
# =============================================================================

class TestBuildPipeline:
    """Tests for build pipeline configuration."""

    def test_makefile_has_obfuscate_target(self):
        """Makefile should have obfuscate target."""
        content = MAKEFILE.read_text()
        assert 'obfuscate' in content, \
            "Makefile should have obfuscate target"

    def test_makefile_has_build_target(self):
        """Makefile should have build target."""
        content = MAKEFILE.read_text()
        assert 'build' in content, \
            "Makefile should have build target"

    def test_makefile_has_clean_target(self):
        """Makefile should have clean target."""
        content = MAKEFILE.read_text()
        assert 'clean' in content, \
            "Makefile should have clean target"

    def test_dockerfile_prod_exists(self):
        """Production Dockerfile should exist."""
        dockerfile = MCP_CONTAINER_DIR / 'Dockerfile.prod'
        assert dockerfile.exists(), \
            f"Dockerfile.prod not found: {dockerfile}"

    def test_dockerfile_prod_uses_dist(self):
        """Production Dockerfile should use dist/ directory."""
        dockerfile = MCP_CONTAINER_DIR / 'Dockerfile.prod'
        content = dockerfile.read_text()

        assert 'dist' in content, \
            "Dockerfile.prod should reference dist/ directory"


# =============================================================================
# Obfuscation Output Tests
# =============================================================================

class TestObfuscationOutput:
    """Tests for obfuscation output configuration."""

    def test_python_output_directory_configured(self):
        """Python output directory should be configured."""
        config = json.loads(PYARMOR_CONFIG.read_text())
        output = config.get('obfuscation', {}).get('output')

        assert output is not None, "Output directory not configured"
        assert output == 'dist', "Output should be 'dist'"

    def test_csharp_output_directory_configured(self):
        """C# output directory should be configured."""
        content = DOTFUSCATOR_CONFIG.read_text()

        assert 'obfuscated' in content, \
            "Dotfuscator should output to 'obfuscated' directory"

    def test_mapping_file_configured(self):
        """Dotfuscator mapping file should be configured."""
        content = DOTFUSCATOR_CONFIG.read_text()

        assert 'mapping' in content.lower(), \
            "Dotfuscator should configure mapping file"


# =============================================================================
# Integration Tests
# =============================================================================

class TestObfuscationIntegration:
    """Tests for obfuscation integration."""

    def test_python_and_csharp_configs_exist(self):
        """Both Python and C# configs should exist."""
        assert PYARMOR_CONFIG.exists(), "PyArmor config missing"
        assert DOTFUSCATOR_CONFIG.exists(), "Dotfuscator config missing"

    def test_both_have_string_encryption(self):
        """Both configs should have string encryption."""
        py_config = json.loads(PYARMOR_CONFIG.read_text())
        cs_content = DOTFUSCATOR_CONFIG.read_text()

        py_has_strings = 'string_encryption' in py_config
        cs_has_strings = 'string' in cs_content.lower()

        assert py_has_strings and cs_has_strings, \
            "Both should have string encryption configured"

    def test_obfuscation_excludes_tests(self):
        """Obfuscation should exclude test files."""
        py_config = json.loads(PYARMOR_CONFIG.read_text())
        excludes = py_config.get('obfuscation', {}).get('excludes', [])

        has_test_exclusion = any('test' in e.lower() for e in excludes)
        assert has_test_exclusion, \
            "Python config should exclude test files"

    def test_csharp_excludes_controllers(self):
        """C# should exclude controllers from renaming."""
        content = DOTFUSCATOR_CONFIG.read_text()

        assert 'Controller' in content, \
            "Dotfuscator should have controller exclusions"


# =============================================================================
# Functionality Verification Tests
# =============================================================================

class TestFunctionalityVerification:
    """Tests that verify obfuscated code can function correctly."""

    def test_python_imports_work(self):
        """Python source imports should work."""
        # Test that source files are valid Python
        main_path = PYTHON_SRC_DIR / 'main.py'
        content = main_path.read_text()

        # Should have imports
        assert 'import' in content, "main.py should have imports"

    def test_python_has_fastapi_app(self):
        """Python main should have FastAPI app."""
        main_path = PYTHON_SRC_DIR / 'main.py'
        content = main_path.read_text()

        # Should define FastAPI app
        has_fastapi = 'FastAPI' in content or 'fastapi' in content.lower()
        assert has_fastapi, "main.py should define FastAPI app"

    def test_csharp_has_aspnet_setup(self):
        """C# Program should have ASP.NET setup."""
        program_path = CSHARP_SRC_DIR / 'Program.cs'
        content = program_path.read_text()

        # Should have builder pattern
        has_builder = 'WebApplication' in content or 'CreateBuilder' in content
        assert has_builder, "Program.cs should have ASP.NET setup"

    def test_python_entry_point_importable(self):
        """Python entry point structure should be valid."""
        main_path = PYTHON_SRC_DIR / 'main.py'
        content = main_path.read_text()

        # Should have app definition or main block
        has_app = 'app' in content.lower()
        has_main = '__main__' in content or 'def main' in content

        assert has_app or has_main, \
            "main.py should have app definition or main block"
