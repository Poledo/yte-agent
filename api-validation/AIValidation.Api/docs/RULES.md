# Quy tắc phát triển

## Coding

- Sử dụng Dependency Injection.
- Ưu tiên Interface.
- Tất cả API sử dụng async/await.
- Không viết business logic trong Controller.
- Không hard-code Prompt trong C#.
- Không gọi trực tiếp LLM từ Controller.
- Không sử dụng static cho business logic.

---

## AI

- Prompt được quản lý riêng.
- Prompt có thể thay đổi mà không cần sửa code.
- Luôn yêu cầu AI trả về JSON hợp lệ.

---

## Validation

Ưu tiên:

1. Local Validation (Extension)
2. AI Validation (API)

Không xây dựng Rule Engine riêng ở giai đoạn đầu.

Ưu tiên để AI thực hiện toàn bộ kiểm tra nghiệp vụ.

Nếu một nhóm quy tắc được sử dụng thường xuyên hoặc ảnh hưởng đến hiệu năng, có thể tách thành Rule Engine trong tương lai mà không thay đổi API.