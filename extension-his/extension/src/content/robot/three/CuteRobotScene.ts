import * as THREE from 'three'
import type { SceneState, RobotAppearanceInput } from './ThreeRobotScene'

/**
 * Robot "Bé Bi" — hình hài "Trợ lý động" DỰNG THUẦN BẰNG KHỐI CƠ BẢN của three.js
 * (không model .glb → hiện tức thì, nhẹ), tạo hình bám sát ảnh mẫu:
 *  - Tỉ lệ CHIBI: đầu to tròn chiếm ~45% chiều cao, thân ngắn, chân ngắn.
 *  - MẶT = màn hình đen bo góc chiếm gần hết mặt trước đầu; mắt cyan phát sáng
 *    và mọi biểu cảm được VẼ BẰNG CANVAS lên màn hình đó (2D — giống ảnh, dễ diễn).
 *  - Ngực + tai + tay + đùi XANH (phần DUY NHẤT đổi theo màu web-admin);
 *    giày ĐỎ; ÁO CHOÀNG đỏ (phụ kiện — sau này gói Pro).
 *
 * Chuyển động: mỗi trạng thái chỉ khai "tư thế đích", vòng render nội suy dần
 * (lerp theo thời gian thực) → chuyển cảnh luôn mượt.
 */

/** Biểu cảm mắt vẽ trên màn hình mặt. */
type FaceLook = 'normal' | 'happy' | 'sad' | 'dim' | 'focus'

/** Tư thế đích của các khớp — bỏ trống = 0. */
interface Pose {
    headTiltX?: number
    headTiltZ?: number
    headTurnY?: number
    armL?: number // dương = giơ tay ra/lên
    armR?: number
    bodyLean?: number
    bob?: number
    speed?: number
    face?: FaceLook
    /** Mắt liếc ngang (-1..1) — vd nhìn về ô nhập khi người dùng gõ. */
    lookX?: number
}

const POSES: Record<SceneState, Pose> = {
    idle: { bob: 0.03, speed: 1, face: 'normal' },
    listening: { bob: 0.045, speed: 1.6, face: 'happy' },
    typing: { headTiltZ: -0.1, headTurnY: -0.3, bob: 0.02, speed: 1, face: 'focus', lookX: -0.6 },
    thinking: { headTiltX: 0.12, headTiltZ: 0.1, armR: 2.6, bob: 0.012, speed: 0.7, face: 'focus', lookX: 0.5 },
    happy: { bob: 0.09, speed: 3.2, armL: 0.9, armR: 0.9, face: 'happy' },
    celebrate: { bob: 0.13, speed: 4, armL: 2.7, armR: 2.7, face: 'happy' },
    confused: { headTiltZ: 0.2, armL: 2.5, bob: 0.02, speed: 0.9, face: 'normal', lookX: 0.4 },
    pointError: { armR: 1.6, headTurnY: 0.25, bodyLean: 0.1, bob: 0.012, speed: 0.8, face: 'focus' },
    sad: { headTiltX: 0.35, bodyLean: 0.08, bob: 0.008, speed: 0.5, face: 'sad' },
}

type BubbleKind = 'dots' | 'ok' | 'fail' | 'warn' | 'zzz' | null

const BUBBLE_FOR_STATE: Partial<Record<SceneState, BubbleKind>> = {
    thinking: 'dots',
    happy: 'ok',
    celebrate: 'ok',
    confused: 'warn',
    pointError: 'warn',
    sad: 'fail',
}

/** Hoá già khi chờ AI lâu (đồng bộ robot 3D demo). */
const AGING_GRAY: Record<string, number> = {
    dust: 0.12, dustMore: 0.25, rust: 0.4, loose: 0.52,
    grayHair: 0.65, cane: 0.78, slow: 0.9, elder: 1,
}
const SEASON_TINT: Record<string, readonly [number, number, number]> = {
    spring: [1, 1, 1],
    summer: [1.06, 1.03, 0.94],
    autumn: [1.06, 0.9, 0.7],
    winter: [0.9, 0.95, 1.06],
}

const BRAND_BLUE = 0x2456c4 // xanh mặc định theo ảnh (web-admin đổi được)
const WHITE = 0xf4f6fa
const RED = 0xd23b30
const DARK = 0x171a22
const EYE_CYAN = '#3ae6f5'

function parseHexColor(hex: string | null | undefined): number | null {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null
    return parseInt(hex.slice(1), 16)
}

export interface CuteRobotSceneOptions {
    readonly container?: HTMLElement
    readonly width?: number
    readonly height?: number
    readonly interactive?: boolean
    /** Áo choàng (phụ kiện — mặc định CÓ để demo; sau này gate theo gói Pro). */
    readonly cape?: boolean
}

export class CuteRobotScene {
    private readonly host: HTMLElement
    private readonly ownHost: boolean
    private readonly renderer: THREE.WebGLRenderer
    private readonly scene = new THREE.Scene()
    private readonly camera: THREE.PerspectiveCamera
    // Tự đếm thời gian bằng performance.now() — KHÔNG dùng THREE.Clock (deprecated, phát
    // cảnh báo console; dự án yêu cầu console sạch).
    private lastFrameMs = 0
    private elapsed = 0

    // blueMat = phần DUY NHẤT đổi theo màu web-admin
    private readonly blueMat = new THREE.MeshStandardMaterial({ color: BRAND_BLUE, roughness: 0.4 })
    private readonly whiteMat = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.32 })
    private readonly redMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.5 })
    private readonly darkMat = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.35 })
    private readonly capeMat = new THREE.MeshStandardMaterial({
        color: RED, roughness: 0.75, side: THREE.DoubleSide,
    })
    private readonly allMats: THREE.MeshStandardMaterial[] = [
        this.blueMat, this.whiteMat, this.redMat, this.darkMat, this.capeMat,
    ]
    private readonly baseColors = new Map<THREE.MeshStandardMaterial, THREE.Color>()

    // Khớp điều khiển
    private readonly stage = new THREE.Group()
    private readonly headGroup = new THREE.Group()
    private readonly armLGroup = new THREE.Group()
    private readonly armRGroup = new THREE.Group()
    private cape: THREE.Mesh | null = null

    // Màn hình mặt = canvas texture
    private readonly faceCanvas = document.createElement('canvas')
    private readonly faceTexture: THREE.CanvasTexture
    private faceLook: FaceLook = 'normal'
    private faceLookX = 0
    private blinkUntil = 0
    private blinkAt = 2.5
    private faceDirty = true

    // Nhãn ngực "AI Agent" (hoặc logo đơn vị cấu hình ở web-admin)
    private readonly chestCanvas = document.createElement('canvas')
    private chestTexture: THREE.CanvasTexture | null = null
    private chestPlane: THREE.Mesh | null = null

    // Bong bóng biểu tượng
    private readonly bubble: THREE.Sprite
    private readonly bubbleCanvas = document.createElement('canvas')
    private bubbleKind: BubbleKind = null
    private bubbleTimer = 0
    private bubbleTtl = 0 // >0: bong bóng tự ẩn sau ngần này giây ("…" và 💤 bám: ttl=0)
    private lastDotPhase = -1

    private state: SceneState = 'idle'
    private pose: Pose = POSES.idle
    private waitRandom = false
    private appearScale = 1
    private hoverHappy = false
    private raf = 0
    private disposed = false
    private aging: string | null = null
    private season: string | null = null

    constructor(
        private readonly onActivate: () => void,
        onReady: () => void,
        onFail: (err: unknown) => void,
        private readonly opts: CuteRobotSceneOptions = {},
    ) {
        try {
            const width = opts.width ?? 150
            const height = opts.height ?? 178

            if (opts.container) {
                this.host = opts.container
                this.ownHost = false
            } else {
                this.host = document.createElement('div')
                this.host.style.cssText =
                    `position:fixed;right:16px;bottom:12px;width:${width}px;height:${height}px;` +
                    'z-index:2147483646;cursor:pointer;user-select:none;'
                document.body.appendChild(this.host)
                this.ownHost = true
            }

            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            this.renderer.setSize(width, height)
            this.host.appendChild(this.renderer.domElement)

            // Robot cao ~2.1 đơn vị, tâm nhìn đặt giữa thân-đầu
            this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 30)
            this.camera.position.set(0, 1.2, 6.1)
            this.camera.lookAt(0, 1.05, 0)

            this.scene.add(new THREE.HemisphereLight(0xffffff, 0x93a5c8, 1.2))
            const sun = new THREE.DirectionalLight(0xffffff, 1.4)
            sun.position.set(2.5, 5, 4)
            this.scene.add(sun)

            for (const m of this.allMats) this.baseColors.set(m, m.color.clone())

            this.faceTexture = new THREE.CanvasTexture(this.faceCanvas)
            this.buildRobot()
            this.scene.add(this.stage)

            this.bubble = this.buildBubble()
            this.stage.add(this.bubble)

            if (this.opts.interactive !== false) {
                this.host.addEventListener('click', () => this.onActivate())
                this.host.addEventListener('mouseenter', () => (this.hoverHappy = true))
                this.host.addEventListener('mouseleave', () => (this.hoverHappy = false))
            }

            // Dấu vết chẩn đoán: xác nhận phiên bản scene đang chạy trên trang preview
            console.log('[Bé Bi] CuteRobotScene v3 (mặt phẳng + nhãn ngực) đã dựng xong')
            this.loop()
            onReady()
        } catch (err) {
            onFail(err)
            throw err
        }
    }

    // ------------------------------------------------------------------
    // Dựng hình — tỉ lệ chibi theo ảnh: tổng cao ~2.1, ĐẦU chiếm gần nửa
    // ------------------------------------------------------------------

    private buildRobot(): void {
        const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh => new THREE.Mesh(geo, mat)

        // ---- ĐẦU: khối cầu trắng TO bề ngang (mũ bảo hiểm), tâm y=1.55 ----
        this.headGroup.position.set(0, 1.55, 0)
        const head = mesh(new THREE.SphereGeometry(0.62, 40, 30), this.whiteMat)
        head.scale.set(1.12, 0.95, 0.98) // rộng hơn cao — đúng dáng mũ trong ảnh
        this.headGroup.add(head)

        // MÀN HÌNH MẶT: TẤM PHẲNG dán canvas đặt trước đầu, luôn hướng camera
        // (camera cố định chính diện nên nhìn y như màn hình cong của ảnh mẫu).
        // Nền đen bo góc + mắt vẽ ngay trên canvas — không cần khối kính riêng.
        const faceMat = new THREE.MeshBasicMaterial({ map: this.faceTexture, transparent: true })
        // z=0.63 > bán kính đầu theo trục z (0.62×0.98≈0.608) — PHẢI nằm hẳn TRƯỚC
        // bề mặt cầu, nếu lún vào trong sẽ chỉ thấy rìa màn hình (bug đã gặp)
        const face = mesh(new THREE.PlaneGeometry(1.08, 0.8), faceMat)
        face.position.set(0, -0.03, 0.63)
        this.headGroup.add(face)
        this.drawFace()

        // Tai: 2 đĩa XANH to hai bên (điểm nhấn của ảnh)
        for (const side of [-1, 1] as const) {
            const ear = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 24), this.blueMat)
            ear.rotation.z = Math.PI / 2
            ear.position.set(0.68 * side, 0, 0)
            this.headGroup.add(ear)
            const earCap = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 24), this.whiteMat)
            earCap.rotation.z = Math.PI / 2
            earCap.position.set(0.72 * side, 0, 0)
            this.headGroup.add(earCap)
        }
        this.stage.add(this.headGroup)

        // ---- THÂN NGẮN: lõi trắng + TẤM NGỰC XANH ôm trước ----
        const torso = mesh(new THREE.SphereGeometry(0.42, 32, 24), this.whiteMat)
        torso.position.set(0, 0.72, 0)
        torso.scale.set(0.95, 1.05, 0.8)
        this.stage.add(torso)
        const chest = mesh(new THREE.SphereGeometry(0.4, 32, 24), this.blueMat)
        chest.position.set(0, 0.74, 0.1)
        chest.scale.set(0.88, 0.92, 0.72)
        this.stage.add(chest)

        // Nhãn "AI Agent" giữa ngực (đúng ảnh mẫu) — thay bằng logo đơn vị nếu cấu hình
        this.chestTexture = new THREE.CanvasTexture(this.chestCanvas)
        const label = mesh(
            new THREE.PlaneGeometry(0.46, 0.2),
            new THREE.MeshBasicMaterial({ map: this.chestTexture, transparent: true }),
        )
        label.position.set(0, 0.76, 0.42)
        this.chestPlane = label
        this.stage.add(label)
        this.drawChestLabel(null)

        // ---- TAY: gắn ở vai, xoay quanh z để giơ/vẫy ----
        for (const side of [-1, 1] as const) {
            const arm = side === -1 ? this.armLGroup : this.armRGroup
            arm.position.set(0.44 * side, 0.95, 0)
            const shoulder = mesh(new THREE.SphereGeometry(0.13, 16, 12), this.whiteMat)
            arm.add(shoulder)
            const upper = mesh(new THREE.CapsuleGeometry(0.09, 0.16, 6, 14), this.blueMat)
            upper.position.set(0.09 * side, -0.16, 0)
            upper.rotation.z = 0.28 * side
            arm.add(upper)
            const fore = mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 14), this.whiteMat)
            fore.position.set(0.16 * side, -0.4, 0)
            arm.add(fore)
            const hand = mesh(new THREE.SphereGeometry(0.1, 14, 12), this.darkMat)
            hand.position.set(0.18 * side, -0.56, 0.02)
            hand.scale.set(1, 0.85, 0.9)
            arm.add(hand)
            this.stage.add(arm)
        }

        // ---- CHÂN NGẮN + GIÀY ĐỎ ----
        for (const side of [-1, 1] as const) {
            const leg = new THREE.Group()
            leg.position.set(0.19 * side, 0.3, 0)
            const thigh = mesh(new THREE.CapsuleGeometry(0.11, 0.08, 6, 14), this.blueMat)
            leg.add(thigh)
            const shin = mesh(new THREE.CapsuleGeometry(0.1, 0.06, 6, 14), this.whiteMat)
            shin.position.set(0, -0.14, 0)
            leg.add(shin)
            const boot = mesh(new THREE.SphereGeometry(0.16, 18, 14), this.redMat)
            boot.position.set(0, -0.26, 0.06)
            boot.scale.set(1.05, 0.62, 1.5)
            leg.add(boot)
            const bootTip = mesh(new THREE.SphereGeometry(0.09, 14, 12), this.whiteMat)
            bootTip.position.set(0, -0.29, 0.22)
            bootTip.scale.set(1, 0.55, 0.9)
            leg.add(bootTip)
            this.stage.add(leg)
        }

        // ---- ÁO CHOÀNG: treo từ vai, phủ sau lưng, vẫy bằng biến dạng đỉnh ----
        if (this.opts.cape !== false) {
            const capeGeo = new THREE.PlaneGeometry(1.05, 1.15, 8, 10)
            // Neo mép TRÊN tại vai: dịch geometry xuống để gốc xoay nằm ở mép trên
            capeGeo.translate(0, -1.15 / 2, 0)
            this.cape = mesh(capeGeo, this.capeMat)
            this.cape.position.set(0, 1.12, -0.34)
            this.cape.rotation.x = 0.3
            this.stage.add(this.cape)
        }
    }

    // ------------------------------------------------------------------
    // MẶT (canvas): nền đen bo góc + mắt cyan — biểu cảm là chuyện vẽ 2D
    // ------------------------------------------------------------------

    private drawFace(): void {
        const w = 256
        const h = 192
        if (this.faceCanvas.width !== w) {
            this.faceCanvas.width = w
            this.faceCanvas.height = h
        }
        const ctx = this.faceCanvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, w, h)

        // Màn hình đen bo góc (không phủ kín canvas → viền trắng của đầu lộ quanh)
        ctx.fillStyle = '#0b0d13'
        ctx.beginPath()
        ctx.roundRect(10, 16, w - 20, h - 38, 52)
        ctx.fill()

        const blink = performance.now() / 1000 < this.blinkUntil
        const look = this.faceLook
        const offX = this.faceLookX * 14
        const eyeY = h / 2 - 4
        const eyeDX = 44

        ctx.fillStyle = look === 'dim' || look === 'sad' ? '#1e8a97' : EYE_CYAN
        ctx.strokeStyle = ctx.fillStyle
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 20

        for (const side of [-1, 1]) {
            const cx = w / 2 + side * eyeDX + offX
            if (blink) {
                ctx.fillRect(cx - 17, eyeY - 2, 34, 5)
                continue
            }
            switch (look) {
                case 'happy': {
                    // mắt cong cười (vòng cung úp xuống)
                    ctx.lineWidth = 9
                    ctx.lineCap = 'round'
                    ctx.beginPath()
                    ctx.arc(cx, eyeY + 8, 16, Math.PI * 1.15, Math.PI * 1.85)
                    ctx.stroke()
                    break
                }
                case 'sad': {
                    // mắt cụp (vòng cung ngửa + hơi xệ ra ngoài)
                    ctx.lineWidth = 8
                    ctx.lineCap = 'round'
                    ctx.beginPath()
                    ctx.arc(cx, eyeY - 4, 15, Math.PI * 0.15 * side + 0.2, Math.PI * 0.85)
                    ctx.stroke()
                    break
                }
                case 'focus': {
                    // mắt híp ngang (tập trung)
                    ctx.beginPath()
                    ctx.roundRect(cx - 16, eyeY - 7, 32, 14, 7)
                    ctx.fill()
                    break
                }
                case 'dim':
                case 'normal':
                default: {
                    // mắt tròn to phát sáng — đúng ảnh mẫu
                    ctx.beginPath()
                    ctx.roundRect(cx - 19, eyeY - 19, 38, 38, 15)
                    ctx.fill()
                }
            }
        }
        ctx.shadowBlur = 0
        this.faceTexture.needsUpdate = true
        this.faceDirty = false
    }

    /** Vẽ nhãn ngực: mặc định chữ "AI Agent"; có logo đơn vị thì vẽ logo (contain). */
    private drawChestLabel(logoDataUrl: string | null): void {
        const c = this.chestCanvas
        c.width = 180
        c.height = 78
        const ctx = c.getContext('2d')
        if (!ctx || !this.chestTexture) return
        const panel = (): void => {
            ctx.clearRect(0, 0, c.width, c.height)
            ctx.fillStyle = 'rgba(255,255,255,0.94)'
            ctx.beginPath()
            ctx.roundRect(4, 4, c.width - 8, c.height - 8, 16)
            ctx.fill()
        }
        if (logoDataUrl) {
            const img = new Image()
            img.onload = (): void => {
                if (this.disposed || !this.chestTexture) return
                panel()
                const pad = 10
                const k = Math.min((c.width - pad * 2) / img.width, (c.height - pad * 2) / img.height)
                const iw = img.width * k
                const ih = img.height * k
                ctx.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih)
                this.chestTexture.needsUpdate = true
            }
            img.src = logoDataUrl
        }
        panel()
        ctx.fillStyle = '#1b3f8f'
        ctx.font = 'bold 30px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('AI Agent', c.width / 2, c.height / 2 + 1)
        this.chestTexture.needsUpdate = true
    }

    /** Đổi biểu cảm mặt nếu khác hiện tại (chỉ vẽ lại khi cần — tiết kiệm). */
    private setFace(look: FaceLook, lookX: number): void {
        if (look !== this.faceLook || Math.abs(lookX - this.faceLookX) > 0.05) {
            this.faceLook = look
            this.faceLookX = lookX
            this.faceDirty = true
        }
    }

    // ------------------------------------------------------------------
    // Bong bóng biểu tượng trên đầu
    // ------------------------------------------------------------------

    private buildBubble(): THREE.Sprite {
        this.bubbleCanvas.width = 128
        this.bubbleCanvas.height = 96
        const texture = new THREE.CanvasTexture(this.bubbleCanvas)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
        sprite.position.set(0.58, 2.42, 0)
        sprite.scale.set(0.85, 0.64, 1)
        sprite.visible = false
        return sprite
    }

    private drawBubble(kind: Exclude<BubbleKind, null>, phase: number): void {
        const ctx = this.bubbleCanvas.getContext('2d')
        if (!ctx) return
        const w = this.bubbleCanvas.width
        const h = this.bubbleCanvas.height
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(255,255,255,0.96)'
        ctx.strokeStyle = 'rgba(30,40,70,0.25)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(6, 6, w - 12, h - 34, 18)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(30, h - 30)
        ctx.lineTo(18, h - 8)
        ctx.lineTo(46, h - 28)
        ctx.closePath()
        ctx.fill()

        if (kind === 'dots') {
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = i === phase % 3 ? '#2456c4' : 'rgba(36,86,196,0.35)'
                ctx.beginPath()
                ctx.arc(40 + i * 24, 38, 8, 0, Math.PI * 2)
                ctx.fill()
            }
        } else {
            ctx.font = '40px "Segoe UI Emoji", sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText({ ok: '✔️', fail: '❌', warn: '⚠️', zzz: '💤' }[kind], w / 2, 38)
        }
        ;(this.bubble.material as THREE.SpriteMaterial).map!.needsUpdate = true
    }

    private setBubble(kind: BubbleKind): void {
        this.bubbleKind = kind
        this.bubble.visible = kind !== null
        this.lastDotPhase = -1
        if (kind) this.drawBubble(kind, 0)
    }

    // ------------------------------------------------------------------
    // API điều khiển (entry gọi y hệt ThreeRobotScene)
    // ------------------------------------------------------------------

    setState(state: SceneState): void {
        this.state = state
        this.pose = POSES[state] ?? POSES.idle
        this.setBubble(BUBBLE_FOR_STATE[state] ?? null)
        // Chỉ "suy nghĩ" (…) bám tới khi có kết quả; icon kết quả TỰ ẨN sau vài giây.
        this.bubbleTtl = state === 'thinking' ? 0 : 3
        if (state === 'happy' || state === 'celebrate') {
            window.clearTimeout(this.bubbleTimer)
            this.bubbleTimer = window.setTimeout(
                () => {
                    if (!this.disposed && this.state === state) this.setState('listening')
                },
                state === 'celebrate' ? 3200 : 2400,
            )
        }
    }

    setWaitRandom(random: boolean): void {
        this.waitRandom = random
    }

    setEnabled(value: boolean): void {
        this.host.style.display = value ? '' : 'none'
    }

    setLife(aging: string | null, season: string | null): void {
        this.aging = aging
        this.season = season
        const gray = aging ? (AGING_GRAY[aging] ?? 0.5) : 0
        const tint = season ? (SEASON_TINT[season] ?? SEASON_TINT.spring) : SEASON_TINT.spring
        for (const mat of this.allMats) {
            const base = this.baseColors.get(mat)
            if (!base) continue
            const c = base.clone()
            const lum = (c.r + c.g + c.b) / 3
            c.lerp(new THREE.Color(lum, lum, lum), gray)
            c.multiply(new THREE.Color(tint[0], tint[1], tint[2]))
            mat.color.copy(c)
        }
        if (aging && (AGING_GRAY[aging] ?? 0) >= 0.5) {
            this.setBubble('zzz')
            this.bubbleTtl = 0 // 💤 bám suốt lúc chờ lâu
        } else {
            this.setBubble(BUBBLE_FOR_STATE[this.state] ?? null)
            this.bubbleTtl = this.state === 'thinking' ? 0 : 3
        }
    }

    setAppearance(appearance: RobotAppearanceInput): void {
        const color = parseHexColor(appearance.color)
        this.blueMat.color.setHex(color ?? BRAND_BLUE)
        this.baseColors.set(this.blueMat, this.blueMat.color.clone())
        this.appearScale = Math.max(0.5, Math.min(2, (appearance.scale || 100) / 100))
        if (this.chestPlane) {
            this.chestPlane.visible = appearance.showLogo !== false
            this.drawChestLabel(appearance.logoDataUrl ?? null)
        }
        this.setLife(this.aging, this.season)
    }

    dispose(): void {
        this.disposed = true
        cancelAnimationFrame(this.raf)
        window.clearTimeout(this.bubbleTimer)
        this.renderer.dispose()
        if (this.ownHost) this.host.remove()
        else this.renderer.domElement.remove()
    }

    // ------------------------------------------------------------------
    // Vòng render
    // ------------------------------------------------------------------

    private loop = (): void => {
        if (this.disposed) return
        this.raf = requestAnimationFrame(this.loop)
        const nowMs = performance.now()
        // Frame đầu dt=0; kẹp 50ms để tab ngủ dậy không "tua nhanh" chuyển động.
        const dt = this.lastFrameMs ? Math.min((nowMs - this.lastFrameMs) / 1000, 0.05) : 0
        this.lastFrameMs = nowMs
        this.elapsed += dt
        const t = this.elapsed
        const lerp = 1 - Math.pow(0.0001, dt)
        const to = (cur: number, target: number): number => cur + (target - cur) * lerp

        const p = this.pose
        this.stage.position.y = (p.bob ?? 0.03) * Math.sin(t * 2.2 * (p.speed ?? 1))
        this.stage.scale.setScalar(this.appearScale)
        const slump = this.aging ? (AGING_GRAY[this.aging] ?? 0) * 0.22 : 0

        this.headGroup.rotation.x = to(this.headGroup.rotation.x, (p.headTiltX ?? 0) + slump * 0.6)
        this.headGroup.rotation.z = to(this.headGroup.rotation.z, p.headTiltZ ?? 0)
        this.headGroup.rotation.y = to(this.headGroup.rotation.y, p.headTurnY ?? 0)
        // Tay: rotation.z dương phía trái = giơ ra — đối xứng qua dấu
        this.armLGroup.rotation.z = to(this.armLGroup.rotation.z, p.armL ?? 0)
        this.armRGroup.rotation.z = to(this.armRGroup.rotation.z, -(p.armR ?? 0))
        this.stage.rotation.x = to(this.stage.rotation.x, (p.bodyLean ?? 0) + slump)

        // Chờ AI + chế độ ngẫu nhiên: mỗi ~6s đổi hoạt cảnh nhỏ
        if (this.state === 'thinking' && this.waitRandom) {
            const act = Math.floor(t / 6) % 3
            if (act === 1) this.stage.position.x = Math.sin(t * 1.2) * 0.16
            else this.stage.position.x = to(this.stage.position.x, 0)
            if (act === 2) this.armLGroup.rotation.z = 2.4 + Math.sin(t * 8) * 0.1 // gãi đầu
        } else {
            this.stage.position.x = to(this.stage.position.x, 0)
        }

        // Chớp mắt định kỳ + biểu cảm mặt
        if (t > this.blinkAt) {
            this.blinkUntil = performance.now() / 1000 + 0.13
            this.blinkAt = t + 2.2 + Math.random() * 2.6
            this.faceDirty = true
        } else if (this.blinkUntil && performance.now() / 1000 > this.blinkUntil) {
            this.blinkUntil = 0
            this.faceDirty = true
        }
        this.setFace(this.hoverHappy ? 'happy' : (p.face ?? 'normal'), p.lookX ?? 0)
        if (this.faceDirty) this.drawFace()

        // Áo choàng vẫy (neo mép trên tại vai)
        if (this.cape) {
            const pos = this.cape.geometry.getAttribute('position') as THREE.BufferAttribute
            for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i) // 0 (mép trên) → -1.15 (mép dưới)
                const x = pos.getX(i)
                const droop = -y / 1.15
                pos.setZ(i, -Math.sin(t * 2.2 + y * 3.2 + x * 1.4) * 0.13 * droop - droop * droop * 0.3)
            }
            pos.needsUpdate = true
            this.cape.geometry.computeVertexNormals()
        }

        // Icon có hạn dùng (kết quả) → hết giờ tự ẩn; "…" và 💤 bám (ttl=0).
        if (this.bubbleKind !== null && this.bubbleTtl > 0) {
            this.bubbleTtl -= dt
            if (this.bubbleTtl <= 0) this.setBubble(null)
        }
        // Bong bóng "…" nhấp nháy — chỉ vẽ lại khi đổi pha
        if (this.bubbleKind === 'dots') {
            const phase = Math.floor(t * 2.5)
            if (phase !== this.lastDotPhase) {
                this.lastDotPhase = phase
                this.drawBubble('dots', phase)
            }
        }
        this.bubble.position.y = 2.42 + Math.sin(t * 2) * 0.04

        this.renderer.render(this.scene, this.camera)
    }
}
