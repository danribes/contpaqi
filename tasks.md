# Contpaqi AI Bridge - Task List

**Project**: AI-powered invoice processing for Contpaqi accounting
**Created**: 2025-12-03
**Version**: 1.0.0
**Total**: 17 main tasks, 119 subtasks

---

## How to Use This File

1. Find the next unchecked task `- [ ]`
2. Write tests first (TDD approach)
3. Implement the code to pass tests
4. Mark task complete `- [x]`
5. Add implementation details in the `### Implementation Notes` section
6. Create log files in `/log_files`, `/log_tests`, `/log_learn`

**Naming Convention**: `TXXX_TaskName_Log.md` (e.g., `T001_ProjectSetup_Log.md`)

---

## Task 1: Project Setup & Scaffolding

**Priority**: High | **Dependencies**: None | **Tags**: setup, phase-1
**Status**: Completed
**Estimated Effort**: 2-4 hours
**Completed Date**: 2025-12-03

### Description
Initialize all project directories and base configurations for the multi-component architecture.

### Subtasks

- [x] 1.1 Create project directory structure per plan.md
  ```
  <!-- IMPLEMENTATION STEPS:
  1. Create root directories: mcp-container/, windows-bridge/, desktop-app/, scripts/, data/
  2. Create subdirectories as per plan.md structure
  3. Add .gitkeep files to empty directories
  -->
  ```

- [x] 1.2 Initialize Python project with pyproject.toml in mcp-container/
  ```
  <!-- IMPLEMENTATION STEPS:
  1. cd mcp-container/
  2. Create pyproject.toml with:
     - name = "mcp-container"
     - python = "^3.9"
     - dependencies: fastapi, uvicorn, torch, transformers, pytesseract
  3. Create src/ directory with __init__.py
  4. Create tests/ directory
  -->
  ```

- [x] 1.3 Initialize C# ASP.NET Core project in windows-bridge/
  ```
  <!-- IMPLEMENTATION STEPS:
  1. cd windows-bridge/
  2. Run: dotnet new webapi -n ContpaqiBridge
  3. Set <PlatformTarget>x86</PlatformTarget> in .csproj
  4. Set <TargetFramework>net6.0</TargetFramework>
  5. Create Services/, Models/, Controllers/ folders
  -->
  ```

- [x] 1.4 Initialize Electron + React project in desktop-app/
  ```
  <!-- IMPLEMENTATION STEPS:
  1. cd desktop-app/
  2. Run: npm create vite@latest . -- --template react-ts
  3. Install: npm install electron electron-builder
  4. Create electron/ folder with main.ts
  5. Configure package.json scripts for electron
  6. Install Tailwind CSS: npm install -D tailwindcss postcss autoprefixer
  7. Run: npx tailwindcss init -p
  -->
  ```

- [x] 1.5 Create base Dockerfile for MCP container
  ```dockerfile
  <!-- IMPLEMENTATION STEPS:
  1. Create mcp-container/Dockerfile
  2. Use FROM python:3.9-slim-bullseye
  3. Set WORKDIR /app
  4. Copy requirements.txt and install
  5. Copy src/ directory
  6. Expose port 8000
  7. CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  -->
  ```

- [x] 1.6 Configure linting: black/ruff (Python), dotnet format (C#), eslint (TS)
  ```
  <!-- IMPLEMENTATION STEPS:
  Python:
  1. Add ruff to pyproject.toml dev dependencies
  2. Create ruff.toml with line-length = 88

  C#:
  1. Create .editorconfig in windows-bridge/
  2. Configure dotnet format rules

  TypeScript:
  1. npm install -D eslint @typescript-eslint/parser
  2. Create .eslintrc.js
  3. Add lint script to package.json
  -->
  ```

### Implementation Notes

**Completed**: 2025-12-03

**Files Created**:
- `mcp-container/pyproject.toml` - Python project with FastAPI, PyTorch, Transformers
- `mcp-container/requirements.txt` - Pinned dependencies for Docker
- `mcp-container/Dockerfile` - Multi-stage build with Tesseract Spanish support
- `mcp-container/docker-compose.yml` - Local development configuration
- `mcp-container/src/__init__.py`, `models/__init__.py`, `utils/__init__.py`
- `windows-bridge/ContpaqiBridge.sln` - Solution file
- `windows-bridge/src/ContpaqiBridge/ContpaqiBridge.csproj` - x86 target
- `windows-bridge/src/ContpaqiBridge/Program.cs` - Localhost-only binding
- `windows-bridge/src/ContpaqiBridge/Services/JobQueueService.cs` - Sequential job processing
- `windows-bridge/.editorconfig` - C# code style
- `desktop-app/package.json` - Electron + React + Tailwind
- `desktop-app/electron/main.ts` - Docker management
- `desktop-app/tailwind.config.js` - Tailwind configuration
- `desktop-app/.eslintrc.cjs` - ESLint for TypeScript
- `desktop-app/src/App.tsx` - Main React component

**Log Files**:
- `log_files/T001_ProjectSetup_Log.md`
- `log_tests/T001_ProjectSetup_TestLog.md`
- `log_learn/T001_ProjectSetup_Guide.md`

### Test Checklist
- [x] All directories exist
- [x] Python project imports successfully
- [x] C# project builds without errors
- [x] Electron app starts
- [x] Docker container builds

---

## Task 2: Build Synthetic Invoice Generator

**Priority**: High | **Dependencies**: Task 1 | **Tags**: data-prep, phase-1, python
**Status**: Completed
**Estimated Effort**: 5-7 days
**Completed Date**: 2025-12-03

### Description
Create a Python script that generates thousands of unique PDF invoices and their corresponding Ground Truth JSON labels for training AI models.

### Subtasks

- [x] 2.1 Set up Python environment with Faker and WeasyPrint in scripts/
  ```
  <!-- IMPLEMENTATION STEPS:
  1. Create scripts/requirements.txt:
     faker==22.0.0
     weasyprint==60.1
     Pillow==10.1.0
     jinja2==3.1.2
  2. Create scripts/generate_invoices.py with main() function
  3. Create virtual environment: python -m venv venv
  4. Install: pip install -r requirements.txt
  -->
  ```
  **Completed**: 2025-12-03 | Created requirements.txt, generate_invoices.py with CLI, templates/ directory

- [x] 2.2 Configure Faker for Mexican locale (Names, RFCs, Addresses)
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Import: from faker import Faker
  2. Initialize: fake = Faker('es_MX')
  3. Create RFC generator function:
     def generate_rfc():
         # Format: 4 letters + 6 digits (date) + 3 alphanumeric
         letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=4))
         date = fake.date_of_birth().strftime('%y%m%d')
         homoclave = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=3))
         return f"{letters}{date}{homoclave}"
  4. Test with: fake.name(), fake.address(), generate_rfc()
  -->
  ```
  **Completed**: 2025-12-03 | Created mexican_data.py with RFC generator, validator, company/person generators

- [x] 2.3 Design 10 distinct HTML/CSS invoice templates
  ```
  <!-- IMPLEMENTATION STEPS:
  1. Create scripts/templates/ directory
  2. Create template_01.html through template_10.html
  3. Each template should have:
     - Header with company logo placeholder
     - RFC emisor/receptor fields
     - Date and folio fields
     - Line items table with columns: Description, Qty, Unit Price, Amount
     - Subtotal, IVA (16%), Total fields
  4. Use Jinja2 placeholders: {{ company_name }}, {{ rfc }}, etc.
  5. Vary: logo position (left/center/right), table styles, fonts
  -->
  ```
  **Completed**: 2025-12-03 | Created 10 distinct templates with varied colors, fonts, and layouts

- [x] 2.4 Design 10 additional template variations (fonts, layouts)
  ```
  <!-- IMPLEMENTATION STEPS:
  1. Create template_11.html through template_20.html
  2. Variations to include:
     - Different font families (Arial, Times, Helvetica, Roboto)
     - Single-column vs two-column layouts
     - With/without borders on tables
     - Different color schemes (blue, green, gray headers)
     - Portrait vs landscape orientation
  -->
  ```
  **Completed**: 2025-12-03 | Created 10 additional templates with Roboto, Lato, Montserrat, Poppins, etc. Includes 3 landscape, 1 dark mode, various layouts

- [x] 2.5 Implement data randomization logic for company names, dates, prices
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Create generate_invoice_data() function:
     def generate_invoice_data():
         num_items = random.randint(1, 10)
         items = []
         for _ in range(num_items):
             qty = random.randint(1, 100)
             unit_price = round(random.uniform(10, 5000), 2)
             items.append({
                 'description': fake.catch_phrase(),
                 'quantity': qty,
                 'unit_price': unit_price,
                 'amount': round(qty * unit_price, 2)
             })
         subtotal = sum(item['amount'] for item in items)
         iva = round(subtotal * 0.16, 2)
         return {
             'emisor': {'name': fake.company(), 'rfc': generate_rfc()},
             'receptor': {'name': fake.company(), 'rfc': generate_rfc()},
             'date': fake.date_between(start_date='-2y', end_date='today'),
             'folio': fake.uuid4()[:8].upper(),
             'items': items,
             'subtotal': subtotal,
             'iva': iva,
             'total': round(subtotal + iva, 2)
         }
  -->
  ```
  **Completed**: 2025-12-03 | Created invoice_data.py with generate_invoice_data(), 35+ product descriptions, seed reproducibility, 16% IVA calculation

- [x] 2.6 Implement bounding box calculation for all fields
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. After rendering PDF, use pdf2image to convert to image
  2. Use pytesseract with output_type=Output.DICT to get word boxes
  3. Create function to find field coordinates:
     def find_field_bbox(image, field_value):
         data = pytesseract.image_to_data(image, output_type=Output.DICT)
         for i, text in enumerate(data['text']):
             if field_value in text:
                 return {
                     'x': data['left'][i],
                     'y': data['top'][i],
                     'width': data['width'][i],
                     'height': data['height'][i]
                 }
  4. Store bounding boxes for: total, subtotal, iva, date, rfc_emisor, rfc_receptor
  5. For line items, store row-level bounding boxes
  -->
  ```
  **Completed**: 2025-12-03 | Created bbox_utils.py with find_text_bbox, find_numeric_bbox, find_all_field_bboxes, normalization, merging

- [x] 2.7 Create JSON sidecar file generator for ground truth labels
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Create function save_ground_truth():
     def save_ground_truth(invoice_data, bboxes, output_path):
         ground_truth = {
             'fields': {
                 'rfc_emisor': {'value': invoice_data['emisor']['rfc'], 'bbox': bboxes['rfc_emisor']},
                 'rfc_receptor': {'value': invoice_data['receptor']['rfc'], 'bbox': bboxes['rfc_receptor']},
                 'date': {'value': str(invoice_data['date']), 'bbox': bboxes['date']},
                 'subtotal': {'value': invoice_data['subtotal'], 'bbox': bboxes['subtotal']},
                 'iva': {'value': invoice_data['iva'], 'bbox': bboxes['iva']},
                 'total': {'value': invoice_data['total'], 'bbox': bboxes['total']}
             },
             'line_items': [
                 {'description': item['description'], 'quantity': item['quantity'],
                  'unit_price': item['unit_price'], 'amount': item['amount'], 'bbox': item_bbox}
                 for item, item_bbox in zip(invoice_data['items'], bboxes['items'])
             ]
         }
         with open(output_path, 'w') as f:
             json.dump(ground_truth, f, indent=2)
  -->
  ```
  **Completed**: 2025-12-03 | Created ground_truth.py with create_ground_truth, save_ground_truth, load_ground_truth, 33 tests passing

- [x] 2.8 Generate 5,000+ synthetic invoice samples
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Create main generation loop:
     def generate_dataset(num_samples=5000, output_dir='data/synthetic'):
         os.makedirs(f'{output_dir}/pdfs', exist_ok=True)
         os.makedirs(f'{output_dir}/labels', exist_ok=True)

         templates = load_all_templates()  # Load 20 templates

         for i in tqdm(range(num_samples)):
             template = random.choice(templates)
             invoice_data = generate_invoice_data()

             # Render PDF
             pdf_path = f'{output_dir}/pdfs/invoice_{i:05d}.pdf'
             render_invoice(template, invoice_data, pdf_path)

             # Calculate bboxes and save ground truth
             bboxes = calculate_bboxes(pdf_path, invoice_data)
             json_path = f'{output_dir}/labels/invoice_{i:05d}.json'
             save_ground_truth(invoice_data, bboxes, json_path)
  2. Run with: python scripts/generate_invoices.py --num-samples 5000
  -->
  ```
  **Completed**: 2025-12-03 | Full pipeline working with generate_dataset(), 36 tests passing, 20 templates, PDF+JSON output

### Implementation Notes

**Task 2 Completed**: 2025-12-03

**Summary**: Built complete synthetic invoice generation pipeline with 20 templates, Mexican locale data, PDF rendering via WeasyPrint, and JSON ground truth labels.

**Components Created**:
- `scripts/generate_invoices.py` - Main generator with CLI
- `scripts/mexican_data.py` - RFC generator and validators
- `scripts/invoice_data.py` - Invoice data randomization
- `scripts/bbox_utils.py` - Bounding box utilities
- `scripts/ground_truth.py` - JSON sidecar generator
- `scripts/templates/template_01.html` through `template_20.html` - 20 invoice templates

**Total Tests**: 532 passing
**Log Files**: Created for all 8 subtasks

### Test Checklist
- [x] Faker generates valid Mexican data
- [x] All 20 templates render correctly
- [x] RFC format matches Mexican standard
- [x] Bounding boxes are accurate (visual inspection)
- [x] JSON labels are valid and complete
- [x] 5000+ samples generated without errors

---

## Task 3: Format Data for TATR & LayoutLM

**Priority**: High | **Dependencies**: Task 2 | **Tags**: data-prep, phase-1, ml
**Status**: Completed
**Estimated Effort**: 3-4 days
**Completed Date**: 2025-12-04

### Description
Convert the raw PDF/JSON pairs into the specific formats required by Hugging Face Transformers library.

### Subtasks

- [x] 3.1 Create prepare_datasets.py script
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Create scripts/prepare_datasets.py
  2. Import: datasets, PIL, pytesseract, json, os
  3. Create argument parser:
     --input-dir: data/synthetic
     --output-dir: data/formatted
     --format: 'tatr' or 'layoutlm' or 'both'
  4. Create main() function that calls appropriate formatters
  -->
  ```
  **Completed**: 2025-12-04 | CLI script with argparse, format_tatr/format_layoutlm stubs, 31 tests passing

- [x] 3.2 Implement TATR data preparation (COCO format, normalized boxes)
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. COCO format structure:
     {
       "images": [{"id": 1, "file_name": "...", "width": W, "height": H}],
       "annotations": [{"id": 1, "image_id": 1, "category_id": 1, "bbox": [x,y,w,h]}],
       "categories": [{"id": 1, "name": "table"}, {"id": 2, "name": "table_row"}]
     }
  2. Normalize bounding boxes to 0-1000 scale:
     def normalize_bbox(bbox, width, height):
         return [
             int(bbox[0] * 1000 / width),
             int(bbox[1] * 1000 / height),
             int(bbox[2] * 1000 / width),
             int(bbox[3] * 1000 / height)
         ]
  3. For each invoice:
     - Load image and get dimensions
     - Extract table bbox (encompasses all line items)
     - Extract row bboxes (each line item)
     - Add to COCO annotations
  -->
  ```
  **Completed**: 2025-12-04 | COCO format with normalize_bbox, pdf_to_image, table/row extraction, 37 tests passing

- [x] 3.3 Implement LayoutLMv3 data preparation (BIO tags, tokens)
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Run OCR on each image to get word-level tokens:
     def get_ocr_tokens(image):
         data = pytesseract.image_to_data(image, output_type=Output.DICT)
         tokens = []
         for i in range(len(data['text'])):
             if data['text'][i].strip():
                 tokens.append({
                     'text': data['text'][i],
                     'bbox': [data['left'][i], data['top'][i],
                              data['left'][i]+data['width'][i],
                              data['top'][i]+data['height'][i]]
                 })
         return tokens
  2. Match tokens to ground truth and assign BIO tags:
     Labels: B-RFC_EMISOR, I-RFC_EMISOR, B-TOTAL, I-TOTAL, B-DATE, etc.
     O for non-entity tokens
  3. Create dataset in format:
     {
       "tokens": ["word1", "word2", ...],
       "bboxes": [[x1,y1,x2,y2], ...],
       "ner_tags": [0, 1, 2, ...],  # Label IDs
       "image": PIL.Image
     }
  -->
  ```
  **Completed**: 2025-12-04 | BIO tagging, OCR tokens, match_token_to_field, create_layoutlm_sample, 38 tests passing

- [x] 3.4 Create train/validation/test splits (80/10/10)
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. Use sklearn train_test_split:
     from sklearn.model_selection import train_test_split

     all_samples = list(range(len(dataset)))
     train_idx, temp_idx = train_test_split(all_samples, test_size=0.2, random_state=42)
     val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=42)
  2. Save splits to separate directories:
     data/formatted/tatr/train/
     data/formatted/tatr/val/
     data/formatted/tatr/test/
     data/formatted/layoutlm/train/
     data/formatted/layoutlm/val/
     data/formatted/layoutlm/test/
  -->
  ```
  **Completed**: 2025-12-04 | create_splits, split_dataset, copy_split_files, CLI options, 23 tests passing

- [x] 3.5 Validate dataset format compatibility with Hugging Face
  ```python
  <!-- IMPLEMENTATION STEPS:
  1. For TATR (COCO format):
     from datasets import load_dataset
     dataset = load_dataset('json', data_files={'train': 'train.json'})
     # Verify structure matches expected COCO format

  2. For LayoutLM:
     from transformers import LayoutLMv3Processor
     processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base")
     # Test encoding a sample:
     encoding = processor(image, tokens, boxes=bboxes, word_labels=labels)
     # Verify no errors

  3. Create validation script that loads and checks all splits
  -->
  ```
  **Completed**: 2025-12-04 | validate_coco_format, validate_layoutlm_format, validate_dataset, CLI --validate, 27 tests passing

### Implementation Notes

**Task 3 Completed**: 2025-12-04

**Summary**: Built complete data preparation pipeline for converting synthetic invoices to TATR (COCO format) and LayoutLM (BIO tags) formats, with dataset splitting and Hugging Face validation.

**Components Created**:
- `scripts/prepare_datasets.py` - Main CLI with all formatting, splitting, and validation functions
- `tests/test_task003_1_prepare_datasets.py` - 31 tests for CLI/module
- `tests/test_task003_2_tatr_format.py` - 37 tests for COCO format
- `tests/test_task003_3_layoutlm_format.py` - 38 tests for LayoutLM format
- `tests/test_task003_4_dataset_splits.py` - 23 tests for dataset splits
- `tests/test_task003_5_huggingface_validation.py` - 27 tests for HF validation

**Key Functions**:
- `format_tatr()` / `format_layoutlm()` - Format conversion
- `normalize_bbox()` / `pdf_to_image()` - Image processing
- `create_bio_tags()` / `match_token_to_field()` - BIO tagging
- `create_splits()` / `split_dataset()` - Dataset splitting (80/10/10)
- `validate_coco_format()` / `validate_layoutlm_format()` - HF validation

**Total Tests**: 688 passing

**Log Files**:
- `log_files/T003.1-5_*_Log.md` - Implementation logs
- `log_tests/T003.1-5_*_TestLog.md` - Test logs
- `log_learn/T003.1-5_*_Guide.md` - Learning guides

### Test Checklist
- [x] COCO JSON is valid
- [x] All bounding boxes are within image bounds
- [x] BIO tags are correctly assigned
- [x] Train/val/test splits are disjoint
- [x] Hugging Face datasets load without errors

---

## Task 4: Docker Environment & Dependencies

**Priority**: High | **Dependencies**: Task 1 | **Tags**: mcp-container, phase-2, docker
**Status**: Not Started
**Estimated Effort**: 1-2 days

### Description
Create a highly optimized Dockerfile for Python AI inference with all required dependencies.

### Subtasks

- [x] 4.1 Create Dockerfile with python:3.9-slim-bullseye base
  ```dockerfile
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/Dockerfile:

  # Stage 1: Builder
  FROM python:3.9-slim-bullseye as builder

  WORKDIR /app

  # Install build dependencies
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      && rm -rf /var/lib/apt/lists/*

  # Copy and install Python dependencies
  COPY requirements.txt .
  RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

  # Stage 2: Runtime
  FROM python:3.9-slim-bullseye

  WORKDIR /app
  -->
  ```
  **Completed**: 2025-12-04 | Multi-stage build with builder/runtime stages, 36 tests passing

- [x] 4.2 Install system deps (tesseract-ocr, tesseract-ocr-spa, poppler)
  ```dockerfile
  <!-- IMPLEMENTATION STEPS:
  Add to Dockerfile runtime stage:

  # Install runtime system dependencies
  RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      tesseract-ocr-spa \
      libpoppler-cpp-dev \
      poppler-utils \
      libgl1-mesa-glx \
      libglib2.0-0 \
      && rm -rf /var/lib/apt/lists/*

  # Verify tesseract installation
  RUN tesseract --version && tesseract --list-langs
  -->
  ```
  **Completed**: 2025-12-04 | All system deps in Dockerfile runtime stage, verification step, 29 tests passing

- [x] 4.3 Create requirements.txt with pinned versions
  ```
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/requirements.txt:

  # Web framework
  fastapi==0.104.1
  uvicorn[standard]==0.24.0
  python-multipart==0.0.6

  # AI/ML
  torch==2.1.0
  transformers==4.35.0
  detectron2==0.6

  # OCR
  pytesseract==0.3.10
  pdf2image==1.16.3
  Pillow==10.1.0

  # Validation
  pydantic==2.5.0

  # Utilities
  python-dotenv==1.0.0
  -->
  ```
  **Completed**: 2025-12-04 | 10 packages pinned with exact versions, organized by category, 40 tests passing

- [x] 4.4 Implement multi-stage build for optimization
  ```dockerfile
  <!-- IMPLEMENTATION STEPS:
  Complete Dockerfile with multi-stage:

  # Copy wheels from builder
  COPY --from=builder /app/wheels /wheels
  RUN pip install --no-cache /wheels/*

  # Copy application code
  COPY src/ ./src/

  # Create non-root user for security
  RUN useradd -m appuser && chown -R appuser:appuser /app
  USER appuser

  # Expose port
  EXPOSE 8000

  # Health check
  HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
      CMD curl -f http://localhost:8000/health || exit 1

  # Run application
  CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
  -->
  ```
  **Completed**: 2025-12-05 | Builder/runtime stages, wheel install, non-root user, health check, 51 tests passing

- [x] 4.5 Create docker-compose.yml for local development
  ```yaml
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/docker-compose.yml:

  version: '3.8'

  services:
    mcp-container:
      build:
        context: .
        dockerfile: Dockerfile
      ports:
        - "8000:8000"
      volumes:
        - ./src:/app/src:ro  # Read-only mount for development
        - ./models:/app/models:ro  # Pre-trained models
      environment:
        - LOG_LEVEL=DEBUG
        - PYTHONUNBUFFERED=1
      restart: unless-stopped

      # Resource limits
      deploy:
        resources:
          limits:
            memory: 4G
          reservations:
            memory: 2G
  -->
  ```
  **Completed**: 2025-12-05 | Full docker-compose.yml with ports, volumes, environment, restart, resource limits, health check, 50 tests passing

- [ ] 4.6 Test container builds and runs successfully
  ```bash
  <!-- IMPLEMENTATION STEPS:
  1. Build the container:
     cd mcp-container
     docker build -t mcp-container:latest .

  2. Verify image size:
     docker images mcp-container:latest
     # Target: < 3GB

  3. Run container:
     docker run -p 8000:8000 mcp-container:latest

  4. Test health endpoint:
     curl http://localhost:8000/health

  5. Run with docker-compose:
     docker-compose up -d
     docker-compose logs -f
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] Docker image builds without errors
- [ ] Image size < 3GB
- [ ] Container starts successfully
- [ ] Health endpoint responds
- [ ] Tesseract OCR works inside container
- [ ] Python imports work (torch, transformers)

---

## Task 5: OCR Layer Implementation

**Priority**: High | **Dependencies**: Task 4 | **Tags**: mcp-container, phase-2, ocr
**Status**: Not Started
**Estimated Effort**: 1-2 days

### Description
Implement Tesseract OCR wrapper with Spanish support and coordinate extraction.

### Subtasks

- [ ] 5.1 Create mcp-container/src/utils/ocr.py
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create file with structure:

  """
  OCR utilities using Tesseract for invoice text extraction.
  """
  import pytesseract
  from PIL import Image
  from typing import List, Dict, Any
  from dataclasses import dataclass

  @dataclass
  class OCRWord:
      text: str
      confidence: float
      bbox: tuple  # (x1, y1, x2, y2)

  class OCREngine:
      def __init__(self, lang: str = 'spa'):
          self.lang = lang

      def extract_words(self, image: Image.Image) -> List[OCRWord]:
          pass

      def extract_text(self, image: Image.Image) -> str:
          pass
  -->
  ```

- [ ] 5.2 Implement Tesseract wrapper with Spanish support
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to OCREngine class:

  def __init__(self, lang: str = 'spa+eng'):
      """Initialize with Spanish + English for mixed content."""
      self.lang = lang
      self.config = '--oem 3 --psm 6'  # LSTM engine, uniform block

      # Verify language is available
      available_langs = pytesseract.get_languages()
      for l in lang.split('+'):
          if l not in available_langs:
              raise RuntimeError(f"Language {l} not available. Install tesseract-ocr-{l}")

  def extract_text(self, image: Image.Image) -> str:
      """Extract plain text from image."""
      return pytesseract.image_to_string(image, lang=self.lang, config=self.config)
  -->
  ```

- [ ] 5.3 Extract words with coordinates (bounding boxes)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to OCREngine class:

  def extract_words(self, image: Image.Image) -> List[OCRWord]:
      """Extract words with bounding boxes and confidence scores."""
      data = pytesseract.image_to_data(image, lang=self.lang,
                                        config=self.config,
                                        output_type=pytesseract.Output.DICT)

      words = []
      n_boxes = len(data['text'])

      for i in range(n_boxes):
          text = data['text'][i].strip()
          conf = int(data['conf'][i])

          # Skip empty text or low confidence
          if not text or conf < 0:
              continue

          x, y, w, h = (data['left'][i], data['top'][i],
                        data['width'][i], data['height'][i])

          words.append(OCRWord(
              text=text,
              confidence=conf / 100.0,
              bbox=(x, y, x + w, y + h)
          ))

      return words
  -->
  ```

- [ ] 5.4 Handle Spanish characters properly (UTF-8)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add encoding handling:

  import unicodedata

  def normalize_text(self, text: str) -> str:
      """Normalize Spanish text, handling accents and ñ."""
      # Normalize to NFC form (composed characters)
      text = unicodedata.normalize('NFC', text)
      return text

  def extract_words(self, image: Image.Image) -> List[OCRWord]:
      # ... existing code ...

      for i in range(n_boxes):
          text = data['text'][i].strip()
          text = self.normalize_text(text)  # Add normalization
          # ... rest of code ...

  # Add test for Spanish characters:
  def test_spanish_characters():
      ocr = OCREngine()
      # Test with image containing: ñ, á, é, í, ó, ú, ü
      # Verify all characters extracted correctly
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] OCR extracts text from sample invoice
- [ ] Spanish characters (ñ, á, é, í, ó, ú) are correct
- [ ] Bounding boxes are accurate
- [ ] Confidence scores are between 0 and 1
- [ ] Empty/whitespace text is filtered out

---

## Task 6: TATR Model Integration

**Priority**: High | **Dependencies**: Tasks 3, 4 | **Tags**: mcp-container, phase-2, ml, us1
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
Implement Table Transformer model for detecting table structures in invoices.

### Subtasks

- [ ] 6.1 Create mcp-container/src/models/tatr.py
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create file structure:

  """
  Table Transformer (TATR) model for table detection in invoices.
  https://github.com/microsoft/table-transformer
  """
  import torch
  from transformers import AutoModelForObjectDetection, AutoImageProcessor
  from PIL import Image
  from typing import List, Dict, Any
  from dataclasses import dataclass

  @dataclass
  class TableDetection:
      label: str  # 'table', 'table_row', 'table_column_header'
      confidence: float
      bbox: tuple  # (x1, y1, x2, y2) normalized 0-1

  class TATRModel:
      def __init__(self, model_name: str = "microsoft/table-transformer-detection"):
          pass

      def detect(self, image: Image.Image) -> List[TableDetection]:
          pass
  -->
  ```

- [ ] 6.2 Implement TATR model loading (Table Transformer)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to TATRModel class:

  def __init__(self, model_name: str = "microsoft/table-transformer-detection",
               device: str = None):
      """Load Table Transformer model."""
      self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

      # Load model and processor
      self.processor = AutoImageProcessor.from_pretrained(model_name)
      self.model = AutoModelForObjectDetection.from_pretrained(model_name)
      self.model.to(self.device)
      self.model.eval()

      # Label mapping
      self.id2label = self.model.config.id2label

      print(f"TATR model loaded on {self.device}")
  -->
  ```

- [ ] 6.3 Implement table/row detection inference
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add detection method:

  @torch.no_grad()
  def detect(self, image: Image.Image, threshold: float = 0.7) -> List[TableDetection]:
      """Detect tables and rows in image."""
      # Preprocess
      inputs = self.processor(images=image, return_tensors="pt")
      inputs = {k: v.to(self.device) for k, v in inputs.items()}

      # Inference
      outputs = self.model(**inputs)

      # Post-process
      target_sizes = torch.tensor([image.size[::-1]])  # (height, width)
      results = self.processor.post_process_object_detection(
          outputs, target_sizes=target_sizes, threshold=threshold
      )[0]

      detections = []
      for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
          detections.append(TableDetection(
              label=self.id2label[label.item()],
              confidence=score.item(),
              bbox=tuple(box.tolist())
          ))

      return detections
  -->
  ```

- [ ] 6.4 Return bounding boxes for detected rows
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add row extraction method:

  def get_table_rows(self, image: Image.Image, threshold: float = 0.7) -> List[Dict]:
      """Get sorted row bounding boxes from detected tables."""
      detections = self.detect(image, threshold)

      # Filter for rows only
      rows = [d for d in detections if d.label == 'table row']

      # Sort by y-coordinate (top to bottom)
      rows.sort(key=lambda r: r.bbox[1])

      return [
          {
              'bbox': row.bbox,
              'confidence': row.confidence,
              'index': i
          }
          for i, row in enumerate(rows)
      ]

  def get_table_bounds(self, image: Image.Image) -> Dict:
      """Get the bounding box of the main table."""
      detections = self.detect(image)
      tables = [d for d in detections if d.label == 'table']

      if not tables:
          return None

      # Return highest confidence table
      best_table = max(tables, key=lambda t: t.confidence)
      return {'bbox': best_table.bbox, 'confidence': best_table.confidence}
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] Model loads without errors
- [ ] Inference runs on sample invoice
- [ ] Tables are detected correctly
- [ ] Rows are sorted top-to-bottom
- [ ] Bounding boxes are in correct format

---

## Task 7: LayoutLM Model Integration

**Priority**: High | **Dependencies**: Tasks 3, 4 | **Tags**: mcp-container, phase-2, ml, us1
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
Implement LayoutLMv3 model for token classification and field extraction.

### Subtasks

- [ ] 7.1 Create mcp-container/src/models/layoutlm.py
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create file structure:

  """
  LayoutLMv3 model for token classification on invoices.
  Extracts fields: RFC, date, total, subtotal, line items.
  """
  import torch
  from transformers import (
      LayoutLMv3Processor,
      LayoutLMv3ForTokenClassification
  )
  from PIL import Image
  from typing import List, Dict, Tuple
  from dataclasses import dataclass

  @dataclass
  class ExtractedField:
      label: str  # e.g., 'RFC_EMISOR', 'TOTAL', 'DATE'
      value: str
      confidence: float
      bbox: tuple

  class LayoutLMModel:
      LABELS = ['O', 'B-RFC_EMISOR', 'I-RFC_EMISOR', 'B-RFC_RECEPTOR',
                'I-RFC_RECEPTOR', 'B-DATE', 'I-DATE', 'B-SUBTOTAL',
                'I-SUBTOTAL', 'B-IVA', 'I-IVA', 'B-TOTAL', 'I-TOTAL',
                'B-ITEM_DESC', 'I-ITEM_DESC', 'B-ITEM_QTY', 'I-ITEM_QTY',
                'B-ITEM_PRICE', 'I-ITEM_PRICE', 'B-ITEM_AMOUNT', 'I-ITEM_AMOUNT']
  -->
  ```

- [ ] 7.2 Implement LayoutLMv3 model loading
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to LayoutLMModel class:

  def __init__(self, model_name: str = "microsoft/layoutlmv3-base",
               device: str = None):
      """Load LayoutLMv3 model for token classification."""
      self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

      # Load processor and model
      self.processor = LayoutLMv3Processor.from_pretrained(model_name)

      # For fine-tuned model, load from local path
      # self.model = LayoutLMv3ForTokenClassification.from_pretrained("./models/layoutlm-invoice")

      # For base model (will need fine-tuning)
      self.model = LayoutLMv3ForTokenClassification.from_pretrained(
          model_name,
          num_labels=len(self.LABELS)
      )
      self.model.to(self.device)
      self.model.eval()

      self.label2id = {l: i for i, l in enumerate(self.LABELS)}
      self.id2label = {i: l for i, l in enumerate(self.LABELS)}
  -->
  ```

- [ ] 7.3 Implement token classification inference
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add inference method:

  @torch.no_grad()
  def predict(self, image: Image.Image, words: List[str],
              boxes: List[Tuple]) -> List[Dict]:
      """Run token classification on OCR words."""
      # Normalize boxes to 0-1000 scale
      width, height = image.size
      normalized_boxes = [
          [int(b[0]*1000/width), int(b[1]*1000/height),
           int(b[2]*1000/width), int(b[3]*1000/height)]
          for b in boxes
      ]

      # Encode inputs
      encoding = self.processor(
          image,
          words,
          boxes=normalized_boxes,
          return_tensors="pt",
          truncation=True,
          padding="max_length",
          max_length=512
      )
      encoding = {k: v.to(self.device) for k, v in encoding.items()}

      # Run inference
      outputs = self.model(**encoding)
      predictions = outputs.logits.argmax(-1).squeeze().tolist()
      probs = torch.softmax(outputs.logits, dim=-1).max(-1).values.squeeze().tolist()

      # Map back to words (handle subword tokenization)
      results = []
      word_ids = encoding.word_ids()
      prev_word_id = None

      for idx, word_id in enumerate(word_ids):
          if word_id is None or word_id == prev_word_id:
              continue
          results.append({
              'word': words[word_id],
              'label': self.id2label[predictions[idx]],
              'confidence': probs[idx],
              'bbox': boxes[word_id]
          })
          prev_word_id = word_id

      return results
  -->
  ```

- [ ] 7.4 Map tokens to field labels (RFC, date, total, etc.)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add field extraction method:

  def extract_fields(self, predictions: List[Dict]) -> Dict[str, ExtractedField]:
      """Group BIO-tagged tokens into complete fields."""
      fields = {}
      current_field = None
      current_tokens = []

      for pred in predictions:
          label = pred['label']

          if label.startswith('B-'):
              # Save previous field
              if current_field and current_tokens:
                  fields[current_field] = self._merge_tokens(current_tokens)

              # Start new field
              current_field = label[2:]  # Remove 'B-' prefix
              current_tokens = [pred]

          elif label.startswith('I-') and current_field == label[2:]:
              # Continue current field
              current_tokens.append(pred)

          else:
              # End current field
              if current_field and current_tokens:
                  fields[current_field] = self._merge_tokens(current_tokens)
              current_field = None
              current_tokens = []

      # Don't forget last field
      if current_field and current_tokens:
          fields[current_field] = self._merge_tokens(current_tokens)

      return fields

  def _merge_tokens(self, tokens: List[Dict]) -> ExtractedField:
      """Merge multiple tokens into single field."""
      value = ' '.join(t['word'] for t in tokens)
      confidence = sum(t['confidence'] for t in tokens) / len(tokens)
      bbox = (
          min(t['bbox'][0] for t in tokens),
          min(t['bbox'][1] for t in tokens),
          max(t['bbox'][2] for t in tokens),
          max(t['bbox'][3] for t in tokens)
      )
      return ExtractedField(
          label=tokens[0]['label'][2:],
          value=value,
          confidence=confidence,
          bbox=bbox
      )
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] Model loads without errors
- [ ] Inference runs on sample OCR output
- [ ] BIO tags are correctly merged
- [ ] All field types are extracted
- [ ] Confidence scores are reasonable

---

## Task 8: Inference Pipeline

**Priority**: High | **Dependencies**: Tasks 5, 6, 7 | **Tags**: mcp-container, phase-2, us1
**Status**: Not Started
**Estimated Effort**: 3-4 days

### Description
The core logic that orchestrates OCR and both AI models for complete invoice extraction.

### Subtasks

- [ ] 8.1 Create InvoiceInferenceEngine class in inference.py
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/src/inference.py:

  """
  Main inference engine that orchestrates OCR, TATR, and LayoutLM.
  """
  from PIL import Image
  from typing import Dict, List, Any, Optional
  from dataclasses import dataclass, asdict
  import logging

  from .utils.ocr import OCREngine
  from .models.tatr import TATRModel
  from .models.layoutlm import LayoutLMModel

  logger = logging.getLogger(__name__)

  @dataclass
  class InvoiceResult:
      rfc_emisor: str
      rfc_receptor: str
      date: str
      subtotal: float
      iva: float
      total: float
      line_items: List[Dict]
      confidence: float
      warnings: List[str]

  class InvoiceInferenceEngine:
      def __init__(self):
          logger.info("Initializing inference engine...")
          self.ocr = OCREngine()
          self.tatr = TATRModel()
          self.layoutlm = LayoutLMModel()
          logger.info("Inference engine ready")
  -->
  ```

- [ ] 8.2 Implement OCR method integration
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to InvoiceInferenceEngine:

  def _run_ocr(self, image: Image.Image) -> tuple:
      """Extract words and bounding boxes using OCR."""
      logger.debug("Running OCR...")
      words = self.ocr.extract_words(image)

      texts = [w.text for w in words]
      boxes = [w.bbox for w in words]
      confidences = [w.confidence for w in words]

      logger.debug(f"OCR extracted {len(words)} words")
      return texts, boxes, confidences
  -->
  ```

- [ ] 8.3 Implement TATR integration for row detection
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to InvoiceInferenceEngine:

  def _detect_table_structure(self, image: Image.Image) -> Dict:
      """Detect table and row bounding boxes."""
      logger.debug("Detecting table structure...")

      table_bounds = self.tatr.get_table_bounds(image)
      rows = self.tatr.get_table_rows(image)

      logger.debug(f"Found table with {len(rows)} rows")
      return {
          'table': table_bounds,
          'rows': rows
      }
  -->
  ```

- [ ] 8.4 Implement LayoutLM integration for field extraction
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to InvoiceInferenceEngine:

  def _extract_fields(self, image: Image.Image,
                      words: List[str], boxes: List[tuple]) -> Dict:
      """Extract labeled fields using LayoutLM."""
      logger.debug("Extracting fields with LayoutLM...")

      predictions = self.layoutlm.predict(image, words, boxes)
      fields = self.layoutlm.extract_fields(predictions)

      logger.debug(f"Extracted fields: {list(fields.keys())}")
      return fields
  -->
  ```

- [ ] 8.5 Implement intersection logic (words in rows → line items)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to InvoiceInferenceEngine:

  def _assign_words_to_rows(self, words: List[str], boxes: List[tuple],
                            rows: List[Dict]) -> List[Dict]:
      """Assign words to table rows based on bbox intersection."""
      line_items = []

      for row in rows:
          row_bbox = row['bbox']
          row_words = []

          for word, box in zip(words, boxes):
              # Check if word center is inside row
              word_center_y = (box[1] + box[3]) / 2
              if row_bbox[1] <= word_center_y <= row_bbox[3]:
                  row_words.append({'word': word, 'bbox': box})

          if row_words:
              line_items.append({
                  'row_index': row['index'],
                  'words': row_words,
                  'bbox': row_bbox
              })

      return line_items

  def _parse_line_item(self, row_words: List[Dict], fields: Dict) -> Dict:
      """Parse a row's words into structured line item."""
      # Match words to item fields from LayoutLM predictions
      item = {
          'description': '',
          'quantity': 0,
          'unit_price': 0.0,
          'amount': 0.0
      }
      # Implementation depends on column order in invoice
      return item
  -->
  ```

- [ ] 8.6 Create predict(image) method combining all steps
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add main prediction method:

  def predict(self, image: Image.Image) -> InvoiceResult:
      """Run complete invoice extraction pipeline."""
      logger.info("Starting invoice extraction...")
      warnings = []

      # Step 1: OCR
      words, boxes, ocr_conf = self._run_ocr(image)

      # Step 2: Table detection
      table_structure = self._detect_table_structure(image)

      # Step 3: Field extraction
      fields = self._extract_fields(image, words, boxes)

      # Step 4: Assign words to rows
      rows = self._assign_words_to_rows(words, boxes, table_structure['rows'])

      # Step 5: Build result
      result = InvoiceResult(
          rfc_emisor=self._get_field_value(fields, 'RFC_EMISOR', ''),
          rfc_receptor=self._get_field_value(fields, 'RFC_RECEPTOR', ''),
          date=self._get_field_value(fields, 'DATE', ''),
          subtotal=self._parse_amount(fields, 'SUBTOTAL'),
          iva=self._parse_amount(fields, 'IVA'),
          total=self._parse_amount(fields, 'TOTAL'),
          line_items=[self._parse_line_item(r['words'], fields) for r in rows],
          confidence=self._calculate_confidence(fields, ocr_conf),
          warnings=warnings
      )

      logger.info("Invoice extraction complete")
      return result
  -->
  ```

- [ ] 8.7 Implement confidence scoring for predictions
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add confidence calculation:

  def _calculate_confidence(self, fields: Dict, ocr_confidences: List[float]) -> float:
      """Calculate overall extraction confidence."""
      scores = []

      # OCR confidence
      if ocr_confidences:
          scores.append(sum(ocr_confidences) / len(ocr_confidences))

      # Field extraction confidence
      for field in fields.values():
          scores.append(field.confidence)

      # Required fields present
      required = ['RFC_EMISOR', 'RFC_RECEPTOR', 'TOTAL']
      present = sum(1 for r in required if r in fields)
      scores.append(present / len(required))

      return sum(scores) / len(scores) if scores else 0.0
  -->
  ```

- [ ] 8.8 Write unit tests for inference pipeline
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/tests/test_inference.py:

  import pytest
  from PIL import Image
  from src.inference import InvoiceInferenceEngine, InvoiceResult

  @pytest.fixture
  def engine():
      return InvoiceInferenceEngine()

  @pytest.fixture
  def sample_invoice():
      return Image.open("tests/fixtures/sample_invoice.pdf")

  def test_predict_returns_result(engine, sample_invoice):
      result = engine.predict(sample_invoice)
      assert isinstance(result, InvoiceResult)

  def test_extracts_rfc(engine, sample_invoice):
      result = engine.predict(sample_invoice)
      assert result.rfc_emisor
      assert len(result.rfc_emisor) >= 12

  def test_extracts_amounts(engine, sample_invoice):
      result = engine.predict(sample_invoice)
      assert result.total > 0
      assert result.subtotal > 0

  def test_line_items_present(engine, sample_invoice):
      result = engine.predict(sample_invoice)
      assert len(result.line_items) > 0
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] Pipeline runs end-to-end
- [ ] All field types extracted
- [ ] Line items correctly parsed
- [ ] Confidence scores are reasonable
- [ ] All unit tests pass

---

## Task 9: MCP Container API & Validation

**Priority**: High | **Dependencies**: Task 8 | **Tags**: mcp-container, phase-2, api, us1, us2
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
FastAPI interface that receives PDF files and enforces data validation.

### Subtasks

- [ ] 9.1 Create FastAPI application in main.py
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/src/main.py:

  """
  FastAPI application for invoice processing.
  """
  from fastapi import FastAPI, UploadFile, File, HTTPException
  from fastapi.middleware.cors import CORSMiddleware
  import logging

  from .inference import InvoiceInferenceEngine
  from .models.schemas import InvoiceResponse, ErrorResponse

  # Configure logging
  logging.basicConfig(level=logging.INFO)
  logger = logging.getLogger(__name__)

  # Initialize app
  app = FastAPI(
      title="Contpaqi Invoice Processor",
      description="AI-powered invoice data extraction",
      version="1.0.0"
  )

  # CORS for local development
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:3000"],
      allow_methods=["*"],
      allow_headers=["*"],
  )

  # Initialize inference engine (singleton)
  engine = None

  @app.on_event("startup")
  async def startup():
      global engine
      engine = InvoiceInferenceEngine()
  -->
  ```

- [ ] 9.2 Define Pydantic models (Invoice, LineItem, Response)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/src/models/schemas.py:

  from pydantic import BaseModel, Field, validator
  from typing import List, Optional
  from datetime import date
  import re

  class LineItem(BaseModel):
      description: str
      quantity: float = Field(ge=0)
      unit_price: float = Field(ge=0)
      amount: float = Field(ge=0)
      confidence: float = Field(ge=0, le=1)

  class Invoice(BaseModel):
      rfc_emisor: str
      rfc_receptor: str
      fecha: date
      folio: Optional[str] = None
      subtotal: float = Field(ge=0)
      iva: float = Field(ge=0)
      total: float = Field(ge=0)
      line_items: List[LineItem] = []

  class ValidationResult(BaseModel):
      is_valid: bool
      errors: List[str] = []
      warnings: List[str] = []

  class InvoiceResponse(BaseModel):
      success: bool
      invoice: Optional[Invoice] = None
      validation: ValidationResult
      confidence: float

  class ErrorResponse(BaseModel):
      success: bool = False
      error: str
      detail: Optional[str] = None
  -->
  ```

- [ ] 9.3 Implement POST /process_pdf endpoint
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to main.py:

  from PIL import Image
  from pdf2image import convert_from_bytes
  import io

  @app.post("/process_pdf", response_model=InvoiceResponse)
  async def process_pdf(file: UploadFile = File(...)):
      """Process a PDF invoice and extract data."""
      # Validate file type
      if not file.filename.lower().endswith('.pdf'):
          raise HTTPException(400, "File must be a PDF")

      try:
          # Read file
          contents = await file.read()

          # Convert PDF to image
          images = convert_from_bytes(contents, dpi=300)
          if not images:
              raise HTTPException(400, "Could not read PDF")

          # Process first page
          image = images[0]

          # Run inference
          result = engine.predict(image)

          # Validate result
          validation = validate_invoice(result)

          # Build response
          return InvoiceResponse(
              success=True,
              invoice=Invoice(
                  rfc_emisor=result.rfc_emisor,
                  rfc_receptor=result.rfc_receptor,
                  fecha=parse_date(result.date),
                  subtotal=result.subtotal,
                  iva=result.iva,
                  total=result.total,
                  line_items=[LineItem(**item) for item in result.line_items]
              ),
              validation=validation,
              confidence=result.confidence
          )

      except Exception as e:
          logger.exception("Error processing PDF")
          raise HTTPException(500, str(e))
  -->
  ```

- [ ] 9.4 Implement RFC regex validation
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to schemas.py or create validators.py:

  RFC_PATTERN = re.compile(
      r'^[A-ZÑ&]{3,4}'  # 3-4 letters (personas físicas have 4, morales have 3)
      r'\d{6}'          # 6 digits (birth/constitution date YYMMDD)
      r'[A-Z0-9]{3}$'   # 3 alphanumeric (homoclave)
  )

  def validate_rfc(rfc: str) -> tuple[bool, str]:
      """Validate Mexican RFC format."""
      rfc = rfc.upper().strip()

      if not rfc:
          return False, "RFC is empty"

      if not RFC_PATTERN.match(rfc):
          return False, f"RFC '{rfc}' does not match expected format"

      return True, ""

  # Add to Invoice model as validator:
  @validator('rfc_emisor', 'rfc_receptor')
  def validate_rfc_format(cls, v):
      is_valid, error = validate_rfc(v)
      if not is_valid:
          raise ValueError(error)
      return v.upper()
  -->
  ```

- [ ] 9.5 Implement math verification (subtotal + IVA = total)
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add validation function:

  def validate_math(invoice: Invoice) -> tuple[bool, List[str]]:
      """Verify invoice math is correct."""
      errors = []

      # Check total = subtotal + iva
      expected_total = round(invoice.subtotal + invoice.iva, 2)
      if abs(invoice.total - expected_total) > 0.01:
          errors.append(
              f"Total mismatch: {invoice.total} != {invoice.subtotal} + {invoice.iva}"
          )

      # Check IVA rate (should be ~16%)
      if invoice.subtotal > 0:
          iva_rate = invoice.iva / invoice.subtotal
          if not (0.15 <= iva_rate <= 0.17):
              errors.append(f"IVA rate {iva_rate:.2%} is not ~16%")

      # Check line items sum to subtotal
      if invoice.line_items:
          items_sum = sum(item.amount for item in invoice.line_items)
          if abs(items_sum - invoice.subtotal) > 0.01:
              errors.append(
                  f"Line items sum {items_sum} != subtotal {invoice.subtotal}"
              )

      return len(errors) == 0, errors
  -->
  ```

- [ ] 9.6 Implement /health endpoint
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add to main.py:

  from datetime import datetime

  @app.get("/health")
  async def health_check():
      """Health check endpoint for container monitoring."""
      return {
          "status": "healthy",
          "timestamp": datetime.utcnow().isoformat(),
          "version": "1.0.0",
          "models_loaded": engine is not None
      }

  @app.get("/ready")
  async def readiness_check():
      """Readiness check - confirms models are loaded."""
      if engine is None:
          raise HTTPException(503, "Engine not initialized")
      return {"status": "ready"}
  -->
  ```

- [ ] 9.7 Add error handling and logging
  ```python
  <!-- IMPLEMENTATION STEPS:
  Add exception handlers to main.py:

  from fastapi import Request
  from fastapi.responses import JSONResponse

  @app.exception_handler(HTTPException)
  async def http_exception_handler(request: Request, exc: HTTPException):
      logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
      return JSONResponse(
          status_code=exc.status_code,
          content=ErrorResponse(error=exc.detail).dict()
      )

  @app.exception_handler(Exception)
  async def general_exception_handler(request: Request, exc: Exception):
      logger.exception("Unhandled exception")
      return JSONResponse(
          status_code=500,
          content=ErrorResponse(
              error="Internal server error",
              detail=str(exc) if app.debug else None
          ).dict()
      )

  # Add request logging middleware
  @app.middleware("http")
  async def log_requests(request: Request, call_next):
      logger.info(f"{request.method} {request.url.path}")
      response = await call_next(request)
      logger.info(f"Response: {response.status_code}")
      return response
  -->
  ```

- [ ] 9.8 Write API integration tests
  ```python
  <!-- IMPLEMENTATION STEPS:
  Create mcp-container/tests/test_api.py:

  import pytest
  from fastapi.testclient import TestClient
  from src.main import app

  client = TestClient(app)

  def test_health_endpoint():
      response = client.get("/health")
      assert response.status_code == 200
      assert response.json()["status"] == "healthy"

  def test_process_pdf_requires_file():
      response = client.post("/process_pdf")
      assert response.status_code == 422

  def test_process_pdf_rejects_non_pdf():
      response = client.post(
          "/process_pdf",
          files={"file": ("test.txt", b"hello", "text/plain")}
      )
      assert response.status_code == 400

  def test_process_pdf_success():
      with open("tests/fixtures/sample_invoice.pdf", "rb") as f:
          response = client.post(
              "/process_pdf",
              files={"file": ("invoice.pdf", f, "application/pdf")}
          )
      assert response.status_code == 200
      data = response.json()
      assert data["success"] == True
      assert "invoice" in data
  -->
  ```

### Implementation Notes
<!-- Add notes here after completing the task -->

### Test Checklist
- [ ] /health returns 200
- [ ] /process_pdf accepts PDF files
- [ ] /process_pdf rejects non-PDF files
- [ ] RFC validation works
- [ ] Math validation catches errors
- [ ] Error responses are properly formatted

---

## Task 10: .NET Project & SDK Integration

**Priority**: High | **Dependencies**: Task 1 | **Tags**: windows-bridge, phase-3, csharp, us3
**Status**: Not Started
**Estimated Effort**: 3-4 days

### Description
Setup C# ASP.NET Core Web API project that references Contpaqi COM libraries.

### Subtasks

- [ ] 10.1 Create ASP.NET Core Web API project
- [ ] 10.2 Configure for .NET 6.0 with x86 platform target
- [ ] 10.3 Add COM reference to MGW_SDK.dll
- [ ] 10.4 Create SdkInterop.cs wrapper class
- [ ] 10.5 Map fInicializaSDK function
- [ ] 10.6 Map fCreaPoliza function
- [ ] 10.7 Implement error handling for SDK calls
- [ ] 10.8 Write unit tests with mocked SDK

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 11: Job Queue Service

**Priority**: High | **Dependencies**: Task 10 | **Tags**: windows-bridge, phase-3, us3
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
Background service that forces requests to be processed sequentially (SDK limitation).

### Subtasks

- [ ] 11.1 Create JobQueueService as IHostedService
- [ ] 11.2 Implement queue using System.Threading.Channels
- [ ] 11.3 Implement processing loop with SDK lifecycle
- [ ] 11.4 Add 500ms delay between operations
- [ ] 11.5 Implement job status tracking
- [ ] 11.6 Add retry logic for failed operations
- [ ] 11.7 Implement graceful shutdown handling

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 12: Windows Bridge Security & API

**Priority**: High | **Dependencies**: Task 11 | **Tags**: windows-bridge, phase-3, security, us3
**Status**: Not Started
**Estimated Effort**: 1-2 days

### Description
Network locking and API endpoints for the Windows Bridge service.

### Subtasks

- [ ] 12.1 Configure Kestrel to listen on 127.0.0.1:5000 only
- [ ] 12.2 Create localhost validation middleware
- [ ] 12.3 Implement POST /api/invoice endpoint
- [ ] 12.4 Implement GET /api/status/{jobId} endpoint
- [ ] 12.5 Add security headers
- [ ] 12.6 Implement request logging for audit trail
- [ ] 12.7 Write security tests to verify isolation

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 13: Electron Shell & Docker Management

**Priority**: Medium | **Dependencies**: Tasks 9, 12 | **Tags**: desktop-app, phase-5, electron, us2
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
Desktop app wrapper that manages the Docker background process.

**CSS Framework**: Use Tailwind CSS for all styling

### Subtasks

- [ ] 13.1 Initialize Electron + React project with Vite
- [ ] 13.2 Configure Electron main process
- [ ] 13.3 Implement Docker status checking (docker ps)
- [ ] 13.4 Implement container lifecycle management (start/stop)
- [ ] 13.5 Handle Docker daemon not running scenario
- [ ] 13.6 Implement health check polling with retry
- [ ] 13.7 Create status indicators (Starting/Ready/Error)

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 14: Human-in-the-Loop UI

**Priority**: Medium | **Dependencies**: Task 13 | **Tags**: desktop-app, phase-5, react, us2
**Status**: Not Started
**Estimated Effort**: 4-5 days

### Description
Verification screen where users confirm and correct extracted data.

**CSS Framework**: Use Tailwind CSS for all styling

### Subtasks

- [ ] 14.1 Create split-screen layout (PDF + form)
- [ ] 14.2 Implement PDF viewer with react-pdf (zoom, navigation)
- [ ] 14.3 Create InvoiceForm component with auto-population
- [ ] 14.4 Implement confidence-based highlighting (orange <0.90)
- [ ] 14.5 Implement math error highlighting (red)
- [ ] 14.6 Implement validation blocking (disable Submit)
- [ ] 14.7 Create manual correction interface
- [ ] 14.8 Implement submission confirmation flow
- [ ] 14.9 Add batch processing view for multiple invoices
- [ ] 14.10 Add keyboard shortcuts for efficiency

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 15: Hardware-Locked Licensing

**Priority**: Medium | **Dependencies**: Task 12 | **Tags**: licensing, phase-4, us4
**Status**: Not Started
**Estimated Effort**: 3-4 days

### Description
Validate that user has paid before processing invoices.

### Subtasks

- [ ] 15.1 Implement hardware fingerprint collection (UUID)
- [ ] 15.2 Add fallback identifiers (MAC address)
- [ ] 15.3 Set up cloud licensing server (Lambda/Firebase)
- [ ] 15.4 Create license validation endpoint
- [ ] 15.5 Implement JWT signing and validation
- [ ] 15.6 Implement offline grace period (7 days)
- [ ] 15.7 Integrate license check into JobQueueService
- [ ] 15.8 Create license management UI

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 16: Code Obfuscation

**Priority**: Low | **Dependencies**: Tasks 9, 12 | **Tags**: protection, phase-4
**Status**: Not Started
**Estimated Effort**: 1-2 days

### Description
Protect code from reverse engineering.

### Subtasks

- [ ] 16.1 Install and configure PyArmor for Python
- [ ] 16.2 Obfuscate inference.py and main.py
- [ ] 16.3 Modify Dockerfile to use obfuscated dist/
- [ ] 16.4 Configure Dotfuscator Community for C#
- [ ] 16.5 Enable string encryption
- [ ] 16.6 Test obfuscated code functionality

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Task 17: Inno Setup Installer

**Priority**: Low | **Dependencies**: Tasks 13, 14, 15, 16 | **Tags**: deployment, phase-6
**Status**: Not Started
**Estimated Effort**: 2-3 days

### Description
Create Windows installer with all dependencies and services.

### Subtasks

- [ ] 17.1 Create inno-setup.iss script structure
- [ ] 17.2 Implement Docker Desktop prerequisite check
- [ ] 17.3 Implement Windows Service installation
- [ ] 17.4 Bundle Docker image (docker save)
- [ ] 17.5 Implement silent Docker image loading
- [ ] 17.6 Create uninstaller logic
- [ ] 17.7 Add desktop shortcut creation
- [ ] 17.8 Implement first-run wizard
- [ ] 17.9 Code sign the installer
- [ ] 17.10 Test on clean Windows 10/11 machines

### Implementation Notes
<!-- Add notes here after completing the task -->

---

## Summary

| Priority | Tasks | Subtasks |
|----------|-------|----------|
| High | 12 | 78 |
| Medium | 3 | 25 |
| Low | 2 | 16 |
| **Total** | **17** | **119** |

---

## Dependency Graph

```
Task 1 (Setup)
├── Task 2 (Invoice Generator) → Task 3 (Data Format)
│                                      ↓
├── Task 4 (Docker) ──────────────→ Task 6 (TATR)  ──┐
│       ↓                          Task 7 (LayoutLM) ─┼→ Task 8 (Inference) → Task 9 (API)
│   Task 5 (OCR) ─────────────────────────────────────┘                           ↓
│                                                                            Task 13 (Electron) → Task 14 (UI)
└── Task 10 (.NET SDK) → Task 11 (Queue) → Task 12 (Security) ──────────────────┘
                                                 ↓
                                           Task 15 (Licensing)
                                                 ↓
Task 9 + Task 12 ──────────────────────→ Task 16 (Obfuscation)
                                                 ↓
Tasks 13, 14, 15, 16 ──────────────────→ Task 17 (Installer)
```

---

## Progress Tracking

- [x] **Phase 1**: Setup & Data (Tasks 1-3) — 19/19 subtasks ✓
- [ ] **Phase 2**: MCP Container (Tasks 4-9) — 5/38 subtasks
- [ ] **Phase 3**: Windows Bridge (Tasks 10-12) — 0/22 subtasks
- [ ] **Phase 4**: Licensing & Protection (Tasks 15-16) — 0/14 subtasks
- [ ] **Phase 5**: Desktop App (Tasks 13-14) — 0/17 subtasks
- [ ] **Phase 6**: Deployment (Task 17) — 0/10 subtasks

---

## Completed Tasks Log

| Task | Completed Date | Notes |
|------|----------------|-------|
| Task 1: Project Setup & Scaffolding | 2025-12-03 | 6/6 subtasks, 27 tests passing |
| Subtask 2.1: Scripts Setup | 2025-12-03 | requirements.txt, generate_invoices.py, 12 tests passing |
| Subtask 2.2: Mexican Locale | 2025-12-03 | mexican_data.py, RFC generator/validator, 22 tests passing |
| Subtask 2.3: Invoice Templates | 2025-12-03 | 10 templates, varied styles/colors/fonts, 134 tests passing |
| Subtask 2.4: Additional Templates | 2025-12-03 | 10 more templates (11-20), 3 landscape, 1 dark, 198 tests passing |
| Subtask 2.5: Data Randomization | 2025-12-03 | invoice_data.py, 35+ products, seed reproducibility, 43 tests passing |
| Subtask 2.6: Bounding Boxes | 2025-12-03 | bbox_utils.py, OCR integration, normalization, 27 tests passing |
| Subtask 2.7: Ground Truth JSON | 2025-12-03 | ground_truth.py, JSON sidecar files, 33 tests passing |
| Subtask 2.8: Dataset Generation | 2025-12-03 | Full pipeline, 20 templates, PDF+JSON output, 36 tests passing |
| **Task 2 Complete** | 2025-12-03 | All 8 subtasks done, 532 total tests passing |
| Subtask 3.1: Prepare Datasets | 2025-12-04 | prepare_datasets.py, CLI with argparse, 31 tests passing |
| Subtask 3.2: TATR Format | 2025-12-04 | COCO format, normalize_bbox, pdf_to_image, 37 tests passing |
| Subtask 3.3: LayoutLM Format | 2025-12-04 | BIO tagging, OCR tokens, create_layoutlm_sample, 38 tests passing |
| Subtask 3.4: Dataset Splits | 2025-12-04 | create_splits, split_dataset, 80/10/10 ratio, 23 tests passing |
| Subtask 3.5: HF Validation | 2025-12-04 | validate_coco_format, validate_layoutlm_format, CLI --validate, 27 tests passing |
| **Task 3 Complete** | 2025-12-04 | All 5 subtasks done, 688 total tests passing |
| Subtask 4.1: Dockerfile Base | 2025-12-04 | Multi-stage build, python:3.9-slim-bullseye, 36 tests passing |
| Subtask 4.2: System Dependencies | 2025-12-04 | tesseract-ocr, poppler, verification step, 29 tests passing |
| Subtask 4.3: Requirements Pinned | 2025-12-04 | 10 packages pinned, organized by category, 40 tests passing |
| Subtask 4.4: Multi-Stage Build | 2025-12-05 | Builder/runtime stages, wheels, non-root user, health check, 51 tests passing |
| Subtask 4.5: Docker Compose | 2025-12-05 | Full docker-compose.yml, ports, volumes, environment, health check, 50 tests passing |
