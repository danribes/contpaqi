#!/usr/bin/env python3
"""
Ground Truth Generator for Invoice OCR Training Data

This module creates JSON sidecar files containing ground truth labels
for invoice images. These labels pair field values with their bounding
boxes for use in OCR model training.

The output format follows a structured schema with:
- fields: Dictionary of invoice fields (RFC, dates, totals, etc.)
- line_items: List of invoice line items with their data
- metadata: Format version and additional info
"""

import json
import os
from typing import Dict, List, Optional, Any


# Current format version
FORMAT_VERSION = "1.0"


def create_ground_truth(
    invoice_data: Dict[str, Any],
    bboxes: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create a ground truth data structure from invoice data and bounding boxes.

    Args:
        invoice_data: Dictionary containing invoice field values
        bboxes: Dictionary containing bounding boxes for each field

    Returns:
        Ground truth dictionary with fields, line_items, and metadata sections
    """
    # Build fields section
    fields = {
        'rfc_emisor': {
            'value': invoice_data['emisor']['rfc'],
            'bbox': bboxes.get('rfc_emisor')
        },
        'rfc_receptor': {
            'value': invoice_data['receptor']['rfc'],
            'bbox': bboxes.get('rfc_receptor')
        },
        'date': {
            'value': invoice_data['date'],
            'bbox': bboxes.get('date')
        },
        'folio': {
            'value': invoice_data['folio'],
            'bbox': bboxes.get('folio')
        },
        'subtotal': {
            'value': invoice_data['subtotal'],
            'bbox': bboxes.get('subtotal')
        },
        'iva': {
            'value': invoice_data['iva'],
            'bbox': bboxes.get('iva')
        },
        'total': {
            'value': invoice_data['total'],
            'bbox': bboxes.get('total')
        },
    }

    # Add optional fields if available
    if bboxes.get('emisor_name'):
        fields['emisor_name'] = {
            'value': invoice_data['emisor']['name'],
            'bbox': bboxes.get('emisor_name')
        }

    if bboxes.get('receptor_name'):
        fields['receptor_name'] = {
            'value': invoice_data['receptor']['name'],
            'bbox': bboxes.get('receptor_name')
        }

    # Build line items section
    line_items = []
    invoice_items = invoice_data.get('items', [])
    item_bboxes = bboxes.get('items', [])

    for i, item in enumerate(invoice_items):
        item_bbox = item_bboxes[i] if i < len(item_bboxes) else None
        line_items.append({
            'description': item['description'],
            'quantity': item['quantity'],
            'unit_price': item['unit_price'],
            'amount': item['amount'],
            'bbox': item_bbox
        })

    # Build metadata section
    metadata = {
        'version': FORMAT_VERSION,
        'currency': invoice_data.get('currency', 'MXN'),
    }

    return {
        'fields': fields,
        'line_items': line_items,
        'metadata': metadata
    }


def save_ground_truth(
    invoice_data: Dict[str, Any],
    bboxes: Dict[str, Any],
    output_path: str
) -> None:
    """
    Save ground truth labels to a JSON file.

    Args:
        invoice_data: Dictionary containing invoice field values
        bboxes: Dictionary containing bounding boxes for each field
        output_path: Path to save the JSON file
    """
    # Create ground truth structure
    ground_truth = create_ground_truth(invoice_data, bboxes)

    # Ensure parent directories exist
    parent_dir = os.path.dirname(output_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)

    # Write JSON file with nice formatting
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, indent=2, ensure_ascii=False)


def load_ground_truth(path: str) -> Dict[str, Any]:
    """
    Load ground truth labels from a JSON file.

    Args:
        path: Path to the JSON file

    Returns:
        Ground truth dictionary

    Raises:
        FileNotFoundError: If the file does not exist
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Ground truth file not found: {path}")

    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def create_sidecar_path(image_path: str) -> str:
    """
    Create the sidecar JSON path for an image file.

    Args:
        image_path: Path to the image file (e.g., 'invoice_001.png')

    Returns:
        Path for the sidecar JSON file (e.g., 'invoice_001.json')
    """
    base_path = os.path.splitext(image_path)[0]
    return f"{base_path}.json"


if __name__ == '__main__':
    # Demo usage
    print("=== Ground Truth Generator Demo ===\n")

    # Sample invoice data
    demo_invoice = {
        'emisor': {
            'name': 'Empresa Demo S.A. de C.V.',
            'rfc': 'DEMO010101XXX',
            'address': 'Calle Principal 100, CDMX'
        },
        'receptor': {
            'name': 'Cliente Ejemplo S. de R.L.',
            'rfc': 'CLTE020202YYY',
            'address': 'Av. Reforma 200, Monterrey'
        },
        'date': '2024-03-15',
        'folio': 'DEMO-0001',
        'items': [
            {
                'description': 'Servicio de consultoría',
                'quantity': 10,
                'unit_price': 1500.00,
                'amount': 15000.00
            },
            {
                'description': 'Materiales',
                'quantity': 5,
                'unit_price': 200.00,
                'amount': 1000.00
            }
        ],
        'subtotal': 16000.00,
        'iva': 2560.00,
        'total': 18560.00,
        'currency': 'MXN'
    }

    # Sample bounding boxes (would come from OCR in real usage)
    demo_bboxes = {
        'rfc_emisor': {'x': 100, 'y': 150, 'width': 130, 'height': 25},
        'rfc_receptor': {'x': 100, 'y': 200, 'width': 130, 'height': 25},
        'date': {'x': 400, 'y': 50, 'width': 100, 'height': 25},
        'folio': {'x': 300, 'y': 50, 'width': 80, 'height': 25},
        'subtotal': {'x': 450, 'y': 400, 'width': 90, 'height': 25},
        'iva': {'x': 450, 'y': 430, 'width': 80, 'height': 25},
        'total': {'x': 450, 'y': 460, 'width': 100, 'height': 25},
        'items': [
            {'x': 50, 'y': 300, 'width': 500, 'height': 25},
            {'x': 50, 'y': 330, 'width': 500, 'height': 25}
        ]
    }

    # Create ground truth
    gt = create_ground_truth(demo_invoice, demo_bboxes)

    print("Ground Truth Structure:")
    print(json.dumps(gt, indent=2, ensure_ascii=False))

    print("\n--- Fields ---")
    for name, data in gt['fields'].items():
        print(f"  {name}: {data['value']}")

    print("\n--- Line Items ---")
    for i, item in enumerate(gt['line_items']):
        print(f"  {i+1}. {item['description']}: ${item['amount']:,.2f}")

    print(f"\n--- Metadata ---")
    print(f"  Version: {gt['metadata']['version']}")
    print(f"  Currency: {gt['metadata']['currency']}")
