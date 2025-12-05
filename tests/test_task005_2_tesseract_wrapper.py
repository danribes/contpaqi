"""
Tests for Task 5.2: Implement Tesseract wrapper with Spanish support

TDD tests for verifying Tesseract OCR wrapper:
- Language configuration
- Language verification
- Configuration options
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
# OCREngine Configuration Tests
# ============================================================================

class TestOCREngineConfiguration:
    """Tests for OCREngine configuration options."""

    def test_default_lang_is_spa_eng(self):
        """Default language should be 'spa+eng'."""
        assert OCREngine.DEFAULT_LANG == 'spa+eng'

    def test_default_config_uses_lstm(self):
        """Default config should use LSTM engine (oem 3)."""
        assert '--oem 3' in OCREngine.DEFAULT_CONFIG

    def test_default_config_uses_psm_6(self):
        """Default config should use uniform block mode (psm 6)."""
        assert '--psm 6' in OCREngine.DEFAULT_CONFIG

    def test_class_has_default_lang_attribute(self):
        """OCREngine should have DEFAULT_LANG class attribute."""
        assert hasattr(OCREngine, 'DEFAULT_LANG')

    def test_class_has_default_config_attribute(self):
        """OCREngine should have DEFAULT_CONFIG class attribute."""
        assert hasattr(OCREngine, 'DEFAULT_CONFIG')


# ============================================================================
# OCREngine Initialization Tests (without Tesseract)
# ============================================================================

class TestOCREngineInitWithoutTesseract:
    """Tests for OCREngine initialization when Tesseract is not available."""

    @pytest.fixture
    def mock_tesseract_unavailable(self):
        """Mock TESSERACT_AVAILABLE as False."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', False):
            yield

    def test_init_raises_without_tesseract(self, mock_tesseract_unavailable):
        """Should raise RuntimeError if Tesseract not available."""
        with pytest.raises(RuntimeError) as exc_info:
            OCREngine()
        assert 'pytesseract' in str(exc_info.value).lower()


# ============================================================================
# OCREngine Initialization Tests (with mocked Tesseract)
# ============================================================================

class TestOCREngineInitWithMockedTesseract:
    """Tests for OCREngine initialization with mocked Tesseract."""

    @pytest.fixture
    def mock_pytesseract(self):
        """Mock pytesseract module."""
        mock = MagicMock()
        mock.get_languages.return_value = ['eng', 'spa', 'osd']
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract', mock):
            yield mock

    def test_init_sets_lang_attribute(self, mock_pytesseract):
        """Should set lang attribute from parameter."""
        engine = OCREngine(lang='spa', verify_languages=True)
        assert engine.lang == 'spa'

    def test_init_sets_config_attribute(self, mock_pytesseract):
        """Should set config attribute from parameter."""
        engine = OCREngine(config='--oem 1', verify_languages=True)
        assert engine.config == '--oem 1'

    def test_init_uses_default_lang(self, mock_pytesseract):
        """Should use default lang if not provided."""
        engine = OCREngine(verify_languages=True)
        assert engine.lang == OCREngine.DEFAULT_LANG

    def test_init_uses_default_config(self, mock_pytesseract):
        """Should use default config if not provided."""
        engine = OCREngine(verify_languages=True)
        assert engine.config == OCREngine.DEFAULT_CONFIG

    def test_init_verifies_languages(self, mock_pytesseract):
        """Should verify languages are available."""
        OCREngine(lang='spa', verify_languages=True)
        mock_pytesseract.get_languages.assert_called_once()

    def test_init_can_skip_verification(self, mock_pytesseract):
        """Should skip verification if verify_languages=False."""
        OCREngine(lang='unknown', verify_languages=False)
        mock_pytesseract.get_languages.assert_not_called()

    def test_init_raises_for_unavailable_language(self, mock_pytesseract):
        """Should raise RuntimeError for unavailable language."""
        with pytest.raises(RuntimeError) as exc_info:
            OCREngine(lang='xyz', verify_languages=True)
        assert 'xyz' in str(exc_info.value)

    def test_init_accepts_multiple_languages(self, mock_pytesseract):
        """Should accept multiple languages separated by +."""
        engine = OCREngine(lang='spa+eng', verify_languages=True)
        assert engine.lang == 'spa+eng'


# ============================================================================
# OCREngine Language Verification Tests
# ============================================================================

class TestOCREngineLanguageVerification:
    """Tests for language verification functionality."""

    @pytest.fixture
    def mock_pytesseract(self):
        """Mock pytesseract module."""
        mock = MagicMock()
        mock.get_languages.return_value = ['eng', 'spa', 'osd']
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract', mock):
            yield mock

    def test_verify_languages_method_exists(self):
        """OCREngine should have _verify_languages method."""
        assert hasattr(OCREngine, '_verify_languages')
        assert callable(getattr(OCREngine, '_verify_languages'))

    def test_verify_single_language(self, mock_pytesseract):
        """Should verify single language successfully."""
        engine = OCREngine(lang='spa', verify_languages=True)
        assert engine.lang == 'spa'

    def test_verify_multiple_languages(self, mock_pytesseract):
        """Should verify each language in multi-language string."""
        engine = OCREngine(lang='spa+eng', verify_languages=True)
        assert engine.lang == 'spa+eng'

    def test_verify_fails_for_missing_language(self, mock_pytesseract):
        """Should fail if any language is missing."""
        with pytest.raises(RuntimeError) as exc_info:
            OCREngine(lang='spa+fra', verify_languages=True)
        assert 'fra' in str(exc_info.value)


# ============================================================================
# OCREngine Configuration String Tests
# ============================================================================

class TestOCREngineConfigString:
    """Tests for OCR configuration string options."""

    def test_config_oem_options(self):
        """OEM options should be documented."""
        # OEM 0 = Legacy engine only
        # OEM 1 = Neural nets LSTM engine only
        # OEM 2 = Legacy + LSTM engines
        # OEM 3 = Default, based on what is available
        config = OCREngine.DEFAULT_CONFIG
        assert '--oem' in config

    def test_config_psm_options(self):
        """PSM options should be documented."""
        # PSM 6 = Assume a single uniform block of text
        # Good for invoices and documents
        config = OCREngine.DEFAULT_CONFIG
        assert '--psm' in config


# ============================================================================
# Integration Tests
# ============================================================================

class TestTesseractWrapperIntegration:
    """Integration tests for Tesseract wrapper."""

    def test_ocrengine_has_required_methods(self):
        """OCREngine should have all required methods."""
        required_methods = [
            '__init__',
            '_verify_languages',
            'normalize_text',
            'extract_text',
            'extract_words',
        ]
        for method in required_methods:
            assert hasattr(OCREngine, method)

    def test_ocrengine_methods_are_callable(self):
        """All OCREngine methods should be callable."""
        methods = ['normalize_text', 'extract_text', 'extract_words']
        for method in methods:
            assert callable(getattr(OCREngine, method))
