using AIValidation.Api.Models.AI;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho provider giao tiếp với các mô hình AI.
/// 
/// Chương trình này trừu tượng hóa chi tiết giao tiếp với AI Provider cụ thể:
/// - OpenAI GPT-4, GPT-3.5
/// - Azure OpenAI
/// - Google Gemini
/// - Zhipu GLM
/// - Alibaba Qwen
/// - Ollama
/// - Local Models
/// 
/// ValidationService không nhận biết hoặc phụ thuộc vào AI Provider nào đang được sử dụng.
/// Chỉ gửi AIRequest và nhận AIResponse.
/// </summary>
public interface ILLMProvider
{
    /// <summary>
    /// Gửi AIRequest tới AI Provider và nhận lại AIResponse.
    /// 
    /// Phương thức này:
    /// - Nhận AIRequest từ PromptBuilder
    /// - Kết nối tới configured AI Provider
    /// - Gửi request theo đúng format của Provider
    /// - Nhận response từ API
    /// - Transform response thành AIResponse
    /// - Trả về AIResponse (chưa parse JSON)
    /// 
    /// Trách nhiệm parse JSON thuộc ResponseParser.
    /// </summary>
    /// <param name="request">AIRequest từ PromptBuilder.</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>AIResponse từ AI Provider (chưa parse).</returns>
    Task<AIResponse> GenerateAsync(
        AIRequest request,
        CancellationToken cancellationToken = default);
}
