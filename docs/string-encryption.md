# String Encryption Guide

## Overview

String encryption is an obfuscation technique that protects sensitive strings in compiled code from being easily extracted. This document covers string encryption configuration for both Python (PyArmor) and C# (Dotfuscator) components of the ContPAQi AI Bridge.

## Why String Encryption?

Without string encryption, sensitive data is visible in compiled binaries:

```bash
# Extracting strings from a Python .pyc or C# .dll
strings ContpaqiBridge.dll | grep -i "api\|key\|password"
```

String encryption transforms literal strings into encrypted blobs that are decrypted at runtime.

---

## Python String Encryption (PyArmor)

### Configuration

PyArmor 8.x provides string encryption through the `obf_code` setting and dedicated `string_encryption` configuration.

```json
{
  "settings": {
    "obf_code": 2
  },
  "string_encryption": {
    "enabled": true,
    "selective": true,
    "patterns": [
      "api_key",
      "password",
      "secret",
      "connection_string"
    ]
  }
}
```

### Obfuscation Levels

| Level | String Protection | Description |
|-------|-------------------|-------------|
| 0 | None | Strings visible in bytecode |
| 1 | Basic | Simple string transformation |
| 2 | Enhanced | Full string encryption |

### Sensitive Patterns

Define patterns for strings that should always be encrypted:

```json
"patterns": [
  "api_key",
  "api_secret",
  "password",
  "secret",
  "token",
  "credential",
  "connection_string",
  "database_url",
  "redis_url",
  "endpoint",
  "base_url",
  "host",
  "contpaqi",
  "license"
]
```

### Exclusions

Some strings should NOT be encrypted (logging, common literals):

```json
"exclude_patterns": [
  "DEBUG",
  "INFO",
  "WARNING",
  "ERROR",
  "utf-8",
  "application/json"
]
```

---

## C# String Encryption (Dotfuscator)

### Community vs Professional

| Feature | Community | Professional |
|---------|-----------|--------------|
| Basic Renaming | Yes | Yes |
| String Encryption | Limited | Full |
| Control Flow | No | Yes |
| Tamper Detection | No | Yes |

### Professional Configuration

For Dotfuscator Professional, use the `stringencrypt` section:

```xml
<stringencrypt>
  <option>all</option>

  <includelist>
    <type name="ContpaqiBridge.Sdk.*" regex="true" />
    <type name="ContpaqiBridge.Services.*" regex="true" />
  </includelist>

  <excludelist>
    <type name="ContpaqiBridge.Controllers.*" regex="true" />
    <type name="ContpaqiBridge.Models.*" regex="true" />
  </excludelist>
</stringencrypt>
```

### Community Edition Alternatives

For Community Edition, implement custom string protection:

```csharp
public static class StringProtection
{
    private static readonly byte[] Key = { /* generated key */ };

    public static string Decode(string encoded)
    {
        byte[] data = Convert.FromBase64String(encoded);
        byte[] result = new byte[data.Length];

        for (int i = 0; i < data.Length; i++)
        {
            result[i] = (byte)(data[i] ^ Key[i % Key.Length]);
        }

        return Encoding.UTF8.GetString(result);
    }
}

// Usage:
// string apiKey = StringProtection.Decode("ZW5jb2RlZF92YWx1ZQ==");
```

---

## Sensitive String Categories

### API Credentials
```
api_key, api_secret, bearer_token, oauth_token
```

### Connection Strings
```
database_url, redis_url, connection_string, host, port
```

### Authentication
```
password, secret, credential, auth_token
```

### Application-Specific
```
contpaqi, license_key, sdk_path, mgw_sdk
```

---

## Security Limitations

### Runtime Visibility

**Warning**: Encrypted strings are decrypted at runtime and may be visible:

1. In process memory during execution
2. Through debugger inspection
3. Via memory dump analysis

### Defense in Depth

String encryption should be one layer in a comprehensive security strategy:

1. **String Encryption** - Prevents casual extraction
2. **Code Obfuscation** - Makes reverse engineering harder
3. **Environment Variables** - Keep secrets out of code
4. **Secure Configuration** - Encrypted config files
5. **Runtime Protection** - Anti-debugging, integrity checks

---

## Best Practices

### DO:
- Encrypt API keys and secrets
- Encrypt connection strings
- Encrypt license validation strings
- Use environment variables for production secrets
- Combine with other obfuscation techniques

### DON'T:
- Rely solely on string encryption
- Encrypt all strings (performance impact)
- Hardcode production secrets in code
- Assume encrypted strings are completely safe
- Skip encryption for "internal" strings

---

## Testing Encrypted Strings

### Verify Encryption Applied

```bash
# Python: Check for readable strings in .pyc
strings dist/__pycache__/*.pyc | grep -i "api_key"

# C#: Check for readable strings in .dll
strings obfuscated/ContpaqiBridge.dll | grep -i "connection"
```

If sensitive strings appear, verify configuration.

### Runtime Testing

```python
# Ensure decryption works at runtime
def test_string_decryption():
    # This should work if encryption/decryption is correct
    api_key = get_api_key()
    assert api_key is not None
    assert len(api_key) > 0
```

---

## Performance Considerations

String encryption adds minimal overhead:

| Operation | Impact |
|-----------|--------|
| Startup | +50-100ms for decryption initialization |
| Per-string | ~1ms per encrypted string |
| Memory | Negligible increase |

For performance-critical paths, consider:
- Caching decrypted strings
- Decrypting at startup vs on-demand
- Excluding high-frequency strings

---

## Summary

| Platform | Tool | Configuration |
|----------|------|---------------|
| Python | PyArmor 8.x | `string_encryption` section in pyarmor.json |
| C# | Dotfuscator Pro | `stringencrypt` section in dotfuscator.xml |
| C# (Community) | Custom helper | StringProtection.Decode() pattern |

String encryption is an essential obfuscation layer that protects sensitive literals in your compiled code, but should be combined with other security measures for comprehensive protection.
