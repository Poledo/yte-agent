# Đang làm gì - trạng thái kho mã

Cập nhật: 08/08/2026. File này để mở workspace ở máy/thư mục khác vẫn nắm được đang dở việc gì.
Kiến thức lâu dài đã nằm trong `api-validation/AIValidation.Api/docs/` (ARCHITECTURE.md, DECISIONS.md);
file này chỉ ghi **việc đang dở và việc phải làm tiếp**.

## Bố cục

Kho `yte-agent` là **monorepo** gộp 3 thành phần, chép sang từ 3 repo tách rời cũ ngày 08/08/2026.
Chỉ chép mã nguồn hiện tại, **không mang lịch sử commit** - link 3 repo cũ ghi trong README.

| Thư mục | Nội dung | Quy ước riêng |
|---|---|---|
| `api-validation/` | Backend .NET 10 + EF Core + PostgreSQL | `CLAUDE.md` + `AIValidation.Api/docs/` |
| `web-admin/` | Angular 20 (standalone, signals, Material) | |
| `extension-his/` | Tiện ích Chrome cắm vào HIS | `CLAUDE.md`, `ARCHITECTURE.md` |

Còn nằm ngoài kho, ở workspace cũ `D:\VNPT\hackathon` (chưa chép sang, chưa quyết định):
`nop-btc/` (bản nộp BTC - **không tạo thêm file .md**), `report/` (video + slide),
`data-import/`, `vnpt-cloud/`, `kich-ban-demo/` (**dữ liệu bệnh nhân thật, cố ý không commit**),
`notes/` (**chứa bí mật, không commit, không đọc lên chat**), và các script `gen-*.mjs`.

Cổng hay dùng khi chạy local: 44350 (API HTTPS), 5075 (API HTTP), 4200 (web admin), 11434 (Ollama).
Xong việc thì **tắt server**, kiểm tra 4 cổng trên đã trống.

## Mốc đã nộp BTC

Nằm ở **3 repo cũ**, không có trong kho này: tag `release-v2-final` ở HEAD cả 3
(api `87c657a`, web `7834f61`, ext `549590f`), còn giữ `release-v2.1` làm mốc cũ.
Khi BTC lấy bài phải dặn họ `git fetch --tags --force`.

## Việc đang dở: danh mục HIS theo cơ sở KCB

Ở 3 repo cũ khối này còn **chưa commit**; sang kho này nó nằm sẵn trong mã nguồn.
Mục tiêu: hồ sơ XML 130 của một cơ sở được đối chiếu bằng danh mục HIS của đúng cơ sở đó,
tuyến dưới mượn danh mục tuyến trên theo cây đơn vị.

Thiết kế và lý do đã ghi ở `api-validation/AIValidation.Api/docs/ARCHITECTURE.md`
(mục "Danh mục HIS theo cơ sở KCB và cây đơn vị") và `docs/DECISIONS.md` (4 quyết định cuối file).

Phần đã làm xong:

- **API**: entity `Facility` + migration `20260806100000_AddFacilitiesAndCatalogHash`,
  `FacilityTreeProvider` (chuỗi ưu tiên + cache + chặn vòng cha↔con), `FacilityController`
  (`/api/facility`, `/tree`, `/{code}/catalog-scope`), `CatalogLookupProvider` giải chuỗi theo
  từng loại danh mục, `CatalogSource.ContentHash` + `skipIfUnchanged`, các rule đọc mã cơ sở
  từ `MACSKCB` trong envelope.
- **Kho tri thức tách khỏi import**: `knowledge=false` mặc định, thêm
  `POST/DELETE /api/catalog/sources/{id}/knowledge` và `POST /api/catalog/sources/knowledge`
  (nạp hàng loạt), listing trả thêm `inKnowledgeBase`. Web admin có checkbox chọn nhiều dòng.
- **Extension**: `HisCatalogImporter` + `CatalogImportChannel` - nút "Nạp danh mục HIS" ở popup,
  dùng lại phiên đăng nhập HIS của người dùng (không tự đăng nhập, không xử lý captcha),
  quét `data-cmu-dvtt` và các link `/web_his/exporter_*`, đẩy về API kèm `skipUnchanged=true`.
- **Web admin**: màn hình `/facilities` (cây đơn vị + bảng "đang dùng danh mục của ai"),
  `/catalog` có thêm cột "Cơ sở KCB".

## Bốn lỗi vừa sửa

1. **Dòng tiêu đề lặp giữa file .xls** - `ExcelCatalogReader.IsRepeatedHeader`. HIS xuất danh mục
   theo trang, hết trang lại chèn dòng trống + dòng tiêu đề y hệt, làm cột `DVTT` có thêm giá trị
   `"DVTT"` và file bị từ chối với thông báo "chứa danh mục của nhiều cơ sở KCB khác nhau".
   Đã khóa bằng 2 test trong `AIValidation.Tests/Catalog/ExcelCatalogReaderTests.cs`.
2. **Sửa vai trò ở `/users` không lưu** - `UserAdminService` giờ kiểm tra `IdentityResult`;
   `user-dialog.ts` gọi tuần tự `update` → `assignRoles` thay vì `forkJoin` song song.
   Nguyên nhân: `ConcurrencyStamp` của Identity (xem DECISIONS.md).
3. **`/catalog` thiếu cột cơ sở KCB** - đã thêm, hiện mã + tên đơn vị, danh mục không gắn cơ sở
   hiện "Dùng chung".
4. **Bảng phạm vi danh mục ở `/facilities` sai bố cục** - ghim `width` cột "Số dòng"/"Lấy từ",
   canh phải số, và thay tiêu đề vô nghĩa bằng câu nêu rõ thứ tự ưu tiên.

## Phải làm tiếp

Chặn đường (làm trước):

- **Không đăng nhập được web admin local** với `dhthi.itc@gmail.com`. Đã xác minh: tài khoản
  **tồn tại, đang hoạt động, không bị khóa** - chỉ là mật khẩu khác `Admin@123456`.
  `AuthSeeder` chỉ đặt mật khẩu **lúc tạo mới**; nhánh chuyển đổi từ email cũ
  `admin@chienbinhyteso.vn` không chạy vì email mới đã tồn tại, nên không lần nào đặt lại mật khẩu.
  Công cụ đặt lại nằm ở `%TEMP%\cbyts-pwtool` (chạy bằng `$env:TEMP` trong PowerShell, không phải `%TEMP%`).
  **Việc ghi mật khẩu vào CSDL phải do người dùng tự chạy** - tôi bị chặn ở bước này.
- **Chuỗi kết nối CSDL** phải khai bằng
  `dotnet user-secrets set "ConnectionStrings:KnowledgeDatabase" "..."`.
  Ở workspace cũ mật khẩu từng bị gõ thẳng vào `appsettings.Development.json` (file có trong git);
  bản chép sang kho này **đã lấy lại bản sạch**, đừng gõ mật khẩu vào đó lần nữa.
- **Nạp lại danh mục "Dược nhà SX"**: bản đang có còn dòng rác "Tên nhà sản xuất" (2716 dòng,
  đúng phải 2715). Vì `skipIfUnchanged` so SHA-256 nên nạp lại tự động sẽ bị bỏ qua - **phải gỡ
  danh mục đó rồi nạp lại thủ công**.

Kiểm chứng khi đăng nhập được:

- Sửa vai trò ở `/users` lưu được thật.
- Hai thay đổi giao diện `/catalog` và `/facilities`.
- Nạp lại danh mục Nhân viên + Đơn vị chuyển tuyến bằng ô chọn cơ sở KCB.
- Đối chiếu tên file trong `Content-Disposition` của HIS với `fileNamePatterns` của các profile `E_*`.

Việc dự thi còn treo:

- Nạp thêm tiền OpenRouter rồi thử lại hỏi - đáp online (người dùng tự nạp).
- `phan-hoi-ra-soat.docx` còn ghi "release-v2.1" và 81 test (thực tế 51 test ở project API).
- Quay video demo; ảnh chụp + lỗi chính tả trong HDSD.
- Xóa `LegalDateParser.cs` (mã chết); nạp toàn văn QĐ 130 vào kho tri thức;
  thêm `unaccent` + tsvector không dấu; áp `k8s/hpa.yaml`.
- Kiểm tra quyền collaborator của BTC (`kiemde`, `baoht16-dot`) trên 3 repo cũ.

Việc của riêng monorepo:

- **CI/CD đã gộp về gốc** (`.github/workflows/`, 5 workflow, lọc `paths:` theo thư mục con) —
  bảng chi tiết ở README. Nhánh làm việc là **`master`**. Còn phải làm bằng tay trên GitHub:
  khai 4 secrets `ECR_ID/ECR_USER/ECR_PASSWORD/KUBE_CONFIG` và đổi default branch sang `master`.
  Chưa khai secrets thì job triển khai tự bỏ qua (CI vẫn xanh).
  **Khai xong rồi thì mỗi lần push lên `master` là deploy thẳng lên cụm production.**
- Tag phát hành extension đổi tiền tố: `extension-v1.2.3` (hồi tách repo chỉ là `v1.2.3`),
  vì một kho giờ chứa 3 thành phần.
- Quyết định có chép nốt `nop-btc/`, `report/`, `data-import/`, `vnpt-cloud/` sang không.
- Khi đã chắc chắn, người dùng tự xóa workspace cũ `D:\VNPT\hackathon`.

## Ràng buộc bắt buộc nhớ

- **Không bao giờ** commit/dán bí mật (khóa OpenRouter, mật khẩu CSDL, mật khẩu ứng dụng Gmail,
  `KUBE_CONFIG`). Kho này và 3 repo cũ đều phải giữ ở chế độ private.
- k6 / load test **chỉ** chạy local, dev, hoặc namespace `cbyts-loadtest` dùng xong bỏ.
  **Tuyệt đối không** nhắm vào production `cbyts.vnpt.vn`.
- Luật thi: không dùng dữ liệu thật của khách hàng VNPT, chỉ dữ liệu giả lập hoặc đã ẩn danh.
  `kich-ban-demo/` là dữ liệu thật nên không commit; lên cụm chỉ đưa bản ẩn danh giữ nguyên độ dài.
- Mọi thông báo tới người dùng cuối viết bằng **tiếng Việt**.
- Commit message kết thúc bằng `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Không tạo file .md rác trong `api-validation` (đọc `api-validation/CLAUDE.md`) và không tạo
  thêm .md trong `nop-btc`. Script tạm để ở thư mục temp hệ thống.
