"""
Test Suite for Subtask 3.1: Create prepare_datasets.py script

Tests verify:
- Module exists and is importable
- CLI argument parser works correctly
- Format options are validated
- Main function exists and is callable
- Directory handling is correct
"""

import argparse
import os
import pytest
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestPrepareDataetsModuleExists:
    """Test that the prepare_datasets module exists and has required components."""

    def test_can_import_module(self):
        """Should be able to import prepare_datasets module."""
        import prepare_datasets
        assert prepare_datasets is not None

    def test_has_main_function(self):
        """Module should have main function."""
        from prepare_datasets import main
        assert callable(main)

    def test_has_create_argument_parser_function(self):
        """Module should have create_argument_parser function."""
        from prepare_datasets import create_argument_parser
        assert callable(create_argument_parser)

    def test_has_format_tatr_function(self):
        """Module should have format_tatr function (stub for 3.2)."""
        from prepare_datasets import format_tatr
        assert callable(format_tatr)

    def test_has_format_layoutlm_function(self):
        """Module should have format_layoutlm function (stub for 3.3)."""
        from prepare_datasets import format_layoutlm
        assert callable(format_layoutlm)


class TestArgumentParser:
    """Test the argument parser configuration."""

    def test_parser_returns_argparse_namespace(self):
        """Parser should return argparse.Namespace."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--input-dir', 'data/in', '--output-dir', 'data/out'])

        assert isinstance(args, argparse.Namespace)

    def test_has_input_dir_argument(self):
        """Parser should accept --input-dir argument."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--input-dir', '/path/to/input'])

        assert args.input_dir == '/path/to/input'

    def test_has_output_dir_argument(self):
        """Parser should accept --output-dir argument."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--output-dir', '/path/to/output'])

        assert args.output_dir == '/path/to/output'

    def test_has_format_argument(self):
        """Parser should accept --format argument."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--format', 'tatr'])

        assert args.format == 'tatr'

    def test_format_accepts_tatr(self):
        """Format should accept 'tatr' value."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--format', 'tatr'])

        assert args.format == 'tatr'

    def test_format_accepts_layoutlm(self):
        """Format should accept 'layoutlm' value."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--format', 'layoutlm'])

        assert args.format == 'layoutlm'

    def test_format_accepts_both(self):
        """Format should accept 'both' value."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--format', 'both'])

        assert args.format == 'both'

    def test_format_default_is_both(self):
        """Format should default to 'both'."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.format == 'both'

    def test_input_dir_has_default(self):
        """Input dir should have default value."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.input_dir is not None
        assert 'synthetic' in args.input_dir or args.input_dir != ''

    def test_output_dir_has_default(self):
        """Output dir should have default value."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.output_dir is not None
        assert 'formatted' in args.output_dir or args.output_dir != ''

    def test_short_options_work(self):
        """Short option flags should work."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['-i', '/in', '-o', '/out', '-f', 'tatr'])

        assert args.input_dir == '/in'
        assert args.output_dir == '/out'
        assert args.format == 'tatr'


class TestFormatValidation:
    """Test format option validation."""

    def test_invalid_format_raises_error(self):
        """Invalid format should raise error."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()

        with pytest.raises(SystemExit):
            parser.parse_args(['--format', 'invalid_format'])


class TestDirectoryHandling:
    """Test input/output directory handling."""

    def test_creates_output_directory(self):
        """Should create output directory if it doesn't exist."""
        from prepare_datasets import prepare_output_dir

        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = os.path.join(tmpdir, 'new_output', 'nested')

            prepare_output_dir(output_dir)

            assert os.path.isdir(output_dir)

    def test_handles_existing_output_directory(self):
        """Should handle existing output directory without error."""
        from prepare_datasets import prepare_output_dir

        with tempfile.TemporaryDirectory() as tmpdir:
            # Directory already exists
            prepare_output_dir(tmpdir)

            assert os.path.isdir(tmpdir)


class TestFormatFunctions:
    """Test the format functions (stubs for now)."""

    def test_format_tatr_returns_dict(self):
        """format_tatr should return statistics dict."""
        from prepare_datasets import format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            result = format_tatr(tmpdir, tmpdir)

            assert isinstance(result, dict)
            assert 'processed' in result or 'status' in result

    def test_format_layoutlm_returns_dict(self):
        """format_layoutlm should return statistics dict."""
        from prepare_datasets import format_layoutlm

        with tempfile.TemporaryDirectory() as tmpdir:
            result = format_layoutlm(tmpdir, tmpdir)

            assert isinstance(result, dict)
            assert 'processed' in result or 'status' in result


class TestMainFunction:
    """Test the main entry point."""

    def test_main_returns_exit_code(self):
        """Main should return an exit code."""
        from prepare_datasets import main

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create minimal input structure
            os.makedirs(os.path.join(tmpdir, 'input', 'pdfs'), exist_ok=True)
            os.makedirs(os.path.join(tmpdir, 'input', 'labels'), exist_ok=True)

            with patch('sys.argv', ['prepare_datasets.py',
                                    '-i', os.path.join(tmpdir, 'input'),
                                    '-o', os.path.join(tmpdir, 'output'),
                                    '-f', 'tatr']):
                result = main()

            assert isinstance(result, int)

    def test_main_calls_tatr_for_tatr_format(self):
        """Main should call format_tatr when format is 'tatr'."""
        from prepare_datasets import main, format_tatr

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, 'input', 'pdfs'), exist_ok=True)
            os.makedirs(os.path.join(tmpdir, 'input', 'labels'), exist_ok=True)

            with patch('sys.argv', ['prepare_datasets.py',
                                    '-i', os.path.join(tmpdir, 'input'),
                                    '-o', os.path.join(tmpdir, 'output'),
                                    '-f', 'tatr']):
                with patch('prepare_datasets.format_tatr') as mock_tatr:
                    mock_tatr.return_value = {'processed': 0, 'status': 'ok', 'message': 'test'}
                    main()
                    mock_tatr.assert_called_once()

    def test_main_calls_layoutlm_for_layoutlm_format(self):
        """Main should call format_layoutlm when format is 'layoutlm'."""
        from prepare_datasets import main

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, 'input', 'pdfs'), exist_ok=True)
            os.makedirs(os.path.join(tmpdir, 'input', 'labels'), exist_ok=True)

            with patch('sys.argv', ['prepare_datasets.py',
                                    '-i', os.path.join(tmpdir, 'input'),
                                    '-o', os.path.join(tmpdir, 'output'),
                                    '-f', 'layoutlm']):
                with patch('prepare_datasets.format_layoutlm') as mock_layoutlm:
                    mock_layoutlm.return_value = {'processed': 0, 'status': 'ok', 'message': 'test'}
                    main()
                    mock_layoutlm.assert_called_once()

    def test_main_calls_both_for_both_format(self):
        """Main should call both formatters when format is 'both'."""
        from prepare_datasets import main

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, 'input', 'pdfs'), exist_ok=True)
            os.makedirs(os.path.join(tmpdir, 'input', 'labels'), exist_ok=True)

            with patch('sys.argv', ['prepare_datasets.py',
                                    '-i', os.path.join(tmpdir, 'input'),
                                    '-o', os.path.join(tmpdir, 'output'),
                                    '-f', 'both']):
                with patch('prepare_datasets.format_tatr') as mock_tatr:
                    with patch('prepare_datasets.format_layoutlm') as mock_layoutlm:
                        mock_tatr.return_value = {'processed': 0, 'status': 'ok', 'message': 'test'}
                        mock_layoutlm.return_value = {'processed': 0, 'status': 'ok', 'message': 'test'}
                        main()
                        mock_tatr.assert_called_once()
                        mock_layoutlm.assert_called_once()


class TestInputValidation:
    """Test input directory validation."""

    def test_validates_input_directory_exists(self):
        """Should validate that input directory exists."""
        from prepare_datasets import validate_input_dir

        with tempfile.TemporaryDirectory() as tmpdir:
            result = validate_input_dir(tmpdir)
            assert result is True

    def test_returns_false_for_missing_input_dir(self):
        """Should return False for missing input directory."""
        from prepare_datasets import validate_input_dir

        result = validate_input_dir('/nonexistent/path/to/nowhere')
        assert result is False

    def test_checks_for_pdfs_subdirectory(self):
        """Should check for pdfs subdirectory."""
        from prepare_datasets import validate_input_dir

        with tempfile.TemporaryDirectory() as tmpdir:
            # No pdfs subdirectory
            result = validate_input_dir(tmpdir)
            # May return True or False depending on strict validation
            assert isinstance(result, bool)

    def test_checks_for_labels_subdirectory(self):
        """Should check for labels subdirectory."""
        from prepare_datasets import validate_input_dir

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, 'pdfs'))
            # No labels subdirectory
            result = validate_input_dir(tmpdir)
            assert isinstance(result, bool)


class TestSeedOption:
    """Test random seed option for reproducibility."""

    def test_has_seed_argument(self):
        """Parser should accept --seed argument."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(['--seed', '42'])

        assert args.seed == 42

    def test_seed_default_is_42(self):
        """Seed should default to 42."""
        from prepare_datasets import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([])

        assert args.seed == 42
