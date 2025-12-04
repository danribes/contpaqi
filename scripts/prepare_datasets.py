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

    This is a stub that will be fully implemented in subtask 3.2.

    Args:
        input_dir: Directory containing input PDFs and labels
        output_dir: Directory for output COCO format data
        seed: Random seed for reproducibility

    Returns:
        Statistics dict with processing results
    """
    # Create output directory
    tatr_output = os.path.join(output_dir, 'tatr')
    prepare_output_dir(tatr_output)

    # Count available files
    labels_dir = os.path.join(input_dir, 'labels')
    pdfs_dir = os.path.join(input_dir, 'pdfs')

    num_labels = 0
    num_pdfs = 0

    if os.path.isdir(labels_dir):
        num_labels = len([f for f in os.listdir(labels_dir) if f.endswith('.json')])
    if os.path.isdir(pdfs_dir):
        num_pdfs = len([f for f in os.listdir(pdfs_dir) if f.endswith('.pdf')])

    # Stub: actual COCO conversion will be in subtask 3.2
    return {
        'status': 'stub',
        'processed': 0,
        'available_labels': num_labels,
        'available_pdfs': num_pdfs,
        'output_dir': tatr_output,
        'message': 'TATR formatting will be implemented in subtask 3.2'
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
