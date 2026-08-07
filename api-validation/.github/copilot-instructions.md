# Copilot Instructions

Quy định đầy đủ cho AI agent trong repo này nằm ở [`/CLAUDE.md`](../CLAUDE.md) — đọc file đó trước.

Tóm tắt hai điểm quan trọng nhất:

- **Tiếng Việt**: mọi validation message, suggestion, guidance và log trả về người dùng phải bằng tiếng Việt (tên class/method/biến vẫn tiếng Anh).
- **Không tạo file rác**: không tự sinh `*-completion.md`, `*-summary.md`, `*-checklist.md`, `*-quick-reference.md`, `FIX-*.md`… sau mỗi task. Báo cáo kết quả trực tiếp trong chat; kiến thức lâu dài thì cập nhật vào `AIValidation.Api/docs/` đã có.
