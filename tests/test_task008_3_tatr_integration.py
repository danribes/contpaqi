"""
Tests for Subtask 8.3: Implement TATR integration for row detection

Tests the _detect_table_structure() method that detects tables and rows.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestDetectTableStructureMethodExists:
    """Test that _detect_table_structure method exists."""

    def test_detect_table_structure_method_exists(self):
        """Test that InvoiceInferenceEngine has _detect_table_structure method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_detect_table_structure')

    def test_detect_table_structure_is_callable(self):
        """Test that _detect_table_structure is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine._detect_table_structure)


class TestDetectTableStructureSignature:
    """Test _detect_table_structure method signature."""

    def test_detect_table_structure_accepts_image(self):
        """Test _detect_table_structure accepts image parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._detect_table_structure)
        params = list(sig.parameters.keys())
        assert 'image' in params


class TestDetectTableStructureReturnType:
    """Test _detect_table_structure return type."""

    def test_detect_table_structure_returns_dict(self):
        """Test _detect_table_structure returns a dictionary."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock the TATR model
        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)
        assert isinstance(result, dict)

    def test_detect_table_structure_returns_table_key(self):
        """Test _detect_table_structure returns dict with 'table' key."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = (100, 200, 500, 600)
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)
        assert 'table' in result

    def test_detect_table_structure_returns_rows_key(self):
        """Test _detect_table_structure returns dict with 'rows' key."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)
        assert 'rows' in result


class TestDetectTableStructureCallsTATR:
    """Test that _detect_table_structure calls TATR model correctly."""

    def test_detect_table_structure_calls_get_table_bounds(self):
        """Test _detect_table_structure calls tatr.get_table_bounds."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        engine._detect_table_structure(mock_image)

        mock_tatr.get_table_bounds.assert_called_once_with(mock_image)

    def test_detect_table_structure_calls_get_table_rows(self):
        """Test _detect_table_structure calls tatr.get_table_rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        engine._detect_table_structure(mock_image)

        mock_tatr.get_table_rows.assert_called_once_with(mock_image)


class TestDetectTableStructureWithTableBounds:
    """Test _detect_table_structure with valid table bounds."""

    def test_returns_table_bounds(self):
        """Test that table bounds are returned correctly."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        table_bounds = (100, 200, 500, 600)
        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = table_bounds
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert result['table'] == table_bounds

    def test_returns_none_when_no_table(self):
        """Test that None is returned when no table found."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert result['table'] is None


class TestDetectTableStructureWithRows:
    """Test _detect_table_structure with table rows."""

    def test_returns_empty_rows_list(self):
        """Test that empty rows list is handled."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert result['rows'] == []

    def test_returns_multiple_rows(self):
        """Test that multiple rows are returned."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        rows = [
            (100, 200, 500, 230),
            (100, 235, 500, 265),
            (100, 270, 500, 300),
        ]
        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = (100, 200, 500, 300)
        mock_tatr.get_table_rows.return_value = rows
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert len(result['rows']) == 3
        assert result['rows'] == rows

    def test_rows_are_list(self):
        """Test that rows is a list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = [(100, 200, 500, 230)]
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert isinstance(result['rows'], list)


class TestDetectTableStructureWithoutTATR:
    """Test _detect_table_structure behavior when TATR is not loaded."""

    def test_detect_table_structure_raises_when_tatr_none(self):
        """Test _detect_table_structure raises when tatr is None."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.tatr is None

        mock_image = Mock()

        # Should raise AttributeError when tatr is None
        with pytest.raises((AttributeError, TypeError)):
            engine._detect_table_structure(mock_image)


class TestDetectTableStructureIntegration:
    """Test _detect_table_structure with realistic data."""

    def test_full_table_detection_result(self):
        """Test complete table detection result structure."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        table_bounds = (50, 100, 550, 400)
        rows = [
            (50, 100, 550, 130),  # Header row
            (50, 135, 550, 165),  # Data row 1
            (50, 170, 550, 200),  # Data row 2
            (50, 205, 550, 235),  # Data row 3
        ]

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = table_bounds
        mock_tatr.get_table_rows.return_value = rows
        engine.tatr = mock_tatr

        mock_image = Mock()
        result = engine._detect_table_structure(mock_image)

        assert result['table'] == table_bounds
        assert len(result['rows']) == 4
        assert result['rows'][0] == (50, 100, 550, 130)

    def test_passes_same_image_to_both_methods(self):
        """Test that same image is passed to both TATR methods."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_tatr = Mock()
        mock_tatr.get_table_bounds.return_value = None
        mock_tatr.get_table_rows.return_value = []
        engine.tatr = mock_tatr

        mock_image = Mock()
        mock_image.size = (800, 600)
        engine._detect_table_structure(mock_image)

        # Verify same image passed to both
        bounds_call = mock_tatr.get_table_bounds.call_args
        rows_call = mock_tatr.get_table_rows.call_args

        assert bounds_call[0][0] is mock_image
        assert rows_call[0][0] is mock_image
