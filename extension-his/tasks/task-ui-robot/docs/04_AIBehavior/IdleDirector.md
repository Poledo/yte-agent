# Idle Director (Đạo diễn lúc rảnh)

Mã nguồn: `extension/src/content/robot/RobotMascot.ts` (các hàm `armIdleTimers`,
`scheduleIdleGesture`, và nhánh `Idle/LongIdle/Sleeping`).

Mục tiêu: robot "có hồn" khi không ai tương tác, nhưng không gây rối mắt và tự lịm
dần để tiết kiệm tài nguyên.

## Ba mốc thời gian (`RobotConfig.timing`)

| Mốc | Mặc định | Hành vi |
|---|---|---|
| `idleGestureMin..Max` | 2.6s – 6.2s | chọn ngẫu nhiên một cử động rảnh |
| `idleToLongIdle` | 12s | Idle → LongIdle (ngồi thấp, Sleepy) |
| `longIdleToSleep` | 22s | LongIdle → Sleeping (Zzz) |

## Cử động rảnh ngẫu nhiên

Rút thăm trong `['blink', 'blink', 'lookAround', 'scratchHead', 'yawn']` (chớp mắt
trọng số gấp đôi cho tự nhiên). Sau mỗi lần lại hẹn lần kế tiếp.

> Không dùng `Math.random()` là điều cấm ở workflow, nhưng trong content script
> (runtime thật) thì `Math.random()` bình thường — chỉ scaffold workflow mới cấm.

## Đánh thức

Bất kỳ `mousemove` nào (`MouseTracker.onActivity`) hoặc cú bấm robot:
- đang Sleeping → WakeUp → Idle;
- đang LongIdle → Idle ngay;
- đang Idle → lùi lại mốc buồn ngủ (`armIdleTimers`).

## Tạm dừng khi tab ẩn (đề xuất v1.1)

Web Animations API tự giảm nhịp khi tab nền; có thể thêm `visibilitychange` để
`cancelAll()` triệt để. Xem [15_RobotBrain/SleepSystem.md](../15_RobotBrain/SleepSystem.md).
