using AIValidation.Api.Authorization;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Licensing;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Licensing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API tính tiền theo cơ sở KCB.
///
/// - GET  /api/billing/usage?period=202608 : bảng kê sản lượng từng cơ sở trong kỳ
/// - GET  /api/billing/usage/{licenseId}   : chi tiết sản lượng một hợp đồng trong kỳ
/// - GET  /api/billing/invoices            : danh sách hóa đơn đã chốt
/// - POST /api/billing/close               : chốt sổ một kỳ → sinh hóa đơn bất biến
///
/// Bảng kê (usage) tính LẠI từ sổ mỗi lần gọi nên luôn theo số hiện tại; hóa đơn thì
/// đóng băng con số của kỳ. Chốt sổ xong mà sổ vẫn phát sinh thêm thì hóa đơn KHÔNG
/// tự đổi — cố ý, vì chứng từ đã phát hành không được tự chạy.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<BillingController> _logger;

    public BillingController(AppDbContext db, ILogger<BillingController> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Bảng kê sản lượng toàn bộ cơ sở trong một kỳ, kèm số tiền TẠM TÍNH theo bảng
    /// giá hiện hành. Không truyền kỳ thì lấy kỳ đang chạy.
    /// </summary>
    [HttpGet("usage")]
    [RequirePermission(Permissions.BillingView)]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(BillingPeriodDto))]
    public async Task<IActionResult> GetUsageAsync(
        [FromQuery] int? period, CancellationToken cancellationToken)
    {
        var target = period ?? IBillingRecorder.PeriodOf(DateTime.UtcNow);

        var rows = await _db.BillingRecords
            .Where(r => r.PeriodMonth == target)
            .GroupBy(r => new { r.LicenseId, r.EventType })
            .Select(g => new { g.Key.LicenseId, g.Key.EventType, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var licenseIds = rows.Select(r => r.LicenseId).Distinct().ToList();
        var licenses = await _db.FacilityLicenses
            .Include(l => l.Facility)
            .Where(l => licenseIds.Contains(l.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var closed = await _db.BillingInvoices
            .Where(i => i.PeriodMonth == target)
            .Select(i => i.LicenseId)
            .ToListAsync(cancellationToken);

        var lines = licenses
            .Select(l => BuildLine(
                l,
                rows.FirstOrDefault(r => r.LicenseId == l.Id && r.EventType == UsageRecorder.EventXml130Check)?.Count ?? 0,
                rows.FirstOrDefault(r => r.LicenseId == l.Id && r.EventType == UsageRecorder.EventAsk)?.Count ?? 0,
                closed.Contains(l.Id)))
            .OrderBy(l => l.FacilityCode, StringComparer.Ordinal)
            .ToList();

        return Ok(new BillingPeriodDto
        {
            Period = target,
            Lines = lines,
            TotalUnits = lines.Sum(l => l.UsedUnits),
            TotalAmount = lines.Sum(l => l.TotalAmount),
            ClosedCount = lines.Count(l => l.Closed),
        });
    }

    /// <summary>
    /// Chi tiết sản lượng một hợp đồng trong kỳ: từng đơn vị phát sinh và từng ngày.
    /// Dùng khi khách hàng thắc mắc con số trên hóa đơn.
    /// </summary>
    [HttpGet("usage/{licenseId:long}")]
    [RequirePermission(Permissions.BillingView)]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(BillingDetailDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDetailAsync(
        long licenseId, [FromQuery] int? period, CancellationToken cancellationToken)
    {
        var target = period ?? IBillingRecorder.PeriodOf(DateTime.UtcNow);

        var license = await _db.FacilityLicenses
            .Include(l => l.Facility)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == licenseId, cancellationToken);
        if (license == null)
        {
            return NotFound(new { message = "Không tìm thấy hợp đồng." });
        }

        var records = await _db.BillingRecords
            .Where(r => r.LicenseId == licenseId && r.PeriodMonth == target)
            .Select(r => new { r.UsedByFacilityCode, r.EventType, r.StaffCode, r.CreatedAt })
            .ToListAsync(cancellationToken);

        // Gom theo giờ Việt Nam vì kỳ tính tiền cũng theo giờ Việt Nam — gom theo UTC
        // sẽ đẩy sản lượng 7 giờ đầu ngày sang ngày hôm trước.
        var byDay = records
            .GroupBy(r => (r.CreatedAt + TimeSpan.FromHours(7)).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture))
            .Select(g => new BillingDayDto
            {
                Day = g.Key,
                Units = g.Count(r => r.EventType == UsageRecorder.EventXml130Check),
                AskCount = g.Count(r => r.EventType == UsageRecorder.EventAsk),
            })
            .OrderBy(d => d.Day, StringComparer.Ordinal)
            .ToList();

        var byFacility = records
            .GroupBy(r => r.UsedByFacilityCode)
            .Select(g => new BillingFacilityDto
            {
                FacilityCode = g.Key,
                Units = g.Count(r => r.EventType == UsageRecorder.EventXml130Check),
                AskCount = g.Count(r => r.EventType == UsageRecorder.EventAsk),
            })
            .OrderByDescending(f => f.Units)
            .ToList();

        var byStaff = records
            .Where(r => !string.IsNullOrWhiteSpace(r.StaffCode))
            .GroupBy(r => r.StaffCode!)
            .Select(g => new BillingStaffDto { StaffCode = g.Key, Units = g.Count() })
            .OrderByDescending(s => s.Units)
            .Take(50)
            .ToList();

        return Ok(new BillingDetailDto
        {
            Period = target,
            Line = BuildLine(
                license,
                records.Count(r => r.EventType == UsageRecorder.EventXml130Check),
                records.Count(r => r.EventType == UsageRecorder.EventAsk),
                await _db.BillingInvoices.AnyAsync(
                    i => i.LicenseId == licenseId && i.PeriodMonth == target, cancellationToken)),
            ByDay = byDay,
            ByFacility = byFacility,
            TopStaff = byStaff,
        });
    }

    /// <summary>Danh sách hóa đơn đã chốt, mới nhất trước.</summary>
    [HttpGet("invoices")]
    [RequirePermission(Permissions.BillingView)]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<InvoiceDto>))]
    public async Task<IActionResult> GetInvoicesAsync(
        [FromQuery] int? period, [FromQuery] long? licenseId, CancellationToken cancellationToken)
    {
        var query = _db.BillingInvoices.AsNoTracking();
        if (period.HasValue)
        {
            query = query.Where(i => i.PeriodMonth == period.Value);
        }
        if (licenseId.HasValue)
        {
            query = query.Where(i => i.LicenseId == licenseId.Value);
        }

        var invoices = await query
            .OrderByDescending(i => i.PeriodMonth)
            .ThenBy(i => i.FacilityCode)
            .ToListAsync(cancellationToken);

        return Ok(invoices.Select(ToDto));
    }

    /// <summary>
    /// Chốt sổ một kỳ: mỗi hợp đồng có phát sinh sinh ra một hóa đơn bất biến.
    ///
    /// Chạy lại lần nữa KHÔNG tạo bản trùng (ràng buộc duy nhất LicenseId+PeriodMonth) —
    /// những hợp đồng đã có hóa đơn được bỏ qua và báo lại số lượng.
    /// </summary>
    [HttpPost("close")]
    [RequirePermission(Permissions.BillingClose)]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(CloseResultDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CloseAsync(
        [FromBody] ClosePeriodRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var current = IBillingRecorder.PeriodOf(DateTime.UtcNow);
        if (request.Period > current)
        {
            return BadRequest(new { message = "Không chốt sổ được kỳ chưa tới." });
        }

        // Kỳ đang chạy vẫn phát sinh thêm sau khi chốt — chỉ cho chốt khi người dùng
        // xác nhận, tránh bấm nhầm rồi phải xóa chứng từ.
        if (request.Period == current && !request.AllowCurrentPeriod)
        {
            return BadRequest(new { message =
                $"Kỳ {request.Period} đang chạy, hồ sơ vẫn phát sinh tiếp. "
                + "Chọn kỳ đã kết thúc, hoặc xác nhận chốt sớm nếu thực sự cần." });
        }

        var rows = await _db.BillingRecords
            .Where(r => r.PeriodMonth == request.Period)
            .GroupBy(r => new { r.LicenseId, r.EventType })
            .Select(g => new { g.Key.LicenseId, g.Key.EventType, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var licenseIds = rows.Select(r => r.LicenseId).Distinct().ToList();
        var licenses = await _db.FacilityLicenses
            .Include(l => l.Facility)
            .Where(l => licenseIds.Contains(l.Id))
            .ToListAsync(cancellationToken);

        var already = await _db.BillingInvoices
            .Where(i => i.PeriodMonth == request.Period)
            .Select(i => i.LicenseId)
            .ToListAsync(cancellationToken);

        var created = new List<BillingInvoice>();
        foreach (var license in licenses.Where(l => !already.Contains(l.Id)))
        {
            var units = rows.FirstOrDefault(
                r => r.LicenseId == license.Id && r.EventType == UsageRecorder.EventXml130Check)?.Count ?? 0;
            var asks = rows.FirstOrDefault(
                r => r.LicenseId == license.Id && r.EventType == UsageRecorder.EventAsk)?.Count ?? 0;
            var overage = license.MonthlyQuota > 0 ? Math.Max(0, units - license.MonthlyQuota) : 0;

            created.Add(new BillingInvoice
            {
                LicenseId = license.Id,
                PeriodMonth = request.Period,
                FacilityCode = license.FacilityCode,
                FacilityName = license.Facility?.Name ?? license.FacilityCode,
                Plan = license.Plan,
                IncludedQuota = license.MonthlyQuota,
                UsedUnits = units,
                OverageUnits = overage,
                AskCount = asks,
                BasePrice = license.BasePrice,
                OverageUnitPrice = license.OverageUnitPrice,
                TotalAmount = license.BasePrice + overage * license.OverageUnitPrice,
                ClosedAt = DateTime.UtcNow,
                ClosedBy = User.Identity?.Name,
            });
        }

        if (created.Count > 0)
        {
            _db.BillingInvoices.AddRange(created);
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Chốt sổ kỳ {Period}: tạo {Created} hóa đơn, bỏ qua {Skipped} hợp đồng đã chốt",
            request.Period, created.Count, already.Count);

        return Ok(new CloseResultDto
        {
            Period = request.Period,
            CreatedCount = created.Count,
            SkippedCount = licenses.Count(l => already.Contains(l.Id)),
            TotalAmount = created.Sum(i => i.TotalAmount),
            Invoices = created.Select(ToDto).ToList(),
            Message = created.Count == 0
                ? $"Kỳ {request.Period} không có hợp đồng nào cần chốt mới."
                : $"Đã chốt {created.Count} hóa đơn cho kỳ {request.Period}.",
        });
    }

    /// <summary>Một dòng bảng kê: sản lượng + tiền tạm tính theo bảng giá HIỆN HÀNH.</summary>
    private static BillingLineDto BuildLine(
        FacilityLicense license, int units, int askCount, bool closed)
    {
        var overage = license.MonthlyQuota > 0 ? Math.Max(0, units - license.MonthlyQuota) : 0;
        return new BillingLineDto
        {
            LicenseId = license.Id,
            FacilityCode = license.FacilityCode,
            FacilityName = license.Facility?.Name ?? license.FacilityCode,
            Plan = license.Plan,
            IncludedQuota = license.MonthlyQuota,
            UsedUnits = units,
            OverageUnits = overage,
            AskCount = askCount,
            BasePrice = license.BasePrice,
            OverageUnitPrice = license.OverageUnitPrice,
            TotalAmount = license.BasePrice + overage * license.OverageUnitPrice,
            Closed = closed,
        };
    }

    private static InvoiceDto ToDto(BillingInvoice invoice) => new()
    {
        Id = invoice.Id,
        LicenseId = invoice.LicenseId,
        Period = invoice.PeriodMonth,
        FacilityCode = invoice.FacilityCode,
        FacilityName = invoice.FacilityName,
        Plan = invoice.Plan,
        IncludedQuota = invoice.IncludedQuota,
        UsedUnits = invoice.UsedUnits,
        OverageUnits = invoice.OverageUnits,
        AskCount = invoice.AskCount,
        BasePrice = invoice.BasePrice,
        OverageUnitPrice = invoice.OverageUnitPrice,
        TotalAmount = invoice.TotalAmount,
        ClosedAt = invoice.ClosedAt,
        ClosedBy = invoice.ClosedBy,
    };
}

/// <summary>Bảng kê một kỳ.</summary>
public class BillingPeriodDto
{
    /// <summary>Kỳ dạng yyyyMM.</summary>
    public int Period { get; set; }

    public List<BillingLineDto> Lines { get; set; } = new();
    public int TotalUnits { get; set; }
    public decimal TotalAmount { get; set; }

    /// <summary>Số hợp đồng đã chốt sổ trong kỳ này.</summary>
    public int ClosedCount { get; set; }
}

/// <summary>Một dòng bảng kê theo cơ sở KCB.</summary>
public class BillingLineDto
{
    public long LicenseId { get; set; }
    public required string FacilityCode { get; set; }
    public required string FacilityName { get; set; }
    public required string Plan { get; set; }
    public int IncludedQuota { get; set; }
    public int UsedUnits { get; set; }
    public int OverageUnits { get; set; }
    public int AskCount { get; set; }
    public decimal BasePrice { get; set; }
    public decimal OverageUnitPrice { get; set; }
    public decimal TotalAmount { get; set; }

    /// <summary>Đã có hóa đơn chốt cho kỳ này chưa.</summary>
    public bool Closed { get; set; }
}

/// <summary>Chi tiết sản lượng một hợp đồng trong kỳ.</summary>
public class BillingDetailDto
{
    public int Period { get; set; }
    public required BillingLineDto Line { get; set; }
    public List<BillingDayDto> ByDay { get; set; } = new();

    /// <summary>Sản lượng theo ĐƠN VỊ PHÁT SINH — hợp đồng phủ cả nhánh thì đây là các đơn vị con.</summary>
    public List<BillingFacilityDto> ByFacility { get; set; } = new();

    public List<BillingStaffDto> TopStaff { get; set; } = new();
}

/// <summary>Sản lượng một ngày (giờ Việt Nam).</summary>
public class BillingDayDto
{
    public required string Day { get; set; }
    public int Units { get; set; }
    public int AskCount { get; set; }
}

/// <summary>Sản lượng của một đơn vị phát sinh trong nhánh.</summary>
public class BillingFacilityDto
{
    public required string FacilityCode { get; set; }
    public int Units { get; set; }
    public int AskCount { get; set; }
}

/// <summary>Sản lượng theo mã nhân viên (do máy trạm khai qua header).</summary>
public class BillingStaffDto
{
    public required string StaffCode { get; set; }
    public int Units { get; set; }
}

/// <summary>Hóa đơn đã chốt.</summary>
public class InvoiceDto
{
    public long Id { get; set; }
    public long LicenseId { get; set; }
    public int Period { get; set; }
    public required string FacilityCode { get; set; }
    public required string FacilityName { get; set; }
    public required string Plan { get; set; }
    public int IncludedQuota { get; set; }
    public int UsedUnits { get; set; }
    public int OverageUnits { get; set; }
    public int AskCount { get; set; }
    public decimal BasePrice { get; set; }
    public decimal OverageUnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
}

/// <summary>Kết quả chốt sổ.</summary>
public class CloseResultDto
{
    public int Period { get; set; }
    public int CreatedCount { get; set; }

    /// <summary>Số hợp đồng bỏ qua vì đã chốt từ trước.</summary>
    public int SkippedCount { get; set; }

    public decimal TotalAmount { get; set; }
    public List<InvoiceDto> Invoices { get; set; } = new();
    public required string Message { get; set; }
}

/// <summary>Yêu cầu chốt sổ một kỳ.</summary>
/// <param name="Period">Kỳ dạng yyyyMM, vd 202607.</param>
/// <param name="AllowCurrentPeriod">Cho phép chốt sớm kỳ đang chạy.</param>
public record ClosePeriodRequest(int Period, bool AllowCurrentPeriod = false);
