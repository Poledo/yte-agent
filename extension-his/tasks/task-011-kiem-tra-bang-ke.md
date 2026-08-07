===========================================================
task-011 — Kiểm tra XML 130 từ màn hình Kiểm tra bảng kê
===========================================================

## Yêu cầu (người dùng)

Trên màn hình **Kiểm tra bảng kê** của HIS, sau khi cán bộ bấm **Tìm kiếm**,
extension phải lấy đúng danh sách phiếu thanh toán vừa tìm được và cho kiểm tra
XML 130 ngay tại chỗ — không bắt xuất file, không bắt gõ tay số vào viện.

Hai lối vào:

- **📋 Kiểm tra (n) file XML130** — cả lô theo danh sách vừa tìm.
- **🔎 Kiểm tra XML130 cho BN** — chỉ hồ sơ của dòng bảng kê đang chọn.

## Phạm vi

- Chỉ chạy trên trang có đuôi `/kiemtrabangke` (domain phía trước tùy bệnh viện,
  ví dụ `https://yte-ninhthuan.vnpthis.vn/web_his/...`). Màn hình khác không hiện nút.
- Không tìm kiếm lại giúp người dùng — chỉ đọc kết quả tìm kiếm của chính họ.
- Tải hồ sơ từ HIS bằng phiên đăng nhập sẵn có của tab, không nhập lại tài khoản.

## Thiết kế

- `PaymentListSniffer` chạy ở world **MAIN**, nghe phản hồi API tìm kiếm của HIS.
- `PaymentListStore` (world isolated) giữ danh sách, dòng đang chọn, cờ đã tìm chưa,
  và `isSupportedPage()` quyết định có hiện thanh nút hay không.
- `BatchCapacity` đo cấu hình máy đang dùng để ra hạn mức một lô và ước tính thời
  gian chờ. `ChatPanel` chỉ hỏi người dùng và chạy, không tự tính hạn mức.
- `ConfirmDialog` (Shadow DOM) thay cho `window.confirm` để không bị HIS chặn.

## TASK HISTORY (append-only — không xóa/ghi đè)

### 2026-07-31 — Hạn mức lô canh sai thứ nguyên + lời chào thiếu 2 nút bảng kê

**Vấn đề**

1. Danh sách 778 phiếu đi thẳng qua mà không cảnh báo gì, rồi tab treo lâu.
2. Lời chào trong panel mô tả nút `+` và nút 📎 nhưng không nhắc gì tới hai nút
   bảng kê, dù đó là nút to nhất trên panel.

**Nguyên nhân**

1. `BatchCapacity.maxFiles` chỉ tính theo RAM: `deviceMemory` bị Chrome chặn trần ở
   8 → `8 GB × 0,2 = 1,6 GB`, kẹp bởi `HARD_MAX_BYTES` 900 MB → `900MB / 256KB =
   3.600` hồ sơ. Máy 4 GB mặc định cũng ra 3.125. Chặn thật ở 778 hồ sơ không phải
   RAM mà là **thời gian**: tải 778 file từ HIS với 2–8 luồng rồi đẩy lên máy chủ
   kiểm tra và đối chiếu chéo. Hạn mức đang đo sai thứ nguyên.
2. `showWelcome()` viết từ trước khi có tính năng bảng kê, chưa cập nhật.

**Giải pháp**

- `BatchCapacity`: thêm trần thứ hai `MAX_FILES_PER_BATCH = 200` theo thời gian chờ;
  `maxFiles = min(trần RAM, trần thời gian)`. Thêm `capReason: 'ram' | 'thoigian'`
  để hộp thoại nói đúng lý do. Thêm `estimateSeconds`/`estimateWait` (tải song song
  theo số luồng `DOWNLOAD_SECONDS_PER_FILE = 0,8` + kiểm tra
  `VALIDATE_SECONDS_PER_FILE = 0,15` theo p95 đo bằng k6).
- `ChatPanel.checkFromPaymentList`: hộp xác nhận hiện **thời gian chờ dự kiến**.
- `ChatPanel.showWelcome`: mô tả hai nút bảng kê và nói rõ chúng chỉ hiện trên màn
  hình Kiểm tra bảng kê sau khi bấm Tìm kiếm.

**File đã thay đổi**

- `extension/src/content/chat/BatchCapacity.ts`
- `extension/src/content/chat/ChatPanel.ts`

### 2026-07-31 — Vượt hạn mức thì DỪNG, không cắt lô chạy một phần

**Vấn đề**

Người dùng yêu cầu: đã bấm kiểm tra cả lô thì phải kiểm tra hết; máy không đáp ứng
được thì báo, chứ không tự cắt bớt.

**Nguyên nhân**

Bản trước đó `slice(0, plan.maxFiles)` rồi chạy phần đầu danh sách và hẹn phần còn
lại "đợt sau". Nhánh `outOfMemory` giữa chừng cũng vẫn đem phần đã tải đi kiểm tra.
Cả hai đều nguy hiểm hơn là không kiểm tra: **đối chiếu chéo chỉ so các hồ sơ trong
cùng một lô**, nên cặp trùng giường / trùng giờ bác sĩ nằm ở phần bị cắt sẽ lọt,
mà bảng kết quả nhìn vào vẫn tưởng đã soát đủ.

**Giải pháp**

- Bỏ `slice`. Vượt `plan.maxFiles` → báo trong khung chat (nêu con số, cấu hình máy,
  thời gian chờ nếu chặn vì thời gian) và **dừng**, hướng dẫn thu hẹp điều kiện tìm
  kiếm rồi tìm lại. Không mở hộp xác nhận nữa.
- Nhánh `outOfMemory` giữa chừng: dừng hẳn, không kiểm tra phần đã tải, nói rõ lý do.
- `checkBatch` (đường 📎 đính kèm file) vốn đã chặn-và-dừng khi vượt `budgetBytes` —
  giữ nguyên, nay đã nhất quán với đường bảng kê.

**File đã thay đổi**

- `extension/src/content/chat/ChatPanel.ts`

### 2026-07-31 — Tour hướng dẫn 2 nút bảng kê + nút Quay lại + lời chào thu gọn được

**Vấn đề**

1. Màn hình hướng dẫn (OnboardingTour) chưa có bước nào cho hai nút bảng kê mới, và
   không có cách quay lại bước trước khi xem sót.
2. Lời chào chiếm gần trọn khung chat, đọc xong rồi vẫn nằm đó che kết quả kiểm tra.
3. Tên nút trên HIS bị ghi sai: mọi hướng dẫn đều nói "bấm Tìm kiếm", thực tế nút
   làm hiện danh sách bảng kê tên là **Xem thông tin**.

**Nguyên nhân**

1. Tour được viết trước task 011 nên danh sách bước dừng ở nút 📎. Ngoài ra hai nút
   bảng kê chỉ tồn tại trên trang `/kiemtrabangke` — chỉ thêm bước là chưa đủ, ở màn
   hình khác tour sẽ chỉ tay vào chỗ trống.
2. `showWelcome()` chỉ dựng một khối HTML tĩnh, không có trạng thái đóng/mở.
3. Ghi theo trí nhớ khi soạn nội dung, không đối chiếu lại nhãn nút thật trên HIS.

**Giải pháp**

- `OnboardingAnchors` thêm `supports(kind)`; `show()` lọc `STEPS` một lần rồi lưu vào
  `this.steps`, mọi chỗ đếm bước/chấm tiến độ đọc từ đó → số chấm và chỉ số Quay
  lại/Tiếp luôn khớp thực tế. `index.ts` trả `PaymentListStore.isSupportedPage()` cho
  hai anchor bảng kê, nên ngoài trang bảng kê các bước đó biến mất hẳn.
- Thêm 3 bước sau bước 📎: 📋 kiểm tra cả lô, ⏳ khi danh sách quá nhiều hồ sơ (nói rõ
  đã DỪNG chứ không chạy một phần, và cách xử lý là thu hẹp điều kiện tìm kiếm),
  🔎 kiểm tra một bệnh nhân.
- Thêm nút **Quay lại** (`prev()`), ẩn ở bước đầu.
- Lời chào bọc trong `.chat-welcome-body` kèm nút 💡 `.chat-welcome-toggle`: mở sẵn khi
  chưa hỏi gì, tự thu về đúng một biểu tượng ở tin nhắn đầu tiên
  (`collapseWelcomeOnFirstUse` gọi từ `appendMessage`), sau đó đóng/mở là quyền người
  dùng (`welcomeUserDecided`). Chỉ tự thu một lần.
- Đổi "Tìm kiếm" → "Xem thông tin" ở toàn bộ text hiển thị và comment mô tả nút HIS.
- `UnifiedAssistantPanel` import `TourAnchorKind` thay vì khai lại union type (tránh
  duplicate), map thêm `bangke-all` / `bangke-one`.

**File đã thay đổi**

- `extension/src/content/ui/OnboardingTour.ts`
- `extension/src/content/ui/UnifiedAssistantPanel.ts`
- `extension/src/content/index.ts`
- `extension/src/content/chat/index.ts`
- `extension/src/content/chat/ChatPanel.ts`
- `extension/src/content/chat/PaymentListStore.ts`
- `extension/src/page/PaymentListSniffer.ts`
- `extension/src/shared/his/PaymentListChannel.ts`

## 2026-07-31 — Bỏ trần 200 hồ sơ theo thời gian chờ

**Vấn đề**

Bảng kê thật có 778 hồ sơ, bấm "Kiểm tra (N) file XML130" thì bị từ chối:
"Danh sách có 778 hồ sơ, vượt mức kiểm tra một lượt (200 hồ sơ)... phải chờ
khoảng 4 phút, quá lâu cho một lượt". Máy đang dùng RAM 32 GB, 12 luồng CPU —
thừa sức, và thực tế đã kiểm tra được 2000 hồ sơ trong một file import.

**Nguyên nhân**

`BatchCapacity` có HAI trần: trần bộ nhớ (tính theo máy thật) và trần cứng
`MAX_FILES_PER_BATCH = 200` đặt theo THỜI GIAN CHỜ với lập luận "một lượt nên
xong trong khoảng một phút". Trần thứ hai này chặn nhầm: nó không phản ánh sức
máy, và người dùng bị buộc chia bảng kê ra tìm lại nhiều lần — mất công hơn hẳn
việc chờ vài phút. Trong khi đó lô vẫn có thanh tiến độ từng hồ sơ và nút Dừng,
nên "sợ người dùng tưởng treo" không còn là lý do chính đáng.

**Giải pháp**

Bỏ hẳn trần theo thời gian: xóa `MAX_FILES_PER_BATCH`, xóa luôn kiểu `CapReason`
và trường `capReason` (chỉ tồn tại để phân biệt hai trần). `maxFiles` giờ chỉ do
BỘ NHỚ quyết định — với ngân sách 900 MB và ước tính 256 KB/hồ sơ là khoảng
3.600 hồ sơ một lượt. Thời gian chờ chuyển hẳn sang vai trò BÁO TRƯỚC trong hộp
xác nhận, kèm câu nhắc vẫn xem được tiến độ và bấm Dừng bất cứ lúc nào; quyền
quyết định chờ hay không thuộc về người dùng. Chốt chặn bộ nhớ thật vẫn nguyên:
`downloadAdmissionFiles` cộng dồn dung lượng thật và dừng khi chạm ngân sách.

**File đã thay đổi**

- `extension/src/content/chat/BatchCapacity.ts`
- `extension/src/content/chat/ChatPanel.ts`
