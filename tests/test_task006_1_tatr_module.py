"""
Tests for Task 6.1: TATR Module Structure
Tests the basic structure of the TATR (Table Transformer) module.
"""
import pytest
import sys
from pathlib import Path

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestTATRModuleExists:
    """Test that the TATR module file exists and is importable."""

    def test_tatr_module_file_exists(self):
        """Test that tatr.py file exists in models directory."""
        tatr_path = MCP_SRC / "models" / "tatr.py"
        assert tatr_path.exists(), f"tatr.py should exist at {tatr_path}"

    def test_tatr_module_importable(self):
        """Test that tatr module can be imported."""
        try:
            from models import tatr
            assert tatr is not None
        except ImportError as e:
            pytest.fail(f"Should be able to import tatr module: {e}")

    def test_tatr_module_has_docstring(self):
        """Test that tatr module has a docstring."""
        from models import tatr
        assert tatr.__doc__ is not None
        assert len(tatr.__doc__) > 0
        assert "Table Transformer" in tatr.__doc__ or "TATR" in tatr.__doc__


class TestTableDetectionDataclass:
    """Test the TableDetection dataclass structure."""

    def test_tabledetection_exists(self):
        """Test that TableDetection class exists."""
        from models.tatr import TableDetection
        assert TableDetection is not None

    def test_tabledetection_is_dataclass(self):
        """Test that TableDetection is a dataclass."""
        from dataclasses import is_dataclass
        from models.tatr import TableDetection
        assert is_dataclass(TableDetection), "TableDetection should be a dataclass"

    def test_tabledetection_has_label_field(self):
        """Test that TableDetection has label field."""
        from models.tatr import TableDetection
        detection = TableDetection(label="table", confidence=0.95, bbox=(0, 0, 100, 100))
        assert hasattr(detection, 'label')
        assert detection.label == "table"

    def test_tabledetection_has_confidence_field(self):
        """Test that TableDetection has confidence field."""
        from models.tatr import TableDetection
        detection = TableDetection(label="table", confidence=0.95, bbox=(0, 0, 100, 100))
        assert hasattr(detection, 'confidence')
        assert detection.confidence == 0.95

    def test_tabledetection_has_bbox_field(self):
        """Test that TableDetection has bbox field."""
        from models.tatr import TableDetection
        detection = TableDetection(label="table", confidence=0.95, bbox=(0, 0, 100, 100))
        assert hasattr(detection, 'bbox')
        assert detection.bbox == (0, 0, 100, 100)

    def test_tabledetection_bbox_is_tuple(self):
        """Test that bbox is a tuple of 4 elements."""
        from models.tatr import TableDetection
        detection = TableDetection(label="table_row", confidence=0.85, bbox=(10, 20, 200, 50))
        assert isinstance(detection.bbox, tuple)
        assert len(detection.bbox) == 4

    def test_tabledetection_valid_labels(self):
        """Test that TableDetection accepts valid label types."""
        from models.tatr import TableDetection
        valid_labels = ["table", "table row", "table column", "table column header"]
        for label in valid_labels:
            detection = TableDetection(label=label, confidence=0.9, bbox=(0, 0, 100, 100))
            assert detection.label == label

    def test_tabledetection_confidence_range(self):
        """Test that confidence values work for valid range."""
        from models.tatr import TableDetection
        # Should accept values between 0 and 1
        for conf in [0.0, 0.5, 1.0]:
            detection = TableDetection(label="table", confidence=conf, bbox=(0, 0, 100, 100))
            assert detection.confidence == conf


class TestTableDetectionValidation:
    """Test TableDetection validation."""

    def test_tabledetection_validates_bbox_length(self):
        """Test that bbox must have 4 elements."""
        from models.tatr import TableDetection
        with pytest.raises((ValueError, TypeError)):
            TableDetection(label="table", confidence=0.9, bbox=(0, 0, 100))

    def test_tabledetection_validates_confidence_range(self):
        """Test that confidence must be between 0 and 1."""
        from models.tatr import TableDetection
        with pytest.raises(ValueError):
            TableDetection(label="table", confidence=1.5, bbox=(0, 0, 100, 100))

    def test_tabledetection_validates_confidence_negative(self):
        """Test that confidence cannot be negative."""
        from models.tatr import TableDetection
        with pytest.raises(ValueError):
            TableDetection(label="table", confidence=-0.1, bbox=(0, 0, 100, 100))


class TestTATRModelClass:
    """Test the TATRModel class structure."""

    def test_tatrmodel_exists(self):
        """Test that TATRModel class exists."""
        from models.tatr import TATRModel
        assert TATRModel is not None

    def test_tatrmodel_has_default_model_name(self):
        """Test that TATRModel has default model name constant."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'DEFAULT_MODEL_NAME') or hasattr(TATRModel, 'MODEL_NAME')

    def test_tatrmodel_has_detect_method(self):
        """Test that TATRModel has detect method."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'detect')
        assert callable(getattr(TATRModel, 'detect'))

    def test_tatrmodel_has_get_table_rows_method(self):
        """Test that TATRModel has get_table_rows method."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'get_table_rows')
        assert callable(getattr(TATRModel, 'get_table_rows'))

    def test_tatrmodel_has_get_table_bounds_method(self):
        """Test that TATRModel has get_table_bounds method."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'get_table_bounds')
        assert callable(getattr(TATRModel, 'get_table_bounds'))


class TestTATRModelInit:
    """Test TATRModel initialization."""

    def test_tatrmodel_init_accepts_model_name(self):
        """Test that TATRModel init accepts model_name parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.__init__)
        params = list(sig.parameters.keys())
        assert 'model_name' in params or 'model_path' in params

    def test_tatrmodel_init_accepts_device(self):
        """Test that TATRModel init accepts device parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.__init__)
        params = list(sig.parameters.keys())
        assert 'device' in params

    def test_tatrmodel_init_accepts_threshold(self):
        """Test that TATRModel init accepts threshold parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.__init__)
        params = list(sig.parameters.keys())
        assert 'threshold' in params or 'confidence_threshold' in params


class TestTATRModelConstants:
    """Test TATRModel constants and configurations."""

    def test_tatrmodel_default_threshold(self):
        """Test that TATRModel has default threshold."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'DEFAULT_THRESHOLD') or hasattr(TATRModel, 'THRESHOLD')

    def test_tatrmodel_label_mapping(self):
        """Test that TATRModel has label mapping."""
        from models.tatr import TATRModel
        assert hasattr(TATRModel, 'LABELS') or hasattr(TATRModel, 'ID2LABEL') or hasattr(TATRModel, 'LABEL_NAMES')


class TestModuleExports:
    """Test module exports and __all__."""

    def test_module_exports_tabledetection(self):
        """Test that module exports TableDetection."""
        from models.tatr import TableDetection
        assert TableDetection is not None

    def test_module_exports_tatrmodel(self):
        """Test that module exports TATRModel."""
        from models.tatr import TATRModel
        assert TATRModel is not None

    def test_module_has_all_attribute(self):
        """Test that module has __all__ attribute."""
        from models import tatr
        assert hasattr(tatr, '__all__')
        assert 'TableDetection' in tatr.__all__
        assert 'TATRModel' in tatr.__all__


class TestTATRAvailabilityFlag:
    """Test TATR availability flags."""

    def test_module_has_torch_available_flag(self):
        """Test that module has TORCH_AVAILABLE flag."""
        from models import tatr
        assert hasattr(tatr, 'TORCH_AVAILABLE')

    def test_module_has_transformers_available_flag(self):
        """Test that module has TRANSFORMERS_AVAILABLE flag."""
        from models import tatr
        assert hasattr(tatr, 'TRANSFORMERS_AVAILABLE')


class TestDetectMethodSignature:
    """Test detect method signature."""

    def test_detect_accepts_image_parameter(self):
        """Test that detect accepts image parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.detect)
        params = list(sig.parameters.keys())
        assert 'image' in params

    def test_detect_accepts_threshold_parameter(self):
        """Test that detect accepts optional threshold parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.detect)
        params = list(sig.parameters.keys())
        assert 'threshold' in params

    def test_detect_returns_list_annotation(self):
        """Test that detect has List return type annotation."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.detect)
        # Check if return annotation exists and mentions List
        if sig.return_annotation != inspect.Parameter.empty:
            return_str = str(sig.return_annotation)
            assert 'List' in return_str or 'list' in return_str


class TestGetTableRowsSignature:
    """Test get_table_rows method signature."""

    def test_get_table_rows_accepts_image(self):
        """Test that get_table_rows accepts image parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.get_table_rows)
        params = list(sig.parameters.keys())
        assert 'image' in params

    def test_get_table_rows_accepts_threshold(self):
        """Test that get_table_rows accepts optional threshold parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.get_table_rows)
        params = list(sig.parameters.keys())
        assert 'threshold' in params


class TestGetTableBoundsSignature:
    """Test get_table_bounds method signature."""

    def test_get_table_bounds_accepts_image(self):
        """Test that get_table_bounds accepts image parameter."""
        from models.tatr import TATRModel
        import inspect
        sig = inspect.signature(TATRModel.get_table_bounds)
        params = list(sig.parameters.keys())
        assert 'image' in params
