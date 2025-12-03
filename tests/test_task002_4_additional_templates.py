"""
Test Suite for Subtask 2.4: Design 10 additional template variations

Tests verify:
- Templates 11-20 exist in scripts/templates/
- All templates are valid HTML with required structure
- Templates have Jinja2 placeholders for invoice data
- Templates provide visual variety (fonts, layouts, colors)
- Templates support both portrait and landscape orientations
"""

import os
import pytest
from pathlib import Path

# Path to templates directory
TEMPLATES_DIR = Path(__file__).parent.parent / "scripts" / "templates"


class TestAdditionalTemplatesDirectory:
    """Test that additional templates exist in the directory."""

    def test_templates_directory_exists(self):
        """Templates directory should exist."""
        assert TEMPLATES_DIR.exists(), f"Templates directory not found: {TEMPLATES_DIR}"

    def test_has_20_templates_total(self):
        """Should have 20 templates total (10 original + 10 additional)."""
        templates = list(TEMPLATES_DIR.glob("template_*.html"))
        assert len(templates) >= 20, f"Expected at least 20 templates, found {len(templates)}"


class TestAdditionalTemplateFiles:
    """Test individual template files 11-20."""

    @staticmethod
    def get_template_path(num):
        return TEMPLATES_DIR / f"template_{num:02d}.html"

    @staticmethod
    def get_template_content(num):
        path = TEMPLATES_DIR / f"template_{num:02d}.html"
        return path.read_text(encoding='utf-8')

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_template_file_exists(self, template_num):
        """Template file should exist."""
        path = self.get_template_path(template_num)
        assert path.exists(), f"template_{template_num:02d}.html not found"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_template_is_valid_html(self, template_num):
        """Template should be valid HTML."""
        content = self.get_template_content(template_num)
        assert '<!DOCTYPE html>' in content or '<!doctype html>' in content.lower(), \
            f"template_{template_num:02d}.html missing DOCTYPE"
        assert '<html' in content.lower(), \
            f"template_{template_num:02d}.html missing html tag"
        assert '</html>' in content.lower(), \
            f"template_{template_num:02d}.html missing closing html tag"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_template_has_head_section(self, template_num):
        """Template should have head section."""
        content = self.get_template_content(template_num)
        assert '<head>' in content.lower(), \
            f"template_{template_num:02d}.html missing head tag"
        assert '</head>' in content.lower(), \
            f"template_{template_num:02d}.html missing closing head tag"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_template_has_body_section(self, template_num):
        """Template should have body section."""
        content = self.get_template_content(template_num)
        assert '<body' in content.lower(), \
            f"template_{template_num:02d}.html missing body tag"
        assert '</body>' in content.lower(), \
            f"template_{template_num:02d}.html missing closing body tag"


class TestAdditionalJinja2Placeholders:
    """Test that additional templates have required Jinja2 placeholders."""

    @staticmethod
    def get_template_content(num):
        path = TEMPLATES_DIR / f"template_{num:02d}.html"
        return path.read_text(encoding='utf-8')

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_emisor_name(self, template_num):
        """Template should have emisor name placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ emisor.name' in content or '{{emisor.name' in content, \
            f"template_{template_num:02d}.html missing emisor.name placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_receptor_name(self, template_num):
        """Template should have receptor name placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ receptor.name' in content or '{{receptor.name' in content, \
            f"template_{template_num:02d}.html missing receptor.name placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_rfc_fields(self, template_num):
        """Template should have RFC placeholders for emisor and receptor."""
        content = self.get_template_content(template_num)
        has_emisor_rfc = '{{ emisor.rfc' in content or '{{emisor.rfc' in content
        has_receptor_rfc = '{{ receptor.rfc' in content or '{{receptor.rfc' in content
        assert has_emisor_rfc, f"template_{template_num:02d}.html missing emisor.rfc"
        assert has_receptor_rfc, f"template_{template_num:02d}.html missing receptor.rfc"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_date_field(self, template_num):
        """Template should have date placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ date' in content or '{{date' in content, \
            f"template_{template_num:02d}.html missing date placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_folio_field(self, template_num):
        """Template should have folio placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ folio' in content or '{{folio' in content, \
            f"template_{template_num:02d}.html missing folio placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_items_loop(self, template_num):
        """Template should have items loop."""
        content = self.get_template_content(template_num)
        assert '{% for' in content and 'items' in content, \
            f"template_{template_num:02d}.html missing items loop"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_subtotal(self, template_num):
        """Template should have subtotal placeholder."""
        content = self.get_template_content(template_num)
        has_subtotal = ('{{ subtotal' in content or '{{subtotal' in content or
                        'format(subtotal)' in content)
        assert has_subtotal, \
            f"template_{template_num:02d}.html missing subtotal placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_iva(self, template_num):
        """Template should have IVA placeholder."""
        content = self.get_template_content(template_num)
        assert '{{ iva' in content or '{{iva' in content or 'IVA' in content or 'format(iva)' in content, \
            f"template_{template_num:02d}.html missing IVA placeholder"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_total(self, template_num):
        """Template should have total placeholder."""
        content = self.get_template_content(template_num)
        has_total = ('{{ total' in content or '{{total' in content or
                     'format(total)' in content)
        assert has_total, \
            f"template_{template_num:02d}.html missing total placeholder"


class TestAdditionalTemplateStructure:
    """Test that additional templates have proper invoice structure."""

    @staticmethod
    def get_template_content(num):
        path = TEMPLATES_DIR / f"template_{num:02d}.html"
        return path.read_text(encoding='utf-8')

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_table_for_items(self, template_num):
        """Template should have a table structure for line items."""
        content = self.get_template_content(template_num)
        # Accept either <table> or div-based layouts with table-like structure
        has_table = '<table' in content.lower()
        has_div_table = ('item-row' in content.lower() or
                         'items-row' in content.lower() or
                         'line-item' in content.lower() or
                         'grid' in content.lower())
        assert has_table or has_div_table, \
            f"template_{template_num:02d}.html missing table/grid structure for items"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_style_section(self, template_num):
        """Template should have CSS styling."""
        content = self.get_template_content(template_num)
        assert '<style' in content.lower(), \
            f"template_{template_num:02d}.html missing style section"


class TestTemplateLayoutVariety:
    """Test that templates provide layout variety."""

    @staticmethod
    def get_all_additional_templates():
        templates = {}
        for i in range(11, 21):
            path = TEMPLATES_DIR / f"template_{i:02d}.html"
            if path.exists():
                templates[i] = path.read_text(encoding='utf-8')
        return templates

    def test_templates_are_different(self):
        """All additional templates should be visually different."""
        templates = self.get_all_additional_templates()
        contents = list(templates.values())

        # Check that no two templates are identical
        for i, content1 in enumerate(contents):
            for j, content2 in enumerate(contents):
                if i < j:
                    assert content1 != content2, \
                        f"Templates {list(templates.keys())[i]} and {list(templates.keys())[j]} are identical"

    def test_different_font_families(self):
        """Templates should use different font families."""
        templates = self.get_all_additional_templates()
        fonts_found = set()

        font_keywords = [
            'arial', 'helvetica', 'times', 'georgia', 'verdana',
            'trebuchet', 'courier', 'palatino', 'calibri', 'segoe',
            'roboto', 'open sans', 'lato', 'montserrat', 'source sans',
            'nunito', 'poppins', 'inter', 'system-ui', 'sans-serif', 'serif'
        ]

        for num, content in templates.items():
            content_lower = content.lower()
            for font in font_keywords:
                if font in content_lower:
                    fonts_found.add(font)

        assert len(fonts_found) >= 3, \
            f"Expected at least 3 different font families, found: {fonts_found}"

    def test_has_borderless_template(self):
        """At least one template should have minimal/no borders on tables."""
        templates = self.get_all_additional_templates()

        has_borderless = False
        for content in templates.values():
            content_lower = content.lower()
            if ('border: none' in content_lower or
                'border: 0' in content_lower or
                'border-collapse' in content_lower and 'border: none' not in content_lower or
                'borderless' in content_lower or
                'no-border' in content_lower):
                has_borderless = True
                break

        # If no explicit borderless, check for minimal styling
        if not has_borderless:
            for content in templates.values():
                if 'border' not in content.lower() or 'border-bottom' in content.lower():
                    has_borderless = True
                    break

        assert has_borderless, "Expected at least one template with minimal/no borders"

    def test_has_two_column_layout(self):
        """At least one template should have two-column layout for parties."""
        templates = self.get_all_additional_templates()

        has_two_column = False
        two_column_indicators = [
            'grid-template-columns', 'display: grid', 'display:grid',
            'flex', 'two-column', 'col-', 'column', 'side-by-side',
            'float: left', 'float:left', 'inline-block'
        ]

        for content in templates.values():
            content_lower = content.lower()
            for indicator in two_column_indicators:
                if indicator in content_lower:
                    has_two_column = True
                    break
            if has_two_column:
                break

        assert has_two_column, "Expected at least one template with two-column layout"

    def test_different_color_schemes(self):
        """Templates should use different color schemes."""
        templates = self.get_all_additional_templates()
        colors_found = set()

        # Common color patterns in hex
        color_patterns = [
            '#000', '#111', '#222', '#333',  # blacks/dark grays
            '#fff', '#faf', '#f5f', '#eee',  # whites/light grays
            '#dc', '#ef', '#f97', '#fb',      # reds/oranges
            '#22c', '#16a', '#0d9', '#14b',   # greens/teals
            '#2563', '#3b82', '#60a',         # blues
            '#7c3', '#8b5', '#a855', '#c084', # purples
            '#f59', '#eab', '#fbbf',          # yellows/ambers
        ]

        for num, content in templates.items():
            for pattern in color_patterns:
                if pattern in content.lower():
                    colors_found.add(pattern)

        assert len(colors_found) >= 4, \
            f"Expected at least 4 different color patterns, found: {len(colors_found)}"


class TestTemplateOrientation:
    """Test that templates support different orientations."""

    @staticmethod
    def get_all_additional_templates():
        templates = {}
        for i in range(11, 21):
            path = TEMPLATES_DIR / f"template_{i:02d}.html"
            if path.exists():
                templates[i] = path.read_text(encoding='utf-8')
        return templates

    def test_has_landscape_template(self):
        """At least one template should support landscape orientation."""
        templates = self.get_all_additional_templates()

        has_landscape = False
        landscape_indicators = [
            'landscape', 'size: landscape', 'size:landscape',
            'orientation: landscape', 'width: 11in', 'width:11in',
            'max-width: 1000px', 'max-width: 1100px', 'max-width:1000',
            'a4 landscape', 'letter landscape'
        ]

        for content in templates.values():
            content_lower = content.lower()
            for indicator in landscape_indicators:
                if indicator in content_lower:
                    has_landscape = True
                    break
            # Also check for wider max-width values suggesting landscape
            if 'max-width' in content_lower:
                import re
                matches = re.findall(r'max-width:\s*(\d+)', content_lower)
                for match in matches:
                    if int(match) >= 900:
                        has_landscape = True
                        break
            if has_landscape:
                break

        assert has_landscape, "Expected at least one template with landscape orientation or wider layout"


class TestItemFields:
    """Test that item fields are properly structured."""

    @staticmethod
    def get_template_content(num):
        path = TEMPLATES_DIR / f"template_{num:02d}.html"
        return path.read_text(encoding='utf-8')

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_item_description(self, template_num):
        """Template should have item description placeholder."""
        content = self.get_template_content(template_num)
        assert 'item.description' in content or 'item.descripcion' in content, \
            f"template_{template_num:02d}.html missing item.description"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_item_quantity(self, template_num):
        """Template should have item quantity placeholder."""
        content = self.get_template_content(template_num)
        assert 'item.quantity' in content or 'item.cantidad' in content or 'item.qty' in content, \
            f"template_{template_num:02d}.html missing item quantity field"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_item_unit_price(self, template_num):
        """Template should have item unit price placeholder."""
        content = self.get_template_content(template_num)
        has_price = ('item.unit_price' in content or 'item.precio' in content or
                     'item.price' in content or 'item.unitario' in content)
        assert has_price, \
            f"template_{template_num:02d}.html missing item unit price field"

    @pytest.mark.parametrize("template_num", range(11, 21))
    def test_has_item_amount(self, template_num):
        """Template should have item amount placeholder."""
        content = self.get_template_content(template_num)
        has_amount = ('item.amount' in content or 'item.importe' in content or
                      'item.total' in content or 'item.monto' in content)
        assert has_amount, \
            f"template_{template_num:02d}.html missing item amount field"
