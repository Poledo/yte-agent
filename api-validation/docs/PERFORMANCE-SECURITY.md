# Hiệu năng & Bảo mật

## Hiệu năng

### Số liệu thực đo

| Thao tác | Thời gian | Ghi chú |
|---|---|---|
| Kiểm tra XML 130 một hồ sơ (rule engine, không AI) | **p95 172,94 ms · p99 200,38 ms** | trung vị 124,78 ms; 341 lượt, 0% lỗi, 682/682 check đạt |
| Kiểm tra XML 130 khi 20 người dùng đồng thời | **p95 1,85 s · p99 2,12 s** | trung vị 1,24 s; 15,57 hồ sơ/giây, 947 lượt, 0% lỗi, 1894/1894 check đạt |
| Kiểm tra XML 130 kèm nhận định AI (`useAi=true`) | 2–8 s | phụ thuộc LLM provider |
| Hỏi đáp RAG (truy hồi + LLM) | 2–6 s | truy hồi FTS < 50 ms, còn lại là LLM |
| Nạp văn bản 100 trang (~300 KB text) | < 2 s | chia đoạn + insert + tsvector tự sinh |

Độ trễ gần như không đổi theo cỡ file - p95 ở 1 VU: 166,4 ms (7 KB) / 159,8 ms (57 KB) / 186,2 ms (108 KB). Chi phí nằm ở số lượng rule chạy trên mỗi hồ sơ, không ở khối lượng byte phải parse.

### Đo trong điều kiện nào (để ai cũng lặp lại được)

Hai dòng đầu bảng trên là **kết xuất thô của k6**, commit kèm trong repo, sinh bằng `k6 run --summary-export=...` - không con số nào được gõ tay:

| Lần chạy | Bản build | File kết xuất | 1 VU | 20 VU |
|---|---|---|---|---|
| Tham chiếu (dùng cho bảng trên) | **Release** | [`ket-qua-release-1vu.json`](../loadtest/ket-qua-release-1vu.json), [`ket-qua-release-20vu.json`](../loadtest/ket-qua-release-20vu.json) | p95 172,94 ms | p95 1,85 s · 15,57 req/s |
| Đối chứng | Debug | [`ket-qua-1vu.json`](../loadtest/ket-qua-1vu.json), [`ket-qua-20vu.json`](../loadtest/ket-qua-20vu.json) | p95 167,65 ms | p95 1,77 s · 16,43 req/s |

Hai lần chạy lệch nhau ~3%, tức là **chênh lệch nằm trong nhiễu đo, không phải do cấu hình build**. Lấy bản Release làm tham chiếu vì đó là bản thực sự đóng gói vào image.

| Yếu tố | Giá trị lúc đo |
|---|---|
| Máy | 1 máy để bàn Windows 11, chạy đồng thời cả API, k6 và PostgreSQL - không phải máy chủ riêng |
| Cách chạy API | Kestrel `http://localhost:5075` (bản publish tạm, không qua IIS Express) |
| CSDL | PostgreSQL cài local, cùng máy |
| Kịch bản | `loadtest/xml130-validate.k6.js`, `constant-vus`; 1 VU / 45 s và 20 VU / 60 s |
| Dữ liệu | 3 hồ sơ XML 130 **thật** (7 / 57 / 108 KB), xoay vòng; mỗi request mang một `X-Forwarded-For` giả lập riêng để phép đo không đụng trần chống spam |
| Đường đo | `POST /api/xml130/validate?useAi=false` - rule engine thuần, không gọi LLM |

Ba điều nói cho sòng phẳng:

- k6 tranh CPU với chính API trên cùng một máy, và máy còn đang chạy IDE - nên đây là **cận dưới của năng lực thật trên phần cứng đó**. Nói vậy không có nghĩa là trên cụm sẽ nhanh hơn: một pod bị chặn ở `limits.cpu: "1"` nên thực tế **chậm hơn máy dev nhiều nhân** - số đo trên cụm ở mục dưới cho thấy rõ điều đó.
- k6 báo *"thresholds have been crossed"* ở lần chạy 20 VU. Đó là do ngưỡng trong script (`p(95)<500`) viết cho tình huống **một người dùng**; ở 20 VU vượt ngưỡng là đúng như dự đoán, không phải lỗi. Tỉ lệ lỗi HTTP vẫn 0%.
- Tài liệu và slide bản trước nêu p95 147 ms và 1,45 s - cũng là số đo thật, nhưng của một lần chạy không kèm file kết xuất nên không kiểm chứng lại được. Toàn bộ tài liệu nay đã chỉnh về lần chạy **có file gốc đi kèm**, tức là con số **thận trọng hơn**.

Lặp lại phép đo (cần k6 và một API đang chạy ở local - **tuyệt đối không bắn vào `cbyts.vnpt.vn`**):

```bash
k6 run -e BASE_URL=http://localhost:5075 -e VUS=1  -e DURATION=45s \
  --summary-export=loadtest/ket-qua-1vu.json  loadtest/xml130-validate.k6.js
k6 run -e BASE_URL=http://localhost:5075 -e VUS=20 -e DURATION=60s \
  --summary-export=loadtest/ket-qua-20vu.json loadtest/xml130-validate.k6.js
```

Script mở 3 file hồ sơ đặt **ngoài repo** (`../../kich-ban-demo/`) vì đó là dữ liệu bệnh nhân thật, cố ý không commit. Thay bằng hồ sơ XML 130 bất kỳ để chạy lại.

### Đo trên cụm K8s thật (không phải máy dev)

Ngoài phép đo trên máy dev, đội dựng một **namespace riêng `cbyts-loadtest`** ngay trên cụm VNPT Cloud - cùng image, cùng `resources.limits`, có PostgreSQL riêng - chạy k6 **bên trong cụm** rồi xóa sạch namespace. Namespace `cbyts` đang phục vụ thật **không nhận một request nào** của phép đo này.

| Lượt đo | Replica API | p95 | p99 | Trung vị | Thông lượng | Lỗi HTTP | Kết xuất thô |
|---|---|---|---|---|---|---|---|
| 1 VU / 45 s | 1 | **251 ms** | 345 ms | 194 ms | 5,00 hồ sơ/s | 0% | [`ket-qua-cum-1vu.json`](../loadtest/ket-qua-cum-1vu.json) |
| 20 VU / 60 s | 1 | 6,99 s | 9,38 s | 5,49 s | 3,63 hồ sơ/s | 0% | [`ket-qua-cum-20vu.json`](../loadtest/ket-qua-cum-20vu.json) |
| 20 VU / 60 s | **3** | 3,87 s | 5,19 s | **1,44 s** | **10,83 hồ sơ/s** | 0% | [`ket-qua-cum-20vu-3replica.json`](../loadtest/ket-qua-cum-20vu-3replica.json) |

Hai điều rút ra:

- **Một pod chậm hơn máy dev là đúng như khai báo, không phải cụm yếu.** Manifest ghi `limits.cpu: "1"` - mỗi pod chỉ được một CPU, trong khi máy dev có nhiều nhân nên phục vụ song song tốt hơn.
- **Scale ngang tuyến tính - nay là số đo, không còn là suy luận.** Giữ nguyên tải 20 VU, tăng từ 1 lên 3 replica: thông lượng 3,63 → 10,83 hồ sơ/giây (**2,98 lần**), trung vị 5,49 s → 1,44 s (**3,8 lần**). Đây chính là lý do tồn tại của [`k8s/hpa.yaml`](../k8s/hpa.yaml).

Manifest và hướng dẫn chạy lại: [`k8s/loadtest/`](../k8s/loadtest/README.md). Dữ liệu đưa lên cụm là bản **đã ẩn danh** (thay họ tên/địa chỉ/số thẻ bằng ký tự giả, giữ nguyên độ dài file); hồ sơ bệnh nhân thật chỉ nằm trên máy dev.

### Thiết kế cho hiệu năng

- **Đặc tả trường cache in-memory** (`Xml130SpecProvider` singleton, load 1 lần, thread-safe double-check lock) — không đọc file JSON theo từng request.
- **Danh mục ICD 15.000 mã nạp vào bộ nhớ** (`IcdProvider`) — tra cứu O(1) theo mã, không query DB trong vòng lặp rule.
- **Full-text search dùng GIN index** trên cột tsvector sinh tự động (stored generated column) — chi phí tính vector trả một lần khi ghi, đọc nhanh.
- **Rule độc lập, fail-safe**: một rule lỗi bị log và bỏ qua, không chặn các rule khác — độ trễ ổn định.
- **AI là lớp tùy chọn**: mặc định `useAi=false`; đường nóng (kiểm tra khi nhập liệu) không bao giờ chờ LLM.
- Giới hạn request: XML 50 MB, văn bản 20 MB (chặn upload phá hoại bộ nhớ).

### Khả năng mở rộng

- API stateless → scale ngang sau load balancer; PostgreSQL là điểm chung duy nhất. **Đã đo thật trên cụm**: 1 → 3 replica cho thông lượng gấp 2,98 lần (xem mục "Đo trên cụm K8s thật").
- File hồ sơ nhiều `<HOSO>` được xử lý tuần tự theo hồ sơ — có thể song song hóa bằng `Parallel.ForEachAsync` khi cần thông lượng lô lớn (chưa bật để giữ đơn giản).

## Bảo mật

### Dữ liệu y tế (nhạy cảm)

- **Không lưu hồ sơ bệnh án**: file XML 130 chỉ xử lý trong bộ nhớ theo request, không ghi đĩa, không lưu DB. DB chỉ chứa danh mục (ICD, thuốc) và văn bản quy phạm — không có dữ liệu bệnh nhân.
- **Tùy chọn LLM local (Ollama)**: cơ sở KCB không muốn dữ liệu ra ngoài có thể chạy model nội bộ; khi dùng OpenRouter, chỉ phần thông báo lỗi (không kèm định danh đầy đủ) được đưa vào prompt nhận định.
- Log ứng dụng không ghi nội dung hồ sơ, chỉ ghi mã liên kết (MA_LK) và số lượng vấn đề.

### API & hạ tầng

- **Secrets ngoài mã nguồn**: cả API key LLM lẫn chuỗi kết nối CSDL nạp qua `dotnet user-secrets` (máy dev) hoặc biến môi trường (Docker/K8s, Secret `cbyts-secrets`); `appsettings.json` trong repo để trống các giá trị này. Thiếu chuỗi kết nối thì API **dừng ngay lúc khởi động** kèm thông báo hướng dẫn, không chạy nửa vời với giá trị mặc định. File `.env.example` liệt kê đầy đủ biến cần đặt; `.gitignore` của cả 3 repo chặn `.env` thật.
- **Middleware xử lý lỗi toàn cục** (`GlobalExceptionMiddleware`): không lộ stack trace ra client, trả mã lỗi chuẩn + traceId.
- **Kiểm soát đầu vào**: content-type whitelist cho upload (.txt/.md/.xml...), XML parse bằng `XDocument` (không DTD, không external entity → an toàn XXE), JSON model binding có validate.
- **EF Core parameterized queries** — không có SQL string nối tay, chống SQL injection; tìm kiếm FTS qua `EF.Functions` (tham số hóa).
- **CORS tách hai policy** (xem mục "CORS: vì sao tách hai policy" bên dưới).
- Soft delete cho văn bản (giữ vết kiểm toán, tránh mất dữ liệu do thao tác nhầm).

### CORS: vì sao tách hai policy

Trước đây API mở `AllowAnyOrigin` cho toàn bộ endpoint. Nay tách làm hai:

| Policy | Áp dụng cho | Origin được phép |
|---|---|---|
| Mặc định (`AddDefaultPolicy`) | mọi endpoint quản trị: `/api/admin/*`, `/api/auth/*`, `/api/catalog`, `/api/dashboard`, `/api/icd`, `/api/legal`… | đúng danh sách trong cấu hình `Cors:WebAdminOrigins` (production: `https://cbyts.vnpt.vn`; dev: `http://localhost:4200`) |
| `"Extension"` | 4 controller extension gọi tới: `ExtensionConfigController`, `AssistantController`, `ValidationController`, `Xml130Controller` | mở origin |

Lý do bốn controller kia vẫn phải mở: content script chạy trong trang HIS với origin `chrome-extension://<id>`, mà `<id>` **đổi theo từng máy cài** khi load unpacked — không thể khai báo cứng một danh sách. Chọn cách gắn `[EnableCors("Extension")]` đích danh từng controller thay vì mở toàn API, để mọi endpoint quản trị (tạo người dùng, phân quyền, xóa văn bản) nằm ngoài vùng mở.

Danh sách origin đọc từ cấu hình, không hardcode: `Cors:WebAdminOrigins` trong `appsettings.json`, ghi đè bằng biến môi trường `Cors__WebAdminOrigins__0` khi triển khai.

**Không bật `AllowCredentials`** — và đó là chủ ý, không phải bỏ sót. Web-admin lưu access/refresh token trong `localStorage` (`web-admin/src/app/core/token.store.ts`) rồi tự đính vào header `Authorization`; trình duyệt không tự gửi kèm cookie phiên nên không có bề mặt tấn công CSRF qua cookie. Test `token.store.spec.ts` khẳng định đúng điều này (token nằm ở `localStorage`, không xuất hiện trong `document.cookie`) để về sau ai đổi sang cookie thì test đỏ ngay.

Ngoài ra, trên production web-admin gọi API **cùng origin** qua Ingress (`environment.ts` đặt `apiBaseUrl: ''`), nên CORS chỉ thực sự có tác dụng ở môi trường dev và với extension.

### Quản lý bí mật và phụ thuộc

| Việc | Cách làm | Nơi cấu hình |
|---|---|---|
| Giá trị bí mật lúc chạy | user-secrets (dev) / biến môi trường từ Secret `cbyts-secrets` (K8s) | `.env.example`, `k8s/api-validation.yaml` |
| Chặn bí mật mới lọt vào repo | gitleaks quét cây thư mục mỗi lần push và mỗi pull request, thêm một lượt định kỳ hằng tuần | `.github/workflows/security-scan.yml` (có ở cả 3 repo) |
| Vá thư viện có lỗ hổng | Dependabot mở PR hằng tuần cho NuGet/npm/Docker, hằng tháng cho GitHub Actions; PR phải qua job test mới merge được | `.github/dependabot.yml` (có ở cả 3 repo) |
| Chặn thư viện dính CVE | CI dừng khi phát hiện lỗ hổng: `dotnet list package --vulnerable --include-transitive` (api), `npm audit --omit=dev --audit-level=high` (web-admin, extension) | bước "Kiểm tra lỗ hổng thư viện" trong workflow mỗi repo |
| Quy ước code | `.editorconfig` + analyzer .NET bật lúc build (api), ESLint flat config (extension); CI chặn các rule đặt mức error | `.editorconfig`, `extension/eslint.config.js` |

Đã xử lý khi dựng các cổng này: `Microsoft.OpenApi` 2.0.0 (kéo theo qua `Microsoft.AspNetCore.OpenApi`) dính lỗ hổng mức cao GHSA-v5pm-xwqc-g5wc — ghim thẳng lên 2.7.6; phần phụ thuộc phát hành của web-admin và extension hiện sạch (`npm audit --omit=dev`: 0 lỗ hổng). Lỗ hổng còn lại chỉ nằm ở công cụ build (vite/esbuild) — không chạy trên máy người dùng, chờ Dependabot nâng theo nhịp.

### Bí mật từng lọt vào git - đã xử lý dứt điểm

Rà toàn bộ lịch sử ba repo theo 7 mẫu bí mật (khóa API, mật khẩu chuỗi kết nối, mật khẩu ứng dụng Gmail, kubeconfig, token) tìm được **hai** giá trị, cả hai đều ở repo `hackathon-api-validation`. Hai repo còn lại sạch, không phải viết lại lịch sử.

| Giá trị | Ở đâu | Đã làm |
|---|---|---|
| Mật khẩu PostgreSQL **máy dev** (`Host=localhost`) | `appsettings*.json` các commit cũ, và còn sót ngay tại HEAD trong `docs/INSTALLATION.md` | gỡ khỏi HEAD (thay bằng chỗ điền), rồi gỡ khỏi toàn bộ lịch sử |
| **Khóa API OpenRouter** | `appsettings.Development.json` một commit cũ (không còn ở HEAD) | **thu hồi khóa trên openrouter.ai trước**, cấp khóa mới nạp vào Secret `cbyts-secrets`, rồi mới gỡ khỏi lịch sử |

Mật khẩu production **chưa từng** nằm trong repo - luôn nạp từ Secret `cbyts-secrets`.

**Viết lại lịch sử:** chạy `git filter-repo --replace-text`, thay mọi lần xuất hiện của hai giá trị trên trong toàn bộ 44 commit bằng chuỗi `***DA-GO-KHOI-LICH-SU***`, rồi force-push. Bản mirror trước khi viết lại được giữ ngoài repo để đối chiếu. Hệ quả: **toàn bộ SHA commit của repo này đã đổi**; nội dung cây mã không đổi.

**Chặn tái diễn:** gitleaks chạy trên mỗi push/PR và một lượt định kỳ hằng tuần (`security-scan.yml`, có ở cả 3 repo); `.gitignore` chặn `.env`; API dừng ngay lúc khởi động kèm thông báo tiếng Việt nếu thiếu chuỗi kết nối, thay vì chạy với giá trị mặc định lẫn trong mã.

### Chống spam request (Rate limiting)

Dùng `RateLimiter` tích hợp của .NET (`AddRateLimiter` + `UseRateLimiter`), phân vùng theo **IP client**. Sau ingress/LB, IP thật lấy ưu tiên từ header `X-Forwarded-For` (fallback `RemoteIpAddress`) — nếu chỉ dựa `RemoteIpAddress` thì mọi client sẽ chung IP proxy nội bộ và bị tính gộp.

| Phạm vi | Endpoint | Giới hạn | Chính sách |
|---|---|---|---|
| Chung toàn API | mọi request | 100 req/phút/IP | `GlobalLimiter` (fixed window) |
| Đăng nhập | `POST /api/auth/login` | 5 req/phút/IP | `rl-login` — chống dò mật khẩu (brute force) |
| Quên mật khẩu | `POST /api/auth/forgot-password` | 3 req/phút/IP | `rl-forgot-password` — chống spam gửi mail đặt lại |
| Hỏi đáp AI | `POST /api/assistant/ask` | 10 req/phút/IP | `rl-ask` — kiểm soát chi phí LLM |
| Nạp đặc tả XML130 | `POST /api/xml130/field-specs/import` | 5 req/phút/IP | `rl-import` — chặn spam parse Excel tốn CPU |

- Giới hạn chung và giới hạn riêng **cộng dồn**: request tới endpoint nhạy cảm phải qua cả hai (ví dụ `login` vẫn nằm trong hạn mức 100/phút chung).
- Vượt ngưỡng trả **HTTP 429 Too Many Requests** + header `Retry-After` (số giây chờ) + thân JSON tiếng Việt: *"Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau N giây."*
- Cửa sổ cố định 1 phút, `QueueLimit = 0` (không xếp hàng — vượt là từ chối ngay, không giữ kết nối).
- Cấu hình tập trung ở `Program.cs` (khối `AddRateLimiter`), gắn vào endpoint bằng attribute `[EnableRateLimiting("<policy>")]` — dễ chỉnh ngưỡng mà không đụng logic controller.

### Khuyến nghị khi triển khai thật (ghi rõ vì bản demo chưa bật)

1. Bật HTTPS bắt buộc + HSTS; đặt API sau reverse proxy (nginx/IIS).
2. Thêm xác thực (API key nội bộ hoặc OAuth2/JWT tích hợp SSO bệnh viện) — hiện demo không yêu cầu đăng nhập.
3. ~~Giới hạn tốc độ (rate limiting) cho `/api/assistant/ask` để kiểm soát chi phí LLM.~~ **Đã triển khai** — xem mục "Chống spam request (Rate limiting)" ở trên (chung 100/phút/IP + siết `ask` 10/phút, `login` 5/phút, `forgot-password` 3/phút, `import` 5/phút).
4. Sao lưu PostgreSQL định kỳ (kho văn bản + danh mục).
