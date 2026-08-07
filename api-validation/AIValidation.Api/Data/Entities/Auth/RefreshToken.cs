namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Refresh token dùng để cấp lại access token mà không cần đăng nhập lại.
/// Bảo mật: KHÔNG lưu token thô — chỉ lưu SHA256 hash. Token thô chỉ trả cho
/// client đúng một lần. Hỗ trợ xoay vòng (rotate) và thu hồi (revoke).
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    /// <summary>User sở hữu token.</summary>
    public Guid UserId { get; set; }

    /// <summary>SHA256 hash (base64) của token thô — dùng để đối chiếu.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Thời điểm hết hạn (UTC).</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Thời điểm bị thu hồi (UTC) — null nghĩa là còn hiệu lực.</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>Hash của token thay thế khi xoay vòng (rotate).</summary>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>Thời điểm tạo (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Địa chỉ IP tạo token (phục vụ audit).</summary>
    public string? CreatedByIp { get; set; }

    /// <summary>User sở hữu (navigation).</summary>
    public AppUser? User { get; set; }

    /// <summary>Token còn hiệu lực: chưa bị thu hồi và chưa hết hạn.</summary>
    public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
}
