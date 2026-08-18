using AIValidation.Api.Data;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Đọc nhật ký kiểm toán. Yêu cầu quyền Audit.View.
/// </summary>
[Route("api/admin/audit")]
public sealed class AuditController : AuthControllerBase
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;
    private readonly ITenantScope _tenant;
    private readonly IFacilityTreeProvider _facilityTree;

    public AuditController(AppDbContext db, ITenantScope tenant, IFacilityTreeProvider facilityTree)
    {
        _db = db;
        _tenant = tenant;
        _facilityTree = facilityTree;
    }

    /// <summary>
    /// Liệt kê nhật ký (mới nhất trước), phân trang.
    /// Lọc tùy chọn: action (khớp tiền tố, vd "User" hoặc "Auth.Login"),
    /// search (khớp email/tên người thao tác hoặc chi tiết).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? action,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = pageSize is > 0 and <= MaxPageSize ? pageSize : 20;

        var query = _db.AuditLogs.AsNoTracking();

        // Thao tác cấp hệ thống (FacilityId null) không lọt xuống quản trị cơ sở: nhật ký
        // của quản trị hệ thống lộ ra là lộ luôn cả cấu trúc quản trị bên trên.
        var tenant = await _tenant.GetFilterAsync(ct);
        if (!tenant.IsSystemScope)
        {
            var ids = tenant.Ids;
            query = query.Where(l => l.FacilityId != null && ids.Contains(l.FacilityId.Value));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var a = action.Trim();
            query = query.Where(l => l.Action.StartsWith(a));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.UserName!, s) ||
                EF.Functions.ILike(l.Detail!, s) ||
                EF.Functions.ILike(l.EntityId!, s));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new
            {
                l.Id,
                l.Action,
                l.UserId,
                // Nhiều bản ghi cũ không lưu UserName — tra email từ bảng user
                UserName = l.UserName
                    ?? _db.Users.Where(u => u.Id == l.UserId).Select(u => u.Email).FirstOrDefault(),
                l.EntityType,
                l.EntityId,
                l.Detail,
                l.IpAddress,
                l.FacilityId,
                l.CreatedAt,
            })
            .ToListAsync(ct);

        // Mã/tên cơ sở lấy từ cache cây đơn vị — web-admin chỉ hiện cột này cho quản trị
        // hệ thống, quản trị cơ sở thì mọi dòng đều cùng một cơ sở nên cột đó vô nghĩa.
        var facilities = await _facilityTree.MapByIdsAsync(
            items.Where(i => i.FacilityId.HasValue).Select(i => i.FacilityId!.Value), ct);

        var rows = items.Select(i => new
        {
            i.Id,
            i.Action,
            i.UserId,
            i.UserName,
            i.EntityType,
            i.EntityId,
            i.Detail,
            i.IpAddress,
            i.CreatedAt,
            i.FacilityId,
            FacilityCode = i.FacilityId.HasValue && facilities.TryGetValue(i.FacilityId.Value, out var f)
                ? f.Code : null,
            FacilityName = i.FacilityId.HasValue && facilities.TryGetValue(i.FacilityId.Value, out var f2)
                ? f2.Name : null,
        });

        return Ok(new { total, page, pageSize, items = rows });
    }
}
