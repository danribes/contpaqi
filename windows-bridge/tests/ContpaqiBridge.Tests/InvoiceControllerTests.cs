using ContpaqiBridge.Controllers;
using ContpaqiBridge.Models;
using ContpaqiBridge.Sdk;
using ContpaqiBridge.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ContpaqiBridge.Tests;

/// <summary>
/// Tests for InvoiceController.
/// </summary>
public class InvoiceControllerTests
{
    private readonly Mock<ISdkInterop> _mockSdk;
    private readonly Mock<ILogger<JobQueueService>> _mockQueueLogger;
    private readonly Mock<ILogger<InvoiceController>> _mockControllerLogger;
    private readonly JobQueueService _jobQueue;
    private readonly InvoiceController _controller;

    public InvoiceControllerTests()
    {
        _mockSdk = new Mock<ISdkInterop>();
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);

        _mockQueueLogger = new Mock<ILogger<JobQueueService>>();
        _mockControllerLogger = new Mock<ILogger<InvoiceController>>();

        var configData = new Dictionary<string, string?>
        {
            { "Contpaqi:DataPath", @"C:\Test\Data" }
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        _jobQueue = new JobQueueService(_mockSdk.Object, config, _mockQueueLogger.Object);
        _controller = new InvoiceController(_jobQueue, _mockControllerLogger.Object);
    }

    [Fact]
    public async Task CreateInvoice_ValidRequest_ShouldReturnAccepted()
    {
        // Arrange
        var request = new CreateInvoiceRequest
        {
            RfcEmisor = "AAA010101AAA",
            RfcReceptor = "BBB020202BBB",
            Fecha = DateTime.Now,
            Subtotal = 1000m,
            Iva = 160m,
            Total = 1160m
        };

        // Act
        var result = await _controller.CreateInvoice(request);

        // Assert
        result.Should().BeOfType<AcceptedResult>();
        var accepted = (AcceptedResult)result;
        var response = accepted.Value as CreateInvoiceResponse;
        response.Should().NotBeNull();
        response!.JobId.Should().NotBeNullOrEmpty();
        response.Status.Should().Be("pending");
    }

    [Fact]
    public async Task CreateInvoice_InvalidMath_ShouldReturnBadRequest()
    {
        // Arrange
        var request = new CreateInvoiceRequest
        {
            RfcEmisor = "AAA010101AAA",
            RfcReceptor = "BBB020202BBB",
            Fecha = DateTime.Now,
            Subtotal = 1000m,
            Iva = 160m,
            Total = 1000m  // Wrong! Should be 1160
        };

        // Act
        var result = await _controller.CreateInvoice(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public void GetJobStatus_ExistingJob_ShouldReturnStatus()
    {
        // Arrange
        var job = new InvoiceJob();
        _jobQueue.EnqueueAsync(job).Wait();

        // Act
        var result = _controller.GetJobStatus(job.Id);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        var status = ok.Value as JobStatusResponse;
        status.Should().NotBeNull();
        status!.JobId.Should().Be(job.Id);
    }

    [Fact]
    public void GetJobStatus_NonExistentJob_ShouldReturnNotFound()
    {
        // Act
        var result = _controller.GetJobStatus("non-existent-id");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public void Health_ShouldReturnHealthResponse()
    {
        // Act
        var result = _controller.Health();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        var health = ok.Value as HealthResponse;
        health.Should().NotBeNull();
        health!.Status.Should().Be("healthy");
    }

    [Fact]
    public void Health_ShouldIncludeSdkStatus()
    {
        // Arrange
        _mockSdk.Setup(s => s.IsInitialized).Returns(true);

        // Act
        var result = _controller.Health();
        var ok = (OkObjectResult)result;
        var health = ok.Value as HealthResponse;

        // Assert
        health!.SdkInitialized.Should().BeTrue();
    }

    [Fact]
    public async Task Health_ShouldIncludePendingJobCount()
    {
        // Arrange
        await _jobQueue.EnqueueAsync(new InvoiceJob());
        await _jobQueue.EnqueueAsync(new InvoiceJob());

        // Act
        var result = _controller.Health();
        var ok = (OkObjectResult)result;
        var health = ok.Value as HealthResponse;

        // Assert
        health!.PendingJobs.Should().Be(2);
    }
}

/// <summary>
/// Tests for API request/response models.
/// </summary>
public class InvoiceModelsTests
{
    [Fact]
    public void CreateInvoiceRequest_ShouldHaveDefaultEmptyStrings()
    {
        // Arrange & Act
        var request = new CreateInvoiceRequest();

        // Assert
        request.RfcEmisor.Should().Be(string.Empty);
        request.RfcReceptor.Should().Be(string.Empty);
        request.LineItems.Should().BeEmpty();
    }

    [Fact]
    public void CreateInvoiceRequest_ShouldStoreLineItems()
    {
        // Arrange
        var request = new CreateInvoiceRequest
        {
            LineItems = new List<LineItemRequest>
            {
                new() { Description = "Product A", Quantity = 2, UnitPrice = 100, Amount = 200 },
                new() { Description = "Product B", Quantity = 1, UnitPrice = 500, Amount = 500 }
            }
        };

        // Assert
        request.LineItems.Should().HaveCount(2);
        request.LineItems[0].Description.Should().Be("Product A");
        request.LineItems[1].Amount.Should().Be(500);
    }

    [Fact]
    public void CreateInvoiceResponse_ShouldHaveDefaultValues()
    {
        // Arrange & Act
        var response = new CreateInvoiceResponse();

        // Assert
        response.Status.Should().Be("pending");
        response.JobId.Should().Be(string.Empty);
        response.Message.Should().Be(string.Empty);
    }

    [Fact]
    public void HealthResponse_ShouldHaveDefaultValues()
    {
        // Arrange & Act
        var response = new HealthResponse();

        // Assert
        response.Status.Should().Be("healthy");
        response.SdkInitialized.Should().BeFalse();
        response.PendingJobs.Should().Be(0);
        response.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void LineItemRequest_ShouldHaveRequiredProperties()
    {
        // Arrange & Act
        var item = new LineItemRequest
        {
            Description = "Widget",
            Quantity = 5,
            UnitPrice = 25.50m,
            Amount = 127.50m
        };

        // Assert
        item.Description.Should().Be("Widget");
        item.Quantity.Should().Be(5);
        item.UnitPrice.Should().Be(25.50m);
        item.Amount.Should().Be(127.50m);
    }
}
