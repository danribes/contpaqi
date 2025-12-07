"""
Tests for Subtask 8.6: Create predict(image) method combining all steps

Tests the main predict() method and helper methods that combine all pipeline steps.
"""
import pytest
from unittest.mock import Mock, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestPredictMethodExists:
    """Test that predict method exists."""

    def test_predict_method_exists(self):
        """Test that InvoiceInferenceEngine has predict method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, 'predict')

    def test_predict_is_callable(self):
        """Test that predict is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine.predict)


class TestPredictMethodSignature:
    """Test predict method signature."""

    def test_accepts_image_parameter(self):
        """Test predict accepts image parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine.predict)
        params = list(sig.parameters.keys())
        assert 'image' in params


class TestPredictReturnType:
    """Test predict return type."""

    def test_returns_invoice_result(self):
        """Test predict returns InvoiceResult."""
        from inference import InvoiceInferenceEngine, InvoiceResult
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock all component methods
        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        mock_image = Mock()
        result = engine.predict(mock_image)

        assert isinstance(result, InvoiceResult)


class TestPredictCallsPipelineSteps:
    """Test that predict calls all pipeline steps."""

    def test_predict_calls_run_ocr(self):
        """Test predict calls _run_ocr."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        mock_image = Mock()
        engine.predict(mock_image)

        engine._run_ocr.assert_called_once_with(mock_image)

    def test_predict_calls_detect_table_structure(self):
        """Test predict calls _detect_table_structure."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        mock_image = Mock()
        engine.predict(mock_image)

        engine._detect_table_structure.assert_called_once_with(mock_image)

    def test_predict_calls_extract_fields(self):
        """Test predict calls _extract_fields."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['RFC:', 'XAXX010101000']
        boxes = [(0, 0, 30, 10), (40, 0, 150, 10)]

        engine._run_ocr = Mock(return_value=(words, boxes, [0.9, 0.95]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        mock_image = Mock()
        engine.predict(mock_image)

        engine._extract_fields.assert_called_once_with(mock_image, words, boxes)

    def test_predict_calls_assign_words_to_rows(self):
        """Test predict calls _assign_words_to_rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Product', 'A']
        boxes = [(0, 0, 50, 10), (60, 0, 80, 10)]
        rows = [{'bbox': (0, 0, 100, 20), 'index': 0}]

        engine._run_ocr = Mock(return_value=(words, boxes, [0.9, 0.95]))
        engine._detect_table_structure = Mock(return_value={'table': (0, 0, 100, 50), 'rows': rows})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        mock_image = Mock()
        engine.predict(mock_image)

        engine._assign_words_to_rows.assert_called_once_with(words, boxes, rows)


class TestGetFieldValueMethod:
    """Test _get_field_value helper method."""

    def test_get_field_value_method_exists(self):
        """Test _get_field_value method exists."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_get_field_value')

    def test_get_field_value_returns_value(self):
        """Test _get_field_value returns field value."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = 'XAXX010101000'
        fields = {'RFC_EMISOR': mock_field}

        result = engine._get_field_value(fields, 'RFC_EMISOR', '')
        assert result == 'XAXX010101000'

    def test_get_field_value_returns_default_when_missing(self):
        """Test _get_field_value returns default when field missing."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        fields = {}
        result = engine._get_field_value(fields, 'RFC_EMISOR', 'DEFAULT')
        assert result == 'DEFAULT'

    def test_get_field_value_returns_default_when_value_none(self):
        """Test _get_field_value returns default when value is None."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = None
        fields = {'RFC_EMISOR': mock_field}

        result = engine._get_field_value(fields, 'RFC_EMISOR', 'DEFAULT')
        assert result == 'DEFAULT'


class TestParseAmountMethod:
    """Test _parse_amount helper method."""

    def test_parse_amount_method_exists(self):
        """Test _parse_amount method exists."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_parse_amount')

    def test_parse_amount_returns_float(self):
        """Test _parse_amount returns float."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = '1000.00'
        fields = {'TOTAL': mock_field}

        result = engine._parse_amount(fields, 'TOTAL')
        assert isinstance(result, float)
        assert result == 1000.00

    def test_parse_amount_handles_currency_symbol(self):
        """Test _parse_amount handles $ symbol."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = '$1,500.00'
        fields = {'TOTAL': mock_field}

        result = engine._parse_amount(fields, 'TOTAL')
        assert result == 1500.00

    def test_parse_amount_handles_commas(self):
        """Test _parse_amount handles thousand separators."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = '1,234,567.89'
        fields = {'TOTAL': mock_field}

        result = engine._parse_amount(fields, 'TOTAL')
        assert result == 1234567.89

    def test_parse_amount_returns_zero_when_missing(self):
        """Test _parse_amount returns 0.0 when field missing."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        fields = {}
        result = engine._parse_amount(fields, 'TOTAL')
        assert result == 0.0

    def test_parse_amount_returns_zero_on_invalid(self):
        """Test _parse_amount returns 0.0 on invalid value."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = 'invalid'
        fields = {'TOTAL': mock_field}

        result = engine._parse_amount(fields, 'TOTAL')
        assert result == 0.0


class TestParseLineItemMethod:
    """Test _parse_line_item helper method."""

    def test_parse_line_item_method_exists(self):
        """Test _parse_line_item method exists."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_parse_line_item')

    def test_parse_line_item_returns_dict(self):
        """Test _parse_line_item returns dictionary."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_words = [{'word': 'Product', 'bbox': (0, 0, 50, 10)}]
        result = engine._parse_line_item(row_words)
        assert isinstance(result, dict)

    def test_parse_line_item_has_description(self):
        """Test _parse_line_item has description key."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_words = [
            {'word': 'Product', 'bbox': (0, 0, 50, 10)},
            {'word': 'A', 'bbox': (60, 0, 80, 10)}
        ]
        result = engine._parse_line_item(row_words)
        assert 'description' in result

    def test_parse_line_item_joins_words(self):
        """Test _parse_line_item joins words into description."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_words = [
            {'word': 'Product', 'bbox': (0, 0, 50, 10)},
            {'word': 'A', 'bbox': (60, 0, 80, 10)},
            {'word': 'Premium', 'bbox': (90, 0, 140, 10)}
        ]
        result = engine._parse_line_item(row_words)
        assert result['description'] == 'Product A Premium'

    def test_parse_line_item_has_raw_words(self):
        """Test _parse_line_item includes raw_words."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_words = [{'word': 'Test', 'bbox': (0, 0, 30, 10)}]
        result = engine._parse_line_item(row_words)
        assert 'raw_words' in result
        assert result['raw_words'] == row_words


class TestPredictResultFields:
    """Test that predict populates result fields correctly."""

    def test_predict_extracts_rfc_emisor(self):
        """Test predict extracts RFC emisor."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.value = 'XAXX010101000'

        engine._run_ocr = Mock(return_value=(['RFC'], [(0, 0, 30, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'RFC_EMISOR': mock_rfc})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_emisor == 'XAXX010101000'

    def test_predict_extracts_rfc_receptor(self):
        """Test predict extracts RFC receptor."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.value = 'CACX7605101P8'

        engine._run_ocr = Mock(return_value=(['RFC'], [(0, 0, 30, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'RFC_RECEPTOR': mock_rfc})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_receptor == 'CACX7605101P8'

    def test_predict_extracts_date(self):
        """Test predict extracts date."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_date = Mock()
        mock_date.value = '01/01/2024'

        engine._run_ocr = Mock(return_value=(['Fecha'], [(0, 0, 40, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'DATE': mock_date})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.date == '01/01/2024'

    def test_predict_extracts_amounts(self):
        """Test predict extracts subtotal, iva, total."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_subtotal = Mock()
        mock_subtotal.value = '1000.00'
        mock_iva = Mock()
        mock_iva.value = '160.00'
        mock_total = Mock()
        mock_total.value = '1160.00'

        engine._run_ocr = Mock(return_value=(['Total'], [(0, 0, 40, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={
            'SUBTOTAL': mock_subtotal,
            'IVA': mock_iva,
            'TOTAL': mock_total
        })
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.subtotal == 1000.00
        assert result.iva == 160.00
        assert result.total == 1160.00

    def test_predict_builds_line_items(self):
        """Test predict builds line items from rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_data = [{
            'row_index': 0,
            'words': [
                {'word': 'Product', 'bbox': (0, 0, 50, 10)},
                {'word': 'A', 'bbox': (60, 0, 80, 10)}
            ],
            'bbox': (0, 0, 100, 20)
        }]

        engine._run_ocr = Mock(return_value=(['Product', 'A'], [(0, 0, 50, 10), (60, 0, 80, 10)], [0.9, 0.9]))
        engine._detect_table_structure = Mock(return_value={'table': (0, 0, 100, 50), 'rows': [{'bbox': (0, 0, 100, 20), 'index': 0}]})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=row_data)

        result = engine.predict(Mock())

        assert len(result.line_items) == 1
        assert result.line_items[0]['description'] == 'Product A'


class TestPredictDefaultValues:
    """Test that predict uses sensible defaults."""

    def test_predict_defaults_empty_rfc_emisor(self):
        """Test predict defaults to empty string for missing RFC emisor."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_emisor == ''

    def test_predict_defaults_zero_amounts(self):
        """Test predict defaults to 0.0 for missing amounts."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.subtotal == 0.0
        assert result.iva == 0.0
        assert result.total == 0.0

    def test_predict_defaults_empty_line_items(self):
        """Test predict defaults to empty list for no rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.line_items == []


class TestPredictConfidenceAndWarnings:
    """Test confidence and warnings in predict result."""

    def test_predict_has_confidence(self):
        """Test predict result has confidence score."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert hasattr(result, 'confidence')
        assert isinstance(result.confidence, float)
        assert 0.0 <= result.confidence <= 1.0

    def test_predict_has_warnings_list(self):
        """Test predict result has warnings list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert hasattr(result, 'warnings')
        assert isinstance(result.warnings, list)


class TestPredictIntegration:
    """Integration tests for predict method."""

    def test_predict_full_pipeline(self):
        """Test predict runs complete pipeline with realistic data."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock OCR output
        words = ['RFC:', 'XAXX010101000', 'Fecha:', '01/01/2024', 'Total:', '$1,160.00']
        boxes = [
            (10, 10, 40, 25), (50, 10, 150, 25),
            (10, 30, 50, 45), (60, 30, 140, 45),
            (10, 200, 50, 215), (60, 200, 140, 215)
        ]
        confidences = [0.95, 0.98, 0.90, 0.92, 0.93, 0.96]

        # Mock fields
        mock_rfc = Mock()
        mock_rfc.value = 'XAXX010101000'
        mock_date = Mock()
        mock_date.value = '01/01/2024'
        mock_total = Mock()
        mock_total.value = '$1,160.00'

        fields = {
            'RFC_EMISOR': mock_rfc,
            'DATE': mock_date,
            'TOTAL': mock_total
        }

        engine._run_ocr = Mock(return_value=(words, boxes, confidences))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value=fields)
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())

        assert result.rfc_emisor == 'XAXX010101000'
        assert result.date == '01/01/2024'
        assert result.total == 1160.00

    def test_predict_with_line_items(self):
        """Test predict with table rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock data
        words = ['Product', 'A', '2', '$500', '$1,000', 'Product', 'B', '1', '$160', '$160']
        boxes = [
            (10, 100, 60, 115), (70, 100, 90, 115), (150, 100, 170, 115), (250, 100, 300, 115), (350, 100, 420, 115),
            (10, 130, 60, 145), (70, 130, 90, 145), (150, 130, 170, 145), (250, 130, 300, 145), (350, 130, 420, 145),
        ]
        confidences = [0.9] * 10

        # Mock row assignment results
        row_data = [
            {
                'row_index': 0,
                'words': [
                    {'word': 'Product', 'bbox': (10, 100, 60, 115)},
                    {'word': 'A', 'bbox': (70, 100, 90, 115)},
                    {'word': '2', 'bbox': (150, 100, 170, 115)},
                    {'word': '$500', 'bbox': (250, 100, 300, 115)},
                    {'word': '$1,000', 'bbox': (350, 100, 420, 115)},
                ],
                'bbox': (0, 95, 500, 120)
            },
            {
                'row_index': 1,
                'words': [
                    {'word': 'Product', 'bbox': (10, 130, 60, 145)},
                    {'word': 'B', 'bbox': (70, 130, 90, 145)},
                    {'word': '1', 'bbox': (150, 130, 170, 145)},
                    {'word': '$160', 'bbox': (250, 130, 300, 145)},
                    {'word': '$160', 'bbox': (350, 130, 420, 145)},
                ],
                'bbox': (0, 125, 500, 150)
            }
        ]

        engine._run_ocr = Mock(return_value=(words, boxes, confidences))
        engine._detect_table_structure = Mock(return_value={
            'table': (0, 90, 500, 160),
            'rows': [
                {'bbox': (0, 95, 500, 120), 'index': 0},
                {'bbox': (0, 125, 500, 150), 'index': 1}
            ]
        })
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=row_data)

        result = engine.predict(Mock())

        assert len(result.line_items) == 2
        assert 'Product A' in result.line_items[0]['description']
        assert 'Product B' in result.line_items[1]['description']
