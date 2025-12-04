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

    This is a stub that will be fully implemented in subtask 3.3.

    Args:
        input_dir: Directory containing input PDFs and labels
        output_dir: Directory for output LayoutLM format data
        seed: Random seed for reproducibility

    Returns:
        Statistics dict with processing results
    """
    # Create output directory
    layoutlm_output = os.path.join(output_dir, 'layoutlm')
    prepare_output_dir(layoutlm_output)

    # Count available files
    labels_dir = os.path.join(input_dir, 'labels')
    pdfs_dir = os.path.join(input_dir, 'pdfs')

    num_labels = 0
    num_pdfs = 0

    if os.path.isdir(labels_dir):
        num_labels = len([f for f in os.listdir(labels_dir) if f.endswith('.json')])
    if os.path.isdir(pdfs_dir):
        num_pdfs = len([f for f in os.listdir(pdfs_dir) if f.endswith('.pdf')])

    # Stub: actual LayoutLM conversion will be in subtask 3.3
    return {
        'status': 'stub',
        'processed': 0,
        'available_labels': num_labels,
        'available_pdfs': num_pdfs,
        'output_dir': layoutlm_output,
        'message': 'LayoutLM formatting will be implemented in subtask 3.3'
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
