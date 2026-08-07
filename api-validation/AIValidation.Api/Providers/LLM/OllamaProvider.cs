using System.Text.Json;
using System.Text.Json.Serialization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Providers.LLM;

/// <summary>
/// Ollama Provider: Implementation of IAIProvider for Ollama local LLM API.
///
/// Ollama:
/// - Local/remote LLM server
/// - Supports multiple models: llama2, mistral, neural-chat, gemma, etc.
/// - Simple REST API compatible with OpenAI Chat Completions format
/// - No API key required for local instances
/// - Useful for development, testing, and privacy-preserving deployments
///
/// Configuration (from LLMOptions):
/// - BaseUrl: http://localhost:11434 (or remote server)
/// - Model: Model name (e.g., "llama2", "mistral", "neural-chat")
/// - Temperature: 0-2 (inherited from parent)
/// - MaxTokens: Maximum tokens in response (inherited from parent)
/// - TimeoutSeconds: HTTP request timeout (inherited from parent)
/// - ApiKey: Not used for Ollama (can be empty)
///
/// API Specification:
/// - Method: POST
/// - Endpoint: /api/chat
/// - Auth: None (no authentication required)
/// - Body: Ollama Chat format (similar to OpenAI but simpler)
/// - Response: Ollama Chat format
///
/// Request Format:
/// POST /api/chat
/// {
///   "model": "llama2",
///   "messages": [
///     { "role": "system", "content": "..." },
///     { "role": "user", "content": "..." }
///   ],
///   "temperature": 0.7,
///   "stream": false
/// }
///
/// Response Format:
/// {
///   "model": "llama2",
///   "created_at": "2024-01-01T00:00:00Z",
///   "message": {
///     "role": "assistant",
///     "content": "Response content here"
///   },
///   "done": true,
///   "total_duration": 12345678,
///   "load_duration": 1234567,
///   "prompt_eval_count": 100,
///   "prompt_eval_duration": 2345678,
///   "eval_count": 50,
///   "eval_duration": 3456789
/// }
///
/// Design:
/// - No hardcoded URLs or models
/// - Configuration through DI + LLMOptions
/// - Extensible alongside other providers
/// - Simpler than OpenRouter (no complex fallback logic)
/// </summary>
public class OllamaProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly LLMOptions _options;
    private readonly ILogger<OllamaProvider> _logger;

    /// <summary>
    /// Initialize Ollama Provider.
    ///
    /// Constructor Injection:
    /// - httpClient: Named HttpClient from IHttpClientFactory
    /// - options: LLMOptions configuration
    /// - logger: Structured logging
    ///
    /// Dependencies:
    /// - HttpClient is created by IHttpClientFactory
    /// - Timeout is set from LLMOptions.TimeoutSeconds
    /// - No authentication header needed
    /// </summary>
    /// <param name="httpClient">HttpClient instance from factory.</param>
    /// <param name="options">LLM configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    /// <exception cref="ArgumentNullException">If any dependency is null.</exception>
    public OllamaProvider(
        HttpClient httpClient,
        IOptions<LLMOptions> options,
        ILogger<OllamaProvider> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generate AI response using Ollama REST API.
    ///
    /// Process:
    /// 1. Validate configuration (BaseUrl must be set)
    /// 2. Transform AIRequest to Ollama Chat format
    /// 3. Create HTTP request (POST to /api/chat)
    /// 4. Send request (no authentication needed)
    /// 5. Deserialize response
    /// 6. Extract content and usage info (if available)
    /// 7. Transform to AIResponse
    /// 8. Return AIResponse
    ///
    /// Configuration Mapping:
    /// - request.SystemPrompt → messages[0] role="system" content
    /// - request.UserPrompt → messages[1] role="user" content
    /// - request.Model → model (from request, fallback to LLMOptions.Model)
    /// - request.Temperature → temperature
    /// - LLMOptions.BaseUrl → endpoint base URL
    /// - stream: false (always use non-streaming mode)
    ///
    /// Error Handling:
    /// - Validate BaseUrl not empty
    /// - Check response status code
    /// - Log errors with full context
    /// - Throw appropriate exceptions
    ///
    /// Note on Token Usage:
    /// Ollama provides performance metrics (prompt_eval_count, eval_count)
    /// but not in the same format as OpenAI. We'll attempt to extract
    /// token counts when available, but AIResponse.Usage can be null
    /// if metrics are not available from Ollama.
    /// </summary>
    /// <param name="request">AIRequest containing prompts, model, and settings.</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>AIResponse from Ollama API.</returns>
    /// <exception cref="ArgumentNullException">If request null.</exception>
    /// <exception cref="InvalidOperationException">If configuration invalid or API call failed.</exception>
    /// <exception cref="OperationCanceledException">If operation cancelled.</exception>
    /// <exception cref="HttpRequestException">If HTTP request failed.</exception>
    public async Task<AIResponse> GenerateAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Step 1: Validate configuration
        ValidateConfiguration();

        // Step 2: Log request
        _logger.LogInformation(
            "Sending request to Ollama: Model={Model}, UserPromptLength={UserPromptLength}",
            request.Model ?? _options.Model,
            request.UserPrompt?.Length ?? 0);

        try
        {
            // Step 3: Create request payload
            var requestPayload = CreateRequestPayload(request);

            // Step 4: Create HTTP request
            var endpoint = $"{_options.BaseUrl}/api/chat";
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(requestPayload),
                    System.Text.Encoding.UTF8,
                    "application/json")
            };

            // Step 5: No authorization needed for Ollama

            // Step 6: Send HTTP request with timeout
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.SendAsync(httpRequest, cts.Token);

            // Step 7: Check HTTP status
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cts.Token);
                _logger.LogError(
                    "Ollama API error: StatusCode={StatusCode}, Content={Content}",
                    response.StatusCode,
                    errorContent);

                throw new InvalidOperationException(
                    $"Ollama API returned {response.StatusCode}: {errorContent}");
            }

            // Step 8: Deserialize response
            var responseContent = await response.Content.ReadAsStringAsync(cts.Token);
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };

            var ollamaResponse = JsonSerializer.Deserialize<OllamaChatResponse>(
                responseContent,
                jsonOptions);

            if (ollamaResponse is null)
            {
                throw new InvalidOperationException("Failed to deserialize Ollama response");
            }

            // Step 9: Extract message content
            var messageContent = ollamaResponse.Message?.Content
                ?? throw new InvalidOperationException("Ollama response has no message content");

            // Step 10: Build usage info (if available)
            AIUsage? usage = null;
            if (ollamaResponse.PromptEvalCount.HasValue && ollamaResponse.EvalCount.HasValue)
            {
                usage = new AIUsage
                {
                    PromptTokens = ollamaResponse.PromptEvalCount.Value,
                    CompletionTokens = ollamaResponse.EvalCount.Value,
                    TotalTokens = ollamaResponse.PromptEvalCount.Value + ollamaResponse.EvalCount.Value
                };
            }

            // Step 11: Build AIResponse
            var aiResponse = new AIResponse
            {
                Content = messageContent,
                Usage = usage,
                FinishReason = ollamaResponse.Done ? "stop" : "incomplete"
            };

            _logger.LogInformation(
                "Successfully received response from Ollama: ContentLength={ContentLength}, FinishReason={FinishReason}",
                messageContent.Length,
                aiResponse.FinishReason);

            return aiResponse;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Ollama API request cancelled or timed out");
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Ollama HTTP request failed");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize Ollama response");
            throw;
        }
    }

    /// <summary>
    /// Validate that required configuration is present.
    ///
    /// Checks:
    /// - BaseUrl is not empty or whitespace
    /// - Model is not empty or whitespace
    ///
    /// Throws InvalidOperationException if configuration is invalid.
    /// </summary>
    /// <exception cref="InvalidOperationException">If configuration invalid.</exception>
    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            throw new InvalidOperationException(
                "LLMOptions.BaseUrl is required for Ollama provider");
        }

        if (string.IsNullOrWhiteSpace(_options.Model))
        {
            throw new InvalidOperationException(
                "LLMOptions.Model is required for Ollama provider");
        }
    }

    /// <summary>
    /// Create Ollama Chat API request payload from AIRequest.
    ///
    /// Transforms:
    /// - SystemPrompt → messages[0] with role="system"
    /// - UserPrompt → messages[1] with role="user"
    /// - Model → model field
    /// - Temperature → temperature field
    /// - stream → false (always non-streaming)
    ///
    /// Returns an anonymous object suitable for JSON serialization.
    /// </summary>
    /// <param name="request">AIRequest from PromptBuilder.</param>
    /// <returns>Object suitable for JSON serialization to Ollama API.</returns>
    private object CreateRequestPayload(AIRequest request)
    {
        var messages = new List<object>();

        // Add system message
        messages.Add(new
        {
            role = "system",
            content = request.SystemPrompt
        });

        // Add user message
        messages.Add(new
        {
            role = "user",
            content = request.UserPrompt
        });

        return new
        {
            model = request.Model ?? _options.Model,
            messages = messages,
            temperature = request.Temperature,
            stream = false
        };
    }

    /// <summary>
    /// Ollama Chat Response DTO.
    ///
    /// Represents the JSON structure returned by Ollama /api/chat endpoint.
    /// </summary>
    private class OllamaChatResponse
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("message")]
        public OllamaMessage? Message { get; set; }

        [JsonPropertyName("done")]
        public bool Done { get; set; }

        [JsonPropertyName("total_duration")]
        public long? TotalDuration { get; set; }

        [JsonPropertyName("load_duration")]
        public long? LoadDuration { get; set; }

        [JsonPropertyName("prompt_eval_count")]
        public int? PromptEvalCount { get; set; }

        [JsonPropertyName("prompt_eval_duration")]
        public long? PromptEvalDuration { get; set; }

        [JsonPropertyName("eval_count")]
        public int? EvalCount { get; set; }

        [JsonPropertyName("eval_duration")]
        public long? EvalDuration { get; set; }
    }

    /// <summary>
    /// Ollama Message DTO.
    ///
    /// Represents a message in Ollama's response.
    /// </summary>
    private class OllamaMessage
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}
