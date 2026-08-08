# BÁO CÁO TIẾN ĐỘ DỰ ÁN

**Tên sản phẩm:** Chiến binh y tế số — Trợ lý AI cảnh báo xuất toán BHYT cho HIS
**Ngày báo cáo:** 22/07/2026
**Thành phần hệ thống:** Chrome Extension (chạy trên HIS VNPT) · AI Validation API (.NET 10 + PostgreSQL + LLM) · Web Admin (Angular)

---

## 1. Tóm tắt tiến độ chung

Hệ thống đã hoàn thành các luồng chính từ đầu tới cuối: nhập liệu trên HIS → cảnh báo thời gian thực; upload hồ sơ XML 130 (đơn lẻ hoặc cả lô hàng nghìn hồ sơ) → kiểm tra quy tắc + đối chiếu chéo → chỉ rõ lỗi và cách sửa; hỏi đáp nghiệp vụ dựa trên kho văn bản y tế có trích dẫn nguồn. **Ước tính hoàn thành: ~90%** khối chức năng cam kết; phần còn lại là hoàn thiện chất lượng truy hồi RAG, lấy toàn văn văn bản từ vbpl.vn và đóng gói demo.

## 2. Kết quả đạt được trong kỳ

### 2.1. Kiểm tra hồ sơ XML 130 theo lô + đối chiếu chéo (MỚI)

- Endpoint kiểm tra **nhiều file XML 130 cùng lúc**, trả kết quả **streaming** (NDJSON) nên file 1 tháng với 2.000+ hồ sơ vẫn hiện tiến độ từng hồ sơ, không timeout.
- **5 nhóm quy tắc đối chiếu chéo giữa các hồ sơ** (trong 1 file lẫn giữa nhiều file), luôn lấy hồ sơ có thời gian sớm nhất làm gốc và chỉ cảnh báo các hồ sơ sau:
  1. Trùng **giường bệnh** cùng thời điểm — kèm gợi ý chia tiền giường theo TT 22/2023/TT-BYT (2 người: 50%, từ 3 người: 30%) và tính sẵn số tiền khi lấy được đơn giá;
  2. Một **bác sĩ** khám/làm DVKT cho nhiều bệnh nhân cùng lúc tại nhiều nơi — phân biệt "cùng thời điểm" và "khung giờ giao nhau", chỉ rõ khoa/phòng và dòng dữ liệu;
  3. Một **bệnh nhân** có 2 đợt điều trị chồng thời gian;
  4. **Cấp lại thuốc khi liều cũ chưa dùng hết** (ước số ngày dùng từ liều/cách dùng) — cảnh báo nguy cơ xuất toán;
  5. Một bệnh nhân **hưởng dịch vụ đồng thời ở 2 khoa khác nhau** (đã loại trừ nhóm xét nghiệm).
- Phát hiện **trùng lặp dòng chi tiết** (cùng mã, cùng ngày y lệnh) trong một hồ sơ.
- Mỗi cảnh báo ghi rõ: hồ sơ nào, bảng/dòng nào, xung đột với hồ sơ nào, và **hướng xử lý cụ thể**.

### 2.2. Chrome Extension — trải nghiệm kiểm tra lô

- Chọn nhiều file, tiến độ theo từng hồ sơ ngay trên header; nút phóng to/thu nhỏ có hiệu ứng; kết quả và gợi ý hiển thị toàn chiều rộng; trạng thái đạt/nguy cơ tô màu xanh/đỏ, gợi ý nền vàng.
- Khóa toàn bộ nút khi đang kiểm tra/hỏi đáp; tùy chọn "tự phóng to khi kiểm tra nhiều file" lưu trong popup (chrome.storage).
- Ẩn thông báo đối chiếu chéo khi chỉ có 1 hồ sơ (không gây nhiễu).

### 2.3. Kho tri thức RAG — nạp đa định dạng + quản lý hiệu lực

- Nạp **.pdf (kể cả bản scan — OCR 3 tầng: lớp text → Tesseract 200 DPI → 300 DPI tăng cường, tự tải bộ dữ liệu tiếng Việt chất lượng cao), .doc/.docx, .xls/.xlsx, .txt/.md**; file Excel được ghép **tiêu đề cột vào từng dòng** để AI hiểu đúng ngữ nghĩa bảng.
- Văn bản có **ngày hiệu lực / ngày hết hiệu lực**; văn bản hết hiệu lực **tự động bị loại khỏi trích dẫn**; màn hình quản lý dạng bảng có cột hiệu lực, nút "Gỡ hết hạn", gỡ mềm/khôi phục từng văn bản.
- Nạp trùng tên file/tiêu đề thì **tự thay thế bản cũ** và báo cho người dùng.

### 2.4. Tải văn bản pháp luật từ vbpl.vn

- Tìm kiếm theo lĩnh vực + khoảng thời gian + trạng thái hiệu lực (còn/hết/tất cả); danh sách tải về lưu DB.
- 2 tab (kết quả tìm / đã tải), checkbox chọn hàng loạt để **nạp vào / gỡ khỏi kho tri thức**, xem nội dung, xóa vĩnh viễn; ngày hiệu lực đi theo văn bản khi nạp kho.

### 2.5. Tìm kiếm ngữ nghĩa (semantic search) cho RAG — MỚI trong kỳ

- Thêm tầng **vector embedding** chạy hoàn toàn local, miễn phí: Ollama + model bge-m3 (đa ngữ, tiếng Việt tốt) — AI hiểu câu hỏi diễn đạt khác từ ngữ trong văn bản.
- Kho hiện có **105.232 đoạn đã đánh chỉ mục**; đã chuyển kiến trúc lưu trữ/tìm kiếm sang **PostgreSQL pgvector + chỉ mục HNSW** (tìm bằng SQL, không tốn RAM, không quét tuyến tính) — dữ liệu cũ chỉ đồng bộ sang, **không phải embed lại**; chưa cài pgvector thì hệ thống tự chạy chế độ dự phòng trong bộ nhớ, không lỗi.
- Web admin có **dải trạng thái**: Ollama sống chưa, đang dùng chỉ mục pgvector hay bộ nhớ, số đoạn đã/chưa có chỉ mục; nút tạo chỉ mục chạy từng đợt ~40 giây, tự nối tiếp, tự thử lại khi rớt mạng, tiến độ không bao giờ mất giữa chừng.
- Truy hồi kết hợp nhiều tầng: ngữ nghĩa + full-text + từ khóa hiếm (nhận cả biến thể "BT2"/"BT 2") + ép giữ tài liệu chứa mã hiếm sau bước xếp hạng lại bằng LLM; có endpoint chẩn đoán `search-debug` để soi vì sao một tài liệu không được trích dẫn.

### 2.6. Danh mục HIS & Web Admin

- Import danh mục Excel theo profile JSON (thuốc, DVKT, CĐHA, xét nghiệm, giường...); gặp danh mục lạ không khớp profile thì báo lỗi và hướng dẫn bổ sung; màn hình danh mục có tìm kiếm file đã nạp.
- Web admin: đăng nhập, quản lý kho tri thức/danh mục/tải văn bản; khay upload có nút bỏ chọn tất cả; báo tiến trình upload thật.

## 3. Công việc đang thực hiện

| Công việc | Tình trạng |
|---|---|
| Lấy **toàn văn** một số văn bản trên vbpl.vn (trang dùng server action động) | Đang phân tích request tải nội dung; cần bắt thêm gói tin mẫu |
| Cài extension **pgvector** trên máy chủ PostgreSQL và chạy đồng bộ 105k vector | Code xong, chờ cài binary trên máy chủ |
| Kiểm chứng chất lượng trả lời sau khi nạp lại file Excel mức hưởng (ghép header) | Chờ nạp lại file và hỏi thử |

## 4. Khó khăn, vướng mắc và hướng xử lý

1. **vbpl.vn không có API công khai**, nội dung trả theo định dạng động của Next.js → đã dò được cơ chế gọi; còn một số văn bản chỉ có bản scan/file đính kèm, đang xử lý tiếp.
2. **Embed kho lớn trên CPU chậm** (model bge-m3 ~560 triệu tham số) → đã tối ưu: build chỉ mục HNSW một lần sau khi nạp dữ liệu (nhanh hơn hàng chục lần), chạy nền không khóa bảng; khuyến nghị máy chủ có GPU để nạp nhanh hơn 10–30 lần.
3. **File PDF scan chất lượng thấp** → OCR 3 tầng + bộ dữ liệu tessdata_best; file không đọc được sẽ báo rõ lý do ngay dưới tên file khi upload.

## 5. Kế hoạch kỳ tới

1. Hoàn tất lấy toàn văn văn bản vbpl.vn; bổ sung nạp tự động theo lịch cho văn bản mới.
2. Cài pgvector môi trường triển khai, đo tốc độ và chất lượng truy hồi trên bộ câu hỏi nghiệp vụ mẫu.
3. Rà soát bổ sung rule đối chiếu chéo theo góp ý của giám định viên; chuẩn bị kịch bản demo và số liệu minh chứng (hồ sơ thật đã ẩn danh).

## 6. Đề xuất, kiến nghị

- Máy chủ triển khai nên có GPU NVIDIA (≥6GB VRAM) để tăng tốc tạo chỉ mục ngữ nghĩa khi nạp khối lượng văn bản lớn.
- Cần đầu mối cung cấp danh mục dùng chung và văn bản nội bộ của cơ sở KCB thí điểm để làm giàu kho tri thức.
