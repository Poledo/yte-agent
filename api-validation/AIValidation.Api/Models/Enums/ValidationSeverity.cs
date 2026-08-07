namespace AIValidation.Api.Models.Enums;

/// <summary>
/// Mức độ nghiêm trọng của vấn đề xác thực.
/// </summary>
public enum ValidationSeverity
{
    /// <summary>
    /// Thông tin (không ảnh hưởng đến quy trình).
    /// </summary>
    Info,

    /// <summary>
    /// Cảnh báo (cần chú ý nhưng không bắt buộc sửa).
    /// </summary>
    Warning,

    /// <summary>
    /// Lỗi (phải sửa trước khi tiếp tục).
    /// </summary>
    Error
}
