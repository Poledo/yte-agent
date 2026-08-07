# Robot Design Document (Thiết kế hình hài robot)

Robot là **linh vật AI có hình người-máy**, KHÔNG phải icon tròn. Vẽ hoàn toàn bằng
SVG trong `extension/src/content/robot/RobotView.ts`.

## Giải phẫu (các bộ phận SVG)

| Bộ phận | id/nhóm | Vai trò chuyển động |
|---|---|---|
| Đầu | `#robot-head` | nghiêng/xoay theo chuột, gật, nghiêng tò mò |
| Mắt | nhóm mắt + `#robot-pupils` | chớp (scaleY), liếc, con ngươi bám chuột |
| Miệng | path miệng | đổi theo emotion |
| Má | cheeks | hiện khi happy/excited |
| Thân | thân + tấm ngực (logo VNPT) | thở (breathe), celebrate |
| Tay | tay trái/phải, `#robot-thumb` | vẫy, gãi đầu, thumbsUp, chỉ tay |
| Chân | chân trái/phải | trụ khi té/đáp |
| Phụ trợ | `zzz`, sweat | ngủ / bối rối |

## Pivot chuẩn

Mỗi bộ phận đặt `transform-box: fill-box` + `transform-origin` phù hợp (vai cho tay,
cổ cho đầu…) qua `RobotView.partOriginCss()` để xoay đúng khớp, không "trôi".

## Ràng buộc thiết kế

- Đọc được ở ~64px (nét mắt/miệng đủ dày, tương phản cao).
- Logo VNPT ở ngực làm điểm nhận diện.
- Chỉ transform/opacity → không layout-thrash.
- Bảng màu: [../06_UX/ColorPalette.md](../06_UX/ColorPalette.md).
- Biểu cảm chi tiết: [Expressions.md](Expressions.md).
