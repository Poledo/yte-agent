Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-017

Mục tiêu:

Hoàn thiện PromptBuilder để tạo Prompt chuẩn cho AI Validation.

PromptBuilder chịu trách nhiệm:

- Kết hợp System Prompt.
- Kết hợp Validation Prompt.
- Kết hợp Knowledge.
- Kết hợp dữ liệu bệnh nhân.
- Tạo AIRequest hoàn chỉnh.

Không gọi AI.

Không thay đổi ValidationService.

Không thay đổi Controller.

==================================================

1. Hoàn thiện PromptBuilder

PromptBuilder nhận:

- ValidationRequest
- IReadOnlyList<KnowledgeDocument>

Tạo AIRequest.

==================================================

2. Cấu trúc Prompt

System Prompt

↓

Vai trò của AI.

↓

Nguyên tắc trả lời.

↓

Định dạng JSON bắt buộc.

--------------------------------------------------

User Prompt

Bao gồm:

===== Thông tin bệnh nhân =====

- Giới tính
- Tuổi
- ICD
- Chẩn đoán
- DVKT
- Thuốc
- Loại BHYT

--------------------------------------------------

===== Knowledge =====

Hiển thị lần lượt:

ICD

Procedure

Drug

Insurance

Guideline

==================================================

3. Output Format

Prompt phải yêu cầu AI chỉ trả về JSON.

Ví dụ:

{
  "isValid": true,
  "issues": [],
  "summary": ""
}

Không được trả Markdown.

Không được giải thích ngoài JSON.

==================================================

4. Prompt Template

Hoàn thiện các file:

Prompts/

- system.md
- validation.md
- output.md

Có nội dung thực tế, không còn placeholder.

Không hard-code Prompt trong C#.

==================================================

5. PromptBuilder

PromptBuilder chỉ đọc Prompt từ IPromptLoader.

Không đọc file trực tiếp.

Không hard-code nội dung.

==================================================

6. Logging

Nếu EnableLogging = true

Ghi log Prompt đã tạo ở mức Debug.

Không log API Key.

Không log thông tin nhạy cảm của bệnh nhân.

==================================================

Yêu cầu coding

- Không gọi AI.
- Không thay đổi kiến trúc.
- Async/Await.
- XML Summary.
- Nullable Reference Types.
- Tuân thủ SOLID.

==================================================

Sau khi hoàn thành

1. Giải thích cấu trúc Prompt.

2. Giải thích vai trò của:
   - system.md
   - validation.md
   - output.md

3. Giải thích cách PromptBuilder kết hợp Knowledge vào Prompt.

4. Giải thích vì sao AI chỉ được phép trả JSON.

5. Chờ yêu cầu tiếp theo.