# ContPAQi AI Bridge

AI-powered invoice processing system that automatically extracts data from PDF invoices and creates accounting entries in ContPAQi accounting software.

## Overview

ContPAQi AI Bridge eliminates manual data entry for Mexican accountants and bookkeepers by combining:

- **Advanced AI/ML** for invoice OCR and table detection (TATR + LayoutLMv3)
- **Windows integration** with ContPAQi's COM SDK
- **User-friendly desktop application** for review and validation
- **Hardware-locked licensing** for software protection
- **Professional Windows installer** with silent installation support

### Workflow

```
PDF Invoice → AI Extraction → Human Review → ContPAQi Entry
```

1. Upload PDF invoices through the desktop application
2. AI models extract invoice data (RFC, amounts, line items)
3. Review and validate extracted data with confidence highlighting
4. Auto-post validated entries to ContPAQi accounting

---

## Features

### AI-Powered Invoice Processing
- **OCR Engine**: Tesseract with Spanish language support
- **Table Detection**: TATR (Table Transformer) model for line item extraction
- **Field Extraction**: LayoutLMv3 for semantic understanding of invoice fields
- **Confidence Scoring**: Visual indicators for extraction confidence levels

### Mexican Invoice Support
- **RFC Validation**: Full Mexican tax ID format validation (13-character persons, 12-character companies)
- **CFDI Compliance**: Support for Mexican electronic invoice standards
- **IVA Calculation**: Automatic 16% tax calculation and validation
- **Math Verification**: Real-time subtotal + IVA = total validation

### Human-in-the-Loop Interface
- **Split-Screen Layout**: PDF viewer alongside data form
- **Confidence Highlighting**:
  - Green (≥90%): High confidence, auto-accept
  - Orange (70-89%): Needs review
  - Red (<70%): Requires attention
- **Math Error Highlighting**: Red indicators for calculation mismatches
- **Keyboard Shortcuts**: Efficient navigation and editing
- **Batch Processing**: Process multiple invoices in queue

### Desktop Application
- **Electron + React**: Modern, responsive UI with Tailwind CSS
- **Docker Management**: Automatic container lifecycle management
- **Health Monitoring**: Real-time status indicators
- **Startup Wizard**: First-run configuration experience

### Security & Licensing
- **Hardware-Locked Licensing**: Machine fingerprint-based activation
- **Code Obfuscation**: .NET Reactor protection for Windows Bridge
- **Localhost-Only API**: Windows Bridge restricted to local connections
- **Non-Root Containers**: Docker containers run without elevated privileges

### Windows Installer
- **Inno Setup 6.x**: Professional Windows installer
- **Prerequisites Check**: Docker Desktop and .NET runtime validation
- **Service Installation**: Windows service with automatic startup
- **Silent Installation**: Support for automated deployments
- **Code Signing**: Digitally signed installer and executables

### Multi-Language Support (Planned)
- **English**: Default language
- **Spanish**: Full translation for Mexican users
- **Language Selection**: Choose during installation or in-app

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Windows Desktop                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌────────────────────────────┐  │
│  │    Electron App    │         │      Docker Container      │  │
│  │   (React + TS)     │◄───────►│      (Python + AI)         │  │
│  │   Tailwind CSS     │  HTTP   │      Port 8000             │  │
│  └─────────┬──────────┘         └────────────────────────────┘  │
│            │                                                     │
│            │ localhost:5000                                      │
│            ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           C# Windows Bridge (ASP.NET Core)               │   │
│  │           ContPAQi SDK Integration (COM)                 │   │
│  │           Hardware-Locked Licensing                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ContPAQi Accounting Software                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Container** | Python 3.9, FastAPI, PyTorch, Transformers, Tesseract OCR |
| **Windows Bridge** | C# .NET 6.0, ASP.NET Core, ContPAQi SDK (COM) |
| **Desktop App** | Electron 27, React 18, TypeScript, Tailwind CSS |
| **Data Generation** | Python, Faker, WeasyPrint, Jinja2 |
| **ML Models** | TATR (table detection), LayoutLMv3 (token classification) |
| **Installer** | Inno Setup 6.x, PowerShell |
| **Testing** | pytest, xUnit, Jest |
| **Security** | .NET Reactor, Code Signing, Hardware Fingerprinting |

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 (Build 19041+) or Windows 11
- **CPU**: Intel Core i5 or AMD Ryzen 5 (4 cores)
- **RAM**: 8 GB
- **Storage**: 10 GB free space (SSD recommended)
- **Display**: 1280x720 resolution

### Recommended Requirements
- **OS**: Windows 11 22H2
- **CPU**: Intel Core i7 or AMD Ryzen 7 (8 cores)
- **RAM**: 16 GB
- **Storage**: 20 GB SSD
- **Display**: 1920x1080 resolution
- **GPU**: NVIDIA GPU with 4GB+ VRAM (for faster AI inference)

### Software Prerequisites
- **Docker Desktop** 4.0+ (with WSL 2 backend)
- **.NET 6.0 Runtime** (installed automatically)
- **ContPAQi Accounting** (for posting entries)

---

## Installation

### Option 1: Windows Installer (Recommended)

1. **Download the installer**
   - Download `ContPAQi-AI-Bridge-Setup.exe` from the releases page

2. **Run the installer**
   - Double-click the installer
   - Select your preferred language (English/Spanish)
   - Follow the installation wizard

3. **Prerequisites check**
   - The installer will verify Docker Desktop is installed
   - If not found, you'll be prompted to install it

4. **Complete installation**
   - Choose installation directory (default: `C:\Program Files\ContPAQi AI Bridge`)
   - Select additional options:
     - Create desktop shortcut
     - Create Start Menu shortcuts
     - Install as Windows service
   - Click Install

5. **First-run wizard**
   - After installation, the first-run wizard will:
     - Verify system requirements
     - Load the Docker image
     - Start the service
     - Open the application

### Option 2: Silent Installation

For automated deployments:

```powershell
# Silent install with default options
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /SUPPRESSMSGBOXES

# Silent install with custom path
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /DIR="D:\ContPAQi AI Bridge"

# Silent install without service
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /TASKS="!installservice"
```

### Option 3: Development Setup

For developers who want to run from source:

#### 1. Clone the repository

```bash
git clone https://github.com/danribes/contpaqi.git
cd contpaqi
```

#### 2. Set up the AI container

```bash
cd mcp-container
docker-compose up -d
```

#### 3. Set up the desktop app

```bash
cd desktop-app
npm install
npm run dev
```

#### 4. Set up the Windows Bridge (Windows only)

```bash
cd windows-bridge
dotnet restore
dotnet build
dotnet run
```

---

## Operation Guide

### Starting the Application

#### Method 1: Desktop Shortcut
- Double-click "ContPAQi AI Bridge" on your desktop

#### Method 2: Start Menu
- Open Start Menu → ContPAQi AI Bridge → ContPAQi AI Bridge

#### Method 3: Windows Service
The application runs as a Windows service that starts automatically:

```powershell
# Check service status
Get-Service ContPAQiBridge

# Start service manually
Start-Service ContPAQiBridge

# Stop service
Stop-Service ContPAQiBridge
```

### Processing Invoices

1. **Open the application**
   - Wait for the status indicator to show "Ready" (green)

2. **Upload PDF invoices**
   - Click "Upload" or drag-and-drop PDF files
   - Multiple files can be processed in batch

3. **Review extracted data**
   - The split-screen shows PDF on the left, form on the right
   - Fields are highlighted by confidence level:
     - **Green**: High confidence (≥90%) - usually correct
     - **Orange**: Medium confidence (70-89%) - verify
     - **Red**: Low confidence (<70%) - likely needs correction

4. **Correct any errors**
   - Click on a field to edit
   - Math errors (highlighted in red) must be corrected
   - RFC validation errors block submission

5. **Submit to ContPAQi**
   - Click "Submit" when all validations pass
   - Entry is created in ContPAQi accounting

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + O` | Open file |
| `Ctrl + S` | Submit current invoice |
| `Ctrl + →` | Next invoice (batch mode) |
| `Ctrl + ←` | Previous invoice (batch mode) |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |
| `Ctrl + +` | Zoom in PDF |
| `Ctrl + -` | Zoom out PDF |
| `Ctrl + 0` | Reset zoom |
| `F5` | Refresh/retry extraction |

### Status Indicators

| Status | Color | Description |
|--------|-------|-------------|
| Starting | Yellow (pulsing) | Application is initializing |
| Ready | Green | Ready to process invoices |
| Processing | Blue | Currently processing an invoice |
| Error | Red | An error occurred |
| Offline | Gray | Docker or service not running |

---

## Configuration

### Application Settings

Configuration file location: `C:\Program Files\ContPAQi AI Bridge\config\appsettings.json`

```json
{
  "Application": {
    "Language": "en",
    "Theme": "light",
    "AutoStart": true
  },
  "Processing": {
    "ConfidenceThreshold": 0.70,
    "AutoAcceptThreshold": 0.95,
    "MaxBatchSize": 50
  },
  "ContPAQi": {
    "CompanyDatabase": "",
    "AutoPost": false
  },
  "Docker": {
    "ImageName": "contpaqi-mcp",
    "Port": 8000,
    "HealthCheckInterval": 5000
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTPAQI_BRIDGE_PORT` | Windows Bridge API port | 5000 |
| `CONTPAQI_DOCKER_PORT` | Docker container port | 8000 |
| `CONTPAQI_LOG_LEVEL` | Logging level (Debug/Info/Warning/Error) | Info |

---

## Licensing

### Activation

1. **First Launch**
   - On first launch, you'll be prompted to enter your license key
   - Enter the key provided with your purchase

2. **Hardware Lock**
   - The license is locked to your machine's hardware
   - Components used for fingerprint: CPU ID, Motherboard Serial, Disk ID

3. **License Transfer**
   - Contact support to transfer license to a new machine
   - Deactivation on old machine is required

### License Verification

```powershell
# Check license status
& "C:\Program Files\ContPAQi AI Bridge\scripts\check-license.ps1"
```

---

## Troubleshooting

### Docker Issues

**Docker not starting:**
```powershell
# Check Docker Desktop status
docker info

# Restart Docker service
Restart-Service *docker*
```

**Container not running:**
```powershell
# Check container status
docker ps -a

# Restart container
docker restart contpaqi-mcp
```

### Service Issues

**Service won't start:**
```powershell
# Check service status
Get-Service ContPAQiBridge | Format-List *

# View service logs
Get-EventLog -LogName Application -Source ContPAQiBridge -Newest 10
```

### Application Issues

**Application shows "Offline" status:**
1. Ensure Docker Desktop is running
2. Check that the container is healthy
3. Verify the Windows service is running

**Extraction quality is poor:**
- Ensure PDF is not scanned at low resolution
- Check that PDF is not password-protected
- Try with a cleaner copy of the invoice

### Logs

Log files are located at:
- Application logs: `C:\Program Files\ContPAQi AI Bridge\logs\`
- Docker logs: `docker logs contpaqi-mcp`
- Windows service logs: Event Viewer → Applications

---

## Uninstallation

### Using Control Panel
1. Open Control Panel → Programs → Uninstall a program
2. Find "ContPAQi AI Bridge"
3. Click Uninstall

### Using Command Line
```powershell
# Silent uninstall
& "C:\Program Files\ContPAQi AI Bridge\unins000.exe" /VERYSILENT

# Uninstall keeping data
& "C:\Program Files\ContPAQi AI Bridge\scripts\uninstall.ps1" -KeepData
```

### Manual Cleanup
If needed, remove:
- Installation folder: `C:\Program Files\ContPAQi AI Bridge`
- User data: `%APPDATA%\ContPAQi AI Bridge`
- Docker image: `docker rmi contpaqi-mcp`

---

## Project Structure

```
contpaqi/
├── mcp-container/              # Python AI container (FastAPI + ML models)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── src/
│       ├── ocr/                # Tesseract OCR integration
│       ├── models/             # TATR + LayoutLM models
│       ├── inference/          # Processing pipeline
│       └── api/                # FastAPI endpoints
├── windows-bridge/             # C# bridge to ContPAQi SDK
│   └── src/ContpaqiBridge/
│       ├── Controllers/        # API endpoints
│       ├── Services/           # Business logic
│       ├── Licensing/          # Hardware-locked licensing
│       └── Security/           # API authentication
├── desktop-app/                # Electron + React desktop application
│   ├── src/
│   │   ├── components/         # React UI components
│   │   └── i18n/               # Internationalization
│   └── electron/
│       ├── main.ts             # Electron main process
│       └── docker-manager.ts   # Docker management
├── installer/                  # Inno Setup installer files
│   ├── contpaqi-bridge.iss     # Main installer script
│   ├── scripts/                # PowerShell helper scripts
│   │   ├── check-docker.ps1
│   │   ├── install-service.ps1
│   │   ├── first-run-wizard.ps1
│   │   └── code-sign.ps1
│   └── assets/
│       ├── license.txt
│       └── readme.txt
├── scripts/                    # Data generation & preparation
│   ├── generate_invoices.py
│   ├── prepare_datasets.py
│   └── templates/              # 20 invoice HTML templates
├── data/                       # Training datasets
│   ├── synthetic/              # Generated invoice PDFs + labels
│   ├── train/
│   ├── validation/
│   └── test/
├── tests/                      # Test suites
│   ├── test_*.py               # Python tests
│   └── *.test.ts               # TypeScript tests
└── specs/                      # Project specifications
```

---

## Development Status

All core features have been implemented:

| Phase | Tasks | Status |
|-------|-------|--------|
| **Phase 1**: Setup & Data | Tasks 1-3 | ✅ Complete |
| **Phase 2**: MCP Container | Tasks 4-9 | ✅ Complete |
| **Phase 3**: Windows Bridge | Tasks 10-12 | ✅ Complete |
| **Phase 4**: Licensing & Protection | Tasks 15-16 | ✅ Complete |
| **Phase 5**: Desktop App | Tasks 13-14 | ✅ Complete |
| **Phase 6**: Deployment | Task 17 | ✅ Complete |
| **Phase 7**: Localization | Task 18 | 🔄 Planned |

**Total Progress**: 117/127 subtasks completed (92%)

---

## Testing

### Run All Tests

```bash
# Python tests (AI container)
cd mcp-container
pytest tests/ -v

# .NET tests (Windows Bridge)
cd windows-bridge
dotnet test

# Desktop app tests
cd desktop-app
npm test

# Installer script tests
pytest tests/test_task017*.py -v
```

### Test Installation

Run the installation validation script on a clean Windows machine:

```powershell
& "C:\Program Files\ContPAQi AI Bridge\scripts\test-installation.ps1" -Verbose
```

---

## Support

### Documentation
- Full documentation: `/docs` folder
- API reference: `/specs/api-reference.md`
- Troubleshooting guide: See Troubleshooting section above

### Contact
- Technical support: support@contpaqi-ai-bridge.com
- Bug reports: GitHub Issues

---

## License

Proprietary - All rights reserved.

This software is licensed, not sold. See `LICENSE.txt` for full terms.

---

## Acknowledgments

- [TATR](https://github.com/microsoft/table-transformer) - Table detection model
- [LayoutLMv3](https://github.com/microsoft/unilm/tree/master/layoutlmv3) - Document understanding model
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - Open source OCR engine
- [Electron](https://www.electronjs.org/) - Desktop application framework
- [Inno Setup](https://jrsoftware.org/isinfo.php) - Windows installer creator
