"""
Main inference engine that orchestrates OCR, TATR, and LayoutLM.

This module provides the InvoiceInferenceEngine class that combines
OCR text extraction, table detection, and field classification
to extract structured data from invoice images.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional, Tuple
import logging

# Import model classes - may not be available in all environments
try:
    from .utils.ocr import OCREngine
    OCR_AVAILABLE = True
except ImportError:
    OCREngine = None
    OCR_AVAILABLE = False

try:
    from .models.tatr import TATRModel
    TATR_AVAILABLE = True
except ImportError:
    TATRModel = None
    TATR_AVAILABLE = False

try:
    from .models.layoutlm import LayoutLMModel
    LAYOUTLM_AVAILABLE = True
except ImportError:
    LayoutLMModel = None
    LAYOUTLM_AVAILABLE = False

logger = logging.getLogger(__name__)

__all__ = ['InvoiceResult', 'InvoiceInferenceEngine']


@dataclass
class InvoiceResult:
    """
    Result of invoice extraction.

    Attributes:
        rfc_emisor: RFC of the issuer (emisor)
        rfc_receptor: RFC of the receiver (receptor)
        date: Invoice date as string
        subtotal: Subtotal amount before tax
        iva: IVA (16% tax) amount
        total: Total amount (subtotal + iva)
        line_items: List of line item dictionaries
        confidence: Overall confidence score (0.0 to 1.0)
        warnings: List of warning messages
    """
    rfc_emisor: str
    rfc_receptor: str
    date: str
    subtotal: float
    iva: float
    total: float
    line_items: List[Dict]
    confidence: float
    warnings: List[str]


class InvoiceInferenceEngine:
    """
    Main inference engine that orchestrates OCR, TATR, and LayoutLM.

    This class combines:
    - OCREngine: Extract text and bounding boxes from images
    - TATRModel: Detect tables and rows
    - LayoutLMModel: Classify tokens into invoice fields

    Attributes:
        ocr: OCREngine instance for text extraction
        tatr: TATRModel instance for table detection
        layoutlm: LayoutLMModel instance for field classification
    """

    def __init__(self, load_models: bool = True):
        """
        Initialize the inference engine.

        Args:
            load_models: Whether to load models immediately.
                        Set to False for testing without models.
        """
        self.ocr = None
        self.tatr = None
        self.layoutlm = None

        if load_models:
            logger.info("Initializing inference engine...")
            self._load_models()
            logger.info("Inference engine ready")

    def _load_models(self):
        """Load all required models."""
        if OCR_AVAILABLE and OCREngine is not None:
            self.ocr = OCREngine()
            logger.debug("OCREngine loaded")

        if TATR_AVAILABLE and TATRModel is not None:
            self.tatr = TATRModel()
            logger.debug("TATRModel loaded")

        if LAYOUTLM_AVAILABLE and LayoutLMModel is not None:
            self.layoutlm = LayoutLMModel()
            logger.debug("LayoutLMModel loaded")

    def _run_ocr(self, image: Any) -> tuple:
        """
        Extract words and bounding boxes using OCR.

        Args:
            image: PIL Image to process

        Returns:
            Tuple of (texts, boxes, confidences) where:
            - texts: List of word strings
            - boxes: List of bounding box tuples (x1, y1, x2, y2)
            - confidences: List of confidence scores (0.0 to 1.0)
        """
        logger.debug("Running OCR...")
        words = self.ocr.extract_words(image)

        texts = [w.text for w in words]
        boxes = [w.bbox for w in words]
        confidences = [w.confidence for w in words]

        logger.debug(f"OCR extracted {len(words)} words")
        return texts, boxes, confidences

    def _detect_table_structure(self, image: Any) -> Dict:
        """
        Detect table and row bounding boxes.

        Args:
            image: PIL Image to process

        Returns:
            Dictionary with:
            - 'table': Bounding box tuple (x1, y1, x2, y2) or None
            - 'rows': List of row bounding box tuples
        """
        logger.debug("Detecting table structure...")

        table_bounds = self.tatr.get_table_bounds(image)
        rows = self.tatr.get_table_rows(image)

        logger.debug(f"Found table with {len(rows)} rows")
        return {
            'table': table_bounds,
            'rows': rows
        }
