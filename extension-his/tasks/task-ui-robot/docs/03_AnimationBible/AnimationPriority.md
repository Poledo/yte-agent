# Animation Priority & Cancel (Ưu tiên và hủy animation)

Task §11: "Animation đang chạy phải bị hủy và chuyển sang trạng thái mới."

## Ai quyết định

Không phải bản thân animation, mà là **State Machine**. Mỗi lần đổi trạng thái,
`RobotMascot.onEnter` gọi:

1. `++seq` — vô hiệu mọi continuation async đang chờ của trạng thái cũ;
2. `anim.cancelGestures()` — hủy gesture một lần đang chạy;
3. `clearAutoReturn()` + `clearIdleTimers()` — hủy các hẹn giờ cũ;
4. đặt base-anim mới (`setBase`) — hàm này tự hủy base cũ trước khi dựng base mới.

Vì vậy không có hai animation "đánh nhau" trên cùng bộ phận.

## Xung đột gaze vs gesture

`MouseTracker` ghi `transform` inline lên `#robot-head` và `#robot-pupils`. Gesture
cũng animate hai phần này. Giải quyết: khi vào trạng thái không phải Idle/Hover/
Watching, `RobotMascot` gọi `tracker.setApplyGaze(false)` để chuột thôi ghi đè, rồi
mới chạy gesture. Khi về Idle, bật lại `setApplyGaze(true)`.

## Guard bằng `seq` (chống đua async)

```
const gen = ++this.seq
this.anim.playGesture('wake').then(() => this.thenIf(gen, () => this.sm.force(Idle)))
// thenIf chỉ chạy khi gen === this.seq (trạng thái chưa đổi từ lúc bắt đầu)
```

Đây là điểm mấu chốt để Bật/Tắt (Critical) có thể cắt ngang mọi chuỗi vật lý mà
không để lại "đuôi" callback chạy nhầm.

## Giảm chuyển động

`AnimationController.setReduceMotion(true)` (khi `prefers-reduced-motion` hoặc
`robotReduceMotion`) → bỏ base-anim và biến mọi gesture thành no-op (trả Promise
đã resolve), robot vẫn đổi biểu cảm tĩnh.
