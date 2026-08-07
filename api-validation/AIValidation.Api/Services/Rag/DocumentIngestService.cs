using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Nạp văn bản y tế vào kho tri thức RAG:
/// nhận toàn văn → chia đoạn (chunk ~1200 ký tự, chồng lấn 200) → lưu DB,
/// PostgreSQL tự sinh tsvector cho từng đoạn để tìm kiếm full-text.
/// </summary>
public interface IDocumentIngestService
{
    /// <summary>
    /// effectiveDate/expiryDate: ngày hiệu lực / hết hiệu lực của văn bản (nếu biết).
    /// Văn bản quá expiryDate bị loại khỏi truy hồi RAG — trợ lý không trích dẫn
    /// văn bản đã hết hiệu lực.
    /// </summary>
    Task<MedicalDocument> IngestAsync(
        string title,
        string content,
        string docType = "Khac",
        string? docNumber = null,
        string? issuedBy = null,
        string? sourceFileName = null,
        DateTime? effectiveDate = null,
        DateTime? expiryDate = null,
        CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class DocumentIngestService : IDocumentIngestService
{
    private const int ChunkSize = 1200;
    private const int ChunkOverlap = 200;

    private readonly AppDbContext _db;
    private readonly IEmbeddingBackfill _backfill;
    private readonly ILogger<DocumentIngestService> _logger;

    public DocumentIngestService(
        AppDbContext db,
        IEmbeddingBackfill backfill,
        ILogger<DocumentIngestService> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _backfill = backfill ?? throw new ArgumentNullException(nameof(backfill));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<MedicalDocument> IngestAsync(
        string title,
        string content,
        string docType = "Khac",
        string? docNumber = null,
        string? issuedBy = null,
        string? sourceFileName = null,
        DateTime? effectiveDate = null,
        DateTime? expiryDate = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        // KHÔNG tự bóc ngày hiệu lực từ nội dung nữa — regex hay nhầm ngày ký/ngày
        // trích dẫn văn bản khác (nhất là công văn scan). Ngày chỉ đến từ caller
        // (vbpl trả metadata chuẩn) hoặc người dùng tự nhập trên web admin.

        var document = new MedicalDocument
        {
            Title = title.Trim(),
            DocType = docType,
            DocNumber = docNumber,
            IssuedBy = issuedBy,
            SourceFileName = sourceFileName,
            // Npgsql chỉ nhận UTC cho timestamptz — ngày parse từ văn bản thường Kind=Unspecified
            EffectiveDate = effectiveDate is { Kind: DateTimeKind.Unspecified } e
                ? DateTime.SpecifyKind(e, DateTimeKind.Utc) : effectiveDate,
            ExpiryDate = expiryDate is { Kind: DateTimeKind.Unspecified } x
                ? DateTime.SpecifyKind(x, DateTimeKind.Utc) : expiryDate,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };

        var index = 0;
        foreach (var chunk in SplitIntoChunks(content))
        {
            document.Chunks.Add(new DocumentChunk
            {
                ChunkIndex = index++,
                Content = chunk
            });
        }

        _db.MedicalDocuments.Add(document);
        await _db.SaveChangesAsync(cancellationToken);

        // Chỉ mục NGỮ NGHĨA giao cho worker nền (EmbeddingBackfillService) — upload
        // trả về ngay không phải chờ embed; thiếu embedding thì tìm keyword vẫn chạy.
        _backfill.Poke();

        _logger.LogInformation(
            "Đã nạp văn bản \"{Title}\" ({DocType}): {ChunkCount} đoạn, {Length} ký tự",
            document.Title, document.DocType, document.Chunks.Count, content.Length);

        return document;
    }

    /// <summary>
    /// Chia văn bản thành đoạn ~1200 ký tự, ưu tiên cắt tại ranh giới đoạn văn/câu,
    /// chồng lấn 200 ký tự để không mất ngữ cảnh giữa hai đoạn liền nhau.
    /// </summary>
    internal static IEnumerable<string> SplitIntoChunks(string content)
    {
        content = content.Replace("\r\n", "\n").Trim();
        if (content.Length <= ChunkSize)
        {
            yield return content;
            yield break;
        }

        var position = 0;
        while (position < content.Length)
        {
            var length = Math.Min(ChunkSize, content.Length - position);
            var slice = content.Substring(position, length);

            // Nếu chưa phải đoạn cuối, lùi về ranh giới tự nhiên gần nhất
            if (position + length < content.Length)
            {
                var cut = slice.LastIndexOf("\n\n", StringComparison.Ordinal);
                if (cut < ChunkSize / 2)
                {
                    cut = slice.LastIndexOf('\n');
                }
                if (cut < ChunkSize / 2)
                {
                    cut = slice.LastIndexOf(". ", StringComparison.Ordinal);
                }
                if (cut >= ChunkSize / 2)
                {
                    slice = slice[..(cut + 1)];
                }
            }

            yield return slice.Trim();

            var advance = Math.Max(slice.Length - ChunkOverlap, ChunkSize / 2);
            position += advance;
        }
    }
}
