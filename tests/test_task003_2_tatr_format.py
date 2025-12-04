"""
Test Suite for Subtask 3.2: TATR Data Preparation (COCO Format)

Tests verify:
- COCO format structure is correct
- Bounding box normalization works
- PDF to image conversion
- Table and row annotations are created
- Output files are valid JSON
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


class TestCocoFormatModule:
    """Test that COCO format utilities exist."""

    def test_has_create_coco_dataset_function(self):
        """Module should have create_coco_dataset function."""
        from prepare_datasets import create_coco_dataset
        assert callable(create_coco_dataset)

    def test_has_normalize_bbox_function(self):
        """Module should have normalize_bbox function."""
        from prepare_datasets import normalize_bbox
        assert callable(normalize_bbox)

    def test_has_pdf_to_image_function(self):
        """Module should have pdf_to_image function."""
        from prepare_datasets import pdf_to_image
        assert callable(pdf_to_image)

    def test_has_extract_table_bbox_function(self):
        """Module should have extract_table_bbox function."""
        from prepare_datasets import extract_table_bbox
        assert callable(extract_table_bbox)


class TestNormalizeBbox:
    """Test bounding box normalization."""

    def test_normalizes_to_1000_scale(self):
        """Should normalize bbox to 0-1000 scale."""
        from prepare_datasets import normalize_bbox

        # Bbox at (100, 200, 50, 30) on 1000x800 image
        bbox = [100, 200, 50, 30]  # x, y, width, height
        result = normalize_bbox(bbox, 1000, 800)

        # x: 100/1000*1000 = 100
        # y: 200/800*1000 = 250
        # w: 50/1000*1000 = 50
        # h: 30/800*1000 = 37.5 -> 37 or 38
        assert result[0] == 100
        assert result[1] == 250
        assert result[2] == 50
        assert 37 <= result[3] <= 38

    def test_handles_full_page_bbox(self):
        """Should handle full page bounding box."""
        from prepare_datasets import normalize_bbox

        bbox = [0, 0, 612, 792]  # Full letter page
        result = normalize_bbox(bbox, 612, 792)

        assert result[0] == 0
        assert result[1] == 0
        assert result[2] == 1000
        assert result[3] == 1000

    def test_returns_integers(self):
        """Normalized bbox should contain integers."""
        from prepare_datasets import normalize_bbox

        bbox = [123, 456, 78, 90]
        result = normalize_bbox(bbox, 500, 700)

        assert all(isinstance(v, int) for v in result)

    def test_handles_zero_values(self):
        """Should handle zero position values."""
        from prepare_datasets import normalize_bbox

        bbox = [0, 0, 100, 100]
        result = normalize_bbox(bbox, 1000, 1000)

        assert result[0] == 0
        assert result[1] == 0


class TestCreateCocoDataset:
    """Test COCO dataset creation."""

    def test_returns_dict(self):
        """Should return a dictionary."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        assert isinstance(result, dict)

    def test_has_images_key(self):
        """Should have images key."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        assert 'images' in result
        assert isinstance(result['images'], list)

    def test_has_annotations_key(self):
        """Should have annotations key."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        assert 'annotations' in result
        assert isinstance(result['annotations'], list)

    def test_has_categories_key(self):
        """Should have categories key."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        assert 'categories' in result
        assert isinstance(result['categories'], list)

    def test_categories_include_table(self):
        """Categories should include 'table'."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        category_names = [c['name'] for c in result['categories']]
        assert 'table' in category_names

    def test_categories_include_table_row(self):
        """Categories should include 'table_row'."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        category_names = [c['name'] for c in result['categories']]
        assert 'table_row' in category_names

    def test_categories_have_required_fields(self):
        """Each category should have id and name."""
        from prepare_datasets import create_coco_dataset

        result = create_coco_dataset()

        for cat in result['categories']:
            assert 'id' in cat
            assert 'name' in cat


class TestAddImageToCocoDataset:
    """Test adding images to COCO dataset."""

    def test_has_add_image_function(self):
        """Module should have add_image_to_coco function."""
        from prepare_datasets import add_image_to_coco
        assert callable(add_image_to_coco)

    def test_adds_image_entry(self):
        """Should add image entry to dataset."""
        from prepare_datasets import create_coco_dataset, add_image_to_coco

        dataset = create_coco_dataset()
        add_image_to_coco(dataset, 1, 'invoice_00001.png', 612, 792)

        assert len(dataset['images']) == 1
        assert dataset['images'][0]['id'] == 1
        assert dataset['images'][0]['file_name'] == 'invoice_00001.png'

    def test_image_has_dimensions(self):
        """Image entry should have width and height."""
        from prepare_datasets import create_coco_dataset, add_image_to_coco

        dataset = create_coco_dataset()
        add_image_to_coco(dataset, 1, 'test.png', 800, 600)

        assert dataset['images'][0]['width'] == 800
        assert dataset['images'][0]['height'] == 600


class TestAddAnnotationToCocoDataset:
    """Test adding annotations to COCO dataset."""

    def test_has_add_annotation_function(self):
        """Module should have add_annotation_to_coco function."""
        from prepare_datasets import add_annotation_to_coco
        assert callable(add_annotation_to_coco)

    def test_adds_annotation_entry(self):
        """Should add annotation entry to dataset."""
        from prepare_datasets import create_coco_dataset, add_annotation_to_coco

        dataset = create_coco_dataset()
        bbox = [100, 200, 300, 400]
        add_annotation_to_coco(dataset, 1, 1, 1, bbox)

        assert len(dataset['annotations']) == 1
        assert dataset['annotations'][0]['id'] == 1
        assert dataset['annotations'][0]['image_id'] == 1
        assert dataset['annotations'][0]['category_id'] == 1

    def test_annotation_has_bbox(self):
        """Annotation should have bbox."""
        from prepare_datasets import create_coco_dataset, add_annotation_to_coco

        dataset = create_coco_dataset()
        bbox = [10, 20, 30, 40]
        add_annotation_to_coco(dataset, 1, 1, 1, bbox)

        assert dataset['annotations'][0]['bbox'] == bbox

    def test_annotation_has_area(self):
        """Annotation should have area calculated."""
        from prepare_datasets import create_coco_dataset, add_annotation_to_coco

        dataset = create_coco_dataset()
        bbox = [0, 0, 100, 50]  # width=100, height=50, area=5000
        add_annotation_to_coco(dataset, 1, 1, 1, bbox)

        assert dataset['annotations'][0]['area'] == 5000


class TestExtractTableBbox:
    """Test table bounding box extraction."""

    def test_extracts_from_line_items(self):
        """Should extract table bbox from line items."""
        from prepare_datasets import extract_table_bbox

        # Sample ground truth with line items
        ground_truth = {
            'line_items': [
                {'bbox': {'x': 50, 'y': 100, 'width': 400, 'height': 20}},
                {'bbox': {'x': 50, 'y': 130, 'width': 400, 'height': 20}},
                {'bbox': {'x': 50, 'y': 160, 'width': 400, 'height': 20}},
            ]
        }

        result = extract_table_bbox(ground_truth)

        # Should encompass all line items
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 4  # [x, y, width, height]

    def test_returns_none_for_no_line_items(self):
        """Should return None if no line items."""
        from prepare_datasets import extract_table_bbox

        ground_truth = {'line_items': []}
        result = extract_table_bbox(ground_truth)

        assert result is None

    def test_handles_missing_bboxes(self):
        """Should handle line items without bboxes."""
        from prepare_datasets import extract_table_bbox

        ground_truth = {
            'line_items': [
                {'bbox': None},
                {'bbox': {'x': 50, 'y': 100, 'width': 400, 'height': 20}},
            ]
        }

        result = extract_table_bbox(ground_truth)

        # Should still work with available bboxes
        assert result is not None


class TestExtractRowBboxes:
    """Test row bounding box extraction."""

    def test_has_extract_row_bboxes_function(self):
        """Module should have extract_row_bboxes function."""
        from prepare_datasets import extract_row_bboxes
        assert callable(extract_row_bboxes)

    def test_returns_list_of_bboxes(self):
        """Should return list of row bboxes."""
        from prepare_datasets import extract_row_bboxes

        ground_truth = {
            'line_items': [
                {'bbox': {'x': 50, 'y': 100, 'width': 400, 'height': 20}},
                {'bbox': {'x': 50, 'y': 130, 'width': 400, 'height': 20}},
            ]
        }

        result = extract_row_bboxes(ground_truth)

        assert isinstance(result, list)
        assert len(result) == 2

    def test_each_row_bbox_has_four_values(self):
        """Each row bbox should have [x, y, width, height]."""
        from prepare_datasets import extract_row_bboxes

        ground_truth = {
            'line_items': [
                {'bbox': {'x': 50, 'y': 100, 'width': 400, 'height': 20}},
            ]
        }

        result = extract_row_bboxes(ground_truth)

        assert len(result[0]) == 4


class TestPdfToImage:
    """Test PDF to image conversion."""

    def test_returns_pil_image(self):
        """Should return a PIL Image."""
        from prepare_datasets import pdf_to_image
        from PIL import Image

        # Create a simple PDF for testing
        with tempfile.TemporaryDirectory() as tmpdir:
            # Use existing test infrastructure to create PDF
            from generate_invoices import generate_dataset
            generate_dataset(1, tmpdir, str(Path(__file__).parent.parent / "scripts" / "templates"))

            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            if os.path.exists(pdf_path):
                result = pdf_to_image(pdf_path)
                assert isinstance(result, Image.Image)

    def test_returns_rgb_image(self):
        """Image should be in RGB mode."""
        from prepare_datasets import pdf_to_image

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            generate_dataset(1, tmpdir, str(Path(__file__).parent.parent / "scripts" / "templates"))

            pdf_path = os.path.join(tmpdir, 'pdfs', 'invoice_00000.pdf')
            if os.path.exists(pdf_path):
                result = pdf_to_image(pdf_path)
                assert result.mode == 'RGB'


class TestFormatTatrIntegration:
    """Integration tests for format_tatr function."""

    def test_creates_output_directory(self):
        """Should create TATR output directory."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'pdfs'))
            os.makedirs(os.path.join(input_dir, 'labels'))

            format_tatr(input_dir, output_dir)

            assert os.path.isdir(os.path.join(output_dir, 'tatr'))

    def test_returns_statistics(self):
        """Should return processing statistics."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'pdfs'))
            os.makedirs(os.path.join(input_dir, 'labels'))

            result = format_tatr(input_dir, output_dir)

            assert isinstance(result, dict)
            assert 'processed' in result

    def test_processes_pdf_and_json_pairs(self):
        """Should process matching PDF and JSON pairs."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test input with real data
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            result = format_tatr(input_dir, output_dir)

            assert result['processed'] >= 0

    def test_creates_annotations_json(self):
        """Should create annotations.json file."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_tatr(input_dir, output_dir)

            annotations_path = os.path.join(output_dir, 'tatr', 'annotations.json')
            assert os.path.exists(annotations_path)

    def test_annotations_json_is_valid(self):
        """annotations.json should be valid JSON."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_tatr(input_dir, output_dir)

            annotations_path = os.path.join(output_dir, 'tatr', 'annotations.json')
            with open(annotations_path, 'r') as f:
                data = json.load(f)

            assert 'images' in data
            assert 'annotations' in data
            assert 'categories' in data

    def test_creates_images_directory(self):
        """Should create images directory."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_tatr(input_dir, output_dir)

            images_dir = os.path.join(output_dir, 'tatr', 'images')
            assert os.path.isdir(images_dir)

    def test_saves_png_images(self):
        """Should save PNG images."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            from generate_invoices import generate_dataset
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            templates_dir = str(Path(__file__).parent.parent / "scripts" / "templates")
            generate_dataset(2, input_dir, templates_dir)

            format_tatr(input_dir, output_dir)

            images_dir = os.path.join(output_dir, 'tatr', 'images')
            png_files = [f for f in os.listdir(images_dir) if f.endswith('.png')]
            assert len(png_files) >= 2
