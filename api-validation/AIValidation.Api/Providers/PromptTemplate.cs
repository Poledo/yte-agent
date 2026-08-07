using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// Implementation của Prompt Template.
/// 
/// Đại diện cho một cặp System + User prompt với hỗ trợ placeholders.
/// 
/// Task-022: Prompt Template System.
/// </summary>
public class PromptTemplate : IPromptTemplate
{
    private readonly IPlaceholderEngine _placeholderEngine;

    /// <summary>
    /// Tên của template.
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// System prompt (không chứa placeholders).
    /// </summary>
    public string SystemPrompt { get; }

    /// <summary>
    /// User prompt template (có thể chứa placeholders).
    /// </summary>
    public string UserPromptTemplate { get; }

    /// <summary>
    /// Danh sách các placeholder mà template này hỗ trợ.
    /// </summary>
    public IReadOnlyList<string> SupportedPlaceholders { get; }

    /// <summary>
    /// Khởi tạo PromptTemplate.
    /// </summary>
    /// <param name="name">Tên của template (e.g., "validation", "explanation").</param>
    /// <param name="systemPrompt">System prompt content.</param>
    /// <param name="userPromptTemplate">User prompt template (có thể chứa placeholders).</param>
    /// <param name="placeholderEngine">Engine để thay thế placeholders.</param>
    /// <exception cref="ArgumentNullException">Nếu các parameter bắt buộc là null.</exception>
    /// <exception cref="ArgumentException">Nếu name, systemPrompt, hoặc userPromptTemplate là chuỗi rỗng.</exception>
    public PromptTemplate(
        string name,
        string systemPrompt,
        string userPromptTemplate,
        IPlaceholderEngine placeholderEngine)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name cannot be null or whitespace.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(systemPrompt))
        {
            throw new ArgumentException("SystemPrompt cannot be null or whitespace.", nameof(systemPrompt));
        }

        if (string.IsNullOrWhiteSpace(userPromptTemplate))
        {
            throw new ArgumentException("UserPromptTemplate cannot be null or whitespace.", nameof(userPromptTemplate));
        }

        Name = name;
        SystemPrompt = systemPrompt;
        UserPromptTemplate = userPromptTemplate;
        _placeholderEngine = placeholderEngine ?? throw new ArgumentNullException(nameof(placeholderEngine));

        // Extract supported placeholders từ template
        SupportedPlaceholders = _placeholderEngine.GetPlaceholders(userPromptTemplate);
    }

    /// <summary>
    /// Build final user prompt bằng cách thay thế placeholders.
    /// </summary>
    /// <param name="context">Dictionary chứa giá trị để thay thế placeholders.</param>
    /// <returns>User prompt với placeholders đã được thay thế.</returns>
    public string BuildUserPrompt(Dictionary<string, string> context)
    {
        if (context == null)
        {
            // Nếu context null, thay tất cả placeholders bằng chuỗi rỗng
            context = new Dictionary<string, string>();
        }

        return _placeholderEngine.ReplacePlaceholders(UserPromptTemplate, context);
    }
}
