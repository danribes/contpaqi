"""
Tests for Subtask 8.2: Implement OCR method integration

Tests the _run_ocr() method that extracts words and bounding boxes from images.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestRunOCRMethodExists:
    """Test that _run_ocr method exists."""

    def test_run_ocr_method_exists(self):
        """Test that InvoiceInferenceEngine has _run_ocr method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_run_ocr')

    def test_run_ocr_is_callable(self):
        """Test that _run_ocr is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine._run_ocr)


class TestRunOCRSignature:
    """Test _run_ocr method signature."""

    def test_run_ocr_accepts_image(self):
        """Test _run_ocr accepts image parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._run_ocr)
        params = list(sig.parameters.keys())
        assert 'image' in params


class TestRunOCRReturnType:
    """Test _run_ocr return type."""

    def test_run_ocr_returns_tuple(self):
        """Test _run_ocr returns a tuple."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock the OCR engine
        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = []
        engine.ocr = mock_ocr

        mock_image = Mock()
        result = engine._run_ocr(mock_image)
        assert isinstance(result, tuple)

    def test_run_ocr_returns_three_elements(self):
        """Test _run_ocr returns tuple with 3 elements."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = []
        engine.ocr = mock_ocr

        mock_image = Mock()
        result = engine._run_ocr(mock_image)
        assert len(result) == 3

    def test_run_ocr_returns_texts_boxes_confidences(self):
        """Test _run_ocr returns (texts, boxes, confidences)."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Create mock OCR words
        mock_word1 = Mock()
        mock_word1.text = 'Hello'
        mock_word1.bbox = (10, 20, 50, 40)
        mock_word1.confidence = 0.95

        mock_word2 = Mock()
        mock_word2.text = 'World'
        mock_word2.bbox = (60, 20, 100, 40)
        mock_word2.confidence = 0.90

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = [mock_word1, mock_word2]
        engine.ocr = mock_ocr

        mock_image = Mock()
        texts, boxes, confidences = engine._run_ocr(mock_image)

        assert texts == ['Hello', 'World']
        assert boxes == [(10, 20, 50, 40), (60, 20, 100, 40)]
        assert confidences == [0.95, 0.90]


class TestRunOCRCallsOCREngine:
    """Test that _run_ocr calls OCREngine correctly."""

    def test_run_ocr_calls_extract_words(self):
        """Test _run_ocr calls ocr.extract_words."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = []
        engine.ocr = mock_ocr

        mock_image = Mock()
        engine._run_ocr(mock_image)

        mock_ocr.extract_words.assert_called_once_with(mock_image)

    def test_run_ocr_passes_image_to_extract_words(self):
        """Test _run_ocr passes correct image to extract_words."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = []
        engine.ocr = mock_ocr

        mock_image = Mock()
        mock_image.size = (800, 600)
        engine._run_ocr(mock_image)

        # Verify the exact image was passed
        call_args = mock_ocr.extract_words.call_args
        assert call_args[0][0] is mock_image


class TestRunOCRWithEmptyResult:
    """Test _run_ocr with empty OCR result."""

    def test_run_ocr_handles_no_words(self):
        """Test _run_ocr handles empty word list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = []
        engine.ocr = mock_ocr

        mock_image = Mock()
        texts, boxes, confidences = engine._run_ocr(mock_image)

        assert texts == []
        assert boxes == []
        assert confidences == []


class TestRunOCRWithMultipleWords:
    """Test _run_ocr with multiple words."""

    def test_run_ocr_extracts_all_words(self):
        """Test _run_ocr extracts all words from OCR result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Create 5 mock words
        mock_words = []
        for i in range(5):
            word = Mock()
            word.text = f'Word{i}'
            word.bbox = (i * 50, 10, i * 50 + 40, 30)
            word.confidence = 0.90 + i * 0.01
            mock_words.append(word)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = mock_words
        engine.ocr = mock_ocr

        mock_image = Mock()
        texts, boxes, confidences = engine._run_ocr(mock_image)

        assert len(texts) == 5
        assert len(boxes) == 5
        assert len(confidences) == 5
        assert texts == ['Word0', 'Word1', 'Word2', 'Word3', 'Word4']


class TestRunOCRDataTypes:
    """Test _run_ocr returns correct data types."""

    def test_texts_are_strings(self):
        """Test texts are list of strings."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_word = Mock()
        mock_word.text = 'Test'
        mock_word.bbox = (10, 10, 50, 30)
        mock_word.confidence = 0.95

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = [mock_word]
        engine.ocr = mock_ocr

        texts, _, _ = engine._run_ocr(Mock())
        assert all(isinstance(t, str) for t in texts)

    def test_boxes_are_tuples(self):
        """Test boxes are list of tuples."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_word = Mock()
        mock_word.text = 'Test'
        mock_word.bbox = (10, 10, 50, 30)
        mock_word.confidence = 0.95

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = [mock_word]
        engine.ocr = mock_ocr

        _, boxes, _ = engine._run_ocr(Mock())
        assert all(isinstance(b, tuple) for b in boxes)

    def test_confidences_are_floats(self):
        """Test confidences are list of floats."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_word = Mock()
        mock_word.text = 'Test'
        mock_word.bbox = (10, 10, 50, 30)
        mock_word.confidence = 0.95

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = [mock_word]
        engine.ocr = mock_ocr

        _, _, confidences = engine._run_ocr(Mock())
        assert all(isinstance(c, float) for c in confidences)


class TestRunOCRWithoutOCREngine:
    """Test _run_ocr behavior when OCR engine is not loaded."""

    def test_run_ocr_raises_when_ocr_none(self):
        """Test _run_ocr raises appropriate error when ocr is None."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.ocr is None

        mock_image = Mock()

        # Should raise AttributeError or similar when ocr is None
        with pytest.raises((AttributeError, TypeError)):
            engine._run_ocr(mock_image)


class TestRunOCRPreservesOrder:
    """Test that _run_ocr preserves word order."""

    def test_texts_boxes_confidences_aligned(self):
        """Test texts, boxes, and confidences are aligned."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_words = []
        for i in range(3):
            word = Mock()
            word.text = f'Word{i}'
            word.bbox = (i * 100, i * 10, i * 100 + 80, i * 10 + 20)
            word.confidence = 0.8 + i * 0.05
            mock_words.append(word)

        mock_ocr = Mock()
        mock_ocr.extract_words.return_value = mock_words
        engine.ocr = mock_ocr

        texts, boxes, confidences = engine._run_ocr(Mock())

        # Verify alignment
        for i, (text, box, conf) in enumerate(zip(texts, boxes, confidences)):
            assert text == f'Word{i}'
            assert box == (i * 100, i * 10, i * 100 + 80, i * 10 + 20)
            assert conf == pytest.approx(0.8 + i * 0.05)
