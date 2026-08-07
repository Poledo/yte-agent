using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Demographics;

/// <summary>
/// Rule DEM-R001: Date of Birth Validation
/// 
/// Validates that:
/// - Date of Birth must be a past date (no future dates allowed)
/// - Calculated age must be between 0-150 years
/// - Age > 120 should warn about possible data entry error
/// </summary>
public class DateOfBirthValidationRule : IRule
{
    public string RuleId => "DEM-R001";
    public string RuleName => "Date of Birth Validation";

    private readonly ILogger<DateOfBirthValidationRule> _logger;

    public DateOfBirthValidationRule(ILogger<DateOfBirthValidationRule> logger)
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

            if (!TryGetPropertyCaseInsensitive(request.Form, "dateOfBirth", out var dobElement) ||
                dobElement.ValueKind == JsonValueKind.Null)
            {
                return issues; // Optional field
            }

            if (!DateTime.TryParse(dobElement.GetString(), out var dateOfBirth))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "INVALID_DATE_FORMAT",
                    Severity = ValidationSeverity.Error,
                    Field = "dateOfBirth",
                    Message = "Date of birth must be in valid date format (yyyy-MM-dd)",
                    Suggestion = "Please enter a valid date",
                    CanAutoFix = false
                });
                return issues;
            }

            var today = DateTime.UtcNow.Date;

            // Check if DOB is in future
            if (dateOfBirth > today)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "DOB_FUTURE_DATE",
                    Severity = ValidationSeverity.Error,
                    Field = "dateOfBirth",
                    Message = "Date of birth cannot be in the future",
                    Suggestion = "Please enter a valid birth date from the past",
                    CanAutoFix = false
                });
                return issues;
            }

            // Calculate age
            var age = today.Year - dateOfBirth.Year;
            if (dateOfBirth > today.AddYears(-age))
            {
                age--;
            }

            // Check age range
            if (age < 0 || age > 150)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "INVALID_AGE_RANGE",
                    Severity = ValidationSeverity.Error,
                    Field = "dateOfBirth",
                    Message = $"Calculated age ({age} years) is outside valid range (0-150 years)",
                    Suggestion = "Please verify the date of birth",
                    CanAutoFix = false
                });
                return issues;
            }

            // Warning for age > 120
            if (age > 120)
            {
                issues.Add(new ValidationIssue
                {
                    Code = "AGE_EXCEEDS_120",
                    Severity = ValidationSeverity.Warning,
                    Field = "dateOfBirth",
                    Message = $"Age exceeds 120 years ({age} years) - please verify this is correct",
                    Suggestion = "Double-check the date of birth for accuracy",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DateOfBirthValidationRule for rule {RuleId}", RuleId);
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
