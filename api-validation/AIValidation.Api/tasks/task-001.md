Đọc toàn bộ tài liệu trong thư mục docs trước khi thực hiện bất kỳ thay đổi nào.

Bao gồm:

- PROJECT.md
- ARCHITECTURE.md
- RULES.md
- DECISIONS.md

Mục tiêu:

Thiết kế và tạo các Domain Models cho AI Validation API.

Yêu cầu:

- Chỉ tạo Models.
- Không tạo Controller.
- Không tạo Service.
- Không tạo Provider.
- Không tạo Prompt Builder.
- Không tạo Validation Engine.
- Không viết business logic.
- Không thêm code ngoài phạm vi yêu cầu.

Tạo thư mục Models nếu chưa tồn tại.

Tạo các model sau:

1. ValidationRequest

Mục đích:
Đại diện cho request mà Chrome Extension gửi lên AI Validation API.

Bao gồm các thuộc tính:

- string Page
- TriggerInfo Trigger
- ValidationContext Context
- JsonElement Form

Giải thích:

- Page: tên màn hình hoặc chức năng trên HIS.
- Trigger: thông tin field vừa thay đổi.
- Context: thông tin bổ sung từ Extension.
- Form: toàn bộ Form Snapshot dưới dạng JSON động.

Không tạo model cố định cho Form vì API phải hỗ trợ nhiều màn hình khác nhau.

------------------------------------------------

2. TriggerInfo

Bao gồm:

- string Field
- TriggerEvent Event

------------------------------------------------

3. ValidationContext

Bao gồm:

- DateTime Timestamp
- string ExtensionVersion
- string SessionId
- string? UserId

Các thuộc tính phải dễ mở rộng trong tương lai.

------------------------------------------------

4. ValidationResponse

Bao gồm:

- List<ValidationIssue> Issues

Thiết kế để sau này có thể mở rộng thêm Metadata nếu cần.

------------------------------------------------

5. ValidationIssue

Bao gồm:

- string Code
- ValidationSeverity Severity
- string Field
- string Message
- string? Suggestion
- bool CanAutoFix
- string? FixValue

ValidationIssue đại diện cho một lỗi, cảnh báo hoặc gợi ý.

------------------------------------------------

Tạo thư mục Enums.

Tạo:

ValidationSeverity

Bao gồm:

- Info
- Warning
- Error

------------------------------------------------

TriggerEvent

Bao gồm:

- Change
- Blur
- Focus
- Save

------------------------------------------------

Yêu cầu coding:

- Sử dụng C# record nếu phù hợp.
- Sử dụng nullable reference type.
- Ưu tiên init property nếu phù hợp.
- Namespace rõ ràng.
- Có XML summary cho tất cả class và property.
- Không thêm business logic.
- Không thêm validation attribute.
- Không thêm constructor nếu không cần.
- Không sinh code ngoài phạm vi yêu cầu.

Sau khi hoàn thành:

1. Giải thích ngắn gọn từng model.
2. Giải thích vì sao chọn JsonElement cho Form.
3. Chờ yêu cầu tiếp theo.