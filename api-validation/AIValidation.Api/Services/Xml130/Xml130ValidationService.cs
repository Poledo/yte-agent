using System.Globalization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Interfaces;
using AIValidation.Api.Providers.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Xml130;

/// <summary>
/// Orchestrator kiểm tra hồ sơ XML 130:
/// parse file → kiểm tra theo đặc tả trường (field_specs.json) → chạy các rule
/// liên trường/liên bảng → đối chiếu CHÉO giữa các hồ sơ trong file (trùng giường,
/// trùng giờ bác sĩ, trùng đợt điều trị) → (tùy chọn) gọi AI sinh nhận định tổng hợp.
/// </summary>
public interface IXml130ValidationService
{
    /// <summary>
    /// fileName: tên file hiển thị trong kết quả đối chiếu chéo (null → "(file tải lên)").
    /// crossCheck: false khi gọi từ kiểm tra LÔ — lúc đó phần chéo chạy ở cấp lô
    /// trên toàn bộ hồ sơ của mọi file, tránh báo trùng hai lần.
    /// </summary>
    Task<Xml130ValidationResponse> ValidateAsync(
        string xmlContent,
        bool useAi = false,
        string? fileName = null,
        bool crossCheck = true,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Kiểm tra MỘT hồ sơ đã parse (đặc tả trường + rule liên bảng) — dùng cho
    /// luồng streaming: kiểm tra tới đâu đẩy kết quả về tới đó.
    /// </summary>
    Task<Xml130HosoResult> ValidateHosoAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class Xml130ValidationService : IXml130ValidationService
{
    private readonly IXml130Parser _parser;
    private readonly IFieldSpecValidator _fieldSpecValidator;
    private readonly IEnumerable<IXml130Rule> _rules;
    private readonly IEnumerable<IXml130CrossFileRule> _crossRules;
    private readonly ILLMProvider _llmProvider;
    private readonly LLMOptions _llmOptions;
    private readonly ILogger<Xml130ValidationService> _logger;

    public Xml130ValidationService(
        IXml130Parser parser,
        IFieldSpecValidator fieldSpecValidator,
        IEnumerable<IXml130Rule> rules,
        IEnumerable<IXml130CrossFileRule> crossRules,
        ILLMProvider llmProvider,
        IOptions<LLMOptions> llmOptions,
        ILogger<Xml130ValidationService> logger)
    {
        _parser = parser ?? throw new ArgumentNullException(nameof(parser));
        _fieldSpecValidator = fieldSpecValidator ?? throw new ArgumentNullException(nameof(fieldSpecValidator));
        _rules = rules ?? throw new ArgumentNullException(nameof(rules));
        _crossRules = crossRules ?? throw new ArgumentNullException(nameof(crossRules));
        _llmProvider = llmProvider ?? throw new ArgumentNullException(nameof(llmProvider));
        _llmOptions = llmOptions?.Value ?? throw new ArgumentNullException(nameof(llmOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Xml130ValidationResponse> ValidateAsync(
        string xmlContent,
        bool useAi = false,
        string? fileName = null,
        bool crossCheck = true,
        CancellationToken cancellationToken = default)
    {
        var file = _parser.Parse(xmlContent);

        // Chỉ tính hồ sơ CÓ dữ liệu. File tải về được nhưng không có hồ sơ hợp lệ
        // (0 hồ sơ, hoặc hồ sơ không có bảng dữ liệu nào) → XML 130 KHÔNG ĐỦ THÔNG TIN
        // để kiểm tra, KHÔNG phải "đạt" cũng không phải "không tìm thấy" (file vẫn tải được).
        var realHoSos = file.HoSos.Where(h => h.Tables.Count > 0).ToList();

        var response = new Xml130ValidationResponse
        {
            MaCskcb = file.MaCskcb,
            HosoCount = realHoSos.Count
        };

        if (realHoSos.Count == 0)
        {
            response.Found = false;
            response.Summary =
                "File XML 130 không đủ thông tin để kiểm tra: không có hồ sơ hợp lệ trong file. "
                + "Kiểm tra lại file, hoặc hồ sơ chưa được HIS xuất đầy đủ dữ liệu.";
            return response;
        }

        foreach (var hoso in realHoSos)
        {
            cancellationToken.ThrowIfCancellationRequested();
            response.Results.Add(await ValidateHosoAsync(hoso, cancellationToken));
        }

        // Đối chiếu CHÉO giữa các hồ sơ trong file — một file XML 130 thường chứa
        // nhiều hồ sơ nên trùng giường/giờ bác sĩ/đợt điều trị xảy ra ngay trong file.
        if (crossCheck && realHoSos.Count > 1)
        {
            var batchHosos = realHoSos
                .Select(h => new Xml130BatchHoso { FileName = fileName ?? "(file tải lên)", Hoso = h })
                .ToList();
            foreach (var crossRule in _crossRules)
            {
                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    response.CrossIssues.AddRange(crossRule.Validate(batchHosos, cancellationToken));
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Rule kiểm tra chéo {RuleId} lỗi", crossRule.RuleId);
                }
            }
            response.CrossIssues = response.CrossIssues
                .OrderByDescending(i => i.Severity)
                .ThenBy(i => i.RuleId)
                .ToList();
        }

        response.Summary = BuildSummary(response);

        if (useAi && _llmOptions.IsConfigured)
        {
            response.AiAssessment = await BuildAiAssessmentAsync(response, cancellationToken);
        }

        return response;
    }

    /// <inheritdoc />
    public async Task<Xml130HosoResult> ValidateHosoAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);

        var result = new Xml130HosoResult
        {
            MaLk = hoso.MaLk,
            HoTen = hoso.GetField("XML1", "HO_TEN"),
            MaThe = hoso.GetField("XML1", "MA_THE_BHYT"),
            NgayVao = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_VAO"))?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)
        };

        // 1. Kiểm tra theo đặc tả trường
        result.Issues.AddRange(await _fieldSpecValidator.ValidateAsync(hoso, cancellationToken));

        // 2. Các rule liên trường / liên bảng
        foreach (var rule in _rules)
        {
            try
            {
                result.Issues.AddRange(await rule.ValidateAsync(hoso, cancellationToken));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Một rule lỗi không được chặn các rule còn lại
                _logger.LogError(ex, "Rule {RuleId} lỗi khi kiểm tra hồ sơ {MaLk}", rule.RuleId, hoso.MaLk);
            }
        }

        // Sắp xếp: Error trước, sau đó theo bảng
        result.Issues = result.Issues
            .OrderByDescending(i => i.Severity)
            .ThenBy(i => i.Table)
            .ThenBy(i => i.RowIndex ?? 0)
            .ToList();

        return result;
    }

    /// <summary>Tóm tắt rule-based (luôn có, không phụ thuộc AI).</summary>
    private static string BuildSummary(Xml130ValidationResponse response)
    {
        var errors = response.Results.SelectMany(r => r.Issues).Count(i => i.Severity == ValidationSeverity.Error);
        var warnings = response.Results.SelectMany(r => r.Issues).Count(i => i.Severity == ValidationSeverity.Warning);
        var riskCount = response.Results.SelectMany(r => r.Issues).Count(i => i.XuatToanRisk)
            + response.CrossIssues.Count(i => i.XuatToanRisk);

        if (response.TotalIssues == 0)
        {
            return $"Đã kiểm tra {response.HosoCount} hồ sơ — không phát hiện vấn đề. Hồ sơ đủ điều kiện gửi cổng giám định.";
        }

        var crossText = response.CrossIssues.Count > 0
            ? $"; đối chiếu chéo giữa các hồ sơ trong file phát hiện thêm {response.CrossIssues.Count} vấn đề (trùng giường/giờ bác sĩ/đợt điều trị)"
            : "";

        return $"Đã kiểm tra {response.HosoCount} hồ sơ: phát hiện {errors} lỗi, {warnings} cảnh báo{crossText}; "
             + $"{riskCount} vấn đề có nguy cơ xuất toán. Cần rà soát trước khi gửi cổng giám định BHYT.";
    }

    /// <summary>Gọi LLM sinh nhận định tổng hợp tiếng Việt về nguy cơ xuất toán.</summary>
    private async Task<string?> BuildAiAssessmentAsync(
        Xml130ValidationResponse response,
        CancellationToken cancellationToken)
    {
        try
        {
            var issueLines = response.Results
                .SelectMany(r => r.Issues.Select(i => $"- [{i.Severity}] ({i.Table}/{i.Field}) {i.Message}"))
                .Take(40);

            var userPrompt =
                $"Hồ sơ KCB BHYT (XML 130) của cơ sở {response.MaCskcb} có các vấn đề sau:\n"
                + string.Join("\n", issueLines)
                + "\n\nHãy đánh giá ngắn gọn (tối đa 150 từ, tiếng Việt) mức độ nguy cơ bị BHXH xuất toán, "
                + "chỉ ra 3 việc cần ưu tiên sửa nhất, theo thứ tự ảnh hưởng tài chính.";

            var aiResponse = await _llmProvider.GenerateAsync(new AIRequest
            {
                SystemPrompt = "Bạn là chuyên gia giám định BHYT Việt Nam, am hiểu QĐ 130/QĐ-BYT, QĐ 4750/QĐ-BYT và quy trình giám định của BHXH. Trả lời ngắn gọn, chính xác, bằng tiếng Việt.",
                UserPrompt = userPrompt,
                Model = _llmOptions.Model,
                Temperature = _llmOptions.Temperature,
                MaxTokens = Math.Min(_llmOptions.MaxTokens, 1024)
            }, cancellationToken);

            return aiResponse.Content;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không sinh được nhận định AI — trả kết quả rule-based");
            return null;
        }
    }
}
