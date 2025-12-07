"""
Validators for Mexican invoice data.

Provides validation functions for RFC (Registro Federal de Contribuyentes)
and math verification for Mexican invoice-specific data formats.
"""
import re
from typing import Tuple, List, Dict, Any, Optional

# RFC Pattern for Mexican tax IDs
# Format: 3-4 letters (personas físicas have 4, morales have 3)
#         + 6 digits (birth/constitution date YYMMDD)
#         + 3 alphanumeric (homoclave)
RFC_PATTERN = re.compile(
    r'^[A-ZÑ&]{3,4}'  # 3-4 letters (personas físicas have 4, morales have 3)
    r'\d{6}'          # 6 digits (birth/constitution date YYMMDD)
    r'[A-Z0-9]{3}$'   # 3 alphanumeric (homoclave)
)


def normalize_rfc(rfc: str) -> str:
    """
    Normalize RFC string.

    Args:
        rfc: RFC string to normalize

    Returns:
        Normalized RFC (uppercase, trimmed) or empty string if None
    """
    if rfc is None:
        return ""
    return rfc.upper().strip()


def validate_rfc(rfc: str) -> Tuple[bool, str]:
    """
    Validate Mexican RFC format.

    RFC (Registro Federal de Contribuyentes) is the Mexican tax ID.
    Format:
    - 3-4 letters at start (companies have 3, individuals have 4)
    - 6 digits representing date (YYMMDD)
    - 3 alphanumeric characters (homoclave)

    Args:
        rfc: RFC string to validate

    Returns:
        Tuple of (is_valid, error_message)
        - (True, "") if valid
        - (False, "error description") if invalid
    """
    # Handle None
    if rfc is None:
        return False, "RFC is empty"

    # Normalize
    rfc = normalize_rfc(rfc)

    # Check for empty
    if not rfc:
        return False, "RFC is empty"

    # Check pattern
    if not RFC_PATTERN.match(rfc):
        return False, f"RFC '{rfc}' does not match expected format"

    return True, ""


# Math validation constants
AMOUNT_TOLERANCE = 0.01  # Tolerance for rounding differences
IVA_RATE_MIN = 0.15  # Minimum expected IVA rate
IVA_RATE_MAX = 0.17  # Maximum expected IVA rate


def validate_iva_rate(subtotal: float, iva: float) -> Tuple[bool, str]:
    """
    Validate that IVA is approximately 16% of subtotal.

    Mexican standard IVA rate is 16%. This function allows a tolerance
    range of 15-17% to account for rounding and edge cases.

    Args:
        subtotal: Invoice subtotal amount
        iva: IVA (tax) amount

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Skip validation for zero subtotal
    if subtotal <= 0:
        return True, ""

    iva_rate = iva / subtotal

    if not (IVA_RATE_MIN <= iva_rate <= IVA_RATE_MAX):
        return False, f"IVA rate {iva_rate:.2%} is not approximately 16%"

    return True, ""


def validate_line_items_sum(
    line_items: List[Dict[str, Any]],
    subtotal: float
) -> Tuple[bool, str]:
    """
    Validate that line item amounts sum to subtotal.

    Args:
        line_items: List of line items with 'amount' field
        subtotal: Invoice subtotal to compare against

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Skip validation for empty line items
    if not line_items:
        return True, ""

    items_sum = sum(item.get('amount', 0) for item in line_items)

    if abs(items_sum - subtotal) > AMOUNT_TOLERANCE:
        return False, f"Line items sum {items_sum:.2f} != subtotal {subtotal:.2f}"

    return True, ""


def validate_math(
    subtotal: float,
    iva: float,
    total: float,
    line_items: Optional[List[Dict[str, Any]]] = None
) -> Tuple[bool, List[str]]:
    """
    Validate invoice math is correct.

    Checks:
    1. total = subtotal + iva
    2. IVA is approximately 16% of subtotal
    3. Line items sum to subtotal (if provided)

    Args:
        subtotal: Invoice subtotal amount
        iva: IVA (tax) amount
        total: Invoice total amount
        line_items: Optional list of line items

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []

    # Check total = subtotal + iva
    expected_total = round(subtotal + iva, 2)
    if abs(total - expected_total) > AMOUNT_TOLERANCE:
        errors.append(
            f"Total mismatch: {total:.2f} != {subtotal:.2f} + {iva:.2f}"
        )

    # Check IVA rate
    is_valid_iva, iva_error = validate_iva_rate(subtotal, iva)
    if not is_valid_iva:
        errors.append(iva_error)

    # Check line items sum
    if line_items:
        is_valid_items, items_error = validate_line_items_sum(line_items, subtotal)
        if not is_valid_items:
            errors.append(items_error)

    return len(errors) == 0, errors
