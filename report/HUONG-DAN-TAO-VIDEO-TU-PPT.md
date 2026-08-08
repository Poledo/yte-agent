# 🎬 Hướng dẫn tạo VIDEO + PHỤ ĐỀ từ file PowerPoint

> Dành cho: bất kỳ file `.pptx` nào → ra 1 file video `.mp4` và 1 file phụ đề `.srt`.
> Không cần thu âm, không cần phần mềm dựng phim, không cần nhờ ai.

---

## 🧩 PHẦN A — Chuẩn bị (chỉ làm 1 LẦN duy nhất cho máy)

Ba thứ dưới đây máy bạn **đã có sẵn** (đã kiểm tra). Chỉ đọc để biết, không phải cài lại.

| Cần | Đã có ở |
|---|---|
| Node.js + gói `sharp` | `D:\VNPT\hackathon\report\_ppt\node_modules` |
| Python + `python-pptx` | đã cài |
| ffmpeg | `D:\Thi\ffmpeg-8.1.1-essentials_build\bin` |

> Sau này đổi máy khác mà thiếu, xem mục **G — Khi chuyển máy** ở cuối.

---

## 🖼️ PHẦN B — Xuất ảnh các slide từ PowerPoint

Video cần **ảnh của từng slide** để trông giống hệt bản trình chiếu. Làm theo đúng thứ tự:

1. Mở file PowerPoint của bạn (ví dụ `bai-thuyet-trinh.pptx`).
2. Bấm menu **File**.
3. Chọn **Export** (Xuất).
4. Chọn **Change File Type** (Đổi loại tệp).
5. Ở mục *Image File Types*, chọn **PNG (*.png)** → bấm **Save As**.
6. Chọn nơi lưu, bấm **Save**.
7. PowerPoint hỏi *"Which slides...?"* → bấm **All Slides** (Tất cả slide).
8. ✅ PowerPoint tạo ra **một THƯ MỤC** (trùng tên file) chứa `Slide1.PNG`, `Slide2.PNG`, ...

> 💡 Ghi nhớ đường dẫn thư mục ảnh vừa tạo — bước sau cần dán vào.

> 📝 Muốn có **phụ đề hay**: khi soạn PPT, viết lời thuyết minh vào ô **Ghi chú (Notes)** dưới mỗi slide.
> Tool sẽ lấy đúng phần Ghi chú đó làm phụ đề. Slide nào không có Ghi chú thì lấy chữ trên slide.

---

## ▶️ PHẦN C — Chạy tool (chỉ 1 lệnh)

Mở **Git Bash** hoặc **Terminal**, dán nguyên khối này rồi **sửa 2 đường dẫn in đậm** cho đúng file của bạn:

```bash
cd "D:\VNPT\hackathon\report\_ppt2video" && set NODE_PATH=D:\VNPT\hackathon\report\_ppt\node_modules && node ppt2video.js "ĐƯỜNG-DẪN-FILE.pptx" --images "ĐƯỜNG-DẪN-THƯ-MỤC-ẢNH"
```

**Ví dụ điền thật** — file để ở màn hình Desktop, thư mục ảnh tên `bai-thuyet-trinh`:

```bash
cd "D:\VNPT\hackathon\report\_ppt2video" && set NODE_PATH=D:\VNPT\hackathon\report\_ppt\node_modules && node ppt2video.js "C:\Users\THIDO\Desktop\bai-thuyet-trinh.pptx" --images "C:\Users\THIDO\Desktop\bai-thuyet-trinh"
```

> Cách lấy đường dẫn nhanh: trong File Explorer, giữ **Shift + bấm chuột phải** vào file/thư mục → **Copy as path** → dán vào (nó tự có dấu nháy kép).

---

## ✅ PHẦN D — Kết quả

Khi chạy xong, cửa sổ hiện đại loại như sau (đây là kết quả thật khi test với báo cáo 10 slide):

```
Đọc nội dung file PPT...
  -> 10 slide.
  -> 10 ảnh.
Tổng thời lượng dự kiến: 2:13
Phụ đề: ...\bai-thuyet-trinh.srt (24 dòng)
Ghép slide 10/10...
Nối các đoạn...
XONG!
  Video : ...\bai-thuyet-trinh.mp4  (2.4 MB, 2:13)
  Phụ đề: ...\bai-thuyet-trinh.srt
```

Bạn sẽ có **2 file nằm cạnh file PPT, cùng tên**:
- 🎬 `bai-thuyet-trinh.mp4` — mở bằng bất kỳ trình phát nào.
- 💬 `bai-thuyet-trinh.srt` — **để cùng thư mục, cùng tên là trình phát tự bật phụ đề** (VLC, trình duyệt, TV...).

> Nếu mở bằng VLC mà chưa thấy phụ đề: menu **Subtitle → Sub Track → chọn dòng có sẵn**.

---

## 🎚️ PHẦN E — Tuỳ chỉnh (không bắt buộc)

Thêm vào **cuối lệnh** ở Phần C:

| Thêm | Tác dụng | Ví dụ |
|---|---|---|
| `--sec 6` | Ép **mỗi** slide đúng 6 giây | `... --images "anh" --sec 6` |
| `--out "..."` | Đổi tên / nơi lưu video | `... --out "D:\video\gioi-thieu.mp4"` |

Muốn **slide hiện lâu hơn / nhanh hơn** cho tất cả: mở file
`D:\VNPT\hackathon\report\_ppt2video\ppt2video.js`, sửa dòng đầu:

```js
const READ_CPS = 13;   // GIẢM số này (vd 10) = slide hiện LÂU hơn; TĂNG (vd 16) = nhanh hơn
```

---

## 🩹 PHẦN F — Gặp lỗi thì làm gì

| Báo lỗi trên màn hình | Nguyên nhân & cách sửa |
|---|---|
| `Thiếu file PPT` | Sai đường dẫn `.pptx`. Dùng **Shift + chuột phải → Copy as path** dán lại. |
| `KHÔNG tìm thấy ảnh slide...` | Chưa làm Phần B, hoặc chưa thêm `--images "thư-mục"`. |
| `Cannot find module 'sharp'` | Thiếu đoạn `set NODE_PATH=...` — dán lại đúng cả khối lệnh Phần C. |
| `Không đọc được file PPT... python-pptx` | Chạy: `pip install python-pptx` |
| `'node' is not recognized` / `'python' ...` | Máy chưa có Node/Python — xem Phần G. |
| Slide qua nhanh/chậm | Dùng `--sec N`, hoặc chỉnh `READ_CPS` (Phần E). |

---

## 💻 PHẦN G — Khi chuyển sang máy khác

Cần cài (một lần):
1. **Node.js** — https://nodejs.org (bản LTS).
2. Trong thư mục `_ppt2video`, cài gói ảnh: `npm install sharp` (rồi bỏ phần `set NODE_PATH=...` trong lệnh).
3. **Python** — https://python.org, rồi `pip install python-pptx`.
4. **ffmpeg** — tải ở https://ffmpeg.org, giải nén, rồi đặt biến môi trường
   `FFMPEG` trỏ tới `...\bin\ffmpeg.exe` và `FFPROBE` tới `...\bin\ffprobe.exe`
   (hoặc thêm thư mục `bin` vào PATH của Windows).

*(Tùy chọn)* Cài **LibreOffice** + **poppler** thì **bỏ được cả Phần B** — tool tự render ảnh từ file PPT, chỉ cần trỏ vào `.pptx`.

---

## 📌 Tóm tắt 1 dòng

> **Xuất PNG từ PowerPoint (Phần B) → dán 1 lệnh (Phần C) → có ngay video + phụ đề.**

Chi tiết kỹ thuật sâu hơn xem `report\_ppt2video\HUONG-DAN.md`.
