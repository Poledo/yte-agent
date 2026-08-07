# Task-007 - Remote Validation API Integration

## Mục tiêu

Mở rộng Extension để sau khi Local Validation PASS thì tiếp tục gọi Backend Validation API.

Backend sẽ chịu trách nhiệm:

- Business Validation
- Knowledge Validation
- AI Validation
- RAG
- LLM Explanation

Extension KHÔNG thực hiện các rule này.

Extension chỉ:

- thu thập dữ liệu
- gửi request
- nhận response
- hiển thị kết quả

---

# Kiến trúc

User Input

↓

ChangeTracker

↓

ValidationPipeline

↓

ValidationEngine (Local)

↓

Nếu FAIL

↓

NotificationDispatcher

↓

NotificationManager

↓

Kết thúc

---

Nếu PASS

↓

ValidationApiClient

↓

POST

/api/validation/validate

↓

Backend

↓

ValidationResponse

↓

ValidationMapper

↓

NotificationDispatcher

↓

NotificationManager

---

# Không thay đổi

Không sửa:

- Rule
- RuleRegistry
- RuleExecutor
- ValidationEngine
- AssistantBubble

---

# Tạo thư mục

src/content/api/

ValidationApiClient.ts

ValidationRequest.ts

ValidationResponse.ts

ValidationMapper.ts

---

src/content/pipeline/

ValidationPipeline.ts

ValidationPipelineOptions.ts

---

src/content/dispatcher/

NotificationDispatcher.ts

---

src/shared/config/

ApiConfig.ts

---

knowledge/

pages/

Diagnosis.json

PatientInfo.json

Prescription.json

...

---

# ValidationPipeline

ValidationPipeline là nơi điều phối toàn bộ Validation.

ValidationPipeline KHÔNG chứa business rule.

ValidationPipeline chỉ điều phối.

Constructor nhận Dependency Injection.

Không new object bên trong.

Dependency gồm:

- ValidationEngine
- ValidationApiClient
- NotificationDispatcher
- FieldRegistry

---

# Flow

validateField(fieldId)

↓

Tạo ValidationContext

↓

ValidationEngine

↓

Nếu Local FAIL

↓

NotificationDispatcher

↓

Kết thúc

---

Nếu PASS

↓

Build Request

↓

ValidationApiClient

↓

ValidationMapper

↓

NotificationDispatcher

↓

Kết thúc

---

# Request Body

Request gửi đúng cấu trúc Backend.

Ví dụ

{
"page": {
"id": "Diagnosis",
"title": "Chẩn đoán"
},
"trigger": {
"event": "Blur",
"field": "icdVao",
"value": "J18.9"
},
"context": {
"timestamp": "2026-07-15T08:00:00Z",
"extensionVersion": "1.0.0",
"sessionId": "UUID",
"userId": ""
},
"form": {
"icdVao": "J18.9",
"ngayVao": "2026-07-15",
"maBenhNhan": "BN0001"
}
}

---

# Không gửi toàn bộ Form

Extension phải gửi đúng các Field được cấu hình.

Ví dụ

knowledge/pages/

Diagnosis.json

{

"page":"Diagnosis",

"fields":[

      "icdVao",

      "icdRa",

      "ngayVao",

      "ngayRa",

      "maBenhNhan"

]

}

ValidationPipeline phải:

↓

đọc Page Config

↓

lấy danh sách Field

↓

đọc từ FieldRegistry

↓

serialize

↓

POST API

Không hardcode field.

---

# Trigger

trigger.event

Có thể là

Blur

Change

Save

trigger.field

field vừa thay đổi

trigger.value

giá trị mới nhất

---

# Context

timestamp

UTC ISO8601

extensionVersion

chrome.runtime.getManifest().version

sessionId

UUID

userId

để trống nếu chưa có

---

# ValidationApiClient

POST

/api/validation/validate

Không hardcode URL.

Đọc từ

ApiConfig.ts

Ví dụ

export const ApiConfig = {

baseUrl:

"http://localhost:5000",

timeout:8000

}

Sử dụng fetch().

Có timeout.

Có AbortController.

---

# ValidationResponse

Map đúng response Backend.

Ví dụ

{

"isValid":false,

"issues":[

{

"source":"AI",

"code":"ICD_EXPIRED",

"severity":"Warning",

"field":"icdVao",

"message":"ICD đã ngừng sử dụng",

"suggestion":"Sử dụng ICD mới",

"canAutoFix":false

}

],

"summary":"1 warning"

}

---

# ValidationMapper

Chuyển Response

↓

ValidationResult

để NotificationDispatcher sử dụng.

Không sửa NotificationManager.

---

# NotificationDispatcher

ValidationPipeline KHÔNG gọi NotificationManager trực tiếp.

ValidationPipeline

↓

ValidationResult[]

↓

NotificationDispatcher

↓

NotificationManager

Dispatcher chịu trách nhiệm:

- hiển thị Bubble
- Highlight
- Sound
- Explain Button

Pipeline không biết UI.

---

# Logging

Console

[ValidationPipeline]

Start

[ValidationPipeline]

Running Local Validation

[ValidationPipeline]

Local PASS

[ValidationPipeline]

Sending API Request

[ValidationPipeline]

Response Received

[ValidationPipeline]

Completed

---

# Error Handling

Nếu Local FAIL

Không gọi API.

Nếu API Timeout

console.warn()

Không throw exception.

Nếu API lỗi

console.error()

Extension vẫn hoạt động.

---

# Performance

Giữ nguyên debounce hiện có.

Không tạo debounce mới.

Không polling.

Không setInterval.

API chỉ gọi khi:

- Local PASS
- Field thực sự thay đổi

---

# Coding Rules

Tuân thủ SOLID.

Dependency Injection.

Single Responsibility.

Không hardcode.

Không sửa module ngoài phạm vi Task.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Sửa compile error.
- Kiểm tra Local Validation.
- Kiểm tra API chỉ gọi khi Local PASS.
- Kiểm tra Notification vẫn hoạt động.
- Kiểm tra timeout.
- Kiểm tra lỗi mạng.

Liệt kê:

- File tạo mới.
- File sửa.
- Các thay đổi.

Không thực hiện Task tiếp theo.

---

# Fixes

Nếu trong quá trình implement phát hiện bug hoặc cần refactor để tính năng hoạt động đúng thì:

## X. Tên lỗi

### Lỗi

Mô tả lỗi.

### Nguyên nhân

Mô tả nguyên nhân.

### Fix

Đã sửa như thế nào.

### File sửa

Liệt kê đầy đủ.

Mọi Fix bắt buộc phải được bổ sung vào tài liệu này để các lần chạy lại sau AI tự động áp dụng và không lặp lại lỗi cũ.
