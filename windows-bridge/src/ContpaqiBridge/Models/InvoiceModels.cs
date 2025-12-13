using System.ComponentModel.DataAnnotations;

namespace ContpaqiBridge.Models;

/// <summary>
/// Output mode options for invoice processing.
/// </summary>
public enum OutputMode
{
    /// <summary>Send to ContPAQi via COM SDK (requires ContPAQi installed)</summary>
    Contpaqi = 0,

    /// <summary>Export to JSON file</summary>
    Json = 1,

    /// <summary>Export to CSV file</summary>
    Csv = 2,

    /// <summary>Export to both JSON and CSV files</summary>
    Both = 3
}

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

    /// <summary>
    /// Output mode for the invoice processing.
    /// Default is Contpaqi (send to ContPAQi via COM SDK).
    /// Use Json, Csv, or Both to export to files instead.
    /// </summary>
    public OutputMode OutputMode { get; set; } = OutputMode.Contpaqi;
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

    /// <summary>
    /// Output mode used for this job.
    /// </summary>
    public OutputMode OutputMode { get; set; }

    /// <summary>
    /// Exported files (when OutputMode is Json, Csv, or Both).
    /// </summary>
    public List<ExportedFileInfo>? ExportedFiles { get; set; }
}

/// <summary>
/// Information about an exported file.
/// </summary>
public class ExportedFileInfo
{
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
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

    /// <summary>
    /// Available output modes.
    /// </summary>
    public List<OutputModeInfo> AvailableOutputModes { get; set; } = new();

    /// <summary>
    /// Current default output mode.
    /// </summary>
    public string DefaultOutputMode { get; set; } = "contpaqi";

    /// <summary>
    /// Export path (when export mode is available).
    /// </summary>
    public string? ExportPath { get; set; }
}

/// <summary>
/// Information about an output mode.
/// </summary>
public class OutputModeInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Available { get; set; }
}
