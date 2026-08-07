namespace AIValidation.Api.Configuration;

/// <summary>
/// Configuration options cho LLM Provider.
/// 
/// Chứa tất cả cấu hình cần thiết để giao tiếp với AI Provider:
/// - Provider type (OpenAI, Gemini, GLM, Qwen, etc.)
/// - Connection details (BaseUrl, ApiKey)
/// - Model selection
/// - Request parameters (Timeout, Temperature, MaxTokens)
/// 
/// Được load từ appsettings.json section "LLM".
/// </summary>
public class LLMOptions
{
    /// <summary>
    /// Tên AI Provider sử dụng.
    /// Ví dụ: "OpenAI", "Azure", "Gemini", "GLM", "Qwen", "Ollama"
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// Base URL của AI Provider API.
    /// Ví dụ: "https://api.openai.com/v1"
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// API Key để authenticate với AI Provider.
    /// Được lấy từ environment variable hoặc appsettings.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Tên model sử dụng.
    /// Ví dụ: "gpt-4", "gpt-3.5-turbo", "gemini-pro", "glm-4"
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Model dự phòng theo thứ tự ưu tiên (chỉ OpenRouter hỗ trợ).
    /// Khi Model chính lỗi hoặc bị rate-limit, OpenRouter tự chuyển sang
    /// model kế tiếp trong danh sách. Rỗng = không dùng fallback.
    /// </summary>
    public List<string> FallbackModels { get; set; } = new();

    /// <summary>
    /// Timeout cho AI API request tính bằng giây.
    /// Default: 60 seconds
    /// </summary>
    public int TimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Temperature parameter cho LLM (0.0 - 2.0).
    /// Kiểm soát độ "sáng tạo" của response.
    /// 0 = determinist, 1 = balanced, 2 = creative
    /// For validation, khuyến nghị 0.
    /// </summary>
    public double Temperature { get; set; } = 0.0;

    /// <summary>
    /// Maximum tokens trong response.
    /// Giới hạn độ dài response từ AI.
    /// Default: 4096 tokens
    /// </summary>
    public int MaxTokens { get; set; } = 4096;

    /// <summary>
    /// LLM sẵn sàng gọi hay chưa: Ollama (local) không cần ApiKey,
    /// các provider cloud thì bắt buộc có ApiKey.
    /// </summary>
    public bool IsConfigured =>
        string.Equals(Provider, "Ollama", StringComparison.OrdinalIgnoreCase)
        || !string.IsNullOrEmpty(ApiKey);
}
