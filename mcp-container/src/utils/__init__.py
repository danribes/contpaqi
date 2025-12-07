"""
Utility modules for MCP Container.
- OCR: Tesseract wrapper
- Validation: Data sanitization
"""

from .ocr import OCRWord, OCREngine, TESSERACT_AVAILABLE

__all__ = ['OCRWord', 'OCREngine', 'TESSERACT_AVAILABLE']
