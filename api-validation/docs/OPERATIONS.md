# Vận hành

## Triển khai production

### Windows Server + IIS (khuyến nghị cho triển khai tại đơn vị)

Bộ script `deploy/iis/` làm trọn cả API lẫn web-admin. **Máy build** cần .NET SDK + Node; **máy chủ** chỉ cần IIS + ASP.NET Core 10 Hosting Bundle (thêm URL Rewrite và ARR nếu dùng reverse proxy).

```powershell
# 1) Trên máy build: đóng gói (chạy unit test, publish API, build Angular, nén .zip)
.\deploy\iis\Build-Package.ps1

# 2) Chép .zip sang máy chủ, giải nén, mở PowerShell QUYỀN ADMIN tại thư mục đó
.\Deploy-Iis.ps1 -CheckOnly     # kiểm tra máy chủ đủ điều kiện chưa
.\Deploy-Iis.ps1                # cài đặt / nâng cấp
```

Kết quả: site `cbyts` (web-admin, cổng 80) + site `cbyts-api` (chỉ nghe 127.0.0.1:8080), `/api/*` được ARR chuyển tiếp sang API nên trình duyệt và tiện ích Chrome gọi cùng một origin.

| Tham số hay dùng | Ý nghĩa |
|---|---|
| `-HostHeader cbyts.donvi.vn` | gắn tên miền vào binding |
| `-HttpsPort 443 -CertThumbprint <vân tay> -ForceHttps` | bật HTTPS bằng chứng chỉ trong `LocalMachine\My` và ép chuyển hướng |
| `-InstallRoot D:\apps\cbyts` | đổi nơi cài (mặc định `C:\inetpub\cbyts`) |
| `-NoProxy` | máy chủ không cài được ARR: tách 2 site riêng, khi đó build web bằng `Build-Package.ps1 -ApiBaseUrl https://api...` và khai `Cors:WebAdminOrigins` |
| `-Rollback` | quay lại bản sao lưu gần nhất |
| `-ExtensionKey <đường dẫn .pem>` (khi build) | đóng gói kèm tiện ích Chrome tự phát hành, xem mục bên dưới |

Nâng cấp phiên bản = chạy lại `Deploy-Iis.ps1` với gói mới: script tự sao lưu bản cũ (giữ 5 bản), đặt `app_offline.htm` để nhả khóa file, copy đè **nhưng giữ nguyên** `api\Storage` (tài liệu/danh mục đã nạp) và `api\appsettings.Production.json` (chuỗi kết nối, khóa ký token), rồi bật lại và gọi thử `/api/health`.

Cấu hình riêng của máy chủ nằm ở `<InstallRoot>\api\appsettings.Production.json` - lần đầu script tạo từ mẫu, các chỗ `DIEN_VAO_DAY` phải điền trước khi API chạy được. Schema CSDL tự cập nhật lúc khởi động (`Database.MigrateAsync`), không cần chạy `dotnet ef` trên máy chủ.

#### Tự phát hành tiện ích Chrome (không qua Web Store)

Khi không đưa tiện ích lên Chrome Web Store, máy chủ IIS đóng luôn vai trò kênh cập nhật: gói `.crx` đã ký + `update.xml` được phục vụ tại `/ext`, máy trạm cài bằng chính sách nhóm nên Chrome tự kiểm tra bản mới khoảng 5 giờ một lần.

```powershell
# Máy build: thêm -ExtensionKey để gói kèm tiện ích (Chrome/Edge phải cài sẵn để ký)
.\deploy\iis\Build-Package.ps1 -ExtensionKey C:\keys\zerocheck.pem

# Máy chủ: deploy như thường, script tự điền địa chỉ thật vào update.xml
.\Deploy-Iis.ps1 -HostHeader cbyts.donvi.vn
```

**File khóa `.pem` quyết định ID tiện ích và là thứ ký mọi bản cập nhật.** Lần đầu chưa có khóa thì Chrome sinh mới và script chép vào đường dẫn `-ExtensionKey`; phải sao lưu nơi an toàn và dùng lại mãi mãi - mất khóa là đổi ID, mọi máy trạm coi như tiện ích khác và phải cài lại. Khóa đã vào `.gitignore` (`*.pem`), tuyệt đối không commit: ai có nó đều ký được bản cập nhật giả gửi tới toàn bộ máy trạm.

Sau khi deploy, script in ra ID tiện ích và địa chỉ `https://<tên miền>/ext/update.xml`, đồng thời sinh sẵn `<InstallRoot>\web\ext\chrome-policy.reg` đã điền đúng địa chỉ. Đưa file `.reg` này cho quản trị máy trạm chạy quyền admin (hoặc đẩy bằng Group Policy - khóa `ExtensionInstallForcelist` cho cả Chrome lẫn Edge). Máy trạm sẽ tự cài, tự cập nhật, và **người dùng không gỡ được** tiện ích.

Phát hành bản mới = tăng `version` trong `manifest.json`, chạy lại `Build-Package.ps1 -ExtensionKey ...` với đúng khóa cũ rồi `Deploy-Iis.ps1`. Không cần đụng gì tới máy trạm.

Lưu ý khi vận hành:

- Deploy một gói **không** kèm tiện ích sẽ giữ nguyên `web\ext` sẵn có, nên kênh cập nhật của máy trạm không bị đứt.
- `-ExtensionBaseUrl https://cbyts.donvi.vn` dùng khi máy trạm truy cập qua địa chỉ khác với binding của IIS (ví dụ đứng sau reverse proxy hoặc NAT).
- IIS mặc định trả 404.3 cho `.crx`; script tự thêm MIME `application/x-chrome-extension`. Nếu máy trạm báo lỗi tải, kiểm tra `https://<tên miền>/ext/update.xml` mở được bằng trình duyệt trước.

Không dùng IIS thì chạy dạng Windows Service:

```powershell
cd AIValidation.Api
dotnet publish -c Release -o C:\apps\chienbinh-api
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
| `Rbac__Mode` | `Audit` (chỉ ghi nhật ký từ chối) hoặc `Enforce` (chặn thật). Lên bản mới thì chạy `Audit` trước, soi nhật ký, cấp bù quyền rồi mới đổi - xem [INSTALLATION.md](INSTALLATION.md) mục 7 |
| `Licensing__Mode` | `Off` / `Warn` / `Enforce` cho khóa bản quyền theo cơ sở KCB |

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
