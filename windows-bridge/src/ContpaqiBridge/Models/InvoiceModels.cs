using System.ComponentModel.DataAnnotations;

namespace ContpaqiBridge.Models;

/// <summary>
/// Request model for creating an invoice/poliza.
/// </summary>
public class CreateInvoiceRequest
{
    [Required]
    public string RfcEmisor { get; set; } = string.Empty;

    [Required]
    public string RfcReceptor { get; set; } = string.Empty;

    [Required]
    public DateTime Fecha { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Subtotal { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Iva { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Total { get; set; }

    public string? Folio { get; set; }

    public List<LineItemRequest> LineItems { get; set; } = new();
}

/// <summary>
/// Line item in an invoice.
/// </summary>
public class LineItemRequest
{
    [Required]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    [Range(0, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }
}

/// <summary>
/// Response after creating invoice job.
/// </summary>
public class CreateInvoiceResponse
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Job status response.
/// </summary>
public class JobStatusResponse
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? PolizaId { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
}

/// <summary>
/// Health check response.
/// </summary>
public class HealthResponse
{
    public string Status { get; set; } = "healthy";
    public bool SdkInitialized { get; set; }
    public int PendingJobs { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
