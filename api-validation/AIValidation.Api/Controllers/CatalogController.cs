using AIValidation.Api.Data;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Catalog;
using AIValidation.Api.Services.Rag;
using AIValidation.Api.Services.Tenancy;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API quản lý danh mục HIS (thuốc, dịch vụ kỹ thuật, CĐHA, xét nghiệm, giường,
/// và các danh mục tham chiếu) dùng để đối chiếu khi kiểm tra hồ sơ XML 130.
///
/// Danh mục thay đổi thường xuyên nên hỗ trợ đầy đủ vòng đời:
/// - POST   /api/catalog/import        : nạp file Excel (.xls/.xlsx), mặc định thay thế bản cũ cùng loại + cơ sở
/// - GET    /api/catalog/sources       : liệt kê danh mục đã nạp
/// - DELETE /api/catalog/sources/{id}  : gỡ hẳn một danh mục (xóa cả dữ liệu của nó)
/// - GET    /api/catalog/items         : tra cứu mục trong danh mục
/// - GET    /api/catalog/profiles      : các loại danh mục hệ thống nhận diện được
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CatalogController : ControllerBase
{
    private readonly ICatalogImportService _importService;
    private readonly ICatalogProfileProvider _profileProvider;
    private readonly IFileStorage _fileStorage;
    private readonly IDocumentTextExtractor _textExtractor;
    private readonly IDocumentIngestService _documentIngest;
    private readonly IEmbeddingIndex _embeddingIndex;
    private readonly ITenantScope _tenant;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly AppDbContext _db;
    private readonly ILogger<CatalogController> _logger;

    public CatalogController(
        ICatalogImportService importService,
        ICatalogProfileProvider profileProvider,
        IFileStorage fileStorage,
        IDocumentTextExtractor textExtractor,
        IDocumentIngestService documentIngest,
        IEmbeddingIndex embeddingIndex,
        ITenantScope tenant,
        IFacilityTreeProvider facilityTree,
        AppDbContext db,
        ILogger<CatalogController> logger)
    {
        _importService = importService ?? throw new ArgumentNullException(nameof(importService));
        _profileProvider = profileProvider ?? throw new ArgumentNullException(nameof(profileProvider));
        _fileStorage = fileStorage ?? throw new ArgumentNullException(nameof(fileStorage));
        _textExtractor = textExtractor ?? throw new ArgumentNullException(nameof(textExtractor));
        _documentIngest = documentIngest ?? throw new ArgumentNullException(nameof(documentIngest));
        _embeddingIndex = embeddingIndex ?? throw new ArgumentNullException(nameof(embeddingIndex));
        _tenant = tenant ?? throw new ArgumentNullException(nameof(tenant));
        _facilityTree = facilityTree ?? throw new ArgumentNullException(nameof(facilityTree));
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Nạp một file danh mục Excel. Loại danh mục tự nhận diện theo tên file/cấu trúc cột.
    ///
    /// mode=replace (mặc định): thay thế danh mục cùng loại của cùng cơ sở KCB.
    /// mode=append: giữ bản cũ, thêm nguồn mới.
    /// facility: mã cơ sở KCB, chỉ dùng cho danh mục KHÔNG có cột mã cơ sở
    /// (danh mục nhân viên, đơn vị chuyển tuyến). Không truyền thì các rule
    /// đối chiếu theo cơ sở sẽ bỏ qua danh mục này.
    /// knowledge=false (mặc định): import CHỈ nạp vào bảng đối chiếu, KHÔNG tự động
    /// đưa vào kho tri thức. Việc nạp toàn văn vào kho tri thức là thao tác chủ động
    /// riêng trên màn hình danh mục (POST sources/{id}/knowledge). Truyền knowledge=true
    /// để giữ hành vi cũ (nạp luôn cả toàn văn khi import).
    /// skipUnchanged=true: file y hệt bản đang hiệu lực thì bỏ qua, không nạp lại —
    /// dùng cho extension nạp cả bộ danh mục thẳng từ HIS, phần lớn file không đổi.
    /// </summary>
    [IgnorePermission("Extension gọi bằng khóa bản quyền, không có phiên đăng nhập")]
    [HttpPost("import")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(CatalogImportResult))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(100 * 1024 * 1024)]
    public async Task<IActionResult> ImportAsync(
        [FromQuery] string? mode,
        [FromQuery] string? facility,
        [FromQuery] bool knowledge = false,
        [FromQuery] bool skipUnchanged = false,
        CancellationToken cancellationToken = default)
    {
        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
        {
            return BadRequest(new { message = "Thiếu file danh mục (multipart field \"file\")." });
        }

        var file = Request.Form.Files[0];
        var replace = !string.Equals(mode, "append", StringComparison.OrdinalIgnoreCase);

        // Endpoint này extension gọi bằng khóa bản quyền (không có phiên đăng nhập) — cổng
        // giấy phép lo phần đó. Còn khi web-admin gọi thì phải chặn: quản trị cơ sở A nạp
        // danh mục mang mã cơ sở C sẽ ghi đè danh mục đối chiếu của C.
        if (_tenant.IsAuthenticated && !_tenant.IsSystemScope)
        {
            var scoped = await ResolveWriteFacilityAsync(facility, cancellationToken);
            if (scoped.Denied != null)
            {
                return scoped.Denied;
            }
            facility = scoped.FacilityCode;
        }

        try
        {
            // Đệm file để vừa nạp danh mục vừa lưu bản gốc xem lại
            await using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, cancellationToken);

            buffer.Position = 0;
            var result = await _importService.ImportAsync(
                buffer, file.FileName, replace, facility, skipUnchanged, cancellationToken);

            // File không đổi → không tạo nguồn mới, giữ nguyên bản gốc đã lưu
            if (result.Skipped)
            {
                return Ok(result);
            }

            buffer.Position = 0;
            await _fileStorage.SaveAsync("catalog", result.SourceId, file.FileName, buffer, cancellationToken);

            // Mặc định import KHÔNG tự nạp kho tri thức — đó là thao tác chủ động riêng
            // trên màn hình danh mục. Chỉ nạp khi client truyền knowledge=true (hành vi cũ).
            var message = result.Message;
            if (knowledge)
            {
                try
                {
                    buffer.Position = 0;
                    await IngestSourceKnowledgeAsync(
                        result.DisplayName, file.FileName, buffer, facility, cancellationToken);
                    message += " Toàn văn file cũng đã được nạp vào kho tri thức — trợ lý hỏi–đáp tra cứu được nội dung danh mục này.";
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không nạp được toàn văn danh mục {File} vào kho tri thức", file.FileName);
                    message += " (Lưu ý: chưa nạp được toàn văn vào kho tri thức — trợ lý hỏi–đáp sẽ không tra được nội dung file này.)";
                }
            }

            return Ok(result with { Message = message });
        }
        catch (NotSupportedException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (FormatException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Liệt kê danh mục đã nạp (mới nhất trước).
    /// includeInactive=true: kèm cả danh mục đã gỡ (để khôi phục).
    /// </summary>
    [HttpGet("sources")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSourcesAsync(
        [FromQuery] bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _db.CatalogSources.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(s => s.IsActive);
        }

        // Quản trị cơ sở chỉ thấy danh mục của nhánh mình, cộng danh mục DÙNG CHUNG
        // (không gắn mã cơ sở) — thứ mọi cơ sở đều đối chiếu tới.
        var tenant = await _tenant.GetFilterAsync(cancellationToken);
        if (!tenant.IsSystemScope)
        {
            query = query.Where(s => s.FacilityCode == null || tenant.Codes.Contains(s.FacilityCode));
        }

        var sources = await query
            .OrderByDescending(s => s.ImportedAt)
            .Select(s => new
            {
                s.Id,
                s.CatalogType,
                s.DisplayName,
                s.FileName,
                s.FacilityCode,
                s.RowCount,
                s.ImportedAt,
                s.IsActive,
                MappedCodeCount = s.Items.Count(i => i.Code != null)
            })
            .ToListAsync(cancellationToken);

        // Đánh dấu danh mục nào đã có bản toàn văn trong kho tri thức (theo tên file).
        // Một truy vấn gộp thay vì N truy vấn con.
        var fileNames = sources.Select(s => s.FileName).Distinct().ToList();
        var inKnowledge = await _db.MedicalDocuments
            .Where(d => fileNames.Contains(d.SourceFileName))
            .Select(d => d.SourceFileName!)
            .Distinct()
            .ToListAsync(cancellationToken);
        var inKnowledgeSet = inKnowledge.ToHashSet();

        // Tên cơ sở lấy từ cache cây đơn vị, không join thêm bảng. Luôn trả về, kể cả cho
        // quản trị cơ sở — web-admin tự quyết có hiện cột "Cơ sở" hay không.
        var facilityNames = await _facilityTree.MapByCodesAsync(
            sources.Select(s => s.FacilityCode).Where(c => c != null)!, cancellationToken);

        var result = sources.Select(s => new
        {
            s.Id,
            s.CatalogType,
            s.DisplayName,
            s.FileName,
            s.FacilityCode,
            FacilityName = s.FacilityCode != null && facilityNames.TryGetValue(s.FacilityCode, out var f)
                ? f.Name
                : null,
            s.RowCount,
            s.ImportedAt,
            s.IsActive,
            s.MappedCodeCount,
            InKnowledgeBase = inKnowledgeSet.Contains(s.FileName)
        });

        return Ok(result);
    }

    /// <summary>
    /// Xóa HẲN một danh mục khỏi DB: gỡ luôn các mục danh mục (catalog_items theo
    /// cascade) VÀ bản tri thức toàn văn đã nạp kèm (cùng tên file) — trợ lý hỏi–đáp
    /// không còn tra ra nội dung danh mục đã xóa. KHÔNG khôi phục lại được.
    /// </summary>
    [HttpDelete("sources/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSourceAsync(long id, CancellationToken cancellationToken)
    {
        var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
        if (source == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục #{id}." });
        }

        var denied = await GuardWriteAsync(source, cancellationToken);
        if (denied != null)
        {
            return denied;
        }

        var displayName = source.DisplayName;
        var rowCount = source.RowCount;
        var catalogType = source.CatalogType;
        var fileName = source.FileName;

        // Xóa bản tri thức toàn văn nạp kèm (cùng tên file) — chunk + vector HNSW
        // biến mất theo cascade DocumentChunk → MedicalDocument.
        var removedDocs = await RemoveSourceKnowledgeAsync(fileName, source.FacilityCode, cancellationToken);

        // Xóa nguồn danh mục — catalog_items biến mất theo cascade CatalogItem → CatalogSource.
        _db.CatalogSources.Remove(source);
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();

        _logger.LogInformation(
            "Đã XÓA HẲN danh mục {Type} #{Id} ({File}) + {Docs} bản tri thức kèm theo",
            catalogType, id, fileName, removedDocs);
        return Ok(new
        {
            message = $"Đã xóa hẳn danh mục \"{displayName}\" ({rowCount} dòng) khỏi hệ thống."
        });
    }

    /// <summary>
    /// Xóa HẲN TẤT CẢ danh mục khỏi DB (kèm mục danh mục + bản tri thức toàn văn nạp
    /// kèm) — dọn sạch để nạp lại từ đầu. KHÔNG khôi phục lại được.
    /// </summary>
    [HttpDelete("sources")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteAllSourcesAsync(CancellationToken cancellationToken)
    {
        // "Tất cả" của quản trị cơ sở = tất cả trong nhánh của họ. Danh mục dùng chung
        // (không mã cơ sở) không nằm trong đó — một cú bấm nút của một cơ sở không được
        // phép dọn sạch danh mục mà cả hệ thống đang đối chiếu.
        var tenant = await _tenant.GetFilterAsync(cancellationToken);
        var scopedSources = tenant.IsSystemScope
            ? _db.CatalogSources
            : _db.CatalogSources.Where(s => s.FacilityCode != null && tenant.Codes.Contains(s.FacilityCode));

        var sources = await scopedSources.ToListAsync(cancellationToken);
        if (sources.Count == 0)
        {
            return Ok(new { RemovedCount = 0, message = "Không có danh mục nào để xóa." });
        }

        var fileNames = sources
            .Select(s => s.FileName)
            .Where(f => !string.IsNullOrEmpty(f))
            .Distinct()
            .ToList();
        // Khớp theo tên file là khớp lỏng: hai cơ sở nạp file trùng tên ("DMT.xlsx") là
        // chuyện thường. Thêm rào phạm vi để cơ sở này không xóa bản tri thức của cơ sở kia.
        var docsQuery = _db.MedicalDocuments.Where(d => fileNames.Contains(d.SourceFileName));
        if (!tenant.IsSystemScope)
        {
            docsQuery = docsQuery.Where(d => d.FacilityId != null && tenant.Ids.Contains(d.FacilityId.Value));
        }

        var knowledgeDocs = await docsQuery.ToListAsync(cancellationToken);
        _db.MedicalDocuments.RemoveRange(knowledgeDocs);
        _db.CatalogSources.RemoveRange(sources);
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();

        _logger.LogInformation(
            "Đã XÓA HẲN TOÀN BỘ {Count} danh mục + {Docs} bản tri thức kèm theo", sources.Count, knowledgeDocs.Count);
        return Ok(new
        {
            RemovedCount = sources.Count,
            message = $"Đã xóa hẳn toàn bộ {sources.Count} danh mục khỏi hệ thống."
        });
    }

    /// <summary>Khôi phục một danh mục đã gỡ — có hiệu lực đối chiếu trở lại.</summary>
    [HttpPost("sources/{id:long}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreSourceAsync(long id, CancellationToken cancellationToken)
    {
        var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
        if (source == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục #{id}." });
        }

        var denied = await GuardWriteAsync(source, cancellationToken);
        if (denied != null)
        {
            return denied;
        }

        source.IsActive = true;
        await _db.SaveChangesAsync(cancellationToken);

        // Cảnh báo nếu đang có bản khác cùng loại + cơ sở cũng hiệu lực (trùng dữ liệu đối chiếu)
        var duplicated = await _db.CatalogSources.AnyAsync(
            s => s.Id != id && s.IsActive
                && s.CatalogType == source.CatalogType
                && s.FacilityCode == source.FacilityCode,
            cancellationToken);

        _logger.LogInformation("Đã khôi phục danh mục {Type} #{Id} ({File})", source.CatalogType, id, source.FileName);
        return Ok(new
        {
            message = duplicated
                ? $"Đã khôi phục danh mục \"{source.DisplayName}\" ({source.RowCount} dòng). "
                  + "Lưu ý: đang có bản khác cùng loại còn hiệu lực — nên gỡ bớt một bản để tránh đối chiếu trùng."
                : $"Đã khôi phục danh mục \"{source.DisplayName}\" ({source.RowCount} dòng)."
        });
    }

    /// <summary>
    /// Nạp TOÀN VĂN một danh mục đã có vào kho tri thức để trợ lý hỏi–đáp tra cứu
    /// được nội dung. Đọc lại file gốc đã lưu khi import (đủ mọi sheet). Nếu danh mục
    /// được nạp trước khi hệ thống lưu file gốc thì không nạp được — báo lỗi rõ ràng.
    /// </summary>
    [HttpPost("sources/{id:long}/knowledge")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddToKnowledgeAsync(long id, CancellationToken cancellationToken)
    {
        var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
        if (source == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục #{id}." });
        }

        var denied = await GuardWriteAsync(source, cancellationToken);
        if (denied != null)
        {
            return denied;
        }

        var stored = _fileStorage.Find("catalog", id);
        if (stored == null)
        {
            return BadRequest(new
            {
                message = "Danh mục này được nạp trước khi hệ thống lưu file gốc, "
                    + "không thể nạp vào kho tri thức. Vui lòng nạp lại (import) file danh mục rồi thử lại."
            });
        }

        try
        {
            await using var stream = System.IO.File.OpenRead(stored.Value.PhysicalPath);
            await IngestSourceKnowledgeAsync(
                source.DisplayName, source.FileName, stream, source.FacilityCode, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không nạp được toàn văn danh mục {File} vào kho tri thức", source.FileName);
            return BadRequest(new
            {
                message = "Không nạp được toàn văn danh mục vào kho tri thức. "
                    + "File gốc có thể lỗi hoặc không đọc được."
            });
        }

        _logger.LogInformation("Đã nạp danh mục {Type} #{Id} ({File}) vào kho tri thức",
            source.CatalogType, id, source.FileName);
        return Ok(new
        {
            message = $"Đã nạp danh mục \"{source.DisplayName}\" vào kho tri thức — "
                + "trợ lý hỏi–đáp tra cứu được nội dung danh mục này."
        });
    }

    /// <summary>
    /// Gỡ bản toàn văn của một danh mục khỏi kho tri thức (trợ lý không còn tra ra
    /// nội dung danh mục này). Không đụng tới dữ liệu đối chiếu của danh mục.
    /// </summary>
    [HttpDelete("sources/{id:long}/knowledge")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFromKnowledgeAsync(long id, CancellationToken cancellationToken)
    {
        var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
        if (source == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục #{id}." });
        }

        var denied = await GuardWriteAsync(source, cancellationToken);
        if (denied != null)
        {
            return denied;
        }

        var removed = await RemoveSourceKnowledgeAsync(source.FileName, source.FacilityCode, cancellationToken);
        _logger.LogInformation("Đã gỡ danh mục {Type} #{Id} ({File}) khỏi kho tri thức ({Docs} bản)",
            source.CatalogType, id, source.FileName, removed);
        return Ok(new
        {
            message = removed > 0
                ? $"Đã gỡ danh mục \"{source.DisplayName}\" khỏi kho tri thức."
                : $"Danh mục \"{source.DisplayName}\" vốn chưa có trong kho tri thức."
        });
    }

    /// <summary>
    /// Nạp NHIỀU danh mục vào kho tri thức cùng lúc (chọn nhiều dòng bằng checkbox).
    /// Danh mục thiếu file gốc hoặc lỗi được đưa vào "failed" chứ không làm hỏng cả lô.
    /// </summary>
    [HttpPost("sources/knowledge")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AddManyToKnowledgeAsync(
        [FromBody] IngestKnowledgeBatchRequest request, CancellationToken cancellationToken)
    {
        var ids = request?.Ids?.Distinct().ToList() ?? new List<long>();
        if (ids.Count == 0)
        {
            return BadRequest(new { message = "Chưa chọn danh mục nào để nạp." });
        }

        var successCount = 0;
        var failed = new List<object>();

        foreach (var id in ids)
        {
            var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
            if (source == null)
            {
                failed.Add(new { id, message = "Không tìm thấy danh mục." });
                continue;
            }

            // Nạp cả lô nhưng vẫn xét phạm vi từng dòng: chọn nhầm một dòng ngoài nhánh
            // thì dòng đó vào "failed", phần còn lại vẫn chạy.
            if (await GuardWriteAsync(source, cancellationToken) != null)
            {
                failed.Add(new
                {
                    id,
                    name = source.DisplayName,
                    message = "Danh mục thuộc cơ sở ngoài phạm vi quản lý của bạn.",
                });
                continue;
            }

            var stored = _fileStorage.Find("catalog", id);
            if (stored == null)
            {
                failed.Add(new { id, name = source.DisplayName, message = "Chưa lưu file gốc — cần nạp lại file." });
                continue;
            }

            try
            {
                await using var stream = System.IO.File.OpenRead(stored.Value.PhysicalPath);
                await IngestSourceKnowledgeAsync(
                    source.DisplayName, source.FileName, stream, source.FacilityCode, cancellationToken);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không nạp được danh mục {File} vào kho tri thức", source.FileName);
                failed.Add(new { id, name = source.DisplayName, message = "Lỗi đọc file gốc." });
            }
        }

        var message = failed.Count == 0
            ? $"Đã nạp {successCount} danh mục vào kho tri thức."
            : $"Đã nạp {successCount} danh mục; {failed.Count} danh mục không nạp được.";
        return Ok(new { successCount, failed, message });
    }

    /// <summary>
    /// Tra cứu mục trong danh mục. Lọc theo loại, cơ sở, mã DMDC, từ khóa tên,
    /// hoặc sourceId (xem chi tiết một nguồn — kể cả nguồn đã gỡ).
    /// </summary>
    [HttpGet("items")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItemsAsync(
        [FromQuery] long? sourceId,
        [FromQuery] string? type,
        [FromQuery] string? facility,
        [FromQuery] string? code,
        [FromQuery] string? q,
        [FromQuery] int limit,
        CancellationToken cancellationToken)
    {
        // Chỉ định sourceId = xem nội dung đúng nguồn đó (cho phép cả nguồn đã gỡ);
        // không chỉ định thì chỉ tra trong các nguồn còn hiệu lực.
        var query = sourceId.HasValue
            ? _db.CatalogItems.Where(i => i.SourceId == sourceId.Value)
            : _db.CatalogItems.Where(i => i.Source!.IsActive);

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(i => i.CatalogType == type);
        }
        if (!string.IsNullOrWhiteSpace(facility))
        {
            query = query.Where(i => i.FacilityCode == facility);
        }
        if (!string.IsNullOrWhiteSpace(code))
        {
            query = query.Where(i => i.Code == code);
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(i => EF.Functions.ILike(i.Name, $"%{q}%"));
        }

        // Lọc phạm vi đặt SAU bộ lọc do client truyền: client có ép facility=<cơ sở khác>
        // thì mệnh đề này vẫn cắt sạch, không có đường vòng.
        var tenant = await _tenant.GetFilterAsync(cancellationToken);
        if (!tenant.IsSystemScope)
        {
            query = query.Where(i => i.FacilityCode == null || tenant.Codes.Contains(i.FacilityCode));
        }

        var take = limit is > 0 and <= 500 ? limit : 50;
        var items = await query
            .OrderBy(i => i.Name)
            .Take(take)
            .Select(i => new
            {
                i.Id,
                i.CatalogType,
                i.FacilityCode,
                i.Code,
                i.HisCode,
                i.Name,
                i.Unit,
                i.PriceBhyt,
                i.PriceHospital,
                i.IsSuspended,
                i.IsOutsideBhyt,
                i.IsActive,
                i.Metadata
            })
            .ToListAsync(cancellationToken);

        return Ok(new { count = items.Count, items });
    }

    /// <summary>Tải/xem file Excel gốc của một danh mục (nếu đã lưu khi nạp). download=true: ép tải về.</summary>
    [HttpGet("sources/{id:long}/file")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSourceFileAsync(
        long id, [FromQuery] bool download, CancellationToken cancellationToken)
    {
        // File gốc là dữ liệu nhạy cảm hơn cả bảng danh mục (giá viện phí, mã nội bộ),
        // nên phải soi phạm vi trước khi chạm tới đĩa.
        var source = await _db.CatalogSources.FindAsync(new object[] { id }, cancellationToken);
        if (source == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục #{id}." });
        }

        if (!_tenant.IsSystemScope
            && source.FacilityCode != null
            && !await _tenant.CanAccessAsync(source.FacilityCode, cancellationToken))
        {
            return TenantForbid.OutOfScope(source.FacilityCode, $"Danh mục \"{source.DisplayName}\"");
        }

        var stored = _fileStorage.Find("catalog", id);
        if (stored == null)
        {
            return NotFound(new
            {
                message = "Không có file gốc — danh mục này được nạp trước khi hệ thống lưu file."
            });
        }

        var disposition = download ? "attachment" : "inline";
        Response.Headers.ContentDisposition =
            $"{disposition}; filename*=UTF-8''{Uri.EscapeDataString(stored.Value.FileName)}";
        return PhysicalFile(stored.Value.PhysicalPath, stored.Value.ContentType);
    }

    /// <summary>Các loại danh mục hệ thống nhận diện được (từ catalog_profiles.json).</summary>
    [HttpGet("profiles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProfilesAsync(CancellationToken cancellationToken)
    {
        var profiles = await _profileProvider.GetProfilesAsync(cancellationToken);
        return Ok(profiles.Select(p => new
        {
            p.CatalogType,
            p.DisplayName,
            p.Description,
            p.FileNamePatterns,
            p.UsedForXml130,
            p.Xml130Note,
            p.ContainsPersonalData
        }));
    }

    /// <summary>
    /// Xác định mã cơ sở được ghi vào cho người gọi thuộc phạm vi một cơ sở:
    /// không truyền thì ÉP bằng cơ sở của chính họ, có truyền thì phải nằm trong nhánh.
    /// </summary>
    private async Task<(string? FacilityCode, IActionResult? Denied)> ResolveWriteFacilityAsync(
        string? requested, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requested))
        {
            var own = _tenant.FacilityId.HasValue
                ? await _facilityTree.FindByIdAsync(_tenant.FacilityId.Value, cancellationToken)
                : null;

            if (own == null)
            {
                return (null, TenantForbid.OutOfScope(
                    what: "Tài khoản của bạn chưa gắn với cơ sở KCB nào nên không nạp được danh mục;"));
            }

            return (own.Code, null);
        }

        var code = requested.Trim();
        return await _tenant.CanAccessAsync(code, cancellationToken)
            ? (code, null)
            : (null, TenantForbid.OutOfScope(code, "Danh mục của cơ sở này"));
    }

    /// <summary>
    /// Chặn thao tác lên một nguồn danh mục ngoài phạm vi. Trả null nghĩa là được phép.
    ///
    /// Nguồn không có mã cơ sở là danh mục DÙNG CHUNG toàn hệ thống — quản trị cơ sở đọc
    /// được nhưng không được sửa/xóa, vì một thao tác của họ sẽ ảnh hưởng mọi cơ sở khác.
    /// </summary>
    private async Task<IActionResult?> GuardWriteAsync(
        CatalogSource source, CancellationToken cancellationToken)
    {
        if (_tenant.IsSystemScope)
        {
            return null;
        }

        return await _tenant.CanAccessAsync(source.FacilityCode ?? string.Empty, cancellationToken)
            ? null
            : TenantForbid.OutOfScope(source.FacilityCode, $"Danh mục \"{source.DisplayName}\"");
    }

    /// <summary>
    /// Nạp toàn văn một file danh mục (đủ mọi sheet) vào kho tri thức: trích text →
    /// xóa bản tri thức cũ cùng tên file (tránh trùng) → ingest. Ném ngoại lệ nếu lỗi.
    /// </summary>
    private async Task IngestSourceKnowledgeAsync(
        string displayName,
        string fileName,
        Stream fileStream,
        string? facilityCode,
        CancellationToken cancellationToken)
    {
        var text = await _textExtractor.ExtractAsync(fileName, fileStream, cancellationToken);
        await RemoveSourceKnowledgeAsync(fileName, facilityCode, cancellationToken);

        // Bản toàn văn thừa hưởng đúng cơ sở của danh mục sinh ra nó: danh mục riêng của
        // một cơ sở mà nạp thành văn bản dùng chung thì trợ lý của cơ sở khác sẽ trích dẫn
        // bảng giá không phải của họ.
        var facility = string.IsNullOrWhiteSpace(facilityCode)
            ? null
            : await _facilityTree.FindByCodeAsync(facilityCode, cancellationToken);

        await _documentIngest.IngestAsync(
            $"{displayName} — {fileName}",
            text,
            docType: "DanhMuc",
            sourceFileName: fileName,
            facilityId: facility?.Id,
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Xóa HẲN bản tri thức toàn văn của một danh mục (theo tên file VÀ cơ sở) — chunk +
    /// vector HNSW biến mất theo cascade. Trả về số bản đã xóa.
    ///
    /// Phải kèm cơ sở: hai cơ sở nạp hai file cùng tên ("DMT.xlsx") là chuyện thường,
    /// khớp mỗi tên file thì cơ sở nạp sau xóa mất bản tri thức của cơ sở nạp trước.
    /// </summary>
    private async Task<int> RemoveSourceKnowledgeAsync(
        string fileName, string? facilityCode, CancellationToken cancellationToken)
    {
        var facility = string.IsNullOrWhiteSpace(facilityCode)
            ? null
            : await _facilityTree.FindByCodeAsync(facilityCode, cancellationToken);
        var facilityId = facility?.Id;

        var docs = await _db.MedicalDocuments
            .Where(d => d.SourceFileName == fileName && d.FacilityId == facilityId)
            .ToListAsync(cancellationToken);
        if (docs.Count > 0)
        {
            _db.MedicalDocuments.RemoveRange(docs);
            await _db.SaveChangesAsync(cancellationToken);
            _embeddingIndex.Invalidate();
        }
        return docs.Count;
    }
}

/// <summary>Yêu cầu nạp nhiều danh mục vào kho tri thức cùng lúc.</summary>
public record IngestKnowledgeBatchRequest(long[] Ids);
