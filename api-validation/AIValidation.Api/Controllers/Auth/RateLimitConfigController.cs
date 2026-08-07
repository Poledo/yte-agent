using AIValidation.Api.Authorization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Cấu hình ngưỡng chống spam request (rate limit) lúc runtime. Áp dụng ngay,
/// không cần restart. Yêu cầu quyền System.Admin.
/// </summary>
[Route("api/admin/rate-limit")]
[RequirePermission(Permissions.SystemAdmin)]
public sealed class RateLimitConfigController : AuthControllerBase
{
    private readonly IRateLimitSettings _settings;
    private readonly IAuditService _auditService;

    public RateLimitConfigController(IRateLimitSettings settings, IAuditService auditService)
    {
        _settings = settings;
        _auditService = auditService;
    }

    /// <summary>Ngưỡng đang hiệu lực (đơn vị: request/phút/IP).</summary>
    [HttpGet]
    public IActionResult Get() => Ok(_settings.State);

    /// <summary>Cập nhật ngưỡng (áp dụng ngay, không cần restart) và lưu bền.</summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] RateLimitState state, CancellationToken ct)
    {
        if (state == null)
        {
            return BadRequest(new { message = "Thiếu nội dung cấu hình." });
        }

        var effective = await _settings.UpdateAsync(state, ct);

        await _auditService.LogAsync("System.RateLimit", CurrentUserId,
            entityType: "RateLimit",
            detail: $"chung={effective.GlobalPerMinute}, login={effective.LoginPerMinute}, "
                  + $"forgot={effective.ForgotPasswordPerMinute}, ask={effective.AskPerMinute}, "
                  + $"import={effective.ImportPerMinute}",
            ipAddress: ClientIp, ct: ct);

        return Ok(new
        {
            message = "Đã cập nhật ngưỡng chống spam. Áp dụng ngay.",
            state = effective,
        });
    }
}
