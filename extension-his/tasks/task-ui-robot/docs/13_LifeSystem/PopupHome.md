# Popup Home (Robot sống trong popup — task-002 §2, §3, §4)

## Có thể để robot ở trong popup extension không? — CÓ, nhưng bằng 2 robot đồng bộ

Popup extension (`popup/index.html`) là **document/cửa sổ riêng** do Chrome vẽ khi
bấm icon, tách hoàn toàn khỏi DOM trang web. Vì vậy:

- KHÔNG thể cho robot ở trang **bay liền mạch** vào cửa sổ popup (không có vùng hình
  ảnh chung). "Bay lên popup" ở trang = bay khỏi mép trên rồi ẩn.
- LÀM ĐƯỢC: mount **một robot thứ hai** ngay trong `popup/index.html`, đồng bộ trạng
  thái qua `chrome.storage`. Khi tắt extension: robot trang bay đi ("về nhà"); mở
  popup thấy robot "đang ở nhà" làm việc riêng.

Cả hai robot dùng chung `RobotView` (SVG) và **cùng bộ não** `life/LifeDirector` —
không nhân đôi logic.

## Hoạt động trong "ngôi nhà"

`LifeDirector.nextActivity(now)` → `{ activity, durationMs }`. Danh sách ví dụ ở
`life/activities.ts` (ngủ, đọc sách, cà phê, gym, sạc pin, tra dầu...). Mỗi lần mở
popup bốc hoạt động khác nhau (trọng số + tránh lặp) → "giống đang thực sự sống".

Thêm hàng trăm hoạt động = thêm phần tử vào mảng, KHÔNG sửa engine — xem
[ExtensibilityGuide.md](ExtensibilityGuide.md).

## Riêng tư (task-002 §3)

Activity có cờ `isPrivate` (tắm, thay đồ, ngủ). Khi mở popup lúc robot đang làm việc
riêng tư → lớp trình diễn cho robot giật mình, che người, đỏ mặt ("Ơ... đợi chút...")
rồi vài giây sau tiếp tục. Quyết-định "có riêng tư không" nằm ở dữ liệu; cách diễn ở
view.

## Quay lại làm việc (task-002 §4)

Khi bật lại extension, robot phải kết thúc hoạt động đang làm rồi mới bay xuống trang:
đọc sách → gấp sách → đeo jetpack → bay; đang ngủ → rơi khỏi popup → đập đầu → nổi cục
u → đứng dậy → đi làm. Đây là **chuỗi thoát** gắn với từng `activity.id`, nối vào
State Machine hiện có qua `force(Falling)` (xem
[../05_Interaction/PopupInteraction.md](../05_Interaction/PopupInteraction.md)).

## Đã hiện thực trong vòng 2

Robot-trong-popup nay **đã chạy thật** (không còn là kế hoạch):

- **`content/robot/home/PopupRobot.ts`** — robot thứ hai, mount vào `#popup-robot`
  trong `popup/index.html`. Dùng chung `RobotView` (SVG) và `life/LifeDirector` với
  robot ở trang, đúng lời hứa "một bộ não, hai thân".
- **`content/robot/home/HomeActivityAnimations.ts`** — `ActivityAnimator`: bảng tra
  `activity.id → Animation[]` (Web Animations API). Đây là **điểm mở rộng duy nhất** ở
  lớp view: dạy robot một animation hoạt động mới = thêm một builder vào registry,
  KHÔNG đụng `life/`. Có sẵn ví dụ: ngủ, thiền, đọc sách, uống cà phê/trà, nghe nhạc,
  chơi game, đánh răng, tưới cây, gym, hít đất, sạc pin, tra dầu; thiếu id nào thì rơi
  về `genericIdle` (thở nhẹ) — không bao giờ đứng hình.
- **Đồng bộ bật/tắt** qua `chrome.storage` (`robotEnabled` + `onChanged`): tắt →
  dòng trạng thái "🏠 Robot đã về nhà nghỉ ngơi"; bật → "🏠 Robot đang làm việc ngoài
  trang · ghé thăm nhà".
- **Riêng tư (§3)** — đã hiện thực ở mức phản ứng tại chỗ: activity `isPrivate` làm
  robot đỏ mặt + che tay/quay đầu + caption "Ơ… đợi mình chút nhé! 🙈", vài giây sau
  tự tiếp tục hoạt động khác.
- **Tôn trọng `robotReduceMotion`**: khi bật giảm chuyển động thì bỏ animation nền,
  chỉ giữ caption trạng thái.

**Còn nợ (vòng sau, chưa làm):** chuỗi-thoát "quay lại làm việc" §4 (đọc sách→gấp
sách→bay) — mới có phản ứng riêng tư, chưa có exit-sequence gắn theo `activity.id`.

## Đã sửa trong task-002

- **§3 Bật robot xong biến mất:** `PhysicsController` để animation `fill:'forwards'`
  treo lại, ghi đè mọi thay đổi style sau đó nên `host.style.transform=''` ở Idle vô
  hiệu → robot kẹt/ẩn. Fix: sau `.finished` gọi `commitStyles()` chốt khung cuối vào
  inline rồi `cancel()` giải phóng animation. Idle cũng khôi phục `opacity`.
- **§4 Logo VNPT:** ngực robot nay gắn **logo VNPT chính thức** (ảnh nhúng base64,
  `life`-độc lập) thay cho chữ "VNPT" — `RobotSvg.ts` + `RobotLogo.ts`.
