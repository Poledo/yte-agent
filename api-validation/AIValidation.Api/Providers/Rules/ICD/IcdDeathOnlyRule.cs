using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.ICD;

/// <summary>
/// ICD code death-only validation rule
/// Checks if a "death-only" ICD code is being used appropriately
/// Some ICD codes (e.g., mode of death codes) are restricted to death records only
/// </summary>
public class IcdDeathOnlyRule : IRule
{
    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<IcdDeathOnlyRule> _logger;

    public string RuleId => "ICD_DEATH_ONLY";
    public string RuleName => "ICD Code Death-Only Validation";

    private static readonly string[] IcdFields = { "icdVao", "icdRa" };

    public IcdDeathOnlyRule(IIcdProvider icdProvider, ILogger<IcdDeathOnlyRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate that death-only ICD codes are only used in death records
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

            // Check if code is death-only
            if (!_icdProvider.IsDeathOnly(icdCode))
                return issues; // No restriction

            // Extract patient status from form (check if patient is dead)
            var isDeadRecord = IsDeadRecord(request.Form);

            if (!isDeadRecord)
            {
                var suggestion = $"The ICD code '{icdCode}' is restricted to death records only. " +
                               $"This patient record does not indicate a death. " +
                               $"Please verify the code is correct or use a different diagnostic code.";

                issues.Add(new ValidationIssue
                {
                    Code = "ICD_DEATH_ONLY",
                    Severity = ValidationSeverity.Error,
                    Field = request.Trigger.Field,
                    Message = $"ICD code '{icdCode}' can only be used in death records",
                    Suggestion = suggestion,
                    CanAutoFix = false
                });

                _logger.LogInformation("Death-only ICD code used in non-death record: {Code}",
                    icdCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating ICD code death-only restriction on field {Field}",
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

                return property.ToString();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error extracting ICD code from field {Field}", fieldName);
            return null;
        }
    }

    private bool IsDeadRecord(JsonElement form)
    {
        try
        {
            if (form.ValueKind != JsonValueKind.Object)
                return false;

            // Try common death/status field names
            string[] deathFields = 
            { 
                "isDead", "isDeadRecord", "patientStatus", 
                "tinhtrang", "status", "trangThaiBenh",
                "cauTri", "cauTu", "cogaiDoi"
            };

            foreach (var field in deathFields)
            {
                if (form.TryGetProperty(field, out var property))
                {
                    // Check if value indicates death
                    if (property.ValueKind == JsonValueKind.True)
                        return true;

                    if (property.ValueKind == JsonValueKind.String)
                    {
                        var value = property.GetString()?.ToUpper() ?? "";
                        if (value is "TRUE" or "YES" or "1" or "DEAD" or "DIED" or "TUTUVONG")
                            return true;
                    }

                    if (property.ValueKind == JsonValueKind.Number)
                    {
                        if (property.TryGetInt32(out int intValue) && intValue == 1)
                            return true;
                    }
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking if record is death record");
            return false;
        }
    }
}
