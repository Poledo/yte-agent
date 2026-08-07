using AIValidation.Api.Exceptions;
using AIValidation.Api.Models;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// Processor chuyển đổi AIResponse từ AI Provider thành ValidationResponse.
///
/// Chịu trách nhiệm:
/// - Làm sạch phản hồi từ AI
/// - Trích xuất JSON hợp lệ từ response.Content
/// - Deserialize thành ValidationResponse object
/// - Validate cấu trúc dữ liệu
/// - Xử lý lỗi nếu response không hợp lệ
///
/// Processor hoạt động độc lập, không gọi AI hay services khác.
///
/// Kiến trúc xử lý:
/// Hai layer separation:
/// 1. IJsonExtractor: Làm sạch và trích xuất JSON từ text
/// 2. IJsonDeserializer: Deserialize JSON thành ValidationResponse
///
/// Không deserialize trực tiếp:
/// - Giữ separation of concerns
/// - Easy to unit test mỗi layer riêng biệt
/// - Easy to swap implementations
/// - Easy to handle errors at each step
/// </summary>
public class ResponseProcessor : IResponseProcessor
{
    private readonly IJsonExtractor _jsonExtractor;
    private readonly IJsonDeserializer _jsonDeserializer;
    private readonly ILogger<ResponseProcessor> _logger;

    /// <summary>
    /// Khởi tạo ResponseProcessor.
    ///
    /// Constructor Injection:
    /// - IJsonExtractor: Trích xuất JSON từ AI response
    /// - IJsonDeserializer: Deserialize JSON thành ValidationResponse
    /// - ILogger: Logging framework integration
    ///
    /// Lý do không deserialize trực tiếp:
    /// - Separation of concerns: JSON extraction khác json parsing
    /// - Single Responsibility: Mỗi class có 1 trách nhiệm
    /// - Testability: Easy to mock and test mỗi layer
    /// - Flexibility: Có thể swap implementations
    /// - Error Handling: Có thể xác định lỗi ở layer nào
    /// </summary>
    /// <param name="jsonExtractor">Extractor trích xuất JSON từ response text.</param>
    /// <param name="jsonDeserializer">Deserializer chuyển JSON thành ValidationResponse.</param>
    /// <param name="logger">Logger cho ResponseProcessor.</param>
    /// <exception cref="ArgumentNullException">Nếu bất kỳ dependency nào null.</exception>
    public ResponseProcessor(
        IJsonExtractor jsonExtractor,
        IJsonDeserializer jsonDeserializer,
        ILogger<ResponseProcessor> logger)
    {
        _jsonExtractor = jsonExtractor ?? throw new ArgumentNullException(nameof(jsonExtractor));
        _jsonDeserializer = jsonDeserializer ?? throw new ArgumentNullException(nameof(jsonDeserializer));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Process AIResponse từ LLMProvider thành ValidationResponse asynchronously.
    ///
    /// Workflow:
    /// 1. Nhận AIResponse từ LLMProvider (response.Content = AI-generated text)
    /// 2. Sử dụng IJsonExtractor để trích xuất JSON string:
    ///    - Loại bỏ khoảng trắng
    ///    - Loại bỏ Markdown code block
    ///    - Trích xuất JSON object hợp lệ
    /// 3. Sử dụng IJsonDeserializer để deserialize thành ValidationResponse:
    ///    - Parse JSON string
    ///    - Validate cấu trúc dữ liệu
    ///    - Validate enum values
    /// 4. Validate các trường bắt buộc:
    ///    - IsValid khác null
    ///    - Issues khác null
    ///    - Summary khác null
    /// 5. Log finish_reason, token usage, và processing time
    /// 6. Trả về ValidationResponse ready cho Extension
    ///
    /// Xử lý lỗi:
    /// - Nếu JSON extraction thất bại: ResponseProcessingException từ IJsonExtractor
    /// - Nếu JSON deserialization thất bại: ResponseProcessingException từ IJsonDeserializer
    /// - Nếu validation thất bại: ResponseProcessingException
    /// - JsonException được wrap thành ResponseProcessingException
    ///
    /// Logging:
    /// - Log finish_reason (length, stop, tool_use, etc.)
    /// - Log token usage (prompt, completion, total)
    /// - Log processing duration
    /// - KHÔNG log: API Key, full prompt, sensitive patient data
    /// </summary>
    /// <param name="response">AIResponse từ LLMProvider.</param>
    /// <param name="cancellationToken">Token để hủy operation.</param>
    /// <returns>ValidationResponse đã process, ready để trả về cho Extension.</returns>
    /// <exception cref="ArgumentNullException">Nếu response null.</exception>
    /// <exception cref="ResponseProcessingException">Nếu response không hợp lệ hoặc không thể process.</exception>
    public async Task<ValidationResponse> ProcessAsync(
        AIResponse response,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(response);

        var startTime = DateTime.UtcNow;

        try
        {
            _logger.LogInformation(
                "Processing AIResponse: FinishReason={FinishReason}",
                response.FinishReason);

            cancellationToken.ThrowIfCancellationRequested();

            // Step 1: Extract JSON from AIResponse.Content
            string jsonString;
            try
            {
                jsonString = _jsonExtractor.Extract(response.Content);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to extract JSON from AI response. FinishReason={FinishReason}",
                    response.FinishReason);

                throw new ResponseProcessingException(
                    $"Failed to extract JSON from AI response: {ex.Message}",
                    ex);
            }

            cancellationToken.ThrowIfCancellationRequested();

            // Step 2: Deserialize JSON to ValidationResponse
            ValidationResponse validationResponse;
            try
            {
                validationResponse = _jsonDeserializer.Deserialize(jsonString);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to deserialize JSON to ValidationResponse. FinishReason={FinishReason}",
                    response.FinishReason);

                throw new ResponseProcessingException(
                    $"Failed to deserialize JSON to ValidationResponse: {ex.Message}",
                    ex);
            }

            cancellationToken.ThrowIfCancellationRequested();

            // Step 3: Validate required fields
            ValidateValidationResponse(validationResponse);

            // Step 4: Log token usage and processing time
            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "AIResponse processed successfully: Issues={IssueCount}, PromptTokens={PromptTokens}, CompletionTokens={CompletionTokens}, Duration={DurationMs}ms",
                validationResponse.Issues?.Count ?? 0,
                response.Usage?.PromptTokens ?? 0,
                response.Usage?.CompletionTokens ?? 0,
                duration.TotalMilliseconds);

            // Return ValidationResponse
            return await Task.FromResult(validationResponse);
        }
        catch (ResponseProcessingException)
        {
            throw; // Re-throw domain exception as-is
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Response processing was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            _logger.LogError(
                ex,
                "Unexpected error processing AIResponse after {DurationMs}ms. FinishReason={FinishReason}",
                duration.TotalMilliseconds,
                response.FinishReason);

            throw new ResponseProcessingException(
                $"Unexpected error during response processing: {ex.Message}",
                ex);
        }
    }

    /// <summary>
    /// Validate ValidationResponse has required fields.
    ///
    /// Validation Rules:
    /// - IsValid must not be null
    /// - Issues must not be null
    /// - Summary must not be null
    ///
    /// Throws ResponseProcessingException if validation fails.
    /// </summary>
    /// <param name="response">ValidationResponse to validate.</param>
    /// <exception cref="ResponseProcessingException">If validation fails.</exception>
    private void ValidateValidationResponse(ValidationResponse response)
    {
        if (response.IsValid == null)
        {
            _logger.LogError("ValidationResponse.IsValid is null");
            throw new ResponseProcessingException("ValidationResponse.IsValid cannot be null");
        }

        if (response.Issues == null)
        {
            _logger.LogError("ValidationResponse.Issues is null");
            throw new ResponseProcessingException("ValidationResponse.Issues cannot be null");
        }

        if (response.Summary == null)
        {
            _logger.LogError("ValidationResponse.Summary is null");
            throw new ResponseProcessingException("ValidationResponse.Summary cannot be null");
        }
    }
}
