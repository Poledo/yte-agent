using System.Text.Json;
using System.Text.RegularExpressions;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Contact;

/// <summary>
/// Rule CON-R002: Phone Number Format Validation
/// 
/// Validates Vietnamese phone number format
/// - Primary phone validation is strict (Error)
/// - Alternative phone validation is lenient (Warning)
/// Valid formats for Vietnam: 0XXX-XXXXXX, +84XXXXXXXXX, (0)XXX-XXXXXX
/// </summary>
public class PhoneNumberFormatValidationRule : IRule
{
    public string RuleId => "CON-R002";
    public string RuleName => "Phone Number Format Validation";

    // Vietnamese phone patterns
    // 0 followed by 9-10 digits or +84 followed by 8-10 digits
    private static readonly Regex VietnamPhonePattern = new(
        @"^(0\d{9,10}|84\d{8,10}|\+84\d{8,10}|(\(0\))?[\s\-]?\d{3}\-\d{6,7})$",
        RegexOptions.Compiled
    );

    private readonly ILogger<PhoneNumberFormatValidationRule> _logger;

    public PhoneNumberFormatValidationRule(ILogger<PhoneNumberFormatValidationRule> logger)
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

            // Validate Primary Phone
            if (TryGetPropertyCaseInsensitive(request.Form, "primaryPhone", out var primaryPhoneElement) &&
                primaryPhoneElement.ValueKind == JsonValueKind.String)
            {
                var primaryPhone = primaryPhoneElement.GetString()?.Trim();
                if (!string.IsNullOrEmpty(primaryPhone) && !IsValidPhoneNumber(primaryPhone))
                {
                    issues.Add(new ValidationIssue
                    {
                        Code = "INVALID_PRIMARY_PHONE_FORMAT",
                        Severity = ValidationSeverity.Error,
                        Field = "primaryPhone",
                        Message = $"Invalid primary phone format '{primaryPhone}'. Expected format for Vietnam: 0XXX-XXXXXX, +84XXXXXXXXX, or (0)XXX-XXXXXX",
                        Suggestion = "Please enter a valid Vietnamese phone number",
                        CanAutoFix = false
                    });
                }
            }

            // Validate Alternative Phone (Warning level)
            if (TryGetPropertyCaseInsensitive(request.Form, "alternativePhone", out var altPhoneElement) &&
                altPhoneElement.ValueKind == JsonValueKind.String)
            {
                var altPhone = altPhoneElement.GetString()?.Trim();
                if (!string.IsNullOrEmpty(altPhone) && !IsValidPhoneNumber(altPhone))
                {
                    issues.Add(new ValidationIssue
                    {
                        Code = "INVALID_ALTERNATIVE_PHONE_FORMAT",
                        Severity = ValidationSeverity.Warning,
                        Field = "alternativePhone",
                        Message = $"Alternative phone format may be invalid '{altPhone}'. Expected format for Vietnam: 0XXX-XXXXXX, +84XXXXXXXXX, or (0)XXX-XXXXXX",
                        Suggestion = "Please verify the alternative phone number format",
                        CanAutoFix = false
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PhoneNumberFormatValidationRule for rule {RuleId}", RuleId);
        }

        return await Task.FromResult(issues);
    }

    private static bool IsValidPhoneNumber(string phone)
    {
        // Normalize the phone number first
        var normalized = phone.Replace(" ", "").Replace("-", "").Trim();

        // Check against pattern
        return VietnamPhonePattern.IsMatch(normalized);
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
