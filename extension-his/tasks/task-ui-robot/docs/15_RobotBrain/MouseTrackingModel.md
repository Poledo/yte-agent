# Mouse Tracking Model (Mô hình bám chuột & mất thăng bằng)

Mã nguồn: `extension/src/content/robot/MouseTracker.ts`.

## Đầu vào

`pointermove` trên `document` (thụ động). Lấy tâm robot từ `host.getBoundingClientRect()`,
tính vector từ tâm đến con trỏ `(dx, dy)`.

## Ánh xạ sang tư thế

| Đại lượng | Công thức (rút gọn) | Giới hạn |
|---|---|---|
| Con ngươi | offset tỉ lệ `dx, dy` đã chuẩn hoá | bán kính hốc mắt |
| Đầu | xoay/nghiêng nhẹ theo `dx` | ±~12° |

Cả hai ghi `transform` inline, mượt bằng CSS transition (0.14–0.18s), không WAAPI —
xem [03_AnimationBible/MouseTracking.md](../03_AnimationBible/MouseTracking.md).

## Mất thăng bằng → té

Khi con trỏ ở **rất cao** phía trên robot (dy vượt ngưỡng âm) và **giữ** một lúc
(hẹn giờ), robot cố ngước theo tới hạn rồi `onOffBalance()` kích hoạt chuỗi:

```
OffBalance (chao đảo) → Fell (té, physics.fall) → Dizzy (chóng mặt) → dậy → Idle
```

Ngưỡng + độ trễ tránh kích hoạt nhầm khi chuột lướt nhanh qua.

## Bật/tắt gaze

`setApplyGaze(false)` khi robot vào trạng thái tập trung để nhường `transform` cho
gesture; bật lại khi về Idle/Hover. Đây là ranh giới Track (2) vs Validation (4)
trong [ReactionPriority.md](ReactionPriority.md).
