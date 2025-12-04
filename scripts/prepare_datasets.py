#!/usr/bin/env python3
"""
Dataset Preparation Script for TATR and LayoutLM

Converts synthetic invoice PDFs and JSON labels into formats required
by Hugging Face Transformers for training table detection (TATR) and
token classification (LayoutLMv3) models.

Usage:
    python prepare_datasets.py --input-dir data/synthetic --output-dir data/formatted --format both
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Optional imports for image processing
try:
    from PIL import Image
    import pdf2image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Optional import for OCR
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


# =============================================================================
# COCO Format Utilities for TATR
# =============================================================================

def normalize_bbox(bbox: List[int], width: int, height: int) -> List[int]:
    """
    Normalize bounding box to 0-1000 scale.

    Args:
        bbox: [x, y, w, h] in original image coordinates
        width: Original image width
        height: Original image height

    Returns:
        [x, y, w, h] normalized to 0-1000 scale
    """
    return [
        int(bbox[0] * 1000 / width),
        int(bbox[1] * 1000 / height),
        int(bbox[2] * 1000 / width),
        int(bbox[3] * 1000 / height)
    ]


def create_coco_dataset() -> Dict[str, Any]:
    """
    Create an empty COCO format dataset structure.

    Returns:
        COCO dataset dictionary with images, annotations, categories
    """
    return {
        'images': [],
        'annotations': [],
        'categories': [
            {'id': 1, 'name': 'table', 'supercategory': 'document'},
            {'id': 2, 'name': 'table_row', 'supercategory': 'table'}
        ]
    }


def add_image_to_coco(
    dataset: Dict[str, Any],
    image_id: int,
    file_name: str,
    width: int,
    height: int
) -> None:
    """
    Add an image entry to the COCO dataset.

    Args:
        dataset: COCO dataset dictionary
        image_id: Unique image ID
        file_name: Image filename
        width: Image width in pixels
        height: Image height in pixels
    """
    dataset['images'].append({
        'id': image_id,
        'file_name': file_name,
        'width': width,
        'height': height
    })


def add_annotation_to_coco(
    dataset: Dict[str, Any],
    annotation_id: int,
    image_id: int,
    category_id: int,
    bbox: List[int]
) -> None:
    """
    Add an annotation entry to the COCO dataset.

    Args:
        dataset: COCO dataset dictionary
        annotation_id: Unique annotation ID
        image_id: Image ID this annotation belongs to
        category_id: Category ID (1=table, 2=table_row)
        bbox: [x, y, width, height] bounding box
    """
    # Calculate area
    area = bbox[2] * bbox[3]

    dataset['annotations'].append({
        'id': annotation_id,
        'image_id': image_id,
        'category_id': category_id,
        'bbox': bbox,
        'area': area,
        'iscrowd': 0
    })


def extract_table_bbox(ground_truth: Dict[str, Any]) -> Optional[List[int]]:
    """
    Extract the bounding box that encompasses all line items (the table).

    Args:
        ground_truth: Ground truth data with line_items

    Returns:
        [x, y, width, height] or None if no valid line items
    """
    line_items = ground_truth.get('line_items', [])
    if not line_items:
        return None

    # Collect all valid bboxes
    valid_bboxes = []
    for item in line_items:
        bbox = item.get('bbox')
        if bbox and isinstance(bbox, dict):
            valid_bboxes.append(bbox)

    if not valid_bboxes:
        return None

    # Calculate encompassing bbox
    min_x = min(b['x'] for b in valid_bboxes)
    min_y = min(b['y'] for b in valid_bboxes)
    max_x = max(b['x'] + b['width'] for b in valid_bboxes)
    max_y = max(b['y'] + b['height'] for b in valid_bboxes)

    return [min_x, min_y, max_x - min_x, max_y - min_y]


def extract_row_bboxes(ground_truth: Dict[str, Any]) -> List[List[int]]:
    """
    Extract bounding boxes for each line item (table rows).

    Args:
        ground_truth: Ground truth data with line_items

    Returns:
        List of [x, y, width, height] bboxes
    """
    row_bboxes = []
    line_items = ground_truth.get('line_items', [])

    for item in line_items:
        bbox = item.get('bbox')
        if bbox and isinstance(bbox, dict):
            row_bboxes.append([
                bbox['x'],
                bbox['y'],
                bbox['width'],
                bbox['height']
            ])

    return row_bboxes


def pdf_to_image(pdf_path: str, dpi: int = 150) -> 'Image.Image':
    """
    Convert the first page of a PDF to a PIL Image.

    Args:
        pdf_path: Path to the PDF file
        dpi: Resolution for conversion

    Returns:
        PIL Image object
    """
    if not PIL_AVAILABLE:
        raise ImportError("pdf2image and PIL are required for PDF conversion")

    images = pdf2image.convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
    if images:
        # Convert to RGB if needed
        img = images[0]
        if img.mode != 'RGB':
            img = img.convert('RGB')
        return img
    raise ValueError(f"Could not convert PDF: {pdf_path}")


# =============================================================================
# LayoutLM Format Utilities
# =============================================================================

def get_label_list() -> List[str]:
    """
    Get the list of BIO labels for LayoutLM token classification.

    Returns:
        List of label strings in BIO format
    """
    # Define entity types for Mexican invoices
    entity_types = [
        'RFC_EMISOR',
        'RFC_RECEPTOR',
        'TOTAL',
        'SUBTOTAL',
        'IVA',
        'DATE',
        'INVOICE_NUMBER',
        'COMPANY_NAME',
    ]

    # Build BIO labels: O, B-*, I-* for each entity type
    labels = ['O']  # Outside tag first
    for entity in entity_types:
        labels.append(f'B-{entity}')
        labels.append(f'I-{entity}')

    return labels


def normalize_bbox_layoutlm(bbox: List[int], width: int, height: int) -> List[int]:
    """
    Normalize bounding box to 0-1000 scale for LayoutLM.

    Args:
        bbox: [x1, y1, x2, y2] in original image coordinates
        width: Original image width
        height: Original image height

    Returns:
        [x1, y1, x2, y2] normalized to 0-1000 scale
    """
    return [
        int(bbox[0] * 1000 / width),
        int(bbox[1] * 1000 / height),
        int(bbox[2] * 1000 / width),
        int(bbox[3] * 1000 / height)
    ]


def get_ocr_tokens(image: 'Image.Image') -> List[Dict[str, Any]]:
    """
    Extract tokens from image using OCR.

    Args:
        image: PIL Image object

    Returns:
        List of token dicts with 'text' and 'bbox' fields
    """
    if not TESSERACT_AVAILABLE:
        raise ImportError("pytesseract is required for OCR")

    # Get OCR data with bounding boxes
    ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    tokens = []
    n_boxes = len(ocr_data['text'])

    for i in range(n_boxes):
        text = ocr_data['text'][i].strip()
        if text:  # Only include non-empty tokens
            x = ocr_data['left'][i]
            y = ocr_data['top'][i]
            w = ocr_data['width'][i]
            h = ocr_data['height'][i]

            # Convert to [x1, y1, x2, y2] format
            bbox = [x, y, x + w, y + h]

            tokens.append({
                'text': text,
                'bbox': bbox
            })

    return tokens


def match_token_to_field(token_text: str, ground_truth: Dict[str, Any]) -> Optional[str]:
    """
    Match a token's text to a ground truth field.

    Args:
        token_text: The text of the token
        ground_truth: Ground truth data with 'fields' dict

    Returns:
        Field name (uppercase) or None if no match
    """
    fields = ground_truth.get('fields', {})

    # Define field name mappings
    field_mappings = {
        'rfc_emisor': 'RFC_EMISOR',
        'rfc_receptor': 'RFC_RECEPTOR',
        'total': 'TOTAL',
        'subtotal': 'SUBTOTAL',
        'iva': 'IVA',
        'date': 'DATE',
        'invoice_number': 'INVOICE_NUMBER',
        'company_name': 'COMPANY_NAME',
    }

    for field_key, label_name in field_mappings.items():
        if field_key in fields:
            field_value = fields[field_key]

            # Handle exact string match
            if isinstance(field_value, str) and field_value == token_text:
                return label_name

            # Handle numeric values - try various formats
            if isinstance(field_value, (int, float)):
                # Clean token text of formatting
                clean_token = token_text.replace(',', '').replace('$', '').strip()

                # Try exact match with formatted value
                formatted_values = [
                    str(field_value),
                    f"{field_value:.2f}",
                    f"{field_value:,.2f}",
                ]

                for fmt_val in formatted_values:
                    if clean_token == fmt_val or clean_token == fmt_val.replace(',', ''):
                        return label_name

    return None


def create_bio_tags(
    tokens: List[Dict[str, Any]],
    ground_truth: Dict[str, Any]
) -> List[str]:
    """
    Create BIO tags for a list of tokens based on ground truth.

    Args:
        tokens: List of token dicts with 'text' field
        ground_truth: Ground truth data with 'fields' dict

    Returns:
        List of BIO tag strings
    """
    tags = []
    prev_field = None

    for token in tokens:
        token_text = token.get('text', '')
        field = match_token_to_field(token_text, ground_truth)

        if field is None:
            tags.append('O')
            prev_field = None
        elif field == prev_field:
            # Continuation of previous entity
            tags.append(f'I-{field}')
        else:
            # Beginning of new entity
            tags.append(f'B-{field}')
            prev_field = field

    return tags


def create_layoutlm_sample(
    tokens: List[Dict[str, Any]],
    ground_truth: Dict[str, Any],
    image_path: str,
    image_width: int = 1000,
    image_height: int = 1000
) -> Dict[str, Any]:
    """
    Create a LayoutLM format sample.

    Args:
        tokens: List of token dicts with 'text' and 'bbox' fields
        ground_truth: Ground truth data
        image_path: Path to the image file
        image_width: Image width for bbox normalization
        image_height: Image height for bbox normalization

    Returns:
        Dict with tokens, bboxes, ner_tags, and image_path
    """
    # Get label list for converting tags to integers
    label_list = get_label_list()
    label_to_id = {label: idx for idx, label in enumerate(label_list)}

    # Extract token texts and bboxes
    token_texts = [t['text'] for t in tokens]
    bboxes = [normalize_bbox_layoutlm(t['bbox'], image_width, image_height) for t in tokens]

    # Create BIO tags and convert to integers
    bio_tags = create_bio_tags(tokens, ground_truth)
    ner_tags = [label_to_id.get(tag, 0) for tag in bio_tags]

    return {
        'tokens': token_texts,
        'bboxes': bboxes,
        'ner_tags': ner_tags,
        'image_path': image_path
    }


def create_argument_parser() -> argparse.ArgumentParser:
    """
    Create and configure the argument parser.

    Returns:
        Configured ArgumentParser instance
    """
    parser = argparse.ArgumentParser(
        description='Prepare invoice datasets for TATR and LayoutLM training',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        '--input-dir', '-i',
        type=str,
        default='../data/synthetic',
        help='Directory containing synthetic PDFs and labels'
    )

    parser.add_argument(
        '--output-dir', '-o',
        type=str,
        default='../data/formatted',
        help='Output directory for formatted datasets'
    )

    parser.add_argument(
        '--format', '-f',
        type=str,
        choices=['tatr', 'layoutlm', 'both'],
        default='both',
        help='Output format: tatr, layoutlm, or both'
    )

    parser.add_argument(
        '--seed', '-s',
        type=int,
        default=42,
        help='Random seed for reproducibility'
    )

    return parser


def validate_input_dir(input_dir: str) -> bool:
    """
    Validate that the input directory exists and has expected structure.

    Args:
        input_dir: Path to input directory

    Returns:
        True if valid, False otherwise
    """
    if not os.path.isdir(input_dir):
        return False

    # Check for expected subdirectories (not strictly required for basic validation)
    pdfs_dir = os.path.join(input_dir, 'pdfs')
    labels_dir = os.path.join(input_dir, 'labels')

    # For basic validation, just check if directory exists
    # More strict validation can check subdirectories
    return True


def prepare_output_dir(output_dir: str) -> None:
    """
    Create output directory if it doesn't exist.

    Args:
        output_dir: Path to output directory
    """
    os.makedirs(output_dir, exist_ok=True)


def format_tatr(input_dir: str, output_dir: str, seed: int = 42) -> Dict[str, Any]:
    """
    Convert data to TATR format (COCO format for table detection).

    Args:
        input_dir: Directory containing input PDFs and labels
        output_dir: Directory for output COCO format data
        seed: Random seed for reproducibility

    Returns:
        Statistics dict with processing results
    """
    # Create output directories
    tatr_output = os.path.join(output_dir, 'tatr')
    images_output = os.path.join(tatr_output, 'images')
    prepare_output_dir(tatr_output)
    prepare_output_dir(images_output)

    # Get input directories
    labels_dir = os.path.join(input_dir, 'labels')
    pdfs_dir = os.path.join(input_dir, 'pdfs')

    # Check if directories exist
    if not os.path.isdir(labels_dir) or not os.path.isdir(pdfs_dir):
        return {
            'status': 'error',
            'processed': 0,
            'message': 'Input directories not found'
        }

    # Check if pdf2image is available
    if not PIL_AVAILABLE:
        return {
            'status': 'error',
            'processed': 0,
            'message': 'pdf2image/PIL not available - install with: pip install pdf2image Pillow'
        }

    # Initialize COCO dataset
    coco_dataset = create_coco_dataset()

    # Get list of label files
    label_files = sorted([f for f in os.listdir(labels_dir) if f.endswith('.json')])

    processed = 0
    failed = 0
    annotation_id = 1

    for idx, label_file in enumerate(label_files):
        try:
            # Get matching PDF
            base_name = os.path.splitext(label_file)[0]
            pdf_file = base_name + '.pdf'
            pdf_path = os.path.join(pdfs_dir, pdf_file)

            if not os.path.exists(pdf_path):
                failed += 1
                continue

            # Load ground truth
            label_path = os.path.join(labels_dir, label_file)
            with open(label_path, 'r') as f:
                ground_truth = json.load(f)

            # Convert PDF to image
            image = pdf_to_image(pdf_path)
            img_width, img_height = image.size

            # Save image as PNG
            image_filename = base_name + '.png'
            image_path = os.path.join(images_output, image_filename)
            image.save(image_path, 'PNG')

            # Add image to COCO dataset
            image_id = idx + 1
            add_image_to_coco(coco_dataset, image_id, image_filename, img_width, img_height)

            # Extract and add table bbox annotation
            table_bbox = extract_table_bbox(ground_truth)
            if table_bbox:
                normalized_table = normalize_bbox(table_bbox, img_width, img_height)
                add_annotation_to_coco(coco_dataset, annotation_id, image_id, 1, normalized_table)
                annotation_id += 1

            # Extract and add row bbox annotations
            row_bboxes = extract_row_bboxes(ground_truth)
            for row_bbox in row_bboxes:
                normalized_row = normalize_bbox(row_bbox, img_width, img_height)
                add_annotation_to_coco(coco_dataset, annotation_id, image_id, 2, normalized_row)
                annotation_id += 1

            processed += 1

        except Exception as e:
            print(f"Error processing {label_file}: {e}", file=sys.stderr)
            failed += 1

    # Save COCO annotations
    annotations_path = os.path.join(tatr_output, 'annotations.json')
    with open(annotations_path, 'w') as f:
        json.dump(coco_dataset, f, indent=2)

    return {
        'status': 'success',
        'processed': processed,
        'failed': failed,
        'total_images': len(coco_dataset['images']),
        'total_annotations': len(coco_dataset['annotations']),
        'output_dir': tatr_output,
        'message': f'Processed {processed} invoices to COCO format'
    }


def format_layoutlm(input_dir: str, output_dir: str, seed: int = 42) -> Dict[str, Any]:
    """
    Convert data to LayoutLM format (BIO-tagged tokens).

    Args:
        input_dir: Directory containing input PDFs and labels
        output_dir: Directory for output LayoutLM format data
        seed: Random seed for reproducibility

    Returns:
        Statistics dict with processing results
    """
    # Create output directories
    layoutlm_output = os.path.join(output_dir, 'layoutlm')
    images_output = os.path.join(layoutlm_output, 'images')
    prepare_output_dir(layoutlm_output)
    prepare_output_dir(images_output)

    # Get input directories
    labels_dir = os.path.join(input_dir, 'labels')
    pdfs_dir = os.path.join(input_dir, 'pdfs')

    # Check if directories exist
    if not os.path.isdir(labels_dir) or not os.path.isdir(pdfs_dir):
        return {
            'status': 'error',
            'processed': 0,
            'message': 'Input directories not found'
        }

    # Check dependencies
    if not PIL_AVAILABLE:
        return {
            'status': 'error',
            'processed': 0,
            'message': 'pdf2image/PIL not available - install with: pip install pdf2image Pillow'
        }

    if not TESSERACT_AVAILABLE:
        return {
            'status': 'error',
            'processed': 0,
            'message': 'pytesseract not available - install with: pip install pytesseract'
        }

    # Get list of label files
    label_files = sorted([f for f in os.listdir(labels_dir) if f.endswith('.json')])

    samples = []
    processed = 0
    failed = 0

    for label_file in label_files:
        try:
            # Get matching PDF
            base_name = os.path.splitext(label_file)[0]
            pdf_file = base_name + '.pdf'
            pdf_path = os.path.join(pdfs_dir, pdf_file)

            if not os.path.exists(pdf_path):
                failed += 1
                continue

            # Load ground truth
            label_path = os.path.join(labels_dir, label_file)
            with open(label_path, 'r') as f:
                ground_truth = json.load(f)

            # Convert PDF to image
            image = pdf_to_image(pdf_path)
            img_width, img_height = image.size

            # Save image as PNG
            image_filename = base_name + '.png'
            image_path = os.path.join(images_output, image_filename)
            image.save(image_path, 'PNG')

            # Extract OCR tokens
            tokens = get_ocr_tokens(image)

            if tokens:
                # Create LayoutLM sample
                sample = create_layoutlm_sample(
                    tokens,
                    ground_truth,
                    image_filename,
                    img_width,
                    img_height
                )
                samples.append(sample)

            processed += 1

        except Exception as e:
            print(f"Error processing {label_file}: {e}", file=sys.stderr)
            failed += 1

    # Save samples JSON
    samples_path = os.path.join(layoutlm_output, 'samples.json')
    with open(samples_path, 'w') as f:
        json.dump(samples, f, indent=2)

    # Save labels JSON
    labels_path = os.path.join(layoutlm_output, 'labels.json')
    label_list = get_label_list()
    with open(labels_path, 'w') as f:
        json.dump(label_list, f, indent=2)

    return {
        'status': 'success',
        'processed': processed,
        'failed': failed,
        'total_samples': len(samples),
        'output_dir': layoutlm_output,
        'message': f'Processed {processed} invoices to LayoutLM format'
    }


def main() -> int:
    """
    Main entry point for the dataset preparation script.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    parser = create_argument_parser()
    args = parser.parse_args()

    print(f"Preparing datasets...")
    print(f"  Input directory: {args.input_dir}")
    print(f"  Output directory: {args.output_dir}")
    print(f"  Format: {args.format}")
    print(f"  Seed: {args.seed}")

    # Validate input directory
    if not validate_input_dir(args.input_dir):
        print(f"Error: Input directory '{args.input_dir}' does not exist", file=sys.stderr)
        return 1

    # Prepare output directory
    prepare_output_dir(args.output_dir)

    results = {}

    # Process based on format option
    if args.format in ('tatr', 'both'):
        print("\nFormatting for TATR (Table Transformer)...")
        results['tatr'] = format_tatr(args.input_dir, args.output_dir, args.seed)
        print(f"  Status: {results['tatr']['status']}")
        print(f"  Message: {results['tatr']['message']}")

    if args.format in ('layoutlm', 'both'):
        print("\nFormatting for LayoutLM...")
        results['layoutlm'] = format_layoutlm(args.input_dir, args.output_dir, args.seed)
        print(f"  Status: {results['layoutlm']['status']}")
        print(f"  Message: {results['layoutlm']['message']}")

    print("\nDataset preparation complete!")

    return 0


if __name__ == '__main__':
    sys.exit(main())
