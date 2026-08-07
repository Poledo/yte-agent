# CLAUDE.md

Hướng dẫn cho Claude Code (và các AI agent khác) khi làm việc trong repo này.

## Dự án

API validation hồ sơ khám chữa bệnh (.NET 10, EF Core, PostgreSQL). Chỉ có **một** project duy nhất: `AIValidation.Api`, khai báo trong `AIValidation.slnx`.

Kiến trúc và quy ước đọc ở `AIValidation.Api/docs/`:

| File | Nội dung |
|---|---|
| `docs/PROJECT.md` | Phạm vi, mục tiêu dự án |
| `docs/ARCHITECTURE.md` | Kiến trúc, luồng xử lý, trách nhiệm từng lớp |
| `docs/DECISIONS.md` | Các quyết định thiết kế và lý do |
| `docs/RULES.md` | Quy ước code |
| `docs/RULE_IMPLEMENTATIONS.md` | Danh mục rule đã implement |
| `docs/analysis/RULE_CATALOG.md` | Đặc tả rule nghiệp vụ (DEM-R001…) |

## Ngôn ngữ

Mọi thông báo trả về người dùng cuối — validation message, suggestion, guidance, log — phải bằng **tiếng Việt**. Tên class, method, biến vẫn dùng tiếng Anh.

## KHÔNG tạo file rác

Đây là quy định quan trọng nhất. Repo này từng tích tụ 60 file markdown rác (~592 KB) do AI sinh ra sau mỗi task, đã phải dọn thủ công.

**Không được tự ý tạo các loại file sau** — kể cả khi thấy chúng "hữu ích":

- Báo cáo hoàn thành: `*-completion.md`, `*-COMPLETE.md`, `*-FINAL-REPORT.md`, `*-implementation-report.md`
- Tóm tắt: `*-summary.md`, `*-SUMMARY.md`, `*-explanation.md`, `*-visual-summary.md`
- Checklist / xác minh: `*-checklist.md`, `*-VERIFICATION.md`, `*-READY.md`
- Tra cứu nhanh / index: `*-quick-reference.md`, `*-INDEX.md`, `*-DOCUMENTATION-INDEX.md`
- Nhật ký debug một bug cụ thể: `FIX-*.md`, `DEBUG-*.md`

Thay vào đó:

1. **Báo cáo kết quả bằng cách trả lời trực tiếp trong chat.** Không ghi ra file. Chat là nơi để tóm tắt, không phải repo.
2. **Chỉ tạo file mới khi được yêu cầu rõ ràng**, hoặc khi đó là source code cần thiết cho chức năng.
3. Nếu phát sinh kiến thức lâu dài (thiết kế, quyết định, quy tắc nghiệp vụ), **cập nhật vào file `docs/` đã có** thay vì tạo file mới. Ví dụ: rule mới thì bổ sung `docs/RULE_IMPLEMENTATIONS.md`, quyết định thiết kế thì thêm vào `docs/DECISIONS.md`.
4. Cần file nháp, script tạm, output trung gian? Dùng thư mục temp của hệ thống, **không đặt trong repo**.
5. Nếu nghĩ rằng thật sự cần một file `.md` mới, **hỏi trước** rồi mới tạo.

## Thư mục `tasks/`

Mỗi task chỉ có **đúng một** file: `task-0NN.md`, chứa yêu cầu gốc do người dùng viết. Không tạo file vệ tinh nào quanh nó.

Không dán khối dữ liệu lớn (bundle JS, dump JSON) vào file task. Để dữ liệu tham chiếu ở `docs/analysis/` rồi trỏ đường dẫn tới. Ví dụ đã làm: `docs/analysis/icd-lookup-reference.js` được `task-028.md` và `task-029.md` cùng dùng chung.

## File load-bearing — không được xóa hay đổi tên tùy tiện

- `AIValidation.Api/Prompts/*.md` — **code đọc lúc runtime**. `PromptLoader` đọc `system.md`, `validation.md`, `output.md`; `PromptTemplateLoader` đọc `validation.system.md`, `validation.user.md`, `explanation.system.md`, `explanation.user.md`. Xóa là app chết.
- `AIValidation.Api/docs/analysis/03_Icd_data/*.json` — dữ liệu ICD, tham chiếu từ `Controllers/IcdController.cs`.

## Trước khi thay đổi code

Đọc tài liệu trong `docs/` và source code liên quan trước. Tuân thủ kiến trúc sẵn có (SRP, DI, tách interface) thay vì tự nghĩ hướng mới.
