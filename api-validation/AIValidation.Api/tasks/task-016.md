Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-016

Mục tiêu:

Hoàn thiện tầng truy cập dữ liệu sử dụng PostgreSQL làm Knowledge Database.

Knowledge Database sẽ là nguồn dữ liệu chính cho:

- ICD
- Procedure
- Drug
- Insurance Rule
- Guideline

Trong giai đoạn này chưa sử dụng pgvector.

==================================================

1.

Cài đặt các package:

- Npgsql
- Npgsql.EntityFrameworkCore.PostgreSQL
- Microsoft.EntityFrameworkCore.Design

==================================================

2.

Tạo:

Data/

AppDbContext

==================================================

3.

Cấu hình PostgreSQL trong appsettings.json

ConnectionStrings

KnowledgeDatabase

Ví dụ:

Host

Port

Database

Username

Password

Không hard-code trong source code.

==================================================

4.

Đăng ký DbContext

Program.cs

Sử dụng:

UseNpgsql()

==================================================

5.

Tạo Entity:

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

==================================================

6.

Fluent API

Cấu hình:

- Primary Key
- Required
- MaxLength
- Index:
    - Category
    - Code

==================================================

7.

Repository

Tạo:

IKnowledgeRepository

KnowledgeRepository

Triển khai:

GetIcdAsync()

GetProceduresAsync()

GetDrugsAsync()

GetRulesAsync()

Sử dụng EF Core LINQ.

Không sử dụng SQL Raw.

==================================================

8.

KnowledgeProvider

Sử dụng IKnowledgeRepository.

KnowledgeProvider chịu trách nhiệm:

- Đọc ValidationRequest.
- Lấy Knowledge phù hợp.
- Chuyển thành KnowledgeDocument.

Không kiểm tra nghiệp vụ.

Không gọi AI.

==================================================

9.

Migration

Tạo Migration đầu tiên.

Không chạy Seed dữ liệu lớn.

Chỉ tạo vài dòng dữ liệu mẫu.

==================================================

10.

Dependency Injection

Đăng ký:

DbContext

IKnowledgeRepository

KnowledgeProvider

==================================================

Yêu cầu coding

- PostgreSQL.
- EF Core.
- Async/Await.
- CancellationToken.
- XML Summary.
- Nullable Reference Types.
- Repository Pattern.
- Không hard-code SQL.
- Không sử dụng pgvector ở Task này.

==================================================

Sau khi hoàn thành

1.

Giải thích kiến trúc Data Layer.

2.

Giải thích vì sao chọn PostgreSQL.

3.

Giải thích cách mở rộng sang pgvector mà không thay đổi kiến trúc.

4.

Giải thích luồng:

ValidationRequest

↓

KnowledgeRepository

↓

KnowledgeProvider

↓

KnowledgeDocument

↓

PromptBuilder

5.

Chờ yêu cầu tiếp theo.