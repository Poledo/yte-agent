Đọc toàn bộ tài liệu trong thư mục docs trước khi thực hiện bất kỳ thay đổi nào.

Bao gồm:

- PROJECT.md
- ARCHITECTURE.md
- RULES.md
- DECISIONS.md

Đọc thêm toàn bộ Models đã được tạo ở Task-001.

------------------------------------------------

Task-002

Mục tiêu:

Thiết kế toàn bộ Interfaces của AI Validation API.

Chỉ tạo Interface.

Không tạo implementation.

Không tạo Controller.

Không tạo Provider implementation.

Không tạo business logic.

------------------------------------------------

Tạo cấu trúc thư mục:

Services/
    Interfaces/

Providers/
    Interfaces/

------------------------------------------------

Tạo các Interface sau.

1.

IValidationService

Chịu trách nhiệm điều phối toàn bộ quá trình Validation.

Bao gồm:

Task<ValidationResponse> ValidateAsync(
    ValidationRequest request,
    CancellationToken cancellationToken = default);

------------------------------------------------

2.

IKnowledgeProvider

Chịu trách nhiệm cung cấp dữ liệu tham chiếu phục vụ AI.

Ví dụ:

- ICD
- DVKT
- Thuốc
- BHYT

Không quy định nguồn dữ liệu.

Có thể là:

- JSON
- Database
- API
- Vector Database

Bao gồm:

Task<string> GetKnowledgeAsync(
    ValidationRequest request,
    CancellationToken cancellationToken = default);

------------------------------------------------

3.

IPromptBuilder

Chịu trách nhiệm tạo Prompt gửi tới AI.

Bao gồm:

Task<string> BuildPromptAsync(
    ValidationRequest request,
    string knowledge,
    CancellationToken cancellationToken = default);

PromptBuilder không gọi AI.

------------------------------------------------

4.

ILLMProvider

Chịu trách nhiệm giao tiếp với AI Provider.

Có thể triển khai:

- OpenAI
- Azure OpenAI
- Gemini
- GLM
- Qwen
- Ollama
- Local Model

Bao gồm:

Task<string> GenerateAsync(
    string prompt,
    CancellationToken cancellationToken = default);

Provider chỉ trả về raw response.

Không parse JSON.

------------------------------------------------

5.

IResponseParser

Chịu trách nhiệm parse kết quả AI.

Bao gồm:

ValidationResponse Parse(
    string response);

Parser chuyển raw response thành ValidationResponse.

------------------------------------------------

Yêu cầu coding:

- Interface phải có XML Summary.
- Không tạo implementation.
- Không viết business logic.
- Không thêm code ngoài phạm vi yêu cầu.
- Namespace rõ ràng.
- Tuân thủ SOLID.

------------------------------------------------

Sau khi hoàn thành:

1. Giải thích trách nhiệm của từng Interface.

2. Giải thích mối quan hệ giữa:

Controller

↓

ValidationService

↓

KnowledgeProvider

↓

PromptBuilder

↓

LLMProvider

↓

ResponseParser

3. Chờ yêu cầu tiếp theo.