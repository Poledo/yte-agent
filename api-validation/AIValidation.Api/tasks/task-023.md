Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

# Task-023: Phân tích nghiệp vụ và xây dựng Rule Catalog cho AI Validation Platform

## Bối cảnh

Hệ thống AI Validation hiện đang được phát triển cho VNPT-HIS.

Mục tiêu của hệ thống là kiểm tra dữ liệu nghiệp vụ trước khi lưu hoặc thực hiện các thao tác quan trọng.

Sau khi đánh giá kiến trúc hiện tại, quyết định thay đổi định hướng:

- Rule Engine sẽ là cơ chế kiểm tra chính.
- AI chỉ đóng vai trò hỗ trợ (AI Review / Semantic Validation / Explanation).
- Không gọi LLM cho mọi request.

Trước khi thiết kế Database và Rule Engine, cần phân tích đầy đủ nghiệp vụ để xây dựng Rule Catalog.

Đây là task phân tích.

KHÔNG được triển khai code.

KHÔNG được thiết kế Database.

KHÔNG được thiết kế Entity.

KHÔNG được thiết kế API.

==================================================================

## Input

Trước khi thực hiện task, hãy đọc toàn bộ tài liệu trong:

docs/analysis/

Bao gồm:

- 01_Forms/
    Ảnh chụp các màn hình của hệ thống HIS.

- 02_Rules/
    File Excel mô tả các quy tắc nghiệp vụ.

- 03_Icd_data/
    Danh sách các mã ICD-10

Đây là nguồn thông tin nghiệp vụ chính.

Không tự suy đoán nếu tài liệu chưa đề cập.

Nếu phát hiện thiếu hoặc mâu thuẫn, hãy ghi nhận vào phần Questions.

==================================================================

## Mục tiêu

Phân tích toàn bộ nghiệp vụ.

Xây dựng Rule Catalog đầy đủ.

Phân loại các Rule.

Làm nền tảng cho các task thiết kế tiếp theo.

==================================================================

## Yêu cầu

### 1. Phân tích màn hình

Đối với từng màn hình:

- Tên màn hình
- Mục đích
- Luồng nghiệp vụ
- Các nhóm thông tin
- Danh sách Field
- Các Button
- Các Event quan trọng

==================================================================

### 2. Phân tích Rule

Đọc toàn bộ Rules.xlsx.

Liệt kê đầy đủ:

- Rule Name
- Module
- Form
- Field
- Trigger/Event
- Điều kiện
- Kết quả mong muốn

==================================================================

### 3. Phân loại Rule

Mỗi Rule phải được phân loại.

Ví dụ:

- Local Validation
- Database Validation
- Mapping Validation
- External API Validation
- AI Validation

Nếu cần có thể bổ sung thêm loại mới.

Giải thích lý do phân loại.

==================================================================

### 4. Phân tích nguồn dữ liệu

Đối với mỗi Rule, xác định:

- Dữ liệu lấy từ Form
- Dữ liệu lấy từ Database
- Dữ liệu lấy từ API
- Dữ liệu lấy từ AI

==================================================================

### 5. Phân tích Trigger

Xác định Rule chạy khi nào.

Ví dụ:

- On Change
- On Blur
- On Click
- On Save
- On Submit
- Background
- Theo thời gian thực

==================================================================

### 6. Phân tích mức độ

Đối với mỗi Rule xác định:

- Info
- Warning
- Error

Đồng thời xác định:

- Có cho phép tiếp tục hay không
- Chỉ cảnh báo
- Chặn thao tác
- Chỉ ghi log

==================================================================

### 7. Rule Dependency

Xác định các Rule phụ thuộc nhau.

Ví dụ:

Rule B chỉ chạy khi Rule A thành công.

Rule C chỉ chạy nếu có dữ liệu.

...

==================================================================

### 8. Rule Catalog

Xây dựng Rule Catalog hoàn chỉnh.

Mỗi Rule tối thiểu gồm:

- Rule Code
- Rule Name
- Module
- Form
- Field
- Trigger
- Rule Type
- Data Source
- Severity
- Allow Continue
- Description

==================================================================

### 9. Workflow Analysis

Phân tích Validation Workflow của từng màn hình.

Ví dụ:

Tiếp nhận

↓

Validation

↓

Khám

↓

Validation

↓

CLS

↓

Validation

...

==================================================================

### 10. Questions

Nếu phát hiện:

- Rule chưa rõ
- Thiếu dữ liệu
- Mâu thuẫn
- Thiếu màn hình

Không được tự quyết định.

Hãy lập danh sách Questions cần xác nhận.

==================================================================

## Deliverables

Không viết code.

Không tạo Entity.

Không tạo Database.

Không tạo API.

Chỉ tạo tài liệu phân tích bao gồm:

1. Screen Analysis
2. Field Inventory
3. Rule Analysis
4. Rule Classification
5. Data Source Analysis
6. Trigger Analysis
7. Rule Dependency
8. Rule Catalog
9. Validation Workflow
10. Questions / Missing Information

==================================================================

## Mục tiêu cuối cùng

Sau khi hoàn thành Task-023 phải có đủ thông tin để triển khai các task tiếp theo như:

- Thiết kế Rule Engine
- Thiết kế Database
- Thiết kế Entity Framework
- Thiết kế Validation Pipeline
- Thiết kế API
- AI Integration

mà không cần phân tích nghiệp vụ lại.