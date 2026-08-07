using AIValidation.Api.Models;
using AIValidation.Api.Providers.Interfaces;
using AIValidation.Api.Services.Interfaces;

namespace AIValidation.Api.Services;

/// <summary>
/// Service xác thực dữ liệu chính, orchestrating toàn bộ validation workflow.
///
/// Role (Vai trò):
/// - Điều phối RuleEngine để thực hiện xác thực
/// - Quản lý flow từ ValidationRequest -> ValidationContext -> ValidationResponse
/// - Serves as the main entry point for validation operations
/// - Delegates actual validation logic to RuleEngine and registered rules
///
/// Chịu trách nhiệm:
/// 1. Nhận ValidationRequest từ Controller
/// 2. Extract ValidationContext từ ValidationRequest
/// 3. Gọi IRuleEngine để thực hiện validation rules
/// 4. Trả về ValidationResponse cho Controller
///
/// Logging:
/// - Log mỗi bước của workflow
/// - Log lỗi và exceptions
/// - Track tracing thông qua request
///
/// SOLID Principles:
/// - Single Responsibility: Orchestrates request to response flow only
/// - Open/Closed: Rule implementations can be added via DI without changes
/// - Liskov Substitution: Can be replaced with other IValidationService implementations
/// - Dependency Inversion: Depends on IRuleEngine abstraction
/// </summary>
public class ValidationService : IValidationService
{
    private readonly IRuleEngine _ruleEngine;
    private readonly ILogger<ValidationService> _logger;

    /// <summary>
    /// Khởi tạo ValidationService với RuleEngine dependency.
    ///
    /// Constructor Injection pattern:
    /// - IRuleEngine: Plugin cho rule execution orchestration
    /// - ILogger: Logging framework integration
    /// </summary>
    /// <param name="ruleEngine">Rule engine for executing validation rules.</param>
    /// <param name="logger">Logger cho ValidationService.</param>
    /// <exception cref="ArgumentNullException">Nếu bất kỳ dependency nào null.</exception>
    public ValidationService(
        IRuleEngine ruleEngine,
        ILogger<ValidationService> logger)
    {
        _ruleEngine = ruleEngine ?? throw new ArgumentNullException(nameof(ruleEngine));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Thực hiện xác thực dữ liệu từ Chrome Extension.
    ///
    /// Workflow (Luồng xử lý):
    /// 
    /// Step 1: Nhận ValidationRequest
    /// - Yêu cầu từ Chrome Extension
    /// - Chứa Page, Trigger, Context, Form data
    /// - Log "Validation requested"
    ///
    /// Step 2: Extract ValidationContext từ ValidationRequest
    /// - ValidationRequest chứa sẵn ValidationContext
    /// - Kết hợp với Page và Trigger là dữ liệu cần thiết cho Rules
    /// - Log "ValidationContext prepared"
    ///
    /// Step 3: Gọi IRuleEngine để thực hiện validation rules
    /// - Gọi ruleEngine.ExecuteAsync(context, cancellationToken)
    /// - Nhận ValidationResponse từ RuleEngine
    /// - Log "Validation completed with {count} issues"
    ///
    /// Return ValidationResponse
    /// - Return cho Controller
    /// - Controller trả về Chrome Extension
    ///
    /// Error Handling:
    /// - Catch exceptions từ RuleEngine
    /// - Log error với context
    /// - Rethrow hoặc return error response
    /// </summary>
    /// <param name="request">Yêu cầu xác thực từ Extension.</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Phản hồi xác thực chứa danh sách vấn đề phát hiện.</returns>
    /// <exception cref="ArgumentNullException">Nếu request null.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    /// <exception cref="InvalidOperationException">Nếu validation workflow không thể hoàn thành.</exception>
    public async Task<ValidationResponse> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        try
        {
            // Step 1: Nhận ValidationRequest
            _logger.LogInformation(
                "Validation requested for Page={Page}, Trigger={Trigger}",
                request.Page,
                request.Trigger.Field);

            // Step 2: Pass request directly to RuleEngine
            // RuleEngine will use all data from request (page, trigger, context, form)
            _logger.LogInformation("Passing request to RuleEngine...");

            // Step 3: Gọi IRuleEngine để thực hiện validation rules
            _logger.LogInformation("Executing validation rules via RuleEngine...");
            var validationResponse = await _ruleEngine.ExecuteAsync(request, cancellationToken);

            _logger.LogInformation(
                "Validation completed: IsValid={IsValid}, IssueCount={IssueCount}",
                validationResponse.IsValid,
                validationResponse.Issues?.Count ?? 0);

            return validationResponse;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "Validation operation was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during validation workflow");
            throw new InvalidOperationException(
                "Validation failed due to internal error",
                ex);
        }
    }
}
