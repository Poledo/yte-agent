===========================================================
task-004 — Robot 3D "Bi 3D" bằng model có xương (RobotExpressive.glb)
===========================================================

## Yêu cầu (người dùng)

Robot 3D hiện tại (task-003, hình hài `three`) đang dựng bằng khối cơ bản
(Capsule/Sphere) nên KHÔNG giống mẫu người dùng gửi:

  https://threejs.org/examples/#webgl_animation_skinning_morph

Người dùng muốn robot 3D là nhân vật RobotExpressive có **xương (skeletal
animation)** + **morph biểu cảm khuôn mặt** đúng như ví dụ three.js.

Quyết định (đã hỏi & chốt): dùng model **`RobotExpressive.glb`** của three.js
(giấy phép MIT) làm model mặc định, đóng gói kèm extension.

## Phạm vi

- CHỈ thay phần DỰNG HÌNH của hình hài `three` (lớp trình diễn ở page world).
  KHÔNG đụng lõi `life/`, KHÔNG đụng `RobotRenderer` interface, giao thức
  `Robot3DProtocol`, hay proxy `ThreeRobotRenderer` (đã đúng — chỉ đổi bên trong
  `ThreeRobotScene` + entry `three/index.ts`).
- Giữ nguyên cơ chế nạp-lười web_accessible_resource + fallback về SVG khi lỗi.

## Việc cần làm

1. **Model asset:** thêm `RobotExpressive.glb` vào `extension/public/` (hoặc thư mục
   asset), khai báo `web_accessible_resource` để `chrome.runtime.getURL` lấy được.
   → Cần TẢI file `.glb` (three.js: `examples/models/gltf/RobotExpressive/RobotExpressive.glb`).
2. **ThreeRobotScene:** thay khối cơ bản bằng:
   - `GLTFLoader` (three/examples/jsm) nạp `RobotExpressive.glb`.
   - `AnimationMixer` + clip có sẵn của model: Idle, Walking, Wave, Yes, No, ThumbsUp,
     Punch, Dance, Jump, Death… + morph khuôn mặt: Angry, Surprised, Sad.
   - Ánh xạ `SceneState` → clip/morph (idle→Idle, listening→Wave/Yes, thinking→
     xoay/nhìn, happy→ThumbsUp, celebrate→Dance/Jump, sad→Sad morph + Death…).
   - `mixer.update(delta)` trong vòng loop; đổi clip mượt bằng crossFade.
3. **Đánh giá "đủ nhẹ":** ThreeJS core ~517KB + GLTFLoader + model `.glb` (~2MB).
   Vẫn nạp-lười CHỈ khi chọn "Bi 3D" nên không làm nặng content script mọi trang.
   Ghi lại kích thước bundle thực tế sau khi build.
4. **Enable/tắt (nợ từ task-003):** cho hình hài `three` phản ứng công-tắc
   `robotEnabled` như RobotMascot (ẩn/hiện scene khi tắt/bật). Đây là hạn chế đã ghi
   ở task-003; gộp xử lý trong task này.

## Tiêu chí hoàn thành (theo CLAUDE.md)

- Build thành công (3 lượt: main / robot3d / content), 0 lỗi TS/compile, không import
  thừa, đủ file manifest, Load Unpacked OK, không lỗi Console.
- Chọn "Bi 3D" trên web-admin → tải lại trang HIS → hiện robot RobotExpressive có
  xương + biểu cảm, phản ứng đúng các trạng thái chat/kết quả.
- Fallback về SVG vẫn hoạt động khi model/asset lỗi hoặc quá 4s.

## Ghi chú

- Model là asset chuẩn của three.js (MIT), coi như model MẶC ĐỊNH (giống icon mặc
  định). Nếu sau này cần nhân vật thương hiệu riêng → người dùng cung cấp `.glb`.

## TASK HISTORY (append-only — không xóa/ghi đè)

### 2026-07-23 — Hoàn thành: robot 3D bằng model có xương RobotExpressive.glb
- **Yêu cầu (người dùng):** làm robot 3D Y HỆT ví dụ three.js
  `webgl_animation_skinning_morph`, rồi điều khiển theo trạng thái; coi đây là code
  RIÊNG, khác hẳn robot SVG animation.
- **Đã làm:**
  1. **Model asset:** tải `RobotExpressive.glb` (three.js r185, MIT — 463.988 bytes) vào
     `extension/public/robot3d/RobotExpressive.glb`; khai báo `web_accessible_resource`
     (`public/manifest.json`).
  2. **Dựng hình (rewrite `ThreeRobotScene.ts`):** `GLTFLoader` nạp model; `AnimationMixer`
     + toàn bộ clip có xương (Idle/Walking/Running/Dance/Jump/Yes/No/Wave/Punch/ThumbsUp/
     Death/Sitting/Standing) + morph khuôn mặt (Angry/Surprised/Sad trên mesh Head).
     Điều khiển như ví dụ: một CLIP NỀN lặp đổi bằng crossfade (`fadeTo`), EMOTE một-lần
     (LoopOnce + clampWhenFinished) diễn xong tự về nền qua sự kiện `finished`; morph nội
     suy mượt mỗi frame. Ánh xạ `SceneState`→clip:
       idle→Idle · listening→Wave · typing→Yes(gật, chống spam) · thinking→Walking ·
       happy→ThumbsUp · celebrate→Dance(~3.2s→Idle) · confused→No+morph Surprised ·
       sad→morph Sad. `THREE.Clock` cho `mixer.update(delta)`.
  3. **Lấy URL model KHÔNG cần chrome API:** module chạy ở page world nên không có
     `chrome.runtime`; suy URL model từ `import.meta.url` (cùng thư mục `dist/robot3d/`).
     Dùng cắt chuỗi thay `new URL(literal, import.meta.url)` để Vite không đụng vào lúc build.
  4. **Enable/tắt (nợ task-003):** thêm lệnh `enabled` vào `Robot3DProtocol`; proxy
     `ThreeRobotRenderer` dùng lại `PopupController` nghe `robotEnabled` → gửi sang page;
     scene `setEnabled()` ẩn/hiện host (bật lại thì nhảy "Jump" chào).
  5. **Fallback chắc hơn:** thêm sự kiện `ROBOT3D_FAILED` — nạp model lỗi thì quay về SVG
     NGAY, không đợi hết 4s. READY chỉ phát khi model đã nạp xong.
- **File đã thay đổi:** `three/ThreeRobotScene.ts` (rewrite), `three/index.ts`,
  `three/ThreeRobotRenderer.ts`, `three/Robot3DProtocol.ts`, `public/manifest.json`,
  `public/robot3d/RobotExpressive.glb` (mới).
- **Kích thước bundle (đo thực tế):** `dist/robot3d/index.js` 625.91 KB (gzip 159.92 KB;
  tăng ~109 KB so với 517 KB do GLTFLoader) + model 453 KB. Vẫn NẠP LƯỜI chỉ khi chọn
  "Bi 3D" nên KHÔNG làm nặng content script (163 KB) trên mọi trang HIS.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK, "✓ Đủ 9 file
  manifest tham chiếu". Chạy thử module ở page world (server tĩnh, in-app browser):
  `READY` phát (model nạp), canvas WebGL2 150×180 vẽ ra pixel, chạy hết chuỗi trạng thái,
  lệnh `enabled` ẩn/hiện host, click robot phát `activate` — 0 lỗi Console.

### 2026-07-23 — Đổi nhãn "Bi" → "Trợ lý" + sửa lỗi "2 radio" ở web-admin
- **Yêu cầu (người dùng):** (1) card "Nút thường" ở trang robot-config hiện tới 2 radio →
  bỏ 1; (2) hỏi "Bi Động / Bi 3D" nghĩa là gì; (3) đổi tiền tố "Bi" → "Trợ lý"; (4) đổi
  ghi chú "Robot ThreeJS — tải riêng khi chọn, sinh động nhất" → "Robot 3D — …".
- **Nguyên nhân lỗi "2 radio":** icon của hình hài `svg` đặt là `radio_button_checked` —
  material icon này VẼ RA một vòng tròn radio, nằm cạnh `<mat-radio-button>` thật nên trông
  như 2 nút chọn. (Không phải có 2 radio thật.)
- **Giải pháp / đã đổi (chỉ nhãn hiển thị, KHÔNG đụng logic):**
  - `web-admin robot-config.ts`: icon `svg` `radio_button_checked` → `smart_button`;
    tên `svgAnim` "Bi Động" → **"Trợ lý động"**, `three` "Bi 3D" → **"Trợ lý 3D"**;
    desc `three` "Robot ThreeJS — …" → "Robot 3D — …"; comment danh mục cập nhật.
  - `extension RobotRenderer.ts` (nguồn sự thật `ROBOT_RENDERERS`): đồng bộ nhãn
    "Trợ lý động"/"Trợ lý 3D" + desc "Robot 3D — …"; sửa doc-comment interface.
  - `extension content/index.ts`, docs `RenderersAndConfig.md`: cập nhật nhãn cũ còn sót.
  - (Nhắc: "Nút thường" (`svg`) = KHÔNG robot, chỉ nút tròn; "Trợ lý động" (`svgAnim`) =
    robot SVG hoạt náo; "Trợ lý 3D" (`three`) = robot 3D RobotExpressive.glb, nạp lười.)
- **File đã thay đổi:** `web-admin/.../robot-config.ts`, `extension .../RobotRenderer.ts`,
  `extension .../content/index.ts`, `docs/13_LifeSystem/RenderersAndConfig.md`.
- **Kiểm chứng:** `npx tsc --noEmit` 0 lỗi; `npm run build` 3 lượt OK, "✓ Đủ 9 file
  manifest tham chiếu". (web-admin cần `npm run build` lại để thấy nhãn mới.)
