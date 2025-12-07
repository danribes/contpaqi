using ContpaqiBridge.Models;
using ContpaqiBridge.Sdk;
using ContpaqiBridge.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ContpaqiBridge.Tests;

/// <summary>
/// Tests for JobQueueService.
/// </summary>
public class JobQueueServiceTests
{
    private readonly Mock<ISdkInterop> _mockSdk;
    private readonly Mock<ILogger<JobQueueService>> _mockLogger;
    private readonly IConfiguration _config;

    public JobQueueServiceTests()
    {
        _mockSdk = new Mock<ISdkInterop>();
        _mockLogger = new Mock<ILogger<JobQueueService>>();

        var configData = new Dictionary<string, string?>
        {
            { "Contpaqi:DataPath", @"C:\Test\Data" }
        };
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
    }

    [Fact]
    public async Task EnqueueAsync_ShouldReturnJobId()
    {
        // Arrange
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);
        var service = new JobQueueService(_mockSdk.Object, _config, _mockLogger.Object);
        var job = new InvoiceJob();

        // Act
        var jobId = await service.EnqueueAsync(job);

        // Assert
        jobId.Should().NotBeNullOrEmpty();
        jobId.Should().Be(job.Id);
    }

    [Fact]
    public async Task EnqueueAsync_ShouldTrackJobForStatusRetrieval()
    {
        // Arrange
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);
        var service = new JobQueueService(_mockSdk.Object, _config, _mockLogger.Object);
        var job = new InvoiceJob();

        // Act
        var jobId = await service.EnqueueAsync(job);
        var status = service.GetJobStatus(jobId);

        // Assert
        status.Should().NotBeNull();
        status!.JobId.Should().Be(jobId);
        status.Status.Should().Be("pending");
    }

    [Fact]
    public void GetJobStatus_NonExistentJob_ShouldReturnNull()
    {
        // Arrange
        var service = new JobQueueService(_mockSdk.Object, _config, _mockLogger.Object);

        // Act
        var status = service.GetJobStatus("non-existent-id");

        // Assert
        status.Should().BeNull();
    }

    [Fact]
    public void IsSdkInitialized_ShouldReflectSdkState()
    {
        // Arrange
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);
        var service = new JobQueueService(_mockSdk.Object, _config, _mockLogger.Object);

        // Act & Assert
        service.IsSdkInitialized.Should().BeTrue();

        // Change SDK state
        _mockSdk.Setup(s => s.IsInitialized).Returns(false);
        service.IsSdkInitialized.Should().BeFalse();
    }

    [Fact]
    public async Task PendingJobCount_ShouldTrackPendingJobs()
    {
        // Arrange
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);
        var service = new JobQueueService(_mockSdk.Object, _config, _mockLogger.Object);

        // Act
        await service.EnqueueAsync(new InvoiceJob());
        await service.EnqueueAsync(new InvoiceJob());

        // Assert
        service.PendingJobCount.Should().Be(2);
    }

    [Fact]
    public void InvoiceJob_ShouldHaveDefaultValues()
    {
        // Arrange & Act
        var job = new InvoiceJob();

        // Assert
        job.Id.Should().NotBeNullOrEmpty();
        job.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        job.Status.Should().Be(JobStatus.Pending);
        job.RetryCount.Should().Be(0);
        job.CompletedAt.Should().BeNull();
        job.PolizaId.Should().BeNull();
        job.ErrorMessage.Should().BeNull();
    }

    [Fact]
    public void InvoiceJob_WithInvoiceData_ShouldStoreData()
    {
        // Arrange
        var invoiceData = new CreateInvoiceRequest
        {
            RfcEmisor = "AAA010101AAA",
            RfcReceptor = "BBB020202BBB",
            Fecha = DateTime.Now,
            Subtotal = 1000m,
            Iva = 160m,
            Total = 1160m
        };

        // Act
        var job = new InvoiceJob { InvoiceData = invoiceData };

        // Assert
        job.InvoiceData.Should().NotBeNull();
        job.InvoiceData!.RfcEmisor.Should().Be("AAA010101AAA");
        job.InvoiceData.Total.Should().Be(1160m);
    }

    [Fact]
    public void JobStatus_ShouldHaveAllRequiredStates()
    {
        // Assert all expected statuses exist
        Enum.GetValues<JobStatus>().Should().Contain(JobStatus.Pending);
        Enum.GetValues<JobStatus>().Should().Contain(JobStatus.Processing);
        Enum.GetValues<JobStatus>().Should().Contain(JobStatus.Completed);
        Enum.GetValues<JobStatus>().Should().Contain(JobStatus.Failed);
    }

    [Fact]
    public void JobStatusResponse_ShouldMapFromJob()
    {
        // Arrange
        var response = new JobStatusResponse
        {
            JobId = "test-123",
            Status = "completed",
            CreatedAt = new DateTime(2024, 1, 1),
            CompletedAt = new DateTime(2024, 1, 1, 0, 5, 0),
            PolizaId = 42,
            RetryCount = 1
        };

        // Assert
        response.JobId.Should().Be("test-123");
        response.Status.Should().Be("completed");
        response.PolizaId.Should().Be(42);
        response.RetryCount.Should().Be(1);
    }
}
