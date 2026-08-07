using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Demographics;

/// <summary>
/// Rule DEM-R003: Gender Field Validation
/// 
/// Validates that gender is one of predefined valid values: M, F, O, U
/// </summary>
public class GenderValidationRule : IRule
{
    public string RuleId => "DEM-R003";
    public string RuleName => "Gender Field Validation";

    private static readonly HashSet<string> ValidGenders = new() { "M", "F", "O", "U", "m", "f", "o", "u" };

    private readonly ILogger<GenderValidationRule> _logger;

    public GenderValidationRule(ILogger<GenderValidationRule> logger)
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

            if (!TryGetPropertyCaseInsensitive(request.Form, "gender", out var genderElement) ||
                genderElement.ValueKind == JsonValueKind.Null)
            {
                return issues; // Optional field
            }

            var gender = genderElement.GetString()?.Trim();

            if (string.IsNullOrEmpty(gender))
            {
                return issues; // Empty is acceptable
            }

            if (!ValidGenders.Contains(gender))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "INVALID_GENDER",
                    Severity = ValidationSeverity.Error,
                    Field = "gender",
                    Message = $"Invalid gender value '{gender}'. Must be: M (Male), F (Female), O (Other), U (Unspecified)",
                    Suggestion = "Select a valid gender value: M, F, O, or U",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GenderValidationRule for rule {RuleId}", RuleId);
        }

        return await Task.FromResult(issues);
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
