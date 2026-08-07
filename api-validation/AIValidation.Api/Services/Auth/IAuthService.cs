using AIValidation.Api.Models.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Nghiệp vụ xác thực: đăng ký, đăng nhập, làm mới/thu hồi token, quên/đặt lại
/// mật khẩu, xác nhận email, đổi mật khẩu, lấy thông tin user hiện tại.
/// </summary>
public interface IAuthService
{
    Task<ServiceResult<AuthResult>> RegisterAsync(RegisterRequest request, string? ip, CancellationToken ct = default);

    Task<ServiceResult<AuthResult>> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default);

    Task<ServiceResult<AuthResult>> RefreshTokenAsync(string refreshToken, string? ip, CancellationToken ct = default);

    Task<ServiceResult> LogoutAsync(string refreshToken, string? ip, CancellationToken ct = default);

    /// <summary>Sinh token đặt lại mật khẩu. Trả token trong Data để dev dùng (chưa có email service).</summary>
    Task<ServiceResult<string>> ForgotPasswordAsync(string email, CancellationToken ct = default);

    Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);

    Task<ServiceResult> ConfirmEmailAsync(ConfirmEmailRequest request, CancellationToken ct = default);

    Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, string? ip, CancellationToken ct = default);

    Task<ServiceResult<MeResponse>> GetMeAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Xây AuthResult (access + refresh) cho user đã xác thực — dùng chung cho đăng nhập ngoài (Google/Microsoft).</summary>
    Task<AuthResult> BuildAuthResultAsync(Data.Entities.Auth.AppUser user, string? ip, CancellationToken ct = default);
}
