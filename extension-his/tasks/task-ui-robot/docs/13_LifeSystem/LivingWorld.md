# Living World (Robot có cuộc sống riêng — RDD Expansion v2)

Mục tiêu v2: robot không phải widget biết cử động mà là **nhân vật sống** có lịch
sinh hoạt, thói quen, cảm xúc. Toàn bộ phần "quyết-định" nằm ở
`extension/src/content/robot/life/` — logic thuần, KHÔNG đụng DOM, nên tái dùng được
cho cả robot ở trang lẫn robot trong popup.

## Kiến trúc (mọi thứ ghép sau LifeDirector)

```
                 ┌────────────────┐
                 │  LifeDirector  │  bộ não thuần (không DOM)
                 └───────┬────────┘
     ┌──────────┬────────┼─────────┬──────────┬──────────┐
     ▼          ▼        ▼         ▼          ▼          ▼
 TimeScheduler Idle    Wait      Season     Aging    (Registry
   (pha ngày) Activity Escalation System    System    + Random)
              Generator
```

| Lớp | Trách nhiệm | File |
|---|---|---|
| LifeDirector | mặt tiền gom mọi hệ, trả quyết định | `life/LifeDirector.ts` |
| TimeScheduler | giờ thực → pha (Working/Napping/Sleeping) + jitter ngày | `life/TimeScheduler.ts` |
| ActivityRegistry | kho hoạt động, điểm mở rộng | `life/ActivityRegistry.ts` |
| RandomEventGenerator | chọn theo trọng số, tránh lặp, RNG tách rời | `life/RandomEventGenerator.ts` |
| IdleActivityGenerator | bốc hoạt động + thời lượng theo pha | `life/IdleActivityGenerator.ts` |
| WaitEscalation/Season/Aging | diễn biến khi chờ AI lâu | `life/*.ts` |
| StageTimeline | tra "stage tại elapsed" (DRY cho 3 hệ trên) | `life/StageTimeline.ts` |

## Lịch sinh hoạt (task-002 §1)

`TimeScheduler.phaseAt(now)` đọc giờ máy → pha:

| Khung giờ (mặc định) | Pha |
|---|---|
| 06:00–11:00, 14:00–17:00 | Working |
| 11:00–14:00 | Napping |
| 17:00–06:00 (lệch theo ngày) | Sleeping |

Giờ ngủ tối **dao động ±60 phút mỗi ngày** (jitter tất định theo ngày) để "hôm nay
17:20, mai 18:10..." tự nhiên, không cứng. Bị gọi dậy giữa pha ngủ → robot mặt quạo
(xử lý ở lớp trình diễn qua emotion, xem [../15_RobotBrain/EmotionTransition.md](../15_RobotBrain/EmotionTransition.md)).

Mọi ngưỡng ở `life/RobotLifeConfig.ts` — sau này bơm từ web-admin (xem
[ExtensibilityGuide.md](ExtensibilityGuide.md)).

## Trạng thái hiện tại

Đây là **thư viện quyết-định** đã build xanh, có ví dụ dữ liệu và expose thử nhanh:
`window.hisRobotLife.currentPhase(new Date())`, `.nextActivity(new Date())`. Chưa
wire vào vòng đời robot đang chạy để tránh hồi quy — điểm wire xem
[PopupHome.md](PopupHome.md) và [WaitEscalation.md](WaitEscalation.md).
