using Microsoft.AspNetCore.Identity;

namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Vai trò (role) hệ thống - kế thừa IdentityRole với khóa Guid.
/// Mỗi role gắn với một tập Permission qua bảng RolePermission.
/// </summary>
public class AppRole : IdentityRole<Guid>
{
    /// <summary>
    /// Mã vai trò bất biến, viết HOA không dấu — vd "ADMIN", "FACILITY_ADMIN".
    /// Tên hiển thị (<see cref="IdentityRole{TKey}.Name"/>) đổi được tùy ý, còn mã này
    /// là thứ seeder dựa vào để tìm lại vai trò cũ. KHÔNG dùng mã này để phân quyền
    /// trong code: quyền luôn tra qua bảng RolePermission.
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Mô tả ngắn về vai trò.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Vai trò hệ thống (do seed tạo, không cho phép xóa) — vd ADMIN.
    /// </summary>
    public bool IsSystem { get; set; }

    /// <summary>Các quyền chi tiết gắn với vai trò này.</summary>
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
