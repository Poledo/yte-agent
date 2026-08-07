using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Demographics;

/// <summary>
/// Rule DEM-R002: Full Name Required
/// 
/// Validates that patient has an identifiable name:
/// - Either single FullName field OR both FirstName and LastName must be provided
/// - Name must not be empty or whitespace-only
/// </summary>
public class FullNameValidationRule : IRule
{
    public string RuleId => "DEM-R002";
    public string RuleName => "Full Name Required";

    private readonly ILogger<FullNameValidationRule> _logger;

    public FullNameValidationRule(ILogger<FullNameValidationRule> logger)
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

            // Try to get fullName
            string? fullName = GetStringProperty(request.Form, "fullName");

            if (!string.IsNullOrWhiteSpace(fullName))
            {
                return issues; // Valid - has full name
            }

            // Try to get firstName and lastName
            string? firstName = GetStringProperty(request.Form, "firstName");
            string? lastName = GetStringProperty(request.Form, "lastName");

            if (!string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(lastName))
            {
                return issues; // Valid - has both first and last name
            }

            // No valid name combination found
            issues.Add(new ValidationIssue
            {
                Code = "NAME_REQUIRED",
                Severity = ValidationSeverity.Error,
                Field = "fullName",
                Message = "Patient name is required (either Full Name or First Name + Last Name)",
                Suggestion = "Please provide either a full name or both first and last names",
                CanAutoFix = false
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in FullNameValidationRule for rule {RuleId}", RuleId);
        }

        return await Task.FromResult(issues);
    }

    private static string? GetStringProperty(JsonElement element, string propertyName)
    {
        if (TryGetPropertyCaseInsensitive(element, propertyName, out var prop) &&
            prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
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
