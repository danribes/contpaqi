#!/usr/bin/env python3
"""
Bounding Box Utilities for Invoice Field Detection

Provides functions for finding and calculating bounding boxes of text fields
in invoice images using OCR data from pytesseract.

This module is used to generate ground truth labels for OCR training data.
"""

import re
from typing import Dict, List, Optional, Any, Tuple

# Try to import pytesseract, but allow module to work without it for testing
try:
    import pytesseract
    from pytesseract import Output
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    Output = None


def create_bbox(x: int, y: int, width: int, height: int) -> Dict[str, int]:
    """
    Create a bounding box dictionary.

    Args:
        x: Left coordinate
        y: Top coordinate
        width: Width of the box
        height: Height of the box

    Returns:
        Dictionary with x, y, width, height keys
    """
    return {
        'x': x,
        'y': y,
        'width': width,
        'height': height
    }


def normalize_bbox(
    bbox: Dict[str, int],
    image_width: int,
    image_height: int
) -> Dict[str, float]:
    """
    Normalize bounding box coordinates to 0-1 range.

    Args:
        bbox: Bounding box with pixel coordinates
        image_width: Width of the image in pixels
        image_height: Height of the image in pixels

    Returns:
        Bounding box with normalized coordinates (0-1 range)
    """
    return {
        'x': bbox['x'] / image_width,
        'y': bbox['y'] / image_height,
        'width': bbox['width'] / image_width,
        'height': bbox['height'] / image_height
    }


def merge_bboxes(bboxes: List[Dict[str, int]]) -> Optional[Dict[str, int]]:
    """
    Merge multiple bounding boxes into one that contains all of them.

    Args:
        bboxes: List of bounding boxes to merge

    Returns:
        Single bounding box containing all input boxes, or None if empty list
    """
    if not bboxes:
        return None

    if len(bboxes) == 1:
        return bboxes[0].copy()

    # Find the bounds
    min_x = min(b['x'] for b in bboxes)
    min_y = min(b['y'] for b in bboxes)
    max_x = max(b['x'] + b['width'] for b in bboxes)
    max_y = max(b['y'] + b['height'] for b in bboxes)

    return create_bbox(
        x=min_x,
        y=min_y,
        width=max_x - min_x,
        height=max_y - min_y
    )


def ocr_image(image, lang: str = 'spa') -> Dict[str, List]:
    """
    Perform OCR on an image and return detailed word-level data.

    Args:
        image: PIL Image or numpy array
        lang: Tesseract language code (default: Spanish)

    Returns:
        Dictionary with OCR data including text, positions, confidence

    Raises:
        ImportError: If pytesseract is not installed
    """
    if not TESSERACT_AVAILABLE:
        raise ImportError(
            "pytesseract is not installed. Run: pip install pytesseract"
        )

    data = pytesseract.image_to_data(image, lang=lang, output_type=Output.DICT)
    return data


def filter_ocr_by_confidence(
    ocr_data: Dict[str, List],
    min_confidence: int = 60
) -> Dict[str, List]:
    """
    Filter OCR results by confidence level and remove empty entries.

    Args:
        ocr_data: Raw OCR data from pytesseract
        min_confidence: Minimum confidence threshold (0-100)

    Returns:
        Filtered OCR data with only high-confidence, non-empty results
    """
    filtered = {key: [] for key in ocr_data.keys()}

    for i in range(len(ocr_data['text'])):
        text = ocr_data['text'][i]
        conf = ocr_data['conf'][i]

        # Skip empty or whitespace-only text
        if not text or not text.strip():
            continue

        # Skip low confidence results (conf of -1 means no text detected)
        if conf < min_confidence:
            continue

        # Add to filtered results
        for key in ocr_data.keys():
            filtered[key].append(ocr_data[key][i])

    return filtered


def find_text_bbox(
    ocr_data: Dict[str, List],
    search_text: str,
    case_sensitive: bool = True
) -> Optional[Dict[str, int]]:
    """
    Find the bounding box of a specific text in OCR data.

    Args:
        ocr_data: OCR data from pytesseract
        search_text: Text to search for
        case_sensitive: Whether search is case-sensitive

    Returns:
        Bounding box if found, None otherwise
    """
    if not case_sensitive:
        search_text = search_text.lower()

    for i, text in enumerate(ocr_data['text']):
        compare_text = text if case_sensitive else text.lower()

        # Check for exact match or containment
        if search_text == compare_text or search_text in compare_text:
            return create_bbox(
                x=ocr_data['left'][i],
                y=ocr_data['top'][i],
                width=ocr_data['width'][i],
                height=ocr_data['height'][i]
            )

    return None


def find_numeric_bbox(
    ocr_data: Dict[str, List],
    value: float,
    tolerance: float = 0.01
) -> Optional[Dict[str, int]]:
    """
    Find the bounding box of a numeric value in OCR data.

    Handles various number formats: 1234.56, 1,234.56, $1,234.56

    Args:
        ocr_data: OCR data from pytesseract
        value: Numeric value to search for
        tolerance: Tolerance for floating point comparison

    Returns:
        Bounding box if found, None otherwise
    """
    # Format variations to search for
    search_patterns = [
        f"{value:.2f}",                          # 1234.56
        f"{value:,.2f}",                         # 1,234.56
        f"${value:,.2f}",                        # $1,234.56
        f"{value:.2f}".replace('.', ','),        # 1234,56 (European)
        str(int(value)) if value == int(value) else None,  # 1234
    ]

    # Remove None values
    search_patterns = [p for p in search_patterns if p]

    for i, text in enumerate(ocr_data['text']):
        # Clean the text
        clean_text = text.strip()

        for pattern in search_patterns:
            if pattern in clean_text or clean_text in pattern:
                return create_bbox(
                    x=ocr_data['left'][i],
                    y=ocr_data['top'][i],
                    width=ocr_data['width'][i],
                    height=ocr_data['height'][i]
                )

        # Also try parsing the text as a number
        try:
            # Remove currency symbols and commas
            numeric_text = clean_text.replace('$', '').replace(',', '').replace(' ', '')
            parsed_value = float(numeric_text)
            if abs(parsed_value - value) < tolerance:
                return create_bbox(
                    x=ocr_data['left'][i],
                    y=ocr_data['top'][i],
                    width=ocr_data['width'][i],
                    height=ocr_data['height'][i]
                )
        except (ValueError, AttributeError):
            continue

    return None


def find_labeled_field_bbox(
    ocr_data: Dict[str, List],
    label: str,
    value: str
) -> Optional[Dict[str, int]]:
    """
    Find the bounding box of a field by its label and value.

    Useful for fields like "RFC: XAXX010101ABC" where label and value
    may be in separate OCR entries.

    Args:
        ocr_data: OCR data from pytesseract
        label: Field label to search for (e.g., "RFC:")
        value: Field value to search for

    Returns:
        Bounding box of the value if found, None otherwise
    """
    # First, find the label
    label_bbox = find_text_bbox(ocr_data, label, case_sensitive=False)

    # Then find the value
    value_bbox = find_text_bbox(ocr_data, value, case_sensitive=False)

    # If we found the value, return it
    if value_bbox:
        return value_bbox

    # If we found label but not value, look for value near the label
    if label_bbox:
        label_y = label_bbox['y']
        label_right = label_bbox['x'] + label_bbox['width']

        # Look for text on the same line, to the right of the label
        for i, text in enumerate(ocr_data['text']):
            text_y = ocr_data['top'][i]
            text_x = ocr_data['left'][i]

            # Check if on same line (within 10 pixels) and to the right
            if abs(text_y - label_y) < 10 and text_x > label_right:
                if value.lower() in text.lower() or text.lower() in value.lower():
                    return create_bbox(
                        x=ocr_data['left'][i],
                        y=ocr_data['top'][i],
                        width=ocr_data['width'][i],
                        height=ocr_data['height'][i]
                    )

    return None


def find_date_bbox(
    ocr_data: Dict[str, List],
    date_str: str
) -> Optional[Dict[str, int]]:
    """
    Find the bounding box of a date value in various formats.

    Args:
        ocr_data: OCR data from pytesseract
        date_str: Date string in YYYY-MM-DD format

    Returns:
        Bounding box if found, None otherwise
    """
    # Parse the date
    try:
        parts = date_str.split('-')
        year, month, day = parts[0], parts[1], parts[2]
    except (IndexError, ValueError):
        return find_text_bbox(ocr_data, date_str)

    # Generate possible date formats
    date_formats = [
        date_str,                                    # 2024-03-15
        f"{day}/{month}/{year}",                     # 15/03/2024
        f"{day}-{month}-{year}",                     # 15-03-2024
        f"{day}.{month}.{year}",                     # 15.03.2024
        f"{int(day)}/{int(month)}/{year}",          # 15/3/2024
        f"{year}/{month}/{day}",                     # 2024/03/15
    ]

    # Search for each format
    for fmt in date_formats:
        bbox = find_text_bbox(ocr_data, fmt)
        if bbox:
            return bbox

    # Try finding just day/month/year parts nearby
    day_bbox = find_text_bbox(ocr_data, day)
    if day_bbox:
        return day_bbox

    return None


def find_item_bbox(
    ocr_data: Dict[str, List],
    item: Dict[str, Any]
) -> Optional[Dict[str, int]]:
    """
    Find the bounding box for a line item row.

    Searches for any part of the item (description, quantity, price, amount)
    and returns a bbox that encompasses the found elements.

    Args:
        ocr_data: OCR data from pytesseract
        item: Item dictionary with description, quantity, unit_price, amount

    Returns:
        Bounding box spanning the item row, or None if not found
    """
    found_bboxes = []

    # Search for description (first few words)
    desc_words = item['description'].split()[:3]
    for word in desc_words:
        if len(word) > 3:  # Skip short words
            bbox = find_text_bbox(ocr_data, word, case_sensitive=False)
            if bbox:
                found_bboxes.append(bbox)
                break

    # Search for amount (most reliable)
    amount_bbox = find_numeric_bbox(ocr_data, item['amount'])
    if amount_bbox:
        found_bboxes.append(amount_bbox)

    # Search for quantity
    qty_bbox = find_text_bbox(ocr_data, str(item['quantity']))
    if qty_bbox:
        found_bboxes.append(qty_bbox)

    # Merge found boxes
    if found_bboxes:
        return merge_bboxes(found_bboxes)

    return None


def find_all_field_bboxes(
    image,
    invoice_data: Dict[str, Any],
    lang: str = 'spa'
) -> Dict[str, Optional[Dict[str, int]]]:
    """
    Find bounding boxes for all invoice fields.

    Args:
        image: PIL Image or path to image file
        invoice_data: Invoice data dictionary
        lang: OCR language code

    Returns:
        Dictionary mapping field names to their bounding boxes
    """
    # Perform OCR
    ocr_data = ocr_image(image, lang=lang)

    # Filter low confidence results
    ocr_data = filter_ocr_by_confidence(ocr_data, min_confidence=50)

    # Find each field
    result = {
        'rfc_emisor': find_text_bbox(
            ocr_data,
            invoice_data['emisor']['rfc']
        ),
        'rfc_receptor': find_text_bbox(
            ocr_data,
            invoice_data['receptor']['rfc']
        ),
        'date': find_date_bbox(
            ocr_data,
            invoice_data['date']
        ),
        'folio': find_text_bbox(
            ocr_data,
            invoice_data['folio']
        ),
        'subtotal': find_numeric_bbox(
            ocr_data,
            invoice_data['subtotal']
        ),
        'iva': find_numeric_bbox(
            ocr_data,
            invoice_data['iva']
        ),
        'total': find_numeric_bbox(
            ocr_data,
            invoice_data['total']
        ),
        'emisor_name': find_text_bbox(
            ocr_data,
            invoice_data['emisor']['name'].split()[0],  # First word
            case_sensitive=False
        ),
        'receptor_name': find_text_bbox(
            ocr_data,
            invoice_data['receptor']['name'].split()[0],  # First word
            case_sensitive=False
        ),
    }

    # Find item bboxes
    result['items'] = []
    for item in invoice_data.get('items', []):
        item_bbox = find_item_bbox(ocr_data, item)
        result['items'].append(item_bbox)

    return result


def bbox_to_corners(bbox: Dict[str, int]) -> Tuple[int, int, int, int]:
    """
    Convert bbox dict to corner coordinates (x1, y1, x2, y2).

    Args:
        bbox: Bounding box dictionary

    Returns:
        Tuple of (left, top, right, bottom)
    """
    return (
        bbox['x'],
        bbox['y'],
        bbox['x'] + bbox['width'],
        bbox['y'] + bbox['height']
    )


def corners_to_bbox(x1: int, y1: int, x2: int, y2: int) -> Dict[str, int]:
    """
    Convert corner coordinates to bbox dict.

    Args:
        x1, y1: Top-left corner
        x2, y2: Bottom-right corner

    Returns:
        Bounding box dictionary
    """
    return create_bbox(
        x=x1,
        y=y1,
        width=x2 - x1,
        height=y2 - y1
    )


if __name__ == '__main__':
    # Demo usage
    print("=== Bounding Box Utils Demo ===\n")

    # Create sample bbox
    bbox = create_bbox(100, 200, 150, 30)
    print(f"Created bbox: {bbox}")

    # Normalize
    normalized = normalize_bbox(bbox, 1000, 1400)
    print(f"Normalized: {normalized}")

    # Merge bboxes
    bbox1 = create_bbox(100, 200, 50, 20)
    bbox2 = create_bbox(160, 200, 80, 20)
    merged = merge_bboxes([bbox1, bbox2])
    print(f"Merged: {merged}")

    # Mock OCR data
    mock_data = {
        'text': ['FACTURA', 'Total:', '$17,400.00', 'RFC:', 'XAXX010101ABC'],
        'left': [100, 50, 150, 50, 100],
        'top': [50, 200, 200, 250, 250],
        'width': [120, 60, 100, 40, 130],
        'height': [30, 25, 25, 25, 25],
        'conf': [95, 90, 88, 92, 85],
    }

    # Find text
    factura_bbox = find_text_bbox(mock_data, 'FACTURA')
    print(f"Found 'FACTURA': {factura_bbox}")

    # Find numeric
    total_bbox = find_numeric_bbox(mock_data, 17400.00)
    print(f"Found 17400.00: {total_bbox}")
