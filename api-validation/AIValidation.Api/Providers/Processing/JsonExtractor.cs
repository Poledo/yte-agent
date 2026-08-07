using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers.Processing;

/// <summary>
/// JSON Extractor: Trích xuất JSON hợp lệ từ AI response text.
///
/// Mục đích:
/// - Xử lý các định dạng AI response khác nhau
/// - Làm sạch text trước khi parse JSON
/// - Trích xuất JSON object từ response
///
/// Hỗ trợ xử lý:
/// 1. Markdown code block:
///    ```json
///    { ... }
///    ```
///    → Trích xuất { ... }
///
/// 2. Text + JSON:
///    "Here is the validation issues: { ... }"
///    → Trích xuất { ... }
///
/// 3. JSON thuần:
///    { ... }
///    → Trích xuất { ... }
///
/// 4. Khoảng trắng dư thừa:
///    "   { ... }   "
///    → Trích xuất { ... }
/// </summary>
public class JsonExtractor : IJsonExtractor
{
    /// <summary>
    /// Khởi tạo JsonExtractor.
    /// </summary>
    public JsonExtractor()
    {
    }

    /// <summary>
    /// Trích xuất JSON string từ AI response.
    ///
    /// Process:
    /// 1. Loại bỏ khoảng trắng đầu/cuối (Trim)
    /// 2. Phát hiện và loại bỏ Markdown code block
    /// 3. Tìm JSON object hợp lệ ('{' ... '}')
    /// 4. Trả về JSON string
    /// </summary>
    /// <param name="response">AI response text cần trích xuất JSON.</param>
    /// <returns>JSON string đã trích xuất và làm sạch.</returns>
    /// <exception cref="InvalidOperationException">Nếu không tìm thấy JSON hợp lệ trong response.</exception>
    public string Extract(string response)
    {
        if (string.IsNullOrWhiteSpace(response))
        {
            throw new InvalidOperationException("Response cannot be null or empty");
        }

        // Step 1: Trim whitespace
        var trimmed = response.Trim();

        // Step 2: Remove markdown code block if present
        trimmed = RemoveMarkdownCodeBlock(trimmed);

        // Step 3: Find JSON boundaries
        var startIndex = trimmed.IndexOf('{');
        var endIndex = trimmed.LastIndexOf('}');

        // Step 4: Validate boundaries
        if (startIndex < 0 || endIndex < 0 || startIndex >= endIndex)
        {
            throw new InvalidOperationException("No valid JSON object found in response");
        }

        // Step 5: Extract JSON substring
        var jsonString = trimmed.Substring(startIndex, endIndex - startIndex + 1);

        return jsonString;
    }

    /// <summary>
    /// Remove markdown code block wrapper if present.
    ///
    /// Handles formats:
    /// - ```json { ... } ``` → { ... }
    /// - ``` { ... } ``` → { ... }
    /// - ```{ ... }``` → { ... }
    /// </summary>
    private static string RemoveMarkdownCodeBlock(string text)
    {
        // Check for markdown code block delimiters
        const string codeBlockStart = "```";

        var startIndex = text.IndexOf(codeBlockStart);
        if (startIndex < 0)
        {
            return text;  // No code block
        }

        // Find closing delimiter
        var endIndex = text.IndexOf(codeBlockStart, startIndex + codeBlockStart.Length);
        if (endIndex < 0)
        {
            return text;  // Unmatched code block
        }

        // Extract content between delimiters
        var contentStart = startIndex + codeBlockStart.Length;
        var content = text.Substring(contentStart, endIndex - contentStart);

        // Remove optional "json" language identifier
        content = content.Trim();
        if (content.StartsWith("json", StringComparison.OrdinalIgnoreCase))
        {
            content = content.Substring(4);
        }

        return content.Trim();
    }
}
