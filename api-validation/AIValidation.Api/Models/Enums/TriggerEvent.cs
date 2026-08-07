namespace AIValidation.Api.Models.Enums;

/// <summary>
/// Loại sự kiện kích hoạt xác thực.
/// </summary>
public enum TriggerEvent
{
    /// <summary>
    /// Dữ liệu trường thay đổi.
    /// </summary>
    Change,

    /// <summary>
    /// Trường mất focus (người dùng rời khỏi trường).
    /// </summary>
    Blur,

    /// <summary>
    /// Trường nhận focus (người dùng nhấp vào trường).
    /// </summary>
    Focus,

    /// <summary>
    /// Biểu mẫu được lưu.
    /// </summary>
    Save
}
