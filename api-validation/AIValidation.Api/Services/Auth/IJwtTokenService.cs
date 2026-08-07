using AIValidation.Api.Data.Entities.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Sinh access token (JWT) cho user, nhúng claim danh tính, role và quyền.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Tạo access token JWT. Claims gồm: sub (userId), name, email, mỗi role một
    /// claim "role", và mỗi quyền một claim "permission".
    /// </summary>
    /// <returns>Token đã ký và thời điểm hết hạn (UTC).</returns>
    (string Token, DateTime ExpiresAt) CreateAccessToken(
        AppUser user,
        IEnumerable<string> roles,
        IEnumerable<string> permissions);
}
