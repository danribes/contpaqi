"""
Tests for Subtask 8.7: Implement confidence scoring for predictions

Tests the _calculate_confidence() method that computes overall extraction confidence.
"""
import pytest
from unittest.mock import Mock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestCalculateConfidenceMethodExists:
    """Test that _calculate_confidence method exists."""

    def test_calculate_confidence_method_exists(self):
        """Test that InvoiceInferenceEngine has _calculate_confidence method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_calculate_confidence')

    def test_calculate_confidence_is_callable(self):
        """Test that _calculate_confidence is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine._calculate_confidence)


class TestCalculateConfidenceSignature:
    """Test _calculate_confidence method signature."""

    def test_accepts_fields_parameter(self):
        """Test _calculate_confidence accepts fields parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._calculate_confidence)
        params = list(sig.parameters.keys())
        assert 'fields' in params

    def test_accepts_ocr_confidences_parameter(self):
        """Test _calculate_confidence accepts ocr_confidences parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._calculate_confidence)
        params = list(sig.parameters.keys())
        assert 'ocr_confidences' in params


class TestCalculateConfidenceReturnType:
    """Test _calculate_confidence return type."""

    def test_returns_float(self):
        """Test _calculate_confidence returns float."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result = engine._calculate_confidence({}, [])
        assert isinstance(result, float)

    def test_returns_value_between_zero_and_one(self):
        """Test _calculate_confidence returns value between 0 and 1."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result = engine._calculate_confidence({}, [0.5, 0.6, 0.7])
        assert 0.0 <= result <= 1.0


class TestCalculateConfidenceOCRScores:
    """Test OCR confidence contribution."""

    def test_uses_ocr_confidences(self):
        """Test that OCR confidences affect the result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result_high = engine._calculate_confidence({}, [0.9, 0.95, 0.92])
        result_low = engine._calculate_confidence({}, [0.3, 0.4, 0.35])

        assert result_high > result_low

    def test_empty_ocr_confidences_handled(self):
        """Test handles empty OCR confidences list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result = engine._calculate_confidence({}, [])
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0


class TestCalculateConfidenceFieldScores:
    """Test field extraction confidence contribution."""

    def test_uses_field_confidences(self):
        """Test that field confidences affect the result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # High confidence field
        mock_field_high = Mock()
        mock_field_high.confidence = 0.95

        # Low confidence field
        mock_field_low = Mock()
        mock_field_low.confidence = 0.3

        result_high = engine._calculate_confidence({'TOTAL': mock_field_high}, [0.8])
        result_low = engine._calculate_confidence({'TOTAL': mock_field_low}, [0.8])

        assert result_high > result_low

    def test_multiple_field_confidences(self):
        """Test averages multiple field confidences."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.confidence = 0.9
        mock_total = Mock()
        mock_total.confidence = 0.8
        mock_date = Mock()
        mock_date.confidence = 0.85

        fields = {
            'RFC_EMISOR': mock_rfc,
            'TOTAL': mock_total,
            'DATE': mock_date
        }

        result = engine._calculate_confidence(fields, [])
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0


class TestCalculateConfidenceRequiredFields:
    """Test required fields presence contribution."""

    def test_all_required_fields_present_higher_score(self):
        """Test all required fields present gives higher score."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # All required fields present
        mock_field = Mock()
        mock_field.confidence = 0.8

        fields_all = {
            'RFC_EMISOR': mock_field,
            'RFC_RECEPTOR': mock_field,
            'TOTAL': mock_field
        }

        fields_some = {
            'RFC_EMISOR': mock_field
        }

        result_all = engine._calculate_confidence(fields_all, [0.8])
        result_some = engine._calculate_confidence(fields_some, [0.8])

        assert result_all > result_some

    def test_no_required_fields_lower_score(self):
        """Test no required fields gives lower score."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.confidence = 0.9

        # Non-required field only
        fields = {'DATE': mock_field}

        result = engine._calculate_confidence(fields, [0.9])
        # Should still return a valid score, but lower
        assert 0.0 <= result <= 1.0

    def test_partial_required_fields(self):
        """Test partial required fields gives middle score."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.confidence = 0.85

        fields_two = {
            'RFC_EMISOR': mock_field,
            'TOTAL': mock_field
        }

        fields_one = {
            'RFC_EMISOR': mock_field
        }

        fields_three = {
            'RFC_EMISOR': mock_field,
            'RFC_RECEPTOR': mock_field,
            'TOTAL': mock_field
        }

        result_one = engine._calculate_confidence(fields_one, [0.8])
        result_two = engine._calculate_confidence(fields_two, [0.8])
        result_three = engine._calculate_confidence(fields_three, [0.8])

        assert result_one < result_two < result_three


class TestCalculateConfidenceEdgeCases:
    """Test edge cases for confidence calculation."""

    def test_empty_fields_empty_ocr(self):
        """Test handles both empty fields and OCR."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result = engine._calculate_confidence({}, [])
        assert result == 0.0

    def test_perfect_scores(self):
        """Test perfect scores approach 1.0."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.confidence = 1.0

        fields = {
            'RFC_EMISOR': mock_field,
            'RFC_RECEPTOR': mock_field,
            'TOTAL': mock_field
        }

        result = engine._calculate_confidence(fields, [1.0, 1.0, 1.0])
        assert result == pytest.approx(1.0, rel=0.01)

    def test_zero_scores(self):
        """Test zero scores gives low result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.confidence = 0.0

        fields = {'TOTAL': mock_field}

        result = engine._calculate_confidence(fields, [0.0, 0.0])
        assert 0.0 <= result <= 0.5


class TestCalculateConfidenceIntegration:
    """Integration tests for confidence calculation."""

    def test_realistic_scenario_good_extraction(self):
        """Test realistic good extraction scenario."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Simulate good extraction
        mock_rfc_e = Mock()
        mock_rfc_e.confidence = 0.92
        mock_rfc_r = Mock()
        mock_rfc_r.confidence = 0.88
        mock_total = Mock()
        mock_total.confidence = 0.95
        mock_date = Mock()
        mock_date.confidence = 0.90

        fields = {
            'RFC_EMISOR': mock_rfc_e,
            'RFC_RECEPTOR': mock_rfc_r,
            'TOTAL': mock_total,
            'DATE': mock_date
        }

        ocr_confidences = [0.93, 0.91, 0.89, 0.95, 0.87, 0.92]

        result = engine._calculate_confidence(fields, ocr_confidences)

        # Should be high confidence
        assert result > 0.8

    def test_realistic_scenario_poor_extraction(self):
        """Test realistic poor extraction scenario."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Simulate poor extraction
        mock_field = Mock()
        mock_field.confidence = 0.4

        fields = {
            'RFC_EMISOR': mock_field
            # Missing RFC_RECEPTOR and TOTAL
        }

        ocr_confidences = [0.5, 0.45, 0.52, 0.48]

        result = engine._calculate_confidence(fields, ocr_confidences)

        # Should be low confidence
        assert result < 0.6


class TestPredictUsesCalculateConfidence:
    """Test that predict() method uses _calculate_confidence."""

    def test_predict_calls_calculate_confidence(self):
        """Test predict uses _calculate_confidence for result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock all pipeline methods
        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        # Track if _calculate_confidence is called
        original_calc = engine._calculate_confidence
        engine._calculate_confidence = Mock(return_value=0.85)

        result = engine.predict(Mock())

        engine._calculate_confidence.assert_called_once()
        assert result.confidence == 0.85

    def test_predict_passes_correct_args_to_calculate_confidence(self):
        """Test predict passes fields and ocr_conf to _calculate_confidence."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.confidence = 0.9
        mock_field.value = 'TEST'

        fields = {'RFC_EMISOR': mock_field}
        ocr_conf = [0.85, 0.90, 0.88]

        engine._run_ocr = Mock(return_value=(['w1', 'w2', 'w3'], [(0, 0, 10, 10)]*3, ocr_conf))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value=fields)
        engine._assign_words_to_rows = Mock(return_value=[])
        engine._calculate_confidence = Mock(return_value=0.75)

        engine.predict(Mock())

        engine._calculate_confidence.assert_called_once_with(fields, ocr_conf)
