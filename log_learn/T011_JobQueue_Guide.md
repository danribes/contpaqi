# T011 Background Job Queue - Learning Guide

## Overview
This guide explains how to implement a robust background job queue using System.Threading.Channels.

## Key Concepts

### 1. System.Threading.Channels

High-performance producer/consumer pattern:

```csharp
// Create bounded channel with backpressure
_queue = Channel.CreateBounded<InvoiceJob>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait  // Block producer when full
});
```

**Why Channels?**
- Thread-safe without explicit locks
- Async-friendly with await support
- Bounded channels provide backpressure
- More efficient than BlockingCollection

### 2. BackgroundService Pattern

ASP.NET Core's hosted service pattern:

```csharp
public class JobQueueService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            await ProcessJobAsync(job);
        }
    }
}
```

**Key Points:**
- ExecuteAsync runs in background
- CancellationToken signals shutdown
- ReadAllAsync loops until cancelled

### 3. Job Status Tracking

Use ConcurrentDictionary for thread-safe job tracking:

```csharp
private readonly ConcurrentDictionary<string, InvoiceJob> _jobs;

public async Task<string> EnqueueAsync(InvoiceJob job)
{
    _jobs[job.Id] = job;  // Track job
    await _queue.Writer.WriteAsync(job);  // Queue for processing
    return job.Id;
}

public JobStatusResponse? GetJobStatus(string jobId)
{
    return _jobs.TryGetValue(jobId, out var job)
        ? MapToResponse(job)
        : null;
}
```

### 4. Retry with Exponential Backoff

Implement resilient job processing:

```csharp
private const int MaxRetries = 3;
private const int RetryDelayMs = 1000;

private async Task ProcessJobWithRetryAsync(InvoiceJob job)
{
    while (job.RetryCount <= MaxRetries)
    {
        try
        {
            await ProcessJobAsync(job);
            job.Status = JobStatus.Completed;
            return;
        }
        catch (Exception ex)
        {
            job.RetryCount++;

            if (job.RetryCount > MaxRetries)
            {
                job.Status = JobStatus.Failed;
                return;
            }

            // Exponential backoff: 1s, 2s, 4s
            var delay = RetryDelayMs * (int)Math.Pow(2, job.RetryCount - 1);
            await Task.Delay(delay);
        }
    }
}
```

### 5. Graceful Shutdown

Ensure clean termination:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    try
    {
        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            await ProcessJobAsync(job);
        }
    }
    catch (OperationCanceledException)
    {
        _logger.LogInformation("Service stopping");
    }
    finally
    {
        _sdk.TerminaSDK();  // Always cleanup
        _logger.LogInformation("SDK terminated");
    }
}
```

## Architecture Diagram

```
                    ┌──────────────────┐
                    │   API Request    │
                    └────────┬─────────┘
                             │ EnqueueAsync
                             ▼
┌─────────────────────────────────────────────────────────┐
│               JobQueueService                            │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │ Channel Writer  │────│  Channel<InvoiceJob>       │ │
│  └─────────────────┘    │  (bounded, capacity: 100)   │ │
│                         └──────────────┬──────────────┘ │
│                                        │                │
│  ┌─────────────────────────────────────▼──────────────┐ │
│  │           Background Loop (ExecuteAsync)            │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ foreach job in channel.ReadAllAsync()          │ │ │
│  │  │   ProcessJobWithRetryAsync(job)                │ │ │
│  │  │     └── ProcessJobAsync(job)                   │ │ │
│  │  │           └── SDK calls (CreaPoliza, etc.)     │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ConcurrentDictionary<string, InvoiceJob> _jobs     │ │
│  │  (thread-safe job status tracking)                   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Job State Machine

```
    ┌──────────┐
    │ Pending  │ ◄── Initial state
    └────┬─────┘
         │ Dequeued
         ▼
    ┌──────────┐
    │Processing│ ◄── Being worked on
    └────┬─────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────┐
│Completed│  │Failed│
│(success)│  │(error)│
└────────┘  └──────┘
```

## Best Practices

1. **Use bounded channels** - Prevent memory exhaustion
2. **Track all jobs** - Users need status visibility
3. **Implement retries** - Transient failures are common
4. **Exponential backoff** - Avoid hammering failing resources
5. **Graceful shutdown** - Always clean up resources
6. **Sequential processing** - For single-threaded SDKs

## Key Takeaways

1. Channels are ideal for producer/consumer patterns
2. BackgroundService provides lifecycle management
3. ConcurrentDictionary enables thread-safe status tracking
4. Retry logic with backoff increases reliability
5. CancellationToken enables graceful shutdown
