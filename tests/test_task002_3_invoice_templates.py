"""
Tests for Subtask 2.3: Design 10 distinct HTML/CSS invoice templates
TDD approach - these tests define what the templates should accomplish.
"""
import os
import re
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
TEMPLATES_DIR = os.path.join(SCRIPTS_DIR, "templates")


class TestTemplatesDirectory:
    """Test the templates directory structure."""

    def test_templates_directory_exists(self):
        """templates/ directory should exist."""
        assert os.path.isdir(TEMPLATES_DIR), f"{TEMPLATES_DIR} not found"

    def test_has_10_templates(self):
        """Should have at least 10 HTML template files."""
        templates = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.html')]
        assert len(templates) >= 10, f"Expected 10 templates, found {len(templates)}"


class TestTemplateFiles:
    """Test each template file exists and has correct naming."""

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_template_file_exists(self, template_num):
        """Each template file should exist (template_01.html through template_10.html)."""
        filename = f"template_{template_num:02d}.html"
        filepath = os.path.join(TEMPLATES_DIR, filename)
        assert os.path.isfile(filepath), f"{filename} not found"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_template_is_valid_html(self, template_num):
        """Each template should have basic HTML structure."""
        filename = f"template_{template_num:02d}.html"
        filepath = os.path.join(TEMPLATES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        assert '<html' in content.lower(), f"{filename} missing <html> tag"
        assert '</html>' in content.lower(), f"{filename} missing </html> tag"


class TestJinja2Placeholders:
    """Test that templates have required Jinja2 placeholders."""

    def get_template_content(self, template_num):
        """Helper to read template content."""
        filename = f"template_{template_num:02d}.html"
        filepath = os.path.join(TEMPLATES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_emisor_name(self, template_num):
        """Template should have emisor name placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ emisor' in content or '{{emisor' in content, \
            f"template_{template_num:02d}.html missing emisor placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_receptor_name(self, template_num):
        """Template should have receptor name placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ receptor' in content or '{{receptor' in content, \
            f"template_{template_num:02d}.html missing receptor placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_rfc_fields(self, template_num):
        """Template should have RFC placeholders."""
        content = self.get_template_content(template_num)
        assert 'rfc' in content.lower(), \
            f"template_{template_num:02d}.html missing RFC placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_date_field(self, template_num):
        """Template should have date placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ date' in content or '{{date' in content or 'fecha' in content.lower(), \
            f"template_{template_num:02d}.html missing date placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_folio_field(self, template_num):
        """Template should have folio placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ folio' in content or '{{folio' in content, \
            f"template_{template_num:02d}.html missing folio placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_items_loop(self, template_num):
        """Template should have items loop for line items."""
        content = self.get_template_content(template_num)
        assert '{% for' in content and 'items' in content, \
            f"template_{template_num:02d}.html missing items loop"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_subtotal(self, template_num):
        """Template should have subtotal placeholder."""
        content = self.get_template_content(template_num)
        has_subtotal = ('{{ subtotal' in content or '{{subtotal' in content or
                        'format(subtotal)' in content)
        assert has_subtotal, \
            f"template_{template_num:02d}.html missing subtotal placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_iva(self, template_num):
        """Template should have IVA placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ iva' in content or '{{iva' in content or 'IVA' in content, \
            f"template_{template_num:02d}.html missing IVA placeholder"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_total(self, template_num):
        """Template should have total placeholder."""
        content = self.get_template_content(template_num)
        has_total = ('{{ total' in content or '{{total' in content or
                     'format(total)' in content)
        assert has_total, \
            f"template_{template_num:02d}.html missing total placeholder"


class TestTemplateStructure:
    """Test that templates have proper invoice structure."""

    def get_template_content(self, template_num):
        """Helper to read template content."""
        filename = f"template_{template_num:02d}.html"
        filepath = os.path.join(TEMPLATES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_table_for_items(self, template_num):
        """Template should have a table for line items."""
        content = self.get_template_content(template_num)
        assert '<table' in content.lower(), \
            f"template_{template_num:02d}.html missing table element"

    @pytest.mark.parametrize("template_num", range(1, 11))
    def test_has_style_section(self, template_num):
        """Template should have CSS styling."""
        content = self.get_template_content(template_num)
        has_style = '<style' in content.lower() or 'style=' in content.lower()
        assert has_style, f"template_{template_num:02d}.html missing CSS styling"


class TestTemplateVariety:
    """Test that templates have variety in design."""

    def get_all_templates(self):
        """Helper to read all template contents."""
        templates = {}
        for i in range(1, 11):
            filename = f"template_{i:02d}.html"
            filepath = os.path.join(TEMPLATES_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                templates[i] = f.read()
        return templates

    def test_templates_are_different(self):
        """Templates should not all be identical."""
        templates = self.get_all_templates()
        unique_templates = set(templates.values())
        # At least 5 unique designs (some may be similar but not all identical)
        assert len(unique_templates) >= 5, \
            "Templates are too similar - need more variety"

    def test_different_color_schemes(self):
        """Templates should use different colors."""
        templates = self.get_all_templates()
        colors_found = set()
        color_pattern = re.compile(r'#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|background-color:\s*\w+')

        for content in templates.values():
            colors = color_pattern.findall(content)
            colors_found.update(colors)

        # Should have at least 3 different color values across templates
        assert len(colors_found) >= 3, \
            f"Need more color variety, found: {colors_found}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
