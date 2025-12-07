"""
Tests for Subtask 9.5: Implement math verification (subtotal + IVA = total)

Tests the invoice math validation for Mexican invoices.
"""
import pytest
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestMathValidatorExists:
    """Test that math validation functions exist."""

    def test_validate_math_function_exists(self):
        """Test validate_math function exists."""
        from models.validators import validate_math
        assert callable(validate_math)

    def test_validate_line_items_sum_exists(self):
        """Test validate_line_items_sum function exists."""
        from models.validators import validate_line_items_sum
        assert callable(validate_line_items_sum)

    def test_validate_iva_rate_exists(self):
        """Test validate_iva_rate function exists."""
        from models.validators import validate_iva_rate
        assert callable(validate_iva_rate)


class TestTotalCalculation:
    """Test total = subtotal + IVA validation."""

    def test_correct_total_passes(self):
        """Test correct total passes validation."""
        from models.validators import validate_math
        # subtotal=1000, iva=160, total=1160
        is_valid, errors = validate_math(subtotal=1000.0, iva=160.0, total=1160.0)
        assert is_valid is True
        assert len(errors) == 0

    def test_incorrect_total_fails(self):
        """Test incorrect total fails validation."""
        from models.validators import validate_math
        # subtotal=1000, iva=160, total=1200 (should be 1160)
        is_valid, errors = validate_math(subtotal=1000.0, iva=160.0, total=1200.0)
        assert is_valid is False
        assert any("total" in e.lower() for e in errors)

    def test_small_rounding_difference_passes(self):
        """Test small rounding differences are tolerated."""
        from models.validators import validate_math
        # Allow 0.01 tolerance
        is_valid, errors = validate_math(subtotal=1000.0, iva=160.0, total=1160.01)
        assert is_valid is True

    def test_larger_rounding_difference_fails(self):
        """Test larger rounding differences fail."""
        from models.validators import validate_math
        # 0.02 difference should fail
        is_valid, errors = validate_math(subtotal=1000.0, iva=160.0, total=1160.02)
        assert is_valid is False


class TestIvaRateValidation:
    """Test IVA rate is approximately 16%."""

    def test_correct_iva_rate_passes(self):
        """Test 16% IVA rate passes."""
        from models.validators import validate_iva_rate
        # iva = subtotal * 0.16
        is_valid, error = validate_iva_rate(subtotal=1000.0, iva=160.0)
        assert is_valid is True

    def test_iva_rate_within_tolerance_passes(self):
        """Test IVA rate within 15-17% range passes."""
        from models.validators import validate_iva_rate
        # 15.5% - should pass
        is_valid, error = validate_iva_rate(subtotal=1000.0, iva=155.0)
        assert is_valid is True

    def test_iva_rate_too_low_fails(self):
        """Test IVA rate below 15% fails."""
        from models.validators import validate_iva_rate
        # 10% - too low
        is_valid, error = validate_iva_rate(subtotal=1000.0, iva=100.0)
        assert is_valid is False
        assert "iva" in error.lower() or "rate" in error.lower()

    def test_iva_rate_too_high_fails(self):
        """Test IVA rate above 17% fails."""
        from models.validators import validate_iva_rate
        # 20% - too high
        is_valid, error = validate_iva_rate(subtotal=1000.0, iva=200.0)
        assert is_valid is False

    def test_zero_subtotal_skips_iva_check(self):
        """Test zero subtotal doesn't cause division error."""
        from models.validators import validate_iva_rate
        is_valid, error = validate_iva_rate(subtotal=0.0, iva=0.0)
        assert is_valid is True


class TestLineItemsSum:
    """Test line items sum to subtotal."""

    def test_correct_line_items_sum_passes(self):
        """Test line items that sum to subtotal pass."""
        from models.validators import validate_line_items_sum
        items = [
            {"amount": 500.0},
            {"amount": 300.0},
            {"amount": 200.0}
        ]
        is_valid, error = validate_line_items_sum(items, subtotal=1000.0)
        assert is_valid is True

    def test_incorrect_line_items_sum_fails(self):
        """Test line items that don't sum to subtotal fail."""
        from models.validators import validate_line_items_sum
        items = [
            {"amount": 500.0},
            {"amount": 300.0}
        ]
        # Sum is 800, subtotal is 1000
        is_valid, error = validate_line_items_sum(items, subtotal=1000.0)
        assert is_valid is False
        assert "sum" in error.lower() or "subtotal" in error.lower()

    def test_empty_line_items_passes(self):
        """Test empty line items list passes (no check)."""
        from models.validators import validate_line_items_sum
        is_valid, error = validate_line_items_sum([], subtotal=1000.0)
        assert is_valid is True

    def test_small_rounding_difference_in_items_passes(self):
        """Test small rounding differences in items are tolerated."""
        from models.validators import validate_line_items_sum
        items = [
            {"amount": 333.33},
            {"amount": 333.33},
            {"amount": 333.34}
        ]
        is_valid, error = validate_line_items_sum(items, subtotal=1000.0)
        assert is_valid is True


class TestValidateMathComprehensive:
    """Test validate_math with all checks combined."""

    def test_all_valid_passes(self):
        """Test invoice with all correct math passes."""
        from models.validators import validate_math
        is_valid, errors = validate_math(
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[{"amount": 500.0}, {"amount": 500.0}]
        )
        assert is_valid is True
        assert len(errors) == 0

    def test_multiple_errors_collected(self):
        """Test multiple errors are collected."""
        from models.validators import validate_math
        is_valid, errors = validate_math(
            subtotal=1000.0,
            iva=100.0,  # Wrong rate
            total=1200.0,  # Wrong total
            line_items=[{"amount": 500.0}]  # Wrong sum
        )
        assert is_valid is False
        assert len(errors) >= 2  # Should have at least 2 errors

    def test_returns_tuple(self):
        """Test validate_math returns tuple."""
        from models.validators import validate_math
        result = validate_math(subtotal=100.0, iva=16.0, total=116.0)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_first_element_is_bool(self):
        """Test first element is boolean."""
        from models.validators import validate_math
        is_valid, _ = validate_math(subtotal=100.0, iva=16.0, total=116.0)
        assert isinstance(is_valid, bool)

    def test_second_element_is_list(self):
        """Test second element is list of errors."""
        from models.validators import validate_math
        _, errors = validate_math(subtotal=100.0, iva=16.0, total=116.0)
        assert isinstance(errors, list)


class TestEdgeCases:
    """Test edge cases for math validation."""

    def test_zero_amounts(self):
        """Test zero amounts pass validation."""
        from models.validators import validate_math
        is_valid, errors = validate_math(subtotal=0.0, iva=0.0, total=0.0)
        assert is_valid is True

    def test_large_amounts(self):
        """Test large amounts work correctly."""
        from models.validators import validate_math
        # 1 million pesos
        is_valid, errors = validate_math(
            subtotal=1000000.0,
            iva=160000.0,
            total=1160000.0
        )
        assert is_valid is True

    def test_small_amounts(self):
        """Test small amounts work correctly."""
        from models.validators import validate_math
        # 10 pesos
        is_valid, errors = validate_math(
            subtotal=10.0,
            iva=1.60,
            total=11.60
        )
        assert is_valid is True

    def test_decimal_precision(self):
        """Test decimal precision handling."""
        from models.validators import validate_math
        # Typical invoice with decimals
        is_valid, errors = validate_math(
            subtotal=1234.56,
            iva=197.53,  # 1234.56 * 0.16 = 197.5296
            total=1432.09
        )
        assert is_valid is True
