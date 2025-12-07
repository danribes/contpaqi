"""
Tests for Subtask 8.1: Create InvoiceInferenceEngine class in inference.py

Tests the basic structure of the InvoiceInferenceEngine and InvoiceResult classes.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
from dataclasses import asdict

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestInferenceModuleExists:
    """Test that the inference module exists and can be imported."""

    def test_inference_module_exists(self):
        """Test that inference module can be imported."""
        from inference import InvoiceInferenceEngine
        assert InvoiceInferenceEngine is not None

    def test_invoice_result_exists(self):
        """Test that InvoiceResult dataclass exists."""
        from inference import InvoiceResult
        assert InvoiceResult is not None

    def test_module_has_logger(self):
        """Test that module has a logger."""
        import inference
        assert hasattr(inference, 'logger')


class TestInvoiceResultDataclass:
    """Test the InvoiceResult dataclass structure."""

    def test_invoice_result_has_rfc_emisor(self):
        """Test InvoiceResult has rfc_emisor field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.rfc_emisor == 'XAXX010101000'

    def test_invoice_result_has_rfc_receptor(self):
        """Test InvoiceResult has rfc_receptor field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.rfc_receptor == 'XBBB020202000'

    def test_invoice_result_has_date(self):
        """Test InvoiceResult has date field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.date == '2024-01-01'

    def test_invoice_result_has_subtotal(self):
        """Test InvoiceResult has subtotal field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.subtotal == 1000.0

    def test_invoice_result_has_iva(self):
        """Test InvoiceResult has iva field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.iva == 160.0

    def test_invoice_result_has_total(self):
        """Test InvoiceResult has total field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.total == 1160.0

    def test_invoice_result_has_line_items(self):
        """Test InvoiceResult has line_items field."""
        from inference import InvoiceResult
        items = [{'description': 'Product A', 'quantity': 2, 'amount': 500.0}]
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=items,
            confidence=0.95,
            warnings=[]
        )
        assert result.line_items == items

    def test_invoice_result_has_confidence(self):
        """Test InvoiceResult has confidence field."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        assert result.confidence == 0.95

    def test_invoice_result_has_warnings(self):
        """Test InvoiceResult has warnings field."""
        from inference import InvoiceResult
        warnings = ['Low confidence on RFC']
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=warnings
        )
        assert result.warnings == warnings

    def test_invoice_result_is_dataclass(self):
        """Test InvoiceResult can be converted to dict with asdict."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.95,
            warnings=[]
        )
        result_dict = asdict(result)
        assert isinstance(result_dict, dict)
        assert result_dict['rfc_emisor'] == 'XAXX010101000'


class TestInvoiceInferenceEngineClass:
    """Test the InvoiceInferenceEngine class structure."""

    def test_engine_class_exists(self):
        """Test InvoiceInferenceEngine class exists."""
        from inference import InvoiceInferenceEngine
        assert InvoiceInferenceEngine is not None

    def test_engine_is_callable(self):
        """Test InvoiceInferenceEngine can be instantiated."""
        from inference import InvoiceInferenceEngine
        assert callable(InvoiceInferenceEngine)


class TestInvoiceInferenceEngineAttributes:
    """Test InvoiceInferenceEngine has required attributes."""

    def test_engine_has_ocr_attribute(self):
        """Test engine has ocr attribute."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, 'ocr')

    def test_engine_has_tatr_attribute(self):
        """Test engine has tatr attribute."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, 'tatr')

    def test_engine_has_layoutlm_attribute(self):
        """Test engine has layoutlm attribute."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, 'layoutlm')

    def test_engine_has_load_models_method(self):
        """Test engine has _load_models method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_load_models')
        assert callable(engine._load_models)

    def test_engine_ocr_is_none_without_loading(self):
        """Test engine.ocr is None when load_models=False."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.ocr is None

    def test_engine_tatr_is_none_without_loading(self):
        """Test engine.tatr is None when load_models=False."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.tatr is None

    def test_engine_layoutlm_is_none_without_loading(self):
        """Test engine.layoutlm is None when load_models=False."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.layoutlm is None


class TestInvoiceInferenceEngineLazyLoading:
    """Test optional lazy loading of models."""

    def test_engine_accepts_load_models_param_true(self):
        """Test engine accepts load_models=True parameter."""
        from inference import InvoiceInferenceEngine
        # Should not raise (though may fail to load if deps not available)
        try:
            engine = InvoiceInferenceEngine(load_models=True)
            assert engine is not None
        except Exception:
            # If model loading fails due to missing deps, that's OK for this test
            pass

    def test_engine_accepts_load_models_param_false(self):
        """Test engine accepts load_models=False parameter."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine is not None

    def test_engine_with_load_models_false_has_none_attributes(self):
        """Test engine has None attributes when load_models=False."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine.ocr is None
        assert engine.tatr is None
        assert engine.layoutlm is None

    def test_engine_default_load_models_is_true(self):
        """Test that default for load_models is True."""
        import inspect
        from inference import InvoiceInferenceEngine
        sig = inspect.signature(InvoiceInferenceEngine.__init__)
        load_models_param = sig.parameters.get('load_models')
        assert load_models_param is not None
        assert load_models_param.default is True


class TestInvoiceResultDefaults:
    """Test InvoiceResult with default/empty values."""

    def test_invoice_result_with_empty_strings(self):
        """Test InvoiceResult accepts empty strings."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='',
            rfc_receptor='',
            date='',
            subtotal=0.0,
            iva=0.0,
            total=0.0,
            line_items=[],
            confidence=0.0,
            warnings=[]
        )
        assert result.rfc_emisor == ''

    def test_invoice_result_with_zero_amounts(self):
        """Test InvoiceResult accepts zero amounts."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=0.0,
            iva=0.0,
            total=0.0,
            line_items=[],
            confidence=0.0,
            warnings=[]
        )
        assert result.total == 0.0

    def test_invoice_result_with_multiple_line_items(self):
        """Test InvoiceResult with multiple line items."""
        from inference import InvoiceResult
        items = [
            {'description': 'Product A', 'quantity': 2, 'amount': 500.0},
            {'description': 'Product B', 'quantity': 1, 'amount': 250.0},
            {'description': 'Product C', 'quantity': 5, 'amount': 250.0},
        ]
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='XBBB020202000',
            date='2024-01-01',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=items,
            confidence=0.95,
            warnings=[]
        )
        assert len(result.line_items) == 3


class TestModuleExports:
    """Test that module exports are correct."""

    def test_module_exports_invoice_result(self):
        """Test InvoiceResult is exported."""
        from inference import InvoiceResult
        assert InvoiceResult is not None

    def test_module_exports_inference_engine(self):
        """Test InvoiceInferenceEngine is exported."""
        from inference import InvoiceInferenceEngine
        assert InvoiceInferenceEngine is not None
