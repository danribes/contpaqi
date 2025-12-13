using ContpaqiBridge.Models;
using ContpaqiBridge.Services;
using Microsoft.AspNetCore.Mvc;

namespace ContpaqiBridge.Controllers;

/// <summary>
/// API controller for invoice/poliza operations.
/// </summary>
[ApiController]
[Route("api")]
public class InvoiceController : ControllerBase
{
    private readonly JobQueueService _jobQueue;
    private readonly ILogger<InvoiceController> _logger;

    public InvoiceController(JobQueueService jobQueue, ILogger<InvoiceController> logger)
    {
        _jobQueue = jobQueue;
        _logger = logger;
    }

    /// <summary>
    /// Submit an invoice for processing. Returns immediately with job ID.
    /// </summary>
    [HttpPost("invoice")]
    [ProducesResponseType(typeof(CreateInvoiceResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Basic validation
        if (request.Total != request.Subtotal + request.Iva)
        {
            _logger.LogWarning("Invoice math validation failed: {Subtotal} + {Iva} != {Total}",
                request.Subtotal, request.Iva, request.Total);
            return BadRequest(new { error = "Total must equal Subtotal + IVA" });
        }

        var job = new InvoiceJob
        {
            InvoiceData = request,
            OutputMode = request.OutputMode
        };

        var jobId = await _jobQueue.EnqueueAsync(job);
        _logger.LogInformation("Invoice job {JobId} created for RFC {Rfc} with output mode {OutputMode}",
            jobId, request.RfcEmisor, request.OutputMode);

        var modeMessage = request.OutputMode switch
        {
            OutputMode.Json => "Invoice will be exported to JSON file",
            OutputMode.Csv => "Invoice will be exported to CSV file",
            OutputMode.Both => "Invoice will be exported to JSON and CSV files",
            _ => "Invoice queued for ContPAQi processing"
        };

        var response = new CreateInvoiceResponse
        {
            JobId = jobId,
            Status = "pending",
            CreatedAt = job.CreatedAt,
            Message = modeMessage
        };

        return Accepted(response);
    }

    /// <summary>
    /// Get the status of a job by ID.
    /// </summary>
    [HttpGet("status/{jobId}")]
    [ProducesResponseType(typeof(JobStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetJobStatus(string jobId)
    {
        var status = _jobQueue.GetJobStatus(jobId);

        if (status == null)
        {
            return NotFound(new { error = "Job not found", jobId });
        }

        return Ok(status);
    }

    /// <summary>
    /// Health check endpoint.
    /// Returns available output modes and current configuration.
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        var response = new HealthResponse
        {
            Status = "healthy",
            SdkInitialized = _jobQueue.IsSdkInitialized,
            PendingJobs = _jobQueue.PendingJobCount,
            ExportPath = _jobQueue.ExportPath,
            DefaultOutputMode = _jobQueue.IsSdkInitialized ? "contpaqi" : "json",
            AvailableOutputModes = new List<OutputModeInfo>
            {
                new OutputModeInfo
                {
                    Id = "contpaqi",
                    Name = "ContPAQi",
                    Description = "Send directly to ContPAQi via COM SDK",
                    Available = _jobQueue.IsSdkInitialized
                },
                new OutputModeInfo
                {
                    Id = "json",
                    Name = "JSON File",
                    Description = "Export to JSON file for testing/review",
                    Available = true
                },
                new OutputModeInfo
                {
                    Id = "csv",
                    Name = "CSV File",
                    Description = "Export to CSV file for spreadsheet import",
                    Available = true
                },
                new OutputModeInfo
                {
                    Id = "both",
                    Name = "JSON + CSV",
                    Description = "Export to both JSON and CSV files",
                    Available = true
                }
            }
        };

        return Ok(response);
    }
}
