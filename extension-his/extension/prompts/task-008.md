# Task-008 - Validation API Client

## Mục tiêu

Implement ValidationApiClient để Extension có thể gọi Backend Validation API.

Task này chỉ chịu trách nhiệm giao tiếp HTTP.

KHÔNG chứa business logic.

KHÔNG Validation.

KHÔNG Explain.

KHÔNG Notification.

KHÔNG AI.

ValidationApiClient chỉ là lớp giao tiếp với Backend.

---

# User Story

Là nhân viên y tế,

Sau khi Local Validation PASS,

Extension phải gửi Request tới Validation API,

nhận Response,

và trả về ValidationPipeline.

---

# Kiến trúc

ValidationPipeline

↓

ValidationApiClient

↓

HTTP

↓

Validation API

↓

ValidationPipeline

---

# Thư mục

src/content/api/

ValidationApiClient.ts

ApiConfiguration.ts

ApiModels.ts

ApiException.ts

---

# ApiConfiguration

Tạo class quản lý cấu hình.

Bao gồm:

baseUrl

timeout

retryCount

retryDelay

headers

Ví dụ:

baseUrl

http://localhost:5000

timeout

5000 ms

retryCount

0

headers

Content-Type

application/json

Accept

application/json

---

# ValidationApiClient

Public API

validate(request)

Trả về

Promise<ApiValidationResponse>

Sử dụng:

fetch()

Không axios.

---

# Endpoint

POST

/api/validation/validate

Ví dụ

POST

http://localhost:5000/api/validation/validate

---

# Request Body

Request phải đúng schema Backend.

Ví dụ:

{
"page":"Diagnosis",

"trigger":{
"event":"Change",
"field":"icdVao"
},

"context":{
"timestamp":"ISO8601",
"extensionVersion":"1.0.0",
"sessionId":"...",
"userId":"..."
},

"form":{

      ...

}

}

ValidationApiClient KHÔNG build request.

RequestBuilder chịu trách nhiệm build.

ValidationApiClient chỉ gửi.

---

# Response

Backend trả về

Ví dụ

{

"isValid":true,

"issues":[

],

"summary":"All validations passed"

}

Hoặc

{

"isValid":false,

"issues":[

{

"code":"ICD_EXPLAIN",

"severity":"Warning",

"field":"icdVao",

"message":"...",

"suggestion":"...",

"canAutoFix":false

}

],

"summary":"..."

}

ValidationApiClient KHÔNG xử lý.

Chỉ deserialize.

---

# ApiModels

Tạo:

ApiValidationRequest

ApiValidationResponse

ApiIssue

đúng schema Backend.

---

# Timeout

Nếu timeout

↓

throw ApiException

code

TIMEOUT

---

# HTTP Error

Nếu

400

401

403

404

500

↓

throw ApiException

---

# Network Error

Nếu mất mạng

↓

throw ApiException

code

NETWORK_ERROR

---

# Retry

Task này:

retry = 0

Chỉ chuẩn bị cấu trúc.

Không retry.

---

# Logging

Console

[ValidationApi]

POST

/api/validation/validate

[ValidationApi]

Request

...

[ValidationApi]

Response

...

Nếu lỗi

[ValidationApi]

ERROR

...

---

# Integration

ValidationPipeline

sử dụng

ValidationApiClient

thay cho Stub.

Pipeline

↓

Local PASS

↓

ValidationApiClient.validate()

↓

return Response

---

# Performance

Không gọi API nếu Local FAIL.

Không gọi nhiều request đồng thời cho cùng Field.

Nếu Field thay đổi liên tục,

request cũ phải bị huỷ.

Sử dụng

AbortController.

---

# AbortController

Mỗi Field chỉ có một request đang chạy.

Nếu user nhập tiếp

↓

Abort request cũ

↓

Gửi request mới.

Không để response cũ ghi đè response mới.

---

# API Configuration

Cho phép cấu hình

baseUrl

tại

ApiConfiguration.ts

Không hardcode nhiều nơi.

---

# Deliverables

Tạo

ValidationApiClient

ApiConfiguration

ApiModels

ApiException

Implement fetch()

Implement AbortController

Implement timeout

Implement logging

---

# Acceptance Criteria

✓ Build thành công.

✓ Không lỗi TypeScript.

✓ Gọi được Backend API.

✓ Request đúng schema.

✓ Deserialize Response.

✓ Có timeout.

✓ Có AbortController.

✓ Có logging.

✓ Không retry.

✓ Không sửa ValidationEngine.

✓ Không sửa NotificationManager.

---

# Không được làm

Không AI.

Không Explain.

Không Highlight.

Không Auto Fix.

Không Popup.

Không SignalR.

Không Retry.

Không Business Rule.

---

# Coding Rules

Tuân thủ SOLID.

ValidationApiClient chỉ chịu trách nhiệm HTTP.

Không chứa business logic.

Không parse AI.

Không validate dữ liệu.

Không hardcode URL ngoài ApiConfiguration.

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
- Test gọi Backend API thành công.
- Test timeout.
- Test AbortController.
- Test HTTP Error.
- Test Network Error.
- Tóm tắt file tạo mới.
- Tóm tắt file sửa.
- Không thực hiện Task tiếp theo.
