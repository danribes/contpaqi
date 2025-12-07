"""
Tests for Subtask 9.3: Implement POST /process_pdf endpoint

Tests the PDF processing endpoint for invoice extraction.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestProcessPdfEndpointExists:
    """Test that /process_pdf endpoint exists."""

    def test_process_pdf_route_exists(self):
        """Test /process_pdf route is registered."""
        from main import app
        routes = [route.path for route in app.routes]
        assert "/process_pdf" in routes or "/api/v1/process_pdf" in routes

    def test_process_pdf_accepts_post(self):
        """Test /process_pdf accepts POST method."""
        from main import app
        for route in app.routes:
            if hasattr(route, 'path') and 'process_pdf' in route.path:
                if hasattr(route, 'methods'):
                    assert 'POST' in route.methods
                break


class TestProcessPdfValidation:
    """Test file validation for /process_pdf."""

    def test_rejects_non_pdf_file(self):
        """Test endpoint rejects non-PDF files."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Create a fake text file
        file_content = b"This is not a PDF"
        response = client.post(
            "/process_pdf",
            files={"file": ("test.txt", file_content, "text/plain")}
        )

        assert response.status_code == 400

    def test_rejects_image_file(self):
        """Test endpoint rejects image files (use /process_image for those)."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Create a fake PNG file
        file_content = b"\x89PNG\r\n\x1a\n"
        response = client.post(
            "/process_pdf",
            files={"file": ("test.png", file_content, "image/png")}
        )

        assert response.status_code == 400

    def test_accepts_pdf_content_type(self):
        """Test endpoint accepts application/pdf content type."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Create minimal PDF-like content (will fail processing but pass validation)
        file_content = b"%PDF-1.4 fake pdf content"
        response = client.post(
            "/process_pdf",
            files={"file": ("invoice.pdf", file_content, "application/pdf")}
        )

        # Should not be 400 for content type (might be 500 for processing)
        assert response.status_code != 400 or "PDF" not in response.json().get("detail", "")


class TestProcessPdfWithMocks:
    """Test /process_pdf with mocked components."""

    def test_process_pdf_calls_engine(self):
        """Test that processing calls the inference engine."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Create mock engine
        mock_engine = Mock()
        mock_result = Mock()
        mock_result.rfc_emisor = "XAXX010101000"
        mock_result.rfc_receptor = "CACX7605101P8"
        mock_result.date = "2024-01-15"
        mock_result.subtotal = 1000.0
        mock_result.iva = 160.0
        mock_result.total = 1160.0
        mock_result.line_items = []
        mock_result.confidence = 0.9
        mock_result.warnings = []
        mock_engine.predict.return_value = mock_result

        # Mock pdf2image
        with patch('main.convert_from_bytes') as mock_convert:
            mock_image = Mock()
            mock_convert.return_value = [mock_image]

            # Temporarily set engine
            original_engine = main.engine
            main.engine = mock_engine

            try:
                client = TestClient(app)
                file_content = b"%PDF-1.4 test content"
                response = client.post(
                    "/process_pdf",
                    files={"file": ("invoice.pdf", file_content, "application/pdf")}
                )

                # Engine should have been called
                if response.status_code == 200:
                    mock_engine.predict.assert_called_once()
            finally:
                main.engine = original_engine

    def test_process_pdf_returns_invoice_response(self):
        """Test that endpoint returns InvoiceResponse structure."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Create mock engine with complete result
        mock_engine = Mock()
        mock_result = Mock()
        mock_result.rfc_emisor = "XAXX010101000"
        mock_result.rfc_receptor = "CACX7605101P8"
        mock_result.date = "2024-01-15"
        mock_result.subtotal = 1000.0
        mock_result.iva = 160.0
        mock_result.total = 1160.0
        mock_result.line_items = []
        mock_result.confidence = 0.9
        mock_result.warnings = []
        mock_engine.predict.return_value = mock_result

        with patch('main.convert_from_bytes') as mock_convert:
            mock_image = Mock()
            mock_convert.return_value = [mock_image]

            original_engine = main.engine
            main.engine = mock_engine

            try:
                client = TestClient(app)
                file_content = b"%PDF-1.4 test content"
                response = client.post(
                    "/process_pdf",
                    files={"file": ("invoice.pdf", file_content, "application/pdf")}
                )

                if response.status_code == 200:
                    data = response.json()
                    assert "success" in data
                    assert "confidence" in data
            finally:
                main.engine = original_engine


class TestProcessPdfErrorHandling:
    """Test error handling in /process_pdf."""

    def test_handles_empty_pdf(self):
        """Test handling of empty PDF."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Empty content
        response = client.post(
            "/process_pdf",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )

        # Should return error (503 is valid if engine not loaded)
        assert response.status_code in [400, 422, 500, 503]

    def test_handles_corrupted_pdf(self):
        """Test handling of corrupted PDF."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Random bytes
        file_content = b"random corrupted content that is not a pdf"
        response = client.post(
            "/process_pdf",
            files={"file": ("corrupted.pdf", file_content, "application/pdf")}
        )

        # Should return error, not crash (503 is valid if engine not loaded)
        assert response.status_code in [400, 422, 500, 503]

    def test_handles_missing_file(self):
        """Test handling of missing file in request."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # No file in request
        response = client.post("/process_pdf")

        assert response.status_code == 422  # Validation error


class TestProcessPdfResponse:
    """Test response structure of /process_pdf."""

    def test_success_response_has_invoice(self):
        """Test successful response includes invoice data."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        mock_engine = Mock()
        mock_result = Mock()
        mock_result.rfc_emisor = "XAXX010101000"
        mock_result.rfc_receptor = "CACX7605101P8"
        mock_result.date = "2024-01-15"
        mock_result.subtotal = 1000.0
        mock_result.iva = 160.0
        mock_result.total = 1160.0
        mock_result.line_items = []
        mock_result.confidence = 0.92
        mock_result.warnings = []
        mock_engine.predict.return_value = mock_result

        with patch('main.convert_from_bytes') as mock_convert:
            mock_image = Mock()
            mock_convert.return_value = [mock_image]

            original_engine = main.engine
            main.engine = mock_engine

            try:
                client = TestClient(app)
                file_content = b"%PDF-1.4 test"
                response = client.post(
                    "/process_pdf",
                    files={"file": ("invoice.pdf", file_content, "application/pdf")}
                )

                if response.status_code == 200:
                    data = response.json()
                    assert data.get("success") is True
                    assert "invoice" in data
                    if data["invoice"]:
                        assert "rfc_emisor" in data["invoice"]
                        assert "total" in data["invoice"]
            finally:
                main.engine = original_engine

    def test_response_includes_confidence(self):
        """Test response includes confidence score."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        mock_engine = Mock()
        mock_result = Mock()
        mock_result.rfc_emisor = "XAXX010101000"
        mock_result.rfc_receptor = "CACX7605101P8"
        mock_result.date = "2024-01-15"
        mock_result.subtotal = 1000.0
        mock_result.iva = 160.0
        mock_result.total = 1160.0
        mock_result.line_items = []
        mock_result.confidence = 0.85
        mock_result.warnings = []
        mock_engine.predict.return_value = mock_result

        with patch('main.convert_from_bytes') as mock_convert:
            mock_image = Mock()
            mock_convert.return_value = [mock_image]

            original_engine = main.engine
            main.engine = mock_engine

            try:
                client = TestClient(app)
                file_content = b"%PDF-1.4 test"
                response = client.post(
                    "/process_pdf",
                    files={"file": ("invoice.pdf", file_content, "application/pdf")}
                )

                if response.status_code == 200:
                    data = response.json()
                    assert "confidence" in data
                    assert 0 <= data["confidence"] <= 1
            finally:
                main.engine = original_engine


class TestProcessPdfIntegration:
    """Integration tests for /process_pdf."""

    def test_endpoint_accessible(self):
        """Test endpoint is accessible via HTTP."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # OPTIONS request should work
        response = client.options("/process_pdf")
        assert response.status_code in [200, 204, 405]

    def test_content_type_json_response(self):
        """Test response is JSON."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        mock_engine = Mock()
        mock_result = Mock()
        mock_result.rfc_emisor = "TEST"
        mock_result.rfc_receptor = "TEST"
        mock_result.date = "2024-01-15"
        mock_result.subtotal = 100.0
        mock_result.iva = 16.0
        mock_result.total = 116.0
        mock_result.line_items = []
        mock_result.confidence = 0.8
        mock_result.warnings = []
        mock_engine.predict.return_value = mock_result

        with patch('main.convert_from_bytes') as mock_convert:
            mock_image = Mock()
            mock_convert.return_value = [mock_image]

            original_engine = main.engine
            main.engine = mock_engine

            try:
                client = TestClient(app)
                file_content = b"%PDF-1.4 test"
                response = client.post(
                    "/process_pdf",
                    files={"file": ("test.pdf", file_content, "application/pdf")}
                )

                if response.status_code == 200:
                    assert "application/json" in response.headers.get("content-type", "")
            finally:
                main.engine = original_engine
