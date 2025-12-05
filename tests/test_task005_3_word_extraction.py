"""
Tests for Task 5.3: Extract words with coordinates (bounding boxes)

TDD tests for verifying word extraction with bounding boxes:
- extract_words method
- Bounding box format
- Confidence scores
- Empty text handling
"""

import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_SRC = PROJECT_ROOT / "mcp-container" / "src"
sys.path.insert(0, str(MCP_CONTAINER_SRC))

from utils.ocr import OCREngine, OCRWord, TESSERACT_AVAILABLE


# ============================================================================
# Test Configuration
# ============================================================================

# Skip marker for tests requiring Tesseract
requires_tesseract = pytest.mark.skipif(
    not TESSERACT_AVAILABLE,
    reason="Tesseract/pytesseract not available"
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_ocr_data():
    """Sample OCR data as returned by pytesseract.image_to_data."""
    return {
        'text': ['', 'Hello', 'World', '', 'Test', ''],
        'conf': [-1, 95, 87, -1, 72, -1],
        'left': [0, 10, 100, 0, 10, 0],
        'top': [0, 20, 20, 0, 50, 0],
        'width': [0, 50, 60, 0, 40, 0],
        'height': [0, 20, 20, 0, 20, 0],
        'block_num': [0, 1, 1, 0, 2, 0],
        'line_num': [0, 1, 1, 0, 1, 0],
    }


@pytest.fixture
def mock_pytesseract(mock_ocr_data):
    """Mock pytesseract module with sample data."""
    mock = MagicMock()
    mock.get_languages.return_value = ['eng', 'spa', 'osd']
    mock.image_to_data.return_value = mock_ocr_data
    mock.image_to_string.return_value = "Hello World\nTest"
    mock.Output.DICT = 'dict'
    with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
         patch('utils.ocr.pytesseract', mock):
        yield mock


# ============================================================================
# Extract Words Method Tests
# ============================================================================

class TestExtractWordsMethod:
    """Tests for extract_words method structure."""

    def test_method_exists(self):
        """extract_words method should exist."""
        assert hasattr(OCREngine, 'extract_words')

    def test_method_is_callable(self):
        """extract_words should be callable."""
        assert callable(getattr(OCREngine, 'extract_words'))

    def test_method_accepts_image_parameter(self):
        """extract_words should accept image parameter."""
        import inspect
        sig = inspect.signature(OCREngine.extract_words)
        params = list(sig.parameters.keys())
        assert 'image' in params

    def test_method_has_min_confidence_parameter(self):
        """extract_words should have min_confidence parameter."""
        import inspect
        sig = inspect.signature(OCREngine.extract_words)
        params = list(sig.parameters.keys())
        assert 'min_confidence' in params


# ============================================================================
# Extract Words Functionality Tests (Mocked)
# ============================================================================

class TestExtractWordsFunctionality:
    """Tests for extract_words functionality with mocked Tesseract."""

    def test_extract_words_returns_list(self, mock_pytesseract):
        """extract_words should return a list."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        assert isinstance(result, list)

    def test_extract_words_returns_ocrword_objects(self, mock_pytesseract):
        """extract_words should return OCRWord objects."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        for word in result:
            assert isinstance(word, OCRWord)

    def test_extract_words_skips_empty_text(self, mock_pytesseract):
        """extract_words should skip empty text entries."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        # Original data has 6 entries, 3 are empty
        texts = [w.text for w in result]
        assert '' not in texts

    def test_extract_words_skips_negative_confidence(self, mock_pytesseract):
        """extract_words should skip entries with confidence < 0."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        # All results should have valid confidence
        for word in result:
            assert word.confidence >= 0

    def test_extract_words_confidence_normalized(self, mock_pytesseract):
        """Confidence should be normalized to 0-1 range."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        for word in result:
            assert 0.0 <= word.confidence <= 1.0

    def test_extract_words_min_confidence_filter(self, mock_pytesseract):
        """Should filter words below min_confidence."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        # With min_confidence=0.9, only 'Hello' (95%) should pass
        result = engine.extract_words(mock_image, min_confidence=0.9)
        assert len(result) == 1
        assert result[0].text == 'Hello'


# ============================================================================
# Bounding Box Tests
# ============================================================================

class TestBoundingBoxFormat:
    """Tests for bounding box format."""

    def test_bbox_is_tuple(self, mock_pytesseract):
        """bbox should be a tuple."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        for word in result:
            assert isinstance(word.bbox, tuple)

    def test_bbox_has_four_elements(self, mock_pytesseract):
        """bbox should have 4 elements (x1, y1, x2, y2)."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        for word in result:
            assert len(word.bbox) == 4

    def test_bbox_format_x1_y1_x2_y2(self, mock_pytesseract):
        """bbox should be (x1, y1, x2, y2) format."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        for word in result:
            x1, y1, x2, y2 = word.bbox
            assert x2 >= x1  # x2 should be >= x1
            assert y2 >= y1  # y2 should be >= y1

    def test_bbox_calculated_from_left_top_width_height(self, mock_pytesseract):
        """bbox should be calculated from left, top, width, height."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        # 'Hello' has left=10, top=20, width=50, height=20
        # bbox should be (10, 20, 60, 40)
        hello_word = next(w for w in result if w.text == 'Hello')
        assert hello_word.bbox == (10, 20, 60, 40)


# ============================================================================
# OCRWord Validation Tests
# ============================================================================

class TestOCRWordValidation:
    """Tests for OCRWord field validation."""

    def test_ocrword_accepts_valid_bbox(self):
        """OCRWord should accept valid bbox."""
        word = OCRWord(text="test", confidence=0.9, bbox=(0, 0, 100, 50))
        assert word.bbox == (0, 0, 100, 50)

    def test_ocrword_rejects_invalid_bbox_length(self):
        """OCRWord should reject bbox with wrong length."""
        with pytest.raises(ValueError) as exc_info:
            OCRWord(text="test", confidence=0.9, bbox=(0, 0, 100))
        assert 'bbox' in str(exc_info.value).lower()

    def test_ocrword_rejects_non_tuple_bbox(self):
        """OCRWord should reject non-tuple bbox."""
        with pytest.raises(ValueError) as exc_info:
            OCRWord(text="test", confidence=0.9, bbox=[0, 0, 100, 50])
        assert 'bbox' in str(exc_info.value).lower()

    def test_ocrword_accepts_valid_confidence(self):
        """OCRWord should accept confidence in valid range."""
        word = OCRWord(text="test", confidence=0.5, bbox=(0, 0, 100, 50))
        assert word.confidence == 0.5

    def test_ocrword_rejects_confidence_over_1(self):
        """OCRWord should reject confidence > 1.0."""
        with pytest.raises(ValueError) as exc_info:
            OCRWord(text="test", confidence=1.5, bbox=(0, 0, 100, 50))
        assert 'confidence' in str(exc_info.value).lower()

    def test_ocrword_rejects_negative_confidence(self):
        """OCRWord should reject confidence < 0.0."""
        with pytest.raises(ValueError) as exc_info:
            OCRWord(text="test", confidence=-0.1, bbox=(0, 0, 100, 50))
        assert 'confidence' in str(exc_info.value).lower()


# ============================================================================
# Extract Text Method Tests
# ============================================================================

class TestExtractTextMethod:
    """Tests for extract_text method."""

    def test_extract_text_returns_string(self, mock_pytesseract):
        """extract_text should return a string."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_text(mock_image)
        assert isinstance(result, str)

    def test_extract_text_calls_image_to_string(self, mock_pytesseract):
        """extract_text should call pytesseract.image_to_string."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        engine.extract_text(mock_image)
        mock_pytesseract.image_to_string.assert_called_once()


# ============================================================================
# Error Handling Tests
# ============================================================================

class TestExtractWordsErrorHandling:
    """Tests for error handling in extract_words."""

    def test_raises_without_tesseract(self):
        """Should raise RuntimeError if Tesseract not available."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', False):
            with pytest.raises(RuntimeError):
                engine = OCREngine(verify_languages=False)
                engine.extract_words(Mock())

    def test_handles_ocr_exception(self, mock_pytesseract):
        """Should raise RuntimeError on OCR failure."""
        mock_pytesseract.image_to_data.side_effect = Exception("OCR failed")
        engine = OCREngine(verify_languages=True)
        with pytest.raises(RuntimeError) as exc_info:
            engine.extract_words(Mock())
        assert 'OCR extraction failed' in str(exc_info.value)
