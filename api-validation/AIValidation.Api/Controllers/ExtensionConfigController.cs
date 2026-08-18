using AIValidation.Api.Configuration;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Services.Extension;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace AIValidation.Api.Controllers;

/// <summary>
/// Cấu hình PUBLIC cho extension, nạp khi trang HIS tải xong (task-003 §1.6 + Part 2).
/// Không cần đăng nhập — chỉ chứa lựa chọn hình hài robot và các mốc thời gian,
/// không có dữ liệu nhạy cảm. Chỉnh sửa nằm ở /api/admin/extension-config.
///
/// Cấu hình ăn theo cơ sở KCB: khóa bản quyền trong header <c>X-License-Key</c> là thứ
/// nhận diện cơ sở, từ đó lần ngược lên cây đơn vị tìm cấu hình gần nhất.
/// </summary>
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên endpoint này dùng policy "Extension" (mở origin). Các endpoint quản
// trị vẫn giữ policy mặc định chỉ cho origin của web-admin.
[EnableCors("Extension")]
[ApiController]
public sealed class ExtensionConfigController : ControllerBase
{
    private readonly IFacilityExtensionConfigResolver _resolver;

    public ExtensionConfigController(IFacilityExtensionConfigResolver resolver)
    {
        _resolver = resolver ?? throw new ArgumentNullException(nameof(resolver));
    }

    /// <summary>Cấu hình extension hiệu lực: hình hài robot + ghi đè ngưỡng thời gian.</summary>
    [IgnorePermission("Extension gọi bằng khóa bản quyền, không có phiên đăng nhập")]
    [HttpGet("api/extension-config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var licenseKey = Request.Headers["X-License-Key"].FirstOrDefault();

        // Không khóa / khóa sai / khóa hết hạn đều rơi về cấu hình chung chứ không 401:
        // đây chỉ là diện mạo, chặn ở đây là robot biến mất khỏi màn hình HIS vì một lý
        // do chẳng liên quan tới nó. Việc chặn dịch vụ do cổng giấy phép ở API nghiệp vụ lo.
        var effective = await _resolver.ResolveByLicenseKeyAsync(licenseKey, ct);

        Response.Headers.ETag = effective.ETag;
        // Cấu hình đổi là phải thấy sớm, nhưng mở 5 tab HIS không nên là 5 request:
        // no-cache buộc trình duyệt hỏi lại, ETag khiến câu trả lời thường là 304 rỗng.
        Response.Headers.CacheControl = "no-cache, private";

        var inm = Request.Headers[HeaderNames.IfNoneMatch].FirstOrDefault();
        if (!string.IsNullOrEmpty(inm) && ETagMatches(inm, effective.ETag))
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        var state = effective.State;
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
            // Để popup extension nói được "đang dùng cấu hình của <cơ sở>" thay vì người
            // dùng phải đoán vì sao robot không giống thứ họ vừa chỉnh.
            source = new
            {
                facilityId = effective.SourceFacilityId,
                facilityCode = effective.SourceFacilityCode,
                facilityName = effective.SourceFacilityName,
                inherited = effective.SourceFacilityId.HasValue && !effective.IsOwn,
            },
        });
    }

    /// <summary>
    /// If-None-Match có thể là danh sách nhiều thẻ, và proxy hay thêm tiền tố W/ cho
    /// thẻ yếu; so sánh chuỗi trần sẽ trượt và endpoint không bao giờ trả 304.
    /// </summary>
    private static bool ETagMatches(string ifNoneMatch, string current)
    {
        foreach (var raw in ifNoneMatch.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (raw == "*")
            {
                return true;
            }

            var tag = raw.StartsWith("W/", StringComparison.Ordinal) ? raw[2..] : raw;
            if (string.Equals(tag, current, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>Chuẩn hoá key camelCase (id, atMs) khớp bộ parse của extension.</summary>
    private static object Map(RobotStageThreshold s) => new { id = s.Id, atMs = s.AtMs };
}
