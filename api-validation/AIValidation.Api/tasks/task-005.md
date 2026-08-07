Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces và các class đã tạo ở các Task trước.

------------------------------------------------

Task-005

Mục tiêu:

Thiết kế hệ thống Configuration cho AI Validation API.

Không gọi AI.

Không đọc Prompt.

Không đọc Knowledge.

Không tạo Controller.

Không sửa Models.

Không sửa Interfaces.

------------------------------------------------

Tạo thư mục:

Configuration/

------------------------------------------------

Tạo các class Options sau:

LLMOptions

Bao gồm:

- Provider
- BaseUrl
- ApiKey
- Model
- TimeoutSeconds
- Temperature
- MaxTokens

------------------------------------------------

PromptOptions

Bao gồm:

- Folder

------------------------------------------------

KnowledgeOptions

Bao gồm:

- Folder

------------------------------------------------

ValidationOptions

Bao gồm:

- EnableKnowledge
- EnableLogging
- EnableCache

------------------------------------------------

Đọc cấu hình từ appsettings.json bằng Options Pattern.

Sử dụng:

IOptions<T>

------------------------------------------------

Cập nhật Program.cs.

Đăng ký:

services.Configure<LLMOptions>()

services.Configure<PromptOptions>()

services.Configure<KnowledgeOptions>()

services.Configure<ValidationOptions>()

------------------------------------------------

Tạo file appsettings.json mẫu.

Bao gồm:

{
  "LLM": {
    "Provider": "",
    "BaseUrl": "",
    "ApiKey": "",
    "Model": "",
    "TimeoutSeconds": 60,
    "Temperature": 0,
    "MaxTokens": 4096
  },

  "Prompt": {
    "Folder": "Prompts"
  },

  "Knowledge": {
    "Folder": "Knowledge"
  },

  "Validation": {
    "EnableKnowledge": true,
    "EnableLogging": true,
    "EnableCache": true
  }
}

------------------------------------------------

Yêu cầu coding:

- Không hard-code cấu hình.
- Sử dụng Options Pattern.
- Không thêm business logic.
- Không gọi AI.
- Không tạo Provider implementation.

------------------------------------------------

Sau khi hoàn thành:

1. Giải thích từng Options.

2. Giải thích vì sao sử dụng Options Pattern thay vì đọc IConfiguration trực tiếp.

3. Chờ yêu cầu tiếp theo.