namespace AIValidation.Api.Models.Auth;

// ===== DTO cho AuthController =====

/// <summary>Yêu cầu đăng ký tài khoản mới.</summary>
public record RegisterRequest(string Email, string Password, string FullName);

/// <summary>Yêu cầu đăng nhập.</summary>
public record LoginRequest(string Email, string Password);

/// <summary>Yêu cầu làm mới token.</summary>
public record RefreshRequest(string RefreshToken);

/// <summary>Yêu cầu đăng xuất (thu hồi refresh token).</summary>
public record LogoutRequest(string RefreshToken);

/// <summary>Yêu cầu quên mật khẩu (gửi email).</summary>
public record ForgotPasswordRequest(string Email);

/// <summary>Yêu cầu đặt lại mật khẩu bằng token.</summary>
public record ResetPasswordRequest(string Email, string Token, string NewPassword);

/// <summary>Yêu cầu xác nhận email bằng token.</summary>
public record ConfirmEmailRequest(string Email, string Token);

/// <summary>Yêu cầu đổi mật khẩu (user đang đăng nhập).</summary>
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

/// <summary>
/// Kết quả trả về sau đăng nhập/đăng ký/làm mới: access token + refresh token.
/// </summary>
public record AuthResult(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    Guid UserId,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

/// <summary>Thông tin user hiện tại (endpoint GET me).</summary>
public record MeResponse(
    Guid Id,
    string Email,
    string FullName,
    bool EmailConfirmed,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);
