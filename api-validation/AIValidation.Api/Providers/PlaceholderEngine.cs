using System.Text.RegularExpressions;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// Implementation của Placeholder Engine.
/// 
/// Quản lý việc thay thế placeholders trong prompt templates.
/// 
/// Placeholders được định dạng: {{PlaceholderName}}
/// 
/// Nếu placeholder không tìm thấy trong context, sẽ được thay bằng chuỗi rỗng.
/// 
/// Task-022: Placeholder Engine cho Prompt Template System.
/// </summary>
public class PlaceholderEngine : IPlaceholderEngine
{
    // Regex pattern để tìm placeholders: {{...}}
    private static readonly Regex PlaceholderPattern = new Regex(
        @"\{\{(\w+)\}\}",
        RegexOptions.Compiled);

    /// <summary>
    /// Thay thế các placeholders trong template bằng giá trị từ context.
    /// 
    /// Placeholders có format: {{PlaceholderName}}
    /// 
    /// Nếu placeholder không tìm thấy trong context, sẽ thay bằng chuỗi rỗng.
    /// </summary>
    /// <param name="template">Template chứa placeholders.</param>
    /// <param name="context">Dictionary chứa giá trị để thay thế. Key là tên placeholder.</param>
    /// <returns>Template với placeholders đã được thay thế.</returns>
    public string ReplacePlaceholders(string template, Dictionary<string, string> context)
    {
        if (string.IsNullOrEmpty(template))
        {
            return template ?? string.Empty;
        }

        if (context == null || context.Count == 0)
        {
            // Nếu context rỗng, thay tất cả placeholders bằng chuỗi rỗng
            return PlaceholderPattern.Replace(template, string.Empty);
        }

        // Thay thế mỗi placeholder bằng giá trị từ context
        return PlaceholderPattern.Replace(template, match =>
        {
            var placeholderName = match.Groups[1].Value;

            // Tìm kiếm case-insensitive để linh hoạt hơn
            if (context.TryGetValue(placeholderName, out var value))
            {
                return value ?? string.Empty;
            }

            // Nếu không tìm thấy, thay bằng chuỗi rỗng (không throw exception)
            return string.Empty;
        });
    }

    /// <summary>
    /// Kiểm tra xem template có chứa placeholder không.
    /// </summary>
    /// <param name="template">Template để kiểm tra.</param>
    /// <returns>True nếu có placeholder, false nếu không.</returns>
    public bool HasPlaceholders(string template)
    {
        if (string.IsNullOrEmpty(template))
        {
            return false;
        }

        return PlaceholderPattern.IsMatch(template);
    }

    /// <summary>
    /// Lấy danh sách tất cả placeholders trong template.
    /// </summary>
    /// <param name="template">Template để kiểm tra.</param>
    /// <returns>List các placeholder names (không có {{}})</returns>
    public IReadOnlyList<string> GetPlaceholders(string template)
    {
        if (string.IsNullOrEmpty(template))
        {
            return new List<string>();
        }

        var placeholders = new List<string>();
        var matches = PlaceholderPattern.Matches(template);

        foreach (Match match in matches)
        {
            var placeholderName = match.Groups[1].Value;

            // Không thêm duplicates
            if (!placeholders.Contains(placeholderName))
            {
                placeholders.Add(placeholderName);
            }
        }

        return placeholders.AsReadOnly();
    }
}
