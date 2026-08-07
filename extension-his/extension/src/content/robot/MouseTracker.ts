import { RobotView } from './RobotView'
import { RobotConfig } from './RobotConfig'

export interface MouseTrackerCallbacks {
    /** Người dùng có cử động chuột (dùng để reset hẹn giờ idle / đánh thức). */
    onActivity(): void
    /** Con trỏ vào/ra vùng hover quanh robot. */
    onHoverChange(hovering: boolean): void
    /** Con trỏ ở quá cao liên tục đủ lâu → robot mất thăng bằng. */
    onOffBalance(): void
}

/**
 * Mouse Tracker (RDD §5): mắt luôn nhìn chuột, đầu xoay theo chuột (±góc),
 * con trỏ lên quá cao và giữ lâu → mất thăng bằng (RobotMascot cho té).
 *
 * Luôn nghe mousemove để báo "có hoạt động" (đánh thức khi ngủ); nhưng chỉ ÁP
 * hướng nhìn lên đầu/con-ngươi khi applyGaze bật (các state Idle/Watching/Hover).
 */
export class MouseTracker {
    private applyGaze = true
    private started = false
    private hovering = false
    private offBalanceTimer: number | null = null
    private readonly onMove = (e: MouseEvent): void => this.handleMove(e)

    constructor(
        private readonly host: HTMLElement,
        private readonly view: RobotView,
        private readonly cb: MouseTrackerCallbacks,
    ) {}

    start(): void {
        if (this.started) return
        this.started = true
        window.addEventListener('mousemove', this.onMove, { passive: true })
    }

    stop(): void {
        if (!this.started) return
        this.started = false
        window.removeEventListener('mousemove', this.onMove)
        this.clearOffBalance()
    }

    /** Bật/tắt việc điều khiển hướng nhìn (đầu + con ngươi) theo chuột. */
    setApplyGaze(value: boolean): void {
        this.applyGaze = value
        if (!value) {
            this.view.setPupilOffset(0, 0)
            this.view.setHeadTilt(0)
            this.clearOffBalance()
        }
    }

    private center(): { x: number; y: number } {
        const r = this.host.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height * 0.34 }
    }

    private handleMove(e: MouseEvent): void {
        this.cb.onActivity()

        const c = this.center()
        const dx = e.clientX - c.x
        const dy = e.clientY - c.y
        const dist = Math.hypot(dx, dy)

        const nowHover = dist < RobotConfig.mouse.hoverRadius
        if (nowHover !== this.hovering) {
            this.hovering = nowHover
            this.cb.onHoverChange(nowHover)
        }

        if (!this.applyGaze) return

        // Con ngươi nhìn theo chuột.
        this.view.setPupilOffset(dx / 42, dy / 42)

        // Đầu xoay theo phương ngang, kẹp trong ±headMaxDeg.
        const deg = Math.max(-RobotConfig.mouse.headMaxDeg, Math.min(RobotConfig.mouse.headMaxDeg, dx / 12))
        this.view.setHeadTilt(deg)

        // Chuột cao hơn robot quá ngưỡng → bắt đầu đếm giờ mất thăng bằng.
        const tooHigh = dy < -RobotConfig.mouse.lookUpThreshold
        if (tooHigh) {
            if (this.offBalanceTimer === null) {
                this.offBalanceTimer = window.setTimeout(() => {
                    this.offBalanceTimer = null
                    if (this.applyGaze) this.cb.onOffBalance()
                }, RobotConfig.mouse.offBalanceMs)
            }
        } else {
            this.clearOffBalance()
        }
    }

    private clearOffBalance(): void {
        if (this.offBalanceTimer !== null) {
            clearTimeout(this.offBalanceTimer)
            this.offBalanceTimer = null
        }
    }
}
