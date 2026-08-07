using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.ICD.Helpers;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code primary diagnosis validation rule
/// Checks if the ICD code in the "icdVao" (primary diagnosis) field can be used as a primary diagnosis
/// Some ICD codes are restrictive and can only be used as secondary diagnoses (with dagger symbol)
/// </summary>
public class IcdPrimaryDiagnosisRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdPrimaryDiagnosisRule> _logger;

    public string RuleId => "ICD_PRIMARY_DIAGNOSIS";
    public string RuleName => "Mã ICD có thể làm chẩn đoán chính";

    // Only applies to primary diagnosis field
    private const string PrimaryDiagnosisField = "icdVao";

    public IcdPrimaryDiagnosisRule(IIcdProvider icdProvider, ILogger<IcdPrimaryDiagnosisRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that ICD code can be used as a primary diagnosis (in icdVao field)
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<ValidationIssue>();

        // Only validate primary diagnosis field
        if (!request.Trigger.Field.Equals(PrimaryDiagnosisField, StringComparison.OrdinalIgnoreCase))
            return issues;

        try
        {
            var icdCode = ExtractIcdCode(request.Form, PrimaryDiagnosisField);
            if (string.IsNullOrWhiteSpace(icdCode))
                return issues;

            var codeInfo = _icdProvider.GetByCode(icdCode);
            var flags = codeInfo?.DecodedFlags;
            if (flags == null)
                return issues; // Mã không có trong danh mục — IcdExistsRule xử lý

            // Phân loại theo danh mục TT06, khớp cách hiển thị của trang tra cứu ICD BHXH:
            // 1. Chặn cứng: mã cấm làm bệnh chính hoặc mã dấu †
            if (flags.IsNotMain || flags.HasDaggerSymbol)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "ICD_NOT_PRIMARY",
                    Severity = ValidationSeverity.Error,
                    Field = PrimaryDiagnosisField,
                    Message = $"Mã ICD '{icdCode}' không được dùng làm chẩn đoán chính",
                    Suggestion = flags.HasDaggerSymbol
                        ? $"Mã '{icdCode}' có dấu găm (†) — chỉ dùng làm bệnh kèm theo, kết hợp với mã dấu sao (*) tương ứng làm bệnh chính."
                        : $"Danh mục ICD quy định mã '{icdCode}' không được dùng làm bệnh chính. Chọn mã bệnh chính khác phù hợp với hồ sơ.",
                    CanAutoFix = false
                });
                _logger.LogInformation("Mã ICD không được làm chẩn đoán chính: {Code}", icdCode);
            }
            // 2. Mã nhóm cần chọn mã 4/5 ký tự cụ thể hơn — cảnh báo + gợi ý mã con
            else if (flags.NeedsSpecificCode)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "ICD_NEEDS_SPECIFIC",
                    Severity = ValidationSeverity.Warning,
                    Field = PrimaryDiagnosisField,
                    Message = $"Mã '{icdCode}' là mã nhóm — cần chọn mã cụ thể hơn",
                    Suggestion = BuildChildCodeSuggestion(icdCode),
                    CanAutoFix = false
                });
                _logger.LogInformation("Mã ICD nhóm, cần mã cụ thể hơn: {Code}", icdCode);
            }
            // 3. Không khuyến khích dùng làm bệnh chính — chỉ cảnh báo
            else if (flags.IsNotRecommendedMain)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "ICD_NOT_RECOMMENDED_PRIMARY",
                    Severity = ValidationSeverity.Warning,
                    Field = PrimaryDiagnosisField,
                    Message = $"Mã '{icdCode}' không được khuyến khích dùng làm chẩn đoán chính",
                    Suggestion = "Danh mục TT06 xếp mã này vào nhóm không khuyến khích làm bệnh chính — cân nhắc chọn mã phản ánh đúng bệnh chính của hồ sơ.",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xác thực mã ICD làm chẩn đoán chính");
        }

        return await Task.FromResult(issues);
    }

    /// <summary>
    /// Gợi ý các mã con 4/5 ký tự dùng được làm bệnh chính, kèm tên bệnh —
    /// giống phần "Gợi ý mã cụ thể hơn có thể dùng làm bệnh chính" của trang tra cứu ICD.
    /// </summary>
    private string BuildChildCodeSuggestion(string icdCode)
    {
        var usableChildren = _icdProvider.GetChildCodes(icdCode)
            .Where(c => c.DecodedFlags != null
                && IcdBitmaskHelper.CanBePrimaryDiagnosis(c.DecodedFlags)
                && !c.DecodedFlags.NeedsSpecificCode)
            .ToList();

        if (usableChildren.Count == 0)
        {
            return $"Không nên dùng mã nhóm '{icdCode}' nếu đã có mã 4/5 ký tự phù hợp với hồ sơ.";
        }

        var listed = string.Join("; ", usableChildren.Take(5).Select(c => $"{c.Code} – {c.Name}"));
        var more = usableChildren.Count > 5 ? $" (và {usableChildren.Count - 5} mã khác)" : "";
        return $"Không nên dùng mã nhóm nếu đã có mã 4/5 ký tự phù hợp với hồ sơ. "
             + $"Gợi ý mã cụ thể hơn có thể dùng làm bệnh chính: {listed}{more}.";
    }

    private string? ExtractIcdCode(JsonElement form, string fieldName)
    {
        try
        {
            if (form.ValueKind != JsonValueKind.Object)
                return null;

            if (form.TryGetProperty(fieldName, out var property))
            {
                if (property.ValueKind == JsonValueKind.String)
                    return property.GetString();

                if (property.ValueKind == JsonValueKind.Null)
                    return null;

                return property.ToString();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi trích xuất mã ICD từ trường {Field}", fieldName);
            return null;
        }
    }
}
