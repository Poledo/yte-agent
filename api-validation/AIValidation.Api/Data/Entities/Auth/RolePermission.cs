namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Bảng nối nhiều-nhiều giữa Role và Permission.
/// Khóa chính kép (RoleId, PermissionId).
/// </summary>
public class RolePermission
{
    public Guid RoleId { get; set; }

    public Guid PermissionId { get; set; }

    /// <summary>Vai trò trong quan hệ.</summary>
    public AppRole? Role { get; set; }

    /// <summary>Quyền trong quan hệ.</summary>
    public Permission? Permission { get; set; }
}
