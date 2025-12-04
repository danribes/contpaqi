"""
Test Suite for Subtask 3.4: Train/Validation/Test Splits

Tests verify:
- Dataset splitting with 80/10/10 ratio
- Splits are disjoint (no overlap)
- Reproducibility with seed
- File copying to split directories
"""

import json
import os
import pytest
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestSplitModuleExists:
    """Test that split utilities exist."""

    def test_has_create_splits_function(self):
        """Module should have create_splits function."""
        from prepare_datasets import create_splits
        assert callable(create_splits)

    def test_has_split_dataset_function(self):
        """Module should have split_dataset function."""
        from prepare_datasets import split_dataset
        assert callable(split_dataset)

    def test_has_copy_split_files_function(self):
        """Module should have copy_split_files function."""
        from prepare_datasets import copy_split_files
        assert callable(copy_split_files)


class TestCreateSplits:
    """Test the create_splits function."""

    def test_returns_dict_with_train_val_test(self):
        """Should return dict with train, val, test keys."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits = create_splits(indices)

        assert 'train' in splits
        assert 'val' in splits
        assert 'test' in splits

    def test_default_ratio_is_80_10_10(self):
        """Default split should be 80/10/10."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits = create_splits(indices)

        assert len(splits['train']) == 80
        assert len(splits['val']) == 10
        assert len(splits['test']) == 10

    def test_custom_ratio(self):
        """Should support custom split ratios."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits = create_splits(indices, train_ratio=0.7, val_ratio=0.2, test_ratio=0.1)

        assert len(splits['train']) == 70
        assert len(splits['val']) == 20
        assert len(splits['test']) == 10

    def test_splits_are_disjoint(self):
        """Splits should have no overlapping indices."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits = create_splits(indices)

        train_set = set(splits['train'])
        val_set = set(splits['val'])
        test_set = set(splits['test'])

        assert len(train_set & val_set) == 0
        assert len(train_set & test_set) == 0
        assert len(val_set & test_set) == 0

    def test_splits_cover_all_indices(self):
        """All indices should be in exactly one split."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits = create_splits(indices)

        all_split_indices = splits['train'] + splits['val'] + splits['test']
        assert sorted(all_split_indices) == indices

    def test_reproducible_with_seed(self):
        """Same seed should produce same splits."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits1 = create_splits(indices, seed=42)
        splits2 = create_splits(indices, seed=42)

        assert splits1['train'] == splits2['train']
        assert splits1['val'] == splits2['val']
        assert splits1['test'] == splits2['test']

    def test_different_seeds_produce_different_splits(self):
        """Different seeds should produce different splits."""
        from prepare_datasets import create_splits

        indices = list(range(100))
        splits1 = create_splits(indices, seed=42)
        splits2 = create_splits(indices, seed=123)

        assert splits1['train'] != splits2['train']

    def test_handles_small_dataset(self):
        """Should handle small datasets gracefully."""
        from prepare_datasets import create_splits

        indices = list(range(10))
        splits = create_splits(indices)

        total = len(splits['train']) + len(splits['val']) + len(splits['test'])
        assert total == 10

    def test_handles_empty_dataset(self):
        """Should handle empty dataset."""
        from prepare_datasets import create_splits

        indices = []
        splits = create_splits(indices)

        assert splits['train'] == []
        assert splits['val'] == []
        assert splits['test'] == []


class TestSplitDataset:
    """Test the split_dataset function for TATR format."""

    def test_creates_split_directories(self):
        """Should create train/val/test directories."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            # Create minimal input structure
            os.makedirs(os.path.join(input_dir, 'tatr', 'images'))
            with open(os.path.join(input_dir, 'tatr', 'annotations.json'), 'w') as f:
                json.dump({'images': [], 'annotations': [], 'categories': []}, f)

            split_dataset(input_dir, output_dir, 'tatr')

            assert os.path.isdir(os.path.join(output_dir, 'tatr', 'train'))
            assert os.path.isdir(os.path.join(output_dir, 'tatr', 'val'))
            assert os.path.isdir(os.path.join(output_dir, 'tatr', 'test'))

    def test_returns_statistics(self):
        """Should return split statistics."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'tatr', 'images'))
            with open(os.path.join(input_dir, 'tatr', 'annotations.json'), 'w') as f:
                json.dump({'images': [], 'annotations': [], 'categories': []}, f)

            result = split_dataset(input_dir, output_dir, 'tatr')

            assert 'train_count' in result
            assert 'val_count' in result
            assert 'test_count' in result


class TestSplitDatasetTATR:
    """Test TATR format splitting."""

    def test_splits_coco_annotations(self):
        """Should split COCO annotations into separate files."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            # Create TATR input with some images
            os.makedirs(os.path.join(input_dir, 'tatr', 'images'))

            coco_data = {
                'images': [
                    {'id': i, 'file_name': f'img_{i:05d}.png', 'width': 100, 'height': 100}
                    for i in range(20)
                ],
                'annotations': [
                    {'id': i, 'image_id': i, 'category_id': 1, 'bbox': [10, 10, 50, 50]}
                    for i in range(20)
                ],
                'categories': [{'id': 1, 'name': 'table'}]
            }

            with open(os.path.join(input_dir, 'tatr', 'annotations.json'), 'w') as f:
                json.dump(coco_data, f)

            # Create dummy images
            for i in range(20):
                Path(os.path.join(input_dir, 'tatr', 'images', f'img_{i:05d}.png')).touch()

            split_dataset(input_dir, output_dir, 'tatr', seed=42)

            # Check train annotations exist
            train_ann_path = os.path.join(output_dir, 'tatr', 'train', 'annotations.json')
            assert os.path.exists(train_ann_path)

            with open(train_ann_path, 'r') as f:
                train_data = json.load(f)

            assert len(train_data['images']) == 16  # 80% of 20

    def test_copies_images_to_splits(self):
        """Should copy images to respective split directories."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'tatr', 'images'))

            coco_data = {
                'images': [
                    {'id': i, 'file_name': f'img_{i:05d}.png', 'width': 100, 'height': 100}
                    for i in range(10)
                ],
                'annotations': [],
                'categories': []
            }

            with open(os.path.join(input_dir, 'tatr', 'annotations.json'), 'w') as f:
                json.dump(coco_data, f)

            for i in range(10):
                Path(os.path.join(input_dir, 'tatr', 'images', f'img_{i:05d}.png')).touch()

            split_dataset(input_dir, output_dir, 'tatr', seed=42)

            train_images = os.path.join(output_dir, 'tatr', 'train', 'images')
            assert os.path.isdir(train_images)
            assert len(os.listdir(train_images)) == 8  # 80% of 10


class TestSplitDatasetLayoutLM:
    """Test LayoutLM format splitting."""

    def test_splits_samples_json(self):
        """Should split samples.json into train/val/test."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'layoutlm', 'images'))

            samples = [
                {
                    'tokens': ['test'],
                    'bboxes': [[0, 0, 100, 100]],
                    'ner_tags': [0],
                    'image_path': f'img_{i:05d}.png'
                }
                for i in range(20)
            ]

            with open(os.path.join(input_dir, 'layoutlm', 'samples.json'), 'w') as f:
                json.dump(samples, f)

            with open(os.path.join(input_dir, 'layoutlm', 'labels.json'), 'w') as f:
                json.dump(['O', 'B-TOTAL', 'I-TOTAL'], f)

            for i in range(20):
                Path(os.path.join(input_dir, 'layoutlm', 'images', f'img_{i:05d}.png')).touch()

            split_dataset(input_dir, output_dir, 'layoutlm', seed=42)

            train_samples_path = os.path.join(output_dir, 'layoutlm', 'train', 'samples.json')
            assert os.path.exists(train_samples_path)

            with open(train_samples_path, 'r') as f:
                train_samples = json.load(f)

            assert len(train_samples) == 16  # 80% of 20

    def test_copies_labels_to_all_splits(self):
        """Should copy labels.json to all splits."""
        from prepare_datasets import split_dataset

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = os.path.join(tmpdir, 'input')
            output_dir = os.path.join(tmpdir, 'output')

            os.makedirs(os.path.join(input_dir, 'layoutlm', 'images'))

            with open(os.path.join(input_dir, 'layoutlm', 'samples.json'), 'w') as f:
                json.dump([], f)

            labels = ['O', 'B-RFC_EMISOR', 'I-RFC_EMISOR']
            with open(os.path.join(input_dir, 'layoutlm', 'labels.json'), 'w') as f:
                json.dump(labels, f)

            split_dataset(input_dir, output_dir, 'layoutlm')

            for split in ['train', 'val', 'test']:
                labels_path = os.path.join(output_dir, 'layoutlm', split, 'labels.json')
                assert os.path.exists(labels_path)

                with open(labels_path, 'r') as f:
                    split_labels = json.load(f)
                assert split_labels == labels


class TestCopyFilesFunction:
    """Test the copy_split_files helper function."""

    def test_copies_files_by_index(self):
        """Should copy files matching given indices."""
        from prepare_datasets import copy_split_files

        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = os.path.join(tmpdir, 'src')
            dst_dir = os.path.join(tmpdir, 'dst')
            os.makedirs(src_dir)
            os.makedirs(dst_dir)

            # Create source files
            filenames = [f'file_{i:05d}.png' for i in range(10)]
            for fn in filenames:
                Path(os.path.join(src_dir, fn)).touch()

            # Copy only some indices
            indices_to_copy = [0, 2, 4, 6, 8]
            copy_split_files(src_dir, dst_dir, filenames, indices_to_copy)

            copied_files = os.listdir(dst_dir)
            assert len(copied_files) == 5
            assert 'file_00000.png' in copied_files
            assert 'file_00002.png' in copied_files

    def test_handles_missing_files_gracefully(self):
        """Should skip missing files without error."""
        from prepare_datasets import copy_split_files

        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = os.path.join(tmpdir, 'src')
            dst_dir = os.path.join(tmpdir, 'dst')
            os.makedirs(src_dir)
            os.makedirs(dst_dir)

            # Only create some files
            Path(os.path.join(src_dir, 'file_00000.png')).touch()

            filenames = ['file_00000.png', 'file_00001.png', 'file_00002.png']
            indices_to_copy = [0, 1, 2]

            # Should not raise
            copy_split_files(src_dir, dst_dir, filenames, indices_to_copy)

            copied_files = os.listdir(dst_dir)
            assert len(copied_files) == 1


class TestIntegrationWithMainCLI:
    """Test integration with main CLI."""

    def test_main_cli_has_split_option(self):
        """CLI should have --split option."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--split'])

        assert args.split == True

    def test_main_cli_split_default_false(self):
        """--split should default to False."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.split == False

    def test_main_cli_accepts_split_ratios(self):
        """CLI should accept custom split ratios."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([
            '--split',
            '--train-ratio', '0.7',
            '--val-ratio', '0.15',
            '--test-ratio', '0.15'
        ])

        assert args.train_ratio == 0.7
        assert args.val_ratio == 0.15
        assert args.test_ratio == 0.15
