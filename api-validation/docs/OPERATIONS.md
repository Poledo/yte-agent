# Vận hành

## Triển khai production

### Windows Server (IIS hoặc Windows Service)

```powershell
cd AIValidation.Api
dotnet publish -c Release -o C:\apps\chienbinh-api
# Chạy dạng service:
sc.exe create ChienBinhYTeSoApi binPath="C:\apps\chienbinh-api\AIValidation.Api.exe" start=auto
```

### Linux (systemd)

```bash
dotnet publish -c Release -o /opt/chienbinh-api
# /etc/systemd/system/chienbinh-api.service:
# [Service] ExecStart=/usr/bin/dotnet /opt/chienbinh-api/AIValidation.Api.dll
# Environment=ASPNETCORE_ENVIRONMENT=Production
sudo systemctl enable --now chienbinh-api
```

### Biến môi trường production

| Biến | Ý nghĩa |
|---|---|
| `ConnectionStrings__KnowledgeDatabase` | chuỗi kết nối PostgreSQL |
| `LLM__ApiKey` | API key OpenRouter (bỏ trống nếu dùng Ollama/tắt AI) |
| `LLM__Provider` / `LLM__BaseUrl` / `LLM__Model` | chọn provider LLM |
| `ASPNETCORE_URLS` | ví dụ `http://0.0.0.0:5075` |

Cập nhật schema khi nâng phiên bản: `dotnet ef database update` (migration idempotent, có lịch sử `__EFMigrationsHistory`).

## Vận hành hằng ngày

### Nạp văn bản mới cho AI

Khi có công văn/quyết định mới:

```bash
curl -X POST http://<api>/api/assistant/documents \
  -F "file=@cong-van-1234.txt" -F "title=Công văn 1234/BYT-BH" \
  -F "docType=CongVan" -F "docNumber=1234/BYT-BH" -F "issuedBy=Bộ Y tế"
```

AI dùng được ngay, không cần khởi động lại. Gỡ văn bản hết hiệu lực: `DELETE /api/assistant/documents/{id}`.

### Cập nhật danh mục HIS (thuốc, dịch vụ, giá)

Danh mục đổi thường xuyên (bổ sung thuốc, đổi giá theo thông tư mới). Xuất file danh mục từ HIS rồi nạp:

```bash
# Nạp/cập nhật: mặc định THAY THẾ danh mục cùng loại của cùng cơ sở KCB
curl -X POST http://<api>/api/catalog/import -F "file=@dm_duoc_vattu.xls"

# Danh mục nhân viên và đơn vị chuyển tuyến KHÔNG có cột mã cơ sở trong file
# → phải chỉ định facility, nếu không hai rule tương ứng sẽ bỏ qua
curl -X POST "http://<api>/api/catalog/import?facility=56006" -F "file=@E_nhan_vien.xlsx"
curl -X POST "http://<api>/api/catalog/import?facility=56006" -F "file=@E_chuyen_vien.xlsx"

# Xem danh mục đang có
curl http://<api>/api/catalog/sources

# Gỡ hẳn một danh mục (vd danh mục hết hiệu lực, nạp nhầm file)
curl -X DELETE http://<api>/api/catalog/sources/{id}

# Tra cứu trong danh mục
curl "http://<api>/api/catalog/items?type=Drug&facility=56006&q=metformin"
```

Loại danh mục tự nhận diện theo tên file/cấu trúc cột. Gỡ danh mục thì rule đối chiếu tương ứng tự ngừng chạy (không báo sai), nạp lại là hoạt động lại — không cần khởi động lại API.

**Danh mục mới chưa nhận diện được?** Bổ sung một profile vào `AIValidation.Api/Knowledge/Catalog/catalog_profiles.json` (khai tên file, dòng tiêu đề, các cột mã/tên/giá/trạng thái) rồi khởi động lại API — không phải sửa code. Xem `GET /api/catalog/profiles` để biết các loại đang nhận diện được.

### Cập nhật đặc tả XML 130

Khi Bộ Y tế điều chỉnh chỉ tiêu: sửa `AIValidation.Api/Knowledge/Xml130/field_specs.json` (và `cross_field_rules.json`), khởi động lại API (spec cache in-memory). Không cần biên dịch lại trừ khi thêm rule C# mới.

### Cập nhật danh mục ICD

`POST /api/icd/import` — import lại từ file nguồn; kiểm tra bằng `GET /api/icd/summary`.

## Giám sát

- **Health check**: `GET /api/health` (liveness) — cấu hình cho load balancer/uptime monitor.
- **Log**: ILogger chuẩn .NET → console/EventLog/journald; mức Information ghi mỗi lần validate (MA_LK, số vấn đề), Warning/Error cho lỗi rule và LLM. TraceId trong mọi response lỗi để đối chiếu log.
- **Chi phí LLM**: theo dõi qua dashboard OpenRouter; mọi lời gọi AI đều là opt-in (`useAi=true`, `/assistant/ask`).

## Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| 500 khi validate, log "Không tìm thấy field_specs.json" | thiếu thư mục Knowledge trong output | build lại (`dotnet build` — csproj đã cấu hình copy), kiểm tra `bin/.../Knowledge/Xml130/` |
| Rule ICD không chạy (không có cảnh báo D006–D010) | danh mục ICD chưa import | `POST /api/icd/import` |
| `aiAssessment` luôn null | thiếu `LLM:ApiKey` hoặc provider lỗi | xem log Warning; kiểm tra key/mạng |
| RAG trả "Chưa tìm thấy văn bản liên quan" | kho rỗng hoặc từ khóa quá khác biệt | `GET /api/assistant/documents` kiểm tra kho; nạp thêm văn bản |
| Lỗi kết nối DB khi khởi động | PostgreSQL chưa chạy / sai connection string | kiểm tra service postgres, biến môi trường |
| Extension không hiện cảnh báo | API không chạy / sai base URL / CORS | mở DevTools console của trang HIS, kiểm tra request |
| Tiếng Việt hiển thị sai khi test bằng curl trên Windows | console codepage, không phải lỗi API | dùng `--data-binary @file.json` với file UTF-8; xem response bằng file |

## Sao lưu & khôi phục

```bash
pg_dump -U postgres hackathon_ai > backup_$(date +%Y%m%d).sql   # backup
psql -U postgres hackathon_ai < backup_20260717.sql             # restore
```

Dữ liệu cần sao lưu: kho văn bản RAG + danh mục. Hồ sơ bệnh án **không** lưu trong hệ thống nên không thuộc phạm vi backup.
