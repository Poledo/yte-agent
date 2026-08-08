# Tổng hợp công việc đã thực hiện — "Chiến binh y tế số"

> Hệ thống cảnh báo xuất toán BHYT trên HIS VNPT.
> Cập nhật: 28/07/2026.

Kiến trúc: 2 repo — `api-validation` (.NET 10 + PostgreSQL/pgvector, nhánh `master`) và `web-admin` (Angular 22, nhánh `master`) + extension HIS. Triển khai thật trên VNPT Cloud (K8s namespace `cbyts`), live tại **https://cbyts.vnpt.vn**.

---

## 1. Chức năng lõi

| Hạng mục | Nội dung |
|---|---|
| **Kiểm tra hồ sơ XML 130** | Parser generic + đặc tả **455 trường / 15 bảng** (`field_specs.json`, theo QĐ130/QĐ4750) + **6 rule C#** + catalog **100 rule liên trường**. |
| **Kiểm tra chéo lô** | Đối chiếu nhiều hồ sơ cùng lúc: trùng giường, một bác sĩ làm nhiều bệnh nhân cùng thời điểm, trùng đợt điều trị. Hỗ trợ streaming NDJSON cho lô lớn. |
| **Import đặc tả XML130** | Nạp lại file Excel đặc tả (QĐ130/QĐ4750/điều chỉnh 2024, 16 sheet): merge thông minh, tự suy luận format ngày / enum / trường bắt buộc. Validation tự áp bảng mới, không hardcode. |
| **RAG hỏi đáp văn bản y tế** | Truy hồi hybrid pgvector (bge-m3) + full-text `ts_rank`, reranker chống nhiễu, trích dẫn `[Nguồn n]`, từ chối khi thiếu căn cứ. |
| **Extension HIS** | Chat panel hỏi đáp + kiểm tra XML ngay trong màn hình HIS. |

## 2. Nền tảng & bảo mật

- **RBAC**: ASP.NET Core Identity + phân quyền fine-grained (Permission "Resource.Action"), JWT + refresh token, đăng nhập Google/Microsoft.
- **Web-admin Angular 22**: quản trị tài liệu, upload kéo-thả nhiều file (progress từng file), gán vai trò, cấu hình LLM & ngưỡng chống spam runtime.
- **Quên mật khẩu qua email thật** (SMTP Gmail App Password) — gửi link đặt lại, không lộ token.
- **Chống spam (rate limit)** theo IP thật (đọc `X-Forwarded-For` sau ingress/LB): giới hạn toàn cục + siết riêng login/forgot-password/ask/import; ngưỡng chỉnh từ web-admin, áp dụng ngay không cần restart.

## 3. Triển khai thật (VNPT Cloud)

- CI/CD GitHub Actions → VNPT ECR → K8s namespace `cbyts` (3 node ci.xlarge).
- PostgreSQL 16 + pgvector trong cụm; Ollama bge-m3 (embedding) chạy CPU.
- **Đã LIVE internet**: `https://cbyts.vnpt.vn` (HTTPS cert `*.vnpt.vn`), vào qua add-on ingress-nginx đúng chuẩn nền tảng.
- Migrate dữ liệu RAG lên cụm; dọn DB (hard-delete + VACUUM); HNSW index active.
- Fix idle-timeout LB (streaming keepalive) để câu trả lời AI online 15–20s không bị cắt.

## 4. Minh chứng ứng dụng AI (prompt + log thật)

Tài liệu `api-validation/docs/AI-EVIDENCE.md` gồm:

- **Prompt nguyên văn** cho cả 3 điểm ứng dụng AI: RAG hỏi đáp, nhận định nguy cơ xuất toán XML130, validate form nhập liệu.
- **Log chạy thật bắt live trên production** (28/07/2026): request/response thật tới `https://cbyts.vnpt.vn/api/assistant/ask` (`fromLlm:true`, trích dẫn QĐ 130/QĐ-BYT, HTTP 200, 9,49s) + trace server đầy đủ pipeline RAG (embedding bge-m3 → truy hồi pgvector + full-text → **OpenRouter `openai/gpt-4o-mini`**, prompt 6039 ký tự, 169 completion tokens).

Nguyên tắc thiết kế: **rule engine quyết định đạt/không đạt (deterministic), AI chỉ suy luận và diễn giải ngôn ngữ** — AI không có quyền phán hồ sơ.

## 5. Sản phẩm nghiệm thu

- Mã nguồn 2 repo private, tag `release-v2-final` đã trỏ về HEAD.
- Tài liệu `docs/` 6 nhóm: `AI-EVIDENCE`, `ARCHITECTURE-V2`, `FEATURES`, `INSTALLATION`, `OPERATIONS`, `PERFORMANCE-SECURITY`.
- Slide báo cáo + video hướng dẫn (~5,4 phút) trong thư mục `report/`.

## 6. Trạng thái / còn lại

- **Chưa push**: chống spam (rate limit) + cập nhật responsive web-admin + `AI-EVIDENCE.md` prompt/log — đang chờ duyệt deploy.
- Video demo bản chính thức: theo yêu cầu ≤5 phút (bản hiện 5,4 phút).
