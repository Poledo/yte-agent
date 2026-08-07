using System.Text.Json;
using AIValidation.Api.Models;

namespace AIValidation.Api.Middleware;

/// <summary>
/// Global Exception Middleware - Xử lý tất cả exceptions trên toàn hệ thống.
///
/// Vai trò (Role):
/// - Centralized exception handling cho toàn bộ API
/// - Bắt tất cả exceptions không được xử lý
/// - Chuyển exceptions thành consistent JSON responses
/// - Ghi log exceptions server-side
/// - Không expose internal details cho client
///
/// Trách nhiệm (Responsibilities):
/// 1. Intercept requests trong ASP.NET Core pipeline
/// 2. Bắt exceptions từ downstream middleware/handlers
/// 3. Map exceptions to HTTP status codes
/// 4. Tạo ErrorResponse object
/// 5. Ghi log với ILogger
/// 6. Trả HTTP response với JSON
/// 7. Set response status code
/// 8. Set Content-Type = application/json
///
/// Exception Mapping:
/// - ArgumentException → 400 Bad Request
/// - UnauthorizedAccessException → 401 Unauthorized
/// - KeyNotFoundException → 404 Not Found
/// - NotImplementedException → 501 Not Implemented
/// - Tất cả exceptions khác → 500 Internal Server Error
///
/// Security:
/// - Không include StackTrace trong response
/// - Không include Exception.Message (có thể leak info)
/// - Chỉ include safe generic messages
/// - TraceId để client report lỗi
/// - Server-side logging cho debugging
///
/// Benefits:
/// - Controllers không cần try/catch
/// - Services không cần try/catch
/// - Consistent error format cho tất cả APIs
/// - Simplified error handling code
/// - Centralized logging và monitoring
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    /// <summary>
    /// Khởi tạo GlobalExceptionMiddleware.
    ///
    /// Constructor Injection:
    /// - RequestDelegate: Delegate tới next middleware trong pipeline
    /// - ILogger: Structured logging
    ///
    /// Pattern: Middleware pattern trong ASP.NET Core
    /// - Signature: (RequestDelegate next, ILogger)
    /// - Invoke: (HttpContext context)
    /// </summary>
    /// <param name="next">Next middleware delegate.</param>
    /// <param name="logger">Logger instance.</param>
    /// <exception cref="ArgumentNullException">Nếu next hoặc logger null.</exception>
    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Xử lý HTTP request và bắt exceptions.
    ///
    /// Workflow:
    /// 1. Lấy original response.Body stream
    /// 2. Replace response.Body bằng MemoryStream
    ///    (Để capture response nếu cần)
    /// 3. Try gọi _next(context) - gọi next middleware
    /// 4. Nếu exception:
    ///    a. Ghi log exception với full details
    ///    b. Map exception to HTTP status code
    ///    c. Tạo ErrorResponse
    ///    d. Serialize to JSON
    ///    e. Trả về response body
    /// 5. Nếu không exception:
    ///    a. Response từ handler
    ///    b. Stream response bytes
    ///
    /// Exception Handling Strategy:
    /// - try: gọi next middleware
    /// - catch (Exception ex): handle bất kỳ exception nào
    /// - Log full stack trace server-side
    /// - Trả generic message tới client
    ///
    /// Note: Không nên catch vì middleware chạy trước các handler
    /// nên sẽ bắt tất cả exceptions từ controllers/services.
    /// </summary>
    /// <param name="context">HTTP context cho request.</param>
    /// <returns>Task representing async operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // Gọi next middleware trong pipeline
            // Nếu có exception từ downstream, sẽ bị caught bên dưới
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client chủ động HỦY request (vd bấm Cancel khi đang upload file).
            // Đây KHÔNG phải lỗi server: cancellationToken bị hủy làm SaveChangesAsync/
            // các thao tác I/O ném OperationCanceledException. Không log như lỗi, không
            // cố ghi response (kết nối đã đóng). Đặt 499 (Client Closed Request) nếu chưa
            // gửi gì để log/monitoring phản ánh đúng.
            _logger.LogInformation(
                "Client đã hủy yêu cầu. TraceId: {TraceId}", context.TraceIdentifier);

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 499;
            }
        }
        catch (BadHttpRequestException ex)
        {
            // Handle ASP.NET Core model binding errors
            _logger.LogWarning(
                "Bad HTTP request. TraceId: {TraceId}. Message: {Message}",
                context.TraceIdentifier,
                ex.Message);

            // Xử lý model binding errors
            await HandleBadRequestAsync(context, ex);
        }
        catch (Exception ex)
        {
            // Exception bị bắt từ downstream middleware/handlers
            // Ghi log full details server-side
            _logger.LogError(
                ex,
                "Unhandled exception occurred. TraceId: {TraceId}",
                context.TraceIdentifier);

            // Xử lý error response
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Handle BadHttpRequestException từ model binding validation.
    /// </summary>
    private static Task HandleBadRequestAsync(
        HttpContext context,
        BadHttpRequestException exception)
    {
        var errorResponse = new ErrorResponse
        {
            TraceId = context.TraceIdentifier,
            Timestamp = DateTime.UtcNow,
            StatusCode = StatusCodes.Status400BadRequest,
            Error = "BadRequest",
            Message = "The request is invalid. Please check your input.",
            ValidationErrors = null,
            Metadata = null
        };

        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/json";

        var json = JsonSerializer.Serialize(
            errorResponse,
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

        return context.Response.WriteAsync(json);
    }

    /// <summary>
    /// Handle exception và trả JSON error response.
    ///
    /// Process:
    /// 1. Map exception to HTTP status code
    /// 2. Tạo ErrorResponse object
    /// 3. Serialize to JSON
    /// 4. Set Response properties:
    ///    - StatusCode
    ///    - Content-Type: application/json
    /// 5. Write response body
    ///
    /// Exception Mapping Details:
    /// - ArgumentException: 400 Bad Request
    ///   - Lý do: Client sent invalid data
    ///   - Message: Generic "The request is invalid."
    ///
    /// - UnauthorizedAccessException: 401 Unauthorized
    ///   - Lý do: Authentication/Authorization failed
    ///   - Message: "Unauthorized access."
    ///
    /// - KeyNotFoundException: 404 Not Found
    ///   - Lý do: Resource not found
    ///   - Message: "The resource was not found."
    ///
    /// - NotImplementedException: 501 Not Implemented
    ///   - Lý do: Feature not yet implemented
    ///   - Message: "This feature is not yet implemented."
    ///   - Note: Chỉ cho development/testing
    ///
    /// - Tất cả exceptions khác: 500 Internal Server Error
    ///   - Lý do: Unexpected error
    ///   - Message: "An unexpected error occurred."
    ///   - KHÔNG include ex.Message (too specific)
    ///
    /// Serialization:
    /// - System.Text.Json
    /// - Default settings (camelCase)
    /// - ErrorResponse as required
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <param name="exception">Exception được bắt.</param>
    /// <returns>Task representing async operation.</returns>
    private static Task HandleExceptionAsync(
        HttpContext context,
        Exception exception)
    {
        // Map exception to status code and error type
        var (statusCode, error, message) = MapExceptionToResponse(exception);

        // Tạo ErrorResponse object
        var errorResponse = new ErrorResponse
        {
            TraceId = context.TraceIdentifier,
            Timestamp = DateTime.UtcNow,
            StatusCode = statusCode,
            Error = error,
            Message = message,
            ValidationErrors = null,
            Metadata = null
        };

        // Set response properties
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        // Serialize ErrorResponse to JSON
        var json = JsonSerializer.Serialize(
            errorResponse,
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

        // Write response body
        return context.Response.WriteAsync(json);
    }

    /// <summary>
    /// Map exception type to HTTP status code, error type, and message.
    ///
    /// Returns tuple: (StatusCode, Error, Message)
    ///
    /// Mapping Rules:
    /// 1. ArgumentException
    ///    - StatusCode: 400
    ///    - Error: "BadRequest"
    ///    - Message: "The request is invalid."
    ///    - Lý do: Client sent invalid arguments
    ///
    /// 2. UnauthorizedAccessException
    ///    - StatusCode: 401
    ///    - Error: "Unauthorized"
    ///    - Message: "Unauthorized access."
    ///    - Lý do: Authentication/Authorization issue
    ///
    /// 3. KeyNotFoundException
    ///    - StatusCode: 404
    ///    - Error: "NotFound"
    ///    - Message: "The resource was not found."
    ///    - Lý do: Resource doesn't exist
    ///
    /// 4. NotImplementedException
    ///    - StatusCode: 501
    ///    - Error: "NotImplemented"
    ///    - Message: "This feature is not yet implemented."
    ///    - Lý do: Feature under development
    ///
    /// 5. Exception (catch-all)
    ///    - StatusCode: 500
    ///    - Error: "InternalServerError"
    ///    - Message: "An unexpected error occurred."
    ///    - Lý do: Unexpected error (don't expose details)
    /// </summary>
    /// <param name="exception">Exception to map.</param>
    /// <returns>Tuple of (statusCode, error, message).</returns>
    private static (int StatusCode, string Error, string Message) MapExceptionToResponse(
        Exception exception)
    {
        return exception switch
        {
            ArgumentException => (
                StatusCodes.Status400BadRequest,
                "BadRequest",
                "The request is invalid."),

            UnauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "Unauthorized access."),

            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "NotFound",
                "The resource was not found."),

            NotImplementedException => (
                StatusCodes.Status501NotImplemented,
                "NotImplemented",
                "This feature is not yet implemented."),

            _ => (
                StatusCodes.Status500InternalServerError,
                "InternalServerError",
                "An unexpected error occurred.")
        };
    }
}
