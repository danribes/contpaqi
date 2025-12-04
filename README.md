# Contpaqi AI Bridge

AI-powered invoice processing system that automatically extracts data from PDF invoices and creates accounting entries in Contpaqi accounting software.

## Overview

Contpaqi AI Bridge eliminates manual data entry for Mexican accountants and bookkeepers by combining:

- **Advanced AI/ML** for invoice OCR and table detection (TATR + LayoutLMv3)
- **Windows integration** with Contpaqi's COM SDK
- **User-friendly desktop application** for review and validation

### Workflow

```
PDF Invoice → AI Extraction → Human Review → Contpaqi Entry
```

1. Upload PDF invoices through the desktop application
2. AI models extract invoice data (RFC, amounts, line items)
3. Review and validate extracted data in the UI
4. Auto-post validated entries to Contpaqi accounting

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows Desktop                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │   Electron App   │         │     Docker Container     │  │
│  │  (React + TS)    │◄───────►│     (Python + AI)        │  │
│  │  Port 3000       │         │     Port 8000            │  │
│  └────────┬─────────┘         └──────────────────────────┘  │
│           │                                                  │
│           │ localhost:5000                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          C# Windows Bridge (ASP.NET Core)            │   │
│  │          Contpaqi SDK Integration (COM)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Contpaqi Accounting Software             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Container** | Python 3.9, FastAPI, PyTorch, Transformers, Tesseract OCR |
| **Windows Bridge** | C# .NET 6.0, ASP.NET Core, Contpaqi SDK (COM) |
| **Desktop App** | Electron 27, React 18, TypeScript, Tailwind CSS |
| **Data Generation** | Python, Faker, WeasyPrint, Jinja2 |
| **ML Models** | TATR (table detection), LayoutLMv3 (token classification) |
| **Testing** | pytest, xUnit, Jest |

## Project Structure

```
contpaqi/
├── mcp-container/          # Python AI container (FastAPI + ML models)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── src/
├── windows-bridge/         # C# bridge to Contpaqi SDK
│   └── src/ContpaqiBridge/
├── desktop-app/            # Electron + React desktop application
│   ├── src/
│   └── electron/
├── scripts/                # Data generation & preparation
│   ├── generate_invoices.py
│   ├── prepare_datasets.py
│   └── templates/          # 20 invoice HTML templates
├── data/                   # Training datasets
│   ├── synthetic/          # Generated invoice PDFs + labels
│   ├── train/
│   ├── validation/
│   └── test/
├── specs/                  # Project specifications
├── tests/                  # Test suite
└── installer/              # Inno Setup installer files
```

## Prerequisites

- **Docker Desktop** (Windows/Mac/Linux)
- **Node.js** 18+ (for desktop app)
- **.NET 6.0 SDK** (for Windows Bridge)
- **Python 3.9+** (for data generation scripts)
- **Contpaqi Accounting Software** (Windows only)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/danribes/contpaqi.git
cd contpaqi
```

### 2. Set up the AI container

```bash
cd mcp-container
docker-compose up -d
```

### 3. Set up the desktop app

```bash
cd desktop-app
npm install
npm run dev
```

### 4. Set up the Windows Bridge (Windows only)

```bash
cd windows-bridge
dotnet restore
dotnet build
```

## Data Generation

Generate synthetic invoice data for training:

```bash
cd scripts
pip install -r requirements.txt
python generate_invoices.py --count 1000 --output ../data/synthetic
```

Prepare datasets for ML training:

```bash
python prepare_datasets.py --input ../data/synthetic --output ../data
```

## Configuration

Copy the environment template and configure API keys:

```bash
cp .env.example .env
```

## Development Status

| Task | Status |
|------|--------|
| Project Setup | ✅ Complete |
| Synthetic Data Generation | ✅ Complete |
| Data Formatting (TATR/LayoutLM) | ✅ Complete |
| Docker Environment | 🔄 In Progress |
| OCR Layer | ⏳ Pending |
| AI Model Integration | ⏳ Pending |
| Inference Pipeline | ⏳ Pending |
| Windows Bridge SDK | ⏳ Pending |
| Desktop UI | ⏳ Pending |
| Licensing & Installer | ⏳ Pending |

## Testing

Run the test suite:

```bash
# Python tests
pytest tests/ -v

# .NET tests
cd windows-bridge
dotnet test

# Desktop app tests
cd desktop-app
npm test
```

## Key Features

- **Mexican Invoice Support**: RFC validation, 16% IVA calculation, CFDI compliance
- **Multiple Template Recognition**: 20+ invoice layout variations
- **Human-in-the-Loop**: Review and correct AI extractions before posting
- **Secure Architecture**: Localhost-only Windows Bridge, non-root Docker containers
- **Offline Processing**: All data processing happens locally

## License

Proprietary - All rights reserved.

## Contributing

This is a private project. For internal contributions, please follow the development guidelines in `/specs/001-contpaqi-ai-bridge/plan.md`.
