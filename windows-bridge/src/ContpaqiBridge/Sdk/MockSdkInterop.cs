namespace ContpaqiBridge.Sdk;

/// <summary>
/// Mock implementation of SDK for testing.
/// Simulates SDK behavior without actual COM calls.
/// </summary>
public class MockSdkInterop : ISdkInterop
{
    private bool _isInitialized;
    private string _lastError = string.Empty;
    private int _nextPolizaId = 1000;
    private readonly Dictionary<int, PolizaData> _polizas = new();

    // Configuration for simulating errors
    public bool SimulateInitError { get; set; }
    public bool SimulatePolizaError { get; set; }
    public int SimulatedErrorCode { get; set; } = -999;
    public string SimulatedErrorMessage { get; set; } = "Simulated error";

    public bool IsInitialized => _isInitialized;

    public SdkResult<bool> InicializaSDK(string dataPath)
    {
        if (SimulateInitError)
        {
            _lastError = SimulatedErrorMessage;
            return SdkResult<bool>.Error(SimulatedErrorCode, _lastError);
        }

        if (string.IsNullOrEmpty(dataPath))
        {
            _lastError = "Data path is required";
            return SdkResult<bool>.Error(-1, _lastError);
        }

        _isInitialized = true;
        return SdkResult<bool>.Ok(true);
    }

    public void TerminaSDK()
    {
        _isInitialized = false;
        _polizas.Clear();
    }

    public SdkResult<int> CreaPoliza(PolizaData poliza)
    {
        if (!_isInitialized)
        {
            return SdkResult<int>.Error(-1, "SDK not initialized");
        }

        if (SimulatePolizaError)
        {
            _lastError = SimulatedErrorMessage;
            return SdkResult<int>.Error(SimulatedErrorCode, _lastError);
        }

        // Validate poliza data
        if (string.IsNullOrEmpty(poliza.Concepto))
        {
            _lastError = "Concepto is required";
            return SdkResult<int>.Error(-2, _lastError);
        }

        int polizaId = _nextPolizaId++;
        _polizas[polizaId] = poliza;

        return SdkResult<int>.Ok(polizaId);
    }

    public SdkResult<bool> InsertaMovimiento(int polizaId, MovimientoData movimiento)
    {
        if (!_isInitialized)
        {
            return SdkResult<bool>.Error(-1, "SDK not initialized");
        }

        if (!_polizas.ContainsKey(polizaId))
        {
            _lastError = $"Poliza {polizaId} not found";
            return SdkResult<bool>.Error(-3, _lastError);
        }

        // Validate movement
        if (string.IsNullOrEmpty(movimiento.CuentaCodigo))
        {
            _lastError = "Cuenta codigo is required";
            return SdkResult<bool>.Error(-4, _lastError);
        }

        if (movimiento.Cargo == 0 && movimiento.Abono == 0)
        {
            _lastError = "Movement must have cargo or abono";
            return SdkResult<bool>.Error(-5, _lastError);
        }

        _polizas[polizaId].Movimientos.Add(movimiento);
        return SdkResult<bool>.Ok(true);
    }

    public string GetLastError() => _lastError;

    // Helper methods for testing
    public PolizaData? GetPoliza(int id) => _polizas.GetValueOrDefault(id);
    public int GetPolizaCount() => _polizas.Count;

    public void Dispose()
    {
        TerminaSDK();
        GC.SuppressFinalize(this);
    }
}
