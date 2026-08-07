namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho Prompt Template - đại diện cho một cặp System + User prompt.
/// 
/// Mỗi template bao gồm:
/// - System prompt: Quy định vai trò và hành động của AI
/// - User prompt: Chứa dữ liệu và yêu cầu cụ thể (với placeholders)
/// 
/// Templates được load từ file và cache trong bộ nhớ.
/// 
/// Task-022: Prompt Template System.
/// </summary>
public interface IPromptTemplate
{
    /// <summary>
    /// Tên của template (e.g., "validation", "explanation").
    /// </summary>
    string Name { get; }

    /// <summary>
    /// System prompt (không chứa placeholders).
    /// </summary>
    string SystemPrompt { get; }

    /// <summary>
    /// User prompt template (có thể chứa placeholders).
    /// </summary>
    string UserPromptTemplate { get; }

    /// <summary>
    /// Danh sách các placeholder mà template này hỗ trợ.
    /// </summary>
    IReadOnlyList<string> SupportedPlaceholders { get; }

    /// <summary>
    /// Build final user prompt bằng cách thay thế placeholders.
    /// </summary>
    /// <param name="context">Dictionary chứa giá trị để thay thế placeholders.</param>
    /// <returns>User prompt với placeholders đã được thay thế.</returns>
    string BuildUserPrompt(Dictionary<string, string> context);
}
