using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code existence validation rule
/// Checks if the provided ICD code exists in the official ICD master data
/// Only executes if the trigger field is one of the ICD-related fields (icdVao, icdRa, etc.)
/// </summary>
public class IcdExistsRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdExistsRule> _logger;

    public string RuleId => "ICD_EXISTS";
    public string RuleName => "Mã ICD tồn tại";

    // ICD field names that this rule validates
    private static readonly string[] IcdFields = { "icdVao", "icdRa" };

    public IcdExistsRule(IIcdProvider icdProvider, ILogger<IcdExistsRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that ICD code exists in the catalog
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<ValidationIssue>();

        // Only validate if trigger field is an ICD field
        if (!ShouldValidate(request.Trigger.Field))
            return issues;

        try
        {
            // Extract ICD code from form
            var icdCode = ExtractIcdCode(request.Form, request.Trigger.Field);
            if (string.IsNullOrWhiteSpace(icdCode))
                return issues; // Empty code, let required rule handle it

            // Check if code exists
            if (!_icdProvider.Exists(icdCode))
            {
                var suggestion = $"Mã ICD '{icdCode}' không tồn tại trong có sở dự liệu ICD-10 chính thức. " +
                               $"Vui lòng kiểm tra lại mã và thử lại.";

                issues.Add(new ValidationIssue
                {
                    Code = "ICD_NOT_FOUND",
                    Severity = ValidationSeverity.Error,
                    Field = request.Trigger.Field,
                    Message = $"Mã ICD '{icdCode}' không tồn tại trong có sở dự liệu chính thức",
                    Suggestion = suggestion,
                    CanAutoFix = false
                });

                _logger.LogInformation("Mã ICD không tồn tại: {Code} trên trường {Field}",
                    icdCode, request.Trigger.Field);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xác thực sự tồn tại của mã ICD trên trường {Field}",
                request.Trigger.Field);
            // Don't report exception as validation issue - let it fail silently or log
        }

        return await Task.FromResult(issues);
    }

    /// <summary>
    /// Check if this rule should validate based on trigger field
    /// </summary>
    private bool ShouldValidate(string field)
    {
        return IcdFields.Contains(field, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Extract ICD code from form based on field name
    /// </summary>
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
