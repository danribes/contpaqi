#!/usr/bin/env python3
"""
Mexican Data Generator for Contpaqi AI Bridge

Provides functions for generating realistic Mexican business data including:
- RFC (Registro Federal de Contribuyentes) generation and validation
- Company data with Mexican locale
- Address formatting

This module uses Faker with the es_MX (Mexican Spanish) locale.
"""

import random
import re
from typing import Dict, Tuple, Any, Optional

try:
    from faker import Faker
    FAKER_AVAILABLE = True
except ImportError:
    FAKER_AVAILABLE = False
    Faker = None


# RFC validation pattern
# Format: 4 letters + 6 digits (YYMMDD) + 3 alphanumeric (homoclave)
RFC_PATTERN = re.compile(r'^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$')

# RFC pattern for companies (3 letters instead of 4)
RFC_MORAL_PATTERN = re.compile(r'^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$')


def get_faker(seed: Optional[int] = None) -> 'Faker':
    """
    Get a Faker instance configured for Mexican locale.

    Args:
        seed: Optional seed for reproducibility

    Returns:
        Faker instance with es_MX locale

    Raises:
        ImportError: If faker is not installed
    """
    if not FAKER_AVAILABLE:
        raise ImportError(
            "Faker is not installed. Run: pip install faker"
        )

    fake = Faker('es_MX')

    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    return fake


def generate_rfc(fake: 'Faker', persona_moral: bool = False) -> str:
    """
    Generate a valid Mexican RFC (Registro Federal de Contribuyentes).

    The RFC format is:
    - Personas físicas (individuals): 4 letters + 6 digits + 3 alphanumeric = 13 chars
    - Personas morales (companies): 3 letters + 6 digits + 3 alphanumeric = 12 chars

    Args:
        fake: Faker instance for generating random data
        persona_moral: If True, generate RFC for company (3 letters)

    Returns:
        A valid RFC string

    Example:
        >>> fake = get_faker(seed=42)
        >>> generate_rfc(fake)
        'XAXX850101ABC'
    """
    # Number of initial letters (4 for individuals, 3 for companies)
    num_letters = 3 if persona_moral else 4

    # Generate initial letters (from name/company initials)
    # Using only basic uppercase letters (no Ñ for simplicity in generation)
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=num_letters))

    # Generate date part (YYMMDD)
    # For individuals: birth date
    # For companies: constitution date
    if persona_moral:
        # Companies: use date within last 50 years
        date = fake.date_between(start_date='-50y', end_date='-1y')
    else:
        # Individuals: use birth date (18-80 years old)
        date = fake.date_of_birth(minimum_age=18, maximum_age=80)

    date_str = date.strftime('%y%m%d')

    # Generate homoclave (3 alphanumeric characters)
    # In real RFCs, this is calculated by SAT, but we generate randomly
    homoclave = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=3))

    return f"{letters}{date_str}{homoclave}"


def validate_rfc(rfc: str) -> Tuple[bool, str]:
    """
    Validate a Mexican RFC format.

    Args:
        rfc: The RFC string to validate

    Returns:
        Tuple of (is_valid, error_message)
        If valid, error_message is empty string

    Example:
        >>> validate_rfc("XAXX010101ABC")
        (True, "")
        >>> validate_rfc("invalid")
        (False, "RFC must be 12 or 13 characters")
    """
    if not rfc:
        return False, "RFC cannot be empty"

    rfc = rfc.upper().strip()

    # Check length (12 for companies, 13 for individuals)
    if len(rfc) not in (12, 13):
        return False, f"RFC must be 12 or 13 characters, got {len(rfc)}"

    # Check format based on length
    if len(rfc) == 13:
        # Persona física (individual)
        if not RFC_PATTERN.match(rfc):
            return False, "RFC format invalid: expected 4 letters + 6 digits + 3 alphanumeric"
    else:
        # Persona moral (company)
        if not RFC_MORAL_PATTERN.match(rfc):
            return False, "RFC format invalid: expected 3 letters + 6 digits + 3 alphanumeric"

    # Validate date part
    date_str = rfc[4:10] if len(rfc) == 13 else rfc[3:9]
    try:
        year = int(date_str[0:2])
        month = int(date_str[2:4])
        day = int(date_str[4:6])

        # Basic date validation
        if not (1 <= month <= 12):
            return False, f"Invalid month in RFC date: {month}"
        if not (1 <= day <= 31):
            return False, f"Invalid day in RFC date: {day}"

    except ValueError:
        return False, "Invalid date format in RFC"

    return True, ""


def generate_company(fake: 'Faker') -> Dict[str, Any]:
    """
    Generate a complete Mexican company profile.

    Args:
        fake: Faker instance configured for Mexican locale

    Returns:
        Dictionary with company data:
        - name: Company name
        - rfc: Valid RFC
        - address: Full address
        - phone: Phone number
        - email: Email address
    """
    # Generate company name
    name = fake.company()

    # Generate RFC for company (persona moral)
    # Using persona física format for simplicity (most common in invoices)
    rfc = generate_rfc(fake, persona_moral=False)

    # Generate address
    address = fake.address().replace('\n', ', ')

    # Generate contact info
    phone = fake.phone_number()
    email = fake.company_email()

    return {
        'name': name,
        'rfc': rfc,
        'address': address,
        'phone': phone,
        'email': email
    }


def generate_person(fake: 'Faker') -> Dict[str, Any]:
    """
    Generate a complete Mexican person profile.

    Args:
        fake: Faker instance configured for Mexican locale

    Returns:
        Dictionary with person data:
        - name: Full name
        - rfc: Valid RFC
        - address: Full address
        - curp: CURP (optional, may be None)
    """
    name = fake.name()
    rfc = generate_rfc(fake, persona_moral=False)
    address = fake.address().replace('\n', ', ')

    return {
        'name': name,
        'rfc': rfc,
        'address': address,
        'curp': None  # CURP generation not implemented yet
    }


def format_currency(amount: float, currency: str = 'MXN') -> str:
    """
    Format a number as Mexican currency.

    Args:
        amount: The amount to format
        currency: Currency code (default: MXN)

    Returns:
        Formatted currency string

    Example:
        >>> format_currency(1234.56)
        '$1,234.56 MXN'
    """
    return f"${amount:,.2f} {currency}"


def generate_folio() -> str:
    """
    Generate an invoice folio number.

    Returns:
        A unique folio string (8 uppercase alphanumeric characters)
    """
    return ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=8))


# Common Mexican business suffixes
MEXICAN_COMPANY_SUFFIXES = [
    'S.A. de C.V.',
    'S. de R.L. de C.V.',
    'S.A.P.I. de C.V.',
    'S.C.',
    'A.C.',
]


def add_mexican_suffix(company_name: str) -> str:
    """
    Add a random Mexican company legal suffix if not present.

    Args:
        company_name: Base company name

    Returns:
        Company name with legal suffix
    """
    # Check if already has a suffix
    for suffix in MEXICAN_COMPANY_SUFFIXES:
        if suffix in company_name:
            return company_name

    # Add random suffix
    suffix = random.choice(MEXICAN_COMPANY_SUFFIXES)
    return f"{company_name} {suffix}"


if __name__ == '__main__':
    # Demo usage
    fake = get_faker(seed=42)

    print("=== Mexican Data Generator Demo ===\n")

    print("Generated Company:")
    company = generate_company(fake)
    for key, value in company.items():
        print(f"  {key}: {value}")

    print("\nGenerated Person:")
    person = generate_person(fake)
    for key, value in person.items():
        print(f"  {key}: {value}")

    print("\nRFC Validation Examples:")
    test_rfcs = ["XAXX010101ABC", "invalid", "ABC010101XY", ""]
    for rfc in test_rfcs:
        is_valid, error = validate_rfc(rfc)
        status = "✓ Valid" if is_valid else f"✗ Invalid: {error}"
        print(f"  '{rfc}': {status}")
