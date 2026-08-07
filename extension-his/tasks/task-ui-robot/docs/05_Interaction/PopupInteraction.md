# Popup Interaction (Bật/Tắt robot từ popup extension)

Công tắc: `popup/index.html` checkbox `#robotEnabled` (mặc định bật), lưu bằng
`chrome.storage.local` khoá `robotEnabled` (bind trong `popup/index.ts`
`bindToggle('robotEnabled', true)`).

Content script lắng nghe qua `PopupController` (đọc storage lúc khởi tạo +
`chrome.storage.onChanged`) rồi gọi `RobotMascot.onEnabledChange(enabled, isBoot)`.

## Chuỗi trạng thái

| Tình huống | Chuỗi |
|---|---|
| Boot, đang bật | `force(Idle)` |
| Boot, đang tắt | `force(Disabled)` (ngủ sẵn, không diễn hoạt) |
| Runtime → tắt | `force(Flying)` → bay khỏi mép trên → `force(Disabled)` (ngủ) |
| Runtime → bật | `force(Falling)` → rơi xuống → `force(Landing)` → đáp mạnh, đụng đầu → cười → `force(Idle)` |

Phân biệt boot vs runtime để lần mở trang đầu tiên robot không "bay/rơi" vô cớ.

## Diễn giải "bay lên popup"

Popup extension là cửa sổ hệ thống riêng; robot sống trong DOM trang web không thể
bay vào đó. Nên "bay lên popup rồi ngủ" được hiện thực là bay vọt khỏi mép trên màn
hình rồi chuyển Disabled — xem
[03_AnimationBible/PhysicsAnimations.md](../03_AnimationBible/PhysicsAnimations.md)
và [15_RobotBrain/SleepSystem.md](../15_RobotBrain/SleepSystem.md).

## Ưu tiên tối cao

Bật/Tắt là hành động của người dùng nên mang priority **Critical** — cắt ngang mọi
trạng thái khác (kể cả đang té/đang celebrate). Xem
[15_RobotBrain/ReactionPriority.md](../15_RobotBrain/ReactionPriority.md).
