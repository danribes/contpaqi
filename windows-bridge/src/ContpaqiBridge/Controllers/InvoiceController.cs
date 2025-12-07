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
            InvoiceData = request
        };

        var jobId = await _jobQueue.EnqueueAsync(job);
        _logger.LogInformation("Invoice job {JobId} created for RFC {Rfc}", jobId, request.RfcEmisor);

        var response = new CreateInvoiceResponse
        {
            JobId = jobId,
            Status = "pending",
            CreatedAt = job.CreatedAt,
            Message = "Invoice queued for processing"
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
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        var response = new HealthResponse
        {
            Status = "healthy",
            SdkInitialized = _jobQueue.IsSdkInitialized,
            PendingJobs = _jobQueue.PendingJobCount
        };

        return Ok(response);
    }
}
