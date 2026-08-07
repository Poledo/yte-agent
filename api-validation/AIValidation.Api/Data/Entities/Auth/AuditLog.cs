namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Nhật ký kiểm toán — ghi lại các hành động quan trọng (đăng nhập, đổi quyền,
/// khóa user, gán role...) phục vụ truy vết và bảo mật.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; }

    /// <summary>User thực hiện hành động (null nếu ẩn danh/hệ thống).</summary>
    public Guid? UserId { get; set; }

    /// <summary>Tên/email user tại thời điểm ghi log (lưu tách để không phụ thuộc user còn tồn tại).</summary>
    public string? UserName { get; set; }

    /// <summary>Mã hành động, vd "Auth.Login", "User.LockOut", "Role.AssignPermission".</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Loại đối tượng bị tác động, vd "User", "Role".</summary>
    public string? EntityType { get; set; }

    /// <summary>Định danh đối tượng bị tác động.</summary>
    public string? EntityId { get; set; }

    /// <summary>Chi tiết bổ sung (JSON hoặc mô tả tiếng Việt).</summary>
    public string? Detail { get; set; }

    /// <summary>Địa chỉ IP nguồn.</summary>
    public string? IpAddress { get; set; }

    /// <summary>Thời điểm ghi (UTC).</summary>
    public DateTime CreatedAt { get; set; }
}
