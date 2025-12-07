"""
Tests for Task 7.2: LayoutLMv3 Model Loading
Tests the model loading functionality with mocking.
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestLayoutLMModelLoading:
    """Test LayoutLMModel loading behavior."""

    def test_model_init_with_default_model_name(self):
        """Test that model initializes with default model name."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert model.model_name == "microsoft/layoutlmv3-base"

    def test_model_init_with_custom_model_name(self):
        """Test that model accepts custom model name."""
        from models.layoutlm import LayoutLMModel
        custom_name = "custom/layoutlm-invoice"
        model = LayoutLMModel(model_name=custom_name, load_model=False)
        assert model.model_name == custom_name

    def test_model_init_with_default_device_cpu(self):
        """Test that model defaults to CPU when CUDA not available."""
        from models.layoutlm import LayoutLMModel, TORCH_AVAILABLE
        model = LayoutLMModel(load_model=False)
        if not TORCH_AVAILABLE:
            assert model.device == "cpu"

    def test_model_init_with_custom_device(self):
        """Test that model accepts custom device."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(device="cpu", load_model=False)
        assert model.device == "cpu"

    def test_model_init_without_loading(self):
        """Test that model doesn't load when load_model=False."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert model.model is None
        assert model.processor is None
        assert model._model_loaded is False

    def test_model_has_label2id_mapping(self):
        """Test that model has label2id mapping."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert hasattr(model, 'label2id')
        assert isinstance(model.label2id, dict)
        assert 'O' in model.label2id
        assert model.label2id['O'] == 0

    def test_model_has_id2label_mapping(self):
        """Test that model has id2label mapping."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert hasattr(model, 'id2label')
        assert isinstance(model.id2label, dict)
        assert 0 in model.id2label
        assert model.id2label[0] == 'O'

    def test_label_mappings_are_consistent(self):
        """Test that label2id and id2label are inverses."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        for label, idx in model.label2id.items():
            assert model.id2label[idx] == label


class TestLayoutLMModelLoadingWithMocks:
    """Test model loading with mocked dependencies."""

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_calls_processor_from_pretrained(self):
        """Test that _load_model calls processor.from_pretrained."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(load_model=False)
            model._load_model()

            mock_processor.from_pretrained.assert_called_once_with(model.model_name)

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_calls_model_from_pretrained(self):
        """Test that _load_model calls model.from_pretrained with num_labels."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(load_model=False)
            model._load_model()

            mock_model.from_pretrained.assert_called_once_with(
                model.model_name,
                num_labels=len(model.LABELS)
            )

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_moves_to_device(self):
        """Test that model is moved to specified device."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(device="cpu", load_model=False)
            model._load_model()

            mock_model_instance.to.assert_called_once_with("cpu")

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_sets_eval_mode(self):
        """Test that model is set to eval mode."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(device="cpu", load_model=False)
            model._load_model()

            mock_model_instance.eval.assert_called_once()

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_load_model_sets_model_loaded_flag(self):
        """Test that _model_loaded is set to True after loading."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(device="cpu", load_model=False)
            assert model._model_loaded is False

            model._load_model()

            assert model._model_loaded is True


class TestLayoutLMModelLoadingErrors:
    """Test model loading error handling."""

    def test_load_model_raises_without_torch(self):
        """Test that _load_model raises error when torch unavailable."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.TORCH_AVAILABLE', False):
            model = LayoutLMModel(load_model=False)
            with pytest.raises(RuntimeError, match="PyTorch is not available"):
                model._load_model()

    def test_load_model_raises_without_transformers(self):
        """Test that _load_model raises error when transformers unavailable."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.TORCH_AVAILABLE', True), \
             patch('models.layoutlm.TRANSFORMERS_AVAILABLE', False):
            model = LayoutLMModel(load_model=False)
            with pytest.raises(RuntimeError, match="Transformers is not available"):
                model._load_model()


class TestEnsureModelLoaded:
    """Test _ensure_model_loaded method."""

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_ensure_model_loaded_calls_load_if_not_loaded(self):
        """Test that _ensure_model_loaded loads model if not already loaded."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(load_model=False)
            assert model._model_loaded is False

            model._ensure_model_loaded()

            assert model._model_loaded is True
            mock_processor.from_pretrained.assert_called_once()

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_ensure_model_loaded_skips_if_already_loaded(self):
        """Test that _ensure_model_loaded doesn't reload if already loaded."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(load_model=False)
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

    def test_default_model_is_microsoft_layoutlmv3(self):
        """Test default model is from Microsoft."""
        from models.layoutlm import LayoutLMModel
        assert "microsoft" in LayoutLMModel.DEFAULT_MODEL_NAME
        assert "layoutlmv3" in LayoutLMModel.DEFAULT_MODEL_NAME

    def test_labels_has_21_entries(self):
        """Test that LABELS has 21 entries."""
        from models.layoutlm import LayoutLMModel
        assert len(LayoutLMModel.LABELS) == 21

    def test_label2id_has_21_entries(self):
        """Test that label2id mapping has 21 entries."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert len(model.label2id) == 21

    def test_id2label_has_21_entries(self):
        """Test that id2label mapping has 21 entries."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        assert len(model.id2label) == 21

    def test_all_labels_have_mappings(self):
        """Test that all LABELS have both mappings."""
        from models.layoutlm import LayoutLMModel
        model = LayoutLMModel(load_model=False)
        for label in LayoutLMModel.LABELS:
            assert label in model.label2id
            idx = model.label2id[label]
            assert idx in model.id2label
            assert model.id2label[idx] == label


class TestNumLabelsParameter:
    """Test num_labels parameter for token classification."""

    @patch('models.layoutlm.TORCH_AVAILABLE', True)
    @patch('models.layoutlm.TRANSFORMERS_AVAILABLE', True)
    def test_model_loaded_with_correct_num_labels(self):
        """Test that model is loaded with num_labels=21."""
        from models.layoutlm import LayoutLMModel

        with patch('models.layoutlm.LayoutLMv3Processor') as mock_processor, \
             patch('models.layoutlm.LayoutLMv3ForTokenClassification') as mock_model:

            mock_processor.from_pretrained.return_value = Mock()
            mock_model_instance = Mock()
            mock_model.from_pretrained.return_value = mock_model_instance

            model = LayoutLMModel(device="cpu", load_model=False)
            model._load_model()

            # Check num_labels was passed
            call_kwargs = mock_model.from_pretrained.call_args
            assert call_kwargs.kwargs.get('num_labels') == 21 or \
                   (len(call_kwargs.args) > 1 and call_kwargs.args[1] == 21) or \
                   call_kwargs[1].get('num_labels') == 21
