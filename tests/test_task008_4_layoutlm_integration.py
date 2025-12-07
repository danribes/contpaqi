"""
Tests for Subtask 8.4: Implement LayoutLM integration for field extraction

Tests the _extract_fields() method that extracts labeled fields using LayoutLM.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestExtractFieldsMethodExists:
    """Test that _extract_fields method exists."""

    def test_extract_fields_method_exists(self):
        """Test that InvoiceInferenceEngine has _extract_fields method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_extract_fields')

    def test_extract_fields_is_callable(self):
        """Test that _extract_fields is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine._extract_fields)


class TestExtractFieldsSignature:
    """Test _extract_fields method signature."""

    def test_extract_fields_accepts_image(self):
        """Test _extract_fields accepts image parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._extract_fields)
        params = list(sig.parameters.keys())
        assert 'image' in params

    def test_extract_fields_accepts_words(self):
        """Test _extract_fields accepts words parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._extract_fields)
        params = list(sig.parameters.keys())
        assert 'words' in params

    def test_extract_fields_accepts_boxes(self):
        """Test _extract_fields accepts boxes parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._extract_fields)
        params = list(sig.parameters.keys())
        assert 'boxes' in params


class TestExtractFieldsReturnType:
    """Test _extract_fields return type."""

    def test_extract_fields_returns_dict(self):
        """Test _extract_fields returns a dictionary."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock the LayoutLM model
        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = []
        mock_layoutlm.extract_fields.return_value = {}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        words = ['Test']
        boxes = [(10, 10, 50, 30)]

        result = engine._extract_fields(mock_image, words, boxes)
        assert isinstance(result, dict)


class TestExtractFieldsCallsLayoutLM:
    """Test that _extract_fields calls LayoutLM model correctly."""

    def test_extract_fields_calls_predict(self):
        """Test _extract_fields calls layoutlm.predict."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = []
        mock_layoutlm.extract_fields.return_value = {}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        words = ['Hello', 'World']
        boxes = [(10, 10, 50, 30), (60, 10, 100, 30)]

        engine._extract_fields(mock_image, words, boxes)

        mock_layoutlm.predict.assert_called_once_with(mock_image, words, boxes)

    def test_extract_fields_calls_extract_fields(self):
        """Test _extract_fields calls layoutlm.extract_fields."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        predictions = [{'word': 'Test', 'label': 'O'}]
        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = predictions
        mock_layoutlm.extract_fields.return_value = {}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        words = ['Test']
        boxes = [(10, 10, 50, 30)]

        engine._extract_fields(mock_image, words, boxes)

        mock_layoutlm.extract_fields.assert_called_once_with(predictions)

    def test_extract_fields_passes_predictions_to_extract_fields(self):
        """Test predictions from predict() are passed to extract_fields()."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        predictions = [
            {'word': 'RFC123', 'label': 'B-RFC_EMISOR', 'confidence': 0.95},
            {'word': '$1000', 'label': 'B-TOTAL', 'confidence': 0.90},
        ]
        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = predictions
        mock_layoutlm.extract_fields.return_value = {'RFC_EMISOR': Mock(), 'TOTAL': Mock()}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        words = ['RFC123', '$1000']
        boxes = [(10, 10, 100, 30), (200, 10, 300, 30)]

        engine._extract_fields(mock_image, words, boxes)

        # Verify predictions were passed
        call_args = mock_layoutlm.extract_fields.call_args
        assert call_args[0][0] == predictions


class TestExtractFieldsWithFields:
    """Test _extract_fields with actual field data."""

    def test_returns_extracted_fields(self):
        """Test that extracted fields are returned."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.value = 'XAXX010101000'
        mock_total = Mock()
        mock_total.value = '$1,160.00'

        fields = {'RFC_EMISOR': mock_rfc, 'TOTAL': mock_total}

        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = []
        mock_layoutlm.extract_fields.return_value = fields
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        result = engine._extract_fields(mock_image, ['Test'], [(0, 0, 10, 10)])

        assert 'RFC_EMISOR' in result
        assert 'TOTAL' in result
        assert result['RFC_EMISOR'].value == 'XAXX010101000'

    def test_returns_empty_dict_when_no_fields(self):
        """Test returns empty dict when no fields extracted."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = []
        mock_layoutlm.extract_fields.return_value = {}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        result = engine._extract_fields(mock_image, [], [])

        assert result == {}


class TestExtractFieldsWithoutLayoutLM:
    """Test _extract_fields behavior when LayoutLM is not loaded."""

    def test_extract_fields_raises_when_layoutlm_none(self):
        """Test _extract_fields raises when layoutlm is None."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.layoutlm is None

        mock_image = Mock()

        # Should raise AttributeError when layoutlm is None
        with pytest.raises((AttributeError, TypeError)):
            engine._extract_fields(mock_image, ['Test'], [(0, 0, 10, 10)])


class TestExtractFieldsIntegration:
    """Test _extract_fields with realistic data."""

    def test_full_field_extraction(self):
        """Test complete field extraction flow."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock predictions
        predictions = [
            {'word': 'XAXX010101000', 'label': 'B-RFC_EMISOR', 'confidence': 0.95, 'bbox': (100, 50, 250, 70)},
            {'word': '01/01/2024', 'label': 'B-DATE', 'confidence': 0.92, 'bbox': (300, 50, 400, 70)},
            {'word': '$1,160.00', 'label': 'B-TOTAL', 'confidence': 0.90, 'bbox': (400, 300, 500, 320)},
        ]

        # Mock extracted fields
        mock_rfc = Mock()
        mock_rfc.label = 'RFC_EMISOR'
        mock_rfc.value = 'XAXX010101000'
        mock_rfc.confidence = 0.95

        mock_date = Mock()
        mock_date.label = 'DATE'
        mock_date.value = '01/01/2024'
        mock_date.confidence = 0.92

        mock_total = Mock()
        mock_total.label = 'TOTAL'
        mock_total.value = '$1,160.00'
        mock_total.confidence = 0.90

        fields = {
            'RFC_EMISOR': mock_rfc,
            'DATE': mock_date,
            'TOTAL': mock_total,
        }

        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = predictions
        mock_layoutlm.extract_fields.return_value = fields
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        words = ['XAXX010101000', '01/01/2024', '$1,160.00']
        boxes = [(100, 50, 250, 70), (300, 50, 400, 70), (400, 300, 500, 320)]

        result = engine._extract_fields(mock_image, words, boxes)

        assert len(result) == 3
        assert 'RFC_EMISOR' in result
        assert 'DATE' in result
        assert 'TOTAL' in result

    def test_passes_correct_arguments(self):
        """Test that correct arguments are passed to LayoutLM."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_layoutlm = Mock()
        mock_layoutlm.predict.return_value = []
        mock_layoutlm.extract_fields.return_value = {}
        engine.layoutlm = mock_layoutlm

        mock_image = Mock()
        mock_image.size = (800, 600)
        words = ['Word1', 'Word2', 'Word3']
        boxes = [(10, 10, 50, 30), (60, 10, 100, 30), (110, 10, 150, 30)]

        engine._extract_fields(mock_image, words, boxes)

        # Verify exact arguments
        predict_call = mock_layoutlm.predict.call_args
        assert predict_call[0][0] is mock_image
        assert predict_call[0][1] == words
        assert predict_call[0][2] == boxes
