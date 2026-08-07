using AIValidation.Api.Data.Entities.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Quản lý refresh token: cấp mới, xoay vòng (rotate) khi làm mới, thu hồi.
/// Token thô chỉ trả cho client một lần; DB chỉ lưu SHA256 hash.
/// </summary>
public interface IRefreshTokenService
{
    /// <summary>Cấp refresh token mới cho user. Trả token thô (client giữ) và bản ghi đã lưu.</summary>
    Task<(string RawToken, RefreshToken Entity)> IssueAsync(
        Guid userId, string? ip, CancellationToken ct = default);

    /// <summary>
    /// Xác thực token thô, nếu hợp lệ thì thu hồi bản cũ và cấp bản mới (rotate).
    /// Trả null nếu token không hợp lệ/đã thu hồi/hết hạn.
    /// </summary>
    Task<(string RawToken, RefreshToken Entity)?> RotateAsync(
        string rawToken, string? ip, CancellationToken ct = default);

    /// <summary>Thu hồi một refresh token theo token thô. Trả về user nếu thu hồi thành công.</summary>
    Task<Guid?> RevokeAsync(string rawToken, CancellationToken ct = default);

    /// <summary>Tính SHA256 hash (base64) của token thô — để đối chiếu/ghi log.</summary>
    string Hash(string rawToken);
}
