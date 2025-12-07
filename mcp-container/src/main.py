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
        from .inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)  # Lazy load for faster startup
        logger.info("Inference engine initialized")
    except ImportError as e:
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
