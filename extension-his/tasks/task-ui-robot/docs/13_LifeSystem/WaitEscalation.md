# Wait Escalation, Seasons & Aging (Chờ AI lâu — task-002 §5, §6, §7, §8)

Khi AI trả lời lâu, robot diễn biến theo **thời gian trôi** (`elapsedMs`). Ba hệ độc
lập chạy song song, đều dựa `StageTimeline` (tra "stage tại elapsed", DRY):

## 1. Leo thang hành vi (§5) — `WaitEscalation`

| elapsed | Hành vi (`stage.id`) |
|---|---|
| 0s | suy nghĩ (`think`) |
| 3s | ngồi (`sit`) |
| 10s | lấy kính lúp (`magnifier`) |
| 20s | uống trà (`tea`) |
| 40s | đọc sách (`read`) |
| 1–2ph | ngồi thiền / câu cá |
| 5–20ph | dựng lều / đốt lửa / dựng nhà |
| 30ph+ | già đi (`aged`) |

## 2. Bốn mùa (§6) — `SeasonSystem`

| elapsed | Mùa | `effects` |
|---|---|---|
| 0s | Xuân | petals, butterfly |
| 45s | Hè | sun, cicada |
| 90s | Thu | leaves, wind |
| 135s | Đông | snow, coat |

`effects` là danh sách id để lớp view dựng particle tương ứng. Có thể chuyển mùa
nhiều lần nếu AI cực lâu.

## 3. Hoá già (§7) — `AgingSystem`

bụi → bụi nhiều → rỉ sét → ốc lỏng → đầu bạc → chống gậy → đi chậm → ông lão. Chỉ là
hiệu ứng, KHÔNG ảnh hưởng dữ liệu.

## Khi có kết quả (§8) — đảo ngược

Ngay khi AI trả lời: robot ngạc nhiên, bật dậy, **mọi hiệu ứng đảo ngược** (bụi/rỉ
sét biến mất, lá ngừng rơi, tuyết tan, trẻ lại) rồi phản ứng theo kết quả — nối vào
`notifyResult` hiện có (xem [../05_Interaction/ValidationReaction.md](../05_Interaction/ValidationReaction.md)).

## Cách dùng (điểm wire)

```ts
const life = new LifeDirector()
// mỗi ~500ms trong lúc Thinking:
const justCrossed = life.waitCrossings(prevMs, elapsedMs) // bắn hiệu ứng ĐÚNG 1 lần
if (justCrossed.stage)  playWaitAnim(justCrossed.stage.id)
if (justCrossed.season) spawnSeason(justCrossed.season.effects)
if (justCrossed.aging)  applyAging(justCrossed.aging.id)
// khi có kết quả: reverseAllEffects(); robot.notifyResult(...)
```

`waitCrossings` chỉ trả mốc VỪA vượt giữa hai lần cập nhật nên không bắn trùng. Mọi
ngưỡng ở `RobotLifeConfig.ts` (web-admin bơm sau).

## Đã hiện thực trong vòng 2

Điểm wire trên **đã nối thật** vào `RobotMascot.ts` (robot ở trang):

- Vào trạng thái `Thinking` → `startWaitEscalation(gen)`: một bộ đếm dựa
  `Date.now()` chạy mỗi 1000ms, gọi `life.waitCrossings(prev, elapsed)` +
  `applyThinkingVisual(snapshot)`.
- **Leo thang hành vi (§5)** — ví dụ đã hiện thực: qua mốc `sit` thì robot ngồi
  xuống (`host.style.transform = translateY(6px)`). Cố ý CHỈ dịch host + đổi filter,
  không thêm cử động tay chân để không "đánh nhau" với animation nền `think` đang lặp.
- **Bốn mùa (§6) + Hoá già (§7)** — hiện thực bằng **CSS filter** phủ lên
  `stage` (`PAGE_SEASON_FILTER` + `PAGE_AGING_FILTER` trong `RobotMascot.ts`): ám màu
  theo mùa (hè rực, thu ngả sepia, đông sáng lạnh) và theo tuổi (bụi → xám dần →
  sepia mờ). Đây là "vài ví dụ" của lớp view; particle đầy đủ để vòng sau.
- **Đảo ngược khi có kết quả (§8)** — rời `Thinking` gọi `stopWaitEscalation()`:
  `clearTimeout` + `stage.style.filter = ''` → mọi ám màu mùa/tuổi biến mất tức thì,
  robot trở lại phản ứng theo kết quả như cũ. `clearAllTimers()` cũng gọi để dọn sạch.

**Còn nợ (vòng sau, chưa làm):** particle thật cho mùa (cánh hoa/lá/tuyết rơi), các
stage leo thang cao cấp (dựng lều, câu cá) và mô hình hoá-già bằng sprite thay cho
filter.
