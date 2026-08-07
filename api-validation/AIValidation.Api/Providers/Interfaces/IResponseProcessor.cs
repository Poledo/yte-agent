using AIValidation.Api.Models;
using AIValidation.Api.Models.AI;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho processor chuyển đổi AIResponse thành ValidationResponse.
///
/// Chịu trách nhiệm:
/// - Làm sạch phản hồi từ AI
/// - Trích xuất JSON hợp lệ từ response.Content
/// - Deserialize thành ValidationResponse object
/// - Validate cấu trúc dữ liệu
/// - Xử lý lỗi nếu response không hợp lệ
///
/// Processor hoạt động độc lập, không gọi LLM hay các services khác.
/// </summary>
public interface IResponseProcessor
{
    /// <summary>
    /// Process AIResponse từ LLMProvider thành ValidationResponse asynchronously.
    ///
    /// Quy trình:
    /// 1. Nhận AIResponse từ LLMProvider
    /// 2. Sử dụng IJsonExtractor để trích xuất JSON hợp lệ:
    ///    - Loại bỏ markdown code block (```...```)
    ///    - Trích xuất JSON object từ văn bản
    ///    - Xử lý JSON bị bao quanh bởi giải thích
    /// 3. Sử dụng IJsonDeserializer để deserialize thành ValidationResponse
    /// 4. Validate cấu trúc dữ liệu:
    ///    - IsValid không null
    ///    - Issues không null
    ///    - Summary không null
    /// 5. Log finish_reason, usage, và processing time
    /// 6. Trả về ValidationResponse
    /// 7. Xử lý exception nếu data invalid - throw ResponseProcessingException
    /// </summary>
    /// <param name="response">AIResponse từ LLMProvider.</param>
    /// <param name="cancellationToken">Token để hủy operation.</param>
    /// <returns>ValidationResponse đã process, ready để trả về cho Extension.</returns>
    /// <exception cref="ArgumentNullException">Nếu response null.</exception>
    /// <exception cref="ResponseProcessingException">Nếu response không hợp lệ hoặc không thể process.</exception>
    Task<ValidationResponse> ProcessAsync(
        AIResponse response,
        CancellationToken cancellationToken = default);
}
