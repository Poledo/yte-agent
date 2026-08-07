import type { RobotRenderer } from '../RobotRenderer'
import type { RobotResult } from '../RobotMascot'
import { RobotMascot } from '../RobotMascot'
import { PopupController } from '../PopupController'
import { LifeDirector, type LifeThresholdOverride } from '../life'
import type { RobotAppearance } from '../ExtensionConfig'
import { ROBOT3D_CMD, ROBOT3D_ACTIVATE, ROBOT3D_READY, ROBOT3D_FAILED, Robot3DCommand } from './Robot3DProtocol'

/**
 * Hình hài "Bi 3D": phía content script CHỈ là proxy nhẹ — chèn module ThreeJS
 * (web_accessible_resource) vào page world rồi ra lệnh qua CustomEvent. KHÔNG import
 * ThreeJS ở đây để content script luôn nhẹ (task-003 Part 2).
 *
 * An toàn: nếu không tải được module 3D (mạng/asset lỗi), tự quay về robot SVG để
 * trang luôn có robot và không phát lỗi console (đúng "Task chỉ xong khi không lỗi").
 */
export class ThreeRobotRenderer implements RobotRenderer {
    private activateCb: (() => void) | null = null
    private fallback: RobotMascot | null = null
    private script: HTMLScriptElement | null = null
    private ready = false
    private destroyed = false
    private lastEnabled = true

    // Đồng hồ CHỜ AI (tái dùng BỘ NÃO life để robot 3D cũng HOÁ GIÀ + ĐỔI MÙA như robot
    // SVG). Chỉ là logic thuần (không DOM) nên dùng chung được, không đụng kiến trúc.
    private readonly life = new LifeDirector({ thresholds: this.thresholds })
    private waitStart = 0
    private lifeTimer = 0
    private lastAging: string | null = null
    private lastSeason: string | null = null
    private readonly popup = new PopupController((enabled) => {
        this.lastEnabled = enabled
        this.send({ type: 'enabled', value: enabled })
    })
    private readonly onActivateEvt = (): void => this.activateCb?.()
    private readonly onReadyEvt = (): void => {
        this.ready = true
        // Áp diện mạo (màu/cỡ/logo) TRƯỚC, rồi đồng bộ trạng thái bật/tắt hiện tại.
        if (this.appearance) {
            this.send({
                type: 'appearance',
                color: this.appearance.color,
                scale: this.appearance.scale,
                showLogo: this.appearance.showLogo,
                logoDataUrl: this.appearance.logoDataUrl,
            })
        }
        this.send({ type: 'enabled', value: this.lastEnabled })
    }
    private readonly onFailedEvt = (): void => this.useFallback()

    constructor(
        private readonly thresholds?: LifeThresholdOverride,
        private readonly appearance?: RobotAppearance,
        /** 'cute' = Bé Bi dựng thuần khối (option "Trợ lý động"); 'demo' = model .glb. */
        private readonly variant: 'demo' | 'cute' = 'demo',
    ) {
        document.addEventListener(ROBOT3D_ACTIVATE, this.onActivateEvt)
        document.addEventListener(ROBOT3D_READY, this.onReadyEvt, { once: true })
        document.addEventListener(ROBOT3D_FAILED, this.onFailedEvt, { once: true })
        this.inject()
        this.popup.init()
    }

    private inject(): void {
        try {
            const url = chrome.runtime.getURL('robot3d/index.js') + (this.variant === 'cute' ? '?variant=cute' : '')
            const script = document.createElement('script')
            script.type = 'module'
            script.src = url
            script.addEventListener('error', () => this.useFallback())
            ;(document.head || document.documentElement).appendChild(script)
            this.script = script
            // Nếu sau một lúc vẫn chưa "ready" (module lỗi thầm lặng) → dùng fallback.
            window.setTimeout(() => {
                if (!this.ready && !this.destroyed) this.useFallback()
            }, 4000)
        } catch {
            this.useFallback()
        }
    }

    /** Không dựng được robot 3D → quay về robot SVG (composition, không lặp code). */
    private useFallback(): void {
        if (this.fallback || this.destroyed) return
        this.script?.remove()
        this.script = null
        // Bản "Trợ lý động" (cute) rơi về robot SVG hoạt náo cho gần cảm giác nhất
        this.fallback = new RobotMascot({ lively: this.variant === 'cute', thresholds: this.thresholds })
        if (this.activateCb) this.fallback.onActivate(this.activateCb)
    }

    private send(cmd: Robot3DCommand): void {
        if (this.fallback) return // fallback tự xử lý qua các notify* bên dưới
        document.dispatchEvent(new CustomEvent<Robot3DCommand>(ROBOT3D_CMD, { detail: cmd }))
    }

    onActivate(cb: () => void): void {
        this.activateCb = cb
        this.fallback?.onActivate(cb)
    }

    notifyChatOpened(): void {
        this.send({ type: 'chatOpened' })
        this.fallback?.notifyChatOpened()
    }

    notifyChatClosed(): void {
        this.send({ type: 'chatClosed' })
        this.fallback?.notifyChatClosed()
    }

    notifyTyping(): void {
        this.send({ type: 'typing' })
        this.fallback?.notifyTyping()
    }

    notifyThinking(active: boolean): void {
        // Truyền cờ ngẫu nhiên (task-005) để robot 3D cũng đổi hoạt động ngẫu nhiên khi chờ.
        this.send({ type: 'thinking', active, random: this.thresholds?.waitEscalationRandom === true })
        this.fallback?.notifyThinking(active)
        if (active) this.startWaitClock()
        else this.stopWaitClock()
    }

    notifyResult(result: RobotResult): void {
        this.send({ type: 'result', result })
        this.fallback?.notifyResult(result)
        this.stopWaitClock() // có kết quả → hết chờ, robot trở lại bình thường
    }

    /**
     * Bắt đầu đếm giờ chờ AI: mỗi giây hỏi LifeDirector giai đoạn hoá-già + mùa hiện tại,
     * gửi sang page world khi CÓ THAY ĐỔI. Tự lên lịch lại (không setInterval quét DOM).
     */
    private startWaitClock(): void {
        if (this.waitStart) return // đang chờ rồi
        this.life.resetWait()
        this.waitStart = Date.now()
        this.lastAging = null
        this.lastSeason = null
        const tick = (): void => {
            if (this.destroyed || !this.waitStart) return
            const snap = this.life.waitSnapshot(Date.now() - this.waitStart)
            const aging = snap.aging?.id ?? null
            const season = snap.season?.id ?? null
            if (aging !== this.lastAging || season !== this.lastSeason) {
                this.lastAging = aging
                this.lastSeason = season
                this.send({ type: 'life', aging, season })
            }
            this.lifeTimer = window.setTimeout(tick, 1000)
        }
        tick()
    }

    /** Dừng đếm giờ chờ + xoá hiệu ứng hoá-già/mùa (robot tươi trẻ trở lại). */
    private stopWaitClock(): void {
        if (!this.waitStart && !this.lifeTimer) return
        window.clearTimeout(this.lifeTimer)
        this.lifeTimer = 0
        this.waitStart = 0
        if (this.lastAging !== null || this.lastSeason !== null) {
            this.lastAging = null
            this.lastSeason = null
            this.send({ type: 'life', aging: null, season: null })
        }
    }

    destroy(): void {
        this.destroyed = true
        this.stopWaitClock()
        this.send({ type: 'destroy' })
        document.removeEventListener(ROBOT3D_ACTIVATE, this.onActivateEvt)
        document.removeEventListener(ROBOT3D_READY, this.onReadyEvt)
        document.removeEventListener(ROBOT3D_FAILED, this.onFailedEvt)
        this.script?.remove()
        this.fallback?.destroy()
    }
}
