using System.Text.Json;
using AIValidation.Api.Data;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Licensing;
using AIValidation.Api.Services.Rag;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API trợ lý AI học văn bản y tế (RAG):
/// - POST /api/assistant/documents : nạp văn bản (file .txt/.md hoặc JSON body).
/// - GET  /api/assistant/documents : liệt kê văn bản đã nạp.
/// - GET  /api/assistant/documents/{id} : chi tiết văn bản (kèm toàn văn).
/// - GET  /api/assistant/documents/{id}/file : tải/xem file gốc đã nạp.
/// - DELETE /api/assistant/documents/{id} : gỡ văn bản (soft delete).
/// - POST /api/assistant/documents/{id}/restore : khôi phục văn bản đã gỡ.
/// - POST /api/assistant/ask       : hỏi đáp dựa trên văn bản đã nạp.
/// </summary>
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên endpoint này dùng policy "Extension" (mở origin). Các endpoint quản
// trị vẫn giữ policy mặc định chỉ cho origin của web-admin.
[EnableCors("Extension")]
[ApiController]
[Route("api/[controller]")]
public class AssistantController : ControllerBase
{
    private readonly IDocumentIngestService _ingestService;
    private readonly IAssistantService _assistantService;
    private readonly IDocumentSearchService _searchService;
    private readonly IDocumentTextExtractor _textExtractor;
    private readonly IFileStorage _fileStorage;
    private readonly IEmbeddingService _embedding;
    private readonly IEmbeddingIndex _embeddingIndex;
    private readonly IEmbeddingBackfill _backfill;
    private readonly AppDbContext _db;
    private readonly IUsageRecorder _usageRecorder;
    private readonly ILicenseContext _license;
    private readonly IBillingRecorder _billing;
    private readonly ILogger<AssistantController> _logger;
    // Dùng đúng cấu hình JSON của MVC (camelCase + enum) để /ask stream ra
    // response y hệt Ok(answer) trước đây — extension không phải đổi gì.
    private readonly JsonSerializerOptions _jsonOptions;

    public AssistantController(
        IDocumentIngestService ingestService,
        IAssistantService assistantService,
        IDocumentSearchService searchService,
        IDocumentTextExtractor textExtractor,
        IFileStorage fileStorage,
        IEmbeddingService embedding,
        IEmbeddingIndex embeddingIndex,
        IEmbeddingBackfill backfill,
        AppDbContext db,
        IUsageRecorder usageRecorder,
        ILicenseContext license,
        IBillingRecorder billing,
        IOptions<Microsoft.AspNetCore.Mvc.JsonOptions> jsonOptions,
        ILogger<AssistantController> logger)
    {
        _usageRecorder = usageRecorder ?? throw new ArgumentNullException(nameof(usageRecorder));
        _license = license ?? throw new ArgumentNullException(nameof(license));
        _billing = billing ?? throw new ArgumentNullException(nameof(billing));
        _ingestService = ingestService ?? throw new ArgumentNullException(nameof(ingestService));
        _assistantService = assistantService ?? throw new ArgumentNullException(nameof(assistantService));
        _searchService = searchService ?? throw new ArgumentNullException(nameof(searchService));
        _textExtractor = textExtractor ?? throw new ArgumentNullException(nameof(textExtractor));
        _fileStorage = fileStorage ?? throw new ArgumentNullException(nameof(fileStorage));
        _embedding = embedding ?? throw new ArgumentNullException(nameof(embedding));
        _embeddingIndex = embeddingIndex ?? throw new ArgumentNullException(nameof(embeddingIndex));
        _backfill = backfill ?? throw new ArgumentNullException(nameof(backfill));
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _jsonOptions = (jsonOptions ?? throw new ArgumentNullException(nameof(jsonOptions))).Value.JsonSerializerOptions;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// TRẠNG THÁI tầng ngữ nghĩa — mở trực tiếp trên trình duyệt để chẩn đoán:
    /// Ollama sống chưa, còn bao nhiêu đoạn thiếu chỉ mục, cột DB đã có chưa.
    /// </summary>
    [HttpGet("embeddings/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> EmbeddingsStatusAsync(CancellationToken cancellationToken)
    {
        var ollamaError = await _embedding.CheckAsync(cancellationToken);

        var total = 0;
        var embedded = 0;
        string? dbError = null;
        try
        {
            total = await _db.DocumentChunks.CountAsync(c => c.Document!.IsActive, cancellationToken);
            embedded = await _db.DocumentChunks
                .CountAsync(c => c.Embedding != null && c.Document!.IsActive, cancellationToken);
        }
        catch (Exception ex)
        {
            dbError = "Không đọc được cột Embedding — migration chưa áp? Khởi động lại API và xem log Startup. Chi tiết: " + ex.Message;
        }

        return Ok(new
        {
            Ollama = ollamaError ?? "OK",
            Index = await _embeddingIndex.DescribeAsync(cancellationToken),
            DbError = dbError,
            TotalChunks = total,
            Embedded = embedded,
            Remaining = total - embedded,
            Indexing = _backfill.IsRunning
        });
    }

    /// <summary>
    /// Tạo chỉ mục NGỮ NGHĨA: đánh thức worker nền (EmbeddingBackfillService) rồi trả
    /// về ngay — việc embed chạy phía server không giới hạn thời gian, client theo dõi
    /// tiến độ qua GET embeddings/status (trường Remaining/Indexing).
    /// </summary>
    [HttpPost("embeddings/rebuild")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RebuildEmbeddingsAsync(CancellationToken cancellationToken)
    {
        var remaining = await _db.DocumentChunks
            .CountAsync(c => c.Embedding == null && c.Document!.IsActive, cancellationToken);

        // Còn đoạn phải embed thì Ollama phải sống — báo lỗi ngay thay vì để worker
        // âm thầm bỏ qua (đồng bộ pgvector từ vector sẵn có thì không cần Ollama).
        if (remaining > 0)
        {
            var ollamaError = await _embedding.CheckAsync(cancellationToken);
            if (ollamaError != null)
            {
                return BadRequest(new { message = ollamaError });
            }
        }

        _backfill.Poke();
        return Ok(new
        {
            Embedded = 0,
            Failed = 0,
            Remaining = remaining,
            Indexing = true,
            message = remaining == 0
                ? "Tất cả các đoạn đã có chỉ mục ngữ nghĩa (worker nền sẽ đồng bộ pgvector nếu còn)."
                : $"Đã chuyển {remaining} đoạn cho worker nền xử lý — theo dõi tiến độ ở dải trạng thái."
        });
    }

    /// <summary>
    /// CHẨN ĐOÁN truy hồi RAG: xem hệ thống chọn từ khóa gì (kèm số đoạn chứa),
    /// pool ứng viên và top cuối cho một câu hỏi — soi vì sao một tài liệu
    /// không được trích dẫn. Mở trực tiếp trên trình duyệt:
    /// /api/assistant/search-debug?q=câu hỏi
    /// </summary>
    [HttpGet("search-debug")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchDebugAsync([FromQuery] string q, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new { message = "Thiếu tham số q (câu hỏi)." });
        }

        var diagnostics = new SearchDiagnostics();
        var top = await _searchService.SearchAsync(q, topK: 5, diagnostics, cancellationToken);
        return Ok(new
        {
            Query = q,
            FullText = diagnostics.FullText,
            Keywords = diagnostics.Keywords,
            PoolTop20 = diagnostics.Pool,
            FinalTop = diagnostics.Top,
            FinalCount = top.Count
        });
    }

    /// <summary>Request nạp văn bản qua JSON.</summary>
    public record IngestRequest(
        string Title,
        string Content,
        string? DocType,
        string? DocNumber,
        string? IssuedBy);

    /// <summary>Request hỏi đáp.</summary>
    public record AskRequest(string Question);

    /// <summary>Request cập nhật ngày hiệu lực / hết hiệu lực (null = xóa ngày).</summary>
    public record UpdateValidityRequest(DateTime? EffectiveDate, DateTime? ExpiryDate);

    /// <summary>
    /// Nạp văn bản y tế. Hỗ trợ:
    /// - multipart/form-data: field "file" (.txt/.md/.docx/.pdf/.xlsx/.xml/.html/.csv)
    ///   + form fields title, docType, docNumber, issuedBy;
    /// - application/json: IngestRequest.
    /// </summary>
    [HttpPost("documents")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> IngestAsync(CancellationToken cancellationToken)
    {
        string? title, content, docType, docNumber, issuedBy, sourceFileName = null;
        byte[]? originalBytes = null;
        // Phương thức đọc file (lớp chữ PDF / OCR chuẩn / OCR nâng cao...) — báo lại người dùng
        string? extractionMethod = null;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            var file = form.Files.Count > 0 ? form.Files[0] : null;
            if (file == null)
            {
                return BadRequest(new { message = "Thiếu file văn bản (field \"file\")." });
            }

            // Đệm file vào bộ nhớ: vừa trích text vừa lưu bản gốc (giới hạn 20 MB).
            // Giữ bytes thay vì stream vì extractor dispose stream sau khi đọc.
            await using (var buffer = new MemoryStream())
            {
                await file.CopyToAsync(buffer, cancellationToken);
                originalBytes = buffer.ToArray();
            }

            try
            {
                var extraction = await _textExtractor.ExtractDetailedAsync(
                    file.FileName, new MemoryStream(originalBytes), cancellationToken);
                content = extraction.Text;
                extractionMethod = extraction.Method;
            }
            catch (NotSupportedException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            sourceFileName = file.FileName;
            title = form["title"].FirstOrDefault() ?? Path.GetFileNameWithoutExtension(file.FileName);
            docType = form["docType"].FirstOrDefault() ?? "Khac";
            docNumber = form["docNumber"].FirstOrDefault();
            issuedBy = form["issuedBy"].FirstOrDefault();
        }
        else
        {
            var body = await Request.ReadFromJsonAsync<IngestRequest>(cancellationToken);
            if (body == null || string.IsNullOrWhiteSpace(body.Title) || string.IsNullOrWhiteSpace(body.Content))
            {
                return BadRequest(new { message = "Thiếu Title hoặc Content." });
            }
            title = body.Title;
            content = body.Content;
            docType = body.DocType ?? "Khac";
            docNumber = body.DocNumber;
            issuedBy = body.IssuedBy;
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return BadRequest(new { message = "Nội dung văn bản rỗng." });
        }

        // Nạp lại văn bản đã có (trùng tên file hoặc trùng tiêu đề): tự THAY THẾ —
        // gỡ mềm bản cũ để trợ lý không tra ra chunk trùng lặp (câu trả lời dẫn nguồn đôi),
        // và báo rõ trong kết quả. Bản cũ vẫn khôi phục được (danh sách "kèm đã gỡ").
        var duplicates = await _db.MedicalDocuments
            .Where(d => d.IsActive
                && ((sourceFileName != null && d.SourceFileName == sourceFileName) || d.Title == title))
            .ToListAsync(cancellationToken);
        foreach (var old in duplicates)
        {
            old.IsActive = false;
        }
        if (duplicates.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
            await _embeddingIndex.DetachInactiveAsync(cancellationToken); // gỡ bản cũ khỏi HNSW
            _logger.LogInformation(
                "Nạp lại văn bản \"{Title}\" — đã thay thế {Count} bản trùng trước đó", title, duplicates.Count);
        }

        var document = await _ingestService.IngestAsync(
            title!, content, docType!, docNumber, issuedBy, sourceFileName,
            cancellationToken: cancellationToken);

        // Lưu file gốc để xem/tải lại (chỉ khi nạp qua file)
        if (originalBytes != null && sourceFileName != null)
        {
            await _fileStorage.SaveAsync(
                "documents", document.Id, sourceFileName, new MemoryStream(originalBytes), cancellationToken);
        }

        var replacedNote = duplicates.Count > 0
            ? $" Văn bản này đã nạp trước đó — {duplicates.Count} bản cũ đã được thay thế (khôi phục được trong danh sách văn bản đã gỡ)."
            : "";
        var methodNote = extractionMethod != null ? $" Cách đọc: {extractionMethod}." : "";

        return Ok(new
        {
            document.Id,
            document.Title,
            document.DocType,
            document.DocNumber,
            ChunkCount = document.Chunks.Count,
            ReplacedCount = duplicates.Count,
            ExtractionMethod = extractionMethod,
            message = $"Đã nạp \"{document.Title}\" ({document.Chunks.Count} đoạn).{methodNote}{replacedNote}"
        });
    }

    /// <summary>
    /// Gỡ TẤT CẢ văn bản đang hiệu lực trong kho tri thức (xóa mềm) — dọn sạch để
    /// nạp lại từ đầu. Từng văn bản vẫn khôi phục được qua danh sách "kèm đã gỡ".
    /// </summary>
    [HttpDelete("documents")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteAllDocumentsAsync(CancellationToken cancellationToken)
    {
        var documents = await _db.MedicalDocuments
            .Where(d => d.IsActive)
            .ToListAsync(cancellationToken);
        foreach (var document in documents)
        {
            document.IsActive = false;
        }
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();
        await _embeddingIndex.DetachInactiveAsync(cancellationToken);

        _logger.LogInformation("Đã gỡ (mềm) TOÀN BỘ {Count} văn bản kho tri thức", documents.Count);
        return Ok(new
        {
            RemovedCount = documents.Count,
            message = documents.Count == 0
                ? "Kho tri thức không có văn bản nào đang hiệu lực để gỡ."
                : $"Đã gỡ toàn bộ {documents.Count} văn bản. Từng văn bản vẫn khôi phục được trong danh sách \"kèm đã gỡ\"."
        });
    }

    /// <summary>
    /// Liệt kê văn bản đã nạp.
    /// includeInactive=true: kèm cả văn bản đã gỡ (để khôi phục).
    /// </summary>
    [HttpGet("documents")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAsync(
        [FromQuery] bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _db.MedicalDocuments.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(d => d.IsActive);
        }

        var documents = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.DocType,
                d.DocNumber,
                d.IssuedBy,
                d.SourceFileName,
                d.IsActive,
                d.CreatedAt,
                d.EffectiveDate,
                d.ExpiryDate,
                ChunkCount = d.Chunks.Count
            })
            .ToListAsync(cancellationToken);

        return Ok(documents);
    }

    /// <summary>
    /// Gỡ (mềm) TẤT CẢ văn bản ĐÃ HẾT HIỆU LỰC đang còn trong kho — dọn danh sách
    /// cho gọn (truy hồi RAG vốn đã tự loại chúng). Khôi phục được qua "kèm đã gỡ".
    /// </summary>
    [HttpDelete("documents/expired")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteExpiredDocumentsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var expired = await _db.MedicalDocuments
            .Where(d => d.IsActive && d.ExpiryDate != null && d.ExpiryDate <= now)
            .ToListAsync(cancellationToken);
        foreach (var document in expired)
        {
            document.IsActive = false;
        }
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();
        await _embeddingIndex.DetachInactiveAsync(cancellationToken);

        _logger.LogInformation("Đã gỡ (mềm) {Count} văn bản hết hiệu lực khỏi kho tri thức", expired.Count);
        return Ok(new
        {
            RemovedCount = expired.Count,
            message = expired.Count == 0
                ? "Không có văn bản nào đã hết hiệu lực trong kho."
                : $"Đã gỡ {expired.Count} văn bản hết hiệu lực. Từng văn bản vẫn khôi phục được (bật \"Hiện đã gỡ\")."
        });
    }

    /// <summary>
    /// Cập nhật ngày hiệu lực / hết hiệu lực của một văn bản (người dùng nhập tay
    /// trên web admin — hệ thống KHÔNG tự đoán ngày từ nội dung nữa). Truyền null
    /// để xóa ngày. AI tự ngừng trích dẫn văn bản ngoài khoảng hiệu lực.
    /// </summary>
    [HttpPut("documents/{id:long}/validity")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDocumentValidityAsync(
        long id,
        [FromBody] UpdateValidityRequest request,
        CancellationToken cancellationToken)
    {
        var document = await _db.MedicalDocuments
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (document == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản #{id}." });
        }

        // Npgsql chỉ nhận UTC cho timestamptz
        static DateTime? ToUtc(DateTime? d) =>
            d is { Kind: DateTimeKind.Unspecified } u ? DateTime.SpecifyKind(u, DateTimeKind.Utc) : d;

        var effective = ToUtc(request.EffectiveDate);
        var expiry = ToUtc(request.ExpiryDate);
        if (effective != null && expiry != null && expiry < effective)
        {
            return BadRequest(new { message = "Ngày hết hiệu lực phải sau ngày có hiệu lực." });
        }

        document.EffectiveDate = effective;
        document.ExpiryDate = expiry;
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();

        _logger.LogInformation(
            "Cập nhật hiệu lực văn bản #{Id} \"{Title}\": {From} → {To}",
            id, document.Title,
            effective?.ToString("dd/MM/yyyy") ?? "(trống)",
            expiry?.ToString("dd/MM/yyyy") ?? "(trống)");
        return Ok(new { message = $"Đã cập nhật hiệu lực cho \"{document.Title}\"." });
    }

    /// <summary>Chi tiết một văn bản: metadata + toàn văn nội dung đã trích xuất.</summary>
    [HttpGet("documents/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDocumentAsync(long id, CancellationToken cancellationToken)
    {
        var document = await _db.MedicalDocuments
            .Where(d => d.Id == id)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.DocType,
                d.DocNumber,
                d.IssuedBy,
                d.SourceFileName,
                d.IsActive,
                d.CreatedAt,
                ChunkCount = d.Chunks.Count,
                d.Content
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (document == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản #{id}." });
        }
        return Ok(document);
    }

    /// <summary>Tải/xem file gốc của văn bản (nếu đã lưu khi nạp). download=true: ép tải về.</summary>
    [HttpGet("documents/{id:long}/file")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetDocumentFile(long id, [FromQuery] bool download)
    {
        var stored = _fileStorage.Find("documents", id);
        if (stored == null)
        {
            return NotFound(new
            {
                message = "Không có file gốc — văn bản này được nạp trước khi hệ thống lưu file, "
                    + "hoặc được nạp bằng nội dung trực tiếp (không qua file)."
            });
        }

        // inline: trình duyệt tự mở nếu hỗ trợ (pdf, txt...); attachment: ép tải về
        var disposition = download ? "attachment" : "inline";
        Response.Headers.ContentDisposition =
            $"{disposition}; filename*=UTF-8''{Uri.EscapeDataString(stored.Value.FileName)}";
        return PhysicalFile(stored.Value.PhysicalPath, stored.Value.ContentType);
    }

    /// <summary>Gỡ văn bản khỏi kho tri thức (soft delete) — có thể khôi phục.</summary>
    [HttpDelete("documents/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateAsync(long id, CancellationToken cancellationToken)
    {
        var document = await _db.MedicalDocuments.FindAsync(new object[] { id }, cancellationToken);
        if (document == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản #{id}." });
        }

        document.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();
        await _embeddingIndex.DetachInactiveAsync(cancellationToken); // gỡ vector khỏi cây HNSW ngay
        return Ok(new { message = $"Đã gỡ văn bản \"{document.Title}\" khỏi kho tri thức. Có thể khôi phục khi cần." });
    }

    /// <summary>Khôi phục văn bản đã gỡ — AI tra cứu trở lại ngay.</summary>
    [HttpPost("documents/{id:long}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreAsync(long id, CancellationToken cancellationToken)
    {
        var document = await _db.MedicalDocuments.FindAsync(new object[] { id }, cancellationToken);
        if (document == null)
        {
            return NotFound(new { message = $"Không tìm thấy văn bản #{id}." });
        }

        document.IsActive = true;
        await _db.SaveChangesAsync(cancellationToken);
        _embeddingIndex.Invalidate();
        // Nạp lại vector từ bytea vào HNSW cho văn bản vừa khôi phục (chỉ đồng bộ đoạn
        // của văn bản active nên đúng phần này). Lặp theo lô đến khi hết.
        for (var guard = 0; guard < 100; guard++)
        {
            var synced = await _embeddingIndex.SyncFromStoredAsync(2000, cancellationToken);
            if (synced == 0)
            {
                break;
            }
        }
        return Ok(new { message = $"Đã khôi phục văn bản \"{document.Title}\" — AI tra cứu trở lại ngay." });
    }

    /// <summary>Hỏi đáp nghiệp vụ dựa trên văn bản đã nạp (RAG).</summary>
    /// <remarks>
    /// Trả JSON như bình thường, NHƯNG stream bằng chunked transfer và phát
    /// "keepalive" (khoảng trắng) mỗi 2s trong lúc truy hồi + gọi LLM.
    /// Lý do: Load Balancer VNPT (portal id 227) đóng kết nối khi im lặng ~5s,
    /// mà một lượt RAG online mất ~15-18s (retrieval + OpenRouter) → LB cắt →
    /// client nhận "Không kết nối được máy chủ". Khoảng trắng là whitespace hợp
    /// lệ ĐỨNG TRƯỚC giá trị JSON nên JSON.parse ở extension bỏ qua, không cần
    /// sửa client. Header X-Accel-Buffering:no để cả 2 tầng nginx (web-admin +
    /// ingress) không gom buffer, đẩy byte ra LB ngay.
    /// </remarks>
    [HttpPost("ask")]
    // Chỉ endpoint này gắn cổng cấp phép: các endpoint quản trị văn bản trong cùng
    // controller do web-admin gọi bằng JWT, không có khóa bản quyền của cơ sở.
    [RequireLicense]
    [EnableRateLimiting("rl-ask")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(AssistantAnswer))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task AskAsync(
        [FromBody] AskRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.Question))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { message = "Thiếu câu hỏi." }, cancellationToken);
            return;
        }

        // Mở response 200 + tắt buffer để byte keepalive đi thẳng ra LB.
        Response.StatusCode = StatusCodes.Status200OK;
        Response.ContentType = "application/json; charset=utf-8";
        Response.Headers["X-Accel-Buffering"] = "no";
        HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        var askStopwatch = System.Diagnostics.Stopwatch.StartNew();
        var askTask = _assistantService.AskAsync(request.Question, cancellationToken);

        // Trong lúc chờ, cứ 2s nhả một khoảng trắng để giữ kết nối sống qua LB.
        var keepAlive = new byte[] { (byte)' ' };

        // QUAN TRỌNG: khi tới đây header 200 đã gửi đi (Response.HasStarted=true),
        // nên KHÔNG thể để lỗi lọt ra GlobalExceptionMiddleware — nó sẽ cố set
        // StatusCode trên response đã bắt đầu → Kestrel văng "response already
        // started" → client nhận "transfer closed". Vì vậy tự bắt lỗi tại đây và
        // ghi một JSON AssistantAnswer thay thế (extension vẫn parse được).
        AssistantAnswer answer;
        try
        {
            while (!askTask.IsCompleted)
            {
                var finished = await Task.WhenAny(askTask, Task.Delay(TimeSpan.FromSeconds(2), cancellationToken));
                if (finished == askTask)
                {
                    break;
                }

                await Response.Body.WriteAsync(keepAlive, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            answer = await askTask;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Client tự ngắt (đóng tab) — không cần ghi gì thêm.
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hỏi đáp RAG thất bại sau khi đã mở response.");
            answer = new AssistantAnswer
            {
                Answer = "Xin lỗi, hệ thống gặp sự cố khi truy hồi văn bản. Vui lòng thử lại sau giây lát."
            };
        }

        // Ghi lịch sử sử dụng cho thống kê dashboard (không ảnh hưởng response)
        askStopwatch.Stop();
        await _usageRecorder.RecordAsync(
            UsageRecorder.EventAsk,
            durationMs: askStopwatch.ElapsedMilliseconds,
            facilityCode: Request.Headers["X-Facility-Code"],
            staffCode: Request.Headers["X-Staff-Code"],
            preview: request.Question,
            detailJson: JsonSerializer.Serialize(new
            {
                question = request.Question,
                answer = answer.Answer,
                fromLlm = answer.FromLlm,
                citations = answer.Citations.Select(c => new { c.Title, c.DocNumber }),
            }, _jsonOptions),
            cancellationToken: CancellationToken.None);

        await TryBillAskAsync(request.Question);

        await JsonSerializer.SerializeAsync(Response.Body, answer, _jsonOptions, cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    /// <summary>
    /// Ghi sổ một lượt hỏi đáp. Hiện chỉ đếm sản lượng, chưa tính tiền phần này —
    /// nhưng phải có số liệu từ bây giờ thì sau này mới quyết định được giá.
    ///
    /// Ghi hỏng KHÔNG được làm gãy câu trả lời (mà lúc này response đã mở, ném lỗi ra
    /// còn làm Kestrel văng "response already started"). Log mức Error để đối soát.
    /// </summary>
    private async Task TryBillAskAsync(string question)
    {
        if (_license.License is not { } license)
        {
            return;
        }

        try
        {
            await _billing.RecordAskAsync(
                license, Request.Headers["X-Facility-Code"], question, _license.StaffCode, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "MẤT DÒNG SỔ TÍNH TIỀN (hỏi đáp) — giấy phép {LicenseId} ({Facility})",
                license.Id, license.FacilityCode);
        }
    }
}
