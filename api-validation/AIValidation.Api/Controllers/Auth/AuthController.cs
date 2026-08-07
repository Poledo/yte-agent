using AIValidation.Api.Models.Auth;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// API xác thực: đăng ký, đăng nhập, làm mới/thu hồi token, quên/đặt lại mật
/// khẩu, xác nhận email, đổi mật khẩu và lấy thông tin user hiện tại.
/// </summary>
[Route("api/auth")]
public sealed class AuthController : AuthControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Đăng ký tài khoản mới. Trả access + refresh token.</summary>
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        => ToActionResult(await _authService.RegisterAsync(request, ClientIp, ct));

    /// <summary>Đăng nhập bằng email + mật khẩu. Trả access + refresh token.</summary>
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("rl-login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
        => ToActionResult(await _authService.LoginAsync(request, ClientIp, ct));

    /// <summary>Làm mới access token bằng refresh token (xoay vòng token).</summary>
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
        => ToActionResult(await _authService.RefreshTokenAsync(request.RefreshToken, ClientIp, ct));

    /// <summary>Đăng xuất: thu hồi refresh token.</summary>
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
        => ToActionResult(await _authService.LogoutAsync(request.RefreshToken, ClientIp, ct));

    /// <summary>Quên mật khẩu: sinh token đặt lại (dev trả token trong response).</summary>
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EnableRateLimiting("rl-forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
        => ToActionResult(await _authService.ForgotPasswordAsync(request.Email, ct));

    /// <summary>Đặt lại mật khẩu bằng token nhận từ forgot-password.</summary>
    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
        => ToActionResult(await _authService.ResetPasswordAsync(request, ct));

    /// <summary>Xác nhận email bằng token.</summary>
    [AllowAnonymous]
    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request, CancellationToken ct)
        => ToActionResult(await _authService.ConfirmEmailAsync(request, ct));

    /// <summary>Đổi mật khẩu (user đang đăng nhập).</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        if (CurrentUserId is not { } userId)
        {
            return Unauthorized();
        }
        return ToActionResult(await _authService.ChangePasswordAsync(userId, request, ClientIp, ct));
    }

    /// <summary>Thông tin user hiện tại kèm role và quyền.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (CurrentUserId is not { } userId)
        {
            return Unauthorized();
        }
        return ToActionResult(await _authService.GetMeAsync(userId, ct));
    }
}
