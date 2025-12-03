"""
Test Suite for Subtask 2.8: Generate 5,000+ synthetic invoice samples

Tests verify:
- Dataset generation function exists and works
- Correct directory structure is created
- PDFs and JSON labels are generated
- Templates are used correctly
- Ground truth contains all required fields
- Generation statistics are accurate
- Reproducibility with seed
"""

import json
import os
import pytest
import random
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestDatasetGeneratorExists:
    """Test that the dataset generator module exists and has required functions."""

    def test_generate_invoices_module_exists(self):
        """Should be able to import generate_invoices module."""
        import generate_invoices
        assert generate_invoices is not None

    def test_has_generate_dataset_function(self):
        """Module should have generate_dataset function."""
        from generate_invoices import generate_dataset
        assert callable(generate_dataset)

    def test_has_get_available_templates_function(self):
        """Module should have get_available_templates function."""
        from generate_invoices import get_available_templates
        assert callable(get_available_templates)

    def test_has_render_invoice_pdf_function(self):
        """Module should have render_invoice_pdf function."""
        from generate_invoices import render_invoice_pdf
        assert callable(render_invoice_pdf)


class TestGetAvailableTemplates:
    """Test template discovery functionality."""

    def test_finds_templates_in_directory(self):
        """Should find HTML templates in templates directory."""
        from generate_invoices import get_available_templates

        templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
        templates = get_available_templates(str(templates_dir))

        assert len(templates) >= 20  # We have 20 templates

    def test_returns_empty_list_for_missing_directory(self):
        """Should return empty list for non-existent directory."""
        from generate_invoices import get_available_templates

        templates = get_available_templates("/nonexistent/path")

        assert templates == []

    def test_all_templates_are_html_files(self):
        """All returned templates should be HTML files."""
        from generate_invoices import get_available_templates

        templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
        templates = get_available_templates(str(templates_dir))

        for template in templates:
            assert template.endswith('.html')

    def test_templates_include_all_20(self):
        """Should find all 20 templates (template_01 through template_20)."""
        from generate_invoices import get_available_templates

        templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
        templates = get_available_templates(str(templates_dir))

        template_names = [os.path.basename(t) for t in templates]
        for i in range(1, 21):
            expected = f"template_{i:02d}.html"
            assert expected in template_names, f"Missing {expected}"


class TestDirectoryCreation:
    """Test that proper directory structure is created."""

    def test_creates_pdfs_directory(self):
        """Should create pdfs subdirectory."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            pdfs_dir = os.path.join(tmpdir, 'pdfs')
            assert os.path.isdir(pdfs_dir)

    def test_creates_labels_directory(self):
        """Should create labels subdirectory."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            assert os.path.isdir(labels_dir)


class TestFileGeneration:
    """Test that files are generated correctly."""

    def test_generates_pdf_file(self):
        """Should generate PDF files."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            assert os.path.exists(pdf_path)

    def test_generates_json_label_file(self):
        """Should generate JSON label files."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            json_path = os.path.join(tmpdir, 'labels', 'invoice_00000.json')
            assert os.path.exists(json_path)

    def test_pdf_and_json_have_matching_names(self):
        """PDF and JSON files should have matching base names."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(5, tmpdir, str(templates_dir))

            pdfs_dir = os.path.join(tmpdir, 'pdfs')
            labels_dir = os.path.join(tmpdir, 'labels')

            pdf_bases = {os.path.splitext(f)[0] for f in os.listdir(pdfs_dir)}
            json_bases = {os.path.splitext(f)[0] for f in os.listdir(labels_dir)}

            assert pdf_bases == json_bases

    def test_generates_correct_number_of_samples(self):
        """Should generate the requested number of samples."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            num_samples = 10
            stats = generate_dataset(num_samples, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            json_files = [f for f in os.listdir(labels_dir) if f.endswith('.json')]

            assert len(json_files) == num_samples
            assert stats['generated'] == num_samples


class TestJsonLabelStructure:
    """Test that JSON labels have correct structure."""

    @pytest.fixture
    def sample_json(self):
        """Generate a sample and return its JSON content."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            json_path = os.path.join(tmpdir, 'labels', 'invoice_00000.json')
            with open(json_path, 'r') as f:
                yield json.load(f)

    def test_json_has_fields_section(self, sample_json):
        """JSON should have fields section."""
        assert 'fields' in sample_json

    def test_json_has_line_items_section(self, sample_json):
        """JSON should have line_items section."""
        assert 'line_items' in sample_json

    def test_fields_has_rfc_emisor(self, sample_json):
        """Fields should include rfc_emisor."""
        assert 'rfc_emisor' in sample_json['fields']

    def test_fields_has_rfc_receptor(self, sample_json):
        """Fields should include rfc_receptor."""
        assert 'rfc_receptor' in sample_json['fields']

    def test_fields_has_date(self, sample_json):
        """Fields should include date."""
        assert 'date' in sample_json['fields']

    def test_fields_has_subtotal(self, sample_json):
        """Fields should include subtotal."""
        assert 'subtotal' in sample_json['fields']

    def test_fields_has_iva(self, sample_json):
        """Fields should include iva."""
        assert 'iva' in sample_json['fields']

    def test_fields_has_total(self, sample_json):
        """Fields should include total."""
        assert 'total' in sample_json['fields']

    def test_line_items_is_list(self, sample_json):
        """Line items should be a list."""
        assert isinstance(sample_json['line_items'], list)

    def test_line_items_have_required_fields(self, sample_json):
        """Each line item should have required fields."""
        for item in sample_json['line_items']:
            assert 'description' in item
            assert 'quantity' in item
            assert 'unit_price' in item
            assert 'amount' in item


class TestRfcFormat:
    """Test that RFC values are valid."""

    def test_rfc_emisor_format(self):
        """RFC emisor should match Mexican RFC format."""
        from generate_invoices import generate_dataset
        import re

        rfc_pattern = re.compile(r'^[A-Z]{4}\d{6}[A-Z0-9]{3}$')

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(5, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            for f in os.listdir(labels_dir):
                with open(os.path.join(labels_dir, f), 'r') as fp:
                    data = json.load(fp)
                    rfc = data['fields']['rfc_emisor']
                    assert rfc_pattern.match(rfc), f"Invalid RFC: {rfc}"

    def test_rfc_receptor_format(self):
        """RFC receptor should match Mexican RFC format."""
        from generate_invoices import generate_dataset
        import re

        rfc_pattern = re.compile(r'^[A-Z]{4}\d{6}[A-Z0-9]{3}$')

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(5, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            for f in os.listdir(labels_dir):
                with open(os.path.join(labels_dir, f), 'r') as fp:
                    data = json.load(fp)
                    rfc = data['fields']['rfc_receptor']
                    assert rfc_pattern.match(rfc), f"Invalid RFC: {rfc}"


class TestMathConsistency:
    """Test that invoice math is consistent."""

    def test_total_equals_subtotal_plus_iva(self):
        """Total should equal subtotal + iva (within rounding)."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(10, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            for f in os.listdir(labels_dir):
                with open(os.path.join(labels_dir, f), 'r') as fp:
                    data = json.load(fp)
                    subtotal = data['fields']['subtotal']
                    iva = data['fields']['iva']
                    total = data['fields']['total']

                    expected_total = round(subtotal + iva, 2)
                    assert abs(total - expected_total) < 0.01, \
                        f"Math error: {subtotal} + {iva} != {total}"

    def test_iva_is_16_percent(self):
        """IVA should be 16% of subtotal."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(10, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            for f in os.listdir(labels_dir):
                with open(os.path.join(labels_dir, f), 'r') as fp:
                    data = json.load(fp)
                    subtotal = data['fields']['subtotal']
                    iva = data['fields']['iva']

                    expected_iva = round(subtotal * 0.16, 2)
                    assert abs(iva - expected_iva) < 0.01, \
                        f"IVA error: expected {expected_iva}, got {iva}"


class TestTemplateVariety:
    """Test that templates are used with variety."""

    def test_uses_multiple_templates(self):
        """Should use different templates across samples."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"

            # Generate enough samples to likely use multiple templates
            generate_dataset(50, tmpdir, str(templates_dir))

            # Check that PDFs have varying file sizes (different templates)
            pdfs_dir = os.path.join(tmpdir, 'pdfs')
            sizes = set()
            for f in os.listdir(pdfs_dir):
                size = os.path.getsize(os.path.join(pdfs_dir, f))
                sizes.add(size // 1000)  # Group by KB

            # Should have variety in file sizes
            assert len(sizes) > 1, "PDFs all same size, likely only one template used"


class TestStatistics:
    """Test that generation returns correct statistics."""

    def test_returns_statistics_dict(self):
        """Should return dictionary with statistics."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            stats = generate_dataset(5, tmpdir, str(templates_dir))

            assert isinstance(stats, dict)
            assert 'generated' in stats
            assert 'failed' in stats

    def test_generated_count_is_accurate(self):
        """Generated count should match actual files."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            stats = generate_dataset(10, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            actual_count = len(os.listdir(labels_dir))

            assert stats['generated'] == actual_count


class TestReproducibility:
    """Test that generation is reproducible with seeds."""

    def test_same_seed_produces_same_data(self):
        """Same seed should produce identical invoice data."""
        from generate_invoices import generate_dataset
        import random
        from faker import Faker

        # Generate with same seeds twice
        results = []
        for _ in range(2):
            with tempfile.TemporaryDirectory() as tmpdir:
                templates_dir = Path(__file__).parent.parent / "scripts" / "templates"

                # Reset seeds before generation
                random.seed(42)
                Faker.seed(42)

                generate_dataset(5, tmpdir, str(templates_dir))

                # Read all labels
                labels_dir = os.path.join(tmpdir, 'labels')
                labels = {}
                for f in sorted(os.listdir(labels_dir)):
                    with open(os.path.join(labels_dir, f), 'r') as fp:
                        labels[f] = json.load(fp)
                results.append(labels)

        # Compare field values (not bboxes as those may vary)
        for filename in results[0]:
            fields1 = results[0][filename]['fields']
            fields2 = results[1][filename]['fields']

            assert fields1['rfc_emisor'] == fields2['rfc_emisor']
            assert fields1['rfc_receptor'] == fields2['rfc_receptor']
            assert fields1['subtotal'] == fields2['subtotal']
            assert fields1['total'] == fields2['total']


class TestPdfValidity:
    """Test that generated PDFs are valid."""

    def test_pdf_is_not_empty(self):
        """Generated PDF should not be empty."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            size = os.path.getsize(pdf_path)

            assert size > 1000, "PDF file too small, likely corrupted"

    def test_pdf_has_pdf_header(self):
        """PDF should start with %PDF header."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(1, tmpdir, str(templates_dir))

            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            with open(pdf_path, 'rb') as f:
                header = f.read(4)

            assert header == b'%PDF', "File is not a valid PDF"


class TestBatchGeneration:
    """Test batch generation of larger datasets."""

    def test_generates_100_samples(self):
        """Should successfully generate 100 samples."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            stats = generate_dataset(100, tmpdir, str(templates_dir))

            assert stats['generated'] == 100
            assert stats['failed'] == 0

    def test_file_naming_format(self):
        """Files should use 5-digit zero-padded naming."""
        from generate_invoices import generate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            templates_dir = Path(__file__).parent.parent / "scripts" / "templates"
            generate_dataset(10, tmpdir, str(templates_dir))

            labels_dir = os.path.join(tmpdir, 'labels')
            expected_names = [f'invoice_{i:05d}.json' for i in range(10)]
            actual_names = sorted(os.listdir(labels_dir))

            assert actual_names == expected_names
