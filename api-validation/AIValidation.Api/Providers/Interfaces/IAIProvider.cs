using AIValidation.Api.Models.AI;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho một nhà cung cấp AI cụ thể.
/// 
/// Mỗi IAIProvider đại diện cho một dịch vụ AI:
/// - OpenAI (GPT-4, GPT-3.5-turbo)
/// - Google Gemini
/// - Zhipu GLM
/// - Alibaba Qwen
/// - Ollama (local models)
/// - Azure OpenAI
/// 
/// LLMProvider (proxy) sẽ chọn IAIProvider phù hợp dựa trên configuration.
/// </summary>
public interface IAIProvider
{
    /// <summary>
    /// Gửi AIRequest tới AI Provider này và nhận AIResponse.
    /// 
    /// Mỗi implementation xử lý:
    /// - API endpoint connection
    /// - Request format transformation (OpenAI format, Gemini format, etc.)
    /// - Authentication (API keys, bearer tokens)
    /// - Response parsing (convert provider response to AIResponse)
    /// - Error handling
    /// </summary>
    /// <param name="request">AIRequest từ LLMProvider.</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>AIResponse từ AI Provider.</returns>
    Task<AIResponse> GenerateAsync(
        AIRequest request,
        CancellationToken cancellationToken = default);
}
