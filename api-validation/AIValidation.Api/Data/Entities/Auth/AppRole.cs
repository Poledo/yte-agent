using Microsoft.AspNetCore.Identity;

namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Vai trò (role) hệ thống - kế thừa IdentityRole với khóa Guid.
/// Mỗi role gắn với một tập Permission qua bảng RolePermission.
/// </summary>
public class AppRole : IdentityRole<Guid>
{
    /// <summary>Mô tả ngắn về vai trò.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Vai trò hệ thống (do seed tạo, không cho phép xóa) — vd SystemAdmin.
    /// </summary>
    public bool IsSystem { get; set; }

    /// <summary>Các quyền chi tiết gắn với vai trò này.</summary>
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
