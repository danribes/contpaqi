"""
Table Transformer (TATR) model for table detection in invoices.

This module provides the TATRModel class for detecting tables and table rows
in invoice images using the Microsoft Table Transformer model.

https://github.com/microsoft/table-transformer
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Optional, Any, TYPE_CHECKING

# Torch import - may not be available in all environments
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

# Transformers import
try:
    from transformers import AutoModelForObjectDetection, AutoImageProcessor
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    AutoModelForObjectDetection = None
    AutoImageProcessor = None

__all__ = ['TableDetection', 'TATRModel', 'TORCH_AVAILABLE', 'TRANSFORMERS_AVAILABLE']


@dataclass
class TableDetection:
    """
    Represents a detected table element (table, row, column, header).

    Attributes:
        label: The type of detection ('table', 'table row', 'table column', 'table column header')
        confidence: Confidence score between 0.0 and 1.0
        bbox: Bounding box as (x1, y1, x2, y2) tuple
    """
    label: str
    confidence: float
    bbox: tuple  # (x1, y1, x2, y2)

    def __post_init__(self):
        """Validate the detection data."""
        # Validate bbox
        if not isinstance(self.bbox, tuple) or len(self.bbox) != 4:
            raise ValueError("bbox must be a tuple of 4 elements (x1, y1, x2, y2)")

        # Validate confidence
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")


class TATRModel:
    """
    Table Transformer model for detecting tables and rows in invoice images.

    This model uses Microsoft's Table Transformer (TATR) to detect:
    - Tables
    - Table rows
    - Table columns
    - Table column headers

    Attributes:
        DEFAULT_MODEL_NAME: Default HuggingFace model name
        DEFAULT_THRESHOLD: Default confidence threshold for detections
        LABELS: List of detection labels
    """

    DEFAULT_MODEL_NAME = "microsoft/table-transformer-detection"
    DEFAULT_THRESHOLD = 0.7
    LABELS = ["table", "table row", "table column", "table column header"]
    ID2LABEL = {0: "table", 1: "table row", 2: "table column", 3: "table column header"}
    LABEL_NAMES = LABELS

    def __init__(
        self,
        model_name: str = None,
        device: str = None,
        threshold: float = None,
        load_model: bool = True
    ):
        """
        Initialize the TATR model.

        Args:
            model_name: HuggingFace model name or local path
            device: Device to use ('cuda', 'cpu', or None for auto)
            threshold: Confidence threshold for detections
            load_model: Whether to load the model immediately
        """
        self.model_name = model_name or self.DEFAULT_MODEL_NAME
        self.threshold = threshold if threshold is not None else self.DEFAULT_THRESHOLD

        # Determine device
        if device is None:
            if TORCH_AVAILABLE and torch is not None and torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
        else:
            self.device = device

        self.model = None
        self.processor = None
        self._model_loaded = False

        if load_model and TORCH_AVAILABLE and TRANSFORMERS_AVAILABLE:
            self._load_model()

    def _load_model(self):
        """Load the model and processor."""
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is not available. Install torch to use TATRModel.")
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers is not available. Install transformers to use TATRModel.")

        self.processor = AutoImageProcessor.from_pretrained(self.model_name)
        self.model = AutoModelForObjectDetection.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()
        self._model_loaded = True

        # Update label mapping from model config if available
        if hasattr(self.model.config, 'id2label'):
            self.ID2LABEL = self.model.config.id2label

    def _ensure_model_loaded(self):
        """Ensure the model is loaded before inference."""
        if not self._model_loaded:
            self._load_model()

    def detect(self, image: Any, threshold: float = None) -> List[TableDetection]:
        """
        Detect tables and table elements in an image.

        Args:
            image: PIL Image to process
            threshold: Optional confidence threshold (overrides instance threshold)

        Returns:
            List of TableDetection objects
        """
        if not TORCH_AVAILABLE or not TRANSFORMERS_AVAILABLE:
            return []

        self._ensure_model_loaded()

        threshold = threshold if threshold is not None else self.threshold

        # Preprocess image
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)

        # Post-process results
        target_sizes = torch.tensor([image.size[::-1]])  # (height, width)
        results = self.processor.post_process_object_detection(
            outputs, target_sizes=target_sizes, threshold=threshold
        )[0]

        # Convert to TableDetection objects
        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            label_name = self.ID2LABEL.get(label.item(), f"unknown_{label.item()}")
            detections.append(TableDetection(
                label=label_name,
                confidence=score.item(),
                bbox=tuple(box.tolist())
            ))

        return detections

    def get_table_rows(self, image: Any, threshold: float = None) -> List[Dict]:
        """
        Get sorted row bounding boxes from detected tables.

        Args:
            image: PIL Image to process
            threshold: Optional confidence threshold

        Returns:
            List of dictionaries with 'bbox', 'confidence', and 'index' keys,
            sorted by y-coordinate (top to bottom)
        """
        detections = self.detect(image, threshold)

        # Filter for rows only
        rows = [d for d in detections if d.label == 'table row']

        # Sort by y-coordinate (top to bottom)
        rows.sort(key=lambda r: r.bbox[1])

        return [
            {
                'bbox': row.bbox,
                'confidence': row.confidence,
                'index': i
            }
            for i, row in enumerate(rows)
        ]

    def get_table_bounds(self, image: Any, threshold: float = None) -> Optional[Dict]:
        """
        Get the bounding box of the main table.

        Args:
            image: PIL Image to process
            threshold: Optional confidence threshold

        Returns:
            Dictionary with 'bbox' and 'confidence' keys, or None if no table found
        """
        detections = self.detect(image, threshold)

        # Filter for tables only
        tables = [d for d in detections if d.label == 'table']

        if not tables:
            return None

        # Return highest confidence table
        best_table = max(tables, key=lambda t: t.confidence)
        return {
            'bbox': best_table.bbox,
            'confidence': best_table.confidence
        }
