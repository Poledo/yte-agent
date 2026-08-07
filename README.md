# yte-agent — ZeroCheck AI

> Trợ lý AI cảnh báo xuất toán BHYT cho phần mềm khám chữa bệnh (HIS) của VNPT.
> Sản phẩm của đội **Chiến binh Y tế số**. Bản chạy thật: <https://cbyts.vnpt.vn>

Kho mã hợp nhất (monorepo) của 3 thành phần. Trước đây mỗi thành phần là một repo riêng;
từ 08/08/2026 gộp về đây để phát triển chung một nơi.

## Cấu trúc

| Thư mục | Thành phần | Công nghệ | Tài liệu riêng |
|---|---|---|---|
| [`api-validation/`](api-validation) | AI Validation API — rule engine, kiểm tra XML 130, RAG văn bản y tế, xác thực & phân quyền | .NET 10, EF Core, PostgreSQL + pgvector | [`README`](api-validation/README.md), [`CLAUDE.md`](api-validation/CLAUDE.md), [`AIValidation.Api/docs/`](api-validation/AIValidation.Api/docs) |
| [`web-admin/`](web-admin) | Web Admin — dashboard, kho tri thức, danh mục HIS, người dùng/vai trò/quyền, cấu hình AI | Angular 20, Material 3 | [`README`](web-admin/README.md) |
| [`extension-his/`](extension-his) | Chrome Extension cắm vào HIS — cảnh báo nhập liệu, chat kiểm tra hồ sơ, nạp danh mục | TypeScript, Vite | [`README`](extension-his/README.md), [`CLAUDE.md`](extension-his/CLAUDE.md), [`ARCHITECTURE`](extension-his/ARCHITECTURE.md) |

Đang làm gì / còn nợ gì: xem [`DANG-LAM-GI.md`](DANG-LAM-GI.md).

## Chạy tại máy

```bash
# API — cần PostgreSQL đang chạy
cd api-validation/AIValidation.Api
dotnet user-secrets set "ConnectionStrings:KnowledgeDatabase" "Host=localhost;Port=5432;Database=hackathon_ai;Username=postgres;Password=<mật khẩu máy bạn>"
dotnet ef database update
dotnet run          # http://localhost:5075, Scalar UI tại /scalar
```

```bash
# Web admin
cd web-admin && npm install && npm start        # http://localhost:4200
```

```bash
# Extension — build rồi Load unpacked thư mục extension/dist trong chrome://extensions
cd extension-his/extension && npm ci && npm run build
```

Chuỗi kết nối, khóa LLM, mật khẩu SMTP **luôn để trong user-secrets hoặc secret của cụm**,
không bao giờ ghi vào file trong kho này.

## CI/CD

Toàn bộ pipeline nằm ở [`.github/workflows/`](.github/workflows) tại gốc kho (GitHub chỉ đọc
workflow ở đây). Mỗi workflow lọc `paths:` theo thư mục của mình nên sửa web-admin không kéo
theo build của API.

| Workflow | Kích hoạt | Làm gì |
|---|---|---|
| [`api-validation.yml`](.github/workflows/api-validation.yml) | push/PR `master` chạm `api-validation/**` | test + `dotnet format` + soi CVE → build image → push ECR → `kubectl apply` + rollout |
| [`web-admin.yml`](.github/workflows/web-admin.yml) | push/PR `master` chạm `web-admin/**` | `npm test` + `npm audit` → build image → push ECR → rollout |
| [`extension-his.yml`](.github/workflows/extension-his.yml) | push/PR `master` chạm `extension-his/**` | tsc + lint + test + audit + build, chặn `dist/` cũ, lưu bản unpacked làm artifact |
| [`extension-release.yml`](.github/workflows/extension-release.yml) | tag `extension-v1.2.3` | đóng gói `.zip` + tạo GitHub Release (tag phải khớp version trong manifest) |
| [`security-scan.yml`](.github/workflows/security-scan.yml) | push/PR `master`, hằng tuần | gitleaks quét cả kho |

**Push lên `master` là deploy thẳng lên cụm production** — pull request thì chỉ chạy test.

Trước khi deploy chạy được phải khai 4 secrets ở *Settings > Secrets and variables > Actions*:
`ECR_ID`, `ECR_USER`, `ECR_PASSWORD`, `KUBE_CONFIG`. Chưa khai đủ thì job `kiem-tra-secrets`
báo warning và **bỏ qua** phần triển khai, CI vẫn xanh chứ không đỏ.

## Nguồn gốc

Ba repo cũ vẫn còn, giữ toàn bộ lịch sử commit và tag `release-v2-final` đã nộp BTC —
tra `git log`/`git blame` các thay đổi trước 08/08/2026 ở đó:

- <https://github.com/Poledo/hackathon-api-validation>
- <https://github.com/Poledo/hackathon-web-admin>
- <https://github.com/Poledo/hackathon-extension-his>
