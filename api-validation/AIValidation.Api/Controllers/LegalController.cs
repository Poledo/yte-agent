using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using AIValidation.Api.Services.Rag;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API "Tải văn bản": tìm văn bản pháp luật (bản TEXT) trên vbpl.vn, TẢI VỀ lưu DB
/// (bảng legal_downloads — thông tin + toàn văn), rồi người dùng tự chọn nạp vào
/// kho tri thức từng văn bản hoặc theo lô:
/// - GET    /api/legal/search                : tìm trên vbpl.vn (đánh dấu đã tải/đã nạp).
/// - POST   /api/legal/download              : tải toàn văn về DB (chưa nạp kho tri thức).
/// - GET    /api/legal/downloads             : danh sách văn bản đã tải.
/// - GET    /api/legal/downloads/{id}/content: xem toàn văn đã tải (text).
/// - POST   /api/legal/downloads/ingest      : nạp các văn bản đã chọn vào kho tri thức.
/// - DELETE /api/legal/downloads/{id}        : xóa một bản ghi đã tải.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LegalController : ControllerBase
{
    private readonly ILegalDocumentFetchService _fetchService;
    private readonly IDocumentIngestService _ingestService;
    private readonly ITenantScope _tenant;
    private readonly AppDbContext _db;
    private readonly ILogger<LegalController> _logger;

    public LegalController(
        ILegalDocumentFetchService fetchService,
        IDocumentIngestService ingestService,
        ITenantScope tenant,
        AppDbContext db,
        ILogger<LegalController> logger)
    {
        _fetchService = fetchService ?? throw new ArgumentNullException(nameof(fetchService));
        _ingestService = ingestService ?? throw new ArgumentNullException(nameof(ingestService));
        _tenant = tenant ?? throw new ArgumentNullException(nameof(tenant));
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Cơ sở sở hữu văn bản mà người đang gọi nạp vào kho tri thức: quản trị hệ thống
    /// nạp thì để trống (dùng chung toàn ngành), quản trị cơ sở nạp thì thuộc cơ sở họ.
    /// </summary>
    private long? OwnerFacilityId => _tenant.IsSystemScope ? null : _tenant.FacilityId;

    /// <summary>
    /// Khóa nhận dạng văn bản vbpl trong kho tri thức. Trạng thái "đã nạp" tra theo khóa
    /// này + cơ sở sở hữu, KHÔNG tra theo <c>KnowledgeDocumentId</c>: cột đó chỉ giữ được
    /// một id, nên khi cơ sở thứ hai nạp cùng một thông tư nó bị ghi đè và cơ sở đầu tiên
    /// đột nhiên thấy văn bản của mình "chưa nạp".
    /// </summary>
    private static string SourceKeyOf(string itemId) => $"vbpl-{itemId}";

    /// <summary>
    /// Tìm văn bản trên vbpl.vn. keyword: từ khóa/lĩnh vực; from/to: lọc theo ngày
    /// ban hành (văn bản không đọc được ngày vẫn trả về). Kết quả đánh dấu văn bản
    /// đã tải về để khỏi tải trùng.
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SearchAsync(
        [FromQuery] string keyword,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] string? effStatus = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return BadRequest(new { message = "Nhập từ khóa hoặc chọn lĩnh vực để tìm." });
        }

        try
        {
            var results = await _fetchService.SearchAsync(keyword, from, to, page, effStatus, cancellationToken);

            var itemIds = results.Select(r => r.ItemId).ToList();
            var downloaded = await _db.LegalDownloads
                .Where(d => itemIds.Contains(d.ItemId))
                .Select(d => new { d.ItemId, Ingested = d.KnowledgeDocumentId != null })
                .ToListAsync(cancellationToken);
            var downloadedMap = downloaded.ToDictionary(d => d.ItemId, d => d.Ingested);

            return Ok(results.Select(r => new
            {
                r.ItemId,
                r.Title,
                r.DocNumber,
                r.IssuedDate,
                r.EffectiveDate,
                r.ExpiryDate,
                r.Url,
                AlreadyDownloaded = downloadedMap.ContainsKey(r.ItemId),
                AlreadyIngested = downloadedMap.GetValueOrDefault(r.ItemId)
            }));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Lỗi truy cập vbpl.vn khi tìm kiếm");
            // Trả nguyên nhân cụ thể (HTTP mấy / timeout / DNS...) để người dùng báo lại chính xác
            return BadRequest(new { message = ex.Message });
        }
    }

    public record DownloadRequest(
        string ItemId,
        string Title,
        string? DocNumber,
        DateTime? IssuedDate,
        DateTime? EffectiveDate,
        DateTime? ExpiryDate,
        string? Url);

    /// <summary>
    /// Tải toàn văn một văn bản về DB (bảng legal_downloads). CHƯA nạp kho tri thức —
    /// đó là bước riêng người dùng chọn. Tải lại văn bản đã có thì cập nhật nội dung.
    /// </summary>
    [HttpPost("download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DownloadAsync(
        [FromBody] DownloadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.ItemId) || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Thiếu ItemId hoặc Title." });
        }

        try
        {
            var text = await _fetchService.FetchFullTextAsync(request.ItemId, request.Url, cancellationToken);
            var sourceUrl = !string.IsNullOrWhiteSpace(request.Url)
                ? request.Url
                : $"https://vbpl.vn/van-ban/chi-tiet/van-ban--{request.ItemId}";

            var existing = await _db.LegalDownloads
                .FirstOrDefaultAsync(d => d.ItemId == request.ItemId, cancellationToken);
            if (existing != null)
            {
                existing.Title = request.Title.Trim();
                existing.DocNumber = request.DocNumber;
                existing.IssuedDate = AsUtc(request.IssuedDate);
                existing.EffectiveDate = AsUtc(request.EffectiveDate);
                existing.ExpiryDate = AsUtc(request.ExpiryDate);
                existing.SourceUrl = sourceUrl;
                existing.Content = text;
                existing.DownloadedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new LegalDownload
                {
                    ItemId = request.ItemId,
                    Title = request.Title.Trim(),
                    DocNumber = request.DocNumber,
                    IssuedDate = AsUtc(request.IssuedDate),
                    EffectiveDate = AsUtc(request.EffectiveDate),
                    ExpiryDate = AsUtc(request.ExpiryDate),
                    SourceUrl = sourceUrl,
                    Content = text,
                    DownloadedAt = DateTime.UtcNow
                };
                _db.LegalDownloads.Add(existing);
            }
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                existing.Id,
                existing.ItemId,
                existing.Title,
                ContentLength = text.Length,
                message = $"Đã tải \"{existing.Title}\" ({text.Length:N0} ký tự). Chọn \"Nạp vào kho tri thức\" khi muốn AI tra cứu."
            });
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Danh sách văn bản đã tải (mới nhất trước), kèm trạng thái đã nạp kho tri thức.</summary>
    [HttpGet("downloads")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListDownloadsAsync(CancellationToken cancellationToken)
    {
        // Trạng thái "đã nạp" xác nhận lại với kho tri thức: văn bản bị gỡ khỏi kho
        // thì coi như chưa nạp (cho phép nạp lại). Xét theo CƠ SỞ của người đang xem —
        // cơ sở khác đã nạp không làm mình mất quyền nạp cho kho của mình.
        var owner = OwnerFacilityId;
        var list = await _db.LegalDownloads
            .OrderByDescending(d => d.DownloadedAt)
            .Select(d => new
            {
                d.Id,
                d.ItemId,
                d.Title,
                d.DocNumber,
                d.IssuedDate,
                d.EffectiveDate,
                d.ExpiryDate,
                d.SourceUrl,
                d.DownloadedAt,
                ContentLength = d.Content.Length,
                Ingested = _db.MedicalDocuments.Any(m =>
                    m.SourceFileName == "vbpl-" + d.ItemId && m.IsActive && m.FacilityId == owner),
                d.IngestedAt
            })
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    /// <summary>Xem toàn văn đã tải — trả text thuần (mở tab mới đọc trực tiếp).</summary>
    [HttpGet("downloads/{id:long}/content")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetContentAsync(long id, CancellationToken cancellationToken)
    {
        var download = await _db.LegalDownloads.FindAsync(new object[] { id }, cancellationToken);
        if (download == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản đã tải #{id}." });
        }
        return Content(download.Content, "text/plain; charset=utf-8");
    }

    public record IngestSelectedRequest(List<long> Ids);

    /// <summary>
    /// Nạp các văn bản ĐÃ TẢI (theo danh sách id được chọn) vào kho tri thức.
    /// Văn bản nạp rồi (còn hiệu lực trong kho) được bỏ qua; nạp lại văn bản đã gỡ
    /// sẽ thay thế bản cũ. Trả kết quả từng văn bản.
    /// </summary>
    [HttpPost("downloads/ingest")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> IngestSelectedAsync(
        [FromBody] IngestSelectedRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request?.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest(new { message = "Chưa chọn văn bản nào để nạp." });
        }

        var downloads = await _db.LegalDownloads
            .Where(d => request.Ids.Contains(d.Id))
            .ToListAsync(cancellationToken);

        var owner = OwnerFacilityId;
        var results = new List<IngestItemResult>();
        foreach (var download in downloads)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Đã nạp và bản trong kho còn hiệu lực → bỏ qua (tránh chunk trùng).
            // Xét trong phạm vi CƠ SỞ của người nạp: cùng một thông tư, mỗi cơ sở giữ
            // bản riêng trong kho của mình.
            var sourceKey = SourceKeyOf(download.ItemId);
            var stillActive = await _db.MedicalDocuments.AnyAsync(
                m => m.SourceFileName == sourceKey && m.IsActive && m.FacilityId == owner,
                cancellationToken);
            if (stillActive)
            {
                results.Add(new IngestItemResult(download.Id, download.Title, "skipped", "Đã có trong kho tri thức — bỏ qua."));
                continue;
            }

            try
            {
                // Gỡ mềm bản cũ cùng nguồn CỦA CHÍNH CƠ SỞ NÀY để không trùng chunk —
                // không đụng bản của cơ sở khác.
                var oldDocs = await _db.MedicalDocuments
                    .Where(m => m.IsActive && m.SourceFileName == sourceKey && m.FacilityId == owner)
                    .ToListAsync(cancellationToken);
                foreach (var old in oldDocs)
                {
                    old.IsActive = false;
                }

                var document = await _ingestService.IngestAsync(
                    download.Title,
                    download.Content,
                    GuessDocType(download.Title),
                    download.DocNumber,
                    issuedBy: null,
                    sourceFileName: sourceKey,
                    effectiveDate: download.EffectiveDate,
                    expiryDate: download.ExpiryDate,
                    facilityId: owner,
                    cancellationToken: cancellationToken);

                download.KnowledgeDocumentId = document.Id;
                download.IngestedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);

                results.Add(new IngestItemResult(download.Id, download.Title, "done", $"Đã nạp ({document.Chunks.Count} đoạn)."));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Không nạp được văn bản đã tải #{Id} vào kho tri thức", download.Id);
                results.Add(new IngestItemResult(download.Id, download.Title, "error", ex.Message));
            }
        }

        var doneCount = results.Count(r => r.Status == "done");
        return Ok(new
        {
            Results = results,
            message = $"Đã nạp {doneCount}/{downloads.Count} văn bản vào kho tri thức."
        });
    }

    /// <summary>Kết quả nạp một văn bản trong lô đã chọn.</summary>
    public record IngestItemResult(long Id, string Title, string Status, string Message);

    public record RemoveKnowledgeRequest(List<long> Ids);

    /// <summary>
    /// GỠ (mềm) các văn bản đã nạp khỏi KHO TRI THỨC theo danh sách bản ghi tải về
    /// được chọn — trợ lý ngừng trích dẫn ngay; khôi phục được ở màn Kho tri thức
    /// (bật "Hiện đã gỡ") hoặc bấm Nạp lại tại đây.
    /// </summary>
    [HttpPost("downloads/remove-knowledge")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveKnowledgeAsync(
        [FromBody] RemoveKnowledgeRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request?.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest(new { message = "Chưa chọn văn bản nào để gỡ." });
        }

        var downloads = await _db.LegalDownloads
            .Where(d => request.Ids.Contains(d.Id))
            .ToListAsync(cancellationToken);

        var owner = OwnerFacilityId;
        var removed = 0;
        foreach (var download in downloads)
        {
            // Chỉ gỡ bản trong kho CỦA CƠ SỞ MÌNH. Quản trị cơ sở bấm "gỡ" mà xóa mất
            // bản dùng chung của toàn ngành là hỏng kho tri thức của mọi cơ sở khác.
            var sourceKey = SourceKeyOf(download.ItemId);
            var document = await _db.MedicalDocuments
                .FirstOrDefaultAsync(
                    m => m.SourceFileName == sourceKey && m.IsActive && m.FacilityId == owner,
                    cancellationToken);
            if (document != null)
            {
                document.IsActive = false;
                removed++;
            }
        }
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Đã gỡ {Count} văn bản (từ danh sách tải về) khỏi kho tri thức", removed);
        return Ok(new
        {
            RemovedCount = removed,
            message = removed == 0
                ? "Các văn bản đã chọn không có bản nào đang hiệu lực trong kho tri thức."
                : $"Đã gỡ {removed} văn bản khỏi kho tri thức — trợ lý ngừng trích dẫn ngay. Nạp lại hoặc khôi phục được bất cứ lúc nào."
        });
    }

    /// <summary>Xóa một bản ghi đã tải (không ảnh hưởng văn bản đã nạp trong kho tri thức).</summary>
    [HttpDelete("downloads/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDownloadAsync(long id, CancellationToken cancellationToken)
    {
        var download = await _db.LegalDownloads.FindAsync(new object[] { id }, cancellationToken);
        if (download == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản đã tải #{id}." });
        }
        _db.LegalDownloads.Remove(download);
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Đã xóa \"{download.Title}\" khỏi danh sách tải về." });
    }

    /// <summary>
    /// Chuẩn hóa ngày về Kind=Utc — Npgsql chỉ nhận UTC cho cột "timestamp with time zone";
    /// ngày parse từ vbpl (dd/MM/yyyy) có Kind=Unspecified sẽ nổ khi ghi DB.
    /// Giữ nguyên GIÁ TRỊ ngày (không dịch múi giờ) vì đây là ngày văn bản, không phải mốc thời gian.
    /// </summary>
    internal static DateTime? AsUtc(DateTime? value)
        => value == null
            ? null
            : value.Value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.Value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
            };

    /// <summary>Đoán loại văn bản từ tiêu đề để trợ lý trích dẫn đúng thể loại.</summary>
    internal static string GuessDocType(string title)
    {
        var t = title.ToLowerInvariant();
        if (t.Contains("nghị định")) return "NghiDinh";
        if (t.Contains("thông tư")) return "ThongTu";
        if (t.Contains("quyết định")) return "QuyetDinh";
        if (t.Contains("công văn")) return "CongVan";
        if (t.Contains("luật")) return "Luat";
        return "Khac";
    }
}
