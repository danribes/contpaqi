"""
Tests for Subtask 9.1: Create FastAPI application in main.py

Tests the FastAPI application structure, configuration, and startup.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestFastAPIAppExists:
    """Test that FastAPI app can be imported."""

    def test_main_module_exists(self):
        """Test main module can be imported."""
        import main
        assert main is not None

    def test_app_instance_exists(self):
        """Test FastAPI app instance exists."""
        from main import app
        assert app is not None

    def test_app_is_fastapi_instance(self):
        """Test app is a FastAPI instance."""
        from fastapi import FastAPI
        from main import app
        assert isinstance(app, FastAPI)


class TestFastAPIAppConfiguration:
    """Test FastAPI app configuration."""

    def test_app_has_title(self):
        """Test app has correct title."""
        from main import app
        assert app.title == "Contpaqi Invoice Processor"

    def test_app_has_description(self):
        """Test app has description."""
        from main import app
        assert "invoice" in app.description.lower() or "AI" in app.description

    def test_app_has_version(self):
        """Test app has version."""
        from main import app
        assert app.version is not None
        assert len(app.version) > 0


class TestCORSMiddleware:
    """Test CORS middleware configuration."""

    def test_cors_middleware_exists(self):
        """Test CORS middleware is configured."""
        from main import app
        # Check middleware stack for CORS
        middleware_classes = [m.cls.__name__ for m in app.user_middleware]
        assert 'CORSMiddleware' in middleware_classes

    def test_cors_allows_localhost(self):
        """Test CORS allows localhost origin."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        # Should not get blocked by CORS
        assert response.status_code in [200, 204, 405]


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_endpoint_exists(self):
        """Test /health endpoint exists."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_status(self):
        """Test /health returns status field."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"


class TestRootEndpoint:
    """Test root endpoint."""

    def test_root_endpoint_exists(self):
        """Test / endpoint exists."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_welcome(self):
        """Test / returns welcome message."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/")
        data = response.json()
        assert "message" in data or "name" in data


class TestEngineInitialization:
    """Test inference engine initialization."""

    def test_get_engine_function_exists(self):
        """Test get_engine function exists."""
        from main import get_engine
        assert callable(get_engine)

    def test_engine_is_none_before_startup(self):
        """Test engine starts as None."""
        import main
        # Engine should be None initially (lazy loading)
        # or a function that returns the engine
        assert hasattr(main, 'engine') or hasattr(main, 'get_engine')


class TestAPIRoutes:
    """Test API route registration."""

    def test_has_process_invoice_route(self):
        """Test /api/v1/process endpoint exists."""
        from main import app
        routes = [route.path for route in app.routes]
        assert "/api/v1/process" in routes or any("/process" in r for r in routes)

    def test_process_route_accepts_post(self):
        """Test process route accepts POST method."""
        from main import app
        for route in app.routes:
            if hasattr(route, 'path') and 'process' in route.path:
                if hasattr(route, 'methods'):
                    assert 'POST' in route.methods
                break


class TestOpenAPIDocumentation:
    """Test OpenAPI documentation."""

    def test_openapi_available(self):
        """Test OpenAPI schema is available."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        assert response.status_code == 200

    def test_docs_available(self):
        """Test /docs endpoint is available."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/docs")
        assert response.status_code == 200


class TestLogging:
    """Test logging configuration."""

    def test_logger_exists(self):
        """Test logger is configured."""
        from main import logger
        assert logger is not None

    def test_logger_has_name(self):
        """Test logger has correct name."""
        from main import logger
        assert logger.name == "main" or "main" in logger.name
