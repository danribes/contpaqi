using ContpaqiBridge.Sdk;
using FluentAssertions;
using Xunit;

namespace ContpaqiBridge.Tests;

/// <summary>
/// Tests for SDK interop interface and mock implementation.
/// </summary>
public class SdkInteropTests
{
    [Fact]
    public void MockSdkInterop_InicializaSDK_ShouldReturnSuccess()
    {
        // Arrange
        var sdk = new MockSdkInterop();

        // Act
        var result = sdk.InicializaSDK(@"C:\Test\Data");

        // Assert
        result.Success.Should().BeTrue();
        result.Value.Should().BeTrue();
        sdk.IsInitialized.Should().BeTrue();
    }

    [Fact]
    public void MockSdkInterop_InicializaSDK_WithEmptyPath_ShouldFail()
    {
        // Arrange
        var sdk = new MockSdkInterop();

        // Act
        var result = sdk.InicializaSDK("");

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be(-1);
        sdk.IsInitialized.Should().BeFalse();
    }

    [Fact]
    public void MockSdkInterop_TerminaSDK_ShouldSetInitializedToFalse()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        sdk.InicializaSDK(@"C:\Test\Data");

        // Act
        sdk.TerminaSDK();

        // Assert
        sdk.IsInitialized.Should().BeFalse();
    }

    [Fact]
    public void MockSdkInterop_CreaPoliza_WhenInitialized_ShouldReturnPolizaId()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        sdk.InicializaSDK(@"C:\Test\Data");
        var polizaData = new PolizaData
        {
            Tipo = 1,
            Fecha = DateTime.Now,
            Concepto = "Test Poliza",
            Diario = 1
        };

        // Act
        var result = sdk.CreaPoliza(polizaData);

        // Assert
        result.Success.Should().BeTrue();
        result.Value.Should().BeGreaterThan(0);
    }

    [Fact]
    public void MockSdkInterop_CreaPoliza_WhenNotInitialized_ShouldFail()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        var polizaData = new PolizaData
        {
            Tipo = 1,
            Fecha = DateTime.Now,
            Concepto = "Test Poliza",
            Diario = 1
        };

        // Act
        var result = sdk.CreaPoliza(polizaData);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be(-2);
        result.ErrorMessage.Should().Contain("not initialized");
    }

    [Fact]
    public void MockSdkInterop_InsertaMovimiento_WhenInitialized_ShouldReturnSuccess()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        sdk.InicializaSDK(@"C:\Test\Data");
        var polizaResult = sdk.CreaPoliza(new PolizaData
        {
            Tipo = 1,
            Fecha = DateTime.Now,
            Concepto = "Test",
            Diario = 1
        });

        var movimiento = new MovimientoData
        {
            NumCuenta = "1101",
            Cargo = 100.00m,
            Abono = 0m,
            Concepto = "Test Movement"
        };

        // Act
        var result = sdk.InsertaMovimiento(polizaResult.Value!.Value, movimiento);

        // Assert
        result.Success.Should().BeTrue();
        result.Value.Should().BeTrue();
    }

    [Fact]
    public void MockSdkInterop_InsertaMovimiento_WhenNotInitialized_ShouldFail()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        var movimiento = new MovimientoData
        {
            NumCuenta = "1101",
            Cargo = 100.00m,
            Abono = 0m,
            Concepto = "Test Movement"
        };

        // Act
        var result = sdk.InsertaMovimiento(1, movimiento);

        // Assert
        result.Success.Should().BeFalse();
    }

    [Fact]
    public void MockSdkInterop_Dispose_ShouldTerminateSDK()
    {
        // Arrange
        var sdk = new MockSdkInterop();
        sdk.InicializaSDK(@"C:\Test\Data");

        // Act
        sdk.Dispose();

        // Assert
        sdk.IsInitialized.Should().BeFalse();
    }

    [Fact]
    public void SdkResult_Success_ShouldHaveCorrectProperties()
    {
        // Arrange & Act
        var result = new SdkResult<int>
        {
            Success = true,
            Value = 42,
            ErrorCode = 0,
            ErrorMessage = null
        };

        // Assert
        result.Success.Should().BeTrue();
        result.Value.Should().Be(42);
        result.ErrorCode.Should().Be(0);
        result.ErrorMessage.Should().BeNull();
    }

    [Fact]
    public void SdkResult_Failure_ShouldHaveErrorInfo()
    {
        // Arrange & Act
        var result = new SdkResult<int>
        {
            Success = false,
            Value = default,
            ErrorCode = -100,
            ErrorMessage = "Something went wrong"
        };

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be(-100);
        result.ErrorMessage.Should().Be("Something went wrong");
    }

    [Fact]
    public void PolizaData_ShouldHaveRequiredProperties()
    {
        // Arrange & Act
        var poliza = new PolizaData
        {
            Tipo = 1,
            Fecha = new DateTime(2024, 1, 15),
            Concepto = "Factura Test",
            Diario = 2
        };

        // Assert
        poliza.Tipo.Should().Be(1);
        poliza.Fecha.Should().Be(new DateTime(2024, 1, 15));
        poliza.Concepto.Should().Be("Factura Test");
        poliza.Diario.Should().Be(2);
    }

    [Fact]
    public void MovimientoData_ShouldHaveRequiredProperties()
    {
        // Arrange & Act
        var movimiento = new MovimientoData
        {
            NumCuenta = "1101",
            Cargo = 1000.50m,
            Abono = 0m,
            Concepto = "Venta de producto",
            Referencia = "FAC-001"
        };

        // Assert
        movimiento.NumCuenta.Should().Be("1101");
        movimiento.Cargo.Should().Be(1000.50m);
        movimiento.Abono.Should().Be(0m);
        movimiento.Concepto.Should().Be("Venta de producto");
        movimiento.Referencia.Should().Be("FAC-001");
    }
}
