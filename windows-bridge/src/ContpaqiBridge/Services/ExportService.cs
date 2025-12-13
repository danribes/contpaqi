using System.Text.Json;
using System.Text.Json.Serialization;
using ContpaqiBridge.Sdk;

namespace ContpaqiBridge.Services;

/// <summary>
/// Service for exporting poliza data to different file formats (JSON, CSV).
/// Used as an alternative to ContPAQi SDK for testing without ContPAQi installed.
/// </summary>
public class ExportService
{
    private readonly ILogger<ExportService> _logger;
    private readonly string _exportPath;
    private readonly JsonSerializerOptions _jsonOptions;

    public ExportService(IConfiguration config, ILogger<ExportService> logger)
    {
        _logger = logger;
        _exportPath = config.GetValue<string>("Export:OutputPath") ?? Path.Combine(Directory.GetCurrentDirectory(), "exports");

        // Ensure export directory exists
        Directory.CreateDirectory(_exportPath);

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    /// <summary>
    /// Export poliza data to JSON format.
    /// </summary>
    public async Task<ExportResult> ExportToJsonAsync(PolizaExportData data)
    {
        try
        {
            var fileName = GenerateFileName(data, "json");
            var filePath = Path.Combine(_exportPath, fileName);

            var json = JsonSerializer.Serialize(data, _jsonOptions);
            await File.WriteAllTextAsync(filePath, json);

            _logger.LogInformation("Exported poliza to JSON: {FilePath}", filePath);

            return new ExportResult
            {
                Success = true,
                FilePath = filePath,
                FileName = fileName,
                Format = "json"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export poliza to JSON");
            return new ExportResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    /// <summary>
    /// Export poliza data to CSV format.
    /// </summary>
    public async Task<ExportResult> ExportToCsvAsync(PolizaExportData data)
    {
        try
        {
            var fileName = GenerateFileName(data, "csv");
            var filePath = Path.Combine(_exportPath, fileName);

            var lines = new List<string>
            {
                // Header
                "Fecha,TipoPoliza,NumeroPoliza,Concepto,CuentaCodigo,NombreCuenta,Cargo,Abono,ConceptoMovimiento,Referencia"
            };

            // Data rows
            foreach (var mov in data.Movimientos)
            {
                var line = string.Join(",",
                    EscapeCsvField(data.Fecha.ToString("yyyy-MM-dd")),
                    data.TipoPoliza,
                    EscapeCsvField(data.NumeroPoliza),
                    EscapeCsvField(data.Concepto),
                    EscapeCsvField(mov.CuentaCodigo),
                    EscapeCsvField(mov.NombreCuenta),
                    mov.Cargo.ToString("F2"),
                    mov.Abono.ToString("F2"),
                    EscapeCsvField(mov.Concepto),
                    EscapeCsvField(mov.Referencia)
                );
                lines.Add(line);
            }

            await File.WriteAllLinesAsync(filePath, lines);

            _logger.LogInformation("Exported poliza to CSV: {FilePath}", filePath);

            return new ExportResult
            {
                Success = true,
                FilePath = filePath,
                FileName = fileName,
                Format = "csv"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export poliza to CSV");
            return new ExportResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    /// <summary>
    /// Export poliza data to both JSON and CSV formats.
    /// </summary>
    public async Task<List<ExportResult>> ExportToAllFormatsAsync(PolizaExportData data)
    {
        var results = new List<ExportResult>();

        results.Add(await ExportToJsonAsync(data));
        results.Add(await ExportToCsvAsync(data));

        return results;
    }

    private static string GenerateFileName(PolizaExportData data, string extension)
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var folio = string.IsNullOrEmpty(data.NumeroPoliza) ? "SN" : data.NumeroPoliza;
        return $"poliza_{folio}_{timestamp}.{extension}";
    }

    private static string EscapeCsvField(string field)
    {
        if (string.IsNullOrEmpty(field))
            return "";

        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (field.Contains(',') || field.Contains('"') || field.Contains('\n'))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }

        return field;
    }

    public string ExportPath => _exportPath;
}

/// <summary>
/// Data structure for exporting a poliza.
/// </summary>
public class PolizaExportData
{
    public int PolizaId { get; set; }
    public DateTime Fecha { get; set; }
    public int TipoPoliza { get; set; }
    public string TipoPolizaNombre => TipoPoliza switch
    {
        1 => "Ingreso",
        2 => "Egreso",
        3 => "Diario",
        _ => "Desconocido"
    };
    public string NumeroPoliza { get; set; } = string.Empty;
    public string Concepto { get; set; } = string.Empty;
    public List<MovimientoExportData> Movimientos { get; set; } = new();

    // Invoice reference data
    public string? RfcEmisor { get; set; }
    public string? RfcReceptor { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Iva { get; set; }
    public decimal Total { get; set; }

    // Metadata
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
    public string ExportMode { get; set; } = "file_export";
}

/// <summary>
/// Movement data for export.
/// </summary>
public class MovimientoExportData
{
    public string CuentaCodigo { get; set; } = string.Empty;
    public string NombreCuenta { get; set; } = string.Empty;
    public decimal Cargo { get; set; }
    public decimal Abono { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;
}

/// <summary>
/// Result of an export operation.
/// </summary>
public class ExportResult
{
    public bool Success { get; set; }
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public string? Format { get; set; }
    public string? ErrorMessage { get; set; }
}
