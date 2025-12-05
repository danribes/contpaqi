"""
OCR utilities using Tesseract for invoice text extraction.

This module provides a wrapper around Tesseract OCR with Spanish language
support for extracting text and word-level bounding boxes from invoice images.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import List, Optional, Tuple, TYPE_CHECKING, Any

# PIL import - may not be available in all environments
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

# pytesseract import - may not be available in all environments
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    pytesseract = None

# For type hints only
if TYPE_CHECKING:
    from PIL import Image as PILImage


__all__ = ['OCRWord', 'OCREngine', 'TESSERACT_AVAILABLE']


@dataclass
class OCRWord:
    """
    Represents a word extracted by OCR with its metadata.

    Attributes:
        text: The extracted text content
        confidence: Confidence score between 0.0 and 1.0
        bbox: Bounding box as (x1, y1, x2, y2) coordinates
    """
    text: str
    confidence: float
    bbox: tuple  # (x1, y1, x2, y2)

    def __post_init__(self):
        """Validate OCRWord fields after initialization."""
        if not isinstance(self.bbox, tuple) or len(self.bbox) != 4:
            raise ValueError("bbox must be a tuple of 4 elements (x1, y1, x2, y2)")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")


class OCREngine:
    """
    Tesseract OCR wrapper with Spanish language support.

    Provides methods for extracting text and word-level data from images,
    with support for Spanish characters and invoice-specific configurations.

    Attributes:
        lang: Language code(s) for OCR (default: 'spa+eng')
        config: Tesseract configuration string
    """

    # Default configuration
    DEFAULT_LANG = 'spa+eng'
    DEFAULT_CONFIG = '--oem 3 --psm 6'  # LSTM engine, uniform block

    def __init__(self, lang: str = None, config: str = None,
                 verify_languages: bool = True):
        """
        Initialize OCR engine with language and configuration.

        Args:
            lang: Language code(s) for OCR (default: 'spa+eng')
            config: Tesseract configuration string
            verify_languages: Whether to verify language availability

        Raises:
            RuntimeError: If Tesseract is not available or language not installed
        """
        self.lang = lang or self.DEFAULT_LANG
        self.config = config or self.DEFAULT_CONFIG

        if not TESSERACT_AVAILABLE:
            raise RuntimeError(
                "pytesseract is not installed. "
                "Install with: pip install pytesseract"
            )

        if verify_languages:
            self._verify_languages()

    def _verify_languages(self) -> None:
        """
        Verify that required languages are available in Tesseract.

        Raises:
            RuntimeError: If a required language is not installed
        """
        try:
            available_langs = pytesseract.get_languages()
        except Exception as e:
            raise RuntimeError(f"Cannot get Tesseract languages: {e}")

        for lang in self.lang.split('+'):
            if lang not in available_langs:
                raise RuntimeError(
                    f"Language '{lang}' not available. "
                    f"Install with: apt-get install tesseract-ocr-{lang}"
                )

    def normalize_text(self, text: str) -> str:
        """
        Normalize Spanish text, handling accents and special characters.

        Uses Unicode NFC normalization to ensure consistent representation
        of accented characters (á, é, í, ó, ú, ñ, ü).

        Args:
            text: Input text to normalize

        Returns:
            Normalized text string
        """
        if not text:
            return text
        # Normalize to NFC form (composed characters)
        return unicodedata.normalize('NFC', text)

    def extract_text(self, image: Any) -> str:
        """
        Extract plain text from an image.

        Args:
            image: PIL Image to extract text from

        Returns:
            Extracted text as a string

        Raises:
            RuntimeError: If OCR fails
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract is not available")

        try:
            text = pytesseract.image_to_string(
                image,
                lang=self.lang,
                config=self.config
            )
            return self.normalize_text(text)
        except Exception as e:
            raise RuntimeError(f"OCR extraction failed: {e}")

    def extract_words(self, image: Any,
                      min_confidence: float = 0.0) -> List[OCRWord]:
        """
        Extract words with bounding boxes and confidence scores.

        Args:
            image: PIL Image to extract words from
            min_confidence: Minimum confidence threshold (0.0-1.0)

        Returns:
            List of OCRWord objects with text, confidence, and bbox

        Raises:
            RuntimeError: If OCR fails
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract is not available")

        try:
            data = pytesseract.image_to_data(
                image,
                lang=self.lang,
                config=self.config,
                output_type=pytesseract.Output.DICT
            )
        except Exception as e:
            raise RuntimeError(f"OCR extraction failed: {e}")

        words = []
        n_boxes = len(data['text'])

        for i in range(n_boxes):
            text = data['text'][i]
            if not text or not text.strip():
                continue

            conf = int(data['conf'][i])
            # Skip low confidence or invalid confidence
            if conf < 0:
                continue

            confidence = conf / 100.0
            if confidence < min_confidence:
                continue

            # Normalize text
            text = self.normalize_text(text.strip())

            # Calculate bounding box (x1, y1, x2, y2)
            x = data['left'][i]
            y = data['top'][i]
            w = data['width'][i]
            h = data['height'][i]
            bbox = (x, y, x + w, y + h)

            words.append(OCRWord(
                text=text,
                confidence=confidence,
                bbox=bbox
            ))

        return words

    def extract_words_by_line(self, image: Any,
                               min_confidence: float = 0.0) -> List[List[OCRWord]]:
        """
        Extract words grouped by line.

        Args:
            image: PIL Image to extract words from
            min_confidence: Minimum confidence threshold (0.0-1.0)

        Returns:
            List of lines, where each line is a list of OCRWord objects
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract is not available")

        try:
            data = pytesseract.image_to_data(
                image,
                lang=self.lang,
                config=self.config,
                output_type=pytesseract.Output.DICT
            )
        except Exception as e:
            raise RuntimeError(f"OCR extraction failed: {e}")

        lines = {}
        n_boxes = len(data['text'])

        for i in range(n_boxes):
            text = data['text'][i]
            if not text or not text.strip():
                continue

            conf = int(data['conf'][i])
            if conf < 0:
                continue

            confidence = conf / 100.0
            if confidence < min_confidence:
                continue

            # Get line identifier
            block_num = data['block_num'][i]
            line_num = data['line_num'][i]
            line_key = (block_num, line_num)

            text = self.normalize_text(text.strip())
            x = data['left'][i]
            y = data['top'][i]
            w = data['width'][i]
            h = data['height'][i]
            bbox = (x, y, x + w, y + h)

            word = OCRWord(text=text, confidence=confidence, bbox=bbox)

            if line_key not in lines:
                lines[line_key] = []
            lines[line_key].append(word)

        # Sort by block and line number, return as list of lines
        sorted_keys = sorted(lines.keys())
        return [lines[key] for key in sorted_keys]

    def get_image_text_with_positions(self, image: Any) -> dict:
        """
        Get comprehensive OCR data including text and positions.

        Args:
            image: PIL Image to process

        Returns:
            Dictionary with 'text', 'words', and 'lines' keys
        """
        words = self.extract_words(image)
        lines = self.extract_words_by_line(image)
        text = self.extract_text(image)

        return {
            'text': text,
            'words': words,
            'lines': lines,
            'word_count': len(words),
            'line_count': len(lines)
        }
