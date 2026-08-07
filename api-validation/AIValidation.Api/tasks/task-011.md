Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces, Services, Providers và Configuration đã được tạo ở các Task trước.

==================================================

Task-011

Mục tiêu:

Hoàn thiện tầng API cho Validation Service.

Controller chỉ chịu trách nhiệm:

- Nhận HTTP Request.
- Validate Model cơ bản.
- Gọi IValidationService.
- Trả HTTP Response.

Controller không chứa business logic.

Controller không gọi AI trực tiếp.

==================================================

Tạo:

Controllers/

ValidationController

==================================================

Tạo endpoint:

POST /api/validation

Nhận:

ValidationRequest

Trả:

ValidationResponse

==================================================

Yêu cầu:

- Sử dụng [ApiController].
- Sử dụng Route attribute.
- Constructor Injection.
- Inject:
    - IValidationService
    - ILogger<ValidationController>

==================================================

Method:

ValidateAsync(
    ValidationRequest request,
    CancellationToken cancellationToken)

==================================================

Controller phải:

- Kiểm tra request null.
- Trả BadRequest nếu request không hợp lệ.
- Gọi ValidationService.
- Trả Ok(result).
- Không try/catch toàn bộ method (để middleware xử lý exception sau này).
- Không thêm business logic.
- Không thao tác Prompt.
- Không thao tác Knowledge.
- Không thao tác AI.

==================================================

Nếu project chưa có:

Thêm:

- AddControllers()
- MapControllers()

Trong Program.cs.

==================================================

Thêm XML Summary đầy đủ.

Namespace rõ ràng.

Tuân thủ RESTful API.

==================================================

Sau khi hoàn thành:

1. Giải thích vai trò của ValidationController.

2. Giải thích vì sao Controller không nên chứa business logic.

3. Giải thích luồng xử lý từ HTTP Request đến ValidationService.

4. Chờ yêu cầu tiếp theo.