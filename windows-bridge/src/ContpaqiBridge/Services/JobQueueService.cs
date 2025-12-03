using System.Threading.Channels;

namespace ContpaqiBridge.Services;

/// <summary>
/// Background service that processes invoice jobs sequentially.
/// Required because Contpaqi SDK does not support concurrent operations.
/// </summary>
public class JobQueueService : BackgroundService
{
    private readonly Channel<InvoiceJob> _queue;
    private readonly ILogger<JobQueueService> _logger;

    public JobQueueService(ILogger<JobQueueService> logger)
    {
        _logger = logger;
        _queue = Channel.CreateBounded<InvoiceJob>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    public async Task<string> EnqueueAsync(InvoiceJob job)
    {
        await _queue.Writer.WriteAsync(job);
        _logger.LogInformation("Job {JobId} enqueued", job.Id);
        return job.Id;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JobQueueService started");

        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                _logger.LogInformation("Processing job {JobId}", job.Id);
                await ProcessJobAsync(job);

                // SDK requires delay between operations
                await Task.Delay(500, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing job {JobId}", job.Id);
            }
        }
    }

    private async Task ProcessJobAsync(InvoiceJob job)
    {
        // TODO: Implement SDK interop
        await Task.CompletedTask;
    }
}

public class InvoiceJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public JobStatus Status { get; set; } = JobStatus.Pending;
    // Invoice data will be added later
}

public enum JobStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
