# CHANGELOG — Robot Mascot

## [0.6.0] — Diện mạo robot 3D (web-admin) + viết lại hành vi (2026-07-23)

### F1 — Cấu hình MÀU / CỠ / LOGO cho robot 3D từ web-admin (đủ 3 repo)
- **Mô hình dữ liệu** `RobotAppearance` `{color: hex|null, scale: %[40..200], showLogo,
  logoDataUrl: data:image/…|null}`.
- **api-validation** — `Configuration/ExtensionConfigService.cs`: class `RobotAppearance` +
  `ExtensionConfigState.Appearance`; `CleanAppearance()` validate hex `#RRGGBB`, kẹp cỡ
  `[40,200]`, logo `data:image/…` ≤ 700K ký tự. `ExtensionConfigController` +
  `ExtensionConfigAdminController` trả `appearance` trong GET (PUT tự bind).
- **extension** — `ExtensionConfig.ts` parse `appearance`; `RobotFactory` →
  `ThreeRobotRenderer(thresholds, appearance)`; `Robot3DProtocol` thêm lệnh `appearance`;
  `ThreeRobotRenderer` gửi `appearance` khi ready (trước `enabled`); `three/index.ts` →
  `scene.setAppearance()`. `ThreeRobotScene`: `captureMaterials()`+`applyBrandColor()` (thay
  `recolorVNPT`/`captureMaterialBases`), `applyLogo()`+`effectiveLogoUrl()` (thay
  `addChestLogo`), `applyScale()` trên lớp `frame` mới, `setAppearance()`. `PopupRobot3D`
  nhận `appearance` truyền vào `ThreeRobotSceneOptions`; `popup/index.ts` truyền
  `config.appearance`.
- **web-admin** — `models.ts` `RobotAppearanceDto` + `ExtensionConfigDto.appearance`;
  `robot-config` khối **Diện mạo** (chỉ khi chọn Trợ lý 3D): toggle màu tuỳ chỉnh + color
  picker, thanh trượt cỡ 40–200%, toggle logo + TẢI logo (FileReader → data URL, chặn ~500KB)
  + ô xem trước; `patchAppearance()`/`onLogoSelected()`/`clearLogo()`.

### F2 — Viết lại hành vi robot 3D
- **Sửa lỗi TRÙNG robot** — `PopupRobot3D` nay tự quản công tắc `robotEnabled` như
  `PopupRobot` (SVG): nghe `chrome.storage.onChanged`; BẬT → ẩn khu robot popup (nhà trống,
  robot ở content); TẮT → hiện + `flyIn()`. Trước đây mount vô điều kiện nên trùng.
- **Bay xuống/lên theo công tắc** — `setEnabled()` → `flyIn()`/`flyOut()` (Web Animations API
  trên lớp `host`, tách khỏi lớp `frame` chịu CỠ để scale không đụng translateY); on-ready
  gửi `enabled=true` → robot tự rớt xuống lúc mở trang.
- **Nhìn theo chuột** — `applyGaze()` xoay xương `Head`/`Neck` theo con trỏ mỗi frame (cộng
  đè SAU `mixer.update`, nội suy mượt, kẹp ±yaw/±pitch); nghe `pointermove` trên `window`.
- **Nghỉ hai giai đoạn** — `restLevel: awake→sit→sleep`: idle ~30s → ngồi (`Sitting`), thêm
  ~20s → nằm ngủ (giữ `Death` bằng `clampWhenFinished`, thôi liếc); rê chuột/hoạt động → dậy.
- Kiểm chứng: extension build 3 lượt OK, content **167.14 KB vẫn IIFE (0 import)**, đủ 10
  file manifest; backend `dotnet build` 0 lỗi; web-admin `ng build` OK.

### F2b — Sửa lỗi sau phản hồi người dùng
- **Đầu quay vòng vòng liên tục (content + popup)** — `applyGaze()` cũ cộng thẳng góc liếc
  tuyệt đối (`head.rotation.y += gazeYaw`) mỗi frame; với clip KHÔNG có track cho xương
  `Head`, mixer giữ nguyên giá trị cũ nên góc tích luỹ vô hạn → xoay tròn. **Sửa**: lưu
  `appliedYaw`/`appliedPitch` (góc đã áp frame trước) và chỉ cộng phần CHÊNH LỆCH
  `gazeYaw − appliedYaw` mỗi frame → không tích luỹ (đầu tĩnh vẫn liếc theo chuột; clip có
  animate đầu thì animation thắng). File: `three/ThreeRobotScene.ts`.
- **Logo mặc định hiện thành chấm nhỏ** — `vnpt-logo.png` đóng gói là placeholder xấu, render
  ra một chấm. **Sửa**: mặc định `showLogo = false` ở cả 3 repo — chỉ bật khi admin TẢI logo
  riêng (upload tự bật). File: backend `ExtensionConfigService.RobotAppearance.ShowLogo=false`;
  extension `ExtensionConfig.defaultRobotAppearance()`/`parseAppearance()` +
  `ThreeRobotScene` ctor default; web-admin `robot-config.ts` form default + `patchAppearance`.

### F2c — Bay chuyển-nhà đúng thứ tự + đi dạo lúc rảnh (phản hồi người dùng)
- **Bay bật/tắt đúng trình tự "rời trước – tới sau"** — trước đây content & popup cùng bay
  một lúc (chồng chéo). Nay robot RỜI chỗ bay ra NGAY, robot TỚI chỗ mới ĐỢI `LEAVE_MS`
  (~720ms) rồi mới thả xuống. `flyOut({dir})`: content bay **LÊN**, popup bay **XUỐNG**;
  `flyIn({delayMs})` luôn rớt từ trên xuống. TẮT: content lên→biến mất, rồi popup rớt xuống.
  BẬT: popup xuống→biến mất, rồi content rớt xuống. File: `three/ThreeRobotScene.ts`
  (`setEnabled`/`flyIn`/`flyOut`), `three/PopupRobot3D.ts` (`applyEnabled`).
- **Đi dạo/xoay/suy nghĩ lúc rảnh thay cho "giựt giựt"** — bỏ kiểu chèn emote ngẫu nhiên mỗi
  4–9s (nhìn như giật). Bọc model trong nhóm `stage` để tịnh tiến/xoay CẢ thân; hệ chặng
  `MoveSegment` nội suy mượt các hoạt động: xoay người qua lại, **đi qua đi lại một đoạn**,
  **đi ra xa rồi tới gần** (lùi trục Z), **suy nghĩ + nhíu mày** (đổi morph mặt), vẫy chào.
  Biên đi lấy theo cỡ model để không cắt khung. File: `three/ThreeRobotScene.ts`.
- **Ngồi/nằm ngủ êm hơn** — về đúng chỗ gốc trước khi ngồi (`Sitting`); nằm ngủ dùng
  crossfade **chậm 0.6s** sang `Death` cho "nằm từ từ" thay vì "ngã dúi". Giảm mốc:
  rảnh 24s → ngồi, ngồi thêm 14s → ngủ (dễ thấy hơn). File: `three/ThreeRobotScene.ts`.
- Kiểm chứng: `tsc` 0 lỗi; build 3 lượt OK, content **167.14 KB vẫn IIFE (0 import)**, đủ 10
  file manifest.

### F2d — Sửa ngủ/tỉnh + đa dạng hoá hoạt động rảnh (phản hồi người dùng)
- **Ngủ KHÔNG còn "té" + biết TỰ tỉnh** — bỏ hẳn clip `Death` cho lúc ngủ (robot ngã dúi,
  không giống ngủ). Nay ngủ = vẫn NGỒI (`Sitting`) + đầu RŨ XUỐNG (`applyGaze` cúi ~29° khi
  `restLevel='sleep'`) → "gục đầu ngủ". Thêm mốc **ngủ 12s → tự tỉnh** (`SLEEP_TO_WAKE_S`) rồi
  quay lại rảnh, không nằm lì mãi. File: `three/ThreeRobotScene.ts` (`enterSleep`/`applyGaze`/loop).
- **Hết "giựt giựt" khi chuyển sang nghỉ** — trước đây đổi tư thế nghỉ giữa lúc đang đi dạo →
  `clearLocomotion` SNAP về gốc (giật). Nay chỉ chuyển ngồi/ngủ ở nhịp ĐỨNG YÊN (hết hoạt động,
  đã về gốc); đang giữa hoạt động thì hoãn 0.5s. File: `three/ThreeRobotScene.ts` (loop rAF).
- **Thêm NGỒI + biểu cảm rõ rệt vào hoạt động rảnh** — kho hoạt động ngẫu nhiên thêm: ngồi nghỉ
  rồi đứng dậy; giật mình (mặt **Surprised**+Jump); cau mày đấm (mặt **Angry**+Punch); buồn ngồi
  thụp (mặt **Sad**+Sitting). Trực tiếp đáp "chưa thấy sitting / angry / sad / surprised".
- **Hoạt động rảnh NGẪU NHIÊN hơn** — mỗi lần bốc: tham số ngẫu nhiên (quãng đi, **khoảng cách ra
  xa** — có lúc xa hẳn, hướng quay trái/phải, thời lượng) + tránh lặp đúng hoạt động vừa rồi
  (`lastIdleIdx`). Đáp "khoảng cách đi ra xa nên ngẫu nhiên" và "đừng theo 1 quy trình có sẵn".
- Kiểm chứng: `tsc` 0 lỗi; build 3 lượt OK, content **167.14 KB vẫn IIFE (0 import)**, đủ 10 file manifest.

### F2e — Ẩn nút lúc tải, trị giật khi ngồi, thêm Death + nhiều hoạt động (phản hồi người dùng)
- **Hết "nhấp nháy nút mặc định" lúc mới vào** — nút nổi 🤖 nay KHỞI TẠO ẨN (`display:none`).
  Mode robot: giữ ẩn (robot tự làm launcher, hiện khi tải xong). Mode Nút thường: `PopupController`
  hiện lại theo công tắc. File: `ui/UnifiedAssistantPanel.ts`, `content/index.ts`.
- **Trị "giựt giựt" khi ngồi lâu** — nghi vấn đúng: clip `Sitting` khi LẶP bị pop ở mốc lặp
  (đầu≠cuối) → giật đều đều. Nay `Sitting` là **nền GIỮ POSE** (LoopOnce + clamp, `HELD_BASES`),
  không lặp nên phẳng lì; đang giữ đúng pose thì không diễn lại. File: `three/ThreeRobotScene.ts`
  (`HELD_BASES`, `setBase`, handler `finished`).
- **Cho Death "lâu lâu" + tiếp đất bằng Death** — khi NGƯỜI DÙNG chủ động bật lại: rơi từ trên
  cao xuống → **NGÃ (Death) rồi tự đứng dậy**; lần mở/tải trang chỉ nhún nhẹ (Jump) để không "té"
  mỗi lần tải trang. Thêm hoạt động rảnh **té chơi (Death)** rồi lồm cồm dậy. File:
  `three/ThreeRobotScene.ts` (`setEnabled`, `flyIn` cờ `deathLand`, `planIdleActivity`).
- **Thêm nhiều hoạt động — DÙNG HẾT kho clip GLB** — bổ sung: chạy nhanh qua lại (Running),
  nhảy múa (Dance), gật đầu (Yes), lắc đầu (No), giơ ngón cái (ThumbsUp), nhảy cẫng (WalkJump),
  té chơi (Death) — cùng các mục đã có (đi/xoay/ra xa/ngồi/suy nghĩ + mặt Angry/Sad/Surprised).
  Tổng ~17 hoạt động, bốc ngẫu nhiên, chống lặp liền. File: `three/ThreeRobotScene.ts`.
- **KHÔNG sửa `RobotExpressive.glb`** — không tự thêm clip mới vào GLB (cần công cụ 3D, và là
  file load-bearing không được đổi). Thay vào đó khai thác tối đa 14 clip sẵn có + chuyển động
  thủ tục (tịnh tiến/xoay `stage`, xương đầu, morph mặt). Xem hạn chế ở task-005 §F2e.
- Kiểm chứng: `tsc` 0 lỗi; build 3 lượt OK, content **167.16 KB vẫn IIFE (0 import)**, đủ 10 file manifest.

### F2f — Robot hết đè/chặn ô input dưới cùng (phản hồi người dùng)
- **Vùng trống quanh robot xuyên-click** — khung host phần lớn là biên trống (headroom cho tay/chân
  lúc vẫy/đấm/múa) nhưng vẫn nhận chuột → đè & chặn ô input dưới. Nay `host` `pointer-events:none`,
  chỉ **hit-area** nhỏ ôm thân robot mới nhận click/hover. Gõ/bấm xuyên qua vùng trống được.
- **Thu gọn nhẹ** — khung mặc định 112×132 → **100×118** (giữ nguyên tỉ lệ nên camera căn y hệt,
  **không cắt tay/chân**), robot nhỏ ~10% cho đỡ chiếm chỗ. File: `three/ThreeRobotScene.ts`.
- Không thu nhỏ bằng cách cắt khung (đó chính là thứ gây "mất tay chân" — khung trống là headroom
  cho camera khỏi cắt chi). Kiểm chứng: `tsc` 0 lỗi; build OK, content 167.16 KB IIFE, đủ 10 manifest.

### F2g — Hoạt động "đi thẳng tới va đầu vào màn hình" + kính mờ (phản hồi người dùng)
- **Đi tới, to dần, VA màn hình** — hoạt động rảnh mới (chỉ bản content): robot **BƯỚC tới** bằng
  cách tịnh tiến cả thân (`stage`) theo trục Z **về phía camera** (dùng CHÍNH cơ chế locomotion như
  "đi ra xa", chỉ ngược chiều) nên **to dần theo phối cảnh**, đi bằng clip `Walking` → VA: ngửa đầu
  ra sau, mặt Angry, đấm màn hình 2 phát, rồi **bước lùi** về chỗ cũ. Hạ nhẹ thân (`toY`) lúc tới
  gần để giữ ĐẦU trong khung (chân lòi đáy).
- **Kính mờ khu trú chỗ va** — quầng `backdrop-filter:blur` hình vành khuyên (tâm trong để vẫn
  thấy đầu) + bóng loáng + gợn sóng, bám theo vị trí đầu, ~0.72s rồi tự tan. `pointer-events:none`.
- **Không cờ khoá riêng** — vì là hoạt động rảnh bình thường (chuỗi `MoveSegment` trong hàng đợi),
  nó tự khoá việc bốc hoạt động khác + hoãn vòng nghỉ như mọi hoạt động đi dạo. Hiệu ứng lúc va
  (ngửa đầu `headBonk` + kính mờ) bắn qua `onStart` của chặng (trường mới của `MoveSegment`). Đầu
  ngửa chống tích luỹ trong `applyGaze`.
- File: `three/ThreeRobotScene.ts`. Kiểm chứng: `tsc` 0 lỗi; build OK, **robot3d 640.85 KB**,
  content 167.16 KB IIFE, đủ 10 manifest. Hạn chế: độ tới gần (`camDist*0.62`) + hạ thân giữ đầu
  (`toY`) là ước lượng, chưa xem render trực tiếp (headless).
- **Sửa so với bản đầu:** bản đầu phình bằng CSS `transform:scale()` trên lớp `zoomer` → người dùng
  phản hồi bị "phóng ra đột ngột", không phải robot đi tới. Đã bỏ `zoomer` + timeline `setTimeout`
  (`beginChargeScreen`/`cancelCharge`/cờ `charging`), thay bằng bước tới thật trong không gian 3D.
- **Chỉnh (phản hồi lần 2):** tới quá gần → "lệch góc phải, mất mặt". Giảm còn **~2×** (`frac=0.5`) và
  **bù trôi ngang/dọc** (`toX`/`toY` suy từ hình học phối cảnh camera 3/4) để GIỮ mặt trong khung.
  Thêm **nút TEST tạm ở popup** (`▶ Test đi tới màn hình`) gọi `playWalkToScreen`/`demoWalkToScreen`
  — chỉ để xem thử, **sẽ gỡ khi test xong** (đánh dấu `[TẠM]`).

### F2h — Va kính có kịch tính + nghỉ quay hướng ngẫu nhiên (phản hồi người dùng)
- **Kịch bản VA mới** (thay đấm-ngay): đi tới sát kính → **BẬT NGỬA + TÉ** (emote `Death`, lùi ra
  sau + hụp xuống, mặt `Surprised`, quầng kính) → **NẰM** một lúc → **ĐỨNG DẬY** → **CHẠY tới**
  (`Running`, mặt `Angry`) → **ĐẤM 3 CÁI** (mỗi cái quầng kính) → **BỰC MÌNH QUAY LƯNG** đi về chỗ
  cũ → **quay lại chính diện**. Bù phối cảnh giữ mặt tại mọi độ sâu bằng helper `holdAt(z)` (gộp 2
  hằng `holdX/holdY` rời rạc; dùng chung cho chỗ sát kính lẫn chỗ té).
- **Nghỉ quay hướng NGẪU NHIÊN** (thay quay chính diện cố định): thêm `REST_FACINGS` (chính diện /
  phải / trái / quay lưng / chếch) — `enterSit` bốc ngẫu nhiên `restRotY`; vòng lặp rAF **nội suy
  mượt** `stage.rotation.y → restRotY` khi đang nghỉ (`ambient='off'` nên `updateLocomotion` không
  chạy → tự lerp tại loop như gaze). `enterSleep` **giữ nguyên hướng đã ngồi** (đặt lại
  `stage.rotation.y=restRotY` sau `clearLocomotion` để khỏi snap về 0) → gục đầu cùng hướng.
- File: `three/ThreeRobotScene.ts` (chỉ 1 file). Kiểm chứng: `tsc` 0 lỗi; build OK, **robot3d
  641.99 KB**, content 167.16 KB IIFE (0 import), đủ 10 manifest. Hạn chế: thời lượng NẰM,
  `backZ`/`fallDrop`, tốc độ lerp hướng nghỉ là ước lượng, chưa xem render trực tiếp (headless).

### F2i — Quầng kính NỨT khớp đúng chỗ va + ngủ mê "té ra rồi lọ mọ ngồi dậy" (phản hồi người dùng)
- **Quầng kính khớp chỗ va THỰC** — thay tâm quầng cố định bằng CHIẾU XƯƠNG ra màn hình
  (`projectToScreen` qua `camera`): lúc đụng ĐẦU → quầng ở đầu; mỗi cú ĐẤM → quầng ở NẮM ĐẤM (điểm
  ngang ngực dưới xương `Head`). Bám theo vị trí/cỡ thực nên khớp cả khi robot tiến sát to ~2×.
- **Hiệu ứng NỨT kính** (`spawnCrack`) — SVG hình sao: 7–9 tia răng-cưa toả từ tâm va + vòng rạn nối
  các tia, đọng ~1.1s rồi tan; `pointer-events:none`, tự gỡ. Bắn kèm mỗi lần va/đấm.
- **Ngủ mê "té ra"** — đôi khi (xác suất 50%) đang gục đầu ngủ thì đổ người (emote `Death` từ thế
  ngồi) rồi TỰ mờ về base `Sitting` → "lọ mọ ngồi dậy". Hẹn bằng `sleepFallTimer` trong vòng lặp rAF
  (không `setInterval`); nới hạn tỉnh (`FALL_RECOVER_S`) để kịp ngồi dậy trước khi tỉnh.
- File: `three/ThreeRobotScene.ts` (chỉ 1 file). Kiểm chứng: `tsc` 0 lỗi; build OK, content 167.16 KB
  IIFE (0 import), đủ 10 manifest. Hạn chế: lệch đầu↔nắm đấm là ước lượng theo xương `Head`
  (không có xương tay riêng); "té khi ngủ" mượn clip `Death` (thế đứng) nên hơi lạ, chỉnh nếu cần.

### F2j — Hoãn nứt kính cho khớp tay + robot "ở trong phòng" (đi/ngồi/ngủ ở xa, chỉ về chỗ khi mở chat)
- **Hoãn quầng nứt cho KHỚP chạm** — `hit()` đặt ngửa đầu ngay nhưng HOÃN `spawnGlassAt` bằng
  `setTimeout` một-lần: đầu ~60ms, NẮM ĐẤM ~170ms (đợi tay vươn ra chạm kính); guard `disposed`. Trước
  đây nứt ngay đầu chặng đấm khi tay chưa tới.
- **Robot "ở trong phòng"** — thêm `roamSegments()`: đi/chạy tới một chỗ NGẪU NHIÊN (sâu `−Z`, lệch
  ngang vừa phải) rồi **Ở LẠI**, không quay về gốc. `planIdleActivity` viết lại: ~40% đi lòng vòng
  (roam) + các động tác/cảm xúc TẠI CHỖ; GỠ 3 hoạt động cũ luôn ép về gốc (đi/chạy qua-lại, đi ra xa).
- **Ngồi/ngủ/bật dậy tại chỗ, liền hướng** — thêm `settleInPlace()` (dừng đi lại NHƯNG giữ vị trí/hướng);
  `enterSit`/`enterSleep`/`wake` dùng nó thay `clearLocomotion` → nghỉ NGAY chỗ đang đứng. `wake` chốt
  đúng hướng đang ngồi/gục/té khi bật dậy (không còn quay về chính diện).
- **Về chỗ khi mở chat (giữ nguyên)** — `setState` vẫn `clearLocomotion` (snap gốc); `chatOpened →
  setState('listening')` nên mở hộp thoại chat → robot luôn đứng đúng chỗ hiện tại.
- File: `three/ThreeRobotScene.ts` (chỉ 1 file). Kiểm chứng: `tsc` 0 lỗi; build OK, content 167.16 KB
  IIFE (0 import), robot3d 644.34 KB, đủ 10 manifest. Hạn chế: biên đi lòng vòng + mốc hoãn nứt
  (60/170ms) là ước lượng — chỉnh nếu robot ló mép khung hoặc nứt còn lệch.

### F2k — Vết nứt kính (bỏ vòng tròn, độ rộng theo mức bể, cú cuối thủng lỗ, đấm 2–4 cú) + robot ghi chép khi nhập liệu
- **Bỏ vòng tròn, chỉ vết nứt** — thay quầng tròn mờ (frosted ring) cũ bằng bộ vẽ SVG thuần KHÔNG hình
  tròn: `mountFxSvg` + `crackRays` (tia răng-cưa dùng chung) + `spawnCrack` (sao nứt + vòng rạn lởm chởm,
  1100ms). **Độ rộng theo mức bể**: `size` NGẪU NHIÊN (đấm `rnd(150,320)`, đầu `rnd(120,240)`).
- **Cú cuối thủng lỗ lớn** — `spawnGlassHole`: tia nứt dài + lỗ đa giác lởm chởm tô gradient tối + viền
  kính sáng (id gradient duy nhất), 1500ms; cỡ `max(210,min(460,frameW*rnd(1.2,2.2)))` → luôn ≥ nắm đấm.
- **Số cú đấm 2–4** — `walkToScreenSegments`: `punches = 2 + floor(random*3)`; vòng `for` xếp `Punch`, cú
  CUỐI gọi `hit(v,'fist',hole=true)` → thủng lỗ, nghỉ lâu hơn cho "đọc" ra lỗ.
- **Robot ghi chép khi nhập liệu** — props vở+viết (`ensureWriteProps`) gắn lên xương Torso (theo thân khi
  ngồi), ẩn sẵn. `setState('typing')` → `enterWriting` (ngồi `Sitting`, hiện props, hẹn "chán" 12s); giữ
  liền mạch theo từng phím (đang ghi → `break`, không giật). `updateWriting` hí hoáy ngòi viết; `applyGaze`
  cúi đầu nhìn vở. Hết giờ → `stopWriting` + cooldown 6s + `setState('idle')` (đứng dậy về như cũ). Rời
  `typing` → cất viết. Props tự dọn trong `dispose`.
- File: `three/ThreeRobotScene.ts` (chỉ 1 file). Kiểm chứng: `tsc` 0 lỗi; build OK, content 167.16 KB
  IIFE (0 import), robot3d **647.88 KB**, đủ 10 manifest. Hạn chế: toạ độ vở+viết & cỡ lỗ thủng là ước
  lượng headless; robot không có xương bàn tay nên viết chỉ "đặt trước bụng"; `WRITE_BORED_S` không reset
  theo phím (chán sau ~12s dù còn gõ).

### F2l — Sửa: đi lòng vòng tới nơi rồi "giậm chân tại chỗ" (chân bước mà người không nhỏ lại)
- **Nguyên nhân:** trong `roamSegments()` (F2j), chặng "đứng ngắm quanh" không đặt lại `base` → kế thừa
  `Walking`/`Running` nhưng không có `toX/toZ` (đứng yên) → chạy clip bước chân khi không di chuyển.
- **Sửa:** thêm `base: 'Idle'` vào chặng đứng ngắm (dừng bước ngay khi hết di chuyển); chặng quay-lại-nhìn
  bỏ `base: 'Idle'` thừa. Chỉ `three/ThreeRobotScene.ts`. `tsc` 0 lỗi; content 167.16 KB IIFE (0 import),
  robot3d 647.88 KB, đủ 10 manifest.

### F2m — Đi lòng vòng: ra xa NGẮM rồi ĐI VỀ (thay vì la cà ở xa nhìn nhỏ xíu), có cờ bật lại
- **Yêu cầu:** đi ra xa rồi VÀO lại (đứng la cà ở xa nhìn robot nhỏ xíu, không đẹp); giữ code cũ, chỉ đặt cờ.
- **Sửa:** thêm hằng `ROAM_STAY_FAR = false`. `roamSegments` rẽ nhánh: `false` (mặc định) → ra xa ngắm quanh
  rồi ĐI/CHẠY VỀ gốc `(0,0)` (to dần lại), quay chính diện; `true` → Ở LẠI chỗ xa la cà (hành vi cũ, giữ để
  sau bật). Chỉ `three/ThreeRobotScene.ts`. `tsc` 0 lỗi; content 167.16 KB IIFE (0 import), robot3d
  648.07 KB, đủ 10 manifest.

## [0.5.0] — task-005: Chế độ ngẫu nhiên cho "Leo thang khi chờ AI"

### Mới — Công tắc "Ngẫu nhiên hoá leo thang chờ AI"
- `life/RandomStageSequencer.ts` (mới) — sinh chuỗi stage NGẪU NHIÊN theo thời gian
  ngẫu nhiên; lịch dựng dần & ổn định (snapshot ↔ crossed khớp), có `reset()`.
- `life/WaitEscalation.ts` — hoán đổi hai chiến lược (StageTimeline mặc định /
  RandomStageSequencer) cùng bề mặt `at`/`crossed`; `RobotLifeConfig.waitRandom`
  ({minMs:4s, maxMs:12s}). `RandomEventGenerator` thêm `pick()` uniform tránh lặp ngay.
- `life/LifeDirector.ts` — `LifeThresholdOverride.waitEscalationRandom` + `resetWait()`.
- `RobotMascot.ts` — chế độ ngẫu nhiên: mỗi lần đổi hoạt động bốc một cử chỉ ngẫu nhiên;
  `ExtensionConfig.ts` parse cờ từ API.
- Backend `ExtensionConfig*` + web-admin `robot-config` (mat-slide-toggle) truyền cờ
  end-to-end, lưu bền. Chỉ áp cho leo thang chờ AI (không đụng mùa/hoá già).

### Bổ sung (2026-07-23) — Áp chế độ ngẫu nhiên cho robot 3D
- `three/Robot3DProtocol.ts` — lệnh `thinking` mang thêm `random: boolean`.
- `three/ThreeRobotRenderer.ts` — `notifyThinking()` gửi cờ `waitEscalationRandom`.
- `three/ThreeRobotScene.ts` — `setWaitRandom()` + chu kỳ chờ ngẫu nhiên: bốc clip nền/
  emote ngẫu nhiên mỗi 2.5–6s (đếm giờ bằng vòng lặp rAF, không `setInterval`); đổi trạng
  thái khác → tự dừng. `three/index.ts` — log chẩn đoán `[Robot3D] Module page-world…`.
- Đã kiểm chứng test page-world: render OK, random chạy không lỗi console.

### Chống cắt khung + bằng-vai hành vi SVG + hoá già/đổi mùa cho robot 3D (2026-07-23)
- **E1 chống cắt** — `three/ThreeRobotScene.ts`: host mặc định **75×90 → 112×132** (robot
  vẫn nhỏ, khung rộng hơn nhiều, nền trong suốt); `frameModel()` tách `marginX≈2.3` (quơ
  tay) / `marginY≈1.5` → tay/chân vươn ra ngoài silhouette đứng vẫn trong canvas.
- **E4 bằng vai hành vi** — `three/ThreeRobotScene.ts` + `three/index.ts`: `localError` →
  trạng thái mới **`pointError`** (đứng, `Punch` chỉ lỗi, mặt `Surprised`) tách khỏi
  `aiError`→`sad`; **hover** rê chuột → vẫy tay; **nghỉ lâu ~40s** → ngồi thụp
  (LongIdle/Sleeping), rê chuột/đổi trạng thái → nhảy dậy (đếm giờ bằng rAF).
- **E3 hoá già + đổi mùa** — `three/Robot3DProtocol.ts` thêm lệnh `life{aging,season}`;
  `three/ThreeRobotRenderer.ts` tái dùng `LifeDirector` chạy đồng hồ chờ AI (mỗi giây gửi
  giai đoạn khi đổi, hết chờ → phục hồi); `three/ThreeRobotScene.ts` `setLife()` tô màu
  vật liệu (già → xám/tối `AGING_GRAY` + giảm `mixer.timeScale`; mùa → nhân `SEASON_TINT`),
  `captureMaterialBases()` lưu màu gốc. Thay CSS filter của robot SVG. *Chưa có hạt mùa.*
- **E2** — KHÔNG làm web-admin color config (không "nhanh": nối chuỗi đủ 3 repo); màu/cỡ/
  logo vẫn chỉnh nhanh bằng hằng số + build (`VNPT_BLUE`, `width/height`, file PNG logo).
- Kiểm chứng: build 3 lượt OK, content **166.36 KB vẫn IIFE (0 import)**, đủ 10 file manifest.

### Tinh chỉnh robot 3D (2026-07-23) — cỡ 1/2, khung hình, đa hoạt động, xanh VNPT, logo, popup 3D
- `three/ThreeRobotScene.ts` — host mặc định **75×90** (nửa bản gốc); `ThreeRobotSceneOptions`
  (container/width/height/interactive/logoUrl) để tái dùng scene. `frameModel()` căn camera
  theo bounding-box → **đầu không bị cắt**. Dùng hết clip GLB: `WAIT_MOVES` thêm Running/
  Sitting/Punch/WalkJump/Death(té→đứng dậy); `IDLE_FIDGETS` cựa quậy nền lúc rảnh (4–9s).
  `recolorVNPT()` → thân **xanh VNPT `#0068b3`**; `addChestLogo()` gắn logo lên xương `Torso`.
- `three/index.ts` — suy `logoUrl` cùng thư mục model, truyền vào scene.
- `three/PopupRobot3D.ts` (mới) + `popup/index.ts` — popup mount **robot 3D** khi cấu hình
  `three` (fallback SVG nếu lỗi). three chỉ vào bundle popup (tải khi mở popup).
- `public/robot3d/vnpt-logo.png` (**placeholder** — thay bằng logo VNPT chính thức) +
  `manifest.json` web_accessible_resources.
- Kiểm chứng: build 3 lượt OK (content 165 KB IIFE 0 import, "✓ Đủ 10 file manifest"); test
  page-world: model+logo 200, host 75×90, robot xanh, đầu không bị cắt.

## [0.4.0] — task-004: Robot 3D bằng model có xương + "Nút thường"

### Mới — "Bi 3D" dùng RobotExpressive.glb (skeletal + morph)
- `content/robot/three/ThreeRobotScene.ts` — DỰNG LẠI bằng model có xương
  `RobotExpressive.glb` (three.js, MIT) qua `GLTFLoader` + `AnimationMixer` + morph khuôn
  mặt, giống ví dụ `webgl_animation_skinning_morph`. Điều khiển theo trạng thái: clip nền
  lặp đổi bằng crossfade, emote một-lần tự về nền, morph nội suy mượt. URL model suy từ
  `import.meta.url` (page world không có `chrome.runtime`). Model đóng gói ở
  `public/robot3d/RobotExpressive.glb` (`web_accessible_resource`), NẠP LƯỜI cùng "Bi 3D".
- `three/Robot3DProtocol.ts` — thêm lệnh `enabled` + sự kiện `ROBOT3D_FAILED`.
- `three/ThreeRobotRenderer.ts` — dùng lại `PopupController` đồng bộ công tắc `robotEnabled`
  sang scene; lỗi nạp model → quay về SVG ngay (không đợi timeout 4s).
- Bundle `dist/robot3d/index.js` 625.91 KB (gzip 159.92 KB) + model 453 KB — vẫn nạp lười.

### Thay đổi — Hình hài `svg` đổi thành "Nút thường" (không robot)
- `content/robot/PlainButtonRenderer.ts` (mới) — `RobotRenderer` no-op, `providesLauncher
  = false`: giữ nút tròn 🤖 mặc định của panel làm launcher, không mascot/animation.
- `RobotFactory` map `svg` → `PlainButtonRenderer`; `content/index.ts` chỉ ẩn nút mặc định
  khi hình hài tự làm launcher, và với "Nút thường" đồng bộ ẩn/hiện nút theo `robotEnabled`
  (tắt robot → ẩn luôn nút trợ lý). `RobotRenderer` thêm cờ `providesLauncher?`.
- Nhãn danh mục: `svg` "Bi" → **"Nút thường"** (extension + web-admin).

## [0.3.0] — task-003: Ba hình hài + cấu hình từ API

### Mới — Ba hình hài robot chọn được (Part 2)
- `content/robot/RobotRenderer.ts` — interface chung `RobotRenderer` + danh mục
  `ROBOT_RENDERERS`: `svg` "Bi", `svgAnim` "Bi Động", `three` "Bi 3D". Mọi hình hài
  dùng chung lõi `life/`, chỉ khác lớp trình diễn (OCP/DIP).
- `content/robot/RobotFactory.ts` — `createRobotRenderer(id, thresholds)` dựng đúng
  hình hài theo cấu hình.
- `content/robot/three/*` — "Bi 3D" bằng ThreeJS, đóng gói riêng
  `dist/robot3d/index.js` (`web_accessible_resource`), NẠP LƯỜI ở page world chỉ khi
  được chọn (bundle 517KB — quá nặng để nhúng content script). Proxy phía content
  KHÔNG import three; giao tiếp qua `CustomEvent` trên `document`; lỗi/timeout 4s →
  tự rơi về SVG. Lượt build thứ ba `vite build --mode robot3d`.

### Mới — Cấu hình bơm từ web-admin, nạp khi load trang (§1.6 + Part 2)
- `content/robot/ExtensionConfig.ts` — GET `/api/extension-config` khi trang HIS tải
  xong; trộn ngưỡng theo id lên `RobotLifeConfig` (chỉ đổi `atMs`). Mọi lỗi → mặc
  định, không chặn trang. `life/LifeDirector` thêm `LifeThresholdOverride`.
- Backend `api-validation`: `ExtensionConfigService` + controller công khai
  `/api/extension-config` và admin `/api/admin/extension-config` (System.Admin, audit).
- `web-admin`: trang **Cấu hình robot** chọn 1/3 hình hài + tinh chỉnh ngưỡng.

### Mới — Particle mùa thật (§5) + Ký ức robot (§7)
- `content/robot/SeasonParticles.ts` — cánh hoa/lá/tuyết rơi thật (WAAPI, view layer,
  không đụng `life/`), tôn trọng `prefers-reduced-motion`.
- `content/robot/home/RobotMemory.ts` — nhớ ≤24 hoạt động gần nhất, chào theo ký ức.

## [0.2.1] — RDD Expansion v2 (task-002, vòng 2)

### Mới — Robot sống trong popup
- `content/robot/home/PopupRobot.ts` — robot thứ hai mount vào `#popup-robot`, dùng
  chung `RobotView` + `life/LifeDirector` với robot ở trang. Tự bốc hoạt động theo pha
  trong ngày, diễn animation, phản ứng riêng tư (`isPrivate` → đỏ mặt/che người), đồng
  bộ bật/tắt qua `chrome.storage` (`robotEnabled`), tôn trọng `robotReduceMotion`.
- `content/robot/home/HomeActivityAnimations.ts` — `ActivityAnimator`: bảng tra
  `activity.id → Animation[]` (Web Animations API). **Điểm mở rộng duy nhất** ở view:
  thêm builder = dạy robot animation hoạt động mới, KHÔNG đụng `life/`. Có sẵn ~13 ví
  dụ; thiếu id → `genericIdle` (thở nhẹ).
- `popup/index.html` + `popup/index.ts` — khu "ngôi nhà" robot (khung 96×108, caption,
  dòng trạng thái) + `initializePopupRobot()`.

### Mới — Wire LifeDirector vào robot ở trang (`RobotMascot.ts`)
- Vào `Thinking` → `startWaitEscalation`: ticker `Date.now()` mỗi 1000ms gọi
  `life.waitCrossings` + `applyThinkingVisual`. Leo thang hành vi (ngồi xuống ở mốc
  `sit`), ám màu bốn mùa + hoá-già bằng CSS filter (`PAGE_SEASON_FILTER` /
  `PAGE_AGING_FILTER`). Rời `Thinking` → `stopWaitEscalation` đảo ngược mọi hiệu ứng.

### Sửa lỗi — Build content script vỡ vì chunk chia sẻ
- **Vấn đề:** popup nay import cây `robot/`+`life/` (đã có ở content), Rollup tách
  chunk chung và chèn `import "../chunks/…"` vào `content/index.js`. Content script MV3
  là classic script → Chrome báo "Cannot use import statement", hỏng toàn bộ.
- **Giải pháp:** tách build content thành lượt riêng dạng **IIFE tự-chứa** qua
  `vite build --mode content` (không tách chunk), mã nguồn vẫn dùng chung (DRY). Sửa
  `vite.config.ts` (`defineConfig(({ mode }) => …)`) + `package.json` build 2 lượt.

### Chưa làm (vòng sau)
- Chuỗi-thoát "quay lại làm việc" §4 (đọc sách→gấp sách→bay).
- Particle thật cho mùa; hoá-già bằng sprite thay filter; cấu hình web-admin; hệ "ký ức".

## [0.2.0] — RDD Expansion v2 (task-002, vòng 1)

### Sửa lỗi
- **Bật robot xong biến mất/ẩn luôn:** `PhysicsController` để `fill:'forwards'` treo
  ghi đè style; fix bằng `commitStyles()` + `cancel()` sau khi animation xong; Idle
  khôi phục `opacity`.
- **Té cứng:** làm lại keyframe `fall()` (chao đảo lấy đà, easing trọng lực, nảy nhẹ,
  chống dậy) cho mượt.

### Thay đổi
- **Ngực robot dùng logo VNPT chính thức** (ảnh nhúng base64) thay cho chữ "VNPT" —
  `RobotSvg.ts` + `RobotLogo.ts`.
- **Gỡ khối "Endpoint tải XML 130" khỏi popup** (HTML + CSS + logic); chức năng tải
  vẫn chạy nhờ `HisXmlDownloader.DEFAULT_ENDPOINT`.

### Mới — Hệ sinh hoạt (thư viện quyết-định thuần, `robot/life/`)
- `LifeDirector` (mặt tiền) · `TimeScheduler` (giờ→pha + jitter) · `ActivityRegistry`
  + `activities` (≥20 ví dụ) · `RandomEventGenerator` · `IdleActivityGenerator` ·
  `WaitEscalation`/`SeasonSystem`/`AgingSystem` trên `StageTimeline` (DRY).
- Mở rộng bằng DỮ LIỆU (thêm Activity / mốc) không sửa engine; cấu hình ở
  `RobotLifeConfig` (web-admin bơm sau). Expose `window.hisRobotLife` để thử.
- Docs: `13_LifeSystem/{LivingWorld, PopupHome, WaitEscalation, ExtensibilityGuide}`.

### Chưa làm (vòng sau)
- Robot sống trong popup (mount robot thứ hai + đồng bộ storage).
- Ánh xạ id hoạt động/mùa/hoá-già → animation ở view; wire LifeDirector vào loop.
- Cấu hình web-admin; hệ "ký ức".

## [0.1.0] — Phiên bản đầu (v1, SVG/CSS)

### Đã có
- Robot vẽ 100% bằng SVG/CSS (đầu, mắt, miệng, tay, chân, ngực logo VNPT), không GIF/PNG/ThreeJS.
- Máy trạng thái ưu tiên (Idle < Mouse < Validation < UserClick < Critical).
- Máy cảm xúc: Neutral/Happy/Curious/Focused/Sleepy/Proud/Embarrassed/Sad/Surprised.
- Hành vi rảnh: thở, chớp mắt, nhìn quanh, gãi đầu, ngáp → LongIdle (ngồi) → Sleeping (Zzz).
- Nhìn theo chuột (mắt + đầu ±18°); chuột lên quá cao & lâu → mất thăng bằng → té → chóng mặt → đứng dậy.
- Trạng thái chat: mở → lắng nghe (nod); gõ → nghiêng đầu; AI xử lý → suy nghĩ.
- Phản ứng kết quả: đạt → giơ ngón cái; toàn bộ sạch → ăn mừng + hoa giấy; nguy cơ xuất toán → buồn; thiếu thông tin → gãi đầu.
- Bật/tắt qua công tắc popup (`robotEnabled`): tắt → bay khỏi màn hình rồi ngủ; bật → rơi xuống, đáp mạnh, u đầu rồi cười. Ngắt được ở mọi trạng thái (Critical).
- Giảm chuyển động khi `prefers-reduced-motion` hoặc `robotReduceMotion`.

### Kiến trúc module (`extension/src/content/robot/`)
`RobotMascot` (điều phối) · `RobotView` · `RobotSvg` · `EmotionEngine` ·
`AnimationController` + `animations` · `StateMachine` + `RobotState` ·
`MouseTracker` · `PhysicsController` · `PopupController` · `Confetti` · `RobotNotifier`.

### Hoãn sang v2
- `SoundController` (âm thanh).
- ThreeJS 3D (`08_ThreeJS/`).
- Bộ nhớ dài hạn / học thói quen người dùng (`MemorySystem`, `BoredomSystem`).
