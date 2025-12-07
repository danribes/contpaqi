# T005 - OCR Layer Implementation Guide

**Task**: 5 OCR Layer Implementation
**Date**: 2025-12-05

---

## Learning Objectives

After completing this guide, you will understand:
1. How OCR (Optical Character Recognition) works
2. Using Tesseract OCR with Python
3. Extracting text with bounding boxes
4. Handling Spanish characters in OCR
5. Building reusable OCR components

---

## 1. What is OCR?

### Definition

**OCR (Optical Character Recognition)** is the technology that converts images of text into machine-readable text.

### How It Works

```
Image → Preprocessing → Character Recognition → Text Output
  ↓         ↓                    ↓                  ↓
 PDF    Binarization        Neural Network      "Hello World"
 Scan   Deskewing          or Pattern Match    + Positions
```

### Common OCR Engines

| Engine | Type | Strengths |
|--------|------|-----------|
| Tesseract | Open Source | Multi-language, free |
| Google Cloud Vision | Cloud | High accuracy |
| AWS Textract | Cloud | Document understanding |
| Azure Computer Vision | Cloud | Enterprise features |

---

## 2. Tesseract OCR

### About Tesseract

- Originally developed by HP (1985-1995)
- Open-sourced in 2005
- Now maintained by Google
- Supports 100+ languages
- Uses LSTM neural networks (v4+)

### Installation

```bash
# Ubuntu/Debian
apt-get install tesseract-ocr tesseract-ocr-spa

# macOS
brew install tesseract tesseract-lang

# Python wrapper
pip install pytesseract pillow
```

### Basic Usage

```python
import pytesseract
from PIL import Image

# Simple text extraction
image = Image.open('document.png')
text = pytesseract.image_to_string(image)
print(text)
```

---

## 3. Tesseract Configuration

### OEM (OCR Engine Mode)

| Mode | Description |
|------|-------------|
| 0 | Legacy engine only |
| 1 | Neural nets LSTM only |
| 2 | Legacy + LSTM |
| 3 | Default (based on availability) |

### PSM (Page Segmentation Mode)

| Mode | Description | Use Case |
|------|-------------|----------|
| 0 | OSD only | Orientation detection |
| 1 | Auto with OSD | General documents |
| 3 | Auto, no OSD | Default |
| 6 | Uniform block | **Invoices** |
| 7 | Single line | Receipts |
| 11 | Sparse text | Forms |

### Configuration String

```python
# Best for invoices
config = '--oem 3 --psm 6'

# With language
text = pytesseract.image_to_string(
    image,
    lang='spa+eng',
    config=config
)
```

---

## 4. Extracting Word Positions

### image_to_data Function

```python
data = pytesseract.image_to_data(
    image,
    lang='spa',
    output_type=pytesseract.Output.DICT
)
```

### Data Structure

```python
{
    'text': ['', 'Hello', 'World'],    # Extracted text
    'conf': [-1, 95, 87],               # Confidence (0-100)
    'left': [0, 10, 100],               # X coordinate
    'top': [0, 20, 20],                 # Y coordinate
    'width': [0, 50, 60],               # Box width
    'height': [0, 20, 20],              # Box height
    'block_num': [0, 1, 1],             # Block number
    'line_num': [0, 1, 1],              # Line within block
}
```

### Converting to Bounding Box

```python
# Tesseract returns: left, top, width, height
# Convert to: x1, y1, x2, y2

x1 = left
y1 = top
x2 = left + width
y2 = top + height

bbox = (x1, y1, x2, y2)
```

---

## 5. Handling Spanish Characters

### The Unicode Challenge

Spanish text contains special characters:
- Accents: á, é, í, ó, ú
- Tilde: ñ
- Diaeresis: ü (rare)
- Uppercase: Á, É, Í, Ó, Ú, Ñ

### Unicode Normalization

```python
import unicodedata

# NFD: Decomposed (é = e + ́)
# NFC: Composed (é = single character)

text = "información"
normalized = unicodedata.normalize('NFC', text)
```

### Why NFC?

```python
# NFD form (decomposed)
'e\u0301'  # 'e' + combining acute accent

# NFC form (composed)
'\xe9'     # 'é' as single character

# NFC is preferred for:
# - Consistent string comparison
# - Database storage
# - API responses
```

---

## 6. Building the OCR Module

### Module Structure

```python
# ocr.py

from dataclasses import dataclass
from typing import List, Any
import unicodedata

@dataclass
class OCRWord:
    text: str
    confidence: float  # 0.0-1.0
    bbox: tuple        # (x1, y1, x2, y2)

class OCREngine:
    def __init__(self, lang='spa+eng'):
        self.lang = lang

    def normalize_text(self, text):
        return unicodedata.normalize('NFC', text)

    def extract_words(self, image) -> List[OCRWord]:
        # Implementation
        pass
```

### Confidence Handling

```python
# Tesseract returns confidence 0-100
# -1 means no confidence (empty text)

conf = data['conf'][i]
if conf < 0:
    continue  # Skip

confidence = conf / 100.0  # Normalize to 0-1
```

### Filtering by Confidence

```python
def extract_words(self, image, min_confidence=0.0):
    words = []
    for word_data in ocr_results:
        if word_data['confidence'] >= min_confidence:
            words.append(word_data)
    return words
```

---

## 7. Testing OCR Code

### Mocking Tesseract

```python
from unittest.mock import patch, MagicMock

@pytest.fixture
def mock_pytesseract():
    mock = MagicMock()
    mock.get_languages.return_value = ['eng', 'spa']
    mock.image_to_data.return_value = {
        'text': ['Hello'],
        'conf': [95],
        # ...
    }
    with patch('utils.ocr.pytesseract', mock):
        yield mock
```

### Why Mock?

1. **No Tesseract needed**: Tests run in any environment
2. **Controlled data**: Predictable test results
3. **Fast**: No actual OCR processing
4. **Isolated**: Tests module logic, not Tesseract

---

## 8. Best Practices

### Image Preprocessing

```python
from PIL import Image, ImageFilter

def preprocess(image):
    # Convert to grayscale
    image = image.convert('L')

    # Increase contrast
    # Apply threshold
    # Remove noise

    return image
```

### Error Handling

```python
def extract_text(self, image):
    try:
        return pytesseract.image_to_string(image)
    except Exception as e:
        raise RuntimeError(f"OCR failed: {e}")
```

### Conditional Imports

```python
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
```

---

## 9. Invoice-Specific Tips

### Common Invoice Fields

| Field | Spanish | Recognition Tips |
|-------|---------|------------------|
| RFC | RFC del Emisor | 13-char pattern |
| Date | Fecha | DD/MM/YYYY format |
| Total | Total | Currency format |
| Subtotal | Subtotal | Currency format |

### Improving Accuracy

1. **High DPI**: Use 300 DPI minimum
2. **Clean scans**: Remove shadows/wrinkles
3. **Language**: Include both spa+eng
4. **PSM 6**: Best for uniform blocks

---

## 10. Quick Reference

### Essential Code

```python
from utils.ocr import OCREngine, OCRWord

# Initialize
engine = OCREngine(lang='spa+eng')

# Extract text
text = engine.extract_text(image)

# Extract words with positions
words = engine.extract_words(image, min_confidence=0.5)
for word in words:
    print(f"{word.text} @ {word.bbox}")
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Low accuracy | Preprocess image, use PSM 6 |
| Missing accents | Use spa language pack |
| Slow processing | Reduce image size |
| Import errors | Install pytesseract & Tesseract |

---

## Summary

### Key Takeaways

1. **Tesseract** is powerful open-source OCR
2. **PSM 6** is best for invoice-like documents
3. **image_to_data** provides word positions
4. **NFC normalization** ensures consistent Spanish text
5. **Mock testing** allows testing without Tesseract

### Next Steps

- Task 6: TATR Model for table detection
- Task 7: LayoutLM for field extraction
- Task 8: Inference pipeline combining all components
