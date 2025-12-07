"""
Tests for Task 6.4: TATR Row Bounding Box Extraction
Tests get_table_rows and get_table_bounds methods.
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestGetTableRowsBasic:
    """Test basic get_table_rows behavior."""

    def test_get_table_rows_returns_list(self):
        """Test that get_table_rows returns a list."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        result = model.get_table_rows(Mock())
        assert isinstance(result, list)

    def test_get_table_rows_accepts_threshold(self):
        """Test that get_table_rows accepts threshold parameter."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        # Should not raise
        result = model.get_table_rows(Mock(), threshold=0.5)
        assert isinstance(result, list)


class TestGetTableRowsWithMocks:
    """Test get_table_rows with mocked detections."""

    def test_get_table_rows_filters_for_rows(self):
        """Test that get_table_rows only returns table rows."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        # Mock detect to return mixed detections
        detections = [
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
            TableDetection(label="table column", confidence=0.80, bbox=(10, 0, 100, 600)),
            TableDetection(label="table row", confidence=0.75, bbox=(10, 100, 790, 130)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert len(result) == 2
        for row in result:
            assert 'bbox' in row
            assert 'confidence' in row
            assert 'index' in row

    def test_get_table_rows_sorts_by_y_coordinate(self):
        """Test that rows are sorted by y-coordinate (top to bottom)."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        # Create rows out of order
        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 200, 790, 230)),  # third
            TableDetection(label="table row", confidence=0.80, bbox=(10, 50, 790, 80)),   # first
            TableDetection(label="table row", confidence=0.75, bbox=(10, 125, 790, 155)), # second
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        # Should be sorted by y (bbox[1])
        assert result[0]['bbox'][1] == 50    # First row (y=50)
        assert result[1]['bbox'][1] == 125   # Second row (y=125)
        assert result[2]['bbox'][1] == 200   # Third row (y=200)

    def test_get_table_rows_includes_index(self):
        """Test that rows include correct index."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
            TableDetection(label="table row", confidence=0.80, bbox=(10, 100, 790, 130)),
            TableDetection(label="table row", confidence=0.75, bbox=(10, 150, 790, 180)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert result[0]['index'] == 0
        assert result[1]['index'] == 1
        assert result[2]['index'] == 2

    def test_get_table_rows_includes_confidence(self):
        """Test that rows include confidence score."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
            TableDetection(label="table row", confidence=0.75, bbox=(10, 100, 790, 130)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert result[0]['confidence'] == 0.85
        assert result[1]['confidence'] == 0.75

    def test_get_table_rows_returns_empty_when_no_rows(self):
        """Test that get_table_rows returns empty list when no rows detected."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
            TableDetection(label="table column", confidence=0.80, bbox=(10, 0, 100, 600)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert result == []


class TestGetTableBoundsBasic:
    """Test basic get_table_bounds behavior."""

    def test_get_table_bounds_returns_dict_or_none(self):
        """Test that get_table_bounds returns dict or None."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        result = model.get_table_bounds(Mock())
        assert result is None or isinstance(result, dict)

    def test_get_table_bounds_accepts_threshold(self):
        """Test that get_table_bounds accepts threshold parameter."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        # Should not raise
        result = model.get_table_bounds(Mock(), threshold=0.5)
        assert result is None or isinstance(result, dict)


class TestGetTableBoundsWithMocks:
    """Test get_table_bounds with mocked detections."""

    def test_get_table_bounds_filters_for_tables(self):
        """Test that get_table_bounds only considers tables."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
            TableDetection(label="table column", confidence=0.80, bbox=(10, 0, 100, 600)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_bounds(Mock())

        assert result is not None
        assert result['bbox'] == (0, 0, 800, 600)
        assert result['confidence'] == 0.95

    def test_get_table_bounds_returns_highest_confidence(self):
        """Test that get_table_bounds returns highest confidence table."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table", confidence=0.70, bbox=(0, 0, 400, 300)),
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
            TableDetection(label="table", confidence=0.80, bbox=(0, 0, 600, 450)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_bounds(Mock())

        assert result is not None
        assert result['confidence'] == 0.95
        assert result['bbox'] == (0, 0, 800, 600)

    def test_get_table_bounds_returns_none_when_no_tables(self):
        """Test that get_table_bounds returns None when no tables detected."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
            TableDetection(label="table column", confidence=0.80, bbox=(10, 0, 100, 600)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_bounds(Mock())

        assert result is None

    def test_get_table_bounds_dict_has_bbox_key(self):
        """Test that result dict has 'bbox' key."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_bounds(Mock())

        assert 'bbox' in result
        assert isinstance(result['bbox'], tuple)
        assert len(result['bbox']) == 4

    def test_get_table_bounds_dict_has_confidence_key(self):
        """Test that result dict has 'confidence' key."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table", confidence=0.95, bbox=(0, 0, 800, 600)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_bounds(Mock())

        assert 'confidence' in result
        assert isinstance(result['confidence'], float)


class TestGetTableRowsDictStructure:
    """Test the structure of dictionaries returned by get_table_rows."""

    def test_row_dict_bbox_is_tuple(self):
        """Test that row bbox is a tuple."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert isinstance(result[0]['bbox'], tuple)
        assert len(result[0]['bbox']) == 4

    def test_row_dict_confidence_is_float(self):
        """Test that row confidence is a float."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert isinstance(result[0]['confidence'], float)

    def test_row_dict_index_is_int(self):
        """Test that row index is an integer."""
        from models.tatr import TATRModel, TableDetection

        model = TATRModel(load_model=False)

        detections = [
            TableDetection(label="table row", confidence=0.85, bbox=(10, 50, 790, 80)),
        ]
        model.detect = Mock(return_value=detections)

        result = model.get_table_rows(Mock())

        assert isinstance(result[0]['index'], int)


class TestThresholdPropagation:
    """Test that threshold is properly propagated to detect method."""

    def test_get_table_rows_propagates_threshold(self):
        """Test that get_table_rows passes threshold to detect."""
        from models.tatr import TATRModel

        model = TATRModel(load_model=False)
        model.detect = Mock(return_value=[])

        model.get_table_rows(Mock(), threshold=0.6)

        model.detect.assert_called_once()
        call_args = model.detect.call_args
        assert call_args.kwargs.get('threshold') == 0.6 or call_args.args[-1] == 0.6

    def test_get_table_bounds_propagates_threshold(self):
        """Test that get_table_bounds passes threshold to detect."""
        from models.tatr import TATRModel

        model = TATRModel(load_model=False)
        model.detect = Mock(return_value=[])

        model.get_table_bounds(Mock(), threshold=0.8)

        model.detect.assert_called_once()
        call_args = model.detect.call_args
        assert call_args.kwargs.get('threshold') == 0.8 or call_args.args[-1] == 0.8


class TestEmptyDetections:
    """Test behavior with empty detections."""

    def test_get_table_rows_handles_empty_detections(self):
        """Test get_table_rows with empty detection list."""
        from models.tatr import TATRModel

        model = TATRModel(load_model=False)
        model.detect = Mock(return_value=[])

        result = model.get_table_rows(Mock())

        assert result == []

    def test_get_table_bounds_handles_empty_detections(self):
        """Test get_table_bounds with empty detection list."""
        from models.tatr import TATRModel

        model = TATRModel(load_model=False)
        model.detect = Mock(return_value=[])

        result = model.get_table_bounds(Mock())

        assert result is None
