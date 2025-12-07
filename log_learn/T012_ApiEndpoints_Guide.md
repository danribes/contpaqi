# T012 REST API Design - Learning Guide

## Overview
This guide explains REST API design patterns for async job processing with security considerations.

## Key Concepts

### 1. Async Job Pattern (202 Accepted)

Return immediately with job ID for long-running operations:

```csharp
[HttpPost("invoice")]
public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
{
    var job = new InvoiceJob { InvoiceData = request };
    var jobId = await _jobQueue.EnqueueAsync(job);

    var response = new CreateInvoiceResponse
    {
        JobId = jobId,
        Status = "pending",
        Message = "Invoice queued for processing"
    };

    return Accepted(response);  // HTTP 202
}
```

**Why 202 Accepted?**
- Request was accepted but not completed
- Client can poll for status
- Prevents timeout on long operations

### 2. Status Endpoint

Allow clients to check job progress:

```csharp
[HttpGet("status/{jobId}")]
public IActionResult GetJobStatus(string jobId)
{
    var status = _jobQueue.GetJobStatus(jobId);

    if (status == null)
    {
        return NotFound(new { error = "Job not found", jobId });
    }

    return Ok(status);
}
```

### 3. Request Validation

Use Data Annotations for model validation:

```csharp
public class CreateInvoiceRequest
{
    [Required]
    public string RfcEmisor { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Subtotal { get; set; }
}
```

**Business Validation in Controller:**
```csharp
if (request.Total != request.Subtotal + request.Iva)
{
    return BadRequest(new { error = "Total must equal Subtotal + IVA" });
}
```

### 4. Localhost Security

Restrict API to local requests only:

**Kestrel Configuration:**
```csharp
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);  // Only bind to localhost
});
```

**Middleware Verification:**
```csharp
app.Use(async (context, next) =>
{
    var remoteIp = context.Connection.RemoteIpAddress;
    if (!remoteIp.Equals(IPAddress.Loopback) &&
        !remoteIp.Equals(IPAddress.IPv6Loopback))
    {
        context.Response.StatusCode = 403;
        await context.Response.WriteAsync("Access denied: localhost only");
        return;
    }
    await next();
});
```

### 5. Security Headers

Add protective headers:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    await next();
});
```

## API Design

```
POST /api/invoice      Create invoice job (202 Accepted)
GET  /api/status/{id}  Get job status (200 OK / 404 Not Found)
GET  /api/health       Health check (200 OK)
```

## Request/Response Flow

```
Client                          API                      JobQueue
  │                              │                          │
  │ POST /api/invoice           │                          │
  │ ────────────────────────────►│                          │
  │                              │ EnqueueAsync(job)        │
  │                              │ ─────────────────────────►│
  │                              │                          │
  │ 202 Accepted                 │ ◄─────────────────────────│
  │ { jobId: "abc" }             │                          │
  │ ◄────────────────────────────│                          │
  │                              │                          │
  │ GET /api/status/abc          │                          │
  │ ────────────────────────────►│                          │
  │                              │ GetJobStatus("abc")      │
  │                              │ ─────────────────────────►│
  │ 200 OK                       │                          │
  │ { status: "completed" }      │ ◄─────────────────────────│
  │ ◄────────────────────────────│                          │
```

## Response Models

**CreateInvoiceResponse:**
```json
{
  "jobId": "a1b2c3d4-...",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z",
  "message": "Invoice queued for processing"
}
```

**JobStatusResponse (completed):**
```json
{
  "jobId": "a1b2c3d4-...",
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:05Z",
  "polizaId": 12345,
  "retryCount": 0
}
```

**JobStatusResponse (failed):**
```json
{
  "jobId": "a1b2c3d4-...",
  "status": "failed",
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:10Z",
  "errorMessage": "SDK initialization failed",
  "retryCount": 3
}
```

## Best Practices

1. **Use 202 for async operations** - Don't block on long tasks
2. **Provide status endpoint** - Clients need progress visibility
3. **Validate early** - Check request before queuing
4. **Return meaningful errors** - Include error details
5. **Secure localhost-only APIs** - Defense in depth
6. **Add security headers** - Prevent common attacks

## Key Takeaways

1. HTTP 202 Accepted is for async operations
2. Status polling enables client progress tracking
3. Model validation catches errors early
4. Middleware can enforce security policies
5. Security headers are low-effort, high-value protection
