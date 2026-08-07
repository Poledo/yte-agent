namespace AIValidation.Api.Configuration;

/// <summary>
/// Cấu hình JWT, load từ appsettings.json section "Jwt".
/// Nếu SecretKey trống, service sẽ tự sinh key dev cố định theo máy để dev chạy
/// được không cần cấu hình (có ghi log cảnh báo — KHÔNG dùng cho môi trường thật).
/// </summary>
public class JwtOptions
{
    /// <summary>Đơn vị phát hành token.</summary>
    public string Issuer { get; set; } = "AIValidation.Api";

    /// <summary>Đối tượng nhận token.</summary>
    public string Audience { get; set; } = "AIValidation.Client";

    /// <summary>Khóa bí mật ký token (HMAC-SHA256). Tối thiểu 32 ký tự cho môi trường thật.</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Thời gian sống của access token (phút). Mặc định 30.</summary>
    public int AccessTokenMinutes { get; set; } = 30;

    /// <summary>Thời gian sống của refresh token (ngày). Mặc định 7.</summary>
    public int RefreshTokenDays { get; set; } = 7;
}
