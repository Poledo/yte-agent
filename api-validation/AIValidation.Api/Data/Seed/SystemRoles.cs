namespace AIValidation.Api.Data.Seed;

/// <summary>
/// Mã vai trò hệ thống. Mã là thứ BẤT BIẾN để seeder tìm lại đúng vai trò sau khi
/// người quản trị đổi tên hiển thị.
///
/// LƯU Ý: tuyệt đối KHÔNG dùng các hằng này để phân quyền trong code. Vai trò chỉ là
/// một tập mã quyền sửa được từ màn hình quản trị — viết <c>if (role == ADMIN)</c> là
/// làm hỏng đúng điều mà tầng phân quyền động sinh ra để giải quyết.
/// </summary>
public static class SystemRoles
{
    /// <summary>Quản trị hệ thống: nhận mọi quyền mới quét được (xem RbacOptions.AutoGrantToRoleCode).</summary>
    public const string Admin = "ADMIN";

    /// <summary>Quản trị một cơ sở KCB: tự tạo tài khoản, tự nạp danh mục, tự cấu hình robot cho cơ sở mình.</summary>
    public const string FacilityAdmin = "FACILITY_ADMIN";

    /// <summary>Chỉ xem.</summary>
    public const string Guest = "GUEST";
}
