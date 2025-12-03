#!/usr/bin/env python3
"""
Synthetic Invoice Generator for Contpaqi AI Bridge

Generates thousands of unique PDF invoices with corresponding ground truth
JSON labels for training AI models.

Usage:
    python generate_invoices.py --num-samples 5000 --output-dir ../data/synthetic
"""

import argparse
import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# These imports will be available after installing requirements.txt
try:
    from faker import Faker
    from jinja2 import Environment, FileSystemLoader
    from tqdm import tqdm
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False


def generate_rfc(fake: 'Faker') -> str:
    """
    Generate a valid Mexican RFC (Registro Federal de Contribuyentes).

    Format: 4 letters + 6 digits (date YYMMDD) + 3 alphanumeric (homoclave)
    Example: XAXX010101ABC

    Args:
        fake: Faker instance for generating random data

    Returns:
        A valid RFC string
    """
    # First 4 letters (from name initials for personas físicas)
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=4))

    # 6 digits representing birth/constitution date (YYMMDD)
    birth_date = fake.date_of_birth(minimum_age=18, maximum_age=80)
    date_str = birth_date.strftime('%y%m%d')

    # 3 alphanumeric characters (homoclave)
    homoclave = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=3))

    return f"{letters}{date_str}{homoclave}"


def generate_invoice_data(fake: 'Faker') -> Dict[str, Any]:
    """
    Generate random invoice data.

    Args:
        fake: Faker instance configured for Mexican locale

    Returns:
        Dictionary containing all invoice fields
    """
    # Generate random number of line items (1-10)
    num_items = random.randint(1, 10)
    items = []

    for _ in range(num_items):
        qty = random.randint(1, 100)
        unit_price = round(random.uniform(10.0, 5000.0), 2)
        amount = round(qty * unit_price, 2)

        items.append({
            'description': fake.catch_phrase(),
            'quantity': qty,
            'unit_price': unit_price,
            'amount': amount
        })

    # Calculate totals
    subtotal = sum(item['amount'] for item in items)
    iva = round(subtotal * 0.16, 2)  # 16% IVA in Mexico
    total = round(subtotal + iva, 2)

    return {
        'emisor': {
            'name': fake.company(),
            'rfc': generate_rfc(fake),
            'address': fake.address().replace('\n', ', ')
        },
        'receptor': {
            'name': fake.company(),
            'rfc': generate_rfc(fake),
            'address': fake.address().replace('\n', ', ')
        },
        'folio': fake.uuid4()[:8].upper(),
        'date': fake.date_between(start_date='-2y', end_date='today').isoformat(),
        'items': items,
        'subtotal': subtotal,
        'iva': iva,
        'total': total,
        'currency': 'MXN'
    }


def render_invoice_pdf(
    template_path: str,
    invoice_data: Dict[str, Any],
    output_path: str
) -> bool:
    """
    Render an invoice to PDF using a Jinja2 template.

    Args:
        template_path: Path to the HTML template
        invoice_data: Dictionary with invoice data
        output_path: Path where the PDF will be saved

    Returns:
        True if successful, False otherwise
    """
    try:
        from weasyprint import HTML

        # Load and render template
        template_dir = os.path.dirname(template_path)
        template_name = os.path.basename(template_path)

        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template(template_name)

        html_content = template.render(**invoice_data)

        # Generate PDF
        HTML(string=html_content).write_pdf(output_path)
        return True

    except Exception as e:
        print(f"Error rendering PDF: {e}", file=sys.stderr)
        return False


def save_ground_truth(
    invoice_data: Dict[str, Any],
    bboxes: Optional[Dict[str, Any]],
    output_path: str
) -> None:
    """
    Save ground truth labels as JSON.

    Args:
        invoice_data: The invoice data used to generate the PDF
        bboxes: Bounding boxes for each field (optional, calculated later)
        output_path: Path where the JSON will be saved
    """
    ground_truth = {
        'fields': {
            'rfc_emisor': invoice_data['emisor']['rfc'],
            'rfc_receptor': invoice_data['receptor']['rfc'],
            'date': invoice_data['date'],
            'folio': invoice_data['folio'],
            'subtotal': invoice_data['subtotal'],
            'iva': invoice_data['iva'],
            'total': invoice_data['total'],
            'currency': invoice_data['currency']
        },
        'line_items': invoice_data['items'],
        'bboxes': bboxes or {}
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, indent=2, ensure_ascii=False)


def get_available_templates(templates_dir: str) -> List[str]:
    """
    Get list of available invoice templates.

    Args:
        templates_dir: Directory containing HTML templates

    Returns:
        List of template file paths
    """
    templates = []
    if os.path.isdir(templates_dir):
        for f in os.listdir(templates_dir):
            if f.endswith('.html'):
                templates.append(os.path.join(templates_dir, f))
    return templates


def generate_dataset(
    num_samples: int,
    output_dir: str,
    templates_dir: str
) -> Dict[str, int]:
    """
    Generate a complete dataset of synthetic invoices.

    Args:
        num_samples: Number of invoice samples to generate
        output_dir: Base directory for output
        templates_dir: Directory containing HTML templates

    Returns:
        Statistics about the generation process
    """
    if not DEPENDENCIES_AVAILABLE:
        print("Error: Required dependencies not installed.", file=sys.stderr)
        print("Run: pip install -r requirements.txt", file=sys.stderr)
        return {'generated': 0, 'failed': num_samples}

    # Initialize Faker with Mexican locale
    fake = Faker('es_MX')
    Faker.seed(42)  # For reproducibility
    random.seed(42)

    # Create output directories
    pdfs_dir = os.path.join(output_dir, 'pdfs')
    labels_dir = os.path.join(output_dir, 'labels')
    os.makedirs(pdfs_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)

    # Get templates
    templates = get_available_templates(templates_dir)
    if not templates:
        print(f"Warning: No templates found in {templates_dir}", file=sys.stderr)
        print("Creating placeholder invoices without PDF rendering.", file=sys.stderr)

    stats = {'generated': 0, 'failed': 0}

    # Generate invoices
    for i in tqdm(range(num_samples), desc="Generating invoices"):
        invoice_data = generate_invoice_data(fake)

        pdf_path = os.path.join(pdfs_dir, f'invoice_{i:05d}.pdf')
        json_path = os.path.join(labels_dir, f'invoice_{i:05d}.json')

        # Render PDF if templates available
        if templates:
            template = random.choice(templates)
            success = render_invoice_pdf(template, invoice_data, pdf_path)
            if not success:
                stats['failed'] += 1
                continue

        # Save ground truth (always)
        save_ground_truth(invoice_data, None, json_path)
        stats['generated'] += 1

    return stats


def main() -> int:
    """
    Main entry point for the invoice generator.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    parser = argparse.ArgumentParser(
        description='Generate synthetic invoices for AI training',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        '--num-samples', '-n',
        type=int,
        default=100,
        help='Number of invoice samples to generate'
    )

    parser.add_argument(
        '--output-dir', '-o',
        type=str,
        default='../data/synthetic',
        help='Output directory for generated files'
    )

    parser.add_argument(
        '--templates-dir', '-t',
        type=str,
        default='templates',
        help='Directory containing HTML invoice templates'
    )

    parser.add_argument(
        '--seed', '-s',
        type=int,
        default=42,
        help='Random seed for reproducibility'
    )

    args = parser.parse_args()

    # Set seeds
    random.seed(args.seed)

    print(f"Generating {args.num_samples} synthetic invoices...")
    print(f"Output directory: {args.output_dir}")
    print(f"Templates directory: {args.templates_dir}")

    stats = generate_dataset(
        num_samples=args.num_samples,
        output_dir=args.output_dir,
        templates_dir=args.templates_dir
    )

    print(f"\nGeneration complete!")
    print(f"  Generated: {stats['generated']}")
    print(f"  Failed: {stats['failed']}")

    return 0 if stats['failed'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
