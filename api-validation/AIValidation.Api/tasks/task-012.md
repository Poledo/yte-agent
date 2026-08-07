Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-012

Mục tiêu:

Xây dựng Global Exception Handling cho toàn bộ AI Validation API.

Tất cả Exception chưa được xử lý phải được bắt tại Middleware.

Controller và Service không cần try/catch toàn cục.

==================================================

Tạo thư mục:

Middleware/

==================================================

Tạo:

GlobalExceptionMiddleware

Middleware chịu trách nhiệm:

- Bắt tất cả Exception.
- Ghi log bằng ILogger.
- Trả về JSON thống nhất.
- Không để lộ StackTrace.
- Không trả Message nội bộ cho Client.

==================================================

Tạo model:

ErrorResponse

Bao gồm:

- string TraceId
- DateTime Timestamp
- int StatusCode
- string Error
- string Message

Thiết kế để sau này có thể mở rộng thêm:

- Details
- ValidationErrors
- Metadata

==================================================

JSON Response chuẩn:

{
  "traceId": "00-5d9b8c3c5c5d0f...",
  "timestamp": "2026-07-13T10:35:22Z",
  "statusCode": 500,
  "error": "InternalServerError",
  "message": "An unexpected error occurred."
}

==================================================

Middleware xử lý tối thiểu:

ArgumentException

↓

400 BadRequest

Error:

BadRequest

--------------------------------------------------

UnauthorizedAccessException

↓

401 Unauthorized

Error:

Unauthorized

--------------------------------------------------

KeyNotFoundException

↓

404 NotFound

Error:

NotFound

--------------------------------------------------

NotImplementedException

↓

501 NotImplemented

Error:

NotImplemented

--------------------------------------------------

Các Exception khác

↓

500 InternalServerError

Error:

InternalServerError

Không trả Exception.Message trực tiếp cho Client.

==================================================

Middleware phải:

- Lấy TraceId từ HttpContext.TraceIdentifier.
- Timestamp sử dụng UTC.
- Serialize bằng System.Text.Json.
- Response Content-Type:

application/json

==================================================

Đăng ký Middleware trong Program.cs.

Middleware phải chạy trước:

MapControllers();

==================================================

Yêu cầu coding

- Constructor Injection.
- ILogger<GlobalExceptionMiddleware>.
- Async/Await.
- Nullable Reference Types.
- XML Summary đầy đủ.
- Không thêm business logic.
- Không log dữ liệu nhạy cảm.
- Không trả StackTrace cho Client.

==================================================

Sau khi hoàn thành:

1. Giải thích vai trò của GlobalExceptionMiddleware.

2. Giải thích vì sao sử dụng TraceId.

3. Giải thích vì sao không trả Exception.Message trực tiếp.

4. Giải thích luồng xử lý Exception từ Controller đến Middleware.

5. Chờ yêu cầu tiếp theo.