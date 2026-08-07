using AIValidation.Api.Authorization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Quản trị cấu hình extension (task-003 §1.6 + Part 2): chọn hình hài robot
/// ('svg' | 'svgAnim' | 'three') và ghi đè các mốc thời gian hệ sinh hoạt.
/// Áp dụng ngay, lưu bền. Yêu cầu quyền System.Admin.
/// </summary>
[Route("api/admin/extension-config")]
[RequirePermission(Permissions.SystemAdmin)]
public sealed class ExtensionConfigAdminController : AuthControllerBase
{
    private readonly IExtensionConfigStore _store;
    private readonly IAuditService _auditService;

    public ExtensionConfigAdminController(IExtensionConfigStore store, IAuditService auditService)
    {
        _store = store;
        _auditService = auditService;
    }

    /// <summary>Cấu hình hiện tại (để hiển thị/sửa trên web-admin).</summary>
    [HttpGet]
    public IActionResult Get()
    {
        var state = _store.Current;
        return Ok(new
        {
            robotRenderer = state.RobotRenderer,
            life = new
            {
                waitEscalation = state.Life.WaitEscalation.Select(Map),
                seasons = state.Life.Seasons.Select(Map),
                aging = state.Life.Aging.Select(Map),
                waitEscalationRandom = state.Life.WaitEscalationRandom,
            },
            appearance = new
            {
                color = state.Appearance.Color,
                scale = state.Appearance.Scale,
                showLogo = state.Appearance.ShowLogo,
                logoDataUrl = state.Appearance.LogoDataUrl,
            },
        });
    }

    /// <summary>Cập nhật cấu hình (áp dụng ngay, không cần restart) và lưu bền.</summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ExtensionConfigState state, CancellationToken ct)
    {
        if (state == null)
        {
            return BadRequest(new { message = "Thiếu nội dung cấu hình." });
        }

        var effective = await _store.UpdateAsync(state, ct);

        await _auditService.LogAsync("System.ExtensionConfig", CurrentUserId,
            entityType: "ExtensionConfig",
            detail: $"robotRenderer={effective.RobotRenderer}",
            ipAddress: ClientIp, ct: ct);

        return Ok(new
        {
            message = $"Đã lưu cấu hình extension (hình hài: {effective.RobotRenderer}). Áp dụng cho lần tải trang HIS tiếp theo.",
            robotRenderer = effective.RobotRenderer,
        });
    }

    /// <summary>Chuẩn hoá key camelCase (id, atMs).</summary>
    private static object Map(RobotStageThreshold s) => new { id = s.Id, atMs = s.AtMs };
}
