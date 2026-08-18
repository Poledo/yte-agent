namespace AIValidation.Api.Data.Entities.Auth;

/// <summary>
/// Lý do một request bị tầng phân quyền chặn. Tách thành từng nhánh riêng vì
/// "user chưa có vai trò nào" và "vai trò có rồi nhưng thiếu đúng quyền này" cần
/// hai cách xử lý khác hẳn nhau, mà nhìn vào mã 403 trần thì không phân biệt được.
/// </summary>
public enum PermissionAuditResult
{
    /// <summary>Chưa đăng nhập (không có token hoặc token hỏng).</summary>
    Unauthenticated = 0,

    /// <summary>Route không tra được mã quyền nào — bộ quét chưa chạy hoặc route lạ.</summary>
    PermissionNotFound = 1,

    /// <summary>Quyền có trong CSDL nhưng đang bị tắt (IsActive = false).</summary>
    PermissionDisabled = 2,

    /// <summary>User chưa được gán vai trò nào.</summary>
    NoRole = 3,

    /// <summary>User có vai trò nhưng tập quyền không chứa mã cần thiết.</summary>
    Denied = 4,

    /// <summary>Đáng lẽ bị chặn, nhưng hệ thống đang chạy chế độ Audit nên vẫn cho qua.</summary>
    AuditOnly = 5,
}

/// <summary>
/// Nhật ký các lần bị tầng phân quyền TỪ CHỐI. Chỉ ghi lần từ chối — ghi cả lần
/// thành công thì mỗi request là một dòng INSERT, bảng phình nhanh hơn cả bảng
/// nghiệp vụ mà chẳng ai đọc.
///
/// Đây là công cụ chính để dò xem sau khi đổi sang mã quyền mới thì vai trò nào
/// còn thiếu quyền gì: bật chế độ Audit, chạy vài ngày, đọc bảng này rồi cấp bù.
/// </summary>
public class PermissionAuditLog
{
    public long Id { get; set; }

    /// <summary>User bị chặn (null nếu chưa đăng nhập).</summary>
    public Guid? UserId { get; set; }

    /// <summary>Email/tên đăng nhập tại thời điểm bị chặn.</summary>
    public string? UserName { get; set; }

    /// <summary>Mã quyền mà endpoint yêu cầu (rỗng nếu không tra ra được).</summary>
    public string PermissionCode { get; set; } = string.Empty;

    /// <summary>Phương thức HTTP của request bị chặn.</summary>
    public string HttpMethod { get; set; } = string.Empty;

    /// <summary>Đường dẫn thực tế của request.</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>Lý do bị chặn.</summary>
    public PermissionAuditResult Result { get; set; }

    /// <summary>Địa chỉ IP nguồn.</summary>
    public string? IpAddress { get; set; }

    /// <summary>Thời điểm ghi (UTC).</summary>
    public DateTime CreatedAt { get; set; }
}
