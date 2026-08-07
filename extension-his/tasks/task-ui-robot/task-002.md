Robot chưa được đẹp lăm, tay chân chưa linh hoạt, các animation trạng thái chưa thấy nhiều. khi chuột lên cao bị té cũng cứng, chưa mượt

khi tắt robot chưa ở poup của extension, hay là ko thể ở được bạn trả lời giùm tôi

Khi bật robot bay xuống đáp đất và biên mất luôn, ẩn luôn, ko có thất hiệu ứng gì => fix

Trước ngực robot là logo vnpt chứ ko phải chữ vnpt

# RDD Expansion - Living Robot System v2

Mở rộng Robot Design Document hiện có.

Mục tiêu:

Robot không phải là một widget biết cử động.

Robot phải được thiết kế như một nhân vật sống có lịch sinh hoạt, cảm xúc, thói quen và cuộc sống riêng.

===========================================================
1. LIVING WORLD
===========================================================

Robot vẫn sống ngay cả khi người dùng không sử dụng.

Thời gian của robot phải đồng bộ với thời gian thực của máy tính.

Ví dụ:

06:00
Robot thức dậy.

06:00-11:00
Robot làm việc bình thường.

11:00-14:00
Robot ngủ trưa.

14:00-17:00
Robot tiếp tục làm việc.

17:00-06:00
Robot ngủ tối.

Không phải lúc nào cũng ngủ đúng giờ.

Mỗi ngày robot có thể thay đổi lịch sinh hoạt một chút để tạo cảm giác tự nhiên.

Ví dụ:

hôm nay ngủ lúc 17:20

ngày mai 18:10

ngày kia 16:55

...

Dĩ nhiên là trong lúc ngủ bị kêu dậy làm việc thì mặt hơi quạo rồi

Có thể cấu hình ở web admin
===========================================================
2. ROBOT INSIDE POPUP
===========================================================

Khi Extension OFF.

Robot sẽ bay lên Popup.

Robot KHÔNG phải lúc nào cũng ngủ.

Popup giống như "ngôi nhà" của robot.

Robot có rất nhiều hoạt động.

Ví dụ:

• ngủ

• đọc sách

• uống cà phê

• uống trà

• tập gym

• chống đẩy

• ngồi thiền

• tắm

• giặt đồ

• lau người

• đánh răng

• ăn trái cây

• ăn đồ cay

• uống nước

• chơi Rubik

• đá bóng

• chơi game

• xem TV

• học lập trình

• sửa chính mình

• tra dầu

• thay bóng đèn mắt

• sạc pin

• nghe nhạc

• nhảy

• tập võ

• ngắm sao

• tưới cây

• chăm cây

• nuôi thú cưng robot

• ngồi câu cá

• viết nhật ký

...

Mỗi lần mở Popup sẽ có xác suất robot đang làm việc khác nhau.

Không nên lặp đi lặp lại.

Robot phải giống như đang thực sự sống.

===========================================================
3. PRIVACY
===========================================================

Nếu robot đang:

• tắm

• thay đồ

• lau người

• ngủ

...

Khi người dùng mở popup.

Robot sẽ có phản ứng.

Ví dụ:

Nếu đang tắm.

Robot giật mình.

Lấy khăn che người.

Đỏ mặt.

Nói:

"Ơ... đợi chút..."

"Đừng nhìn..."

Sau vài giây mặc đồ xong.

Nếu đang ngủ.

Robot dụi mắt.

Ngáp.

Lăn xuống giường.

Nếu đang đọc sách.

Robot đánh dấu trang.

Đóng sách.

Đứng dậy.

===========================================================
4. RETURN TO WORK
===========================================================

Khi người dùng bật Extension.

Robot phải quay trở lại Web.

Có nhiều trạng thái.

Nếu robot đang:

đọc sách

↓

gấp sách

↓

cất sách

↓

mang Jetpack

↓

bay xuống Web.

Nếu đang đá bóng.

↓

đá trái cuối.

↓

vẫy tay.

↓

bay.

Nếu đang ăn.

↓

nuốt xong.

↓

uống nước.

↓

bay.

Nếu đang ngủ.

↓

không tỉnh.

↓

rơi khỏi popup.

↓

đập đầu.

↓

nổi cục u.

↓

đứng dậy.

↓

đeo kính.

↓

đi làm.

Nếu đang tắm.

↓

hoảng.

↓

quấn khăn.

↓

chạy vào thay đồ.

↓

3~5 giây sau mới bay xuống.

===========================================================
5. LONG AI WAITING
===========================================================

Nếu AI trả lời lâu.

Robot phải có các animation theo thời gian.

0-3s

Robot suy nghĩ.

3-10s

Robot bắt đầu ngồi.

10-20s

Robot lấy kính lúp.

20-40s

Robot uống trà.

40-60s

Robot đọc sách.

1-2 phút

Robot ngồi thiền.

2-5 phút

Robot câu cá.

5-10 phút

Robot dựng lều.

10-20 phút

Robot đốt lửa.

20-30 phút

Robot dựng nhà.

30 phút+

Robot già đi.


Nhưng giá trị có thể cấu hình ở webadmin
===========================================================
6. FOUR SEASONS EFFECT
===========================================================

Nếu AI quá lâu.

Môi trường cũng thay đổi.

Theo thời gian.

Ví dụ:

Mùa xuân

Hoa bay.

Bướm.

Mùa hè

Nắng.

Ve kêu.

Mùa thu

Lá vàng rơi.

Gió.

Mùa đông

Tuyết.

Sương.

Lạnh.

Robot mặc áo khoác.

Có thể chuyển mùa nhiều lần nếu AI cực lâu.

===========================================================
7. ROBOT AGING
===========================================================

Thời gian chờ càng lâu.

Robot càng già.

Ví dụ

10 giây

bụi.

30 giây

bụi nhiều hơn.

45 giây

rỉ sét.

1 phút

ốc vít lỏng.

1.5 phút

đầu bạc.

2 phút

gậy chống.

2.5 phút

đi rất chậm.

3 phút

robot thành ông lão.

...

Đây chỉ là hiệu ứng.

Không ảnh hưởng dữ liệu.

những setting thời gian này có thể cấu hình ở webadmin

===========================================================
8. RESULT ARRIVES
===========================================================

Ngay khi AI trả lời.

Robot sẽ:

ngạc nhiên.

đứng bật dậy.

mọi hiệu ứng đảo ngược.

bụi bay mất.

rỉ sét biến mất.

lá ngừng rơi.

tuyết tan.

robot trẻ lại.

quần áo trở về bình thường.

mọi vật thể biến mất.

Sau đó:

Nếu kết quả tốt.

Robot nhảy.

Ăn mừng.

Nếu có lỗi.

Robot buồn.

Nếu Warning.

Robot gãi đầu.

Nếu AI không chắc chắn.

Robot suy nghĩ.

===========================================================
9. DESIGN GOAL
===========================================================

Người dùng phải có cảm giác:

Robot không phải một animation.

Robot thật sự đang sống trong máy tính.

Robot có cuộc sống riêng.

Robot có lịch sinh hoạt.

Robot có cảm xúc.

Robot có sở thích.

Robot có công việc.

Robot chỉ đang tạm ngừng cuộc sống riêng để giúp người dùng.

Sau khi giúp xong, robot tiếp tục cuộc sống của mình.

===========================================================
10. IMPLEMENTATION
===========================================================

Không hardcode.

Toàn bộ hành vi phải được thiết kế dưới dạng:

Behavior Tree

State Machine

Scheduler

Emotion Engine

Animation Queue

Time Scheduler

Random Event Generator

Idle Activity Generator

Season Effect System

Aging System

Interaction Controller

Tất cả phải có khả năng mở rộng để sau này có thể bổ sung hàng trăm animation và hoạt động mới mà không cần sửa kiến trúc hiện tại.


Theo mình, có thể đẩy ý tưởng này thêm một bước nữa: robot có "ký ức". Ví dụ, nếu hôm qua người dùng kiểm tra 500 hồ sơ thì hôm nay robot mở đầu bằng câu "Hôm qua mình làm việc chăm chỉ quá, hôm nay cố gắng tiếp nhé!", hoặc nếu nhiều ngày không mở extension thì robot nói "Lâu rồi mới gặp!". Những chi tiết nhỏ như vậy sẽ khiến robot có cảm giác như một đồng nghiệp thực sự, thay vì chỉ là một trợ lý AI

Nói chung những giá trị nào hardcode thì nên cấu hình ở web admin
===========================================================
TASK HISTORY (append-only — không xoá lịch sử cũ)
===========================================================

## 2026-07-22 — Vòng 1: sửa lỗi cụ thể + dựng kiến trúc mở rộng v2

Phạm vi được người dùng chốt: "Kiến trúc mở rộng + docs + vài ví dụ" (chưa hiện thực
hàng trăm animation / popup-robot / web-admin trong vòng này).

### A. Sửa lỗi cụ thể (đầu task-002)

- **#3 Bật robot xong đáp đất rồi biến mất, ẩn luôn**
  - Vấn đề: robot bật lên rơi xuống rồi mất hút, không hiệu ứng.
  - Nguyên nhân: `PhysicsController.animate()` dùng `fill:'forwards'` nhưng KHÔNG hủy
    animation sau khi xong; các animation đã kết thúc vẫn ghi đè inline style, khiến
    `host.style.transform=''` ở trạng thái Idle vô hiệu → robot kẹt ở khung cuối (có
    thể là opacity 0 / dời khỏi màn hình).
  - Giải pháp: sau `.finished` gọi `commitStyles()` chốt khung cuối vào inline rồi
    `cancel()` giải phóng animation; `reset()`/`enterIdle` khôi phục cả `opacity`.
  - File: `extension/src/content/robot/PhysicsController.ts`,
    `extension/src/content/robot/RobotMascot.ts`.

- **#4 Trước ngực là logo VNPT chứ không phải chữ**
  - Thay `<text>VNPT</text>` bằng logo VNPT chính thức (tải từ
    https://vnptgroup.vn/wp-content/uploads/2021/09/Logo-VNPT.png, 400x400 PNG) nhúng
    base64 dạng `<image>` trong SVG ngực.
  - File: `extension/src/content/robot/RobotSvg.ts`,
    `extension/src/content/robot/RobotLogo.ts` (mới).

- **#1 Té cứng, chưa mượt**
  - Làm lại keyframe `fall()`: thêm chao đảo lấy đà, easing trọng lực, nảy nhẹ khi
    chạm đất, chống dậy hơi quá đà rồi ổn định (10 mốc, easing riêng từng mốc).
  - File: `extension/src/content/robot/PhysicsController.ts`.

- **#2 Robot có ở trong popup extension được không?** → Trả lời: KHÔNG thể bay liền
  mạch từ trang vào cửa sổ popup (2 document tách biệt), NHƯNG làm được bằng 2 robot
  đồng bộ qua chrome.storage (robot thứ hai mount trong popup/index.html). Chi tiết:
  docs/13_LifeSystem/PopupHome.md.

### B. Gỡ endpoint XML 130 khỏi popup (yêu cầu kèm)

- Gỡ khối "Endpoint tải XML 130 từ HIS" + CSS + logic `initializeEndpointSetting`.
- Không ảnh hưởng chức năng: `HisXmlDownloader.DEFAULT_ENDPOINT` vẫn tự fallback.
- File: `extension/src/popup/index.html`, `extension/src/popup/index.ts`.

### C. Kiến trúc mở rộng v2 (module life/ — logic thuần, không DOM)

Tạo `extension/src/content/robot/life/`:
- `LifeTypes.ts`, `RobotLifeConfig.ts` (mọi ngưỡng, ghi chú web-admin bơm sau).
- `ActivityRegistry.ts` + `activities.ts` (≥20 hoạt động mẫu — thêm = thêm dữ liệu).
- `RandomEventGenerator.ts` (trọng số, tránh lặp, RNG bơm ngoài để test).
- `TimeScheduler.ts` (giờ thực → pha ngày + jitter tất định theo ngày).
- `StageTimeline.ts` (DRY) → `WaitEscalation.ts`, `SeasonSystem.ts`, `AgingSystem.ts`.
- `IdleActivityGenerator.ts`, `LifeDirector.ts` (mặt tiền), `index.ts` (barrel).
- Expose `window.hisRobotLife` để thử nhanh; CHƯA wire vào vòng đời robot (tránh hồi
  quy) — điểm wire ghi trong docs.

Docs: docs/13_LifeSystem/{LivingWorld, PopupHome, WaitEscalation, ExtensibilityGuide}.md.

### Kết quả build
- `npx tsc --noEmit` EXIT 0; `npm run build` OK (content/index.js 156.03 kB,
  "Đủ 7 file manifest tham chiếu"). Không import thừa, không code thừa.

### Còn lại (vòng sau)
- Hiện thực robot sống trong popup (mount robot thứ hai + đồng bộ storage).
- Ánh xạ id hoạt động/mùa/hoá-già → animation ở lớp view; wire LifeDirector vào loop.
- Cấu hình web-admin cho RobotLifeConfig; hệ "ký ức" (nhớ hôm qua làm gì).

---

## Task History — 2026-07-23 (vòng 2: hiện thực đời sống robot)

Thực hiện phần "Còn lại (vòng sau)" của vòng 1: cho robot thật sự "sống" — robot trong
popup + wire LifeDirector vào loop robot ở trang. Phạm vi vẫn là "vài ví dụ" theo v2.

### A. Robot sống trong popup

- **`extension/src/content/robot/home/HomeActivityAnimations.ts` (mới)** — điểm mở
  rộng duy nhất ở lớp view. `ActivityAnimator` tra `activity.id → Animation[]` (Web
  Animations API): register/registerAll/has/build (có fallback). `DEFAULT_ACTIVITY_ANIMATIONS`
  gồm ~13 builder mẫu (sleep, meditate, readBook, drinkCoffee/Tea, listenMusic,
  playGame, brushTeeth, wateringPlant, gym, pushUp, chargeBattery, oiling); thiếu id →
  `genericIdle` (thở nhẹ). Helper `loop()` cho animation lặp vô hạn.
- **`extension/src/content/robot/home/PopupRobot.ts` (mới)** — robot thứ hai, dùng
  chung `RobotView` + `life/LifeDirector`. `start()` đọc `robotReduceMotion` +
  `robotEnabled` rồi `beginLife()`: bốc `nextActivity`, nếu `isPrivate` → phản ứng
  riêng tư (đỏ mặt + che tay/quay đầu + "Ơ… đợi mình chút nhé! 🙈"), ngược lại diễn
  animation + hẹn `scheduleNext`. Đồng bộ bật/tắt qua `chrome.storage.onChanged`.
- **`extension/src/content/robot/home/index.ts` (mới)** — barrel export.
- **`extension/src/popup/index.html` (sửa)** — khu `.robot-home` (khung `#popup-robot`
  96×108, caption, dòng trạng thái) + CSS.
- **`extension/src/popup/index.ts` (sửa)** — `initializePopupRobot()` tạo `PopupRobot`
  với hook caption/state, gọi `.start()`.

### B. Wire LifeDirector vào robot ở trang

- **`extension/src/content/robot/RobotMascot.ts` (sửa)** — thêm `life = new LifeDirector()`
  + `PAGE_AGING_FILTER`/`PAGE_SEASON_FILTER`. Vào `Thinking` → `startWaitEscalation(gen)`
  (ticker `Date.now()` 1000ms gọi `life.waitCrossings` + `applyThinkingVisual`); rời
  `Thinking` (và `clearAllTimers`) → `stopWaitEscalation()` xoá filter, đảo ngược hiệu
  ứng. Ví dụ hiện thực: ngồi xuống ở mốc `sit`, ám màu mùa + hoá-già bằng CSS filter.
  Cố ý không thêm cử động tay/chân để không xung đột animation nền `think`.
- **`extension/src/content/index.ts` (sửa)** — cập nhật ghi chú `hisRobotLife` (đã wire).

### C. Sửa lỗi — content script vỡ vì Rollup tách chunk chia sẻ

- **Vấn đề:** sau khi popup import cây `robot/home` → `RobotView` + `life/` (vốn content
  cũng import qua `RobotMascot` + `LifeDirector`), Rollup tách chunk chung
  `chunks/LifeDirector-*.js` và chèn `import{…}from"../chunks/…"` vào `content/index.js`.
- **Nguyên nhân:** content script MV3 khai báo trong `manifest.content_scripts[].js` là
  **classic script**, không hỗ trợ ES module → Chrome ném "Cannot use import statement
  outside a module", cả content script chết. Một lượt Rollup không thể nhân bản module
  vào nhiều entry.
- **Giải pháp:** tách build content thành lượt riêng dạng **IIFE tự-chứa**
  (`vite build --mode content`, `format:'iife'`, `emptyOutDir:false`), lượt chính build
  background/fieldSyncBridge/popup (ESM). Mã nguồn vẫn dùng chung (DRY) — chỉ tách ở
  khâu đóng gói. `verifyManifestPlugin` dời sang chạy ở lượt content (lượt cuối).
- **File:** `extension/vite.config.ts` (chuyển sang `defineConfig(({ mode }) => …)`),
  `extension/package.json` (build 2 lượt + script `watch:content`).

### Kết quả build
- `npx tsc --noEmit` EXIT 0; `npm run build` OK — `popup/index.js` 33.43 kB,
  `content/index.js` 157.35 kB (IIFE tự-chứa, **0 câu lệnh `import`**, không có
  `dist/chunks`), "Đủ 7 file manifest tham chiếu". Không import thừa, không code thừa.

### Còn lại (vòng sau — chưa làm)
- Chuỗi-thoát "quay lại làm việc" §4 (đọc sách→gấp sách→đeo jetpack→bay).
- Particle thật cho mùa (cánh hoa/lá/tuyết); hoá-già bằng sprite thay filter.
- Cấu hình web-admin cho RobotLifeConfig; hệ "ký ức".
