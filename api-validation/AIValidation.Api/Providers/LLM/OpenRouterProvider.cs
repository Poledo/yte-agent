using System.Text.Json;
using System.Text.Json.Serialization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Providers.LLM;

/// <summary>
/// OpenRouter Provider: Implementation of IAIProvider for OpenRouter REST API.
///
/// OpenRouter:
/// - Universal LLM gateway supporting 100+ models
/// - Models: OpenAI, Anthropic, Google, Meta, Mistral, etc.
/// - Unified Chat Completions API (OpenAI-compatible)
/// - Fallback to alternative models if primary fails
///
/// Configuration (from LLMOptions):
/// - BaseUrl: https://openrouter.ai/api/v1
/// - ApiKey: OpenRouter API key
/// - Model: Model ID (e.g., "openai/gpt-4", "anthropic/claude-3-opus", "google/gemini-pro")
/// - Temperature: 0-2 (0 = deterministic, 1 = balanced, 2 = creative)
/// - MaxTokens: Maximum tokens in response
/// - TimeoutSeconds: HTTP request timeout
///
/// API Specification:
/// - Method: POST
/// - Endpoint: /chat/completions
/// - Auth: Bearer {ApiKey}
/// - Body: Standard OpenAI Chat Completions format
/// - Response: Standard OpenAI Chat Completions format
///
/// Current Implementation:
/// - ✓ HTTP POST request via IHttpClientFactory
/// - ✓ Configuration-driven (no hardcoding)
/// - ✓ Message transformation (system + user)
/// - ✓ Response deserialization
/// - ✓ Error handling
/// - ✓ Logging
/// - ✓ Cancellation token support
/// - ✓ System.Text.Json
///
/// Design:
/// - No hardcoded URLs or models
/// - Configuration through DI + LLMOptions
/// - Extensible to other providers (Gemini, GLM, Ollama)
/// </summary>
public class OpenRouterProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly LLMOptions _options;
    private readonly ILogger<OpenRouterProvider> _logger;

    /// <summary>
    /// Khởi tạo OpenRouter Provider.
    ///
    /// Constructor Injection:
    /// - httpClient: Named HttpClient từ IHttpClientFactory
    /// - options: LLMOptions configuration
    /// - logger: Structured logging
    ///
    /// Dependencies:
    /// - HttpClient được tạo bởi IHttpClientFactory
    /// - Timeout được set từ LLMOptions.TimeoutSeconds
    /// - Authentication header được set trong Invoke
    /// </summary>
    /// <param name="httpClient">HttpClient instance từ factory.</param>
    /// <param name="options">LLM configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    /// <exception cref="ArgumentNullException">Nếu bất kỳ dependency nào null.</exception>
    public OpenRouterProvider(
        HttpClient httpClient,
        IOptions<LLMOptions> options,
        ILogger<OpenRouterProvider> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generate AI response using OpenRouter REST API.
    ///
    /// Process:
    /// 1. Validate configuration (ApiKey, BaseUrl)
    /// 2. Transform AIRequest to OpenRouter Chat Completions format
    /// 3. Create HTTP request (POST to /chat/completions)
    /// 4. Send request with Authorization header
    /// 5. Deserialize response
    /// 6. Extract usage and content
    /// 7. Transform to AIResponse
    /// 8. Return AIResponse
    ///
    /// Configuration Mapping:
    /// - request.SystemPrompt → messages[0] role="system" content
    /// - request.UserPrompt → messages[1] role="user" content
    /// - request.Model → model (from request, fallback to LLMOptions.Model)
    /// - request.Temperature → temperature
    /// - request.MaxTokens → max_tokens
    /// - LLMOptions.ApiKey → Authorization: Bearer
    /// - LLMOptions.BaseUrl → endpoint base URL
    ///
    /// Error Handling:
    /// - Validate ApiKey, BaseUrl not empty
    /// - Check response status code
    /// - Log errors with full context
    /// - Throw appropriate exceptions
    ///
    /// Request Format (OpenAI-compatible):
    /// POST /chat/completions
    /// {
    ///   "model": "openai/gpt-4",
    ///   "messages": [
    ///     { "role": "system", "content": "..." },
    ///     { "role": "user", "content": "..." }
    ///   ],
    ///   "temperature": 0.7,
    ///   "max_tokens": 4096
    /// }
    ///
    /// Response Format:
    /// {
    ///   "choices": [
    ///     { "message": { "content": "..." } }
    ///   ],
    ///   "usage": {
    ///     "prompt_tokens": 100,
    ///     "completion_tokens": 50,
    ///     "total_tokens": 150
    ///   }
    /// }
    /// </summary>
    /// <param name="request">AIRequest containing prompts, model, and settings.</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>AIResponse from OpenRouter API.</returns>
    /// <exception cref="ArgumentNullException">Nếu request null.</exception>
    /// <exception cref="InvalidOperationException">Nếu configuration invalid hoặc API call failed.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    /// <exception cref="HttpRequestException">Nếu HTTP request failed.</exception>
    public async Task<AIResponse> GenerateAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Step 1: Validate configuration
        ValidateConfiguration();

        // Step 2: Log request
        _logger.LogInformation(
            "Sending request to OpenRouter: Model={Model}, UserPromptLength={UserPromptLength}",
            request.Model ?? _options.Model,
            request.UserPrompt?.Length ?? 0);

        try
        {
            // Step 3: Create request payload
            var requestPayload = CreateRequestPayload(request);
            var payloadJson = JsonSerializer.Serialize(requestPayload);
            var endpoint = $"{_options.BaseUrl}/chat/completions";

            // Step 4-7: Gửi request; model miễn phí hay bị rate-limit thoáng qua (429
            // kèm Retry-After vài giây) nên retry tối đa MaxAttempts lần trước khi bỏ cuộc.
            const int MaxAttempts = 3;
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            HttpResponseMessage response;
            var attempt = 0;
            while (true)
            {
                attempt++;
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = new StringContent(payloadJson, System.Text.Encoding.UTF8, "application/json")
                };
                httpRequest.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.ApiKey);

                response = await _httpClient.SendAsync(httpRequest, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    break;
                }

                var errorContent = await response.Content.ReadAsStringAsync(cts.Token);

                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests && attempt < MaxAttempts)
                {
                    // Chờ theo Retry-After của server (mặc định 5s, trần 15s) rồi thử lại
                    var delaySeconds = response.Headers.RetryAfter?.Delta?.TotalSeconds ?? 5;
                    delaySeconds = Math.Clamp(delaySeconds, 1, 15);
                    _logger.LogWarning(
                        "OpenRouter rate-limit (429), thử lại lần {Next}/{Max} sau {Delay}s",
                        attempt + 1, MaxAttempts, delaySeconds);
                    await Task.Delay(TimeSpan.FromSeconds(delaySeconds), cts.Token);
                    continue;
                }

                _logger.LogError(
                    "OpenRouter API error: StatusCode={StatusCode}, Content={Content}",
                    response.StatusCode,
                    errorContent);

                throw new InvalidOperationException(
                    $"OpenRouter API returned {response.StatusCode}: {errorContent}");
            }

            // Step 8: Deserialize response
            var responseContent = await response.Content.ReadAsStringAsync(cts.Token);
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };

            var apiResponse = JsonSerializer.Deserialize<ChatCompletionResponse>(
                responseContent,
                jsonOptions);

            if (apiResponse?.Choices?.Count == 0)
            {
                throw new InvalidOperationException(
                    "OpenRouter API returned empty choices");
            }

            // Step 9: Transform to AIResponse
            var aiResponse = TransformToAIResponse(apiResponse!);

            _logger.LogInformation(
                "OpenRouter response received: Model={Model}, CompletionTokens={CompletionTokens}",
                apiResponse.Model,
                apiResponse.Usage?.CompletionTokens ?? 0);

            return aiResponse;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "OpenRouter request cancelled");
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "OpenRouter HTTP request failed");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenRouter request failed");
            throw new InvalidOperationException(
                "Failed to call OpenRouter API",
                ex);
        }
    }

    /// <summary>
    /// Validate LLMOptions configuration.
    ///
    /// Checks:
    /// - ApiKey not empty
    /// - BaseUrl not empty
    /// - TimeoutSeconds > 0
    ///
    /// Throws InvalidOperationException if validation fails.
    /// </summary>
    /// <exception cref="InvalidOperationException">Nếu configuration invalid.</exception>
    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "LLM ApiKey is not configured. Set LLM:ApiKey in appsettings.json");
        }

        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            throw new InvalidOperationException(
                "LLM BaseUrl is not configured. Set LLM:BaseUrl in appsettings.json");
        }

        if (_options.TimeoutSeconds <= 0)
        {
            throw new InvalidOperationException(
                "LLM TimeoutSeconds must be greater than 0");
        }
    }

    /// <summary>
    /// Create OpenRouter Chat Completions API request payload.
    ///
    /// Transforms AIRequest to OpenRouter format:
    /// - model: từ AIRequest.Model (always set by PromptBuilder)
    /// - messages: [system prompt, user prompt]
    /// - temperature: từ AIRequest.Temperature
    /// - max_tokens: từ AIRequest.MaxTokens
    ///
    /// Note:
    /// - SystemPrompt → messages[0] role="system"
    /// - UserPrompt → messages[1] role="user"
    /// - All values always present in AIRequest (PromptBuilder fills them)
    /// </summary>
    /// <param name="request">AIRequest to transform.</param>
    /// <returns>Chat Completions request payload.</returns>
    private ChatCompletionRequest CreateRequestPayload(AIRequest request)
    {
        var messages = new List<ChatMessage>();

        // Add system message
        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            messages.Add(new ChatMessage
            {
                Role = "system",
                Content = request.SystemPrompt
            });
        }

        // Add user message
        if (!string.IsNullOrWhiteSpace(request.UserPrompt))
        {
            messages.Add(new ChatMessage
            {
                Role = "user",
                Content = request.UserPrompt
            });
        }

        // Có FallbackModels → gửi danh sách "models" để OpenRouter tự chuyển
        // model kế tiếp khi model chính lỗi hoặc bị rate-limit.
        // OpenRouter giới hạn tối đa 3 model trong danh sách.
        var primaryModel = request.Model ?? _options.Model;
        List<string>? modelChain = null;
        if (_options.FallbackModels.Count > 0)
        {
            modelChain = new List<string> { primaryModel };
            modelChain.AddRange(_options.FallbackModels.Where(m => m != primaryModel));
            modelChain = modelChain.Take(3).ToList();
        }

        return new ChatCompletionRequest
        {
            Model = primaryModel,
            Models = modelChain,
            Messages = messages,
            Temperature = request.Temperature,
            MaxTokens = request.MaxTokens
        };
    }

    /// <summary>
    /// Transform OpenRouter Chat Completions API response to AIResponse.
    ///
    /// Extracts:
    /// - Content: first choice message content
    /// - Usage: token counts (prompt, completion, total)
    /// - FinishReason: completion reason (stop, length, etc.)
    ///
    /// Mapping:
    /// - apiResponse.Choices[0].Message.Content → Content
    /// - apiResponse.Usage → AIUsage (prompt_tokens, completion_tokens, total_tokens)
    /// - apiResponse.Choices[0].FinishReason → FinishReason
    /// </summary>
    /// <param name="apiResponse">OpenRouter API response.</param>
    /// <returns>Transformed AIResponse.</returns>
    private AIResponse TransformToAIResponse(ChatCompletionResponse apiResponse)
    {
        var firstChoice = apiResponse.Choices?[0];
        var content = firstChoice?.Message?.Content ?? string.Empty;
        var finishReason = firstChoice?.FinishReason;

        var usage = apiResponse.Usage != null
            ? new AIUsage
            {
                PromptTokens = apiResponse.Usage.PromptTokens,
                CompletionTokens = apiResponse.Usage.CompletionTokens,
                TotalTokens = apiResponse.Usage.TotalTokens
            }
            : null;

        return new AIResponse
        {
            Content = content,
            Usage = usage,
            FinishReason = finishReason
        };
    }

    /// <summary>
    /// Chat Completions API Request format (OpenAI-compatible).
    /// </summary>
    private class ChatCompletionRequest
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        /// <summary>
        /// Danh sách model theo thứ tự ưu tiên (OpenRouter tự chuyển model kế tiếp
        /// khi model trước lỗi/rate-limit). Null thì chỉ dùng Model.
        /// </summary>
        [JsonPropertyName("models")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Models { get; set; }

        [JsonPropertyName("messages")]
        public List<ChatMessage>? Messages { get; set; }

        [JsonPropertyName("temperature")]
        public double? Temperature { get; set; }

        [JsonPropertyName("max_tokens")]
        public int? MaxTokens { get; set; }
    }

    /// <summary>
    /// Chat message format.
    /// </summary>
    private class ChatMessage
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    /// <summary>
    /// Chat Completions API Response format (OpenAI-compatible).
    /// </summary>
    private class ChatCompletionResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("choices")]
        public List<Choice>? Choices { get; set; }

        [JsonPropertyName("usage")]
        public Usage? Usage { get; set; }
    }

    /// <summary>
    /// Choice format in response.
    /// </summary>
    private class Choice
    {
        [JsonPropertyName("message")]
        public ChatMessage? Message { get; set; }

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
    }

    /// <summary>
    /// Usage statistics format.
    /// </summary>
    private class Usage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }
}
