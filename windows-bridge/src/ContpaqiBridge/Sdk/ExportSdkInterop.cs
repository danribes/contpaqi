using ContpaqiBridge.Services;

namespace ContpaqiBridge.Sdk;

/// <summary>
/// SDK implementation that exports poliza data to files (JSON/CSV) instead of
/// calling ContPAQi COM SDK. Use this for testing without ContPAQi installed.
/// </summary>
public class ExportSdkInterop : ISdkInterop
{
    private readonly ExportService _exportService;
    private readonly ILogger<ExportSdkInterop> _logger;
    private readonly string _exportFormat;
    private bool _isInitialized;
    private string _lastError = string.Empty;
    private int _nextPolizaId = 1000;

    // Store polizas temporarily until export
    private readonly Dictionary<int, PolizaExportData> _pendingPolizas = new();

    public ExportSdkInterop(
        ExportService exportService,
        IConfiguration config,
        ILogger<ExportSdkInterop> logger)
    {
        _exportService = exportService;
        _logger = logger;
        _exportFormat = config.GetValue<string>("Export:Format") ?? "json";
    }

    public bool IsInitialized => _isInitialized;

    public SdkResult<bool> InicializaSDK(string dataPath)
    {
        _logger.LogInformation("ExportSdkInterop initialized (export mode). Export path: {Path}",
            _exportService.ExportPath);
        _isInitialized = true;
        return SdkResult<bool>.Ok(true);
    }

    public void TerminaSDK()
    {
        _isInitialized = false;
        _pendingPolizas.Clear();
        _logger.LogInformation("ExportSdkInterop terminated");
    }

    public SdkResult<int> CreaPoliza(PolizaData poliza)
    {
        if (!_isInitialized)
        {
            return SdkResult<int>.Error(-1, "SDK not initialized");
        }

        if (string.IsNullOrEmpty(poliza.Concepto))
        {
            _lastError = "Concepto is required";
            return SdkResult<int>.Error(-2, _lastError);
        }

        var polizaId = _nextPolizaId++;

        // Create export data structure
        var exportData = new PolizaExportData
        {
            PolizaId = polizaId,
            Fecha = poliza.Fecha,
            TipoPoliza = poliza.TipoPoliza,
            NumeroPoliza = poliza.NumeroPoliza,
            Concepto = poliza.Concepto,
            Movimientos = new List<MovimientoExportData>()
        };

        _pendingPolizas[polizaId] = exportData;

        _logger.LogInformation("Created poliza {PolizaId} for export", polizaId);

        return SdkResult<int>.Ok(polizaId);
    }

    public SdkResult<bool> InsertaMovimiento(int polizaId, MovimientoData movimiento)
    {
        if (!_isInitialized)
        {
            return SdkResult<bool>.Error(-1, "SDK not initialized");
        }

        if (!_pendingPolizas.TryGetValue(polizaId, out var poliza))
        {
            _lastError = $"Poliza {polizaId} not found";
            return SdkResult<bool>.Error(-3, _lastError);
        }

        if (string.IsNullOrEmpty(movimiento.CuentaCodigo))
        {
            _lastError = "Cuenta codigo is required";
            return SdkResult<bool>.Error(-4, _lastError);
        }

        // Add movement to poliza
        poliza.Movimientos.Add(new MovimientoExportData
        {
            CuentaCodigo = movimiento.CuentaCodigo,
            NombreCuenta = GetAccountName(movimiento.CuentaCodigo),
            Cargo = movimiento.Cargo,
            Abono = movimiento.Abono,
            Concepto = movimiento.Concepto,
            Referencia = movimiento.Referencia
        });

        _logger.LogDebug("Added movement to poliza {PolizaId}: Account {Account}, Cargo {Cargo}, Abono {Abono}",
            polizaId, movimiento.CuentaCodigo, movimiento.Cargo, movimiento.Abono);

        return SdkResult<bool>.Ok(true);
    }

    /// <summary>
    /// Finalize and export a poliza to files.
    /// Call this after all movements have been added.
    /// </summary>
    public async Task<List<ExportResult>> FinalizeAndExportAsync(int polizaId)
    {
        if (!_pendingPolizas.TryGetValue(polizaId, out var poliza))
        {
            return new List<ExportResult>
            {
                new ExportResult { Success = false, ErrorMessage = $"Poliza {polizaId} not found" }
            };
        }

        var results = new List<ExportResult>();

        switch (_exportFormat.ToLower())
        {
            case "json":
                results.Add(await _exportService.ExportToJsonAsync(poliza));
                break;
            case "csv":
                results.Add(await _exportService.ExportToCsvAsync(poliza));
                break;
            case "all":
            case "both":
                results = await _exportService.ExportToAllFormatsAsync(poliza);
                break;
            default:
                results.Add(await _exportService.ExportToJsonAsync(poliza));
                break;
        }

        // Remove from pending after export
        _pendingPolizas.Remove(polizaId);

        return results;
    }

    /// <summary>
    /// Get the pending poliza data for a given ID.
    /// </summary>
    public PolizaExportData? GetPendingPoliza(int polizaId)
    {
        return _pendingPolizas.GetValueOrDefault(polizaId);
    }

    /// <summary>
    /// Update the pending poliza with invoice reference data.
    /// </summary>
    public void UpdatePolizaInvoiceData(int polizaId, string? rfcEmisor, string? rfcReceptor,
        decimal subtotal, decimal iva, decimal total)
    {
        if (_pendingPolizas.TryGetValue(polizaId, out var poliza))
        {
            poliza.RfcEmisor = rfcEmisor;
            poliza.RfcReceptor = rfcReceptor;
            poliza.Subtotal = subtotal;
            poliza.Iva = iva;
            poliza.Total = total;
        }
    }

    public string GetLastError() => _lastError;

    public void Dispose()
    {
        TerminaSDK();
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Get account name from code (sample mapping).
    /// In real implementation, this would be loaded from ContPAQi catalogs.
    /// </summary>
    private static string GetAccountName(string accountCode)
    {
        return accountCode switch
        {
            "1101" => "Clientes",
            "1102" => "Bancos",
            "1106" => "IVA Acreditable",
            "2101" => "Proveedores",
            "2106" => "IVA Trasladado",
            "4101" => "Ventas",
            "5101" => "Costo de Ventas",
            _ => $"Cuenta {accountCode}"
        };
    }
}
