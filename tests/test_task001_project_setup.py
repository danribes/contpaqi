"""
Tests for Task 1: Project Setup & Scaffolding
TDD approach - these tests define what the setup should accomplish.
"""
import os
import subprocess
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestDirectoryStructure:
    """Test 1.1: Verify all required directories exist."""

    def test_data_directories_exist(self):
        """Data directories for training data."""
        assert os.path.isdir(os.path.join(BASE_DIR, "data"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "synthetic"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "synthetic", "pdfs"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "synthetic", "labels"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "train"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "validation"))
        assert os.path.isdir(os.path.join(BASE_DIR, "data", "test"))

    def test_scripts_directory_exists(self):
        """Scripts directory for data generation."""
        assert os.path.isdir(os.path.join(BASE_DIR, "scripts"))

    def test_mcp_container_structure(self):
        """MCP Container directory structure."""
        mcp_dir = os.path.join(BASE_DIR, "mcp-container")
        assert os.path.isdir(mcp_dir)
        assert os.path.isdir(os.path.join(mcp_dir, "src"))
        assert os.path.isdir(os.path.join(mcp_dir, "src", "models"))
        assert os.path.isdir(os.path.join(mcp_dir, "src", "utils"))
        assert os.path.isdir(os.path.join(mcp_dir, "tests"))

    def test_windows_bridge_structure(self):
        """Windows Bridge directory structure."""
        bridge_dir = os.path.join(BASE_DIR, "windows-bridge")
        assert os.path.isdir(bridge_dir)
        assert os.path.isdir(os.path.join(bridge_dir, "src"))
        assert os.path.isdir(os.path.join(bridge_dir, "tests"))

    def test_desktop_app_structure(self):
        """Desktop App directory structure."""
        app_dir = os.path.join(BASE_DIR, "desktop-app")
        assert os.path.isdir(app_dir)
        assert os.path.isdir(os.path.join(app_dir, "electron"))
        assert os.path.isdir(os.path.join(app_dir, "src"))
        assert os.path.isdir(os.path.join(app_dir, "src", "components"))
        assert os.path.isdir(os.path.join(app_dir, "src", "services"))
        assert os.path.isdir(os.path.join(app_dir, "tests"))

    def test_installer_directory_exists(self):
        """Installer directory for Inno Setup."""
        installer_dir = os.path.join(BASE_DIR, "installer")
        assert os.path.isdir(installer_dir)
        assert os.path.isdir(os.path.join(installer_dir, "assets"))


class TestPythonProject:
    """Test 1.2: Python project initialization."""

    def test_pyproject_toml_exists(self):
        """pyproject.toml should exist in mcp-container."""
        pyproject_path = os.path.join(BASE_DIR, "mcp-container", "pyproject.toml")
        assert os.path.isfile(pyproject_path)

    def test_pyproject_has_required_fields(self):
        """pyproject.toml should have project name and dependencies."""
        pyproject_path = os.path.join(BASE_DIR, "mcp-container", "pyproject.toml")
        with open(pyproject_path, "r") as f:
            content = f.read()
        assert "[project]" in content or "[tool.poetry]" in content
        assert "name" in content
        assert "fastapi" in content.lower()

    def test_src_init_exists(self):
        """src/__init__.py should exist."""
        init_path = os.path.join(BASE_DIR, "mcp-container", "src", "__init__.py")
        assert os.path.isfile(init_path)

    def test_models_init_exists(self):
        """src/models/__init__.py should exist."""
        init_path = os.path.join(BASE_DIR, "mcp-container", "src", "models", "__init__.py")
        assert os.path.isfile(init_path)

    def test_utils_init_exists(self):
        """src/utils/__init__.py should exist."""
        init_path = os.path.join(BASE_DIR, "mcp-container", "src", "utils", "__init__.py")
        assert os.path.isfile(init_path)


class TestDockerfile:
    """Test 1.5: Dockerfile for MCP container."""

    def test_dockerfile_exists(self):
        """Dockerfile should exist in mcp-container."""
        dockerfile_path = os.path.join(BASE_DIR, "mcp-container", "Dockerfile")
        assert os.path.isfile(dockerfile_path)

    def test_dockerfile_has_python_base(self):
        """Dockerfile should use Python base image."""
        dockerfile_path = os.path.join(BASE_DIR, "mcp-container", "Dockerfile")
        with open(dockerfile_path, "r") as f:
            content = f.read()
        assert "python" in content.lower()
        assert "FROM" in content

    def test_dockerfile_exposes_port(self):
        """Dockerfile should expose port 8000."""
        dockerfile_path = os.path.join(BASE_DIR, "mcp-container", "Dockerfile")
        with open(dockerfile_path, "r") as f:
            content = f.read()
        assert "EXPOSE" in content or "8000" in content

    def test_requirements_txt_exists(self):
        """requirements.txt should exist."""
        requirements_path = os.path.join(BASE_DIR, "mcp-container", "requirements.txt")
        assert os.path.isfile(requirements_path)

    def test_docker_compose_exists(self):
        """docker-compose.yml should exist."""
        compose_path = os.path.join(BASE_DIR, "mcp-container", "docker-compose.yml")
        assert os.path.isfile(compose_path)


class TestLinting:
    """Test 1.6: Linting configuration."""

    def test_ruff_config_exists(self):
        """Ruff configuration should exist for Python."""
        # Can be in pyproject.toml or ruff.toml
        pyproject_path = os.path.join(BASE_DIR, "mcp-container", "pyproject.toml")
        ruff_path = os.path.join(BASE_DIR, "mcp-container", "ruff.toml")

        has_ruff_config = os.path.isfile(ruff_path)
        if os.path.isfile(pyproject_path):
            with open(pyproject_path, "r") as f:
                has_ruff_config = has_ruff_config or "[tool.ruff]" in f.read()

        assert has_ruff_config, "Ruff configuration not found"

    def test_eslint_config_exists(self):
        """ESLint configuration should exist for TypeScript."""
        app_dir = os.path.join(BASE_DIR, "desktop-app")
        eslint_files = [
            ".eslintrc.js",
            ".eslintrc.json",
            ".eslintrc.cjs",
            "eslint.config.js",
            "eslint.config.mjs",
        ]
        has_eslint = any(
            os.path.isfile(os.path.join(app_dir, f)) for f in eslint_files
        )
        # Also check package.json for eslintConfig
        package_json = os.path.join(app_dir, "package.json")
        if os.path.isfile(package_json):
            with open(package_json, "r") as f:
                has_eslint = has_eslint or "eslint" in f.read().lower()

        assert has_eslint, "ESLint configuration not found"


class TestElectronProject:
    """Test 1.4: Electron + React project."""

    def test_package_json_exists(self):
        """package.json should exist in desktop-app."""
        package_path = os.path.join(BASE_DIR, "desktop-app", "package.json")
        assert os.path.isfile(package_path)

    def test_package_has_electron(self):
        """package.json should have electron dependency."""
        package_path = os.path.join(BASE_DIR, "desktop-app", "package.json")
        with open(package_path, "r") as f:
            content = f.read()
        assert "electron" in content.lower()

    def test_package_has_react(self):
        """package.json should have react dependency."""
        package_path = os.path.join(BASE_DIR, "desktop-app", "package.json")
        with open(package_path, "r") as f:
            content = f.read()
        assert "react" in content.lower()

    def test_package_has_tailwind(self):
        """package.json should have tailwindcss dependency."""
        package_path = os.path.join(BASE_DIR, "desktop-app", "package.json")
        with open(package_path, "r") as f:
            content = f.read()
        assert "tailwind" in content.lower()

    def test_electron_main_exists(self):
        """electron/main.ts should exist."""
        main_path = os.path.join(BASE_DIR, "desktop-app", "electron", "main.ts")
        assert os.path.isfile(main_path)

    def test_tailwind_config_exists(self):
        """tailwind.config.js should exist."""
        config_path = os.path.join(BASE_DIR, "desktop-app", "tailwind.config.js")
        assert os.path.isfile(config_path)


class TestWindowsBridgeProject:
    """Test 1.3: C# ASP.NET Core project."""

    def test_csproj_exists(self):
        """C# project file should exist."""
        # Look for any .csproj file
        bridge_dir = os.path.join(BASE_DIR, "windows-bridge", "src")
        if not os.path.isdir(bridge_dir):
            bridge_dir = os.path.join(BASE_DIR, "windows-bridge")

        csproj_files = []
        for root, dirs, files in os.walk(bridge_dir):
            csproj_files.extend([f for f in files if f.endswith(".csproj")])

        assert len(csproj_files) > 0, "No .csproj file found"

    def test_csproj_has_x86_target(self):
        """C# project should target x86 platform."""
        bridge_dir = os.path.join(BASE_DIR, "windows-bridge")
        csproj_content = ""

        for root, dirs, files in os.walk(bridge_dir):
            for f in files:
                if f.endswith(".csproj"):
                    with open(os.path.join(root, f), "r") as file:
                        csproj_content = file.read()
                    break

        assert "x86" in csproj_content or "PlatformTarget" in csproj_content, \
            "x86 platform target not configured"

    def test_solution_file_exists(self):
        """Solution file should exist."""
        sln_path = os.path.join(BASE_DIR, "windows-bridge", "ContpaqiBridge.sln")
        assert os.path.isfile(sln_path), "ContpaqiBridge.sln not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
