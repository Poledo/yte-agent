using System.Security.Cryptography;
using System.Text;
using AIValidation.Api.Configuration;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Giải quyết khóa ký JWT. Nếu cấu hình SecretKey trống, sinh một khóa dev cố
/// định theo tên máy (deterministic) để dev chạy được mà không cần cấu hình.
/// Dùng chung cho cả JwtTokenService (ký) và Program.cs (xác thực) nên khóa
/// hai bên luôn khớp.
/// </summary>
public static class JwtKeyResolver
{
    /// <summary>
    /// Trả về (bytes khóa, có phải khóa dev tự sinh không).
    /// Khóa dev = SHA256("AIValidation-Dev-Key::{MachineName}") — cố định trên
    /// cùng một máy, KHÔNG dùng cho môi trường thật.
    /// </summary>
    public static (byte[] Key, bool IsDevFallback) Resolve(JwtOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.SecretKey))
        {
            return (Encoding.UTF8.GetBytes(options.SecretKey), false);
        }

        var seed = $"AIValidation-Dev-Key::{Environment.MachineName}";
        var key = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
        return (key, true);
    }
}
