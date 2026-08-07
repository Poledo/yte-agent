namespace AIValidation.Api.Models.AI;

/// <summary>
/// Token usage statistics từ AI Provider response.
/// 
/// Ghi lại chi tiết về số lượng tokens sử dụng trong request.
/// Được cung cấp bởi hầu hết các LLM APIs.
/// </summary>
public record AIUsage
{
    /// <summary>
    /// Số lượng tokens trong prompt (input).
    /// </summary>
    public required int PromptTokens { get; init; }

    /// <summary>
    /// Số lượng tokens trong completion (output).
    /// </summary>
    public required int CompletionTokens { get; init; }

    /// <summary>
    /// Tổng số tokens (PromptTokens + CompletionTokens).
    /// </summary>
    public required int TotalTokens { get; init; }
}
