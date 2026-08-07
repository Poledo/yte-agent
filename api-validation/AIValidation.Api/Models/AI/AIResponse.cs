namespace AIValidation.Api.Models.AI;

/// <summary>
/// Response contract từ LLMProvider.
/// 
/// Đại diện cho kết quả nhận được từ AI Provider.
/// LLMProvider sẽ transform response từ AI Provider thành AIResponse.
/// ResponseParser sẽ parse AIResponse.Content thành ValidationResponse.
/// </summary>
public record AIResponse
{
    /// <summary>
    /// Nội dung response từ AI Provider.
    /// 
    /// Thường là JSON format content, được define trong Output Schema.
    /// Ví dụ:
    /// ```json
    /// {
    ///   "issues": [
    ///     {
    ///       "code": "FIELD_REQUIRED",
    ///       "severity": "Error",
    ///       ...
    ///     }
    ///   ]
    /// }
    /// ```
    /// 
    /// Lưu ý: Chỉ là raw content từ AI, chưa parse thành objects.
    /// </summary>
    public required string Content { get; init; }

    /// <summary>
    /// Token usage statistics.
    /// 
    /// Hữu ích cho:
    /// - Monitoring API usage costs
    /// - Performance tracking
    /// - Quota management
    /// 
    /// Có thể null nếu AI Provider không cung cấp.
    /// </summary>
    public AIUsage? Usage { get; init; }

    /// <summary>
    /// Lý do hoàn thành (finish reason).
    /// 
    /// Ví dụ:
    /// - "stop" (normal completion)
    /// - "length" (max tokens reached)
    /// - "error" (API error)
    /// - "content_filter" (flagged by safety filter)
    /// 
    /// Có thể null nếu AI Provider không cung cấp.
    /// </summary>
    public string? FinishReason { get; init; }
}
