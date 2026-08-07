Đọc toàn bộ tài liệu trong thư mục docs trước khi thực hiện.

Đọc toàn bộ Models và Interfaces đã tạo ở Task-001 và Task-002.

------------------------------------------------

Task-003

Mục tiêu:

Tạo skeleton implementation cho toàn bộ pipeline Validation.

Chỉ tạo class.

Không viết business logic.

Không gọi AI.

Không đọc file.

Không truy cập Database.

Không parse dữ liệu.

Không thêm TODO giả lập nghiệp vụ.

------------------------------------------------

Tạo các class sau:

Services/

- ValidationService

Providers/

- KnowledgeProvider
- PromptBuilder
- LLMProvider
- ResponseParser

------------------------------------------------

Yêu cầu:

ValidationService

- Implement IValidationService
- Constructor Injection tất cả dependency
- Chỉ throw NotImplementedException trong method.

------------------------------------------------

KnowledgeProvider

- Implement IKnowledgeProvider
- Chỉ throw NotImplementedException.

------------------------------------------------

PromptBuilder

- Implement IPromptBuilder
- Chỉ throw NotImplementedException.

------------------------------------------------

LLMProvider

- Implement ILLMProvider
- Chỉ throw NotImplementedException.

------------------------------------------------

ResponseParser

- Implement IResponseParser
- Chỉ throw NotImplementedException.

------------------------------------------------

Đăng ký Dependency Injection trong Program.cs.

Sử dụng AddScoped cho toàn bộ Service và Provider.

------------------------------------------------

Yêu cầu coding:

- XML Summary đầy đủ.
- Constructor Injection.
- Không thêm business logic.
- Không thêm logging.
- Không thêm configuration.
- Không tạo Controller.
- Không tạo endpoint.
- Không tạo Prompt.
- Không tạo file JSON.

------------------------------------------------

Sau khi hoàn thành:

1. Giải thích vai trò từng class.

2. Giải thích Dependency Injection đã đăng ký.

3. Chờ yêu cầu tiếp theo.