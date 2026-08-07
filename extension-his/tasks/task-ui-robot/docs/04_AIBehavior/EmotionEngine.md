# Emotion Engine (Máy cảm xúc)

Mã nguồn: `extension/src/content/robot/EmotionEngine.ts`.

Chỉ làm **một việc**: ánh xạ một cảm xúc → biểu cảm khuôn mặt (mắt + miệng + phụ
trợ). KHÔNG tự chạy animation, KHÔNG quyết định khi nào đổi cảm xúc (việc đó do
`RobotMascot.onEnter`). Đây là SRP: đổi cách "trông" mà không đụng logic hành vi.

## Bảng ánh xạ cảm xúc → khuôn mặt

| Cảm xúc | Mắt | Miệng | Phụ trợ |
|---|---|---|---|
| Neutral | mở | neutral | — |
| Happy | vui (^^) | smile | — |
| Proud | vui | grin | má hồng |
| Curious | mở | small | — |
| Focused | mở | flat | — |
| Sleepy | nhắm | small | — |
| Embarrassed | mở | flat | má hồng + mồ hôi |
| Sad | mở | sad | — |
| Surprised | mở | open | — |

## Ba bộ mắt trong SVG

`robot-eyes-open` (có con ngươi nhìn theo chuột), `robot-eyes-happy` (cong ^^),
`robot-eyes-closed` (lim dim). EmotionEngine bật/tắt bằng `opacity`.

## Miệng

Đổi bằng thuộc tính `d` của `<path id="robot-mouth">`; các preset: neutral, smile,
grin, sad, flat, open, small.

Xem chuyển cảm xúc theo trạng thái: [15_RobotBrain/EmotionTransition.md](../15_RobotBrain/EmotionTransition.md).
