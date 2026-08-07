using AIValidation.Api.Data;
using AIValidation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API thống kê sử dụng cho dashboard web admin (yêu cầu đăng nhập).
///
/// GET /api/stats/usage?from=2026-07-01&amp;to=2026-07-29
/// - from/to là NGÀY theo giờ Việt Nam (UTC+7); "to" bao trọn cả ngày đó.
/// - Bỏ trống → mặc định 7 ngày gần nhất.
/// - Chọn đúng 1 ngày → trả điểm theo GIỜ; nhiều ngày → theo NGÀY (điền đủ
///   các mốc trống bằng 0 để biểu đồ liền mạch).
/// </summary>
// LƯU Ý: route cố ý dùng "dashboard" thay vì "stats" — các extension chặn quảng cáo
// (uBlock/AdGuard, bộ lọc EasyPrivacy) chặn mặc định URL chứa "/stats/" vì tưởng là
// endpoint theo dõi người dùng → client báo net::ERR_BLOCKED_BY_CLIENT.
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class StatsController : ControllerBase
{
    /// <summary>Việt Nam không có giờ mùa hè — cộng thẳng 7 tiếng, chạy đúng trên cả Linux container.</summary>
    private static readonly TimeSpan VnOffset = TimeSpan.FromHours(7);

    private readonly AppDbContext _db;

    public StatsController(AppDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    /// <summary>Chuỗi thống kê lượt hỏi đáp AI + kiểm tra XML 130 theo khoảng ngày.</summary>
    [HttpGet("usage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsageAsync(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var todayVn = (DateTime.UtcNow + VnOffset).Date;
        var fromDate = (from ?? todayVn.AddDays(-6)).Date;
        var toDate = (to ?? todayVn).Date;
        if (toDate < fromDate)
        {
            (fromDate, toDate) = (toDate, fromDate);
        }
        // Chặn khoảng quá dài (bảo vệ query)
        if ((toDate - fromDate).TotalDays > 366)
        {
            fromDate = toDate.AddDays(-366);
        }

        var fromUtc = DateTime.SpecifyKind(fromDate - VnOffset, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(toDate.AddDays(1) - VnOffset, DateTimeKind.Utc);

        var events = await _db.UsageEvents.AsNoTracking()
            .Where(e => e.CreatedAt >= fromUtc && e.CreatedAt < toUtc)
            .Select(e => new { e.EventType, e.CreatedAt, e.HosoCount, e.ErrorCount, e.WarningCount, e.XuatToanRisk })
            .ToListAsync(cancellationToken);

        var byHour = fromDate == toDate;

        // Gom theo mốc (giờ trong ngày, hoặc ngày trong khoảng) — điền đủ mốc trống
        var points = new List<UsagePoint>();
        if (byHour)
        {
            for (var h = 0; h < 24; h++)
            {
                points.Add(new UsagePoint($"{h:00}h", fromDate.AddHours(h)));
            }
        }
        else
        {
            for (var d = fromDate; d <= toDate; d = d.AddDays(1))
            {
                points.Add(new UsagePoint(d.ToString("dd/MM"), d));
            }
        }

        foreach (var e in events)
        {
            var local = e.CreatedAt + VnOffset;
            var idx = byHour ? local.Hour : (int)(local.Date - fromDate).TotalDays;
            if (idx < 0 || idx >= points.Count) continue;

            var p = points[idx];
            if (e.EventType == UsageRecorder.EventAsk) p.Ask++;
            else p.Check++;
            p.Errors += e.ErrorCount;
            if (e.XuatToanRisk) p.Risk++;
        }

        return Ok(new
        {
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            granularity = byHour ? "hour" : "day",
            totalAsk = events.Count(e => e.EventType == UsageRecorder.EventAsk),
            totalCheck = events.Count(e => e.EventType == UsageRecorder.EventXml130Check),
            totalHoso = events.Sum(e => e.HosoCount),
            totalErrors = events.Sum(e => e.ErrorCount),
            totalWarnings = events.Sum(e => e.WarningCount),
            totalRisk = events.Count(e => e.XuatToanRisk),
            points = points.Select(p => new { p.Label, p.Ask, p.Check, p.Errors, p.Risk }),
        });
    }

    /// <summary>
    /// Danh sách lịch sử hoạt động (mới nhất trước) trong khoảng ngày — phục vụ màn
    /// "Lịch sử hoạt động". type = Ask | Xml130Check (bỏ trống = tất cả). Tối đa 500 dòng.
    /// </summary>
    [HttpGet("events")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEventsAsync(
        [FromQuery] string? type,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var todayVn = (DateTime.UtcNow + VnOffset).Date;
        var fromDate = (from ?? todayVn.AddDays(-6)).Date;
        var toDate = (to ?? todayVn).Date;
        if (toDate < fromDate)
        {
            (fromDate, toDate) = (toDate, fromDate);
        }

        var fromUtc = DateTime.SpecifyKind(fromDate - VnOffset, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(toDate.AddDays(1) - VnOffset, DateTimeKind.Utc);

        var query = _db.UsageEvents.AsNoTracking()
            .Where(e => e.CreatedAt >= fromUtc && e.CreatedAt < toUtc);
        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(e => e.EventType == type);
        }

        var rows = await query
            .OrderByDescending(e => e.CreatedAt)
            .Take(500)
            .Select(e => new
            {
                e.Id,
                e.EventType,
                e.CreatedAt,
                e.FacilityCode,
                e.StaffCode,
                e.HosoCount,
                e.ErrorCount,
                e.WarningCount,
                e.XuatToanRisk,
                e.DurationMs,
                e.Preview,
                HasDetail = e.DetailJson != null,
            })
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    /// <summary>Nội dung phản hồi đầy đủ của một lượt (câu trả lời / danh sách vấn đề).</summary>
    [HttpGet("events/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEventDetailAsync(long id, CancellationToken cancellationToken)
    {
        var e = await _db.UsageEvents.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (e == null)
        {
            return NotFound(new { message = $"Không tìm thấy lượt #{id}." });
        }

        return Ok(new
        {
            e.Id,
            e.EventType,
            e.CreatedAt,
            e.FacilityCode,
            e.StaffCode,
            e.HosoCount,
            e.ErrorCount,
            e.WarningCount,
            e.XuatToanRisk,
            e.DurationMs,
            e.Preview,
            e.DetailJson,
        });
    }

    /// <summary>Một mốc trên biểu đồ (giờ hoặc ngày, giờ Việt Nam).</summary>
    private sealed class UsagePoint
    {
        public UsagePoint(string label, DateTime at)
        {
            Label = label;
            At = at;
        }

        public string Label { get; }
        public DateTime At { get; }
        public int Ask { get; set; }
        public int Check { get; set; }
        public int Errors { get; set; }
        public int Risk { get; set; }
    }
}
