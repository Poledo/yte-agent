using System.Text.RegularExpressions;
using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Câu trả lời của trợ lý AI kèm nguồn trích dẫn.
/// </summary>
public record AssistantAnswer
{
    /// <summary>Câu trả lời tiếng Việt.</summary>
    public required string Answer { get; init; }

    /// <summary>Các đoạn văn bản đã dùng làm căn cứ.</summary>
    public List<AssistantCitation> Citations { get; init; } = new();

    /// <summary>True nếu câu trả lời do LLM sinh; false nếu chỉ trả về trích đoạn (chưa cấu hình AI).</summary>
    public bool FromLlm { get; init; }
}

/// <summary>Trích dẫn nguồn cho câu trả lời.</summary>
public record AssistantCitation(long DocumentId, string Title, string? DocNumber, string Excerpt);

/// <summary>
/// Trợ lý hỏi đáp văn bản y tế theo mô hình RAG:
/// truy hồi các đoạn liên quan từ kho văn bản đã nạp → đưa vào ngữ cảnh prompt
/// → LLM trả lời kèm trích dẫn. AI chỉ trả lời dựa trên văn bản được cung cấp,
/// hạn chế bịa đặt (hallucination).
/// </summary>
public interface IAssistantService
{
    Task<AssistantAnswer> AskAsync(string question, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class AssistantService : IAssistantService
{
    private readonly IDocumentSearchService _searchService;
    private readonly ILLMProvider _llmProvider;
    private readonly LLMOptions _llmOptions;
    private readonly ILogger<AssistantService> _logger;

    public AssistantService(
        IDocumentSearchService searchService,
        ILLMProvider llmProvider,
        IOptions<LLMOptions> llmOptions,
        ILogger<AssistantService> logger)
    {
        _searchService = searchService ?? throw new ArgumentNullException(nameof(searchService));
        _llmProvider = llmProvider ?? throw new ArgumentNullException(nameof(llmProvider));
        _llmOptions = llmOptions?.Value ?? throw new ArgumentNullException(nameof(llmOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<AssistantAnswer> AskAsync(string question, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(question);

        var chunks = await _searchService.SearchAsync(question, topK: 5, cancellationToken: cancellationToken);

        if (chunks.Count == 0)
        {
            return new AssistantAnswer
            {
                Answer = "Chưa tìm thấy văn bản nào liên quan trong kho tri thức. "
                       + "Hãy nạp thêm công văn/thông tư qua chức năng quản lý văn bản rồi hỏi lại.",
                FromLlm = false
            };
        }

        // Gộp các đoạn cùng một văn bản thành MỘT nguồn (giữ thứ tự liên quan):
        // tránh danh sách nguồn lặp "3 cái giống nhau" khi nhiều đoạn cùng tài liệu.
        var docGroups = chunks
            .GroupBy(c => c.DocumentId)
            .Select(g => new { Chunks = g.ToList(), First = g.First() })
            .ToList();

        var citations = docGroups
            .Select(g => new AssistantCitation(
                g.First.DocumentId,
                g.Chunks.Count > 1 ? $"{g.First.DocumentTitle} — {g.Chunks.Count} trích đoạn" : g.First.DocumentTitle,
                g.First.DocNumber,
                g.First.Content.Length > 300 ? g.First.Content[..300] + "…" : g.First.Content))
            .ToList();

        // Chưa cấu hình LLM → trả trích đoạn để người dùng tự đọc
        if (!_llmOptions.IsConfigured)
        {
            return new AssistantAnswer
            {
                Answer = "Hệ thống chưa cấu hình AI (thiếu ApiKey) — dưới đây là các trích đoạn văn bản liên quan nhất tới câu hỏi.",
                Citations = citations,
                FromLlm = false
            };
        }

        // Đánh số [Nguồn i] theo VĂN BẢN (khớp danh sách citations), các đoạn cùng
        // văn bản nối tiếp nhau trong cùng một nguồn.
        var context = string.Join("\n\n---\n\n", docGroups.Select((g, i) =>
            $"[Nguồn {i + 1}: {g.First.DocumentTitle}{(g.First.DocNumber != null ? $" (số {g.First.DocNumber})" : "")}]\n"
            + string.Join("\n[…]\n", g.Chunks.Select(c => c.Content))));

        try
        {
            var response = await _llmProvider.GenerateAsync(new AIRequest
            {
                SystemPrompt =
                    "Bạn là trợ lý nghiệp vụ BHYT cho nhân viên y tế Việt Nam. "
                    + "CHỈ trả lời dựa trên các trích đoạn văn bản được cung cấp; nếu văn bản không đủ thông tin, nói rõ là không tìm thấy căn cứ. "
                    + "Khi trả lời phải dẫn số nguồn dạng [Nguồn 1], [Nguồn 2] — CHỈ dẫn những nguồn bạn thực sự lấy thông tin, "
                    + "bỏ qua nguồn không liên quan tới câu hỏi. Trả lời ngắn gọn bằng tiếng Việt.",
                UserPrompt = $"Các trích đoạn văn bản:\n\n{context}\n\nCâu hỏi: {question}",
                Model = _llmOptions.Model,
                Temperature = _llmOptions.Temperature,
                MaxTokens = _llmOptions.MaxTokens
            }, cancellationToken);

            // Một số model miễn phí là model KIỂM DUYỆT (guard): trả về phán quyết an toàn
            // ("User Safety: unsafe...") thay vì câu trả lời. Phát hiện và coi như lỗi.
            if (LooksLikeModerationVerdict(response.Content))
            {
                _logger.LogWarning(
                    "LLM trả về phán quyết kiểm duyệt thay vì câu trả lời: {Content}",
                    response.Content.Length > 200 ? response.Content[..200] : response.Content);
                return new AssistantAnswer
                {
                    Answer = "AI trả về kết quả không hợp lệ (bị định tuyến nhầm model). "
                           + "Hãy thử hỏi lại — dưới đây là các trích đoạn văn bản liên quan nhất.",
                    Citations = citations,
                    FromLlm = false
                };
            }

            // AI báo không tìm thấy căn cứ trong văn bản → KHÔNG dẫn nguồn
            // (dẫn nguồn khi câu trả lời là "không tìm thấy" gây mâu thuẫn/khó hiểu).
            var answerHasNoBasis = IsNoAnswer(response.Content);

            // Chỉ hiện những nguồn AI THỰC SỰ trích dẫn trong câu trả lời: pool truy hồi
            // thường lẫn vài đoạn chỉ khớp từ khóa rời rạc (vd hỏi mức hưởng mà lọt
            // QĐ điều trị lao) — liệt kê cả chúng làm người dùng tưởng AI dựa nguồn sai.
            var citedOnly = FilterCitedSources(response.Content, citations);

            return new AssistantAnswer
            {
                Answer = response.Content,
                Citations = answerHasNoBasis ? new List<AssistantCitation>() : citedOnly,
                FromLlm = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gọi LLM thất bại — trả về trích đoạn thay thế");
            return new AssistantAnswer
            {
                Answer = "Không gọi được AI lúc này — dưới đây là các trích đoạn văn bản liên quan nhất.",
                Citations = citations,
                FromLlm = false
            };
        }
    }

    /// <summary>
    /// Lọc danh sách nguồn theo các số "[Nguồn i]" xuất hiện trong câu trả lời —
    /// chấp nhận biến thể ngoặc ([Nguồn 1], 【Nguồn 1】, (Nguồn 1), Nguồn 1).
    /// AI không đánh số nguồn nào (quên) thì giữ nguyên danh sách để không mất thông tin.
    /// </summary>
    internal static List<AssistantCitation> FilterCitedSources(string answer, List<AssistantCitation> citations)
    {
        var cited = Regex.Matches(answer, @"Nguồn\s*(\d+)", RegexOptions.IgnoreCase)
            .Select(m => int.TryParse(m.Groups[1].Value, out var n) ? n : 0)
            .Where(n => n >= 1 && n <= citations.Count)
            .Distinct()
            .OrderBy(n => n)
            .ToList();

        return cited.Count == 0 ? citations : cited.Select(n => citations[n - 1]).ToList();
    }

    /// <summary>
    /// Nhận diện câu trả lời "không tìm thấy căn cứ" — khi đó không nên dẫn nguồn.
    /// Khớp các cách diễn đạt phổ biến của LLM khi văn bản không đủ thông tin.
    /// </summary>
    internal static bool IsNoAnswer(string content)
    {
        var text = content.ToLowerInvariant();
        string[] markers =
        {
            "không tìm thấy", "không có thông tin", "không đủ thông tin",
            "không đề cập", "không nêu", "không được đề cập", "chưa có thông tin",
            "không cung cấp thông tin", "không có căn cứ", "không tìm được",
        };
        return markers.Any(m => text.Contains(m));
    }

    /// <summary>
    /// Nhận diện output của model kiểm duyệt (guard model) — phán quyết an toàn ngắn
    /// kiểu "User Safety: unsafe / Safety Categories: ..." thay vì câu trả lời thật.
    /// </summary>
    internal static bool LooksLikeModerationVerdict(string content)
    {
        var text = content.Trim();
        if (text.Length == 0)
        {
            return true;
        }
        // Câu trả lời nghiệp vụ thật thường dài; phán quyết kiểm duyệt rất ngắn
        if (text.Length > 500)
        {
            return false;
        }
        return text.Contains("Safety Categories", StringComparison.OrdinalIgnoreCase)
            || text.Contains("User Safety", StringComparison.OrdinalIgnoreCase)
            || Regex.IsMatch(text, @"^\s*(safe|unsafe)\s*($|[\r\n.,;:])", RegexOptions.IgnoreCase);
    }
}
