Đọc toàn bộ source code trước khi thực hiện.

==================================================

Task-022.1

Mục tiêu

Khắc phục việc không thể test POST /api/validation bằng Scalar.

Không thay đổi kiến trúc dự án.

Không thay đổi luồng xử lý.

Chỉ sửa những lỗi cần thiết để API có thể nhận request đúng.

==================================================

Yêu cầu

1. Đọc toàn bộ các model:

- ValidationRequest
- ValidationContext
- FormSnapshot
- Patient
- Encounter
- Diagnosis
- Procedure
- Medicine

và toàn bộ model con.

==================================================

2. Kiểm tra ValidationController.

Đảm bảo endpoint:

POST /api/validation

có thể nhận request đúng.

==================================================

3. Kiểm tra các thuộc tính required.

Nếu lỗi do khai báo model thì sửa theo cách phù hợp.

Không làm giảm tính an toàn của model.

==================================================

4. Sinh file:

docs/sample-validation-request.json

Yêu cầu:

- Khớp 100% với ValidationRequest hiện tại.
- Đầy đủ tất cả required property.
- Đúng kiểu dữ liệu.
- Có dữ liệu mẫu hợp lệ.
- Có thể copy trực tiếp vào Scalar để test.

==================================================

5. Nếu phát hiện model hiện tại thiết kế chưa hợp lý cho API thì đề xuất cải tiến.

Chỉ đề xuất.

Không tự ý thay đổi thiết kế.

==================================================

6. Không sửa:

- ValidationService
- PromptBuilder
- KnowledgeProvider
- LLMProvider
- Repository
- Database

==================================================

Sau khi hoàn thành:

1. Giải thích nguyên nhân gây lỗi.

2. Liệt kê các thay đổi đã thực hiện.

3. Hiển thị JSON mẫu hoàn chỉnh để test.

4. Xác nhận POST /api/validation có thể test bằng Scalar.

5. Chờ yêu cầu tiếp theo.