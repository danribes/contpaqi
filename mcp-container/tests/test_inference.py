"""
Tests for Subtask 8.8: Integration tests for inference pipeline

These tests verify the complete inference pipeline works end-to-end.
Some tests require sample invoice fixtures and will be skipped if not available.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from pathlib import Path
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Check if fixtures are available
FIXTURES_DIR = Path(__file__).parent / 'fixtures'
SAMPLE_INVOICE_PATH = FIXTURES_DIR / 'sample_invoice.png'
HAS_FIXTURES = SAMPLE_INVOICE_PATH.exists()

# Check if PIL is available for image tests
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    Image = None


class TestInvoiceInferenceEngineImport:
    """Test that the inference module can be imported."""

    def test_can_import_inference_module(self):
        """Test inference module imports successfully."""
        from inference import InvoiceInferenceEngine, InvoiceResult
        assert InvoiceInferenceEngine is not None
        assert InvoiceResult is not None

    def test_invoice_result_fields(self):
        """Test InvoiceResult has all expected fields."""
        from inference import InvoiceResult
        result = InvoiceResult(
            rfc_emisor='XAXX010101000',
            rfc_receptor='CACX7605101P8',
            date='01/01/2024',
            subtotal=1000.0,
            iva=160.0,
            total=1160.0,
            line_items=[],
            confidence=0.9,
            warnings=[]
        )
        assert result.rfc_emisor == 'XAXX010101000'
        assert result.rfc_receptor == 'CACX7605101P8'
        assert result.date == '01/01/2024'
        assert result.subtotal == 1000.0
        assert result.iva == 160.0
        assert result.total == 1160.0
        assert result.confidence == 0.9


class TestInvoiceInferenceEngineInit:
    """Test engine initialization."""

    def test_engine_initializes_without_models(self):
        """Test engine can initialize without loading models."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert engine is not None
        assert engine.ocr is None
        assert engine.tatr is None
        assert engine.layoutlm is None

    def test_engine_has_predict_method(self):
        """Test engine has predict method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, 'predict')
        assert callable(engine.predict)

    def test_engine_has_all_pipeline_methods(self):
        """Test engine has all pipeline methods."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        required_methods = [
            '_run_ocr',
            '_detect_table_structure',
            '_extract_fields',
            '_assign_words_to_rows',
            '_get_field_value',
            '_parse_amount',
            '_parse_line_item',
            '_calculate_confidence',
            'predict'
        ]

        for method in required_methods:
            assert hasattr(engine, method), f"Missing method: {method}"


class TestPredictMethodWithMocks:
    """Test predict method with mocked components."""

    def test_predict_returns_invoice_result(self):
        """Test predict returns InvoiceResult instance."""
        from inference import InvoiceInferenceEngine, InvoiceResult
        engine = InvoiceInferenceEngine(load_models=False)

        # Mock all pipeline steps
        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert isinstance(result, InvoiceResult)

    def test_predict_extracts_rfc_emisor(self):
        """Test predict correctly extracts RFC emisor."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.value = 'XAXX010101000'
        mock_rfc.confidence = 0.95

        engine._run_ocr = Mock(return_value=(['RFC'], [(0, 0, 30, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'RFC_EMISOR': mock_rfc})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_emisor == 'XAXX010101000'
        assert len(result.rfc_emisor) >= 12

    def test_predict_extracts_rfc_receptor(self):
        """Test predict correctly extracts RFC receptor."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_rfc = Mock()
        mock_rfc.value = 'CACX7605101P8'
        mock_rfc.confidence = 0.92

        engine._run_ocr = Mock(return_value=(['RFC'], [(0, 0, 30, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'RFC_RECEPTOR': mock_rfc})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_receptor == 'CACX7605101P8'
        assert len(result.rfc_receptor) >= 12

    def test_predict_extracts_amounts(self):
        """Test predict correctly extracts monetary amounts."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_subtotal = Mock()
        mock_subtotal.value = '1000.00'
        mock_subtotal.confidence = 0.9
        mock_iva = Mock()
        mock_iva.value = '160.00'
        mock_iva.confidence = 0.9
        mock_total = Mock()
        mock_total.value = '1160.00'
        mock_total.confidence = 0.9

        engine._run_ocr = Mock(return_value=(['Total'], [(0, 0, 40, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={
            'SUBTOTAL': mock_subtotal,
            'IVA': mock_iva,
            'TOTAL': mock_total
        })
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.subtotal == 1000.0
        assert result.iva == 160.0
        assert result.total == 1160.0
        assert result.subtotal > 0
        assert result.total > 0

    def test_predict_extracts_line_items(self):
        """Test predict correctly extracts line items."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        row_data = [
            {
                'row_index': 0,
                'words': [
                    {'word': 'Product', 'bbox': (0, 0, 50, 10)},
                    {'word': 'A', 'bbox': (60, 0, 80, 10)},
                    {'word': '$500', 'bbox': (100, 0, 150, 10)}
                ],
                'bbox': (0, 0, 200, 20)
            },
            {
                'row_index': 1,
                'words': [
                    {'word': 'Service', 'bbox': (0, 25, 50, 35)},
                    {'word': 'B', 'bbox': (60, 25, 80, 35)},
                    {'word': '$300', 'bbox': (100, 25, 150, 35)}
                ],
                'bbox': (0, 20, 200, 40)
            }
        ]

        engine._run_ocr = Mock(return_value=(['Product', 'A', 'Service', 'B'], [(0, 0, 50, 10)]*4, [0.9]*4))
        engine._detect_table_structure = Mock(return_value={'table': (0, 0, 200, 50), 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=row_data)

        result = engine.predict(Mock())
        assert len(result.line_items) == 2
        assert 'Product A' in result.line_items[0]['description']
        assert 'Service B' in result.line_items[1]['description']


class TestConfidenceScoring:
    """Test confidence scoring functionality."""

    def test_confidence_in_valid_range(self):
        """Test confidence is between 0 and 1."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.85]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert 0.0 <= result.confidence <= 1.0

    def test_high_confidence_with_all_required_fields(self):
        """Test high confidence when all required fields are present."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_field = Mock()
        mock_field.value = 'TEST'
        mock_field.confidence = 0.95

        fields = {
            'RFC_EMISOR': mock_field,
            'RFC_RECEPTOR': mock_field,
            'TOTAL': mock_field
        }

        engine._run_ocr = Mock(return_value=(['word']*5, [(0, 0, 10, 10)]*5, [0.95]*5))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value=fields)
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.confidence > 0.8

    def test_lower_confidence_with_missing_fields(self):
        """Test lower confidence when required fields are missing."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=(['word'], [(0, 0, 10, 10)], [0.5]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})  # No fields
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.confidence < 0.5


class TestWarningsAndErrors:
    """Test warnings and error handling."""

    def test_result_has_warnings_list(self):
        """Test result includes warnings list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert isinstance(result.warnings, list)

    def test_handles_empty_ocr_results(self):
        """Test graceful handling of empty OCR results."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        engine._run_ocr = Mock(return_value=([], [], []))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.rfc_emisor == ''
        assert result.total == 0.0
        assert result.line_items == []


class TestCurrencyParsing:
    """Test currency amount parsing."""

    def test_parses_simple_amount(self):
        """Test parsing simple numeric amount."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_total = Mock()
        mock_total.value = '1000.00'
        mock_total.confidence = 0.9

        engine._run_ocr = Mock(return_value=(['1000'], [(0, 0, 40, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'TOTAL': mock_total})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.total == 1000.00

    def test_parses_amount_with_currency_symbol(self):
        """Test parsing amount with $ symbol."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_total = Mock()
        mock_total.value = '$1,500.00'
        mock_total.confidence = 0.9

        engine._run_ocr = Mock(return_value=(['$1,500.00'], [(0, 0, 60, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'TOTAL': mock_total})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.total == 1500.00

    def test_parses_amount_with_thousand_separators(self):
        """Test parsing amount with thousand separators."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        mock_total = Mock()
        mock_total.value = '1,234,567.89'
        mock_total.confidence = 0.9

        engine._run_ocr = Mock(return_value=(['1,234,567.89'], [(0, 0, 80, 10)], [0.9]))
        engine._detect_table_structure = Mock(return_value={'table': None, 'rows': []})
        engine._extract_fields = Mock(return_value={'TOTAL': mock_total})
        engine._assign_words_to_rows = Mock(return_value=[])

        result = engine.predict(Mock())
        assert result.total == 1234567.89


@pytest.mark.skipif(not HAS_FIXTURES, reason="Sample invoice fixtures not available")
@pytest.mark.skipif(not HAS_PIL, reason="PIL not available")
class TestIntegrationWithFixtures:
    """Integration tests that require actual sample invoice fixtures."""

    @pytest.fixture
    def engine(self):
        """Create inference engine with models loaded."""
        from inference import InvoiceInferenceEngine
        return InvoiceInferenceEngine(load_models=True)

    @pytest.fixture
    def sample_invoice(self):
        """Load sample invoice image."""
        return Image.open(SAMPLE_INVOICE_PATH)

    def test_predict_returns_result(self, engine, sample_invoice):
        """Test predict returns InvoiceResult with real invoice."""
        from inference import InvoiceResult
        result = engine.predict(sample_invoice)
        assert isinstance(result, InvoiceResult)

    def test_extracts_rfc(self, engine, sample_invoice):
        """Test RFC extraction from real invoice."""
        result = engine.predict(sample_invoice)
        assert result.rfc_emisor
        assert len(result.rfc_emisor) >= 12

    def test_extracts_amounts(self, engine, sample_invoice):
        """Test amount extraction from real invoice."""
        result = engine.predict(sample_invoice)
        assert result.total > 0
        assert result.subtotal > 0

    def test_line_items_present(self, engine, sample_invoice):
        """Test line items extracted from real invoice."""
        result = engine.predict(sample_invoice)
        assert len(result.line_items) > 0

    def test_confidence_reasonable(self, engine, sample_invoice):
        """Test confidence score is reasonable for real invoice."""
        result = engine.predict(sample_invoice)
        assert result.confidence > 0.5
