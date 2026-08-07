Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-020

Mục tiêu:

Hoàn thiện tầng Knowledge Database để phục vụ AI Validation.

Đây là nền tảng dữ liệu cho toàn bộ hệ thống.

Không thay đổi kiến trúc hiện tại.

Không sửa ValidationService.

Không sửa Controller.

Không sửa PromptBuilder.

==================================================

1. Rà soát mô hình dữ liệu

Đánh giá lại Entity KnowledgeItem hiện tại.

Nếu cần, bổ sung các trường phục vụ AI Validation.

Ví dụ:

- Category
- Code
- Name
- Description
- Content
- Metadata (JSONB)
- IsActive
- CreatedAt
- UpdatedAt

Không hard-code dữ liệu nghiệp vụ.

==================================================

2. PostgreSQL

Sử dụng PostgreSQL làm Knowledge Database.

Kiểm tra lại:

- Migration
- Fluent API
- Index
- Constraint

Đảm bảo cấu trúc sẵn sàng cho dữ liệu lớn.

==================================================

3. Repository

Hoàn thiện KnowledgeRepository.

Hỗ trợ các truy vấn:

- Theo Category
- Theo Code
- Theo nhiều Code
- Theo trạng thái IsActive

Sử dụng LINQ.

Không dùng SQL Raw.

==================================================

4. KnowledgeProvider

Hoàn thiện KnowledgeProvider.

KnowledgeProvider có nhiệm vụ:

- Nhận ValidationRequest.
- Xác định loại dữ liệu cần lấy.
- Gọi KnowledgeRepository.
- Chuyển Entity thành KnowledgeDocument.
- Trả về PromptBuilder.

Không kiểm tra đúng/sai nghiệp vụ.

Không gọi AI.

==================================================

5. Seed dữ liệu mẫu

Chỉ tạo dữ liệu mẫu để kiểm thử pipeline.

Bao gồm:

Category:

- ICD
- Procedure
- Drug
- InsuranceRule

Mỗi loại từ 3 đến 5 bản ghi.

Không import toàn bộ danh mục.

==================================================

6. Metadata

Thiết kế Metadata dưới dạng JSONB.

Ví dụ:

{
    "gender": "Female",
    "minAge": 18,
    "maxAge": null,
    "pregnancyOnly": true
}

Chưa sử dụng trong business logic.

Chỉ chuẩn bị cho các Task sau.

==================================================

7. Logging

Ghi log số lượng KnowledgeDocument được lấy.

Không log toàn bộ nội dung Knowledge.

==================================================

Yêu cầu coding

- PostgreSQL.
- EF Core.
- Async/Await.
- CancellationToken.
- XML Summary.
- Nullable Reference Types.
- Repository Pattern.
- Không thêm business rule.
- Không hard-code Prompt.
- Không hard-code AI.

==================================================

Sau khi hoàn thành

1. Giải thích thiết kế của Knowledge Database.

2. Giải thích vì sao sử dụng Metadata (JSONB).

3. Giải thích luồng:

ValidationRequest
↓

KnowledgeRepository
↓

KnowledgeProvider
↓

KnowledgeDocument
↓

PromptBuilder

4. Giải thích cách mở rộng để sau này hỗ trợ:

- ICD
- Procedure
- Drug
- Insurance
- Guideline
- Laboratory
- Imaging

5. Chờ yêu cầu tiếp theo.