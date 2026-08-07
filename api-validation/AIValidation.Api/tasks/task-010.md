Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces, Configuration, Prompt System, Knowledge Layer, AI Domain, LLM Provider và Response Processor đã được tạo ở các Task trước.

==================================================

Task-010

Mục tiêu:

Hoàn thiện ValidationService.

ValidationService là Orchestrator của toàn bộ quy trình Validation.

ValidationService không chứa logic của AI.

ValidationService không đọc Prompt.

ValidationService không đọc Knowledge.

ValidationService không parse Response.

ValidationService chỉ điều phối các thành phần.

==================================================

Cập nhật ValidationService.

Inject các dependency:

- IKnowledgeProvider
- IPromptBuilder
- ILLMProvider
- IResponseProcessor
- ILogger<ValidationService>

==================================================

Phương thức:

Task<ValidationResponse> ValidateAsync(
    ValidationRequest request,
    CancellationToken cancellationToken = default);

==================================================

Luồng xử lý mong muốn:

1.

Nhận ValidationRequest.

↓

2.

Lấy Knowledge từ IKnowledgeProvider.

↓

3.

Tạo AIRequest thông qua IPromptBuilder.

↓

4.

Gửi AIRequest tới ILLMProvider.

↓

5.

Nhận AIResponse.

↓

6.

Xử lý AIResponse bằng IResponseProcessor.

↓

7.

Trả về ValidationResponse.

==================================================

Yêu cầu

Chưa implement business logic.

Chưa gọi AI thật.

Chưa đọc Prompt thật.

Chưa đọc Knowledge thật.

Các bước chỉ để TODO hoặc throw NotImplementedException tại các thành phần phụ thuộc.

ValidationService chỉ thể hiện rõ luồng điều phối và gọi đúng các interface.

==================================================

Thêm XML Summary đầy đủ.

Sử dụng Constructor Injection.

Sử dụng async/await.

Tuân thủ SOLID.

Không thêm code ngoài phạm vi yêu cầu.

==================================================

Sau khi hoàn thành

1. Giải thích vai trò của ValidationService.

2. Giải thích vì sao ValidationService chỉ điều phối mà không chứa logic AI.

3. Mô tả luồng xử lý từ ValidationRequest đến ValidationResponse.

4. Chờ yêu cầu tiếp theo.