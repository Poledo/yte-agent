using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code gender compatibility validation rule
/// Checks if ICD code gender restriction matches patient gender
/// Some ICD codes are gender-specific (e.g., female-only conditions)
/// </summary>
public class IcdGenderCompatibilityRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdGenderCompatibilityRule> _logger;

    public string RuleId => "ICD_GENDER_COMPATIBILITY";
    public string RuleName => "Kiểm tra tính tương thích giới tính của mã ICD";

    public IcdGenderCompatibilityRule(IIcdProvider icdProvider, ILogger<IcdGenderCompatibilityRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that ICD code is compatible with patient gender
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

            // Extract patient gender from form
            var patientGender = IcdProvider.ExtractPatientGender(request.Form);

            // If gender not specified, skip check
            if (patientGender < 0)
            {
                _logger.LogDebug("Giới tính bệnh nhân chưa xác định, bỏ qua kiểm tra tương thích giới tính cho mã ICD {Code}", icdCode);
                return issues;
            }

            // Check ICD exists
            if (!_icdProvider.Exists(icdCode))
            {
                _logger.LogDebug("Mã ICD {Code} không tìm thấy, không thể kiểm tra tương thích giới tính", icdCode);
                return issues; // Let another rule handle "not found" case
            }

            // Check gender compatibility
            if (!_icdProvider.IsGenderCompatible(icdCode, patientGender))
            {
                // patientGender theo quy ước IIcdProvider: 0=Nam, 1=Nữ
                var genderStr = patientGender == 0 ? "Nam" : "Nữ";
                var allowedGenders = _icdProvider.GetAllowedGenders(icdCode);
                var allowedStr = allowedGenders == "M" ? "nam" : "nữ";
                var restrictedGenderStr = allowedGenders == "M" ? "Nam" : "Nữ";

                // Build more detailed suggestion with guidance
                var suggestion = $"Mã ICD '{icdCode}' chỉ áp dụng cho bệnh nhân {allowedStr}. " +
                               $"Bệnh nhân hiện tại là {genderStr.ToLower()}. " +
                               $"\n\nHướng dẫn:\n" +
                               $"• Nếu chẩn đoán là đúng, vui lòng kiểm tra lại giới tính bệnh nhân.\n" +
                               $"• Nếu giới tính bệnh nhân là đúng, vui lòng chọn mã ICD khác phù hợp với bệnh nhân {genderStr.ToLower()}.\n" +
                               $"• Nếu đây là trường hợp ngoại lệ, ghi chú lý do vào ghi chú mã hóa.";

                issues.Add(new ValidationIssue
                {
                    Code = "ICD_GENDER_MISMATCH",
                    // Error: mã ICD sai giới tính là lỗi kinh điển bị BHXH xuất toán,
                    // đồng bộ với mức độ của rule tương ứng khi kiểm tra hồ sơ XML 130.
                    Severity = ValidationSeverity.Error,
                    Field = request.Trigger.Field,
                    // Vế đầu là giới tính mã ICD cho phép, vế sau là giới tính bệnh nhân — hai giá trị khác nhau
                    Message = $"Mã ICD '{icdCode}' (chỉ dành cho {restrictedGenderStr}) không phù hợp với giới tính bệnh nhân ({genderStr})",
                    Suggestion = suggestion,
                    CanAutoFix = false
                });

                _logger.LogInformation("Mã ICD không phù hợp với giới tính: {Code} là {AllowedGenders}, bệnh nhân là {Gender}",
                    icdCode, allowedGenders, genderStr);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xác thực tính tương thích giới tính của mã ICD");
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
