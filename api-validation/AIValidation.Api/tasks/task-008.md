Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces, Configuration, Prompt System, Knowledge Layer và AI Domain đã được tạo ở các Task trước.

==================================================

Task-008

Mục tiêu:

Hoàn thiện tầng LLM Provider theo kiến trúc mở rộng.

LLM Provider là lớp trung gian giữa hệ thống và các nhà cung cấp AI.

Không triển khai gọi OpenAI.

Không triển khai gọi Gemini.

Không triển khai gọi GLM.

Không triển khai gọi Ollama.

Chỉ xây dựng framework.

==================================================

1. Tạo thư mục:

Providers/LLM

==================================================

2. Tạo Interface mới:

IAIProvider

Mục đích:

Đại diện cho một nhà cung cấp AI cụ thể.

Bao gồm:

Task<AIResponse> GenerateAsync(
    AIRequest request,
    CancellationToken cancellationToken = default);

==================================================

3. Tạo class:

LLMProvider

Implement:

ILLMProvider

LLMProvider không gọi AI trực tiếp.

LLMProvider nhận IEnumerable<IAIProvider> thông qua Dependency Injection.

LLMProvider có nhiệm vụ:

- Đọc cấu hình LLMOptions.Provider.
- Chọn AI Provider phù hợp.
- Chuyển AIRequest cho Provider.
- Trả về AIResponse.

Chưa cần implement logic lựa chọn.

Method chỉ throw NotImplementedException.

==================================================

4. Tạo Provider mẫu

Tạo:

OpenAIProvider

Implement:

IAIProvider

Chỉ tạo skeleton.

Không gọi HTTP.

Không thêm business logic.

Method chỉ throw NotImplementedException.

==================================================

5. Dependency Injection

Đăng ký:

services.AddScoped<ILLMProvider, LLMProvider>();

services.AddScoped<IAIProvider, OpenAIProvider>();

==================================================

Yêu cầu coding

- Constructor Injection.
- Nullable Reference Types.
- XML Summary.
- Namespace rõ ràng.
- Không gọi AI thật.
- Không tạo HttpClient.
- Không hard-code API Key.
- Không hard-code URL.
- Không đọc Prompt.
- Không đọc Knowledge.

==================================================

Sau khi hoàn thành:

1. Giải thích sự khác nhau giữa ILLMProvider và IAIProvider.

2. Giải thích vì sao LLMProvider sử dụng IEnumerable<IAIProvider>.

3. Giải thích cách mở rộng để hỗ trợ:
   - Gemini
   - GLM
   - Ollama
   - Azure OpenAI

4. Chờ yêu cầu tiếp theo.