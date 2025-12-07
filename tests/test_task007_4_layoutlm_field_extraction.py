"""
Tests for Subtask 7.4: Map tokens to field labels (RFC, date, total, etc.)

Tests the extract_fields() method that groups BIO-tagged tokens into complete fields.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestExtractFieldsMethodExists:
    """Test that extract_fields method exists and has correct signature."""

    def test_extract_fields_method_exists(self):
        """Test that LayoutLMModel has extract_fields method."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert hasattr(model, 'extract_fields')

    def test_extract_fields_is_callable(self):
        """Test that extract_fields is callable."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert callable(model.extract_fields)

    def test_extract_fields_accepts_predictions(self):
        """Test that extract_fields accepts predictions list."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = []
        result = model.extract_fields(predictions)
        assert isinstance(result, dict)


class TestExtractFieldsReturnsDict:
    """Test that extract_fields returns proper dictionary."""

    def test_returns_dict(self):
        """Test that extract_fields returns a dictionary."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        result = model.extract_fields([])
        assert isinstance(result, dict)

    def test_returns_empty_dict_for_empty_input(self):
        """Test that empty predictions return empty dict."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        result = model.extract_fields([])
        assert result == {}

    def test_returns_empty_dict_for_all_o_labels(self):
        """Test that all O labels return empty dict."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'FACTURA', 'label': 'O', 'confidence': 0.95, 'bbox': (100, 50, 200, 70)},
            {'word': 'No.', 'label': 'O', 'confidence': 0.90, 'bbox': (210, 50, 250, 70)},
        ]
        result = model.extract_fields(predictions)
        assert result == {}


class TestBIOTagGrouping:
    """Test BIO tag grouping logic."""

    def test_single_b_tag_creates_field(self):
        """Test that a single B- tag creates a field."""
        from models.layoutlm import LayoutLMModel, ExtractedField
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'ABC123456789', 'label': 'B-RFC_EMISOR', 'confidence': 0.95, 'bbox': (100, 50, 200, 70)},
        ]
        result = model.extract_fields(predictions)
        assert 'RFC_EMISOR' in result
        assert isinstance(result['RFC_EMISOR'], ExtractedField)

    def test_b_followed_by_i_merges(self):
        """Test that B- followed by I- with same type merges."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$1,000', 'label': 'B-TOTAL', 'confidence': 0.90, 'bbox': (100, 50, 150, 70)},
            {'word': '.00', 'label': 'I-TOTAL', 'confidence': 0.88, 'bbox': (155, 50, 200, 70)},
        ]
        result = model.extract_fields(predictions)
        assert 'TOTAL' in result
        assert result['TOTAL'].value == '$1,000 .00'

    def test_b_followed_by_different_i_ends_field(self):
        """Test that B- followed by I- with different type ends first field."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'ABC123', 'label': 'B-RFC_EMISOR', 'confidence': 0.90, 'bbox': (100, 50, 200, 70)},
            {'word': '456', 'label': 'I-RFC_RECEPTOR', 'confidence': 0.85, 'bbox': (210, 50, 260, 70)},
        ]
        result = model.extract_fields(predictions)
        assert 'RFC_EMISOR' in result
        assert result['RFC_EMISOR'].value == 'ABC123'
        # I-RFC_RECEPTOR without preceding B- should be ignored
        assert 'RFC_RECEPTOR' not in result

    def test_b_followed_by_o_ends_field(self):
        """Test that B- followed by O ends the field."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '01/01/2024', 'label': 'B-DATE', 'confidence': 0.92, 'bbox': (100, 50, 200, 70)},
            {'word': 'MXN', 'label': 'O', 'confidence': 0.88, 'bbox': (210, 50, 260, 70)},
        ]
        result = model.extract_fields(predictions)
        assert 'DATE' in result
        assert result['DATE'].value == '01/01/2024'

    def test_multiple_fields_extracted(self):
        """Test multiple fields are extracted correctly."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'ABC123456789', 'label': 'B-RFC_EMISOR', 'confidence': 0.95, 'bbox': (100, 50, 200, 70)},
            {'word': 'FACTURA', 'label': 'O', 'confidence': 0.80, 'bbox': (100, 100, 180, 120)},
            {'word': '01/01/2024', 'label': 'B-DATE', 'confidence': 0.92, 'bbox': (300, 50, 400, 70)},
            {'word': 'TOTAL:', 'label': 'O', 'confidence': 0.75, 'bbox': (100, 300, 180, 320)},
            {'word': '$1,160.00', 'label': 'B-TOTAL', 'confidence': 0.90, 'bbox': (200, 300, 320, 320)},
        ]
        result = model.extract_fields(predictions)
        assert len(result) == 3
        assert 'RFC_EMISOR' in result
        assert 'DATE' in result
        assert 'TOTAL' in result

    def test_i_without_b_ignored(self):
        """Test that I- tag without preceding B- is ignored."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'orphan', 'label': 'I-TOTAL', 'confidence': 0.85, 'bbox': (100, 50, 200, 70)},
        ]
        result = model.extract_fields(predictions)
        assert result == {}


class TestMergeTokensMethod:
    """Test the _merge_tokens helper method."""

    def test_merge_tokens_method_exists(self):
        """Test that _merge_tokens method exists."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert hasattr(model, '_merge_tokens')

    def test_merge_tokens_concatenates_words(self):
        """Test that words are concatenated with spaces."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        tokens = [
            {'word': 'Hello', 'confidence': 0.90, 'bbox': (10, 10, 50, 30)},
            {'word': 'World', 'confidence': 0.85, 'bbox': (55, 10, 100, 30)},
        ]
        result = model._merge_tokens(tokens, 'TEST')
        assert result.value == 'Hello World'

    def test_merge_tokens_averages_confidence(self):
        """Test that confidence is averaged."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        tokens = [
            {'word': 'A', 'confidence': 0.80, 'bbox': (10, 10, 20, 30)},
            {'word': 'B', 'confidence': 0.90, 'bbox': (25, 10, 35, 30)},
        ]
        result = model._merge_tokens(tokens, 'TEST')
        assert result.confidence == pytest.approx(0.85, rel=0.01)  # (0.80 + 0.90) / 2

    def test_merge_tokens_creates_union_bbox(self):
        """Test that bounding box is union of all tokens."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        tokens = [
            {'word': 'First', 'confidence': 0.90, 'bbox': (10, 20, 50, 40)},
            {'word': 'Second', 'confidence': 0.85, 'bbox': (55, 15, 120, 45)},
        ]
        result = model._merge_tokens(tokens, 'TEST')
        # Union: min(10,55), min(20,15), max(50,120), max(40,45)
        assert result.bbox == (10, 15, 120, 45)

    def test_merge_tokens_sets_label(self):
        """Test that field_name is set as label."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        tokens = [
            {'word': 'value', 'confidence': 0.90, 'bbox': (10, 10, 50, 30)},
        ]
        result = model._merge_tokens(tokens, 'RFC_EMISOR')
        assert result.label == 'RFC_EMISOR'

    def test_merge_tokens_returns_extracted_field(self):
        """Test that result is ExtractedField."""
        from models.layoutlm import LayoutLMModel, ExtractedField
        model = LayoutLMModel(load_model=False)
        tokens = [
            {'word': 'test', 'confidence': 0.90, 'bbox': (10, 10, 50, 30)},
        ]
        result = model._merge_tokens(tokens, 'TEST')
        assert isinstance(result, ExtractedField)


class TestExtractedFieldValues:
    """Test the values in extracted fields."""

    def test_rfc_emisor_value(self):
        """Test RFC_EMISOR field value is correct."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'XAXX010101000', 'label': 'B-RFC_EMISOR', 'confidence': 0.95, 'bbox': (100, 50, 250, 70)},
        ]
        result = model.extract_fields(predictions)
        assert result['RFC_EMISOR'].value == 'XAXX010101000'

    def test_multi_word_date_value(self):
        """Test multi-word DATE field value."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '01', 'label': 'B-DATE', 'confidence': 0.90, 'bbox': (100, 50, 130, 70)},
            {'word': 'de', 'label': 'I-DATE', 'confidence': 0.85, 'bbox': (135, 50, 160, 70)},
            {'word': 'enero', 'label': 'I-DATE', 'confidence': 0.88, 'bbox': (165, 50, 220, 70)},
            {'word': '2024', 'label': 'I-DATE', 'confidence': 0.92, 'bbox': (225, 50, 280, 70)},
        ]
        result = model.extract_fields(predictions)
        assert result['DATE'].value == '01 de enero 2024'

    def test_total_field_confidence(self):
        """Test TOTAL field confidence is averaged."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$', 'label': 'B-TOTAL', 'confidence': 0.80, 'bbox': (100, 50, 120, 70)},
            {'word': '1,160', 'label': 'I-TOTAL', 'confidence': 0.90, 'bbox': (125, 50, 180, 70)},
            {'word': '.00', 'label': 'I-TOTAL', 'confidence': 0.85, 'bbox': (182, 50, 220, 70)},
        ]
        result = model.extract_fields(predictions)
        # Average: (0.80 + 0.90 + 0.85) / 3 = 0.85
        assert result['TOTAL'].confidence == pytest.approx(0.85, rel=0.01)


class TestFieldBoundingBoxes:
    """Test bounding box merging for fields."""

    def test_single_token_bbox_preserved(self):
        """Test single token field has same bbox."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'RFC123', 'label': 'B-RFC_EMISOR', 'confidence': 0.90, 'bbox': (100, 50, 200, 70)},
        ]
        result = model.extract_fields(predictions)
        assert result['RFC_EMISOR'].bbox == (100, 50, 200, 70)

    def test_horizontal_tokens_union(self):
        """Test horizontally adjacent tokens create proper union."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$1,000', 'label': 'B-TOTAL', 'confidence': 0.90, 'bbox': (100, 50, 180, 70)},
            {'word': '.00', 'label': 'I-TOTAL', 'confidence': 0.88, 'bbox': (185, 50, 230, 70)},
        ]
        result = model.extract_fields(predictions)
        # Union: (min x1=100, min y1=50, max x2=230, max y2=70)
        assert result['TOTAL'].bbox == (100, 50, 230, 70)

    def test_vertically_stacked_tokens_union(self):
        """Test vertically stacked tokens create proper union."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'Line1', 'label': 'B-ITEM_DESC', 'confidence': 0.88, 'bbox': (100, 50, 200, 70)},
            {'word': 'Line2', 'label': 'I-ITEM_DESC', 'confidence': 0.85, 'bbox': (100, 75, 200, 95)},
        ]
        result = model.extract_fields(predictions)
        # Union: (min x1=100, min y1=50, max x2=200, max y2=95)
        assert result['ITEM_DESC'].bbox == (100, 50, 200, 95)


class TestAllFieldTypes:
    """Test extraction of all supported field types."""

    def test_extracts_rfc_emisor(self):
        """Test RFC_EMISOR extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'RFC123', 'label': 'B-RFC_EMISOR', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'RFC_EMISOR' in result

    def test_extracts_rfc_receptor(self):
        """Test RFC_RECEPTOR extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'RFC456', 'label': 'B-RFC_RECEPTOR', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'RFC_RECEPTOR' in result

    def test_extracts_subtotal(self):
        """Test SUBTOTAL extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$1,000.00', 'label': 'B-SUBTOTAL', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'SUBTOTAL' in result

    def test_extracts_iva(self):
        """Test IVA extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$160.00', 'label': 'B-IVA', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'IVA' in result

    def test_extracts_item_desc(self):
        """Test ITEM_DESC extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'Product', 'label': 'B-ITEM_DESC', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'ITEM_DESC' in result

    def test_extracts_item_qty(self):
        """Test ITEM_QTY extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '10', 'label': 'B-ITEM_QTY', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'ITEM_QTY' in result

    def test_extracts_item_price(self):
        """Test ITEM_PRICE extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$50.00', 'label': 'B-ITEM_PRICE', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'ITEM_PRICE' in result

    def test_extracts_item_amount(self):
        """Test ITEM_AMOUNT extraction."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': '$500.00', 'label': 'B-ITEM_AMOUNT', 'confidence': 0.90, 'bbox': (0, 0, 100, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'ITEM_AMOUNT' in result


class TestLastFieldHandling:
    """Test that the last field in predictions is properly captured."""

    def test_last_field_captured(self):
        """Test last field is not forgotten."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'First', 'label': 'O', 'confidence': 0.80, 'bbox': (0, 0, 50, 20)},
            {'word': '$100', 'label': 'B-TOTAL', 'confidence': 0.90, 'bbox': (60, 0, 120, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'TOTAL' in result
        assert result['TOTAL'].value == '$100'

    def test_last_multiword_field_captured(self):
        """Test last multi-word field is captured completely."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        predictions = [
            {'word': 'Header', 'label': 'O', 'confidence': 0.80, 'bbox': (0, 0, 50, 20)},
            {'word': 'Long', 'label': 'B-ITEM_DESC', 'confidence': 0.88, 'bbox': (60, 0, 100, 20)},
            {'word': 'Product', 'label': 'I-ITEM_DESC', 'confidence': 0.85, 'bbox': (105, 0, 160, 20)},
            {'word': 'Name', 'label': 'I-ITEM_DESC', 'confidence': 0.87, 'bbox': (165, 0, 200, 20)},
        ]
        result = model.extract_fields(predictions)
        assert 'ITEM_DESC' in result
        assert result['ITEM_DESC'].value == 'Long Product Name'
