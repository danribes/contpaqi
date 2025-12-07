# T006 TATR Model Integration - Learning Guide

## Overview

This guide explains the Table Transformer (TATR) model integration for detecting tables and rows in invoice images. TATR is a neural network model developed by Microsoft for table structure recognition.

## What is TATR?

**Table Transformer (TATR)** is an object detection model specifically trained to identify:
- **Tables** - The overall table boundary
- **Table Rows** - Individual rows within a table
- **Table Columns** - Vertical column divisions
- **Table Column Headers** - Header cells at the top

The model is based on the DETR (Detection Transformer) architecture and is available on Hugging Face.

## Key Concepts

### 1. Object Detection for Tables

Unlike traditional table detection that uses rules or heuristics, TATR treats tables as objects to be detected:

```
Input Image -> Neural Network -> Bounding Boxes + Labels
```

Each detection includes:
- **Label**: What type of element (table, row, column, header)
- **Confidence**: How certain the model is (0.0 to 1.0)
- **Bounding Box**: Coordinates (x1, y1, x2, y2)

### 2. TableDetection Dataclass

We use a dataclass to represent each detection:

```python
@dataclass
class TableDetection:
    label: str       # 'table', 'table row', etc.
    confidence: float # 0.0 to 1.0
    bbox: tuple      # (x1, y1, x2, y2)
```

**Validation**: The dataclass validates inputs in `__post_init__`:
- bbox must have exactly 4 elements
- confidence must be between 0 and 1

### 3. Model Loading Pattern

The model follows a lazy-loading pattern:

```python
class TATRModel:
    def __init__(self, load_model=True):
        self._model_loaded = False
        if load_model:
            self._load_model()

    def _load_model(self):
        self.processor = AutoImageProcessor.from_pretrained(...)
        self.model = AutoModelForObjectDetection.from_pretrained(...)
```

**Why lazy loading?**
- Faster initialization when model not needed immediately
- Allows testing without loading heavy model
- Enables configuration before loading

### 4. Inference Pipeline

The detection pipeline:

```
Image -> Preprocess -> Model -> Post-process -> TableDetection[]
```

```python
def detect(self, image, threshold=None):
    # 1. Preprocess
    inputs = self.processor(images=image, return_tensors="pt")

    # 2. Run inference (no gradients needed)
    with torch.no_grad():
        outputs = self.model(**inputs)

    # 3. Post-process
    results = self.processor.post_process_object_detection(
        outputs, target_sizes=..., threshold=threshold
    )

    # 4. Convert to TableDetection objects
    return [TableDetection(...) for ...]
```

### 5. Row Extraction and Sorting

For invoice processing, we need rows sorted from top to bottom:

```python
def get_table_rows(self, image, threshold=None):
    detections = self.detect(image, threshold)

    # Filter for rows only
    rows = [d for d in detections if d.label == 'table row']

    # Sort by y-coordinate (top to bottom)
    rows.sort(key=lambda r: r.bbox[1])  # bbox[1] is y1

    return [{'bbox': r.bbox, 'confidence': r.confidence, 'index': i}
            for i, r in enumerate(rows)]
```

**Why sort by y?** Invoices have line items from top to bottom. The row order matters for matching items to their positions.

## Conditional Imports

Since torch and transformers are large dependencies, we use conditional imports:

```python
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
```

**Benefits**:
- Module can be imported even without dependencies
- Tests can run without installing large packages
- Clear error messages when dependencies missing

## Testing Strategy

### Mocking Heavy Dependencies

We mock torch and transformers for unit testing:

```python
@patch('models.tatr.TORCH_AVAILABLE', True)
@patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
def test_something(self):
    with patch('models.tatr.AutoModelForObjectDetection') as mock:
        # Test without actual model
```

### Testing Detection Results

We mock the `detect` method to test downstream logic:

```python
def test_get_table_rows_sorts_by_y(self):
    model = TATRModel(load_model=False)

    # Create mock detections (out of order)
    detections = [
        TableDetection(label="table row", bbox=(0, 200, 100, 250)),  # third
        TableDetection(label="table row", bbox=(0, 50, 100, 100)),   # first
    ]
    model.detect = Mock(return_value=detections)

    result = model.get_table_rows(Mock())

    # Verify sorted by y
    assert result[0]['bbox'][1] == 50   # first
    assert result[1]['bbox'][1] == 200  # second
```

## Best Practices

### 1. Use `no_grad()` for Inference
```python
with torch.no_grad():
    outputs = self.model(**inputs)
```
This disables gradient computation, saving memory and speeding up inference.

### 2. Validate Early
The `TableDetection` dataclass validates in `__post_init__`:
```python
def __post_init__(self):
    if not 0.0 <= self.confidence <= 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")
```

### 3. Provide Sensible Defaults
```python
DEFAULT_MODEL_NAME = "microsoft/table-transformer-detection"
DEFAULT_THRESHOLD = 0.7
```

### 4. Allow Override at Call Time
```python
def detect(self, image, threshold=None):
    threshold = threshold if threshold is not None else self.threshold
```

## Model Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| model_name | microsoft/table-transformer-detection | HuggingFace model |
| device | auto (cuda/cpu) | Inference device |
| threshold | 0.7 | Minimum confidence |

## Integration with Invoice Processing

The TATR model integrates into the pipeline:

```
1. PDF -> Image (Task 5: OCR)
2. Image -> Table/Row Bboxes (Task 6: TATR) <-- This task
3. Image + Bboxes -> Field Labels (Task 7: LayoutLM)
4. All Results -> Structured Invoice (Task 8: Inference Pipeline)
```

**Why TATR before LayoutLM?**
- TATR finds table structure (where rows are)
- LayoutLM classifies tokens (what fields are)
- Together they extract structured line items

## Summary

Task 6 implements table detection using Microsoft's Table Transformer:
- `TableDetection` dataclass for structured output
- `TATRModel` class for model loading and inference
- Row sorting for invoice line item ordering
- Conditional imports for dependency flexibility
- Comprehensive mocking for unit tests

The module follows the pattern established in Task 5 (OCR) for consistency and testability.
