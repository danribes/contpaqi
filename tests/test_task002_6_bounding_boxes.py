"""
Test Suite for Subtask 2.6: Implement bounding box calculation for all fields

Tests verify:
- Bounding box module exists and is importable
- Functions for finding text bounding boxes work correctly
- BBox structure contains required fields (x, y, width, height)
- Can find specific field values in OCR data
- Handles missing fields gracefully
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestBBoxModuleExists:
    """Test that the bounding box module exists and is importable."""

    def test_can_import_module(self):
        """Should be able to import bbox module."""
        import bbox_utils
        assert bbox_utils is not None

    def test_has_find_text_bbox_function(self):
        """Module should have find_text_bbox function."""
        from bbox_utils import find_text_bbox
        assert callable(find_text_bbox)

    def test_has_find_all_field_bboxes_function(self):
        """Module should have find_all_field_bboxes function."""
        from bbox_utils import find_all_field_bboxes
        assert callable(find_all_field_bboxes)

    def test_has_ocr_image_function(self):
        """Module should have ocr_image function."""
        from bbox_utils import ocr_image
        assert callable(ocr_image)


class TestBBoxStructure:
    """Test the structure of bounding box results."""

    def test_bbox_has_required_fields(self):
        """Bounding box should have x, y, width, height."""
        from bbox_utils import create_bbox

        bbox = create_bbox(10, 20, 100, 50)

        assert 'x' in bbox
        assert 'y' in bbox
        assert 'width' in bbox
        assert 'height' in bbox

    def test_bbox_values_are_numbers(self):
        """Bounding box values should be numeric."""
        from bbox_utils import create_bbox

        bbox = create_bbox(10, 20, 100, 50)

        assert isinstance(bbox['x'], (int, float))
        assert isinstance(bbox['y'], (int, float))
        assert isinstance(bbox['width'], (int, float))
        assert isinstance(bbox['height'], (int, float))

    def test_bbox_from_coordinates(self):
        """Should create bbox from x, y, w, h coordinates."""
        from bbox_utils import create_bbox

        bbox = create_bbox(100, 200, 150, 30)

        assert bbox['x'] == 100
        assert bbox['y'] == 200
        assert bbox['width'] == 150
        assert bbox['height'] == 30


class TestFindTextBBox:
    """Test finding text bounding boxes in OCR data."""

    @pytest.fixture
    def mock_ocr_data(self):
        """Create mock OCR data structure."""
        return {
            'text': ['', 'FACTURA', 'Total:', '$1,234.56', 'RFC:', 'XAXX010101ABC'],
            'left': [0, 100, 50, 150, 50, 120],
            'top': [0, 50, 200, 200, 250, 250],
            'width': [0, 120, 60, 100, 40, 130],
            'height': [0, 30, 25, 25, 25, 25],
            'conf': [-1, 95, 90, 88, 92, 85],
        }

    def test_finds_exact_match(self, mock_ocr_data):
        """Should find text with exact match."""
        from bbox_utils import find_text_bbox

        bbox = find_text_bbox(mock_ocr_data, 'FACTURA')

        assert bbox is not None
        assert bbox['x'] == 100
        assert bbox['y'] == 50

    def test_finds_partial_match(self, mock_ocr_data):
        """Should find text with partial match."""
        from bbox_utils import find_text_bbox

        bbox = find_text_bbox(mock_ocr_data, '1,234.56')

        assert bbox is not None
        assert bbox['x'] == 150

    def test_returns_none_for_missing_text(self, mock_ocr_data):
        """Should return None when text not found."""
        from bbox_utils import find_text_bbox

        bbox = find_text_bbox(mock_ocr_data, 'NONEXISTENT')

        assert bbox is None

    def test_finds_rfc_pattern(self, mock_ocr_data):
        """Should find RFC-like patterns."""
        from bbox_utils import find_text_bbox

        bbox = find_text_bbox(mock_ocr_data, 'XAXX010101ABC')

        assert bbox is not None
        assert bbox['width'] == 130

    def test_case_insensitive_search(self, mock_ocr_data):
        """Should find text case-insensitively when specified."""
        from bbox_utils import find_text_bbox

        bbox = find_text_bbox(mock_ocr_data, 'factura', case_sensitive=False)

        assert bbox is not None


class TestFindNumericValue:
    """Test finding numeric values in OCR data."""

    @pytest.fixture
    def mock_ocr_data(self):
        """Create mock OCR data with numeric values."""
        return {
            'text': ['Subtotal:', '$15,000.00', 'IVA:', '$2,400.00', 'Total:', '$17,400.00'],
            'left': [50, 200, 50, 200, 50, 200],
            'top': [300, 300, 330, 330, 360, 360],
            'width': [70, 100, 30, 90, 50, 110],
            'height': [20, 20, 20, 20, 20, 20],
            'conf': [95, 90, 95, 88, 95, 92],
        }

    def test_finds_formatted_number(self, mock_ocr_data):
        """Should find formatted currency values."""
        from bbox_utils import find_numeric_bbox

        bbox = find_numeric_bbox(mock_ocr_data, 17400.00)

        assert bbox is not None

    def test_handles_comma_formatting(self, mock_ocr_data):
        """Should handle numbers with comma separators."""
        from bbox_utils import find_numeric_bbox

        bbox = find_numeric_bbox(mock_ocr_data, 15000.00)

        assert bbox is not None


class TestFindAllFieldBBoxes:
    """Test finding all invoice field bounding boxes."""

    @pytest.fixture
    def mock_invoice_data(self):
        """Create mock invoice data."""
        return {
            'emisor': {'name': 'Empresa ABC', 'rfc': 'XAXX010101ABC'},
            'receptor': {'name': 'Cliente XYZ', 'rfc': 'XBBB020202XYZ'},
            'date': '2024-03-15',
            'folio': 'A1B2C3D4',
            'subtotal': 15000.00,
            'iva': 2400.00,
            'total': 17400.00,
            'items': [
                {'description': 'Servicio', 'quantity': 10, 'unit_price': 1500.00, 'amount': 15000.00}
            ]
        }

    def test_returns_dictionary(self, mock_invoice_data):
        """find_all_field_bboxes should return a dictionary."""
        from bbox_utils import find_all_field_bboxes

        # Mock OCR function
        with patch('bbox_utils.ocr_image') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['XAXX010101ABC', '17400.00'],
                'left': [100, 200],
                'top': [100, 300],
                'width': [130, 100],
                'height': [25, 25],
                'conf': [90, 85],
            }

            # Create a mock image
            mock_image = MagicMock()
            result = find_all_field_bboxes(mock_image, mock_invoice_data)

            assert isinstance(result, dict)

    def test_includes_rfc_emisor_field(self, mock_invoice_data):
        """Result should include rfc_emisor field."""
        from bbox_utils import find_all_field_bboxes

        with patch('bbox_utils.ocr_image') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['XAXX010101ABC'],
                'left': [100],
                'top': [100],
                'width': [130],
                'height': [25],
                'conf': [90],
            }

            mock_image = MagicMock()
            result = find_all_field_bboxes(mock_image, mock_invoice_data)

            assert 'rfc_emisor' in result

    def test_includes_total_field(self, mock_invoice_data):
        """Result should include total field."""
        from bbox_utils import find_all_field_bboxes

        with patch('bbox_utils.ocr_image') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['17400.00', '$17,400.00'],
                'left': [200, 200],
                'top': [300, 300],
                'width': [100, 110],
                'height': [25, 25],
                'conf': [85, 90],
            }

            mock_image = MagicMock()
            result = find_all_field_bboxes(mock_image, mock_invoice_data)

            assert 'total' in result


class TestBBoxNormalization:
    """Test bounding box normalization for different image sizes."""

    def test_normalize_bbox(self):
        """Should normalize bbox to 0-1 range."""
        from bbox_utils import normalize_bbox

        bbox = {'x': 100, 'y': 200, 'width': 150, 'height': 30}
        image_width = 1000
        image_height = 1400

        normalized = normalize_bbox(bbox, image_width, image_height)

        assert normalized['x'] == 0.1
        assert normalized['y'] == pytest.approx(0.1428, rel=0.01)
        assert normalized['width'] == 0.15
        assert normalized['height'] == pytest.approx(0.0214, rel=0.01)

    def test_normalized_values_in_range(self):
        """Normalized values should be between 0 and 1."""
        from bbox_utils import normalize_bbox

        bbox = {'x': 500, 'y': 700, 'width': 200, 'height': 50}

        normalized = normalize_bbox(bbox, 1000, 1400)

        assert 0 <= normalized['x'] <= 1
        assert 0 <= normalized['y'] <= 1
        assert 0 <= normalized['width'] <= 1
        assert 0 <= normalized['height'] <= 1


class TestMergeBBoxes:
    """Test merging multiple bounding boxes."""

    def test_merge_two_bboxes(self):
        """Should merge two bboxes into one containing both."""
        from bbox_utils import merge_bboxes

        bbox1 = {'x': 100, 'y': 200, 'width': 50, 'height': 20}
        bbox2 = {'x': 160, 'y': 200, 'width': 80, 'height': 20}

        merged = merge_bboxes([bbox1, bbox2])

        assert merged['x'] == 100
        assert merged['y'] == 200
        assert merged['width'] == 140  # 160 + 80 - 100 = 140
        assert merged['height'] == 20

    def test_merge_empty_list(self):
        """Should return None for empty list."""
        from bbox_utils import merge_bboxes

        result = merge_bboxes([])

        assert result is None

    def test_merge_single_bbox(self):
        """Should return same bbox for single item."""
        from bbox_utils import merge_bboxes

        bbox = {'x': 100, 'y': 200, 'width': 50, 'height': 20}

        merged = merge_bboxes([bbox])

        assert merged == bbox


class TestOCRDataProcessing:
    """Test OCR data processing utilities."""

    def test_filter_low_confidence(self):
        """Should filter out low confidence results."""
        from bbox_utils import filter_ocr_by_confidence

        ocr_data = {
            'text': ['Good', 'Bad', 'OK'],
            'left': [100, 200, 300],
            'top': [100, 100, 100],
            'width': [50, 50, 50],
            'height': [20, 20, 20],
            'conf': [90, 30, 70],
        }

        filtered = filter_ocr_by_confidence(ocr_data, min_confidence=60)

        assert 'Good' in filtered['text']
        assert 'OK' in filtered['text']
        assert 'Bad' not in filtered['text']

    def test_filter_empty_text(self):
        """Should filter out empty text entries."""
        from bbox_utils import filter_ocr_by_confidence

        ocr_data = {
            'text': ['', 'Valid', '   ', 'Also Valid'],
            'left': [0, 100, 200, 300],
            'top': [0, 100, 100, 100],
            'width': [0, 50, 50, 80],
            'height': [0, 20, 20, 20],
            'conf': [-1, 90, -1, 85],
        }

        filtered = filter_ocr_by_confidence(ocr_data, min_confidence=0)

        assert '' not in filtered['text']
        assert '   ' not in filtered['text']
        assert 'Valid' in filtered['text']


class TestSearchPatterns:
    """Test different search patterns for finding fields."""

    @pytest.fixture
    def mock_ocr_data(self):
        """Mock OCR data with various patterns."""
        return {
            'text': ['RFC:', 'XAXX010101ABC', 'Fecha:', '15/03/2024', '$', '17,400.00'],
            'left': [50, 100, 50, 120, 180, 200],
            'top': [100, 100, 150, 150, 200, 200],
            'width': [40, 130, 50, 100, 15, 90],
            'height': [20, 20, 20, 20, 20, 20],
            'conf': [95, 88, 95, 90, 70, 92],
        }

    def test_find_by_label_and_value(self, mock_ocr_data):
        """Should find field by looking for label then value."""
        from bbox_utils import find_labeled_field_bbox

        bbox = find_labeled_field_bbox(mock_ocr_data, label='RFC:', value='XAXX010101ABC')

        assert bbox is not None

    def test_find_date_pattern(self, mock_ocr_data):
        """Should find date in DD/MM/YYYY format."""
        from bbox_utils import find_date_bbox

        bbox = find_date_bbox(mock_ocr_data, '2024-03-15')

        assert bbox is not None


class TestItemsBBoxes:
    """Test finding bounding boxes for line items."""

    def test_find_item_row_bbox(self):
        """Should find bounding box for an item row."""
        from bbox_utils import find_item_bbox

        ocr_data = {
            'text': ['Servicio', 'consultoría', '10', '$1,500.00', '$15,000.00'],
            'left': [50, 130, 300, 380, 480],
            'top': [400, 400, 400, 400, 400],
            'width': [70, 90, 30, 80, 90],
            'height': [20, 20, 20, 20, 20],
            'conf': [90, 88, 95, 85, 87],
        }

        item = {
            'description': 'Servicio consultoría',
            'quantity': 10,
            'unit_price': 1500.00,
            'amount': 15000.00
        }

        bbox = find_item_bbox(ocr_data, item)

        # Should return a bbox that spans the item row
        assert bbox is not None
        assert 'x' in bbox
        assert 'y' in bbox
