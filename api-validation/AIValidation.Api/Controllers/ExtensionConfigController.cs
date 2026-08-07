using AIValidation.Api.Configuration;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers;

/// <summary>
/// Cấu hình PUBLIC cho extension, nạp khi trang HIS tải xong (task-003 §1.6 + Part 2).
/// Không cần đăng nhập — chỉ chứa lựa chọn hình hài robot và các mốc thời gian,
/// không có dữ liệu nhạy cảm. Chỉnh sửa nằm ở /api/admin/extension-config.
/// </summary>
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên endpoint này dùng policy "Extension" (mở origin). Các endpoint quản
// trị vẫn giữ policy mặc định chỉ cho origin của web-admin.
[EnableCors("Extension")]
[ApiController]
public sealed class ExtensionConfigController : ControllerBase
{
    private readonly IExtensionConfigStore _store;

    public ExtensionConfigController(IExtensionConfigStore store)
    {
        _store = store ?? throw new ArgumentNullException(nameof(store));
    }

    /// <summary>Cấu hình extension hiệu lực: hình hài robot + ghi đè ngưỡng thời gian.</summary>
    [HttpGet("api/extension-config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
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

    /// <summary>Chuẩn hoá key camelCase (id, atMs) khớp bộ parse của extension.</summary>
    private static object Map(RobotStageThreshold s) => new { id = s.Id, atMs = s.AtMs };
}
