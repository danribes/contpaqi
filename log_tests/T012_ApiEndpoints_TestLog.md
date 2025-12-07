# T012 Windows Bridge API Endpoints - Test Log

## Test Execution Summary
**Date**: 2025-12-07
**Tests**: 13 | **Status**: Pending Windows execution

## Test Files
`tests/ContpaqiBridge.Tests/InvoiceControllerTests.cs`

## Test Classes

| Class | Tests | Description |
|-------|-------|-------------|
| InvoiceControllerTests | 8 | Controller action tests |
| InvoiceModelsTests | 5 | DTO model tests |

## Test Cases

### InvoiceController Tests
| Test | Description |
|------|-------------|
| CreateInvoice_ValidRequest_ShouldReturnAccepted | Valid request returns 202 |
| CreateInvoice_InvalidMath_ShouldReturnBadRequest | Math validation fails returns 400 |
| GetJobStatus_ExistingJob_ShouldReturnStatus | Existing job returns 200 with status |
| GetJobStatus_NonExistentJob_ShouldReturnNotFound | Non-existent job returns 404 |
| Health_ShouldReturnHealthResponse | Health returns healthy status |
| Health_ShouldIncludeSdkStatus | Health includes SDK initialized flag |
| Health_ShouldIncludePendingJobCount | Health includes pending job count |

### InvoiceModels Tests
| Test | Description |
|------|-------------|
| CreateInvoiceRequest_ShouldHaveDefaultEmptyStrings | Default values are empty strings |
| CreateInvoiceRequest_ShouldStoreLineItems | Line items are stored correctly |
| CreateInvoiceResponse_ShouldHaveDefaultValues | Response defaults are correct |
| HealthResponse_ShouldHaveDefaultValues | Health response defaults |
| LineItemRequest_ShouldHaveRequiredProperties | Line item properties work |

## Key Test Patterns

### Testing Controller Actions
```csharp
[Fact]
public async Task CreateInvoice_ValidRequest_ShouldReturnAccepted()
{
    var request = new CreateInvoiceRequest
    {
        RfcEmisor = "AAA010101AAA",
        Subtotal = 1000m,
        Iva = 160m,
        Total = 1160m
    };

    var result = await _controller.CreateInvoice(request);

    result.Should().BeOfType<AcceptedResult>();
    var response = ((AcceptedResult)result).Value as CreateInvoiceResponse;
    response!.Status.Should().Be("pending");
}
```

### Testing Validation
```csharp
[Fact]
public async Task CreateInvoice_InvalidMath_ShouldReturnBadRequest()
{
    var request = new CreateInvoiceRequest
    {
        Subtotal = 1000m,
        Iva = 160m,
        Total = 1000m  // Wrong!
    };

    var result = await _controller.CreateInvoice(request);

    result.Should().BeOfType<BadRequestObjectResult>();
}
```

## Notes
- Controller tests use real JobQueueService with mock SDK
- No need for TestServer for unit tests
- Integration tests would use WebApplicationFactory
