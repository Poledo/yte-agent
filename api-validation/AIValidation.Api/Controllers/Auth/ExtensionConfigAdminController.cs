using System.Security.Claims;
using AIValidation.Api.Configuration;
using AIValidation.Api.Data;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services.Auth;
using AIValidation.Api.Services.Extension;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Quản trị cấu hình extension (task-003 §1.6 + Part 2): chọn hình hài robot
/// ('svg' | 'svgAnim' | 'three') và ghi đè các mốc thời gian hệ sinh hoạt.
/// Áp dụng ngay, lưu bền.
///
/// Hai tầng cấu hình:
/// <list type="bullet">
/// <item>CHUNG (các endpoint không có <c>facility</c>) — nền của toàn hệ thống, chỉ
/// quản trị hệ thống sửa được.</item>
/// <item>THEO CƠ SỞ (<c>facility/{id}</c>) — quản trị cơ sở tự sửa cho nhánh của mình;
/// không đặt thì thừa hưởng cấp trên rồi tới cấu hình chung.</item>
/// </list>
/// </summary>
[Route("api/admin/extension-config")]
public sealed class ExtensionConfigAdminController : AuthControllerBase
{
    private readonly IExtensionConfigStore _store;
    private readonly IFacilityExtensionConfigResolver _resolver;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly ITenantScope _tenant;
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;

    public ExtensionConfigAdminController(
        IExtensionConfigStore store,
        IFacilityExtensionConfigResolver resolver,
        IFacilityTreeProvider facilityTree,
        ITenantScope tenant,
        AppDbContext db,
        IAuditService auditService)
    {
        _store = store;
        _resolver = resolver;
        _facilityTree = facilityTree;
        _tenant = tenant;
        _db = db;
        _auditService = auditService;
    }

    /// <summary>Cấu hình chung hiện tại (để hiển thị/sửa trên web-admin).</summary>
    [HttpGet]
    public IActionResult Get() => Ok(Shape(_store.Current));

    /// <summary>Cập nhật cấu hình chung (áp dụng ngay, không cần restart) và lưu bền.</summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ExtensionConfigState state, CancellationToken ct)
    {
        if (state == null)
        {
            return BadRequest(new { message = "Thiếu nội dung cấu hình." });
        }

        // Cấu hình chung là nền của MỌI cơ sở chưa tự đặt, nên chỉ quản trị hệ thống
        // được sửa - để quản trị một cơ sở đổi được nó là họ đổi diện mạo của cả nước.
        if (!_tenant.IsSystemScope)
        {
            return TenantForbid.OutOfScope(what: "Cấu hình robot chung");
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

    /// <summary>
    /// Danh sách cơ sở đang có cấu hình RIÊNG, để màn hình quản trị biết chỗ nào đã
    /// ghi đè mà không phải bấm thử từng cơ sở trong cây.
    /// </summary>
    [HttpGet("facilities")]
    public async Task<IActionResult> ListOverrides(CancellationToken ct)
    {
        var filter = await _tenant.GetFilterAsync(ct);

        var query = _db.FacilityExtensionConfigs.AsNoTracking();
        if (!filter.IsSystemScope)
        {
            query = query.Where(c => filter.Ids.Contains(c.FacilityId));
        }

        var rows = await query
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new { c.FacilityId, c.UpdatedAt, c.UpdatedBy })
            .ToListAsync(ct);

        var names = await _facilityTree.MapByIdsAsync(rows.Select(r => r.FacilityId), ct);

        return Ok(rows.Select(r => new
        {
            facilityId = r.FacilityId,
            facilityCode = names.TryGetValue(r.FacilityId, out var f) ? f.Code : null,
            facilityName = names.TryGetValue(r.FacilityId, out var f2) ? f2.Name : null,
            updatedAt = r.UpdatedAt,
            updatedBy = r.UpdatedBy,
        }));
    }

    /// <summary>
    /// Cấu hình HIỆU LỰC của một cơ sở kèm cho biết nó là của chính cơ sở hay đang
    /// thừa hưởng - thiếu thông tin này thì người dùng sửa xong không thấy đổi và
    /// không hiểu vì sao (họ đang xem bản thừa hưởng, chưa hề tạo bản riêng).
    /// </summary>
    [HttpGet("facility/{facilityId:long}")]
    public async Task<IActionResult> GetForFacility(long facilityId, CancellationToken ct)
    {
        if (!await _tenant.CanAccessAsync(facilityId, ct))
        {
            return TenantForbid.OutOfScope(await FacilityLabelAsync(facilityId, ct), "Cấu hình robot");
        }

        var effective = await _resolver.ResolveAsync(facilityId, ct);
        var own = await _resolver.GetOwnAsync(facilityId, ct);

        return Ok(new
        {
            hasOwnConfig = own != null,
            inheritedFrom = effective.SourceFacilityId.HasValue && !effective.IsOwn
                ? new { facilityId = effective.SourceFacilityId, code = effective.SourceFacilityCode, name = effective.SourceFacilityName }
                : null,
            effective = Shape(effective.State),
        });
    }

    /// <summary>Ghi đè cấu hình riêng cho một cơ sở.</summary>
    [HttpPut("facility/{facilityId:long}")]
    public async Task<IActionResult> UpdateForFacility(
        long facilityId, [FromBody] ExtensionConfigState state, CancellationToken ct)
    {
        if (state == null)
        {
            return BadRequest(new { message = "Thiếu nội dung cấu hình." });
        }

        if (!await _tenant.CanAccessAsync(facilityId, ct))
        {
            return TenantForbid.OutOfScope(await FacilityLabelAsync(facilityId, ct), "Cấu hình robot");
        }

        var facility = await _facilityTree.FindByIdAsync(facilityId, ct);
        if (facility == null)
        {
            return NotFound(new { message = "Không tìm thấy cơ sở KCB." });
        }

        var effective = await _resolver.SaveAsync(facilityId, state, CurrentUserName, ct);

        await _auditService.LogAsync("System.ExtensionConfig", CurrentUserId,
            entityType: "ExtensionConfig",
            entityId: facilityId.ToString(),
            detail: $"facility={facility.Code}; robotRenderer={effective.RobotRenderer}",
            ipAddress: ClientIp, ct: ct);

        return Ok(new
        {
            message = $"Đã lưu cấu hình robot riêng cho {facility.Name} ({facility.Code}). "
                    + "Máy trạm của cơ sở nhận cấu hình mới ở lần tải trang HIS tiếp theo.",
            robotRenderer = effective.RobotRenderer,
        });
    }

    /// <summary>Bỏ cấu hình riêng để cơ sở quay lại thừa hưởng cấp trên.</summary>
    [HttpDelete("facility/{facilityId:long}")]
    public async Task<IActionResult> ClearForFacility(long facilityId, CancellationToken ct)
    {
        if (!await _tenant.CanAccessAsync(facilityId, ct))
        {
            return TenantForbid.OutOfScope(await FacilityLabelAsync(facilityId, ct), "Cấu hình robot");
        }

        var removed = await _resolver.ClearAsync(facilityId, ct);
        if (!removed)
        {
            return Ok(new { message = "Cơ sở này vốn chưa có cấu hình riêng, đang thừa hưởng cấp trên.", removed = false });
        }

        await _auditService.LogAsync("System.ExtensionConfig", CurrentUserId,
            entityType: "ExtensionConfig",
            entityId: facilityId.ToString(),
            detail: "clear",
            ipAddress: ClientIp, ct: ct);

        var effective = await _resolver.ResolveAsync(facilityId, ct);
        return Ok(new
        {
            message = effective.SourceFacilityId.HasValue
                ? $"Đã bỏ cấu hình riêng. Cơ sở quay lại dùng cấu hình của {effective.SourceFacilityName} ({effective.SourceFacilityCode})."
                : "Đã bỏ cấu hình riêng. Cơ sở quay lại dùng cấu hình chung của hệ thống.",
            removed = true,
        });
    }

    /// <summary>Tên người sửa để hiển thị trong danh sách, không dùng cho phân quyền.</summary>
    private string? CurrentUserName =>
        User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name);

    /// <summary>Nhãn "Tên (mã)" cho thông báo 403; cơ sở lạ thì trả về chính con số.</summary>
    private async Task<string> FacilityLabelAsync(long facilityId, CancellationToken ct)
    {
        var facility = await _facilityTree.FindByIdAsync(facilityId, ct);
        return facility == null ? facilityId.ToString() : $"{facility.Name} ({facility.Code})";
    }

    private static object Shape(ExtensionConfigState state) => new
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
    };

    /// <summary>Chuẩn hoá key camelCase (id, atMs).</summary>
    private static object Map(RobotStageThreshold s) => new { id = s.Id, atMs = s.AtMs };
}
