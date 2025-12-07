"""
Pydantic models for API request and response validation.

This module defines the data models used for validating and serializing
invoice data in the Contpaqi Invoice Processor API.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class LineItem(BaseModel):
    """
    A single line item from an invoice.

    Attributes:
        description: Item description text
        quantity: Number of units (must be >= 0)
        unit_price: Price per unit (must be >= 0)
        amount: Total amount for this line (must be >= 0)
        confidence: Extraction confidence score (0.0 to 1.0)
    """
    description: str
    quantity: float = Field(ge=0)
    unit_price: float = Field(ge=0)
    amount: float = Field(ge=0)
    confidence: float = Field(ge=0, le=1)


class Invoice(BaseModel):
    """
    Extracted invoice data.

    Attributes:
        rfc_emisor: Tax ID of the issuer (emisor)
        rfc_receptor: Tax ID of the receiver (receptor)
        fecha: Invoice date
        folio: Invoice folio/number (optional)
        subtotal: Subtotal before tax (must be >= 0)
        iva: IVA tax amount (must be >= 0)
        total: Total amount including tax (must be >= 0)
        line_items: List of line items
    """
    rfc_emisor: str
    rfc_receptor: str
    fecha: date
    folio: Optional[str] = None
    subtotal: float = Field(ge=0)
    iva: float = Field(ge=0)
    total: float = Field(ge=0)
    line_items: List[LineItem] = []


class ValidationResult(BaseModel):
    """
    Result of invoice validation.

    Attributes:
        is_valid: Whether the invoice passed validation
        errors: List of validation error messages
        warnings: List of validation warning messages
    """
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []


class InvoiceResponse(BaseModel):
    """
    API response for invoice processing.

    Attributes:
        success: Whether processing succeeded
        invoice: Extracted invoice data (if successful)
        validation: Validation results
        confidence: Overall extraction confidence (0.0 to 1.0)
    """
    success: bool
    invoice: Optional[Invoice] = None
    validation: ValidationResult
    confidence: float = Field(ge=0, le=1)


class ErrorResponse(BaseModel):
    """
    API error response.

    Attributes:
        success: Always False for error responses
        error: Error message describing what went wrong
    """
    success: bool = False
    error: str
