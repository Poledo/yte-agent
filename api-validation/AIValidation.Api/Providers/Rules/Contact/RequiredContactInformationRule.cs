using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Contact;

/// <summary>
/// Rule CON-R001: Required Contact Information
/// 
/// Validates that both current address and primary phone number are provided
/// </summary>
public class RequiredContactInformationRule : IRule
{
    public string RuleId => "CON-R001";
    public string RuleName => "Required Contact Information";

    private readonly ILogger<RequiredContactInformationRule> _logger;

    public RequiredContactInformationRule(ILogger<RequiredContactInformationRule> logger)
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

            string? currentAddress = GetStringProperty(request.Form, "currentAddress", "address", "addressCurrent");
            string? primaryPhone = GetStringProperty(request.Form, "primaryPhone", "phone", "primaryPhoneNumber");

            // Check address
            if (string.IsNullOrWhiteSpace(currentAddress))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "ADDRESS_REQUIRED",
                    Severity = ValidationSeverity.Error,
                    Field = "currentAddress",
                    Message = "Current address is required",
                    Suggestion = "Please enter the patient's current address",
                    CanAutoFix = false
                });
            }

            // Check phone
            if (string.IsNullOrWhiteSpace(primaryPhone))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "PHONE_REQUIRED",
                    Severity = ValidationSeverity.Error,
                    Field = "primaryPhone",
                    Message = "Primary phone number is required",
                    Suggestion = "Please enter a valid phone number",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RequiredContactInformationRule for rule {RuleId}", RuleId);
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
