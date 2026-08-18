# Mô tả tính năng

## 1. Cảnh báo nhập liệu thời gian thực trên HIS

Extension chạy ngầm trên trang HIS của VNPT:

- **Phát hiện form tự động** (FormAnalyzer): quét DOM, nhận diện trường nhập theo label/placeholder/thuộc tính, không cần cấu hình cứng theo từng màn hình.
- **Theo dõi thay đổi** (ChangeTracker + MutationWatcher): bắt sự kiện blur/change kể cả trường do JavaScript sinh động.
- **Cảnh báo tại chỗ** (NotificationManager + HighlightManager): viền đỏ/vàng trường lỗi, tooltip giải thích tiếng Việt, âm báo tùy chọn.
- Rule cục bộ chạy trước (regex, bắt buộc, so sánh ngày) — phản hồi < 50ms; rule sâu gọi API.

## 2. Kiểm tra hồ sơ XML 130 — cây kiểm tra

Người dùng upload file XML 130 vào khung chat của extension (hoặc gõ mã bệnh nhân để hệ thống tự tải XML từ HIS). Kết quả trả về theo cây:

```
Kiểm tra hồ sơ
├── Thông tin bệnh nhân (PatientInfo)
│     ├── Mã thẻ BHYT: cấu trúc 15 ký tự / 10 số định danh
│     ├── Hạn thẻ: GT_THE_TU ≤ GT_THE_DEN; còn hạn tại ngày vào viện;
│     │            cảnh báo hết hạn giữa đợt (quy tắc 15 ngày nội trú)
│     ├── Nơi đăng ký KCB ban đầu (MA_DKBD 5 ký tự)
│     └── Ngày sinh/tuổi hợp lý, giới tính hợp lệ
├── Chẩn đoán (Diagnosis)
│     ├── ICD chính: bắt buộc, đúng định dạng, có trong danh mục,
│     │              được phép làm chẩn đoán chính (mã nhóm/mã † bị chặn)
│     ├── ICD phụ: định dạng, không trùng mã chính, không lặp
│     └── Quan hệ ICD: phù hợp giới tính (vd bệnh sản khoa trên nam),
│                      phù hợp độ tuổi; mã bệnh dòng chi tiết ⊆ chẩn đoán hồ sơ
├── Dịch vụ kỹ thuật (Service — XML3)
│     ├── Điều kiện thanh toán: thành tiền = SL × đơn giá × tỷ lệ,
│     │                          mức hưởng/tỷ lệ 0–100%, T_BHTT ≤ thành tiền
│     ├── Thời gian: ngày y lệnh/thực hiện/kết quả trong đợt điều trị
│     └── Số lượng > 0, mã bệnh chỉ định khớp chẩn đoán
├── Thuốc (Drug — XML2)
│     ├── Kiểm tra tương tự dịch vụ (tiền, thời gian, số lượng)
│     ├── Phù hợp ICD: mã bệnh chỉ định thuốc thuộc chẩn đoán hồ sơ
│     └── Danh mục & tuổi: đối chiếu KnowledgeItems (metadata minAge/maxAge)
├── Thời gian (Time)
│     ├── Vào ≤ ra, thanh toán ≥ ra viện, số ngày điều trị khớp
│     └── Khám ngoại trú < 5 phút → cảnh báo "khám hình thức"
├── Tài chính (Finance)
│     ├── Cơ cấu nguồn: BHTT + BNTT + BNCCT + nguồn khác = tổng chi BH
│     └── T_THUOC = Σ XML2; T_VTYT = Σ vật tư XML3; tổng chi = Σ chi tiết
├── Liên kết (Link)
│     └── MA_LK bảng con khớp XML1; họ tên/mã thẻ giấy tờ khớp; thiếu XML1
└── Hành chính/Giấy tờ (Admin)
      ├── Logic nội/ngoại trú (NGAY_VAO_NOI_TRU, SO_NGAY_DTRI)
      ├── XML13 giấy chuyển tuyến: MA_CSKCB_DEN bắt buộc,
      │        XML1.GIAY_CHUYEN_TUYEN không được trống khi có XML13
      ├── XML14 hẹn khám lại: ngày hẹn sau ngày ra viện
      └── Kết quả điều trị ↔ loại ra viện (tử vong phải khớp)
```

Mỗi vấn đề gồm: mã rule, mức độ (Error/Warning/Info), bảng + trường + dòng, giá trị hiện tại, thông báo tiếng Việt, gợi ý sửa, và cờ **`xuatToanRisk`** — tổng hợp thành banner "⚠ Hồ sơ có nguy cơ xuất toán" trên UI.

Ngoài 6 rule engine, hệ thống kiểm tra **455 trường của cả 15 bảng** (XML1–XML15: thuốc, DVKT/VTYT, CLS, diễn biến lâm sàng, HIV, giấy ra viện, tóm tắt HSBA, giấy chứng sinh, nghỉ dưỡng thai, nghỉ hưởng BHXH, GĐYK, chuyển tuyến, hẹn khám lại, lao) theo đặc tả sinh từ file Excel QĐ 130/QĐ 4750.

## 3. AI học văn bản y tế (RAG)

- Nạp công văn/thông tư/quyết định (file text hoặc JSON) → hệ thống tự chia đoạn, đánh chỉ mục full-text.
- Hỏi đáp: "Thẻ BHYT hết hạn trong đợt điều trị nội trú thì thanh toán thế nào?" → AI trả lời dựa trên văn bản đã nạp, dẫn nguồn `[Nguồn 1]`, từ chối trả lời khi không có căn cứ.
- Quản lý kho: liệt kê, gỡ văn bản (soft delete — không mất dữ liệu).

## 4. Nhận định AI về hồ sơ

`POST /api/xml130/validate?useAi=true`: sau khi rule engine chạy xong, LLM (vai "chuyên gia giám định BHYT") đánh giá mức độ nguy cơ và xếp thứ tự 3 việc cần sửa theo ảnh hưởng tài chính. Không có API key → bỏ qua, kết quả rule engine vẫn đầy đủ.

## 5. Danh mục rule công khai

`GET /api/xml130/rules` trả về catalog 100 rule (JSON) để UI hiển thị "hệ thống kiểm tra những gì" — minh bạch với người dùng và giám định viên.

## 6. Cấu hình & quản trị hệ thống (web admin)

Trang **Cấu hình hệ thống** cho quản trị viên (RBAC động - mỗi endpoint một mã quyền `{Controller}.{Action}`, ví dụ `LlmConfig.Update`, `RateLimitConfig.Update`) chỉnh vận hành mà không cần build lại/khởi động lại:

- **Nạp đặc tả cấu trúc XML130**: upload file Excel định nghĩa 15 bảng chỉ tiêu (QĐ130 + QĐ4750 + điều chỉnh 2024). Hệ thống đọc mọi sheet "Bảng 1..15", cập nhật kiểu dữ liệu/kích thước/diễn giải, thêm/bớt trường, tự nhận diện trường ngày và danh mục giá trị từ cột diễn giải — **điều kiện kiểm tra hồ sơ đổi theo file ngay**, giữ nguyên các điều kiện đã tinh chỉnh của trường cũ. Ghi đè bền ra `Storage/field_specs.json` (sống sót khi restart pod). Endpoint: `POST /api/xml130/field-specs/import`, `GET /api/xml130/field-specs`.
- **Ngưỡng chống spam request (rate limit)**: chỉnh giới hạn request/phút/IP cho toàn API và các endpoint nhạy cảm (đăng nhập, quên mật khẩu, hỏi đáp AI, nạp đặc tả). **Áp dụng ngay không cần restart** (xem [PERFORMANCE-SECURITY.md](PERFORMANCE-SECURITY.md)). Endpoint: `GET/PUT /api/admin/rate-limit`.
- **Chuyển AI online/offline**: đổi giữa OpenRouter (cloud) và Ollama (local) + đổi model, kiểm tra kết nối — không cần restart. Endpoint: `GET/PUT /api/admin/llm-config`.
- **Lịch đồng bộ danh mục ICD-10**: bật/tắt và đặt giờ tự động lấy dữ liệu ICD mỗi ngày; nút "Đồng bộ ngay".
- **Phân quyền (RBAC động)**: quản lý người dùng, vai trò, quyền; nhật ký kiểm toán (audit log) mọi thay đổi cấu hình. Bảng quyền **không nằm trong mã nguồn** mà do bộ quét endpoint sinh ra lúc khởi động (mã `{Controller}.{Action}`, gom nhóm theo controller): thêm một API mới là màn hình **Quyền** có ngay dòng mới để gán, không phải build lại. Ở đó quản trị viên bật/tắt từng quyền (tắt là chặn ngay, không cần khởi động lại), sửa tên hiển thị tiếng Việt, bấm **Quét lại**, và soi **Nhật ký từ chối** - mỗi lần 403 đều ghi rõ thiếu mã quyền nào và vì lý do gì (chưa đăng nhập / không có vai trò / quyền bị tắt / chưa được cấp).

## 7. Nhiều cơ sở KCB trên một hệ thống

Một bản cài phục vụ nhiều cơ sở KCB mà dữ liệu không lẫn vào nhau, theo đúng **cây đơn vị** (Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã):

- **Quản trị hệ thống** thấy toàn bộ dữ liệu, quản danh mục chuẩn quốc gia (ICD-10, DVKT), cấu hình LLM, giấy phép và phân quyền. Các bảng Người dùng, Kho tri thức, Nhật ký, Tính tiền, Giấy phép có thêm cột **Cơ sở** hiện `Tên (mã)` để biết dòng đó của ai.
- **Quản trị cơ sở** chỉ thấy cơ sở mình **và cả nhánh cấp dưới**: tự tạo tài khoản, tự nạp danh mục HIS, tự nạp kho tri thức riêng, tự cấu hình robot. Màn hình của họ **không** hiện cột Cơ sở - mọi dòng đều là của họ, cột đó chỉ tốn chỗ. Ghi dữ liệu ra ngoài phạm vi bị chặn ở server kèm lý do, không âm thầm bỏ qua.
- **Dùng chung hay dùng riêng**: văn bản kho tri thức để trống cơ sở là **dùng chung** cho mọi đơn vị; gắn cơ sở thì chỉ nhánh đó tra ra. Danh mục HIS thì kế thừa ngược lên cây - cơ sở chưa nạp thì dùng danh mục của cấp trên.
- **Cấu hình robot theo cơ sở**: mỗi cơ sở đặt được diện mạo/hành vi robot riêng, chưa đặt thì thừa hưởng cấp trên rồi mới đến cấu hình chung. Tiện ích nhận diện cơ sở bằng chính **khóa bản quyền** đã khai ở popup, nên đổi khóa sang cơ sở khác là robot đổi theo, không cần cài lại.

## 8. Bán theo cơ sở KCB: khóa bản quyền & tính tiền

Mô hình thương mại: mỗi **cơ sở KCB** ký một hợp đồng, được cấp một **khóa bản quyền** riêng; sản lượng dùng thật của từng cơ sở được ghi vào sổ để lập bảng kê và chốt hóa đơn.

- **Cấp khóa (web admin → Hợp đồng cơ sở)**: chọn đơn vị trong cây, đặt gói cước, hạn mức hồ sơ/tháng, cước thuê bao, đơn giá hồ sơ vượt hạn mức, thời hạn hiệu lực. Bật *"dùng được cho cả đơn vị cấp dưới"* khi một Trung tâm Y tế huyện ký thay cho toàn bộ Trạm Y tế xã - sản lượng cả nhánh dồn về hợp đồng đó. Cấp lại khóa (rotate), tạm dừng, thu hồi, khôi phục đều có; mỗi đơn vị chỉ có tối đa một hợp đồng còn hiệu lực. Endpoint: `GET/POST /api/license`, `PUT /api/license/{id}`, `POST /api/license/{id}/rotate|revoke|restore`.
- **Khóa chỉ hiện đúng một lần**: hệ thống lưu bản băm SHA-256, không lưu chuỗi gốc. Sau khi cấp, hộp thoại hiện khóa kèm hướng dẫn bàn giao và chỉ đóng được sau khi đã chép - quên thì cấp lại khóa mới, không tra ngược được.
- **Khai khóa ở tiện ích**: mục **Khóa bản quyền** trong popup tiện ích (khóa đơn vị, mã cơ sở KCB của máy trạm, mã nhân viên), lưu trên máy trạm và gửi kèm mỗi request qua header `X-License-Key` / `X-Staff-Code`. Có hiệu lực ngay, không cần tải lại trang HIS.
- **Chặn dùng ngoài phạm vi hợp đồng**: mã cơ sở khai trong file XML được đối chiếu với phạm vi của khóa; hồ sơ của đơn vị khác bị từ chối kèm thông báo tiếng Việt. Mức siết đặt bằng cấu hình `Licensing:Mode`: `Off` (chỉ ghi sổ), `Warn` (vẫn phục vụ nhưng cảnh báo), `Enforce` (chặn thật) - triển khai được theo lộ trình, không cắt dịch vụ của cơ sở chưa kịp nhận khóa.
- **Bảng kê sản lượng theo kỳ (web admin → Tính tiền)**: mỗi kỳ `tháng/năm` (giờ Việt Nam) liệt kê từng cơ sở - số hồ sơ đã kiểm, số vượt hạn mức, số lượt hỏi AI, thành tiền. Xem chi tiết một hợp đồng: biểu đồ theo ngày, tách theo đơn vị phát sinh và theo nhân viên. Một hồ sơ kiểm lại nhiều lần chỉ tính một lần (khử trùng theo `MA_LK`). Endpoint: `GET /api/billing/usage`, `GET /api/billing/usage/{licenseId}`.
- **Chốt sổ & hóa đơn**: `POST /api/billing/close` sinh hóa đơn đóng băng số liệu kỳ đó - sau này sửa giá gói cước không làm hóa đơn đã phát hành đổi số. Chạy lại không tạo bản trùng. Endpoint tra cứu: `GET /api/billing/invoices`.
