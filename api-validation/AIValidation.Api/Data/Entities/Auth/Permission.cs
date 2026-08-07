namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Quyền chi tiết (fine-grained) dạng "Resource.Action" — vd "Document.Manage".
/// Đây là danh mục cố định, được seed lúc khởi động; không tạo/sửa qua API.
/// Gán vào role qua bảng RolePermission; khi đăng nhập, mọi quyền của user
/// (gộp từ các role) được nhúng vào access token dưới claim "permission".
/// </summary>
public class Permission
{
    public Guid Id { get; set; }

    /// <summary>Mã quyền duy nhất, dạng "Resource.Action" (vd "Role.Manage").</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Tên hiển thị tiếng Việt.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Nhóm quyền để gom nhóm khi hiển thị (vd "Document").</summary>
    public string Group { get; set; } = string.Empty;

    /// <summary>Thời điểm tạo (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Liên kết ngược tới các role đang có quyền này.</summary>
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
