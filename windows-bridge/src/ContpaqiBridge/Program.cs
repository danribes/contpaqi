using ContpaqiBridge.Sdk;
using ContpaqiBridge.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on localhost only (security requirement)
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
});

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register ExportService (always available for export modes)
builder.Services.AddSingleton<ExportService>();

// Determine SDK mode from environment or config
var sdkMode = Environment.GetEnvironmentVariable("SDK_MODE")?.ToLower()
    ?? builder.Configuration.GetValue<string>("SdkMode")?.ToLower()
    ?? "auto";

// Register SDK interop based on mode
// Modes: "contpaqi" = force ContPAQi, "export" = force export, "mock" = force mock, "auto" = auto-detect
if (sdkMode == "export")
{
    // Export mode: use ExportSdkInterop for file output
    builder.Services.AddSingleton<ISdkInterop, ExportSdkInterop>();
    Console.WriteLine("SDK Mode: Export (files will be saved to exports folder)");
}
else if (sdkMode == "mock" || Environment.GetEnvironmentVariable("USE_MOCK_SDK") == "true")
{
    // Mock mode: use MockSdkInterop for testing
    builder.Services.AddSingleton<ISdkInterop, MockSdkInterop>();
    Console.WriteLine("SDK Mode: Mock (simulated operations)");
}
else if (sdkMode == "contpaqi")
{
    // Force ContPAQi mode
    builder.Services.AddSingleton<ISdkInterop, SdkInterop>();
    Console.WriteLine("SDK Mode: ContPAQi (COM SDK)");
}
else
{
    // Auto mode: detect based on environment
    #if DEBUG
    if (!OperatingSystem.IsWindows())
    {
        // Non-Windows in debug: use export mode
        builder.Services.AddSingleton<ISdkInterop, ExportSdkInterop>();
        Console.WriteLine("SDK Mode: Export (non-Windows detected)");
    }
    else
    {
        builder.Services.AddSingleton<ISdkInterop, SdkInterop>();
        Console.WriteLine("SDK Mode: ContPAQi (Windows detected)");
    }
    #else
    builder.Services.AddSingleton<ISdkInterop, SdkInterop>();
    Console.WriteLine("SDK Mode: ContPAQi (Release build)");
    #endif
}

// Register job queue service
builder.Services.AddSingleton<JobQueueService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<JobQueueService>());

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Security: Verify localhost only
app.Use(async (context, next) =>
{
    var remoteIp = context.Connection.RemoteIpAddress;
    if (remoteIp != null && !remoteIp.Equals(System.Net.IPAddress.Loopback)
        && !remoteIp.Equals(System.Net.IPAddress.IPv6Loopback))
    {
        context.Response.StatusCode = 403;
        await context.Response.WriteAsync("Access denied: localhost only");
        return;
    }
    await next();
});

// Add security headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    await next();
});

app.UseAuthorization();
app.MapControllers();

app.Run();

// Make Program accessible for integration tests
public partial class Program { }
