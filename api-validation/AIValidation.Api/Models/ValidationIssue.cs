using AIValidation.Api.Models.Enums;

namespace AIValidation.Api.Models;

/// <summary>
/// Một vấn đề (lỗi, cảnh báo hoặc gợi ý) được phát hiện trong quá trình xác thực.
/// </summary>
public record ValidationIssue
{
    /// <summary>
    /// Mã định danh duy nhất cho loại vấn đề.
    /// Ví dụ: "FIELD_REQUIRED", "INVALID_FORMAT", "DUPLICATE_RECORD".
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Mức độ nghiêm trọng của vấn đề.
    /// </summary>
    public required ValidationSeverity Severity { get; init; }

    /// <summary>
    /// Tên trường dữ liệu liên quan đến vấn đề.
    /// </summary>
    public required string Field { get; init; }

    /// <summary>
    /// Mô tả chi tiết về vấn đề cho người dùng.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gợi ý cách sửa lỗi (nếu có).
    /// Có thể null nếu không có gợi ý.
    /// </summary>
    public string? Suggestion { get; init; }

    /// <summary>
    /// Cho biết liệu hệ thống có thể tự động sửa lỗi này hay không.
    /// Default: false nếu không được cung cấp.
    /// </summary>
    public required bool CanAutoFix { get; init; }

    /// <summary>
    /// Giá trị sử dụng để tự động sửa lỗi (nếu CanAutoFix = true).
    /// Có thể null nếu không cần hoặc không thể tự động sửa.
    /// </summary>
    public string? FixValue { get; init; }
}
