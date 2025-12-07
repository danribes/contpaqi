"""
Validators for Mexican invoice data.

Provides validation functions for RFC (Registro Federal de Contribuyentes)
and other Mexican invoice-specific data formats.
"""
import re
from typing import Tuple

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
