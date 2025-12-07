namespace ContpaqiBridge.Sdk;

/// <summary>
/// Interface for Contpaqi SDK interop operations.
/// Abstracts COM calls for testability.
/// </summary>
public interface ISdkInterop : IDisposable
{
    /// <summary>
    /// Initialize the SDK with data path.
    /// Maps to fInicializaSDK.
    /// </summary>
    /// <param name="dataPath">Path to Contpaqi data directory</param>
    /// <returns>True if initialization succeeded</returns>
    SdkResult<bool> InicializaSDK(string dataPath);

    /// <summary>
    /// Terminate the SDK session.
    /// Maps to fTerminaSDK.
    /// </summary>
    void TerminaSDK();

    /// <summary>
    /// Create an accounting entry (póliza).
    /// Maps to fCreaPoliza.
    /// </summary>
    /// <param name="poliza">Poliza data to create</param>
    /// <returns>Created poliza ID or error</returns>
    SdkResult<int> CreaPoliza(PolizaData poliza);

    /// <summary>
    /// Add a movement to a poliza.
    /// Maps to fInsertaMovimiento.
    /// </summary>
    SdkResult<bool> InsertaMovimiento(int polizaId, MovimientoData movimiento);

    /// <summary>
    /// Check if SDK is currently initialized.
    /// </summary>
    bool IsInitialized { get; }

    /// <summary>
    /// Get the last error message from SDK.
    /// </summary>
    string GetLastError();
}

/// <summary>
/// Result wrapper for SDK operations.
/// </summary>
public class SdkResult<T>
{
    public bool Success { get; set; }
    public T? Value { get; set; }
    public int ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }

    public static SdkResult<T> Ok(T value) => new()
    {
        Success = true,
        Value = value,
        ErrorCode = 0
    };

    public static SdkResult<T> Error(int code, string message) => new()
    {
        Success = false,
        ErrorCode = code,
        ErrorMessage = message
    };
}

/// <summary>
/// Data for creating a póliza (accounting entry).
/// </summary>
public class PolizaData
{
    public DateTime Fecha { get; set; }
    public int TipoPoliza { get; set; } // 1=Ingreso, 2=Egreso, 3=Diario
    public string Concepto { get; set; } = string.Empty;
    public string NumeroPoliza { get; set; } = string.Empty;
    public List<MovimientoData> Movimientos { get; set; } = new();
}

/// <summary>
/// Data for a movement within a póliza.
/// </summary>
public class MovimientoData
{
    public string CuentaCodigo { get; set; } = string.Empty;
    public decimal Cargo { get; set; }
    public decimal Abono { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;
}
