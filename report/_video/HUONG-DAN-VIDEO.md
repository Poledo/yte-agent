# Hướng dẫn tự chỉnh video hướng dẫn sử dụng

Video được **dựng bằng code**, không quay màn hình. Muốn sửa thì đổi chữ rồi chạy lại 2 lệnh. Toàn bộ **100% tự động**: máy tự vẽ slide, tự đọc giọng tiếng Việt, tự ghép thành file MP4.

Kết quả: `D:\VNPT\hackathon\report\Video-huong-dan-Chien-binh-y-te-so.mp4` (khoảng 5 phút rưỡi).

---

## 1. Quy trình 3 bước

```bash
cd "D:\VNPT\hackathon\report\_video" && set NODE_PATH=D:\VNPT\hackathon\report\_ppt\node_modules && node render-slides.js && node make-video.js && node make-subtitles.js
```

- `render-slides.js` → vẽ 15 slide ảnh (thư mục `slides\`) + ghi kịch bản đọc `narration.json`.
- `make-video.js` → tạo giọng đọc từng slide (thư mục `audio\`), ghép ảnh + tiếng (`segments\`), nối thành MP4.
- `make-subtitles.js` → tạo file phụ đề `.srt` khớp mốc thời gian với giọng đọc trong video.

> Bước tạo giọng đọc và phụ đề **cần Internet** (dùng giọng nơ-ron của Microsoft, miễn phí, không cần khóa).

### Phụ đề (.srt) dùng thế nào?

File `Video-huong-dan-Chien-binh-y-te-so.srt` nằm **cùng thư mục, cùng tên** với video, nên hầu hết trình phát (VLC, trình duyệt, TV...) **tự bật phụ đề**. Nếu muốn phụ đề **dán cứng** vào video (luôn hiện, gửi ai cũng thấy), nhắn tôi làm thêm bản đó.

> ⚠️ Sửa lời đọc ở `slides.js` thì phải chạy lại **cả** `make-video.js` **và** `make-subtitles.js` để phụ đề khớp lại.

---

## 2. Sửa nội dung + lời đọc — tất cả nằm ở `slides.js`

Mỗi slide là một khối như sau:

```js
{
  kind: 'content', accent: RED, doodle: 'formWarn', n: '1',
  title: 'Cảnh báo ngay khi nhập liệu',
  foot: 'không cần thao tác thêm',
  bullets: [
    'Dòng gạch đầu dòng thường...',
    { t: 'Dòng nhấn mạnh (in đậm, có màu)', c: GREEN },
  ],
  narration: 'Đây là câu sẽ được ĐỌC THÀNH TIẾNG cho slide này.',
},
```

| Muốn đổi | Sửa chỗ |
|---|---|
| Chữ tiêu đề slide | `title: '...'` |
| Các ý gạch đầu dòng | mảng `bullets` (mỗi dòng một chuỗi `'...'`) |
| **Lời đọc** (giọng nói) | `narration: '...'` — đổi câu này là đổi giọng đọc |
| Chữ nhỏ góc phải dưới | `foot: '...'` |
| Số trong vòng tròn | `n: '1'` (để `n: ''` là ẩn số) |

**Chỉ sửa chữ trong dấu nháy `' '`.** Đừng động vào `{ } [ ] , : `.

Dòng nhấn mạnh: `{ t: 'chữ', c: GREEN }` — `c` là màu (`BLUE`, `RED`, `GREEN`, `YELLOW`).

---

## 3. Thêm / bớt slide

- **Bớt**: xoá trọn một khối `{ ... },` (từ `{` tới `},`).
- **Thêm**: copy một khối `{ ... },` dán xuống dưới, đổi chữ. Slide tự đánh lại thứ tự.

Layout tự co giãn theo số dòng `bullets`, nên thêm/bớt ý khá an toàn. Nếu chữ quá dài tràn khung → rút gọn hoặc nhờ Claude.

---

## 4. Đổi hình minh hoạ (`doodle`)

Trường `doodle` chọn hình vẽ tay bên trái slide. Các hình có sẵn:

| Tên | Hình |
|---|---|
| `robot:wave` / `robot:read` / `robot:search` / `robot:think` / `robot:point` | robot ở các tư thế |
| `formWarn` | biểu mẫu có cảnh báo |
| `uploadBox` | khu kéo thả file XML |
| `chatBubble` | bong bóng hỏi–đáp |
| `browserWin` | cửa sổ trang quản trị |
| `catalog` | bảng danh mục |
| `cloud` | tải văn bản từ mạng |
| `clock` | hẹn giờ tự chạy |
| `shield` | khiên bảo mật |

Muốn hình mới → nhờ Claude vẽ thêm.

---

## 5. Đổi giọng đọc / tốc độ

Mở `make-video.js`, sửa đầu file:

```js
const VOICE = 'vi-VN-HoaiMyNeural';  // giọng NỮ. Đổi 'vi-VN-NamMinhNeural' = giọng NAM.
const RATE  = '-8%';                 // '-8%' đọc chậm hơn; '+10%' đọc nhanh hơn; '+0%' bình thường.
```

---

## 6. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Cannot find module 'sharp'` | Thiếu dòng `set NODE_PATH=...\_ppt\node_modules` — dán lại đúng lệnh ở mục 1. |
| Bước giọng đọc treo / lỗi mạng | Kiểm tra Internet rồi chạy lại `node make-video.js`. |
| `SyntaxError` khi chạy | Lỡ xoá dấu `'` `,` `}` — Ctrl+Z hoàn tác. |
| Sửa xong không thấy đổi | Phải chạy **cả hai** lệnh: `render-slides.js` (dựng lại ảnh) rồi `make-video.js`. |

> Đổi chữ/lời đọc/màu/thứ tự slide: **tự làm được**. Thêm hình vẽ mới, đổi bố cục lớn: **nhờ Claude**.
