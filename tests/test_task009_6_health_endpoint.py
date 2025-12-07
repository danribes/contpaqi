"""
Tests for Subtask 9.6: Implement /health endpoint

Tests the health check and readiness endpoints for the API.
"""
import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestHealthEndpointExists:
    """Test that /health endpoint exists and works."""

    def test_health_endpoint_exists(self):
        """Test /health route is registered."""
        from main import app
        routes = [route.path for route in app.routes]
        assert "/health" in routes

    def test_health_returns_200(self):
        """Test /health returns 200 OK."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_json(self):
        """Test /health returns JSON."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")


class TestHealthResponseStructure:
    """Test /health response structure."""

    def test_health_has_status(self):
        """Test response includes status field."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_has_timestamp(self):
        """Test response includes timestamp field."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "timestamp" in data

    def test_health_has_version(self):
        """Test response includes version field."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "version" in data
        assert data["version"] == "1.0.0"

    def test_health_has_models_loaded(self):
        """Test response includes models_loaded field."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "models_loaded" in data or "engine_loaded" in data


class TestTimestampFormat:
    """Test timestamp format in health response."""

    def test_timestamp_is_iso_format(self):
        """Test timestamp is in ISO format."""
        from fastapi.testclient import TestClient
        from main import app
        from datetime import datetime

        client = TestClient(app)
        response = client.get("/health")
        data = response.json()

        if "timestamp" in data:
            # Should be parseable as ISO format
            timestamp = data["timestamp"]
            assert isinstance(timestamp, str)
            # Basic check for ISO format: contains T and has digits
            assert "T" in timestamp or "-" in timestamp


class TestReadyEndpointExists:
    """Test that /ready endpoint exists and works."""

    def test_ready_endpoint_exists(self):
        """Test /ready route is registered."""
        from main import app
        routes = [route.path for route in app.routes]
        assert "/ready" in routes

    def test_ready_returns_json(self):
        """Test /ready returns JSON."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        response = client.get("/ready")
        # Could be 200 or 503 depending on engine state
        assert response.status_code in [200, 503]
        assert "application/json" in response.headers.get("content-type", "")


class TestReadyWithEngine:
    """Test /ready endpoint with engine state."""

    def test_ready_returns_200_when_engine_loaded(self):
        """Test /ready returns 200 when engine is loaded."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Mock engine as loaded
        original_engine = main.engine
        main.engine = Mock()

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "ready"
        finally:
            main.engine = original_engine

    def test_ready_returns_503_when_engine_not_loaded(self):
        """Test /ready returns 503 when engine is not loaded."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        # Ensure engine is None
        original_engine = main.engine
        main.engine = None

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 503
        finally:
            main.engine = original_engine


class TestReadyResponseStructure:
    """Test /ready response structure."""

    def test_ready_has_status_field(self):
        """Test ready response includes status field."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        main.engine = Mock()

        try:
            client = TestClient(app)
            response = client.get("/ready")
            data = response.json()
            assert "status" in data
        finally:
            main.engine = original_engine


class TestHealthVsReady:
    """Test difference between /health and /ready."""

    def test_health_always_returns_200(self):
        """Test /health returns 200 regardless of engine state."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine
        main.engine = None

        try:
            client = TestClient(app)
            response = client.get("/health")
            # Health should still return 200 even without engine
            assert response.status_code == 200
        finally:
            main.engine = original_engine

    def test_ready_depends_on_engine(self):
        """Test /ready depends on engine state."""
        from fastapi.testclient import TestClient
        from main import app
        import main

        original_engine = main.engine

        # Without engine
        main.engine = None
        client = TestClient(app)
        response1 = client.get("/ready")

        # With engine
        main.engine = Mock()
        response2 = client.get("/ready")

        main.engine = original_engine

        # Should have different status codes
        assert response1.status_code != response2.status_code
