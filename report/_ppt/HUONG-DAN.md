# Hướng dẫn tự chỉnh file PPT

File slide được **sinh ra bằng code**, không mở bằng PowerPoint để sửa gốc. Muốn đổi nội dung thì
sửa file `gen.js` rồi chạy lại. Dưới đây là những chỗ bạn hay cần đụng tới — chỉ đổi **chữ trong dấu nháy `' '`**,
đừng động vào các dấu `[ ] { } , ( )`.

---

## 1. Chạy lại sau mỗi lần sửa

Mở terminal, dán đúng dòng này:

```bash
cd "D:\VNPT\hackathon\report\_ppt" && node gen.js
```

Xong sẽ hiện `DONE: ...` và file mới nằm ở:
`D:\VNPT\hackathon\report\Bao-cao-hackathon-Chien-binh-y-te-so.pptx`

> Nếu muốn xem thử layout thành ảnh trước khi giao: chạy thêm `node render.js` → tạo `slide-1.png ... slide-10.png` trong thư mục này.

---

## 2. Bản đồ 10 slide (mỗi slide là một khối `// ---------- N. ... ----------` trong gen.js)

| Slide | Nội dung | Sửa chữ ở biến |
|---|---|---|
| 1 | Trang bìa | các dòng `s.addText('...')` |
| 2 | Nỗi đau (3 ô) | mảng `pains` |
| 3 | Giải pháp 3 mảnh ghép | mảng `boxes` |
| 4 | Gác cổng 1 — số liệu XML130 | mảng `stats` |
| 5 | Gác cổng 2 — đối chiếu chéo | mảng `imgs` (chú thích) + khối chữ xanh cuối |
| 6 | Bộ não RAG (4 dòng) | mảng `rows` |
| 7 | AI tự học (3 ô) | mảng `items` |
| 8 | Luồng hoạt động (5 bước) | mảng `steps` |
| 9 | Công nghệ (6 ô) | mảng `tech` |
| 10 | Kết quả + lộ trình | mảng `nums` + khối `s.addText([...])` |

---

## 3. Đổi CHỮ / SỐ LIỆU

Mỗi ô nội dung là một dòng dạng `['Tiêu đề', 'Nội dung dài...']`. Ví dụ slide 10:

```js
const nums = [['90%', 'khối lượng cam kết'], ['105.232', 'đoạn tri thức đã chỉ mục'], ...];
```

- Đổi `90%` → `95%`: sửa thành `['95%', 'khối lượng cam kết']`.
- **Chỉ sửa phần trong nháy.** Giữ nguyên `[ ] , '`.

Slide có 2 phần (tiêu đề + mô tả), ví dụ slide 2:

```js
['Phát hiện SAU', 'Cơ sở KCB chỉ biết hồ sơ lỗi khi giám định BHXH đã từ chối...'],
```
Phần đầu = chữ đậm màu; phần sau = đoạn mô tả.

Đổi **tiêu đề slide**: tìm dòng `await title(s, 'Gác cổng 1: soi từng hồ sơ XML 130');` — sửa chữ trong nháy.

---

## 4. Thêm / bớt một ô

- **Bớt**: xoá trọn một dòng `[...],` (kể cả dấu phẩy cuối).
- **Thêm**: copy một dòng `[...],` dán xuống ngay dưới, rồi đổi chữ.

> ⚠️ Layout mỗi slide cố định số ô (2, 3, 4, 5, 6 ô). Thêm quá số ô sẽ **tràn ra ngoài**.
> An toàn nhất: **giữ nguyên số dòng, chỉ đổi chữ**. Muốn đổi số ô → nhắn Claude làm để canh lại bố cục.

---

## 5. Đổi MÀU

Đầu file có bảng màu (mã hex, KHÔNG có dấu `#`):

```js
const BLUE  = '2F6FED';   // xanh dương
const RED   = 'E4572E';   // đỏ cảnh báo
const GREEN = '2E9E5B';   // xanh lá (đạt)
const YELLOW= 'FFE066';   // vàng highlight
```

Trong các mảng, chỗ ghi `BLUE / RED / GREEN` là màu của ô đó — đổi tên là đổi màu.
Muốn màu khác: tra mã hex trên mạng (ví dụ tím = `7A5AF8`) rồi thay vào, ví dụ `const BLUE = '7A5AF8';`.

---

## 6. Ba lỗi thường gặp (và cách tránh)

1. **Chữ có sẵn dấu nháy** — ví dụ muốn viết `bác sĩ "phân thân"`. Vì cả câu đã bọc trong nháy đơn `'...'`,
   dấu nháy **kép** `"` bên trong thì OK; nhưng **đừng** dùng nháy đơn `'` bên trong. Nếu bắt buộc có `'`, nhắn Claude.
2. **Xoá nhầm dấu** `,` `]` `)` → chạy `node gen.js` sẽ báo đỏ `SyntaxError`. Cứ Ctrl+Z hoàn tác lại là xong.
3. **Chữ quá dài** → tràn khung. Chạy `node render.js` xem ảnh; nếu tràn thì rút gọn chữ hoặc nhờ Claude chỉnh cỡ.

---

## 7. Khi nào tự sửa, khi nào nhờ Claude

| Việc | Tự làm được | Nên nhờ Claude |
|---|---|---|
| Đổi vài chữ, số liệu, màu | ✅ | |
| Bớt một ô | ✅ | |
| Thêm ô / thêm slide mới | | ✅ (canh lại layout) |
| Đổi hình vẽ (robot, doodle) | | ✅ |
| Sắp lại thứ tự slide, đổi mạch trình bày | | ✅ |
| Bị tràn/vỡ layout không rõ vì sao | | ✅ |
