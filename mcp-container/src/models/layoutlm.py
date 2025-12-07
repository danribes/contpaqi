"""
LayoutLMv3 model for token classification on invoices.

This module provides the LayoutLMModel class for extracting structured fields
from invoice images using Microsoft's LayoutLMv3 model with BIO tagging.

Extracts fields: RFC, date, total, subtotal, IVA, line items.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Optional, Any, Tuple

# Torch import - may not be available in all environments
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

# Transformers import
try:
    from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    LayoutLMv3Processor = None
    LayoutLMv3ForTokenClassification = None

__all__ = ['ExtractedField', 'LayoutLMModel', 'TORCH_AVAILABLE', 'TRANSFORMERS_AVAILABLE']


@dataclass
class ExtractedField:
    """
    Represents an extracted field from an invoice.

    Attributes:
        label: The field type (e.g., 'RFC_EMISOR', 'TOTAL', 'DATE')
        value: The extracted text value
        confidence: Confidence score between 0.0 and 1.0
        bbox: Bounding box as (x1, y1, x2, y2) tuple
    """
    label: str
    value: str
    confidence: float
    bbox: tuple  # (x1, y1, x2, y2)

    def __post_init__(self):
        """Validate the field data."""
        # Validate bbox
        if not isinstance(self.bbox, tuple) or len(self.bbox) != 4:
            raise ValueError("bbox must be a tuple of 4 elements (x1, y1, x2, y2)")

        # Validate confidence
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")


class LayoutLMModel:
    """
    LayoutLMv3 model for token classification on invoice images.

    This model uses Microsoft's LayoutLMv3 to classify tokens (words) into
    invoice field categories using BIO tagging (Begin, Inside, Outside).

    Attributes:
        DEFAULT_MODEL_NAME: Default HuggingFace model name
        LABELS: BIO tagging labels for invoice fields
    """

    DEFAULT_MODEL_NAME = "microsoft/layoutlmv3-base"

    # BIO tagging labels for invoice fields
    # O = Outside (not a field)
    # B- = Beginning of a field
    # I- = Inside a field (continuation)
    LABELS = [
        'O',
        'B-RFC_EMISOR', 'I-RFC_EMISOR',
        'B-RFC_RECEPTOR', 'I-RFC_RECEPTOR',
        'B-DATE', 'I-DATE',
        'B-SUBTOTAL', 'I-SUBTOTAL',
        'B-IVA', 'I-IVA',
        'B-TOTAL', 'I-TOTAL',
        'B-ITEM_DESC', 'I-ITEM_DESC',
        'B-ITEM_QTY', 'I-ITEM_QTY',
        'B-ITEM_PRICE', 'I-ITEM_PRICE',
        'B-ITEM_AMOUNT', 'I-ITEM_AMOUNT'
    ]

    def __init__(
        self,
        model_name: str = None,
        device: str = None,
        load_model: bool = True
    ):
        """
        Initialize the LayoutLM model.

        Args:
            model_name: HuggingFace model name or local path
            device: Device to use ('cuda', 'cpu', or None for auto)
            load_model: Whether to load the model immediately
        """
        self.model_name = model_name or self.DEFAULT_MODEL_NAME

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

        # Label mappings
        self.label2id = {label: idx for idx, label in enumerate(self.LABELS)}
        self.id2label = {idx: label for idx, label in enumerate(self.LABELS)}

        if load_model and TORCH_AVAILABLE and TRANSFORMERS_AVAILABLE:
            self._load_model()

    def _load_model(self):
        """Load the model and processor."""
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is not available. Install torch to use LayoutLMModel.")
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers is not available. Install transformers to use LayoutLMModel.")

        self.processor = LayoutLMv3Processor.from_pretrained(self.model_name)
        self.model = LayoutLMv3ForTokenClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.LABELS)
        )
        self.model.to(self.device)
        self.model.eval()
        self._model_loaded = True

    def _ensure_model_loaded(self):
        """Ensure the model is loaded before inference."""
        if not self._model_loaded:
            self._load_model()

    def predict(
        self,
        image: Any,
        words: List[str],
        boxes: List[Tuple]
    ) -> List[Dict]:
        """
        Run token classification on OCR words.

        Args:
            image: PIL Image to process
            words: List of word strings from OCR
            boxes: List of bounding boxes (x1, y1, x2, y2) for each word

        Returns:
            List of dictionaries with 'word', 'label', 'confidence', 'bbox' keys
        """
        if not TORCH_AVAILABLE or not TRANSFORMERS_AVAILABLE:
            return []

        self._ensure_model_loaded()

        # Normalize boxes to 0-1000 scale
        width, height = image.size
        normalized_boxes = [
            [
                int(box[0] * 1000 / width),
                int(box[1] * 1000 / height),
                int(box[2] * 1000 / width),
                int(box[3] * 1000 / height)
            ]
            for box in boxes
        ]

        # Encode inputs
        encoding = self.processor(
            image,
            words,
            boxes=normalized_boxes,
            return_tensors="pt",
            truncation=True,
            padding="max_length",
            max_length=512
        )
        encoding = {k: v.to(self.device) for k, v in encoding.items()}

        # Run inference
        with torch.no_grad():
            outputs = self.model(**encoding)

        predictions = outputs.logits.argmax(-1).squeeze().tolist()
        probs = torch.softmax(outputs.logits, dim=-1).max(-1).values.squeeze().tolist()

        # Ensure lists for single-item cases
        if not isinstance(predictions, list):
            predictions = [predictions]
        if not isinstance(probs, list):
            probs = [probs]

        # Map back to words (handle subword tokenization)
        results = []
        word_ids = encoding.word_ids()
        prev_word_id = None

        for idx, word_id in enumerate(word_ids):
            if word_id is None or word_id == prev_word_id:
                continue
            if word_id >= len(words):
                continue

            results.append({
                'word': words[word_id],
                'label': self.id2label[predictions[idx]],
                'confidence': probs[idx],
                'bbox': boxes[word_id]
            })
            prev_word_id = word_id

        return results

    def extract_fields(self, predictions: List[Dict]) -> Dict[str, ExtractedField]:
        """
        Group BIO-tagged tokens into complete fields.

        Args:
            predictions: List of prediction dictionaries from predict()

        Returns:
            Dictionary mapping field names to ExtractedField objects
        """
        fields = {}
        current_field = None
        current_tokens = []

        for pred in predictions:
            label = pred['label']

            if label.startswith('B-'):
                # Save previous field
                if current_field and current_tokens:
                    fields[current_field] = self._merge_tokens(current_tokens, current_field)

                # Start new field
                current_field = label[2:]  # Remove 'B-' prefix
                current_tokens = [pred]

            elif label.startswith('I-') and current_field == label[2:]:
                # Continue current field
                current_tokens.append(pred)

            else:
                # End current field (O label or mismatched I- label)
                if current_field and current_tokens:
                    fields[current_field] = self._merge_tokens(current_tokens, current_field)
                current_field = None
                current_tokens = []

        # Don't forget last field
        if current_field and current_tokens:
            fields[current_field] = self._merge_tokens(current_tokens, current_field)

        return fields

    def _merge_tokens(self, tokens: List[Dict], field_name: str) -> ExtractedField:
        """
        Merge multiple tokens into a single ExtractedField.

        Args:
            tokens: List of token dictionaries
            field_name: Name of the field (without B-/I- prefix)

        Returns:
            Merged ExtractedField object
        """
        # Concatenate words
        value = ' '.join(t['word'] for t in tokens)

        # Average confidence
        confidence = sum(t['confidence'] for t in tokens) / len(tokens)

        # Merge bounding boxes (union)
        bbox = (
            min(t['bbox'][0] for t in tokens),  # min x1
            min(t['bbox'][1] for t in tokens),  # min y1
            max(t['bbox'][2] for t in tokens),  # max x2
            max(t['bbox'][3] for t in tokens)   # max y2
        )

        return ExtractedField(
            label=field_name,
            value=value,
            confidence=confidence,
            bbox=bbox
        )
