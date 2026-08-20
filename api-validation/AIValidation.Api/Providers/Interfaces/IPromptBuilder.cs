using AIValidation.Api.Models;
using AIValidation.Api.Models.AI;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho builder xây dựng AIRequest để gửi tới AI Provider.
/// 
/// Chịu trách nhiệm tạo AIRequest hoàn chỉnh từ:
/// - System Prompt (từ PromptLoader)
/// - Validation Rules (từ PromptLoader)
/// - Knowledge dữ liệu tham chiếu (từ KnowledgeProvider)
/// - Form Snapshot (từ ValidationRequest)
/// - Output Schema (từ PromptLoader)
/// - Model &amp; Temperature (từ LLMOptions configuration)
/// 
/// Prompt không được hard-code trong C#, được quản lý riêng
/// (từ files, config, database).
/// </summary>
public interface IPromptBuilder
{
    /// <summary>
    /// Xây dựng AIRequest hoàn chỉnh để gửi tới AI Provider.
    /// 
    /// Quy trình:
    /// 1. Load System Prompt, Validation Rules, Output Schema từ PromptLoader
    /// 2. Nhận Knowledge từ parameter
    /// 3. Extract Form Data từ ValidationRequest
    /// 4. Compose UserPrompt từ tất cả thành phần trên
    /// 5. Lấy Model, Temperature từ LLMOptions configuration
    /// 6. Build AIRequest object
    /// 7. Return AIRequest ready cho LLMProvider
    /// </summary>
    /// <param name="request">Yêu cầu xác thực chứa form data và context.</param>
    /// <param name="knowledge">Dữ liệu tham chiếu từ KnowledgeProvider (structured).</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>AIRequest hoàn chỉnh sẵn sàng gửi tới AI Provider.</returns>
    Task<AIRequest> BuildPromptAsync(
        ValidationRequest request,
        IReadOnlyList<KnowledgeDocument> knowledge,
        CancellationToken cancellationToken = default);
}
