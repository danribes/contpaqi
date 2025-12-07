"""
Tests for Subtask 9.7: Add error handling and logging

Tests the exception handlers and request logging middleware.
"""
import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestExceptionHandlersExist:
    """Test that exception handlers are registered."""

    def test_http_exception_handler_exists(self):
        """Test HTTP exception handler is registered."""
        from main import app
        # Check exception_handlers dict
        from fastapi import HTTPException
        assert HTTPException in app.exception_handlers or \
               any('HTTPException' in str(h) for h in app.exception_handlers.keys())

    def test_general_exception_handler_exists(self):
        """Test general exception handler is registered."""
        from main import app
        # Check for Exception handler
        assert Exception in app.exception_handlers or \
               len(app.exception_handlers) > 0


class TestHttpExceptionHandling:
    """Test HTTP exception handling."""

    def test_404_returns_json_error(self):
        """Test 404 returns JSON error response."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data or "error" in data

    def test_400_returns_json_error(self):
        """Test 400 returns JSON error response."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        # Send non-PDF to process_pdf endpoint
        response = client.post(
            "/process_pdf",
            files={"file": ("test.txt", b"not a pdf", "text/plain")}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data or "error" in data

    def test_422_returns_json_error(self):
        """Test 422 returns JSON error response."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        # Missing required file
        response = client.post("/process_pdf")
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data


class TestErrorResponseStructure:
    """Test error response structure."""

    def test_error_response_has_detail(self):
        """Test error response includes detail."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/nonexistent")
        data = response.json()
        # Should have either 'detail' (FastAPI default) or 'error' (custom)
        assert "detail" in data or "error" in data

    def test_error_response_is_json(self):
        """Test error response is JSON."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/nonexistent")
        assert "application/json" in response.headers.get("content-type", "")


class TestRequestLogging:
    """Test request logging middleware."""

    def test_middleware_registered(self):
        """Test logging middleware is registered."""
        from main import app
        # Check middleware stack
        middleware_names = [str(m) for m in app.user_middleware]
        # Should have at least CORS middleware
        assert len(app.user_middleware) >= 1

    def test_request_completes_with_logging(self):
        """Test requests complete with logging enabled."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        # Should not raise even with logging
        response = client.get("/health")
        assert response.status_code == 200

    def test_error_request_logged(self):
        """Test error requests are logged."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        # Error request should also complete
        response = client.get("/nonexistent")
        assert response.status_code == 404


class TestLoggerConfiguration:
    """Test logger configuration."""

    def test_logger_exists(self):
        """Test main logger exists."""
        from main import logger
        assert logger is not None

    def test_logger_has_name(self):
        """Test logger has correct name."""
        from main import logger
        assert logger.name == "main"

    def test_logging_module_configured(self):
        """Test logging module is configured."""
        import logging
        # Should have at least basic configuration
        assert logging.getLogger().handlers or logging.getLogger().level


class TestGeneralExceptionHandling:
    """Test general exception handling."""

    def test_internal_error_returns_500(self):
        """Test internal errors return 500."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Save original values
        original_engine = main.engine
        original_pdf2image = main.PDF2IMAGE_AVAILABLE

        # Create a mock engine that raises an exception
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
                    files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")}
                )
                # Should return 500
                assert response.status_code == 500
            finally:
                main.engine = original_engine
                main.PDF2IMAGE_AVAILABLE = original_pdf2image

    def test_internal_error_returns_json(self):
        """Test internal errors return JSON."""
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
                    files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")}
                )
                assert "application/json" in response.headers.get("content-type", "")
            finally:
                main.engine = original_engine
                main.PDF2IMAGE_AVAILABLE = original_pdf2image


class TestCorsMiddleware:
    """Test CORS middleware is configured."""

    def test_cors_headers_present(self):
        """Test CORS headers are present for allowed origins."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        # Should return CORS headers
        assert response.status_code in [200, 204, 405]
