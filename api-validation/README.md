# ZeroCheck AI — Trợ lý AI cảnh báo xuất toán BHYT cho HIS

> Sản phẩm dự thi của đội **Chiến binh Y tế số** — VNPT.
> Bản chạy thật: <https://cbyts.vnpt.vn>

Hệ thống gồm **Chrome Extension** chạy trên phần mềm khám chữa bệnh (HIS) của VNPT, **AI Validation API** (.NET 10 + PostgreSQL + LLM) và **Web Admin** (Angular 22), giúp cơ sở KCB phát hiện sớm các lỗi dữ liệu hồ sơ bệnh án **trước khi gửi cổng giám định BHXH**, tránh bị xuất toán chi phí.

## Ba kho mã nguồn

| Repo | Nội dung |
|---|---|
| [`hackathon-api-validation`](https://github.com/Poledo/hackathon-api-validation) (repo này) | AI Validation API — rule engine, kiểm tra XML 130, RAG văn bản y tế, xác thực & phân quyền |
| [`hackathon-extension-his`](https://github.com/Poledo/hackathon-extension-his) | Chrome Extension — theo dõi form HIS, cảnh báo khi nhập liệu, chat kiểm tra hồ sơ, robot trợ lý |
| [`hackathon-web-admin`](https://github.com/Poledo/hackathon-web-admin) | Web Admin (Angular 22) — trang giới thiệu, dashboard, kho tri thức, danh mục HIS, người dùng/vai trò/quyền, cấu hình AI & robot |

## Tính năng chính (v2)

1. **Cảnh báo nhập liệu thời gian thực trên HIS** — extension phân tích form, gửi snapshot về API, rule engine + AI trả về lỗi/cảnh báo/gợi ý theo từng trường.
2. **Kiểm tra hồ sơ XML 130 (QĐ 130/QĐ-BYT + QĐ 4750/QĐ-BYT)** — upload file qua khung chat hoặc kiểm tra theo mã bệnh nhân:
   - Kiểm tra **455 trường / 15 bảng** theo đặc tả (`Knowledge/Xml130/field_specs.json`): kiểu dữ liệu, độ dài, định dạng ngày, danh mục giá trị.
   - **100+ rule liên trường/liên bảng** (`cross_field_rules.json` + rule engine C#): thẻ BHYT hết hạn, logic thời gian vào–ra–y lệnh, đối chiếu tổng tiền XML1 với chi tiết XML2/XML3, ICD-10 theo giới tính/độ tuổi/danh mục, liên kết MA_LK, giấy chuyển tuyến...
   - Kết quả nhóm theo cây kiểm tra: **Thông tin bệnh nhân / Chẩn đoán / Dịch vụ / Thuốc / Thời gian / Tài chính / Liên kết / Hành chính**, kèm cờ **"Nguy cơ xuất toán"** từng vấn đề.
3. **Danh mục HIS của cơ sở** — nạp file danh mục Excel do HIS xuất ra (thuốc/vật tư, dịch vụ kỹ thuật, CĐHA, xét nghiệm, loại giường, và các danh mục tham chiếu). Rule đối chiếu hồ sơ với danh mục của **đúng cơ sở KCB**: mã thuốc/dịch vụ ngoài danh mục, thuốc tạm ngưng, thuốc ngoài phạm vi BHYT, đơn giá lệch danh mục. Danh mục thay đổi thì nạp lại (tự thay thế) hoặc gỡ bỏ; loại danh mục mới chỉ cần khai thêm profile JSON, không sửa code.
4. **AI học văn bản y tế (RAG)** — nạp công văn/thông tư/quyết định (.txt/.md/.doc/.docx/.pdf/.xls/.xlsx) vào kho tri thức; trợ lý AI trả lời câu hỏi nghiệp vụ **chỉ dựa trên văn bản đã nạp, kèm trích dẫn nguồn**. Truy hồi kết hợp: **tìm kiếm ngữ nghĩa** (vector embedding qua Ollama + pgvector, xem mục riêng bên dưới) + full-text + từ khóa hiếm; văn bản hết hiệu lực tự bị loại khỏi trích dẫn.
5. **Nhận định AI về hồ sơ** — tùy chọn `useAi=true` để LLM đánh giá mức độ nguy cơ xuất toán và thứ tự ưu tiên xử lý.
6. **Quản trị & phân quyền (RBAC)** — đăng nhập JWT (kèm đăng nhập ngoài), người dùng – vai trò – quyền chi tiết theo từng chức năng (ví dụ `Catalog.Knowledge`), nhật ký kiểm toán, cấu hình runtime (LLM provider, hạn mức request, cấu hình extension & robot) sửa trực tiếp trên web admin, không phải build lại.
7. **Thống kê & lịch sử hoạt động** — dashboard lượt hỏi đáp AI / lượt kiểm tra XML 130, xem lại nội dung từng lượt.

## Cài đặt nhanh

```bash
# 1. PostgreSQL đang chạy (ví dụ localhost:5432, db hackathon_ai)
# 2. Khai chuỗi kết nối — KHÔNG để trong appsettings.json (file đó cố ý bỏ trống)
cd AIValidation.Api
dotnet user-secrets set "ConnectionStrings:KnowledgeDatabase" \
  "Host=localhost;Port=5432;Database=hackathon_ai;Username=postgres;Password=<mật khẩu máy bạn>"
# 3. Áp migration
dotnet ef database update
# 4. Chạy API (mặc định http://localhost:5075, Scalar UI tại /scalar)
dotnet run
```

Chi tiết: [docs/INSTALLATION.md](docs/INSTALLATION.md). Extension và web admin: xem README của repo tương ứng ở bảng trên.

## Tìm kiếm ngữ nghĩa (Ollama + pgvector)

Tầng ngữ nghĩa giúp AI hiểu câu hỏi **diễn đạt khác từ ngữ trong văn bản** (ví dụ hỏi "mức hưởng đầu thẻ BT" vẫn tìm ra bảng mã BT2). Không bắt buộc — thiếu thì hệ thống tự chạy bằng full-text/keyword như cũ, không lỗi.

### 1. Cài Ollama + model embedding

```bash
# Cài Ollama: https://ollama.com (Windows installer), sau đó tải model
ollama pull bge-m3
```

- Model mặc định: **bge-m3** (đa ngữ, tiếng Việt tốt, vector 1024 chiều) — khuyên dùng, chỉ đổi khi có bằng chứng tìm sai.
- Cấu hình mục `Embedding` trong `appsettings.json`: `Enabled`, `OllamaUrl` (mặc định `http://localhost:11434`), `Model`, `UsePgvector`, `Dimensions`.
- Ollama có thể bật **sau** khi API đã chạy — bấm nút "Chỉ mục ngữ nghĩa" là hệ thống tự nhận lại.

### 2. Cài pgvector cho PostgreSQL (khuyên dùng khi kho lớn)

Kho ít đoạn thì chỉ mục bộ nhớ đủ dùng; kho **~100 nghìn đoạn trở lên** nên cài pgvector: tìm bằng SQL + chỉ mục HNSW, không tốn RAM, không quét tuyến tính. PostgreSQL chưa cài pgvector thì app **tự rơi về chỉ mục bộ nhớ** và log hướng dẫn.

```bash
# Xem phiên bản PostgreSQL để tải đúng bản pgvector
psql -U postgres -c "SELECT version();"
```

Bản PostgreSQL Windows (EDB installer) **không kèm sẵn pgvector**, chọn một trong hai cách:

- **Nhanh:** tải zip build sẵn đúng phiên bản PG tại <https://github.com/andreiramani/pgvector_pgsql_windows/releases>, chép `vector.dll` → `C:\Program Files\PostgreSQL\<ver>\lib\`; `vector.control` + `vector--*.sql` → `C:\Program Files\PostgreSQL\<ver>\share\extension\`.
- **Chính chủ:** build từ nguồn theo mục Windows của <https://github.com/pgvector/pgvector> (cần VS Build Tools, `nmake /F Makefile.win install`).

Sau đó **restart dịch vụ PostgreSQL** (services.msc → `postgresql-x64-<ver>`) rồi **restart API**. Không cần tự chạy `CREATE EXTENSION` — app tự tạo extension, cột `embedding_vec vector(N)` và chỉ mục HNSW ở lần dùng đầu.

### 3. Tạo chỉ mục cho dữ liệu đã nạp từ trước

Văn bản **nạp mới** được embed và ghi vào pgvector **tự động** ngay lúc nạp — không phải làm gì thêm. Nút **"Chỉ mục ngữ nghĩa"** (web admin → Kho tri thức) chỉ cần bấm khi:

1. Kho đã có dữ liệu **trước khi** bật Ollama/pgvector (bù các đoạn chưa có vector; vector đã có chỉ **chép sang** cột pgvector, không embed lại);
2. Lúc nạp mà Ollama không chạy (ingest vẫn thành công, bấm nút để bù);
3. Vừa đổi model embedding (phải embed lại toàn bộ).

Nút tự chạy lặp từng đợt ~50 giây tới khi xong. Theo dõi: `GET /api/assistant/embeddings/status` — `Remaining = 0` và `Index = "Chỉ mục PGVECTOR (HNSW): ... vector"` là chuẩn.

### 4. Đổi model embedding (hiếm khi cần)

Vector của hai model nằm ở hai không gian khác nhau → đổi model là **embed lại toàn bộ kho** (kho lớn chạy CPU mất vài giờ). Các bước:

```bash
# 1. Tải model mới
ollama pull ten-model-moi
# 2. Xóa vector cũ + drop cột pgvector (bắt buộc nếu model mới khác số chiều)
psql -U postgres -d hackathon_ai -c "UPDATE public.document_chunks SET \"Embedding\" = NULL; ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS embedding_vec;"
```

3. Sửa `appsettings.json`: `Embedding:Model` = tên model mới, `Embedding:Dimensions` = số chiều của model (xem trang model trên ollama.com).
4. Restart API (tự tạo lại cột + chỉ mục HNSW đúng số chiều) → bấm **"Chỉ mục ngữ nghĩa"** và chờ chạy hết.

## API chính

| Endpoint | Mô tả |
|---|---|
| `POST /api/xml130/validate?useAi=` | Kiểm tra hồ sơ XML 130 (multipart `file` hoặc raw XML body) |
| `GET /api/xml130/rules` | Danh mục rule kiểm tra liên trường |
| `POST /api/catalog/import` | Nạp danh mục HIS (.xls/.xlsx): thuốc, DVKT, CĐHA, xét nghiệm, giường... |
| `GET /api/catalog/sources` · `DELETE /api/catalog/sources/{id}` | Xem / gỡ danh mục đã nạp |
| `POST/DELETE /api/catalog/sources/{id}/knowledge` | Nạp / gỡ toàn văn một danh mục vào kho tri thức (quyền `Catalog.Knowledge`) |
| `GET /api/catalog/items` | Tra cứu trong danh mục |
| `POST /api/assistant/documents` | Nạp văn bản y tế vào kho tri thức RAG |
| `POST /api/assistant/ask` | Hỏi đáp nghiệp vụ dựa trên văn bản đã nạp |
| `GET /api/assistant/embeddings/status` | Trạng thái tầng ngữ nghĩa: Ollama, loại chỉ mục (pgvector/bộ nhớ), số đoạn còn thiếu |
| `POST /api/assistant/embeddings/rebuild` | Đồng bộ vector sang pgvector + embed các đoạn chưa có (chạy từng đợt ~50s) |
| `PUT /api/assistant/documents/{id}/validity` | Nhập tay ngày hiệu lực / hết hiệu lực văn bản (không tự đoán từ nội dung) |
| `GET /api/dashboard/usage` · `GET /api/dashboard/events` | Thống kê + lịch sử hoạt động (hỏi đáp AI, kiểm tra XML 130) — cần đăng nhập. Route tránh chữ "stats" vì adblock chặn URL chứa `/stats/` |
| `POST /api/validation` | Validate form snapshot từ extension (v1) |
| `/api/auth/*` | Đăng nhập JWT, làm mới token, đổi/quên mật khẩu, xác nhận email, `GET me`; `/api/auth/external` cho đăng nhập ngoài |
| `/api/admin/users` · `/api/admin/roles` · `/api/admin/permissions` | Quản trị người dùng – vai trò – quyền (RBAC) |
| `/api/admin/llm-config` · `/api/admin/rate-limit` · `/api/admin/extension-config` | Cấu hình runtime: LLM provider, hạn mức request, cấu hình extension & robot |
| `/api/admin/audit` | Nhật ký kiểm toán thao tác quản trị |
| `GET /api/health` | Health check cho K8s liveness/readiness |
| `GET /scalar` | Tài liệu API tương tác (OpenAPI) |

## Kiểm thử

| Loại | Vị trí | Chạy |
|---|---|---|
| Unit test bộ máy luật (**27 test**: chuỗi thời gian, trùng dòng chi tiết, tài chính, trùng giờ bác sĩ) | `AIValidation.Tests/Xml130/` | `dotnet test AIValidation.Tests/AIValidation.Tests.csproj` |
| Load test `POST /api/xml130/validate` (k6, hồ sơ XML 130 thật 3 cỡ 7 / 57 / 108 KB) | `loadtest/xml130-validate.k6.js` | `k6 run -e BASE_URL=https://localhost:44350 -e VUS=20 loadtest/xml130-validate.k6.js` |

> Load test **chỉ bắn vào local/dev**, tuyệt đối không bắn vào production `cbyts.vnpt.vn`.

Số đo thật (k6, 1 máy, rule engine không AI): **p95 173 ms** một hồ sơ (341 lượt); chịu tải 20 người dùng đồng thời **p95 1,85 s · p99 2,12 s**, ~15,6 hồ sơ/giây, **0% lỗi**. Kết xuất thô của k6 nằm ở `loadtest/ket-qua-*.json`; điều kiện đo ghi rõ trong [docs/PERFORMANCE-SECURITY.md](docs/PERFORMANCE-SECURITY.md).

## CI/CD & triển khai

`.github/workflows/deploy.yml` — chạy khi push lên `master`/`main` (hoặc bấm tay):

```
push master → dotnet test (đỏ là DỪNG, không deploy)
            → build image Docker (Dockerfile, .NET 10)
            → push VNPT ECR (ecr.vnptplatform.vn)
            → kubectl apply + rollout lên VNPT Cloud K8s
```

Secrets khai trong GitHub (Settings → Secrets and variables → Actions): `ECR_ID`, `ECR_USER`, `ECR_PASSWORD`, `KUBE_CONFIG` (kubeconfig base64). **Không commit secret vào repo.**

Manifest K8s trong `k8s/`: `api-validation.yaml` (Deployment + Service + Ingress), `postgres.yaml` (PostgreSQL + PVC), `ollama.yaml` (embedding), `bootstrap.sh` (khởi tạo cụm lần đầu). Chi tiết vận hành: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/ARCHITECTURE-V2.md](docs/ARCHITECTURE-V2.md) | Kiến trúc tổng thể, luồng xử lý |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Cài đặt, cấu hình từng bước |
| [docs/FEATURES.md](docs/FEATURES.md) | Mô tả tính năng chi tiết |
| [docs/AI-EVIDENCE.md](docs/AI-EVIDENCE.md) | Minh chứng sử dụng AI (LLM, RAG, prompt) |
| [docs/PERFORMANCE-SECURITY.md](docs/PERFORMANCE-SECURITY.md) | Hiệu năng & bảo mật |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Vận hành, giám sát, xử lý sự cố |
| [AIValidation.Api/docs/](AIValidation.Api/docs/) | Tài liệu kỹ thuật nội bộ (kiến trúc lớp, quy ước code, rule catalog) |
| [docs/bao-cao.html](docs/bao-cao.html) · [docs/bao-cao.pptx](docs/bao-cao.pptx) | Slide báo cáo (bản HTML tương tác + PowerPoint) — cũng là trang chủ web admin |
| [docs/huong-dan-su-dung-web-admin.docx](docs/huong-dan-su-dung-web-admin.docx) · [.pdf](docs/huong-dan-su-dung-web-admin.pdf) | Hướng dẫn sử dụng web admin |
| [docs/huong-dan-su-dung-extension-chrome.docx](docs/huong-dan-su-dung-extension-chrome.docx) · [.pdf](docs/huong-dan-su-dung-extension-chrome.pdf) | Hướng dẫn sử dụng Chrome Extension |

## Web admin

Repo [`hackathon-web-admin`](https://github.com/Poledo/hackathon-web-admin) (Angular 22) — giao diện quản trị tại <https://cbyts.vnpt.vn>:

- **Trang giới thiệu** (trang chủ) — bài toán, giải pháp, số liệu hiệu năng và giá trị thực tiễn đo được.
- **Dashboard** — biểu đồ lượt hỏi đáp AI / lượt kiểm tra XML 130 theo thời gian.
- **Kho tri thức** — nạp/gỡ văn bản y tế, nhập ngày hiệu lực – hết hiệu lực, bấm tạo **chỉ mục ngữ nghĩa**.
- **Danh mục HIS** — nạp file danh mục, nạp/gỡ từng dòng vào kho tri thức, chọn nhiều dòng làm hàng loạt.
- **Lịch sử hoạt động** — xem lại nội dung từng lượt hỏi đáp / kiểm tra.
- **Người dùng – vai trò – quyền** (RBAC) và **nhật ký kiểm toán**.
- **Cấu hình** — LLM provider, hạn mức request, cấu hình extension và robot trợ lý.
- Giao diện tối mặc định, chuyển sáng/tối; có màn hình bảo trì khi server đang deploy.

## Phiên bản

- Tag **`release-v2-final`** — bản chấm thi: XML130 validation engine (455 chỉ tiêu / 100 luật) + RAG có trích dẫn + chat extension + web admin đầy đủ vòng đời vận hành (phân quyền RBAC, lịch sử hoạt động, cấu hình runtime) — chạy production trên VNPT Cloud K8s. Tag này được gắn ở cùng một mốc trên **cả ba repo**.

## Đội thực hiện

**Chiến binh Y tế số** — VNPT. Sản phẩm dự thi hackathon, bản chạy thật tại <https://cbyts.vnpt.vn>.
