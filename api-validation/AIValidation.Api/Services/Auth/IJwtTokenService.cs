using AIValidation.Api.Data.Entities.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Sinh access token (JWT) cho user, nhúng claim danh tính, vai trò và trục cơ sở KCB.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Tạo access token JWT. Claims gồm: sub (userId), name, email, mỗi vai trò một
    /// claim "role", cùng "facilityId"/"facilityCode"/"isSuperAdmin".
    ///
    /// KHÔNG nhúng danh sách quyền vào token: quyền sửa được bất cứ lúc nào từ màn
    /// hình quản trị, nhúng vào token thì người dùng phải đăng nhập lại mới có hiệu
    /// lực; và với hơn trăm mã quyền thì token phình tới mức vượt giới hạn header.
    /// Quyền được tra từ CSDL qua cache ở mỗi request.
    /// </summary>
    /// <returns>Token đã ký và thời điểm hết hạn (UTC).</returns>
    (string Token, DateTime ExpiresAt) CreateAccessToken(
        AppUser user,
        IEnumerable<string> roles,
        string? facilityCode = null);
}
