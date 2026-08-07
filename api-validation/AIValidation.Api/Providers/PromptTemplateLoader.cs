using AIValidation.Api.Configuration;
using AIValidation.Api.Exceptions;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Providers;

/// <summary>
/// Implementation của Prompt Template Loader.
/// 
/// Đọc và cache prompt templates từ file.
/// 
/// Task-022: Prompt Template System.
/// </summary>
public class PromptTemplateLoader : IPromptTemplateLoader
{
    private readonly string _promptsDirectory;
    private readonly IPlaceholderEngine _placeholderEngine;
    private readonly Dictionary<string, IPromptTemplate> _templateCache;
    private readonly ILogger<PromptTemplateLoader>? _logger;

    /// <summary>
    /// Khởi tạo PromptTemplateLoader.
    /// </summary>
    /// <param name="promptOptions">Configuration cho prompt directory.</param>
    /// <param name="placeholderEngine">Engine để thay thế placeholders.</param>
    /// <param name="logger">Optional logger.</param>
    public PromptTemplateLoader(
        IOptions<PromptOptions> promptOptions,
        IPlaceholderEngine placeholderEngine,
        ILogger<PromptTemplateLoader>? logger = null)
    {
        if (promptOptions == null)
        {
            throw new ArgumentNullException(nameof(promptOptions));
        }

        _placeholderEngine = placeholderEngine ?? throw new ArgumentNullException(nameof(placeholderEngine));
        _logger = logger;

        // Xây dựng đường dẫn tới thư mục Prompts
        var baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        _promptsDirectory = Path.Combine(baseDirectory, promptOptions.Value.Folder);

        // Khởi tạo cache
        _templateCache = new Dictionary<string, IPromptTemplate>();

        _logger?.LogInformation("PromptTemplateLoader initialized with prompts directory: {PromptsDirectory}", _promptsDirectory);
    }

    /// <summary>
    /// Load một prompt template từ file.
    /// </summary>
    /// <param name="templateName">Tên template (e.g., "validation", "explanation")</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Loaded prompt template.</returns>
    /// <exception cref="PromptNotFoundException">Nếu file prompt system hoặc user không tồn tại.</exception>
    public async Task<IPromptTemplate> LoadTemplateAsync(
        string templateName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(templateName))
        {
            throw new ArgumentException("Template name cannot be null or whitespace.", nameof(templateName));
        }

        // Kiểm tra cache
        if (_templateCache.TryGetValue(templateName, out var cachedTemplate))
        {
            _logger?.LogDebug("Template '{TemplateName}' loaded from cache.", templateName);
            return cachedTemplate;
        }

        // Load system prompt
        var systemPromptPath = Path.Combine(_promptsDirectory, $"{templateName}.system.md");
        var systemPromptContent = await LoadPromptFileAsync(systemPromptPath, templateName, "system", cancellationToken);

        // Load user prompt template
        var userPromptPath = Path.Combine(_promptsDirectory, $"{templateName}.user.md");
        var userPromptContent = await LoadPromptFileAsync(userPromptPath, templateName, "user", cancellationToken);

        // Create prompt template
        var template = new PromptTemplate(
            templateName,
            systemPromptContent,
            userPromptContent,
            _placeholderEngine);

        // Cache template
        _templateCache[templateName] = template;

        _logger?.LogInformation("Template '{TemplateName}' loaded and cached.", templateName);

        return template;
    }

    /// <summary>
    /// Clear all cached templates.
    /// </summary>
    public void ClearCache()
    {
        _templateCache.Clear();
        _logger?.LogInformation("Prompt template cache cleared.");
    }

    /// <summary>
    /// Kiểm tra xem template có được cache không.
    /// </summary>
    /// <param name="templateName">Tên template để kiểm tra.</param>
    /// <returns>True nếu template đã được cache, false nếu không.</returns>
    public bool IsCached(string templateName)
    {
        return _templateCache.ContainsKey(templateName);
    }

    /// <summary>
    /// Load một prompt file từ disk.
    /// </summary>
    private async Task<string> LoadPromptFileAsync(
        string filePath,
        string templateName,
        string promptType,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(filePath))
        {
            var errorMessage = $"Prompt file not found: {filePath}";
            _logger?.LogError(errorMessage);
            throw new PromptNotFoundException(
                $"{templateName}.{promptType}",
                errorMessage);
        }

        try
        {
            var content = await File.ReadAllTextAsync(filePath, System.Text.Encoding.UTF8, cancellationToken);
            return content;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            var errorMessage = $"Failed to load prompt file '{filePath}': {ex.Message}";
            _logger?.LogError(ex, errorMessage);
            throw new PromptNotFoundException(
                $"{templateName}.{promptType}",
                errorMessage,
                ex);
        }
    }
}
