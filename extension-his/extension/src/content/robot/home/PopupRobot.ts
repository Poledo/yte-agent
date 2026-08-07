import { RobotView } from '../RobotView'
import { RobotConfig } from '../RobotConfig'
import { LifeDirector } from '../life'
import type { ActivityPick } from '../life'
import { ActivityAnimator, createDefaultActivityAnimator } from './HomeActivityAnimations'
import { RobotMemory } from './RobotMemory'

/** Các phần tử phụ trợ ngoài SVG (chú thích "đang làm gì", trạng thái nhà). */
export interface PopupRobotHooks {
    /** Dòng "robot đang làm gì" (tiếng Việt). */
    caption?: HTMLElement | null
    /** Dòng trạng thái ở-nhà / đi-làm. */
    state?: HTMLElement | null
}

/** Cho phép bơm phụ thuộc để test tất định (đồng hồ, não, animator). */
export interface PopupRobotDeps {
    animator?: ActivityAnimator
    life?: LifeDirector
    memory?: RobotMemory
    now?: () => Date
}

/**
 * PopupRobot — robot "sống trong ngôi nhà" là chính cửa sổ popup của extension
 * (task-002 §2, §3, §4). Tái dùng RobotView (SVG) + LifeDirector (BỘ NÃO) như robot
 * ở trang, KHÔNG nhân đôi logic.
 *
 * Popup là document riêng do Chrome vẽ, tách khỏi DOM trang, nên đây là INSTANCE
 * THỨ HAI của robot đồng bộ trạng thái bật/tắt qua chrome.storage — không phải cùng
 * một phần tử DOM "bay" từ trang qua (điều bất khả). Khi tắt extension: robot trang
 * bay đi "về nhà"; mở popup thấy robot đang ở nhà làm việc riêng.
 */
export class PopupRobot {
    private readonly view: RobotView
    private readonly animator: ActivityAnimator
    private readonly life: LifeDirector
    private readonly memory: RobotMemory
    private readonly now: () => Date

    private base: Animation[] = []
    private gesture: Animation[] = []
    private activityTimer: number | null = null
    private reduceMotion = false
    private enabled = true
    private modeApplied = false
    private greeted = false
    private started = false
    private destroyed = false

    constructor(
        private readonly stage: HTMLElement,
        private readonly hooks: PopupRobotHooks = {},
        deps: PopupRobotDeps = {},
    ) {
        this.animator = deps.animator ?? createDefaultActivityAnimator()
        this.life = deps.life ?? new LifeDirector()
        this.memory = deps.memory ?? new RobotMemory()
        this.now = deps.now ?? (() => new Date())
        this.view = new RobotView(stage)
        this.injectStyle()
    }

    /** Khởi động: đọc cấu hình rồi vào đúng chế độ theo công tắc robot. */
    start(): void {
        if (this.started) return
        this.started = true
        void this.memory.load() // nạp "ký ức" để có thể chào "hôm qua mình đã…"
        this.readReduceMotion()
        this.readEnabled() // đọc trạng thái bật/tắt → applyMode() quyết định đi-làm / ở-nhà
    }

    /** Dọn dẹp khi đóng popup (thực ra Chrome huỷ document, đây là để chắc chắn). */
    destroy(): void {
        this.destroyed = true
        this.clearTimer()
        this.cancel(this.base)
        this.cancel(this.gesture)
        this.base = []
        this.gesture = []
    }

    // ---------------------------------------------------------------
    // Vòng đời sinh hoạt
    // ---------------------------------------------------------------

    /**
     * Đồng bộ với công tắc robot (task-003 §1):
     * - BẬT: robot "rời nhà, xuống trang làm việc" → NHÀ (popup) TRỐNG, không còn robot
     *   ngồi lại. Nếu không, người dùng bật robot mà vẫn thấy robot ở lì trong popup
     *   (đúng lỗi báo: "bật robot nhưng nó vẫn ở popup, không rớt xuống chỗ làm việc").
     * - TẮT: robot đã "về nhà nghỉ" → hiện lại trong popup, sống trọn vòng đời sinh hoạt.
     */
    private applyMode(enabled: boolean): void {
        if (this.destroyed) return
        const firstTime = !this.modeApplied
        const wasEnabled = this.enabled
        const changed = enabled !== this.enabled || !this.modeApplied
        this.enabled = enabled
        this.modeApplied = true
        this.reflectEnabled()
        if (!changed) return
        this.clearTimer()
        if (enabled) {
            // Robot đi làm ngoài trang → popup CHỈ còn thông tin ứng dụng: ẩn HẲN khu
            // "ngôi nhà" robot (yêu cầu người dùng: bật rồi thì popup không hiện gì về robot).
            if (!firstTime && !wasEnabled) {
                // Đang ở nhà, vừa bật: robot "rơi xuống ra trang" rồi mới ẩn khu robot.
                this.playReturnToWork(() => this.hideHome())
            } else {
                this.hideHome()
            }
        } else {
            // Robot về nhà: hiện lại khu robot và sống vòng đời sinh hoạt trong popup.
            this.showHome()
            this.beginLife()
        }
    }

    /** Nghe công-tắc bật khi đang ở nhà: vẫy tay chào rồi "rơi" xuống khỏi popup (ra trang). */
    private playReturnToWork(then: () => void): void {
        this.resetView()
        this.view.setEyeMode('happy')
        this.setCaption('Có việc rồi, mình xuống trang làm đây! 🚀')
        if (this.reduceMotion) {
            then()
            return
        }
        this.gesture = [
            this.view.armRight.animate(
                [
                    { transform: 'rotate(0deg)' },
                    { transform: 'rotate(-40deg)' },
                    { transform: 'rotate(-10deg)' },
                    { transform: 'rotate(-40deg)' },
                ],
                { duration: 600, easing: 'ease-in-out', fill: 'forwards' },
            ),
        ]
        // Robot rơi xuống dưới rồi mờ dần — hình dung "rớt xuống chỗ làm việc" của người dùng.
        this.cancelStageAnim()
        this.stage.style.visibility = 'visible'
        const drop = this.stage.animate(
            [
                { transform: 'translateY(0)', opacity: 1, offset: 0 },
                { transform: 'translateY(-14px)', opacity: 1, offset: 0.28 },
                { transform: 'translateY(120px)', opacity: 0, offset: 1 },
            ],
            { duration: 780, delay: 620, easing: 'cubic-bezier(0.45,0,0.65,1)', fill: 'forwards' },
        )
        drop.onfinish = (): void => {
            if (this.destroyed) return
            then()
        }
    }

    /**
     * Robot đã xuống trang làm việc: ẩn HẲN khu "ngôi nhà" (robot + chú thích + trạng
     * thái) để popup chỉ còn thông tin ứng dụng (yêu cầu người dùng).
     */
    private hideHome(): void {
        this.cancel(this.base)
        this.cancel(this.gesture)
        this.base = []
        this.gesture = []
        this.clearTimer()
        this.setCaption('')
        if (this.hooks.state) this.hooks.state.textContent = ''
        this.homeContainer().style.display = 'none'
    }

    /** Robot về nhà: hiện lại khu "ngôi nhà" và đưa robot xuất hiện trong popup. */
    private showHome(): void {
        this.homeContainer().style.display = ''
        this.setHomePresence(true)
    }

    /** Khu bao "ngôi nhà" (chứa robot + chú thích + trạng thái) — để ẩn/hiện trọn khối. */
    private homeContainer(): HTMLElement {
        return this.stage.parentElement ?? this.stage
    }

    private beginLife(): void {
        // Lần đầu về nhà trong phiên popup này: nếu có "ký ức" thì chào một câu rồi mới sinh hoạt.
        if (!this.greeted) {
            this.greeted = true
            const greeting = this.memory.greeting(this.now())
            if (greeting) {
                this.playGreeting(greeting, () => this.beginLifeCore())
                return
            }
        }
        this.beginLifeCore()
    }

    /** Chào bằng ký ức (vẫy tay vui vẻ) rồi tiếp tục vào vòng đời sinh hoạt. */
    private playGreeting(text: string, then: () => void): void {
        this.resetView()
        this.view.setEyeMode('happy')
        this.setCaption(text)
        if (!this.reduceMotion) {
            this.gesture = [
                this.view.armRight.animate(
                    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-35deg)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(-35deg)' }, { transform: 'rotate(0deg)' }],
                    { duration: 1200, easing: 'ease-in-out' },
                ),
            ]
        }
        this.activityTimer = window.setTimeout(() => {
            if (this.destroyed) return
            then()
        }, 2600)
    }

    private beginLifeCore(): void {
        const first = this.life.nextActivity(this.now())
        // Riêng tư (task §3): mở popup đúng lúc robot đang làm việc riêng → giật mình,
        // che người, đỏ mặt rồi vài giây sau mới tiếp tục hoạt động khác.
        if (first && first.activity.isPrivate) {
            this.playPrivacyReaction(() => this.scheduleNext())
            return
        }
        if (first) {
            this.playActivity(first)
            this.activityTimer = window.setTimeout(() => this.scheduleNext(), first.durationMs)
        } else {
            this.scheduleNext()
        }
    }

    private scheduleNext(): void {
        if (this.destroyed) return
        const pick = this.life.nextActivity(this.now())
        if (!pick) {
            this.activityTimer = window.setTimeout(() => this.scheduleNext(), RobotConfig.timing.idleToLongIdle)
            return
        }
        this.playActivity(pick)
        this.activityTimer = window.setTimeout(() => this.scheduleNext(), pick.durationMs)
    }

    private playActivity(pick: ActivityPick): void {
        this.resetView()
        this.setCaption(`Đang ${pick.activity.label}…`)
        this.memory.record(pick.activity.label, this.now()) // ghi vào "ký ức" để lần sau nhớ lại
        if (!this.reduceMotion) this.base = this.animator.build(pick.activity.id, this.view)
    }

    private playPrivacyReaction(then: () => void): void {
        this.resetView()
        this.view.setCheeksVisible(true)
        this.setCaption('Ơ… đợi mình chút nhé! 🙈')
        if (!this.reduceMotion) {
            this.gesture = [
                this.view.armRight.animate(
                    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-120deg)' }, { transform: 'rotate(-120deg)' }],
                    { duration: 600, easing: 'ease-out', fill: 'forwards' },
                ),
                this.view.head.animate(
                    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(-14deg)' }],
                    { duration: 600, easing: 'ease-out', fill: 'forwards' },
                ),
            ]
        }
        this.activityTimer = window.setTimeout(() => {
            if (this.destroyed) return
            this.view.setCheeksVisible(false)
            then()
        }, 2600)
    }

    // ---------------------------------------------------------------
    // Tiện ích view
    // ---------------------------------------------------------------

    /** Đưa SVG về "trung tính" trước khi dựng hoạt động mới (tránh dư trạng thái). */
    private resetView(): void {
        this.cancel(this.base)
        this.cancel(this.gesture)
        this.base = []
        this.gesture = []
        this.view.setEyeMode('open')
        this.view.setZzzVisible(false)
        this.view.setThumbVisible(false)
        this.view.setCheeksVisible(false)
        this.view.setSweatVisible(false)
        this.view.setHeadTilt(0)
        this.view.setPupilOffset(0, 0)
    }

    private setCaption(text: string): void {
        if (this.hooks.caption) this.hooks.caption.textContent = text
    }

    private reflectEnabled(): void {
        if (!this.hooks.state) return
        // Bật (đang làm ngoài trang): khu robot bị ẩn nên để trống. Tắt: robot ở nhà nghỉ.
        this.hooks.state.textContent = this.enabled ? '' : '🏠 Robot đã về nhà nghỉ ngơi'
    }

    /**
     * Robot "có mặt ở nhà" (popup) hay không: khi đi làm ngoài trang thì ẩn SVG để
     * NHÀ TRỐNG; khi về nhà thì hiện lại. Huỷ mọi animation "rơi xuống" còn treo.
     */
    private setHomePresence(present: boolean): void {
        this.cancelStageAnim()
        this.stage.style.transform = ''
        this.stage.style.opacity = present ? '1' : '0'
        this.stage.style.visibility = present ? 'visible' : 'hidden'
    }

    private cancelStageAnim(): void {
        for (const a of this.stage.getAnimations()) {
            try {
                a.cancel()
            } catch {
                /* animation đã kết thúc — bỏ qua */
            }
        }
    }

    // ---------------------------------------------------------------
    // Cấu hình (đồng bộ qua chrome.storage)
    // ---------------------------------------------------------------

    private readEnabled(): void {
        const key = RobotConfig.storageKey.enabled
        try {
            chrome.storage?.local?.get({ [key]: true }, (items) => {
                this.applyMode(items[key] !== false)
            })
            chrome.storage?.onChanged?.addListener((changes, area) => {
                if (area !== 'local' || !changes[key]) return
                this.applyMode(changes[key].newValue !== false)
            })
        } catch {
            this.applyMode(true)
        }
    }

    private readReduceMotion(): void {
        try {
            const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
            this.reduceMotion = media?.matches === true
            chrome.storage?.local?.get({ [RobotConfig.storageKey.reduceMotion]: false }, (items) => {
                this.reduceMotion = this.reduceMotion || items[RobotConfig.storageKey.reduceMotion] === true
            })
        } catch {
            /* không đọc được cấu hình — giữ mặc định có chuyển động */
        }
    }

    private injectStyle(): void {
        const doc = this.stage.ownerDocument
        if (!this.stage.id) this.stage.id = 'popup-robot'
        if (doc.getElementById('popup-robot-style')) return
        const style = doc.createElement('style')
        style.id = 'popup-robot-style'
        style.textContent = `
            #${this.stage.id} svg { display: block; margin: 0 auto; overflow: visible;
                filter: drop-shadow(0 4px 8px rgba(0,60,110,0.18)); }
            #robot-head { transition: transform 0.18s ease-out; }
            #robot-pupils { transition: transform 0.14s ease-out; }
            ${RobotView.partOriginCss()}
        `
        doc.head.appendChild(style)
    }

    // ---------------------------------------------------------------
    // Hạ tầng
    // ---------------------------------------------------------------

    private cancel(list: Animation[]): void {
        for (const a of list) {
            try {
                a.cancel()
            } catch {
                /* animation đã kết thúc — bỏ qua */
            }
        }
    }

    private clearTimer(): void {
        if (this.activityTimer !== null) {
            clearTimeout(this.activityTimer)
            this.activityTimer = null
        }
    }
}
