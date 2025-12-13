# Claude Code Instructions for ContPAQi AI Bridge

## Project Overview

ContPAQi AI Bridge is an AI-powered invoice processing system for Mexican accountants that extracts data from PDF invoices and creates accounting entries in ContPAQi accounting software.

**Core Workflow:** `PDF Invoice → AI Extraction → Human Review → ContPAQi Entry`

**Target Users:** Mexican accountants and bookkeepers using ContPAQi accounting software.

---

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| **AI Container** | Python 3.9, FastAPI, PyTorch, Transformers (TATR + LayoutLMv3), Tesseract OCR |
| **Windows Bridge** | C# .NET 6.0, ASP.NET Core, ContPAQi SDK (COM) |
| **Desktop App** | Electron 27, React 18, TypeScript 5.2, Tailwind CSS 3.3, Vite 5.0 |
| **Testing** | pytest (Python), Jest (TypeScript), xUnit (.NET) |
| **Build/Deploy** | Docker, Inno Setup 6.x, GitHub Actions |
| **Code Protection** | PyArmor (Python), Dotfuscator (.NET), Hardware fingerprinting |

---

## Directory Structure

```
contpaqi/
├── mcp-container/           # Python AI container (FastAPI + ML models)
│   ├── src/                 # Source code
│   │   ├── main.py          # FastAPI entry point
│   │   ├── inference.py     # AI inference engine
│   │   ├── models/          # TATR, LayoutLM, schemas, validators
│   │   └── utils/ocr.py     # Tesseract OCR wrapper
│   ├── tests/               # pytest tests (test_task###_*.py)
│   ├── Dockerfile           # Multi-stage build
│   ├── docker-compose.yml   # Development orchestration
│   ├── Makefile             # Build automation
│   └── pyproject.toml       # Python config (ruff, black, pytest)
│
├── windows-bridge/          # C# bridge to ContPAQi SDK
│   └── src/ContpaqiBridge/
│       ├── Controllers/     # API endpoints (InvoiceController.cs)
│       ├── Services/        # Business logic (ExportService, JobQueueService)
│       ├── Sdk/             # SDK interop (ISdkInterop, SdkInterop, MockSdkInterop)
│       └── Models/          # Data models
│
├── desktop-app/             # Electron + React desktop application
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── components/      # UI components (InvoiceForm, PDFViewer, BatchProcessing, etc.)
│   │   ├── services/        # License validation, hardware fingerprint, JWT tokens
│   │   └── i18n/            # Internationalization (en, es)
│   ├── electron/            # Electron main process (main.ts, preload.ts, docker-manager.ts)
│   └── tests/               # Jest tests
│
├── installer/               # Inno Setup installer files
│   ├── contpaqi-bridge.iss  # Main installer script
│   └── scripts/             # PowerShell helpers (check-docker, install-service, etc.)
│
├── scripts/                 # Data generation & preparation
│   ├── generate_invoices.py # PDF invoice generation
│   ├── prepare_datasets.py  # Dataset preparation
│   └── templates/           # 20+ invoice HTML templates
│
├── data/                    # Training datasets (synthetic, train, validation, test)
├── tests/                   # Root test suites
├── log_files/               # Implementation logs (TXXX.X_*_Log)
├── log_tests/               # Test logs (TXXX.X_*_TestLog)
├── log_learn/               # Educational guides (TXXX.X_*_Guide)
├── docs/                    # Documentation
├── specs/                   # Project specifications
└── .github/workflows/       # CI/CD (build-installer.yml)
```

---

## Development Commands

### Python (mcp-container)

```bash
cd mcp-container

# Development
make install-dev           # Install dev dependencies
make docker-compose-up     # Start container with docker-compose
make docker-compose-down   # Stop services

# Testing
make test                  # Run all pytest tests
pytest tests/ -v           # Run tests with verbose output
pytest tests/test_task009*.py -v  # Run specific test group
pytest --cov=src tests/    # Run with coverage

# Code Quality
make lint                  # Run flake8 + mypy
ruff check src/            # Fast Python linter
black src/                 # Format Python code

# Build
make build                 # Full production build
make obfuscate             # Obfuscate with PyArmor
make docker-build          # Build Docker image
```

### TypeScript (desktop-app)

```bash
cd desktop-app

# Development
npm install                # Install dependencies
npm run dev                # Vite dev server
npm run electron:dev       # Electron + Vite dev mode

# Testing
npm test                   # Run Jest tests

# Code Quality
npm run lint               # ESLint check

# Build
npm run build              # Production build
npm run electron:build     # Build Electron app
```

### C# (windows-bridge)

```bash
cd windows-bridge

# Development
dotnet restore             # Restore packages
dotnet build               # Debug build
dotnet run                 # Run locally

# Testing
dotnet test                # Run xUnit tests

# Build
dotnet build -c Release    # Release build
dotnet publish -c Release -r win-x86 --self-contained true  # Windows x86 publish
```

---

## Testing Guidelines

### Test File Naming Convention

Tests follow a task-based naming pattern: `test_task###_#_description.py`

- Example: `test_task009_3_layoutlm_inference.py`
- Tests are organized by implementation task number
- Each subtask has dedicated test files

### Test Locations

| Component | Test Location | Framework |
|-----------|--------------|-----------|
| Python AI | `mcp-container/tests/` | pytest |
| Desktop App | `desktop-app/tests/` | Jest |
| Windows Bridge | `windows-bridge/tests/` | xUnit |
| Root Integration | `tests/` | pytest |

### Running Tests

```bash
# All Python tests
cd mcp-container && pytest tests/ -v

# Specific task tests
pytest tests/test_task009*.py -v

# Desktop app tests
cd desktop-app && npm test

# Windows Bridge tests
cd windows-bridge && dotnet test

# With coverage
pytest --cov=src tests/
```

### Test Structure (AAA Pattern)

```python
def test_invoice_extraction():
    # Arrange
    pdf_bytes = load_test_pdf("sample_invoice.pdf")
    engine = InvoiceInferenceEngine()

    # Act
    result = engine.predict(pdf_bytes)

    # Assert
    assert result.rfc_emisor.value is not None
    assert result.rfc_emisor.confidence >= 0.7
```

---

## Code Conventions

### Python (mcp-container)

- **Formatter:** Black (88 char line length)
- **Linter:** ruff + flake8 + mypy
- **Import sorting:** isort (known-first-party = ["src"])
- **Type hints:** Pydantic for runtime, mypy for static
- **Naming:** `snake_case` for functions/variables, `CamelCase` for classes
- **Async:** Use `async/await` for I/O operations

```python
# Example pattern
from pydantic import BaseModel

class InvoiceField(BaseModel):
    value: str
    confidence: float
    bbox: tuple[int, int, int, int] | None = None

class InvoiceInferenceEngine:
    def __init__(self, load_models: bool = True):
        """Initialize with lazy model loading option."""
        self.models_loaded = False
        if load_models:
            self._load_models()

    def predict(self, pdf_bytes: bytes) -> Invoice:
        """Orchestrate OCR → TATR → LayoutLM pipeline."""
        ...
```

### TypeScript/React (desktop-app)

- **Framework:** React 18 with hooks (no class components)
- **Styling:** Tailwind CSS utility classes **only** (no custom CSS)
- **Type safety:** Strict mode enabled, explicit prop types
- **State:** React hooks (useState, useCallback, useMemo)
- **Naming:** `camelCase` for variables, `PascalCase` for components

```typescript
// Example pattern
interface InvoiceFormProps {
  extractedData: InvoiceData;
  onSubmit: (data: InvoiceData) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  extractedData,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<InvoiceData>(extractedData);

  const handleSubmit = useCallback(() => {
    onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <form className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow">
      {/* Always use Tailwind classes */}
    </form>
  );
};
```

### C# (windows-bridge)

- **Framework:** ASP.NET Core 6 with dependency injection
- **Pattern:** Service/Repository pattern
- **Async:** `async/await` throughout
- **Nullable:** Reference types enabled
- **Naming:** PascalCase for public members

```csharp
// Example pattern
public interface ISdkInterop
{
    Task<bool> CreateInvoiceAsync(InvoiceData invoice);
}

public class SdkInterop : ISdkInterop
{
    private readonly ILogger<SdkInterop> _logger;

    public SdkInterop(ILogger<SdkInterop> logger)
    {
        _logger = logger;
    }

    public async Task<bool> CreateInvoiceAsync(InvoiceData invoice)
    {
        // Implementation
    }
}
```

---

## Architecture Patterns

### Layered Architecture

```
UI Layer (Electron React)
    ↓ HTTP/axios
API Layer (ASP.NET Core Bridge)
    ↓ Service pattern
Business Logic (Services)
    ↓ DI-injected
Data Access (SDK Interop / Export)
    ↓ COM or File I/O
External Systems (ContPAQi / Filesystem)
```

### AI Pipeline

```
PDF Input
    ↓
OCR (Tesseract) → Extract text + confidence
    ↓
TATR (Table Detection) → Extract line items
    ↓
LayoutLM (Field Extraction) → Extract fields with confidence
    ↓
Validation (RFC, Math) → Verify data integrity
    ↓
JSON Response
```

### Confidence-Based Highlighting

```typescript
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.90) return 'green';   // High confidence
  if (confidence >= 0.70) return 'orange';  // Needs review
  return 'red';                              // Requires attention
};
```

### Mexican Invoice Validation

- **RFC Format:** 13 chars (persons) or 12 chars (companies)
- **Math Verification:** `subtotal + IVA = total` (IVA = 16%)
- **CFDI Compliance:** Mexican electronic invoice standards

---

## Important Files

| File | Purpose |
|------|---------|
| `mcp-container/src/main.py` | FastAPI application entry point |
| `mcp-container/src/inference.py` | AI inference engine orchestration |
| `mcp-container/src/models/tatr.py` | Table detection model |
| `mcp-container/src/models/layoutlm.py` | Field extraction model |
| `mcp-container/src/models/validators.py` | RFC & math validation |
| `windows-bridge/src/ContpaqiBridge/Program.cs` | ASP.NET Core setup & DI |
| `windows-bridge/src/ContpaqiBridge/Sdk/SdkInterop.cs` | ContPAQi COM wrapper |
| `windows-bridge/src/ContpaqiBridge/Sdk/ExportSdkInterop.cs` | File export mode |
| `desktop-app/src/components/InvoiceForm.tsx` | Main form UI (1021 lines) |
| `desktop-app/src/components/PDFViewer.tsx` | PDF viewer component |
| `desktop-app/src/services/LicenseValidator.ts` | License validation logic |
| `desktop-app/src/services/HardwareFingerprint.ts` | Hardware ID generation |
| `installer/contpaqi-bridge.iss` | Inno Setup installer script |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# API Keys (for AI model providers - optional)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Application Configuration
CONTPAQI_BRIDGE_PORT=5000
CONTPAQI_DOCKER_PORT=8000
CONTPAQI_LOG_LEVEL=Info

# SDK Mode (auto, sdk, export, mock)
SDK_MODE=auto
```

---

## Task Tracking & Logging

### Task-Based Development

This project uses task-based development with detailed logging:

1. **Tasks file:** `tasks.md` contains all tasks and subtasks
2. **Implementation logs:** `log_files/TXXX.X_*_Log`
3. **Test logs:** `log_tests/TXXX.X_*_TestLog`
4. **Learning guides:** `log_learn/TXXX.X_*_Guide`

### Log File Naming

- Always prefix with `T` (capital)
- Use three-digit task number: `T009.3` not `T9.3`
- Include descriptive suffix: `T009.3_LayoutLM_Inference_Log`

### Development Workflow

```bash
# 1. Check next task
cat tasks.md | grep -A5 "- \[ \]"  # Find incomplete tasks

# 2. Write tests first (TDD)
pytest tests/test_task###_*.py -v

# 3. Implement feature
# Make changes to pass tests

# 4. Update task status
# Mark subtask complete in tasks.md

# 5. Create log files
# Write implementation log, test log, and guide
```

---

## Docker Configuration

### AI Container (mcp-container)

```yaml
# docker-compose.yml
services:
  mcp-container:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./src:/app/src:ro
    deploy:
      resources:
        limits:
          memory: 4G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": engine.models_loaded}
```

---

## CI/CD (GitHub Actions)

The `build-installer.yml` workflow:

1. **Build Job (Windows):**
   - Builds Electron desktop app
   - Builds .NET Windows Bridge
   - Creates installer with Inno Setup
   - Generates checksums (SHA256, MD5)

2. **Release Job (Ubuntu):**
   - Creates GitHub release
   - Uploads installer artifacts

3. **Website Update:**
   - Notifies website repo of new version

### Trigger Conditions

- Push to `main` branch
- Manual workflow dispatch
- Tag creation (`v*`)

---

## Security Considerations

- **Localhost-only APIs:** Windows Bridge binds to 127.0.0.1 only
- **Non-root containers:** Docker runs without elevated privileges
- **Code obfuscation:** PyArmor (Python), Dotfuscator (.NET)
- **Hardware licensing:** Machine fingerprint-based activation
- **No secrets in code:** Use environment variables

---

## Common Tasks

### Adding a New API Endpoint (Python)

```python
# In mcp-container/src/main.py
@app.post("/api/v1/new-endpoint")
async def new_endpoint(request: NewRequest) -> NewResponse:
    """Endpoint description."""
    result = await process_request(request)
    return NewResponse(data=result)
```

### Adding a New React Component

```typescript
// In desktop-app/src/components/NewComponent.tsx
interface NewComponentProps {
  data: SomeType;
}

export const NewComponent: React.FC<NewComponentProps> = ({ data }) => {
  return (
    <div className="p-4 bg-white rounded shadow">
      {/* Use Tailwind CSS only */}
    </div>
  );
};
```

### Adding a New Windows Bridge Service

```csharp
// 1. Create interface in Services/
public interface INewService
{
    Task<Result> ProcessAsync(Input input);
}

// 2. Create implementation
public class NewService : INewService { ... }

// 3. Register in Program.cs
builder.Services.AddSingleton<INewService, NewService>();
```

---

## Project Status

| Phase | Status |
|-------|--------|
| Phase 1: Setup & Data | Complete |
| Phase 2: MCP Container | Complete |
| Phase 3: Windows Bridge | Complete |
| Phase 4: Licensing & Protection | Complete |
| Phase 5: Desktop App | Complete |
| Phase 6: Deployment | Complete |
| Phase 7: Localization | Planned |

**Overall Progress:** 117/127 subtasks (92%)

---

## Quick Reference

```bash
# Start development environment
cd mcp-container && docker-compose up -d
cd desktop-app && npm run dev
cd windows-bridge && dotnet run

# Run all tests
cd mcp-container && pytest tests/ -v
cd desktop-app && npm test
cd windows-bridge && dotnet test

# Build for production
cd mcp-container && make build
cd desktop-app && npm run electron:build
cd windows-bridge && dotnet publish -c Release

# Code quality
cd mcp-container && make lint
cd desktop-app && npm run lint
```
