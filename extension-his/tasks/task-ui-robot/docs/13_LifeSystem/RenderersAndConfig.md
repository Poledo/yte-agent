# Ba hình hài robot & cấu hình bơm từ API (task-003 Part 2 + §1.6)

Robot có **một bộ não** (`life/`) nhưng có thể mang **nhiều hình hài** (lớp trình diễn).
web-admin chọn hình hài + tinh chỉnh ngưỡng; extension nạp về khi **trang HIS tải xong**.

## 1. Interface chung — `RobotRenderer`

`content/robot/RobotRenderer.ts` định nghĩa bề mặt mà content script gọi vào
(`onActivate`, `notifyChatOpened/Closed`, `notifyTyping`, `notifyThinking`,
`notifyResult`, `destroy`). Đây đúng là bề mặt `RobotMascot` (SVG) đã có, tách thành
interface để **hoán đổi hình hài mà không sửa nơi dùng** (OCP + DIP).

Ba hình hài trong `ROBOT_RENDERERS` (nguồn sự thật, web-admin phản chiếu):

| id        | tên          | mô tả                                             |
|-----------|--------------|---------------------------------------------------|
| `svg`     | Nút thường   | KHÔNG robot — chỉ nút tròn 🤖 của panel (như bản gốc) |
| `svgAnim` | Trợ lý động  | SVG hoạt náo hơn (`RobotMascot({ lively: true })`)|
| `three`   | Trợ lý 3D    | Robot 3D (ThreeJS, RobotExpressive.glb), tải riêng khi chọn |

`RobotFactory.createRobotRenderer(id, thresholds)` dựng đúng hình hài.

## 2. "Bi 3D" (ThreeJS) — vì sao tách riêng

Bundle ThreeJS ~**517KB** (gzip 130KB) — quá nặng để nhúng vào content script chạy
trên **mọi** trang HIS. Giải pháp: đóng gói riêng `dist/robot3d/index.js`
(`web_accessible_resource`), **nạp lười** ở page world **chỉ khi** cấu hình chọn `three`.

- `three/ThreeRobotRenderer.ts` — proxy phía content, **KHÔNG import three**. Tiêm thẻ
  `<script type="module">` trỏ `chrome.runtime.getURL('robot3d/index.js')`.
- `three/index.ts` + `ThreeRobotScene.ts` — chạy ở **page world**, dựng cảnh 3D bằng
  model có xương `RobotExpressive.glb` (three.js, MIT) qua `GLTFLoader` + `AnimationMixer`
  + morph biểu cảm (task-004), giống ví dụ `webgl_animation_skinning_morph`. URL model +
  logo suy từ `import.meta.url` (không cần `chrome.runtime` ở page world). Ánh xạ trạng
  thái→clip: idle→Idle (+cựa quậy nền), listening→Wave, typing→Yes, thinking→Walking (hoặc
  ngẫu nhiên nếu bật random), happy→ThumbsUp, celebrate→Dance, confused→No+morph Surprised,
  sad→Sitting+morph Sad; công tắc `robotEnabled` ẩn/hiện scene.
- **Cỡ & khung hình (2026-07-23):** host mặc định **112×132** — robot vẫn NHỎ (~nửa bản
  gốc) nhưng KHUNG rộng hơn robot nhiều. `frameModel()` tính bounding-box thật rồi đặt
  camera bọc trọn robot với biên NGANG lớn (`marginX≈2.3`) và biên dọc (`marginY≈1.5`) →
  đầu KHÔNG bị cắt, và khi quơ tay/nhảy/múa tay chân vươn RA NGOÀI silhouette đứng vẫn
  nằm trong canvas (nền trong suốt nên phần dư vô hình). Trước đây khung 75×90 sát robot
  nên động tác quơ tay bị mép canvas cắt. `ThreeRobotSceneOptions` cho phép truyền
  `container/width/height/interactive/logoUrl` để TÁI DÙNG scene (góc trang HIS vs. popup).
- **Bằng vai hành vi với robot SVG (2026-07-23):** ngoài ánh xạ trạng thái cơ bản, robot
  3D nay có thêm (áp từ catalog `RobotMascot`): `localError` → trạng thái `pointError`
  (đứng thẳng, "đấm" dứt khoát CHỈ ra lỗi + mặt ngạc nhiên) TÁCH khỏi `aiError`→`sad`
  (ngồi thụp); **rê chuột** vào robot → vẫy tay chào (Hover).
- **Nhìn theo chuột + nghỉ hai giai đoạn (F2, 2026-07-23):** robot XOAY đầu/cổ theo con
  trỏ mỗi frame (`applyGaze` cộng ĐÈ lên xương `Head`/`Neck` SAU `mixer.update`, nội suy
  mượt, kẹp ±28° yaw / ±17° pitch) — ánh xạ `MouseTracker` của robot SVG; nghe `pointermove`
  trên `window` của world đang chạy (page-world cho content, cửa sổ popup cho popup).
- **Đi dạo lúc rảnh + nghỉ ba giai đoạn (F2c/F2d, 2026-07-23):** model được bọc trong nhóm
  `stage` để tịnh tiến/xoay CẢ thân; hệ chặng `MoveSegment` (hàng đợi + nội suy smoothstep
  trong rAF) diễn các hoạt động rảnh MƯỢT. `planIdleActivity` bốc NGẪU NHIÊN (mỗi hoạt động là
  hàm dựng chặng, tham số random tươi: quãng đi, khoảng ra xa `az*rnd(0.7,1.8)` — có lúc xa hẳn,
  hướng quay, thời lượng; chống lặp bằng `lastIdleIdx`): xoay người qua lại · đi qua đi lại một
  đoạn · đi ra xa rồi tới gần · **ngồi nghỉ rồi đứng dậy** · suy nghĩ + nhíu mày · **giật mình
  (Surprised+Jump)** · **cau mày đấm (Angry+Punch)** · **buồn ngồi thụp (Sad+Sitting)** · vẫy
  chào. Biên đi lấy theo `modelSize` để không cắt khung; mọi hoạt động tự KẾT về chỗ gốc.
  **Rảnh quá lâu → NGỒI → GỤC ĐẦU NGỦ → TỰ TỈNH** (`restLevel: awake→sit→sleep`): idle ~24s →
  ngồi (`Sitting`), ngồi thêm ~14s → gục đầu ngủ (vẫn `Sitting` + đầu rũ `SLEEP_HEAD_NOD` trong
  `applyGaze`, KHÔNG dùng `Death` để khỏi "té"), ngủ ~12s → tự `wake()` (nhảy dậy `Jump`) rồi
  rảnh tiếp. Chỉ ĐỔI tư thế nghỉ ở nhịp ĐỨNG YÊN (tránh snap giật giữa lúc đi dạo). Chỉ bản
  tương tác (trang HIS) mới có vòng nghỉ; popup bỏ qua.
- **Bay chuyển-nhà đúng thứ tự "rời trước – tới sau" (F2c, 2026-07-23):** robot RỜI chỗ bay
  ra NGAY, robot TỚI chỗ mới đợi `LEAVE_MS≈720ms` rồi mới thả xuống (không chồng chéo).
  `flyOut({dir})` có hướng: content bay **LÊN** (về toolbar), popup bay **XUỐNG** (về trang);
  `flyIn({delayMs})` luôn rớt từ trên xuống, hẹn nhảy tiếp-đất đúng lúc chạm sàn. TẮT: content
  lên→mất rồi popup rớt; BẬT: popup xuống→mất rồi content rớt. WAAPI trên lớp `host` (định vị/
  bay), TÁCH khỏi lớp `frame` (CỠ) để scale không đụng translateY. Lúc mở trang (on-ready, đang
  bật) content bay vào NGAY (không delay).
- **Hoá già + đổi mùa cho robot 3D (2026-07-23):** proxy `ThreeRobotRenderer` (content)
  TÁI DÙNG `LifeDirector` chạy ĐỒNG HỒ CHỜ AI: mỗi giây hỏi giai đoạn hoá-già + mùa hiện
  tại, gửi lệnh `life{aging,season}` sang page world (chỉ khi đổi). `ThreeRobotScene.
  setLife()` tô màu VẬT LIỆU 3D — già → khử bão hoà về xám & tối dần (`AGING_GRAY`),
  'slow'/'elder' còn giảm `mixer.timeScale`; mùa → nhân hệ số màu (`SEASON_TINT`: thu ngả
  vàng, đông lạnh nhạt) — thay cho CSS filter của robot SVG. Hết chờ (`life{null,null}`)
  → phục hồi màu gốc. Hoá-già/mùa LUÔN theo thời gian thực (không lệ thuộc cờ random).
  *Hạn chế:* chưa mô phỏng HẠT mùa (petals/leaves/snow) trong 3D — chỉ tông màu.
- **Diện mạo chỉnh từ web-admin (F1, 2026-07-23):** MÀU / CỠ / LOGO nay là cấu hình động
  bơm từ web-admin (không còn phải sửa hằng số + build lại). Mô hình dữ liệu `RobotAppearance`
  `{color: hex|null, scale: %[40..200], showLogo, logoDataUrl: data:image/…|null}` chảy đủ 3
  repo: backend `RobotAppearance` (validate hex/kẹp cỡ/giới hạn logo ≤700K) → GET
  `appearance` → extension `ExtensionConfig.appearance` → `createRobotRenderer(...,appearance)`
  → (content) lệnh protocol `appearance` → `ThreeRobotScene.setAppearance()`; (popup)
  `PopupRobot3D` truyền thẳng vào `ThreeRobotSceneOptions`.
  - `captureMaterials()` ghi màu gốc MỌI vật liệu + đánh dấu phần THÂN ẤM (cam/vàng) kèm
    độ sáng gốc (`brandLum`); `applyBrandColor(color)` tô thân sang màu thương hiệu (mặc định
    **xanh VNPT `#0068b3`**) giữ độ sáng, đồng thời cập nhật MỐC màu để hoá-già/đổi-mùa phục
    hồi đúng màu mới.
  - `applyScale(%)` scale lớp `frame` (không đụng hiệu ứng bay ở `host`).
  - `applyLogo(show, url)` gỡ logo cũ (giải phóng texture) rồi gắn logo mới lên xương `Torso`;
    `effectiveLogoUrl()` ưu tiên `logoDataUrl` (tuỳ chỉnh) rồi tới asset mặc định
    `robot3d/vnpt-logo.png` (**placeholder** — thay bằng logo VNPT chính thức).
  - `setAppearance()` áp cỡ ngay; màu/logo chỉ áp khi model đã tải (`loaded`), chưa tải thì
    cấu hình đã lưu, load xong tự áp.
- **Robot trong popup + sửa lỗi TRÙNG robot (F2, 2026-07-23):** `PopupRobot3D` mount
  `ThreeRobotScene` ngay vào sân khấu popup (`#popup-robot`) khi cấu hình chọn `three`; dựng
  lỗi → rơi về `PopupRobot` (SVG). Popup là trang extension nên nạp three trực tiếp (three
  CHỈ vào bundle popup, tải khi mở popup — content vẫn IIFE nhẹ). **Robot chỉ ở MỘT nơi**:
  `PopupRobot3D` nay TỰ QUẢN công tắc `robotEnabled` như `PopupRobot` (SVG) — nghe
  `chrome.storage.onChanged`; BẬT → ẩn hẳn khu robot trong popup (robot "ra trang HIS làm
  việc", nhà trống) → không còn hiện đồng thời cả popup lẫn content; TẮT → hiện trong popup +
  `flyIn()` bay rớt về nhà. Trước đây `PopupRobot3D` mount vô điều kiện nên trùng robot.
- Giao tiếp hai world qua `CustomEvent` trên `document` (KHÔNG dùng `window` — mỗi world
  một `window` riêng): content phát lệnh (`his-robot3d:cmd`), page phát `ready/activate`.
- **Fallback:** module lỗi hoặc không `ready` sau 4s → tự rơi về `RobotMascot` (SVG) →
  robot LUÔN hiện, không kẹt trang.

Content vẫn là IIFE tự-chứa (0 `import`, 0 tham chiếu three). Xem lượt build thứ ba
`vite build --mode robot3d` trong `vite.config.ts`.

## 3. Cấu hình nạp khi load trang

`content/robot/ExtensionConfig.ts` → `loadExtensionConfig()`:

1. GET `${apiBaseUrl}/api/extension-config` (timeout 4s, `AbortController`).
2. Mọi lỗi (offline/4xx/5xx/JSON sai) → `defaultExtensionConfig()` — **không chặn** trang.
3. Trộn ngưỡng override lên `RobotLifeConfig` **theo id**: chỉ đổi `atMs`, giữ nguyên
   `id/label/effects` để lớp view vẫn ánh xạ đúng. Id lạ bị bỏ.

`content/index.ts` gọi hàm này khi khởi tạo, log `robotRenderer`, rồi
`createRobotRenderer(config.robotRenderer, config.thresholds, config.appearance)` (diện mạo
màu/cỡ/logo chỉ áp cho hình hài `three`; SVG bỏ qua).

Ngưỡng chảy vào lõi qua `life/LifeDirector` (`LifeThresholdOverride` →
`WaitEscalation`/`SeasonSystem`/`AgingSystem` nhận timeline tuỳ biến).

**Chế độ ngẫu nhiên (task-005):** cờ `life.waitEscalationRandom` (bool). Khi bật,
`WaitEscalation` dùng `RandomStageSequencer` thay `StageTimeline` — robot đổi hoạt động
ngẫu nhiên theo khoảng thời gian ngẫu nhiên (`RobotLifeConfig.waitRandom`), bỏ qua các
mốc cố định. Chỉ áp cho leo thang chờ AI; mùa/hoá già vẫn theo mốc thời gian thực.

- **Robot SVG** (`svgAnim`): `RobotMascot.playWaitStage()` bốc cử chỉ ngẫu nhiên.
- **Robot 3D** (`three`): cờ đi kèm lệnh `thinking` (Robot3DProtocol). `ThreeRobotScene`
  khi `thinking` + `waitRandom` bật sẽ bốc ngẫu nhiên hoạt động từ `WAIT_MOVES` (Walking,
  Running, Dance, Sitting, Jump, Wave, Yes, No, ThumbsUp, Punch, WalkJump, Death→tự đứng
  dậy) mỗi 2.5–6s ngẫu nhiên, đếm giờ bằng vòng lặp rAF (không `setInterval`). Đổi trạng
  thái khác → tự dừng. Ngoài ra lúc RẢNH (idle) robot cũng tự cựa quậy nhẹ (`IDLE_FIDGETS`)
  mỗi 4–9s cho "có hồn" — không phụ thuộc cờ random.

## 4. Phía backend + web-admin

- **api-validation**: `Configuration/ExtensionConfigService.cs` (Singleton, lưu bền
  `Storage/extension-config.json`); `ExtensionConfigController` (GET công khai);
  `ExtensionConfigAdminController` (GET/PUT `/api/admin/extension-config`, System.Admin,
  ghi audit). Mẫu y hệt `LlmSettingsService` + `LlmConfigController`. State nay gồm thêm
  `Appearance` (`RobotAppearance`), chuẩn hoá qua `CleanAppearance()`: màu phải hex `#RRGGBB`,
  cỡ kẹp `[40,200]`, logo phải `data:image/…` và ≤ 700K ký tự (không hợp lệ → về mặc định).
- **web-admin**: trang `features/robot-config/` — chọn 1/3 hình hài + tinh chỉnh ngưỡng
  (theo giây; danh mục nhãn phản chiếu `RobotLifeConfig`). Khi chọn **Trợ lý 3D** hiện thêm
  khối **Diện mạo**: bật/tắt màu tuỳ chỉnh + color picker, thanh trượt CỠ 40–200%, công tắc
  hiện logo + TẢI logo tuỳ chỉnh (đọc `FileReader` → data URL, chặn ~500KB) với ô xem trước.
  Menu "Cấu hình robot".

## 5. Thêm hình hài thứ tư sau này

1. Viết lớp `implements RobotRenderer` mới.
2. Thêm một dòng vào `ROBOT_RENDERERS` + một nhánh trong `createRobotRenderer`.
3. web-admin tự hiện lựa chọn mới (đọc từ danh mục). Không sửa `life/`, không sửa
   `content/index.ts`.
