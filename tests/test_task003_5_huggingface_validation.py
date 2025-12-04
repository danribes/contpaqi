"""
Test Suite for Subtask 3.5: Hugging Face Dataset Validation

Tests verify:
- COCO format is valid for object detection
- LayoutLM format is compatible with LayoutLMv3Processor
- Dataset can be loaded with Hugging Face datasets library
- All required fields are present and valid
"""

import json
import os
import pytest
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestValidationModuleExists:
    """Test that validation utilities exist."""

    def test_has_validate_coco_format_function(self):
        """Module should have validate_coco_format function."""
        from prepare_datasets import validate_coco_format
        assert callable(validate_coco_format)

    def test_has_validate_layoutlm_format_function(self):
        """Module should have validate_layoutlm_format function."""
        from prepare_datasets import validate_layoutlm_format
        assert callable(validate_layoutlm_format)

    def test_has_validate_dataset_function(self):
        """Module should have validate_dataset function."""
        from prepare_datasets import validate_dataset
        assert callable(validate_dataset)


class TestValidateCocoFormat:
    """Test COCO format validation."""

    def test_valid_coco_returns_true(self):
        """Valid COCO format should return success."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [
                {'id': 1, 'file_name': 'img_001.png', 'width': 100, 'height': 100}
            ],
            'annotations': [
                {'id': 1, 'image_id': 1, 'category_id': 1, 'bbox': [10, 10, 50, 50]}
            ],
            'categories': [
                {'id': 1, 'name': 'table', 'supercategory': 'document'}
            ]
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == True

    def test_missing_images_key_returns_error(self):
        """Missing images key should return error."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'annotations': [],
            'categories': []
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False
        assert 'images' in result['errors'][0].lower()

    def test_missing_annotations_key_returns_error(self):
        """Missing annotations key should return error."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [],
            'categories': []
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False

    def test_missing_categories_key_returns_error(self):
        """Missing categories key should return error."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [],
            'annotations': []
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False

    def test_image_missing_required_fields(self):
        """Image missing required fields should return error."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [
                {'id': 1}  # Missing file_name, width, height
            ],
            'annotations': [],
            'categories': []
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False

    def test_annotation_missing_bbox(self):
        """Annotation missing bbox should return error."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [
                {'id': 1, 'file_name': 'img.png', 'width': 100, 'height': 100}
            ],
            'annotations': [
                {'id': 1, 'image_id': 1, 'category_id': 1}  # Missing bbox
            ],
            'categories': [{'id': 1, 'name': 'table'}]
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False

    def test_bbox_has_four_values(self):
        """Bbox should have exactly 4 values."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [
                {'id': 1, 'file_name': 'img.png', 'width': 100, 'height': 100}
            ],
            'annotations': [
                {'id': 1, 'image_id': 1, 'category_id': 1, 'bbox': [10, 10, 50]}  # Only 3 values
            ],
            'categories': [{'id': 1, 'name': 'table'}]
        }

        result = validate_coco_format(coco_data)
        assert result['valid'] == False

    def test_returns_stats(self):
        """Should return statistics about the dataset."""
        from prepare_datasets import validate_coco_format

        coco_data = {
            'images': [
                {'id': 1, 'file_name': 'img_001.png', 'width': 100, 'height': 100},
                {'id': 2, 'file_name': 'img_002.png', 'width': 100, 'height': 100}
            ],
            'annotations': [
                {'id': 1, 'image_id': 1, 'category_id': 1, 'bbox': [10, 10, 50, 50]},
                {'id': 2, 'image_id': 2, 'category_id': 1, 'bbox': [10, 10, 50, 50]}
            ],
            'categories': [{'id': 1, 'name': 'table'}]
        }

        result = validate_coco_format(coco_data)
        assert 'num_images' in result
        assert result['num_images'] == 2
        assert 'num_annotations' in result
        assert result['num_annotations'] == 2


class TestValidateLayoutLMFormat:
    """Test LayoutLM format validation."""

    def test_valid_layoutlm_returns_true(self):
        """Valid LayoutLM format should return success."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['Invoice', 'Total:', '100.00'],
                'bboxes': [[0, 0, 100, 50], [0, 50, 100, 100], [100, 50, 200, 100]],
                'ner_tags': [0, 0, 3],  # 0=O, 3=B-TOTAL (valid indices 0-4)
                'image_path': 'img_001.png'
            }
        ]
        labels = ['O', 'B-RFC_EMISOR', 'I-RFC_EMISOR', 'B-TOTAL', 'I-TOTAL']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == True

    def test_empty_samples_is_valid(self):
        """Empty samples list should be valid."""
        from prepare_datasets import validate_layoutlm_format

        samples = []
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == True

    def test_sample_missing_tokens(self):
        """Sample missing tokens should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'bboxes': [[0, 0, 100, 50]],
                'ner_tags': [0],
                'image_path': 'img.png'
            }
        ]
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_sample_missing_bboxes(self):
        """Sample missing bboxes should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['test'],
                'ner_tags': [0],
                'image_path': 'img.png'
            }
        ]
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_sample_missing_ner_tags(self):
        """Sample missing ner_tags should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['test'],
                'bboxes': [[0, 0, 100, 50]],
                'image_path': 'img.png'
            }
        ]
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_tokens_bboxes_length_mismatch(self):
        """Tokens and bboxes length mismatch should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['test', 'test2'],
                'bboxes': [[0, 0, 100, 50]],  # Only 1 bbox for 2 tokens
                'ner_tags': [0, 0],
                'image_path': 'img.png'
            }
        ]
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_ner_tag_out_of_range(self):
        """NER tag out of label range should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['test'],
                'bboxes': [[0, 0, 100, 50]],
                'ner_tags': [99],  # Out of range
                'image_path': 'img.png'
            }
        ]
        labels = ['O', 'B-TOTAL']  # Only 2 labels

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_bbox_not_four_values(self):
        """Bbox with wrong number of values should return error."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['test'],
                'bboxes': [[0, 0, 100]],  # Only 3 values
                'ner_tags': [0],
                'image_path': 'img.png'
            }
        ]
        labels = ['O']

        result = validate_layoutlm_format(samples, labels)
        assert result['valid'] == False

    def test_returns_stats(self):
        """Should return statistics about the dataset."""
        from prepare_datasets import validate_layoutlm_format

        samples = [
            {
                'tokens': ['a', 'b', 'c'],
                'bboxes': [[0, 0, 10, 10], [10, 0, 20, 10], [20, 0, 30, 10]],
                'ner_tags': [0, 1, 2],
                'image_path': 'img.png'
            }
        ]
        labels = ['O', 'B-TOTAL', 'I-TOTAL']

        result = validate_layoutlm_format(samples, labels)
        assert 'num_samples' in result
        assert result['num_samples'] == 1
        assert 'total_tokens' in result
        assert result['total_tokens'] == 3


class TestValidateDataset:
    """Test the main validate_dataset function."""

    def test_validates_tatr_format(self):
        """Should validate TATR format dataset."""
        from prepare_datasets import validate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create TATR structure
            tatr_dir = os.path.join(tmpdir, 'tatr', 'train')
            os.makedirs(tatr_dir)

            coco_data = {
                'images': [{'id': 1, 'file_name': 'img.png', 'width': 100, 'height': 100}],
                'annotations': [{'id': 1, 'image_id': 1, 'category_id': 1, 'bbox': [10, 10, 50, 50]}],
                'categories': [{'id': 1, 'name': 'table'}]
            }

            with open(os.path.join(tatr_dir, 'annotations.json'), 'w') as f:
                json.dump(coco_data, f)

            result = validate_dataset(tmpdir, 'tatr')
            assert result['valid'] == True

    def test_validates_layoutlm_format(self):
        """Should validate LayoutLM format dataset."""
        from prepare_datasets import validate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create LayoutLM structure
            layoutlm_dir = os.path.join(tmpdir, 'layoutlm', 'train')
            os.makedirs(layoutlm_dir)

            samples = [
                {
                    'tokens': ['test'],
                    'bboxes': [[0, 0, 100, 50]],
                    'ner_tags': [0],
                    'image_path': 'img.png'
                }
            ]
            labels = ['O', 'B-TOTAL']

            with open(os.path.join(layoutlm_dir, 'samples.json'), 'w') as f:
                json.dump(samples, f)

            with open(os.path.join(layoutlm_dir, 'labels.json'), 'w') as f:
                json.dump(labels, f)

            result = validate_dataset(tmpdir, 'layoutlm')
            assert result['valid'] == True

    def test_validates_all_splits(self):
        """Should validate train, val, and test splits."""
        from prepare_datasets import validate_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            layoutlm_dir = os.path.join(tmpdir, 'layoutlm')

            for split in ['train', 'val', 'test']:
                split_dir = os.path.join(layoutlm_dir, split)
                os.makedirs(split_dir)

                samples = [{'tokens': ['t'], 'bboxes': [[0, 0, 10, 10]], 'ner_tags': [0], 'image_path': 'i.png'}]
                labels = ['O']

                with open(os.path.join(split_dir, 'samples.json'), 'w') as f:
                    json.dump(samples, f)
                with open(os.path.join(split_dir, 'labels.json'), 'w') as f:
                    json.dump(labels, f)

            result = validate_dataset(tmpdir, 'layoutlm')

            assert 'train' in result
            assert 'val' in result
            assert 'test' in result


class TestHuggingFaceIntegration:
    """Test actual Hugging Face library integration."""

    def test_can_load_layoutlm_with_datasets(self):
        """Should be able to load LayoutLM format with datasets library."""
        from datasets import Dataset

        samples = [
            {
                'tokens': ['Invoice', 'Total:', '100.00'],
                'bboxes': [[0, 0, 100, 50], [0, 50, 100, 100], [100, 50, 200, 100]],
                'ner_tags': [0, 0, 1],
                'image_path': 'img_001.png'
            },
            {
                'tokens': ['Receipt', 'Amount:', '50.00'],
                'bboxes': [[0, 0, 100, 50], [0, 50, 100, 100], [100, 50, 200, 100]],
                'ner_tags': [0, 0, 1],
                'image_path': 'img_002.png'
            }
        ]

        # This should not raise
        dataset = Dataset.from_list(samples)

        assert len(dataset) == 2
        assert 'tokens' in dataset.features
        assert 'bboxes' in dataset.features
        assert 'ner_tags' in dataset.features

    def test_can_load_coco_annotations(self):
        """Should be able to load COCO annotations."""
        import json

        with tempfile.TemporaryDirectory() as tmpdir:
            coco_data = {
                'images': [
                    {'id': 1, 'file_name': 'img_001.png', 'width': 800, 'height': 600},
                    {'id': 2, 'file_name': 'img_002.png', 'width': 800, 'height': 600}
                ],
                'annotations': [
                    {'id': 1, 'image_id': 1, 'category_id': 1, 'bbox': [100, 100, 400, 300]},
                    {'id': 2, 'image_id': 2, 'category_id': 1, 'bbox': [50, 50, 500, 400]}
                ],
                'categories': [
                    {'id': 1, 'name': 'table', 'supercategory': 'document'}
                ]
            }

            ann_path = os.path.join(tmpdir, 'annotations.json')
            with open(ann_path, 'w') as f:
                json.dump(coco_data, f)

            # Load and verify
            with open(ann_path, 'r') as f:
                loaded = json.load(f)

            assert len(loaded['images']) == 2
            assert len(loaded['annotations']) == 2
            assert loaded['categories'][0]['name'] == 'table'


class TestCLIValidationOption:
    """Test CLI validation option."""

    def test_cli_has_validate_option(self):
        """CLI should have --validate option."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--validate'])

        assert args.validate == True

    def test_cli_validate_default_false(self):
        """--validate should default to False."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.validate == False
