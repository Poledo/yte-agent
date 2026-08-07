===========================================================
1. Fix lỗi và nâng cấp
===========================================================
những checkbox ở popup chuyển quá switch để gạt tắt bật cho đẹp. 
đổi text Hiện trợ lý robot (tắt để robot đi ngủ) thành Bật trợ lý robot hoặc Tắt trợ lý robot tùy vào trạng thái nút gạt

khi bật robat vẫn ngồi trong popup mà không xuống content
sao bấm vào robot để mở panel chat, nếu ko bấm lại để đóng mà đóng bằng nút x trên panel chat thì robot ko tả lại trạng thái lúc đầu mà nó ngấm mắt cười
Hiện thực chuỗi-thoát §4 + particle mùa thật (view layer, không đụng life/).
Cấu hình web-admin cho RobotLifeConfig (bơm ngưỡng từ backend).
Hệ "ký ức" cho robot (nhớ hôm qua làm gì).

===========================================================
2. Robot threejs
===========================================================

bạn xem xét thử robot threejs này có đủ nhẹ để làm extension ko

https://threejs.org/examples/#webgl_animation_skinning_morph

nếu đủ nhẹ thì có đủ tính năng để đáp ứng những yêu cầu nãy giờ ko, nếu không thì sửa + thêm được ko

nếu ok thì sử dụng nó luôn, nhưng trên web admin có chỗ cấu hình dùng robot nào
1. robot như đầu tiên á, gọi là gì thì bạn gơi ý tên giùm
2. robot svg animation (đúng ko ko biết)
3. robot threejs

những cấu hình ở trên webadmin cho extension thì khi nào load extension (load trang) mới lấy về từ api nha

===========================================================
TASK HISTORY (append-only — không xóa/ghi đè)
===========================================================

## [2026-07-23] Thực hiện task-003 (Phần 1 §5–§7 + Phần 2 ThreeJS + cấu hình API)

### §5 — Chuỗi-thoát + particle mùa thật (view layer)
- **Vấn đề:** cần particle mùa (cánh hoa/lá/tuyết) rơi thật khi chờ AI lâu, nhưng
  KHÔNG được đụng `life/` (lõi quyết định thuần).
- **Giải pháp:** thêm lớp view `SeasonParticles.ts` (data-driven `SEASON_PARTICLES`,
  spawn span WAAPI tự huỷ như `Confetti`). `RobotMascot` đọc `waitSnapshot().season`,
  tìm effect là particle → `spawnSeasonParticles`. Tôn trọng `prefers-reduced-motion`.
  Popup: `PopupRobot.playReturnToWork()` diễn robot vẫy tay + bay lên "ra trang làm".
- **File:** `content/robot/SeasonParticles.ts` (mới), `RobotMascot.ts`, `home/PopupRobot.ts`.

### §7 — Hệ "ký ức" robot
- **Giải pháp:** `home/RobotMemory.ts` lưu ≤24 hoạt động gần nhất vào
  `chrome.storage.local` (key `robotMemory`). Khi robot "sống" lại, chào theo ký ức
  ("Hôm qua mình đã … đấy!"). `PopupRobot.record()/greeting()` tích hợp vào vòng đời.
- **File:** `content/robot/home/RobotMemory.ts` (mới), `home/PopupRobot.ts`.

### Phần 2 — Ba hình hài robot + ThreeJS
- **Đánh giá "đủ nhẹ?":** bundle ThreeJS = 517KB (gzip 130KB) — QUÁ nặng để nhúng vào
  content script (chạy trên mọi trang HIS). Kết luận: KHÔNG nhúng chung; tách thành
  `web_accessible_resource` nạp LƯỜI ở page world, chỉ khi web-admin chọn "Bi 3D".
- **Kiến trúc:** interface chung `RobotRenderer` (OCP/DIP) cho cả SVG lẫn ThreeJS.
  Ba hình hài: `svg` = "Bi" (SVG gốc), `svgAnim` = "Bi Động" (SVG hoạt náo hơn),
  `three` = "Bi 3D" (ThreeJS). Content ↔ page world giao tiếp qua `CustomEvent` trên
  `document` (KHÔNG dùng window — khác world). Proxy phía content KHÔNG import three;
  lỗi/nạp quá 4s → tự rơi về SVG (`RobotMascot`) nên robot luôn hiện.
- **Build:** thêm lượt `vite build --mode robot3d` → `dist/robot3d/index.js` (ESM,
  three gói sẵn). Content vẫn IIFE tự-chứa (0 import, 0 three). Khai báo trong manifest
  `web_accessible_resources`.
- **File:** `RobotRenderer.ts`, `RobotFactory.ts`, `three/{Robot3DProtocol,ThreeRobotRenderer,ThreeRobotScene,index}.ts`
  (mới); `vite.config.ts`, `public/manifest.json`, `package.json`, `content/index.ts`.

### §6 + Phần 2 — Cấu hình bơm từ API, nạp khi load trang
- **Extension:** `ExtensionConfig.ts` GET `/api/extension-config` (timeout 4s, mọi lỗi
  → mặc định để không chặn trang HIS). Trộn ngưỡng theo id lên `RobotLifeConfig` (chỉ
  đổi `atMs`, giữ id/label/effects). `content/index.ts` nạp cấu hình → chọn hình hài
  qua `createRobotRenderer`. `life/` thêm `LifeThresholdOverride` cho phép bơm ngưỡng.
- **Backend (api-validation):** `Configuration/ExtensionConfigService.cs` (Singleton,
  lưu bền `Storage/extension-config.json`, chuẩn hoá renderer + bỏ mốc rác);
  `Controllers/ExtensionConfigController.cs` (GET công khai `/api/extension-config`);
  `Controllers/Auth/ExtensionConfigAdminController.cs` (GET/PUT `/api/admin/extension-config`,
  quyền System.Admin, ghi audit). Đăng ký DI trong `Program.cs`. Build 0 lỗi.
- **web-admin (Angular):** `core/api/robot-config.api.ts`, models `ExtensionConfigDto`;
  trang `features/robot-config/` (chọn 1/3 hình hài + tinh chỉnh ngưỡng theo giây);
  route `/robot-config` + menu "Cấu hình robot" (quyền System.Admin). Build 0 lỗi.

### Kiểm chứng
- `npx tsc --noEmit` (extension): 0 lỗi. `npm run build` (extension): content IIFE
  tự-chứa (0 import), robot3d 517KB tách riêng, đủ file manifest.
- `dotnet build` (api): 0 lỗi (bản chạy đang khoá bin — biên dịch ra thư mục tạm OK).
- `npm run build` (web-admin): thành công, chunk robot-config phát sinh.

## [2026-07-23] Sửa 2 lỗi báo lại sau khi dùng thử

### Lỗi 1 — Bật robot nhưng nó vẫn ở lì trong popup, không "rớt xuống" trang làm việc
- **Vấn đề:** Bật công-tắc robot ở popup, người dùng vẫn thấy robot đứng vẫy tay
  trong popup mãi, không hề rời đi. Cảm giác "bật rồi mà robot không xuống trang làm".
- **Nguyên nhân (gốc):** `PopupRobot.showOutWorking()` chỉ ĐỔI CAPTION thành "đang làm
  việc ngoài trang" nhưng vẫn giữ robot HIỆN + vẫy tay lặp vô hạn trong popup. Robot ở
  trang (RobotMascot) có rơi xuống thật, nhưng người dùng đang NHÌN POPUP nên chỉ thấy
  robot còn ngồi đó → hiểu là "không xuống trang". Đây là hai INSTANCE riêng (popup là
  document tách biệt), không thể "bay" phần tử DOM từ cửa sổ này sang cửa sổ kia.
- **Giải pháp (ít ảnh hưởng nhất — chỉ sửa lớp trình diễn popup, không đụng lõi/kiến trúc):**
  - `showOutWorking()`: khi robot đi làm ngoài trang → ẩn hẳn SVG (`setHomePresence(false)`)
    để NHÀ TRỐNG, chỉ còn dòng chú thích "Robot đang làm việc ngoài trang 🖥️".
  - `playReturnToWork()`: lúc bật công-tắc (đang ở nhà → đi làm), robot vẫy tay chào rồi
    "rơi" xuống dưới + mờ dần (animation `translateY 0→120px`, opacity→0) rồi ẩn — đúng
    hình dung "rớt xuống chỗ làm việc" của người dùng.
  - Thêm `setHomePresence(present)` + `cancelStageAnim()`: ẩn/hiện robot, huỷ animation
    "rơi" còn treo. `beginLife()` gọi `setHomePresence(true)` khi tắt công-tắc → robot
    hiện lại sống trong popup. Cập nhật `reflectEnabled()` (bỏ chữ "ghé thăm nhà" vì nhà
    nay trống khi robot đi làm).
- **File đã thay đổi:** `extension/src/content/robot/home/PopupRobot.ts`.

### Lỗi 2 — Chọn "Bi 3D" (ThreeJS) nhưng vẫn hiện robot SVG cũ
- **Vấn đề:** Vào web-admin chọn hình hài "Bi 3D", robot trên trang vẫn là bản SVG cũ.
- **Nguyên nhân (KHÔNG phải lỗi code):** Rà toàn chuỗi — `createRobotRenderer('three')`
  → `ThreeRobotRenderer` (proxy) → tiêm `robot3d/index.js` (đã build 517KB + khai báo
  `web_accessible_resource` trong manifest) → `ThreeRobotScene` dựng robot 3D thật;
  `parseConfig` chấp nhận `'three'`; extension GET `https://localhost:44350/api/extension-config`.
  Mọi mắt xích đều đúng. Gốc là **API đang chạy còn là bản BINARY CŨ** (chưa restart sau
  khi thêm endpoint cấu hình): `/api/extension-config` trả 404 → extension rơi về mặc định
  `svg`; và PUT `/api/admin/extension-config` khi lưu ở web-admin cũng 404 → lựa chọn
  `three` CHƯA hề được lưu.
- **Giải pháp:** Không sửa code (đúng "không sửa khi không phải lỗi code"). Cần **khởi động
  lại API** trong IDE để nạp binary mới, sau đó vào web-admin → Cấu hình robot → chọn
  "Bi 3D" → Lưu (giờ mới thành công) → tải lại trang HIS → extension nhận `three` → robot 3D hiện.
- **Hạn chế còn lại (đề xuất Task mới, KHÔNG làm trong phạm vi sửa lỗi này):**
  `ThreeRobotRenderer` chưa lắng nghe công-tắc bật/tắt (`robotEnabled`) như `RobotMascot`
  (không có `PopupController`), nên khi chọn "Bi 3D" và TẮT robot, robot 3D chưa tự ẩn.
  Không nằm trong 2 lỗi báo lại; nên tách Task riêng để bổ sung.

### Kiểm chứng (vòng sửa lỗi)
- `npx tsc --noEmit` (extension): 0 lỗi.
- `npm run build` (extension): 3 lượt build OK, content IIFE tự-chứa, robot3d 517KB,
  "✓ Đủ 8 file manifest tham chiếu", 0 lỗi.

### Lỗi 1 (vòng 2) — Popup còn chữ lặp + robot "biến mất" sau khi ra trang
- **Vấn đề (người dùng báo lại kèm ảnh):** sau fix vòng 1, popup hiện chú thích LẶP hai
  dòng ("Robot đang làm việc ngoài trang" ở cả caption lẫn state), và robot "nhảy ra
  ngoài rồi mất tiêu, không thấy đâu" — vì khi thử trên popup (không ở trang HIS thật),
  popup là nơi DUY NHẤT thấy robot mà animation lại làm nó mờ dần về 0.
- **Làm rõ yêu cầu (hỏi người dùng):** "Khi robot được bật, popup CHỈ có thông tin ứng
  dụng, không hiện chữ/robot/hoạt động gì cả." → khi BẬT: ẩn HẲN cả khu "ngôi nhà"
  (robot + caption + state). Robot chỉ sống trong popup khi TẮT (ở nhà).
- **Giải pháp:** thay `showOutWorking()` (ẩn robot nhưng còn caption) bằng `hideHome()` —
  ẩn trọn `#popup-robot`'s parent `.robot-home` (`display:none`), xoá caption + state.
  Thêm `showHome()` (hiện lại khi tắt) + `homeContainer()`. Toggle lúc đang chạy vẫn giữ
  animation "rơi xuống ra trang" ngắn rồi mới `hideHome()`. `reflectEnabled()` để trống
  state khi bật. Robot ở trang HIS (RobotMascot) không đổi — vẫn rơi xuống làm việc.
- **File đã thay đổi:** `extension/src/content/robot/home/PopupRobot.ts`.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK, đủ 8 file manifest.

### Lỗi 2 (vòng 2) — Robot 3D chưa giống mẫu skinning-morph → tách Task mới
- Người dùng muốn robot 3D giống ví dụ three.js `webgl_animation_skinning_morph`
  (nhân vật RobotExpressive có xương + morph biểu cảm), thay cho robot khối cơ bản
  (task-003 dựng bằng Capsule/Sphere). Đây là TÍNH NĂNG MỚI (cần GLTFLoader +
  AnimationMixer + morph + file model `.glb`), vượt phạm vi task-003.
- **Quyết định (người dùng chọn):** tạo **task-004** dùng `RobotExpressive.glb` (three.js,
  MIT) làm model mặc định. Xem `tasks/task-ui-robot/task-004.md`.

### Yêu cầu bổ sung — "Bi" (svg) = nút tròn thường, KHÔNG robot (như bản gốc)
- **Vấn đề (người dùng yêu cầu):** khi web-admin chọn hình hài **"Bi"** thì extension phải
  trở về ĐÚNG bản gốc trước khi có robot: chỉ còn **một nút tròn 🤖 thường** mở/đóng panel,
  KHÔNG mascot, KHÔNG animation, KHÔNG nhân vật sống trong trang. Hình hài robot SVG sinh
  động vẫn giữ ở **"Bi Động"** (`svgAnim`); "Bi 3D" (`three`) không đổi.
- **Nguyên nhân:** trước đây `svg` cũng dựng `RobotMascot` (chỉ khác `lively`), và content
  luôn gọi `useExternalLauncher()` để ẩn nút nổi mặc định của panel, biến robot thành
  launcher. Vì vậy "Bi" vẫn là robot mascot, không phải nút thường.
- **Giải pháp (ít ảnh hưởng nhất, giữ OCP/DIP):**
  - Thêm cờ tuỳ chọn `providesLauncher?: boolean` vào interface `RobotRenderer`.
  - Tạo `content/robot/PlainButtonRenderer.ts` — `RobotRenderer` no-op với
    `providesLauncher = false`; không dựng nhân vật, mọi `notify*` rỗng.
  - `RobotFactory`: nhánh `svg` (mặc định) trả `PlainButtonRenderer` thay `RobotMascot`.
  - `content/index.ts`: chỉ gọi `assistantPanel.useExternalLauncher()` khi
    `robot.providesLauncher !== false` → "Bi" giữ nguyên nút tròn `.ua-toggle` mặc định
    của panel (vốn đã là nút 56px bo tròn, gradient, icon 🤖) làm launcher.
  - Cập nhật mô tả danh mục `ROBOT_RENDERERS` (extension) và `renderers` (web-admin) cho
    "Bi": "Nút tròn thường (không robot) — như bản gốc"; icon web-admin đổi sang
    `radio_button_checked`.
- **File đã thay đổi:** `extension/src/content/robot/RobotRenderer.ts`,
  `extension/src/content/robot/PlainButtonRenderer.ts` (mới),
  `extension/src/content/robot/RobotFactory.ts`, `extension/src/content/index.ts`,
  `web-admin/src/app/features/robot-config/robot-config.ts`.
- **Phạm vi giữ nguyên:** popup (`PopupRobot`) và công tắc `robotEnabled` không đụng — robot
  ở nhà trong popup do người dùng bật/tắt riêng, độc lập với lựa chọn hình hài trên trang.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK, content IIFE tự-chứa,
  "✓ Đủ 8 file manifest tham chiếu".

### Tinh chỉnh — Đổi tên "Bi" → "Nút thường" + ẩn nút trợ lý khi tắt robot
- **Vấn đề (người dùng):** (1) hai thẻ đầu đều bắt đầu "Bi" (Bi / Bi Động) gây nhầm "chọn
  cái nào"; (2) khi dùng "Nút thường", nếu TẮT robot ở popup thì phải **ẩn luôn nút trợ
  lý** trên trang (đúng nghĩa "như chưa có gì").
- **Giải pháp:**
  - Đổi nhãn hình hài `svg`: **"Bi" → "Nút thường"** ở cả `ROBOT_RENDERERS` (extension) và
    `renderers` (web-admin). Mô tả: "Chỉ nút tròn mở trợ lý — không robot, như bản gốc".
  - `UnifiedAssistantPanel`: thêm `setLauncherVisible(visible)`; `useExternalLauncher()`
    gọi lại hàm này (DRY).
  - `content/index.ts`: nhánh `providesLauncher === false` khởi tạo `PopupController`
    (DÙNG LẠI lớp đọc/nghe key `robotEnabled` sẵn có) → `setLauncherVisible(enabled)`;
    khi TẮT thì đóng panel nếu đang mở. Bật lại → hiện nút.
- **File đã thay đổi:** `extension/src/content/robot/RobotRenderer.ts`,
  `extension/src/content/robot/PlainButtonRenderer.ts`,
  `extension/src/content/ui/UnifiedAssistantPanel.ts`, `extension/src/content/index.ts`,
  `web-admin/src/app/features/robot-config/robot-config.ts`.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK, "✓ Đủ 8 file manifest".
