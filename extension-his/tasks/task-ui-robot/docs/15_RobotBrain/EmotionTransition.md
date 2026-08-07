# Emotion Transition (Chuyển đổi biểu cảm)

Mã nguồn: `extension/src/content/robot/EmotionEngine.ts`. Emotion tách khỏi State:
State quyết định "đang làm gì", Emotion quyết định "mặt mũi ra sao" (mắt, miệng, má,
mồ hôi, zzz).

## Bộ biểu cảm

| Emotion | Mắt | Miệng | Phụ trợ |
|---|---|---|---|
| neutral | mở thường | thẳng nhẹ | — |
| happy | cong | cười | má hồng |
| excited | mở to | cười to | má hồng |
| curious | mở, liếc | chữ o nhỏ | — |
| confused | 1 cao 1 thấp | méo | — |
| sad | rũ | cong xuống | — |
| dizzy | xoáy | mở | — |
| sleepy | lim dim | nhỏ | zzz, mồ hôi tuỳ cảnh |

`EmotionEngine.set(emotion)` cập nhật các path/opacity qua `RobotView` (setEyeMode,
setMouthPath, setCheeksVisible, setSweatVisible, setZzzVisible…).

## State → Emotion (ai gọi ai)

`RobotMascot.onEnter` chọn emotion cho mỗi state, ví dụ Thinking→curious,
Happy→happy, Celebrate→excited, Confused→confused, Sad/PointError→sad,
Sleeping→sleepy, Dizzy→dizzy. Nhờ tách lớp, cùng một emotion có thể tái dùng ở nhiều
state khác nhau.

## Giữ kết quả rồi tự về

Sau khi hiện emotion kết quả, `autoReturn` hẹn giờ đưa State về Idle (Emotion về
neutral). `notifyThinking(false)` không đè kết quả vì có guard "chỉ đổi nếu đang
Thinking" — xem [../05_Interaction/ValidationReaction.md](../05_Interaction/ValidationReaction.md).
