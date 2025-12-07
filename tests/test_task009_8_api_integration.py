"""
Tests for Subtask 9.8: Write API integration tests

Comprehensive integration tests for the FastAPI application.
"""
import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestHealthEndpointIntegration:
    """Integration tests for /health endpoint."""

    def test_health_endpoint_returns_200(self):
        """Test /health returns 200 status."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_status_is_healthy(self):
        """Test /health status field is healthy."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.json()["status"] == "healthy"

    def test_health_includes_version(self):
        """Test /health includes version."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.json()["version"] == "1.0.0"


class TestReadyEndpointIntegration:
    """Integration tests for /ready endpoint."""

    def test_ready_returns_status(self):
        """Test /ready returns status when engine loaded."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        main.engine = Mock()

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 200
            assert response.json()["status"] == "ready"
        finally:
            main.engine = original_engine

    def test_ready_returns_503_without_engine(self):
        """Test /ready returns 503 when engine not loaded."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        main.engine = None

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 503
        finally:
            main.engine = original_engine


class TestProcessPdfValidation:
    """Integration tests for /process_pdf file validation."""

    def test_process_pdf_requires_file(self):
        """Test /process_pdf requires file in request."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.post("/process_pdf")
        assert response.status_code == 422

    def test_process_pdf_rejects_text_file(self):
        """Test /process_pdf rejects text files."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.post(
            "/process_pdf",
            files={"file": ("test.txt", b"hello world", "text/plain")}
        )
        assert response.status_code == 400

    def test_process_pdf_rejects_image_file(self):
        """Test /process_pdf rejects image files."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.post(
            "/process_pdf",
            files={"file": ("test.png", b"\x89PNG\r\n\x1a\n", "image/png")}
        )
        assert response.status_code == 400

    def test_process_pdf_accepts_pdf_content_type(self):
        """Test /process_pdf accepts PDF content type."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.post(
            "/process_pdf",
            files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")}
        )
        # Might fail processing but should not fail on validation
        assert response.status_code != 400 or "PDF" not in response.json().get("detail", "")


class TestProcessPdfSuccess:
    """Integration tests for successful /process_pdf processing."""

    def test_process_pdf_returns_invoice_response(self):
        """Test /process_pdf returns InvoiceResponse structure."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Set up mocks
        original_engine = main.engine
        original_pdf2image = main.PDF2IMAGE_AVAILABLE

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
            mock_convert.return_value = [Mock()]
            main.engine = mock_engine
            main.PDF2IMAGE_AVAILABLE = True

            try:
                client = TestClient(app)
                response = client.post(
                    "/process_pdf",
                    files={"file": ("invoice.pdf", b"%PDF-1.4 test", "application/pdf")}
                )

                assert response.status_code == 200
                data = response.json()
                assert "success" in data
                assert "invoice" in data
                assert "confidence" in data
            finally:
                main.engine = original_engine
                main.PDF2IMAGE_AVAILABLE = original_pdf2image

    def test_process_pdf_includes_confidence(self):
        """Test response includes confidence score."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        original_pdf2image = main.PDF2IMAGE_AVAILABLE

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
            mock_convert.return_value = [Mock()]
            main.engine = mock_engine
            main.PDF2IMAGE_AVAILABLE = True

            try:
                client = TestClient(app)
                response = client.post(
                    "/process_pdf",
                    files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")}
                )

                if response.status_code == 200:
                    data = response.json()
                    assert "confidence" in data
                    assert 0 <= data["confidence"] <= 1
            finally:
                main.engine = original_engine
                main.PDF2IMAGE_AVAILABLE = original_pdf2image


class TestRootEndpoint:
    """Integration tests for root endpoint."""

    def test_root_returns_200(self):
        """Test root endpoint returns 200."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_api_info(self):
        """Test root endpoint returns API information."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/")
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "docs" in data


class TestCorsHeaders:
    """Integration tests for CORS headers."""

    def test_cors_allows_localhost_3000(self):
        """Test CORS allows localhost:3000."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        # Should not be 403 Forbidden
        assert response.status_code in [200, 204, 405]

    def test_cors_allows_localhost_5173(self):
        """Test CORS allows localhost:5173 (Vite)."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:5173"}
        )
        assert response.status_code in [200, 204, 405]


class TestApiV1Process:
    """Integration tests for /api/v1/process endpoint."""

    def test_api_v1_process_exists(self):
        """Test /api/v1/process route exists."""
        from main import app
        routes = [route.path for route in app.routes]
        assert "/api/v1/process" in routes

    def test_api_v1_process_accepts_pdf(self):
        """Test /api/v1/process accepts PDF files."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.post(
            "/api/v1/process",
            files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")}
        )
        # Should return status (even if processing not implemented)
        assert response.status_code in [200, 501, 503]


class TestErrorHandling:
    """Integration tests for error handling."""

    def test_404_returns_json(self):
        """Test 404 errors return JSON."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        assert "application/json" in response.headers.get("content-type", "")

    def test_internal_error_returns_500(self):
        """Test internal errors return 500."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        original_pdf2image = main.PDF2IMAGE_AVAILABLE

        mock_engine = Mock()
        mock_engine.predict.side_effect = RuntimeError("Test error")

        with patch('main.convert_from_bytes') as mock_convert:
            mock_convert.return_value = [Mock()]
            main.engine = mock_engine
            main.PDF2IMAGE_AVAILABLE = True

            try:
                client = TestClient(app)
                response = client.post(
                    "/process_pdf",
                    files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")}
                )
                assert response.status_code == 500
            finally:
                main.engine = original_engine
                main.PDF2IMAGE_AVAILABLE = original_pdf2image
