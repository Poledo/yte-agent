namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Quyền chi tiết, mỗi endpoint API một dòng. Mã dạng "{Controller}.{Action}" —
/// vd "Catalog.Import", "Users.Delete".
///
/// Bảng này do bộ quét endpoint sinh ra lúc khởi động, KHÔNG hardcode trong code.
/// Thêm một action mới vào controller là lần khởi động sau đã có quyền tương ứng,
/// không phải sửa file danh sách nào cả. Người quản trị gán quyền vào vai trò qua
/// bảng RolePermission ở màn hình quản trị.
/// </summary>
public class Permission
{
    public Guid Id { get; set; }

    /// <summary>Mã quyền duy nhất, dạng "{Controller}.{Action}" (vd "Catalog.Import").</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Tên hiển thị tiếng Việt. Bộ quét chỉ đặt tên lúc TẠO MỚI; sau đó người quản
    /// trị sửa lại cho sát nghiệp vụ thì lần quét sau vẫn giữ nguyên tên đã sửa.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Nhóm quyền để gom nhóm khi hiển thị — mặc định là tên controller.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Phương thức HTTP của endpoint (GET/POST/PUT/DELETE...), rỗng nếu quyền tự tạo.</summary>
    public string HttpMethod { get; set; } = string.Empty;

    /// <summary>Đường dẫn route đã chuẩn hóa, vd "api/catalog/import".</summary>
    public string Route { get; set; } = string.Empty;

    /// <summary>
    /// Tên controller (không có hậu tố "Controller"). RỖNG = quyền do người quản trị
    /// tự tạo, bộ quét không bao giờ đụng tới.
    /// </summary>
    public string ControllerName { get; set; } = string.Empty;

    /// <summary>Tên action. Cùng với <see cref="ControllerName"/> là khóa nhận diện của bộ quét.</summary>
    public string ActionName { get; set; } = string.Empty;

    /// <summary>Quyền do bộ quét sinh (true) hay người quản trị tự tạo (false).</summary>
    public bool IsSystem { get; set; }

    /// <summary>
    /// Còn hiệu lực hay không. Endpoint bị gỡ khỏi code thì quyền chỉ bị TẮT chứ không
    /// xóa — xóa sẽ kéo theo mọi dòng gán vai trò, gắn lại endpoint là mất sạch cấu hình.
    /// Tắt quyền cũng là cách chặn nhanh một endpoint mà không cần deploy.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Thời điểm tạo (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Thời điểm cập nhật gần nhất (UTC).</summary>
    public DateTime UpdatedDate { get; set; }

    /// <summary>Liên kết ngược tới các role đang có quyền này.</summary>
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
