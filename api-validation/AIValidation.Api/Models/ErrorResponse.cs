namespace AIValidation.Api.Models;

/// <summary>
/// Error Response DTO - Standardized error response format.
///
/// Mục đích:
/// - Trả về lỗi một cách nhất quán cho tất cả exceptions
/// - Giúp client xác định loại lỗi và xử lý phù hợp
/// - Trace request thông qua TraceId
/// - Không expose internal implementation details
/// - Hỗ trợ validation errors và metadata debugging
///
/// Thiết kế mở rộng:
/// - ValidationErrors: Để trả về lỗi validation từ input
/// - Metadata: Để debugging hoặc thêm thông tin ngữ cảnh
/// - Sealed record: Immutable, performant, hash-based equality
///
/// Security Principles:
/// - Không include StackTrace (expose internal details)
/// - Không include Exception.Message (expose system errors)
/// - Chỉ include public error information
/// - TraceId để tracking server-side logs
/// </summary>
public sealed record ErrorResponse
{
    /// <summary>
    /// Unique trace identifier cho request này.
    ///
    /// Lợi ích:
    /// - Client có thể report lỗi này kèm TraceId
    /// - Server-side logs sẽ có TraceId tương ứng
    /// - Dễ debug bằng cách correlate logs
    /// - Hỗ trợ distributed tracing
    ///
    /// Format: W3C Trace Context standard
    /// Example: "00-5d9b8c3c5c5d0f0d0e0f0d0f0d0f0d0f-0d0e0f0d0e0f0d0e-01"
    ///
    /// Lấy từ: HttpContext.TraceIdentifier
    /// </summary>
    public required string TraceId { get; init; }

    /// <summary>
    /// Server-side timestamp khi error xảy ra.
    ///
    /// Lợi ích:
    /// - Correlate với server logs
    /// - Debugging thời gian event
    /// - Audit trail
    ///
    /// Format: ISO 8601
    /// Timezone: UTC (Z suffix)
    /// Example: "2026-07-13T10:35:22Z"
    ///
    /// Lấy từ: DateTime.UtcNow
    /// </summary>
    public required DateTime Timestamp { get; init; }

    /// <summary>
    /// HTTP status code.
    ///
    /// Giá trị:
    /// - 400: Bad Request (ArgumentException)
    /// - 401: Unauthorized (UnauthorizedAccessException)
    /// - 404: Not Found (KeyNotFoundException)
    /// - 500: Internal Server Error (other exceptions)
    /// - 501: Not Implemented (NotImplementedException)
    ///
    /// Lấy từ: HTTP status code
    /// Dùng cho: Client-side error handling
    /// </summary>
    public required int StatusCode { get; init; }

    /// <summary>
    /// Error type name - Consistent with HTTP semantics.
    ///
    /// Giá trị:
    /// - "BadRequest": Request invalid
    /// - "Unauthorized": Authentication failed
    /// - "NotFound": Resource not found
    /// - "NotImplemented": Feature not implemented
    /// - "InternalServerError": Server error
    ///
    /// Lợi ích:
    /// - Client can match error type
    /// - Not tied to specific languages
    /// - Consistent naming
    ///
    /// Lấy từ: Exception type mapping
    /// </summary>
    public required string Error { get; init; }

    /// <summary>
    /// User-friendly error message.
    ///
    /// Design:
    /// - Generic message, not specific exception details
    /// - For production: safe generic message
    /// - For development: might be more specific
    /// - Never include: StackTrace, file paths, secrets
    ///
    /// Giá trị:
    /// - "An unexpected error occurred." (for 500 errors)
    /// - "The request is invalid." (for 400 errors)
    /// - Có thể specific nếu an toàn
    ///
    /// Lấy từ: Mapped message based on exception type
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Validation errors for individual fields.
    ///
    /// Mục đích:
    /// - Trả về validation errors từ input validation
    /// - Key: Field name
    /// - Value: Array of error messages
    ///
    /// Format:
    /// {
    ///   "page": ["Page is required"],
    ///   "form": ["Form data is invalid"]
    /// }
    ///
    /// Nullable: true (null nếu không có validation errors)
    /// </summary>
    public IDictionary<string, string[]>? ValidationErrors { get; init; }

    /// <summary>
    /// Metadata cho debugging hoặc thông tin ngữ cảnh bổ sung.
    ///
    /// Mục đích:
    /// - Flexibility để thêm thông tin ngữ cảnh
    /// - Debugging trong development environment
    /// - Flexible data structure
    ///
    /// Format:
    /// {
    ///   "requestPath": "/api/validation",
    ///   "requestMethod": "POST",
    ///   "environment": "Development"
    /// }
    ///
    /// Nullable: true (null nếu không có metadata)
    /// </summary>
    public IDictionary<string, object?>? Metadata { get; init; }
}
