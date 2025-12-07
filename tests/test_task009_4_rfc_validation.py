"""
Tests for Subtask 9.4: Implement RFC regex validation

Tests the Mexican RFC format validation for invoices.
"""
import pytest
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestRfcValidatorModuleExists:
    """Test that RFC validator module exists."""

    def test_validators_module_exists(self):
        """Test validators module can be imported."""
        from models import validators
        assert validators is not None

    def test_validate_rfc_function_exists(self):
        """Test validate_rfc function exists."""
        from models.validators import validate_rfc
        assert callable(validate_rfc)

    def test_rfc_pattern_exists(self):
        """Test RFC_PATTERN constant exists."""
        from models.validators import RFC_PATTERN
        assert RFC_PATTERN is not None


class TestRfcPatternFormat:
    """Test RFC pattern matches expected formats."""

    def test_valid_persona_moral_rfc(self):
        """Test RFC with 3 initial letters (persona moral)."""
        from models.validators import validate_rfc
        # 3 letters + 6 digits + 3 alphanumeric = 12 characters
        is_valid, error = validate_rfc("ABC010101ABC")
        assert is_valid is True
        assert error == ""

    def test_valid_persona_fisica_rfc(self):
        """Test RFC with 4 initial letters (persona física)."""
        from models.validators import validate_rfc
        # 4 letters + 6 digits + 3 alphanumeric = 13 characters
        is_valid, error = validate_rfc("ABCD010101ABC")
        assert is_valid is True
        assert error == ""

    def test_valid_rfc_with_n_character(self):
        """Test RFC with Ñ character (valid in Mexican RFCs)."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("XAÑX010101ABC")
        assert is_valid is True

    def test_valid_rfc_with_ampersand(self):
        """Test RFC with & character (valid for companies)."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("AB&010101ABC")
        assert is_valid is True

    def test_valid_rfc_with_numbers_in_homoclave(self):
        """Test RFC with numbers in homoclave."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("ABCD010101A12")
        assert is_valid is True


class TestRfcValidationErrors:
    """Test RFC validation error cases."""

    def test_empty_rfc_fails(self):
        """Test empty RFC is rejected."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("")
        assert is_valid is False
        assert "empty" in error.lower()

    def test_none_rfc_fails(self):
        """Test None RFC is handled."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc(None)
        assert is_valid is False

    def test_too_short_rfc_fails(self):
        """Test RFC shorter than 12 characters fails."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("ABC010101")
        assert is_valid is False
        assert "format" in error.lower() or "match" in error.lower()

    def test_too_long_rfc_fails(self):
        """Test RFC longer than 13 characters fails."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("ABCDE010101ABCD")
        assert is_valid is False

    def test_invalid_date_portion_fails(self):
        """Test RFC with letters in date portion fails."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("ABCDAABBCCABC")
        assert is_valid is False

    def test_lowercase_rfc_normalized(self):
        """Test lowercase RFC is normalized to uppercase."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("abcd010101abc")
        assert is_valid is True

    def test_rfc_with_spaces_trimmed(self):
        """Test RFC with leading/trailing spaces is trimmed."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("  ABCD010101ABC  ")
        assert is_valid is True


class TestRfcEdgeCases:
    """Test edge cases for RFC validation."""

    def test_generic_rfc_xaxx010101000(self):
        """Test generic RFC for public (XAXX010101000)."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("XAXX010101000")
        assert is_valid is True

    def test_generic_rfc_xexx010101000(self):
        """Test generic RFC for foreign (XEXX010101000)."""
        from models.validators import validate_rfc
        is_valid, error = validate_rfc("XEXX010101000")
        assert is_valid is True

    def test_real_looking_rfc_format(self):
        """Test a realistic RFC format."""
        from models.validators import validate_rfc
        # CACX7605101P8 - typical persona física
        is_valid, error = validate_rfc("CACX7605101P8")
        assert is_valid is True

    def test_company_rfc_format(self):
        """Test company RFC format (3 letters)."""
        from models.validators import validate_rfc
        # GNP930101123 - typical company RFC
        is_valid, error = validate_rfc("GNP930101123")
        assert is_valid is True


class TestRfcReturnValue:
    """Test RFC validation return value structure."""

    def test_returns_tuple(self):
        """Test validate_rfc returns a tuple."""
        from models.validators import validate_rfc
        result = validate_rfc("ABCD010101ABC")
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_first_element_is_bool(self):
        """Test first element of tuple is boolean."""
        from models.validators import validate_rfc
        is_valid, _ = validate_rfc("ABCD010101ABC")
        assert isinstance(is_valid, bool)

    def test_second_element_is_string(self):
        """Test second element of tuple is string."""
        from models.validators import validate_rfc
        _, error = validate_rfc("ABCD010101ABC")
        assert isinstance(error, str)

    def test_valid_rfc_returns_empty_error(self):
        """Test valid RFC returns empty error string."""
        from models.validators import validate_rfc
        _, error = validate_rfc("ABCD010101ABC")
        assert error == ""

    def test_invalid_rfc_returns_error_message(self):
        """Test invalid RFC returns error message."""
        from models.validators import validate_rfc
        _, error = validate_rfc("INVALID")
        assert len(error) > 0


class TestRfcNormalization:
    """Test RFC normalization functionality."""

    def test_normalize_rfc_function_exists(self):
        """Test normalize_rfc function exists."""
        from models.validators import normalize_rfc
        assert callable(normalize_rfc)

    def test_normalize_converts_to_uppercase(self):
        """Test normalize_rfc converts to uppercase."""
        from models.validators import normalize_rfc
        result = normalize_rfc("abcd010101abc")
        assert result == "ABCD010101ABC"

    def test_normalize_strips_whitespace(self):
        """Test normalize_rfc strips whitespace."""
        from models.validators import normalize_rfc
        result = normalize_rfc("  ABCD010101ABC  ")
        assert result == "ABCD010101ABC"

    def test_normalize_handles_none(self):
        """Test normalize_rfc handles None."""
        from models.validators import normalize_rfc
        result = normalize_rfc(None)
        assert result == ""
