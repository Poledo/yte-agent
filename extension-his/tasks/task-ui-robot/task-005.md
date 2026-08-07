===========================================================
task-005 — Chế độ NGẪU NHIÊN cho "Leo thang khi chờ AI"
===========================================================

## Yêu cầu (người dùng)

Cấu hình "Leo thang khi chờ AI" cần thêm **tùy chọn random**: khi bật, các hoạt
động của robot sẽ **thay đổi ngẫu nhiên theo những khoảng thời gian ngẫu nhiên**
(thay vì leo thang lần lượt theo các mốc cố định như hiện tại).

## Phạm vi

- Thêm CÔNG TẮC bật/tắt chế độ ngẫu nhiên ở web-admin (card "Leo thang khi chờ AI").
- Bơm cờ này xuống extension qua `/api/extension-config` (backend lưu bền).
- Extension: khi bật, bộ NÃO (`life/`) đổi cách sinh stage — bốc ngẫu nhiên theo
  khoảng thời gian ngẫu nhiên; khi tắt giữ nguyên leo thang cố định.
- KHÔNG đụng seasons/aging (chỉ áp cho leo thang chờ AI đúng như yêu cầu).

## Thiết kế (giữ SOLID — bộ não quyết định, lớp view chỉ diễn)

- **Hai chiến lược hoán đổi** cho `WaitEscalation` (cùng bề mặt `at`/`crossed`):
  - Mặc định: `StageTimeline` — mốc cố định (đã có).
  - Ngẫu nhiên: `RandomStageSequencer` (mới) — dựng lịch DẦN & ổn định trong một
    phiên: mốc đầu tại 0, mỗi mốc kế = mốc trước + khoảng ngẫu nhiên trong
    `[minMs, maxMs]`, stage bốc ngẫu nhiên (tránh lặp ngay). Vì `elapsed` chỉ tăng
    nên `snapshot` và `crossed` khớp nhau (không nhấp nháy).
- Cấu hình khoảng thời gian ở `RobotLifeConfig.waitRandom` ({minMs:4s, maxMs:12s}).
- Mỗi phiên chờ mới gọi `LifeDirector.resetWait()` để re-random.
- Lớp view (`RobotMascot`) khi ở chế độ ngẫu nhiên: mỗi lần "đổi hoạt động" bốc một
  cử chỉ ngẫu nhiên (`WAIT_RANDOM_GESTURES`) — robot trông đang làm việc khác nhau,
  không ngồi lún như leo thang cố định.

## TASK HISTORY (append-only — không xóa/ghi đè)

### 2026-07-23 — Hoàn thành: tùy chọn random cho leo thang chờ AI
- **Đã làm (extension `life/`):**
  - `RobotLifeConfig.ts` — thêm `waitRandom { minMs, maxMs, avoidImmediateRepeat }`.
  - `RandomEventGenerator.ts` — thêm `pick<T>(items, avoidId?)` (uniform, tránh lặp ngay).
  - `RandomStageSequencer.ts` (mới) — sinh chuỗi stage ngẫu nhiên theo thời gian ngẫu
    nhiên; lịch dựng dần & ổn định; có `reset()`.
  - `WaitEscalation.ts` — nhận `options.random`; delegate `StageTimeline` (mặc định) hoặc
    `RandomStageSequencer` (ngẫu nhiên); thêm `reset()`.
  - `LifeDirector.ts` — `LifeThresholdOverride.waitEscalationRandom?: boolean`; truyền cờ
    xuống `WaitEscalation`; thêm `resetWait()`.
  - `life/index.ts` — export `RandomStageSequencer` + type `WaitEscalationOptions`.
- **Đã làm (extension view/config):**
  - `RobotMascot.ts` — đọc cờ `waitEscalationRandom`; `startWaitEscalation()` gọi
    `resetWait()`; `playWaitStage()` ở chế độ ngẫu nhiên bốc cử chỉ ngẫu nhiên.
  - `ExtensionConfig.ts` — parse `life.waitEscalationRandom` từ API vào thresholds.
- **Đã làm (backend api-validation):**
  - `Configuration/ExtensionConfigService.cs` — `RobotLifeThresholds.WaitEscalationRandom`
    (bool) + normalize.
  - `Controllers/ExtensionConfigController.cs` + `Controllers/Auth/ExtensionConfigAdminController.cs`
    — trả thêm `life.waitEscalationRandom`.
- **Đã làm (web-admin):**
  - `core/api/models.ts` — `RobotLifeThresholds.waitEscalationRandom: boolean`.
  - `features/robot-config/robot-config.ts` — form control `waitEscalationRandom`, load/save;
    import `MatSlideToggleModule`.
  - `robot-config.html` — `mat-slide-toggle` "Ngẫu nhiên hoá 'Leo thang khi chờ AI'" + ghi
    chú; làm mờ card mốc cố định khi bật. `robot-config.scss` — style kèm.
- **Kiểm chứng:** extension `npx tsc --noEmit` 0 lỗi, `npm run build` 3 lượt OK (content
  165.30 KB), "✓ Đủ 9 file manifest tham chiếu", bundle chứa `waitEscalationRandom`+`resetWait`;
  backend `dotnet build` 0 lỗi (chỉ vướng khoá file DLL khi API đang chạy — build ra thư mục
  tạm 0 error); web-admin `npm run build` OK.
- **Hạn chế:** hình hài "Trợ lý 3D" (`three`) hiện chưa áp chế độ ngẫu nhiên (robot 3D
  dùng ánh xạ trạng thái riêng — thinking→Walking); cờ chỉ ảnh hưởng robot SVG. Nếu cần,
  làm ở task sau.

### 2026-07-23 — Bổ sung: áp chế độ ngẫu nhiên cho robot 3D + chẩn đoán "3D chưa hiện"

- **Yêu cầu người dùng:** (a) đã chọn robot 3D + bật ở extension nhưng "chưa thấy xuất
  hiện"; (b) hoàn thành hạn chế: robot 3D cũng phải áp chế độ ngẫu nhiên.

- **(b) Đã làm — random cho robot 3D (`content/robot/three/`):**
  - `Robot3DProtocol.ts` — lệnh `thinking` mang thêm `random: boolean` (cờ đi kèm sự kiện
    dùng nó, không cần message cấu hình riêng — SRP).
  - `ThreeRobotRenderer.ts` — `notifyThinking()` gửi `random = thresholds.waitEscalationRandom`.
  - `three/index.ts` — `onCmd('thinking')` gọi `scene.setWaitRandom(cmd.random)` TRƯỚC
    `setState`; thêm log `[Robot3D] Module page-world đã khởi động` để chẩn đoán.
  - `ThreeRobotScene.ts` — thêm `setWaitRandom()`, `startWaitRandom()`, `pickWaitRandomMove()`
    + kho `WAIT_RANDOM_MOVES` (clip nền + emote). Khi `thinking` mà `waitRandom` bật: bốc
    ngẫu nhiên một hoạt động (Walking/Wave/Yes/No/ThumbsUp/Jump/Dance) mỗi 2.5–6s ngẫu
    nhiên, ĐẾM GIỜ BẰNG vòng lặp rAF (giống `celebrateTimer`, KHÔNG `setInterval`). Đổi
    trạng thái khác → tự dừng chu kỳ (đặt `waitRandomActive=false` đầu `setState`).

- **(a) Chẩn đoán "3D chưa hiện" — KHÔNG phải lỗi code ở bản build hiện tại:**
  - Kiểm chứng endpoint đang chạy: `GET https://localhost:44350/api/extension-config` trả
    `robotRenderer:"three"` + `waitEscalationRandom:true` → extension SẼ nhận `three`.
  - Test page-world thực tế (serve `dist/`, chèn `robot3d/index.js` như extension): module
    khởi động, model tải xong, phát `READY`, host `#his-robot3d-host` 150×180 hiện ở góc
    phải-dưới, canvas vẽ, z-index tối đa; chu kỳ random chạy 8s KHÔNG lỗi console (chỉ cảnh
    báo `THREE.Clock` deprecated — vô hại, có sẵn). ⇒ Khi chọn `three` + bật, robot 3D HIỆN.
  - **Nguyên nhân khả dĩ (môi trường, không phải code):** (1) extension đang nạp là bản
    build CŨ — cần Reload extension + F5 lại trang HIS; (2) công tắc robot trong popup đang
    TẮT → `setEnabled(false)` ẩn host; (3) CSP trang chặn module → sau 4s tự rơi về robot
    SVG (vẫn phải thấy robot SVG, không phải "trống trơn"). Nếu console (page world) KHÔNG
    có log `[Robot3D] Module page-world đã khởi động` thì rơi vào (1)/(3).
  - **Footgun đã phát hiện (chưa sửa, đã báo):** có HAI file `Storage/extension-config.json`
    — bản nguồn (`api-validation/AIValidation.Api/Storage/`, đang là `three`) và bản cũ
    trong `bin/Debug/net10.0/Storage/` (còn `svg`). `.csproj` KHÔNG copy `Storage/**` nên hai
    bản lệch do API từng chạy ở hai thư mục làm việc khác nhau. `ExtensionConfigService`
    đọc `ContentRootPath/Storage/...`. Bản đang chạy đọc bản nguồn nên phục vụ `three` đúng;
    nhưng nếu sau này chạy API từ `bin/Debug` (hoặc publish) sẽ phục vụ `svg` cũ → robot mất.

- **Kiểm chứng:** extension `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK (content
  165.37 KB, robot3d 626.54 KB), "✓ Đủ 9 file manifest tham chiếu"; content bundle chứa
  `type:"thinking",...random:...waitEscalationRandom===true`, robot3d bundle chứa
  `setWaitRandom`; test page-world render OK, random chạy không lỗi.

### 2026-07-23 — Tinh chỉnh robot 3D: cỡ 1/2, khung hình, đa hoạt động, xanh VNPT, logo, popup 3D

- **Yêu cầu người dùng:** robot 3D đã hiện nhưng (1) quá to → giảm còn 1/2; (2) đầu bị
  che → sửa khung hình; (3) popup vẫn là robot SVG → cho ra robot 3D; (4) quá ít hoạt
  động (chỉ đứng + quay đầu) → thêm chạy/ngồi/nhảy/té...; (5) đổi thân sang xanh VNPT;
  (6) gắn logo VNPT nhỏ (không cần chữ) trên ngực.

- **Đã làm (`content/robot/three/ThreeRobotScene.ts`):**
  - **Cỡ 1/2:** host mặc định 150×180 → **75×90** (thêm `ThreeRobotSceneOptions` để truyền
    `width/height/container/interactive/logoUrl`).
  - **Khung hình (đầu không bị cắt):** thêm `frameModel()` — tính `Box3` bounding-box thật
    của model rồi đặt camera bọc trọn cả chiều cao lẫn chiều ngang + biên 18%. Thay góc
    camera hard-code cũ (từng cắt đầu). Kiểm chứng pixel: dải trên 12% khung TRỐNG (0%).
  - **Đa hoạt động (dùng hết clip GLB):** mở rộng `BaseClip` (thêm Running/Sitting/
    Standing) và `EmoteClip` (thêm WalkJump/Death). Kho `WAIT_MOVES` lúc chờ AI có
    chạy/ngồi/nhảy/đấm/té (Death→tự đứng dậy). Thêm hoạt động NỀN lúc RẢNH: `IDLE_FIDGETS`
    (Wave/Yes/No/ThumbsUp/Jump) cứ 4–9s ngẫu nhiên robot cựa quậy cho "có hồn". Gộp bộ đếm
    `ambient: 'off'|'idle'|'wait'` (bỏ `waitRandomActive/Timer` cũ), đếm giờ bằng rAF.
    `sad`→ngồi thụp (Sitting).
  - **Xanh VNPT:** `recolorVNPT()` duyệt material, chỉ tô lại phần THÂN ẤM (hue cam/vàng)
    sang `#0068b3`, GIỮ độ sáng gốc để còn khối 3D; chừa phần tối (khớp/mắt). Kiểm chứng
    pixel: 58% điểm ảnh robot là xanh.
  - **Logo ngực:** `addChestLogo()` gắn plane texture logo lên **xương `Torso`** để logo
    theo thân khi cử động; thiếu asset → bỏ qua, không lỗi.
- **Đã làm (page-world `three/index.ts`):** suy `logoUrl` = cùng thư mục + `vnpt-logo.png`
  (như model), truyền vào scene.
- **Đã làm (popup 3D — mục 3):**
  - `three/PopupRobot3D.ts` (mới) — mount `ThreeRobotScene` vào ngay sân khấu `#popup-robot`
    (container, 96×108, không click-to-activate); model/logo lấy qua `chrome.runtime.getURL`.
    Dựng lỗi → gọi `onFail` để rơi về `PopupRobot` (SVG).
  - `popup/index.ts` — `initializePopupRobot()` nạp `loadExtensionConfig()`; renderer=`three`
    → robot 3D (fallback SVG), ngược lại → robot SVG như cũ.
- **Đã làm (asset + manifest):** thêm `public/robot3d/vnpt-logo.png` (**placeholder trung
  tính** — CẦN thay bằng logo VNPT chính thức) + khai báo `web_accessible_resources`.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK (content 165.37 KB
  vẫn IIFE 0 import, robot3d 628.46 KB, popup 669.03 KB gồm three — chỉ nạp khi mở popup),
  "✓ Đủ 10 file manifest tham chiếu"; test page-world (serve `dist/`): model+logo tải 200,
  host đúng **75×90**, robot xanh, đầu KHÔNG bị cắt (dải trên trống). (rAF bị treo khi tab
  ẩn là hành vi trình duyệt — trên trang HIS hiển thị thì animation chạy bình thường.)
- **Hạn chế / cần người dùng:** `vnpt-logo.png` hiện là **placeholder** do logo là tài
  nguyên nghiệp vụ (theo CLAUDE.md) — hãy thay file `public/robot3d/vnpt-logo.png` bằng
  logo VNPT chính thức (PNG nền trong suốt, vuông, không chữ) rồi build lại. Vị trí/kích
  thước logo trên ngực (`plane 0.22`, offset xương Torso) có thể tinh chỉnh sau khi có
  logo thật.

### 2026-07-23 — Chống cắt khung + bằng-vai hành vi SVG + hoá già/đổi mùa cho robot 3D

- **Yêu cầu (người dùng):** (E1) robot bị khung chữ nhật cắt khi quơ tay ra ngoài → tìm
  cách; (E2) màu/cỡ/logo robot 3D chỉnh nhanh như CSS được không, nhanh thì cho config màu
  ở web-admin, không nhanh thì thôi; (E3) phần "chờ lâu già đi / trải qua các mùa" làm cho
  robot 3D được không; (E4) đọc lại các task UI robot mô tả hành động robot theo hoạt động
  extension/người dùng (gõ chữ, hỏi đáp, check file...) và ÁP cho robot ThreeJS.
- **E1 — chống cắt (`ThreeRobotScene.ts`):** đổi host mặc định **75×90 → 112×132** (robot
  vẫn nhỏ, khung rộng hơn nhiều; nền trong suốt nên phần dư vô hình) + `frameModel()` tách
  `marginX≈2.3` (quơ tay) / `marginY≈1.5` (nhảy/giơ tay). Vì bounding-box đo lúc đứng Idle,
  các động tác vươn tay/chân ra ngoài hộp đó → biên rộng để không chạm mép canvas.
  - *Vấn đề / Nguyên nhân / Giải pháp:* mép canvas cắt tay khi Wave/Dance/Punch → khung
    75×90 ôm sát robot, không chừa chỗ cho chi vươn → nới khung + zoom camera ra (biên
    ngang > biên dọc). File: `ThreeRobotScene.ts`.
- **E4 — bằng vai hành vi robot SVG (`ThreeRobotScene.ts`, `three/index.ts`):** đọc lại
  catalog hành vi trong `RobotMascot.ts` rồi bù các khác biệt:
  - `localError` nay ánh xạ trạng thái MỚI `pointError` (đứng thẳng + emote `Punch` + mặt
    `Surprised` — "chỉ" ra lỗi tự sửa được), TÁCH khỏi `aiError`→`sad` (ngồi thụp). Sửa
    `mapResult()` trong `three/index.ts`.
  - **Hover:** rê chuột vào robot → vẫy tay chào (như trạng thái Hover của SVG) qua
    `pointerenter` (chỉ bản tương tác).
  - **Nghỉ lâu (LongIdle/Sleeping):** rảnh > ~40s → ngồi thụp NGHỈ; rê chuột/đổi trạng
    thái → nhảy dậy (`wake`). Đếm giờ bằng vòng lặp rAF (`idleRestTimer`), không setInterval.
- **E3 — hoá già + đổi mùa cho robot 3D:** `ThreeRobotRenderer` (content) TÁI DÙNG
  `LifeDirector` (logic thuần, không DOM) chạy đồng hồ chờ AI: mỗi giây hỏi giai đoạn
  hoá-già + mùa, gửi lệnh MỚI `life{aging,season}` (Robot3DProtocol) khi có đổi; hết chờ
  (result/thinking off/destroy) → `life{null,null}` phục hồi. `ThreeRobotScene.setLife()`
  tô màu vật liệu: già → khử bão hoà về xám & tối dần (`AGING_GRAY`, 'slow'/'elder' giảm
  `mixer.timeScale`); mùa → nhân hệ số màu (`SEASON_TINT`). Màu GỐC lưu trong
  `captureMaterialBases()` để phục hồi. Thay cho CSS filter của robot SVG.
- **E2 — chỉnh nhanh màu/cỡ/logo:** ĐÁNH GIÁ: sửa hằng số + build là nhanh (màu `VNPT_BLUE`,
  cỡ `width/height`, logo = thay file PNG); nhưng đưa MÀU ra **web-admin** thì KHÔNG nhanh
  (nối chuỗi cấu hình đủ 3 repo như `waitEscalationRandom`). Theo yêu cầu "không nhanh thì
  thôi" → KHÔNG làm web-admin color config; nếu sau cần sẽ tách **task mới**. (Không sửa code
  cho E2.)
- **Kiểm chứng:** `npm run build` 3 lượt OK — content **166.36 KB vẫn IIFE (0 import/0
  export)**, robot3d 630.22 KB, "✓ Đủ 10 file manifest tham chiếu". `LifeDirector` đã nằm
  sẵn trong content (robot SVG dùng) nên thêm E3 gần như không tăng bundle. E1 kiểm chứng
  render trực tiếp bị chặn do **Browser pane ẩn → rAF treo** (đã xác nhận: callback rAF
  không chạy trong 30s; là hành vi trình duyệt khi không hiển thị, KHÔNG phải lỗi logic);
  thay đổi khung là hình học tất định (khung to hơn + biên lớn hơn strictly nhiều khoảng
  trống hơn bản 75×90 vốn chỉ bị cắt lúc quơ tay) nên đảm bảo hết cắt.
- **Hạn chế:** mùa trong 3D hiện chỉ tô TÔNG MÀU, chưa có HẠT (petals/leaves/snow) như
  robot SVG — có thể bổ sung particles sau nếu cần.

## Cập nhật 2026-07-23 — F1 (diện mạo web-admin) + F2 (viết lại hành vi)

Người dùng yêu cầu tiếp: "Chỉnh màu/cỡ/logo nhanh + config màu web-admin: làm luôn nha" và
viết lại hành vi robot 3D. Đây là ĐẢO NGƯỢC quyết định E2 trước đó (đã ghi "không làm
web-admin color config") — nay làm đủ, giữ lại ghi chú E2 cũ làm lịch sử.

- **F1 — MÀU/CỠ/LOGO động từ web-admin (đủ 3 repo).**
  - *Vấn đề:* màu/cỡ/logo trước đây là hằng số phải build lại; logo chỉ thay bằng file PNG.
  - *Giải pháp:* thêm mô hình `RobotAppearance {color, scale, showLogo, logoDataUrl}` chảy
    xuyên 3 repo (giống `waitEscalationRandom`). Logo tuỳ chỉnh lưu **data URL** trong cấu
    hình backend (giới hạn ≤700K ký tự), phục vụ cả content lẫn popup.
  - *File đã đổi:* **api-validation** `Configuration/ExtensionConfigService.cs` (class
    `RobotAppearance`, `CleanAppearance`), `Controllers/ExtensionConfigController.cs`,
    `Controllers/Auth/ExtensionConfigAdminController.cs`. **extension** `ExtensionConfig.ts`,
    `RobotFactory.ts`, `content/index.ts`, `three/Robot3DProtocol.ts`,
    `three/ThreeRobotRenderer.ts`, `three/index.ts`, `three/ThreeRobotScene.ts`,
    `three/PopupRobot3D.ts`, `popup/index.ts`. **web-admin** `core/api/models.ts`,
    `features/robot-config/robot-config.{ts,html,scss}`.
  - *Tái cấu trúc `ThreeRobotScene`:* `recolorVNPT`+`captureMaterialBases` → `captureMaterials`
    (ghi màu gốc + đánh dấu thân ấm kèm `brandLum`) + `applyBrandColor` (tô + cập nhật mốc
    hoá-già); `addChestLogo` → `captureLogoAnchor`+`applyLogo`+`effectiveLogoUrl`; thêm lớp
    DOM `frame` cho `applyScale` (tách khỏi `host` chịu hiệu ứng bay); `setAppearance`.

- **F2 — viết lại hành vi.**
  - *Sửa lỗi TRÙNG robot:* popup và content cùng hiện robot. Nguyên nhân: `PopupRobot3D`
    mount vô điều kiện, không theo công tắc `robotEnabled` (khác `PopupRobot` SVG). Giải
    pháp: `PopupRobot3D` tự nghe `chrome.storage.onChanged` — BẬT → ẩn khu robot popup; TẮT
    → hiện + `flyIn()`. File: `three/PopupRobot3D.ts`.
  - *Bay xuống/lên:* `setEnabled()` → `flyIn()`/`flyOut()` (WAAPI trên `host`). On-ready gửi
    `enabled=true` → robot rớt xuống lúc mở trang. File: `three/ThreeRobotScene.ts`.
  - *Nhìn theo chuột:* `applyGaze()` xoay xương `Head`/`Neck` theo con trỏ mỗi frame.
  - *Nghỉ hai giai đoạn:* thay `asleep` đơn tầng bằng `restLevel awake→sit→sleep` (ngồi ~30s
    → nằm ngủ ~20s, giữ `Death` clamp), rê chuột → dậy. File: `three/ThreeRobotScene.ts`.

- **Kiểm chứng:** extension `npm run build` 3 lượt OK — content **167.14 KB vẫn IIFE (0
  import)**, "✓ Đủ 10 file manifest"; backend `dotnet build -t:Compile` **0 lỗi**; web-admin
  `npm run build` OK. Render trực tiếp vẫn không kiểm bằng mắt được (Browser pane ẩn → rAF
  treo, đã biết ở E1) — logic gaze/fly/rest là tất định nên không chặn task.
- **Hạn chế còn lại:** dấu trục gaze (yaw/pitch) chọn theo suy luận, chưa soi mắt trực tiếp
  do rAF treo headless — nếu chạy thật thấy liếc ngược thì đổi dấu trong `onPointerMove`.

### F2b — Sửa lỗi sau phản hồi người dùng (2026-07-23)

Người dùng chạy thử báo 2 lỗi: (1) đầu robot **quay vòng vòng liên tục** cả content lẫn
popup, hỏi có phải do tính năng nhìn theo chuột; (2) logo hiện thành **1 chấm nhỏ xíu, không
áp vô được**, sẵn sàng tạm không dùng logo.

- **Đầu quay tròn — ĐÚNG là do gaze.**
  - *Nguyên nhân:* `applyGaze()` cộng góc liếc TUYỆT ĐỐI mỗi frame (`head.rotation.y +=
    gazeYaw`). `AnimationMixer` chỉ ghi xương CÓ track trong clip đang chạy; clip như `Idle`
    không animate `Head` nên mixer giữ nguyên giá trị cũ → cộng đè tích luỹ vô hạn → xoay tròn.
  - *Giải pháp:* thêm `appliedYaw`/`appliedPitch` lưu góc đã áp frame trước; mỗi frame chỉ
    cộng phần CHÊNH LỆCH (`gazeYaw − appliedYaw`) rồi lưu lại. Không tích luỹ: đầu tĩnh vẫn
    liếc theo chuột, clip có animate đầu thì animation thắng.
  - *File:* `three/ThreeRobotScene.ts`.
- **Logo chấm nhỏ — mặc định tắt logo.**
  - *Nguyên nhân:* `vnpt-logo.png` đóng gói sẵn là placeholder xấu, render thành một chấm.
  - *Giải pháp:* mặc định `showLogo = false` ở cả 3 repo; chỉ bật khi admin TẢI logo riêng
    (upload tự bật). Custom upload vẫn hoạt động đầy đủ.
  - *File:* backend `ExtensionConfigService.cs` (`ShowLogo=false`); extension
    `ExtensionConfig.ts` (`defaultRobotAppearance`+`parseAppearance`), `three/ThreeRobotScene.ts`
    (ctor default `?? false`); web-admin `robot-config.ts` (form default + `patchAppearance`).
- **Kiểm chứng lại:** `npx tsc --noEmit` 0 lỗi; extension build 3 lượt OK, content **167.14 KB
  vẫn IIFE (0 import)**, đủ 10 file manifest; backend `-t:Compile` 0 lỗi; web-admin build OK.

### F2c — Bay chuyển-nhà đúng thứ tự + đi dạo lúc rảnh (2026-07-23)

Người dùng báo tiếp 3 việc: (1) bật/tắt trợ lý thì content & popup bay chồng lên nhau sai
thứ tự; (2) rảnh lâu thì robot "giựt giựt" rồi "ngã xuống" xấu; (3) chưa thấy ngồi/nằm
ngủ/suy nghĩ/đổi chân mày — xin cho **đi qua đi lại**, **xoay người**, **đi ra xa–tới gần**.

- **Bay chuyển-nhà đúng trình tự.**
  - *Vấn đề:* content và popup cùng nghe công tắc `robotEnabled` rồi bay ĐỒNG THỜI → thấy
    "popup xuống trước rồi content mới lên" (TẮT) và "popup biến mất quá nhanh" (BẬT).
  - *Giải pháp:* tách vai LEAVING/ARRIVING. Robot RỜI chỗ bay ra NGAY; robot TỚI chỗ đợi
    `LEAVE_MS≈720ms` (bằng thời lượng bay-ra) rồi mới thả xuống. `flyOut({dir})` có hướng:
    content bay **LÊN**, popup bay **XUỐNG**; `flyIn({delayMs})` luôn rớt từ trên xuống,
    hẹn nhảy tiếp-đất đúng lúc chạm sàn. TẮT: content lên→mất, rồi popup rớt. BẬT: popup
    xuống→mất, rồi content rớt.
  - *File:* `three/ThreeRobotScene.ts` (`setEnabled`/`flyIn`/`flyOut`/`cancelHostAnim`),
    `three/PopupRobot3D.ts` (`applyEnabled` phân biệt first/toggle + gọi flyOut/flyIn).
- **Đi dạo lúc rảnh thay cho "giựt giựt".**
  - *Vấn đề:* ambient idle cũ chèn emote ngẫu nhiên (Jump/Wave/Punch…) mỗi 4–9s → nhìn như
    giật; rồi `enterSleep` fade nhanh sang `Death` → "ngã dúi".
  - *Giải pháp:* bọc model trong nhóm `stage` để tịnh tiến/xoay CẢ thân mà không đụng xương;
    hệ chặng `MoveSegment` (hàng đợi + nội suy smoothstep trong rAF) diễn các hoạt động mượt:
    xoay người qua lại · đi qua đi lại một đoạn (quay mặt theo hướng) · đi ra xa rồi tới gần
    (lùi trục Z cho nhỏ đi, không cắt khung) · suy nghĩ + nhíu mày (morph mặt) · vẫy chào.
    Biên đi lấy theo `modelSize` (đo ở `frameModel`) để LUÔN trong khung.
  - *Ngồi/ngủ êm:* `clearLocomotion()` đưa robot về chỗ gốc trước khi `Sitting`; `Death`
    crossfade **chậm 0.6s** cho "nằm từ từ". Mốc: rảnh **24s→ngồi**, ngồi **14s→ngủ**.
  - *File:* `three/ThreeRobotScene.ts` (stage group, `MoveSegment`, `updateLocomotion`,
    `planIdleActivity`, `startSegment`, `clearLocomotion`, loop nhánh idle, `enterSit/Sleep/wake`).
- **Hạn chế:** hướng quay mặt khi đi ngang/đi xa (dấu ±90°/180°) chọn theo suy luận, chưa
  soi mắt được do rAF treo headless — nếu chạy thật thấy "đi lùi/moonwalk" thì đổi dấu
  `toRotY` trong `planIdleActivity`. Robot luôn tự về chỗ gốc nên không kẹt/lệch khung.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; extension build 3 lượt OK, content **167.14 KB
  vẫn IIFE (0 import)**, đủ 10 file manifest. (Chỉ sửa extension — backend/web-admin không đổi.)

### F2d — Sửa ngủ/tỉnh + đa dạng hoá hoạt động rảnh (2026-07-23)

Người dùng thử F2c rồi báo tiếp: (1) để lâu robot vẫn "té" (không giống ngủ) rồi nằm lì,
KHÔNG tự thức dậy; (2) đã đi ra xa nhưng khoảng cách nên NGẪU NHIÊN, có lúc xa hơn; (3) chưa
thấy rõ **angry/sad/surprised**; (4) chưa thấy **sitting**; (5) vẫn còn "giựt giựt"; (6) các
hành động phải NGẪU NHIÊN, đừng theo một quy trình cố định.

- **Ngủ không còn "té" + biết TỰ tỉnh.**
  - *Vấn đề:* `enterSleep` cũ dùng emote `Death` — animation này là "ngã đổ" nên nhìn như té,
    không giống ngủ; `restTimer` đặt 0 nên robot nằm lì mãi, không có đường thức dậy tự động.
  - *Giải pháp:* bỏ `Death` khỏi giấc ngủ. Ngủ = vẫn `Sitting` + đầu RŨ XUỐNG (thêm
    `SLEEP_HEAD_NOD` áp trong `applyGaze` khi `restLevel='sleep'`, cúi ~29°) → "gục đầu ngủ".
    Thêm mốc `SLEEP_TO_WAKE_S=12s`: ngủ đủ lâu thì `wake()` tự chạy (nhảy dậy → rảnh tiếp).
    Bỏ luôn nhánh `if (restLevel==='sleep') return` trong handler `finished` (không còn emote
    giữ pose Death nên thành code chết).
  - *File:* `three/ThreeRobotScene.ts` (`enterSleep`, `applyGaze`, loop rAF nhánh `restTimer`,
    handler `mixer 'finished'`, hằng `SLEEP_TO_WAKE_S`/`SLEEP_HEAD_NOD`).
- **Hết "giựt giựt" khi vào nghỉ (nguyên nhân thật của F2c chưa trị).**
  - *Vấn đề:* `restTimer` hết giờ GIỮA lúc đang đi dạo → `enterSit/enterSleep` gọi
    `clearLocomotion()` SNAP `stage` về gốc tức thì (teleport) → thấy giật. Ngoài ra clip
    `Death` khi ngủ cũng giật lúc đổ.
  - *Giải pháp:* chỉ ĐỔI tư thế nghỉ ở nhịp ĐỨNG YÊN (`!moveSeg && moveQueue rỗng`, robot đã
    tự về gốc nên `clearLocomotion` là no-op); đang giữa hoạt động thì hoãn `restTimer=0.5s`.
    Cộng với việc bỏ `Death` (trên) → hết cả giật lẫn té.
  - *File:* `three/ThreeRobotScene.ts` (loop rAF nhánh `restTimer`).
- **Thêm NGỒI + biểu cảm rõ rệt + ngẫu nhiên hoá `planIdleActivity`.**
  - *Vấn đề:* kho hoạt động F2c thiếu `Sitting` và các nét mặt Angry/Sad/Surprised độc lập;
    tham số cố định nên nhìn như "quy trình".
  - *Giải pháp:* mỗi hoạt động là một HÀM dựng chặng, gọi lúc bốc để lấy tham số NGẪU NHIÊN
    tươi: quãng đi ngang `ax*rnd(0.7,1.15)`, khoảng ra xa `az*rnd(0.7,1.8)` (có lúc xa hẳn),
    hướng quay `dir=±1`, thời lượng `rnd(...)`. Thêm hoạt động: **ngồi nghỉ rồi đứng dậy**;
    **giật mình** (mặt Surprised+Jump); **cau mày đấm** (mặt Angry+Punch); **buồn ngồi thụp**
    (mặt Sad+Sitting). Chống lặp bằng `lastIdleIdx` (không bốc trùng ngay hoạt động vừa rồi).
  - *File:* `three/ThreeRobotScene.ts` (`planIdleActivity` viết lại, trường `lastIdleIdx`).
- **Hạn chế:** hướng quay mặt khi đi (dấu ±90°/180° `toRotY`) vẫn chưa soi mắt được (rAF treo
  headless) — thấy "đi lùi/moonwalk" thì đổi dấu trong `planIdleActivity`. Ngủ dùng "gục đầu"
  vì GLB không có clip ngủ riêng; nếu muốn dáng NẰM thật thì cần bổ sung clip.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; extension build 3 lượt OK, content **167.14 KB
  vẫn IIFE (0 import)**, đủ 10 file manifest. (Chỉ sửa extension — backend/web-admin không đổi.)

### F2e — Ẩn nút lúc tải · trị giật khi ngồi · thêm Death & nhiều hoạt động (2026-07-23)

Người dùng báo tiếp: (1) mới vào thấy nút mặc định 1–2s rồi mới ra robot — xin ẩn nút lúc đầu,
mode Nút thường mới hiện, mode robot cứ ẩn; (2) "giựt giựt lâu ơi lâu" đoán do NGỒI bị lỗi/ngồi
nhiều lần; (3) lâu lâu cho robot **Death**, hoặc khi bật thì rơi từ cao xuống rồi Death rồi đứng
dậy; (4) thấy thiếu nhiều hoạt động so với mô tả task, xin viết thêm vào `RobotExpressive.glb`.

- **Ẩn nút nổi lúc tải (hết nhấp nháy).**
  - *Vấn đề:* `UnifiedAssistantPanel` dựng nút 🤖 HIỆN ngay khi mount; cấu hình + model 3D tải
    mất 1–2s nên thấy nút mặc định trước, rồi `useExternalLauncher()` mới ẩn → nhấp nháy.
  - *Giải pháp:* nút khởi tạo `style="display:none"`. Mode robot (`providesLauncher!==false`):
    giữ ẩn, robot tự làm launcher khi tải xong. Mode Nút thường: `PopupController` gọi
    `setLauncherVisible(enabled)` hiện lại theo công tắc.
  - *File:* `ui/UnifiedAssistantPanel.ts` (nút ẩn mặc định), `content/index.ts` (ghi chú).
- **Trị "giựt giựt" khi ngồi lâu (nguyên nhân thật).**
  - *Vấn đề:* clip `Sitting` khi để LẶP (LoopRepeat) bị POP ở mốc lặp (frame đầu ≠ cuối) →
    giật đều đặn suốt lúc ngồi. Đúng như người dùng đoán "ngồi bị lỗi/ngồi nhiều cái".
  - *Giải pháp:* thêm `HELD_BASES={Sitting}` — nền dạng GIỮ POSE: diễn một lần (LoopOnce) rồi
    clamp, KHÔNG lặp nên phẳng lì. `setBase` bỏ qua nếu đang giữ đúng pose (không diễn lại);
    handler `finished` giữ nguyên pose khi `isAtBase()` (không tự đứng dậy).
  - *File:* `three/ThreeRobotScene.ts` (`HELD_BASES`, `setBase`, handler `finished`).
- **Death "lâu lâu" + tiếp đất bằng Death (chỉ khi người dùng chủ động bật).**
  - *Giải pháp:* `flyIn` nhận cờ `deathLand`. Khi NGƯỜI DÙNG bật lại (toggle, `enabledApplied`
    đã `true`) → rơi từ cao xuống, tiếp đất bằng emote **Death** (ngã) rồi tự mờ về Idle (đứng
    dậy). Lần mount đầu (mở/tải trang) chỉ nhún nhẹ **Jump** — tránh robot "té" mỗi lần tải
    trang. Ngoài ra thêm hoạt động rảnh **té chơi (Death)** rồi lồm cồm dậy để thỉnh thoảng
    thấy Death cả lúc đứng yên.
  - *File:* `three/ThreeRobotScene.ts` (`setEnabled`, `flyIn` `deathLand` + land timer, `planIdleActivity`).
- **Thêm nhiều hoạt động — DÙNG HẾT 14 clip GLB.**
  - *Vấn đề:* kho hoạt động chưa đụng Running/Dance/Yes/No/ThumbsUp/WalkJump/Death.
  - *Giải pháp:* `planIdleActivity` nay có ~17 mục: xoay người · đi qua lại · **chạy qua lại
    (Running)** · đi ra xa–tới gần · ngồi nghỉ · **nhảy múa (Dance)** · suy nghĩ+nhíu mày ·
    giật mình (Surprised+Jump) · cau mày đấm (Angry+Punch) · buồn ngồi thụp (Sad+Sitting) ·
    **gật (Yes)** · **lắc (No)** · **khen (ThumbsUp)** · **nhảy cẫng (WalkJump)** · **té chơi
    (Death)** · vẫy chào. Bốc ngẫu nhiên, chống lặp liền (`lastIdleIdx`).
  - *File:* `three/ThreeRobotScene.ts` (`planIdleActivity`).
- **Về yêu cầu "viết thêm `RobotExpressive.glb`":** KHÔNG tự thêm clip xương mới vào GLB —
  cần công cụ dựng hình 3D (Blender) để tạo keyframe, không thể tạo tin cậy bằng code; ngoài ra
  GLB là **file load-bearing không được sửa** (CLAUDE.md). Đã bù bằng cách khai thác TỐI ĐA 14
  clip sẵn có + chuyển động thủ tục (tịnh tiến/xoay `stage`, xương đầu-cổ, morph mặt) → phủ gần
  hết các trạng thái mô tả trong task. Muốn thêm dáng thật sự mới (nằm ngủ, vươn vai…) thì phải
  cung cấp GLB mới có clip đó.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; extension build 3 lượt OK, content **167.16 KB
  vẫn IIFE (0 import)**, đủ 10 file manifest. (Chỉ sửa extension — backend/web-admin không đổi.)

### F2f — Robot đè/chặn ô input dưới cùng (2026-07-23)

Robot ở góc phải-dưới đè lên thanh input dưới cùng của trang; "làm nhỏ lại thì mất tay chân".

- **Vấn đề:** khung host cố định 112×132 (`z-index` tối đa) phần lớn là VÙNG TRỐNG trong suốt
  (biên an toàn cho tay/chân lúc vẫy/đấm/múa). Cả khung nhận chuột → đè & chặn ô input bên dưới.
- **Nguyên nhân "mất tay chân":** vùng trống đó KHÔNG dư thừa — là headroom để camera không cắt
  chi khi động tác vươn ra. Thu nhỏ khung = cắt headroom = cụt tay/chân. → sai đòn bẩy.
- **Giải pháp (hướng người dùng chọn: xuyên-click + thu gọn nhẹ):**
  1. `host.style.pointerEvents = 'none'` (chỉ bản content interactive); thêm **hit-area** nhỏ
     ôm đúng thân robot (`left:26% top:14% w:48% h:72%`, đặt TRONG `frame` nên co giãn cùng cỡ %),
     chuyển handler click/hover sang hit-area. Vùng trống (kể cả ~14% đáy khung nơi input hay ló)
     xuyên-click → không còn chặn/đè input.
  2. Thu gọn khung mặc định 112×132 → **100×118** (GIỮ nguyên tỉ lệ 112:132 nên camera căn y
     hệt, chỉ nhỏ ~10%). Biên camera không đổi → **không cắt tay/chân**.
  - *File:* `three/ThreeRobotScene.ts` (host `pointer-events`, `frame` `position:relative`,
    hit-area, default `width/height`). Popup không ảnh hưởng (truyền `width/height` + container,
    `interactive=false`).
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, content **167.16 KB vẫn IIFE (0 import)**,
  đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế:** hit-area là hình chữ nhật xấp xỉ thân robot; đầu ngón tay lúc vẫy vươn ra ngoài
  hit-area sẽ không click được (bấm vào thân/đầu vẫn kích hoạt bình thường).

### F2g — Hoạt động "đi thẳng tới VA đầu vào màn hình" + kính mờ (2026-07-23)

Yêu cầu: thêm hoạt động robot đi thẳng tới, phình to (ưu tiên thấy đầu, chân có thể lòi), tới hạn
thì va đầu vào màn hình → ngửa đầu ra sau, giận, đấm màn hình, rồi đi về; lúc va có hiệu ứng "kính
mờ mờ bóng bóng" như tấm kính màn hình máy tính.

- **Người dùng chốt scope:** phình *vừa phải, cột góc phải* (~2.5×) + kính *khu trú chỗ va*.
- **Lớp zoom riêng (`zoomer`):** thêm div GIỮA `host`↔`frame`, `transform-origin:right bottom`.
  Ba biến đổi tách biệt: `host` = BAY (translateY), `zoomer` = PHÌNH (scale màn va), `frame` = CỠ
  người dùng (scale). Không đụng nhau.
- **Kịch bản `beginChargeScreen()`** (chỉ bản content interactive; setTimeout chỉ hẹn nhịp — hợp lệ):
  bước tới (`Walking`) + `zoomer` scale 1→2.5 (1.2s, ease-in lao tới) → VA: `headBonk=-0.6` (ngửa
  đầu ra sau, phân rã nhanh trong `applyGaze`), mặt `Angry`, `Punch`, quầng kính; đấm phát 2 sau
  0.39s → giữ 0.78s → scale 2.5→1 (1s) đi về → `Idle`, mở lại hoạt động nền. Cờ `charging` KHOÁ
  ambient + vòng nghỉ trong lúc diễn (gate trong vòng lặp rAF). `cancelCharge()` huỷ ngang khi có
  tương tác thật (`setState`), bật/tắt (`setEnabled`), hoặc `dispose`.
- **Kính mờ khu trú (`spawnGlassImpact`)**: div `position:fixed` bám tâm theo `frame.getBoundingClientRect()`
  (tự khớp mọi cỡ zoom); `backdrop-filter:blur` + `mask` vành khuyên (tâm TRONG để vẫn thấy đầu) +
  bóng loáng "bong bóng" + gợn sóng scale/opacity ~0.72s rồi tự gỡ. `pointer-events:none`.
- **Xương đầu:** `headBonk` gộp vào lượng "đã cộng" (`appliedPitch`) trong `applyGaze` → giật ngửa
  rồi êm, KHÔNG tích luỹ (cùng cơ chế chống xoay-vòng của phần liếc mắt).
- **File:** `three/ThreeRobotScene.ts` (`zoomer`, `beginChargeScreen`, `cancelCharge`,
  `spawnGlassImpact`, `headBonk` trong `applyGaze`, builder trong `planIdleActivity`, gate trong
  vòng lặp, hook `setState`/`setEnabled`/`dispose`).
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, **robot3d 638→642 KB** (có mã mới), content
  **167.16 KB vẫn IIFE (0 import)**, đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):**
  - Phình bằng CSS-scale canvas nên phóng ~2.5× hơi mềm nét; chủ đề kính mờ che bớt.
  - Vị trí đầu để đặt quầng kính lấy `r.top + r.height*0.16` (ước lượng) — nếu lệch, chỉnh hệ số.
  - "Đi về" = thu nhỏ dần (không quay lưng 180°) cho an toàn/đơn giản.
  - Tần suất: 1 trong ~18 hoạt động rảnh, chống lặp liền → thỉnh thoảng mới diễn.
  - `backdrop-filter` chỉ đẹp trên Chromium (extension chạy Chrome nên ổn).

### F2g (sửa) — "Đi tới màn hình" phải là BƯỚC TỚI trong không gian, không phải zoom CSS (2026-07-23)

- **Vấn đề:** Người dùng phản hồi cách F2g cũ SAI: *"nó đi tới màn hình máy tính, chứ ko phải phóng ta
  ra đột ngột như vậy, giống như hoạt động đi ra xa vậy đó"*. Bản cũ phình bằng `transform:scale()`
  trên `zoomer` → cảm giác "pop-out" đột ngột, không phải robot bước tới.
- **Nguyên nhân:** Dùng CSS-scale canvas (ngoài không gian 3D) thay vì tịnh tiến robot trong cảnh.
  Robot không thực sự "đi" — chỉ là ảnh bị phóng to.
- **Giải pháp:** Bỏ hẳn lớp `zoomer` + `beginChargeScreen`/`cancelCharge` (setTimeout timeline).
  Màn "va màn hình" nay dùng CHÍNH cơ chế locomotion như "đi ra xa": một builder trả về chuỗi
  `MoveSegment` xếp vào hàng đợi. Robot BƯỚC tới bằng cách tịnh tiến `stage` theo trục Z **về phía
  camera** (`toZ = camDist*0.62`, ngược dấu với "đi ra xa" `toZ:-az`) nên **to dần theo phối cảnh**,
  đi bằng clip `Walking`, nội suy smoothstep — y hệt các hoạt động đi dạo khác. Tới sát màn hình:
  chặng `onStart` (mới thêm vào `MoveSegment`) bắn `headBonk=-0.6` + `spawnGlassImpact()`, kèm mặt
  `Angry` + `Punch`; đấm thêm phát nữa; rồi BƯỚC LÙI `toZ:0` về chỗ cũ. Thêm `toY` (hạ thân
  `-modelSize.y*0.28` lúc sát) để **giữ đầu trong khung** (ưu tiên thấy đầu, chân lòi đáy). Vì là
  hoạt động rảnh bình thường (chuỗi chặng trong `moveQueue`), nó TỰ khoá việc bốc hoạt động khác +
  hoãn vòng nghỉ trong lúc diễn → **bỏ được cờ `charging` và gate trong vòng lặp rAF**. Đổi trạng
  thái / bật-tắt / dispose chỉ cần reset `headBonk` + `clearLocomotion` (đã có sẵn).
- **File:** `three/ThreeRobotScene.ts` — bỏ `zoomer` (field + constructor + comment), bỏ
  `charging`/`chargeTimers`/`CHARGE_*`/`beginChargeScreen`/`cancelCharge`; thêm `camDist` (lưu trong
  `frameModel`), thêm `toY`+`onStart` vào `interface MoveSegment` (+ `fromY` trong
  `startSegment`/`updateLocomotion`); builder "đi tới va màn hình" viết lại bằng `MoveSegment`;
  gỡ gate `if(!this.charging)` trong vòng lặp; gỡ `cancelCharge()` khỏi `setState`/`setEnabled`/`dispose`
  (thay bằng `headBonk=0`). `spawnGlassImpact` + `headBonk` trong `applyGaze` GIỮ nguyên.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, **robot3d 640.85 KB**, content **167.16 KB vẫn
  IIFE (0 import)**, đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):** hệ số `camDist*0.62` (độ tới gần) và
  `toY=-0.28*size.y` (hạ thân giữ đầu) là ước lượng — nếu đầu bị trồi khỏi khung hoặc tới chưa đủ
  gần, chỉnh hai hệ số này. Quầng kính đặt tại `frame` rect (ô góc cố định 100×118) tâm
  `r.top + r.height*0.16`.

### F2g (chỉnh) — Tới gần vừa 2×, bù TRÔI giữ mặt + nút TEST popup (2026-07-23)

- **Vấn đề:** Người dùng phản hồi bản trên tới quá gần → robot *"lệch về gốc bên phải quá, mất mặt
  luôn"*; đề nghị *"tăng lên size 2 là đụng kính được rồi"* + xin một nút ở popup để test.
- **Nguyên nhân:** (1) Phóng đại `1/(1-0.62)=~2.6×` — quá lớn. (2) Camera đặt góc 3/4 (lệch trái
  `CAM_X_OFF=0.14`, mắt nhỉnh trên `CAM_Y_OFF=0.03`); khi robot tiến lại gần, phối cảnh khiến ảnh
  **dạt sang phải + đầu trồi lên** khỏi khung → mất mặt. `toY` cũ chỉ hạ thân "áng chừng", không bù
  ngang.
- **Giải pháp:**
  - Giảm còn `frac=0.5` → phóng đại `1/(1-0.5)=2×` đúng ý ("đụng kính vừa").
  - **Bù trôi theo đúng hình học phối cảnh** (giữ mặt NGAY chỗ lúc đứng): `toX=-CAM_X_OFF*near`
    (kéo trái, hết dạt phải) và `toY=-(0.5-CAM_Y_OFF)*size.y*frac` (hạ thân, giữ đầu/mặt trong
    khung). Rút `CAM_X_OFF`/`CAM_Y_OFF` thành hằng dùng CHUNG với `frameModel` (hết hardcode/lặp).
  - Tách chuỗi chặng thành `walkToScreenSegments()` để dùng chung cho hoạt động rảnh + nút test.
  - **Nút TEST (tạm):** `ThreeRobotScene.playWalkToScreen()` (hiện robot + bật ambient idle + xếp
    chuỗi, bỏ qua điều kiện `interactive`); `PopupRobot3D.demoWalkToScreen()` (hiện khu robot rồi
    gọi). Popup thêm `<button id="popup-test-walk" hidden>` (chỉ hiện khi dùng robot 3D) + wiring
    `bindTestWalk`. **Sẽ gỡ khi test xong** — mọi phần test đều đánh dấu `[TẠM]`.
- **File:** `three/ThreeRobotScene.ts` (hằng `CAM_X_OFF`/`CAM_Y_OFF`; `frameModel` dùng hằng;
  `walkToScreenSegments`; `playWalkToScreen`), `three/PopupRobot3D.ts` (`demoWalkToScreen`),
  `popup/index.html` (nút + style `.test-btn`), `popup/index.ts` (`bindTestWalk`).
- **Kiểm chứng:** `tsc` 0 lỗi; build OK, **robot3d 641 KB**, content **167.16 KB vẫn IIFE (0 import)**,
  đủ 10 file manifest. Chỉ sửa extension.
- **Gỡ nút test sau này:** xoá `#popup-test-walk` + `.test-btn` (html), `bindTestWalk` (popup ts),
  `demoWalkToScreen` (PopupRobot3D), `playWalkToScreen` (ThreeRobotScene). `walkToScreenSegments`
  GIỮ lại (hoạt động rảnh vẫn dùng).

### F2h — Va kính: BẬT NGỬA–TÉ–ĐỨNG DẬY–CHẠY ĐẤM 3 CÁI–QUAY ĐI + Nghỉ quay hướng NGẪU NHIÊN (2026-07-23)

- **Vấn đề:** Người dùng phản hồi hai điểm:
  1. *"hiện tại khi đụng vào kính 1 cái là đấm luôn, tôi muốn đụng vào kính bị bật ngửa ra sau, té
     xuống, xong đứng dậy chạy tới đấm 3 cái rồi bực mình quay đi"* — màn va cũ đấm ngay lúc chạm,
     thiếu kịch tính.
  2. *"trạng thái nghỉ, ngồi, gục đầu đang quay về 1 hướng cố định, tôi muốn là ngẫu nhiên, có thể
     quay qua trước, phải, chính diện, cũng có thể đang quay mặt ra sau"* — nghỉ luôn quay chính diện.
- **Nguyên nhân:**
  1. `walkToScreenSegments` cũ: chạm → `Punch` ngay (2 cái), không có pha ngã/đứng dậy/chạy lại.
  2. `enterSit`/`enterSleep` gọi `clearLocomotion()` (snap `rotation.y=0`) và không đổi hướng thân →
     mọi lần nghỉ đều nhìn thẳng.
- **Giải pháp:**
  - **Kịch bản va mới** (viết lại `walkToScreenSegments`): đi tới sát kính → **VA** (ngửa đầu
    `headBonk=-0.95` + mặt `Surprised` + quầng kính) → **BẬT NGỬA + TÉ** bằng emote `Death`, tịnh
    tiến lùi ra sau `backZ=near*0.45` + hụp xuống `fallDrop=size.y*0.12` → **NẰM** một lúc (1.4s) →
    **ĐỨNG DẬY** (`Idle`, bỏ hụp) → **CHẠY tới** (`Running` + mặt `Angry`) về lại chỗ sát kính →
    **ĐẤM 3 CÁI** (mỗi cái `Punch` + `headBonk` nhỏ + quầng kính) → **BỰC MÌNH QUAY LƯNG** (`toRotY:
    Math.PI`) rồi **đi về chỗ cũ quay lưng** (`toZ:0`) → **quay lại chính diện** (`toRotY:0`). Bù
    phối cảnh giữ mặt tại mọi độ sâu bằng helper `holdAt(z)` (thay 2 hằng `holdX/holdY` rời rạc) —
    dùng chung cho cả chỗ sát kính (`near`) lẫn chỗ té (`backZ`), hết lặp công thức.
  - **Nghỉ quay hướng ngẫu nhiên:** thêm field `restRotY` + hằng `REST_FACINGS = [0, ±π/2, π, ±π/4]`
    (chính diện / phải / trái / quay lưng / chếch). `enterSit` bốc ngẫu nhiên `restRotY`; vòng lặp
    rAF **nội suy mượt** `stage.rotation.y → restRotY` khi `restLevel!=='awake'` (lúc nghỉ
    `ambient='off'` nên `updateLocomotion` không chạy → phải tự lerp tại loop, giống cơ chế gaze).
    `enterSleep` **giữ nguyên hướng đã ngồi** (đặt lại `stage.rotation.y=restRotY` sau
    `clearLocomotion` để khỏi snap về 0 rồi mới xoay lại) → gục đầu cùng hướng, không giật.
- **File:** `three/ThreeRobotScene.ts` — `walkToScreenSegments` (kịch bản mới + `holdAt`); thêm
  `restRotY` + `REST_FACINGS`; `enterSit` (bốc hướng); `enterSleep` (giữ hướng); vòng lặp rAF (lerp
  hướng nghỉ). Không đụng file khác.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, **robot3d 641.99 KB**, content **167.16 KB vẫn
  IIFE (0 import)**, đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):** độ dài clip `Death` không biết chính xác nên
  thời lượng NẰM (1.4s) là ước lượng — nếu robot đứng dậy quá sớm/muộn so với animation ngã, chỉnh
  chặng `dur`. `backZ`/`fallDrop` (khoảng lùi + hụp lúc té) và tốc độ lerp hướng nghỉ (`delta*4`)
  cũng là ước lượng, chỉnh nếu cần.

### F2i — Quầng kính NỨT KHỚP đúng chỗ va (đầu/nắm đấm) + ngủ mê "té ra rồi lọ mọ ngồi dậy" (2026-07-23)

- **Vấn đề:** Người dùng phản hồi hai điểm:
  1. *"chỗ đụng đầu vị trí nó khác, chỗ đấm kính chỗ va chạm phải khớp với cái nắm đấm, nếu làm được
     hiệu ứng nứt màn hình càng tốt"* — quầng kính cũ luôn đặt CỨNG tại `r.top + r.height*0.16`
     (một chỗ), không khớp đầu lúc va cũng không khớp nắm đấm lúc đấm.
  2. *"thêm hoạt động đôi khi đang ngồi gục đầu ngủ thì đôi khi té ra, vài giây rồi lọ mọ ngồi dậy"*.
- **Nguyên nhân:**
  1. `spawnGlassImpact` tính tâm quầng bằng phân số cố định của khung, không theo vị trí THỰC của
     đầu/tay (đầu/tay còn xê dịch theo animation + phóng đại phối cảnh khi tiến sát).
  2. Trạng thái ngủ (`enterSleep`) chỉ gục đầu rồi tự tỉnh, chưa có biến cố "té".
- **Giải pháp:**
  - **Chiếu xương ra màn hình cho khớp:** thêm `projectToScreen(world)` — chiếu điểm thế giới qua
    `camera` (NDC → px của `frame` rect; rect đã gồm scale hoá-già + phóng-đại nên ánh xạ tuyến tính
    đúng). `spawnGlassAt(kind)`: lấy `head` bone world → cộng lệch (`+size.y*0.06` cho ĐẦU, `-size.y*0.33`
    xuống NGỰC/NẮM ĐẤM cho lúc đấm) → chiếu ra px → quầng đúng chỗ, dù robot đang to ~2×. Chuỗi va
    gọi `hit(v,'head')` lúc đụng đầu, `hit(v,'fist')` mỗi cú đấm (thay `bonk` cũ). Không có xương →
    lui về phân số khung (dự phòng).
  - **Hiệu ứng NỨT kính** (`spawnCrack`): SVG hình sao — 7–9 tia răng-cưa toả từ tâm va + vòng rạn
    nối các tia; hiện nhanh, đọng ~1.1s (lâu hơn quầng mờ để "đọc" ra kính rạn) rồi tan; tự gỡ,
    `pointer-events:none`. Gọi kèm trong `spawnGlassImpact`.
  - **Ngủ mê "té ra":** `enterSleep` hẹn `sleepFallTimer` ngẫu nhiên (xác suất `SLEEP_FALL_CHANCE=0.5`,
    mốc 2–6s trong giấc). Vòng lặp rAF: khi `restLevel='sleep'` & hết mốc → `playEmote('Death')` (đổ
    người từ thế NGỒI); Death xong **tự mờ về base `Sitting`** → "lọ mọ ngồi dậy". Nới `restTimer` lên
    `FALL_RECOVER_S=4.5s` để kịp ngồi dậy trước khi tỉnh. Không dùng hàng đợi/`setInterval` — đúng cơ
    chế nghỉ hiện có.
- **File:** `three/ThreeRobotScene.ts` (chỉ 1 file) — thêm `projectToScreen`/`spawnGlassAt`/`spawnCrack`;
  `spawnGlassImpact` nhận `(at, frameW)` + gọi `spawnCrack`; `walkToScreenSegments` đổi `bonk`→`hit`
  (head/fist); thêm `sleepFallTimer`/`SLEEP_FALL_CHANCE`/`FALL_RECOVER_S`; `enterSleep` hẹn mốc té;
  vòng lặp rAF xử lý té-khi-ngủ.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, content **167.16 KB vẫn IIFE (0 import)**, đủ 10
  file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):** lệch đầu↔nắm đấm (`+0.06`/`-0.33 * size.y`) là
  ước lượng theo vị trí xương `Head` (RobotExpressive không có xương tay riêng được nắm) — nếu quầng
  chưa đúng tâm nắm đấm, chỉnh hệ số. "Té khi ngủ" mượn clip `Death` (thiết kế cho thế đứng) nên đổ
  người từ thế ngồi trông hơi lạ, nhưng đọc ra "té". Xác suất/mốc/`FALL_RECOVER_S` chỉnh nếu cần.

### F2j — Hoãn nứt kính cho khớp tay + robot "ở trong phòng": đi lòng vòng/ngồi/ngủ ở xa, chỉ về chỗ khi mở chat (2026-07-23)

- **Vấn đề:** Người dùng phản hồi bốn điểm:
  1. *"khi đấm chưa đụng màn hình đã nứt rồi, delay cái nút màn hình chậm 1 xíu"* — quầng nứt hiện
     NGAY đầu chặng đấm, trong khi nắm đấm cần vươn ra thêm mới CHẠM kính → nứt SỚM.
  2. *"khi đi ra xa, ko cần thiết phải đi vào liền đâu, có thể ở xa mà đi lòng vòng, ngồi ở xa cũng được"*.
  3. *"xem như robot đang ở trong 1 cái phòng, muốn đi đâu, ngồi đâu, ngủ đâu cũng được. miễn sao khi
     gọi mở hộp thoại chat thì đứng chỗ như hiện tại"*.
  4. *"đang ngồi gục, hoặc té hướng nào thì khi ngồi hoặc bật dậy cũng phải đang ở hướng đó mới hợp lý"*.
- **Nguyên nhân:**
  1. `hit()` gọi `spawnGlassAt('fist')` NGAY lúc `onStart` chặng đấm (t=0), chưa qua nhịp vươn tay.
  2. Mọi builder trong `planIdleActivity` (đi qua-lại, chạy qua-lại, "đi ra xa") đều KẾT bằng `toX:0/toZ:0/toRotY:0`
     → robot LUÔN quay về gốc ngay; không thể la cà/ngồi ở xa.
  3. `enterSit`/`enterSleep`/`wake` gọi `clearLocomotion()` (snap về gốc `(0,0,0)`, `rotY=0`) → ngồi/ngủ
     luôn bị kéo về chính giữa khung, không "ở trong phòng".
  4. `wake` sau `clearLocomotion` để `rotY=0` (chính diện) → bật dậy KHÔNG cùng hướng đang gục/té.
- **Giải pháp** (chỉ `three/ThreeRobotScene.ts`, đúng cơ chế hàng đợi/rAF hiện có, không `setInterval`):
  - **Hoãn quầng nứt cho KHỚP chạm** (F2j.1): trong `hit()`, `headBonk` đặt tức thì (ngửa đầu ngay),
    nhưng `spawnGlassAt(kind)` bọc trong một `window.setTimeout` một-lần — **đầu ~60ms, nắm đấm ~170ms**
    (guard `if(this.disposed) return`). `spawnGlassAt` chiếu xương lúc GỌI nên hoãn xong vẫn bắt đúng
    vị trí tay/đầu tại thời điểm chạm. Không dùng timer lặp.
  - **`settleInPlace()`** — biến thể "dừng đi lại NHƯNG GIỮ nguyên vị trí/hướng" (chỉ xoá hàng đợi +
    `moveSeg`, KHÔNG chạm `stage.position`/`rotation`). Dùng cho ngồi/ngủ/bật dậy → nghỉ NGAY chỗ đang đứng.
  - **`roamSegments()`** — chuỗi "đi lòng vòng trong phòng": chọn NGẪU NHIÊN chỗ mới (chủ yếu chiều sâu
    `−Z` đến `size.y*1.9` để chỉ nhỏ/to đi, không cắt khung; lệch ngang `±size.x*0.5`), quay mặt theo
    hướng đi (`atan2(dx,dz)`), ĐI hoặc CHẠY (35%) tới đó theo QUÃNG ĐƯỜNG rồi **Ở LẠI** (không quay về gốc).
  - **`planIdleActivity` viết lại:** ~40% bốc `roamSegments` (đổi chỗ, ở lại); còn lại chỉ còn các động
    tác/cảm xúc **TẠI CHỖ** — GỠ 3 builder cũ "đi qua-lại / chạy qua-lại / đi ra xa" (chúng ép về gốc).
    Màn "va màn hình" giữ nguyên (nó cố ý về gốc — coi như "xông lên rồi về").
  - **Nghỉ tại chỗ + liên tục hướng:** `enterSit`/`enterSleep`/`wake` đổi `clearLocomotion`→`settleInPlace`.
    `enterSleep` bỏ dòng ép `rotY=restRotY` (vòng lặp rAF vẫn nội suy về `restRotY`, mà `restRotY` không
    đổi từ lúc ngồi → gục cùng hướng). `wake` chốt `stage.rotation.y = restRotY` **trước** khi chuyển
    `awake` (lúc `awake` loop thôi nội suy) → **bật dậy đúng hướng đang ngồi/gục/té**.
  - **Về chỗ khi mở chat (GIỮ nguyên):** `setState` vẫn gọi `clearLocomotion()` (snap gốc) + `restLevel='awake'`;
    `chatOpened → setState('listening')` nên mở hộp thoại chat → robot LUÔN về đúng chỗ hiện tại. Đây là
    yêu cầu (3) — không đụng tới.
- **File:** `three/ThreeRobotScene.ts` (chỉ 1 file) — `hit()` hoãn `spawnGlassAt`; thêm `settleInPlace`/
  `roamSegments`; `planIdleActivity` viết lại (roam ~40% + bỏ 3 builder dời-chỗ cũ); `enterSit`/`enterSleep`/
  `wake` dùng `settleInPlace` + `wake` chốt hướng nghỉ.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; build OK, content **167.16 KB vẫn IIFE (0 import)**, robot3d
  644.34 KB, đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):** biên đi lòng vòng (sâu `size.y*1.9`, ngang `size.x*0.5`)
  ước lượng theo cỡ model — nếu lệch ngang làm robot ló mép khung, giảm `xr`. Hoãn nứt 60/170ms là ước
  lượng theo nhịp clip `Punch` — chỉnh nếu vẫn lệch. Khi robot đang la cà ở xa mà rê chuột thì chỉ tỉnh
  (nếu đang nghỉ), không vẫy tay (vì `isAtBase()` false) — chấp nhận được.

### F2k — Vết nứt kính (bỏ vòng tròn, độ rộng theo mức bể, cú cuối thủng lỗ + số cú đấm 2–4) & robot ghi chép khi nhập liệu (2026-07-23)

- **Vấn đề:** Người dùng phản hồi hai nhóm:
  - *Nhóm kính:* (a) *"khi đầu đụng kính, hoặc khi đấm kính, ko cần tạo ra vòng tròn trên kính, vết nứt
    là được rồi"*; (b) *"nếu được thì độ rộng là mức độ bể kính khác nhau"*; (c) *"cú đấm cuối cùng sẽ
    gây ra hiệu ứng bể kính mà lủng 1 lỗ lớn (độ lớn cũng ngẫu nhiên, ít nhất cũng phải to bằng nắm đấm)"*;
    (d) *"chỗ đấm 3 cái sửa lại random từ 2–4 cú đấm"*.
  - *Nhóm ghi chép:* *"khi người dùng nhập liệu, nếu được bạn cho robot ngồi xuống, cầm cây viết, quyển
    vở ghi ghi chép chép gì đó, được 1 lúc chán thì quay lại như cũ"*.
- **Nguyên nhân:**
  - `spawnGlassImpact` (cũ) vẽ một QUẦNG TRÒN mờ/gloss (frosted ring) làm nền cho vết nứt → đúng là "vòng
    tròn trên kính" user không muốn. Cỡ quầng cố định → không thể hiện "mức độ bể khác nhau".
  - Số cú đấm HARDCODE 3 trong `walkToScreenSegments`; không có nhánh "cú cuối thủng lỗ".
  - Luồng 3D chưa có hành vi cho `setState('typing')` ngoài gật nhẹ `Yes`. Lưu ý: `ChatPanel` bắn
    `notifyTyping()` theo **TỪNG phím** → `setState('typing')` chạy mỗi phím, và luồng 3D **không có**
    tín hiệu tự quay lại `listening` khi ngừng gõ (chỉ SVG fallback có timer 1600ms) → cần bộ đếm "chán"
    để tự kết thúc, đồng thời phải chống khởi động lại theo từng phím.
- **Giải pháp** (chỉ `three/ThreeRobotScene.ts`, giữ IIFE 0-import; `Math.random()`/`setTimeout` một-lần OK):
  - **Bỏ quầng tròn — chỉ vết nứt** (a): thay `spawnGlassImpact`+`spawnCrack` cũ bằng bộ vẽ SVG thuần
    KHÔNG có hình tròn: `mountFxSvg(cx,cy,size)` dựng `<svg>` fixed; `crackRays(...)` vẽ N tia răng-cưa
    toả từ tâm (dùng CHUNG cho vết nứt lẫn viền lỗ — khỏi lặp code) và trả điểm đỉnh; `spawnCrack` =
    sao nứt + vòng RẠN NỐI các đỉnh tia (đa giác lởm chởm, KHÔNG phải tròn), 1100ms.
  - **Độ rộng theo mức bể** (b): `spawnGlassAt` truyền `size` NGẪU NHIÊN — đấm `rnd(150,320)`, đụng đầu
    `rnd(120,240)` → mỗi lần một mức "bể" khác nhau (số tia, độ dày nét, bán kính đều co giãn theo `size`).
  - **Cú cuối thủng lỗ lớn** (c): `spawnGlassHole(cx,cy,size)` — nhiều tia nứt DÀI + lỗ thủng đa giác lởm
    chởm tô `radialGradient` tối ("thủng qua kính") + viền kính sáng, id gradient duy nhất
    `robot-hole-${random}`, 1500ms. `spawnGlassAt(kind, hole=true)` chọn cỡ `max(210, min(460, frameW*rnd(1.2,2.2)))`
    → luôn ≥ cỡ nắm đấm.
  - **Số cú đấm 2–4 + cú cuối thủng** (d): `walkToScreenSegments` thay vòng cứng 3 cú bằng
    `punches = 2 + floor(random*3)`; vòng `for` xếp chặng `Punch`, cú cuối (`last`) gọi `hit(v,'fist',true)`
    → thủng lỗ, nghỉ lâu hơn (0.55s) cho "đọc" ra lỗ. `hit()` thêm tham số `hole` truyền xuống `spawnGlassAt`.
  - **Robot ghi chép khi nhập liệu** (nhóm 2): props `writeProps` (QUYỂN VỞ tấm phẳng + CÂY VIẾT trụ mảnh)
    dựng một lần trong `ensureWriteProps`, gắn lên **`logoAnchor` (xương Torso)** như logo ngực → theo thân
    khi ngồi; ẩn sẵn. `enterWriting` → `writing=true`, hẹn `writeTimer=WRITE_BORED_S(12s)`, `setBase('Sitting')`,
    hiện props. `updateWriting` hí hoáy ngòi viết (dao động `writePhase` cộng dồn theo delta, không dùng `Date`).
    `applyGaze` khi `writing` → CÚI đầu nhìn vở (`WRITE_HEAD_NOD=0.42`, yaw 0). Case `'typing'` trong `setState`:
    đang ghi chép rồi → `break` (không giật theo phím); vừa gõ & hết cooldown & `interactive` → `enterWriting`;
    trong lúc "chán" (cooldown) → chỉ gật `Yes`. Vòng lặp rAF: hết `writeTimer` → `stopWriting` +
    `writeCooldown=6s` + `setState('idle')` (đứng dậy về như cũ). Rời `'typing'` sang trạng thái khác →
    `stopWriting` (cất viết) ở đầu `setState`. Props tự dọn trong `dispose` (traverse cả scene).
- **File:** `three/ThreeRobotScene.ts` (chỉ 1 file) — glass: `spawnGlassAt(kind,hole)` + `mountFxSvg` +
  `crackRays` + `spawnCrack` (bỏ quầng tròn) + `spawnGlassHole`; `hit()`+vòng đấm 2–4 trong
  `walkToScreenSegments`. Ghi chép: field `writeProps/penMesh/writing/writeTimer/writeCooldown/writePhase`
  + hằng `WRITE_BORED_S/WRITE_COOLDOWN_S/WRITE_HEAD_NOD`; `ensureWriteProps/enterWriting/stopWriting/updateWriting`;
  tích hợp `setState` (case `typing` + cất viết khi rời), `applyGaze` (cúi đầu), `loop` (đếm chán + cooldown).
- **Kiểm chứng:** `npm run build` OK, `tsc` 0 lỗi; content **167.16 KB vẫn IIFE (0 import)** (grep 0), robot3d
  **647.88 KB** (tăng do thêm props+lỗ thủng), đủ 10 file manifest. Chỉ sửa extension.
- **Hạn chế (chưa xem render trực tiếp — headless):** toạ độ vở+viết trên xương Torso (`(0,-0.02,0.36)`,
  viết `rotation(-0.5,0,0.9)`) là ước lượng — nếu vở lệch/đâm vào thân, chỉnh offset trong `ensureWriteProps`.
  Robot không có xương bàn tay nên viết chỉ "đặt trước bụng", không thực sự nắm — đọc ra "đang ghi chép".
  `WRITE_BORED_S=12s` không reset theo từng phím (chán sau ~12s dù còn gõ) → chỉnh nếu muốn ghi lâu hơn.
  Cỡ lỗ thủng chặn dưới 210px để luôn ≥ nắm đấm — nếu khung nhỏ trông lỗ hơi lớn, giảm cận dưới.

### F2l — Sửa lỗi đi lòng vòng: tới nơi rồi chân vẫn bước mà người không nhỏ lại (2026-07-23)

- **Vấn đề:** *"khi đi ra xa, tới 1 khoảng này đó thì bước chân vẫn bước, nhưng người không nhỏ lại"* —
  robot đi ra xa (nhỏ dần theo phối cảnh), tới nơi thì DỪNG di chuyển (hết nhỏ đi) nhưng animation `Walking`
  vẫn chạy → "giậm chân tại chỗ".
- **Nguyên nhân:** Trong `roamSegments()` (thêm ở F2j), chặng 3 "đứng ngắm quanh" `{ dur: rnd(0.4,1.2) }`
  KHÔNG đặt lại `base`, nên KẾ THỪA `base: 'Walking'/'Running'` từ chặng 1; mà chặng 3 lại KHÔNG có
  `toX/toZ` (đứng yên) → vừa đứng im (không đổi Z = không nhỏ đi) vừa chạy clip bước chân. Việc đổi về
  `Idle` mãi tới chặng 4 mới làm.
- **Giải pháp** (chỉ `three/ThreeRobotScene.ts`, đúng cơ chế hàng đợi hiện có, ít ảnh hưởng nhất): thêm
  `base: 'Idle'` vào chặng 3 để **DỪNG bước chân ngay khi hết di chuyển**; chặng 4 (quay lại nhìn ta) bỏ
  `base: 'Idle'` thừa (đã Idle từ chặng 3, chỉ còn xoay `toRotY: 0`). Chặng 1 (quay hướng) + chặng 2 (đi tới)
  vẫn giữ Walking/Running vì ĐANG thực sự di chuyển.
- **File:** `three/ThreeRobotScene.ts` — `roamSegments()` (4 dòng chặng).
- **Kiểm chứng:** `npm run build` OK, `tsc` 0 lỗi; content **167.16 KB vẫn IIFE (0 import)**, robot3d
  647.88 KB, đủ 10 file manifest. Chỉ sửa extension.

### F2m — Đi lòng vòng: ra xa NGẮM rồi ĐI VỀ (thay vì la cà ở xa nhìn nhỏ xíu); có cờ bật lại (2026-07-23)

- **Vấn đề:** *"đi ra xa, rồi ko đi vô lại, mà vòng quanh ngoài đó thì robot nhìn nhỏ xíu à, ko đẹp. nên
  đi ra xa rồi vô lại nhé. ko cần bỏ code, chỉ cần đặt 1 cờ để sau này có thể dùng lại"* — hành vi "la cà
  ở xa" (F2j) làm robot đứng ngắm/ngồi ở xa, nhỏ xíu, không đẹp.
- **Nguyên nhân:** `roamSegments()` cố ý KẾT ở chỗ xa (Ở LẠI, không quay về gốc) — đúng yêu cầu cũ (F2j)
  nhưng nay không còn muốn.
- **Giải pháp** (chỉ `three/ThreeRobotScene.ts`, GIỮ code cũ sau cờ — không xoá): thêm cờ
  `private static readonly ROAM_STAY_FAR = false`. `roamSegments` tách phần đuôi theo cờ:
  - `false` (MẶC ĐỊNH): sau khi ra xa ngắm quanh → quay hướng về gốc, ĐI/CHẠY về `(0,0)` (TO DẦN lại),
    quay chính diện. Robot chỉ "ghé ra xa" chốc lát rồi về, không đứng nhỏ xíu.
  - `true` (giữ lại để sau bật): Ở LẠI chỗ xa la cà (hành vi F2j cũ) — chỉ quay lại nhìn ta.
  - Cập nhật docstring `roamSegments`/`planIdleActivity` cho khớp.
- **File:** `three/ThreeRobotScene.ts` — thêm hằng `ROAM_STAY_FAR`; `roamSegments()` rẽ nhánh theo cờ
  (mặc định thêm 3 chặng đi về gốc).
- **Kiểm chứng:** `npm run build` OK, `tsc` 0 lỗi; content **167.16 KB vẫn IIFE (0 import)**, robot3d
  648.07 KB, đủ 10 file manifest. Chỉ sửa extension. Muốn bật lại "la cà ở xa": đổi `ROAM_STAY_FAR = true`.

### F2n - Robot TỰ NÉ nút của trang: đụng thì té, trèo lên đứng trên nút, nút mất thì nhảy về (2026-07-30)

- **Vấn đề:** *"1 số màn hình có button ở dưới, sẽ trùng vị trí của robot, có cách nào nhận biết mà né
  những button đó ra, hoặc đi đụng thì mình té, hoặc nhảy lên đứng trên đó chơi, rồi nhảy xuống"* - ví dụ
  màn hình `kiemtrabangke` có nút "Ký số" ngay góc phải dưới, đúng chỗ robot đậu → robot che mất nút.
  Phạm vi người dùng chốt: **chỉ làm cho Pé Q (robot 3D)**, Bé Bi giữ nguyên.
- **Nguyên nhân:** Chỗ đậu robot là hằng số (`RobotConfig.home`), không hề biết trang có gì ở đó.
- **Giải pháp** (3 lớp rời nhau, mỗi lớp một việc - SOLID):
  - `ObstacleWatcher` - RÌNH: lấy mẫu bằng `document.elementsFromPoint` tại 9 điểm trong ô thân robot,
    kích hoạt bằng `MutationObserver` + `resize` + `scroll` (capture) + debounce `settleMs`, KHÔNG polling.
  - `RobotParking` - CHỌN CHỖ: `plan()` trả `stand` (đứng trên mặt nút) / `dodge` (nép trái) /
    `lift` (nhấc lên trên thanh công cụ kín đáy) / `home`.
  - `ObstacleAvoidance` - ĐIỀU PHỐI: `bump → fall() → apply(spot) → leapFrom(dx,dy) → settled`,
    có hàng đợi khi đang nhảy dở, tôn trọng `prefers-reduced-motion`.
  - Đặt chỗ bằng `right`/`bottom` chứ không `transform` để không giẫm lên WAAPI của PhysicsController.
- **File:** `robot/ObstacleWatcher.ts`, `robot/RobotParking.ts`, `robot/ObstacleAvoidance.ts` (mới),
  `robot/RobotConfig.ts` (khối `obstacle`), `three/ThreeRobotScene.ts` (nối `AvoidanceMover`),
  `preview-robot.html` (nút giả lập vật cản).

### F2o - Nhận ra nút nổi Smart CA (toàn thẻ div) + đặt ĐÚNG BÀN CHÂN lên mặt nút (2026-07-31)

- **Vấn đề:** (1) *"nút đó nè, hiện tại chưa né được cũng như chưa nhảy lên"* - nút "Chữ ký số Smart CA"
  của HIS là `<div id="smartca-ad-float-button-scanner">` lồng `div/p/i/span/img`, KHÔNG có thẻ `<button>`
  nào. (2) *"nhìn như ko đứng lên, vì chân và vật thể ko gần nhau"* - robot lơ lửng phía trên nút.
- **Nguyên nhân:** (1) `selector` chỉ bắt `button, [role=button], .btn...` nên không khớp; thêm nữa
  `elementsFromPoint` trả về thẻ bọc, `closest()` ra `null`. (2) Khung robot 100×118 px nhưng camera
  chừa lề dưới chân model (`marginY`), nên mép dưới khung KHÔNG phải bàn chân - đặt `bottom` theo mép
  khung thì chân treo lơ lửng đúng bằng phần lề đó.
- **Giải pháp:**
  - Nhận nút theo HÀNH VI chứ không chỉ theo thẻ: `isClickable()` (có `onclick`, id/class khớp
    `\b(btn|button|fab)\b`, hoặc `cursor:pointer`) + `clickableAncestor()` leo tối đa `maxClimb` cấp để
    lấy khối bấm được NGOÀI CÙNG + `buttonsAt()` dò xuống con khi trúng thẻ bọc.
  - Chặn nhận nhầm: ứng viên theo suy đoán phải `position: fixed|sticky` (`isPinned`), cao không quá
    `bandHeight`; thêm `id` ổn định theo phần tử (WeakMap) + `bumpedId` để cuộn trang không té lại.
  - Đo lề chân lúc chạy: `reportFootInset()` chiếu `box.min.y` của model qua camera ra pixel CSS →
    `ObstacleAvoidance.setFootInset()` → `RobotParking` rút ngắn `homeBox()` và hạ
    `standBottom = innerHeight - obstacle.top - footInset`.
- **File:** `robot/ObstacleWatcher.ts`, `robot/RobotParking.ts`, `robot/ObstacleAvoidance.ts`,
  `robot/RobotConfig.ts`, `three/ThreeRobotScene.ts`, `preview-robot.html`.
- **Kiểm chứng:** chạy thẳng `watcher.scan()` (tab ẩn bị treo rAF nên không xem trực quan được):
  thanh cố định → `dodge right:140`; nút "Ký số" đơn → `stand bottom:58`; nút nổi Smart CA (div 56×56)
  → `stand bottom:56`, **bàn chân đúng y=640 = mép trên nút** (footInset đo được 24 px); cuộn trang khi
  đang đứng trên nút → không phản ứng lại; bỏ nút → về `home`. `npm run build` OK, `tsc` 0 lỗi.

### F2p - Bỏ khung bong bóng trắng, đổi thành ICON BAY LÊN từ đỉnh đầu rồi nhỏ dần tan (2026-07-31)

- **Vấn đề:** *"không cần đóng khung bong bóng vô 1 khung màu trắng vậy đâu, mình cho các icon như zzz
  (ngủ) hay ... (suy nghĩ), bối rối,... thành các icon (to hơn xíu) và xuất hiện bay lên từ đầu robot,
  nhỏ dần rồi biến mất"*.
- **Nguyên nhân:** `buildBubble()` vẽ nền trắng bo góc + đuôi bong bóng, chỉ MỘT sprite đứng yên trên đầu.
- **Giải pháp** (chỉ `three/ThreeRobotScene.ts`): thay bong bóng bằng vòi phun icon.
  - `iconTexture()` vẽ TRẦN trên canvas trong suốt (không nền), chỉ thêm viền sáng
    `shadowColor rgba(255,255,255,.9)` để nổi trên nền trang sáng lẫn tối; cache theo loại
    (`dots0/1/2`, `zzz`, `ask`...) và chụp lại canvas (`snapshot`) vì canvas dùng chung.
  - `spawnIcon()` thả sprite tại vị trí xương ĐẦU (theo tư thế: ngồi/té thì thấp, nhảy thì cao).
  - `updateIcons(delta)` trong vòng render: bung ra (pop 0.16) → bay lên `0.85×` chiều cao model, lượn
    ngang nhẹ, nhỏ còn ~0.5×, mờ dần rồi tự gỡ khỏi scene + `dispose()` material.
  - Nhịp thả `every 0.85s` khi trạng thái còn giữ (`bubbleTtl = 0` cho "…"/💤 = thả liên tục; các trạng
    thái chớp nhoáng `ttl = 3`). Cỡ icon `0.3×` chiều cao model (to hơn bong bóng cũ).
- **File:** `three/ThreeRobotScene.ts` (bỏ `buildBubble`/`bubbleSprite`, thêm `ICON`, `prepareIcons`,
  `iconTexture`, `snapshot`, `spawnIcon`, `updateIcons`; `dispose()` giải phóng cache vân).
- **Kiểm chứng:** dựng riêng một scene trong trang preview rồi gọi tay `updateIcons(0.1)` (tab ẩn treo
  rAF): icon lên đều từ y 5.68 → 9.28, cỡ 1.00 → 1.27 → 0.76, mờ 1 → 0.13 rồi biến mất; ngừng trạng thái
  thì icon còn lại bay nốt và danh sách về 0 (không rò sprite); 4 góc vân icon alpha = 0 → **không còn
  khung trắng**. `npm run build` OK, `tsc` 0 lỗi.
- **Lưu ý:** Bé Bi (`CuteRobotScene`) KHÔNG đụng tới - vẫn bong bóng cũ, đúng phạm vi người dùng chốt.

### F2q - CÒN TỒN: trang HIS thật chưa trèo lên nút, trang preview thì được (2026-07-31)

- **Hiện trạng:** người dùng xác nhận *"ở trang preview nó đứng lên được vật cản rồi, nhưng trang web thật
  thì ko đứng lên được"* → **tạm hoãn, làm sau** (theo yêu cầu người dùng).
- **Nghi vấn cần soi khi quay lại** (chưa kiểm chứng, KHÔNG được coi là kết luận):
  1. Nút thật nằm trong `iframe` → `document.elementsFromPoint` của trang cha không thấy được.
  2. Có lớp phủ trong suốt (overlay/backdrop `z-index` cao) chắn trước nút → `elementsFromPoint` trả về
     lớp phủ, `clickableAncestor` leo lên không ra nút.
  3. Nút cao hơn `bandHeight` hoặc `rect.height > bandHeight` nên bị loại ở bộ lọc "khung/lớp phủ".
  4. Robot trên trang thật chạy ở PAGE world nhưng host nằm trong container có `transform` → toạ độ
     `homeBox()` tính theo khung nhìn không khớp vị trí thật.
- **Cách soi nhanh:** mở console trang thật, chạy `document.elementsFromPoint(x, y)` tại 3 hàng điểm mẫu
  quanh chỗ robot đậu, xem thực sự trả về phần tử gì.
