using System.Security.Claims;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Đăng nhập ngoài qua Google / Microsoft.
/// - GET api/auth/external/{provider}/challenge : chuyển hướng tới nhà cung cấp.
/// - GET api/auth/external/{provider}/callback  : tạo/liên kết user, trả JWT.
/// Chỉ hoạt động khi provider được cấu hình (có ClientId). Nếu chưa cấu hình,
/// scheme không tồn tại và endpoint trả 400.
/// </summary>
[AllowAnonymous]
[Route("api/auth/external")]
public sealed class ExternalAuthController : AuthControllerBase
{
    private readonly SignInManager<AppUser> _signInManager;
    private readonly UserManager<AppUser> _userManager;
    private readonly IAuthService _authService;
    private readonly IAuthenticationSchemeProvider _schemeProvider;

    public ExternalAuthController(
        SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager,
        IAuthService authService,
        IAuthenticationSchemeProvider schemeProvider)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _authService = authService;
        _schemeProvider = schemeProvider;
    }

    /// <summary>Bắt đầu luồng đăng nhập ngoài: chuyển hướng tới nhà cung cấp.</summary>
    [HttpGet("{provider}/challenge")]
    public async Task<IActionResult> Challenge(string provider)
    {
        var scheme = await ResolveSchemeAsync(provider);
        if (scheme == null)
        {
            return BadRequest(new { message = $"Chưa cấu hình đăng nhập {provider}." });
        }

        var redirectUrl = Url.Action(nameof(Callback), "ExternalAuth", new { provider }, Request.Scheme);
        var properties = _signInManager.ConfigureExternalAuthenticationProperties(scheme, redirectUrl);
        return Challenge(properties, scheme);
    }

    /// <summary>Xử lý callback: lấy thông tin từ nhà cung cấp, tạo/liên kết user, trả JWT.</summary>
    [HttpGet("{provider}/callback")]
    public async Task<IActionResult> Callback(string provider)
    {
        var scheme = await ResolveSchemeAsync(provider);
        if (scheme == null)
        {
            return BadRequest(new { message = $"Chưa cấu hình đăng nhập {provider}." });
        }

        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info == null)
        {
            return BadRequest(new { message = "Không lấy được thông tin đăng nhập ngoài. Vui lòng thử lại." });
        }

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "Tài khoản ngoài không cung cấp email. Không thể đăng nhập." });
        }

        // Đã liên kết trước đó?
        var user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
        if (user == null)
        {
            // Liên kết với user cùng email nếu có, ngược lại tạo mới
            user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                var fullName = info.Principal.FindFirstValue(ClaimTypes.Name) ?? email;
                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = email,
                    Email = email,
                    FullName = fullName,
                    EmailConfirmed = true, // email đã được nhà cung cấp xác thực
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                };
                var created = await _userManager.CreateAsync(user);
                if (!created.Succeeded)
                {
                    return BadRequest(new { message = "Không tạo được tài khoản từ đăng nhập ngoài." });
                }
            }

            await _userManager.AddLoginAsync(user, info);
        }

        if (!user.IsActive)
        {
            return StatusCode(403, new { message = "Tài khoản đã bị khóa. Liên hệ quản trị viên." });
        }

        var result = await _authService.BuildAuthResultAsync(user, ClientIp);
        return Ok(new { message = "Đăng nhập thành công.", data = result });
    }

    /// <summary>Ánh xạ tên provider sang scheme; trả null nếu chưa được đăng ký (chưa cấu hình).</summary>
    private async Task<string?> ResolveSchemeAsync(string provider)
    {
        var scheme = provider.ToLowerInvariant() switch
        {
            "google" => GoogleDefaults.AuthenticationScheme,
            "microsoft" => MicrosoftAccountDefaults.AuthenticationScheme,
            _ => null,
        };

        if (scheme == null)
        {
            return null;
        }

        var registered = await _schemeProvider.GetSchemeAsync(scheme);
        return registered == null ? null : scheme;
    }
}
