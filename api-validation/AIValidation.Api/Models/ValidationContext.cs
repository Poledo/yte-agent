namespace AIValidation.Api.Models;

/// <summary>
/// Thông tin ngữ cảnh xác thực từ Chrome Extension.
/// Cung cấp metadata về phiên làm việc và thời gian yêu cầu.
/// </summary>
public record ValidationContext
{
    /// <summary>
    /// Thời gian yêu cầu xác thực được gửi.
    /// </summary>
    public required DateTime Timestamp { get; init; }

    /// <summary>
    /// Phiên bản Chrome Extension gửi yêu cầu.
    /// </summary>
    public required string ExtensionVersion { get; init; }

    /// <summary>
    /// Định danh phiên làm việc duy nhất.
    /// </summary>
    public required string SessionId { get; init; }

    /// <summary>
    /// Định danh người dùng (có thể null nếu chưa đăng nhập).
    /// </summary>
    public string? UserId { get; init; }
}
