# AI Validation API

## Mục tiêu

Đây là backend AI Validation Service phục vụ Chrome Extension trên hệ thống HIS (Hospital Information System).

API chịu trách nhiệm:

- Nhận dữ liệu biểu mẫu (Form Snapshot) từ Chrome Extension.
- Thực hiện kiểm tra dữ liệu.
- Gọi AI Provider để đánh giá tính hợp lý của dữ liệu.
- Trả về danh sách lỗi, cảnh báo và gợi ý theo định dạng JSON thống nhất.

API không thao tác giao diện người dùng.

---

## Công nghệ

- ASP.NET Core (.NET 10)
- C#
- Dependency Injection
- Async/Await
- Clean Architecture (trong phạm vi một project)
- REST API

---

## Mục tiêu thiết kế

- Dễ mở rộng.
- Dễ thay thế mô hình AI.
- Dễ bổ sung Knowledge Base.
- Không phụ thuộc vào một LLM cụ thể.
- Không hard-code Prompt.
- Không hard-code Rule trong Controller.

---

## Luồng xử lý

Chrome Extension

↓

Validation API

↓

Validation Service

↓

Knowledge Provider

↓

Prompt Builder

↓

LLM Provider

↓

Validation Result

↓

Chrome Extension

---

## Trách nhiệm

Validation API chỉ chịu trách nhiệm:

- Validate dữ liệu.
- Trả về Validation Result.

API không:

- Thao tác DOM.
- Điều khiển giao diện.
- Tự động sửa dữ liệu trên HIS.

Các chức năng đó thuộc về Chrome Extension.

## Phạm vi

AI Validation API thực hiện:

- Kiểm tra dữ liệu biểu mẫu.
- Kiểm tra tính hợp lệ giữa nhiều trường dữ liệu.
- Đưa ra lỗi, cảnh báo và gợi ý.
- Cung cấp API cho Chrome Extension.

AI Validation API không thực hiện:

- Chẩn đoán bệnh.
- Ra quyết định điều trị.
- Thay thế bác sĩ.
- Thay đổi dữ liệu HIS.