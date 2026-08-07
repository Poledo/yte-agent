using Microsoft.AspNetCore.Identity;

namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Người dùng hệ thống - kế thừa IdentityUser với khóa Guid.
/// ASP.NET Core Identity lo phần bảo mật chuẩn: hash mật khẩu (PBKDF2),
/// khóa tài khoản (lockout), token xác thực email/đặt lại mật khẩu.
/// Các trường bên dưới là phần mở rộng nghiệp vụ của ứng dụng.
/// </summary>
public class AppUser : IdentityUser<Guid>
{
    /// <summary>Họ tên đầy đủ hiển thị.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Tài khoản còn hiệu lực hay không (khóa mềm, mặc định bật).</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Thời điểm tạo tài khoản (UTC).</summary>
    public DateTime CreatedAt { get; set; }
}
