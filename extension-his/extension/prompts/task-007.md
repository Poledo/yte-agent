# Task-007 - Validation Pipeline

## Mục tiêu

Xây dựng Validation Pipeline.

Validation Pipeline là tầng điều phối toàn bộ quá trình Validation.

Pipeline quyết định:

- Có cần gọi AI hay không
- Có cần gọi Backend API hay không
- Có cần dừng tại Local Validation hay không

Task này CHƯA parse AI Response.

Task này CHƯA Explain.

Task này CHƯA Highlight.

Task này chỉ chịu trách nhiệm điều phối.

---

# User Story

Là nhân viên y tế,

Khi tôi nhập dữ liệu,

Extension phải:

- chạy Local Validation trước
- nếu Local Validation phát hiện Error
  => dừng ngay

nếu Local Validation PASS

=> mới gọi Validation API.

---

# Luồng xử lý

Field Change

↓

ValidationEngine

↓

Có Error?

↓

YES

↓

Trả kết quả Local

↓

STOP

---

NO

↓

Build Validation Request

↓

Validation API

↓

Nhận Response

↓

Trả kết quả cho Task sau.

---

# Kiến trúc

ValidationPipeline

├── ValidationRequestBuilder

├── ValidationApiClient (stub)

├── ValidationDecision

└── ValidationPipeline

---

# Thư mục

Tạo:

src/content/pipeline/

ValidationPipeline.ts

ValidationDecision.ts

ValidationRequestBuilder.ts

ValidationPipelineResult.ts

---

# ValidationDecision

Quyết định:

LOCAL_ONLY

LOCAL_FAILED

REMOTE_REQUIRED

REMOTE_SKIPPED

---

# ValidationPipeline

Public API

validateField()

validateForm()

Pipeline thực hiện:

1.

Local Validation

↓

2.

Nếu có Error

↓

return ngay

↓

3.

Nếu PASS

↓

Build Request

↓

4.

Gọi ValidationApiClient

↓

5.

return PipelineResult

---

# ValidationApiClient

Task này CHƯA implement HTTP.

Chỉ tạo interface.

Ví dụ:

validate(request)

Hiện tại chỉ:

console.log()

"Calling Validation API"

và trả Promise.resolve()

Ví dụ:

{
success:true,
issues:[]
}

KHÔNG fetch.

KHÔNG axios.

KHÔNG HTTP.

---

# ValidationRequestBuilder

Nhận:

ValidationContext

↓

Sinh Request Object.

Cấu trúc request phải thống nhất với Backend API.

Ví dụ:

{
page,

trigger:{
event,
field
},

context:{
timestamp,
extensionVersion,
sessionId,
userId
},

form:{
...
}
}

Task này chỉ build object.

Không gửi.

---

# Request Body

Request phải đúng cấu trúc sau:

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

      "... toàn bộ field của page ..."

}

}

Lưu ý:

form KHÔNG hardcode.

ValidationRequestBuilder phải tự lấy dữ liệu từ FieldRegistry.

---

# Page Mapping

Tạo:

knowledge/pages/

Diagnosis.json

PatientIntake.json

MedicalEncounter.json

Ví dụ:

Diagnosis.json

{

"name":"Diagnosis",

"fields":[

"icdVao",

"icdRa",

"chanDoan",

"bacSi"

]

}

ValidationRequestBuilder chỉ lấy đúng field khai báo.

Không gửi toàn bộ DOM.

---

# Pipeline Result

Bao gồm

localPassed

localResults

remoteCalled

remoteResult

requestBody

---

# Integration

Content Script chỉ gọi

pipeline.validateField()

Không gọi ValidationEngine trực tiếp.

ValidationPipeline sẽ:

↓

ValidationEngine

↓

ValidationRequestBuilder

↓

ValidationApiClient

↓

return PipelineResult

---

# Performance

Chỉ build request khi Local PASS.

Không build request khi Local FAIL.

Không gọi API nếu Local FAIL.

Không polling.

Không setInterval.

---

# Debug

Console:

[Pipeline]

Local validation...

PASS

[Pipeline]

Building request...

[Pipeline]

Validation request

{...}

[Pipeline]

Calling Validation API...

(STUB)

---

# Deliverables

Tạo:

ValidationPipeline

ValidationDecision

ValidationRequestBuilder

ValidationPipelineResult

ValidationApiClient (stub)

knowledge/pages/

Diagnosis.json

PatientIntake.json

MedicalEncounter.json

---

# Acceptance Criteria

✓ Build thành công

✓ Không lỗi TypeScript

✓ Local Error => không gọi API

✓ Local PASS => build request

✓ Request đúng schema Backend

✓ ValidationApiClient chỉ là stub

✓ Console hiển thị request

✓ Chưa có HTTP

✓ Chưa parse AI Response

✓ Không sửa NotificationManager

✓ Không sửa ValidationEngine

---

# Không được làm

Không fetch

Không axios

Không SignalR

Không AI

Không Explain

Không Popup

Không Highlight

Không Retry

---

# Coding Rules

Tuân thủ SOLID.

ValidationPipeline chỉ điều phối.

ValidationRequestBuilder chỉ build request.

ValidationApiClient chỉ là stub.

Không hardcode tên field.

Không sửa module ngoài phạm vi Task.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa lỗi compile nếu có.
- Đảm bảo Extension vẫn hoạt động.
- Kiểm tra ValidationPipeline.
- Kiểm tra ValidationRequestBuilder.
- Kiểm tra Request Body sinh ra đúng schema Backend.
- Tóm tắt file tạo mới.
- Tóm tắt file sửa.
- Nếu phát hiện lỗi trong quá trình thực hiện thì tự sửa và bổ sung vào mục "Lỗi đã sửa (Fixes)" của task để những lần chạy lại sau AI vẫn tạo đúng.
- Không thực hiện Task tiếp theo.
