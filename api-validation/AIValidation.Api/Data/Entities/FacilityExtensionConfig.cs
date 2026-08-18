namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Cấu hình hiển thị robot RIÊNG của một cơ sở KCB: hình hài, màu thương hiệu, logo,
/// các mốc thời gian của hệ sinh hoạt.
///
/// Không có dòng cho cơ sở nào thì extension của cơ sở đó lần ngược lên cây cha, hết
/// cây thì rơi về cấu hình chung lưu ở file (<c>Storage/extension-config.json</c>).
/// Nhờ vậy Sở Y tế đặt một bộ diện mạo là cả nhánh dùng chung, cơ sở nào muốn khác
/// thì tự ghi đè mà không ảnh hưởng ai.
///
/// Nội dung lưu nguyên dạng JSON của <c>ExtensionConfigState</c> thay vì tách thành
/// cột: cấu hình robot còn đổi nhiều, tách cột thì mỗi lần thêm hiệu ứng là một
/// migration, trong khi chẳng bao giờ cần truy vấn theo từng trường.
/// </summary>
public class FacilityExtensionConfig
{
    /// <summary>Cơ sở KCB sở hữu cấu hình — cũng là khóa chính (mỗi cơ sở nhiều nhất một dòng).</summary>
    public long FacilityId { get; set; }

    /// <summary>Cơ sở KCB (navigation).</summary>
    public Facility? Facility { get; set; }

    /// <summary>Cấu hình dạng JSON (khớp <c>ExtensionConfigState</c>).</summary>
    public string ConfigJson { get; set; } = "{}";

    /// <summary>Thời điểm cập nhật gần nhất (UTC) — dùng làm ETag cho extension cache.</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>Email người sửa gần nhất, để truy vết khi diện mạo bị đổi bất ngờ.</summary>
    public string? UpdatedBy { get; set; }
}
