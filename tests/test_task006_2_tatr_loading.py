"""
Tests for Task 6.2: TATR Model Loading
Tests the model loading functionality with mocking.
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestTATRModelLoading:
    """Test TATRModel loading behavior."""

    def test_model_init_with_default_model_name(self):
        """Test that model initializes with default model name."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        assert model.model_name == "microsoft/table-transformer-detection"

    def test_model_init_with_custom_model_name(self):
        """Test that model accepts custom model name."""
        from models.tatr import TATRModel
        custom_name = "custom/table-model"
        model = TATRModel(model_name=custom_name, load_model=False)
        assert model.model_name == custom_name

    def test_model_init_with_default_device_cpu(self):
        """Test that model defaults to CPU when CUDA not available."""
        from models.tatr import TATRModel, TORCH_AVAILABLE
        model = TATRModel(load_model=False)
        # When torch is not available or CUDA is not available, should be CPU
        if not TORCH_AVAILABLE:
            assert model.device == "cpu"

    def test_model_init_with_custom_device(self):
        """Test that model accepts custom device."""
        from models.tatr import TATRModel
        model = TATRModel(device="cpu", load_model=False)
        assert model.device == "cpu"

    def test_model_init_with_default_threshold(self):
        """Test that model uses default threshold."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        assert model.threshold == 0.7

    def test_model_init_with_custom_threshold(self):
        """Test that model accepts custom threshold."""
        from models.tatr import TATRModel
        model = TATRModel(threshold=0.5, load_model=False)
        assert model.threshold == 0.5

    def test_model_init_without_loading(self):
        """Test that model doesn't load when load_model=False."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        assert model.model is None
        assert model.processor is None
        assert model._model_loaded is False


class TestTATRModelLoadingWithMocks:
    """Test model loading with mocked dependencies."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_calls_from_pretrained(self):
        """Test that _load_model calls from_pretrained."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            mock_model_instance.config.id2label = {0: "table", 1: "table row"}
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(load_model=False)
            model._load_model()

            mock_processor.from_pretrained.assert_called_once_with(model.model_name)
            mock_model.from_pretrained.assert_called_once_with(model.model_name)

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_moves_to_device(self):
        """Test that model is moved to specified device."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            mock_model_instance.config.id2label = {0: "table"}
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_model_instance.to.assert_called_once_with("cpu")

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_sets_eval_mode(self):
        """Test that model is set to eval mode."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            mock_model_instance.config.id2label = {}
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_model_instance.eval.assert_called_once()

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_updates_id2label(self):
        """Test that model updates ID2LABEL from model config."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            custom_labels = {0: "custom_table", 1: "custom_row"}
            mock_model_instance.config.id2label = custom_labels
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            assert model.ID2LABEL == custom_labels


class TestTATRModelLoadingErrors:
    """Test model loading error handling."""

    def test_load_model_raises_without_torch(self):
        """Test that _load_model raises error when torch unavailable."""
        from models.tatr import TATRModel

        with patch('models.tatr.TORCH_AVAILABLE', False):
            model = TATRModel(load_model=False)
            with pytest.raises(RuntimeError, match="PyTorch is not available"):
                model._load_model()

    def test_load_model_raises_without_transformers(self):
        """Test that _load_model raises error when transformers unavailable."""
        from models.tatr import TATRModel

        with patch('models.tatr.TORCH_AVAILABLE', True), \
             patch('models.tatr.TRANSFORMERS_AVAILABLE', False):
            model = TATRModel(load_model=False)
            with pytest.raises(RuntimeError, match="Transformers is not available"):
                model._load_model()


class TestEnsureModelLoaded:
    """Test _ensure_model_loaded method."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_ensure_model_loaded_calls_load_if_not_loaded(self):
        """Test that _ensure_model_loaded loads model if not already loaded."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            mock_model_instance.config.id2label = {}
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(load_model=False)
            assert model._model_loaded is False

            model._ensure_model_loaded()

            assert model._model_loaded is True

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_ensure_model_loaded_skips_if_already_loaded(self):
        """Test that _ensure_model_loaded doesn't reload if already loaded."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model_instance.config = Mock()
            mock_model_instance.config.id2label = {}
            mock_model.from_pretrained.return_value = mock_model_instance

            model = TATRModel(load_model=False)
            model._load_model()

            # Reset call count
            mock_processor.from_pretrained.reset_mock()
            mock_model.from_pretrained.reset_mock()

            model._ensure_model_loaded()

            # Should not be called again
            mock_processor.from_pretrained.assert_not_called()
            mock_model.from_pretrained.assert_not_called()


class TestModelConstants:
    """Test model constant values."""

    def test_default_model_name_is_microsoft(self):
        """Test default model is from Microsoft."""
        from models.tatr import TATRModel
        assert "microsoft" in TATRModel.DEFAULT_MODEL_NAME
        assert "table-transformer" in TATRModel.DEFAULT_MODEL_NAME

    def test_default_threshold_is_reasonable(self):
        """Test default threshold is between 0.5 and 0.9."""
        from models.tatr import TATRModel
        assert 0.5 <= TATRModel.DEFAULT_THRESHOLD <= 0.9

    def test_labels_include_table(self):
        """Test labels include 'table'."""
        from models.tatr import TATRModel
        assert "table" in TATRModel.LABELS

    def test_labels_include_table_row(self):
        """Test labels include 'table row'."""
        from models.tatr import TATRModel
        assert "table row" in TATRModel.LABELS

    def test_id2label_has_table(self):
        """Test ID2LABEL maps to 'table'."""
        from models.tatr import TATRModel
        assert "table" in TATRModel.ID2LABEL.values()

    def test_id2label_has_table_row(self):
        """Test ID2LABEL maps to 'table row'."""
        from models.tatr import TATRModel
        assert "table row" in TATRModel.ID2LABEL.values()
