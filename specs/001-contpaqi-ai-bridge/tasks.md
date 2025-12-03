# Tasks: Contpaqi AI Bridge

**Input**: Design documents from `/specs/001-contpaqi-ai-bridge/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project directory structure per plan.md
- [ ] T002 [P] Initialize Python project with pyproject.toml in mcp-container/
- [ ] T003 [P] Initialize C# ASP.NET Core project in windows-bridge/
- [ ] T004 [P] Initialize Electron + React project in desktop-app/
- [ ] T005 [P] Create base Dockerfile for MCP container
- [ ] T006 [P] Configure linting: black/ruff (Python), dotnet format (C#), eslint (TS)

**Checkpoint**: All projects scaffold ready

---

## Phase 2: Foundational - Data Generation

**Purpose**: Synthetic training data for AI models (blocks US1)

### T100 Series: Synthetic Invoice Generator

- [ ] T101 [P] Set up Python environment with Faker and WeasyPrint in scripts/
- [ ] T102 Configure Faker for Mexican locale (Names, RFCs, Addresses) in scripts/generate_invoices.py
- [ ] T103 [P] Design 10 distinct HTML/CSS invoice templates in scripts/templates/
- [ ] T104 [P] Design 10 additional template variations (fonts, layouts) in scripts/templates/
- [ ] T105 Implement data randomization logic in scripts/generate_invoices.py
- [ ] T106 Implement bounding box calculation for all fields in scripts/generate_invoices.py
- [ ] T107 Create JSON sidecar file generator for ground truth in scripts/generate_invoices.py
- [ ] T108 Generate 5,000+ synthetic invoice samples to data/synthetic/
- [ ] T109 Organize output: data/synthetic/pdfs/ and data/synthetic/labels/

### T110 Series: Dataset Formatting

- [ ] T110 Create scripts/prepare_datasets.py script
- [ ] T111 Implement TATR data preparation (COCO format) in scripts/prepare_datasets.py
- [ ] T112 Implement LayoutLMv3 data preparation (BIO tags) in scripts/prepare_datasets.py
- [ ] T113 Create train/validation/test splits (80/10/10) in scripts/prepare_datasets.py
- [ ] T114 Validate dataset format compatibility with Hugging Face

**Checkpoint**: Training data ready in data/ directory

---

## Phase 3: User Story 1 - Upload and Extract Invoice Data (Priority: P1)

**Goal**: AI-powered extraction of invoice data from PDF

**Independent Test**: Upload PDF, verify JSON with extracted fields returns in <30s

### T200 Series: MCP Container - Docker Setup

- [ ] T201 Create Dockerfile with python:3.9-slim-bullseye base in mcp-container/
- [ ] T202 Install system dependencies (tesseract-ocr, tesseract-ocr-spa, poppler) in Dockerfile
- [ ] T203 Create requirements.txt with pinned versions in mcp-container/
- [ ] T204 Implement multi-stage build for optimization in Dockerfile
- [ ] T205 Create docker-compose.yml for local development in mcp-container/
- [ ] T206 Test container builds successfully

### T210 Series: MCP Container - OCR Layer

- [ ] T210 [P] [US1] Create mcp-container/src/utils/ocr.py
- [ ] T211 [US1] Implement Tesseract wrapper with Spanish support in ocr.py
- [ ] T212 [US1] Extract words with coordinates (bounding boxes) in ocr.py
- [ ] T213 [US1] Handle Spanish characters properly (UTF-8) in ocr.py

### T220 Series: MCP Container - AI Models

- [ ] T220 [P] [US1] Create mcp-container/src/models/tatr.py
- [ ] T221 [US1] Implement TATR model loading (Table Transformer) in tatr.py
- [ ] T222 [US1] Implement table/row detection inference in tatr.py
- [ ] T223 [P] [US1] Create mcp-container/src/models/layoutlm.py
- [ ] T224 [US1] Implement LayoutLMv3 model loading in layoutlm.py
- [ ] T225 [US1] Implement token classification inference in layoutlm.py

### T230 Series: MCP Container - Inference Engine

- [ ] T230 [US1] Create mcp-container/src/inference.py
- [ ] T231 [US1] Create InvoiceInferenceEngine class in inference.py
- [ ] T232 [US1] Implement OCR method (calls ocr.py) in inference.py
- [ ] T233 [US1] Implement TATR integration (row detection) in inference.py
- [ ] T234 [US1] Implement LayoutLM integration (field extraction) in inference.py
- [ ] T235 [US1] Implement intersection logic (words in rows → line items) in inference.py
- [ ] T236 [US1] Create predict(image) method combining all steps in inference.py
- [ ] T237 [US1] Implement confidence scoring in inference.py

### T240 Series: MCP Container - API

- [ ] T240 [US1] Create mcp-container/src/main.py with FastAPI
- [ ] T241 [US1] Define Pydantic models (Invoice, LineItem, Response) in main.py
- [ ] T242 [US1] Implement POST /process_pdf endpoint in main.py
- [ ] T243 [US1] Implement /health endpoint in main.py
- [ ] T244 [US1] Add error handling and logging in main.py

### T250 Series: MCP Container - Tests

- [ ] T250 [P] [US1] Create mcp-container/tests/test_ocr.py
- [ ] T251 [P] [US1] Create mcp-container/tests/test_inference.py
- [ ] T252 [P] [US1] Create mcp-container/tests/test_api.py

**Checkpoint**: US1 complete - PDF upload returns extracted JSON

---

## Phase 4: User Story 2 - Validate and Correct Data (Priority: P2)

**Goal**: Human-in-the-loop verification UI

**Independent Test**: View extracted data, edit fields, verify validation rules work

### T300 Series: MCP Container - Validation

- [ ] T300 [US2] Create mcp-container/src/utils/validation.py
- [ ] T301 [US2] Implement RFC regex validation (^[A-Z&Ñ]{3,4}...) in validation.py
- [ ] T302 [US2] Implement math verification (subtotal + IVA = total) in validation.py
- [ ] T303 [US2] Implement date format validation in validation.py
- [ ] T304 [US2] Implement required field checks in validation.py
- [ ] T305 [US2] Integrate validation into /process_pdf response in main.py

### T310 Series: Desktop App - Setup

- [ ] T310 [P] [US2] Configure Electron main process in desktop-app/electron/main.ts
- [ ] T311 [P] [US2] Configure React with Vite in desktop-app/
- [ ] T312 [US2] Create desktop-app/electron/docker.ts for container management
- [ ] T313 [US2] Implement Docker status checking in docker.ts
- [ ] T314 [US2] Implement container lifecycle (start/stop) in docker.ts
- [ ] T315 [US2] Implement health check polling in docker.ts

### T320 Series: Desktop App - UI Components

- [ ] T320 [P] [US2] Create desktop-app/src/components/PdfViewer.tsx
- [ ] T321 [US2] Implement PDF rendering with react-pdf in PdfViewer.tsx
- [ ] T322 [US2] Implement zoom and page navigation in PdfViewer.tsx
- [ ] T323 [P] [US2] Create desktop-app/src/components/InvoiceForm.tsx
- [ ] T324 [US2] Implement form auto-population from JSON in InvoiceForm.tsx
- [ ] T325 [US2] Implement confidence-based highlighting (orange <0.90) in InvoiceForm.tsx
- [ ] T326 [US2] Implement math error highlighting (red) in InvoiceForm.tsx
- [ ] T327 [US2] Implement validation blocking (disable Submit) in InvoiceForm.tsx
- [ ] T328 [P] [US2] Create desktop-app/src/components/StatusBar.tsx
- [ ] T329 [US2] Implement status indicators (Starting/Ready/Error) in StatusBar.tsx

### T330 Series: Desktop App - Integration

- [ ] T330 [US2] Create desktop-app/src/services/api.ts
- [ ] T331 [US2] Implement MCP container API calls in api.ts
- [ ] T332 [US2] Create split-screen layout in desktop-app/src/App.tsx
- [ ] T333 [US2] Implement manual correction interface in InvoiceForm.tsx
- [ ] T334 [US2] Add keyboard shortcuts for efficiency in App.tsx

### T340 Series: Desktop App - Tests

- [ ] T340 [P] [US2] Create desktop-app/tests/components.test.tsx
- [ ] T341 [P] [US2] Create desktop-app/tests/api.test.ts

**Checkpoint**: US2 complete - Users can review/edit/validate extracted data

---

## Phase 5: User Story 3 - Post to Contpaqi (Priority: P3)

**Goal**: Automatic poliza creation in Contpaqi accounting software

**Independent Test**: Submit validated invoice, verify poliza in Contpaqi

### T400 Series: Windows Bridge - Project Setup

- [ ] T400 [US3] Create ASP.NET Core Web API project in windows-bridge/
- [ ] T401 [US3] Configure for .NET 6.0 in ContpaqiBridge.csproj
- [ ] T402 [US3] Set Platform Target to x86 (32-bit) in ContpaqiBridge.csproj
- [ ] T403 [US3] Add COM reference to MGW_SDK.dll in ContpaqiBridge.csproj

### T410 Series: Windows Bridge - SDK Integration

- [ ] T410 [US3] Create windows-bridge/src/ContpaqiBridge/Services/SdkInterop.cs
- [ ] T411 [US3] Implement [DllImport] or COM instantiation in SdkInterop.cs
- [ ] T412 [US3] Map fInicializaSDK function in SdkInterop.cs
- [ ] T413 [US3] Map fCreaPoliza function in SdkInterop.cs
- [ ] T414 [US3] Map fTerminaSDK function in SdkInterop.cs
- [ ] T415 [US3] Implement error handling for SDK calls in SdkInterop.cs

### T420 Series: Windows Bridge - Job Queue

- [ ] T420 [US3] Create windows-bridge/src/ContpaqiBridge/Services/JobQueueService.cs
- [ ] T421 [US3] Implement IHostedService in JobQueueService.cs
- [ ] T422 [US3] Implement queue using System.Threading.Channels in JobQueueService.cs
- [ ] T423 [US3] Implement processing loop (dequeue → SDK → delay) in JobQueueService.cs
- [ ] T424 [US3] Implement job status tracking in JobQueueService.cs
- [ ] T425 [US3] Add retry logic for failed operations in JobQueueService.cs
- [ ] T426 [US3] Implement graceful shutdown in JobQueueService.cs

### T430 Series: Windows Bridge - API

- [ ] T430 [US3] Create windows-bridge/src/ContpaqiBridge/Models/Invoice.cs
- [ ] T431 [US3] Create windows-bridge/src/ContpaqiBridge/Controllers/InvoiceController.cs
- [ ] T432 [US3] Implement POST /api/invoice endpoint in InvoiceController.cs
- [ ] T433 [US3] Implement GET /api/status/{jobId} endpoint in InvoiceController.cs
- [ ] T434 [US3] Implement /health endpoint in InvoiceController.cs

### T440 Series: Windows Bridge - Security

- [ ] T440 [US3] Configure Kestrel to listen on 127.0.0.1:5000 only in appsettings.json
- [ ] T441 [US3] Create localhost validation middleware in Program.cs
- [ ] T442 [US3] Add security headers in Program.cs
- [ ] T443 [US3] Implement request logging for audit trail

### T450 Series: Desktop App - Bridge Integration

- [ ] T450 [US3] Add Windows Bridge API calls to desktop-app/src/services/api.ts
- [ ] T451 [US3] Implement submission confirmation flow in App.tsx
- [ ] T452 [US3] Add batch processing view for multiple invoices in App.tsx

### T460 Series: Windows Bridge - Tests

- [ ] T460 [P] [US3] Create windows-bridge/tests/SdkInteropTests.cs (mocked SDK)
- [ ] T461 [P] [US3] Create windows-bridge/tests/JobQueueTests.cs
- [ ] T462 [P] [US3] Create windows-bridge/tests/SecurityTests.cs

**Checkpoint**: US3 complete - Invoices post to Contpaqi successfully

---

## Phase 6: User Story 4 - License Verification (Priority: P4)

**Goal**: Hardware-bound license verification for commercialization

**Independent Test**: Valid license allows processing; invalid blocks with message

### T500 Series: License Service

- [ ] T500 [US4] Create windows-bridge/src/ContpaqiBridge/Services/LicenseService.cs
- [ ] T501 [US4] Implement hardware fingerprint collection (wmic uuid) in LicenseService.cs
- [ ] T502 [US4] Add fallback identifiers (MAC address) in LicenseService.cs
- [ ] T503 [US4] Implement license server API call in LicenseService.cs
- [ ] T504 [US4] Implement JWT validation in LicenseService.cs
- [ ] T505 [US4] Implement offline grace period (7 days) in LicenseService.cs
- [ ] T506 [US4] Integrate license check before invoice processing in JobQueueService.cs

### T510 Series: Cloud License Server

- [ ] T510 [P] [US4] Create AWS Lambda/Firebase function for license validation
- [ ] T511 [US4] Create subscription management database schema
- [ ] T512 [US4] Implement license validation endpoint
- [ ] T513 [US4] Implement JWT signing with expiration

### T520 Series: Desktop App - License UI

- [ ] T520 [US4] Create desktop-app/src/components/LicenseDialog.tsx
- [ ] T521 [US4] Implement license activation flow in LicenseDialog.tsx
- [ ] T522 [US4] Implement trial period display in LicenseDialog.tsx
- [ ] T523 [US4] Implement renewal prompts in App.tsx

**Checkpoint**: US4 complete - License system functional

---

## Phase 7: Polish & Protection

**Purpose**: Code protection and quality improvements

### T600 Series: Obfuscation

- [ ] T600 [P] Install and configure PyArmor for Python obfuscation
- [ ] T601 Obfuscate mcp-container/src/inference.py
- [ ] T602 Obfuscate mcp-container/src/main.py
- [ ] T603 Modify Dockerfile to use obfuscated dist/ folder
- [ ] T604 [P] Configure Dotfuscator Community for C# obfuscation
- [ ] T605 Set up class/method renaming rules in Dotfuscator
- [ ] T606 Enable string encryption in Dotfuscator
- [ ] T607 Add obfuscation to build pipeline
- [ ] T608 Test obfuscated code functionality
- [ ] T609 Verify decompilation produces unreadable code

### T610 Series: Documentation

- [ ] T610 [P] Create API documentation (OpenAPI/Swagger) for MCP container
- [ ] T611 [P] Create API documentation for Windows Bridge
- [ ] T612 [P] Create user guide in docs/

**Checkpoint**: Code protected and documented

---

## Phase 8: Deployment

**Purpose**: Windows installer creation

### T700 Series: Inno Setup Installer

- [ ] T700 Create installer/inno-setup.iss script
- [ ] T701 Implement Docker Desktop prerequisite check in inno-setup.iss
- [ ] T702 Implement Windows Service installation (sc create) in inno-setup.iss
- [ ] T703 Export Docker image: docker save -o mcp_image.tar
- [ ] T704 Bundle Docker image in installer package
- [ ] T705 Implement silent Docker image loading in inno-setup.iss
- [ ] T706 Create uninstaller logic in inno-setup.iss
- [ ] T707 Add desktop shortcut creation in inno-setup.iss
- [ ] T708 Implement first-run wizard (license + Contpaqi setup)
- [ ] T709 Code sign the installer (.exe)
- [ ] T710 Test installation on clean Windows 10 machine
- [ ] T711 Test installation on clean Windows 11 machine

**Checkpoint**: Installer ready for distribution

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Data Gen) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4)
                                                                                              ↓
Phase 7 (Polish) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
      ↓
Phase 8 (Deploy)
```

### Critical Path

1. T101-T114 (Data Generation) → T220-T237 (AI Models) - AI needs training data
2. T201-T206 (Docker Setup) → T240-T244 (MCP API) - Container before API
3. T400-T403 (Bridge Setup) → T410-T415 (SDK) → T420-T426 (Queue) - Sequential SDK setup
4. T300-T305 (Validation) + T320-T334 (UI) → T450-T452 (Integration) - Both needed for full flow

### Parallel Opportunities

- T002, T003, T004 (project scaffolds) can all run in parallel
- T103, T104 (templates) can run in parallel
- T210, T220, T223 (model files) can start in parallel
- T320, T323, T328 (UI components) can run in parallel
- T460, T461, T462 (tests) can run in parallel

---

## Summary Statistics

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 6 | Project Setup |
| Phase 2 | 14 | Data Generation |
| Phase 3 | 31 | US1: Extraction |
| Phase 4 | 24 | US2: Validation UI |
| Phase 5 | 25 | US3: Contpaqi |
| Phase 6 | 11 | US4: Licensing |
| Phase 7 | 12 | Polish |
| Phase 8 | 12 | Deployment |
| **TOTAL** | **135** | |

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [US1-4] maps task to specific user story
- Commit after each task or logical group
- Stop at any checkpoint to validate
- Avoid: vague tasks, same file conflicts
