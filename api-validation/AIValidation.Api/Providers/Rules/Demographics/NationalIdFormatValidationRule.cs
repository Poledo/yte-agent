using System.Text.Json;
using System.Text.RegularExpressions;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Rules.Demographics;

/// <summary>
/// Rule DEM-R005: National ID Format Validation
/// 
/// Validates Vietnamese National ID format when provided
/// Expected formats: X-XXXXXX-XXXXXX or similar 12-digit format with dashes
/// </summary>
public class NationalIdFormatValidationRule : IRule
{
    public string RuleId => "DEM-R005";
    public string RuleName => "National ID Format Validation";

    // Vietnamese ID formats:
    // 1-XXXXXX-XXXXXX (old format)
    // 1-XXXXXX-XXXXXX-X (newer format)
    private static readonly Regex[] ValidIdPatterns =
    {
        new(@"^\d{1}-\d{6}-\d{6}$", RegexOptions.Compiled),           // X-XXXXXX-XXXXXX
        new(@"^\d{1}-\d{6}-\d{5}-\d{1}$", RegexOptions.Compiled),    // X-XXXXXX-XXXXX-X
        new(@"^\d{12}$", RegexOptions.Compiled),                      // XXXXXXXXXXXX (no dashes)
        new(@"^\d{13}$", RegexOptions.Compiled)                       // XXXXXXXXXXXXX (13 digits)
    };

    private readonly ILogger<NationalIdFormatValidationRule> _logger;

    public NationalIdFormatValidationRule(ILogger<NationalIdFormatValidationRule> logger)
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

            // Try different property names
            string? nationalId = GetStringProperty(request.Form, "nationalId", "nationalID", "national_id");

            if (string.IsNullOrWhiteSpace(nationalId))
            {
                return issues; // Optional field
            }

            nationalId = nationalId.Trim();

            // Check if format matches any valid pattern
            if (!ValidIdPatterns.Any(pattern => pattern.IsMatch(nationalId)))
            {
                issues.Add(new ValidationIssue
                {
                    Code = "INVALID_ID_FORMAT",
                    Severity = ValidationSeverity.Error,
                    Field = "nationalId",
                    Message = "Invalid National ID format. Expected format: X-XXXXXX-XXXXXX or XXXXXXXXXXXX",
                    Suggestion = "Please enter a valid Vietnamese National ID (12 or 13 digits, with or without dashes)",
                    CanAutoFix = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in NationalIdFormatValidationRule for rule {RuleId}", RuleId);
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
                return prop.GetString();
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
