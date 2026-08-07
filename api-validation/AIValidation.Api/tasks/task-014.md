Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-014

Mục tiêu:

Bắt đầu triển khai Knowledge Repository để KnowledgeProvider có thể lấy dữ liệu từ PostgreSQL.

Chỉ triển khai tầng truy cập dữ liệu.

Không viết business logic.

Không sửa ValidationService.

Không sửa PromptBuilder.

Không sửa LLMProvider.

==================================================

1. Thiết lập Entity Framework Core

Sử dụng:

- Npgsql.EntityFrameworkCore.PostgreSQL

Tạo:

Data/

AppDbContext

==================================================

2. Tạo Entity mẫu

KnowledgeItem

Bao gồm:

- Id
- Category
- Code
- Name
- Content
- IsActive
- CreatedAt
- UpdatedAt

Đây là entity tổng quát, chưa tách ICD, DVKT, Drug.

==================================================

3. Cấu hình EF Core

- DbSet<KnowledgeItem>
- Fluent API
- Khóa chính
- Index cho:
    - Category
    - Code

Không thêm business rule.

==================================================

4. Tạo Repository

Interfaces/

IKnowledgeRepository

Method:

Task<IReadOnlyList<KnowledgeItem>> SearchAsync(
    string category,
    string? keyword,
    CancellationToken cancellationToken = default);

--------------------------------------------------

Repositories/

KnowledgeRepository

Implement IKnowledgeRepository.

Chỉ triển khai truy vấn cơ bản bằng EF Core.

==================================================

5. Cập nhật KnowledgeProvider

KnowledgeProvider sử dụng IKnowledgeRepository thay vì đọc file.

Chưa cần ghép Prompt.

Chưa cần Vector Search.

==================================================

6. Dependency Injection

Đăng ký:

- AppDbContext
- IKnowledgeRepository

Đọc ConnectionString từ appsettings.json.

==================================================

Yêu cầu coding

- EF Core.
- Async/Await.
- CancellationToken.
- XML Summary.
- Nullable Reference Types.
- Không dùng SQL raw.
- Không thêm business logic.
- Tuân thủ Repository Pattern.

==================================================

Sau khi hoàn thành:

1. Giải thích kiến trúc Repository.

2. Giải thích vai trò của AppDbContext.

3. Giải thích vì sao KnowledgeProvider không truy cập DbContext trực tiếp.

4. Chờ yêu cầu tiếp theo.