import { RobotConfig } from './RobotConfig'
import { RobotState, RobotEmotion, StatePriority } from './RobotState'
import { RobotView } from './RobotView'
import { EmotionEngine } from './EmotionEngine'
import { AnimationController } from './AnimationController'
import { StateMachine } from './StateMachine'
import { MouseTracker } from './MouseTracker'
import { PhysicsController } from './PhysicsController'
import { ObstacleAvoidance, type AvoidanceReact } from './ObstacleAvoidance'
import { PopupController } from './PopupController'
import { EXTENSION_HOST_IDS } from '../../shared/dom/ExtensionHostIds'
import { burstConfetti } from './Confetti'
import { spawnSeasonParticles, clearSeasonParticles, isSeasonParticle, seasonParticleRate } from './SeasonParticles'
import { AnimationName } from './animations'
import { LifeDirector } from './life'
import type { WaitSnapshot, LifeThresholdOverride } from './life'
import type { RobotRenderer } from './RobotRenderer'

/** Tuỳ chọn hình hài SVG. `lively` = biến thể "Bi Động": cử động thường xuyên hơn. */
export interface RobotMascotOptions {
    lively?: boolean
    /** Ngưỡng thời gian bơm từ web-admin (leo thang / mùa / hoá già). */
    thresholds?: LifeThresholdOverride
}

/** Kết quả kiểm tra để robot phản ứng cảm xúc (task §8, RDD §6). */
export type RobotResult = 'success' | 'allValid' | 'warning' | 'localError' | 'aiError'

/**
 * Chờ AI càng lâu → robot hoá già dần (task-002 §7). Ánh xạ id giai đoạn → filter
 * CSS (chỉ hiệu ứng, không đổi dữ liệu). Đây là "vài ví dụ" ở lớp view; thêm/đổi
 * giai đoạn chỉ cần sửa RobotLifeConfig + bảng này.
 */
const PAGE_AGING_FILTER: Record<string, string> = {
    dust: 'grayscale(0.15)',
    dustMore: 'grayscale(0.3)',
    rust: 'grayscale(0.4) sepia(0.25)',
    loose: 'grayscale(0.5) sepia(0.3)',
    grayHair: 'grayscale(0.65) sepia(0.3)',
    cane: 'grayscale(0.75) sepia(0.35)',
    slow: 'grayscale(0.85) sepia(0.4)',
    elder: 'grayscale(1) sepia(0.5) opacity(0.9)',
}

/**
 * Cử chỉ minh hoạ khi CHỜ Ở CHẾ ĐỘ NGẪU NHIÊN: mỗi lần "đổi hoạt động" bốc một cử chỉ
 * để robot trông đang làm việc khác nhau (lớp view — bộ não chỉ quyết định "đổi lúc nào").
 */
const WAIT_RANDOM_GESTURES: AnimationName[] = ['lookAround', 'scratchHead', 'wave', 'nod', 'tiltCurious', 'yawn']

/** Bốn mùa khi chờ cực lâu (task-002 §6) — tint nhẹ để "đổi mùa" quanh robot. */
const PAGE_SEASON_FILTER: Record<string, string> = {
    spring: '',
    summer: 'saturate(1.2) brightness(1.05)',
    autumn: 'sepia(0.35)',
    winter: 'brightness(1.08) saturate(0.85)',
}

/**
 * Robot Controller (RDD §2): nhạc trưởng ghép mọi module — View, Emotion,
 * Animation, StateMachine, MouseTracker, Physics, Popup — thành một mascot sống
 * động. Là DUY NHẤT nơi biết "state nào thì làm gì"; các module con không phụ
 * thuộc nhau (SRP + composition, theo Coding Rules).
 *
 * Vòng đời: khởi tạo host (Shadow DOM) → PopupController quyết định BẬT/TẮT →
 * BẬT thì vào Idle và bắt đầu sống; TẮT thì ngủ ngoài màn hình.
 */
export class RobotMascot implements RobotRenderer {
    private readonly host: HTMLElement
    private readonly stage: HTMLElement
    private readonly view: RobotView
    private readonly emotion: EmotionEngine
    private readonly anim: AnimationController
    private readonly sm: StateMachine
    private readonly tracker: MouseTracker
    private readonly physics: PhysicsController
    /** Né nút của trang nằm trùng chỗ đậu (vd nút "Ký số" ở đáy màn hình bảng kê). */
    private readonly avoidance: ObstacleAvoidance
    private readonly popup: PopupController
    /** Bộ não sinh hoạt (RDD Expansion v2) — dùng cho leo thang khi chờ AI lâu. */
    private readonly life: LifeDirector

    private activateCb: (() => void) | null = null
    private booted = false
    /** Tăng mỗi lần đổi state — chặn continuation async của state đã cũ. */
    private seq = 0

    private idleGestureTimer: number | null = null
    private idleToLongTimer: number | null = null
    private longToSleepTimer: number | null = null
    private autoReturnTimer: number | null = null
    private typingTimer: number | null = null
    /** Ticker "chờ AI lâu": chạy khi ở Thinking, đo elapsed để leo thang/hoá già. */
    private waitTimer: number | null = null
    private waitStart = 0
    private waitPrev = 0
    /** Chế độ NGẪU NHIÊN của leo thang chờ AI (bơm từ web-admin qua thresholds). */
    private readonly waitRandom: boolean
    /** Có tôn trọng "giảm chuyển động" không (tắt hạt mùa nếu bật). */
    private reduceMotion = false

    constructor(private readonly options: RobotMascotOptions = {}) {
        this.life = new LifeDirector({ thresholds: options.thresholds })
        this.waitRandom = options.thresholds?.waitEscalationRandom === true
        this.host = document.createElement('div')
        this.host.id = EXTENSION_HOST_IDS.robotSvg
        this.host.style.cssText = `position:fixed; right:${RobotConfig.home.right}px; bottom:${RobotConfig.home.bottom}px;
            width:${RobotConfig.size.width}px; height:${RobotConfig.size.height}px; z-index:2147483647;
            cursor:pointer; overflow:visible; user-select:none;`
        const shadow = this.host.attachShadow({ mode: 'open' })
        const style = document.createElement('style')
        style.textContent = this.getStyles()
        const stage = document.createElement('div')
        stage.className = 'robot-stage'
        shadow.append(style, stage)
        this.stage = stage

        this.view = new RobotView(stage)
        this.emotion = new EmotionEngine(this.view)
        this.anim = new AnimationController(this.view)
        this.physics = new PhysicsController(this.host)
        this.sm = new StateMachine(RobotState.Boot, (to, from) => this.onEnter(to, from))
        this.tracker = new MouseTracker(this.host, this.view, {
            onActivity: () => this.onActivity(),
            onHoverChange: (h) => this.onHoverChange(h),
            onOffBalance: () => this.sm.dispatch(RobotState.Fell, StatePriority.Mouse),
        })
        this.popup = new PopupController((enabled) => this.onEnabledChange(enabled))
        this.avoidance = new ObstacleAvoidance(this.host, {
            home: RobotConfig.home,
            size: RobotConfig.size,
            mover: this.physics,
            onReact: (react) => this.onAvoidanceReact(react),
        })

        this.host.addEventListener('click', () => this.onClick())
        this.host.title = 'ZeroCheck AI'
        document.body.appendChild(this.host)

        this.applyReduceMotion()
        this.tracker.start()
        this.avoidance.start()
        this.popup.init()
    }

    // ---------------------------------------------------------------
    // API công khai (content script / ChatPanel gọi vào)
    // ---------------------------------------------------------------

    /** Đăng ký hành động khi người dùng bấm vào robot (mở panel trợ lý). */
    onActivate(cb: () => void): void {
        this.activateCb = cb
    }

    /** Mở khung chat → robot vui vẻ, đứng chờ lệnh (task §5). */
    notifyChatOpened(): void {
        this.sm.dispatch(RobotState.Listening, StatePriority.UserClick)
    }

    /** Đóng khung chat → về idle. */
    notifyChatClosed(): void {
        if (this.sm.is(RobotState.Flying, RobotState.Falling, RobotState.Disabled, RobotState.Landing)) return
        this.sm.dispatch(RobotState.Idle, StatePriority.UserClick)
    }

    /** Người dùng đang gõ câu hỏi → nghiêng đầu nhìn ô nhập (task §6). */
    notifyTyping(): void {
        this.sm.dispatch(RobotState.Typing, StatePriority.UserClick)
        if (this.typingTimer !== null) clearTimeout(this.typingTimer)
        this.typingTimer = window.setTimeout(() => {
            if (this.sm.is(RobotState.Typing)) this.sm.dispatch(RobotState.Listening, StatePriority.UserClick)
        }, 1600)
    }

    /** AI/hệ thống đang xử lý → suy nghĩ (task §7). */
    notifyThinking(active: boolean): void {
        if (active) {
            this.sm.dispatch(RobotState.Thinking, StatePriority.UserClick)
        } else if (this.sm.is(RobotState.Thinking)) {
            this.sm.dispatch(RobotState.Listening, StatePriority.UserClick)
        }
    }

    /** Có kết quả kiểm tra → phản ứng cảm xúc (task §8). */
    notifyResult(result: RobotResult): void {
        const map: Record<RobotResult, RobotState> = {
            success: RobotState.Happy,
            allValid: RobotState.Celebrate,
            warning: RobotState.Confused,
            localError: RobotState.PointError,
            aiError: RobotState.Sad,
        }
        this.sm.dispatch(map[result], StatePriority.Validation)
    }

    destroy(): void {
        this.clearAllTimers()
        this.tracker.stop()
        this.avoidance.destroy()
        this.anim.cancelAll()
        this.physics.cancel()
        this.host.remove()
    }

    // ---------------------------------------------------------------
    // Xử lý sự kiện nội bộ
    // ---------------------------------------------------------------

    private onClick(): void {
        if (this.sm.is(RobotState.Disabled)) return
        this.activateCb?.()
        if (this.sm.is(RobotState.Sleeping, RobotState.LongIdle)) this.onActivity()
    }

    private onActivity(): void {
        if (this.sm.is(RobotState.Sleeping)) {
            this.sm.dispatch(RobotState.WakeUp, StatePriority.Mouse)
        } else if (this.sm.is(RobotState.LongIdle)) {
            this.sm.dispatch(RobotState.Idle, StatePriority.Mouse)
        } else if (this.sm.is(RobotState.Idle)) {
            this.armIdleTimers() // còn cử động thì lùi mốc buồn ngủ
        }
    }

    private onHoverChange(hovering: boolean): void {
        if (hovering) {
            this.sm.dispatch(RobotState.Hover, StatePriority.Mouse)
        } else if (this.sm.is(RobotState.Hover)) {
            this.sm.dispatch(RobotState.Idle, StatePriority.Mouse)
        }
    }

    private onEnabledChange(enabled: boolean): void {
        // Lần đầu (lúc nạp trang): vào thẳng trạng thái, không diễn hoạt lớn.
        if (!this.booted) {
            this.booted = true
            if (enabled) {
                this.sm.force(RobotState.Idle)
            } else {
                this.sm.force(RobotState.Disabled)
            }
            return
        }
        // Đổi công tắc lúc đang chạy: luôn ngắt được mọi state (Critical).
        this.sm.force(enabled ? RobotState.Falling : RobotState.Flying)
    }

    // ---------------------------------------------------------------
    // State machine: mỗi state cấu hình gaze + base anim + emotion + gesture
    // ---------------------------------------------------------------

    private onEnter(to: RobotState, _from: RobotState): void {
        const gen = ++this.seq
        this.anim.cancelGestures()
        this.clearAutoReturn()
        this.clearIdleTimers()
        this.stopWaitEscalation() // rời Thinking → đảo ngược hiệu ứng chờ (bụi/mùa)

        switch (to) {
            case RobotState.Idle:
                this.enterIdle()
                break

            case RobotState.LongIdle:
                this.tracker.setApplyGaze(true)
                this.emotion.set(RobotEmotion.Sleepy)
                this.anim.setBase('breathe')
                this.host.style.transform = 'translateY(6px)' // ngồi thấp xuống
                this.longToSleepTimer = window.setTimeout(
                    () => this.sm.dispatch(RobotState.Sleeping, StatePriority.Idle),
                    RobotConfig.timing.longIdleToSleep,
                )
                break

            case RobotState.Sleeping:
                this.tracker.setApplyGaze(false)
                this.emotion.set(RobotEmotion.Sleepy)
                this.anim.setBase('sleepBob')
                this.host.style.transform = 'translateY(6px)'
                break

            case RobotState.WakeUp:
                this.view.setZzzVisible(false)
                this.tracker.setApplyGaze(false)
                this.emotion.set(RobotEmotion.Surprised)
                this.host.style.transform = ''
                this.anim.setBase('breathe')
                this.anim.playGesture('wake').then(() => this.thenIf(gen, () => this.sm.force(RobotState.Idle)))
                break

            case RobotState.Hover:
                this.view.setZzzVisible(false)
                this.tracker.setApplyGaze(true)
                this.emotion.set(RobotEmotion.Happy)
                this.anim.setBase('breathe')
                this.host.style.transform = ''
                this.anim.playGesture('wave')
                break

            case RobotState.Listening:
                this.gazeOffPose(RobotEmotion.Happy)
                this.anim.setBase('breathe')
                this.anim.playGesture('nod')
                break

            case RobotState.Typing:
                this.gazeOffPose(RobotEmotion.Curious)
                this.anim.setBase('breathe')
                this.anim.playGesture('tiltCurious')
                break

            case RobotState.Thinking:
                this.gazeOffPose(RobotEmotion.Focused)
                this.anim.setBase('think')
                this.startWaitEscalation(gen)
                break

            case RobotState.Explaining:
                this.gazeOffPose(RobotEmotion.Happy)
                this.anim.setBase('breathe')
                this.anim.playGesture('nod')
                this.autoReturn(gen, RobotState.Listening, 1800)
                break

            case RobotState.Happy:
                this.gazeOffPose(RobotEmotion.Happy)
                this.anim.setBase('breathe')
                this.anim.playGesture('thumbsUp')
                this.autoReturn(gen, RobotState.Idle, 2200)
                break

            case RobotState.Celebrate:
                this.gazeOffPose(RobotEmotion.Proud)
                this.anim.setBase('breathe')
                this.anim.playGesture('celebrate')
                this.physics.hop()
                burstConfetti(this.stage)
                this.autoReturn(gen, RobotState.Idle, 2600)
                break

            case RobotState.Confused:
                this.gazeOffPose(RobotEmotion.Embarrassed)
                this.anim.setBase('breathe')
                this.anim.playGesture('scratchHead')
                this.autoReturn(gen, RobotState.Idle, 2600)
                break

            case RobotState.Sad:
                this.gazeOffPose(RobotEmotion.Sad)
                this.anim.setBase('breathe')
                this.anim.playGesture('sad')
                this.host.style.transform = 'translateY(5px)' // ngồi xuống
                this.autoReturn(gen, RobotState.Idle, 3000)
                break

            case RobotState.PointError:
                this.gazeOffPose(RobotEmotion.Sad)
                this.anim.setBase('breathe')
                this.anim.playGesture('pointError')
                this.autoReturn(gen, RobotState.Idle, 3200)
                break

            case RobotState.Flying:
                this.enterFlying(gen)
                break

            case RobotState.Disabled:
                this.clearAllTimers()
                this.avoidance.setEnabled(false) // đang ngủ trên popup, không dời chỗ trong trang
                this.tracker.setApplyGaze(false)
                this.emotion.set(RobotEmotion.Sleepy)
                this.anim.setBase(null)
                this.host.style.pointerEvents = 'none'
                break

            case RobotState.Falling:
                this.enterFalling(gen)
                break

            case RobotState.Landing:
                this.enterLanding(gen)
                break

            case RobotState.Fell:
                this.enterFell(gen)
                break

            case RobotState.Boot:
            default:
                break
        }
    }

    /** Tư thế "tập trung": tắt nhìn theo chuột, đặt cảm xúc, về thẳng người. */
    private gazeOffPose(emotion: RobotEmotion): void {
        this.view.setZzzVisible(false)
        this.tracker.setApplyGaze(false)
        this.view.setHeadTilt(0)
        this.view.setPupilOffset(0, 0)
        this.emotion.set(emotion)
        this.host.style.transform = ''
    }

    /**
     * Diễn kèm khi robot né nút của trang. Chỉ thêm biểu cảm lúc robot đang rảnh —
     * đang suy nghĩ/báo kết quả thì cứ dời chỗ, không cướp mất khuôn mặt của việc đó.
     */
    private onAvoidanceReact(react: AvoidanceReact): void {
        if (!this.sm.is(RobotState.Idle, RobotState.LongIdle, RobotState.Sleeping, RobotState.Hover, RobotState.Watching)) return
        switch (react) {
            case 'bump':
                this.emotion.set(RobotEmotion.Surprised) // đụng phải nút, té ngửa
                break
            case 'stand':
                this.emotion.set(RobotEmotion.Happy) // leo lên nút đứng chơi
                break
            case 'home':
                this.emotion.set(RobotEmotion.Happy) // nhảy về chỗ cũ
                break
            case 'settled':
                this.emotion.set(this.sm.is(RobotState.LongIdle, RobotState.Sleeping) ? RobotEmotion.Sleepy : RobotEmotion.Neutral)
                break
        }
    }

    private enterIdle(): void {
        this.view.setZzzVisible(false)
        this.view.setThumbVisible(false)
        this.host.style.pointerEvents = 'auto'
        this.host.style.transform = ''
        this.host.style.opacity = ''
        this.emotion.set(RobotEmotion.Neutral)
        this.tracker.setApplyGaze(true)
        this.avoidance.setEnabled(true)
        this.anim.setBase('breathe')
        this.armIdleTimers()
    }

    private enterFlying(gen: number): void {
        this.clearAllTimers()
        this.avoidance.setEnabled(false) // đang bay lên popup: nhường hẳn transform cho physics
        this.view.setZzzVisible(false)
        this.tracker.setApplyGaze(false)
        this.emotion.set(RobotEmotion.Surprised)
        this.anim.setBase(null)
        this.physics.flyToPopup().then(() => this.thenIf(gen, () => this.sm.force(RobotState.Disabled)))
    }

    private enterFalling(gen: number): void {
        this.clearAllTimers()
        this.host.style.pointerEvents = 'auto'
        this.view.setZzzVisible(false)
        this.tracker.setApplyGaze(false)
        this.emotion.set(RobotEmotion.Surprised)
        this.anim.setBase(null)
        this.physics.dropIn().then(() => this.thenIf(gen, () => this.sm.force(RobotState.Landing)))
    }

    private enterLanding(gen: number): void {
        this.emotion.set(RobotEmotion.Embarrassed) // đáp hơi mạnh → u đầu
        this.anim.setBase('breathe')
        this.physics.landingSquash().then(() =>
            this.thenIf(gen, () => {
                this.emotion.set(RobotEmotion.Happy) // rồi cười (task §2)
                this.anim.playGesture('thumbsUp')
                window.setTimeout(() => this.thenIf(gen, () => this.sm.force(RobotState.Idle)), 800)
            }),
        )
    }

    private enterFell(gen: number): void {
        this.tracker.setApplyGaze(false)
        this.emotion.set(RobotEmotion.Embarrassed)
        this.anim.setBase(null)
        this.physics.fall().then(() =>
            this.thenIf(gen, () => {
                this.anim.playGesture('dizzy')
                window.setTimeout(() => this.thenIf(gen, () => this.sm.force(RobotState.Idle)), 700)
            }),
        )
    }

    // ---------------------------------------------------------------
    // Chờ AI lâu → leo thang + hoá già + đổi mùa (task-002 §5, §6, §7)
    // ---------------------------------------------------------------

    /**
     * Bắt đầu đếm thời gian chờ AI. Mỗi giây hỏi LifeDirector "đã tới mốc nào" rồi
     * diễn ở lớp view: ngồi xuống khi chờ lâu, phủ bụi/rỉ sét (hoá già), tint theo
     * mùa. Bộ NÃO quyết-định nằm ở life/; đây chỉ ánh xạ id → hiệu ứng (mở rộng
     * bằng cách sửa RobotLifeConfig + bảng ánh xạ, không đụng kiến trúc).
     */
    private startWaitEscalation(gen: number): void {
        this.waitStart = Date.now()
        this.waitPrev = 0
        this.life.resetWait() // phiên chờ mới → chế độ ngẫu nhiên bốc lại chuỗi hoạt động
        const tick = (): void => {
            if (gen !== this.seq) return
            const elapsed = Date.now() - this.waitStart
            const crossed = this.life.waitCrossings(this.waitPrev, elapsed)
            if (crossed.stage) this.playWaitStage(crossed.stage.id)
            const snap = this.life.waitSnapshot(elapsed)
            this.applyThinkingVisual(snap)
            this.emitSeasonParticles(snap)
            this.waitPrev = elapsed
            this.waitTimer = window.setTimeout(tick, 1000)
        }
        this.waitTimer = window.setTimeout(tick, 1000)
    }

    /** Dừng ticker + đảo ngược mọi hiệu ứng chờ (task-002 §8: có kết quả → trẻ lại). */
    private stopWaitEscalation(): void {
        if (this.waitTimer !== null) {
            clearTimeout(this.waitTimer)
            this.waitTimer = null
        }
        this.stage.style.filter = ''
        clearSeasonParticles(this.stage)
    }

    /**
     * Bắn hạt mùa (cánh hoa/lá/tuyết…) quanh robot khi chờ AI lâu (task-003 §5).
     * Lấy mùa hiện tại từ BỘ NÃO life/, chỉ vẽ ở lớp view. Tôn trọng "giảm chuyển động".
     */
    private emitSeasonParticles(snap: WaitSnapshot): void {
        if (this.reduceMotion || !snap.season) return
        const effect = snap.season.effects.find((e) => isSeasonParticle(e))
        if (!effect) return
        spawnSeasonParticles(this.stage, effect, seasonParticleRate(effect))
    }

    /**
     * Diễn khi bước sang một "hoạt động" chờ AI:
     *  - Chế độ ngẫu nhiên: mỗi lần đổi bốc một cử chỉ ngẫu nhiên (đứng chờ, không ngồi lún).
     *  - Chế độ mặc định (leo thang): từ "ngồi xuống" trở đi robot ngồi thấp lại.
     */
    private playWaitStage(id: string): void {
        if (this.waitRandom) {
            const pick = WAIT_RANDOM_GESTURES[Math.floor(Math.random() * WAIT_RANDOM_GESTURES.length)]
            this.anim.playGesture(pick)
            return
        }
        if (id === 'think') return
        this.host.style.transform = 'translateY(6px)'
    }

    /** Ghép filter hoá-già + mùa hiện tại lên robot (đảo ngược = xoá filter). */
    private applyThinkingVisual(snap: WaitSnapshot): void {
        const parts: string[] = []
        if (snap.aging) parts.push(PAGE_AGING_FILTER[snap.aging.id] ?? '')
        if (snap.season) parts.push(PAGE_SEASON_FILTER[snap.season.id] ?? '')
        this.stage.style.filter = parts.filter(Boolean).join(' ')
    }

    // ---------------------------------------------------------------
    // Hẹn giờ & tiện ích
    // ---------------------------------------------------------------

    private armIdleTimers(): void {
        this.clearIdleTimers()
        this.scheduleIdleGesture()
        this.idleToLongTimer = window.setTimeout(
            () => this.sm.dispatch(RobotState.LongIdle, StatePriority.Idle),
            RobotConfig.timing.idleToLongIdle,
        )
    }

    private scheduleIdleGesture(): void {
        const { idleGestureMin, idleGestureMax } = RobotConfig.timing
        // "Bi Động" (lively): rút ngắn khoảng nghỉ và thêm cử chỉ vui để robot hoạt náo hơn.
        const factor = this.options.lively ? 0.5 : 1
        const delay = (idleGestureMin + Math.random() * (idleGestureMax - idleGestureMin)) * factor
        this.idleGestureTimer = window.setTimeout(() => {
            if (this.sm.is(RobotState.Idle)) {
                const gestures: AnimationName[] = this.options.lively
                    ? ['blink', 'lookAround', 'scratchHead', 'yawn', 'wave', 'nod']
                    : ['blink', 'blink', 'lookAround', 'scratchHead', 'yawn']
                const pick = gestures[Math.floor(Math.random() * gestures.length)]
                this.anim.playGesture(pick)
            }
            this.scheduleIdleGesture()
        }, delay)
    }

    private autoReturn(gen: number, to: RobotState, ms: number): void {
        this.autoReturnTimer = window.setTimeout(() => this.thenIf(gen, () => this.sm.dispatch(to, StatePriority.Validation)), ms)
    }

    /** Chạy fn chỉ khi state chưa đổi kể từ khi bắt đầu chuỗi async (tránh đua). */
    private thenIf(gen: number, fn: () => void): void {
        if (gen === this.seq) fn()
    }

    private clearIdleTimers(): void {
        this.clearTimer('idleGestureTimer')
        this.clearTimer('idleToLongTimer')
        this.clearTimer('longToSleepTimer')
    }

    private clearAutoReturn(): void {
        this.clearTimer('autoReturnTimer')
    }

    private clearAllTimers(): void {
        this.clearIdleTimers()
        this.clearAutoReturn()
        this.clearTimer('typingTimer')
        this.stopWaitEscalation()
    }

    private clearTimer(name: 'idleGestureTimer' | 'idleToLongTimer' | 'longToSleepTimer' | 'autoReturnTimer' | 'typingTimer'): void {
        const id = this[name]
        if (id !== null) {
            clearTimeout(id)
            this[name] = null
        }
    }

    private applyReduceMotion(): void {
        try {
            const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
            let reduce = media?.matches === true
            this.reduceMotion = reduce
            chrome.storage?.local?.get({ [RobotConfig.storageKey.reduceMotion]: false }, (items) => {
                reduce = reduce || items[RobotConfig.storageKey.reduceMotion] === true
                this.reduceMotion = reduce
                this.anim.setReduceMotion(reduce)
            })
        } catch {
            /* không đọc được cấu hình — giữ chuyển động mặc định */
        }
    }

    private getStyles(): string {
        return `
            :host { all: initial; }
            .robot-stage { position: relative; width: 100%; height: 100%; }
            .robot-svg { display: block; overflow: visible; filter: drop-shadow(0 4px 8px rgba(0,60,110,0.20)); }
            /* Gaze mượt: đầu & con ngươi có transition nhẹ; WAAPI vẫn ghi đè khi có gesture. */
            #robot-head { transition: transform 0.18s ease-out; }
            #robot-pupils { transition: transform 0.14s ease-out; }
            ${RobotView.partOriginCss()}
        `
    }
}
