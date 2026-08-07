using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Providers;

/// <summary>
/// LLM Provider: Middleware layer between validation system and concrete AI providers.
///
/// Responsibilities:
/// - Read configuration from LLMOptions.Provider
/// - Select the appropriate IAIProvider from the registered providers
/// - Forward AIRequest to the selected provider
/// - Return AIResponse from provider to the caller
///
/// Provider Selection:
/// - Configuration: LLMOptions.Provider setting (from appsettings.json)
/// - Default: "openrouter" if not specified
/// - Supported: "openrouter", "openai", "gemini", "ollama", etc.
/// - Case-insensitive comparison
///
/// Architecture:
/// - Does NOT call any AI service directly
/// - Does NOT make HTTP requests
/// - Only orchestrates between caller and IAIProvider implementations
/// - Uses naming convention to match provider implementations
///
/// Design Pattern:
/// - Dependency Injection: IEnumerable<IAIProvider>
/// - Configuration: IOptions<LLMOptions>
/// - Extensibility: New providers added by implementing IAIProvider and registering in DI
///
/// Example Extension:
/// To add a new provider (e.g., "gemini"):
/// 1. Create GeminiProvider : IAIProvider
/// 2. Register in Program.cs: builder.Services.AddHttpClient<IAIProvider, GeminiProvider>();
/// 3. Set in appsettings.json: "Provider": "gemini"
/// 4. No changes needed to LLMProvider - already extensible
/// </summary>
public class LLMProvider : ILLMProvider
{
    private readonly IEnumerable<IAIProvider> _providers;
    private readonly LLMOptions _options;
    private readonly ILogger<LLMProvider>? _logger;

    /// <summary>
    /// Initialize LLMProvider with registered AI providers and configuration.
    /// </summary>
    /// <param name="providers">Collection of registered IAIProvider implementations.</param>
    /// <param name="options">LLM configuration options (provider selection, etc.).</param>
    /// <param name="logger">Optional logger for debugging.</param>
    /// <exception cref="ArgumentNullException">If providers or options null.</exception>
    public LLMProvider(
        IEnumerable<IAIProvider> providers,
        IOptions<LLMOptions> options,
        ILogger<LLMProvider>? logger = null)
    {
        _providers = providers ?? throw new ArgumentNullException(nameof(providers));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    /// <summary>
    /// Generate AI response by forwarding AIRequest to the configured provider.
    ///
    /// Process:
    /// 1. Get configured provider name (LLMOptions.Provider)
    /// 2. Select appropriate IAIProvider from _providers collection
    /// 3. Log provider selection
    /// 4. Forward AIRequest to the selected provider via GenerateAsync
    /// 5. Return AIResponse to the caller
    ///
    /// Provider Selection Logic:
    /// - If LLMOptions.Provider is empty or null: use "openrouter" (default)
    /// - If specified: use configured provider name
    /// - Match providers by type name (case-insensitive)
    /// - Example: "openrouter" matches OpenRouterProvider class
    ///
    /// Error Handling:
    /// - Log provider selection
    /// - Throw InvalidOperationException if provider not found
    /// - Let provider-specific exceptions propagate (handled by GlobalExceptionMiddleware)
    /// </summary>
    /// <param name="request">AIRequest containing system prompt, user prompt, model, and settings.</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>AIResponse from the selected AI provider.</returns>
    /// <exception cref="InvalidOperationException">If configured provider not found.</exception>
    /// <exception cref="ArgumentNullException">If request is null.</exception>
    public async Task<AIResponse> GenerateAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Step 1: Determine provider name
        var providerName = string.IsNullOrWhiteSpace(_options.Provider)
            ? "openrouter"  // Default provider
            : _options.Provider.ToLowerInvariant();

        _logger?.LogInformation("LLM Provider: Selecting provider '{ProviderName}'", providerName);

        // Step 2: Select provider
        var provider = SelectProvider(providerName);

        if (provider is null)
        {
            var message = $"LLM Provider '{providerName}' not found. Registered providers: {GetRegisteredProviderNames()}";
            _logger?.LogError(message);
            throw new InvalidOperationException(message);
        }

        // Step 3: Log selection
        _logger?.LogInformation(
            "LLM Provider: Using {ProviderType} for model '{Model}'",
            provider.GetType().Name,
            request.Model);

        // Step 4: Forward to provider
        try
        {
            var response = await provider.GenerateAsync(request, cancellationToken);

            _logger?.LogInformation(
                "LLM Provider: Successfully received response from {ProviderType}",
                provider.GetType().Name);

            return response;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "LLM Provider: Error from {ProviderType}", provider.GetType().Name);
            throw;
        }
    }

    /// <summary>
    /// Select appropriate IAIProvider based on provider name.
    ///
    /// Matching Strategy:
    /// - Converts type name to lowercase for comparison
    /// - Example: "openrouter" matches "OpenRouterProvider" (type.Name)
    /// - Case-insensitive to handle variations in configuration
    ///
    /// Example Providers:
    /// - "openrouter" → OpenRouterProvider
    /// - "openai" → OpenAIProvider
    /// - "gemini" → GeminiProvider
    /// - "ollama" → OllamaProvider
    /// - "glm" → GleminiProvider (Zhipu GLM)
    /// </summary>
    /// <param name="providerName">Provider name to search for (e.g., "openrouter").</param>
    /// <returns>Matching IAIProvider or null if not found.</returns>
    private IAIProvider? SelectProvider(string providerName)
    {
        // Find provider by matching type name (case-insensitive)
        // Example: providerName="openrouter" → Find type "OpenRouterProvider"
        foreach (var provider in _providers)
        {
            var typeName = provider.GetType().Name.ToLowerInvariant();

            // Match by full class name (e.g., "openrouterprovider")
            if (typeName.Contains(providerName))
            {
                return provider;
            }
        }

        return null;
    }

    /// <summary>
    /// Get comma-separated list of registered provider type names.
    ///
    /// Used for error messages to help debugging.
    /// Example output: "OpenRouterProvider, OpenAIProvider"
    /// </summary>
    /// <returns>Comma-separated provider names.</returns>
    private string GetRegisteredProviderNames()
    {
        var names = _providers
            .Select(p => p.GetType().Name)
            .ToList();

        return names.Count == 0
            ? "(none registered)"
            : string.Join(", ", names);
    }
}
