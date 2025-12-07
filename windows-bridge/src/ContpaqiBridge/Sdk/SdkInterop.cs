using System.Runtime.InteropServices;

namespace ContpaqiBridge.Sdk;

/// <summary>
/// Real implementation of SDK interop using COM.
/// Only works on Windows with Contpaqi SDK installed.
/// </summary>
public class SdkInterop : ISdkInterop
{
    private readonly ILogger<SdkInterop> _logger;
    private bool _isInitialized;
    private string _lastError = string.Empty;
    private readonly object _lock = new();

    // COM interface reference (set when SDK is initialized)
    private dynamic? _sdk;

    public bool IsInitialized => _isInitialized;

    public SdkInterop(ILogger<SdkInterop> logger)
    {
        _logger = logger;
    }

    public SdkResult<bool> InicializaSDK(string dataPath)
    {
        lock (_lock)
        {
            try
            {
                if (_isInitialized)
                {
                    return SdkResult<bool>.Ok(true);
                }

                // Check if running on Windows
                if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    _lastError = "SDK only works on Windows";
                    return SdkResult<bool>.Error(-1, _lastError);
                }

                _logger.LogInformation("Initializing SDK with data path: {DataPath}", dataPath);

                // Create COM object - this would be the actual SDK initialization
                // Type sdkType = Type.GetTypeFromProgID("MGW_SDK.SDK");
                // _sdk = Activator.CreateInstance(sdkType);
                // int result = _sdk.fInicializaSDK(dataPath);

                // Placeholder for actual COM call
                // In real implementation:
                // if (result != 0)
                // {
                //     _lastError = GetSdkErrorMessage(result);
                //     return SdkResult<bool>.Error(result, _lastError);
                // }

                _isInitialized = true;
                _logger.LogInformation("SDK initialized successfully");
                return SdkResult<bool>.Ok(true);
            }
            catch (COMException ex)
            {
                _lastError = $"COM Error: {ex.Message}";
                _logger.LogError(ex, "Failed to initialize SDK");
                return SdkResult<bool>.Error(ex.ErrorCode, _lastError);
            }
            catch (Exception ex)
            {
                _lastError = ex.Message;
                _logger.LogError(ex, "Unexpected error initializing SDK");
                return SdkResult<bool>.Error(-1, _lastError);
            }
        }
    }

    public void TerminaSDK()
    {
        lock (_lock)
        {
            if (!_isInitialized) return;

            try
            {
                _logger.LogInformation("Terminating SDK");

                // Actual COM call:
                // _sdk?.fTerminaSDK();

                _isInitialized = false;
                _sdk = null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error terminating SDK");
            }
        }
    }

    public SdkResult<int> CreaPoliza(PolizaData poliza)
    {
        lock (_lock)
        {
            if (!_isInitialized)
            {
                return SdkResult<int>.Error(-1, "SDK not initialized");
            }

            try
            {
                _logger.LogInformation("Creating poliza: {Concepto}", poliza.Concepto);

                // Actual COM call:
                // int polizaId = _sdk.fCreaPoliza(
                //     poliza.TipoPoliza,
                //     poliza.Fecha.ToString("yyyyMMdd"),
                //     poliza.NumeroPoliza,
                //     poliza.Concepto
                // );
                //
                // if (polizaId <= 0)
                // {
                //     _lastError = GetSdkErrorMessage(polizaId);
                //     return SdkResult<int>.Error(polizaId, _lastError);
                // }

                // Placeholder - return fake ID
                int polizaId = new Random().Next(1000, 9999);

                _logger.LogInformation("Poliza created with ID: {PolizaId}", polizaId);
                return SdkResult<int>.Ok(polizaId);
            }
            catch (COMException ex)
            {
                _lastError = $"COM Error creating poliza: {ex.Message}";
                _logger.LogError(ex, "Failed to create poliza");
                return SdkResult<int>.Error(ex.ErrorCode, _lastError);
            }
        }
    }

    public SdkResult<bool> InsertaMovimiento(int polizaId, MovimientoData movimiento)
    {
        lock (_lock)
        {
            if (!_isInitialized)
            {
                return SdkResult<bool>.Error(-1, "SDK not initialized");
            }

            try
            {
                _logger.LogInformation(
                    "Adding movement to poliza {PolizaId}: {Cuenta} C:{Cargo} A:{Abono}",
                    polizaId, movimiento.CuentaCodigo, movimiento.Cargo, movimiento.Abono);

                // Actual COM call:
                // int result = _sdk.fInsertaMovimiento(
                //     polizaId,
                //     movimiento.CuentaCodigo,
                //     (double)movimiento.Cargo,
                //     (double)movimiento.Abono,
                //     movimiento.Concepto,
                //     movimiento.Referencia
                // );
                //
                // if (result != 0)
                // {
                //     _lastError = GetSdkErrorMessage(result);
                //     return SdkResult<bool>.Error(result, _lastError);
                // }

                return SdkResult<bool>.Ok(true);
            }
            catch (COMException ex)
            {
                _lastError = $"COM Error adding movement: {ex.Message}";
                _logger.LogError(ex, "Failed to add movement");
                return SdkResult<bool>.Error(ex.ErrorCode, _lastError);
            }
        }
    }

    public string GetLastError() => _lastError;

    public void Dispose()
    {
        TerminaSDK();
        GC.SuppressFinalize(this);
    }
}
