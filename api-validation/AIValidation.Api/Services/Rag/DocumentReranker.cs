using System.Text.Json;
using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Sắp xếp lại (rerank) các đoạn ứng viên đã truy hồi để chọn ra top-k liên quan nhất.
///
/// Vì sao cần: truy hồi thô (full-text + ILIKE) xếp hạng theo tần suất từ khớp, nên
/// tài liệu rất lớn (vd Quyết định 25 có 1.852 đoạn) dễ lấn át các văn bản nhỏ nhưng
/// liên quan hơn (vd Quyết định 162 về lao). Rerank giải quyết đúng hiện tượng này.
/// </summary>
public interface IDocumentReranker
{
    /// <summary>
    /// Chọn top-k đoạn liên quan nhất câu hỏi từ tập ứng viên.
    /// Nếu ứng viên ≤ topK thì chỉ áp đa dạng hóa nguồn, không gọi LLM.
    /// </summary>
    Task<List<RetrievedChunk>> RerankAsync(
        string query,
        List<RetrievedChunk> candidates,
        int topK,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Reranker 2 tầng:
/// 1. LLM chấm điểm độ liên quan từng đoạn với câu hỏi (khi có LLM key) — chính xác nhất.
/// 2. Đa dạng hóa nguồn: giới hạn số đoạn tối đa mỗi văn bản trong kết quả cuối, để một
///    tài liệu lớn không chiếm hết top-k và che các tài liệu khác.
/// Không có LLM key thì bỏ tầng 1, chỉ dùng tầng 2 trên thứ hạng truy hồi gốc.
/// </summary>
public class DocumentReranker : IDocumentReranker
{
    /// <summary>Số đoạn tối đa lấy từ cùng một văn bản trong kết quả cuối.</summary>
    private const int MaxPerDocument = 3;

    private readonly ILLMProvider _llmProvider;
    private readonly LLMOptions _llmOptions;
    private readonly ILogger<DocumentReranker> _logger;

    public DocumentReranker(
        ILLMProvider llmProvider,
        IOptions<LLMOptions> llmOptions,
        ILogger<DocumentReranker> logger)
    {
        _llmProvider = llmProvider ?? throw new ArgumentNullException(nameof(llmProvider));
        _llmOptions = llmOptions?.Value ?? throw new ArgumentNullException(nameof(llmOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<RetrievedChunk>> RerankAsync(
        string query,
        List<RetrievedChunk> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (candidates.Count == 0)
        {
            return candidates;
        }

        // Thứ tự ứng viên ban đầu: theo điểm truy hồi (đã sắp ở tầng search)
        var ordered = candidates;

        // Tầng 1: LLM chấm điểm liên quan (nếu có key và có gì để chọn)
        if (candidates.Count > topK && _llmOptions.IsConfigured)
        {
            var llmOrder = await ScoreWithLlmAsync(query, candidates, cancellationToken);
            if (llmOrder != null)
            {
                ordered = llmOrder;
            }
        }

        // Tầng 2: đa dạng hóa nguồn khi lấy top-k
        var result = SelectDiverse(ordered, topK);

        _logger.LogInformation(
            "Rerank: {Candidates} ứng viên → {Selected} đoạn từ {Docs} văn bản",
            candidates.Count, result.Count, result.Select(r => r.DocumentId).Distinct().Count());

        return result;
    }

    /// <summary>
    /// Nhờ LLM chấm điểm liên quan từng đoạn (0-10), trả về danh sách sắp theo điểm giảm dần.
    /// Null nếu gọi LLM lỗi hoặc parse thất bại (để caller dùng thứ hạng gốc).
    /// </summary>
    private async Task<List<RetrievedChunk>?> ScoreWithLlmAsync(
        string query,
        List<RetrievedChunk> candidates,
        CancellationToken cancellationToken)
    {
        try
        {
            // Chỉ chấm điểm tối đa 20 ứng viên đầu (đã sắp theo điểm truy hồi) và cắt
            // ngắn nội dung — prompt gọn giúp model free trả lời nhanh, đỡ timeout.
            var scored = candidates.Count > 20 ? candidates[..20] : candidates;

            // Đánh số đoạn, cắt ngắn nội dung để tiết kiệm token
            var listText = string.Join("\n", scored.Select((c, i) =>
            {
                var excerpt = c.Content.Length > 200 ? c.Content[..200] : c.Content;
                excerpt = excerpt.Replace("\n", " ").Trim();
                return $"[{i}] ({c.DocumentTitle}) {excerpt}";
            }));

            var userPrompt =
                $"Câu hỏi: {query}\n\n"
                + $"Dưới đây là {scored.Count} đoạn văn bản được đánh số. Với MỖI đoạn, chấm điểm mức độ liên quan "
                + "trực tiếp tới câu hỏi từ 0 (không liên quan) đến 10 (trả lời thẳng câu hỏi).\n\n"
                + listText
                + "\n\nChỉ trả về JSON dạng {\"scores\":[{\"i\":0,\"s\":8},...]} cho tất cả các đoạn, không giải thích.";

            var response = await _llmProvider.GenerateAsync(new AIRequest
            {
                SystemPrompt = "Bạn là bộ chấm điểm độ liên quan cho tìm kiếm văn bản y tế. Chỉ trả JSON.",
                UserPrompt = userPrompt,
                Model = _llmOptions.Model,
                Temperature = 0,
                MaxTokens = Math.Min(_llmOptions.MaxTokens, 1024)
            }, cancellationToken);

            var scores = ParseScores(response.Content, scored.Count);
            if (scores == null)
            {
                return null;
            }

            // Sắp xếp phần được chấm theo điểm LLM giảm dần (giữ thứ tự gốc khi hòa điểm);
            // các ứng viên ngoài top-20 không chấm thì nối sau theo thứ hạng truy hồi.
            var reranked = scored
                .Select((chunk, index) => (chunk, score: scores[index], index))
                .OrderByDescending(x => x.score)
                .ThenBy(x => x.index)
                .Select(x => x.chunk)
                .ToList();
            reranked.AddRange(candidates.Skip(scored.Count));
            return reranked;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Rerank bằng LLM lỗi — dùng thứ hạng truy hồi gốc");
            return null;
        }
    }

    /// <summary>Parse mảng điểm từ JSON LLM trả về; điểm mặc định 0 cho đoạn thiếu.</summary>
    private static int[]? ParseScores(string content, int count)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(content[start..(end + 1)]);
            if (!doc.RootElement.TryGetProperty("scores", out var arr) || arr.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            var scores = new int[count];
            foreach (var item in arr.EnumerateArray())
            {
                if (item.TryGetProperty("i", out var iEl) && item.TryGetProperty("s", out var sEl)
                    && iEl.TryGetInt32(out var i) && i >= 0 && i < count)
                {
                    scores[i] = sEl.TryGetInt32(out var s) ? Math.Clamp(s, 0, 10) : 0;
                }
            }
            return scores;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Lấy top-k theo thứ tự đã cho nhưng không quá MaxPerDocument đoạn/văn bản.
    /// Nếu chưa đủ k (vì bị giới hạn), bổ sung các đoạn còn lại theo thứ tự.
    /// </summary>
    private static List<RetrievedChunk> SelectDiverse(List<RetrievedChunk> ordered, int topK)
    {
        var perDoc = new Dictionary<long, int>();
        var selected = new List<RetrievedChunk>();
        var overflow = new List<RetrievedChunk>();

        foreach (var chunk in ordered)
        {
            var used = perDoc.GetValueOrDefault(chunk.DocumentId, 0);
            if (used < MaxPerDocument)
            {
                selected.Add(chunk);
                perDoc[chunk.DocumentId] = used + 1;
                if (selected.Count >= topK)
                {
                    return selected;
                }
            }
            else
            {
                overflow.Add(chunk);
            }
        }

        // Chưa đủ k → thêm phần dư (giữ thứ tự)
        foreach (var chunk in overflow)
        {
            if (selected.Count >= topK)
            {
                break;
            }
            selected.Add(chunk);
        }

        return selected;
    }
}
