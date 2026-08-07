Đọc toàn bộ tài liệu trong thư mục docs trước khi thực hiện.

Đọc toàn bộ Models, Interfaces, Configuration và Prompt System đã được tạo ở các Task trước.

==================================================

Task-006

Mục tiêu:

Thiết kế lại Knowledge Layer theo hướng mở rộng.

Knowledge Layer chịu trách nhiệm cung cấp dữ liệu tham chiếu cho PromptBuilder.

Knowledge Layer không gọi AI.

Knowledge Layer không tạo Prompt.

Knowledge Layer không chứa business logic Validate.

==================================================

1. Cập nhật Models

Tạo model mới:

KnowledgeDocument

Bao gồm các thuộc tính:

- string Name
- string Category
- string Content
- double? Score
- Dictionary<string, string>? Metadata

KnowledgeDocument đại diện cho một đơn vị dữ liệu tham chiếu.

Nguồn dữ liệu có thể đến từ:

- File
- Database
- API
- Vector Database
- RAG

==================================================

2. Cập nhật Interface

Cập nhật:

IKnowledgeProvider

thành:

Task<IReadOnlyList<KnowledgeDocument>> GetKnowledgeAsync(
    ValidationRequest request,
    CancellationToken cancellationToken = default);

--------------------------------------------------

Tạo Interface mới:

IKnowledgeSource

Bao gồm:

Task<IReadOnlyList<KnowledgeDocument>> GetDocumentsAsync(
    ValidationRequest request,
    CancellationToken cancellationToken = default);

Mỗi KnowledgeSource đại diện cho một nguồn dữ liệu.

==================================================

3. Cập nhật KnowledgeProvider

KnowledgeProvider không đọc file trực tiếp.

KnowledgeProvider nhận IEnumerable<IKnowledgeSource> thông qua Dependency Injection.

KnowledgeProvider có nhiệm vụ:

- Gọi tất cả KnowledgeSource.
- Tổng hợp kết quả.
- Loại bỏ dữ liệu trùng nếu cần (chỉ để TODO, chưa implement).
- Trả về IReadOnlyList<KnowledgeDocument>.

Không viết business logic.

Method chỉ throw NotImplementedException.

==================================================

4. Tạo Knowledge Sources

Tạo thư mục:

Knowledge/

Knowledge/Sources/

--------------------------------------------------

Tạo class:

FileKnowledgeSource

Implement:

IKnowledgeSource

Chỉ tạo skeleton.

Không đọc file.

Method chỉ throw NotImplementedException.

--------------------------------------------------

Để TODO cho các nguồn dữ liệu tương lai:

- DatabaseKnowledgeSource
- ApiKnowledgeSource
- VectorKnowledgeSource

Không tạo các class này.

==================================================

5. Dependency Injection

Đăng ký:

services.AddScoped<IKnowledgeProvider, KnowledgeProvider>();

services.AddScoped<IKnowledgeSource, FileKnowledgeSource>();

==================================================

6. Thư mục Knowledge

Nếu chưa có, tạo:

Knowledge/

Bên trong tạo:

Knowledge/
    ICD/
    DVKT/
    Drug/
    Insurance/
    Rules/

Trong mỗi thư mục tạo README.md mô tả mục đích.

Không thêm dữ liệu thật.

==================================================

Yêu cầu coding

- Không gọi AI.
- Không đọc file.
- Không truy cập Database.
- Không thêm business logic.
- Không hard-code đường dẫn.
- Constructor Injection.
- XML Summary đầy đủ.
- Nullable Reference Types.
- Async/Await.
- Namespace rõ ràng.
- Tuân thủ SOLID.

==================================================

Sau khi hoàn thành

1. Giải thích vai trò của:
   - KnowledgeProvider
   - IKnowledgeSource
   - KnowledgeDocument

2. Giải thích vì sao sử dụng IEnumerable<IKnowledgeSource> thay vì chỉ một FileKnowledgeSource.

3. Giải thích cách mở rộng sang:
   - SQL Server
   - REST API
   - Vector Database
   - RAG

4. Chờ yêu cầu tiếp theo.