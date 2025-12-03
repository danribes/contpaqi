#!/usr/bin/env python3
"""
Invoice Data Generator for Contpaqi AI Bridge

Provides functions for generating complete, randomized invoice data
suitable for rendering with HTML templates.

This module builds on mexican_data.py to create realistic Mexican invoices.
"""

import random
from datetime import date, timedelta
from typing import Dict, List, Any, Optional

from mexican_data import (
    get_faker,
    generate_rfc,
    generate_company,
    add_mexican_suffix,
    generate_folio,
)


# Product/service descriptions for invoice items
PRODUCT_DESCRIPTIONS = [
    # Services
    "Servicio de consultoría profesional",
    "Servicio de mantenimiento preventivo",
    "Servicio de soporte técnico",
    "Servicio de capacitación",
    "Servicio de auditoría",
    "Servicio de diseño gráfico",
    "Servicio de desarrollo de software",
    "Servicio de instalación",
    "Servicio de reparación",
    "Servicio de limpieza industrial",
    "Servicio de transporte de carga",
    "Servicio de mensajería",
    "Servicio de hospedaje web",
    "Servicio de marketing digital",
    "Servicio de contabilidad",
    # Products
    "Material de oficina",
    "Equipo de cómputo",
    "Licencia de software",
    "Papelería y consumibles",
    "Mobiliario de oficina",
    "Equipo de seguridad",
    "Herramientas industriales",
    "Refacciones y componentes",
    "Materiales de construcción",
    "Productos de limpieza",
    "Equipo de telecomunicaciones",
    "Uniformes corporativos",
    "Material publicitario",
    "Equipo médico",
    "Artículos promocionales",
]

# Additional descriptions for variety
ADJECTIVES = [
    "Premium", "Básico", "Especializado", "Profesional",
    "Estándar", "Avanzado", "Industrial", "Comercial",
]

MONTHS_SPANISH = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]


def generate_item_description(fake) -> str:
    """
    Generate a realistic product/service description.

    Args:
        fake: Faker instance

    Returns:
        Product or service description string
    """
    # 70% chance to use predefined descriptions
    if random.random() < 0.7:
        description = random.choice(PRODUCT_DESCRIPTIONS)
        # 30% chance to add adjective
        if random.random() < 0.3:
            adj = random.choice(ADJECTIVES)
            description = f"{description} - {adj}"
    else:
        # Use Faker to generate catch phrase or job
        if random.random() < 0.5:
            description = f"Servicio de {fake.job().lower()}"
        else:
            description = fake.catch_phrase() if hasattr(fake, 'catch_phrase') else fake.bs()

    return description


def generate_line_items(fake, num_items: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Generate a list of invoice line items.

    Args:
        fake: Faker instance
        num_items: Number of items (random 1-10 if not specified)

    Returns:
        List of item dictionaries with description, quantity, unit_price, amount
    """
    if num_items is None:
        num_items = random.randint(1, 10)

    items = []

    for _ in range(num_items):
        # Generate quantity (typically 1-100, occasionally higher)
        if random.random() < 0.8:
            quantity = random.randint(1, 20)
        else:
            quantity = random.randint(21, 100)

        # Generate unit price (varied distribution)
        price_tier = random.random()
        if price_tier < 0.3:
            # Low-cost items (10-500)
            unit_price = round(random.uniform(10, 500), 2)
        elif price_tier < 0.7:
            # Medium-cost items (500-5000)
            unit_price = round(random.uniform(500, 5000), 2)
        else:
            # High-cost items (5000-50000)
            unit_price = round(random.uniform(5000, 50000), 2)

        # Calculate amount
        amount = round(quantity * unit_price, 2)

        items.append({
            'description': generate_item_description(fake),
            'quantity': quantity,
            'unit_price': unit_price,
            'amount': amount,
        })

    return items


def generate_invoice_data(seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Generate complete invoice data with randomized Mexican business information.

    This function creates a complete invoice structure suitable for rendering
    with HTML templates. All data is generated using the Mexican locale.

    Args:
        seed: Optional seed for reproducibility. If provided, the same seed
              will generate the same invoice data.

    Returns:
        Dictionary containing complete invoice data:
        - emisor: Issuer company data (name, rfc, address)
        - receptor: Recipient company data (name, rfc, address)
        - date: Invoice date (string in YYYY-MM-DD format)
        - folio: Unique invoice number
        - items: List of line items
        - subtotal: Sum of all item amounts
        - iva: IVA tax amount (16% of subtotal)
        - total: Grand total (subtotal + iva)
        - currency: Currency code (MXN)

    Example:
        >>> invoice = generate_invoice_data(seed=42)
        >>> print(invoice['total'])
        45678.90
    """
    # Initialize Faker with Mexican locale
    fake = get_faker(seed=seed)

    # Reset random seed if provided (for full reproducibility)
    if seed is not None:
        random.seed(seed)

    # Generate emisor (issuer) company
    emisor_company = generate_company(fake)
    emisor = {
        'name': add_mexican_suffix(emisor_company['name']),
        'rfc': emisor_company['rfc'],
        'address': emisor_company['address'],
    }

    # Generate receptor (recipient) company
    receptor_company = generate_company(fake)
    receptor = {
        'name': add_mexican_suffix(receptor_company['name']),
        'rfc': receptor_company['rfc'],
        'address': receptor_company['address'],
    }

    # Generate date (within last 2 years)
    days_ago = random.randint(0, 730)  # Up to 2 years ago
    invoice_date = date.today() - timedelta(days=days_ago)
    date_str = invoice_date.strftime('%Y-%m-%d')

    # Generate folio
    folio = generate_folio()

    # Generate line items
    items = generate_line_items(fake)

    # Calculate totals
    subtotal = round(sum(item['amount'] for item in items), 2)
    iva = round(subtotal * 0.16, 2)  # 16% IVA
    total = round(subtotal + iva, 2)

    # Currency (predominantly MXN)
    currency = 'MXN'
    if random.random() < 0.05:  # 5% chance of USD
        currency = 'USD'

    return {
        'emisor': emisor,
        'receptor': receptor,
        'date': date_str,
        'folio': folio,
        'items': items,
        'subtotal': subtotal,
        'iva': iva,
        'total': total,
        'currency': currency,
    }


def generate_batch_invoices(
    count: int,
    seed: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Generate multiple invoices in batch.

    Args:
        count: Number of invoices to generate
        seed: Optional starting seed (each invoice gets seed+i)

    Returns:
        List of invoice dictionaries
    """
    invoices = []

    for i in range(count):
        invoice_seed = (seed + i) if seed is not None else None
        invoices.append(generate_invoice_data(seed=invoice_seed))

    return invoices


def format_invoice_for_template(invoice: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format invoice data for direct use in Jinja2 templates.

    This ensures all data is in the correct format for template rendering.

    Args:
        invoice: Raw invoice data from generate_invoice_data()

    Returns:
        Formatted invoice ready for template rendering
    """
    # Make a copy to avoid modifying original
    formatted = invoice.copy()

    # Ensure date is string
    if isinstance(formatted['date'], date):
        formatted['date'] = formatted['date'].strftime('%Y-%m-%d')

    # Format date for display (Spanish format)
    try:
        d = date.fromisoformat(formatted['date'])
        formatted['date_display'] = f"{d.day} de {MONTHS_SPANISH[d.month-1]} de {d.year}"
    except (ValueError, IndexError):
        formatted['date_display'] = formatted['date']

    return formatted


if __name__ == '__main__':
    # Demo usage
    print("=== Invoice Data Generator Demo ===\n")

    # Generate a sample invoice
    invoice = generate_invoice_data(seed=42)

    print(f"Folio: {invoice['folio']}")
    print(f"Date: {invoice['date']}")
    print(f"Currency: {invoice['currency']}")
    print()

    print("EMISOR:")
    print(f"  Name: {invoice['emisor']['name']}")
    print(f"  RFC: {invoice['emisor']['rfc']}")
    print(f"  Address: {invoice['emisor']['address']}")
    print()

    print("RECEPTOR:")
    print(f"  Name: {invoice['receptor']['name']}")
    print(f"  RFC: {invoice['receptor']['rfc']}")
    print(f"  Address: {invoice['receptor']['address']}")
    print()

    print("ITEMS:")
    for i, item in enumerate(invoice['items'], 1):
        print(f"  {i}. {item['description']}")
        print(f"     Qty: {item['quantity']} x ${item['unit_price']:,.2f} = ${item['amount']:,.2f}")
    print()

    print("TOTALS:")
    print(f"  Subtotal: ${invoice['subtotal']:,.2f}")
    print(f"  IVA (16%): ${invoice['iva']:,.2f}")
    print(f"  Total: ${invoice['total']:,.2f} {invoice['currency']}")
