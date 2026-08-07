import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ObstacleAvoidance } from '../ObstacleAvoidance'
import { PhysicsController } from '../PhysicsController'
import { EXTENSION_HOST_IDS } from '../../../shared/dom/ExtensionHostIds'

/**
 * Trạng thái biểu cảm của robot 3D (ánh xạ từ các lệnh RobotRenderer + hành vi nội tại).
 * `pointError` = lỗi cục bộ tự sửa được (robot "chỉ" ra lỗi, khác `sad` = AI hỏng.)
 */
export type SceneState =
    | 'idle'
    | 'listening'
    | 'typing'
    | 'thinking'
    | 'happy'
    | 'sad'
    | 'celebrate'
    | 'confused'
    | 'pointError'

/** Clip lặp nền (một tư thế "sống") — đổi bằng crossfade. */
type BaseClip = 'Idle' | 'Walking' | 'Running' | 'Dance' | 'Sitting' | 'Standing'
/** Emote một-lần (diễn xong tự về clip nền). */
type EmoteClip = 'Jump' | 'Yes' | 'No' | 'Wave' | 'Punch' | 'ThumbsUp' | 'WalkJump' | 'Death'
/** Morph biểu cảm khuôn mặt (đầu). */
type FaceMorph = 'Angry' | 'Surprised' | 'Sad'

/** Tùy chọn dựng cảnh — cho phép TÁI DÙNG scene ở nhiều nơi (góc trang HIS vs. popup). */
export interface ThreeRobotSceneOptions {
    /** Nơi gắn canvas. Bỏ trống → tự tạo host cố định góc phải-dưới (trang HIS). */
    readonly container?: HTMLElement
    /**
     * Kích thước canvas (px). Mặc định 112×132: robot vẫn NHỎ (~nửa bản gốc) nhưng khung
     * RỘNG hơn robot nhiều để khi quơ tay/nhảy/múa KHÔNG bị cắt (nền trong suốt nên phần
     * dư vô hình). Xem `frameModel()` — biên ngang lớn hơn biên dọc để chừa chỗ cho tay.
     */
    readonly width?: number
    readonly height?: number
    /** false → không click-to-activate, không con trỏ tay (dùng cho popup chỉ để ngắm). */
    readonly interactive?: boolean
    /** URL ảnh logo MẶC ĐỊNH gắn lên ngực (web_accessible_resource). Bỏ trống → không có logo. */
    readonly logoUrl?: string
    /** Màu thương hiệu hex #RRGGBB (web-admin). Bỏ trống → xanh VNPT mặc định. */
    readonly color?: string | null
    /** Cỡ robot theo phần trăm (100 = mặc định). */
    readonly scale?: number
    /** Hiện logo trên ngực hay không (mặc định có nếu có `logoUrl`). */
    readonly showLogo?: boolean
    /** Logo tuỳ chỉnh dạng data URL (đè lên `logoUrl`). Bỏ trống → dùng `logoUrl`. */
    readonly logoDataUrl?: string | null
}

/** Diện mạo robot 3D áp lúc runtime (màu/cỡ/logo) — dùng chung cho content & popup. */
export interface RobotAppearanceInput {
    readonly color: string | null
    readonly scale: number
    readonly showLogo: boolean
    readonly logoDataUrl: string | null
}

/**
 * Một CHẶNG di chuyển lúc rảnh: nội suy vị trí/xoay của CẢ robot (nhóm `stage`) trong
 * `dur` giây, đồng thời có thể đổi clip nền / chèn emote / đổi biểu cảm. Nhiều chặng nối
 * lại thành một "hoạt động" (đi qua lại, đi ra xa–tới gần, xoay người, suy nghĩ…).
 */
interface MoveSegment {
    readonly dur: number
    readonly base?: BaseClip
    readonly emote?: EmoteClip
    readonly face?: FaceMorph | null
    readonly toX?: number
    readonly toY?: number
    readonly toZ?: number
    readonly toRotY?: number
    readonly ease?: boolean
    /** Gọi một lần khi chặng BẮT ĐẦU — chèn hiệu ứng ngoài locomotion (vd: quầng kính lúc va). */
    readonly onStart?: () => void
}

/** Hướng bay ra khi robot RỜI chỗ: content bay LÊN (về toolbar), popup bay XUỐNG (về trang). */
type FlyOutDir = 'up' | 'down'

/** Icon bong bóng trên đầu (đồng bộ ngôn ngữ hình ảnh với robot Bé Bi). */
type BubbleKind = 'ask' | 'write' | 'dots' | 'ok' | 'party' | 'warn' | 'err' | 'fail' | 'zzz' | null

/** Trạng thái → icon trên đầu: nhìn phát biết ngay robot đang làm gì. */
const BUBBLE_FOR_STATE: Partial<Record<SceneState, Exclude<BubbleKind, null>>> = {
    listening: 'ask',
    typing: 'write',
    thinking: 'dots',
    happy: 'ok',
    celebrate: 'party',
    confused: 'warn',
    pointError: 'err',
    sad: 'fail',
}

/** Màu xanh thương hiệu VNPT (#0068b3) — dùng thống nhất với popup. */
const VNPT_BLUE = 0x0068b3

/** Kẹp giá trị vào đoạn [min,max]. */
function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v
}

/** Đổi hex #RRGGBB → số màu three; null/không hợp lệ → null (để dùng mặc định). */
function parseHexColor(hex: string | null | undefined): number | null {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null
    return parseInt(hex.slice(1), 16)
}

/**
 * Mức "hoá già" theo id giai đoạn (0 = mới, 1 = ông lão) — càng già càng XÁM & tối, ánh
 * xạ PAGE_AGING_FILTER (grayscale/sepia) của robot SVG sang không gian màu 3D.
 */
const AGING_GRAY: Record<string, number> = {
    dust: 0.12,
    dustMore: 0.25,
    rust: 0.4,
    loose: 0.52,
    grayHair: 0.65,
    cane: 0.78,
    slow: 0.9,
    elder: 1,
}

/** Hệ số nhân màu theo MÙA (ánh xạ PAGE_SEASON_FILTER) — xuân trung tính, đông lạnh nhạt. */
const SEASON_TINT: Record<string, readonly [number, number, number]> = {
    spring: [1, 1, 1],
    summer: [1.06, 1.03, 0.94], // nắng ấm, tươi
    autumn: [1.06, 0.9, 0.7], // ngả vàng sepia
    winter: [0.9, 0.95, 1.06], // lạnh, xanh nhạt
}

/**
 * Robot 3D "Bi 3D" — DỰNG BẰNG MODEL CÓ XƯƠNG `RobotExpressive.glb` của three.js
 * (giống ví dụ `webgl_animation_skinning_morph`): skeletal animation + morph biểu cảm.
 * Lớp này CHỈ lo dựng hình + phát animation theo trạng thái; quyết định nghiệp vụ vẫn ở
 * content script (SRP). Điều khiển bằng `setState()` — tách biệt hoàn toàn với robot SVG.
 *
 * Cơ chế điều khiển (như ví dụ three.js):
 *  - Một CLIP NỀN lặp (Idle/Walking/Running/Dance/Sitting/Standing) đổi mượt bằng crossfade.
 *  - EMOTE một-lần (Wave/Yes/No/ThumbsUp/Jump/Punch/WalkJump/Death) chồng lên, diễn xong
 *    tự quay về clip nền qua sự kiện `finished` của mixer.
 *  - BIỂU CẢM khuôn mặt bằng morph target (Angry/Surprised/Sad), nội suy mượt mỗi frame.
 *  - "SỐNG": lúc rảnh (idle) hoặc lúc chờ AI (thinking+random) robot tự bốc hoạt động
 *    ngẫu nhiên theo khoảng thời gian ngẫu nhiên (đếm giờ bằng vòng lặp rAF).
 *
 * Nhận diện thương hiệu: thân robot đổi sang XANH VNPT; gắn logo nhỏ lên xương `Torso`.
 */
export class ThreeRobotScene {
    private readonly host: HTMLDivElement // lớp ngoài: định vị + hiệu ứng BAY (translateY)
    private readonly frame: HTMLDivElement // lớp trong: chứa canvas + CỠ người dùng (transform scale)
    private readonly renderer: THREE.WebGLRenderer
    private readonly scene: THREE.Scene
    private readonly camera: THREE.PerspectiveCamera
    // Tự đếm thời gian frame bằng performance.now() — KHÔNG dùng THREE.Clock (deprecated,
    // phát cảnh báo console; dự án yêu cầu console sạch).
    private lastFrameMs = 0
    private readonly width: number
    private readonly height: number
    /** Chỗ đậu mặc định trên trang HIS (px tính từ mép phải/đáy). */
    private static readonly HOME = { right: 16, bottom: 12 }
    /** Né nút của trang chiếm chỗ đậu — chỉ có khi robot đứng trong trang (không phải popup). */
    private avoidance: ObstacleAvoidance | null = null

    private mixer: THREE.AnimationMixer | null = null
    private readonly actions = new Map<string, THREE.AnimationAction>()
    private activeAction: THREE.AnimationAction | null = null
    private baseName: BaseClip = 'Idle'
    // Clip nền dạng GIỮ POSE (không lặp): diễn một lần rồi CLAMP đứng yên. `Sitting` lặp lại
    // sẽ pop ở mốc lặp (đầu≠cuối) → "giựt giựt" khi ngồi lâu; giữ pose thì phẳng lì, hết giật.
    private static readonly HELD_BASES: ReadonlySet<BaseClip> = new Set<BaseClip>(['Sitting'])
    private headMorph: { mesh: THREE.Mesh; index: Record<FaceMorph, number> } | null = null
    private readonly morphTarget: Record<FaceMorph, number> = { Angry: 0, Surprised: 0, Sad: 0 }
    // Màu GỐC từng vật liệu (sau khi tô màu thương hiệu) — mốc để hoá-già/đổi-mùa tô đè rồi
    // phục hồi. `brandLum` != null nếu là phần THÂN (đổi màu thương hiệu được), giữ độ sáng gốc.
    private readonly materialBases: Array<{ mat: THREE.MeshStandardMaterial; base: THREE.Color; brandLum: number | null }> =
        []

    // Diện mạo (màu/cỡ/logo) từ web-admin — áp lúc load & khi có lệnh `appearance`.
    private loaded = false
    private brandColorHex: number
    private scalePercent: number
    private showLogo: boolean
    private logoDataUrl: string | null
    private readonly defaultLogoUrl?: string
    private logoPlane: THREE.Mesh | null = null
    private logoAnchor: THREE.Object3D | null = null

    // ICON TRẠNG THÁI trên đầu: 💬 được hỏi, ✍️ đang gõ, "…" suy nghĩ, ✔️ có kết quả,
    // 🎉 ăn mừng, ⚠️ bối rối, ❗ chỉ lỗi, ❌ buồn/lỗi AI, 💤 ngủ. KHÔNG đóng khung bong
    // bóng trắng: icon trần bay lên từ đỉnh đầu, nhỏ dần rồi tan. Sprite gắn vào `stage`
    // nên đi theo robot lúc đi dạo.
    private readonly bubbleCanvas = document.createElement('canvas')
    private readonly iconTextures = new Map<string, THREE.CanvasTexture>()
    private readonly icons: Array<{ sprite: THREE.Sprite; life: number; span: number; scale: number; sway: number }> = []
    private iconsReady = false
    private emitTimer = 0
    private dotPhase = 0
    private bubbleKind: BubbleKind = null
    private bubbleBaseY = 0
    private modelTopY = 0 // đỉnh đầu model (bounding box) — mốc treo bong bóng
    private modelFrontZ = 0 // mặt trước thân (bounding box) — mốc đặt logo ngực
    private modelMinY = 0 // chân robot (bounding box) — mốc tính chiều cao ngực theo tỉ lệ
    private modelRoot: THREE.Object3D | null = null // gốc model — đích raycast tìm bề mặt ngực
    private readonly tmpHead = new THREE.Vector3() // vector tạm cho bong bóng bám đầu (không cấp phát mỗi frame)
    private bubbleHeadOffsetY = 0 // hiệu số đầu→bong bóng đo lúc BIND POSE (đứng) — bám đầu mà không che mặt
    // Vị trí/hướng/cỡ logo trong HỆ XƯƠNG Torso, tính MỘT LẦN ở bind pose (robot đứng
    // thẳng tại gốc). Bật/tắt logo lúc robot đang cử động chỉ việc dùng lại — không đo
    // world lúc đang animation (nguồn lệch vị trí trước đây).
    private logoLocal: { pos: THREE.Vector3; quat: THREE.Quaternion; sx: number; sy: number } | null = null
    // PHÁO HOA CẦM TAY khi ăn mừng: các cụm hạt bay toé + rơi, tự tan.
    private readonly fireworks: Array<{ points: THREE.Points; vel: Float32Array; life: number; max: number }> = []
    private fireworkBursts = 0 // số phát còn chờ bắn
    private fireworkTimer = 0 // đếm tới phát kế
    private fireworkSide = 1 // đổi tay mỗi phát
    private fallHoldTimer = 0 // >0: đang NẰM SÕNG SOÀI sau cú té ngủ mê — hết giờ mới ngồi dậy
    private static readonly FALL_HOLD_S = 3 // nằm ~3s sau cú té rồi mới lồm cồm dậy
    private bubbleTtl = 0 // >0: thôi thả icon sau ngần này giây (0 = thả tới khi đổi trạng thái)

    private pendingState: SceneState | null = 'idle'
    private current: SceneState = 'idle'
    private celebrateTimer = 0
    private raf = 0
    private disposed = false

    // Bay vào/ra khi bật/tắt công tắc. Robot RỜI chỗ (leaving) bay ra NGAY; robot TỚI chỗ
    // mới (arriving) đợi `LEAVE_MS` để chặng bay-ra kia xong trước → không chồng lên nhau.
    private enabledApplied = false
    private flyLandTimer = 0
    private static readonly LEAVE_MS = 720 // ~thời lượng bay-ra, để bên tới chờ đúng nhịp

    // "NHÌN THEO CHUỘT" (ánh xạ MouseTracker của robot SVG): xương đầu/cổ xoay theo con
    // trỏ mỗi frame (cộng ĐÈ lên animation sau `mixer.update`). Bắt `pointermove` trên
    // window của world đang chạy (trang HIS cho content, cửa sổ popup cho popup).
    private head: THREE.Bone | null = null
    private neck: THREE.Bone | null = null
    private gazeYaw = 0
    private gazePitch = 0
    private gazeTargetYaw = 0
    private gazeTargetPitch = 0
    // Lượng liếc ĐÃ cộng vào xương ở frame trước — để GỠ ra trước khi cộng lượng mới, tránh
    // TÍCH LUỸ quay tròn vô hạn khi clip nền không có track cho xương đầu.
    private appliedYaw = 0
    private appliedPitch = 0
    private static readonly GAZE_YAW_MAX = 0.5 // ~28° liếc trái/phải
    private static readonly GAZE_PITCH_MAX = 0.3 // ~17° ngước/cúi

    // "Nghỉ lâu → NGỒI → NẰM/NGỦ" (ánh xạ LongIdle/Sleeping của robot SVG): rảnh quá lâu
    // robot ngồi thụp, lâu nữa thì nằm ngủ; rê chuột/hoạt động trở lại → bật dậy. Chỉ áp
    // cho bản tương tác (trang HIS); popup ngắm tĩnh nên bỏ qua vòng nghỉ.
    private readonly interactive: boolean
    private restLevel: 'awake' | 'sit' | 'sleep' = 'awake'
    private restTimer = 0
    private restRotY = 0 // hướng THÂN lúc nghỉ (ngồi/gục đầu) — chọn NGẪU NHIÊN mỗi lần ngồi, xoay mượt
    private sleepFallTimer = 0 // >0: đang đếm tới lúc "ngủ mê té ra" (mỗi giấc tối đa một lần, ngẫu nhiên)
    private static readonly IDLE_TO_SIT_S = 24 // rảnh 24s → ngồi nghỉ
    private static readonly SIT_TO_SLEEP_S = 14 // ngồi thêm 14s → gục đầu ngủ
    private static readonly SLEEP_TO_WAKE_S = 12 // ngủ 12s → TỰ tỉnh dậy (không nằm lì mãi)
    private static readonly SLEEP_HEAD_NOD = 0.5 // độ rũ đầu khi ngủ (~29° cúi xuống)
    private static readonly SLEEP_FALL_CHANCE = 0.5 // xác suất một giấc ngủ có màn "té ra"
    private static readonly FALL_RECOVER_S = 4.5 // giữ ngủ đủ lâu để lọ mọ ngồi dậy trước khi tỉnh
    // Các hướng NGHỈ có thể quay về: chính diện/3-4, phải, trái, quay lưng, chếch phải/trái.
    private static readonly REST_FACINGS = [0, Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI / 4, -Math.PI / 4]

    // "SỐNG" lúc rảnh bằng DI CHUYỂN CẢ THÂN: robot được bọc trong nhóm `stage` để tịnh
    // tiến/xoay mà KHÔNG đụng bộ xương (animation clip vẫn chạy tại chỗ). Mỗi "hoạt động"
    // là chuỗi `MoveSegment` xếp vào hàng đợi, nội suy mượt từng chặng trong vòng lặp rAF.
    private stage: THREE.Group | null = null
    private readonly modelSize = new THREE.Vector3()
    private camDist = 0 // khoảng cách camera→robot lúc căn khung (frameModel) — để tính quãng đi TỚI màn hình
    private static readonly CAM_X_OFF = 0.14 // camera lệch TRÁI (góc 3/4) — tỉ lệ theo khoảng cách
    private static readonly CAM_Y_OFF = 0.03 // mắt camera nhỉnh trên tâm ngực một chút
    private moveQueue: MoveSegment[] = []
    private moveSeg: {
        def: MoveSegment
        t: number
        fromX: number
        fromY: number
        fromZ: number
        fromRotY: number
    } | null = null
    private lastIdleIdx = -1 // hoạt động rảnh vừa diễn — để KHÔNG bốc trùng ngay sau đó
    // Đi lòng vòng: có "LA CÀ Ở XA" hay không. false = đi ra xa NGẮM một chút rồi ĐI VỀ chỗ cũ (mặc định —
    // đứng la cà ở xa nhìn robot nhỏ xíu, không đẹp). true = ra xa rồi Ở LẠI la cà (giữ lại để sau dùng).
    private static readonly ROAM_STAY_FAR = false

    // Màn "đi thẳng tới VA đầu vào màn hình" (chỉ bản content) dùng CHÍNH cơ chế locomotion như
    // "đi ra xa": robot BƯỚC tới (tịnh tiến `stage` theo trục Z về phía camera) nên TO DẦN theo
    // phối cảnh; tới sát màn hình thì ngửa đầu + giận + đấm + quầng KÍNH mờ (chèn qua onStart của
    // chặng), rồi BƯỚC lùi về chỗ cũ. `headBonk` = độ ngửa đầu tức thời khi va, tự phân rã về 0.
    private headBonk = 0

    // "GHI CHÉP khi người dùng nhập liệu": vào trạng thái 'typing' → robot NGỒI xuống, cầm CÂY VIẾT +
    // QUYỂN VỞ (props 3D gắn theo xương ngực) hí hoáy ghi chép, cúi đầu nhìn vở; được một lúc CHÁN thì
    // đứng dậy về như cũ (writeTimer). Chống re-vào liên tục mỗi phím gõ bằng cooldown.
    private writeProps: THREE.Object3D | null = null // nhóm vở+viết (dựng một lần, ẩn/hiện theo lúc ghi chép)
    private penMesh: THREE.Object3D | null = null // cây viết — hí hoáy qua lại lúc ghi chép
    private writing = false
    private writeTimer = 0 // đếm ngược tới lúc "chán" → đứng dậy
    private writeCooldown = 0 // vừa chán xong → tạm KHÔNG ngồi lại dù còn gõ (đỡ ping-pong)
    private writePhase = 0 // pha dao động ngòi viết (cộng dồn theo delta, không dùng Date)
    private static readonly WRITE_BORED_S = 12 // ghi chép ~12s thì chán, đứng dậy
    private static readonly WRITE_COOLDOWN_S = 6 // sau khi chán, 6s không ngồi lại
    private static readonly WRITE_HEAD_NOD = 0.42 // độ cúi đầu nhìn vở khi ghi chép (~24°)

    // Chế độ chờ NGẪU NHIÊN (task-005) — do cấu hình web-admin quyết định.
    private waitRandom = false
    // Bộ đếm hoạt động NỀN ("sống"): 'idle' = đi dạo/xoay người/suy nghĩ lúc rảnh; 'wait' =
    // đổi hoạt động dồn dập lúc chờ AI; 'off' = đứng yên theo trạng thái cố định.
    private ambient: 'off' | 'idle' | 'wait' = 'off'
    private ambientTimer = 0
    private static readonly IDLE_MIN_S = 2 // nghỉ ngắn giữa hai hoạt động rảnh
    private static readonly IDLE_MAX_S = 5
    private static readonly WAIT_MIN_S = 2.5
    private static readonly WAIT_MAX_S = 6
    /** Kho hoạt động lúc CHỜ AI để bốc ngẫu nhiên (chạy/ngồi/nhảy/té... — nhiều dạng). */
    private static readonly WAIT_MOVES: ReadonlyArray<{ base: BaseClip; emote?: EmoteClip }> = [
        { base: 'Walking' },
        { base: 'Running' },
        { base: 'Dance' },
        { base: 'Sitting' },
        { base: 'Idle', emote: 'Jump' },
        { base: 'Idle', emote: 'Wave' },
        { base: 'Idle', emote: 'Yes' },
        { base: 'Idle', emote: 'No' },
        { base: 'Idle', emote: 'ThumbsUp' },
        { base: 'Idle', emote: 'Punch' },
        { base: 'Idle', emote: 'WalkJump' },
        { base: 'Standing', emote: 'Death' }, // "té" ngã rồi tự đứng dậy về Standing
    ]

    constructor(
        private readonly modelUrl: string,
        private readonly onActivate: () => void,
        private readonly onReady: () => void,
        private readonly onError: (err: unknown) => void,
        options: ThreeRobotSceneOptions = {},
    ) {
        // Khung 100×118: robot nhỏ gọn nhưng vẫn chừa nhiều khoảng trống quanh để tay/chân
        // khi quơ ra không bị cắt (giữ NGUYÊN tỉ lệ 112:132 nên camera căn y hệt, chỉ nhỏ
        // hơn ~10% cho đỡ đè nội dung trang); popup có thể truyền riêng.
        this.width = options.width ?? 100
        this.height = options.height ?? 118
        this.interactive = options.interactive ?? options.container == null

        // Diện mạo ban đầu từ options (popup truyền thẳng; content áp lại qua lệnh appearance).
        this.brandColorHex = parseHexColor(options.color) ?? VNPT_BLUE
        this.scalePercent = options.scale ?? 100
        this.defaultLogoUrl = options.logoUrl
        this.showLogo = options.showLogo ?? false
        this.logoDataUrl = options.logoDataUrl ?? null

        if (options.container) {
            // Gắn vào vùng cho sẵn (popup): host lấp đầy container.
            this.host = document.createElement('div')
            this.host.style.cssText = `width:100%; height:100%; ${this.interactive ? 'cursor:pointer;' : ''} user-select:none;`
            options.container.appendChild(this.host)
        } else {
            // Host cố định góc phải-dưới trang HIS.
            const home = ThreeRobotScene.HOME
            this.host = document.createElement('div')
            this.host.id = EXTENSION_HOST_IDS.robot3d
            this.host.style.cssText = `position:fixed; right:${home.right}px; bottom:${home.bottom}px; width:${this.width}px; height:${this.height}px;
                z-index:2147483646; ${this.interactive ? 'cursor:pointer;' : ''} user-select:none;`
            document.body.appendChild(this.host)
            // Màn hình HIS nào có nút cố định ở đáy (vd "Ký số") thì robot tự tránh: té một
            // cái rồi nhảy lên đứng trên nút, hoặc nép sang bên — không che nút của người dùng.
            this.avoidance = new ObstacleAvoidance(this.host, {
                home,
                size: { width: this.width, height: this.height },
                mover: new PhysicsController(this.host),
            })
            this.avoidance.start()
        }
        // Vùng TRỐNG quanh robot (biên an toàn cho tay/chân) chiếm phần lớn khung nhưng trong
        // suốt → nếu để cả khung nhận chuột sẽ ĐÈ/chặn ô input phía dưới. Cho host XUYÊN QUA;
        // chỉ một hit-area nhỏ ôm đúng thân robot mới nhận click/hover (gắn ở dưới).
        if (this.interactive) this.host.style.pointerEvents = 'none'
        // Nhìn theo chuột: nghe trên window của world hiện tại (page-world cho content,
        // cửa sổ popup cho popup). Robot xoay đầu/cổ về phía con trỏ — cả hai bản đều có.
        window.addEventListener('pointermove', this.onPointerMove, { passive: true })

        // Lớp trong "frame" chịu hiệu ứng CỠ (transform scale) để KHÔNG đụng hiệu ứng BAY
        // (translateY) chạy trên host — hai transform ở hai phần tử tách biệt, không chồng.
        this.frame = document.createElement('div')
        this.frame.style.cssText = 'position:relative; width:100%; height:100%; transform-origin:center bottom;'
        this.host.appendChild(this.frame)

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.frame.appendChild(this.renderer.domElement)
        this.applyScale(this.scalePercent)

        // Hit-area ôm THÂN robot (lower-center của khung) — chỉ vùng này nhận click/hover, phần
        // trống còn lại xuyên qua để không đè ô input. Đặt TRONG frame nên co giãn cùng robot khi
        // đổi cỡ (%). Chừa ~14% đáy khung (chỗ input hay ló ra dưới) vẫn xuyên-click.
        if (this.interactive) {
            const hit = document.createElement('div')
            hit.style.cssText =
                'position:absolute; left:26%; top:14%; width:48%; height:72%; pointer-events:auto;' +
                ' cursor:pointer; z-index:1;'
            hit.addEventListener('click', () => this.onActivate())
            // Rê chuột vào robot → vẫy tay chào (như trạng thái Hover của robot SVG); nếu đang
            // thiu thiu ngủ thì bật dậy.
            hit.addEventListener('pointerenter', () => this.onHover())
            this.frame.appendChild(hit)
        }

        this.scene = new THREE.Scene()
        // Góc/khoảng cách camera được TÍNH LẠI trong frameModel() để bọc trọn robot (đầu
        // không bị cắt) dù kích thước canvas là bao nhiêu.
        this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 100)

        // Ánh sáng như ví dụ (three r155+ dùng cường độ vật lý ~3).
        const hemi = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3)
        hemi.position.set(0, 20, 0)
        this.scene.add(hemi)
        const dir = new THREE.DirectionalLight(0xffffff, 3)
        dir.position.set(0, 20, 10)
        this.scene.add(dir)

        this.loadModel()
    }

    private loadModel(): void {
        new GLTFLoader().load(
            this.modelUrl,
            (gltf) => {
                if (this.disposed) return
                const model = gltf.scene
                this.modelRoot = model // đích raycast tìm bề mặt ngực khi gắn logo
                // Bọc model trong nhóm `stage` để đi dạo/xoay người lúc rảnh mà không đụng xương.
                this.stage = new THREE.Group()
                this.stage.add(model)
                this.scene.add(this.stage)
                this.setupMorph(model)
                this.captureBones(model) // xương đầu/cổ để "nhìn theo chuột"
                this.captureMaterials(model) // ghi màu gốc MỌI vật liệu (hoá-già/đổi-mùa phục hồi)
                this.applyBrandColor(this.brandColorHex) // thân → màu thương hiệu (web-admin / mặc định VNPT)
                this.captureLogoAnchor(model) // xương ngực để gắn logo theo thân
                this.frameModel(model) // căn camera bọc trọn robot → KHÔNG cắt đầu (đo modelSize)
                this.computeLogoPlacement() // đo chỗ đặt logo Ở BIND POSE, cache theo hệ xương
                this.applyLogo(this.showLogo, this.effectiveLogoUrl()) // logo ngực — dùng placement đã cache
                this.prepareIcons() // mốc treo icon trạng thái trên đầu (cần modelSize)
                this.loaded = true

                this.mixer = new THREE.AnimationMixer(model)
                // Nền dạng GIỮ POSE (Sitting) diễn xong → giữ nguyên, KHÔNG tự đứng dậy.
                // Emote một-lần xong → mờ về clip nền (đúng kiểu lặp/giữ của nền đó).
                this.mixer.addEventListener('finished', () => {
                    if (this.isAtBase()) return
                    // Té từ giấc ngủ (Death khi restLevel='sleep'): NẰM YÊN một lúc đã —
                    // Death clamp giữ pose nằm; vòng lặp hết fallHoldTimer mới cho ngồi dậy.
                    if (this.restLevel === 'sleep') {
                        this.fallHoldTimer = ThreeRobotScene.FALL_HOLD_S
                        const need = ThreeRobotScene.FALL_HOLD_S + 2.5 // đủ giờ nằm + ngồi dậy rồi mới tỉnh
                        if (this.restTimer < need) this.restTimer = need
                        return
                    }
                    this.fadeTo(this.baseName, 0.25, ThreeRobotScene.HELD_BASES.has(this.baseName))
                })
                for (const clip of gltf.animations) {
                    this.actions.set(clip.name, this.mixer.clipAction(clip))
                }
                this.setBase('Idle')
                if (this.pendingState) this.setState(this.pendingState)
                this.pendingState = null

                this.onReady()
                this.loop()
            },
            undefined,
            (err) => {
                if (!this.disposed) this.onError(err)
            },
        )
    }

    /**
     * Căn camera để BỌC TRỌN robot (kể cả đầu) theo bounding-box thực tế + biên an toàn.
     * Nhờ vậy đầu không bao giờ bị cắt dù đổi kích thước canvas hay model.
     */
    private frameModel(model: THREE.Object3D): void {
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        this.modelSize.copy(size) // dùng để chọn biên đi dạo AN TOÀN trong khung (không cắt)
        this.modelTopY = box.max.y // đỉnh đầu — mốc treo bong bóng icon trạng thái
        this.modelFrontZ = box.max.z // mặt trước thân — mốc đặt logo ngực
        this.modelMinY = box.min.y // chân — mốc tính chiều cao ngực theo tỉ lệ cơ thể
        // Bounding-box đo lúc đứng Idle; các động tác (Wave/Punch/Dance/Jump) vươn tay/chân
        // RA NGOÀI hộp đó → chừa biên RỘNG, nhất là chiều NGANG (tay quơ) để không bị cắt.
        const marginY = 1.5 // ~50% dư trên-dưới (nhảy/giơ tay cao)
        const marginX = 2.3 // ~130% dư trái-phải (quơ tay, múa)
        const camXOff = ThreeRobotScene.CAM_X_OFF
        const camYOff = ThreeRobotScene.CAM_Y_OFF
        const fov = (this.camera.fov * Math.PI) / 180
        const tan = 2 * Math.tan(fov / 2)
        // Khoảng cách đủ để vừa CHIỀU CAO và vừa CHIỀU NGANG (quy về chiều dọc theo aspect).
        const fitH = (size.y * marginY) / tan
        const fitW = (size.x * marginX) / (tan * this.camera.aspect)
        const dist = Math.max(fitH, fitW)
        this.camDist = dist // nhớ lại để tính quãng "đi tới màn hình" (tịnh tiến về phía camera)
        // Góc 3/4 nhẹ từ trước, mắt camera ngang tầm ngực.
        this.camera.position.set(center.x - dist * camXOff, center.y + size.y * camYOff, center.z + dist)
        this.camera.near = Math.max(0.01, dist / 50)
        this.camera.far = dist * 10
        this.camera.updateProjectionMatrix()
        this.camera.lookAt(center.x, center.y, center.z)
        this.reportFootInset(center, box.min.y)
    }

    /**
     * Đo khoảng TRỐNG từ mép dưới khung tới BÀN CHÂN robot (px) rồi báo cho bộ né vật cản.
     * Khung chừa biên rất rộng để quơ tay/nhảy không bị cắt, nên nếu lấy mép khung làm chân
     * thì robot sẽ đứng lơ lửng trên nút. Chiếu điểm chân qua camera là ra số thật.
     */
    private reportFootInset(center: THREE.Vector3, footY: number): void {
        if (!this.avoidance) return
        const foot = new THREE.Vector3(center.x, footY, center.z).project(this.camera)
        this.avoidance.setFootInset(((1 + foot.y) / 2) * this.height)
    }

    /**
     * Ghi lại MỌI vật liệu có màu (làm mốc cho hoá-già/đổi-mùa phục hồi), đồng thời đánh dấu
     * phần THÂN ẤM (cam/vàng, đủ bão hòa & sáng) đổi được màu thương hiệu kèm ĐỘ SÁNG gốc —
     * để tô màu mới mà vẫn giữ khối 3D. Phần tối (khớp, mắt) → `brandLum=null` (giữ nguyên).
     */
    private captureMaterials(model: THREE.Object3D): void {
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
            for (const m of mats) {
                const mm = m as THREE.MeshStandardMaterial
                if (!mm.color) continue
                const hsl = { h: 0, s: 0, l: 0 }
                mm.color.getHSL(hsl)
                const warm = hsl.h < 0.14 || hsl.h > 0.94
                const brandLum = warm && hsl.s > 0.15 && hsl.l > 0.12 ? hsl.l : null
                this.materialBases.push({ mat: mm, base: mm.color.clone(), brandLum })
            }
        })
    }

    /**
     * Tô phần thân sang MÀU THƯƠNG HIỆU (giữ độ sáng gốc từng vật liệu để còn khối 3D) và
     * cập nhật lại MỐC màu gốc → hoá-già/đổi-mùa sẽ phục hồi về đúng màu thương hiệu này.
     */
    private applyBrandColor(colorNum: number): void {
        const t = { h: 0, s: 0, l: 0 }
        new THREE.Color(colorNum).getHSL(t)
        for (const entry of this.materialBases) {
            if (entry.brandLum == null) continue // phần tối (khớp/mắt) → giữ nguyên
            entry.mat.color.setHSL(t.h, Math.max(t.s, 0.55), entry.brandLum)
            entry.mat.needsUpdate = true
            entry.base.copy(entry.mat.color) // mốc hoá-già/đổi-mùa bám theo màu thương hiệu mới
        }
    }

    /**
     * HOÁ GIÀ + ĐỔI MÙA khi chờ AI cực lâu (task-002 §6/§7) — tương đương CSS filter của
     * robot SVG nhưng làm trong không gian màu 3D: già → xám & tối dần; mùa → nhân hệ số
     * màu (thu ngả vàng, đông lạnh...). `null/null` → phục hồi màu gốc (hết chờ).
     */
    setLife(agingId: string | null, seasonId: string | null): void {
        const gray = agingId ? (AGING_GRAY[agingId] ?? 0) : 0
        const tint = SEASON_TINT[seasonId ?? 'spring'] ?? SEASON_TINT.spring
        for (const { mat, base } of this.materialBases) {
            const c = base.clone()
            if (gray > 0) {
                // Khử bão hoà về xám theo độ chói (luminance) rồi tối dần → "cũ kỹ, hoá già".
                const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114
                c.lerp(new THREE.Color(lum, lum, lum), gray * 0.85)
                c.multiplyScalar(1 - gray * 0.22)
            }
            c.setRGB(c.r * tint[0], c.g * tint[1], c.b * tint[2])
            mat.color.copy(c)
            mat.needsUpdate = true
        }
        // Về già đi chậm hẳn (ánh xạ giai đoạn 'slow'/'elder' của robot SVG).
        if (this.mixer) this.mixer.timeScale = agingId === 'slow' ? 0.6 : agingId === 'elder' ? 0.5 : 1
    }

    /** Ghi lại điểm neo logo: ưu tiên xương ngực `Torso` (logo theo thân), thiếu thì dùng model. */
    private captureLogoAnchor(model: THREE.Object3D): void {
        this.logoAnchor = model
        model.traverse((o) => {
            if ((o as THREE.Bone).isBone && o.name === 'Torso') this.logoAnchor = o
        })
    }

    /**
     * Tính CHỖ ĐẶT logo một lần ở BIND POSE (model vừa tải, đứng thẳng tại gốc, chưa có
     * animation): bắn 2 tia từ trước mặt vào model ở mép trên/dưới vùng logo → lấy bề mặt
     * ngực THẬT + độ dốc → logo dán sát và ốp theo ngực, x=0 là giữa tuyệt đối. Kết quả
     * đổi về HỆ XƯƠNG Torso và cache — về sau bật/tắt logo lúc robot đang cử động vẫn đúng.
     */
    private computeLogoPlacement(): void {
        const anchor = this.logoAnchor
        if (!anchor || !(anchor as THREE.Bone).isBone || !this.modelRoot) return
        this.scene.updateMatrixWorld(true)
        const bone = anchor as THREE.Bone
        const side = this.modelSize.y * 0.13
        const ws = new THREE.Vector3()
        bone.getWorldScale(ws)
        const bq = new THREE.Quaternion()
        bone.getWorldQuaternion(bq)
        // GIỮA NGỰC theo tỉ lệ CƠ THỂ (52% chiều cao từ chân lên) — KHÔNG bám gốc xương
        // Torso: gốc xương đó nằm ở tầm BỤNG (bằng chứng: quyển vở ghi chép đặt tại
        // (0,-0.02,0.36) hệ xương này hiển thị đúng trên đùi) nên bám nó là logo tụt bụng.
        const chestY = this.modelMinY + this.modelSize.y * 0.52
        const castZ = (y: number): number | null => {
            const caster = new THREE.Raycaster(
                new THREE.Vector3(0, y, this.modelFrontZ + 1),
                new THREE.Vector3(0, 0, -1),
            )
            const hit = caster.intersectObject(this.modelRoot as THREE.Object3D, true)[0]
            return hit ? hit.point.z : null
        }
        const dy = side * 0.4
        const zTop = castZ(chestY + dy)
        const zBot = castZ(chestY - dy)
        const zMid = zTop != null && zBot != null ? (zTop + zBot) / 2 : (castZ(chestY) ?? this.modelFrontZ)
        // Độ dốc ngực: mặt logo xoay quanh X để ỐP theo bề mặt (đứng thẳng → 0).
        const tilt = zTop != null && zBot != null ? Math.atan2(zTop - zBot, dy * 2) : 0
        const planeQuat = bq
            .clone()
            .invert()
            .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)))
        const chest = new THREE.Vector3(0, chestY, zMid + side * 0.03)
        this.logoLocal = {
            pos: bone.worldToLocal(chest).clone(),
            quat: planeQuat,
            sx: side / (ws.x || 1),
            sy: side / (ws.y || 1),
        }
    }

    /** URL logo hiệu lực: ưu tiên logo TUỲ CHỈNH (data URL) rồi tới logo mặc định (asset). */
    private effectiveLogoUrl(): string | null {
        return this.logoDataUrl ?? this.defaultLogoUrl ?? null
    }

    /**
     * Hiện/ẩn & THAY logo trên ngực. Gỡ logo cũ (giải phóng texture) rồi gắn logo mới lên điểm
     * neo để logo THEO thân khi robot cử động. `show=false` hoặc thiếu URL → chỉ gỡ, không gắn.
     */
    private applyLogo(show: boolean, url: string | null): void {
        if (this.logoPlane) {
            this.logoPlane.parent?.remove(this.logoPlane)
            const old = this.logoPlane.material as THREE.MeshBasicMaterial
            old.map?.dispose()
            old.dispose()
            this.logoPlane.geometry.dispose()
            this.logoPlane = null
        }
        const anchor = this.logoAnchor
        if (!show || !url || !anchor) return
        const tex = new THREE.TextureLoader().load(
            url,
            (loaded) => {
                // Giữ ĐÚNG tỉ lệ ảnh: co chiều dài hơn về khung 0.22 (logo chữ nhật
                // không bị kéo méo thành vuông như trước).
                const img = loaded.image as { width: number; height: number } | undefined
                if (!img || !img.width || !img.height || !this.logoPlane) return
                // Đổi logo liên tiếp: chỉ chỉnh khi plane hiện tại vẫn dùng đúng texture này
                if ((this.logoPlane.material as THREE.MeshBasicMaterial).map !== loaded) return
                const aspect = img.width / img.height
                const base = this.logoPlane.userData.baseScale as { x: number; y: number } | undefined
                if (!base) return
                if (aspect >= 1) this.logoPlane.scale.set(base.x, base.y / aspect, 1)
                else this.logoPlane.scale.set(base.x * aspect, base.y, 1)
            },
            undefined,
            () => {
                /* thiếu/hỏng asset logo → bỏ qua, không phát lỗi console */
            },
        )
        tex.colorSpace = THREE.SRGBColorSpace
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
        plane.renderOrder = 999 // luôn vẽ đè lên ngực
        // Cạnh logo ~15% chiều cao robot — thấy rõ nhưng không lấn át.
        const side = this.modelSize.y * 0.15
        if ((anchor as THREE.Bone).isBone && this.logoLocal) {
            // Dùng CHỖ ĐẶT đã đo & cache ở bind pose (computeLogoPlacement) — chuẩn giữa
            // ngực, dán sát và ốp theo bề mặt, bất kể lúc này robot đang diễn animation gì.
            plane.scale.set(this.logoLocal.sx, this.logoLocal.sy, 1)
            plane.quaternion.copy(this.logoLocal.quat)
            plane.position.copy(this.logoLocal.pos)
        } else {
            plane.scale.set(side, side, 1)
            plane.position.set(0, 1.3, 0.32)
        }
        plane.userData.baseScale = { x: plane.scale.x, y: plane.scale.y }
        anchor.add(plane)
        this.logoPlane = plane
    }

    /** Đổi CỠ robot (%) — biến đổi scale trên lớp `frame`, KHÔNG đụng hiệu ứng bay ở host. */
    private applyScale(percent: number): void {
        const s = clamp(percent, 40, 200) / 100
        this.frame.style.transform = `scale(${s})`
    }

    /**
     * Áp DIỆN MẠO mới lúc runtime (lệnh `appearance` từ web-admin) — dùng chung content & popup.
     * Cỡ áp ngay; màu/logo chỉ áp khi model đã tải (chưa tải thì cấu hình đã lưu, load xong tự áp).
     */
    setAppearance(a: RobotAppearanceInput): void {
        this.brandColorHex = parseHexColor(a.color) ?? VNPT_BLUE
        this.scalePercent = a.scale
        this.showLogo = a.showLogo
        this.logoDataUrl = a.logoDataUrl
        this.applyScale(this.scalePercent)
        if (this.loaded) {
            this.applyBrandColor(this.brandColorHex)
            this.applyLogo(this.showLogo, this.effectiveLogoUrl())
        }
    }

    /** Ghi lại xương đầu & cổ để "nhìn theo chuột" (xoay cộng đè lên animation mỗi frame). */
    private captureBones(model: THREE.Object3D): void {
        model.traverse((obj) => {
            const bone = obj as THREE.Bone
            if (!bone.isBone) return
            if (bone.name === 'Head') this.head = bone
            else if (bone.name === 'Neck') this.neck = bone
        })
    }

    /**
     * Con trỏ di chuyển → tính hướng liếc mắt (đầu/cổ) tương đối tâm khung robot. `passive`
     * nên không cản cuộn trang. Dấu trục: chuột bên PHẢI/ DƯỚI → đầu quay phải/cúi (trục Y+
     * xoay mặt về +X = phải màn hình; trục X+ cúi xuống) — chỉnh dấu ở đây nếu cần.
     */
    private onPointerMove = (event: PointerEvent): void => {
        if (!this.head || this.disposed) return
        const r = this.host.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        const cx = r.left + r.width / 2
        const cy = r.top + r.height * 0.34 // đầu nằm ở phần TRÊN khung
        const nx = clamp((event.clientX - cx) / 260, -1, 1)
        const ny = clamp((event.clientY - cy) / 260, -1, 1)
        this.gazeTargetYaw = nx * ThreeRobotScene.GAZE_YAW_MAX
        this.gazeTargetPitch = ny * ThreeRobotScene.GAZE_PITCH_MAX
    }

    /**
     * Xoay đầu/cổ về hướng liếc (nội suy mượt), cộng ĐÈ sau `mixer.update`. Ngủ → thôi liếc.
     *
     * Chống XOAY VÒNG VÔ HẠN: mỗi frame GỠ lượng liếc đã cộng frame trước (`applied*`) rồi
     * mới cộng lượng mới, nên KHÔNG tích luỹ.
     *  - Clip nền KHÔNG animate xương đầu (Idle…): xương giữ nguyên giá trị ta để lại →
     *    gỡ-rồi-cộng cho ra `gốc + liếc` ổn định (đầu nhìn theo chuột thật sự).
     *  - Clip CÓ animate đầu (No/Yes lắc/gật): mixer ghi đè tươi mỗi frame, lượng liếc gần
     *    như tự triệt tiêu → animation thắng, vẫn không tích luỹ.
     */
    private applyGaze(delta: number): void {
        if (!this.head) return
        const sleeping = this.restLevel === 'sleep'
        // Ngủ / ghi chép đều CÚI đầu nhìn xuống (không liếc theo chuột).
        const lookDown = sleeping || this.writing
        const ty = lookDown ? 0 : this.gazeTargetYaw
        // Ngủ → đầu RŨ XUỐNG (gục đầu); ghi chép → cúi nhìn quyển vở; còn lại nhìn theo chuột.
        const tx = sleeping
            ? ThreeRobotScene.SLEEP_HEAD_NOD
            : this.writing
              ? ThreeRobotScene.WRITE_HEAD_NOD
              : this.gazeTargetPitch
        const k = Math.min(1, delta * 6)
        this.gazeYaw += (ty - this.gazeYaw) * k
        this.gazePitch += (tx - this.gazePitch) * k
        // Giật NGỬA đầu khi va màn hình rồi phân rã NHANH về 0 (gộp vào lượng "đã cộng" để
        // không tích luỹ như phần liếc mắt).
        if (this.headBonk !== 0) {
            this.headBonk += (0 - this.headBonk) * Math.min(1, delta * 7)
            if (Math.abs(this.headBonk) < 0.002) this.headBonk = 0
        }
        const effYaw = this.gazeYaw
        const effPitch = this.gazePitch + this.headBonk
        const dYaw = effYaw - this.appliedYaw
        const dPitch = effPitch - this.appliedPitch
        this.head.rotation.y += dYaw
        this.head.rotation.x += dPitch
        if (this.neck) {
            this.neck.rotation.y += dYaw * 0.35
            this.neck.rotation.x += dPitch * 0.35
        }
        this.appliedYaw = effYaw
        this.appliedPitch = effPitch
    }

    /** Tìm mesh đầu có morph biểu cảm và ghi chỉ số của Angry/Surprised/Sad. */
    private setupMorph(model: THREE.Object3D): void {
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            const dict = mesh.morphTargetDictionary
            if (!dict || !('Sad' in dict)) return
            this.headMorph = {
                mesh,
                index: { Angry: dict['Angry'], Surprised: dict['Surprised'], Sad: dict['Sad'] },
            }
        })
    }

    // -----------------------------------------------------------------
    // ICON TRẠNG THÁI bay lên từ đỉnh đầu
    // -----------------------------------------------------------------

    /** Cỡ, quãng bay và nhịp thả icon — gom một chỗ cho dễ chỉnh. */
    private static readonly ICON = {
        /** Bề ngang sprite theo chiều cao model. */
        scale: 0.3,
        /** Bay lên cao bằng ngần này lần chiều cao model rồi tan. */
        rise: 0.85,
        /** Sống bao lâu (giây). */
        span: 1.7,
        /** Cách mấy giây thả một cái (trạng thái bám dài như "…" và 💤 thả liên tục). */
        every: 0.85,
        /** Lượn ngang theo bề ngang model cho khỏi bay thẳng đơ. */
        sway: 0.16,
        /** Cỡ canvas vẽ icon (px). */
        texture: 128,
    }

    /** Ghi mốc treo icon sau khi biết cỡ model (chưa thả icon nào). */
    private prepareIcons(): void {
        this.bubbleCanvas.width = ThreeRobotScene.ICON.texture
        this.bubbleCanvas.height = ThreeRobotScene.ICON.texture
        this.bubbleBaseY = this.modelTopY + this.modelSize.y * 0.14
        this.iconsReady = true
        // Hiệu số ĐẦU→ICON đo ở bind pose (đang đứng): về sau icon bay lên từ xương đầu +
        // hiệu số này → ngồi/té thì thấp xuống, nhảy thì cao lên theo.
        if (this.head && this.stage) {
            this.scene.updateMatrixWorld(true)
            this.head.getWorldPosition(this.tmpHead)
            this.stage.worldToLocal(this.tmpHead)
            this.bubbleHeadOffsetY = this.bubbleBaseY - this.tmpHead.y
        }
    }

    /** Vân icon (dùng lại cho mọi lần thả cùng loại) — vẽ TRẦN, không khung bong bóng. */
    private iconTexture(kind: Exclude<BubbleKind, null>, phase: number): THREE.CanvasTexture | null {
        const key = kind === 'dots' ? `dots${phase % 3}` : kind
        const cached = this.iconTextures.get(key)
        if (cached) return cached

        const ctx = this.bubbleCanvas.getContext('2d')
        if (!ctx) return null
        const size = ThreeRobotScene.ICON.texture
        ctx.clearRect(0, 0, size, size)
        // Viền sáng mỏng quanh nét vẽ để icon nổi trên mọi nền trang (trang trắng lẫn tối).
        ctx.shadowColor = 'rgba(255,255,255,0.9)'
        ctx.shadowBlur = 10
        if (kind === 'dots') {
            for (let i = 0; i < 3; i++) {
                const active = i === phase % 3
                ctx.fillStyle = active ? '#2456c4' : 'rgba(36,86,196,0.4)'
                ctx.beginPath()
                ctx.arc(size * 0.22 + i * size * 0.28, size / 2, size * (active ? 0.11 : 0.09), 0, Math.PI * 2)
                ctx.fill()
            }
        } else {
            const icon = { ask: '💬', write: '✍️', ok: '✔️', party: '🎉', warn: '⚠️', err: '❗', fail: '❌', zzz: '💤' }[
                kind
            ]
            ctx.font = `${Math.round(size * 0.74)}px "Segoe UI Emoji", sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(icon, size / 2, size / 2)
        }
        ctx.shadowBlur = 0
        // Sao chép ra ảnh riêng: canvas dùng chung sẽ bị lần vẽ sau ghi đè.
        const texture = new THREE.CanvasTexture(ThreeRobotScene.snapshot(this.bubbleCanvas))
        texture.needsUpdate = true
        this.iconTextures.set(key, texture)
        return texture
    }

    /** Bản sao ảnh của canvas (canvas vẽ icon dùng chung nên phải chụp lại từng vân). */
    private static snapshot(source: HTMLCanvasElement): HTMLCanvasElement {
        const copy = document.createElement('canvas')
        copy.width = source.width
        copy.height = source.height
        copy.getContext('2d')?.drawImage(source, 0, 0)
        return copy
    }

    /** Thả MỘT icon bay lên từ đỉnh đầu. */
    private spawnIcon(kind: Exclude<BubbleKind, null>): void {
        if (!this.stage || !this.iconsReady) return
        const texture = this.iconTexture(kind, this.dotPhase)
        if (!texture) return
        if (kind === 'dots') this.dotPhase += 1 // mỗi lần thả sáng một chấm khác → như đang gõ "…"

        // depthTest:false + renderOrder cao → icon không bao giờ bị thân robot che
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
        const sprite = new THREE.Sprite(material)
        sprite.renderOrder = 998
        const scale = this.modelSize.y * ThreeRobotScene.ICON.scale
        sprite.scale.set(scale, scale, 1)
        sprite.position.set(0, this.bubbleBaseY, 0)
        if (this.head && this.stage) {
            this.head.getWorldPosition(this.tmpHead)
            this.stage.worldToLocal(this.tmpHead)
            sprite.position.set(this.tmpHead.x, this.tmpHead.y + this.bubbleHeadOffsetY, this.tmpHead.z)
        }
        this.stage.add(sprite)
        this.icons.push({ sprite, life: 0, span: ThreeRobotScene.ICON.span, scale, sway: this.icons.length % 2 ? -1 : 1 })
    }

    /** Đổi loại icon đang thả; null → thôi thả (icon đang bay vẫn bay nốt cho tự nhiên). */
    private setBubble(kind: BubbleKind): void {
        if (kind === this.bubbleKind) return // typing bắn theo từng phím — khỏi thả dồn
        this.bubbleKind = kind
        this.emitTimer = 0 // thả ngay cái đầu tiên, không đợi hết nhịp
    }

    /** Thả icon theo nhịp + đưa các icon đang bay lên cao, nhỏ dần rồi tan. */
    private updateIcons(delta: number): void {
        const cfg = ThreeRobotScene.ICON
        if (this.bubbleKind !== null) {
            if (this.bubbleTtl > 0) {
                this.bubbleTtl -= delta
                if (this.bubbleTtl <= 0) this.bubbleKind = null // hết hạn → thôi thả ("…" và 💤 ttl=0 nên bám)
            }
            if (this.bubbleKind !== null) {
                this.emitTimer -= delta
                if (this.emitTimer <= 0) {
                    this.spawnIcon(this.bubbleKind)
                    this.emitTimer = cfg.every
                }
            }
        }

        for (let i = this.icons.length - 1; i >= 0; i--) {
            const icon = this.icons[i]
            icon.life += delta
            const t = icon.life / icon.span
            if (t >= 1) {
                this.stage?.remove(icon.sprite)
                ;(icon.sprite.material as THREE.SpriteMaterial).dispose()
                this.icons.splice(i, 1)
                continue
            }
            // Bung ra rồi nhỏ dần; mờ dần ở nửa sau quãng bay.
            const pop = Math.min(1, t / 0.16)
            const size = icon.scale * (0.55 + 0.45 * pop) * (1 - 0.5 * t)
            icon.sprite.scale.set(size, size, 1)
            icon.sprite.position.y += this.modelSize.y * cfg.rise * (delta / icon.span)
            icon.sprite.position.x += this.modelSize.x * cfg.sway * icon.sway * (delta / icon.span)
            ;(icon.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, pop, (1 - t) / 0.45)
        }
    }

    // -----------------------------------------------------------------
    // PHÁO HOA CẦM TAY (ăn mừng)
    // -----------------------------------------------------------------

    /** Bắn MỘT phát pháo hoa từ phía tay (đổi tay mỗi phát): chùm hạt toé ra + rơi + tan. */
    private spawnFirework(): void {
        if (!this.stage) return
        const palette = [0xffd166, 0xff5d8f, 0x4dd0ff, 0x7cff6b, 0xff9f43, 0xc792ff]
        const color = palette[Math.floor(Math.random() * palette.length)]
        this.fireworkSide = -this.fireworkSide
        const h = this.modelSize.y
        // Gốc bắn: ngang vai, lệch về một tay, hơi nhô ra trước
        const origin = new THREE.Vector3(this.fireworkSide * this.modelSize.x * 0.42, h * 0.62, this.modelSize.z * 0.25)
        const n = 34
        const positions = new Float32Array(n * 3)
        const vel = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) {
            positions[i * 3] = origin.x
            positions[i * 3 + 1] = origin.y
            positions[i * 3 + 2] = origin.z
            // Hướng toé: nửa cầu hướng LÊN cho giống pháo hoa cầm tay
            const theta = Math.random() * Math.PI * 2
            const up = 0.35 + Math.random() * 0.65
            const planar = Math.sqrt(Math.max(0, 1 - up * up))
            const speed = h * (0.35 + Math.random() * 0.45)
            vel[i * 3] = Math.cos(theta) * planar * speed
            vel[i * 3 + 1] = up * speed
            vel[i * 3 + 2] = Math.sin(theta) * planar * speed * 0.6
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const mat = new THREE.PointsMaterial({
            color,
            size: h * 0.035,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
        const points = new THREE.Points(geo, mat)
        points.renderOrder = 996
        this.stage.add(points)
        this.fireworks.push({ points, vel, life: 0, max: 0.9 + Math.random() * 0.4 })
    }

    /** Cập nhật hạt pháo hoa mỗi frame: bay + rơi (trọng lực) + mờ dần; hết đời thì dọn. */
    private updateFireworks(delta: number): void {
        for (let f = this.fireworks.length - 1; f >= 0; f--) {
            const fw = this.fireworks[f]
            fw.life += delta
            const attr = fw.points.geometry.getAttribute('position') as THREE.BufferAttribute
            const arr = attr.array as Float32Array
            const g = this.modelSize.y * 1.1 // trọng lực theo cỡ model
            for (let i = 0; i < fw.vel.length / 3; i++) {
                fw.vel[i * 3 + 1] -= g * delta
                arr[i * 3] += fw.vel[i * 3] * delta
                arr[i * 3 + 1] += fw.vel[i * 3 + 1] * delta
                arr[i * 3 + 2] += fw.vel[i * 3 + 2] * delta
            }
            attr.needsUpdate = true
            const mat = fw.points.material as THREE.PointsMaterial
            mat.opacity = Math.max(0, 1 - fw.life / fw.max)
            if (fw.life >= fw.max) {
                this.stage?.remove(fw.points)
                fw.points.geometry.dispose()
                mat.dispose()
                this.fireworks.splice(f, 1)
            }
        }
    }

    // -----------------------------------------------------------------
    // Điều khiển trạng thái
    // -----------------------------------------------------------------

    setState(state: SceneState): void {
        // Model chưa tải xong → nhớ trạng thái mới nhất, áp khi sẵn sàng.
        if (!this.mixer) {
            this.pendingState = state
            return
        }
        this.celebrateTimer = 0
        this.fireworkBursts = 0 // đổi trạng thái → thôi bắn tiếp (hạt đang bay tự tan)
        this.ambient = 'off' // đổi trạng thái → dừng chu kỳ hoạt động nền (nếu có)
        this.headBonk = 0 // có việc thật → thôi ngửa đầu (nếu đang giữa màn "va màn hình")
        this.clearLocomotion() // đưa robot về chỗ gốc trước khi diễn trạng thái mới
        // Rời trạng thái 'typing' → CẤT viết/vở nếu đang ghi chép (switch bên dưới sẽ chọn tư thế mới).
        if (this.writing && state !== 'typing') this.stopWriting()
        this.current = state
        this.restLevel = 'awake' // có việc → tỉnh (thoát ngồi/nằm/ngủ)
        this.restTimer = 0 // chỉ trạng thái idle mới hẹn ngồi nghỉ (bên dưới)
        this.setBubble(BUBBLE_FOR_STATE[state] ?? null) // icon trên đầu theo trạng thái
        // Chỉ "suy nghĩ" (…) bám tới khi có kết quả; icon kết quả/chào/gõ TỰ ẨN sau vài giây.
        this.bubbleTtl = state === 'thinking' ? 0 : 3

        switch (state) {
            case 'idle':
                this.setFace(null)
                this.setBase('Idle')
                this.startAmbient('idle') // lúc rảnh vẫn thỉnh thoảng cựa quậy cho "sống"
                // Rảnh quá lâu → ngồi thụp rồi nằm ngủ (chỉ bản tương tác mới đánh thức được).
                if (this.interactive) this.restTimer = ThreeRobotScene.IDLE_TO_SIT_S
                break
            case 'listening':
                this.setFace(null)
                this.setBase('Idle')
                this.playEmote('Wave')
                break
            case 'typing':
                // Người dùng nhập liệu → robot ngồi xuống cầm viết + vở ghi chép (chỉ ở content).
                // setState('typing') bắn theo TỪNG phím; giữ liền mạch, không giật theo phím:
                //  - đang ghi chép rồi → cứ tiếp tục (không khởi động lại timer/tư thế);
                //  - vừa bắt đầu gõ & hết cooldown → ngồi xuống ghi chép;
                //  - trong lúc "chán" (cooldown) hoặc popup → chỉ gật nhẹ "Yes".
                this.setFace(null)
                if (this.writing) break
                if (this.interactive && this.writeCooldown <= 0) this.enterWriting()
                else if (this.isAtBase()) this.playEmote('Yes')
                break
            case 'thinking':
                this.setFace(null)
                if (this.waitRandom) {
                    this.startAmbient('wait') // đổi hoạt động ngẫu nhiên trong lúc chờ
                } else {
                    this.setBase('Walking') // "đang xử lý" — bước tại chỗ
                }
                break
            case 'happy': {
                this.setFace(null)
                this.setBase('Idle')
                // Vui có KẾT QUẢ: random một cách thể hiện cho đỡ nhàm.
                const cheers: EmoteClip[] = ['ThumbsUp', 'Yes', 'Jump']
                this.playEmote(cheers[Math.floor(Math.random() * cheers.length)])
                break
            }
            case 'celebrate': {
                this.setFace(null)
                // ĂN MỪNG: random một trong nhiều màn — có màn BẮN PHÁO HOA CẦM TAY 🎆
                const variant = Math.floor(Math.random() * 3)
                if (variant === 0) {
                    this.setBase('Dance') // nhảy múa như cũ
                } else if (variant === 1) {
                    // Nhảy cẫng + pháo hoa bắn liên tiếp từ tay (đổi tay mỗi phát)
                    this.setBase('Idle')
                    this.playEmote('Jump')
                    this.fireworkBursts = 5
                    this.fireworkTimer = 0.25
                } else {
                    // Giơ ngón cái + hai phát pháo hoa chốt hạ
                    this.setBase('Idle')
                    this.playEmote('ThumbsUp')
                    this.fireworkBursts = 3
                    this.fireworkTimer = 0.6
                }
                this.celebrateTimer = 3.2 // vài giây rồi tự về Idle
                break
            }
            case 'confused':
                this.setFace('Surprised')
                this.setBase('Idle')
                this.playEmote('No') // lắc đầu
                break
            case 'sad':
                this.setFace('Sad')
                this.setBase('Sitting') // buồn thì ngồi thụp xuống
                break
            case 'pointError':
                // Lỗi CỤC BỘ tự sửa được: robot đứng thẳng, "đấm" dứt khoát chỉ ra lỗi + mặt
                // ngạc nhiên — khác `sad` (AI hỏng, ngồi thụp). Ánh xạ trạng thái PointError SVG.
                this.setFace('Surprised')
                this.setBase('Idle')
                this.playEmote('Punch')
                break
        }
    }

    /** Bật/tắt chế độ chờ NGẪU NHIÊN (task-005) — do cấu hình web-admin quyết định. */
    setWaitRandom(random: boolean): void {
        this.waitRandom = random
    }

    /** Rê chuột vào robot: đang ngồi/nằm ngủ → tỉnh dậy; đang rảnh → vẫy tay chào (Hover SVG). */
    private onHover(): void {
        if (this.restLevel !== 'awake') {
            this.wake()
        } else if (this.current === 'idle' && this.isAtBase()) {
            this.playEmote('Wave')
            // Rê chuột cũng tính là "có tương tác" → hoãn giờ ngồi nghỉ.
            this.restTimer = ThreeRobotScene.IDLE_TO_SIT_S
        }
    }

    /** Rảnh quá lâu giai đoạn 1: dừng đi dạo rồi NGỒI thụp nghỉ NGAY chỗ đang đứng; hẹn giai đoạn 2 (ngủ). */
    private enterSit(): void {
        this.restLevel = 'sit'
        this.ambient = 'off'
        this.settleInPlace() // ngồi NGAY chỗ đang đứng ("ở trong phòng") — KHÔNG kéo về gốc
        // Chọn NGẪU NHIÊN hướng ngồi (không cố định chính diện): vòng lặp rAF xoay thân MƯỢT từ
        // hướng hiện tại sang hướng này.
        const f = ThreeRobotScene.REST_FACINGS
        this.restRotY = f[Math.floor(Math.random() * f.length)]
        this.setFace(null)
        this.setBase('Sitting') // ngồi nghỉ
        this.restTimer = ThreeRobotScene.SIT_TO_SLEEP_S // ngồi thêm một lúc thì nằm ngủ
    }

    /**
     * Rảnh quá lâu giai đoạn 2: GỤC ĐẦU NGỦ — vẫn NGỒI (Sitting) nhưng đầu rũ xuống (lo bởi
     * applyGaze khi restLevel='sleep'), cho ra dáng thiu thiu ngủ. KHÔNG dùng Death nữa (trước
     * đây robot "ngã dúi", không giống ngủ). Hẹn giờ TỰ tỉnh để robot không nằm lì mãi.
     */
    private enterSleep(): void {
        this.restLevel = 'sleep'
        this.ambient = 'off'
        this.settleInPlace() // gục ngủ NGAY chỗ đang ngồi — giữ nguyên vị trí, KHÔNG kéo về gốc
        // GIỮ nguyên hướng đã ngồi (restRotY không đổi, vòng lặp rAF vẫn nội suy về nó) → gục đầu cùng hướng.
        this.setFace(null)
        this.setBase('Sitting') // giữ ngồi; đầu rũ xuống → "gục đầu ngủ"
        this.setBubble('zzz') // 💤 trên đầu cho biết đang ngủ
        this.bubbleTtl = 0 // 💤 bám suốt giấc ngủ (wake() sẽ tự đổi icon)
        this.restTimer = ThreeRobotScene.SLEEP_TO_WAKE_S // ngủ một lúc rồi tự tỉnh dậy
        // Đôi khi đang gục đầu ngủ thì "té ra": hẹn một mốc ngẫu nhiên trong giấc để đổ người (Death).
        this.sleepFallTimer =
            Math.random() < ThreeRobotScene.SLEEP_FALL_CHANCE ? 2 + Math.random() * 4 : 0
    }

    /** Bật dậy sau khi nghỉ: đứng lên NGAY chỗ đang nghỉ, GIỮ đúng hướng đang ngồi/gục/té rồi nhảy một cái. */
    private wake(): void {
        const facing = this.restRotY // hướng đang nghỉ — bật dậy phải CÙNG hướng đó mới hợp lý
        this.restLevel = 'awake'
        this.settleInPlace() // đứng dậy NGAY chỗ đang nghỉ — KHÔNG kéo về gốc
        if (this.stage) this.stage.rotation.y = facing // 'awake' → loop thôi nội suy hướng nghỉ; tự chốt hướng tại đây
        this.setBubble(BUBBLE_FOR_STATE[this.current] ?? null) // hết ngủ → trả icon theo trạng thái
        this.bubbleTtl = this.current === 'thinking' ? 0 : 3
        this.setBase('Idle')
        this.playEmote('Jump')
        this.startAmbient('idle')
        this.restTimer = ThreeRobotScene.IDLE_TO_SIT_S
    }

    /**
     * Dựng props "GHI CHÉP" một lần: QUYỂN VỞ (tấm phẳng) + CÂY VIẾT (trụ mảnh), gộp vào một nhóm gắn
     * lên điểm neo NGỰC (`logoAnchor` = xương Torso — theo thân khi ngồi). Ẩn sẵn; enterWriting mới hiện.
     * Toạ độ theo hệ xương (giống logo ngực) — đặt hơi THẤP & TRƯỚC bụng cho ra dáng để vở trên đùi.
     */
    private ensureWriteProps(): void {
        if (this.writeProps || !this.logoAnchor) return
        const anchor = this.logoAnchor
        const isBone = (anchor as THREE.Bone).isBone
        const group = new THREE.Group()
        // Quyển vở: tấm phẳng hơi ngả về robot (như kẹp hồ sơ đặt trên đùi).
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.02, 0.22),
            new THREE.MeshStandardMaterial({ color: 0xf7f7fa, roughness: 0.9 }),
        )
        book.rotation.x = -0.95
        book.renderOrder = 998
        group.add(book)
        // Cây viết: trụ mảnh màu xanh, chếch chéo, tì trên vở; hí hoáy trong updateWriting.
        const pen = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x1c3d8f, roughness: 0.5 }),
        )
        pen.rotation.set(-0.5, 0, 0.9)
        pen.position.set(0.02, 0.06, 0.02)
        pen.renderOrder = 999
        group.add(pen)
        // Vị trí nhóm theo hệ neo: xương Torso (giống logo (0,0.15,0.3)) → thấp & trước hơn cho "để trên đùi".
        if (isBone) group.position.set(0, -0.02, 0.36)
        else group.position.set(0, 1.05, 0.4)
        group.visible = false
        anchor.add(group)
        this.writeProps = group
        this.penMesh = pen
    }

    /** Người dùng nhập liệu → NGỒI xuống cầm viết + vở ghi chép; hẹn "chán" để tự đứng dậy. */
    private enterWriting(): void {
        this.ensureWriteProps()
        if (!this.writeProps) return // thiếu neo/model → bỏ qua, robot vẫn ở trạng thái 'typing' bình thường
        this.writing = true
        this.writeTimer = ThreeRobotScene.WRITE_BORED_S
        this.writePhase = 0
        this.setFace(null)
        this.setBase('Sitting') // ngồi xuống ghi chép (đang ở chỗ gốc, chính diện sau clearLocomotion)
        this.writeProps.visible = true
    }

    /** Thôi ghi chép: cất viết + vở. KHÔNG đổi base ở đây (nơi gọi tự chọn tư thế kế tiếp). */
    private stopWriting(): void {
        this.writing = false
        if (this.writeProps) this.writeProps.visible = false
    }

    /** Hí hoáy ngòi viết qua lại (dao động nhỏ theo `writePhase`) cho ra dáng đang ghi chép. */
    private updateWriting(delta: number): void {
        this.writePhase += delta * 9 // tốc độ hí hoáy
        const pen = this.penMesh
        if (!pen) return
        pen.position.x = 0.02 + Math.sin(this.writePhase) * 0.03 // đưa ngang
        pen.position.z = 0.02 + Math.sin(this.writePhase * 0.6) * 0.015 // nhích tới lui
        pen.rotation.z = 0.9 + Math.sin(this.writePhase * 1.3) * 0.12 // rung nhẹ tay
    }

    /**
     * Công tắc bật/tắt cho robot CONTENT (góc trang HIS). Robot content TỚI chỗ khi BẬT,
     * RỜI chỗ (bay LÊN toolbar) khi TẮT. Lần áp đầu (mở trang, đang bật) bay vào ngay;
     * các lần bật sau là chuyển-nhà nên đợi robot popup bay-ra trước (`LEAVE_MS`).
     */
    setEnabled(enabled: boolean): void {
        this.headBonk = 0 // đổi bật/tắt → thôi ngửa đầu nếu đang giữa màn "va màn hình"
        this.avoidance?.setEnabled(enabled) // đang bay ra/vào thì nhường transform cho chặng bay
        if (enabled) {
            // Chỉ khi NGƯỜI DÙNG chủ động bật lại (không phải lần mount đầu mở trang) mới diễn
            // cú tiếp đất bằng NGÃ (Death) — tránh robot "té" mỗi lần tải trang.
            const toggled = this.enabledApplied
            this.flyIn({ delayMs: toggled ? ThreeRobotScene.LEAVE_MS : 0, deathLand: toggled })
        } else {
            this.flyOut({ dir: 'up' })
        }
        this.enabledApplied = true
    }

    /**
     * BAY RỚT XUỐNG khi TỚI chỗ (ánh xạ "rơi xuống chỗ làm việc"): thả từ trên xuống, nảy
     * nhẹ rồi tiếp đất + nhảy chào. `delayMs` > 0 → đứng ẩn chờ robot bên kia bay-ra xong
     * mới thả xuống (chuyển nhà không chồng chéo). WAAPI chạy trên host nên áp cả content
     * (fixed) lẫn sân khấu popup.
     */
    flyIn(opts: { delayMs?: number; deathLand?: boolean } = {}): void {
        const delay = Math.max(0, opts.delayMs ?? 0)
        this.host.style.display = ''
        this.cancelHostAnim()
        if (delay > 0) this.host.style.opacity = '0' // ẩn trong lúc chờ, không đứng lơ lửng
        const anim = this.host.animate(
            [
                { transform: 'translateY(-170%)', opacity: 0, offset: 0 },
                { transform: 'translateY(8%)', opacity: 1, offset: 0.72 },
                { transform: 'translateY(-4%)', opacity: 1, offset: 0.88 },
                { transform: 'translateY(0)', opacity: 1, offset: 1 },
            ],
            { duration: 720, delay, easing: 'cubic-bezier(0.34,1.3,0.64,1)', fill: 'both' },
        )
        anim.onfinish = (): void => {
            if (this.disposed) return
            this.host.style.transform = ''
            this.host.style.opacity = ''
        }
        if (this.mixer) {
            this.setState('idle')
            // TIẾP ĐẤT sau "rơi từ trên cao xuống". Khi người dùng CHỦ ĐỘNG bật lại
            // (deathLand) → tiếp đất bằng cú NGÃ (Death) rồi TỰ đứng dậy (emote xong tự
            // mờ về Idle). Lần mount đầu (mở trang) chỉ nhún nhẹ (Jump) — không "té" mỗi
            // lần tải trang. Đúng lúc chạm sàn (sau delay + ~72% chặng bay).
            const land: EmoteClip = opts.deathLand ? 'Death' : 'Jump'
            this.flyLandTimer = window.setTimeout(() => {
                this.flyLandTimer = 0
                if (!this.disposed && this.mixer) this.playEmote(land)
            }, delay + 520)
        }
    }

    /**
     * BAY RA khi RỜI chỗ (ánh xạ "bay về nhà"): nhích một đoạn theo `dir` rồi vọt hẳn ra +
     * mờ dần, xong mới ẩn. Content bay LÊN (về toolbar), popup bay XUỐNG (về trang).
     * `onDone` gọi sau khi ẩn để bên gọi dọn nốt (vd popup ẩn cả khu "ngôi nhà").
     */
    flyOut(opts: { dir?: FlyOutDir; onDone?: () => void } = {}): void {
        const dir = opts.dir ?? 'up'
        this.cancelHostAnim()
        if (!this.mixer) {
            this.host.style.display = 'none'
            opts.onDone?.()
            return
        }
        const sign = dir === 'up' ? -1 : 1
        const anim = this.host.animate(
            [
                { transform: 'translateY(0)', opacity: 1, offset: 0 },
                { transform: `translateY(${sign * 16}%)`, opacity: 1, offset: 0.25 },
                { transform: `translateY(${sign * 170}%)`, opacity: 0, offset: 1 },
            ],
            { duration: 680, easing: 'cubic-bezier(0.45,0,0.65,1)', fill: 'forwards' },
        )
        anim.onfinish = (): void => {
            if (this.disposed) return
            this.host.style.display = 'none'
            this.host.style.transform = ''
            this.host.style.opacity = ''
            opts.onDone?.()
        }
    }

    /** Huỷ mọi animation "bay" còn treo trên host + hẹn nhảy tiếp đất để không chồng chéo. */
    private cancelHostAnim(): void {
        if (this.flyLandTimer) {
            window.clearTimeout(this.flyLandTimer)
            this.flyLandTimer = 0
        }
        for (const a of this.host.getAnimations()) {
            try {
                a.cancel()
            } catch {
                /* animation đã kết thúc — bỏ qua */
            }
        }
    }

    // -----------------------------------------------------------------
    // Máy animation
    // -----------------------------------------------------------------

    /** Đang diễn clip nền (không phải emote một-lần)? */
    private isAtBase(): boolean {
        return this.activeAction === this.actions.get(this.baseName)
    }

    /**
     * Đặt clip nền (đổi mượt qua crossfade). Nền thường thì LẶP; nền dạng GIỮ POSE (Sitting)
     * diễn một lần rồi clamp — và nếu đang giữ đúng pose đó thì KHỎI diễn lại (tránh lặp clip
     * → giật). Xem `HELD_BASES`.
     */
    private setBase(name: BaseClip): void {
        const held = ThreeRobotScene.HELD_BASES.has(name)
        if (held && name === this.baseName && this.isAtBase()) return
        this.baseName = name
        this.fadeTo(name, 0.35, held)
    }

    /** Diễn một emote một-lần; xong sẽ tự mờ về clip nền qua sự kiện `finished`. */
    private playEmote(name: EmoteClip, dur = 0.2): void {
        this.fadeTo(name, dur, true)
    }

    /** Bắt đầu chu kỳ hoạt động nền: 'idle' (đi dạo/xoay/suy nghĩ) hoặc 'wait' (chờ AI dồn dập). */
    private startAmbient(mode: 'idle' | 'wait'): void {
        this.ambient = mode
        if (mode === 'wait') {
            this.pickWaitMove() // chờ AI: bốc hoạt động NGAY cho thấy đang bận
        } else {
            this.scheduleAmbient() // rảnh: đứng một nhịp rồi mới bắt đầu đi dạo
        }
    }

    /** Hẹn khoảng thời gian ngẫu nhiên tới lần "đổi hoạt động" kế tiếp. */
    private scheduleAmbient(): void {
        const [min, max] =
            this.ambient === 'wait'
                ? [ThreeRobotScene.WAIT_MIN_S, ThreeRobotScene.WAIT_MAX_S]
                : [ThreeRobotScene.IDLE_MIN_S, ThreeRobotScene.IDLE_MAX_S]
        this.ambientTimer = min + Math.random() * (max - min)
    }

    /** Chờ AI: bốc ngẫu nhiên một hoạt động (chạy/ngồi/nhảy/té...) + hẹn lần kế. */
    private pickWaitMove(): void {
        const pool = ThreeRobotScene.WAIT_MOVES
        const move = pool[Math.floor(Math.random() * pool.length)]
        this.setBase(move.base)
        if (move.emote) this.playEmote(move.emote)
        this.scheduleAmbient()
    }

    // -----------------------------------------------------------------
    // Đi dạo lúc rảnh (locomotion) — di chuyển/xoay CẢ robot cho "sống"
    // -----------------------------------------------------------------

    /** Làm mượt 0→1 (smoothstep) để tăng/giảm tốc ở hai đầu chặng cho tự nhiên. */
    private smooth(p: number): number {
        return p * p * (3 - 2 * p)
    }

    /** Bắt đầu một chặng: ghi mốc xuất phát của `stage` + đổi clip/emote/mặt nếu chặng yêu cầu. */
    private startSegment(def: MoveSegment): void {
        const s = this.stage
        this.moveSeg = {
            def,
            t: 0,
            fromX: s?.position.x ?? 0,
            fromY: s?.position.y ?? 0,
            fromZ: s?.position.z ?? 0,
            fromRotY: s?.rotation.y ?? 0,
        }
        if (def.base) this.setBase(def.base)
        if (def.emote) this.playEmote(def.emote)
        if (def.face !== undefined) this.setFace(def.face)
        def.onStart?.()
    }

    /** Nội suy chặng đang chạy; xong thì lấy chặng kế trong hàng đợi (không có → đứng yên). */
    private updateLocomotion(delta: number): void {
        if (!this.moveSeg) {
            const next = this.moveQueue.shift()
            if (next) this.startSegment(next)
            return
        }
        const seg = this.moveSeg
        const s = this.stage
        seg.t += delta
        const p = seg.def.dur > 0 ? clamp(seg.t / seg.def.dur, 0, 1) : 1
        const e = seg.def.ease ? this.smooth(p) : p
        if (s) {
            if (seg.def.toX !== undefined) s.position.x = seg.fromX + (seg.def.toX - seg.fromX) * e
            if (seg.def.toY !== undefined) s.position.y = seg.fromY + (seg.def.toY - seg.fromY) * e
            if (seg.def.toZ !== undefined) s.position.z = seg.fromZ + (seg.def.toZ - seg.fromZ) * e
            if (seg.def.toRotY !== undefined) s.rotation.y = seg.fromRotY + (seg.def.toRotY - seg.fromRotY) * e
        }
        if (p >= 1) {
            this.moveSeg = null
            const next = this.moveQueue.shift()
            if (next) this.startSegment(next)
        }
    }

    /** Dừng đi dạo + đưa robot về đúng vị trí/hướng gốc (khỏi lệch khung khi ngồi/đổi trạng thái). */
    private clearLocomotion(): void {
        this.moveQueue = []
        this.moveSeg = null
        if (this.stage) {
            this.stage.position.set(0, 0, 0)
            this.stage.rotation.y = 0
        }
    }

    /**
     * Dừng đi dạo NHƯNG GIỮ nguyên vị trí/hướng hiện tại — robot nghỉ/đứng NGAY chỗ đang đứng, KHÔNG
     * kéo về gốc. Dùng cho ngồi/ngủ/bật dậy khi robot "đang ở trong phòng" (đi đâu, ngồi/ngủ đâu cũng
     * được). Chỉ khi mở hộp thoại chat mới về chỗ gốc (setState → clearLocomotion).
     */
    private settleInPlace(): void {
        this.moveQueue = []
        this.moveSeg = null
    }

    /**
     * Chuỗi chặng "đi lòng vòng trong phòng": chọn NGẪU NHIÊN một chỗ mới (chủ yếu theo chiều sâu Z để
     * chỉ nhỏ/to đi, không cắt khung + lệch ngang X vừa phải), quay mặt theo hướng đi rồi ĐI (hoặc CHẠY)
     * tới đó, ngắm quanh một chút.
     * - `ROAM_STAY_FAR = false` (mặc định): sau khi ngắm thì ĐI VỀ chỗ cũ (0,0) — tránh đứng la cà ở xa
     *   nhìn robot nhỏ xíu (không đẹp).
     * - `ROAM_STAY_FAR = true`: Ở LẠI chỗ xa la cà (đi/ngồi/ngủ ở xa) — giữ lại để sau bật dùng.
     */
    private roamSegments(): MoveSegment[] {
        const rnd = (min: number, max: number): number => min + Math.random() * (max - min)
        const curX = this.stage?.position.x ?? 0
        const curZ = this.stage?.position.z ?? 0
        const backMax = Math.max(0.5, this.modelSize.y * 1.9) // xa nhất (âm Z = lùi ra xa, nhỏ đi)
        const xr = Math.max(0.25, this.modelSize.x * 0.5) // lệch ngang vừa phải để còn trong khung
        const nz = -rnd(0, backMax)
        const nx = rnd(-xr, xr)
        const dx = nx - curX
        const dz = nz - curZ
        const dist = Math.hypot(dx, dz)
        const face = Math.atan2(dx, dz) // quay mặt theo hướng đi (forward = +Z tại rotY=0)
        const run = Math.random() < 0.35 // đôi khi CHẠY cho nhí nhố
        const speed = run ? 1.7 : 1.0 // quãng/giây → thời lượng đi theo QUÃNG ĐƯỜNG cho đều nhịp
        const walk = run ? 'Running' : 'Walking'
        const dur = Math.min(2.8, Math.max(0.6, dist / speed))
        const segs: MoveSegment[] = [
            { dur: 0.4, base: walk, toRotY: face, ease: true }, // quay hướng đi
            { dur, toX: nx, toZ: nz, ease: true }, // đi tới chỗ mới (giữ base Walking/Running khi ĐANG di chuyển)
            { dur: rnd(0.4, 1.2), base: 'Idle' }, // ĐỨNG (đổi về Idle) ngắm quanh — hết di chuyển thì DỪNG bước chân
        ]
        if (ThreeRobotScene.ROAM_STAY_FAR) {
            // LA CÀ Ở XA: chỉ quay lại nhìn ta rồi Ở LẠI chỗ xa (giữ lại cho lần dùng sau).
            segs.push({ dur: 0.5, toRotY: 0, ease: true }) // quay lại nhìn ta (vẫn đứng Idle)
            return segs
        }
        // MẶC ĐỊNH: ĐI VỀ chỗ cũ (0,0) cho robot to lại — quay hướng về nhà, đi/chạy về rồi quay chính diện.
        const faceHome = Math.atan2(0 - nx, 0 - nz) // hướng từ chỗ xa về gốc
        const durHome = Math.min(2.8, Math.max(0.6, Math.hypot(nx, nz) / speed))
        segs.push(
            { dur: 0.4, base: walk, toRotY: faceHome, ease: true }, // quay hướng về nhà (bước chân lại)
            { dur: durHome, toX: 0, toZ: 0, ease: true }, // đi về gốc — TO DẦN lại
            { dur: 0.4, base: 'Idle', toRotY: 0, ease: true }, // về tới nơi → dừng bước, quay chính diện
        )
        return segs
    }

    /**
     * Bốc một "hoạt động rảnh" NGẪU NHIÊN rồi xếp các chặng vào hàng đợi. Mỗi lần bốc:
     *  - Tham số ngẫu nhiên (quãng đi, khoảng cách ra xa, hướng quay đầu, thời lượng) → không
     *    lần nào y hệt lần nào, tránh cảm giác "quy trình cố định".
     *  - Tránh lặp lại đúng hoạt động vừa diễn (`lastIdleIdx`).
     * Biên đi lấy theo cỡ model để LUÔN trong khung: đi ngang hẹp; lùi xa chỉ làm robot nhỏ đi
     * (không cắt). Robot xem như đang Ở TRONG PHÒNG: ~40% đi lòng vòng ra xa ngắm quanh rồi ĐI VỀ chỗ cũ
     * (mặc định; xem `roamSegments`/`ROAM_STAY_FAR`); còn lại diễn cảm xúc/động tác TẠI CHỖ đang đứng.
     * Chỉ khi mở hộp thoại chat mới cưỡng bức về chỗ gốc (setState → clearLocomotion).
     */
    private planIdleActivity(): void {
        const rnd = (min: number, max: number): number => min + Math.random() * (max - min)
        // ~40%: đi lòng vòng ra xa ngắm quanh rồi ĐI VỀ chỗ cũ (mặc định) — hoặc Ở LẠI nếu bật ROAM_STAY_FAR.
        if (Math.random() < 0.4) {
            this.moveQueue.push(...this.roamSegments())
            this.scheduleAmbient()
            return
        }
        const dir = Math.random() < 0.5 ? 1 : -1 // hướng quay đầu tiên — ngẫu nhiên trái/phải
        const turn = rnd(0.3, 0.5) // biên độ xoay người

        // Mỗi hoạt động là một hàm dựng chặng (gọi lúc bốc để lấy tham số ngẫu nhiên tươi). Đây là
        // các động tác/cảm xúc TẠI CHỖ (không dời chỗ) — việc dời chỗ đã tách sang roamSegments.
        // Dùng HẾT kho clip của RobotExpressive.glb + morph mặt cho phong phú, "có hồn".
        const builders: Array<() => MoveSegment[]> = [
            // Xoay người qua lại tại chỗ — nhẹ nhàng, "có hồn".
            () => [
                { dur: rnd(0.9, 1.3), base: 'Idle', toRotY: turn * dir, ease: true },
                { dur: rnd(1.3, 1.8), toRotY: -turn * dir, ease: true },
                { dur: 1.0, toRotY: 0, ease: true },
            ],
            // Ngồi nghỉ một chút rồi đứng dậy (cho thấy tư thế NGỒI).
            () => [
                { dur: 0.5, base: 'Sitting' },
                { dur: rnd(1.8, 3.0) },
                { dur: 0.4, base: 'Idle' },
            ],
            // NHẢY MÚA vài giây cho vui (Dance).
            () => [
                { dur: 0.4, base: 'Dance' },
                { dur: rnd(2.5, 4.0) },
                { dur: 0.4, base: 'Idle' },
            ],
            // Suy nghĩ: nghiêng người, NHÍU MÀY (mặt ngạc nhiên) rồi thả lỏng.
            () => [
                { dur: 0.5, base: 'Idle', face: 'Surprised', toRotY: 0.22 * dir, ease: true },
                { dur: rnd(1.8, 2.6) },
                { dur: 0.6, face: null, toRotY: 0, ease: true },
            ],
            // Bộc lộ cảm xúc NGẠC NHIÊN: giật mình (mặt Surprised + nhảy nhẹ).
            () => [
                { dur: 0.15, base: 'Idle', face: 'Surprised' },
                { dur: 0.15, emote: 'Jump' },
                { dur: rnd(1.3, 1.8) },
                { dur: 0.4, face: null },
            ],
            // Bộc lộ cảm xúc GIẬN: cau mày đấm dứt khoát (mặt Angry + Punch).
            () => [
                { dur: 0.15, base: 'Idle', face: 'Angry' },
                { dur: 0.15, emote: 'Punch' },
                { dur: rnd(1.4, 1.9) },
                { dur: 0.4, face: null },
            ],
            // Bộc lộ cảm xúc BUỒN: ngồi thụp mặt xịu (mặt Sad + Sitting) rồi đứng dậy.
            () => [
                { dur: 0.4, base: 'Sitting', face: 'Sad' },
                { dur: rnd(1.6, 2.4) },
                { dur: 0.4, base: 'Idle', face: null },
            ],
            // Gật đầu ĐỒNG Ý (Yes).
            () => [{ dur: 0.12, base: 'Idle' }, { dur: 0.12, emote: 'Yes' }, { dur: rnd(1.2, 1.7) }],
            // Lắc đầu KHÔNG (No).
            () => [{ dur: 0.12, base: 'Idle' }, { dur: 0.12, emote: 'No' }, { dur: rnd(1.2, 1.7) }],
            // Giơ ngón cái KHEN (ThumbsUp).
            () => [{ dur: 0.12, base: 'Idle' }, { dur: 0.12, emote: 'ThumbsUp' }, { dur: rnd(1.4, 1.9) }],
            // Nhảy cẫng tại chỗ (WalkJump).
            () => [{ dur: 0.12, base: 'Idle' }, { dur: 0.12, emote: 'WalkJump' }, { dur: rnd(1.2, 1.6) }],
            // TÉ chơi (Death) rồi tự lồm cồm đứng dậy — thỉnh thoảng cho vui.
            () => [
                { dur: 0.12, base: 'Idle', emote: 'Death' },
                { dur: rnd(1.8, 2.6) },
                { dur: 0.5, base: 'Idle' },
            ],
            // Vẫy chào thân thiện.
            () => [{ dur: 0.12, base: 'Idle' }, { dur: 0.12, emote: 'Wave' }, { dur: rnd(1.5, 2.0) }],
        ]
        // ĐI THẲNG TỚI VA MÀN HÌNH (kịch tính, chỉ bản content interactive) — DÙNG CHÍNH cơ chế đi
        // dạo (xem `walkToScreenSegments`).
        if (this.interactive) builders.push(() => this.walkToScreenSegments())
        // Bốc ngẫu nhiên, TRÁNH trùng đúng hoạt động vừa rồi cho đỡ nhàm.
        let idx = Math.floor(Math.random() * builders.length)
        if (idx === this.lastIdleIdx) idx = (idx + 1) % builders.length
        this.lastIdleIdx = idx
        this.moveQueue.push(...builders[idx]())
        this.scheduleAmbient() // nghỉ một nhịp trước hoạt động kế
    }

    /**
     * Chuỗi chặng "đi thẳng tới VA màn hình" (dùng chung cho hoạt động rảnh interactive lẫn nút test
     * popup). BƯỚC tới bằng cách tịnh tiến `stage` về phía camera (toZ dương) → TO DẦN theo phối cảnh,
     * đi bằng clip `Walking` (giống "đi ra xa" nhưng ngược chiều). Tiến ~1/2 quãng đường → to ~2×
     * (vừa "đụng kính", còn thấy mặt). BÙ trôi ngang/dọc (`holdAt`) để GIỮ mặt đúng chỗ — không dạt
     * góc phải, không trồi đầu mất mặt — suy từ đúng hình học phối cảnh của `frameModel`.
     *
     * Kịch bản VA: đụng kính → BẬT NGỬA ra sau + TÉ xuống (emote `Death`, ngã lùi + hụp xuống) →
     * nằm một lúc → ĐỨNG DẬY → CHẠY tới (Running, mặt giận) → ĐẤM 2–4 CÁI ngẫu nhiên (mỗi cú một
     * vết nứt, cú CUỐI đấm THỦNG kính một lỗ lớn) → BỰC MÌNH QUAY LƯNG đi về chỗ cũ → quay lại chính diện.
     */
    private walkToScreenSegments(): MoveSegment[] {
        const rnd = (min: number, max: number): number => min + Math.random() * (max - min)
        const frac = 0.5 // tiến 1/2 quãng đường tới camera → phóng đại = 1/(1-frac) = ~2×
        const near = this.camDist * frac
        // Bù phối cảnh GIỮ mặt đúng khung tại một độ sâu z bất kỳ (camera lệch trái + cao hơn tâm).
        const holdAt = (z: number): { x: number; y: number } => ({
            x: -ThreeRobotScene.CAM_X_OFF * z,
            y: -(0.5 - ThreeRobotScene.CAM_Y_OFF) * this.modelSize.y * (z / this.camDist),
        })
        const h = holdAt(near) // chỗ đứng "sát kính" (to ~2×)
        const backZ = near * 0.45 // bật ngửa lùi ra sau → nhỏ lại
        const b = holdAt(backZ)
        const fallDrop = this.modelSize.y * 0.12 // hụp xuống lúc té
        // VA: ngửa đầu + quầng kính NỨT ngay chỗ va thực (chiếu xương ra màn hình): 'head' lúc đụng
        // đầu, 'fist' lúc đấm — nên quầng luôn KHỚP đầu/nắm đấm dù robot đang to/nhỏ theo phối cảnh.
        // HOÃN quầng nứt một nhịp cho KHỚP lúc thực sự CHẠM kính: đầu va gần như tức thì (~60ms),
        // NẮM ĐẤM cần vươn ra thêm (~170ms) — trước đây nứt SỚM khi tay chưa tới kính. spawnGlassAt
        // chiếu xương lúc GỌI nên hoãn xong vẫn bắt đúng vị trí tay/đầu tại thời điểm chạm.
        const hit = (v: number, kind: 'head' | 'fist', hole = false) => (): void => {
            this.headBonk = v
            window.setTimeout(() => {
                if (this.disposed) return
                this.spawnGlassAt(kind, hole)
            }, kind === 'fist' ? 170 : 60)
        }
        // Số cú đấm NGẪU NHIÊN 2–4; cú CUỐI đấm THỦNG kính (lỗ lớn), các cú trước chỉ nứt.
        const punches = 2 + Math.floor(Math.random() * 3)
        const segs: MoveSegment[] = [
            { dur: 0.35, base: 'Walking', face: null, toRotY: 0, ease: true }, // hướng mặt về màn hình
            { dur: rnd(1.6, 2.2), toX: h.x, toY: h.y, toZ: near, ease: true }, // BƯỚC TỚI, to dần
            { dur: 0.14, base: 'Idle', face: 'Surprised', onStart: hit(-0.95, 'head') }, // VA đầu: ngửa + nứt kính chỗ đầu
            { dur: 0.55, emote: 'Death', toX: b.x, toY: b.y - fallDrop, toZ: backZ, ease: true }, // BẬT NGỬA + TÉ lùi/hụp
            { dur: 1.4, toX: b.x, toY: b.y - fallDrop, toZ: backZ }, // nằm một lúc (Death giữ pose)
            { dur: 0.5, base: 'Idle', face: null, toX: b.x, toY: b.y, toZ: backZ, ease: true }, // ĐỨNG DẬY
            { dur: rnd(0.7, 0.95), base: 'Running', face: 'Angry', toX: h.x, toY: h.y, toZ: near, ease: true }, // CHẠY tới
        ]
        for (let i = 0; i < punches; i++) {
            const last = i === punches - 1
            // Cú đầu đặt base 'Idle' (để Punch xong về Idle, không về Running); mỗi cú ngửa đầu nhẹ ngẫu nhiên.
            segs.push({ dur: 0.14, base: i === 0 ? 'Idle' : undefined, emote: 'Punch', onStart: hit(-(0.3 + Math.random() * 0.15), 'fist', last) })
            segs.push({ dur: last ? 0.55 : 0.32 }) // cú cuối nghỉ lâu hơn cho "đọc" ra lỗ thủng
        }
        segs.push(
            { dur: 0.5, base: 'Walking', face: null, toRotY: Math.PI, ease: true }, // BỰC MÌNH quay lưng
            { dur: rnd(1.6, 2.2), toX: 0, toY: 0, toZ: 0, ease: true }, // đi về chỗ (quay lưng)
            { dur: 0.35, base: 'Idle', toRotY: 0, ease: true }, // quay lại chính diện
        )
        return segs
    }

    /**
     * [TẠM — nút TEST popup] Diễn NGAY màn "đi tới va màn hình" bất kể `interactive`. Đảm bảo robot
     * hiện + đứng đúng chỗ, bật ambient idle để vòng lặp rAF tiêu thụ hàng đợi, dọn chặng cũ rồi xếp
     * chuỗi đi-tới. Sẽ gỡ khi test xong.
     */
    playWalkToScreen(): void {
        if (!this.stage) return
        this.host.style.display = ''
        this.host.style.transform = ''
        this.startAmbient('idle')
        this.clearLocomotion()
        this.headBonk = 0
        this.moveQueue.push(...this.walkToScreenSegments())
    }

    /**
     * Chiếu một điểm THẾ GIỚI ra toạ độ MÀN HÌNH (px, fixed) trong khung canvas. Vì canvas lấp đầy
     * `frame` rect (đã gồm scale hoá-già + tịnh tiến/phóng-đại theo phối cảnh), NDC → pixel của rect
     * là ánh xạ tuyến tính đúng. Trả null nếu chưa dựng xong.
     */
    private projectToScreen(world: THREE.Vector3): { x: number; y: number } | null {
        const r = this.frame.getBoundingClientRect()
        if (r.width === 0) return null
        const v = world.clone().project(this.camera) // NDC [-1,1]
        return {
            x: r.left + ((v.x + 1) / 2) * r.width,
            y: r.top + ((1 - v.y) / 2) * r.height,
        }
    }

    /**
     * Bắn quầng kính NỨT ngay chỗ va THỰC: chiếu xương `Head` (kind='head' — đụng đầu) hoặc điểm
     * ngang NGỰC/NẮM ĐẤM phía dưới đầu (kind='fist' — lúc đấm) ra màn hình. Bám theo vị trí/cỡ thực
     * của robot (kể cả khi đã tiến sát to ~2×) nên LUÔN khớp đầu/nắm đấm. Không có xương → về giữa khung.
     */
    private spawnGlassAt(kind: 'head' | 'fist', hole = false): void {
        const r = this.frame.getBoundingClientRect()
        if (r.width === 0) return
        let at: { x: number; y: number } | null = null
        if (this.head) {
            const p = this.head.getWorldPosition(new THREE.Vector3())
            p.y += kind === 'fist' ? -this.modelSize.y * 0.33 : this.modelSize.y * 0.06 // nắm đấm ~ngực; đầu nhỉnh lên
            at = this.projectToScreen(p)
        }
        if (!at) at = { x: r.left + r.width * 0.5, y: r.top + r.height * (kind === 'fist' ? 0.42 : 0.2) }
        const rnd = (min: number, max: number): number => min + Math.random() * (max - min)
        if (hole) {
            // Cú đấm CUỐI → bể kính THỦNG một lỗ lớn: cỡ NGẪU NHIÊN nhưng đã ≥ cỡ nắm đấm.
            this.spawnGlassHole(at.x, at.y, Math.max(210, Math.min(460, r.width * rnd(1.2, 2.2))))
            return
        }
        // CHỈ vết NỨT (bỏ quầng tròn mờ) — cỡ NGẪU NHIÊN → mức độ bể kính khác nhau; đấm mạnh hơn đụng đầu.
        this.spawnCrack(at.x, at.y, kind === 'fist' ? rnd(150, 320) : rnd(120, 240))
    }

    /** Dựng <svg> hiệu ứng đặt tại tâm va (px, fixed), phủ trên mọi thứ, không chắn chuột. */
    private mountFxSvg(cx: number, cy: number, size: number): { svg: SVGSVGElement; ns: string; c: number } {
        const ns = 'http://www.w3.org/2000/svg'
        const svg = document.createElementNS(ns, 'svg')
        svg.setAttribute('width', String(size))
        svg.setAttribute('height', String(size))
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
        svg.style.cssText =
            `position:fixed; left:${cx - size / 2}px; top:${cy - size / 2}px; pointer-events:none;` +
            ' z-index:2147483647; overflow:visible; transform-origin:center;'
        return { svg, ns, c: size / 2 }
    }

    /**
     * Vẽ `rays` tia NỨT răng-cưa toả từ tâm (bán kính `minR`→`maxR`) vào <svg>. Trả các điểm ĐỈNH tia
     * để nơi gọi (nếu muốn) nối thành vòng rạn. Dùng CHUNG cho vết nứt lẫn viền lỗ thủng (khỏi lặp code).
     */
    private crackRays(
        svg: SVGSVGElement,
        ns: string,
        c: number,
        rays: number,
        minR: number,
        maxR: number,
        sw: number,
        alpha: number,
    ): { x: number; y: number }[] {
        const tips: { x: number; y: number }[] = []
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.45
            const len = minR + (maxR - minR) * Math.random()
            let pts = `${c},${c}`
            for (let s = 1; s <= 3; s++) {
                const rr = (len * s) / 3
                const na = a + ((Math.random() - 0.5) * maxR * 0.1) / rr // lệch răng-cưa
                pts += ` ${(c + Math.cos(na) * rr).toFixed(1)},${(c + Math.sin(na) * rr).toFixed(1)}`
            }
            const line = document.createElementNS(ns, 'polyline')
            line.setAttribute('points', pts)
            line.setAttribute('fill', 'none')
            line.setAttribute('stroke', `rgba(255,255,255,${alpha})`)
            line.setAttribute('stroke-width', String(sw))
            line.setAttribute('stroke-linejoin', 'round')
            svg.appendChild(line)
            tips.push({ x: c + Math.cos(a) * len * 0.62, y: c + Math.sin(a) * len * 0.62 })
        }
        return tips
    }

    /**
     * Vết NỨT kính hình sao (KHÔNG quầng tròn mờ): nhiều tia răng-cưa toả từ tâm va + vòng rạn nối các
     * tia. Hiện nhanh, đọng rồi tan. `size` = cỡ NGẪU NHIÊN (mức độ bể). SVG thuần, tự gỡ, không chắn chuột.
     */
    private spawnCrack(cx: number, cy: number, size: number): void {
        const { svg, ns, c } = this.mountFxSvg(cx, cy, size)
        const maxR = size * 0.46
        const tips = this.crackRays(svg, ns, c, 7 + Math.floor(Math.random() * 3), maxR * 0.6, maxR, Math.max(1, size * 0.006), 0.85)
        const ring = document.createElementNS(ns, 'polygon')
        ring.setAttribute('points', tips.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' '))
        ring.setAttribute('fill', 'none')
        ring.setAttribute('stroke', 'rgba(255,255,255,0.6)')
        ring.setAttribute('stroke-width', String(Math.max(1, size * 0.005)))
        svg.appendChild(ring)
        document.body.appendChild(svg)
        const anim = svg.animate(
            [
                { transform: 'scale(0.6)', opacity: 0 },
                { transform: 'scale(1)', opacity: 1, offset: 0.16 },
                { transform: 'scale(1)', opacity: 1, offset: 0.72 },
                { transform: 'scale(1.05)', opacity: 0 },
            ],
            { duration: 1100, easing: 'ease-out' },
        )
        anim.onfinish = (): void => svg.remove()
    }

    /**
     * BỂ KÍNH THỦNG LỖ (cú đấm cuối): lỗ thủng LỞM CHỞM ở tâm (tô gradient tối "thủng qua kính" + viền
     * kính sáng) + nhiều tia nứt DÀI toả ra ngoài. Cỡ lỗ ngẫu nhiên (đã ≥ cỡ nắm đấm ở nơi gọi). Đọng
     * lâu hơn vết nứt thường rồi tan. SVG thuần, tự gỡ, không chắn chuột.
     */
    private spawnGlassHole(cx: number, cy: number, size: number): void {
        const { svg, ns, c } = this.mountFxSvg(cx, cy, size)
        const maxR = size * 0.48
        this.crackRays(svg, ns, c, 9 + Math.floor(Math.random() * 4), maxR * 0.55, maxR, Math.max(1.2, size * 0.007), 0.8)
        // Lỗ thủng: đa giác lởm chởm quanh tâm.
        const holeR = size * (0.16 + Math.random() * 0.1)
        const n = 10 + Math.floor(Math.random() * 5)
        let poly = ''
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2
            const rr = holeR * (0.7 + Math.random() * 0.45)
            poly += ` ${(c + Math.cos(a) * rr).toFixed(1)},${(c + Math.sin(a) * rr).toFixed(1)}`
        }
        const gid = `robot-hole-${Math.floor(Math.random() * 1e9)}` // id duy nhất, tránh đụng khi có nhiều lỗ
        const defs = document.createElementNS(ns, 'defs')
        const grad = document.createElementNS(ns, 'radialGradient')
        grad.setAttribute('id', gid)
        for (const [off, col] of [
            ['0%', 'rgba(8,12,20,0.82)'],
            ['70%', 'rgba(18,26,40,0.5)'],
            ['100%', 'rgba(120,150,190,0.1)'],
        ] as const) {
            const st = document.createElementNS(ns, 'stop')
            st.setAttribute('offset', off)
            st.setAttribute('stop-color', col)
            grad.appendChild(st)
        }
        defs.appendChild(grad)
        svg.appendChild(defs)
        const holePoly = document.createElementNS(ns, 'polygon')
        holePoly.setAttribute('points', poly.trim())
        holePoly.setAttribute('fill', `url(#${gid})`)
        holePoly.setAttribute('stroke', 'rgba(255,255,255,0.9)')
        holePoly.setAttribute('stroke-width', String(Math.max(1.5, size * 0.008)))
        holePoly.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(holePoly)
        document.body.appendChild(svg)
        const anim = svg.animate(
            [
                { transform: 'scale(0.5)', opacity: 0 },
                { transform: 'scale(1.06)', opacity: 1, offset: 0.2 },
                { transform: 'scale(1)', opacity: 1, offset: 0.75 },
                { transform: 'scale(1.04)', opacity: 0 },
            ],
            { duration: 1500, easing: 'ease-out' },
        )
        anim.onfinish = (): void => svg.remove()
    }

    /**
     * Crossfade sang một action (nền lặp hoặc emote một-lần) — mờ action cũ ra, mờ
     * action mới vào, đúng cách ví dụ three.js làm để tránh chồng trọng số.
     */
    private fadeTo(name: string, duration: number, loopOnce = false): void {
        const next = this.actions.get(name)
        if (!next) return
        if (next === this.activeAction && !loopOnce) return // nền đang chạy → khỏi khởi động lại
        const prev = this.activeAction
        if (prev && prev !== next) prev.fadeOut(duration)
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1)
        if (loopOnce) {
            next.setLoop(THREE.LoopOnce, 1)
            next.clampWhenFinished = true
        } else {
            next.setLoop(THREE.LoopRepeat, Infinity)
            next.clampWhenFinished = false
        }
        next.fadeIn(duration).play()
        this.activeAction = next
    }

    private setFace(morph: FaceMorph | null): void {
        this.morphTarget.Angry = 0
        this.morphTarget.Surprised = morph === 'Surprised' ? 1 : 0
        this.morphTarget.Sad = morph === 'Sad' ? 1 : 0
        if (morph === 'Angry') this.morphTarget.Angry = 1
    }

    private loop = (): void => {
        if (this.disposed) return
        this.raf = requestAnimationFrame(this.loop)
        const nowMs = performance.now()
        // Frame đầu delta=0; kẹp 50ms để tab ngủ dậy không "tua nhanh" animation.
        const delta = this.lastFrameMs ? Math.min((nowMs - this.lastFrameMs) / 1000, 0.05) : 0
        this.lastFrameMs = nowMs
        this.mixer?.update(delta)
        this.applyGaze(delta) // nhìn theo chuột — cộng đè SAU mixer.update
        this.updateMorph(delta)

        // Ăn mừng: nhảy Dance vài giây rồi tự về Idle.
        if (this.celebrateTimer > 0) {
            this.celebrateTimer -= delta
            if (this.celebrateTimer <= 0) this.setBase('Idle')
        }
        // Pháo hoa cầm tay: đến giờ thì bắn phát kế; hạt đang bay luôn được cập nhật.
        if (this.fireworkBursts > 0) {
            this.fireworkTimer -= delta
            if (this.fireworkTimer <= 0) {
                this.fireworkBursts--
                this.fireworkTimer = 0.4 + Math.random() * 0.35
                this.spawnFirework()
            }
        }
        if (this.fireworks.length > 0) this.updateFireworks(delta)
        // GHI CHÉP: hí hoáy cây viết trên vở; ngồi ghi 1 lúc "chán" → đứng dậy về như cũ (idle).
        // Nhịp gõ phím không có tín hiệu "ngừng gõ" ở luồng 3D → phải TỰ hết giờ ở đây.
        if (this.writing) {
            this.updateWriting(delta)
            this.writeTimer -= delta
            if (this.writeTimer <= 0) {
                this.stopWriting()
                this.writeCooldown = ThreeRobotScene.WRITE_COOLDOWN_S // nghỉ tay, chưa ngồi lại ngay
                this.setState('idle') // chán → quay lại như cũ
            }
        }
        if (this.writeCooldown > 0) this.writeCooldown -= delta
        // Hoạt động nền (không dùng setInterval):
        //  - CHỜ AI: cứ hết giờ thì bốc hoạt động mới (tại chỗ, dồn dập).
        //  - RẢNH: nội suy chặng đi dạo đang chạy; hết hoạt động + hết nhịp nghỉ → bốc cái mới.
        // Màn "va màn hình" cũng là một hoạt động RẢNH (chuỗi chặng trong hàng đợi) nên tự khoá
        // việc bốc hoạt động khác + hoãn nghỉ trong lúc diễn, y như "đi ra xa".
        if (this.ambient === 'wait') {
            this.ambientTimer -= delta
            if (this.ambientTimer <= 0) this.pickWaitMove()
        } else if (this.ambient === 'idle') {
            this.updateLocomotion(delta)
            if (!this.moveSeg && this.moveQueue.length === 0) {
                this.ambientTimer -= delta
                if (this.ambientTimer <= 0) this.planIdleActivity()
            }
        }
        // Nghỉ (ngồi/gục đầu) xoay THÂN MƯỢT về hướng NGẪU NHIÊN đã chọn (chính diện/phải/trái/quay lưng…).
        // Lúc nghỉ ambient='off' nên updateLocomotion không chạy → tự nội suy rotation.y tại đây.
        if (this.stage && this.restLevel !== 'awake') {
            const cur = this.stage.rotation.y
            this.stage.rotation.y = cur + (this.restRotY - cur) * Math.min(1, delta * 4)
        }
        // Ngủ mê "TÉ RA": hết mốc chờ (ngẫu nhiên trong giấc) → đổ người bằng emote Death từ thế NGỒI;
        // Death xong TỰ mờ về base Sitting → "lọ mọ ngồi dậy". Nới hạn tỉnh để kịp ngồi dậy trước khi tỉnh.
        if (this.restLevel === 'sleep' && this.sleepFallTimer > 0) {
            this.sleepFallTimer -= delta
            if (this.sleepFallTimer <= 0) {
                // Đang ngồi QUAY NGANG/quay lưng mà té thì thân đổ VĂNG NGANG ra mép khung
                // → đầu bị cắt. Xoay mượt về gần chính diện trước (cú ngã Death đổ theo trục
                // SÂU — ra sau lưng, xa camera, luôn nằm gọn trong khung) rồi mới té.
                if (Math.abs(this.stage?.rotation.y ?? 0) > 0.5) {
                    this.restRotY = 0
                    this.sleepFallTimer = 0.6 // đợi thân xoay về rồi vòng lặp tự kiểm tra lại
                } else {
                    this.playEmote('Death')
                    if (this.restTimer < ThreeRobotScene.FALL_RECOVER_S) this.restTimer = ThreeRobotScene.FALL_RECOVER_S
                }
            }
        }
        // Nằm sõng soài sau cú té ngủ mê: hết giờ nằm → lồm cồm ngồi dậy lại (Sitting giữ pose).
        if (this.fallHoldTimer > 0) {
            this.fallHoldTimer -= delta
            if (this.fallHoldTimer <= 0 && this.restLevel === 'sleep') {
                this.fadeTo(this.baseName, 0.5, ThreeRobotScene.HELD_BASES.has(this.baseName))
            }
        }
        // Vòng đời nghỉ: rảnh lâu → NGỒI → GỤC ĐẦU NGỦ → TỰ TỈNH (rồi lại rảnh); đếm bằng rAF.
        // Chỉ ĐỔI tư thế nghỉ ở nhịp ĐỨNG YÊN (hết hoạt động) → ngồi/ngủ NGAY chỗ đó, không snap giật.
        if (this.restTimer > 0) {
            this.restTimer -= delta
            if (this.restTimer <= 0) {
                if (this.restLevel === 'sleep') {
                    this.wake() // ngủ đủ lâu → tự tỉnh, không nằm lì
                } else if (!this.moveSeg && this.moveQueue.length === 0) {
                    if (this.restLevel === 'awake') this.enterSit()
                    else this.enterSleep()
                } else {
                    this.restTimer = 0.5 // đang giữa hoạt động → chờ xong rồi mới nghỉ
                }
            }
        }
        this.updateIcons(delta) // icon trạng thái bay lên từ đỉnh đầu, nhỏ dần rồi tan
        this.renderer.render(this.scene, this.camera)
    }

    /** Nội suy morph khuôn mặt về giá trị mục tiêu cho mượt. */
    private updateMorph(delta: number): void {
        const hm = this.headMorph
        if (!hm) return
        const infl = hm.mesh.morphTargetInfluences
        if (!infl) return
        const k = Math.min(1, delta * 8)
        for (const name of ['Angry', 'Surprised', 'Sad'] as const) {
            const i = hm.index[name]
            infl[i] += (this.morphTarget[name] - infl[i]) * k
        }
    }

    /** Dọn dẹp: dừng vòng lặp, giải phóng GPU, gỡ host (wrapper luôn do lớp này tạo). */
    dispose(): void {
        this.disposed = true
        this.avoidance?.destroy()
        window.removeEventListener('pointermove', this.onPointerMove)
        cancelAnimationFrame(this.raf)
        if (this.flyLandTimer) window.clearTimeout(this.flyLandTimer)
        this.mixer?.stopAllAction()
        this.scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (mesh.geometry) mesh.geometry.dispose()
            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat?.dispose()
        })
        this.iconTextures.forEach((texture) => texture.dispose()) // vân icon dùng lại nên không nằm trong scene
        this.iconTextures.clear()
        this.icons.length = 0
        this.renderer.dispose()
        this.host.remove()
    }
}
