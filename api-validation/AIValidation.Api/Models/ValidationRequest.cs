using System.Text.Json;

namespace AIValidation.Api.Models;

/// <summary>
/// Yêu cầu xác thực dữ liệu từ Chrome Extension.
/// Đại diện cho toàn bộ thông tin cần thiết để API thực hiện kiểm tra dữ liệu.
/// </summary>
public record ValidationRequest
{
    /// <summary>
    /// Tên trang hoặc chức năng trên HIS mà Form đó thuộc về.
    /// Ví dụ: "PatientRegistration", "MedicalEncounter", "Diagnosis".
    /// </summary>
    public required string Page { get; init; }

    /// <summary>
    /// Thông tin về sự kiện kích hoạt xác thực (trường nào thay đổi, loại sự kiện).
    /// </summary>
    public required TriggerInfo Trigger { get; init; }

    /// <summary>
    /// Thông tin ngữ cảnh xác thực (timestamp, phiên, phiên bản extension).
    /// </summary>
    public required ValidationContext Context { get; init; }

    /// <summary>
    /// Snapshot của toàn bộ biểu mẫu dưới dạng JSON động.
    /// Cấu trúc JSON phụ thuộc vào loại Page và các trường dữ liệu mà HIS cung cấp.
    /// 
    /// Được lưu trữ dưới dạng JsonElement để hỗ trợ đa dạng các cấu trúc biểu mẫu khác nhau
    /// mà không cần định nghĩa các model cứng nhắc trước.
    /// </summary>
    public required JsonElement Form { get; init; }
}
