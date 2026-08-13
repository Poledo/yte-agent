# ZeroCheck AI — Chrome Extension cho HIS VNPT

Extension cảnh báo lỗi nhập liệu và kiểm tra hồ sơ XML 130 ngay trên phần mềm khám chữa bệnh (HIS), kết nối AI Validation API (repo `hackathon-api-validation`).

## Tính năng

1. **Cảnh báo nhập liệu thời gian thực** — theo dõi form HIS (MutationObserver + input/change/blur), gửi snapshot về API, hiển thị lỗi/cảnh báo/gợi ý tiếng Việt cạnh trường nhập (nút 🤖 góc phải dưới).
2. **Chat kiểm tra hồ sơ XML 130** (nút 💬, phía trên nút 🤖):
    - Kéo-thả hoặc đính kèm file `.xml` (hồ sơ XML 130) → kết quả nhóm theo Thông tin BN / Chẩn đoán / Dịch vụ / Thuốc / Thời gian / Tài chính / Liên kết / Hành chính, banner đỏ "⚠ Hồ sơ có nguy cơ xuất toán" hoặc xanh "✔ Hồ sơ đạt".
    - Gõ `kiểm tra BN <mã>` → tự tải XML 130 từ HIS (cần cấu hình endpoint, xem dưới).
    - Gõ câu hỏi nghiệp vụ bất kỳ → trợ lý AI trả lời dựa trên văn bản y tế đã nạp, kèm nguồn trích dẫn.

## Build & cài đặt

```bash
cd extension
npm install
npm run build     # build 1 lần → dist/
npm run dev       # hoặc watch mode, tự build khi sửa source
npm run watch   # theo dõi build
```

Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn `extension/dist`.

Cách trên chỉ dùng khi phát triển. Phát hành cho đơn vị xem mục dưới.

## Phát hành cho đơn vị (tự host, không qua Chrome Web Store)

Chrome trên Windows chặn cài tiện ích ngoài Web Store bằng cách kéo thả, nên phát hành nội bộ đi đường **chính sách nhóm**: máy chủ IIS phục vụ gói `.crx` đã ký cùng `update.xml` tại `/ext`, máy trạm khai chính sách trỏ vào đó và Chrome tự cài, tự cập nhật (khoảng 5 giờ một lần). Toàn bộ do `deploy/iis/` lo, xem thêm [OPERATIONS.md](../api-validation/docs/OPERATIONS.md).

### 1. Máy build - sửa địa chỉ máy chủ rồi đóng gói

Địa chỉ API là **hằng số biên dịch**, không đọc lúc chạy, nên phải sửa trước khi build; bỏ qua bước này thì tiện ích cài xong vẫn gọi về `localhost` và báo lỗi kết nối:

| File | Dòng |
| --- | --- |
| `extension/src/content/api/ApiConfiguration.ts` | `baseUrl` |
| `extension/src/content/chat/ChatApiClient.ts` | `BASE_URL` |

```powershell
# Chạy ở gốc monorepo. Chrome hoặc Edge phải cài sẵn trên máy build để ký gói.
.\deploy\iis\Build-Package.ps1 -ExtensionKey C:\keys\zerocheck.pem
```

Kết quả là `deploy\iis\out\cbyts-iis-<phiên bản>.zip` (phiên bản mặc định lấy theo `yyyyMMdd-HHmm`, đặt tên khác bằng `-Version`).

**File `.pem` quyết định ID tiện ích và ký mọi bản cập nhật.** Lần đầu chưa có thì Chrome sinh mới và script chép vào đúng đường dẫn `-ExtensionKey`; phải sao lưu và dùng lại mãi mãi. Đổi khóa = đổi ID = mọi máy trạm coi như tiện ích khác và phải cài lại từ đầu. Khóa đã nằm trong `.gitignore` (`*.pem`) - tuyệt đối không commit, ai có nó cũng ký được bản cập nhật giả gửi tới toàn bộ máy trạm.

### 2. Máy chủ - chép gói lên rồi triển khai

Chép file `.zip` sang máy chủ (RDP copy-paste, ổ mạng, USB - tùy đơn vị), giải nén ra một thư mục bất kỳ, ví dụ `C:\deploy\cbyts`:

```powershell
# PowerShell QUYỀN ADMIN, đứng tại thư mục vừa giải nén
.\Deploy-Iis.ps1 -CheckOnly                 # lần đầu: kiểm tra máy chủ đủ điều kiện chưa
.\Deploy-Iis.ps1 -HostHeader cbyts.donvi.vn
```

Script điền địa chỉ thật vào `update.xml` và file `.reg`, khai MIME cho `.crx` (IIS mặc định trả 404.3), rồi in ra ID tiện ích cùng đường dẫn `https://<tên miền>/ext/update.xml`. Kết quả nằm ở `<InstallRoot>\web\ext\`:

| File | Ai dùng |
| --- | --- |
| `zerocheck-ai-<phiên bản>.crx` | Chrome tự tải, người dùng không đụng tới |
| `update.xml` | Chrome tự đọc để biết có bản mới |
| `chrome-policy.reg` | **file duy nhất gửi cho IT đơn vị** |

Máy trạm truy cập qua địa chỉ khác binding của IIS (reverse proxy, NAT) thì thêm `-ExtensionBaseUrl https://dia-chi-may-tram-goi`.

### 3. Máy trạm - chạy `chrome-policy.reg`

Từng máy, thủ công:

1. Chép file sang máy trạm, bấm chuột phải → **Merge** (hoặc bấm đúp).
2. UAC hỏi quyền admin → **Yes**. File ghi vào `HKEY_LOCAL_MACHINE` nên bắt buộc quyền admin; tài khoản thường sẽ báo *"Not all data was successfully written"*.
3. Xác nhận thêm khóa vào registry → **Yes**.
4. **Đóng hẳn Chrome rồi mở lại** (kể cả icon dưới khay hệ thống). Không cần khởi động lại Windows.

Cả đơn vị, không phải đi từng máy - đẩy bằng Group Policy hoặc script đăng nhập:

```bat
reg import \\may-chu\share\chrome-policy.reg
```

Kiểm tra đã ăn chưa: mở `chrome://policy` → **Reload policies** → thấy `ExtensionInstallForcelist` giá trị dạng `<ID>;https://.../ext/update.xml`. Sau đó `chrome://extensions` hiện ZeroCheck AI kèm nhãn *Installed by enterprise policy* và **không có nút gỡ** - đúng thiết kế, chính sách này khóa luôn việc gỡ và tắt tiện ích.

Ba điểm dễ vấp:

- File ghi cả nhánh Chrome lẫn Edge nên máy dùng Edge cài được luôn, không cần file riêng.
- Đơn vị **đã có sẵn** chính sách `ExtensionInstallForcelist` thì giá trị `"1"` trong file sẽ ghi đè mục số 1 hiện có - đổi thành số chưa dùng trước khi merge.
- Máy trạm bị quản trị bằng GPO miền thì GPO ghi đè lại registry ở lần refresh sau; môi trường có domain nên đi đường GPO ngay từ đầu.

### 4. Người dùng bắt đầu dùng

Mở **HIS** (`https://*.vnpthis.vn/*` - tiện ích chỉ chạy trên các trang này, không phải trang web-admin), bấm icon tiện ích rồi **nhập khóa bản quyền một lần**. Khóa lưu ở `chrome.storage.local`, chính sách nhóm không bơm vào được nên đây là thao tác thủ công duy nhất còn lại trên mỗi máy.

### 5. Phát hành bản mới

Vẫn phải chép gói lên máy chủ - chỉ là **không phải đụng tới máy trạm** nữa.

1. Tăng `version` trong `public/manifest.json` (Chrome so số này để biết có bản mới; quên tăng thì máy trạm không cập nhật).
2. Máy build: đóng gói **đúng khóa `.pem` cũ**. Chỉ sửa tiện ích thì bỏ luôn phần API và web-admin cho gói nhẹ và nhanh:

    ```powershell
    .\deploy\iis\Build-Package.ps1 -ExtensionKey C:\keys\zerocheck.pem -SkipApi -SkipWeb
    ```

3. Chép `.zip` lên máy chủ, giải nén, chạy `Deploy-Iis.ps1` **với đúng các tham số như lần đầu** (`-HostHeader`, `-HttpsPort`, `-InstallRoot`... - script áp lại cấu hình site mỗi lần chạy, thiếu tham số là binding đổi theo mặc định).
4. Xong. Máy trạm tự lấy bản mới trong khoảng 5 giờ, hoặc ngay khi mở lại Chrome. Chỉ máy trạm mới tinh mới cần chạy `.reg` lần đầu.

Chiều ngược lại cũng an toàn: gói **không** kèm tiện ích sẽ không xóa `web\ext` sẵn có, nên deploy riêng phần API hay web-admin không làm đứt đường cập nhật của máy trạm.

Không muốn qua `Deploy-Iis.ps1` thì chép tay cũng được: đóng gói bằng `Pack-Extension.ps1 -BaseUrl https://cbyts.donvi.vn` (điền sẵn địa chỉ vào `update.xml`) rồi copy cả thư mục đè lên `<InstallRoot>\web\ext\`. Nhớ xóa file `.crx` phiên bản cũ.

## Cấu hình

Lưu trong `chrome.storage.local` (đặt qua console DevTools của trang HIS hoặc popup):

| Key              | Ý nghĩa                                                                            | Mặc định                                |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| `hisXmlEndpoint` | URL template tải XML 130 theo mã BN, chứa `{patientCode}` — điểm tích hợp HIS thật | (chưa cấu hình → hướng dẫn upload file) |

```js
chrome.storage.local.set({
    hisXmlEndpoint: 'https://his.example.vn/api/xml130?patient={patientCode}',
})
```

Base URL của API **không** nằm ở đây: nó là hằng số biên dịch trong `ApiConfiguration.ts` và `ChatApiClient.ts`, phải sửa trước khi build (xem mục phát hành ở trên).

## Cấu trúc chính

```
extension/src/
├── content/
│   ├── analyzer/       # FormAnalyzer, FieldDiscovery, LabelResolver
│   ├── tracker/        # ChangeTracker, MutationWatcher, EventBinder
│   ├── validation/     # Rule engine cục bộ (required, regex, date...)
│   ├── pipeline/       # ValidationPipeline → gọi API
│   ├── notification/   # NotificationManager, AssistantBubble, Highlight
│   └── chat/           # ChatPanel (Shadow DOM), ChatApiClient,
│                       #   HisXmlDownloader, ChatMessageRenderer
├── background/         # service worker
└── popup/              # popup cấu hình
```

Tài liệu kiến trúc: [ARCHITECTURE.md](ARCHITECTURE.md), phạm vi dự án: [PROJECT.md](PROJECT.md).
