using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Models;
using AIValidation.Api.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API Controller cho Validation Service.
///
/// Vai trò (Role):
/// - Entry point cho HTTP requests từ Chrome Extension
/// - Validate incoming HTTP request model
/// - Điều phối tới IValidationService
/// - Format và trả HTTP response
///
/// Trách nhiệm (Responsibilities):
/// 1. Nhận HTTP POST request với ValidationRequest body
/// 2. Validate request model constraints ([Required], types, etc.)
/// 3. Return BadRequest nếu validation fail
/// 4. Gọi IValidationService.ValidateAsync()
/// 5. Return Ok(result) với ValidationResponse
/// 6. Không xử lý exceptions (delegate tới middleware)
///
/// Giới hạn (Constraints):
/// - KHÔNG chứa business logic
/// - KHÔNG gọi AI trực tiếp
/// - KHÔNG đọc Prompt files
/// - KHÔNG đọc Knowledge data
/// - KHÔNG thao tác Response JSON
///
/// RESTful Design:
/// - POST /api/validation: Create validation request
/// - 200 OK: Success
/// - 400 Bad Request: Invalid input
/// - 500 Internal Server Error: Server error (via middleware)
/// - 503 Service Unavailable: Service error (via middleware)
/// </summary>
//[ApiController]
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên endpoint này dùng policy "Extension" (mở origin). Các endpoint quản
// trị vẫn giữ policy mặc định chỉ cho origin của web-admin.
[EnableCors("Extension")]
[Route("api/[controller]")]
public class ValidationController : ControllerBase
{
    private readonly IValidationService _validationService;
    private readonly ILogger<ValidationController> _logger;

    /// <summary>
    /// Khởi tạo ValidationController.
    ///
    /// Constructor Injection:
    /// - IValidationService: Orchestrator cho validation workflow
    /// - ILogger: Logging framework integration
    ///
    /// Tất cả dependencies được inject bởi DI container.
    /// </summary>
    /// <param name="validationService">Service xác thực dữ liệu.</param>
    /// <param name="logger">Logger cho ValidationController.</param>
    /// <exception cref="ArgumentNullException">Nếu bất kỳ dependency nào null.</exception>
    public ValidationController(
        IValidationService validationService,
        ILogger<ValidationController> logger)
    {
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Validate dữ liệu từ Chrome Extension.
    ///
    /// HTTP Endpoint:
    /// - Method: POST
    /// - Route: /api/validation
    /// - Content-Type: application/json
    ///
    /// Request Body:
    /// - ValidationRequest JSON object
    /// - Fields: Page, Trigger, Context, Form
    /// - All fields: Required
    ///
    /// Response:
    /// - 200 OK: ValidationResponse with validation issues
    /// - 400 Bad Request: Invalid request model (e.g., null, missing fields)
    /// - 500 Internal Server Error: Service error (caught by middleware)
    /// - 503 Service Unavailable: Dependency error (caught by middleware)
    ///
    /// Workflow:
    /// 1. Nhận ValidationRequest từ HTTP body
    /// 2. Model validation được ASP.NET Core xử lý via [ApiController]
    /// 3. Nếu model validation fail → Auto return 400 Bad Request
    /// 4. Kiểm tra request null (defensive programming)
    /// 5. Gọi _validationService.ValidateAsync(request, cancellationToken)
    /// 6. Nhận ValidationResponse
    /// 7. Return Ok(response) → 200 OK with JSON body
    /// 8. Nếu exception: gửi tới middleware để xử lý
    ///
    /// Note:
    /// - Không try/catch toàn bộ method (exception handling ở middleware)
    /// - Không chứa business logic (tất cả ở ValidationService)
    /// - Không gọi AI, Knowledge, hay Prompt (chỉ gọi IValidationService)
    /// </summary>
    /// <param name="request">
    /// Yêu cầu xác thực từ Chrome Extension.
    /// Properties:
    /// - Page: URL/page identifier
    /// - Trigger: Action trigger (form submit, etc.)
    /// - Context: Context information
    /// - Form: Form data as JsonElement
    /// </param>
    /// <param name="cancellationToken">Token hủy async operation.</param>
    /// <returns>
    /// ActionResult&lt;ValidationResponse&gt;:
    /// - 200 OK: ValidationResponse with Issues list
    /// - 400 Bad Request: Invalid request
    /// - Wrapped by middleware for error handling
    /// </returns>
    /// <exception cref="ArgumentNullException">Nếu request null (defensive check).</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy (propagated tới middleware).</exception>
    /// <exception cref="InvalidOperationException">Nếu validation workflow fail (propagated tới middleware).</exception>
    [IgnorePermission("Extension gọi bằng khóa bản quyền, không có phiên đăng nhập")]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ValidationResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ValidationResponse>> ValidateAsync(
        [FromBody] ValidationRequest request,
        CancellationToken cancellationToken)
    {
        // Pattern: Defensive programming
        // The [ApiController] attribute handles model validation automatically
        // But we add explicit null check for safety (request body might be null in edge cases)
        if (request == null)
        {
            _logger.LogWarning("ValidationRequest is null");
            return BadRequest(new { message = "ValidationRequest cannot be null" });
        }

        // Log incoming request
        _logger.LogInformation(
            "Validation endpoint called: Page={Page}, Trigger={Trigger}",
            request.Page,
            request.Trigger);

        // Step 1: Validate model constraints
        // [ApiController] automatically validates:
        // - Required fields (ValidationRequest.Page, etc.)
        // - Type constraints
        // - Range constraints (if any)
        // - Custom validations (if any)
        // If validation fails, ModelState.IsValid is false
        // and [ApiController] auto-returns 400 BadRequest
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("ModelState validation failed");
            return BadRequest(ModelState);
        }

        // Step 2: Call IValidationService
        // Orchestrate validation workflow
        // Service handles:
        // - Knowledge retrieval
        // - Prompt building
        // - LLM invocation
        // - Response processing
        _logger.LogInformation("Calling IValidationService.ValidateAsync...");
        var result = await _validationService.ValidateAsync(request, cancellationToken);

        // Step 3: Return 200 OK with ValidationResponse
        // Response body contains ValidationResponse object
        // Issues list is populated by service
        _logger.LogInformation(
            "Validation completed: {IssueCount} issues found",
            result?.Issues?.Count ?? 0);

        return Ok(result);
    }
}
