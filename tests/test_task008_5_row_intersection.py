"""
Tests for Subtask 8.5: Implement intersection logic (words in rows → line items)

Tests the _assign_words_to_rows() method that assigns words to table rows.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the mcp-container/src to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mcp-container', 'src'))


class TestAssignWordsToRowsMethodExists:
    """Test that _assign_words_to_rows method exists."""

    def test_assign_words_to_rows_method_exists(self):
        """Test that InvoiceInferenceEngine has _assign_words_to_rows method."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert hasattr(engine, '_assign_words_to_rows')

    def test_assign_words_to_rows_is_callable(self):
        """Test that _assign_words_to_rows is callable."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        assert callable(engine._assign_words_to_rows)


class TestAssignWordsToRowsSignature:
    """Test _assign_words_to_rows method signature."""

    def test_accepts_words_parameter(self):
        """Test _assign_words_to_rows accepts words parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._assign_words_to_rows)
        params = list(sig.parameters.keys())
        assert 'words' in params

    def test_accepts_boxes_parameter(self):
        """Test _assign_words_to_rows accepts boxes parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._assign_words_to_rows)
        params = list(sig.parameters.keys())
        assert 'boxes' in params

    def test_accepts_rows_parameter(self):
        """Test _assign_words_to_rows accepts rows parameter."""
        import inspect
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)
        sig = inspect.signature(engine._assign_words_to_rows)
        params = list(sig.parameters.keys())
        assert 'rows' in params


class TestAssignWordsToRowsReturnType:
    """Test _assign_words_to_rows return type."""

    def test_returns_list(self):
        """Test _assign_words_to_rows returns a list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = []
        boxes = []
        rows = []

        result = engine._assign_words_to_rows(words, boxes, rows)
        assert isinstance(result, list)

    def test_returns_empty_list_for_empty_input(self):
        """Test returns empty list when no words or rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        result = engine._assign_words_to_rows([], [], [])
        assert result == []


class TestAssignWordsToRowsBasicLogic:
    """Test basic word-to-row assignment logic."""

    def test_word_assigned_to_row_by_center_y(self):
        """Test word is assigned to row when its center Y is inside row."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Product']
        boxes = [(100, 50, 200, 70)]  # center_y = (50+70)/2 = 60
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]  # y range: 40-80

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 1
        assert len(result[0]['words']) == 1
        assert result[0]['words'][0]['word'] == 'Product'

    def test_word_not_assigned_when_outside_row(self):
        """Test word is not assigned when center Y is outside row."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Header']
        boxes = [(100, 10, 200, 30)]  # center_y = (10+30)/2 = 20
        rows = [{'bbox': (50, 50, 500, 80), 'index': 0}]  # y range: 50-80

        result = engine._assign_words_to_rows(words, boxes, rows)

        # Should return empty list since no words in row
        assert len(result) == 0

    def test_multiple_words_in_same_row(self):
        """Test multiple words assigned to same row."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Product', 'A', '10', '$500']
        boxes = [
            (100, 50, 180, 70),   # center_y = 60
            (190, 50, 210, 70),   # center_y = 60
            (300, 50, 330, 70),   # center_y = 60
            (400, 50, 480, 70),   # center_y = 60
        ]
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 1
        assert len(result[0]['words']) == 4


class TestAssignWordsToRowsMultipleRows:
    """Test assignment with multiple rows."""

    def test_words_assigned_to_correct_rows(self):
        """Test words are assigned to their correct rows."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Row1Word', 'Row2Word', 'Row3Word']
        boxes = [
            (100, 50, 180, 70),   # center_y = 60, in row 0
            (100, 110, 180, 130), # center_y = 120, in row 1
            (100, 170, 180, 190), # center_y = 180, in row 2
        ]
        rows = [
            {'bbox': (50, 40, 500, 80), 'index': 0},
            {'bbox': (50, 100, 500, 140), 'index': 1},
            {'bbox': (50, 160, 500, 200), 'index': 2},
        ]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 3
        assert result[0]['words'][0]['word'] == 'Row1Word'
        assert result[1]['words'][0]['word'] == 'Row2Word'
        assert result[2]['words'][0]['word'] == 'Row3Word'

    def test_row_without_words_not_included(self):
        """Test rows without any words are not included in result."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Word1']
        boxes = [(100, 50, 180, 70)]  # center_y = 60, in row 0
        rows = [
            {'bbox': (50, 40, 500, 80), 'index': 0},   # Has word
            {'bbox': (50, 100, 500, 140), 'index': 1}, # Empty
            {'bbox': (50, 160, 500, 200), 'index': 2}, # Empty
        ]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 1
        assert result[0]['row_index'] == 0


class TestAssignWordsToRowsResultStructure:
    """Test the structure of returned line items."""

    def test_result_has_row_index(self):
        """Test each result item has row_index."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Test']
        boxes = [(100, 50, 180, 70)]
        rows = [{'bbox': (50, 40, 500, 80), 'index': 5}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert 'row_index' in result[0]
        assert result[0]['row_index'] == 5

    def test_result_has_words_list(self):
        """Test each result item has words list."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Test']
        boxes = [(100, 50, 180, 70)]
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert 'words' in result[0]
        assert isinstance(result[0]['words'], list)

    def test_result_has_bbox(self):
        """Test each result item has bbox."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Test']
        boxes = [(100, 50, 180, 70)]
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert 'bbox' in result[0]
        assert result[0]['bbox'] == (50, 40, 500, 80)

    def test_word_entry_has_word_and_bbox(self):
        """Test each word entry has word and bbox."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Test']
        boxes = [(100, 50, 180, 70)]
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        word_entry = result[0]['words'][0]
        assert 'word' in word_entry
        assert 'bbox' in word_entry
        assert word_entry['word'] == 'Test'
        assert word_entry['bbox'] == (100, 50, 180, 70)


class TestAssignWordsToRowsEdgeCases:
    """Test edge cases for word-to-row assignment."""

    def test_word_on_row_boundary_upper(self):
        """Test word exactly on upper row boundary is included."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # center_y = 40, exactly at row y1
        words = ['Boundary']
        boxes = [(100, 30, 180, 50)]  # center_y = 40
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 1

    def test_word_on_row_boundary_lower(self):
        """Test word exactly on lower row boundary is included."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # center_y = 80, exactly at row y2
        words = ['Boundary']
        boxes = [(100, 70, 180, 90)]  # center_y = 80
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 1

    def test_handles_empty_rows_list(self):
        """Test handles empty rows list gracefully."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = ['Word1', 'Word2']
        boxes = [(100, 50, 180, 70), (200, 50, 280, 70)]
        rows = []

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert result == []

    def test_handles_empty_words_list(self):
        """Test handles empty words list gracefully."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        words = []
        boxes = []
        rows = [{'bbox': (50, 40, 500, 80), 'index': 0}]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert result == []


class TestAssignWordsToRowsIntegration:
    """Integration tests for word-to-row assignment."""

    def test_realistic_table_scenario(self):
        """Test with realistic table data."""
        from inference import InvoiceInferenceEngine
        engine = InvoiceInferenceEngine(load_models=False)

        # Simulate a table with header and 2 data rows
        words = [
            # Header row
            'Descripción', 'Cant', 'Precio', 'Importe',
            # Data row 1
            'Producto', 'A', '2', '$500', '$1,000',
            # Data row 2
            'Producto', 'B', '1', '$160', '$160',
        ]
        boxes = [
            # Header row (y: 100-120)
            (50, 100, 150, 120), (200, 100, 250, 120),
            (300, 100, 360, 120), (420, 100, 500, 120),
            # Data row 1 (y: 130-150)
            (50, 130, 120, 150), (125, 130, 145, 150),
            (200, 130, 220, 150), (300, 130, 360, 150), (420, 130, 500, 150),
            # Data row 2 (y: 160-180)
            (50, 160, 120, 180), (125, 160, 145, 180),
            (200, 160, 220, 180), (300, 160, 360, 180), (420, 160, 500, 180),
        ]
        rows = [
            {'bbox': (40, 95, 510, 125), 'index': 0},   # Header
            {'bbox': (40, 125, 510, 155), 'index': 1},  # Data row 1
            {'bbox': (40, 155, 510, 185), 'index': 2},  # Data row 2
        ]

        result = engine._assign_words_to_rows(words, boxes, rows)

        assert len(result) == 3
        assert len(result[0]['words']) == 4  # Header: 4 words
        assert len(result[1]['words']) == 5  # Data row 1: 5 words
        assert len(result[2]['words']) == 5  # Data row 2: 5 words
