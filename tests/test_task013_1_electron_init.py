"""
Tests for Subtask 13.1: Initialize Electron + React project with Vite

Tests that the Electron + React project has all required files and configuration.
"""
import pytest
import os
import json

DESKTOP_APP_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'desktop-app'
)


class TestProjectStructureExists:
    """Test that all required project files exist."""

    def test_package_json_exists(self):
        """Test package.json exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'package.json'))

    def test_vite_config_exists(self):
        """Test vite.config.ts exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'vite.config.ts'))

    def test_tsconfig_exists(self):
        """Test tsconfig.json exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'tsconfig.json'))

    def test_index_html_exists(self):
        """Test index.html exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'index.html'))

    def test_tailwind_config_exists(self):
        """Test tailwind.config.js exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'tailwind.config.js'))


class TestElectronFiles:
    """Test Electron-specific files exist."""

    def test_electron_main_exists(self):
        """Test electron/main.ts exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'electron', 'main.ts'))

    def test_electron_preload_exists(self):
        """Test electron/preload.ts exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'electron', 'preload.ts'))


class TestReactFiles:
    """Test React-specific files exist."""

    def test_app_tsx_exists(self):
        """Test src/App.tsx exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'src', 'App.tsx'))

    def test_main_tsx_exists(self):
        """Test src/main.tsx exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'src', 'main.tsx'))

    def test_index_css_exists(self):
        """Test src/index.css exists."""
        assert os.path.exists(os.path.join(DESKTOP_APP_PATH, 'src', 'index.css'))


class TestPackageJsonContent:
    """Test package.json has required dependencies."""

    def get_package_json(self):
        """Load package.json."""
        with open(os.path.join(DESKTOP_APP_PATH, 'package.json')) as f:
            return json.load(f)

    def test_has_react_dependency(self):
        """Test React is in dependencies."""
        pkg = self.get_package_json()
        assert 'react' in pkg.get('dependencies', {})

    def test_has_react_dom_dependency(self):
        """Test react-dom is in dependencies."""
        pkg = self.get_package_json()
        assert 'react-dom' in pkg.get('dependencies', {})

    def test_has_electron_dev_dependency(self):
        """Test Electron is in devDependencies."""
        pkg = self.get_package_json()
        assert 'electron' in pkg.get('devDependencies', {})

    def test_has_vite_dev_dependency(self):
        """Test Vite is in devDependencies."""
        pkg = self.get_package_json()
        assert 'vite' in pkg.get('devDependencies', {})

    def test_has_tailwindcss_dev_dependency(self):
        """Test Tailwind CSS is in devDependencies."""
        pkg = self.get_package_json()
        assert 'tailwindcss' in pkg.get('devDependencies', {})

    def test_has_dev_script(self):
        """Test dev script exists."""
        pkg = self.get_package_json()
        assert 'dev' in pkg.get('scripts', {})

    def test_has_build_script(self):
        """Test build script exists."""
        pkg = self.get_package_json()
        assert 'build' in pkg.get('scripts', {})


class TestViteConfig:
    """Test Vite configuration."""

    def test_vite_config_has_react_plugin(self):
        """Test vite.config.ts imports React plugin."""
        config_path = os.path.join(DESKTOP_APP_PATH, 'vite.config.ts')
        with open(config_path) as f:
            content = f.read()
        assert '@vitejs/plugin-react' in content or 'react' in content.lower()

    def test_vite_config_has_electron_plugin(self):
        """Test vite.config.ts imports Electron plugin."""
        config_path = os.path.join(DESKTOP_APP_PATH, 'vite.config.ts')
        with open(config_path) as f:
            content = f.read()
        assert 'electron' in content.lower()


class TestTailwindConfig:
    """Test Tailwind configuration."""

    def test_tailwind_has_content_paths(self):
        """Test tailwind.config.js has content paths."""
        config_path = os.path.join(DESKTOP_APP_PATH, 'tailwind.config.js')
        with open(config_path) as f:
            content = f.read()
        assert 'content' in content

    def test_tailwind_includes_src(self):
        """Test tailwind.config.js includes src directory."""
        config_path = os.path.join(DESKTOP_APP_PATH, 'tailwind.config.js')
        with open(config_path) as f:
            content = f.read()
        assert 'src' in content


class TestIndexHtml:
    """Test index.html structure."""

    def test_index_html_has_root_div(self):
        """Test index.html has root div for React."""
        html_path = os.path.join(DESKTOP_APP_PATH, 'index.html')
        with open(html_path) as f:
            content = f.read()
        assert 'id="root"' in content

    def test_index_html_imports_main(self):
        """Test index.html imports main.tsx."""
        html_path = os.path.join(DESKTOP_APP_PATH, 'index.html')
        with open(html_path) as f:
            content = f.read()
        assert 'main.tsx' in content or 'src/main' in content


class TestIndexCss:
    """Test index.css has Tailwind directives."""

    def test_index_css_has_tailwind_base(self):
        """Test index.css has @tailwind base."""
        css_path = os.path.join(DESKTOP_APP_PATH, 'src', 'index.css')
        with open(css_path) as f:
            content = f.read()
        assert '@tailwind base' in content

    def test_index_css_has_tailwind_components(self):
        """Test index.css has @tailwind components."""
        css_path = os.path.join(DESKTOP_APP_PATH, 'src', 'index.css')
        with open(css_path) as f:
            content = f.read()
        assert '@tailwind components' in content

    def test_index_css_has_tailwind_utilities(self):
        """Test index.css has @tailwind utilities."""
        css_path = os.path.join(DESKTOP_APP_PATH, 'src', 'index.css')
        with open(css_path) as f:
            content = f.read()
        assert '@tailwind utilities' in content
