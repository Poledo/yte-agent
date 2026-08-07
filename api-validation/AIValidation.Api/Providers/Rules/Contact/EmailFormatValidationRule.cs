using System.Text.Json;
using System.Text.RegularExpressions;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Contact;

/// <summary>
/// Rule CON-R003: Email Format Validation
/// 
/// Validates email address format if provided
/// </summary>
public class EmailFormatValidationRule : IRule
{
    public string RuleId => "CON-R003";
    public string RuleName => "Email Format Validation";

    // RFC 5322 simplified - matches most common email formats
    private static readonly Regex EmailPattern = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private readonly ILogger<EmailFormatValidationRule> _logger;

    public EmailFormatValidationRule(ILogger<EmailFormatValidationRule> logger)
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

            if (!TryGetPropertyCaseInsensitive(request.Form, "email", out var emailElement) ||
                emailElement.ValueKind == JsonValueKind.Null)
            {
                return issues; // Optional field
            }

            var email = emailElement.GetString()?.Trim();

            if (string.IsNullOrEmpty(email))
            {
                return issues; // Empty is acceptable
            }

            if (!EmailPattern.IsMatch(email))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "INVALID_EMAIL_FORMAT",
                    Severity = ValidationSeverity.Warning,
                    Field = "email",
                    Message = $"Email format appears invalid: {email}",
                    Suggestion = "Please enter a valid email address (e.g., patient@example.com)",
                    CanAutoFix = false
                });
            }

            // Additional check: email should not exceed 254 characters (RFC 5321)
            if (email.Length > 254)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "EMAIL_TOO_LONG",
                    Severity = ValidationSeverity.Warning,
                    Field = "email",
                    Message = $"Email address is too long ({email.Length} characters, maximum is 254)",
                    Suggestion = "Please provide a shorter email address",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in EmailFormatValidationRule for rule {RuleId}", RuleId);
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
