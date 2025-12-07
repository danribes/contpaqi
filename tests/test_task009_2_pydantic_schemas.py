"""
Tests for Subtask 9.2: Define Pydantic models (Invoice, LineItem, Response)

Tests the Pydantic models for API request/response validation.
"""
import pytest
from datetime import date
from pydantic import ValidationError
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestSchemasModuleExists:
    """Test that schemas module can be imported."""

    def test_schemas_module_exists(self):
        """Test schemas module can be imported."""
        from models.schemas import LineItem, Invoice
        assert LineItem is not None
        assert Invoice is not None

    def test_all_models_importable(self):
        """Test all expected models can be imported."""
        from models.schemas import (
            LineItem,
            Invoice,
            ValidationResult,
            InvoiceResponse,
            ErrorResponse
        )
        assert all([LineItem, Invoice, ValidationResult, InvoiceResponse, ErrorResponse])


class TestLineItemModel:
    """Test LineItem Pydantic model."""

    def test_line_item_creation(self):
        """Test creating a valid LineItem."""
        from models.schemas import LineItem
        item = LineItem(
            description="Product A",
            quantity=2.0,
            unit_price=100.0,
            amount=200.0,
            confidence=0.95
        )
        assert item.description == "Product A"
        assert item.quantity == 2.0
        assert item.amount == 200.0

    def test_line_item_requires_description(self):
        """Test LineItem requires description."""
        from models.schemas import LineItem
        with pytest.raises(ValidationError):
            LineItem(
                quantity=1.0,
                unit_price=100.0,
                amount=100.0,
                confidence=0.9
            )

    def test_line_item_quantity_non_negative(self):
        """Test LineItem quantity must be >= 0."""
        from models.schemas import LineItem
        with pytest.raises(ValidationError):
            LineItem(
                description="Test",
                quantity=-1.0,
                unit_price=100.0,
                amount=100.0,
                confidence=0.9
            )

    def test_line_item_confidence_range(self):
        """Test LineItem confidence must be 0-1."""
        from models.schemas import LineItem
        # Valid confidence
        item = LineItem(
            description="Test",
            quantity=1.0,
            unit_price=100.0,
            amount=100.0,
            confidence=0.5
        )
        assert item.confidence == 0.5

        # Invalid confidence > 1
        with pytest.raises(ValidationError):
            LineItem(
                description="Test",
                quantity=1.0,
                unit_price=100.0,
                amount=100.0,
                confidence=1.5
            )


class TestInvoiceModel:
    """Test Invoice Pydantic model."""

    def test_invoice_creation(self):
        """Test creating a valid Invoice."""
        from models.schemas import Invoice
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        assert invoice.rfc_emisor == "XAXX010101000"
        assert invoice.total == 1160.0

    def test_invoice_requires_rfc_emisor(self):
        """Test Invoice requires rfc_emisor."""
        from models.schemas import Invoice
        with pytest.raises(ValidationError):
            Invoice(
                rfc_receptor="CACX7605101P8",
                fecha=date(2024, 1, 15),
                subtotal=1000.0,
                iva=160.0,
                total=1160.0
            )

    def test_invoice_optional_folio(self):
        """Test Invoice folio is optional."""
        from models.schemas import Invoice
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        assert invoice.folio is None

        invoice_with_folio = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            folio="A-12345",
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        assert invoice_with_folio.folio == "A-12345"

    def test_invoice_amounts_non_negative(self):
        """Test Invoice amounts must be >= 0."""
        from models.schemas import Invoice
        with pytest.raises(ValidationError):
            Invoice(
                rfc_emisor="XAXX010101000",
                rfc_receptor="CACX7605101P8",
                fecha=date(2024, 1, 15),
                subtotal=-100.0,
                iva=160.0,
                total=1160.0
            )

    def test_invoice_with_line_items(self):
        """Test Invoice with line items."""
        from models.schemas import Invoice, LineItem
        items = [
            LineItem(
                description="Product A",
                quantity=2.0,
                unit_price=250.0,
                amount=500.0,
                confidence=0.9
            ),
            LineItem(
                description="Product B",
                quantity=1.0,
                unit_price=500.0,
                amount=500.0,
                confidence=0.85
            )
        ]
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=items
        )
        assert len(invoice.line_items) == 2
        assert invoice.line_items[0].description == "Product A"


class TestValidationResultModel:
    """Test ValidationResult Pydantic model."""

    def test_validation_result_creation(self):
        """Test creating a ValidationResult."""
        from models.schemas import ValidationResult
        result = ValidationResult(
            is_valid=True,
            errors=[],
            warnings=[]
        )
        assert result.is_valid is True
        assert result.errors == []

    def test_validation_result_with_errors(self):
        """Test ValidationResult with errors."""
        from models.schemas import ValidationResult
        result = ValidationResult(
            is_valid=False,
            errors=["RFC format invalid", "Total mismatch"],
            warnings=["Low confidence on date"]
        )
        assert result.is_valid is False
        assert len(result.errors) == 2
        assert len(result.warnings) == 1

    def test_validation_result_defaults(self):
        """Test ValidationResult has default empty lists."""
        from models.schemas import ValidationResult
        result = ValidationResult(is_valid=True)
        assert result.errors == []
        assert result.warnings == []


class TestInvoiceResponseModel:
    """Test InvoiceResponse Pydantic model."""

    def test_invoice_response_success(self):
        """Test successful InvoiceResponse."""
        from models.schemas import InvoiceResponse, Invoice, ValidationResult
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        validation = ValidationResult(is_valid=True)
        response = InvoiceResponse(
            success=True,
            invoice=invoice,
            validation=validation,
            confidence=0.92
        )
        assert response.success is True
        assert response.invoice.total == 1160.0
        assert response.confidence == 0.92

    def test_invoice_response_failure(self):
        """Test failed InvoiceResponse."""
        from models.schemas import InvoiceResponse, ValidationResult
        validation = ValidationResult(
            is_valid=False,
            errors=["Could not extract RFC"]
        )
        response = InvoiceResponse(
            success=False,
            invoice=None,
            validation=validation,
            confidence=0.3
        )
        assert response.success is False
        assert response.invoice is None

    def test_invoice_response_optional_invoice(self):
        """Test InvoiceResponse invoice is optional."""
        from models.schemas import InvoiceResponse, ValidationResult
        validation = ValidationResult(is_valid=False)
        response = InvoiceResponse(
            success=False,
            validation=validation,
            confidence=0.0
        )
        assert response.invoice is None


class TestErrorResponseModel:
    """Test ErrorResponse Pydantic model."""

    def test_error_response_creation(self):
        """Test creating ErrorResponse."""
        from models.schemas import ErrorResponse
        error = ErrorResponse(
            error="File format not supported"
        )
        assert error.success is False
        assert error.error == "File format not supported"

    def test_error_response_success_default_false(self):
        """Test ErrorResponse success defaults to False."""
        from models.schemas import ErrorResponse
        error = ErrorResponse(error="Test error")
        assert error.success is False


class TestModelSerialization:
    """Test model JSON serialization."""

    def test_invoice_to_dict(self):
        """Test Invoice can be converted to dict."""
        from models.schemas import Invoice
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        data = invoice.model_dump()
        assert isinstance(data, dict)
        assert data["rfc_emisor"] == "XAXX010101000"

    def test_invoice_to_json(self):
        """Test Invoice can be serialized to JSON."""
        from models.schemas import Invoice
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        json_str = invoice.model_dump_json()
        assert isinstance(json_str, str)
        assert "XAXX010101000" in json_str

    def test_invoice_response_to_json(self):
        """Test InvoiceResponse can be serialized."""
        from models.schemas import InvoiceResponse, Invoice, ValidationResult
        invoice = Invoice(
            rfc_emisor="XAXX010101000",
            rfc_receptor="CACX7605101P8",
            fecha=date(2024, 1, 15),
            subtotal=1000.0,
            iva=160.0,
            total=1160.0
        )
        response = InvoiceResponse(
            success=True,
            invoice=invoice,
            validation=ValidationResult(is_valid=True),
            confidence=0.9
        )
        json_str = response.model_dump_json()
        assert "success" in json_str
        assert "true" in json_str.lower()
