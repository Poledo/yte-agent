# Hướng dẫn cài đặt

## Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| .NET SDK | 10.0+ | build & chạy API |
| PostgreSQL | 14+ | lưu danh mục ICD, văn bản RAG |
| Node.js | 18+ | build Chrome extension |
| Chrome/Edge | bản mới | cài extension (Manifest V3) |
| Tài khoản OpenRouter (tùy chọn) | — | tính năng AI (nhận định hồ sơ, hỏi đáp RAG) |

## 1. Cơ sở dữ liệu

```bash
# Tạo database (psql hoặc pgAdmin)
createdb -U postgres hackathon_ai
```

Sửa chuỗi kết nối trong `AIValidation.Api/appsettings.json` nếu khác mặc định:

```json
"ConnectionStrings": {
  "KnowledgeDatabase": "Host=localhost;Port=5432;Database=hackathon_ai;Username=postgres;Password=<mật khẩu PostgreSQL của bạn>"
}
```

Áp schema + dữ liệu seed:

```bash
cd AIValidation.Api
dotnet tool install --global dotnet-ef   # nếu chưa có
dotnet ef database update
```

Migration `AddMedicalDocumentsRag` tạo các bảng: `knowledge_items` (danh mục ICD/DVKT/thuốc/rule), `medical_documents` + `document_chunks` (kho văn bản RAG, cột tsvector + GIN index tự sinh).

### Nạp danh mục ICD (khuyến nghị)

Danh mục ICD-10 (~15.000 mã kèm cờ giới tính/tuổi/chẩn đoán chính) import qua endpoint:

```bash
curl -X POST http://localhost:5075/api/icd/import
```

Nguồn dữ liệu: `AIValidation.Api/docs/analysis/03_Icd_data/icd_rows.json`.

## 2. API Key cho tính năng AI (tùy chọn)

Không có key, hệ thống vẫn chạy đầy đủ rule engine; chỉ tắt phần nhận định AI và câu trả lời RAG sẽ trả trích đoạn thay vì tổng hợp.

```bash
cd AIValidation.Api
dotnet user-secrets init
dotnet user-secrets set "LLM:ApiKey" "sk-or-v1-xxxxxxxx"   # OpenRouter
# Đổi model nếu muốn (appsettings.json → LLM:Model)
```

Quản lý secret: `dotnet user-secrets list` / `remove "LLM:ApiKey"` / `clear`.

Hỗ trợ 2 provider (cấu hình `LLM:Provider`): `OpenRouter` (mặc định) và `Ollama` (chạy model local, không cần internet — đổi `BaseUrl` thành `http://localhost:11434`).

## 3. Chạy API

```bash
cd AIValidation.Api
dotnet run
# → http://localhost:5075 ; tài liệu API: http://localhost:5075/scalar
```

Smoke test:

```bash
curl -X POST http://localhost:5075/api/xml130/validate \
  -H "Content-Type: text/xml" --data-binary @sample-xml130.xml
```

## 4. Chrome Extension

```bash
# repo hackathon-extension-his
cd extension
npm install
npm run build        # sinh thư mục dist/
```

Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục `extension/dist`.

Mở trang HIS của VNPT — extension tự chạy: theo dõi form nhập liệu và hiển thị nút chat kiểm tra hồ sơ (góc phải dưới).

Cấu hình endpoint tải XML130 theo mã bệnh nhân (tích hợp HIS thật): mở popup extension → đặt `hisXmlEndpoint` dạng `https://his.example.vn/api/xml130?patient={patientCode}`.

## 5. Tài khoản dùng thử

Hệ thống demo chạy local, không yêu cầu đăng nhập:

- **API + Scalar UI**: http://localhost:5075/scalar
- **Extension**: load unpacked như trên, hoạt động trên mọi trang HIS (mặc định match domain VNPT HIS, sửa `manifest.json` → `content_scripts.matches` khi demo trên trang khác).
- **File mẫu**: dùng bất kỳ file XML 130 chuẩn GIAMDINHHS; hồ sơ demo kèm theo trong tài liệu slide.

## 6. Khóa bản quyền theo cơ sở KCB (khi triển khai thương mại)

Mặc định `Licensing:Mode` = `Off` nên bản chạy thử **không cần khóa**. Khi bán theo cơ sở KCB, đặt trong `appsettings.json` (hoặc biến môi trường `Licensing__Mode`):

```json
"Licensing": {
  "Mode": "Enforce",           // Off = không kiểm | Warn = vẫn phục vụ + ghi log | Enforce = chặn
  "RecordBilling": true,       // ghi sổ sản lượng — độc lập với Mode
  "HeaderName": "X-License-Key"
}
```

Trình tự khuyến nghị: chạy `Off` để sổ sản lượng có dữ liệu → cấp khóa cho từng cơ sở ở web admin (**Hợp đồng cơ sở**) → chuyển `Warn` đối soát log xem còn máy trạm nào chưa khai khóa → mới bật `Enforce`. Chi tiết tính năng: [FEATURES.md](FEATURES.md) mục 7.

Phía máy trạm: mở popup extension → mục **Khóa bản quyền** → dán khóa được cấp, khai mã cơ sở KCB và mã nhân viên → **Lưu**. Khóa chỉ lưu trên máy đó và có hiệu lực ngay.

Triển khai server thật: xem [OPERATIONS.md](OPERATIONS.md).
