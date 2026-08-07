Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-015

Mục tiêu:

Triển khai end-to-end tính năng đầu tiên:

Kiểm tra tính hợp lệ của mã ICD theo giới tính bệnh nhân.

Đi qua toàn bộ pipeline:

ValidationRequest
→ Knowledge
→ Prompt
→ AI
→ ResponseProcessor
→ ValidationResponse

==================================================

1. Database

Bổ sung dữ liệu mẫu cho bảng KnowledgeItem.

Category:

ICD

Ví dụ:

Code: O80
Name: Đẻ thường một thai
Content:
Chỉ áp dụng cho bệnh nhân nữ.

--------------------------------------------------

Code: N40
Name: Phì đại tuyến tiền liệt
Content:
Chỉ áp dụng cho bệnh nhân nam.

==================================================

2. Knowledge Repository

Hỗ trợ lấy Knowledge theo:

Category = ICD

và

Code = request.IcdCode

==================================================

3. KnowledgeProvider

Chỉ lấy các Knowledge liên quan đến ICD của request.

==================================================

4. PromptBuilder

Bổ sung Knowledge vào UserPrompt.

Ví dụ Prompt:

- Thông tin bệnh nhân.
- ICD hiện tại.
- Knowledge về ICD.
- Yêu cầu AI kiểm tra ICD có phù hợp với giới tính hay không.

==================================================

5. AI

Sử dụng AI Provider hiện có.

Không thay đổi kiến trúc.

==================================================

6. Response

AI phải trả về đúng ValidationResponse JSON.

Ví dụ:

{
  "isValid": false,
  "issues": [
    {
      "field": "icdCode",
      "severity": "Error",
      "message": "ICD O80 chỉ áp dụng cho bệnh nhân nữ."
    }
  ]
}

==================================================

7. API Test

Chuẩn bị ít nhất 2 trường hợp:

Case 1

Nam

ICD O80

↓

Kết quả:

Không hợp lệ.

--------------------------------------------------

Case 2

Nữ

ICD O80

↓

Kết quả:

Hợp lệ.

==================================================

Yêu cầu coding

- Không hard-code kết quả trong Service.
- AI phải tự đánh giá dựa trên Knowledge.
- Không thêm business rule trong ValidationService.
- Giữ nguyên kiến trúc hiện tại.
- Async/Await.
- XML Summary.

==================================================

Sau khi hoàn thành:

1. Giải thích luồng xử lý của feature.

2. Giải thích Knowledge nào đã được gửi cho AI.

3. Giải thích Prompt được xây dựng như thế nào.

4. Chờ yêu cầu tiếp theo.