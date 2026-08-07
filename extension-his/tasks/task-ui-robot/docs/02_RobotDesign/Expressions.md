# Expressions (Bộ biểu cảm khuôn mặt)

Cách dựng: `EmotionEngine` gọi các setter của `RobotView` để đổi mắt/miệng/má/mồ hôi/
zzz. Đây là "át-lát" khuôn mặt; ánh xạ state↔emotion ở
[../15_RobotBrain/EmotionTransition.md](../15_RobotBrain/EmotionTransition.md).

## Bảng biểu cảm

| Emotion | Mắt (`setEyeMode`) | Miệng (`setMouthPath`) | Má | Mồ hôi | Zzz |
|---|---|---|---|---|---|
| neutral | open | thẳng nhẹ | ẩn | ẩn | ẩn |
| happy | happy (cong) | cười | hiện | ẩn | ẩn |
| excited | wide | cười to | hiện | ẩn | ẩn |
| curious | look | chữ o | ẩn | ẩn | ẩn |
| confused | asym (lệch) | méo | ẩn | hiện | ẩn |
| sad | droop | cong xuống | ẩn | ẩn | ẩn |
| dizzy | spiral | mở | ẩn | ẩn | ẩn |
| sleepy | closed/lim dim | nhỏ | ẩn | tuỳ | hiện |

## Setter liên quan (RobotView)

- `setPupilOffset(x, y)` — con ngươi (bám chuột, liếc).
- `setHeadTilt(deg)` — nghiêng đầu (tò mò, typing).
- `setEyeMode(mode)` — kiểu mắt theo bảng trên.
- `setMouthPath(path)` — hình miệng.
- `setCheeksVisible / setSweatVisible / setZzzVisible / setThumbVisible(bool)`.

## Nguyên tắc

- Một emotion = một cụm setter gọi cùng lúc → mặt luôn nhất quán, không "nửa vui nửa
  buồn".
- Biểu cảm là lớp tách rời gesture: đang thumbsUp vẫn có thể mang mặt happy; đổi
  emotion không hủy gesture và ngược lại.
