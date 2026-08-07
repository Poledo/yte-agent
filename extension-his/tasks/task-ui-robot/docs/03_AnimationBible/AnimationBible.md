# Animation Bible (Thư viện chuyển động)

Mã nguồn: `extension/src/content/robot/animations.ts` (thư viện) và
`AnimationController.ts` (phát/hủy) và `PhysicsController.ts` (toàn thân).

## Nguyên tắc

- Chỉ animate `transform` và `opacity` (rẻ, chạy trên compositor — task §14).
- Dùng **Web Animations API** (`element.animate()`), không dùng `setInterval`.
- Gốc biến đổi từng bộ phận đặt bằng CSS `transform-box: fill-box` +
  `transform-origin` (xem `RobotView.partOriginCss()`).

## Hai lớp animation

| Lớp | Vai trò | Ví dụ |
|---|---|---|
| **base** | nền lặp vô hạn theo trạng thái | breathe, think, sleepBob |
| **gesture** | một lần, có `.finished` để chờ | blink, wave, nod, thumbsUp, celebrate, scratchHead, yawn, pointError, sad, dizzy, wake |

`AnimationController.setBase(name|null)` thay nền; `playGesture(name)` chạy một lần
và trả `Promise` để chuỗi tiếp (ví dụ té xong mới chóng mặt).

## Danh mục gesture ↔ bộ phận

| Gesture | Bộ phận chính |
|---|---|
| blink | mắt mở (scaleY) |
| lookAround | con ngươi |
| scratchHead | tay phải + đầu |
| yawn | đầu + thân |
| wave | tay phải |
| nod | đầu |
| tiltCurious | đầu (nghiêng, giữ) |
| thumbsUp | tay phải + ngón cái (hiện) |
| celebrate | thân + hai tay |
| sad | đầu + thân (ngồi xuống) |
| pointError | tay phải chỉ ra |
| dizzy | đầu lắc |
| wake | đầu + mắt mở |

Toàn thân (té/bay/rơi/đáp/nhảy): xem [PhysicsAnimations.md](PhysicsAnimations.md).
Ưu tiên & hủy: xem [AnimationPriority.md](AnimationPriority.md).
