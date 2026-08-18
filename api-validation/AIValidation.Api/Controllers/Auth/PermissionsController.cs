using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Màn hình Quyền: xem bảng quyền do bộ quét endpoint sinh ra, bật/tắt, quét lại và
/// soi nhật ký từ chối.
///
/// Bảng quyền KHÔNG có thao tác thêm/xóa thủ công: nguồn sự thật là mã nguồn, người
/// quản trị chỉ bật/tắt và đổi tên hiển thị. Thêm tay một mã không gắn với endpoint nào
/// thì mã đó vĩnh viễn không bao giờ được kiểm tới.
/// </summary>
[Route("api/admin/permissions")]
public sealed class PermissionsController : AuthControllerBase
{
    private const int MaxPageSize = 200;

    private readonly IRoleAdminService _service;
    private readonly AppDbContext _db;
    private readonly IPermissionScanner _scanner;
    private readonly IPermissionCache _cache;
    private readonly IAuditService _auditService;

    public PermissionsController(
        IRoleAdminService service,
        AppDbContext db,
        IPermissionScanner scanner,
        IPermissionCache cache,
        IAuditService auditService)
    {
        _service = service;
        _db = db;
        _scanner = scanner;
        _cache = cache;
        _auditService = auditService;
    }

    /// <summary>
    /// Danh sách quyền phẳng, lọc theo nhóm (Category), trạng thái và từ khóa.
    /// isActive bỏ trống = lấy cả bật lẫn tắt.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = pageSize is > 0 and <= MaxPageSize ? pageSize : 50;

        var query = _db.Permissions.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(p => p.Category == c);
        }

        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            query = query.Where(p =>
                EF.Functions.ILike(p.Code, s) ||
                EF.Functions.ILike(p.DisplayName, s) ||
                EF.Functions.ILike(p.Route, s));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Category).ThenBy(p => p.Code)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PermissionDto(
                p.Code, p.DisplayName, p.Category, p.HttpMethod, p.Route, p.IsActive, p.IsSystem))
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>
    /// Toàn bộ quyền gom theo nhóm — dùng cho màn hình gán quyền vào vai trò, nơi cần
    /// thấy hết một lần chứ không phân trang.
    /// </summary>
    [HttpGet("grouped")]
    public async Task<IActionResult> Grouped(CancellationToken ct)
        => Ok(await _service.ListPermissionsAsync(ct));

    /// <summary>Giá trị lọc có sẵn + số đếm, để dựng dropdown mà không phải tải cả bảng.</summary>
    [HttpGet("facets")]
    public async Task<IActionResult> Facets(CancellationToken ct)
    {
        var rows = await _db.Permissions
            .AsNoTracking()
            .Select(p => new { p.Category, p.HttpMethod, p.IsActive })
            .ToListAsync(ct);

        // HttpMethod của một quyền có thể là "GET,POST" (một action nhận nhiều verb),
        // nên phải tách ra trước khi gom, không thì dropdown hiện cả cụm ghép.
        var methods = rows
            .SelectMany(r => r.HttpMethod.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(m => m, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var facets = new PermissionFacetsDto(
            Categories: rows.Select(r => r.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                .ToList(),
            HttpMethods: methods,
            Total: rows.Count,
            ActiveCount: rows.Count(r => r.IsActive),
            InactiveCount: rows.Count(r => !r.IsActive));

        return Ok(facets);
    }

    /// <summary>
    /// Quét lại endpoint và đồng bộ bảng quyền ngay, không phải khởi động lại API.
    /// Dùng sau khi deploy bản có API mới mà lần khởi động bị lỗi quét.
    /// </summary>
    [HttpPost("rescan")]
    public async Task<IActionResult> Rescan(CancellationToken ct)
    {
        var result = await _scanner.SyncAsync(ct);
        _cache.SetRouteMap(_scanner.BuildRouteMap());
        _cache.InvalidateAll();

        await _auditService.LogAsync(
            "Permission.Rescan", CurrentUserId, entityType: "Permission",
            detail: $"quét {result.Scanned}, thêm {result.Added}, cập nhật {result.Updated}, "
                  + $"tắt {result.Deactivated}, bật lại {result.Reactivated}, tự cấp {result.AutoGranted}",
            ipAddress: ClientIp, ct: ct);

        return Ok(result);
    }

    /// <summary>
    /// Bật/tắt hàng loạt quyền theo mã. Tắt quyền là cách chặn nhanh một endpoint
    /// trên môi trường thật mà không cần deploy.
    /// </summary>
    [HttpPost("bulk-toggle")]
    public async Task<IActionResult> BulkToggle(
        [FromBody] BulkTogglePermissionsRequest request, CancellationToken ct)
    {
        var codes = (request?.Codes ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (codes.Count == 0)
        {
            return BadRequest(new { message = "Chưa chọn quyền nào." });
        }

        var rows = await _db.Permissions.Where(p => codes.Contains(p.Code)).ToListAsync(ct);
        var changed = 0;
        var now = DateTime.UtcNow;

        foreach (var row in rows.Where(r => r.IsActive != request!.IsActive))
        {
            row.IsActive = request!.IsActive;
            row.UpdatedDate = now;
            changed++;
        }

        if (changed > 0)
        {
            await _db.SaveChangesAsync(ct);
            _cache.InvalidateAll();
        }

        var notFound = codes
            .Where(c => !rows.Any(r => string.Equals(r.Code, c, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        await _auditService.LogAsync(
            request!.IsActive ? "Permission.Enable" : "Permission.Disable",
            CurrentUserId, entityType: "Permission",
            detail: string.Join(",", codes), ipAddress: ClientIp, ct: ct);

        return Ok(new
        {
            message = $"Đã {(request.IsActive ? "bật" : "tắt")} {changed} quyền.",
            changed,
            notFound,
        });
    }

    /// <summary>
    /// Sửa tên hiển thị của một quyền cho sát nghiệp vụ. Tên do bộ quét đặt chỉ là suy
    /// đoán từ tên action; bản sửa tay ở đây được giữ nguyên qua mọi lần quét sau.
    /// </summary>
    [HttpPut("{code}/display-name")]
    public async Task<IActionResult> UpdateDisplayName(
        string code, [FromBody] UpdatePermissionDisplayNameRequest request, CancellationToken ct)
    {
        var name = request?.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Tên hiển thị không được để trống." });
        }

        var row = await _db.Permissions.FirstOrDefaultAsync(p => p.Code == code, ct);
        if (row == null)
        {
            return NotFound(new { message = $"Không tìm thấy quyền '{code}'." });
        }

        row.DisplayName = name;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditService.LogAsync(
            "Permission.Rename", CurrentUserId, entityType: "Permission", entityId: code,
            detail: name, ipAddress: ClientIp, ct: ct);

        return Ok(new { message = "Đã đổi tên hiển thị." });
    }

    /// <summary>
    /// So bảng quyền trong CSDL với danh sách endpoint đang chạy. Trả lời "quét lại có
    /// thay đổi gì không" trước khi bấm nút, và chỉ ra ngay mã nào lệch.
    /// </summary>
    [HttpGet("sync-status")]
    public async Task<IActionResult> SyncStatus(CancellationToken ct)
    {
        var scanned = _scanner.Scan()
            .Select(p => p.Code)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Chỉ đối chiếu quyền do bộ quét sinh: quyền người quản trị tự tạo
        // (ControllerName rỗng) không gắn endpoint nào nên không thể "mồ côi".
        var rows = await _db.Permissions
            .AsNoTracking()
            .Where(p => p.ControllerName != "")
            .Select(p => new { p.Code, p.IsActive })
            .ToListAsync(ct);

        var inDb = rows.Select(r => r.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missing = scanned.Except(inDb, StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c, StringComparer.OrdinalIgnoreCase).ToList();
        var orphan = rows.Where(r => r.IsActive && !scanned.Contains(r.Code))
            .Select(r => r.Code)
            .OrderBy(c => c, StringComparer.OrdinalIgnoreCase).ToList();

        return Ok(new PermissionSyncStatusDto(
            EndpointCount: scanned.Count,
            DbCount: rows.Count,
            ActiveCount: rows.Count(r => r.IsActive),
            MissingCount: missing.Count,
            OrphanCount: orphan.Count,
            MissingCodes: missing,
            OrphanCodes: orphan,
            LastScanAt: _scanner.LastSync?.CompletedAt));
    }

    /// <summary>
    /// Nhật ký các lần bị tầng phân quyền từ chối (mới nhất trước). Đây là chỗ để dò
    /// vai trò nào còn thiếu quyền gì sau khi đổi sang bộ mã mới.
    /// </summary>
    [HttpGet("audit-logs")]
    public async Task<IActionResult> AuditLogs(
        [FromQuery] string? code,
        [FromQuery] string? result,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = pageSize is > 0 and <= MaxPageSize ? pageSize : 50;

        var query = _db.PermissionAuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(code))
        {
            var c = code.Trim();
            query = query.Where(l => l.PermissionCode == c);
        }

        if (!string.IsNullOrWhiteSpace(result))
        {
            if (!Enum.TryParse<PermissionAuditResult>(result.Trim(), ignoreCase: true, out var parsed))
            {
                return BadRequest(new
                {
                    message = $"Lý do '{result}' không hợp lệ.",
                    allowed = Enum.GetNames<PermissionAuditResult>(),
                });
            }
            query = query.Where(l => l.Result == parsed);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.UserName!, s) ||
                EF.Functions.ILike(l.Path, s));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Đổi enum sang tên ở phía client: gọi ToString() trong biểu thức LINQ thì
        // Npgsql phải dịch sang SQL, không dịch được là ném lỗi lúc chạy.
        var items = rows.Select(l => new
        {
            l.Id,
            l.UserId,
            l.UserName,
            l.PermissionCode,
            l.HttpMethod,
            l.Path,
            Result = l.Result.ToString(),
            l.IpAddress,
            l.CreatedAt,
        });

        return Ok(new { total, page, pageSize, items });
    }
}
