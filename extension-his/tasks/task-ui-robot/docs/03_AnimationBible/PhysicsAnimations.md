# Physics Animations (Chuyển động toàn thân)

Mã nguồn: `extension/src/content/robot/PhysicsController.ts`. Animate phần tử
**host** (div cố định góc phải dưới) nên robot di chuyển được cả người.

| Hàm | Mô tả | Dùng ở trạng thái |
|---|---|---|
| `fall()` | lật nghiêng quanh chân 16° rồi lồm cồm dậy | Fell |
| `landingSquash()` | nhún squash & stretch khi đáp | Landing |
| `flyToPopup()` | khựng lấy đà → vọt khỏi mép trên, mờ dần | Flying |
| `dropIn()` | rơi từ trên xuống, nảy vài cái | Falling |
| `hop()` | nhảy tại chỗ | Celebrate |
| `reset()` | xoá transform, về chỗ đậu | — |

Tất cả trả `Promise<void>` (dựa `Animation.finished`), `fill: 'forwards'` để giữ
khung cuối. Chuỗi Bật/Tắt ghép các hàm này qua `force()` của State Machine:

```
Tắt : force(Flying)  → flyToPopup()  → force(Disabled)
Bật : force(Falling) → dropIn()      → force(Landing) → landingSquash()
      → cười (thumbsUp) → force(Idle)
```

"Bay lên popup" được diễn giải là bay khỏi mép trên màn hình rồi ngủ — robot sống
trong trang không thể vào cửa sổ popup thật (xem
[05_Interaction/PopupInteraction.md](../05_Interaction/PopupInteraction.md)).
