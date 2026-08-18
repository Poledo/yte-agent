namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>Chế độ hoạt động của tầng phân quyền động.</summary>
public enum RbacMode
{
    /// <summary>Thiếu quyền là chặn (403). Chế độ chạy thật.</summary>
    Enforce = 0,

    /// <summary>
    /// Thiếu quyền vẫn cho qua, chỉ ghi nhật ký. Dùng ở lần deploy đầu sau khi đổi bộ
    /// mã quyền: soi nhật ký vài ngày, cấp bù quyền còn thiếu rồi mới chuyển Enforce.
    /// Không có bước này thì đổi mã quyền là khóa cửa toàn bộ người dùng ngay lập tức.
    /// </summary>
    Audit = 1,
}

/// <summary>
/// Cấu hình tầng phân quyền động (section "Rbac" trong appsettings).
/// </summary>
public sealed class RbacOptions
{
    /// <summary>Tên section trong cấu hình.</summary>
    public const string SectionName = "Rbac";

    /// <summary>Bật tầng phân quyền. Tắt = mọi request đã đăng nhập đều đi qua.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Chặn thật hay chỉ ghi nhật ký.</summary>
    public RbacMode Mode { get; set; } = RbacMode.Enforce;

    /// <summary>Quét endpoint và đồng bộ bảng quyền lúc khởi động.</summary>
    public bool AutoScanOnStartup { get; set; } = true;

    /// <summary>
    /// Mã vai trò được tự động cấp mọi quyền mới quét được. Rỗng = tắt.
    /// Có cái này thì thêm một API mới không vô tình khóa luôn người quản trị ra ngoài.
    /// </summary>
    public string AutoGrantToRoleCode { get; set; } = "ADMIN";

    /// <summary>Thời gian giữ cache tập quyền của một user (giây).</summary>
    public int CacheSeconds { get; set; } = 300;

    /// <summary>Ghi các lần bị từ chối xuống bảng permission_audit_logs.</summary>
    public bool LogDeniedToDatabase { get; set; } = true;

    /// <summary>
    /// Chỉ áp phân quyền cho request có đường dẫn bắt đầu bằng một trong các tiền tố
    /// này. Fallback policy của ASP.NET Core áp cho MỌI endpoint kể cả trang openapi,
    /// scalar, health check — không lọc thì các trang đó cũng đòi đăng nhập.
    /// </summary>
    public string[] IncludeRoutePrefixes { get; set; } = new[] { "api/" };
}
