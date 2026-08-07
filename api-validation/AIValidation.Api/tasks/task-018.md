Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-018

Mục tiêu:

Hoàn thiện luồng gọi AI thật để Validation API có thể gửi Prompt đến LLM và nhận kết quả.

Không thay đổi kiến trúc hiện tại.

Không sửa Controller.

Không sửa ValidationService ngoài việc sử dụng implementation hoàn chỉnh của ILLMProvider.

==================================================

1. Hoàn thiện LLMProvider

Kiểm tra và hoàn thiện implementation của ILLMProvider.

Provider phải:

- Đọc cấu hình từ LLMOptions.
- Sử dụng HttpClientFactory.
- Gửi request theo chuẩn Chat Completions API.
- Hỗ trợ OpenRouter (mặc định).
- Có thể mở rộng sang OpenAI hoặc Ollama sau này.

==================================================

2. Request

Request gửi lên LLM phải bao gồm:

- model
- messages
- temperature
- max_tokens

messages gồm:

System Prompt

↓

User Prompt

Không hard-code Prompt.

==================================================

3. Response

Đọc JSON trả về.

Lấy:

- message.content
- finish_reason
- usage

Chuyển thành AIResponse.

==================================================

4. Error Handling

Nếu:

- HTTP lỗi
- Timeout
- JSON không hợp lệ
- AI trả response rỗng

Thì:

- Ghi log.
- Throw exception phù hợp để GlobalExceptionMiddleware xử lý.

Không trả null.

==================================================

5. Configuration

Kiểm tra appsettings.json.

Đảm bảo có:

LLM

- Provider
- BaseUrl
- ApiKey
- Model
- Temperature
- MaxTokens
- TimeoutSeconds

Không hard-code bất kỳ giá trị nào trong source.

==================================================

6. Test

Chuẩn bị một request mẫu.

Gửi qua toàn bộ pipeline:

ValidationRequest
↓
KnowledgeProvider
↓
PromptBuilder
↓
LLMProvider
↓
ResponseProcessor
↓
ValidationResponse

Đảm bảo API hoạt động end-to-end.

==================================================

Yêu cầu coding

- Async/Await.
- CancellationToken.
- System.Text.Json.
- HttpClientFactory.
- XML Summary.
- Nullable Reference Types.
- Không thêm business logic.
- Không thay đổi PromptBuilder.

==================================================

Sau khi hoàn thành

1. Giải thích luồng xử lý từ ValidationRequest đến LLM.

2. Giải thích cách thay đổi model chỉ bằng appsettings.json.

3. Giải thích cách mở rộng để hỗ trợ:
   - OpenAI
   - Ollama
   - Gemini
   - GLM

4. Chờ yêu cầu tiếp theo.