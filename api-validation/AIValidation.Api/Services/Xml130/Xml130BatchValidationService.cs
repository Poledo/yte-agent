using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Services.Xml130;

/// <summary>Một file XML 130 đầu vào của lần kiểm tra lô.</summary>
public record Xml130BatchInput(string FileName, string Content);

/// <summary>
/// Kiểm tra nhiều file XML 130 cùng lúc:
/// 1. Từng file chạy kiểm tra như endpoint đơn lẻ (đặc tả trường + rule liên bảng).
/// 2. Gom toàn bộ hồ sơ của tất cả các file rồi chạy các rule kiểm tra CHÉO
///    (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị...) — kể cả giữa
///    các hồ sơ nằm trong cùng một file.
/// Một file hỏng (không parse được) không chặn các file còn lại.
/// </summary>
public interface IXml130BatchValidationService
{
    Task<Xml130BatchValidationResponse> ValidateBatchAsync(
        IReadOnlyList<Xml130BatchInput> files,
        bool useAi = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Kiểm tra lô theo kiểu STREAMING cho lô lớn (hàng nghìn hồ sơ) — trả từng
    /// sự kiện để client hiển thị dần thay vì chờ một cục:
    /// 1. "start": số file, tổng hồ sơ (sau khi parse — bước nhanh).
    /// 2. "fileError": file không đọc được.
    /// 3. "cross": TOÀN BỘ kết quả đối chiếu chéo (cần đủ mọi hồ sơ nên chạy trước, trả một lần).
    /// 4. "hoso": kết quả từng hồ sơ, kèm tiến độ index/total và thống kê dồn.
    /// 5. "done": tóm tắt cuối.
    /// </summary>
    IAsyncEnumerable<object> ValidateBatchStreamAsync(
        IReadOnlyList<Xml130BatchInput> files,
        CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class Xml130BatchValidationService : IXml130BatchValidationService
{
    private readonly IXml130Parser _parser;
    private readonly IXml130ValidationService _validationService;
    private readonly IEnumerable<IXml130CrossFileRule> _crossRules;
    private readonly ILogger<Xml130BatchValidationService> _logger;

    public Xml130BatchValidationService(
        IXml130Parser parser,
        IXml130ValidationService validationService,
        IEnumerable<IXml130CrossFileRule> crossRules,
        ILogger<Xml130BatchValidationService> logger)
    {
        _parser = parser ?? throw new ArgumentNullException(nameof(parser));
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
        _crossRules = crossRules ?? throw new ArgumentNullException(nameof(crossRules));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Xml130BatchValidationResponse> ValidateBatchAsync(
        IReadOnlyList<Xml130BatchInput> files,
        bool useAi = false,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        var response = new Xml130BatchValidationResponse { FileCount = files.Count };
        var allHosos = new List<Xml130BatchHoso>();

        foreach (var input in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var fileResult = new Xml130BatchFileResult { FileName = input.FileName };
            response.Files.Add(fileResult);

            try
            {
                // Kiểm tra từng hồ sơ trong file (đặc tả trường + rule liên bảng).
                // crossCheck: false — phần đối chiếu chéo chạy ở CẤP LÔ bên dưới trên toàn bộ
                // hồ sơ của mọi file (bao phủ cả chéo trong file), tránh báo trùng hai lần.
                fileResult.Result = await _validationService.ValidateAsync(
                    input.Content, useAi: false, input.FileName, crossCheck: false, cancellationToken);

                // Gom hồ sơ có dữ liệu cho bước đối chiếu chéo
                var parsed = _parser.Parse(input.Content);
                allHosos.AddRange(parsed.HoSos
                    .Where(h => h.Tables.Count > 0)
                    .Select(h => new Xml130BatchHoso { FileName = input.FileName, Hoso = h }));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                fileResult.Error = $"Không đọc được file: {ex.Message}";
                _logger.LogWarning(ex, "File {File} trong lô không parse được", input.FileName);
            }
        }

        response.HosoCount = allHosos.Count;

        // Đối chiếu chéo trên toàn bộ hồ sơ của lô; một rule lỗi không chặn rule khác
        foreach (var rule in _crossRules)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                response.CrossIssues.AddRange(rule.Validate(allHosos, cancellationToken));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rule kiểm tra chéo {RuleId} lỗi", rule.RuleId);
            }
        }

        response.CrossIssues = response.CrossIssues
            .OrderByDescending(i => i.Severity)
            .ThenBy(i => i.RuleId)
            .ToList();

        FillConflictMap(response);
        response.Summary = BuildSummary(response);
        return response;
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<object> ValidateBatchStreamAsync(
        IReadOnlyList<Xml130BatchInput> files,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        // 1. Parse tất cả file (bước nhanh) — gom lỗi lại để yield ngoài try/catch
        var parsedFiles = new List<(string FileName, List<Xml130Hoso> HoSos)>();
        var fileErrors = new List<(string FileName, string Error)>();
        foreach (var input in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var parsed = _parser.Parse(input.Content);
                parsedFiles.Add((input.FileName, parsed.HoSos.Where(h => h.Tables.Count > 0).ToList()));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                fileErrors.Add((input.FileName, $"Không đọc được file: {ex.Message}"));
                _logger.LogWarning(ex, "File {File} trong lô không parse được", input.FileName);
            }
        }

        var total = parsedFiles.Sum(f => f.HoSos.Count);
        yield return new { type = "start", fileCount = files.Count, hosoCount = total };
        foreach (var (fileName, error) in fileErrors)
        {
            yield return new { type = "fileError", fileName, error };
        }

        // 2. Đối chiếu CHÉO trước — cần đủ toàn bộ hồ sơ, nhưng chỉ cần parse nên nhanh
        var allHosos = parsedFiles
            .SelectMany(f => f.HoSos.Select(h => new Xml130BatchHoso { FileName = f.FileName, Hoso = h }))
            .ToList();
        var crossIssues = new List<Xml130CrossIssue>();
        foreach (var rule in _crossRules)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                crossIssues.AddRange(rule.Validate(allHosos, cancellationToken));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rule kiểm tra chéo {RuleId} lỗi", rule.RuleId);
            }
        }
        crossIssues = crossIssues.OrderByDescending(i => i.Severity).ThenBy(i => i.RuleId).ToList();

        var conflictMap = BuildConflictMap(crossIssues);
        yield return new
        {
            type = "cross",
            crossIssues,
            conflicts = parsedFiles
                .Select(f => new
                {
                    fileName = f.FileName,
                    conflictWith = conflictMap.GetValueOrDefault(f.FileName) ?? new List<string>()
                })
                .ToList()
        };

        // 3. Kiểm tra từng hồ sơ — xong hồ sơ nào đẩy về hồ sơ đó kèm tiến độ
        var index = 0;
        var hosoRiskCount = 0;
        var issueCount = 0;
        foreach (var (fileName, hosos) in parsedFiles)
        {
            foreach (var hoso in hosos)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var result = await _validationService.ValidateHosoAsync(hoso, cancellationToken);
                index++;
                if (result.XuatToanRisk)
                {
                    hosoRiskCount++;
                }
                issueCount += result.IssueCount;

                yield return new
                {
                    type = "hoso",
                    index,
                    total,
                    fileName,
                    result,
                    riskCount = hosoRiskCount,
                    issueCount
                };
            }
        }

        var summary =
            $"Đã kiểm tra {files.Count} file ({total} hồ sơ): {issueCount} vấn đề trong từng hồ sơ, "
            + $"{hosoRiskCount} hồ sơ có nguy cơ xuất toán; đối chiếu chéo phát hiện {crossIssues.Count} vấn đề"
            + (fileErrors.Count > 0 ? $"; {fileErrors.Count} file không đọc được" : "")
            + ".";
        yield return new
        {
            type = "done",
            summary,
            hosoCount = total,
            riskCount = hosoRiskCount,
            issueCount,
            crossCount = crossIssues.Count
        };
    }

    /// <summary>
    /// Suy ra "file nào đụng file nào" từ các vấn đề chéo: mỗi vấn đề liên quan
    /// hồ sơ của những file nào thì các file đó xung đột với nhau (không tính chính nó).
    /// </summary>
    private static void FillConflictMap(Xml130BatchValidationResponse response)
    {
        var conflictMap = BuildConflictMap(response.CrossIssues);
        foreach (var file in response.Files)
        {
            if (conflictMap.TryGetValue(file.FileName, out var others))
            {
                file.ConflictWith = others;
            }
        }
    }

    /// <summary>Tên file → danh sách file khác có hồ sơ dính cùng ít nhất một vấn đề chéo.</summary>
    private static Dictionary<string, List<string>> BuildConflictMap(IEnumerable<Xml130CrossIssue> issues)
    {
        var map = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var issue in issues)
        {
            var fileNames = issue.Hosos
                .Select(h => h.FileName)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            foreach (var name in fileNames)
            {
                if (!map.TryGetValue(name, out var others))
                {
                    map[name] = others = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                }
                others.UnionWith(fileNames.Where(f => !f.Equals(name, StringComparison.OrdinalIgnoreCase)));
            }
        }
        return map.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.OrderBy(f => f, StringComparer.OrdinalIgnoreCase).ToList(),
            StringComparer.OrdinalIgnoreCase);
    }

    private static string BuildSummary(Xml130BatchValidationResponse response)
    {
        var perFileIssues = response.Files.Sum(f => f.Result?.TotalIssues ?? 0);
        var failedFiles = response.Files.Count(f => f.Error != null);
        var crossErrors = response.CrossIssues.Count(i => i.Severity == ValidationSeverity.Error);
        var crossWarnings = response.CrossIssues.Count(i => i.Severity == ValidationSeverity.Warning);

        var parts = new List<string>
        {
            $"Đã kiểm tra {response.FileCount} file ({response.HosoCount} hồ sơ)"
        };
        if (failedFiles > 0)
        {
            parts.Add($"{failedFiles} file không đọc được");
        }
        parts.Add(perFileIssues == 0
            ? "không phát hiện vấn đề trong từng hồ sơ"
            : $"{perFileIssues} vấn đề trong từng hồ sơ");
        parts.Add(response.CrossIssues.Count == 0
            ? "đối chiếu chéo giữa các hồ sơ không phát hiện trùng lặp"
            : $"đối chiếu chéo phát hiện {crossErrors} lỗi, {crossWarnings} cảnh báo (trùng giường/giờ bác sĩ/đợt điều trị)");

        var summary = string.Join("; ", parts) + ".";
        if (response.XuatToanRisk)
        {
            summary += " Cần rà soát trước khi gửi cổng giám định BHYT.";
        }
        return summary;
    }
}
