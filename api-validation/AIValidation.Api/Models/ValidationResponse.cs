namespace AIValidation.Api.Models;

/// <summary>
/// Phản hồi xác thực chứa danh sách tất cả các vấn đề phát hiện được.
/// Được gửi lại đến Chrome Extension để hiển thị cho người dùng.
/// </summary>
public record ValidationResponse
{
    /// <summary>
    /// Chỉ báo liệu dữ liệu có hợp lệ hay không.
    /// true nếu không có vấn đề nào (Issues trống)
    /// false nếu có ít nhất một vấn đề (Issues không trống)
    /// </summary>
    public required bool? IsValid { get; init; }

    /// <summary>
    /// Danh sách các vấn đề (lỗi, cảnh báo, gợi ý) phát hiện được.
    /// Danh sách có thể trống nếu dữ liệu hợp lệ.
    /// </summary>
    public required List<ValidationIssue> Issues { get; init; }

    /// <summary>
    /// Tóm tắt kết quả xác thực.
    /// Có thể được AI tạo ra hoặc được tính toán từ Issues.
    /// </summary>
    public required string Summary { get; init; }
}

