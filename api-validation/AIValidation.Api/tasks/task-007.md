Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces, Configuration, Prompt System và Knowledge Layer đã được tạo ở các Task trước.

==================================================

Task-007

Mục tiêu:

Thiết kế AI Domain.

AI Domain là contract nội bộ giữa PromptBuilder và LLMProvider.

Không gọi AI.

Không sửa Controller.

Không thêm business logic.

==================================================

Tạo thư mục:

Models/AI

==================================================

Tạo model:

AIRequest

Bao gồm:

- string SystemPrompt
- string UserPrompt
- string Model
- double Temperature
- int MaxTokens
- Dictionary<string, string>? Metadata

AIRequest đại diện cho toàn bộ dữ liệu gửi tới AI Provider.

==================================================

Tạo model:

AIResponse

Bao gồm:

- string Content
- AIUsage? Usage
- string? FinishReason

AIResponse đại diện cho kết quả trả về từ AI Provider.

==================================================

Tạo model:

AIUsage

Bao gồm:

- int PromptTokens
- int CompletionTokens
- int TotalTokens

==================================================

Cập nhật Interface:

ILLMProvider

thành:

Task<AIResponse> GenerateAsync(
    AIRequest request,
    CancellationToken cancellationToken = default);

Không sử dụng string prompt nữa.

==================================================

Cập nhật PromptBuilder.

PromptBuilder không trả về string.

PromptBuilder trả về:

AIRequest

==================================================

Không sửa implementation.

Nếu implementation chưa hỗ trợ thì chỉ để throw NotImplementedException.

==================================================

Yêu cầu coding

- Không gọi AI.
- Không hard-code model.
- Nullable Reference Types.
- XML Summary.
- Namespace rõ ràng.
- Không thêm business logic.

==================================================

Sau khi hoàn thành:

1. Giải thích AIRequest.

2. Giải thích AIResponse.

3. Giải thích vì sao PromptBuilder trả AIRequest thay vì string.

4. Giải thích vì sao ILLMProvider nhận AIRequest thay vì string.

5. Chờ yêu cầu tiếp theo.