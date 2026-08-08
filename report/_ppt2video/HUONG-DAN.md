# Tool: PPT → Video + Phụ đề (.srt)

Biến **một file PowerPoint** thành **video MP4 + file phụ đề SRT**, không cần giọng đọc, không cần nhờ ai. Phụ đề lấy từ **ô Ghi chú (Notes)** của từng slide.

---

## Chuẩn bị (làm 1 lần)

Tool cần 3 thứ có sẵn trên máy:

| Thứ | Kiểm tra | Nếu thiếu |
|---|---|---|
| **Node + gói sharp** | đã có ở `report\_ppt\node_modules` | dùng `NODE_PATH` như lệnh bên dưới |
| **Python + python-pptx** | `python -c "import pptx"` | `pip install python-pptx` |
| **ffmpeg** | có ở `D:\Thi\ffmpeg-...\bin` | tải ffmpeg, hoặc đặt biến `FFMPEG` trỏ tới ffmpeg.exe |

---

## Bước 1 — Xuất ảnh slide từ PowerPoint

Tool cần ẢNH của từng slide (để video giống hệt bản trình chiếu). Cách nhanh nhất:

1. Mở file PPT trong PowerPoint.
2. **File → Export → Change File Type → PNG** (hoặc "Save As" rồi chọn định dạng PNG).
3. Khi PowerPoint hỏi, chọn **All Slides** (Tất cả slide).
4. PowerPoint tạo một **thư mục** chứa `Slide1.PNG, Slide2.PNG, ...`

> Nếu máy có cài **LibreOffice** thì bỏ qua bước này — tool tự render ảnh từ file PPT.

---

## Bước 2 — Chạy tool

Dán nguyên dòng này (sửa lại 2 đường dẫn cho đúng máy bạn):

```bash
cd "D:\VNPT\hackathon\report\_ppt2video" && set NODE_PATH=D:\VNPT\hackathon\report\_ppt\node_modules && node ppt2video.js "duong-dan\bai-thuyet-trinh.pptx" --images "duong-dan\thu-muc-anh-slide"
```

Xong sẽ có **2 file** nằm cạnh file PPT, cùng tên:
- `bai-thuyet-trinh.mp4` — video
- `bai-thuyet-trinh.srt` — phụ đề (trình phát tự bật vì cùng tên, cùng thư mục)

---

## Các tuỳ chọn

| Thêm vào cuối lệnh | Tác dụng |
|---|---|
| `--images "thu-muc"` | Thư mục chứa ảnh slide (bỏ qua nếu có LibreOffice). |
| `--sec 6` | Ép **mỗi** slide đúng 6 giây. Không ghi thì tool tự tính theo độ dài ghi chú. |
| `--out "ten-khac.mp4"` | Đổi tên / nơi lưu video. Phụ đề đổi theo. |

Ví dụ mỗi slide 8 giây, lưu ra chỗ khác:

```bash
node ppt2video.js "bai.pptx" --images "anh" --sec 8 --out "D:\video\gioi-thieu.mp4"
```

---

## Phụ đề lấy từ đâu?

- **Ưu tiên: ô Ghi chú (Notes)** của từng slide → nên viết lời thuyết minh vào Notes khi soạn PPT.
- Slide nào **không có Notes** → tool tự lấy **chữ trên slide** làm phụ đề.

Câu dài tự được cắt thành nhiều dòng phụ đề, thời gian chia đều theo độ dài — đọc kịp.

---

## Chỉnh tốc độ hiện slide

Mở `ppt2video.js`, sửa mấy dòng đầu (mục "các thông số dễ chỉnh"):

```js
const READ_CPS = 13;   // ký tự đọc/giây — GIẢM số này = slide hiện LÂU hơn
const MIN_SEC  = 3.5;  // mỗi slide tối thiểu (giây)
const MAX_SEC  = 14;   // mỗi slide tối đa (giây)
```

---

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Thiếu file PPT` | Kiểm tra lại đường dẫn `.pptx` trong dấu nháy kép. |
| `Không đọc được file PPT... python-pptx` | Chạy `pip install python-pptx`. |
| `KHÔNG tìm thấy ảnh slide...` | Làm Bước 1 (xuất PNG), rồi thêm `--images "thu-muc"`. |
| `Cannot find module 'sharp'` | Thiếu `set NODE_PATH=...\_ppt\node_modules` trong lệnh. |
| Video chạy nhưng slide qua quá nhanh/chậm | Dùng `--sec N`, hoặc chỉnh `READ_CPS`. |

---

## Khác gì với video hướng dẫn ở thư mục `_video`?

| | `_ppt2video` (tool này) | `_video` |
|---|---|---|
| Nguồn | **File PPT bất kỳ** | Nội dung viết tay trong `slides.js` |
| Giọng đọc | Không (chỉ phụ đề) | Có, giọng tiếng Việt tự động |
| Phong cách | Giống hệt PPT của bạn | Vẽ tay / robot |
| Mục đích | Nhanh gọn, tự làm mọi lúc | Video giới thiệu chỉn chu |
