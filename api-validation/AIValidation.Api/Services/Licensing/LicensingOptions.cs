namespace AIValidation.Api.Services.Licensing;

/// <summary>Mức siết khóa bản quyền — cho phép bật dần thay vì cắt dịch vụ một nhát.</summary>
public enum LicensingMode
{
    /// <summary>
    /// Không kiểm gì cả. Giữ nguyên hành vi cũ, dùng cho môi trường demo/chấm thi
    /// nơi người xem phải thử được ngay mà không cần cấp khóa.
    /// </summary>
    Off,

    /// <summary>
    /// Vẫn phục vụ mọi request, nhưng thiếu khóa hoặc khóa sai thì ghi log cảnh báo.
    /// Đây là chế độ dùng khi triển khai: bản extension cũ chưa gửi khóa vẫn chạy,
    /// còn quản trị theo log để biết cơ sở nào chưa cập nhật.
    /// </summary>
    Warn,

    /// <summary>
    /// Không có khóa hợp lệ thì từ chối (401), mã cơ sở trong hồ sơ nằm ngoài phạm vi
    /// giấy phép thì từ chối (403). Chế độ chính thức khi đã bán.
    /// </summary>
    Enforce,
}

/// <summary>
/// Cấu hình cấp phép, đọc từ section "Licensing" của appsettings.
/// </summary>
public sealed class LicensingOptions
{
    /// <summary>Tên section trong appsettings.</summary>
    public const string SectionName = "Licensing";

    /// <summary>
    /// Mức siết. Mặc định <see cref="LicensingMode.Off"/> để nâng cấp phiên bản
    /// KHÔNG tự dưng cắt dịch vụ của cơ sở đang dùng — bật lên là quyết định có ý thức.
    /// </summary>
    public LicensingMode Mode { get; set; } = LicensingMode.Off;

    /// <summary>
    /// Có ghi sổ tính tiền hay không. Tách khỏi <see cref="Mode"/> vì hai việc độc lập:
    /// chạy Warn mà vẫn muốn đo thử sản lượng trước khi phát hành hóa đơn là hợp lý.
    /// </summary>
    public bool RecordBilling { get; set; }

    /// <summary>
    /// Tên header client gửi khóa bản quyền.
    /// </summary>
    public string HeaderName { get; set; } = "X-License-Key";

    /// <summary>
    /// Khóa AES-256 (base64 của 32 byte) dùng mã hóa bản lưu của khóa bản quyền,
    /// để xem lại khi cơ sở báo mất khóa. Rỗng = chưa bật chức năng xem lại —
    /// cấp khóa vẫn chạy bình thường, chỉ không lưu bản mã.
    /// Nạp từ biến môi trường Licensing__EncryptionKey (K8s secret / IIS appsettings).
    /// </summary>
    public string EncryptionKey { get; set; } = "";
}
