using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Licensing;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Licensing;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API quản lý hợp đồng bán theo CƠ SỞ KCB: mỗi cơ sở một khóa bản quyền, khóa quyết
/// định cơ sở nào được dùng dịch vụ và cơ sở nào chịu tiền.
///
/// - GET    /api/license              : danh sách hợp đồng (kèm sản lượng kỳ hiện tại)
/// - POST   /api/license              : cấp hợp đồng mới — khóa hiện ĐÚNG MỘT LẦN
/// - PUT    /api/license/{id}         : sửa gói cước, hạn mức, giá, phạm vi, hiệu lực
/// - POST   /api/license/{id}/rotate  : cấp lại khóa (khóa cũ hết hiệu lực ngay)
/// - POST   /api/license/{id}/revoke  : thu hồi
/// - POST   /api/license/{id}/restore : bỏ thu hồi
///
/// Khóa chỉ lưu dạng BĂM (SHA-256). Mất khóa thì cấp lại, không tra lại được — cùng
/// nguyên tắc với mật khẩu, để lộ cơ sở dữ liệu cũng không lộ khóa của khách hàng.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LicenseController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILicenseKeyGenerator _keyGenerator;
    private readonly ILicenseResolver _resolver;
    private readonly ITenantScope _tenant;
    private readonly ILogger<LicenseController> _logger;

    public LicenseController(
        AppDbContext db,
        ILicenseKeyGenerator keyGenerator,
        ILicenseResolver resolver,
        ITenantScope tenant,
        ILogger<LicenseController> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _keyGenerator = keyGenerator ?? throw new ArgumentNullException(nameof(keyGenerator));
        _resolver = resolver ?? throw new ArgumentNullException(nameof(resolver));
        _tenant = tenant ?? throw new ArgumentNullException(nameof(tenant));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>Danh sách hợp đồng, kèm sản lượng đã dùng của kỳ đang chạy.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<LicenseDto>))]
    public async Task<IActionResult> GetAllAsync(
        [FromQuery] bool includeRevoked, CancellationToken cancellationToken)
    {
        var query = _db.FacilityLicenses.Include(l => l.Facility).AsNoTracking();
        if (!includeRevoked)
        {
            query = query.Where(l => l.RevokedAt == null);
        }

        var tenant = await _tenant.GetFilterAsync(cancellationToken);
        if (!tenant.IsSystemScope)
        {
            var ids = tenant.Ids;
            query = query.Where(l => ids.Contains(l.FacilityId));
        }

        var licenses = await query.OrderBy(l => l.FacilityCode).ToListAsync(cancellationToken);
        var period = IBillingRecorder.PeriodOf(DateTime.UtcNow);

        // Một truy vấn gộp cho cả danh sách thay vì đếm từng hợp đồng.
        var used = await _db.BillingRecords
            .Where(r => r.PeriodMonth == period)
            .GroupBy(r => new { r.LicenseId, r.EventType })
            .Select(g => new { g.Key.LicenseId, g.Key.EventType, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return Ok(licenses.Select(l => ToDto(
            l,
            used.FirstOrDefault(u => u.LicenseId == l.Id && u.EventType == UsageRecorder.EventXml130Check)?.Count ?? 0,
            used.FirstOrDefault(u => u.LicenseId == l.Id && u.EventType == UsageRecorder.EventAsk)?.Count ?? 0)));
    }

    /// <summary>
    /// Cấp hợp đồng mới cho một đơn vị. Khóa trả về ở đây là lần DUY NHẤT đọc được —
    /// web admin phải bắt người dùng chép lại trước khi đóng hộp thoại.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IssuedLicenseDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAsync(
        [FromBody] LicenseRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var facility = await _db.Facilities
            .FirstOrDefaultAsync(f => f.Id == request.FacilityId, cancellationToken);
        if (facility == null)
        {
            return BadRequest(new { message = "Đơn vị không tồn tại." });
        }
        if (await GuardAsync(facility.Id, facility.Code, cancellationToken) is { } denied)
        {
            return denied;
        }

        // Một đơn vị một hợp đồng còn hiệu lực: hai khóa cùng lúc thì không biết
        // sản lượng thuộc hợp đồng nào, đối soát cuối kỳ sẽ vênh.
        var existing = await _db.FacilityLicenses
            .AnyAsync(l => l.FacilityId == facility.Id && l.RevokedAt == null, cancellationToken);
        if (existing)
        {
            return BadRequest(new { message =
                $"Đơn vị \"{facility.Name}\" đã có hợp đồng còn hiệu lực. "
                + "Thu hồi hợp đồng cũ trước, hoặc dùng chức năng cấp lại khóa." });
        }

        var error = Validate(request);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        var generated = _keyGenerator.Generate(facility.Code);
        var license = new FacilityLicense
        {
            FacilityId = facility.Id,
            FacilityCode = facility.Code,
            KeyHash = generated.Hash,
            KeyPrefix = generated.Prefix,
            Plan = request.Plan.Trim(),
            MonthlyQuota = request.MonthlyQuota,
            BasePrice = request.BasePrice,
            OverageUnitPrice = request.OverageUnitPrice,
            CoversSubtree = request.CoversSubtree,
            ValidFrom = request.ValidFrom ?? DateTime.UtcNow,
            ValidTo = request.ValidTo,
            IsActive = true,
            Note = request.Note?.Trim(),
            CreatedBy = User.Identity?.Name,
            CreatedAt = DateTime.UtcNow,
        };

        _db.FacilityLicenses.Add(license);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Cấp hợp đồng {LicenseId} cho đơn vị {Code} ({Name}), gói {Plan}",
            license.Id, facility.Code, facility.Name, license.Plan);

        return Ok(new IssuedLicenseDto
        {
            License = ToDto(license, 0, 0),
            Key = generated.Key,
            Message = "Đã cấp khóa bản quyền. Chép lại ngay — khóa CHỈ hiện một lần, "
                + "hệ thống chỉ lưu bản băm nên không tra lại được.",
        });
    }

    /// <summary>Sửa điều khoản hợp đồng. KHÔNG đổi khóa và KHÔNG đổi đơn vị đứng tên.</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(LicenseDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAsync(
        long id, [FromBody] LicenseRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var license = await _db.FacilityLicenses
            .Include(l => l.Facility)
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (license == null)
        {
            return NotFound(new { message = "Không tìm thấy hợp đồng." });
        }
        if (await GuardAsync(license.FacilityId, license.FacilityCode, cancellationToken) is { } denied)
        {
            return denied;
        }

        var error = Validate(request);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        // Đổi đơn vị đứng tên = đổi bên trả tiền giữa chừng, sổ đã ghi sẽ vô nghĩa.
        // Muốn chuyển thì thu hồi hợp đồng cũ và cấp hợp đồng mới cho đơn vị kia.
        license.Plan = request.Plan.Trim();
        license.MonthlyQuota = request.MonthlyQuota;
        license.BasePrice = request.BasePrice;
        license.OverageUnitPrice = request.OverageUnitPrice;
        license.CoversSubtree = request.CoversSubtree;
        license.ValidFrom = request.ValidFrom ?? license.ValidFrom;
        license.ValidTo = request.ValidTo;
        license.IsActive = request.IsActive;
        license.Note = request.Note?.Trim();

        await _db.SaveChangesAsync(cancellationToken);
        _resolver.Invalidate();

        return Ok(ToDto(license, 0, 0));
    }

    /// <summary>
    /// Cấp lại khóa cho hợp đồng đang chạy (lộ khóa, đổi nhân sự...). Khóa cũ mất
    /// hiệu lực NGAY khi lưu — hợp đồng, sản lượng và hóa đơn giữ nguyên.
    /// </summary>
    [HttpPost("{id:long}/rotate")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IssuedLicenseDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RotateAsync(long id, CancellationToken cancellationToken)
    {
        var license = await _db.FacilityLicenses
            .Include(l => l.Facility)
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (license == null)
        {
            return NotFound(new { message = "Không tìm thấy hợp đồng." });
        }
        if (await GuardAsync(license.FacilityId, license.FacilityCode, cancellationToken) is { } denied)
        {
            return denied;
        }

        var generated = _keyGenerator.Generate(license.FacilityCode);
        license.KeyHash = generated.Hash;
        license.KeyPrefix = generated.Prefix;
        await _db.SaveChangesAsync(cancellationToken);
        _resolver.Invalidate();

        _logger.LogWarning("Cấp lại khóa cho hợp đồng {LicenseId} ({Code})", license.Id, license.FacilityCode);

        return Ok(new IssuedLicenseDto
        {
            License = ToDto(license, 0, 0),
            Key = generated.Key,
            Message = "Đã cấp lại khóa. Khóa CŨ ngừng hoạt động ngay — cập nhật khóa mới "
                + "trên tiện ích của tất cả máy trạm thuộc đơn vị này.",
        });
    }

    /// <summary>Thu hồi hợp đồng: khóa ngừng hoạt động, sản lượng đã ghi giữ nguyên để đối soát.</summary>
    [HttpPost("{id:long}/revoke")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeAsync(long id, CancellationToken cancellationToken)
    {
        var license = await _db.FacilityLicenses.FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (license == null)
        {
            return NotFound(new { message = "Không tìm thấy hợp đồng." });
        }
        if (await GuardAsync(license.FacilityId, license.FacilityCode, cancellationToken) is { } denied)
        {
            return denied;
        }

        license.RevokedAt = DateTime.UtcNow;
        license.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
        _resolver.Invalidate();

        _logger.LogWarning("Thu hồi hợp đồng {LicenseId} ({Code})", license.Id, license.FacilityCode);
        return Ok(new { message = $"Đã thu hồi hợp đồng của đơn vị {license.FacilityCode}." });
    }

    /// <summary>Bỏ thu hồi (thu hồi nhầm). Khóa cũ hoạt động lại vì bản băm chưa hề đổi.</summary>
    [HttpPost("{id:long}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreAsync(long id, CancellationToken cancellationToken)
    {
        var license = await _db.FacilityLicenses.FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (license == null)
        {
            return NotFound(new { message = "Không tìm thấy hợp đồng." });
        }
        if (await GuardAsync(license.FacilityId, license.FacilityCode, cancellationToken) is { } denied)
        {
            return denied;
        }

        var conflict = await _db.FacilityLicenses
            .AnyAsync(l => l.FacilityId == license.FacilityId && l.Id != id && l.RevokedAt == null, cancellationToken);
        if (conflict)
        {
            return BadRequest(new { message =
                "Đơn vị này đã có hợp đồng khác còn hiệu lực — thu hồi hợp đồng đó trước." });
        }

        license.RevokedAt = null;
        license.IsActive = true;
        await _db.SaveChangesAsync(cancellationToken);
        _resolver.Invalidate();

        return Ok(new { message = $"Đã khôi phục hợp đồng của đơn vị {license.FacilityCode}." });
    }

    /// <summary>
    /// Kiểm tra khóa bản quyền có hợp lệ không — dùng cho tiện ích khi người dùng
    /// nhập/khôi phục khóa để xác nhận ngay lập tức.
    /// </summary>
    [HttpPost("verify")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> VerifyAsync(CancellationToken cancellationToken)
    {
        var headerName = HttpContext.RequestServices
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<LicensingOptions>>().Value.HeaderName;
        var key = Request.Headers[headerName].FirstOrDefault();

        var resolution = await _resolver.ResolveAsync(key, cancellationToken);
        if (resolution.Status == LicenseStatus.Valid && resolution.License != null)
        {
            return Ok(new
            {
                valid = true,
                message = "Khóa hợp lệ.",
                facilityCode = resolution.License.FacilityCode,
                plan = resolution.License.Plan,
                expiresAt = (DateTime?)resolution.License.ValidTo,
            });
        }

        return Ok(new
        {
            valid = false,
            message = resolution.Message,
        });
    }

    /// <summary>403 nếu hợp đồng thuộc cơ sở ngoài nhánh của người gọi; null nghĩa là cho phép.</summary>
    private async Task<IActionResult?> GuardAsync(
        long facilityId, string facilityCode, CancellationToken cancellationToken)
    {
        var tenant = await _tenant.GetFilterAsync(cancellationToken);
        return tenant.Allows(facilityId) ? null : TenantForbid.OutOfScope(facilityCode, "Hợp đồng này");
    }

    /// <summary>Kiểm tra điều khoản trước khi lưu.</summary>
    private static string? Validate(LicenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Plan))
        {
            return "Chưa nhập tên gói cước.";
        }

        if (request.MonthlyQuota < 0)
        {
            return "Hạn mức hồ sơ không được âm (nhập 0 nếu không giới hạn).";
        }

        if (request.BasePrice < 0 || request.OverageUnitPrice < 0)
        {
            return "Giá không được âm.";
        }

        if (request.ValidTo.HasValue && request.ValidFrom.HasValue && request.ValidTo < request.ValidFrom)
        {
            return "Ngày hết hiệu lực phải sau ngày bắt đầu.";
        }

        return null;
    }

    private static LicenseDto ToDto(FacilityLicense license, int usedUnits, int askCount) => new()
    {
        Id = license.Id,
        FacilityId = license.FacilityId,
        FacilityCode = license.FacilityCode,
        FacilityName = license.Facility?.Name ?? license.FacilityCode,
        KeyPrefix = license.KeyPrefix,
        Plan = license.Plan,
        MonthlyQuota = license.MonthlyQuota,
        BasePrice = license.BasePrice,
        OverageUnitPrice = license.OverageUnitPrice,
        CoversSubtree = license.CoversSubtree,
        ValidFrom = license.ValidFrom,
        ValidTo = license.ValidTo,
        IsActive = license.IsActive,
        RevokedAt = license.RevokedAt,
        Note = license.Note,
        CreatedAt = license.CreatedAt,
        CreatedBy = license.CreatedBy,
        LastUsedAt = license.LastUsedAt,
        UsableNow = license.IsUsableAt(DateTime.UtcNow),
        CurrentPeriodUnits = usedUnits,
        CurrentPeriodAskCount = askCount,
    };
}

/// <summary>Hợp đồng trả về cho web admin. KHÔNG bao giờ chứa khóa, chỉ chứa phần đầu để nhận diện.</summary>
public class LicenseDto
{
    public long Id { get; set; }
    public long FacilityId { get; set; }
    public required string FacilityCode { get; set; }
    public required string FacilityName { get; set; }

    /// <summary>Phần đầu khóa để đối chiếu khi hỗ trợ khách hàng, vd "ZC-58028-K4M2QP...".</summary>
    public required string KeyPrefix { get; set; }

    public required string Plan { get; set; }
    public int MonthlyQuota { get; set; }
    public decimal BasePrice { get; set; }
    public decimal OverageUnitPrice { get; set; }

    /// <summary>Khóa dùng được cho cả các đơn vị cấp dưới trong cây hay không.</summary>
    public bool CoversSubtree { get; set; }

    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public bool IsActive { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }

    /// <summary>Lần cuối khóa được dùng (cập nhật thưa, sai số tới 5 phút).</summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>Ngay lúc này khóa có dùng được không (gộp cả hiệu lực, thu hồi, bật/tắt).</summary>
    public bool UsableNow { get; set; }

    /// <summary>Số hồ sơ đã tính tiền trong kỳ đang chạy.</summary>
    public int CurrentPeriodUnits { get; set; }

    /// <summary>Số lượt hỏi đáp AI trong kỳ đang chạy.</summary>
    public int CurrentPeriodAskCount { get; set; }
}

/// <summary>Kết quả cấp/cấp lại khóa — lần duy nhất khóa gốc đi ra khỏi máy chủ.</summary>
public class IssuedLicenseDto
{
    public required LicenseDto License { get; set; }

    /// <summary>Khóa bản quyền dạng đọc được. Không lưu lại được, chỉ hiện lần này.</summary>
    public required string Key { get; set; }

    public required string Message { get; set; }
}

/// <summary>Dữ liệu cấp mới / sửa điều khoản hợp đồng.</summary>
public record LicenseRequest(
    long FacilityId,
    string Plan,
    int MonthlyQuota,
    decimal BasePrice,
    decimal OverageUnitPrice,
    bool CoversSubtree,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    string? Note,
    bool IsActive = true);
