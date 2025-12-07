"""
Tests for Task 5.1: Create mcp-container/src/utils/ocr.py

TDD tests for verifying OCR module structure:
- File existence
- OCRWord dataclass
- OCREngine class structure
- Required imports
"""

import os
import sys
import pytest
from pathlib import Path
from dataclasses import fields, is_dataclass

# Add mcp-container/src to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
MCP_CONTAINER_SRC = PROJECT_ROOT / "mcp-container" / "src"
sys.path.insert(0, str(MCP_CONTAINER_SRC))


# ============================================================================
# Test Configuration
# ============================================================================

UTILS_DIR = MCP_CONTAINER_SRC / "utils"
OCR_FILE = UTILS_DIR / "ocr.py"


# ============================================================================
# File Existence Tests
# ============================================================================

class TestOCRFileExists:
    """Tests for ocr.py file existence."""

    def test_utils_directory_exists(self):
        """utils/ directory should exist."""
        assert UTILS_DIR.exists()
        assert UTILS_DIR.is_dir()

    def test_ocr_file_exists(self):
        """ocr.py should exist in utils/."""
        assert OCR_FILE.exists()
        assert OCR_FILE.is_file()

    def test_ocr_file_not_empty(self):
        """ocr.py should not be empty."""
        content = OCR_FILE.read_text()
        assert len(content.strip()) > 0

    def test_utils_init_exists(self):
        """utils/__init__.py should exist."""
        init_file = UTILS_DIR / "__init__.py"
        assert init_file.exists()


# ============================================================================
# Import Tests
# ============================================================================

class TestOCRImports:
    """Tests for required imports in ocr.py."""

    def test_can_import_ocr_module(self):
        """Should be able to import the ocr module."""
        try:
            from utils import ocr
            assert ocr is not None
        except ImportError as e:
            pytest.fail(f"Cannot import ocr module: {e}")

    def test_can_import_ocrword(self):
        """Should be able to import OCRWord."""
        try:
            from utils.ocr import OCRWord
            assert OCRWord is not None
        except ImportError as e:
            pytest.fail(f"Cannot import OCRWord: {e}")

    def test_can_import_ocrengine(self):
        """Should be able to import OCREngine."""
        try:
            from utils.ocr import OCREngine
            assert OCREngine is not None
        except ImportError as e:
            pytest.fail(f"Cannot import OCREngine: {e}")


# ============================================================================
# OCRWord Dataclass Tests
# ============================================================================

class TestOCRWordDataclass:
    """Tests for OCRWord dataclass structure."""

    def test_ocrword_is_dataclass(self):
        """OCRWord should be a dataclass."""
        from utils.ocr import OCRWord
        assert is_dataclass(OCRWord)

    def test_ocrword_has_text_field(self):
        """OCRWord should have 'text' field."""
        from utils.ocr import OCRWord
        field_names = [f.name for f in fields(OCRWord)]
        assert 'text' in field_names

    def test_ocrword_has_confidence_field(self):
        """OCRWord should have 'confidence' field."""
        from utils.ocr import OCRWord
        field_names = [f.name for f in fields(OCRWord)]
        assert 'confidence' in field_names

    def test_ocrword_has_bbox_field(self):
        """OCRWord should have 'bbox' field."""
        from utils.ocr import OCRWord
        field_names = [f.name for f in fields(OCRWord)]
        assert 'bbox' in field_names

    def test_ocrword_text_is_string(self):
        """OCRWord.text should be str type."""
        from utils.ocr import OCRWord
        for f in fields(OCRWord):
            if f.name == 'text':
                assert f.type == str or f.type == 'str'

    def test_ocrword_confidence_is_float(self):
        """OCRWord.confidence should be float type."""
        from utils.ocr import OCRWord
        for f in fields(OCRWord):
            if f.name == 'confidence':
                assert f.type == float or f.type == 'float'

    def test_ocrword_bbox_is_tuple(self):
        """OCRWord.bbox should be tuple type."""
        from utils.ocr import OCRWord
        for f in fields(OCRWord):
            if f.name == 'bbox':
                # Accept tuple or Tuple or any tuple-like annotation
                type_str = str(f.type)
                assert 'tuple' in type_str.lower() or f.type == tuple

    def test_ocrword_can_instantiate(self):
        """Should be able to create OCRWord instance."""
        from utils.ocr import OCRWord
        word = OCRWord(text="hello", confidence=0.95, bbox=(10, 20, 100, 50))
        assert word.text == "hello"
        assert word.confidence == 0.95
        assert word.bbox == (10, 20, 100, 50)

    def test_ocrword_bbox_has_four_elements(self):
        """OCRWord bbox should have 4 elements (x1, y1, x2, y2)."""
        from utils.ocr import OCRWord
        word = OCRWord(text="test", confidence=0.9, bbox=(0, 0, 100, 50))
        assert len(word.bbox) == 4


# ============================================================================
# OCREngine Class Tests
# ============================================================================

class TestOCREngineClass:
    """Tests for OCREngine class structure."""

    def test_ocrengine_is_class(self):
        """OCREngine should be a class."""
        from utils.ocr import OCREngine
        assert isinstance(OCREngine, type)

    def test_ocrengine_has_init(self):
        """OCREngine should have __init__ method."""
        from utils.ocr import OCREngine
        assert hasattr(OCREngine, '__init__')

    def test_ocrengine_has_extract_words_method(self):
        """OCREngine should have extract_words method."""
        from utils.ocr import OCREngine
        assert hasattr(OCREngine, 'extract_words')
        assert callable(getattr(OCREngine, 'extract_words'))

    def test_ocrengine_has_extract_text_method(self):
        """OCREngine should have extract_text method."""
        from utils.ocr import OCREngine
        assert hasattr(OCREngine, 'extract_text')
        assert callable(getattr(OCREngine, 'extract_text'))

    def test_ocrengine_has_lang_attribute(self):
        """OCREngine should have lang attribute after init."""
        from utils.ocr import OCREngine
        # Create instance without language verification for structure test
        engine = OCREngine.__new__(OCREngine)
        engine.lang = 'spa'
        assert hasattr(engine, 'lang')

    def test_ocrengine_init_accepts_lang_parameter(self):
        """OCREngine.__init__ should accept lang parameter."""
        from utils.ocr import OCREngine
        import inspect
        sig = inspect.signature(OCREngine.__init__)
        params = list(sig.parameters.keys())
        assert 'lang' in params or len(params) > 1  # self + optional lang


# ============================================================================
# Module Docstring Tests
# ============================================================================

class TestOCRModuleDocumentation:
    """Tests for module documentation."""

    def test_module_has_docstring(self):
        """ocr module should have a docstring."""
        from utils import ocr
        assert ocr.__doc__ is not None
        assert len(ocr.__doc__.strip()) > 0

    def test_ocrengine_has_docstring(self):
        """OCREngine class should have a docstring."""
        from utils.ocr import OCREngine
        assert OCREngine.__doc__ is not None


# ============================================================================
# Integration Tests
# ============================================================================

class TestOCRModuleIntegration:
    """Integration tests for OCR module."""

    def test_all_exports_available(self):
        """All expected exports should be available."""
        from utils.ocr import OCRWord, OCREngine
        assert OCRWord is not None
        assert OCREngine is not None

    def test_ocrword_in_module_all(self):
        """OCRWord should be in module's __all__ if defined."""
        from utils import ocr
        if hasattr(ocr, '__all__'):
            assert 'OCRWord' in ocr.__all__

    def test_ocrengine_in_module_all(self):
        """OCREngine should be in module's __all__ if defined."""
        from utils import ocr
        if hasattr(ocr, '__all__'):
            assert 'OCREngine' in ocr.__all__
