using System.Text.RegularExpressions;
using AIValidation.Api.Data;
using AIValidation.Api.Services.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Kết quả truy hồi một đoạn văn bản liên quan câu hỏi.
/// </summary>
public record RetrievedChunk(
    long DocumentId,
    string DocumentTitle,
    string? DocNumber,
    int ChunkIndex,
    string Content,
    double Score);

/// <summary>
/// Tìm kiếm đoạn văn bản liên quan trong kho tri thức RAG.
/// Kết hợp 2 tầng: full-text search PostgreSQL (tsvector, config 'simple')
/// và ILIKE theo từ khóa (tiếng Việt không có stemmer built-in nên FTS đơn thuần
/// có thể bỏ sót biến thể — ILIKE bù lại với trọng số thấp hơn).
/// </summary>
/// <summary>Nhật ký chẩn đoán một lần truy hồi — soi vì sao một tài liệu không vào kết quả.</summary>
public class SearchDiagnostics
{
    /// <summary>Từ khóa đã chọn: từ, các biến thể tìm kiếm, số đoạn chứa.</summary>
    public List<object> Keywords { get; } = new();

    /// <summary>Top pool ứng viên trước rerank (điểm + trích đầu đoạn).</summary>
    public List<object> Pool { get; } = new();

    /// <summary>Kết quả cuối sau rerank + bảo hiểm từ khóa hiếm.</summary>
    public List<object> Top { get; } = new();

    /// <summary>Truy vấn full-text đã dựng (AND/OR) và số đoạn khớp — soi vì sao tầng 1 trắng tay.</summary>
    public object? FullText { get; set; }
}

public interface IDocumentSearchService
{
    Task<List<RetrievedChunk>> SearchAsync(
        string query, int topK = 5, SearchDiagnostics? diagnostics = null, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class DocumentSearchService : IDocumentSearchService
{
    private readonly AppDbContext _db;
    private readonly IDocumentReranker _reranker;
    private readonly IEmbeddingService _embedding;
    private readonly IEmbeddingIndex _embeddingIndex;
    private readonly IKnowledgeScope _knowledgeScope;
    private readonly ILogger<DocumentSearchService> _logger;

    public DocumentSearchService(
        AppDbContext db,
        IDocumentReranker reranker,
        IEmbeddingService embedding,
        IEmbeddingIndex embeddingIndex,
        IKnowledgeScope knowledgeScope,
        ILogger<DocumentSearchService> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _reranker = reranker ?? throw new ArgumentNullException(nameof(reranker));
        _embedding = embedding ?? throw new ArgumentNullException(nameof(embedding));
        _embeddingIndex = embeddingIndex ?? throw new ArgumentNullException(nameof(embeddingIndex));
        _knowledgeScope = knowledgeScope ?? throw new ArgumentNullException(nameof(knowledgeScope));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<RetrievedChunk>> SearchAsync(
        string query,
        int topK = 5,
        SearchDiagnostics? diagnostics = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        topK = Math.Clamp(topK, 1, 20);

        // Chỉ tra cứu văn bản ĐANG hiệu lực: chưa tới ngày hiệu lực (EffectiveDate
        // tương lai) hoặc đã hết hiệu lực (ExpiryDate quá hạn)
        // thì loại khỏi mọi tầng truy hồi — trợ lý không trích dẫn văn bản cũ.
        var now = DateTime.UtcNow;

        // Phạm vi kho tri thức của người hỏi: văn bản DÙNG CHUNG (FacilityId null) cộng
        // văn bản riêng của cơ sở họ và các cấp trên. Tách thành cờ + mảng vì EF dịch
        // `mảng.Contains(cột)` thành `= ANY(@p)`, còn so sánh null của biến bắt được thì
        // sinh SQL lạ. scopeAll=true (không có danh tính cơ sở) giữ nguyên hành vi cũ.
        var scopeIds = await _knowledgeScope.ApplicableFacilityIdsAsync(cancellationToken);
        var scopeAll = scopeIds == null;
        var scope = scopeIds ?? Array.Empty<long>();

        // Lấy nhiều ứng viên hơn topK để reranker có cái để chọn — càng nhiều ứng viên,
        // tài liệu nhỏ liên quan càng có cơ hội lọt vào trước khi rerank.
        var poolSize = Math.Clamp(topK * 6, 25, 40);

        var results = new Dictionary<long, RetrievedChunk>();

        // Thứ tự ưu tiên RIÊNG của từng tầng, giữ nguyên trật tự mà tầng đó sinh ra
        // (vector: cosine giảm dần; full-text: ts_rank giảm dần; từ khóa: biến thể hiếm
        // trước). Pool cuối cùng trộn 3 danh sách này theo lớp — xem ghi chú ở TronPool.
        var thuTuNguNghia = new List<long>();
        var thuTuFullText = new List<long>();
        var thuTuTuKhoa = new List<long>();
        var thuTuNguyenCum = new List<long>();

        // Tầng 0: NGỮ NGHĨA (vector) — hiểu câu hỏi diễn đạt khác từ ngữ trong văn bản
        // (vd hỏi "quyền lợi thẻ bảo trợ xã hội" vẫn khớp đoạn ghi "BT2 ... 100%").
        // Ollama không chạy thì tầng này tự bỏ qua, các tầng keyword vẫn hoạt động.
        if (_embedding.IsConfigured)
        {
            var queryVector = await _embedding.EmbedAsync(query, cancellationToken);
            if (queryVector != null)
            {
                // 30 hit chứ không phải 15: kho tri thức đã gần 20.000 vector, phần lớn là
                // dòng danh mục HIS na ná nhau, nên cửa sổ 15 quá chật — câu hỏi diễn đạt dài
                // bị loãng nghĩa và đoạn đúng rớt ngay ở tầng này.
                var hits = await _embeddingIndex.SearchAsync(queryVector, 30, cancellationToken);
                var hitIds = hits.Select(h => h.ChunkId).ToList();
                if (hitIds.Count > 0)
                {
                    var scoreById = hits.ToDictionary(h => h.ChunkId, h => h.Score);
                    var semanticChunks = await _db.DocumentChunks
                        .Where(c => hitIds.Contains(c.Id)
                            && (scopeAll || c.Document!.FacilityId == null
                                || scope.Contains(c.Document.FacilityId.Value)))
                        .Select(c => new { Chunk = c, c.Document!.Title, c.Document.DocNumber })
                        .ToListAsync(cancellationToken);
                    // Duyệt theo thứ tự HIT (cosine giảm dần) chứ không theo thứ tự DB trả về
                    var chunkById = semanticChunks.ToDictionary(x => x.Chunk.Id);
                    foreach (var hit in hits)
                    {
                        if (!chunkById.TryGetValue(hit.ChunkId, out var item))
                        {
                            continue;
                        }
                        results[item.Chunk.Id] = new RetrievedChunk(
                            item.Chunk.DocumentId, item.Title, item.DocNumber,
                            item.Chunk.ChunkIndex, item.Chunk.Content, hit.Score);
                        thuTuNguNghia.Add(item.Chunk.Id);
                    }
                }
            }
        }

        // Tầng 1: full-text search.
        //
        // KHÔNG dùng plainto_tsquery: nó nối MỌI từ trong câu hỏi bằng AND, mà config
        // 'simple' của PostgreSQL không biết tiếng Việt nên không loại một hư từ nào.
        // Hệ quả: "Mức hưởng BHYT đúng tuyến là bao nhiêu phần trăm?" thành
        // mức & hưởng & bhyt & đúng & tuyến & là & bao & nhiêu & phần & trăm — đòi một
        // đoạn chứa đủ 10 từ, gần như luôn khớp 0 đoạn. Cùng nội dung nhưng hỏi cụt
        // ("mức hưởng BHYT đúng tuyến") lại ra kết quả. Trợ lý vì thế chạy tốt với người
        // quen hệ thống và trả lời "không tìm thấy căn cứ" với người hỏi bằng câu đủ ý.
        //
        // Thay bằng tsquery tự dựng: bỏ từ để hỏi, gộp cặp viết tắt ↔ dạng đầy đủ
        // (BHYT ↔ bảo hiểm y tế), AND trước cho chính xác; AND trắng tay thì hạ xuống OR
        // và để ts_rank + reranker lọc — thà có ứng viên để chọn còn hơn không có gì.
        var andTsQuery = BuildTsQuery(query, useAnd: true);
        var orTsQuery = BuildTsQuery(query, useAnd: false);

        async Task<List<FtsHit>> RunFtsAsync(string tsQuery) => await _db.DocumentChunks
            .Where(c => c.Document!.IsActive
                && (c.Document.ExpiryDate == null || c.Document.ExpiryDate > now)
                    && (c.Document.EffectiveDate == null || c.Document.EffectiveDate <= now)
                && (scopeAll || c.Document.FacilityId == null || scope.Contains(c.Document.FacilityId.Value))
                && c.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", tsQuery)))
            .Select(c => new FtsHit
            {
                Chunk = c,
                Title = c.Document!.Title,
                DocNumber = c.Document.DocNumber,
                Rank = c.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", tsQuery))
            })
            .OrderByDescending(x => x.Rank)
            .Take(poolSize)
            .ToListAsync(cancellationToken);

        var ftsChunks = new List<FtsHit>();
        var ftsMode = "trống";
        if (andTsQuery != null)
        {
            ftsChunks = await RunFtsAsync(andTsQuery);
            ftsMode = "AND";
        }
        if (ftsChunks.Count == 0 && orTsQuery != null && orTsQuery != andTsQuery)
        {
            ftsChunks = await RunFtsAsync(orTsQuery);
            ftsMode = "OR (AND không khớp đoạn nào)";
        }

        if (diagnostics != null)
        {
            diagnostics.FullText = new { and = andTsQuery, or = orTsQuery, mode = ftsMode, matched = ftsChunks.Count };
        }

        foreach (var item in ftsChunks)
        {
            // Không ghi đè điểm ngữ nghĩa cao hơn (nếu đoạn đã vào từ tầng 0)
            if (!results.TryGetValue(item.Chunk.Id, out var existing) || existing.Score < item.Rank)
            {
                results[item.Chunk.Id] = new RetrievedChunk(
                    item.Chunk.DocumentId, item.Title, item.DocNumber,
                    item.Chunk.ChunkIndex, item.Chunk.Content, item.Rank);
            }
            thuTuFullText.Add(item.Chunk.Id);
        }

        // Tầng 2: ILIKE theo từ khóa (bù cho biến thể tiếng Việt).
        // Ngưỡng 3 ký tự để không bỏ sót từ khóa y tế ngắn nhưng quan trọng
        // như "lao", "gan", "phổi"; bỏ stopword thường gặp để giảm nhiễu.
        var candidateWords = query
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            // Lột dấu câu bám vào từ ("chuyển?" → "chuyển", "(BT2)" → "BT2")
            .Select(w => w.Trim('?', '.', ',', ':', ';', '!', '(', ')', '"', '\'', '“', '”'))
            .Where(w => w.Length >= 3 && !QueryStopwords.Contains(w))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Mỗi BIẾN THỂ là một ứng viên ĐỘC LẬP với count riêng:
        // - từ dạng mã "BT2" sinh thêm "BT 2", "BT<tab>2", "BT-2" (bảng Excel tách ô);
        // - KHÔNG cộng dồn count các biến thể — biến thể lỏng ("BT 2") có thể khớp bậy
        //   hàng nghìn đoạn và dìm chết biến thể chuẩn ("BT2" liền, "BT<tab>2" chỉ có
        //   trong file Excel) vốn cực hiếm và chính là thứ cần tìm.
        var variantFreq = new List<(string Variant, int Count)>();
        foreach (var w in candidateWords)
        {
            foreach (var variant in KeywordVariants(w).Distinct())
            {
                var count = await _db.DocumentChunks
                    .CountAsync(c => c.Document!.IsActive
                        && (c.Document.ExpiryDate == null || c.Document.ExpiryDate > now)
                    && (c.Document.EffectiveDate == null || c.Document.EffectiveDate <= now)
                        && (scopeAll || c.Document.FacilityId == null || scope.Contains(c.Document.FacilityId.Value))
                        && EF.Functions.ILike(c.Content, $"%{variant}%"), cancellationToken);
                variantFreq.Add((variant, count));
            }
        }
        var keywords = variantFreq
            .Where(x => x.Count > 0)
            .OrderBy(x => x.Count)
            .Take(6)
            .ToList();

        if (diagnostics != null)
        {
            foreach (var (variant, count) in variantFreq.OrderBy(k => k.Count))
            {
                diagnostics.Keywords.Add(new { variant, count, selected = keywords.Any(k => k.Variant == variant) });
            }
        }

        // Bổ sung ứng viên bằng ILIKE — LUÔN chạy, không phụ thuộc FTS đã đủ pool hay chưa.
        // Điểm theo ĐỘ HIẾM: biến thể càng hiếm điểm càng cao. Biến thể hiếm (≤30 đoạn)
        // lấy TOÀN BỘ đoạn khớp (deterministic — không bỏ sót); biến thể phổ biến chỉ
        // lấy mẫu nhỏ vì điểm thấp, vai trò phụ.
        foreach (var (variant, count) in keywords)
        {
            var likeScore = Math.Max(0.05, 1.0 / (1 + count));
            var fetchLimit = count <= 30 ? count : topK * 2;

            var likeChunks = await _db.DocumentChunks
                .Where(c => c.Document!.IsActive
                    && (c.Document.ExpiryDate == null || c.Document.ExpiryDate > now)
                    && (c.Document.EffectiveDate == null || c.Document.EffectiveDate <= now)
                    && (scopeAll || c.Document.FacilityId == null || scope.Contains(c.Document.FacilityId.Value))
                    && EF.Functions.ILike(c.Content, $"%{variant}%"))
                .Select(c => new { Chunk = c, c.Document!.Title, c.Document.DocNumber })
                .Take(fetchLimit)
                .ToListAsync(cancellationToken);

            foreach (var item in likeChunks)
            {
                // Đoạn khớp nhiều biến thể hiếm giữ điểm CAO NHẤT trong các lần khớp
                if (!results.TryGetValue(item.Chunk.Id, out var existing) || existing.Score < likeScore)
                {
                    results[item.Chunk.Id] = new RetrievedChunk(
                        item.Chunk.DocumentId, item.Title, item.DocNumber,
                        item.Chunk.ChunkIndex, item.Chunk.Content, likeScore);
                }
                // Ghi vào lớp từ khóa DÙ có ghi đè điểm hay không: đoạn chứa từ khóa HIẾM
                // phải có mặt trong cửa sổ chấm điểm của reranker, bất kể điểm thô bao nhiêu.
                thuTuTuKhoa.Add(item.Chunk.Id);
            }
        }

        // Tầng 3: khớp NGUYÊN CỤM query (vd "thuốc cổ truyền"). Đoạn chứa đúng cụm
        // gần như chắc chắn liên quan nhất — cho điểm cao nhất (ghi đè điểm FTS/ILIKE)
        // để LUÔN nổi lên đầu, không phụ thuộc reranker LLM (model free hay rate-limit).
        // Câu hỏi dài (cả câu) thường không khớp nguyên cụm nên tầng này tự bỏ qua.
        var phrase = query.Trim();
        if (phrase.Length >= 3)
        {
            var phraseChunks = await _db.DocumentChunks
                .Where(c => c.Document!.IsActive
                    && (c.Document.ExpiryDate == null || c.Document.ExpiryDate > now)
                    && (c.Document.EffectiveDate == null || c.Document.EffectiveDate <= now)
                    && (scopeAll || c.Document.FacilityId == null || scope.Contains(c.Document.FacilityId.Value))
                    && EF.Functions.ILike(c.Content, $"%{phrase}%"))
                .Select(c => new { Chunk = c, c.Document!.Title, c.Document.DocNumber })
                .Take(poolSize)
                .ToListAsync(cancellationToken);

            foreach (var item in phraseChunks)
            {
                results[item.Chunk.Id] = new RetrievedChunk(
                    item.Chunk.DocumentId, item.Title, item.DocNumber,
                    item.Chunk.ChunkIndex, item.Chunk.Content, 1.0);
                thuTuNguyenCum.Add(item.Chunk.Id);
            }
        }

        var pool = TronPoolRrf(results, thuTuNguyenCum, thuTuNguNghia, thuTuFullText, thuTuTuKhoa);

        // Rerank: chọn topK đoạn liên quan nhất, chống tài liệu lớn lấn át
        var top = await _reranker.RerankAsync(query, pool, topK, cancellationToken);

        // BẢO HIỂM sau rerank: từ khóa RẤT HIẾM (mã như "BT2", "40.844" — chỉ vài đoạn
        // chứa) gần như chắc chắn là trọng tâm câu hỏi, nhưng LLM rerank hay chấm nhầm
        // các đoạn dạng BẢNG số liệu là "không liên quan" rồi gạt khỏi top-k.
        // Nếu không đoạn nào chứa từ khóa hiếm sống sót, ép đoạn tốt nhất của nó vào
        // (thay vị trí cuối) để câu trả lời không "mù" đúng dữ liệu cần nhất.
        var forcedCount = 0;
        foreach (var (variant, count) in keywords.Where(k => k.Count <= 30).Take(2))
        {
            if (top.Any(t => t.Content.Contains(variant, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }
            // pool đã xếp sẵn theo RRF nên đoạn đầu tiên khớp chính là đoạn tốt nhất
            var best = pool
                .FirstOrDefault(c => c.Content.Contains(variant, StringComparison.OrdinalIgnoreCase));
            if (best == null)
            {
                continue;
            }
            if (top.Count >= topK)
            {
                // Thay từ cuối lên, mỗi lần ép chiếm một vị trí khác nhau
                top[top.Count - 1 - forcedCount] = best;
            }
            else
            {
                top.Add(best);
            }
            forcedCount++;
            _logger.LogInformation(
                "Rerank bỏ sót từ khóa hiếm \"{Variant}\" ({Count} đoạn chứa) — đã ép đoạn tốt nhất vào kết quả", variant, count);
        }

        if (diagnostics != null)
        {
            foreach (var c in pool.Take(20))
            {
                diagnostics.Pool.Add(new
                {
                    c.DocumentTitle,
                    c.ChunkIndex,
                    Score = Math.Round(c.Score, 4),
                    Preview = c.Content.Length > 140 ? c.Content[..140] : c.Content
                });
            }
            foreach (var c in top)
            {
                diagnostics.Top.Add(new
                {
                    c.DocumentTitle,
                    c.ChunkIndex,
                    Score = Math.Round(c.Score, 4),
                    Preview = c.Content.Length > 140 ? c.Content[..140] : c.Content
                });
            }
        }

        _logger.LogInformation(
            "Truy hồi RAG: \"{Query}\" → full-text {FtsMode} khớp {Fts} đoạn → {Pool} ứng viên → {Count} đoạn sau rerank",
            query, ftsMode, ftsChunks.Count, pool.Count, top.Count);
        return top;
    }

    /// <summary>
    /// Hằng số làm mượt của RRF. k càng lớn thì chênh lệch giữa các hạng đầu càng nhỏ,
    /// tức càng coi trọng "được nhiều tầng cùng nhắc tới" hơn là "đứng nhất ở một tầng".
    /// 60 là giá trị trong bài gốc của Cormack (2009) và cũng là mặc định của
    /// Elasticsearch/Azure AI Search — không có lý do đổi khi chưa đo được gì tốt hơn.
    /// </summary>
    private const double RrfK = 60;

    /// <summary>Trọng số tầng khớp nguyên cụm: đoạn chứa đúng nguyên văn câu hỏi gần như
    /// chắc chắn là đoạn cần tìm, nhân đôi để nó vượt lên trước đồng thuận của các tầng kia.</summary>
    private const double TrongSoNguyenCum = 2.0;

    /// <summary>
    /// Trộn kết quả nhiều tầng bằng RRF (Reciprocal Rank Fusion) — cách các hệ tìm kiếm
    /// lai vẫn dùng để hợp nhất bảng xếp hạng vector và bảng xếp hạng từ khóa.
    ///
    /// Điểm của một đoạn = tổng của 1/(k + thứ hạng trong từng tầng). Chỉ dùng THỨ HẠNG,
    /// không dùng điểm thô — đây là điểm mấu chốt: điểm của ba tầng nằm trên ba thang đo
    /// không so sánh được với nhau (cosine 0,54–0,59 kể cả với đoạn chẳng liên quan;
    /// ts_rank ~0,07; độ hiếm ILIKE 1/(1+n) ~0,03). Xếp chung một danh sách theo điểm thô
    /// thì tầng vector chiếm sạch 20 chỗ mà reranker LLM chấm được, đoạn chứa câu trả lời
    /// nằm ở tầng khác không bao giờ được nhìn tới. Đó chính là lỗi đã gây hồi quy khi
    /// nâng số hit vector từ 15 lên 30.
    ///
    /// Hệ quả có lợi thứ hai: đoạn được NHIỀU tầng cùng trả về sẽ cộng dồn điểm và nổi lên —
    /// sự đồng thuận giữa ngữ nghĩa và từ khóa là tín hiệu mạnh hơn hẳn một tầng đơn lẻ.
    /// </summary>
    internal static List<RetrievedChunk> TronPoolRrf(
        Dictionary<long, RetrievedChunk> results,
        List<long> nguyenCum,
        List<long> nguNghia,
        List<long> fullText,
        List<long> tuKhoa)
    {
        var diem = new Dictionary<long, double>();

        void CongDiem(List<long> tang, double trongSo)
        {
            var hang = 0;
            var daTinh = new HashSet<long>();
            foreach (var id in tang)
            {
                // Một tầng có thể trả trùng id (vd đoạn khớp nhiều biến thể từ khóa);
                // chỉ tính lần xuất hiện đầu tiên, nếu không một tầng tự cộng điểm cho mình.
                if (!daTinh.Add(id))
                {
                    continue;
                }
                hang++;
                diem[id] = diem.GetValueOrDefault(id) + (trongSo / (RrfK + hang));
            }
        }

        CongDiem(nguyenCum, TrongSoNguyenCum);
        CongDiem(nguNghia, 1.0);
        CongDiem(fullText, 1.0);
        CongDiem(tuKhoa, 1.0);

        return diem
            .OrderByDescending(kv => kv.Value)
            .Where(kv => results.ContainsKey(kv.Key))
            // Ghi đè Score bằng điểm RRF: từ đây trở đi mọi nơi (reranker, chẩn đoán,
            // lớp bảo hiểm sau rerank) đều đọc cùng MỘT thang đo.
            .Select(kv => results[kv.Key] with { Score = kv.Value })
            .ToList();
    }

    /// <summary>Một đoạn khớp full-text kèm điểm ts_rank (kiểu tường minh để dùng chung cho 2 lượt AND/OR).</summary>
    private sealed class FtsHit
    {
        public required Data.Entities.DocumentChunk Chunk { get; init; }
        public required string Title { get; init; }
        public string? DocNumber { get; init; }
        public float Rank { get; init; }
    }

    /// <summary>
    /// Hư từ và từ để hỏi tiếng Việt. PostgreSQL config 'simple' không có từ điển tiếng Việt
    /// nên không tự loại được — phải loại ở đây, nếu không câu hỏi đủ ý sẽ đòi văn bản
    /// chứa cả "là", "bao", "nhiêu" và không khớp gì.
    /// </summary>
    private static readonly HashSet<string> QueryStopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "là", "gì", "của", "các", "cho", "với", "khi", "này", "trong", "được", "những",
        "nào", "thì", "và", "có", "một", "theo", "bao", "nhiêu", "thế", "sao", "vậy",
        "ạ", "ai", "mấy", "đâu", "tại", "về", "hay", "hoặc", "phải", "nên", "cần",
        "bị", "chưa", "đã", "sẽ", "bằng", "như", "để", "từ", "trên", "dưới", "đến",
        "tới", "mà", "nếu", "còn", "cũng", "rằng", "do", "bởi", "nữa",
        "phần", "trăm", "hỏi", "biết", "xin", "vui", "lòng"
    };
    // CỐ Ý không có "vào" và "ra": "ngày vào viện" / "ngày ra viện" là chỉ tiêu XML 130,
    // bỏ hai từ đó là hỏng đúng nhóm câu hỏi hay gặp nhất.

    /// <summary>
    /// Cặp viết tắt ↔ dạng viết đầy đủ. Văn bản pháp quy viết tắt ("BHYT", "KCB"),
    /// người hỏi thường viết đầy đủ ("bảo hiểm y tế") — về mặt từ khóa đó là hai chuỗi
    /// khác hẳn nhau, không cách nào khớp nếu không nối lại ở đây.
    /// </summary>
    private static readonly (string Abbrev, string[] Words)[] Abbreviations =
    {
        ("bhyt", new[] { "bảo", "hiểm", "y", "tế" }),
        ("bhxh", new[] { "bảo", "hiểm", "xã", "hội" }),
        ("cskcb", new[] { "cơ", "sở", "khám", "chữa", "bệnh" }),
        ("kcb", new[] { "khám", "chữa", "bệnh" }),
        ("dvkt", new[] { "dịch", "vụ", "kỹ", "thuật" }),
        ("cđha", new[] { "chẩn", "đoán", "hình", "ảnh" }),
        ("pttt", new[] { "phẫu", "thuật", "thủ", "thuật" }),
        ("ttyt", new[] { "trung", "tâm", "y", "tế" }),
        ("bvđk", new[] { "bệnh", "viện", "đa", "khoa" }),
        ("hstc", new[] { "hồi", "sức", "tích", "cực" }),
        ("bhtn", new[] { "bảo", "hiểm", "thất", "nghiệp" })
    };

    /// <summary>
    /// Dựng chuỗi cho <c>to_tsquery('simple', ...)</c> từ câu hỏi người dùng.
    /// Bỏ hư từ, gộp cặp viết tắt thành nhóm OR, nối các từ còn lại bằng AND
    /// (<paramref name="useAnd"/> = true) hoặc OR. Trả null khi không còn từ nào dùng được.
    /// </summary>
    internal static string? BuildTsQuery(string query, bool useAnd)
    {
        // Chỉ giữ chữ và số: mọi ký tự có nghĩa cú pháp trong to_tsquery (& | ! ( ) : *)
        // bị loại ngay từ đây nên chuỗi dựng ra không thể sai cú pháp.
        var tokens = Regex.Matches(query.ToLowerInvariant(), @"[\p{L}\p{N}]+")
            .Select(m => m.Value)
            .ToList();
        if (tokens.Count == 0)
        {
            return null;
        }

        var join = useAnd ? " & " : " | ";
        var fragments = new List<string>();
        var used = new bool[tokens.Count];

        string Group(string abbrev, string[] words) =>
            $"('{abbrev}' | {string.Join(useAnd ? " & " : " | ", words.Select(w => $"'{w}'"))})";

        // Dạng đầy đủ xuất hiện trong câu hỏi → thay cả cụm bằng nhóm OR.
        // Duyệt theo thứ tự bảng: cụm dài ("cơ sở khám chữa bệnh") đứng trước cụm ngắn
        // lồng trong nó ("khám chữa bệnh") nên luôn khớp cụm dài trước.
        bool MatchesAt(string[] words, int start)
        {
            for (var k = 0; k < words.Length; k++)
            {
                if (used[start + k] || tokens[start + k] != words[k])
                {
                    return false;
                }
            }
            return true;
        }

        foreach (var (abbrev, words) in Abbreviations)
        {
            for (var i = 0; i + words.Length <= tokens.Count; i++)
            {
                if (!MatchesAt(words, i))
                {
                    continue;
                }
                for (var k = 0; k < words.Length; k++)
                {
                    used[i + k] = true;
                }
                fragments.Add(Group(abbrev, words));
            }
        }

        // Viết tắt xuất hiện trong câu hỏi → cũng mở ra dạng đầy đủ.
        for (var i = 0; i < tokens.Count; i++)
        {
            if (used[i])
            {
                continue;
            }
            var pair = Abbreviations.FirstOrDefault(a => a.Abbrev == tokens[i]);
            if (pair.Abbrev != null)
            {
                used[i] = true;
                fragments.Add(Group(pair.Abbrev, pair.Words));
            }
        }

        // Các từ còn lại. Bỏ hư từ — trừ khi bỏ xong thì chẳng còn gì (câu hỏi toàn hư từ),
        // lúc đó giữ nguyên còn hơn trả null.
        var rest = tokens.Where((t, i) => !used[i]).ToList();
        var kept = rest.Where(t => !QueryStopwords.Contains(t)).ToList();
        if (kept.Count == 0 && fragments.Count == 0)
        {
            kept = rest;
        }
        fragments.AddRange(kept.Select(t => $"'{t}'"));

        var distinct = fragments.Distinct(StringComparer.Ordinal).ToList();
        return distinct.Count == 0 ? null : string.Join(join, distinct);
    }

    /// <summary>
    /// Các biến thể tìm kiếm của một từ khóa. Từ dạng MÃ (chữ liền số như "BT2")
    /// thêm biến thể tách "BT 2", "BT&lt;tab&gt;2", "BT-2" — vì bảng Excel hay để
    /// mã và số ở hai ô cạnh nhau.
    /// </summary>
    internal static List<string> KeywordVariants(string word)
    {
        var variants = new List<string> { word };
        var match = Regex.Match(word, @"^([A-Za-zÀ-ỹ]+)(\d+)$");
        if (match.Success)
        {
            var letters = match.Groups[1].Value;
            var digits = match.Groups[2].Value;
            variants.Add($"{letters} {digits}");
            variants.Add($"{letters}\t{digits}");
            variants.Add($"{letters}-{digits}");
        }
        return variants;
    }
}
