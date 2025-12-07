using ContpaqiBridge.Sdk;
using ContpaqiBridge.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on localhost only (security requirement)
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register SDK interop (use mock for testing/non-Windows environments)
#if DEBUG
if (Environment.GetEnvironmentVariable("USE_MOCK_SDK") == "true" || !OperatingSystem.IsWindows())
{
    builder.Services.AddSingleton<ISdkInterop, MockSdkInterop>();
}
else
{
    builder.Services.AddSingleton<ISdkInterop, SdkInterop>();
}
#else
builder.Services.AddSingleton<ISdkInterop, SdkInterop>();
#endif

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
