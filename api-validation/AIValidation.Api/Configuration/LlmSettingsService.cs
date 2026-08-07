using System.Text.Json;

namespace AIValidation.Api.Configuration;

/// <summary>Trạng thái cấu hình LLM có thể đổi lúc runtime (lưu bền ra file JSON).</summary>
public class LlmSettingsState
{
    /// <summary>"online" (OpenRouter cloud) hoặc "offline" (Ollama local).</summary>
    public string Mode { get; set; } = "online";

    /// <summary>Model online — null thì dùng LLM:Model trong appsettings.</summary>
    public string? OnlineModel { get; set; }

    /// <summary>Model dự phòng online — null thì dùng LLM:FallbackModels trong appsettings.</summary>
    public List<string>? OnlineFallbackModels { get; set; }

    /// <summary>URL Ollama — null thì dùng mặc định http://localhost:11434.</summary>
    public string? OfflineBaseUrl { get; set; }

    /// <summary>Model Ollama — null thì dùng mặc định qwen2.5:7b-instruct.</summary>
    public string? OfflineModel { get; set; }

    /// <summary>Timeout offline (model local chậm hơn cloud) — null thì 120s.</summary>
    public int? OfflineTimeoutSeconds { get; set; }
}

/// <summary>
/// Nguồn sự thật cho cấu hình LLM đang hiệu lực. Cho phép admin chuyển đổi
/// online (OpenRouter) / offline (Ollama) từ web admin mà không cần restart:
/// mọi consumer nhận IOptions&lt;LLMOptions&gt; đều được cấp bản Current mới nhất
/// (đăng ký transient trong Program.cs).
/// </summary>
public interface ILlmSettings
{
    /// <summary>Cấu hình LLM đang hiệu lực (đã hợp nhất appsettings + override runtime).</summary>
    LLMOptions Current { get; }

    /// <summary>Trạng thái override hiện tại (để hiển thị/sửa trên admin).</summary>
    LlmSettingsState State { get; }

    /// <summary>ApiKey online đã cấu hình trong appsettings chưa (không lộ giá trị).</summary>
    bool HasOnlineApiKey { get; }

    /// <summary>Cập nhật cấu hình và lưu bền. Trả về cấu hình hiệu lực mới.</summary>
    Task<LLMOptions> UpdateAsync(LlmSettingsState state, CancellationToken ct = default);
}

/// <inheritdoc />
public sealed class LlmSettingsService : ILlmSettings
{
    // Mặc định offline (Ollama). Có thể ghi đè qua cấu hình/biến môi trường:
    //   LLM__OfflineBaseUrl, LLM__OfflineModel, LLM__OfflineTimeoutSeconds
    // — nhờ vậy trong cụm K8s trỏ thẳng http://ollama:11434 + model đã pull mà
    // không cần sửa code; dev vẫn rơi về localhost.
    private const string OfflineFallbackBaseUrl = "http://localhost:11434";
    private const string OfflineFallbackModel = "qwen2.5:7b-instruct";
    private const int OfflineFallbackTimeout = 120;

    private readonly string _offlineDefaultBaseUrl;
    private readonly string _offlineDefaultModel;
    private readonly int _offlineDefaultTimeout;

    private readonly LLMOptions _base;
    private readonly string _statePath;
    private readonly ILogger<LlmSettingsService> _logger;
    private readonly object _lock = new();

    private LlmSettingsState _state;
    private LLMOptions _current;

    public LlmSettingsService(
        IConfiguration configuration,
        IWebHostEnvironment env,
        ILogger<LlmSettingsService> logger)
    {
        _logger = logger;
        _base = configuration.GetSection("LLM").Get<LLMOptions>() ?? new LLMOptions();
        _offlineDefaultBaseUrl = configuration["LLM:OfflineBaseUrl"] is { Length: > 0 } url
            ? url.TrimEnd('/')
            : OfflineFallbackBaseUrl;
        _offlineDefaultModel = configuration["LLM:OfflineModel"] is { Length: > 0 } model
            ? model
            : OfflineFallbackModel;
        _offlineDefaultTimeout = int.TryParse(configuration["LLM:OfflineTimeoutSeconds"], out var t) && t > 0
            ? t
            : OfflineFallbackTimeout;
        _statePath = Path.Combine(env.ContentRootPath, "Storage", "llm-settings.json");
        _state = LoadState();
        _current = Build(_state);

        _logger.LogInformation(
            "Cấu hình LLM khởi động: mode={Mode}, provider={Provider}, model={Model}",
            _state.Mode, _current.Provider, _current.Model);
    }

    /// <inheritdoc />
    public LLMOptions Current
    {
        get { lock (_lock) return _current; }
    }

    /// <inheritdoc />
    public LlmSettingsState State
    {
        get { lock (_lock) return _state; }
    }

    /// <inheritdoc />
    public bool HasOnlineApiKey => !string.IsNullOrWhiteSpace(_base.ApiKey);

    /// <summary>ApiKey online từ appsettings — phục vụ test kết nối kể cả khi đang offline.</summary>
    internal string BaseApiKey => _base.ApiKey;

    /// <inheritdoc />
    public async Task<LLMOptions> UpdateAsync(LlmSettingsState state, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(state);
        state.Mode = state.Mode?.Trim().ToLowerInvariant() == "offline" ? "offline" : "online";

        LLMOptions rebuilt;
        lock (_lock)
        {
            _state = state;
            rebuilt = Build(state);
            _current = rebuilt;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
        await File.WriteAllTextAsync(
            _statePath,
            JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true }),
            ct);

        _logger.LogInformation(
            "Đã đổi cấu hình LLM: mode={Mode}, provider={Provider}, model={Model}",
            state.Mode, rebuilt.Provider, rebuilt.Model);
        return rebuilt;
    }

    /// <summary>Hợp nhất appsettings (nền) với override runtime thành cấu hình hiệu lực.</summary>
    private LLMOptions Build(LlmSettingsState state)
    {
        if (state.Mode == "offline")
        {
            return new LLMOptions
            {
                Provider = "Ollama",
                BaseUrl = string.IsNullOrWhiteSpace(state.OfflineBaseUrl) ? _offlineDefaultBaseUrl : state.OfflineBaseUrl.TrimEnd('/'),
                Model = string.IsNullOrWhiteSpace(state.OfflineModel) ? _offlineDefaultModel : state.OfflineModel,
                TimeoutSeconds = state.OfflineTimeoutSeconds is > 0 ? state.OfflineTimeoutSeconds.Value : _offlineDefaultTimeout,
                ApiKey = string.Empty, // Ollama không cần key
                Temperature = _base.Temperature,
                MaxTokens = _base.MaxTokens,
            };
        }

        return new LLMOptions
        {
            Provider = string.IsNullOrWhiteSpace(_base.Provider) ? "OpenRouter" : _base.Provider,
            BaseUrl = _base.BaseUrl,
            ApiKey = _base.ApiKey,
            Model = string.IsNullOrWhiteSpace(state.OnlineModel) ? _base.Model : state.OnlineModel,
            FallbackModels = state.OnlineFallbackModels ?? _base.FallbackModels,
            TimeoutSeconds = _base.TimeoutSeconds,
            Temperature = _base.Temperature,
            MaxTokens = _base.MaxTokens,
        };
    }

    private LlmSettingsState LoadState()
    {
        try
        {
            if (File.Exists(_statePath))
            {
                var loaded = JsonSerializer.Deserialize<LlmSettingsState>(File.ReadAllText(_statePath));
                if (loaded != null)
                {
                    return loaded;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được {Path} — dùng cấu hình mặc định (online)", _statePath);
        }
        return new LlmSettingsState();
    }
}
