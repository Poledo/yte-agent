using AIValidation.Api.Models.Enums;

namespace AIValidation.Api.Models;

/// <summary>
/// Thông tin về sự kiện kích hoạt xác thực từ Chrome Extension.
/// </summary>
public record TriggerInfo
{
    /// <summary>
    /// Tên trường dữ liệu vừa thay đổi.
    /// </summary>
    public required string Field { get; init; }

    /// <summary>
    /// Loại sự kiện kích hoạt.
    /// </summary>
    public required TriggerEvent Event { get; init; }
}
