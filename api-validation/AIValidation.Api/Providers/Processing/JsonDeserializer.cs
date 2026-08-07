using System.Text.Json;
using AIValidation.Api.Models;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Processing;

/// <summary>
/// JSON Deserializer: Chuyển đổi JSON string thành ValidationResponse object.
///
/// Mục đích:
/// - Deserialize JSON string thành ValidationResponse
/// - Validate cấu trúc dữ liệu
/// - Đảm bảo data integrity
///
/// Validation Rules:
/// 1. Issues collection không được null
/// 2. Mỗi ValidationIssue phải có:
///    - Code: string not empty
///    - Severity: valid enum (Error, Warning, Info)
///    - Field: string (có thể empty)
///    - Message: string not empty
///    - Suggestion: string (có thể empty)
///    - CanAutoFix: boolean
///    - FixValue: string (có thể empty)
/// 3. Ít nhất 1 issue phải tồn tại
///
/// Current Status:
/// - Skeleton only
/// - No implementation
/// - Method throws NotImplementedException
///
/// Future Implementation Checklist:
/// - Use System.Text.Json or Newtonsoft.Json to parse JSON
/// - Deserialize to ValidationResponse object
/// - Validate each ValidationIssue field
/// - Validate Severity enum values
/// - Check required fields are not empty
/// - Handle JSON parsing errors
/// - Handle incomplete/invalid data structures
/// </summary>
public class JsonDeserializer : IJsonDeserializer
{
    /// <summary>
    /// Khởi tạo JsonDeserializer.
    /// </summary>
    public JsonDeserializer()
    {
    }

    /// <summary>
    /// Deserialize JSON string thành ValidationResponse.
    ///
    /// Process:
    /// 1. Parse JSON string to object:
    ///    - Use JsonSerializer or JsonConvert
    ///    - Create ValidationResponse instance
    ///    - Populate Issues collection
    ///
    /// 2. Validate ValidationResponse structure:
    ///    - Issues collection not null
    ///    - At least 1 issue exists
    ///
    /// 3. Validate each ValidationIssue:
    ///    - Code not empty
    ///    - Severity is valid enum (Error, Warning, Info)
    ///    - Field not empty
    ///    - Message not empty
    ///    - CanAutoFix is boolean (always valid)
    ///
    /// 4. Return validated ValidationResponse
    ///
    /// Xử lý lỗi:
    /// - Nếu JSON parse thất bại: throw InvalidOperationException
    /// - Nếu validation thất bại: throw InvalidOperationException
    /// - Nếu enum conversion thất bại: throw InvalidOperationException
    ///
    /// Note: Does not do cleanup or text extraction.
    /// </summary>
    /// <param name="json">JSON string to deserialize (extracted by IJsonExtractor).</param>
    /// <returns>ValidationResponse object with validated structure.</returns>
    /// <exception cref="ArgumentNullException">Nếu json null hoặc empty.</exception>
    /// <exception cref="InvalidOperationException">Nếu JSON không hợp lệ hoặc structure không match ValidationResponse.</exception>
    public ValidationResponse Deserialize(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentException("JSON cannot be null or empty", nameof(json));
        }

        try
        {
            // Parse JSON string
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Check if "isValid" property exists
            if (!root.TryGetProperty("isValid", out var isValidElement) ||
                (isValidElement.ValueKind != JsonValueKind.True &&
                 isValidElement.ValueKind != JsonValueKind.False))
            {
                throw new InvalidOperationException("JSON must contain 'isValid' property (boolean)");
            }

            // Check if "summary" property exists
            if (!root.TryGetProperty("summary", out var summaryElement) ||
                summaryElement.ValueKind != JsonValueKind.String)
            {
                throw new InvalidOperationException("JSON must contain 'summary' property (string)");
            }

            // Check if "issues" property exists
            if (!root.TryGetProperty("issues", out var issuesElement))
            {
                throw new InvalidOperationException("JSON must contain 'issues' property");
            }

            // Validate issues is an array
            if (issuesElement.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException("'issues' property must be an array");
            }

            // Deserialize each issue
            var issuesList = new List<ValidationIssue>();

            foreach (var issueElement in issuesElement.EnumerateArray())
            {
                var issue = DeserializeValidationIssue(issueElement);
                issuesList.Add(issue);
            }

            // Return ValidationResponse
            return new ValidationResponse
            {
                IsValid = isValidElement.GetBoolean(),
                Summary = summaryElement.GetString() ?? throw new InvalidOperationException("Summary cannot be null"),
                Issues = issuesList
            };
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"Invalid JSON format: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Deserialize a single ValidationIssue from JSON element.
    ///
    /// Validates:
    /// - code (required, string)
    /// - severity (required, enum)
    /// - field (required, string)
    /// - message (required, string)
    /// - canAutoFix (optional, boolean) - defaults to false if not provided
    /// - suggestion (optional, string)
    /// - fixValue (optional, string)
    /// </summary>
    private static ValidationIssue DeserializeValidationIssue(JsonElement issueElement)
    {
        if (issueElement.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("Each issue must be an object");
        }

        // Extract required fields
        if (!issueElement.TryGetProperty("code", out var codeElement) ||
            codeElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("ValidationIssue must have 'code' (string)");
        }

        if (!issueElement.TryGetProperty("severity", out var severityElement) ||
            severityElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("ValidationIssue must have 'severity' (string)");
        }

        if (!issueElement.TryGetProperty("field", out var fieldElement) ||
            fieldElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("ValidationIssue must have 'field' (string)");
        }

        if (!issueElement.TryGetProperty("message", out var messageElement) ||
            messageElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("ValidationIssue must have 'message' (string)");
        }

        // Extract canAutoFix - optional boolean field, defaults to false
        var canAutoFixValue = false;
        if (issueElement.TryGetProperty("canAutoFix", out var canAutoFixElement))
        {
            if (canAutoFixElement.ValueKind != JsonValueKind.True &&
                canAutoFixElement.ValueKind != JsonValueKind.False)
            {
                throw new InvalidOperationException("ValidationIssue 'canAutoFix' must be boolean (true/false)");
            }
            canAutoFixValue = canAutoFixElement.GetBoolean();
        }
        // If not provided, defaults to false (canAutoFix is optional)

        // Parse severity enum
        var severityString = severityElement.GetString() ?? throw new InvalidOperationException("Severity cannot be null");
        if (!Enum.TryParse<ValidationSeverity>(severityString, ignoreCase: true, out var severity))
        {
            throw new InvalidOperationException($"Invalid severity value: {severityString}. Must be Error, Warning, or Info");
        }

        // Extract optional fields
        var suggestion = issueElement.TryGetProperty("suggestion", out var suggestionElement) &&
                         suggestionElement.ValueKind == JsonValueKind.String
            ? suggestionElement.GetString()
            : null;

        var fixValue = issueElement.TryGetProperty("fixValue", out var fixValueElement) &&
                       fixValueElement.ValueKind == JsonValueKind.String
            ? fixValueElement.GetString()
            : null;

        // Create ValidationIssue
        return new ValidationIssue
        {
            Code = codeElement.GetString() ?? throw new InvalidOperationException("Code cannot be null"),
            Severity = severity,
            Field = fieldElement.GetString() ?? throw new InvalidOperationException("Field cannot be null"),
            Message = messageElement.GetString() ?? throw new InvalidOperationException("Message cannot be null"),
            Suggestion = suggestion,
            CanAutoFix = canAutoFixValue,  // Use the defaulted value (false if not provided)
            FixValue = fixValue
        };
    }
}
