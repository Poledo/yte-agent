# Color Palette (Bảng màu robot VNPT)

Robot theo nhận diện VNPT — chủ đạo **xanh dương**, KHÔNG phải icon tròn. Màu định
nghĩa trong SVG/CSS của `RobotView` (Shadow DOM riêng, không đụng CSS trang chủ).

| Vai trò | Gợi ý mã | Dùng cho |
|---|---|---|
| Xanh VNPT chính | `#0068B7` | thân, mũ/đầu |
| Xanh đậm | `#004A87` | viền, bóng đổ, khớp |
| Xanh nhạt | `#4AA3DF` | highlight, tấm ngực |
| Trắng | `#FFFFFF` | mặt, mắt nền |
| Xám kim loại | `#C7D2DC` | tay/chân kim loại |
| Đen mực | `#1B2733` | con ngươi, nét miệng |
| Má hồng | `#FF8FA3` | cheeks (happy/excited) |
| Vàng zzz/hiệu ứng | `#FFD34E` | zzz, confetti |

## Nguyên tắc

- Logo VNPT đặt ở **tấm ngực** — điểm nhấn nhận diện.
- Tương phản mắt/miệng (đen mực trên mặt trắng) đủ cao để biểu cảm đọc được ở kích
  thước nhỏ (~64px).
- Confetti (Celebrate) dùng vài màu tươi lấy accent từ vàng/xanh nhạt/má hồng, tránh
  chói.
- Mọi màu là biến/const trong SVG để đổi theme sau này không phải sửa rải rác (tránh
  hardcode lặp).

> Mã màu ở đây là mức tài liệu tham chiếu; giá trị áp dụng thực tế nằm trong SVG của
> `RobotView.ts`. Khi chỉnh, sửa ở view rồi cập nhật bảng này cho khớp.
