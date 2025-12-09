# MCP Container Makefile
# Build automation for PyArmor obfuscation and Docker container

.PHONY: all build clean obfuscate obfuscate-dry-run install-dev test docker-build docker-run help

# Python and tool paths
PYTHON := python
PYARMOR := pyarmor
DOCKER := docker
DOCKER_COMPOSE := docker-compose

# Directories
SRC_DIR := src
DIST_DIR := dist
SCRIPTS_DIR := scripts

# Configuration
CONFIG_FILE := pyarmor.json
OBFUSCATE_SCRIPT := $(SCRIPTS_DIR)/obfuscate.py

# Docker settings
IMAGE_NAME := contpaqi-mcp
IMAGE_TAG := latest

# Default target
all: help

# =============================================================================
# Development
# =============================================================================

## install-dev: Install development dependencies
install-dev:
	$(PYTHON) -m pip install -r requirements-dev.txt

## test: Run tests
test:
	$(PYTHON) -m pytest tests/ -v

## lint: Run linters
lint:
	$(PYTHON) -m flake8 $(SRC_DIR)/
	$(PYTHON) -m mypy $(SRC_DIR)/

# =============================================================================
# Obfuscation
# =============================================================================

## obfuscate: Obfuscate Python source files using PyArmor
obfuscate: clean-dist
	@echo "Starting PyArmor obfuscation..."
	$(PYTHON) $(OBFUSCATE_SCRIPT) --clean --verbose
	@echo "Obfuscation complete. Output in $(DIST_DIR)/"

## obfuscate-dry-run: Show what would be obfuscated without doing it
obfuscate-dry-run:
	@echo "Dry run - showing files to obfuscate..."
	$(PYTHON) $(OBFUSCATE_SCRIPT) --dry-run --verbose

## obfuscate-pyarmor: Direct PyArmor command (alternative)
obfuscate-pyarmor: clean-dist
	@echo "Running PyArmor directly..."
	$(PYARMOR) gen --output $(DIST_DIR) --recursive $(SRC_DIR)/main.py
	@echo "Done. Output in $(DIST_DIR)/"

# =============================================================================
# Build
# =============================================================================

## build: Build production container with obfuscated code
build: obfuscate docker-build
	@echo "Production build complete!"

## build-dev: Build development container with source code
build-dev: docker-build-dev
	@echo "Development build complete!"

## docker-build: Build Docker image with obfuscated code
docker-build:
	@if [ ! -d "$(DIST_DIR)" ]; then \
		echo "Error: $(DIST_DIR)/ not found. Run 'make obfuscate' first."; \
		exit 1; \
	fi
	$(DOCKER) build -t $(IMAGE_NAME):$(IMAGE_TAG) -f Dockerfile.prod .

## docker-build-dev: Build Docker image with source code (development)
docker-build-dev:
	$(DOCKER) build -t $(IMAGE_NAME):dev .

## docker-run: Run the container
docker-run:
	$(DOCKER) run -p 8000:8000 $(IMAGE_NAME):$(IMAGE_TAG)

## docker-compose-up: Start services with docker-compose
docker-compose-up:
	$(DOCKER_COMPOSE) up -d

## docker-compose-down: Stop services
docker-compose-down:
	$(DOCKER_COMPOSE) down

# =============================================================================
# Cleaning
# =============================================================================

## clean: Remove all build artifacts
clean: clean-dist clean-pyc clean-docker
	@echo "Cleaned all build artifacts"

## clean-dist: Remove obfuscated output directory
clean-dist:
	@echo "Removing $(DIST_DIR)/..."
	rm -rf $(DIST_DIR)

## clean-pyc: Remove Python bytecode files
clean-pyc:
	@echo "Removing Python bytecode..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true

## clean-docker: Remove Docker images
clean-docker:
	@echo "Removing Docker images..."
	$(DOCKER) rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	$(DOCKER) rmi $(IMAGE_NAME):dev 2>/dev/null || true

# =============================================================================
# Verification
# =============================================================================

## verify: Verify obfuscation output
verify:
	@echo "Verifying obfuscation output..."
	@if [ -d "$(DIST_DIR)" ]; then \
		echo "✓ $(DIST_DIR)/ exists"; \
		ls -la $(DIST_DIR)/; \
	else \
		echo "✗ $(DIST_DIR)/ not found"; \
		exit 1; \
	fi

## check-pyarmor: Check if PyArmor is installed
check-pyarmor:
	@echo "Checking PyArmor installation..."
	@$(PYARMOR) --version || (echo "PyArmor not installed. Run: pip install pyarmor" && exit 1)

# =============================================================================
# Help
# =============================================================================

## help: Show this help message
help:
	@echo "MCP Container Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/## /  /' | column -t -s ':'
	@echo ""
	@echo "Examples:"
	@echo "  make obfuscate          # Obfuscate source code"
	@echo "  make build              # Build production container"
	@echo "  make obfuscate-dry-run  # Preview obfuscation"
	@echo "  make clean              # Clean all artifacts"
