"""
FastAPI application for invoice processing.

This module provides the REST API for the Contpaqi Invoice Processor,
enabling AI-powered invoice data extraction from PDF and image files.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Optional
from datetime import date

# PDF processing imports
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    convert_from_bytes = None

# Import schemas
try:
    from .models.schemas import (
        Invoice,
        LineItem,
        ValidationResult,
        InvoiceResponse,
        ErrorResponse
    )
except ImportError:
    from models.schemas import (
        Invoice,
        LineItem,
        ValidationResult,
        InvoiceResponse,
        ErrorResponse
    )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

# Global engine instance (lazy loaded)
engine: Optional["InvoiceInferenceEngine"] = None


def get_engine():
    """
    Get the inference engine instance.

    Returns:
        InvoiceInferenceEngine: The initialized engine instance

    Raises:
        HTTPException: If engine is not initialized
    """
    global engine
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Inference engine not initialized"
        )
    return engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Initializes the inference engine on startup and cleans up on shutdown.
    """
    global engine
    logger.info("Starting up Contpaqi Invoice Processor...")

    try:
        try:
            from .inference import InvoiceInferenceEngine
        except ImportError:
            from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)  # Lazy load for faster startup
        logger.info("Inference engine initialized")
    except Exception as e:
        logger.warning(f"Could not load inference engine: {e}")
        engine = None

    yield

    # Cleanup
    logger.info("Shutting down...")
    engine = None


# Initialize FastAPI app
app = FastAPI(
    title="Contpaqi Invoice Processor",
    description="AI-powered invoice data extraction for Contpaqi accounting integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """
    Root endpoint - returns API information.
    """
    return {
        "name": "Contpaqi Invoice Processor",
        "message": "Welcome to the Contpaqi Invoice Processor API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for container orchestration.
    """
    return {
        "status": "healthy",
        "engine_loaded": engine is not None
    }


@app.post("/api/v1/process")
async def process_invoice(file: UploadFile = File(...)):
    """
    Process an invoice file and extract structured data.

    Args:
        file: The invoice file (PDF or image)

    Returns:
        Extracted invoice data including RFC, amounts, and line items
    """
    # Validate file type
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    logger.info(f"Processing invoice: {file.filename}")

    # TODO: Implement actual processing in subtask 9.3
    return {
        "status": "received",
        "filename": file.filename,
        "content_type": file.content_type,
        "message": "Processing not yet implemented"
    }


def _validate_invoice_result(result) -> ValidationResult:
    """
    Validate extraction result and return validation status.

    Args:
        result: InvoiceResult from inference engine

    Returns:
        ValidationResult with validation status
    """
    errors = []
    warnings = []

    # Check required fields
    if not result.rfc_emisor:
        errors.append("RFC Emisor not extracted")
    elif len(result.rfc_emisor) < 12:
        warnings.append("RFC Emisor may be incomplete")

    if not result.rfc_receptor:
        errors.append("RFC Receptor not extracted")

    if result.total <= 0:
        errors.append("Total amount not extracted or invalid")

    # Check confidence
    if result.confidence < 0.5:
        warnings.append(f"Low extraction confidence: {result.confidence:.0%}")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings + result.warnings
    )


def _parse_date(date_str: str) -> date:
    """
    Parse date string to date object.

    Args:
        date_str: Date string in various formats

    Returns:
        Parsed date object or today's date if parsing fails
    """
    if not date_str:
        return date.today()

    # Try common formats
    formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            from datetime import datetime
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue

    return date.today()


@app.post("/process_pdf", response_model=InvoiceResponse)
async def process_pdf(file: UploadFile = File(...)):
    """
    Process a PDF invoice and extract structured data.

    Args:
        file: PDF file containing the invoice

    Returns:
        InvoiceResponse with extracted invoice data and validation results
    """
    global engine

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail="File must be a PDF"
            )

    # Check if pdf2image is available
    if not PDF2IMAGE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF processing not available (pdf2image not installed)"
        )

    # Check engine
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Inference engine not initialized"
        )

    try:
        # Read file contents
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Empty PDF file"
            )

        logger.info(f"Processing PDF: {file.filename} ({len(contents)} bytes)")

        # Convert PDF to image
        try:
            images = convert_from_bytes(contents, dpi=300)
        except Exception as e:
            logger.error(f"PDF conversion failed: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Could not read PDF: {str(e)}"
            )

        if not images:
            raise HTTPException(
                status_code=400,
                detail="No pages found in PDF"
            )

        # Process first page
        image = images[0]
        logger.info(f"Processing page 1 of {len(images)}")

        # Run inference
        result = engine.predict(image)

        # Validate result
        validation = _validate_invoice_result(result)

        # Build line items
        line_items = []
        for item in result.line_items:
            if isinstance(item, dict):
                line_items.append(LineItem(
                    description=item.get('description', ''),
                    quantity=1.0,
                    unit_price=0.0,
                    amount=0.0,
                    confidence=result.confidence
                ))

        # Build invoice
        invoice = Invoice(
            rfc_emisor=result.rfc_emisor or "",
            rfc_receptor=result.rfc_receptor or "",
            fecha=_parse_date(result.date),
            subtotal=result.subtotal,
            iva=result.iva,
            total=result.total,
            line_items=line_items
        )

        # Build response
        return InvoiceResponse(
            success=validation.is_valid,
            invoice=invoice,
            validation=validation,
            confidence=result.confidence
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )
