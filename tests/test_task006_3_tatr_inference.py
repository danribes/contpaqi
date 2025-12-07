"""
Tests for Task 6.3: TATR Table/Row Detection Inference
Tests the detect method and table detection functionality.
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestDetectMethodBasic:
    """Test basic detect method behavior."""

    def test_detect_returns_list(self):
        """Test that detect returns a list."""
        from models.tatr import TATRModel
        model = TATRModel(load_model=False)
        # Without torch/transformers, should return empty list
        result = model.detect(Mock())
        assert isinstance(result, list)

    def test_detect_returns_empty_without_dependencies(self):
        """Test that detect returns empty list when dependencies unavailable."""
        from models.tatr import TATRModel

        with patch('models.tatr.TORCH_AVAILABLE', False):
            model = TATRModel(load_model=False)
            result = model.detect(Mock())
            assert result == []


class TestDetectMethodWithMocks:
    """Test detect method with mocked model."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_preprocesses_image(self):
        """Test that detect preprocesses the image."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            # Setup mocks
            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {0: "table"}
            mock_model_class.from_pretrained.return_value = mock_model

            # Setup post_process mock
            mock_processor.post_process_object_detection.return_value = [{
                "scores": mock_torch.tensor([]),
                "labels": mock_torch.tensor([]),
                "boxes": mock_torch.tensor([])
            }]

            mock_torch.tensor.return_value = Mock()
            mock_torch.no_grad.return_value.__enter__ = Mock()
            mock_torch.no_grad.return_value.__exit__ = Mock()

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            # Create mock image
            mock_image = Mock()
            mock_image.size = (800, 600)

            model.detect(mock_image)

            # Verify processor was called with image
            mock_processor.assert_called()

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_uses_custom_threshold(self):
        """Test that detect uses custom threshold parameter."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {0: "table"}
            mock_model_class.from_pretrained.return_value = mock_model

            mock_processor.post_process_object_detection.return_value = [{
                "scores": [],
                "labels": [],
                "boxes": []
            }]

            mock_torch.tensor.return_value = Mock()
            mock_torch.no_grad.return_value.__enter__ = Mock()
            mock_torch.no_grad.return_value.__exit__ = Mock()

            model = TATRModel(device="cpu", threshold=0.7, load_model=False)
            model._load_model()

            mock_image = Mock()
            mock_image.size = (800, 600)

            # Call with custom threshold
            model.detect(mock_image, threshold=0.5)

            # Verify post_process was called with threshold 0.5
            call_args = mock_processor.post_process_object_detection.call_args
            assert call_args.kwargs.get('threshold') == 0.5


class TestDetectMethodResults:
    """Test detect method result processing."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_returns_tabledetection_objects(self):
        """Test that detect returns TableDetection objects."""
        from models.tatr import TATRModel, TableDetection

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {0: "table", 1: "table row"}
            mock_model_class.from_pretrained.return_value = mock_model

            # Create mock tensors with proper iteration
            mock_score = Mock()
            mock_score.item.return_value = 0.95
            mock_label = Mock()
            mock_label.item.return_value = 0
            mock_box = Mock()
            mock_box.tolist.return_value = [10.0, 20.0, 100.0, 200.0]

            mock_processor.post_process_object_detection.return_value = [{
                "scores": [mock_score],
                "labels": [mock_label],
                "boxes": [mock_box]
            }]

            mock_torch.tensor.return_value = Mock()
            mock_torch.no_grad.return_value.__enter__ = Mock()
            mock_torch.no_grad.return_value.__exit__ = Mock()

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_image = Mock()
            mock_image.size = (800, 600)

            result = model.detect(mock_image)

            assert len(result) == 1
            assert isinstance(result[0], TableDetection)
            assert result[0].label == "table"
            assert result[0].confidence == 0.95
            assert result[0].bbox == (10.0, 20.0, 100.0, 200.0)


class TestDetectMethodWithMultipleDetections:
    """Test detect with multiple detections."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_handles_multiple_detections(self):
        """Test that detect handles multiple detections correctly."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {0: "table", 1: "table row"}
            mock_model_class.from_pretrained.return_value = mock_model

            # Create multiple mock detections
            detections = [
                (0.95, 0, [10, 20, 100, 200]),  # table
                (0.85, 1, [10, 50, 100, 70]),   # row 1
                (0.80, 1, [10, 80, 100, 100]),  # row 2
            ]

            scores = []
            labels = []
            boxes = []
            for conf, label, box in detections:
                mock_score = Mock()
                mock_score.item.return_value = conf
                scores.append(mock_score)

                mock_label = Mock()
                mock_label.item.return_value = label
                labels.append(mock_label)

                mock_box = Mock()
                mock_box.tolist.return_value = box
                boxes.append(mock_box)

            mock_processor.post_process_object_detection.return_value = [{
                "scores": scores,
                "labels": labels,
                "boxes": boxes
            }]

            mock_torch.tensor.return_value = Mock()
            mock_torch.no_grad.return_value.__enter__ = Mock()
            mock_torch.no_grad.return_value.__exit__ = Mock()

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_image = Mock()
            mock_image.size = (800, 600)

            result = model.detect(mock_image)

            assert len(result) == 3
            assert result[0].label == "table"
            assert result[1].label == "table row"
            assert result[2].label == "table row"


class TestDetectWithNoGrad:
    """Test that detect uses no_grad context."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_uses_no_grad(self):
        """Test that inference runs in no_grad context."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {}
            mock_model_class.from_pretrained.return_value = mock_model

            mock_processor.post_process_object_detection.return_value = [{
                "scores": [],
                "labels": [],
                "boxes": []
            }]

            mock_no_grad = MagicMock()
            mock_torch.no_grad.return_value = mock_no_grad
            mock_torch.tensor.return_value = Mock()

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_image = Mock()
            mock_image.size = (800, 600)

            model.detect(mock_image)

            # Verify no_grad was used as context manager
            mock_torch.no_grad.assert_called()


class TestDetectImageSizeHandling:
    """Test image size handling in detect."""

    @patch('models.tatr.TORCH_AVAILABLE', True)
    @patch('models.tatr.TRANSFORMERS_AVAILABLE', True)
    def test_detect_uses_image_size_for_target(self):
        """Test that detect creates target_sizes from image size."""
        from models.tatr import TATRModel

        with patch('models.tatr.AutoImageProcessor') as mock_processor_class, \
             patch('models.tatr.AutoModelForObjectDetection') as mock_model_class, \
             patch('models.tatr.torch') as mock_torch:

            mock_processor = Mock()
            mock_processor.return_value = {"pixel_values": Mock()}
            mock_processor_class.from_pretrained.return_value = mock_processor

            mock_model = Mock()
            mock_model.config = Mock()
            mock_model.config.id2label = {}
            mock_model_class.from_pretrained.return_value = mock_model

            mock_processor.post_process_object_detection.return_value = [{
                "scores": [],
                "labels": [],
                "boxes": []
            }]

            mock_torch.tensor.return_value = Mock()
            mock_torch.no_grad.return_value.__enter__ = Mock()
            mock_torch.no_grad.return_value.__exit__ = Mock()

            model = TATRModel(device="cpu", load_model=False)
            model._load_model()

            mock_image = Mock()
            mock_image.size = (800, 600)  # width, height

            model.detect(mock_image)

            # image.size is (width, height), but target_sizes should be (height, width)
            # So [::-1] reverses it to (600, 800)
            mock_torch.tensor.assert_called()
