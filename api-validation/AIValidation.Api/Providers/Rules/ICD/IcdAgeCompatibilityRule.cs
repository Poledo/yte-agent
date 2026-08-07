using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code age compatibility validation rule
/// Checks if ICD code age restriction matches patient age
/// Some ICD codes are age-specific (e.g., pediatric conditions, geriatric conditions)
/// </summary>
public class IcdAgeCompatibilityRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdAgeCompatibilityRule> _logger;

    public string RuleId => "ICD_AGE_COMPATIBILITY";
    public string RuleName => "Kiểm tra tính tương thích tuổi của mã ICD";

    public IcdAgeCompatibilityRule(IIcdProvider icdProvider, ILogger<IcdAgeCompatibilityRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that ICD code is compatible with patient age
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<ValidationIssue>();

        try
        {
            // Only check ICD fields
            if (!IsIcdField(request.Trigger.Field))
                return issues;

            var icdCode = ExtractIcdCode(request.Form, request.Trigger.Field);
            if (string.IsNullOrWhiteSpace(icdCode))
                return issues;

            // Extract patient age from form
            var patientAge = IcdProvider.ExtractPatientAge(request.Form);

            // If age not specified, skip check
            if (patientAge < 0)
            {
                _logger.LogDebug("Tuổi bệnh nhân chưa xác định, bỏ qua kiểm tra tính tương thích tuổi cho mã ICD {Code}", icdCode);
                return issues;
            }

            // Check ICD exists
            if (!_icdProvider.Exists(icdCode))
            {
                _logger.LogDebug("Mã ICD {Code} không tìm thấy, không thể kiểm tra tính tương thích tuổi", icdCode);
                return issues; // Let another rule handle "not found" case
            }

            // Check age compatibility
            if (!_icdProvider.IsAgeCompatible(icdCode, patientAge))
            {
                var ageRestriction = _icdProvider.GetAgeRestriction(icdCode);
                var rangeStr = ageRestriction.MinAge >= 0 
                    ? $"{ageRestriction.MinAge}-{ageRestriction.MaxAge} tuổi" 
                    : "khoảng tuổi không xác định";

                var suggestion = $"Mã ICD '{icdCode}' chỉ áp dụng cho tuổi {rangeStr}, " +
                               $"nhưng tuổi bệnh nhân là {patientAge} tuổi. " +
                               "Vui lòng kiểm tra lại chẩn đoán hoặc lịch sinh của bệnh nhân.";

                issues.Add(new ValidationIssue
                {
                    Code = "ICD_AGE_MISMATCH",
                    Severity = ValidationSeverity.Warning,
                    Field = request.Trigger.Field,
                    Message = $"Mã ICD '{icdCode}' không phù hợp với tuổi bệnh nhân ({patientAge} tuổi)",
                    Suggestion = suggestion,
                    CanAutoFix = false
                });

                _logger.LogInformation("Mã ICD không phù hợp với tuổi: {Code} giới hạn tuổi {MinAge}-{MaxAge}, tuổi bệnh nhân {PatientAge}",
                    icdCode, ageRestriction.MinAge, ageRestriction.MaxAge, patientAge);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi kiểm tra tính tương thích tuổi của mã ICD");
        }

        return await Task.FromResult(issues);
    }

    private bool IsIcdField(string fieldName)
    {
        // Check primary and secondary diagnosis fields
        return fieldName.Equals("icdVao", StringComparison.OrdinalIgnoreCase) ||
               fieldName.Equals("icdRa", StringComparison.OrdinalIgnoreCase);
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
