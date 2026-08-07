# Kiến trúc

## Mục tiêu

AI Validation API là tầng xử lý trung gian giữa Chrome Extension và các mô hình AI.

Hệ thống có nhiệm vụ:

- Tiếp nhận Form Snapshot từ Chrome Extension.
- Phân tích dữ liệu cần kiểm tra.
- Thu thập dữ liệu tham chiếu khi cần.
- Xây dựng Prompt.
- Gọi AI Provider để thực hiện kiểm tra.
- Phân tích kết quả trả về.
- Trả về danh sách lỗi, cảnh báo và gợi ý theo định dạng JSON thống nhất.

---

# Nguyên tắc thiết kế

## Single Responsibility Principle (SRP)

Mỗi thành phần chỉ thực hiện một nhiệm vụ duy nhất.

Ví dụ:

- Controller chỉ tiếp nhận Request và trả về Response.
- ValidationService điều phối toàn bộ quá trình kiểm tra.
- PromptBuilder chỉ tạo Prompt.
- KnowledgeProvider chỉ cung cấp dữ liệu tham chiếu.
- LLMProvider chỉ giao tiếp với AI Provider.

---

## Dependency Injection

Tất cả Service và Provider phải được khởi tạo thông qua Dependency Injection.

Không khởi tạo trực tiếp (new) trong business logic.

---

## Interface First

Các thành phần phải làm việc thông qua Interface.

Ví dụ:

- IValidationService
- IPromptBuilder
- IKnowledgeProvider
- ILLMProvider

Không phụ thuộc trực tiếp vào implementation.

---

## Async First

Tất cả thao tác I/O đều sử dụng async/await.

Bao gồm:

- Đọc file
- Đọc Knowledge
- Gọi AI
- Gọi API

---

## Provider Pattern

ValidationService không biết đang sử dụng GPT, Gemini, GLM hay Qwen.

ValidationService chỉ giao tiếp với ILLMProvider.

Việc lựa chọn AI Provider thuộc trách nhiệm của Provider.

---

# Kiến trúc tổng thể

Chrome Extension

↓

Validation Controller

↓

Validation Service

├───────────────┐

↓               ↓

Knowledge Provider     Prompt Builder

└──────────┬───────────┘

↓

LLM Provider

↓

JSON Parser

↓

Validation Result

↓

Chrome Extension

---

# Trách nhiệm từng thành phần

## Validation Controller

Chịu trách nhiệm:

- Nhận HTTP Request.
- Kiểm tra Request hợp lệ.
- Gọi ValidationService.
- Trả về HTTP Response.

Không chứa business logic.

---

## Validation Service

Là trung tâm điều phối của hệ thống.

Chịu trách nhiệm:

- Phân tích Request.
- Quyết định có cần dữ liệu tham chiếu hay không.
- Gọi KnowledgeProvider khi cần.
- Gọi PromptBuilder.
- Gọi LLMProvider.
- Parse kết quả.
- Trả về ValidationResult.

ValidationService không biết Prompt được tạo như thế nào.

ValidationService không biết AI Provider nào đang được sử dụng.

---

## Knowledge Provider

Chịu trách nhiệm cung cấp dữ liệu tham chiếu.

Ví dụ:

- ICD
- Thuốc
- DVKT
- CLS
- Danh mục BHYT
- Các dữ liệu nghiệp vụ khác

Nguồn dữ liệu có thể là:

- JSON
- Database
- API
- Vector Database (trong tương lai)

ValidationService không phụ thuộc nguồn dữ liệu.

---

## Prompt Builder

Chịu trách nhiệm xây dựng Prompt gửi tới AI.

Prompt được tạo từ:

- System Prompt
- Validation Rules
- Knowledge
- Form Snapshot
- Output Schema

Prompt không được hard-code trong C#.

---

## LLM Provider

Chịu trách nhiệm giao tiếp với mô hình AI.

Có thể triển khai:

- OpenAI
- Azure OpenAI
- Gemini
- GLM
- Qwen
- Local Model

ValidationService không phụ thuộc vào bất kỳ AI Provider nào.

---

## JSON Parser

Chịu trách nhiệm chuyển kết quả trả về từ AI thành ValidationResult.

Nếu AI trả về dữ liệu không hợp lệ thì Parser phải xử lý lỗi phù hợp.

---

# Luồng xử lý

1. Chrome Extension gửi Form Snapshot.

2. Validation Controller tiếp nhận Request.

3. ValidationService phân tích Request.

4. ValidationService quyết định có cần dữ liệu tham chiếu hay không.

5. Nếu cần, gọi KnowledgeProvider.

6. PromptBuilder tạo Prompt hoàn chỉnh.

7. LLMProvider gửi Prompt tới AI Provider.

8. AI Provider trả về JSON.

9. JSON Parser chuyển thành ValidationResult.

10. Validation Controller trả kết quả cho Chrome Extension.

---

# Danh mục HIS theo cơ sở KCB và cây đơn vị

Các rule đối chiếu XML 130 (thuốc, dịch vụ kỹ thuật, nhân viên, đơn vị chuyển tuyến)
không dùng một danh mục dùng chung mà dùng **danh mục của đúng cơ sở KCB đang bị kiểm tra**.
Mã cơ sở lấy từ thẻ `MACSKCB` trong envelope XML 130, khớp với cột `DVTT` của file danh mục
HIS xuất ra và với thuộc tính `data-cmu-dvtt` trên trang HIS.

## Cây đơn vị

`Data/Entities/Facility.cs` mô tả cơ sở KCB thành cây cha ↔ con:
Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã.

Tuyến dưới (trạm y tế xã) thường không tự nạp danh mục mà dùng chung danh mục do tuyến trên
ban hành. Nên khi tra danh mục, `Providers/Catalog/FacilityTreeProvider.cs` dựng một **chuỗi
ưu tiên** `[chính nó, cha, ông, ...]`:

- Dừng ngay tại đơn vị nào tắt cờ `InheritCatalogFromParent`.
- Giới hạn `MaxDepth = 10` để dữ liệu lỗi (vòng cha ↔ con) không làm lặp vô hạn.
- Cây được cache trong `IMemoryCache`; mọi thao tác thêm/sửa/xóa đơn vị phải gọi `Invalidate()`.
- Mã cơ sở chưa khai báo trong cây → chuỗi chỉ có một phần tử là chính nó (giữ nguyên hành vi cũ).

`Providers/Catalog/CatalogLookupProvider.cs` giải chuỗi này **theo từng loại danh mục**:
loại nào cũng lấy đơn vị đứng trước nhất trong chuỗi có nạp loại đó. Vì xét theo từng loại nên
một cơ sở có thể dùng danh mục thuốc của riêng mình mà vẫn mượn danh mục nhân viên của cấp trên.
Loại nào không đơn vị nào trong chuỗi có thì rule **bỏ qua** thay vì báo sai hàng loạt.

`Controllers/FacilityController.cs` quản trị cây (`/api/facility`, `/tree`, `/{code}/catalog-scope`).
Xóa một đơn vị KHÔNG xóa nhánh con: đơn vị con trở thành đơn vị gốc, danh mục đã nạp giữ nguyên.

## Nạp danh mục

`Services/Catalog/CatalogImportService.cs`:

- Mã cơ sở lấy từ cột `DVTT` trong file; file không có cột đó (nhân viên, đơn vị chuyển tuyến)
  thì dùng `facilityOverride` do người nạp chỉ định.
- File chứa nhiều mã cơ sở khác nhau → từ chối, vì danh mục phải đi theo từng đơn vị.
- Mỗi lần nạp tính `SHA-256` nội dung file, lưu vào `CatalogSource.ContentHash`. Với
  `skipIfUnchanged=true` (luồng extension nạp cả bộ), file trùng hash bản đang hiệu lực sẽ bị
  **bỏ qua** thay vì nạp lại hàng chục nghìn dòng.
- Nạp thành công thì tự tạo đơn vị trong cây nếu mã cơ sở chưa có (`EnsureFacilityAsync`).

`Providers/Catalog/ExcelCatalogReader.cs` phải loại **dòng tiêu đề bị in lại giữa file**:
HIS xuất danh mục theo trang, hết mỗi trang lại chèn một dòng trống + một dòng tiêu đề y hệt
dòng đầu. Không loại thì dòng đó thành một mục danh mục rác, và cột `DVTT` nhận thêm giá trị
`"DVTT"` khiến file bị hiểu nhầm là gộp nhiều cơ sở KCB.

## Kho tri thức tách khỏi nạp danh mục

Import danh mục **không** tự nạp toàn văn vào kho tri thức RAG nữa
(`CatalogController.ImportAsync` mặc định `knowledge=false`). Nạp kho tri thức là thao tác
chủ động trên màn hình Danh mục HIS: `POST/DELETE /api/catalog/sources/{id}/knowledge` cho
từng dòng, `POST /api/catalog/sources/knowledge` cho nhiều dòng. Danh mục nạp từ trước khi hệ
thống lưu file gốc thì báo lỗi rõ và dừng, không dựng lại nội dung từ bảng đối chiếu.

---

# Nguyên tắc mở rộng

Trong tương lai hệ thống có thể bổ sung:

- Rule Engine
- RAG
- Vector Database
- Multi AI Provider
- Cache
- Logging
- Audit
- Telemetry

Việc bổ sung các thành phần này không được làm thay đổi API Contract giữa Chrome Extension và AI Validation API.

---

# Phạm vi trách nhiệm

## Chrome Extension

Chịu trách nhiệm:

- Theo dõi thay đổi trên giao diện HIS.
- Thu thập Form Snapshot.
- Thực hiện Local Validation.
- Gửi dữ liệu lên AI Validation API.
- Hiển thị lỗi, cảnh báo và gợi ý.

Không chứa nghiệp vụ kiểm tra y tế.

---

## AI Validation API

Chịu trách nhiệm:

- Thực hiện kiểm tra nghiệp vụ.
- Thu thập Knowledge.
- Xây dựng Prompt.
- Gọi AI Provider.
- Phân tích kết quả.
- Trả về ValidationResult.

Toàn bộ nghiệp vụ Validate được tập trung tại AI Validation API để giảm logic trong Extension và dễ bảo trì khi quy tắc thay đổi.