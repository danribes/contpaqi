"""
Tests for Task 5.4: Handle Spanish characters properly (UTF-8)

TDD tests for verifying Spanish character handling:
- Unicode normalization
- Accent handling (á, é, í, ó, ú)
- Special characters (ñ, ü)
- UTF-8 encoding
"""

import sys
import unicodedata
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_SRC = PROJECT_ROOT / "mcp-container" / "src"
sys.path.insert(0, str(MCP_CONTAINER_SRC))

from utils.ocr import OCREngine, OCRWord, TESSERACT_AVAILABLE


# ============================================================================
# Normalize Text Method Tests
# ============================================================================

class TestNormalizeTextMethod:
    """Tests for normalize_text method structure."""

    def test_method_exists(self):
        """normalize_text method should exist."""
        assert hasattr(OCREngine, 'normalize_text')

    def test_method_is_callable(self):
        """normalize_text should be callable."""
        assert callable(getattr(OCREngine, 'normalize_text'))

    def test_method_accepts_text_parameter(self):
        """normalize_text should accept text parameter."""
        import inspect
        sig = inspect.signature(OCREngine.normalize_text)
        params = list(sig.parameters.keys())
        assert 'text' in params


# ============================================================================
# Unicode Normalization Tests
# ============================================================================

class TestUnicodeNormalization:
    """Tests for Unicode NFC normalization."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_normalize_returns_string(self, engine):
        """normalize_text should return a string."""
        result = engine.normalize_text("hello")
        assert isinstance(result, str)

    def test_normalize_preserves_ascii(self, engine):
        """normalize_text should preserve ASCII text."""
        result = engine.normalize_text("hello world")
        assert result == "hello world"

    def test_normalize_handles_empty_string(self, engine):
        """normalize_text should handle empty string."""
        result = engine.normalize_text("")
        assert result == ""

    def test_normalize_handles_none(self, engine):
        """normalize_text should handle None (return as-is)."""
        result = engine.normalize_text(None)
        assert result is None

    def test_uses_nfc_normalization(self, engine):
        """Should use NFC (Canonical Decomposition + Canonical Composition)."""
        # NFD form: 'é' = 'e' + combining acute accent (2 code points)
        # NFC form: 'é' = single code point
        nfd_text = unicodedata.normalize('NFD', 'é')  # Decomposed
        result = engine.normalize_text(nfd_text)
        expected = unicodedata.normalize('NFC', 'é')  # Composed
        assert result == expected


# ============================================================================
# Spanish Accent Tests
# ============================================================================

class TestSpanishAccents:
    """Tests for Spanish accent handling."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_handles_acute_a(self, engine):
        """Should handle á (a with acute accent)."""
        result = engine.normalize_text("fábrica")
        assert 'á' in result

    def test_handles_acute_e(self, engine):
        """Should handle é (e with acute accent)."""
        result = engine.normalize_text("café")
        assert 'é' in result

    def test_handles_acute_i(self, engine):
        """Should handle í (i with acute accent)."""
        result = engine.normalize_text("país")
        assert 'í' in result

    def test_handles_acute_o(self, engine):
        """Should handle ó (o with acute accent)."""
        result = engine.normalize_text("corazón")
        assert 'ó' in result

    def test_handles_acute_u(self, engine):
        """Should handle ú (u with acute accent)."""
        result = engine.normalize_text("menú")
        assert 'ú' in result

    def test_handles_multiple_accents(self, engine):
        """Should handle multiple accented characters."""
        result = engine.normalize_text("fábrica técnica")
        assert 'á' in result
        assert 'é' in result


# ============================================================================
# Spanish Special Character Tests
# ============================================================================

class TestSpanishSpecialCharacters:
    """Tests for Spanish special characters (ñ, ü)."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_handles_enye(self, engine):
        """Should handle ñ (n with tilde)."""
        result = engine.normalize_text("español")
        assert 'ñ' in result

    def test_handles_diaeresis_u(self, engine):
        """Should handle ü (u with diaeresis)."""
        result = engine.normalize_text("bilingüe")
        assert 'ü' in result

    def test_enye_in_common_words(self, engine):
        """Should handle ñ in common Spanish words."""
        words = ["año", "niño", "señor", "España", "compañía"]
        for word in words:
            result = engine.normalize_text(word)
            assert 'ñ' in result

    def test_preserves_uppercase_enye(self, engine):
        """Should preserve uppercase Ñ."""
        result = engine.normalize_text("ESPAÑA")
        assert 'Ñ' in result


# ============================================================================
# Invoice-Specific Spanish Tests
# ============================================================================

class TestInvoiceSpanishText:
    """Tests for Spanish text commonly found in invoices."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_handles_factura(self, engine):
        """Should handle 'factura' and related terms."""
        terms = ["factura", "facturación", "número de factura"]
        for term in terms:
            result = engine.normalize_text(term)
            assert result == term

    def test_handles_rfc_label(self, engine):
        """Should handle RFC labels with accents."""
        result = engine.normalize_text("RFC del Emisor")
        assert result == "RFC del Emisor"

    def test_handles_direccion(self, engine):
        """Should handle 'dirección'."""
        result = engine.normalize_text("dirección")
        assert 'ó' in result

    def test_handles_telefono(self, engine):
        """Should handle 'teléfono'."""
        result = engine.normalize_text("teléfono")
        assert 'é' in result

    def test_handles_descripcion(self, engine):
        """Should handle 'descripción'."""
        result = engine.normalize_text("descripción")
        assert 'ó' in result

    def test_handles_cantidad(self, engine):
        """Should handle common invoice terms."""
        terms = ["cantidad", "precio", "importe", "subtotal"]
        for term in terms:
            result = engine.normalize_text(term)
            assert result == term


# ============================================================================
# UTF-8 Encoding Tests
# ============================================================================

class TestUTF8Encoding:
    """Tests for UTF-8 encoding handling."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_output_is_utf8_encodable(self, engine):
        """Output should be UTF-8 encodable."""
        result = engine.normalize_text("información técnica")
        # Should not raise an exception
        encoded = result.encode('utf-8')
        assert isinstance(encoded, bytes)

    def test_can_decode_utf8_input(self, engine):
        """Should handle UTF-8 encoded input."""
        utf8_text = "información técnica".encode('utf-8').decode('utf-8')
        result = engine.normalize_text(utf8_text)
        assert result == "información técnica"

    def test_preserves_all_spanish_characters(self, engine):
        """Should preserve all Spanish special characters."""
        spanish_chars = "áéíóúñüÁÉÍÓÚÑÜ"
        result = engine.normalize_text(spanish_chars)
        assert result == spanish_chars


# ============================================================================
# Integration with Word Extraction Tests
# ============================================================================

class TestSpanishCharactersInWordExtraction:
    """Tests for Spanish character handling in extract_words."""

    @pytest.fixture
    def mock_pytesseract_spanish(self):
        """Mock pytesseract with Spanish text."""
        mock = MagicMock()
        mock.get_languages.return_value = ['eng', 'spa', 'osd']
        mock.image_to_data.return_value = {
            'text': ['', 'información', 'técnica', 'año'],
            'conf': [-1, 95, 90, 88],
            'left': [0, 10, 100, 10],
            'top': [0, 20, 20, 50],
            'width': [0, 80, 60, 30],
            'height': [0, 20, 20, 20],
            'block_num': [0, 1, 1, 2],
            'line_num': [0, 1, 1, 1],
        }
        mock.Output.DICT = 'dict'
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract', mock):
            yield mock

    def test_extract_words_preserves_accents(self, mock_pytesseract_spanish):
        """extract_words should preserve accented characters."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        texts = [w.text for w in result]
        assert 'información' in texts
        assert 'técnica' in texts

    def test_extract_words_preserves_enye(self, mock_pytesseract_spanish):
        """extract_words should preserve ñ character."""
        engine = OCREngine(verify_languages=True)
        mock_image = Mock()
        result = engine.extract_words(mock_image)
        texts = [w.text for w in result]
        assert 'año' in texts


# ============================================================================
# Edge Case Tests
# ============================================================================

class TestSpanishCharacterEdgeCases:
    """Edge case tests for Spanish character handling."""

    @pytest.fixture
    def engine(self):
        """Create OCREngine instance with mocked Tesseract."""
        with patch('utils.ocr.TESSERACT_AVAILABLE', True), \
             patch('utils.ocr.pytesseract') as mock:
            mock.get_languages.return_value = ['eng', 'spa']
            yield OCREngine(verify_languages=True)

    def test_handles_mixed_case_accents(self, engine):
        """Should handle mixed case with accents."""
        result = engine.normalize_text("Información Técnica")
        assert result == "Información Técnica"

    def test_handles_all_caps_with_accents(self, engine):
        """Should handle all caps with accents."""
        result = engine.normalize_text("INFORMACIÓN TÉCNICA")
        assert result == "INFORMACIÓN TÉCNICA"

    def test_handles_whitespace_with_accents(self, engine):
        """Should handle whitespace around accented text."""
        result = engine.normalize_text("  información  ")
        # normalize_text doesn't strip, just normalizes unicode
        assert 'información' in result

    def test_handles_numbers_with_spanish_text(self, engine):
        """Should handle numbers mixed with Spanish text."""
        result = engine.normalize_text("Factura #123 - año 2024")
        assert 'ñ' in result
        assert '123' in result
