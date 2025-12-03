"""
Test Suite for Subtask 2.7: Create JSON sidecar file generator for ground truth labels

Tests verify:
- Ground truth module exists and is importable
- save_ground_truth() creates valid JSON files
- JSON structure contains all required fields
- Field values and bboxes are correctly paired
- Line items are properly included
- File paths are handled correctly
"""

import json
import os
import pytest
import tempfile
import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestGroundTruthModuleExists:
    """Test that the ground truth module exists and is importable."""

    def test_can_import_module(self):
        """Should be able to import ground_truth module."""
        import ground_truth
        assert ground_truth is not None

    def test_has_save_ground_truth_function(self):
        """Module should have save_ground_truth function."""
        from ground_truth import save_ground_truth
        assert callable(save_ground_truth)

    def test_has_create_ground_truth_function(self):
        """Module should have create_ground_truth function."""
        from ground_truth import create_ground_truth
        assert callable(create_ground_truth)

    def test_has_load_ground_truth_function(self):
        """Module should have load_ground_truth function."""
        from ground_truth import load_ground_truth
        assert callable(load_ground_truth)


class TestCreateGroundTruth:
    """Test creating ground truth data structure."""

    @pytest.fixture
    def sample_invoice_data(self):
        """Sample invoice data for testing."""
        return {
            'emisor': {
                'name': 'Empresa ABC S.A. de C.V.',
                'rfc': 'XAXX010101ABC',
                'address': 'Calle Principal 123, CDMX'
            },
            'receptor': {
                'name': 'Cliente XYZ S. de R.L.',
                'rfc': 'XBBB020202XYZ',
                'address': 'Av. Reforma 456, Monterrey'
            },
            'date': '2024-03-15',
            'folio': 'A1B2C3D4',
            'items': [
                {
                    'description': 'Servicio de consultoría',
                    'quantity': 10,
                    'unit_price': 1500.00,
                    'amount': 15000.00
                },
                {
                    'description': 'Material de oficina',
                    'quantity': 5,
                    'unit_price': 200.00,
                    'amount': 1000.00
                }
            ],
            'subtotal': 16000.00,
            'iva': 2560.00,
            'total': 18560.00,
            'currency': 'MXN'
        }

    @pytest.fixture
    def sample_bboxes(self):
        """Sample bounding boxes for testing."""
        return {
            'rfc_emisor': {'x': 100, 'y': 150, 'width': 130, 'height': 25},
            'rfc_receptor': {'x': 100, 'y': 200, 'width': 130, 'height': 25},
            'date': {'x': 400, 'y': 50, 'width': 100, 'height': 25},
            'folio': {'x': 300, 'y': 50, 'width': 80, 'height': 25},
            'subtotal': {'x': 450, 'y': 400, 'width': 90, 'height': 25},
            'iva': {'x': 450, 'y': 430, 'width': 80, 'height': 25},
            'total': {'x': 450, 'y': 460, 'width': 100, 'height': 25},
            'emisor_name': {'x': 50, 'y': 100, 'width': 200, 'height': 30},
            'receptor_name': {'x': 50, 'y': 170, 'width': 180, 'height': 30},
            'items': [
                {'x': 50, 'y': 300, 'width': 500, 'height': 25},
                {'x': 50, 'y': 330, 'width': 500, 'height': 25}
            ]
        }

    def test_returns_dictionary(self, sample_invoice_data, sample_bboxes):
        """create_ground_truth should return a dictionary."""
        from ground_truth import create_ground_truth

        result = create_ground_truth(sample_invoice_data, sample_bboxes)

        assert isinstance(result, dict)

    def test_has_fields_section(self, sample_invoice_data, sample_bboxes):
        """Ground truth should have fields section."""
        from ground_truth import create_ground_truth

        result = create_ground_truth(sample_invoice_data, sample_bboxes)

        assert 'fields' in result
        assert isinstance(result['fields'], dict)

    def test_has_line_items_section(self, sample_invoice_data, sample_bboxes):
        """Ground truth should have line_items section."""
        from ground_truth import create_ground_truth

        result = create_ground_truth(sample_invoice_data, sample_bboxes)

        assert 'line_items' in result
        assert isinstance(result['line_items'], list)

    def test_has_metadata_section(self, sample_invoice_data, sample_bboxes):
        """Ground truth should have metadata section."""
        from ground_truth import create_ground_truth

        result = create_ground_truth(sample_invoice_data, sample_bboxes)

        assert 'metadata' in result


class TestFieldsStructure:
    """Test the fields section structure."""

    @pytest.fixture
    def ground_truth(self):
        """Create ground truth for testing."""
        from ground_truth import create_ground_truth

        invoice_data = {
            'emisor': {'name': 'Empresa', 'rfc': 'XAXX010101ABC', 'address': 'Addr'},
            'receptor': {'name': 'Cliente', 'rfc': 'XBBB020202XYZ', 'address': 'Addr'},
            'date': '2024-03-15',
            'folio': 'A1B2C3D4',
            'items': [],
            'subtotal': 1000.00,
            'iva': 160.00,
            'total': 1160.00,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': {'x': 100, 'y': 150, 'width': 130, 'height': 25},
            'rfc_receptor': {'x': 100, 'y': 200, 'width': 130, 'height': 25},
            'date': {'x': 400, 'y': 50, 'width': 100, 'height': 25},
            'folio': {'x': 300, 'y': 50, 'width': 80, 'height': 25},
            'subtotal': {'x': 450, 'y': 400, 'width': 90, 'height': 25},
            'iva': {'x': 450, 'y': 430, 'width': 80, 'height': 25},
            'total': {'x': 450, 'y': 460, 'width': 100, 'height': 25},
            'items': []
        }

        return create_ground_truth(invoice_data, bboxes)

    def test_has_rfc_emisor(self, ground_truth):
        """Fields should include rfc_emisor."""
        assert 'rfc_emisor' in ground_truth['fields']

    def test_has_rfc_receptor(self, ground_truth):
        """Fields should include rfc_receptor."""
        assert 'rfc_receptor' in ground_truth['fields']

    def test_has_date(self, ground_truth):
        """Fields should include date."""
        assert 'date' in ground_truth['fields']

    def test_has_subtotal(self, ground_truth):
        """Fields should include subtotal."""
        assert 'subtotal' in ground_truth['fields']

    def test_has_iva(self, ground_truth):
        """Fields should include iva."""
        assert 'iva' in ground_truth['fields']

    def test_has_total(self, ground_truth):
        """Fields should include total."""
        assert 'total' in ground_truth['fields']

    def test_field_has_value_and_bbox(self, ground_truth):
        """Each field should have value and bbox."""
        for field_name, field_data in ground_truth['fields'].items():
            assert 'value' in field_data, f"{field_name} missing 'value'"
            assert 'bbox' in field_data, f"{field_name} missing 'bbox'"

    def test_rfc_emisor_value_correct(self, ground_truth):
        """RFC emisor value should match invoice data."""
        assert ground_truth['fields']['rfc_emisor']['value'] == 'XAXX010101ABC'

    def test_total_value_correct(self, ground_truth):
        """Total value should match invoice data."""
        assert ground_truth['fields']['total']['value'] == 1160.00


class TestLineItemsStructure:
    """Test the line_items section structure."""

    @pytest.fixture
    def ground_truth_with_items(self):
        """Create ground truth with line items."""
        from ground_truth import create_ground_truth

        invoice_data = {
            'emisor': {'name': 'Empresa', 'rfc': 'XAXX010101ABC', 'address': 'Addr'},
            'receptor': {'name': 'Cliente', 'rfc': 'XBBB020202XYZ', 'address': 'Addr'},
            'date': '2024-03-15',
            'folio': 'A1B2C3D4',
            'items': [
                {'description': 'Service A', 'quantity': 10, 'unit_price': 100.00, 'amount': 1000.00},
                {'description': 'Product B', 'quantity': 5, 'unit_price': 50.00, 'amount': 250.00}
            ],
            'subtotal': 1250.00,
            'iva': 200.00,
            'total': 1450.00,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': {'x': 100, 'y': 150, 'width': 130, 'height': 25},
            'rfc_receptor': {'x': 100, 'y': 200, 'width': 130, 'height': 25},
            'date': None,
            'folio': None,
            'subtotal': None,
            'iva': None,
            'total': {'x': 450, 'y': 460, 'width': 100, 'height': 25},
            'items': [
                {'x': 50, 'y': 300, 'width': 500, 'height': 25},
                {'x': 50, 'y': 330, 'width': 500, 'height': 25}
            ]
        }

        return create_ground_truth(invoice_data, bboxes)

    def test_line_items_count_matches(self, ground_truth_with_items):
        """Number of line items should match invoice."""
        assert len(ground_truth_with_items['line_items']) == 2

    def test_line_item_has_description(self, ground_truth_with_items):
        """Each line item should have description."""
        for item in ground_truth_with_items['line_items']:
            assert 'description' in item

    def test_line_item_has_quantity(self, ground_truth_with_items):
        """Each line item should have quantity."""
        for item in ground_truth_with_items['line_items']:
            assert 'quantity' in item

    def test_line_item_has_unit_price(self, ground_truth_with_items):
        """Each line item should have unit_price."""
        for item in ground_truth_with_items['line_items']:
            assert 'unit_price' in item

    def test_line_item_has_amount(self, ground_truth_with_items):
        """Each line item should have amount."""
        for item in ground_truth_with_items['line_items']:
            assert 'amount' in item

    def test_line_item_has_bbox(self, ground_truth_with_items):
        """Each line item should have bbox."""
        for item in ground_truth_with_items['line_items']:
            assert 'bbox' in item

    def test_first_item_values_correct(self, ground_truth_with_items):
        """First item values should match invoice."""
        first_item = ground_truth_with_items['line_items'][0]
        assert first_item['description'] == 'Service A'
        assert first_item['quantity'] == 10
        assert first_item['amount'] == 1000.00


class TestSaveGroundTruth:
    """Test saving ground truth to JSON files."""

    @pytest.fixture
    def sample_data(self):
        """Sample data for save tests."""
        invoice_data = {
            'emisor': {'name': 'Test Co', 'rfc': 'TEST010101XXX', 'address': 'Test Addr'},
            'receptor': {'name': 'Client', 'rfc': 'CLNT020202YYY', 'address': 'Client Addr'},
            'date': '2024-01-15',
            'folio': 'TEST1234',
            'items': [{'description': 'Test', 'quantity': 1, 'unit_price': 100.0, 'amount': 100.0}],
            'subtotal': 100.0,
            'iva': 16.0,
            'total': 116.0,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': {'x': 10, 'y': 10, 'width': 100, 'height': 20},
            'rfc_receptor': {'x': 10, 'y': 40, 'width': 100, 'height': 20},
            'date': {'x': 200, 'y': 10, 'width': 80, 'height': 20},
            'folio': {'x': 300, 'y': 10, 'width': 60, 'height': 20},
            'subtotal': {'x': 400, 'y': 200, 'width': 70, 'height': 20},
            'iva': {'x': 400, 'y': 230, 'width': 50, 'height': 20},
            'total': {'x': 400, 'y': 260, 'width': 80, 'height': 20},
            'items': [{'x': 10, 'y': 100, 'width': 400, 'height': 25}]
        }

        return invoice_data, bboxes

    def test_creates_json_file(self, sample_data):
        """save_ground_truth should create a JSON file."""
        from ground_truth import save_ground_truth

        invoice_data, bboxes = sample_data

        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'test.json')
            save_ground_truth(invoice_data, bboxes, output_path)

            assert os.path.exists(output_path)

    def test_file_is_valid_json(self, sample_data):
        """Created file should be valid JSON."""
        from ground_truth import save_ground_truth

        invoice_data, bboxes = sample_data

        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'test.json')
            save_ground_truth(invoice_data, bboxes, output_path)

            with open(output_path, 'r') as f:
                data = json.load(f)

            assert isinstance(data, dict)

    def test_file_content_has_fields(self, sample_data):
        """Saved file should have fields section."""
        from ground_truth import save_ground_truth

        invoice_data, bboxes = sample_data

        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'test.json')
            save_ground_truth(invoice_data, bboxes, output_path)

            with open(output_path, 'r') as f:
                data = json.load(f)

            assert 'fields' in data

    def test_creates_parent_directories(self, sample_data):
        """Should create parent directories if needed."""
        from ground_truth import save_ground_truth

        invoice_data, bboxes = sample_data

        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'subdir', 'nested', 'test.json')
            save_ground_truth(invoice_data, bboxes, output_path)

            assert os.path.exists(output_path)


class TestLoadGroundTruth:
    """Test loading ground truth from JSON files."""

    def test_loads_saved_file(self):
        """Should load previously saved ground truth."""
        from ground_truth import save_ground_truth, load_ground_truth

        invoice_data = {
            'emisor': {'name': 'Test', 'rfc': 'TEST123456XXX', 'address': 'Addr'},
            'receptor': {'name': 'Client', 'rfc': 'CLNT654321YYY', 'address': 'Addr'},
            'date': '2024-05-20',
            'folio': 'LOAD1234',
            'items': [],
            'subtotal': 500.0,
            'iva': 80.0,
            'total': 580.0,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': {'x': 10, 'y': 10, 'width': 100, 'height': 20},
            'rfc_receptor': {'x': 10, 'y': 40, 'width': 100, 'height': 20},
            'date': None,
            'folio': None,
            'subtotal': None,
            'iva': None,
            'total': {'x': 400, 'y': 260, 'width': 80, 'height': 20},
            'items': []
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'test.json')
            save_ground_truth(invoice_data, bboxes, output_path)

            loaded = load_ground_truth(output_path)

            assert loaded['fields']['rfc_emisor']['value'] == 'TEST123456XXX'
            assert loaded['fields']['total']['value'] == 580.0

    def test_raises_on_missing_file(self):
        """Should raise error for missing file."""
        from ground_truth import load_ground_truth

        with pytest.raises(FileNotFoundError):
            load_ground_truth('/nonexistent/path/file.json')


class TestHandleNullBBoxes:
    """Test handling of null/missing bounding boxes."""

    def test_handles_null_bbox_gracefully(self):
        """Should handle None bboxes without error."""
        from ground_truth import create_ground_truth

        invoice_data = {
            'emisor': {'name': 'Test', 'rfc': 'TEST123456XXX', 'address': 'Addr'},
            'receptor': {'name': 'Client', 'rfc': 'CLNT654321YYY', 'address': 'Addr'},
            'date': '2024-05-20',
            'folio': 'NULL1234',
            'items': [],
            'subtotal': 500.0,
            'iva': 80.0,
            'total': 580.0,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': None,  # OCR couldn't find it
            'rfc_receptor': {'x': 10, 'y': 40, 'width': 100, 'height': 20},
            'date': None,
            'folio': None,
            'subtotal': None,
            'iva': None,
            'total': None,
            'items': []
        }

        result = create_ground_truth(invoice_data, bboxes)

        # Should still have the field, but bbox is None
        assert 'rfc_emisor' in result['fields']
        assert result['fields']['rfc_emisor']['bbox'] is None
        assert result['fields']['rfc_emisor']['value'] == 'TEST123456XXX'


class TestMetadataSection:
    """Test the metadata section."""

    def test_includes_version(self):
        """Metadata should include format version."""
        from ground_truth import create_ground_truth

        invoice_data = {
            'emisor': {'name': 'Test', 'rfc': 'TEST123456XXX', 'address': 'Addr'},
            'receptor': {'name': 'Client', 'rfc': 'CLNT654321YYY', 'address': 'Addr'},
            'date': '2024-05-20',
            'folio': 'META1234',
            'items': [],
            'subtotal': 500.0,
            'iva': 80.0,
            'total': 580.0,
            'currency': 'MXN'
        }

        bboxes = {
            'rfc_emisor': None,
            'rfc_receptor': None,
            'date': None,
            'folio': None,
            'subtotal': None,
            'iva': None,
            'total': None,
            'items': []
        }

        result = create_ground_truth(invoice_data, bboxes)

        assert 'version' in result['metadata']

    def test_includes_currency(self):
        """Metadata should include currency."""
        from ground_truth import create_ground_truth

        invoice_data = {
            'emisor': {'name': 'Test', 'rfc': 'TEST123456XXX', 'address': 'Addr'},
            'receptor': {'name': 'Client', 'rfc': 'CLNT654321YYY', 'address': 'Addr'},
            'date': '2024-05-20',
            'folio': 'META1234',
            'items': [],
            'subtotal': 500.0,
            'iva': 80.0,
            'total': 580.0,
            'currency': 'USD'
        }

        bboxes = {
            'rfc_emisor': None,
            'rfc_receptor': None,
            'date': None,
            'folio': None,
            'subtotal': None,
            'iva': None,
            'total': None,
            'items': []
        }

        result = create_ground_truth(invoice_data, bboxes)

        assert result['metadata']['currency'] == 'USD'
