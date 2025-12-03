# Contpaqi AI Bridge - Task List

**Project**: AI-powered invoice processing for Contpaqi accounting
**Created**: 2025-12-03
**Total**: 17 main tasks, 119 subtasks

---

## Task 1: Project Setup & Scaffolding
**Priority**: High | **Dependencies**: None | **Tags**: setup, phase-1

Initialize all project directories and base configurations for the multi-component architecture.

- [ ] 1.1 Create project directory structure per plan.md
- [ ] 1.2 Initialize Python project with pyproject.toml in mcp-container/
- [ ] 1.3 Initialize C# ASP.NET Core project in windows-bridge/
- [ ] 1.4 Initialize Electron + React project in desktop-app/
- [ ] 1.5 Create base Dockerfile for MCP container
- [ ] 1.6 Configure linting: black/ruff (Python), dotnet format (C#), eslint (TS)

---

## Task 2: Build Synthetic Invoice Generator
**Priority**: High | **Dependencies**: Task 1 | **Tags**: data-prep, phase-1, python

Create a Python script that generates thousands of unique PDF invoices and their corresponding Ground Truth JSON labels for training AI models.

- [ ] 2.1 Set up Python environment with Faker and WeasyPrint in scripts/
- [ ] 2.2 Configure Faker for Mexican locale (Names, RFCs, Addresses)
- [ ] 2.3 Design 10 distinct HTML/CSS invoice templates
- [ ] 2.4 Design 10 additional template variations (fonts, layouts)
- [ ] 2.5 Implement data randomization logic for company names, dates, prices
- [ ] 2.6 Implement bounding box calculation for all fields
- [ ] 2.7 Create JSON sidecar file generator for ground truth labels
- [ ] 2.8 Generate 5,000+ synthetic invoice samples

---

## Task 3: Format Data for TATR & LayoutLM
**Priority**: High | **Dependencies**: Task 2 | **Tags**: data-prep, phase-1, ml

Convert the raw PDF/JSON pairs into the specific formats required by Hugging Face Transformers library.

- [ ] 3.1 Create prepare_datasets.py script
- [ ] 3.2 Implement TATR data preparation (COCO format, normalized boxes)
- [ ] 3.3 Implement LayoutLMv3 data preparation (BIO tags, tokens)
- [ ] 3.4 Create train/validation/test splits (80/10/10)
- [ ] 3.5 Validate dataset format compatibility with Hugging Face

---

## Task 4: Docker Environment & Dependencies
**Priority**: High | **Dependencies**: Task 1 | **Tags**: mcp-container, phase-2, docker

Create a highly optimized Dockerfile for Python AI inference with all required dependencies.

- [ ] 4.1 Create Dockerfile with python:3.9-slim-bullseye base
- [ ] 4.2 Install system deps (tesseract-ocr, tesseract-ocr-spa, poppler)
- [ ] 4.3 Create requirements.txt with pinned versions
- [ ] 4.4 Implement multi-stage build for optimization
- [ ] 4.5 Create docker-compose.yml for local development
- [ ] 4.6 Test container builds and runs successfully

---

## Task 5: OCR Layer Implementation
**Priority**: High | **Dependencies**: Task 4 | **Tags**: mcp-container, phase-2, ocr

Implement Tesseract OCR wrapper with Spanish support and coordinate extraction.

- [ ] 5.1 Create mcp-container/src/utils/ocr.py
- [ ] 5.2 Implement Tesseract wrapper with Spanish support
- [ ] 5.3 Extract words with coordinates (bounding boxes)
- [ ] 5.4 Handle Spanish characters properly (UTF-8)

---

## Task 6: TATR Model Integration
**Priority**: High | **Dependencies**: Tasks 3, 4 | **Tags**: mcp-container, phase-2, ml, us1

Implement Table Transformer model for detecting table structures in invoices.

- [ ] 6.1 Create mcp-container/src/models/tatr.py
- [ ] 6.2 Implement TATR model loading (Table Transformer)
- [ ] 6.3 Implement table/row detection inference
- [ ] 6.4 Return bounding boxes for detected rows

---

## Task 7: LayoutLM Model Integration
**Priority**: High | **Dependencies**: Tasks 3, 4 | **Tags**: mcp-container, phase-2, ml, us1

Implement LayoutLMv3 model for token classification and field extraction.

- [ ] 7.1 Create mcp-container/src/models/layoutlm.py
- [ ] 7.2 Implement LayoutLMv3 model loading
- [ ] 7.3 Implement token classification inference
- [ ] 7.4 Map tokens to field labels (RFC, date, total, etc.)

---

## Task 8: Inference Pipeline
**Priority**: High | **Dependencies**: Tasks 5, 6, 7 | **Tags**: mcp-container, phase-2, us1

The core logic that orchestrates OCR and both AI models for complete invoice extraction.

- [ ] 8.1 Create InvoiceInferenceEngine class in inference.py
- [ ] 8.2 Implement OCR method integration
- [ ] 8.3 Implement TATR integration for row detection
- [ ] 8.4 Implement LayoutLM integration for field extraction
- [ ] 8.5 Implement intersection logic (words in rows → line items)
- [ ] 8.6 Create predict(image) method combining all steps
- [ ] 8.7 Implement confidence scoring for predictions
- [ ] 8.8 Write unit tests for inference pipeline

---

## Task 9: MCP Container API & Validation
**Priority**: High | **Dependencies**: Task 8 | **Tags**: mcp-container, phase-2, api, us1, us2

FastAPI interface that receives PDF files and enforces data validation.

- [ ] 9.1 Create FastAPI application in main.py
- [ ] 9.2 Define Pydantic models (Invoice, LineItem, Response)
- [ ] 9.3 Implement POST /process_pdf endpoint
- [ ] 9.4 Implement RFC regex validation
- [ ] 9.5 Implement math verification (subtotal + IVA = total)
- [ ] 9.6 Implement /health endpoint
- [ ] 9.7 Add error handling and logging
- [ ] 9.8 Write API integration tests

---

## Task 10: .NET Project & SDK Integration
**Priority**: High | **Dependencies**: Task 1 | **Tags**: windows-bridge, phase-3, csharp, us3

Setup C# ASP.NET Core Web API project that references Contpaqi COM libraries.

- [ ] 10.1 Create ASP.NET Core Web API project
- [ ] 10.2 Configure for .NET 6.0 with x86 platform target
- [ ] 10.3 Add COM reference to MGW_SDK.dll
- [ ] 10.4 Create SdkInterop.cs wrapper class
- [ ] 10.5 Map fInicializaSDK function
- [ ] 10.6 Map fCreaPoliza function
- [ ] 10.7 Implement error handling for SDK calls
- [ ] 10.8 Write unit tests with mocked SDK

---

## Task 11: Job Queue Service
**Priority**: High | **Dependencies**: Task 10 | **Tags**: windows-bridge, phase-3, us3

Background service that forces requests to be processed sequentially (SDK limitation).

- [ ] 11.1 Create JobQueueService as IHostedService
- [ ] 11.2 Implement queue using System.Threading.Channels
- [ ] 11.3 Implement processing loop with SDK lifecycle
- [ ] 11.4 Add 500ms delay between operations
- [ ] 11.5 Implement job status tracking
- [ ] 11.6 Add retry logic for failed operations
- [ ] 11.7 Implement graceful shutdown handling

---

## Task 12: Windows Bridge Security & API
**Priority**: High | **Dependencies**: Task 11 | **Tags**: windows-bridge, phase-3, security, us3

Network locking and API endpoints for the Windows Bridge service.

- [ ] 12.1 Configure Kestrel to listen on 127.0.0.1:5000 only
- [ ] 12.2 Create localhost validation middleware
- [ ] 12.3 Implement POST /api/invoice endpoint
- [ ] 12.4 Implement GET /api/status/{jobId} endpoint
- [ ] 12.5 Add security headers
- [ ] 12.6 Implement request logging for audit trail
- [ ] 12.7 Write security tests to verify isolation

---

## Task 13: Electron Shell & Docker Management
**Priority**: Medium | **Dependencies**: Tasks 9, 12 | **Tags**: desktop-app, phase-5, electron, us2

Desktop app wrapper that manages the Docker background process.

- [ ] 13.1 Initialize Electron + React project with Vite
- [ ] 13.2 Configure Electron main process
- [ ] 13.3 Implement Docker status checking (docker ps)
- [ ] 13.4 Implement container lifecycle management (start/stop)
- [ ] 13.5 Handle Docker daemon not running scenario
- [ ] 13.6 Implement health check polling with retry
- [ ] 13.7 Create status indicators (Starting/Ready/Error)

---

## Task 14: Human-in-the-Loop UI
**Priority**: Medium | **Dependencies**: Task 13 | **Tags**: desktop-app, phase-5, react, us2

Verification screen where users confirm and correct extracted data.

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

---

## Task 15: Hardware-Locked Licensing
**Priority**: Medium | **Dependencies**: Task 12 | **Tags**: licensing, phase-4, us4

Validate that user has paid before processing invoices.

- [ ] 15.1 Implement hardware fingerprint collection (UUID)
- [ ] 15.2 Add fallback identifiers (MAC address)
- [ ] 15.3 Set up cloud licensing server (Lambda/Firebase)
- [ ] 15.4 Create license validation endpoint
- [ ] 15.5 Implement JWT signing and validation
- [ ] 15.6 Implement offline grace period (7 days)
- [ ] 15.7 Integrate license check into JobQueueService
- [ ] 15.8 Create license management UI

---

## Task 16: Code Obfuscation
**Priority**: Low | **Dependencies**: Tasks 9, 12 | **Tags**: protection, phase-4

Protect code from reverse engineering.

- [ ] 16.1 Install and configure PyArmor for Python
- [ ] 16.2 Obfuscate inference.py and main.py
- [ ] 16.3 Modify Dockerfile to use obfuscated dist/
- [ ] 16.4 Configure Dotfuscator Community for C#
- [ ] 16.5 Enable string encryption
- [ ] 16.6 Test obfuscated code functionality

---

## Task 17: Inno Setup Installer
**Priority**: Low | **Dependencies**: Tasks 13, 14, 15, 16 | **Tags**: deployment, phase-6

Create Windows installer with all dependencies and services.

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

- [ ] **Phase 1**: Setup & Data (Tasks 1-3) — 0/19 subtasks
- [ ] **Phase 2**: MCP Container (Tasks 4-9) — 0/38 subtasks
- [ ] **Phase 3**: Windows Bridge (Tasks 10-12) — 0/22 subtasks
- [ ] **Phase 4**: Licensing & Protection (Tasks 15-16) — 0/14 subtasks
- [ ] **Phase 5**: Desktop App (Tasks 13-14) — 0/17 subtasks
- [ ] **Phase 6**: Deployment (Task 17) — 0/10 subtasks
