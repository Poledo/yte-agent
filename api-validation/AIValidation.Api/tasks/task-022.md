Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-022

Mục tiêu

Xây dựng Prompt Template System cho AI Validation API.

Đây là tầng trung gian giữa ValidationService và LLM.

Prompt phải được quản lý bằng file.

Không hard-code Prompt trong C#.

Prompt phải dễ chỉnh sửa mà không cần build lại project.

==================================================

Yêu cầu

Tạo thư mục:

prompts/

Bên trong tạo các file:

validation.system.md

validation.user.md

explanation.system.md

explanation.user.md

==================================================

1.

validation.system.md

Đây là System Prompt.

Quy định vai trò AI.

Ví dụ:

- AI là chuyên gia HIS.
- Hiểu ICD.
- Hiểu DVKT.
- Hiểu BHYT.
- Không suy diễn.
- Chỉ dựa trên dữ liệu được cung cấp.
- Luôn trả JSON hợp lệ.
- Không trả markdown.
- Không giải thích ngoài JSON.

==================================================

2.

validation.user.md

Đây là User Prompt.

Sử dụng placeholder.

Ví dụ

{{Patient}}

{{Encounter}}

{{Diagnosis}}

{{Procedure}}

{{Medicine}}

{{Knowledge}}

Prompt mô tả rõ:

- Phân tích dữ liệu.
- Kiểm tra tính hợp lý.
- Phát hiện bất thường.
- Đề xuất sửa.

==================================================

3.

explanation.system.md

Dùng cho chức năng:

Giải thích

Ví dụ:

"Tại sao ICD O80 không hợp lệ?"

Prompt yêu cầu AI:

- Giải thích ngắn gọn.
- Dễ hiểu.
- Dẫn nguồn từ Knowledge.

==================================================

4.

explanation.user.md

Placeholder:

{{Question}}

{{Knowledge}}

==================================================

5.

PromptLoader

Đọc Prompt từ thư mục prompts.

Sử dụng cache.

Không đọc file mỗi request.

Nếu file thay đổi thì hỗ trợ reload khi restart API.

==================================================

6.

PromptBuilder

PromptBuilder không chứa Prompt.

Chỉ:

- Load Prompt
- Replace Placeholder
- Build Prompt cuối cùng

==================================================

7.

Placeholder Engine

Hỗ trợ:

{{Patient}}

{{Encounter}}

{{Diagnosis}}

{{Procedure}}

{{Medicine}}

{{Knowledge}}

Nếu placeholder không tồn tại thì thay bằng chuỗi rỗng.

Không throw exception.

==================================================

8.

Validation

Nếu thiếu file Prompt

Throw PromptNotFoundException.

Không dùng InvalidOperationException.

==================================================

9.

Coding Rules

Dependency Injection.

Interface đầy đủ.

Async/Await.

XML Documentation.

Không hard-code Prompt.

Không hard-code đường dẫn.

Đường dẫn Prompt lấy từ cấu hình.

==================================================

10.

appsettings.json

Thêm cấu hình

Prompt

Folder

ValidationSystem

ValidationUser

ExplanationSystem

ExplanationUser

==================================================

11.

Không kết nối LLM.

Không sửa ValidationService.

Không sửa KnowledgeProvider.

Không sửa Controller.

Chỉ xây dựng Prompt System.

==================================================

Sau khi hoàn thành

Giải thích:

1. Kiến trúc Prompt System.

2. Luồng:

ValidationService

↓

PromptBuilder

↓

PromptLoader

↓

Prompt Template

↓

Final Prompt

3. Cách thêm Prompt mới sau này.

4. Chờ yêu cầu tiếp theo.