===========================================================
task-012 — Tải kết quả kiểm tra XML 130 (PDF / Word / Excel)
===========================================================

## Yêu cầu (người dùng)

Sau mỗi lượt kiểm tra XML 130 — bất kể vào bằng đường nào (số vào viện, import
file, hoặc hai nút mới trên màn hình Kiểm tra bảng kê) — phải tải được kết quả
ra **PDF, Word, Excel**.

Cách hiện: chỉ một dòng chữ "Tải kết quả" kèm 3 biểu tượng nhỏ đặt ngay dưới
từng lượt kiểm tra, không làm rối khung chat.

Người dùng hỏi thêm: qua lượt kiểm tra mới thì còn tải được kết quả cũ không?
Nếu không thì phải ẩn chỗ tải của lượt cũ đi.

Bổ sung giữa chừng: ba biểu tượng phải là **icon thật** của PDF / Word / Excel
cho đẹp, không dùng emoji.

## Trả lời câu hỏi "kết quả cũ có tải được không"

**Có — và giữ lại được.** Khung chat vốn đã giữ nguyên phần HTML kết quả của mọi
lượt trước trong DOM; bản báo cáo dạng dữ liệu thô còn nhẹ hơn hẳn phần HTML đó.
Nên giữ kết quả cũ tải được không tốn thêm gì đáng kể so với thứ đã nằm sẵn
trong bộ nhớ.

Chỉ chặn ở số lượt tối đa (`MAX_KEPT = 10`) để phiên làm việc kéo dài cả ngày
không phình vô hạn. Lượt vượt quá 10 **không biến mất lặng lẽ**: thanh nút đổi
thành một dòng ghi chú nói rõ vì sao không tải được nữa và bảo kiểm tra lại.

## Thiết kế

Tách hẳn khỏi `ChatMessageRenderer` (bên đó sinh HTML cho khung chat), vì file
tải về cần **dữ liệu thô**, không phải HTML. Một mô hình chung ở giữa để ba bộ
xuất không phải bóc lại HTML:

```
Kết quả API ──> ReportBuilder ──> ResultReport ──> buildReportTables()
                                                        │
                                    ┌───────────────────┼───────────────────┐
                              PdfReportExporter   WordReportExporter   ExcelReportExporter
```

- `ResultReport` — mô hình báo cáo phẳng (tổng quan, đối chiếu chéo, vấn đề theo
  hồ sơ, file không đọc được). `ReportBuilder.fromValidation()` cho lượt kiểm tra
  một hồ sơ/một file; `ReportBuilder.fromStream()` cho lượt kiểm tra lô.
- `buildReportTables()` — quy đổi thành danh sách bảng, dùng chung cho cả ba định
  dạng nên đổi cột chỉ phải sửa một chỗ và ba file luôn khớp nhau.
- `IReportExporter` — thanh nút chỉ biết interface này, thêm định dạng mới không
  phải sửa thanh nút (OCP).
- `ResultDownloadBars` — dựng thanh nút + quyết định lượt nào còn tải được (SRP).
- `ZipWriter` (`shared/file/`) — ghi ZIP "store" tối giản, dùng chung cho cả
  .docx lẫn .xlsx.

### Vì sao PDF đi qua hộp in của trình duyệt

PDF không có sẵn font tiếng Việt: tự sinh file PDF thì phải nhúng và cắt subset
một font TrueType mới ra được chữ có dấu — nặng và dễ sai. Trình duyệt đã làm sẵn
việc đó khi in, nên dựng trang in sạch trong iframe ẩn rồi gọi `print()`, người
dùng chọn "Lưu thành PDF". Lưu ý: iframe `display:none` **không in ra gì**, phải
dùng `opacity:0; width:0; height:0`.

### Vì sao tự viết ZipWriter thay vì kéo thư viện zip

`.docx` và `.xlsx` đều là gói ZIP chứa XML. Phần ZIP thực sự cần chỉ có local
header + central directory + EOCD; kéo cả một thư viện zip vào bundle content
script chỉ để xuất báo cáo là quá nặng. Không nén (method 0) nên file to hơn chút
nhưng khỏi cần deflate.

### Word/PDF cắt bớt dòng, Excel thì không

Word và PDF là bản để **đọc** nên chỉ in tối đa 500 dòng vấn đề; Excel là bản
**đầy đủ** để lọc và đối chiếu tiếp. Chỗ cắt bớt được ghi rõ thành ghi chú ngay
dưới bảng ("chỉ in 500/1234 dòng, tải bản Excel để có đủ"), không lặng lẽ bỏ đi.

## File đã tạo

- `extension/src/shared/file/ZipWriter.ts`
- `extension/src/content/chat/export/ResultReport.ts`
- `extension/src/content/chat/export/ReportTables.ts`
- `extension/src/content/chat/export/ReportExporter.ts`
- `extension/src/content/chat/export/PdfReportExporter.ts`
- `extension/src/content/chat/export/WordReportExporter.ts`
- `extension/src/content/chat/export/ExcelReportExporter.ts`
- `extension/src/content/chat/export/ResultDownloadBars.ts`
- `extension/src/content/chat/export/index.ts`

## File đã sửa

- `extension/src/content/chat/ChatPanel.ts` — gắn thanh tải vào cả 4 đường kiểm
  tra, dọn dữ liệu khi xóa lịch sử, CSS `.chat-download*`.

## Kiểm chứng

- `npx tsc --noEmit` sạch, `npm run build` sạch.
- Chạy thật bộ sinh file trong Node (bundle bằng esbuild, giả lập `saveBlob`):
  ra `.docx` 14.342 byte và `.xlsx` 8.632 byte, cấu trúc ZIP đúng.
- **Mở bằng Microsoft Word/Excel thật** (COM): Word đọc được 71 đoạn / 4 bảng,
  Excel đọc được 4 sheet đúng tên. Không có hộp thoại "cần sửa chữa file".
- Trích lại chữ từ `word/document.xml`: dấu tiếng Việt đúng, ký tự `&`, `"`,
  `<b>` được escape thành chữ thường chứ không thành thẻ.
- Chụp màn hình thanh tải trong panel rộng 340px: nhãn + 3 nút nằm gọn một hàng.

===========================================================
TASK HISTORY
===========================================================

## 2026-07-31 — Tải kết quả kiểm tra ra PDF / Word / Excel

**Vấn đề**
Kiểm tra xong chỉ xem được trên khung chat, không mang kết quả ra ngoài được để
gửi cho khoa/phòng hay đối chiếu tiếp trên Excel.

**Nguyên nhân**
Kết quả chỉ tồn tại dưới dạng HTML do `ChatMessageRenderer` sinh ra cho khung
chat, không có mô hình dữ liệu nào dùng lại được cho việc xuất file.

**Giải pháp**
Thêm tầng mô hình báo cáo `ResultReport` ở giữa, ba bộ xuất cắm vào qua
`IReportExporter`. Tự viết `ZipWriter` cho .docx/.xlsx; PDF đi qua hộp in của
trình duyệt để có chữ tiếng Việt chuẩn.

**File đã thay đổi**
9 file mới trong `shared/file/` và `content/chat/export/`, sửa `ChatPanel.ts`.

## 2026-07-31 — Giữ được bản tải của các lượt kiểm tra cũ

**Vấn đề**
Lo kết quả lượt cũ không tải lại được sau khi chạy lượt mới.

**Nguyên nhân**
Ban đầu định chỉ giữ lượt cuối cho nhẹ bộ nhớ.

**Giải pháp**
Đo lại: khung chat vốn đã giữ HTML kết quả của mọi lượt, mô hình báo cáo còn nhẹ
hơn hẳn — nên giữ 10 lượt gần nhất. Lượt vượt quá không biến mất lặng lẽ mà đổi
thành dòng ghi chú giải thích.

**File đã thay đổi**
`export/ResultDownloadBars.ts`, `ChatPanel.ts` (CSS `.chat-download-note`).

## 2026-07-31 — Lỗi biên dịch Uint8Array khi ghép Blob

**Vấn đề**
`npx tsc --noEmit` báo `Uint8Array<ArrayBufferLike>` không gán được vào `BlobPart`.

**Nguyên nhân**
TypeScript 5.9: `Uint8Array` không tham số mặc định là `ArrayBufferLike`, bao gồm
cả `SharedArrayBuffer` — mà `Blob` không nhận `SharedArrayBuffer`.

**Giải pháp**
Khai báo kiểu `ZipBytes = Uint8Array<ArrayBuffer>` dùng thống nhất trong
`ZipWriter`, thay vì ép kiểu ở chỗ gọi.

**File đã thay đổi**
`extension/src/shared/file/ZipWriter.ts`.

## 2026-07-31 — Ba nút dùng icon thật của PDF / Word / Excel

**Vấn đề**
Ba biểu tượng ban đầu là emoji (📄 📝 📊) — không nhận ra ngay là định dạng nào.

**Nguyên nhân**
Chọn emoji cho nhanh, chưa tính tới việc người dùng phải phân biệt ba nút cạnh nhau.

**Giải pháp**
`fileTypeIcon()` trong `ReportExporter.ts` vẽ SVG nội tuyến hình trang giấy gấp
góc theo đúng màu nhận diện (đỏ PDF `#e2453b`, xanh Word `#2b579a`, xanh lá Excel
`#217346`). SVG nội tuyến nên không phải kèm ảnh vào gói và không mờ ở màn hình
độ phân giải cao. Nút nới từ 26px lên 28px cho vừa icon 18px.

**File đã thay đổi**
`export/ReportExporter.ts`, `export/PdfReportExporter.ts`,
`export/WordReportExporter.ts`, `export/ExcelReportExporter.ts`, `ChatPanel.ts`.

## 2026-07-31 — Đổi tên bước hướng dẫn

**Vấn đề**
Bước tour tên "Kiểm tra một bệnh nhân" không khớp cách gọi của cán bộ nghiệp vụ.

**Giải pháp**
Đổi thành "Kiểm tra hồ sơ đang chọn".

**File đã thay đổi**
`extension/src/content/ui/OnboardingTour.ts`.

## 2026-07-31 — Quy ước tên file tải về + biểu tượng 💡 khi thu gọn

**Vấn đề**
1. Tên file tải về đặt tùy tiện theo từng đường kiểm tra, tải nhiều lượt về cùng
   thư mục thì không biết file nào của hồ sơ nào, lượt nào.
2. Lời chào thu gọn lại nhảy sang mép trái, mắt phải đi tìm biểu tượng 💡.

**Nguyên nhân**
1. Mỗi chỗ gọi tự ghép một chuỗi tiêu đề riêng, không có quy ước chung.
2. `.chat-welcome-collapsed` để `align-self: flex-start` (mặc định của tin nhắn bot),
   trong khi lúc mở nút nằm ở góc trên bên PHẢI.

**Giải pháp**
1. Thêm `ReportNaming` giữ quy ước ở đúng một chỗ:
   `<yyyyMMdd HH-mm-ss> Kết quả kiểm tra XML130 <phần nhận diện>`, trong đó phần
   nhận diện là tên file XML (tự chọn file), tên bệnh nhân + ngày khám (kiểm tra
   một hồ sơ), hoặc để trống (kiểm tra lô — thời điểm đã đủ phân biệt).
   Ngày khám của HIS dạng `dd/MM/yyyy` phải đổi `/` thành `-`, giờ dùng `-` thay
   `:` vì Windows cấm hai ký tự này trong tên file.
   `ResultReport` tách `title` (tiêu đề in trong tài liệu) khỏi `fileBase` (gốc tên
   file). Riêng PDF: `<title>` của trang in đặt bằng `fileBase`, vì hộp in Chrome
   lấy chính nó làm tên mặc định khi chọn "Lưu thành PDF".
   `PaymentListStore.findTicket()` để tra ngày khám theo số vào viện.
2. `.chat-welcome-collapsed` đổi sang `align-self: flex-end` + bo tròn hẳn, biểu
   tượng đứng yên đúng chỗ cũ khi đóng/mở.

**File đã thay đổi**
`export/ReportNaming.ts` (mới), `export/ResultReport.ts`, `export/index.ts`,
`export/WordReportExporter.ts`, `export/ExcelReportExporter.ts`,
`export/PdfReportExporter.ts`, `chat/PaymentListStore.ts`, `chat/ChatPanel.ts`.

## 2026-07-31 — Gõ tay số vào viện vẫn có ngày khám trong tên file

**Vấn đề**
Gõ tay số vào viện (không qua bảng kê) thì tên file chỉ có tên bệnh nhân, thiếu
ngày khám — trong khi chính file XML đang kiểm tra có sẵn thông tin đó.

**Nguyên nhân**
Ngày khám chỉ lấy từ phiếu thanh toán đã nhớ; API trả về hồ sơ nhưng không kèm
ngày vào viện nên extension không có nguồn nào khác để lấy.

**Giải pháp**
API trả thêm `NgayVao` trong `Xml130HosoResult`, lấy từ XML1/NGAY_VAO và định
dạng sẵn `dd/MM/yyyy`. Không bóc XML ở phía extension: file XML 130 có hai dạng
(thường và mã hóa base64 theo QĐ 130), viết lại phần đọc đó trong content script
là nhân đôi nghiệp vụ — trái nguyên tắc "mọi nghiệp vụ xử lý tại Backend API".
`patientSubject()` lấy ngày khám theo thứ tự: bảng kê (thứ người dùng đang nhìn
thấy) → `ngayVao` của hồ sơ → bỏ trống.

**File đã thay đổi**
`chat/ChatModels.ts`, `chat/ChatPanel.ts`; phía API: `Models/Xml130/Xml130ValidationModels.cs`,
`Services/Xml130/Xml130ValidationService.cs`.
