using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Demographics;

/// <summary>
/// Rule DEM-R004: Patient Identity Requirement
/// 
/// Validates that at least one form of ID is provided (National ID or Passport)
/// </summary>
public class PatientIdentityRequirementRule : IRule
{
    public string RuleId => "DEM-R004";
    public string RuleName => "Patient Identity Requirement";

    private readonly ILogger<PatientIdentityRequirementRule> _logger;

    public PatientIdentityRequirementRule(ILogger<PatientIdentityRequirementRule> logger)
    {
        _logger = logger;
    }

    public async Task<List<ValidationIssue>> ValidateAsync(ValidationRequest request, CancellationToken cancellationToken = default)
    {
        var issues = new List<ValidationIssue>();

        try
        {
            if (request.Form.ValueKind != JsonValueKind.Object)
            {
                return issues;
            }

            string? nationalId = GetStringProperty(request.Form, "nationalId", "nationalID", "national_id");
            string? passportNumber = GetStringProperty(request.Form, "passportNumber", "passport", "passportNum");

            // Check if at least one ID is provided and non-empty
            if (!string.IsNullOrWhiteSpace(nationalId) || !string.IsNullOrWhiteSpace(passportNumber))
            {
                return issues; // At least one ID provided
            }

            // No ID provided - warning
            issues.Add(new ValidationIssue
            {
                Code = "NO_PATIENT_ID",
                Severity = ValidationSeverity.Warning,
                Field = "nationalId",
                Message = "No patient ID provided. At least one ID type (National ID or Passport) is recommended",
                Suggestion = "Please provide either a National ID or Passport number for better patient identification",
                CanAutoFix = false
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PatientIdentityRequirementRule for rule {RuleId}", RuleId);
        }

        return await Task.FromResult(issues);
    }

    private static string? GetStringProperty(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (TryGetPropertyCaseInsensitive(element, propertyName, out var prop) &&
                prop.ValueKind == JsonValueKind.String)
            {
                var value = prop.GetString()?.Trim();
                if (!string.IsNullOrEmpty(value))
                {
                    return value;
                }
            }
        }
        return null;
    }

    private static bool TryGetPropertyCaseInsensitive(JsonElement element, string propertyName, out JsonElement result)
    {
        var enumerator = element.EnumerateObject();
        foreach (var prop in enumerator)
        {
            if (string.Equals(prop.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                result = prop.Value;
                return true;
            }
        }
        result = default;
        return false;
    }
}
