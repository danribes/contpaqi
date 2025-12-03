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

// Register custom services
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

app.UseAuthorization();
app.MapControllers();

app.Run();
