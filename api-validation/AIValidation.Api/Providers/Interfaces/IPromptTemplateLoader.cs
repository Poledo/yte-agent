namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho Prompt Template Loader - đọc và cache prompt templates.
/// 
/// Quản lý việc load các cặp System + User prompt từ file.
/// 
/// Templates được cache để tránh đọc file liên tục.
/// 
/// Task-022: Prompt Template System.
/// </summary>
public interface IPromptTemplateLoader
{
    /// <summary>
    /// Load một prompt template (System + User prompt).
    /// 
    /// Quy trình:
    /// 1. Kiểm tra cache
    /// 2. Nếu cache hit, trả về từ cache
    /// 3. Nếu cache miss, đọc 2 file: {templateName}.system.md và {templateName}.user.md
    /// 4. Cache template
    /// 5. Trả về IPromptTemplate
    /// 
    /// File paths:
    /// - System: {Folder}/{templateName}.system.md
    /// - User: {Folder}/{templateName}.user.md
    /// </summary>
    /// <param name="templateName">Tên template (e.g., "validation", "explanation")</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Loaded prompt template.</returns>
    /// <exception cref="AIValidation.Api.Exceptions.PromptNotFoundException">Nếu file prompt system hoặc user không tồn tại.</exception>
    /// <exception cref="InvalidOperationException">Nếu không thể đọc file.</exception>
    Task<IPromptTemplate> LoadTemplateAsync(
        string templateName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear all cached templates.
    /// 
    /// Dùng khi cần reload tất cả templates từ disk.
    /// </summary>
    void ClearCache();

    /// <summary>
    /// Kiểm tra xem template có được cache không.
    /// </summary>
    /// <param name="templateName">Tên template để kiểm tra.</param>
    /// <returns>True nếu template đã được cache, false nếu không.</returns>
    bool IsCached(string templateName);
}
