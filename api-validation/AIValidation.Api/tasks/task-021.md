Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-021

Mục tiêu

Xây dựng Health Check API phục vụ kiểm tra trạng thái hệ thống.

Đây là endpoint dành cho Developer.

Không phục vụ nghiệp vụ.

Không gọi AI.

Không validate dữ liệu HIS.

==================================================

Yêu cầu

Tạo HealthController.

Base Route:

/api/health

==================================================

Endpoint 1

GET /api/health

Trả về:

- status
- version
- environment
- serverTime

==================================================

Endpoint 2

GET /api/health/database

Kiểm tra:

await AppDbContext.Database.CanConnectAsync()

Trả về:

- status
- database = PostgreSQL
- canConnect

==================================================

Endpoint 3

GET /api/health/repository

Sử dụng IKnowledgeRepository.

Đọc thử 1 KnowledgeItem.

Không hard-code SQL.

Nếu thành công trả về:

- status
- sampleCode
- sampleCategory

==================================================

Không gọi:

- PromptBuilder
- LLM
- ValidationService

==================================================

Coding Rules

- Async/Await
- Dependency Injection
- XML Documentation
- RESTful API
- Không hard-code dữ liệu trả về ngoài version và database type.
- Không sửa business logic hiện có.

==================================================

Sau khi hoàn thành

Giải thích:

1. Health API dùng để làm gì.

2. Cách test bằng Scalar.

3. Ý nghĩa từng endpoint.

4. Chờ yêu cầu tiếp theo.