using System.Collections.Concurrent;
using System.Threading.Channels;
using ContpaqiBridge.Models;
using ContpaqiBridge.Sdk;

namespace ContpaqiBridge.Services;

/// <summary>
/// Background service that processes invoice jobs sequentially.
/// Required because Contpaqi SDK does not support concurrent operations.
/// Supports multiple output modes: ContPAQi, JSON export, CSV export.
/// </summary>
public class JobQueueService : BackgroundService
{
    private readonly Channel<InvoiceJob> _queue;
    private readonly ConcurrentDictionary<string, InvoiceJob> _jobs;
    private readonly ILogger<JobQueueService> _logger;
    private readonly ISdkInterop _sdk;
    private readonly ExportService _exportService;
    private readonly IConfiguration _config;
    private const int MaxRetries = 3;
    private const int RetryDelayMs = 1000;

    public JobQueueService(
        ISdkInterop sdk,
        ExportService exportService,
        IConfiguration config,
        ILogger<JobQueueService> logger)
    {
        _sdk = sdk;
        _exportService = exportService;
        _config = config;
        _logger = logger;
        _jobs = new ConcurrentDictionary<string, InvoiceJob>();
        _queue = Channel.CreateBounded<InvoiceJob>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    public bool IsSdkInitialized => _sdk.IsInitialized;
    public int PendingJobCount => _jobs.Count(j => j.Value.Status == JobStatus.Pending || j.Value.Status == JobStatus.Processing);
    public string ExportPath => _exportService.ExportPath;

    public async Task<string> EnqueueAsync(InvoiceJob job)
    {
        _jobs[job.Id] = job;
        await _queue.Writer.WriteAsync(job);
        _logger.LogInformation("Job {JobId} enqueued", job.Id);
        return job.Id;
    }

    public JobStatusResponse? GetJobStatus(string jobId)
    {
        if (!_jobs.TryGetValue(jobId, out var job))
        {
            return null;
        }

        return new JobStatusResponse
        {
            JobId = job.Id,
            Status = job.Status.ToString().ToLowerInvariant(),
            CreatedAt = job.CreatedAt,
            CompletedAt = job.CompletedAt,
            PolizaId = job.PolizaId,
            ErrorMessage = job.ErrorMessage,
            RetryCount = job.RetryCount,
            OutputMode = job.OutputMode,
            ExportedFiles = job.ExportedFiles
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JobQueueService starting");

        // Initialize SDK
        var dataPath = _config.GetValue<string>("Contpaqi:DataPath") ?? @"C:\Contpaqi\Data";
        var initResult = _sdk.InicializaSDK(dataPath);

        if (!initResult.Success)
        {
            _logger.LogWarning("SDK initialization failed: {Error}. Will retry on first job.", initResult.ErrorMessage);
        }
        else
        {
            _logger.LogInformation("SDK initialized successfully");
        }

        try
        {
            await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                await ProcessJobWithRetryAsync(job, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("JobQueueService stopping");
        }
        finally
        {
            // Graceful shutdown: terminate SDK
            _sdk.TerminaSDK();
            _logger.LogInformation("SDK terminated");
        }
    }

    private async Task ProcessJobWithRetryAsync(InvoiceJob job, CancellationToken stoppingToken)
    {
        job.Status = JobStatus.Processing;

        while (job.RetryCount <= MaxRetries)
        {
            try
            {
                _logger.LogInformation("Processing job {JobId} (attempt {Attempt})", job.Id, job.RetryCount + 1);

                await ProcessJobAsync(job);

                job.Status = JobStatus.Completed;
                job.CompletedAt = DateTime.UtcNow;
                _logger.LogInformation("Job {JobId} completed successfully with PolizaId {PolizaId}", job.Id, job.PolizaId);

                // SDK requires delay between operations
                await Task.Delay(500, stoppingToken);
                return;
            }
            catch (Exception ex)
            {
                job.RetryCount++;
                job.ErrorMessage = ex.Message;
                _logger.LogError(ex, "Error processing job {JobId} (attempt {Attempt})", job.Id, job.RetryCount);

                if (job.RetryCount > MaxRetries)
                {
                    job.Status = JobStatus.Failed;
                    job.CompletedAt = DateTime.UtcNow;
                    _logger.LogError("Job {JobId} failed after {MaxRetries} retries", job.Id, MaxRetries);
                    return;
                }

                // Exponential backoff
                var delay = RetryDelayMs * (int)Math.Pow(2, job.RetryCount - 1);
                await Task.Delay(delay, stoppingToken);
            }
        }
    }

    private async Task ProcessJobAsync(InvoiceJob job)
    {
        if (job.InvoiceData == null)
        {
            throw new InvalidOperationException("Invoice data is missing");
        }

        // Store the output mode from the request
        job.OutputMode = job.InvoiceData.OutputMode;

        // Check if we should use export mode
        var useExportMode = job.OutputMode != OutputMode.Contpaqi;

        if (useExportMode)
        {
            await ProcessExportJobAsync(job);
        }
        else
        {
            await ProcessContpaqiJobAsync(job);
        }
    }

    /// <summary>
    /// Process job using ContPAQi COM SDK.
    /// </summary>
    private Task ProcessContpaqiJobAsync(InvoiceJob job)
    {
        // Ensure SDK is initialized
        if (!_sdk.IsInitialized)
        {
            var dataPath = _config.GetValue<string>("Contpaqi:DataPath") ?? @"C:\Contpaqi\Data";
            var initResult = _sdk.InicializaSDK(dataPath);
            if (!initResult.Success)
            {
                throw new InvalidOperationException($"SDK initialization failed: {initResult.ErrorMessage}");
            }
        }

        // Create poliza
        var polizaData = new PolizaData
        {
            TipoPoliza = 1, // Ingreso
            Fecha = job.InvoiceData!.Fecha,
            Concepto = $"Factura {job.InvoiceData.Folio ?? "S/N"} - {job.InvoiceData.RfcReceptor}"
        };

        var polizaResult = _sdk.CreaPoliza(polizaData);
        if (!polizaResult.Success)
        {
            throw new InvalidOperationException($"Failed to create poliza: {polizaResult.ErrorMessage}");
        }

        job.PolizaId = polizaResult.Value;

        // Add movements for each line item
        foreach (var lineItem in job.InvoiceData.LineItems)
        {
            var movimiento = new MovimientoData
            {
                CuentaCodigo = "1101", // Default account, would be configurable
                Cargo = lineItem.Amount,
                Abono = 0,
                Concepto = lineItem.Description,
                Referencia = job.InvoiceData.Folio ?? ""
            };

            var movResult = _sdk.InsertaMovimiento(polizaResult.Value, movimiento);
            if (!movResult.Success)
            {
                _logger.LogWarning("Failed to insert movement: {Error}", movResult.ErrorMessage);
            }
        }

        // Add IVA movement if applicable
        if (job.InvoiceData.Iva > 0)
        {
            var ivaMovimiento = new MovimientoData
            {
                CuentaCodigo = "1106", // IVA account
                Cargo = job.InvoiceData.Iva,
                Abono = 0,
                Concepto = "IVA",
                Referencia = job.InvoiceData.Folio ?? ""
            };

            _sdk.InsertaMovimiento(polizaResult.Value, ivaMovimiento);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Process job by exporting to file (JSON/CSV).
    /// </summary>
    private async Task ProcessExportJobAsync(InvoiceJob job)
    {
        var invoiceData = job.InvoiceData!;

        // Create poliza export data
        var polizaId = new Random().Next(1000, 9999); // Generate a mock ID for export
        job.PolizaId = polizaId;

        var exportData = new PolizaExportData
        {
            PolizaId = polizaId,
            Fecha = invoiceData.Fecha,
            TipoPoliza = 1, // Ingreso
            NumeroPoliza = invoiceData.Folio ?? $"EXP-{job.Id.Substring(0, 8)}",
            Concepto = $"Factura {invoiceData.Folio ?? "S/N"} - {invoiceData.RfcReceptor}",
            RfcEmisor = invoiceData.RfcEmisor,
            RfcReceptor = invoiceData.RfcReceptor,
            Subtotal = invoiceData.Subtotal,
            Iva = invoiceData.Iva,
            Total = invoiceData.Total,
            Movimientos = new List<MovimientoExportData>()
        };

        // Add line item movements
        foreach (var lineItem in invoiceData.LineItems)
        {
            exportData.Movimientos.Add(new MovimientoExportData
            {
                CuentaCodigo = "1101",
                NombreCuenta = "Clientes",
                Cargo = lineItem.Amount,
                Abono = 0,
                Concepto = lineItem.Description,
                Referencia = invoiceData.Folio ?? ""
            });
        }

        // Add IVA movement if applicable
        if (invoiceData.Iva > 0)
        {
            exportData.Movimientos.Add(new MovimientoExportData
            {
                CuentaCodigo = "1106",
                NombreCuenta = "IVA Acreditable",
                Cargo = invoiceData.Iva,
                Abono = 0,
                Concepto = "IVA",
                Referencia = invoiceData.Folio ?? ""
            });
        }

        // Export based on requested mode
        var results = new List<ExportResult>();

        switch (job.OutputMode)
        {
            case OutputMode.Json:
                results.Add(await _exportService.ExportToJsonAsync(exportData));
                break;
            case OutputMode.Csv:
                results.Add(await _exportService.ExportToCsvAsync(exportData));
                break;
            case OutputMode.Both:
                results = await _exportService.ExportToAllFormatsAsync(exportData);
                break;
        }

        // Store exported file info in job
        job.ExportedFiles = results
            .Where(r => r.Success)
            .Select(r => new ExportedFileInfo
            {
                FileName = r.FileName ?? "",
                FilePath = r.FilePath ?? "",
                Format = r.Format ?? ""
            })
            .ToList();

        // Check for any failures
        var failures = results.Where(r => !r.Success).ToList();
        if (failures.Any())
        {
            _logger.LogWarning("Some exports failed: {Errors}",
                string.Join(", ", failures.Select(f => f.ErrorMessage)));
        }

        _logger.LogInformation("Job {JobId} exported to {FileCount} file(s): {Files}",
            job.Id, job.ExportedFiles.Count, string.Join(", ", job.ExportedFiles.Select(f => f.FileName)));
    }
}

/// <summary>
/// Represents a job in the queue.
/// </summary>
public class InvoiceJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public JobStatus Status { get; set; } = JobStatus.Pending;
    public CreateInvoiceRequest? InvoiceData { get; set; }
    public int? PolizaId { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Output mode for this job (Contpaqi, Json, Csv, or Both).
    /// </summary>
    public OutputMode OutputMode { get; set; } = OutputMode.Contpaqi;

    /// <summary>
    /// List of exported files (when using export modes).
    /// </summary>
    public List<ExportedFileInfo>? ExportedFiles { get; set; }
}

public enum JobStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
