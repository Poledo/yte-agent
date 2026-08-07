Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-013

Mục tiêu:

Hoàn thiện OpenRouterProvider để có thể gọi LLM thật thông qua OpenRouter REST API.

Không sửa kiến trúc hiện tại.

Chỉ hoàn thiện implementation của OpenRouterProvider.

==================================================

Yêu cầu

Sử dụng:

- HttpClientFactory
- System.Text.Json

Không sử dụng SDK của OpenAI.

Không hard-code URL.

Không hard-code API Key.

==================================================

Đọc cấu hình từ:

LLMOptions

Bao gồm:

- BaseUrl
- ApiKey
- Model
- Temperature
- MaxTokens
- TimeoutSeconds

==================================================

Triển khai:

GenerateAsync(
    AIRequest request,
    CancellationToken cancellationToken)

Các bước:

1.

Tạo HTTP Request theo chuẩn Chat Completions API.

2.

Sử dụng:

Authorization: Bearer {ApiKey}

3.

Body gồm:

- model
- messages
- temperature
- max_tokens

Trong đó:

messages gồm:

system

↓

request.SystemPrompt

user

↓

request.UserPrompt

==================================================

Deserialize kết quả trả về.

Chuyển thành:

AIResponse

Bao gồm:

- Content
- Usage
- FinishReason

==================================================

Nếu HTTP thất bại:

- Ghi log.
- Throw Exception phù hợp.

Không trả null.

==================================================

Đăng ký HttpClient bằng IHttpClientFactory.

Timeout lấy từ LLMOptions.

==================================================

Không sửa ValidationService.

Không sửa PromptBuilder.

Không sửa ResponseProcessor.

==================================================

Yêu cầu coding

- Async/Await.
- CancellationToken.
- System.Text.Json.
- XML Summary.
- Nullable Reference Types.
- Không hard-code model.
- Không hard-code endpoint.

==================================================

Sau khi hoàn thành

1. Giải thích cách hoạt động của OpenRouterProvider.

2. Giải thích cách thay đổi model chỉ bằng appsettings.json.

3. Giải thích cách mở rộng sang:

- OpenAI
- Gemini
- GLM
- Ollama

4. Chờ yêu cầu tiếp theo.