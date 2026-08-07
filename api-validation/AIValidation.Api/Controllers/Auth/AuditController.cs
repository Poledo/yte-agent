using AIValidation.Api.Authorization;
using AIValidation.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Đọc nhật ký kiểm toán. Yêu cầu quyền Audit.View.
/// </summary>
[Route("api/admin/audit")]
[RequirePermission(Permissions.AuditView)]
public sealed class AuditController : AuthControllerBase
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;

    public AuditController(AppDbContext db)
    {
        _db = db;
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
                l.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }
}
