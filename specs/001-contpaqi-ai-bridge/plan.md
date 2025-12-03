# Implementation Plan: Contpaqi AI Bridge

**Branch**: `001-contpaqi-ai-bridge` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-contpaqi-ai-bridge/spec.md`

## Summary

Build an AI-powered invoice processing system with three main components:
1. **MCP Container** (Python/Docker): AI models for PDF extraction using TATR + LayoutLMv3
2. **Windows Bridge** (C#/.NET): COM interop with Contpaqi SDK for accounting entry creation
3. **Desktop App** (Electron/React): User interface for upload, review, and submission

## Technical Context

**Languages/Versions**:
- Python 3.9 (AI Container)
- C# .NET 6.0 (Windows Bridge)
- TypeScript/React (Frontend)

**Primary Dependencies**:
- Python: PyTorch, Transformers, FastAPI, Tesseract OCR, Detectron2
- C#: ASP.NET Core, Contpaqi MGW_SDK.dll (COM)
- Frontend: Electron, React, react-pdf

**Storage**: Local JSON files, SQLite for job queue

**Testing**: pytest (Python), xUnit (C#), Jest (Frontend)

**Target Platform**: Windows 10/11 with Docker Desktop

**Performance Goals**:
- Invoice extraction: <30 seconds
- Contpaqi posting: <5 seconds per poliza

**Constraints**:
- Contpaqi SDK requires x86 (32-bit) process
- SDK operations must be sequential (no concurrency)
- Windows Bridge must be localhost-only

**Scale/Scope**: Single-user desktop application

## Constitution Check

*All gates passed*

- [x] Single desktop application (not distributed system)
- [x] Clear separation: AI in container, SDK in native Windows
- [x] No over-engineering: direct SDK calls, no ORM

## Project Structure

### Documentation (this feature)

```text
specs/001-contpaqi-ai-bridge/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # AI model research
├── data-model.md        # Entity definitions
├── contracts/           # API contracts
│   ├── mcp-api.yaml     # Python container API
│   └── bridge-api.yaml  # C# Windows Bridge API
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
# Component 1: AI Training Data
data/
├── synthetic/           # Generated training invoices
│   ├── pdfs/
│   └── labels/
├── train/
├── validation/
└── test/

scripts/
├── generate_invoices.py # Synthetic data generator
└── prepare_datasets.py  # Format for training

# Component 2: MCP Container (Python AI)
mcp-container/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── src/
│   ├── main.py          # FastAPI application
│   ├── inference.py     # AI inference engine
│   ├── models/
│   │   ├── tatr.py      # Table detection
│   │   └── layoutlm.py  # Token classification
│   └── utils/
│       ├── ocr.py       # Tesseract wrapper
│       └── validation.py # Data sanitization
└── tests/

# Component 3: Windows Bridge (C# SDK)
windows-bridge/
├── ContpaqiBridge.sln
├── src/
│   └── ContpaqiBridge/
│       ├── Program.cs
│       ├── Controllers/
│       │   └── InvoiceController.cs
│       ├── Services/
│       │   ├── SdkInterop.cs
│       │   ├── JobQueueService.cs
│       │   └── LicenseService.cs
│       └── Models/
│           └── Invoice.cs
└── tests/

# Component 4: Desktop Frontend (Electron)
desktop-app/
├── package.json
├── electron/
│   ├── main.ts          # Electron main process
│   └── docker.ts        # Docker management
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── PdfViewer.tsx
│   │   ├── InvoiceForm.tsx
│   │   └── StatusBar.tsx
│   └── services/
│       └── api.ts
└── tests/

# Component 5: Installer
installer/
├── inno-setup.iss       # Inno Setup script
└── assets/
```

**Structure Decision**: Multi-component architecture with clear boundaries:
- Container runs AI (cross-platform, GPU-optional)
- Windows service handles Contpaqi SDK (x86 COM requirement)
- Electron wraps both with user-friendly interface

## Data Model

### Invoice (extracted from PDF)

```typescript
interface Invoice {
  id: string;
  pdfPath: string;
  extractedAt: Date;
  confidence: number;

  // Header fields
  rfcEmisor: string;
  rfcReceptor: string;
  fecha: Date;
  folio: string;

  // Amounts
  subtotal: number;
  iva: number;
  total: number;

  // Validation
  mathValid: boolean;
  rfcValid: boolean;

  // Line items
  items: LineItem[];
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  confidence: number;
}
```

### API Contracts

**MCP Container**: `POST /process_pdf`
- Input: multipart/form-data with PDF file
- Output: Invoice JSON with confidence scores

**Windows Bridge**: `POST /api/invoice`
- Input: Validated Invoice JSON
- Output: Success/Error with Contpaqi reference

## Security Design

### Network Isolation

```
┌─────────────────────────────────────────────────────────┐
│                    LOCALHOST ONLY                       │
│                                                         │
│  ┌─────────────┐        ┌─────────────────────────┐    │
│  │   Electron  │◄──────►│   MCP Container         │    │
│  │   Frontend  │  :8000 │   (Docker)              │    │
│  │             │        │   AI Inference          │    │
│  └──────┬──────┘        └─────────────────────────┘    │
│         │                                               │
│         │ :5000                                         │
│         ▼                                               │
│  ┌─────────────────────────────────────────────┐       │
│  │           Windows Bridge                     │       │
│  │           (C# Service)                       │       │
│  │                                              │       │
│  │  ┌─────────────────────────────────────┐    │       │
│  │  │         Contpaqi SDK                 │    │       │
│  │  │         (COM/DLL)                    │    │       │
│  │  └─────────────────────────────────────┘    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (license only)
                         ▼
                ┌─────────────────┐
                │  License Server │
                │  (Cloud)        │
                └─────────────────┘
```

### License Flow

1. App startup: Collect hardware UUID
2. Send UUID to license server
3. Receive signed JWT with expiration
4. Validate JWT before each invoice processing
5. Offline grace period: 7 days

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| Docker for AI | Isolates Python/CUDA dependencies | Native Python would conflict with Windows system |
| Separate Windows service | Contpaqi SDK requires x86, single-thread | In-process would block UI |
| Two AI models (TATR+LayoutLM) | Tables need structure + content extraction | Single model can't do both well |
