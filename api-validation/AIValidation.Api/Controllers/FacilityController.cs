using AIValidation.Api.Authorization;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using AIValidation.Api.Providers.Catalog;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API quản lý cây đơn vị (cơ sở KCB): Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã.
///
/// Cây đơn vị quyết định hồ sơ XML 130 của một cơ sở được đối chiếu bằng danh mục HIS
/// nào: ưu tiên danh mục của CHÍNH cơ sở đó, chưa có thì mượn của đơn vị cấp trên —
/// trừ khi đơn vị tắt cờ "được dùng danh mục đơn vị cấp trên".
///
/// - GET    /api/facility          : danh sách phẳng (kèm số danh mục đã nạp)
/// - GET    /api/facility/tree     : cấu trúc cây lồng nhau
/// - POST   /api/facility          : thêm đơn vị
/// - PUT    /api/facility/{id}     : sửa đơn vị (đổi tên, đổi cha, bật/tắt kế thừa)
/// - DELETE /api/facility/{id}     : xóa đơn vị (đơn vị con thành đơn vị gốc)
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FacilityController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly ILogger<FacilityController> _logger;

    public FacilityController(
        AppDbContext db,
        IFacilityTreeProvider facilityTree,
        ILogger<FacilityController> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _facilityTree = facilityTree ?? throw new ArgumentNullException(nameof(facilityTree));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>Danh sách đơn vị dạng phẳng, kèm số loại danh mục HIS mỗi đơn vị đã nạp.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllAsync(
        [FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var facilities = await LoadAsync(includeInactive, cancellationToken);
        return Ok(facilities);
    }

    /// <summary>Cây đơn vị lồng nhau (đơn vị gốc ở cấp ngoài cùng), sắp xếp theo tên.</summary>
    [HttpGet("tree")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTreeAsync(
        [FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var flat = await LoadAsync(includeInactive, cancellationToken);
        return Ok(BuildTree(flat));
    }

    /// <summary>Thêm một đơn vị mới.</summary>
    [HttpPost]
    [RequirePermission(Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAsync(
        [FromBody] FacilityRequest request, CancellationToken cancellationToken)
    {
        var validation = await ValidateAsync(request, editingId: null, cancellationToken);
        if (validation != null)
        {
            return BadRequest(new { message = validation });
        }

        var facility = new Facility
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Tuyen = request.Tuyen,
            ParentId = request.ParentId,
            InheritCatalogFromParent = request.InheritCatalogFromParent,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            IsActive = true
        };

        _db.Facilities.Add(facility);
        await _db.SaveChangesAsync(cancellationToken);
        _facilityTree.Invalidate();

        _logger.LogInformation("Đã thêm đơn vị {Code} - {Name} ({Tuyen})",
            facility.Code, facility.Name, facility.Tuyen);
        return Ok(new
        {
            facility.Id,
            message = $"Đã thêm đơn vị \"{facility.Name}\" (mã {facility.Code}).",
            warning = await CheckTuyenAsync(request, cancellationToken)
        });
    }

    /// <summary>Sửa một đơn vị: đổi tên, đổi đơn vị cấp trên, bật/tắt kế thừa danh mục.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission(Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAsync(
        long id, [FromBody] FacilityRequest request, CancellationToken cancellationToken)
    {
        var facility = await _db.Facilities.FindAsync(new object[] { id }, cancellationToken);
        if (facility == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn vị #{id}." });
        }

        var validation = await ValidateAsync(request, editingId: id, cancellationToken);
        if (validation != null)
        {
            return BadRequest(new { message = validation });
        }

        facility.Code = request.Code.Trim();
        facility.Name = request.Name.Trim();
        facility.Tuyen = request.Tuyen;
        facility.ParentId = request.ParentId;
        facility.InheritCatalogFromParent = request.InheritCatalogFromParent;
        facility.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        facility.IsActive = request.IsActive;

        await _db.SaveChangesAsync(cancellationToken);
        _facilityTree.Invalidate();

        _logger.LogInformation("Đã cập nhật đơn vị {Code} - {Name} ({Tuyen})",
            facility.Code, facility.Name, facility.Tuyen);
        return Ok(new
        {
            message = $"Đã cập nhật đơn vị \"{facility.Name}\".",
            warning = await CheckTuyenAsync(request, cancellationToken)
        });
    }

    /// <summary>
    /// Xóa một đơn vị. Đơn vị con KHÔNG bị xóa theo mà trở thành đơn vị gốc, để không
    /// mất cả nhánh vì một thao tác nhầm. Danh mục đã nạp của đơn vị vẫn giữ nguyên
    /// (vẫn đối chiếu được theo mã cơ sở), chỉ mất quan hệ kế thừa với cấp trên.
    /// </summary>
    [HttpDelete("{id:long}")]
    [RequirePermission(Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var facility = await _db.Facilities.FindAsync(new object[] { id }, cancellationToken);
        if (facility == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn vị #{id}." });
        }

        var childCount = await _db.Facilities.CountAsync(f => f.ParentId == id, cancellationToken);
        var name = facility.Name;

        _db.Facilities.Remove(facility);
        await _db.SaveChangesAsync(cancellationToken);
        _facilityTree.Invalidate();

        _logger.LogInformation("Đã xóa đơn vị {Code} - {Name} ({Children} đơn vị con thành gốc)",
            facility.Code, name, childCount);
        return Ok(new
        {
            message = childCount > 0
                ? $"Đã xóa đơn vị \"{name}\". {childCount} đơn vị cấp dưới đã chuyển thành đơn vị gốc — hãy gán lại đơn vị cấp trên cho chúng."
                : $"Đã xóa đơn vị \"{name}\"."
        });
    }

    /// <summary>
    /// Xem đơn vị này thực sự dùng danh mục của ai: với mỗi loại danh mục, đơn vị nào
    /// trong chuỗi [chính nó → cha → ông] đang cung cấp. Dùng để người quản trị kiểm
    /// chứng cấu hình kế thừa trước khi chạy kiểm tra hồ sơ.
    /// </summary>
    [HttpGet("{code}/catalog-scope")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCatalogScopeAsync(string code, CancellationToken cancellationToken)
    {
        var chain = await _facilityTree.GetCatalogChainAsync(code, cancellationToken);
        var chainList = chain.ToList();

        var sources = await _db.CatalogSources
            .Where(s => s.IsActive && s.FacilityCode != null && chainList.Contains(s.FacilityCode))
            .Select(s => new { s.CatalogType, s.DisplayName, s.FacilityCode, s.RowCount })
            .ToListAsync(cancellationToken);

        // Loại danh mục nào cũng chỉ lấy đúng một đơn vị: đơn vị gần nhất trong chuỗi
        var effective = sources
            .GroupBy(s => s.CatalogType, StringComparer.Ordinal)
            .Select(g => g
                .OrderBy(s => chainList.IndexOf(s.FacilityCode!))
                .First())
            .Select(s => new
            {
                s.CatalogType,
                s.DisplayName,
                s.FacilityCode,
                s.RowCount,
                Inherited = !string.Equals(s.FacilityCode, code, StringComparison.OrdinalIgnoreCase)
            })
            .OrderBy(s => s.DisplayName)
            .ToList();

        return Ok(new { facilityCode = code, chain = chainList, catalogs = effective });
    }

    /// <summary>Đọc danh sách đơn vị kèm số loại danh mục HIS mỗi đơn vị tự nạp.</summary>
    private async Task<List<FacilityDto>> LoadAsync(bool includeInactive, CancellationToken cancellationToken)
    {
        var query = _db.Facilities.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(f => f.IsActive);
        }

        var facilities = await query
            .OrderBy(f => f.Name)
            .Select(f => new
            {
                f.Id,
                f.Code,
                f.Name,
                f.Tuyen,
                f.ParentId,
                f.InheritCatalogFromParent,
                f.Note,
                f.IsActive
            })
            .ToListAsync(cancellationToken);

        // Số loại danh mục mỗi đơn vị TỰ nạp (không tính phần mượn của cấp trên) —
        // một truy vấn gộp thay vì đếm lồng trong từng dòng.
        var counts = await _db.CatalogSources
            .Where(s => s.IsActive && s.FacilityCode != null)
            .GroupBy(s => s.FacilityCode!)
            .Select(g => new { FacilityCode = g.Key, Count = g.Select(s => s.CatalogType).Distinct().Count() })
            .ToListAsync(cancellationToken);
        var countByCode = counts.ToDictionary(c => c.FacilityCode, c => c.Count, StringComparer.OrdinalIgnoreCase);

        return facilities
            .Select(f => new FacilityDto
            {
                Id = f.Id,
                Code = f.Code,
                Name = f.Name,
                Tuyen = f.Tuyen,
                TuyenLabel = f.Tuyen.Label(),
                ParentId = f.ParentId,
                InheritCatalogFromParent = f.InheritCatalogFromParent,
                Note = f.Note,
                IsActive = f.IsActive,
                OwnCatalogCount = countByCode.GetValueOrDefault(f.Code, 0)
            })
            .ToList();
    }

    /// <summary>Ghép danh sách phẳng thành cây. Đơn vị có cha không tồn tại được coi là gốc.</summary>
    private static List<FacilityDto> BuildTree(List<FacilityDto> flat)
    {
        var byId = flat.ToDictionary(f => f.Id);
        var roots = new List<FacilityDto>();

        foreach (var node in flat)
        {
            if (node.ParentId.HasValue && byId.TryGetValue(node.ParentId.Value, out var parent))
            {
                parent.Children.Add(node);
            }
            else
            {
                roots.Add(node);
            }
        }

        return roots;
    }

    /// <summary>
    /// Kiểm tra dữ liệu đơn vị trước khi lưu. Trả về thông báo lỗi tiếng Việt, null nếu hợp lệ.
    /// Quan trọng nhất là chặn vòng lặp cha ↔ con: đặt cha là chính mình hoặc là một
    /// đơn vị cấp dưới của mình sẽ tạo vòng, làm việc tra danh mục lặp vô hạn.
    /// </summary>
    private async Task<string?> ValidateAsync(
        FacilityRequest request, long? editingId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return "Chưa nhập mã cơ sở KCB.";
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Chưa nhập tên đơn vị.";
        }

        var code = request.Code.Trim();
        var duplicated = await _db.Facilities
            .AnyAsync(f => f.Code == code && (editingId == null || f.Id != editingId), cancellationToken);
        if (duplicated)
        {
            return $"Mã cơ sở \"{code}\" đã được dùng cho đơn vị khác. Mỗi mã cơ sở KCB chỉ thuộc một đơn vị.";
        }

        if (!request.ParentId.HasValue)
        {
            return null;
        }

        if (request.ParentId == editingId)
        {
            return "Không đặt được đơn vị cấp trên là chính nó.";
        }

        var parentExists = await _db.Facilities.AnyAsync(f => f.Id == request.ParentId, cancellationToken);
        if (!parentExists)
        {
            return "Đơn vị cấp trên không tồn tại.";
        }

        if (editingId.HasValue && await IsDescendantAsync(request.ParentId.Value, editingId.Value, cancellationToken))
        {
            return "Không đặt được đơn vị cấp trên là một đơn vị cấp dưới của chính nó — cấu trúc sẽ thành vòng lặp.";
        }

        return null;
    }

    /// <summary>
    /// Đối chiếu tuyến của đơn vị với tuyến của đơn vị cấp trên. Trả về lời nhắc
    /// tiếng Việt khi hai thứ ngược nhau, null nếu không có gì đáng nói.
    ///
    /// Cố tình CHỈ nhắc chứ không chặn: cây tổ chức và tuyến chuyên môn là hai
    /// trục khác nhau, thực tế vẫn có bệnh viện chuyên khoa tỉnh nằm dưới một
    /// bệnh viện chuyên khoa khác, hoặc trạm y tế treo thẳng dưới Sở Y tế. Chặn
    /// cứng thì người quản trị hết đường khai đúng thực tế đơn vị mình.
    /// </summary>
    private async Task<string?> CheckTuyenAsync(
        FacilityRequest request, CancellationToken cancellationToken)
    {
        if (!request.Tuyen.IsSet() || !request.ParentId.HasValue)
        {
            return null;
        }

        var parent = await _db.Facilities
            .Where(f => f.Id == request.ParentId)
            .Select(f => new { f.Name, f.Tuyen })
            .FirstOrDefaultAsync(cancellationToken);
        if (parent == null || !parent.Tuyen.IsSet())
        {
            return null;
        }

        // Bậc càng nhỏ càng là tuyến trên, nên con phải có bậc LỚN hơn cha.
        if (request.Tuyen.Rank() > parent.Tuyen.Rank())
        {
            return null;
        }

        return request.Tuyen == parent.Tuyen
            ? $"Đơn vị này cùng {request.Tuyen.Label()} với đơn vị cấp trên \"{parent.Name}\". Kiểm tra lại nếu không phải chủ ý."
            : $"Đơn vị này là {request.Tuyen.Label()} nhưng đơn vị cấp trên \"{parent.Name}\" lại là {parent.Tuyen.Label()} — cấp dưới đang ở tuyến cao hơn cấp trên.";
    }

    /// <summary>True nếu <paramref name="candidateId"/> nằm trong nhánh dưới của <paramref name="ancestorId"/>.</summary>
    private async Task<bool> IsDescendantAsync(long candidateId, long ancestorId, CancellationToken cancellationToken)
    {
        var edges = await _db.Facilities
            .Where(f => f.ParentId != null)
            .Select(f => new { f.Id, ParentId = f.ParentId!.Value })
            .ToListAsync(cancellationToken);
        var parentOf = edges.ToDictionary(e => e.Id, e => e.ParentId);

        var current = candidateId;
        var guard = 0;
        while (parentOf.TryGetValue(current, out var parent) && guard++ < 100)
        {
            if (parent == ancestorId)
            {
                return true;
            }
            current = parent;
        }
        return false;
    }
}

/// <summary>Dữ liệu một đơn vị trả về cho web admin (dạng phẳng hoặc lồng cây).</summary>
public class FacilityDto
{
    public long Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }

    /// <summary>Tuyến của cơ sở. API cấu hình enum ra chuỗi camelCase nên JSON là "tinhDaKhoa", không phải số.</summary>
    public FacilityTuyen Tuyen { get; set; }

    /// <summary>Nhãn tiếng Việt của <see cref="Tuyen"/> — để web admin và báo cáo khỏi tự dịch mỗi nơi một kiểu.</summary>
    public string TuyenLabel { get; set; } = string.Empty;

    public long? ParentId { get; set; }
    public bool InheritCatalogFromParent { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }

    /// <summary>Số LOẠI danh mục HIS đơn vị này tự nạp (không tính phần mượn của cấp trên).</summary>
    public int OwnCatalogCount { get; set; }

    /// <summary>Các đơn vị cấp dưới trực tiếp (chỉ có giá trị ở API dạng cây).</summary>
    public List<FacilityDto> Children { get; set; } = new();
}

/// <summary>Dữ liệu thêm/sửa một đơn vị.</summary>
public record FacilityRequest(
    string Code,
    string Name,
    long? ParentId,
    bool InheritCatalogFromParent,
    string? Note,
    bool IsActive = true,
    FacilityTuyen Tuyen = FacilityTuyen.KhongXacDinh);
