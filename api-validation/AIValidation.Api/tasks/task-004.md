Đọc toàn bộ tài liệu trong thư mục docs trước khi thực hiện.

Đọc toàn bộ Models, Interfaces và Skeleton đã được tạo ở các Task trước.

------------------------------------------------

Task-004

Mục tiêu:

Xây dựng Prompt Management System.

Không gọi AI.

Không đọc Knowledge.

Không tạo Controller.

Không sửa Models.

Không sửa Interfaces.

------------------------------------------------

Tạo thư mục:

Prompts/

------------------------------------------------

Trong thư mục Prompts tạo các file:

system.md

validation.md

output.md

------------------------------------------------

Tạo PromptLoader.

PromptLoader chịu trách nhiệm:

- Đọc Prompt từ thư mục Prompts.
- Cache nội dung Prompt sau lần đọc đầu tiên.
- Hỗ trợ đọc bất kỳ file Prompt nào.
- Không chứa Prompt hard-code.

------------------------------------------------

Tạo Interface:

IPromptLoader

Bao gồm:

Task<string> LoadAsync(
    string promptName,
    CancellationToken cancellationToken = default);

------------------------------------------------

Cập nhật PromptBuilder.

PromptBuilder phải sử dụng IPromptLoader.

PromptBuilder không được đọc file trực tiếp.

------------------------------------------------

Yêu cầu coding:

- Prompt lưu hoàn toàn dưới dạng file Markdown.
- Không hard-code Prompt trong C#.
- Sử dụng UTF-8.
- Sử dụng async/await.
- Cache Prompt trong bộ nhớ sau lần đọc đầu tiên.
- Đăng ký Dependency Injection.
- Không tạo Prompt thật.
- Chỉ tạo nội dung mẫu (placeholder) cho các file Markdown.

------------------------------------------------

Sau khi hoàn thành:

1. Giải thích Prompt Management hoạt động như thế nào.

2. Giải thích vì sao PromptBuilder không đọc file trực tiếp.

3. Chờ yêu cầu tiếp theo.