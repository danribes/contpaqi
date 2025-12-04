"""
Test Suite for Subtask 3.3: LayoutLMv3 Data Preparation (BIO Tags)

Tests verify:
- OCR token extraction works
- BIO tagging is correct
- Token-to-ground truth matching
- Dataset format is valid for LayoutLMv3
"""

import json
import os
import pytest
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestLayoutLMModuleExists:
    """Test that LayoutLM format utilities exist."""

    def test_has_get_ocr_tokens_function(self):
        """Module should have get_ocr_tokens function."""
        from prepare_datasets import get_ocr_tokens
        assert callable(get_ocr_tokens)

    def test_has_match_token_to_field_function(self):
        """Module should have match_token_to_field function."""
        from prepare_datasets import match_token_to_field
        assert callable(match_token_to_field)

    def test_has_create_bio_tags_function(self):
        """Module should have create_bio_tags function."""
        from prepare_datasets import create_bio_tags
        assert callable(create_bio_tags)

    def test_has_get_label_list_function(self):
        """Module should have get_label_list function."""
        from prepare_datasets import get_label_list
        assert callable(get_label_list)


class TestLabelList:
    """Test the label list for BIO tagging."""

    def test_returns_list(self):
        """Should return a list of labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert isinstance(labels, list)

    def test_includes_outside_label(self):
        """Should include O (outside) label."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'O' in labels

    def test_includes_rfc_emisor_labels(self):
        """Should include RFC_EMISOR labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-RFC_EMISOR' in labels
        assert 'I-RFC_EMISOR' in labels

    def test_includes_rfc_receptor_labels(self):
        """Should include RFC_RECEPTOR labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-RFC_RECEPTOR' in labels
        assert 'I-RFC_RECEPTOR' in labels

    def test_includes_total_labels(self):
        """Should include TOTAL labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-TOTAL' in labels
        assert 'I-TOTAL' in labels

    def test_includes_date_labels(self):
        """Should include DATE labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-DATE' in labels
        assert 'I-DATE' in labels

    def test_includes_subtotal_labels(self):
        """Should include SUBTOTAL labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-SUBTOTAL' in labels
        assert 'I-SUBTOTAL' in labels

    def test_includes_iva_labels(self):
        """Should include IVA labels."""
        from prepare_datasets import get_label_list

        labels = get_label_list()
        assert 'B-IVA' in labels
        assert 'I-IVA' in labels


class TestMatchTokenToField:
    """Test token matching to ground truth fields."""

    def test_matches_exact_text(self):
        """Should match token to field with exact text."""
        from prepare_datasets import match_token_to_field

        ground_truth = {
            'fields': {
                'rfc_emisor': 'XAXX010101ABC',
                'total': 1160.00
            }
        }

        result = match_token_to_field('XAXX010101ABC', ground_truth)
        assert result == 'RFC_EMISOR'

    def test_matches_numeric_value(self):
        """Should match numeric token to field."""
        from prepare_datasets import match_token_to_field

        ground_truth = {
            'fields': {
                'total': 1160.00,
                'subtotal': 1000.00
            }
        }

        result = match_token_to_field('1,160.00', ground_truth)
        assert result == 'TOTAL'

    def test_returns_none_for_no_match(self):
        """Should return None for non-matching token."""
        from prepare_datasets import match_token_to_field

        ground_truth = {
            'fields': {
                'total': 1160.00
            }
        }

        result = match_token_to_field('random_text', ground_truth)
        assert result is None

    def test_matches_date_field(self):
        """Should match date token to DATE field."""
        from prepare_datasets import match_token_to_field

        ground_truth = {
            'fields': {
                'date': '2024-03-15'
            }
        }

        result = match_token_to_field('2024-03-15', ground_truth)
        assert result == 'DATE'


class TestCreateBioTags:
    """Test BIO tag creation."""

    def test_returns_list_of_tags(self):
        """Should return list of BIO tags."""
        from prepare_datasets import create_bio_tags

        tokens = [
            {'text': 'RFC:', 'bbox': [10, 10, 50, 30]},
            {'text': 'XAXX010101ABC', 'bbox': [60, 10, 150, 30]},
        ]
        ground_truth = {
            'fields': {
                'rfc_emisor': 'XAXX010101ABC'
            }
        }

        result = create_bio_tags(tokens, ground_truth)

        assert isinstance(result, list)
        assert len(result) == len(tokens)

    def test_tags_outside_tokens_as_O(self):
        """Should tag non-entity tokens as O."""
        from prepare_datasets import create_bio_tags

        tokens = [
            {'text': 'Invoice', 'bbox': [10, 10, 50, 30]},
            {'text': 'Details', 'bbox': [60, 10, 100, 30]},
        ]
        ground_truth = {
            'fields': {
                'rfc_emisor': 'XAXX010101ABC'
            }
        }

        result = create_bio_tags(tokens, ground_truth)

        assert result[0] == 'O'
        assert result[1] == 'O'

    def test_tags_matching_token_with_b_prefix(self):
        """Should tag first matching token with B- prefix."""
        from prepare_datasets import create_bio_tags

        tokens = [
            {'text': 'XAXX010101ABC', 'bbox': [10, 10, 150, 30]},
        ]
        ground_truth = {
            'fields': {
                'rfc_emisor': 'XAXX010101ABC'
            }
        }

        result = create_bio_tags(tokens, ground_truth)

        assert result[0] == 'B-RFC_EMISOR'


class TestGetOcrTokens:
    """Test OCR token extraction."""

    def test_returns_list(self):
        """Should return a list of tokens."""
        from prepare_datasets import get_ocr_tokens
        from PIL import Image

        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='white')

        result = get_ocr_tokens(img)

        assert isinstance(result, list)

    def test_token_has_text_field(self):
        """Each token should have text field."""
        from prepare_datasets import get_ocr_tokens
        from PIL import Image

        # Create a test image with some content
        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(1, tmpdir, templates_dir)

            from prepare_datasets import pdf_to_image
            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            if os.path.exists(pdf_path):
                img = pdf_to_image(pdf_path)
                tokens = get_ocr_tokens(img)

                if tokens:  # Only check if tokens were found
                    assert 'text' in tokens[0]

    def test_token_has_bbox_field(self):
        """Each token should have bbox field."""
        from prepare_datasets import get_ocr_tokens
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(1, tmpdir, templates_dir)

            from prepare_datasets import pdf_to_image
            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            if os.path.exists(pdf_path):
                img = pdf_to_image(pdf_path)
                tokens = get_ocr_tokens(img)

                if tokens:
                    assert 'bbox' in tokens[0]
                    assert len(tokens[0]['bbox']) == 4

    def test_bbox_format_is_x1_y1_x2_y2(self):
        """Bbox should be in [x1, y1, x2, y2] format."""
        from prepare_datasets import get_ocr_tokens
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(1, tmpdir, templates_dir)

            from prepare_datasets import pdf_to_image
            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            if os.path.exists(pdf_path):
                img = pdf_to_image(pdf_path)
                tokens = get_ocr_tokens(img)

                if tokens:
                    bbox = tokens[0]['bbox']
                    # x2 should be >= x1, y2 should be >= y1
                    assert bbox[2] >= bbox[0]
                    assert bbox[3] >= bbox[1]


class TestCreateLayoutLMSample:
    """Test LayoutLM sample creation."""

    def test_has_create_layoutlm_sample_function(self):
        """Module should have create_layoutlm_sample function."""
        from prepare_datasets import create_layoutlm_sample
        assert callable(create_layoutlm_sample)

    def test_sample_has_tokens_key(self):
        """Sample should have tokens key."""
        from prepare_datasets import create_layoutlm_sample

        tokens = [
            {'text': 'Test', 'bbox': [10, 10, 50, 30]},
        ]
        ground_truth = {'fields': {}}
        image_path = 'test.png'

        result = create_layoutlm_sample(tokens, ground_truth, image_path)

        assert 'tokens' in result

    def test_sample_has_bboxes_key(self):
        """Sample should have bboxes key."""
        from prepare_datasets import create_layoutlm_sample

        tokens = [
            {'text': 'Test', 'bbox': [10, 10, 50, 30]},
        ]
        ground_truth = {'fields': {}}
        image_path = 'test.png'

        result = create_layoutlm_sample(tokens, ground_truth, image_path)

        assert 'bboxes' in result

    def test_sample_has_ner_tags_key(self):
        """Sample should have ner_tags key."""
        from prepare_datasets import create_layoutlm_sample

        tokens = [
            {'text': 'Test', 'bbox': [10, 10, 50, 30]},
        ]
        ground_truth = {'fields': {}}
        image_path = 'test.png'

        result = create_layoutlm_sample(tokens, ground_truth, image_path)

        assert 'ner_tags' in result

    def test_sample_has_image_path_key(self):
        """Sample should have image_path key."""
        from prepare_datasets import create_layoutlm_sample

        tokens = [
            {'text': 'Test', 'bbox': [10, 10, 50, 30]},
        ]
        ground_truth = {'fields': {}}
        image_path = 'test.png'

        result = create_layoutlm_sample(tokens, ground_truth, image_path)

        assert 'image_path' in result

    def test_ner_tags_are_integers(self):
        """NER tags should be integer label IDs."""
        from prepare_datasets import create_layoutlm_sample

        tokens = [
            {'text': 'Test', 'bbox': [10, 10, 50, 30]},
        ]
        ground_truth = {'fields': {}}
        image_path = 'test.png'

        result = create_layoutlm_sample(tokens, ground_truth, image_path)

        assert all(isinstance(tag, int) for tag in result['ner_tags'])


class TestFormatLayoutLMIntegration:
    """Integration tests for format_layoutlm function."""

    def test_creates_output_directory(self):
        """Should create LayoutLM output directory."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'pdfs'))
            os.makedirs(os.path.join(input_dir, 'labels'))

            format_layoutlm(input_dir, output_dir)

            assert os.path.isdir(os.path.join(output_dir, 'layoutlm'))

    def test_returns_statistics(self):
        """Should return processing statistics."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'pdfs'))
            os.makedirs(os.path.join(input_dir, 'labels'))

            result = format_layoutlm(input_dir, output_dir)

            assert isinstance(result, dict)
            assert 'processed' in result
            assert 'status' in result

    def test_creates_samples_json(self):
        """Should create samples.json file."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_layoutlm(input_dir, output_dir)

            samples_path = os.path.join(output_dir, 'layoutlm', 'samples.json')
            assert os.path.exists(samples_path)

    def test_samples_json_is_valid(self):
        """samples.json should be valid JSON."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_layoutlm(input_dir, output_dir)

            samples_path = os.path.join(output_dir, 'layoutlm', 'samples.json')
            with open(samples_path, 'r') as f:
                data = json.load(f)

            assert isinstance(data, list)

    def test_creates_labels_json(self):
        """Should create labels.json with label mapping."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_layoutlm(input_dir, output_dir)

            labels_path = os.path.join(output_dir, 'layoutlm', 'labels.json')
            assert os.path.exists(labels_path)

    def test_creates_images_directory(self):
        """Should create images directory."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_layoutlm(input_dir, output_dir)

            images_dir = os.path.join(output_dir, 'layoutlm', 'images')
            assert os.path.isdir(images_dir)


class TestNormalizeBboxForLayoutLM:
    """Test bbox normalization for LayoutLM (0-1000 scale)."""

    def test_has_normalize_bbox_layoutlm_function(self):
        """Module should have normalize_bbox_layoutlm function."""
        from prepare_datasets import normalize_bbox_layoutlm
        assert callable(normalize_bbox_layoutlm)

    def test_normalizes_to_1000_scale(self):
        """Should normalize bbox to 0-1000 scale."""
        from prepare_datasets import normalize_bbox_layoutlm

        # Bbox [x1, y1, x2, y2] format
        bbox = [100, 200, 200, 300]  # x1, y1, x2, y2
        result = normalize_bbox_layoutlm(bbox, 1000, 1000)

        assert result == [100, 200, 200, 300]

    def test_handles_different_image_sizes(self):
        """Should handle different image dimensions."""
        from prepare_datasets import normalize_bbox_layoutlm

        bbox = [50, 100, 150, 200]  # x1, y1, x2, y2 on 500x400 image
        result = normalize_bbox_layoutlm(bbox, 500, 400)

        # x: 50/500*1000 = 100, 150/500*1000 = 300
        # y: 100/400*1000 = 250, 200/400*1000 = 500
        assert result[0] == 100
        assert result[1] == 250
        assert result[2] == 300
        assert result[3] == 500
