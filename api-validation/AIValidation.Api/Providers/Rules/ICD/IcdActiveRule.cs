using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code active/cancelled validation rule
/// Checks if the provided ICD code is active (not cancelled)
/// Only executes if the trigger field is one of the ICD-related fields
/// </summary>
public class IcdActiveRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdActiveRule> _logger;

    public string RuleId => "ICD_ACTIVE";
    public string RuleName => "Mã ICD còn hoạt động";

    private static readonly string[] IcdFields = { "icdVao", "icdRa" };

    public IcdActiveRule(IIcdProvider icdProvider, ILogger<IcdActiveRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that ICD code is active (not cancelled)
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<ValidationIssue>();

        if (!ShouldValidate(request.Trigger.Field))
            return issues;

        try
        {
            var icdCode = ExtractIcdCode(request.Form, request.Trigger.Field);
            if (string.IsNullOrWhiteSpace(icdCode))
                return issues;

            // Check if code is active
            if (!_icdProvider.IsActive(icdCode))
            {
                var suggestion = $"Mã ICD '{icdCode}' đã bị hủy bỏ trong có sở dự liệu ICD-10 chính thức. " +
                               $"Vui lòng sử dụng một mã đang hoạt động.";

                issues.Add(new ValidationIssue
                {
                    Code = "ICD_CANCELLED",
                    Severity = ValidationSeverity.Error,
                    Field = request.Trigger.Field,
                    Message = $"Mã ICD '{icdCode}' đã bị hủy bỏ và không còn có thể sử dụng",
                    Suggestion = suggestion,
                    CanAutoFix = false
                });

                _logger.LogInformation("Mã ICD đã bị hủy: {Code} trên trường {Field}",
                    icdCode, request.Trigger.Field);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi kiểm tra trạng thái hoạt động của mã ICD trên trường {Field}",
                request.Trigger.Field);
        }

        return await Task.FromResult(issues);
    }

    private bool ShouldValidate(string field)
    {
        return IcdFields.Contains(field, StringComparer.OrdinalIgnoreCase);
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
