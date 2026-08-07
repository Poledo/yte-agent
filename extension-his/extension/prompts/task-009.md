# Task-009 - AI Response Processor

## Mục tiêu

Xây dựng AI Response Processor.

Module này chịu trách nhiệm xử lý kết quả trả về từ Validation API.

Task này KHÔNG gọi LLM.

Task này KHÔNG gọi HTTP.

Task này chỉ xử lý Response và hợp nhất với Local Validation.

---

# User Story

Là nhân viên y tế,

Sau khi Backend AI trả kết quả,

Extension phải:

- phân tích Response
- chuẩn hóa dữ liệu
- hợp nhất với Local Validation
- trả về NotificationManager.

---

# Kiến trúc

ValidationPipeline

↓

ValidationApiClient

↓

ApiValidationResponse

↓

AIResponseProcessor

↓

ValidationResult

↓

NotificationManager

---

# Thư mục

Tạo

src/content/response/

AIResponseProcessor.ts

AIResponseMapper.ts

AIValidationResult.ts

AIExplain.ts

---

# AIResponseProcessor

Public API

process(response)

↓

return ValidationResult[]

Processor chịu trách nhiệm:

- parse response
- map severity
- map field
- map metadata
- merge local + remote
- loại bỏ duplicate

---

# Input

ApiValidationResponse

Ví dụ

{

"isValid":false,

"issues":[

{

"code":"ICD_EXPIRED",

"severity":"Warning",

"field":"icdVao",

"message":"ICD này đã ngừng sử dụng.",

"suggestion":"Sử dụng ICD khác.",

"canAutoFix":false,

"explain":"Theo Thông tư..."

}

],

"summary":"..."

}

---

# Output

ValidationResult

Ví dụ

{

ruleId:"AI_ICD_EXPIRED",

field,

level,

title,

message,

suggestion,

canExplain,

metadata

}

---

# Severity Mapping

Backend

↓

Extension

Error

↓

error

Warning

↓

warning

Info

↓

info

Hint

↓

info

Unknown

↓

warning

---

# AIExplain

Nếu Response có

explain

↓

đưa vào metadata

Ví dụ

metadata

{

explain:"..."

}

NotificationManager sẽ dùng ở Task sau.

---

# Merge Local + AI

Nếu Local đã có Error

↓

AI không được ghi đè.

Nếu AI có Warning

↓

thêm Warning.

Nếu AI có Explain

↓

gắn Explain.

Nếu AI trùng Rule

↓

chỉ giữ một.

---

# Duplicate Detection

Duplicate nếu:

field giống

message giống

code giống

↓

chỉ giữ một.

---

# AIResponseMapper

Map

ApiIssue

↓

ValidationResult

Không xử lý logic.

---

# Pipeline

ValidationPipeline

↓

Local Validation

↓

API

↓

AIResponseProcessor

↓

ValidationResult[]

↓

NotificationManager

---

# Notification

Task này chỉ trả ValidationResult.

Không gọi Notification.

---

# Explain

Task này chỉ lưu Explain.

Không hiển thị.

---

# Performance

Không parse nhiều lần.

Không clone object không cần thiết.

Không tạo object dư.

---

# Logging

Console

[AI]

Processing response...

[AI]

2 issues found

[AI]

Merged with local results

[AI]

Done

---

# Deliverables

Tạo

AIResponseProcessor

AIResponseMapper

AIValidationResult

AIExplain

---

# Acceptance Criteria

✓ Build thành công.

✓ Không lỗi TypeScript.

✓ Parse Response đúng.

✓ Severity đúng.

✓ Merge Local đúng.

✓ Không duplicate.

✓ Explain lưu metadata.

✓ Không sửa ValidationEngine.

✓ Không sửa ValidationApiClient.

✓ Không sửa NotificationManager.

---

# Không được làm

Không HTTP.

Không AI.

Không fetch.

Không Highlight.

Không Popup.

Không Explain UI.

Không Auto Fix.

---

# Coding Rules

Tuân thủ SOLID.

Processor chỉ xử lý Response.

Mapper chỉ map model.

Không chứa business logic.

Không sửa module ngoài phạm vi Task.

---

# Lỗi đã sửa (Fixes)

Nếu trong quá trình implement phát hiện lỗi thì:

- Tự sửa toàn bộ lỗi compile.
- Tự sửa bug logic.
- Bổ sung đầy đủ vào mục "Lỗi đã sửa (Fixes)" để các lần chạy lại sau AI luôn tạo đúng.
- Không làm phát sinh thay đổi ngoài phạm vi Task.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa lỗi compile nếu có.
- Test AI Response.
- Test Merge Local.
- Test Duplicate.
- Test Explain metadata.
- Tóm tắt file tạo mới.
- Tóm tắt file sửa.
- Không thực hiện Task tiếp theo.
