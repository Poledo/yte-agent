# Extensibility Guide (Thêm hàng trăm hoạt động KHÔNG sửa kiến trúc)

Yêu cầu task-002 §10: "phải có khả năng mở rộng để sau này bổ sung hàng trăm animation
và hoạt động mới mà không cần sửa kiến trúc hiện tại". Đây là cách.

## 1. Thêm một hoạt động idle mới

Chỉ cần thêm **dữ liệu** vào `life/activities.ts` (hoặc register lúc chạy):

```ts
registry.register({
  id: 'paintPicture', label: 'vẽ tranh', category: 'hobby',
  weight: 2, minMs: 12_000, maxMs: 20_000,
  phases: [LifePhase.Working],   // bỏ trống = mọi pha
  isPrivate: false,
})
```

Không lớp engine nào phải sửa: `ActivityRegistry` lưu, `IdleActivityGenerator` tự bốc
theo trọng số, `LifeDirector` tự trả về. Việc "vẽ" hoạt động được tra ở lớp view theo
`id` (tách biệt phần quyết-định).

## 2. Thêm mốc leo thang / mùa / giai đoạn già

Thêm phần tử vào mảng tương ứng trong `life/RobotLifeConfig.ts`. `StageTimeline` tự
sắp xếp theo `atMs` và tra cứu — không sửa code.

```ts
// thêm vào waitEscalation:
{ atMs: 240_000, id: 'nap', label: 'ngủ gật' },
```

## 3. Bơm cấu hình từ web-admin (không hardcode)

`RobotLifeConfig` là một object thuần. Khi có web-admin, tải cấu hình về rồi truyền
vào constructor thay cho mặc định:

```ts
const life = new LifeDirector({
  scheduler: new TimeScheduler(remoteCfg.schedule),
  registry: new ActivityRegistry().registerAll(remoteCfg.activities),
})
```

Phần còn lại của kiến trúc không đổi (Dependency Injection).

## 4. Test tất định

`RandomEventGenerator` nhận `Rng` bơm ngoài:

```ts
const rng = () => 0.0   // luôn chọn phần tử đầu
new RandomEventGenerator(rng)
```

`TimeScheduler.phaseAt(new Date(2026, 0, 1, 12, 30))` — truyền Date cố định để test
pha. `StageTimeline.at(elapsed)` thuần hàm.

## Ranh giới cần giữ

- `life/` KHÔNG import gì từ DOM/`RobotView`/`animations` → giữ nó thuần, tái dùng
  cho robot trang & robot popup.
- Ánh xạ `id` → animation nằm ở lớp trình diễn, là chỗ DUY NHẤT cần thêm khi có
  animation mới. Đây chính là "extensible without touching architecture".
