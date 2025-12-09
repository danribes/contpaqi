"""
PyArmor Obfuscation Script for ContPAQi AI Bridge

This script handles the obfuscation of Python source files using PyArmor 8.x.
It reads configuration from pyarmor.json and produces obfuscated output in dist/.

Usage:
    python scripts/obfuscate.py [--config CONFIG] [--output OUTPUT] [--dry-run]

Arguments:
    --config CONFIG   Path to PyArmor configuration file (default: pyarmor.json)
    --output OUTPUT   Output directory for obfuscated files (default: dist)
    --dry-run        Show what would be obfuscated without actually doing it
    --clean          Clean output directory before obfuscation
    --verbose        Enable verbose output

Example:
    python scripts/obfuscate.py --clean --verbose
"""

import argparse
import json
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ObfuscationError(Exception):
    """Custom exception for obfuscation errors."""
    pass


class PyArmorObfuscator:
    """
    Handles PyArmor obfuscation of Python source files.

    Attributes:
        config_path: Path to PyArmor configuration file
        output_dir: Directory for obfuscated output
        src_dir: Source directory containing Python files
        config: Loaded configuration dictionary
    """

    def __init__(
        self,
        config_path: str = 'pyarmor.json',
        output_dir: Optional[str] = None,
        dry_run: bool = False,
        verbose: bool = False
    ):
        """
        Initialize the obfuscator.

        Args:
            config_path: Path to configuration file
            output_dir: Override output directory from config
            dry_run: If True, don't actually obfuscate
            verbose: Enable verbose logging
        """
        self.config_path = Path(config_path)
        self.dry_run = dry_run
        self.verbose = verbose

        if verbose:
            logger.setLevel(logging.DEBUG)

        # Load configuration
        self.config = self._load_config()

        # Set directories
        self.src_dir = Path(self.config.get('obfuscation', {}).get('src', 'src'))
        self.output_dir = Path(
            output_dir or
            self.config.get('obfuscation', {}).get('output', 'dist')
        )

        logger.info(f"Initialized obfuscator with config: {self.config_path}")
        logger.debug(f"Source directory: {self.src_dir}")
        logger.debug(f"Output directory: {self.output_dir}")

    def _load_config(self) -> Dict[str, Any]:
        """
        Load and validate configuration from JSON file.

        Returns:
            Configuration dictionary

        Raises:
            ObfuscationError: If config file is missing or invalid
        """
        if not self.config_path.exists():
            raise ObfuscationError(f"Configuration file not found: {self.config_path}")

        try:
            with open(self.config_path) as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            raise ObfuscationError(f"Invalid JSON in config file: {e}")

        logger.debug(f"Loaded config: {json.dumps(config, indent=2)}")
        return config

    def _get_python_files(self) -> List[Path]:
        """
        Get list of Python files to obfuscate.

        Returns:
            List of Path objects for Python files
        """
        files = []
        excludes = self.config.get('obfuscation', {}).get('excludes', [])

        for pattern in self.config.get('obfuscation', {}).get('includes', ['*.py']):
            if self.config.get('obfuscation', {}).get('recursive', True):
                found_files = list(self.src_dir.rglob(pattern))
            else:
                found_files = list(self.src_dir.glob(pattern))

            # Filter out excluded files
            for f in found_files:
                should_exclude = False
                for exclude in excludes:
                    if exclude.startswith('*.'):
                        # Extension-based exclusion
                        if f.suffix == exclude[1:]:
                            should_exclude = True
                            break
                    elif f.name.startswith(exclude.rstrip('*').rstrip('_')):
                        should_exclude = True
                        break
                    elif exclude.rstrip('/') in str(f):
                        should_exclude = True
                        break

                if not should_exclude and f.is_file():
                    files.append(f)

        logger.info(f"Found {len(files)} Python files to obfuscate")
        return files

    def _check_pyarmor_installed(self) -> bool:
        """
        Check if PyArmor is installed and accessible.

        Returns:
            True if PyArmor is installed
        """
        try:
            result = subprocess.run(
                ['pyarmor', '--version'],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info(f"PyArmor version: {result.stdout.strip()}")
                return True
        except FileNotFoundError:
            pass

        logger.error("PyArmor is not installed. Run: pip install pyarmor")
        return False

    def clean_output(self) -> None:
        """Remove existing output directory."""
        if self.output_dir.exists():
            logger.info(f"Cleaning output directory: {self.output_dir}")
            if not self.dry_run:
                shutil.rmtree(self.output_dir)

    def obfuscate(self) -> bool:
        """
        Run the obfuscation process.

        Returns:
            True if successful, False otherwise
        """
        logger.info("Starting obfuscation process...")

        # Check PyArmor installation
        if not self._check_pyarmor_installed():
            return False

        # Get files to obfuscate
        files = self._get_python_files()
        if not files:
            logger.warning("No files found to obfuscate")
            return False

        # Log files that will be obfuscated
        logger.info("Files to obfuscate:")
        for f in files:
            logger.info(f"  - {f}")

        if self.dry_run:
            logger.info("Dry run mode - no files will be obfuscated")
            return True

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Build PyArmor command
        entry_script = self.config.get('obfuscation', {}).get('entry', 'main.py')
        entry_path = self.src_dir / entry_script

        cmd = [
            'pyarmor', 'gen',
            '--output', str(self.output_dir),
            '--recursive',
        ]

        # Add restrict mode if configured
        settings = self.config.get('settings', {})
        if settings.get('restrict_mode'):
            cmd.extend(['--restrict', str(settings['restrict_mode'])])

        # Add entry script
        cmd.append(str(entry_path))

        logger.info(f"Running PyArmor command: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.config_path.parent)
            )

            if result.stdout:
                logger.info(f"PyArmor output:\n{result.stdout}")
            if result.stderr:
                logger.warning(f"PyArmor stderr:\n{result.stderr}")

            if result.returncode != 0:
                raise ObfuscationError(f"PyArmor failed with code {result.returncode}")

            logger.info("Obfuscation completed successfully!")
            return True

        except subprocess.SubprocessError as e:
            raise ObfuscationError(f"Failed to run PyArmor: {e}")

    def verify_output(self) -> bool:
        """
        Verify that obfuscated files were created.

        Returns:
            True if output is valid
        """
        if not self.output_dir.exists():
            logger.error(f"Output directory does not exist: {self.output_dir}")
            return False

        obfuscated_files = list(self.output_dir.rglob('*.py'))

        if not obfuscated_files:
            logger.error("No obfuscated Python files found in output")
            return False

        logger.info(f"Found {len(obfuscated_files)} obfuscated files")
        for f in obfuscated_files:
            logger.debug(f"  - {f}")

        return True


def main() -> int:
    """
    Main entry point for the obfuscation script.

    Returns:
        Exit code (0 for success, non-zero for failure)
    """
    parser = argparse.ArgumentParser(
        description='Obfuscate Python source files using PyArmor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--config', '-c',
        default='pyarmor.json',
        help='Path to PyArmor configuration file'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output directory for obfuscated files'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Show what would be done without actually obfuscating'
    )
    parser.add_argument(
        '--clean',
        action='store_true',
        help='Clean output directory before obfuscation'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )

    args = parser.parse_args()

    try:
        obfuscator = PyArmorObfuscator(
            config_path=args.config,
            output_dir=args.output,
            dry_run=args.dry_run,
            verbose=args.verbose
        )

        if args.clean:
            obfuscator.clean_output()

        if not obfuscator.obfuscate():
            return 1

        if not args.dry_run and not obfuscator.verify_output():
            return 1

        return 0

    except ObfuscationError as e:
        logger.error(f"Obfuscation error: {e}")
        return 1
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
