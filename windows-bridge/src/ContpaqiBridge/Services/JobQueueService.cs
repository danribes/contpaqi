using System.Collections.Concurrent;
using System.Threading.Channels;
using ContpaqiBridge.Models;
using ContpaqiBridge.Sdk;

namespace ContpaqiBridge.Services;

/// <summary>
/// Background service that processes invoice jobs sequentially.
/// Required because Contpaqi SDK does not support concurrent operations.
/// </summary>
public class JobQueueService : BackgroundService
{
    private readonly Channel<InvoiceJob> _queue;
    private readonly ConcurrentDictionary<string, InvoiceJob> _jobs;
    private readonly ILogger<JobQueueService> _logger;
    private readonly ISdkInterop _sdk;
    private readonly IConfiguration _config;
    private const int MaxRetries = 3;
    private const int RetryDelayMs = 1000;

    public JobQueueService(
        ISdkInterop sdk,
        IConfiguration config,
        ILogger<JobQueueService> logger)
    {
        _sdk = sdk;
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
            RetryCount = job.RetryCount
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

    private Task ProcessJobAsync(InvoiceJob job)
    {
        if (job.InvoiceData == null)
        {
            throw new InvalidOperationException("Invoice data is missing");
        }

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
            Fecha = job.InvoiceData.Fecha,
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

            var movResult = _sdk.InsertaMovimiento(polizaResult.Value.GetValueOrDefault(), movimiento);
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

            _sdk.InsertaMovimiento(polizaResult.Value.GetValueOrDefault(), ivaMovimiento);
        }

        return Task.CompletedTask;
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
}

public enum JobStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
