"""
Tests for Subtask 2.1: Set up Python environment with Faker and WeasyPrint in scripts/
TDD approach - these tests define what the setup should accomplish.
"""
import os
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")


class TestScriptsEnvironment:
    """Test 2.1: Verify scripts environment setup."""

    def test_requirements_txt_exists(self):
        """requirements.txt should exist in scripts/."""
        requirements_path = os.path.join(SCRIPTS_DIR, "requirements.txt")
        assert os.path.isfile(requirements_path), "scripts/requirements.txt not found"

    def test_requirements_has_faker(self):
        """requirements.txt should include faker."""
        requirements_path = os.path.join(SCRIPTS_DIR, "requirements.txt")
        with open(requirements_path, "r") as f:
            content = f.read().lower()
        assert "faker" in content, "faker not found in requirements.txt"

    def test_requirements_has_weasyprint(self):
        """requirements.txt should include weasyprint."""
        requirements_path = os.path.join(SCRIPTS_DIR, "requirements.txt")
        with open(requirements_path, "r") as f:
            content = f.read().lower()
        assert "weasyprint" in content, "weasyprint not found in requirements.txt"

    def test_requirements_has_pillow(self):
        """requirements.txt should include Pillow."""
        requirements_path = os.path.join(SCRIPTS_DIR, "requirements.txt")
        with open(requirements_path, "r") as f:
            content = f.read().lower()
        assert "pillow" in content, "Pillow not found in requirements.txt"

    def test_requirements_has_jinja2(self):
        """requirements.txt should include jinja2."""
        requirements_path = os.path.join(SCRIPTS_DIR, "requirements.txt")
        with open(requirements_path, "r") as f:
            content = f.read().lower()
        assert "jinja2" in content, "jinja2 not found in requirements.txt"


class TestGenerateInvoicesScript:
    """Test the generate_invoices.py script structure."""

    def test_generate_invoices_py_exists(self):
        """generate_invoices.py should exist in scripts/."""
        script_path = os.path.join(SCRIPTS_DIR, "generate_invoices.py")
        assert os.path.isfile(script_path), "scripts/generate_invoices.py not found"

    def test_generate_invoices_has_main_function(self):
        """generate_invoices.py should have a main() function."""
        script_path = os.path.join(SCRIPTS_DIR, "generate_invoices.py")
        with open(script_path, "r") as f:
            content = f.read()
        assert "def main(" in content, "main() function not found"

    def test_generate_invoices_has_argparse(self):
        """generate_invoices.py should use argparse for CLI arguments."""
        script_path = os.path.join(SCRIPTS_DIR, "generate_invoices.py")
        with open(script_path, "r") as f:
            content = f.read()
        assert "argparse" in content, "argparse not imported"

    def test_generate_invoices_has_output_dir_arg(self):
        """generate_invoices.py should have --output-dir argument."""
        script_path = os.path.join(SCRIPTS_DIR, "generate_invoices.py")
        with open(script_path, "r") as f:
            content = f.read()
        assert "output-dir" in content or "output_dir" in content, \
            "--output-dir argument not found"

    def test_generate_invoices_has_num_samples_arg(self):
        """generate_invoices.py should have --num-samples argument."""
        script_path = os.path.join(SCRIPTS_DIR, "generate_invoices.py")
        with open(script_path, "r") as f:
            content = f.read()
        assert "num-samples" in content or "num_samples" in content, \
            "--num-samples argument not found"

    def test_generate_invoices_is_importable(self):
        """generate_invoices.py should be importable without errors."""
        sys.path.insert(0, SCRIPTS_DIR)
        try:
            import generate_invoices
            assert hasattr(generate_invoices, 'main'), "main function not accessible"
        finally:
            sys.path.pop(0)
            # Clean up imported module
            if 'generate_invoices' in sys.modules:
                del sys.modules['generate_invoices']


class TestTemplatesDirectory:
    """Test the templates directory structure."""

    def test_templates_directory_exists(self):
        """templates/ directory should exist in scripts/."""
        templates_path = os.path.join(SCRIPTS_DIR, "templates")
        assert os.path.isdir(templates_path), "scripts/templates/ directory not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
