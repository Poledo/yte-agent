namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho Prompt Loader - quản lý việc đọc và cache Prompt files.
/// 
/// Chịu trách nhiệm:
/// - Đọc Prompt từ thư mục Prompts/
/// - Cache nội dung Prompt sau lần đầu tiên
/// - Hỗ trợ đọc bất kỳ file Prompt nào
/// - Không hard-code Prompt trong C#
/// 
/// Các Prompt file:
/// - system.md: System prompt cho AI
/// - validation.md: Validation rules
/// - output.md: Output schema JSON
/// </summary>
public interface IPromptLoader
{
    /// <summary>
    /// Đọc nội dung Prompt từ file.
    /// 
    /// Quy trình:
    /// 1. Kiểm tra cache trước đã có nội dung chưa
    /// 2. Nếu có, trả về từ cache
    /// 3. Nếu không, đọc từ file Prompts/
    /// 4. Cache nội dung
    /// 5. Trả về nội dung
    /// 
    /// File path: Prompts/{promptName}.md
    /// </summary>
    /// <param name="promptName">Tên của prompt (không có phần mở rộng .md)</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Nội dung của prompt file dưới dạng string.</returns>
    /// <exception cref="AIValidation.Api.Exceptions.PromptNotFoundException">Nếu file prompt không tồn tại hoặc không thể đọc.</exception>
    Task<string> LoadAsync(
        string promptName,
        CancellationToken cancellationToken = default);
}
