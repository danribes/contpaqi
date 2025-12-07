# T010 SDK Interop Pattern - Learning Guide

## Overview
This guide explains how to create a testable COM interop layer for legacy Windows DLLs.

## Key Concepts

### 1. Interface Abstraction Pattern

Abstract the SDK behind an interface to enable testing without actual SDK:

```csharp
public interface ISdkInterop : IDisposable
{
    SdkResult<bool> InicializaSDK(string dataPath);
    void TerminaSDK();
    SdkResult<int> CreaPoliza(PolizaData poliza);
    SdkResult<bool> InsertaMovimiento(int polizaId, MovimientoData movimiento);
    bool IsInitialized { get; }
}
```

### 2. Result Pattern

Wrap SDK results to capture success/failure without exceptions:

```csharp
public class SdkResult<T>
{
    public bool Success { get; set; }
    public T? Value { get; set; }
    public int ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
}
```

**Benefits:**
- Avoids exception-heavy control flow
- Captures error codes from native APIs
- Type-safe value access

### 3. P/Invoke for COM DLLs

Calling native Windows DLLs from C#:

```csharp
[DllImport("MGW_SDK.dll", CallingConvention = CallingConvention.Cdecl)]
private static extern int MGW_InicializaSDK(
    [MarshalAs(UnmanagedType.LPStr)] string dataPath);
```

**Key Points:**
- Use `DllImport` attribute
- Specify calling convention (Cdecl for C-style)
- Marshal strings as ANSI (LPStr) for legacy DLLs
- Build as x86 for 32-bit DLLs

### 4. Mock Implementation

Create a mock for testing without the actual SDK:

```csharp
public class MockSdkInterop : ISdkInterop
{
    private bool _initialized;
    private int _nextPolizaId = 1000;

    public SdkResult<bool> InicializaSDK(string dataPath)
    {
        if (string.IsNullOrEmpty(dataPath))
            return new SdkResult<bool> { Success = false, ErrorCode = -1 };

        _initialized = true;
        return new SdkResult<bool> { Success = true, Value = true };
    }
}
```

### 5. Dependency Injection Setup

Register mock or real implementation based on environment:

```csharp
#if DEBUG
if (!OperatingSystem.IsWindows())
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
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                Application Layer                         │
│          (Controllers, Services)                         │
└───────────────────────┬─────────────────────────────────┘
                        │ Depends on Interface
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  ISdkInterop                             │
│  (Interface - defines contract)                          │
└───────────────────────┬─────────────────────────────────┘
                        │ Implemented by
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌───────────────────┐         ┌─────────────────────┐
│   SdkInterop      │         │   MockSdkInterop    │
│ (Real P/Invoke)   │         │   (For Testing)     │
│                   │         │                     │
│ ┌───────────────┐ │         │ ┌─────────────────┐ │
│ │ MGW_SDK.dll   │ │         │ │ In-memory state │ │
│ │ (32-bit COM)  │ │         │ │ (no real SDK)   │ │
│ └───────────────┘ │         │ └─────────────────┘ │
└───────────────────┘         └─────────────────────┘
```

## Best Practices

1. **Keep interfaces minimal** - Only expose what's needed
2. **Use result pattern** - Avoid exceptions for expected failures
3. **Dispose pattern** - Always terminate SDK in Dispose
4. **Singleton lifetime** - SDK typically requires single instance
5. **Thread safety** - Legacy SDKs often aren't thread-safe

## Key Takeaways

1. Interface abstraction enables testing without hardware/SDK
2. Result pattern handles errors gracefully
3. P/Invoke requires careful marshaling for string types
4. Mock implementations should mirror real behavior closely
5. DI registration can switch between mock and real at runtime
