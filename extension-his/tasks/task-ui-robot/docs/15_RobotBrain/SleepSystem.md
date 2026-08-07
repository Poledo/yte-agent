# Sleep System (Hệ thống ngủ / nghỉ)

Robot có hai kiểu "ngủ": nghỉ do rảnh lâu, và tắt bởi người dùng.

## 1. Rảnh lâu → ngồi/ngủ

`IdleDirector` đếm thời gian không tương tác. Chuỗi leo thang:

```
Idle → (rảnh vừa) gesture vặt: blink/lookAround/scratchHead/yawn
     → (rảnh lâu) Sleeping: base-anim sleepBob + emotion sleepy + hiện zzz
```

Bất kỳ tín hiệu nào (chuột, hover, mở chat, kết quả) đánh thức: `playGesture('wake')`
→ Idle. Đánh thức tuân theo ưu tiên nên luôn cắt được giấc ngủ Ambient (0).

## 2. Tắt bởi popup → Disabled

Công tắc `#robotEnabled` tắt → chuỗi Critical `Flying → Disabled`. Ở Disabled robot
ngủ **và** ẩn tương tác (không bám chuột, không idle-gesture) cho tới khi bật lại.
Xem [../05_Interaction/PopupInteraction.md](../05_Interaction/PopupInteraction.md).

## Khác nhau cốt lõi

| | Sleeping (rảnh) | Disabled (tắt) |
|---|---|---|
| Nguồn | IdleDirector | công tắc popup |
| Ưu tiên | Ambient (0) | Critical (6) |
| Đánh thức | mọi tương tác | chỉ bật lại công tắc |
| Vào bằng | mờ dần tại chỗ | bay khỏi màn hình trước |

## Giảm chuyển động

Khi `robotReduceMotion`/`prefers-reduced-motion`, sleepBob thành tĩnh nhưng vẫn hiện
emotion sleepy + zzz để giữ tín hiệu trạng thái.
