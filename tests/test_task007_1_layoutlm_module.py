"""
Tests for Task 7.1: LayoutLM Module Structure
Tests the basic structure of the LayoutLM module.
"""
import pytest
import sys
from pathlib import Path

# Add mcp-container/src to path for imports
MCP_SRC = Path(__file__).parent.parent / "mcp-container" / "src"
sys.path.insert(0, str(MCP_SRC))


class TestLayoutLMModuleExists:
    """Test that the LayoutLM module file exists and is importable."""

    def test_layoutlm_module_file_exists(self):
        """Test that layoutlm.py file exists in models directory."""
        layoutlm_path = MCP_SRC / "models" / "layoutlm.py"
        assert layoutlm_path.exists(), f"layoutlm.py should exist at {layoutlm_path}"

    def test_layoutlm_module_importable(self):
        """Test that layoutlm module can be imported."""
        try:
            from models import layoutlm
            assert layoutlm is not None
        except ImportError as e:
            pytest.fail(f"Should be able to import layoutlm module: {e}")

    def test_layoutlm_module_has_docstring(self):
        """Test that layoutlm module has a docstring."""
        from models import layoutlm
        assert layoutlm.__doc__ is not None
        assert len(layoutlm.__doc__) > 0
        assert "LayoutLM" in layoutlm.__doc__ or "token classification" in layoutlm.__doc__.lower()


class TestExtractedFieldDataclass:
    """Test the ExtractedField dataclass structure."""

    def test_extractedfield_exists(self):
        """Test that ExtractedField class exists."""
        from models.layoutlm import ExtractedField
        assert ExtractedField is not None

    def test_extractedfield_is_dataclass(self):
        """Test that ExtractedField is a dataclass."""
        from dataclasses import is_dataclass
        from models.layoutlm import ExtractedField
        assert is_dataclass(ExtractedField), "ExtractedField should be a dataclass"

    def test_extractedfield_has_label_field(self):
        """Test that ExtractedField has label field."""
        from models.layoutlm import ExtractedField
        field = ExtractedField(label="RFC_EMISOR", value="ABC123", confidence=0.95, bbox=(0, 0, 100, 20))
        assert hasattr(field, 'label')
        assert field.label == "RFC_EMISOR"

    def test_extractedfield_has_value_field(self):
        """Test that ExtractedField has value field."""
        from models.layoutlm import ExtractedField
        field = ExtractedField(label="TOTAL", value="$1,234.56", confidence=0.9, bbox=(0, 0, 100, 20))
        assert hasattr(field, 'value')
        assert field.value == "$1,234.56"

    def test_extractedfield_has_confidence_field(self):
        """Test that ExtractedField has confidence field."""
        from models.layoutlm import ExtractedField
        field = ExtractedField(label="DATE", value="2024-01-15", confidence=0.85, bbox=(0, 0, 100, 20))
        assert hasattr(field, 'confidence')
        assert field.confidence == 0.85

    def test_extractedfield_has_bbox_field(self):
        """Test that ExtractedField has bbox field."""
        from models.layoutlm import ExtractedField
        field = ExtractedField(label="SUBTOTAL", value="1000.00", confidence=0.9, bbox=(10, 20, 100, 50))
        assert hasattr(field, 'bbox')
        assert field.bbox == (10, 20, 100, 50)

    def test_extractedfield_bbox_is_tuple(self):
        """Test that bbox is a tuple of 4 elements."""
        from models.layoutlm import ExtractedField
        field = ExtractedField(label="IVA", value="160.00", confidence=0.88, bbox=(10, 20, 200, 50))
        assert isinstance(field.bbox, tuple)
        assert len(field.bbox) == 4


class TestExtractedFieldValidation:
    """Test ExtractedField validation."""

    def test_extractedfield_validates_bbox_length(self):
        """Test that bbox must have 4 elements."""
        from models.layoutlm import ExtractedField
        with pytest.raises((ValueError, TypeError)):
            ExtractedField(label="TOTAL", value="100", confidence=0.9, bbox=(0, 0, 100))

    def test_extractedfield_validates_confidence_range(self):
        """Test that confidence must be between 0 and 1."""
        from models.layoutlm import ExtractedField
        with pytest.raises(ValueError):
            ExtractedField(label="TOTAL", value="100", confidence=1.5, bbox=(0, 0, 100, 20))

    def test_extractedfield_validates_confidence_negative(self):
        """Test that confidence cannot be negative."""
        from models.layoutlm import ExtractedField
        with pytest.raises(ValueError):
            ExtractedField(label="TOTAL", value="100", confidence=-0.1, bbox=(0, 0, 100, 20))


class TestLayoutLMModelClass:
    """Test the LayoutLMModel class structure."""

    def test_layoutlmmodel_exists(self):
        """Test that LayoutLMModel class exists."""
        from models.layoutlm import LayoutLMModel
        assert LayoutLMModel is not None

    def test_layoutlmmodel_has_labels_constant(self):
        """Test that LayoutLMModel has LABELS constant."""
        from models.layoutlm import LayoutLMModel
        assert hasattr(LayoutLMModel, 'LABELS')
        assert isinstance(LayoutLMModel.LABELS, (list, tuple))

    def test_layoutlmmodel_labels_include_o(self):
        """Test that LABELS includes 'O' (outside) label."""
        from models.layoutlm import LayoutLMModel
        assert 'O' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_rfc_emisor(self):
        """Test that LABELS includes RFC_EMISOR labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-RFC_EMISOR' in LayoutLMModel.LABELS
        assert 'I-RFC_EMISOR' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_rfc_receptor(self):
        """Test that LABELS includes RFC_RECEPTOR labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-RFC_RECEPTOR' in LayoutLMModel.LABELS
        assert 'I-RFC_RECEPTOR' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_date(self):
        """Test that LABELS includes DATE labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-DATE' in LayoutLMModel.LABELS
        assert 'I-DATE' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_total(self):
        """Test that LABELS includes TOTAL labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-TOTAL' in LayoutLMModel.LABELS
        assert 'I-TOTAL' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_subtotal(self):
        """Test that LABELS includes SUBTOTAL labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-SUBTOTAL' in LayoutLMModel.LABELS
        assert 'I-SUBTOTAL' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_iva(self):
        """Test that LABELS includes IVA labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-IVA' in LayoutLMModel.LABELS
        assert 'I-IVA' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_item_desc(self):
        """Test that LABELS includes ITEM_DESC labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-ITEM_DESC' in LayoutLMModel.LABELS
        assert 'I-ITEM_DESC' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_item_qty(self):
        """Test that LABELS includes ITEM_QTY labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-ITEM_QTY' in LayoutLMModel.LABELS
        assert 'I-ITEM_QTY' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_item_price(self):
        """Test that LABELS includes ITEM_PRICE labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-ITEM_PRICE' in LayoutLMModel.LABELS
        assert 'I-ITEM_PRICE' in LayoutLMModel.LABELS

    def test_layoutlmmodel_labels_include_item_amount(self):
        """Test that LABELS includes ITEM_AMOUNT labels."""
        from models.layoutlm import LayoutLMModel
        assert 'B-ITEM_AMOUNT' in LayoutLMModel.LABELS
        assert 'I-ITEM_AMOUNT' in LayoutLMModel.LABELS

    def test_layoutlmmodel_has_default_model_name(self):
        """Test that LayoutLMModel has default model name."""
        from models.layoutlm import LayoutLMModel
        assert hasattr(LayoutLMModel, 'DEFAULT_MODEL_NAME') or hasattr(LayoutLMModel, 'MODEL_NAME')

    def test_layoutlmmodel_has_predict_method(self):
        """Test that LayoutLMModel has predict method."""
        from models.layoutlm import LayoutLMModel
        assert hasattr(LayoutLMModel, 'predict')
        assert callable(getattr(LayoutLMModel, 'predict'))

    def test_layoutlmmodel_has_extract_fields_method(self):
        """Test that LayoutLMModel has extract_fields method."""
        from models.layoutlm import LayoutLMModel
        assert hasattr(LayoutLMModel, 'extract_fields')
        assert callable(getattr(LayoutLMModel, 'extract_fields'))


class TestLayoutLMModelInit:
    """Test LayoutLMModel initialization."""

    def test_layoutlmmodel_init_accepts_model_name(self):
        """Test that LayoutLMModel init accepts model_name parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.__init__)
        params = list(sig.parameters.keys())
        assert 'model_name' in params or 'model_path' in params

    def test_layoutlmmodel_init_accepts_device(self):
        """Test that LayoutLMModel init accepts device parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.__init__)
        params = list(sig.parameters.keys())
        assert 'device' in params


class TestModuleExports:
    """Test module exports and __all__."""

    def test_module_exports_extractedfield(self):
        """Test that module exports ExtractedField."""
        from models.layoutlm import ExtractedField
        assert ExtractedField is not None

    def test_module_exports_layoutlmmodel(self):
        """Test that module exports LayoutLMModel."""
        from models.layoutlm import LayoutLMModel
        assert LayoutLMModel is not None

    def test_module_has_all_attribute(self):
        """Test that module has __all__ attribute."""
        from models import layoutlm
        assert hasattr(layoutlm, '__all__')
        assert 'ExtractedField' in layoutlm.__all__
        assert 'LayoutLMModel' in layoutlm.__all__


class TestLayoutLMAvailabilityFlags:
    """Test LayoutLM availability flags."""

    def test_module_has_torch_available_flag(self):
        """Test that module has TORCH_AVAILABLE flag."""
        from models import layoutlm
        assert hasattr(layoutlm, 'TORCH_AVAILABLE')

    def test_module_has_transformers_available_flag(self):
        """Test that module has TRANSFORMERS_AVAILABLE flag."""
        from models import layoutlm
        assert hasattr(layoutlm, 'TRANSFORMERS_AVAILABLE')


class TestPredictMethodSignature:
    """Test predict method signature."""

    def test_predict_accepts_image_parameter(self):
        """Test that predict accepts image parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.predict)
        params = list(sig.parameters.keys())
        assert 'image' in params

    def test_predict_accepts_words_parameter(self):
        """Test that predict accepts words parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.predict)
        params = list(sig.parameters.keys())
        assert 'words' in params

    def test_predict_accepts_boxes_parameter(self):
        """Test that predict accepts boxes parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.predict)
        params = list(sig.parameters.keys())
        assert 'boxes' in params


class TestExtractFieldsMethodSignature:
    """Test extract_fields method signature."""

    def test_extract_fields_accepts_predictions(self):
        """Test that extract_fields accepts predictions parameter."""
        from models.layoutlm import LayoutLMModel
        import inspect
        sig = inspect.signature(LayoutLMModel.extract_fields)
        params = list(sig.parameters.keys())
        assert 'predictions' in params


class TestBIOTaggingLabels:
    """Test BIO tagging label structure."""

    def test_labels_follow_bio_format(self):
        """Test that labels follow B-/I- prefix format."""
        from models.layoutlm import LayoutLMModel
        for label in LayoutLMModel.LABELS:
            if label != 'O':
                assert label.startswith('B-') or label.startswith('I-'), \
                    f"Label '{label}' should start with 'B-' or 'I-'"

    def test_every_b_label_has_matching_i_label(self):
        """Test that every B- label has a matching I- label."""
        from models.layoutlm import LayoutLMModel
        b_labels = [l for l in LayoutLMModel.LABELS if l.startswith('B-')]
        for b_label in b_labels:
            i_label = 'I-' + b_label[2:]
            assert i_label in LayoutLMModel.LABELS, \
                f"B-label '{b_label}' should have matching I-label '{i_label}'"

    def test_labels_count_is_21(self):
        """Test that there are 21 labels (O + 10 entities * 2 BIO tags)."""
        from models.layoutlm import LayoutLMModel
        assert len(LayoutLMModel.LABELS) == 21
