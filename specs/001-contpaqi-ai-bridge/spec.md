# Feature Specification: Contpaqi AI Bridge

**Feature Branch**: `001-contpaqi-ai-bridge`
**Created**: 2025-12-03
**Status**: Approved
**Input**: User description: "AI-powered invoice processing system that extracts data from PDF invoices and automatically enters them into Contpaqi accounting software"

## User Scenarios & Testing

### User Story 1 - Upload and Extract Invoice Data (Priority: P1)

As an accountant, I want to upload a PDF invoice and have the system automatically extract all relevant data (vendor, amounts, line items, taxes) so I can review it before posting to Contpaqi.

**Why this priority**: Core functionality - without extraction, nothing else works. This delivers immediate value by eliminating manual data entry.

**Independent Test**: Upload a PDF invoice, verify extracted data appears in editable form within 30 seconds.

**Acceptance Scenarios**:

1. **Given** a valid Mexican invoice PDF, **When** uploaded to the system, **Then** all fields (RFC, date, total, line items) are extracted and displayed
2. **Given** a low-confidence extraction, **When** displayed to user, **Then** uncertain fields are highlighted in orange
3. **Given** an invalid/corrupt PDF, **When** uploaded, **Then** system displays clear error message

---

### User Story 2 - Validate and Correct Extracted Data (Priority: P2)

As an accountant, I want to review extracted data side-by-side with the original PDF and make corrections before submission.

**Why this priority**: Human-in-the-loop verification ensures accuracy before data enters accounting system.

**Independent Test**: View extracted data, make corrections to highlighted fields, verify math validation works.

**Acceptance Scenarios**:

1. **Given** extracted invoice data displayed, **When** user views form, **Then** PDF is shown side-by-side with editable fields
2. **Given** math check fails (sum != total), **When** displayed, **Then** field is highlighted red with error message
3. **Given** RFC format invalid, **When** user submits, **Then** submission is blocked with validation error

---

### User Story 3 - Post to Contpaqi (Priority: P3)

As an accountant, I want approved invoice data to be automatically posted to Contpaqi so I don't have to manually re-enter it.

**Why this priority**: Final step that completes the automation loop. Depends on extraction and validation.

**Independent Test**: Submit verified invoice, confirm poliza created in Contpaqi with correct data.

**Acceptance Scenarios**:

1. **Given** validated invoice data, **When** user clicks Submit, **Then** poliza is created in Contpaqi within 5 seconds
2. **Given** Contpaqi SDK error, **When** submission fails, **Then** error is displayed and invoice stays in queue
3. **Given** multiple invoices pending, **When** processed, **Then** each is handled sequentially (no SDK conflicts)

---

### User Story 4 - License Verification (Priority: P4)

As a software vendor, I want the system to verify the user has a valid license before processing invoices.

**Why this priority**: Business requirement for commercialization, but not core functionality.

**Independent Test**: Start app with valid license - works; start with invalid/expired license - blocked.

**Acceptance Scenarios**:

1. **Given** valid license, **When** app starts, **Then** all features are enabled
2. **Given** expired license, **When** user tries to process, **Then** blocked with renewal message
3. **Given** hardware fingerprint mismatch, **When** validated, **Then** license rejected

---

### Edge Cases

- What happens when Contpaqi is not installed on the machine?
- How does system handle invoices in languages other than Spanish?
- What happens if Docker Desktop is not running?
- How does system handle network disconnection during license check?
- What happens with invoices that have no line items (single total only)?

## Requirements

### Functional Requirements

- **FR-001**: System MUST extract text and layout from PDF invoices using OCR
- **FR-002**: System MUST identify table structures within invoices using AI
- **FR-003**: System MUST extract key fields: RFC emisor, RFC receptor, fecha, subtotal, IVA, total, line items
- **FR-004**: System MUST validate RFC format against Mexican tax authority pattern
- **FR-005**: System MUST verify math (subtotal + taxes = total)
- **FR-006**: System MUST display confidence scores for extracted fields
- **FR-007**: System MUST allow manual correction of any extracted field
- **FR-008**: System MUST create polizas in Contpaqi via SDK
- **FR-009**: System MUST process invoices sequentially (SDK limitation)
- **FR-010**: System MUST verify license before processing
- **FR-011**: System MUST bind license to hardware fingerprint
- **FR-012**: System MUST run AI models in Docker container
- **FR-013**: System MUST restrict Windows Bridge API to localhost only

### Key Entities

- **Invoice**: PDF file with extracted data (RFC, date, amounts, line items, confidence scores)
- **LineItem**: Description, quantity, unit price, amount within an invoice
- **Poliza**: Contpaqi accounting entry created from invoice
- **License**: Hardware-bound subscription with expiration date

## Success Criteria

### Measurable Outcomes

- **SC-001**: Invoice extraction completes in under 30 seconds for typical 1-page invoice
- **SC-002**: Extraction accuracy exceeds 95% for standard Mexican invoice formats
- **SC-003**: System handles batch of 100 invoices without memory issues
- **SC-004**: Zero data corruption in Contpaqi (all entries mathematically correct)
- **SC-005**: Installation completes in under 10 minutes on clean Windows machine
- **SC-006**: 90% of users successfully process first invoice without support
