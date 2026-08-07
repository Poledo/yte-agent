using AIValidation.Api.Exceptions;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// Prompt Loader - quản lý việc đọc và cache Prompt files từ thư mục Prompts/.
/// 
/// Chịu trách nhiệm:
/// - Đọc Prompt files (system.md, validation.md, output.md)
/// - Cache nội dung Prompt trong bộ nhớ
/// - Hỗ trợ async file I/O
/// - Không hard-code Prompt
/// 
/// Prompt files được lưu trữ trong:
/// AIValidation.Api/Prompts/
/// </summary>
public class PromptLoader : IPromptLoader
{
    private readonly string _promptsDirectory;
    private readonly Dictionary<string, string> _promptCache;

    /// <summary>
    /// Khởi tạo PromptLoader.
    /// 
    /// Tự động xác định đường dẫn thư mục Prompts dựa trên vị trí của assembly.
    /// </summary>
    public PromptLoader()
    {
        // Lấy thư mục base của application
        var baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

        // Xây dựng đường dẫn đến thư mục Prompts
        // Trong development: bin/Debug/net10.0/Prompts
        // Trong production: Prompts (tuỳ thuộc publish settings)
        _promptsDirectory = Path.Combine(baseDirectory, "Prompts");

        // Khởi tạo cache
        _promptCache = new Dictionary<string, string>();
    }

    /// <summary>
    /// Đọc nội dung Prompt từ file, có sử dụng cache.
    /// 
    /// Quy trình:
    /// 1. Kiểm tra cache - nếu có sẵn trả về immediat
    /// 2. Nếu cache miss, đọc file từ đĩa
    /// 3. Lưu vào cache
    /// 4. Trả về nội dung
    /// 
    /// File path: {_promptsDirectory}/{promptName}.md
    /// Encoding: UTF-8
    /// </summary>
    /// <param name="promptName">Tên prompt (e.g., "system", "validation", "output")</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Nội dung prompt đã đọc.</returns>
    /// <exception cref="FileNotFoundException">Nếu file không tồn tại.</exception>
    /// <exception cref="InvalidOperationException">Nếu không thể đọc file.</exception>
    public async Task<string> LoadAsync(
        string promptName,
        CancellationToken cancellationToken = default)
    {
        // Kiểm tra cache
        if (_promptCache.TryGetValue(promptName, out var cachedContent))
        {
            return cachedContent;
        }

        // Xây dựng đường dẫn file
        var filePath = Path.Combine(_promptsDirectory, $"{promptName}.md");

        // Validate file tồn tại
        if (!File.Exists(filePath))
        {
            throw new PromptNotFoundException(
                promptName,
                $"Prompt file not found: {filePath}");
        }

        try
        {
            // Đọc nội dung file (UTF-8)
            var content = await File.ReadAllTextAsync(filePath, System.Text.Encoding.UTF8, cancellationToken);

            // Lưu vào cache
            _promptCache[promptName] = content;

            return content;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (PromptNotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new PromptNotFoundException(
                promptName,
                $"Failed to load prompt '{promptName}' from file: {filePath}",
                ex);
        }
    }
}
