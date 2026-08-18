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

    /// <summary>
    /// Cơ sở KCB mà tài khoản này thuộc về. Null = tài khoản cấp hệ thống
    /// (không gắn cơ sở nào, thấy dữ liệu toàn hệ thống).
    ///
    /// Tài khoản có cơ sở chỉ thấy dữ liệu của cơ sở đó và TOÀN BỘ NHÁNH cấp dưới
    /// — Sở Y tế nhìn được hết các trung tâm y tế huyện trực thuộc, còn trạm y tế
    /// xã chỉ thấy chính mình.
    /// </summary>
    public long? FacilityId { get; set; }

    /// <summary>Cơ sở KCB của tài khoản (navigation).</summary>
    public Facility? Facility { get; set; }

    /// <summary>
    /// Quản trị toàn hệ thống: bỏ qua mọi kiểm tra quyền và mọi lọc theo cơ sở.
    /// Cờ này KHÔNG phải một vai trò — vai trò chỉ là tập mã quyền sửa được từ
    /// màn hình quản trị, còn đây là chốt chặn cuối để không tự khóa mình ra ngoài
    /// khi lỡ tay gỡ hết quyền của vai trò ADMIN.
    /// </summary>
    public bool IsSuperAdmin { get; set; }

    /// <summary>Thời điểm tạo tài khoản (UTC).</summary>
    public DateTime CreatedAt { get; set; }
}
