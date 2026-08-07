import { RobotConfig } from '../robot/RobotConfig'
import { EXTENSION_HOST_IDS } from '../../shared/dom/ExtensionHostIds'
import type { TourAnchorKind } from './OnboardingTour'

export type AssistantTab = 'warnings' | 'chat'

export type TabChangeCallback = (tab: AssistantTab) => void

/** Khoảng hở giữa đáy panel và đỉnh launcher (robot hoặc nút nổi), px. */
const LAUNCHER_GAP = 12

/**
 * Đáy panel khi launcher là ROBOT: panel phải nằm CAO HƠN cả robot lẫn bong bóng
 * thoại trên đầu nó (bong bóng vẽ trong khung robot nên chỉ cần vượt chiều cao khung).
 * Tính từ RobotConfig để robot đổi cỡ/vị trí thì panel tự dịch theo, không hardcode.
 */
const PANEL_BOTTOM_ROBOT = RobotConfig.home.bottom + RobotConfig.size.height + LAUNCHER_GAP

/** Đáy panel khi launcher là NÚT NỔI 🤖 (hình hài "Nút thường", không có robot). */
const PANEL_BOTTOM_BUTTON = 20 + 56 + LAUNCHER_GAP

/** Chừa mép trên màn hình cho panel, px. */
const PANEL_TOP_GAP = 32

/**
 * Panel trợ lý hợp nhất: MỘT nút nổi 🤖 + MỘT panel với 2 tab.
 * - Tab "Cảnh báo": danh sách cảnh báo validation (WarningListView render vào).
 * - Tab "Trợ lý": chat kiểm tra hồ sơ XML 130 + hỏi đáp (ChatPanel render vào).
 *
 * Dùng Shadow DOM để cách ly CSS với trang HIS.
 * Chỉ chịu trách nhiệm về "khung" (shell): nút nổi, badge, tab, chấm đỏ.
 * Nội dung từng tab do các view khác đảm nhiệm (SRP).
 */
export class UnifiedAssistantPanel {
    private host: HTMLElement
    private shadowRoot: ShadowRoot
    private panelEl: HTMLElement | null = null
    private badgeEl: HTMLElement | null = null
    private dotEl: HTMLElement | null = null

    private tabButtons: Map<AssistantTab, HTMLElement> = new Map()
    private tabPanes: Map<AssistantTab, HTMLElement> = new Map()

    private isOpen = false
    /** Panel đang ở chế độ phóng to giữa màn hình (xem nhiều kết quả XML 130 cho rõ). */
    private isMaximized = false
    private activeTab: AssistantTab = 'warnings'
    private warningCount = 0
    private tabChangeCallbacks: TabChangeCallback[] = []
    private closeCallbacks: Array<() => void> = []

    /**
     * Tự động mở panel + kích hoạt tab Cảnh báo khi có cảnh báo mới.
     * Cấu hình qua chrome.storage.local key "autoOpenOnWarning" (mặc định bật) —
     * tắt/bật được trong popup của extension, đổi có hiệu lực ngay không cần reload.
     */
    private autoOpenOnWarning = true

    /**
     * Tự phóng to panel ra giữa màn hình khi kiểm tra NHIỀU file XML 130.
     * Cấu hình qua chrome.storage.local key "autoMaximizeOnBatch" (mặc định TẮT).
     */
    private autoMaximizeOnBatch = false

    constructor() {
        this.host = document.createElement('div')
        this.host.id = EXTENSION_HOST_IDS.assistantPanel
        this.shadowRoot = this.host.attachShadow({ mode: 'open' })
        this.createUI()
        this.loadSettings()
        document.body.appendChild(this.host)
        console.log('[UnifiedAssistantPanel] UI created')
    }

    // ---------------------------------------------------------------
    // API công khai cho các view
    // ---------------------------------------------------------------

    /**
     * Vị trí các điểm neo cho tour hướng dẫn (OnboardingTour "chỉ tay" vào nút thật).
     * Trả null khi phần tử chưa hiển thị — tour tự dùng vị trí dự phòng.
     */
    getUiRect(kind: TourAnchorKind): DOMRect | null {
        const selector = {
            launcher: '.ua-toggle',
            'tab-warnings': '.ua-tab[data-tab="warnings"]',
            'tab-chat': '.ua-tab[data-tab="chat"]',
            plus: '.chat-plus',
            'plus-menu': '.chat-plus-menu',
            attach: '.chat-attach',
            'bangke-all': '.chat-bangke-btn[data-act="all"]',
            'bangke-one': '.chat-bangke-btn[data-act="one"]',
            input: '.chat-input-box',
            clear: '.chat-clear',
        }[kind]
        const el = this.shadowRoot.querySelector<HTMLElement>(selector)
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 ? rect : null
    }

    /** Cho tour hướng dẫn bấm nút "+" THẬT để mở/đóng menu chọn chế độ. */
    clickPlusButton(): void {
        this.shadowRoot.querySelector<HTMLElement>('.chat-plus')?.click()
    }

    /** Lấy container của một tab để view render nội dung vào */
    getTabContainer(tab: AssistantTab): HTMLElement {
        const pane = this.tabPanes.get(tab)
        if (!pane) {
            throw new Error(`[UnifiedAssistantPanel] Không tìm thấy tab: ${tab}`)
        }
        return pane
    }

    /** Cho phép view bổ sung CSS vào Shadow DOM chung */
    addStyles(css: string): void {
        const style = document.createElement('style')
        style.textContent = css
        this.shadowRoot.appendChild(style)
    }

    /** Đăng ký callback khi người dùng chuyển tab (hoặc mở panel) */
    onTabChange(callback: TabChangeCallback): void {
        this.tabChangeCallbacks.push(callback)
    }

    /**
     * Đăng ký callback khi panel ĐÓNG (nút ✕, phím Esc, hay bấm lại robot). Nhờ đó
     * robot mới biết mà trở về trạng thái ban đầu — nếu không robot kẹt ở tư thế
     * "lắng nghe" (nhắm mắt cười) khi người dùng đóng bằng nút ✕.
     */
    onClose(callback: () => void): void {
        this.closeCallbacks.push(callback)
    }

    /** Mở panel (tùy chọn chỉ định tab) */
    open(tab?: AssistantTab): void {
        if (tab) {
            this.activateTab(tab)
        }
        if (!this.isOpen && this.panelEl) {
            this.isOpen = true
            this.panelEl.classList.add('open')
            this.emitTabChange(this.activeTab)
        }
    }

    /** Đóng panel (nút nổi vẫn hiển thị) */
    close(): void {
        if (this.isOpen && this.panelEl) {
            this.isOpen = false
            this.panelEl.classList.remove('open')
            this.closeCallbacks.forEach((callback) => callback())
        }
    }

    toggle(): void {
        if (this.isOpen) {
            this.close()
        } else {
            this.open()
        }
    }

    isPanelOpen(): boolean {
        return this.isOpen
    }

    /**
     * Ẩn nút nổi 🤖 mặc định vì đã có robot mascot làm "launcher" (robot bấm vào
     * sẽ mở/đóng panel). Panel + badge + tiến độ vẫn hoạt động bình thường.
     */
    useExternalLauncher(): void {
        this.setLauncherVisible(false)
    }

    /**
     * Ẩn/hiện nút nổi 🤖 mặc định của panel. Dùng cho hình hài "Nút thường" (không có
     * robot): đồng bộ với công tắc robot trong popup — tắt robot thì ẩn luôn nút trợ lý,
     * bật lại thì hiện. Panel đang mở vẫn đóng được bằng ✕/Esc.
     */
    setLauncherVisible(visible: boolean): void {
        const toggleBtn = this.shadowRoot.querySelector<HTMLElement>('.ua-toggle')
        if (toggleBtn) toggleBtn.style.display = visible ? '' : 'none'
        // Nút nổi thấp hơn robot → panel hạ xuống theo cho khỏi hở một mảng trống.
        this.panelEl?.classList.toggle('above-button', visible)
    }

    getActiveTab(): AssistantTab {
        return this.activeTab
    }

    /**
     * Phóng to panel ra giữa màn hình (nếu chưa) — dùng khi bắt đầu kiểm tra
     * nhiều file XML 130 để kết quả có chỗ hiển thị rộng rãi.
     */
    maximize(): void {
        if (!this.isMaximized) {
            this.toggleMaximize()
        }
    }

    /**
     * Phóng to khi bắt đầu kiểm tra lô nhiều file — CHỈ khi người dùng bật
     * cài đặt "Tự phóng to panel khi kiểm tra nhiều file" trong popup
     * (autoMaximizeOnBatch, mặc định tắt).
     */
    maximizeForBatchCheck(): void {
        if (this.autoMaximizeOnBatch) {
            this.maximize()
        }
    }

    /** Timer tự ẩn tiến độ trên header sau khi kiểm tra xong. */
    private progressHideTimer: number | null = null

    /**
     * Hiện tiến độ kiểm tra lô ngay trên HEADER panel (kèm thanh chạy mảnh
     * dưới header) — nhìn thấy dù đang cuộn ở đâu. Gọi với text = null để ẩn.
     */
    setBatchProgress(text: string | null, percent: number | null = null): void {
        if (this.progressHideTimer !== null) {
            clearTimeout(this.progressHideTimer)
            this.progressHideTimer = null
        }

        const progressEl = this.shadowRoot.querySelector<HTMLElement>('.ua-progress')
        const barEl = this.shadowRoot.querySelector<HTMLElement>('.ua-header-bar')
        const fillEl = this.shadowRoot.querySelector<HTMLElement>('.ua-header-bar-fill')
        if (!progressEl || !barEl || !fillEl) return

        if (text === null) {
            progressEl.hidden = true
            barEl.hidden = true
            fillEl.style.width = '0%'
            return
        }

        progressEl.hidden = false
        progressEl.textContent = text
        if (percent !== null) {
            barEl.hidden = false
            fillEl.style.width = `${Math.max(0, Math.min(100, percent))}%`
        }
    }

    /** Báo kiểm tra lô hoàn tất trên header rồi TỰ ẨN sau vài giây. */
    completeBatchProgress(text: string): void {
        this.setBatchProgress(text, 100)
        this.progressHideTimer = window.setTimeout(() => this.setBatchProgress(null), 5000)
    }

    /** Cập nhật số lượng cảnh báo trên badge đỏ của nút nổi */
    setWarningCount(count: number): void {
        this.warningCount = count
        this.updateBadge()
    }

    /** Số lượt kiểm tra đang chạy — hỗ trợ nhiều kiểm tra song song. */
    private checkingCount = 0

    /**
     * Báo bắt đầu một lượt kiểm tra: nút nổi hiện vòng xoay + tooltip
     * "Đang kiểm tra dữ liệu..." để người dùng biết hệ thống đang làm việc.
     * Gọi endChecking() khi xong (kể cả khi lỗi).
     */
    beginChecking(): void {
        this.checkingCount++
        this.updateCheckingIndicator()
    }

    /** Báo kết thúc một lượt kiểm tra. */
    endChecking(): void {
        this.checkingCount = Math.max(0, this.checkingCount - 1)
        this.updateCheckingIndicator()
    }

    private updateCheckingIndicator(): void {
        const button = this.shadowRoot.querySelector<HTMLElement>('.ua-toggle')
        const spinner = this.shadowRoot.querySelector<HTMLElement>('.ua-spinner')
        if (!button || !spinner) return

        const checking = this.checkingCount > 0
        spinner.hidden = !checking
        button.classList.toggle('ua-checking', checking)
        button.title = checking ? 'Đang kiểm tra dữ liệu...' : 'ZeroCheck AI'
    }

    /**
     * Báo có cảnh báo mới:
     * - autoOpenOnWarning bật (mặc định): tự mở panel và kích hoạt tab Cảnh báo,
     *   kể cả khi người dùng đang ở tab Trợ lý — người dùng không phải để ý badge.
     * - autoOpenOnWarning tắt: chỉ báo thụ động — panel đóng thì badge đỏ + nháy nút,
     *   panel mở ở tab Trợ lý thì hiện chấm đỏ trên tab Cảnh báo.
     */
    flagNewWarning(): void {
        if (this.autoOpenOnWarning) {
            this.activateTab('warnings')
            this.open()
            this.animateToggleButton()
            return
        }

        if (!this.isOpen) {
            this.animateToggleButton()
            return
        }
        if (this.activeTab !== 'warnings') {
            this.setWarningDot(true)
        }
    }

    // ---------------------------------------------------------------
    // Nội bộ
    // ---------------------------------------------------------------

    /** Đọc cấu hình từ chrome.storage và lắng nghe thay đổi (đổi trong popup có hiệu lực ngay) */
    private loadSettings(): void {
        try {
            chrome.storage?.local?.get({ autoOpenOnWarning: true, autoMaximizeOnBatch: false }, (items) => {
                this.autoOpenOnWarning = items.autoOpenOnWarning !== false
                this.autoMaximizeOnBatch = items.autoMaximizeOnBatch === true
            })
            chrome.storage?.onChanged?.addListener((changes, area) => {
                if (area !== 'local') return
                if (changes.autoOpenOnWarning) {
                    this.autoOpenOnWarning = changes.autoOpenOnWarning.newValue !== false
                }
                if (changes.autoMaximizeOnBatch) {
                    this.autoMaximizeOnBatch = changes.autoMaximizeOnBatch.newValue === true
                }
            })
        } catch (error) {
            console.warn('[UnifiedAssistantPanel] Không đọc được cấu hình, dùng mặc định', error)
        }
    }

    private createUI(): void {
        this.shadowRoot.innerHTML = `
            <style>${this.getStyles()}</style>
            <button class="ua-toggle" style="display:none" title="ZeroCheck AI" aria-label="Trợ lý y tế số">
                🤖
                <span class="ua-badge" hidden>0</span>
                <span class="ua-spinner" hidden></span>
            </button>
            <div class="ua-panel">
                <div class="ua-header">
                    <span class="ua-header-icon">🤖</span>
                    <span class="ua-header-title">ZeroCheck AI</span>
                    <span class="ua-progress" hidden></span>
                    <button class="ua-max" title="Phóng to" aria-label="Phóng to">⤢</button>
                    <button class="ua-close" title="Đóng" aria-label="Đóng">✕</button>
                </div>
                <div class="ua-header-bar" hidden><div class="ua-header-bar-fill" style="width:0%"></div></div>
                <div class="ua-tabs">
                    <button class="ua-tab" data-tab="warnings">
                        ⚠️ Cảnh báo
                        <span class="ua-dot" hidden></span>
                    </button>
                    <button class="ua-tab" data-tab="chat">💬 Trợ lý</button>
                </div>
                <div class="ua-body">
                    <div class="ua-pane" data-pane="warnings"></div>
                    <div class="ua-pane" data-pane="chat"></div>
                </div>
            </div>
        `

        this.panelEl = this.shadowRoot.querySelector('.ua-panel')
        this.badgeEl = this.shadowRoot.querySelector('.ua-badge')
        this.dotEl = this.shadowRoot.querySelector('.ua-dot')

        const tabs: AssistantTab[] = ['warnings', 'chat']
        tabs.forEach((tab) => {
            const button = this.shadowRoot.querySelector<HTMLElement>(`.ua-tab[data-tab="${tab}"]`)
            const pane = this.shadowRoot.querySelector<HTMLElement>(`.ua-pane[data-pane="${tab}"]`)
            if (button && pane) {
                this.tabButtons.set(tab, button)
                this.tabPanes.set(tab, pane)
                button.addEventListener('click', () => this.activateTab(tab))
            }
        })

        this.applyActiveTab()

        const toggleBtn = this.shadowRoot.querySelector('.ua-toggle')
        toggleBtn?.addEventListener('click', () => this.toggle())

        const closeBtn = this.shadowRoot.querySelector('.ua-close')
        closeBtn?.addEventListener('click', () => this.close())

        const maxBtn = this.shadowRoot.querySelector('.ua-max')
        maxBtn?.addEventListener('click', () => this.toggleMaximize())

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !this.isOpen) {
                return
            }
            // Esc lần 1 thu nhỏ nếu đang phóng to, lần 2 mới đóng panel
            if (this.isMaximized) {
                this.toggleMaximize()
            } else {
                this.close()
            }
        })
    }

    private activateTab(tab: AssistantTab): void {
        const changed = this.activeTab !== tab
        this.activeTab = tab
        this.applyActiveTab()

        if (tab === 'warnings') {
            this.setWarningDot(false) // Người dùng đã xem tab Cảnh báo
        }
        if (changed) {
            this.emitTabChange(tab)
        }
    }

    private applyActiveTab(): void {
        this.tabButtons.forEach((button, tab) => {
            button.classList.toggle('active', tab === this.activeTab)
        })
        this.tabPanes.forEach((pane, tab) => {
            pane.classList.toggle('active', tab === this.activeTab)
        })
    }

    private emitTabChange(tab: AssistantTab): void {
        this.tabChangeCallbacks.forEach((callback) => callback(tab))
    }

    private updateBadge(): void {
        if (!this.badgeEl) return
        this.badgeEl.textContent = String(this.warningCount)
        this.badgeEl.hidden = this.warningCount === 0
    }

    private setWarningDot(visible: boolean): void {
        if (this.dotEl) {
            this.dotEl.hidden = !visible
        }
    }

    /**
     * Phóng to panel ra GIỮA màn hình (xem kết quả kiểm tra nhiều file XML 130
     * cho rõ) / thu về góc phải. Chuyển trạng thái có animation (CSS transition
     * trên width/height/right/bottom của .ua-panel).
     */
    private toggleMaximize(): void {
        if (!this.panelEl) return
        this.isMaximized = !this.isMaximized
        this.panelEl.classList.toggle('maximized', this.isMaximized)

        const maxBtn = this.shadowRoot.querySelector<HTMLElement>('.ua-max')
        if (maxBtn) {
            maxBtn.textContent = this.isMaximized ? '⤡' : '⤢'
            maxBtn.title = this.isMaximized ? 'Thu nhỏ' : 'Phóng to'
            maxBtn.setAttribute('aria-label', maxBtn.title)
        }
    }

    private animateToggleButton(): void {
        const button = this.shadowRoot.querySelector('.ua-toggle')
        if (!button) return
        button.classList.remove('ua-blink')
        void (button as HTMLElement).offsetWidth // Trigger reflow để chạy lại animation
        button.classList.add('ua-blink')
    }

    private getStyles(): string {
        return `
            :host {
                all: initial;
            }

            * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* ---- Nút nổi duy nhất ---- */

            .ua-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2147483647;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--zc-accent, #667eea) 0%, var(--zc-accent-2, #764ba2) 100%);
                border: none;
                cursor: pointer;
                font-size: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }

            .ua-toggle:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            }

            .ua-toggle:active { transform: scale(0.95); }

            .ua-blink { animation: ua-blink 0.6s ease-in-out; }

            @keyframes ua-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            .ua-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 22px;
                height: 22px;
                padding: 0 5px;
                background: #dc2626;
                color: #ffffff;
                border-radius: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }

            .ua-badge[hidden] { display: none; }

            /* Vòng xoay "đang kiểm tra" quanh nút nổi */
            .ua-spinner {
                position: absolute;
                inset: -4px;
                border-radius: 50%;
                border: 3px solid rgba(255, 255, 255, 0.35);
                border-top-color: #ffffff;
                animation: ua-spin 0.8s linear infinite;
                pointer-events: none;
            }

            .ua-spinner[hidden] { display: none; }

            .ua-checking { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2); }

            @keyframes ua-spin {
                to { transform: rotate(360deg); }
            }

            /* ---- Panel chung ---- */

            /*
             * Đáy panel nằm TRÊN robot (mặc định) để không che robot, cũng không phải
             * đẩy robot lên che nút start/stop của trang HIS. Hình hài "Nút thường"
             * thì hạ xuống vừa đủ trên nút nổi — xem class .above-button.
             */
            .ua-panel {
                position: fixed;
                bottom: ${PANEL_BOTTOM_ROBOT}px;
                right: 20px;
                z-index: 2147483647;
                width: 400px;
                max-width: calc(100vw - 40px);
                height: 560px;
                max-height: calc(100vh - ${PANEL_BOTTOM_ROBOT + PANEL_TOP_GAP}px);
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transform: translateY(12px);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .ua-panel.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            /* Không có robot: launcher là nút nổi 56px, panel chỉ cần vượt qua nút. */
            .ua-panel.above-button {
                bottom: ${PANEL_BOTTOM_BUTTON}px;
                max-height: calc(100vh - ${PANEL_BOTTOM_BUTTON + PANEL_TOP_GAP}px);
            }

            /*
             * Chế độ phóng to: panel bung ra GIỮA màn hình để xem kết quả kiểm tra
             * nhiều file XML 130 cho rõ. Vẫn dùng right/bottom làm mốc nên CSS
             * transition (all 0.25s ở .ua-panel) tự tạo animation phóng to/thu nhỏ mượt.
             */
            .ua-panel.maximized {
                width: min(1200px, 94vw);
                max-width: none;
                height: min(820px, 92vh);
                max-height: none;
                right: calc((100vw - min(1200px, 94vw)) / 2);
                bottom: calc((100vh - min(820px, 92vh)) / 2);
            }

            .ua-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: linear-gradient(135deg, var(--zc-accent, #667eea) 0%, var(--zc-accent-2, #764ba2) 100%);
                color: #ffffff;
                flex-shrink: 0;
            }

            .ua-header-icon { font-size: 20px; }

            .ua-header-title {
                flex: 1;
                font-size: 14px;
                font-weight: 600;
            }

            .ua-close, .ua-max {
                background: none;
                border: none;
                color: #ffffff;
                font-size: 16px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 6px;
                transition: background 0.15s;
            }

            .ua-close:hover, .ua-max:hover { background: rgba(255, 255, 255, 0.18); }

            .ua-max { font-size: 15px; }

            /* ---- Tiến độ kiểm tra lô trên header ---- */

            .ua-progress {
                font-size: 11px;
                font-weight: 600;
                color: #ffffff;
                background: rgba(255, 255, 255, 0.22);
                border-radius: 10px;
                padding: 3px 10px;
                white-space: nowrap;
                max-width: 45%;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .ua-progress[hidden] { display: none; }

            /* Thanh chạy mảnh ngay dưới header */
            .ua-header-bar {
                height: 3px;
                background: #e5e7eb;
                flex-shrink: 0;
            }

            .ua-header-bar[hidden] { display: none; }

            .ua-header-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--zc-accent, #667eea), var(--zc-accent-2, #764ba2));
                transition: width 0.2s ease;
            }

            /* ---- Thanh tab ---- */

            .ua-tabs {
                display: flex;
                border-bottom: 1px solid #e5e7eb;
                background: #ffffff;
                flex-shrink: 0;
            }

            .ua-tab {
                position: relative;
                flex: 1;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                padding: 10px 8px;
                font-size: 13px;
                font-weight: 600;
                color: #6b7280;
                cursor: pointer;
                transition: color 0.15s, border-color 0.15s;
            }

            .ua-tab:hover { color: #374151; }

            .ua-tab.active {
                color: var(--zc-accent-deep, #4f46e5);
                border-bottom-color: var(--zc-accent-deep, #4f46e5);
            }

            .ua-dot {
                position: absolute;
                top: 8px;
                margin-left: 4px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #dc2626;
                display: inline-block;
            }

            .ua-dot[hidden] { display: none; }

            /* ---- Thân panel: các pane ---- */

            .ua-body {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .ua-pane {
                display: none;
                flex: 1;
                min-height: 0;
                flex-direction: column;
                overflow: hidden;
            }

            .ua-pane.active { display: flex; }
        `
    }
}
