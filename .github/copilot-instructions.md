# Copilot Instructions

Kho này là monorepo 3 thành phần. Quy định đầy đủ cho AI agent nằm ở file `CLAUDE.md`
của từng thành phần — đọc file tương ứng với thư mục đang sửa trước khi làm:

- [`api-validation/CLAUDE.md`](../api-validation/CLAUDE.md)
- [`extension-his/CLAUDE.md`](../extension-his/CLAUDE.md)

Tóm tắt hai điểm quan trọng nhất, áp dụng cho cả kho:

- **Tiếng Việt**: mọi validation message, suggestion, guidance và log trả về người dùng phải bằng tiếng Việt (tên class/method/biến vẫn tiếng Anh).
- **Không tạo file rác**: không tự sinh `*-completion.md`, `*-summary.md`, `*-checklist.md`, `*-quick-reference.md`, `FIX-*.md`… sau mỗi task. Báo cáo kết quả trực tiếp trong chat; kiến thức lâu dài thì cập nhật vào `api-validation/AIValidation.Api/docs/` đã có.
