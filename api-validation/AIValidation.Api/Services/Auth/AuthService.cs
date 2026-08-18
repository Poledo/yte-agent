using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using AIValidation.Api.Providers.Catalog;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Nghiệp vụ xác thực dựa trên ASP.NET Core Identity (hash mật khẩu, lockout,
/// token email/reset) kết hợp JWT + refresh token và lớp quyền RBAC.
/// Thông báo trả về bằng tiếng Việt.
/// </summary>
public sealed class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IPermissionCache _permissionCache;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly IAuditService _auditService;
    private readonly IEmailSender _emailSender;
    private readonly EmailOptions _emailOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<AppUser> userManager,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IPermissionCache permissionCache,
        IFacilityTreeProvider facilityTree,
        IAuditService auditService,
        IEmailSender emailSender,
        IOptions<EmailOptions> emailOptions,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _permissionCache = permissionCache;
        _facilityTree = facilityTree;
        _auditService = auditService;
        _emailSender = emailSender;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<AuthResult>> RegisterAsync(
        RegisterRequest request, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<AuthResult>.Fail("Email và mật khẩu không được để trống.");
        }

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            return ServiceResult<AuthResult>.Fail("Email đã được sử dụng.", 409);
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName ?? string.Empty,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return ServiceResult<AuthResult>.Fail(DescribeIdentityErrors(created));
        }

        await _auditService.LogAsync("Auth.Register", user.Id, user.Email, "User", user.Id.ToString(), ipAddress: ip, ct: ct);

        var result = await BuildAuthResultAsync(user, ip, ct);
        return ServiceResult<AuthResult>.Ok(result, "Đăng ký thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<AuthResult>> LoginAsync(
        LoginRequest request, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email ?? string.Empty);
        if (user == null)
        {
            return ServiceResult<AuthResult>.Fail("Email hoặc mật khẩu không đúng.", 401);
        }

        if (!user.IsActive)
        {
            return ServiceResult<AuthResult>.Fail("Tài khoản đã bị khóa. Liên hệ quản trị viên.", 403);
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return ServiceResult<AuthResult>.Fail("Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Thử lại sau.", 423);
        }

        var passwordOk = await _userManager.CheckPasswordAsync(user, request.Password ?? string.Empty);
        if (!passwordOk)
        {
            await _userManager.AccessFailedAsync(user);
            return ServiceResult<AuthResult>.Fail("Email hoặc mật khẩu không đúng.", 401);
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        await _auditService.LogAsync("Auth.Login", user.Id, user.Email, ipAddress: ip, ct: ct);

        var result = await BuildAuthResultAsync(user, ip, ct);
        return ServiceResult<AuthResult>.Ok(result, "Đăng nhập thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<AuthResult>> RefreshTokenAsync(
        string refreshToken, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return ServiceResult<AuthResult>.Fail("Thiếu refresh token.");
        }

        var rotated = await _refreshTokenService.RotateAsync(refreshToken, ip, ct);
        if (rotated == null)
        {
            return ServiceResult<AuthResult>.Fail("Refresh token không hợp lệ hoặc đã hết hạn.", 401);
        }

        var user = await _userManager.FindByIdAsync(rotated.Value.Entity.UserId.ToString());
        if (user == null || !user.IsActive)
        {
            return ServiceResult<AuthResult>.Fail("Tài khoản không tồn tại hoặc đã bị khóa.", 401);
        }

        var profile = await GetProfileAsync(user, ct);
        var (accessToken, expiresAt) = _jwtTokenService.CreateAccessToken(
            user, profile.Roles, profile.Facility?.Code);

        var result = new AuthResult(
            accessToken, expiresAt, rotated.Value.RawToken,
            user.Id, user.Email ?? string.Empty, user.FullName,
            profile.Roles, profile.Permissions,
            user.FacilityId, profile.Facility?.Code, profile.Facility?.Name, profile.IsSuperAdmin);

        return ServiceResult<AuthResult>.Ok(result, "Làm mới phiên thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> LogoutAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return ServiceResult.Fail("Thiếu refresh token.");
        }

        var userId = await _refreshTokenService.RevokeAsync(refreshToken, ct);
        if (userId != null)
        {
            await _auditService.LogAsync("Auth.Logout", userId, ipAddress: ip, ct: ct);
        }

        // Luôn trả OK để không lộ token có tồn tại hay không
        return ServiceResult.Ok("Đã đăng xuất.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<string>> ForgotPasswordAsync(string email, CancellationToken ct = default)
    {
        // Thông báo CHUNG cho mọi trường hợp -> không tiết lộ email nào có thật.
        const string genericMessage =
            "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).";

        var user = await _userManager.FindByEmailAsync(email ?? string.Empty);
        if (user == null)
        {
            return ServiceResult<string>.Ok(string.Empty, genericMessage);
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetLink = BuildResetLink(user.Email!, token);

        try
        {
            await _emailSender.SendAsync(
                user.Email!,
                "Đặt lại mật khẩu — Chiến binh y tế số",
                BuildResetEmailHtml(user.FullName, resetLink),
                ct);
        }
        catch (Exception ex)
        {
            // Không lộ lỗi SMTP ra client; vẫn trả thông báo chung.
            _logger.LogError(ex, "Gửi email đặt lại mật khẩu tới {Email} thất bại", email);
        }

        return ServiceResult<string>.Ok(string.Empty, genericMessage);
    }

    /// <summary>Dựng URL trang đặt lại mật khẩu của web-admin kèm email + token.</summary>
    private string BuildResetLink(string email, string token)
    {
        var baseUrl = _emailOptions.WebAppBaseUrl.TrimEnd('/');
        return $"{baseUrl}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }

    /// <summary>Nội dung email HTML hướng dẫn đặt lại mật khẩu.</summary>
    private static string BuildResetEmailHtml(string fullName, string resetLink)
    {
        var greeting = string.IsNullOrWhiteSpace(fullName) ? "bạn" : System.Net.WebUtility.HtmlEncode(fullName);
        return $"""
            <div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
              <p>Xin chào {greeting},</p>
              <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên
                 <strong>Chiến binh y tế số</strong>.</p>
              <p style="margin:24px 0">
                <a href="{resetLink}"
                   style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">
                  Đặt lại mật khẩu
                </a>
              </p>
              <p>Hoặc dán liên kết sau vào trình duyệt:</p>
              <p style="word-break:break-all"><a href="{resetLink}">{resetLink}</a></p>
              <p style="color:#6b7280;font-size:13px">Liên kết có hiệu lực trong thời gian giới hạn. Nếu bạn không yêu cầu,
                 hãy bỏ qua email này — mật khẩu của bạn sẽ không thay đổi.</p>
            </div>
            """;
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email ?? string.Empty);
        if (user == null)
        {
            return ServiceResult.Fail("Yêu cầu không hợp lệ.", 400);
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token ?? string.Empty, request.NewPassword ?? string.Empty);
        if (!result.Succeeded)
        {
            return ServiceResult.Fail(DescribeIdentityErrors(result));
        }

        await _auditService.LogAsync("Auth.ResetPassword", user.Id, user.Email, "User", user.Id.ToString(), ct: ct);
        return ServiceResult.Ok("Đặt lại mật khẩu thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> ConfirmEmailAsync(ConfirmEmailRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email ?? string.Empty);
        if (user == null)
        {
            return ServiceResult.Fail("Yêu cầu không hợp lệ.", 400);
        }

        var result = await _userManager.ConfirmEmailAsync(user, request.Token ?? string.Empty);
        if (!result.Succeeded)
        {
            return ServiceResult.Fail(DescribeIdentityErrors(result));
        }

        return ServiceResult.Ok("Xác nhận email thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> ChangePasswordAsync(
        Guid userId, ChangePasswordRequest request, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return ServiceResult.Fail("Không tìm thấy tài khoản.", 404);
        }

        var result = await _userManager.ChangePasswordAsync(
            user, request.CurrentPassword ?? string.Empty, request.NewPassword ?? string.Empty);
        if (!result.Succeeded)
        {
            return ServiceResult.Fail(DescribeIdentityErrors(result));
        }

        await _auditService.LogAsync("Auth.ChangePassword", user.Id, user.Email, "User", user.Id.ToString(), ipAddress: ip, ct: ct);
        return ServiceResult.Ok("Đổi mật khẩu thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<MeResponse>> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return ServiceResult<MeResponse>.Fail("Không tìm thấy tài khoản.", 404);
        }

        var profile = await GetProfileAsync(user, ct);
        var me = new MeResponse(
            user.Id, user.Email ?? string.Empty, user.FullName,
            user.EmailConfirmed, profile.Roles, profile.Permissions,
            user.FacilityId, profile.Facility?.Code, profile.Facility?.Name, profile.IsSuperAdmin);

        return ServiceResult<MeResponse>.Ok(me);
    }

    /// <inheritdoc/>
    public async Task<AuthResult> BuildAuthResultAsync(AppUser user, string? ip, CancellationToken ct = default)
    {
        var profile = await GetProfileAsync(user, ct);
        var (accessToken, expiresAt) = _jwtTokenService.CreateAccessToken(
            user, profile.Roles, profile.Facility?.Code);
        var (refreshToken, _) = await _refreshTokenService.IssueAsync(user.Id, ip, ct);

        return new AuthResult(
            accessToken, expiresAt, refreshToken,
            user.Id, user.Email ?? string.Empty, user.FullName,
            profile.Roles, profile.Permissions,
            user.FacilityId, profile.Facility?.Code, profile.Facility?.Name, profile.IsSuperAdmin);
    }

    /// <summary>Vai trò + mã quyền + cơ sở KCB của tài khoản, dùng chung cho login/refresh/me.</summary>
    private sealed record UserProfile(
        IReadOnlyList<string> Roles,
        IReadOnlyList<string> Permissions,
        FacilityRef? Facility,
        bool IsSuperAdmin);

    /// <summary>
    /// Dựng hồ sơ quyền của tài khoản. Mã quyền lấy từ <see cref="IPermissionCache"/> —
    /// đúng nguồn mà bộ kiểm quyền lúc request dùng, nên những gì web-admin hiện ra
    /// luôn khớp với những gì server thực sự cho qua.
    /// </summary>
    private async Task<UserProfile> GetProfileAsync(AppUser user, CancellationToken ct)
    {
        var roles = (await _userManager.GetRolesAsync(user)).ToList();

        IReadOnlyList<string> permissions;
        if (user.IsSuperAdmin)
        {
            permissions = new[] { "*" };
        }
        else
        {
            var snapshot = await _permissionCache.GetUserSnapshotAsync(user.Id, ct);
            // Quyền bị tắt ở màn hình Quyền bị loại ngay tại đây: để lọt xuống giao diện
            // thì người dùng thấy nút, bấm vào và nhận 403 mà không hiểu vì sao.
            var states = await _permissionCache.GetPermissionStatesAsync(ct);
            permissions = snapshot == null
                ? Array.Empty<string>()
                : snapshot.Codes
                    .Where(code => states.TryGetValue(code, out var active) && active)
                    .OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
                    .ToList();
        }

        var facility = user.FacilityId.HasValue
            ? await _facilityTree.FindByIdAsync(user.FacilityId.Value, ct)
            : null;

        return new UserProfile(roles, permissions, facility, user.IsSuperAdmin);
    }

    private static string DescribeIdentityErrors(IdentityResult result)
    {
        var messages = result.Errors.Select(e => TranslateIdentityError(e.Code, e.Description));
        return string.Join(" ", messages);
    }

    /// <summary>Dịch một số mã lỗi Identity phổ biến sang tiếng Việt.</summary>
    private static string TranslateIdentityError(string code, string fallback) => code switch
    {
        "DuplicateUserName" or "DuplicateEmail" => "Email đã được sử dụng.",
        "PasswordTooShort" => "Mật khẩu quá ngắn (tối thiểu 8 ký tự).",
        "PasswordRequiresDigit" => "Mật khẩu phải có ít nhất một chữ số.",
        "PasswordRequiresLower" => "Mật khẩu phải có ít nhất một chữ thường.",
        "PasswordRequiresUpper" => "Mật khẩu phải có ít nhất một chữ hoa.",
        "PasswordRequiresNonAlphanumeric" => "Mật khẩu phải có ít nhất một ký tự đặc biệt.",
        "PasswordMismatch" => "Mật khẩu hiện tại không đúng.",
        "InvalidToken" => "Token không hợp lệ hoặc đã hết hạn.",
        _ => fallback,
    };
}
