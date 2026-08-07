/**
 * Tour giới thiệu TƯƠNG TÁC cho người dùng mới — tự mở panel chat và "chỉ tay"
 * (spotlight) vào đúng phần tử thật: robot/nút mở, tab Cảnh báo, nút 📎, ô nhập.
 * Chỉ hiện một lần (cờ chrome.storage.local, fallback localStorage);
 * popup có nút "Xem lại hướng dẫn" gọi show() để mở lại.
 *
 * Trách nhiệm duy nhất (SRP): overlay + spotlight + thẻ hướng dẫn. Vị trí các
 * phần tử và việc mở panel do bên ngoài cung cấp qua OnboardingAnchors —
 * tour không chọc vào nội bộ panel.
 */

import { EXTENSION_HOST_IDS } from '../../shared/dom/ExtensionHostIds'

/** Các phần tử mà tour có thể "chỉ tay" vào. */
export type TourAnchorKind =
    | 'launcher'
    | 'tab-warnings'
    | 'tab-chat'
    | 'plus'
    | 'plus-menu'
    | 'attach'
    | 'bangke-all'
    | 'bangke-one'
    | 'input'
    | 'clear'

/** Điểm neo mà tour cần từ bên ngoài. */
export interface OnboardingAnchors {
    /** Mở panel ở tab Trợ lý (chat) — gọi trước các bước cần thấy panel. */
    openChat(): void
    /** Bấm nút "+" THẬT trong khung chat (mở/đóng menu chọn chế độ). */
    clickPlus(): void
    /** Vị trí phần tử theo loại; null nếu chưa hiển thị (tour dùng vị trí dự phòng). */
    getRect(kind: TourAnchorKind): DOMRect | null
    /**
     * Trang hiện tại có phần tử này không. Hỏi TRƯỚC khi dựng danh sách bước để bỏ
     * hẳn những bước không có nghĩa ở đây (nút bảng kê chỉ có trên màn hình Kiểm tra
     * bảng kê) — nhờ vậy số chấm tiến độ và nút Quay lại luôn khớp thực tế.
     */
    supports(kind: TourAnchorKind): boolean
}

interface TourStep {
    anchor: TourAnchorKind
    icon: string
    title: string
    body: string
    /** Bước này cần panel chat đang mở. */
    needsPanel: boolean
    /** Bước này cần menu "+" đang mở (tour tự bấm nút + thật để mở). */
    needsPlusMenu?: boolean
}

export class OnboardingTour {
    private static readonly STORAGE_KEY = 'onboardingDone'
    /** Chờ panel mở xong (animation) rồi mới đo vị trí phần tử. */
    private static readonly PANEL_OPEN_DELAY_MS = 350
    /** Chờ menu "+" bung ra rồi mới đo vị trí. */
    private static readonly MENU_OPEN_DELAY_MS = 140

    private host: HTMLElement | null = null
    private shadow: ShadowRoot | null = null
    private stepIndex = 0
    /** Các bước THỰC SỰ chạy lần này — lọc bỏ bước không có trên trang hiện tại. */
    private steps: TourStep[] = []
    private readonly onResize = (): void => this.position()

    constructor(private readonly anchors: OnboardingAnchors) {}

    private static readonly STEPS: TourStep[] = [
        {
            anchor: 'launcher',
            needsPanel: false,
            icon: '🤖',
            title: 'Đây là trợ lý ZeroCheck AI',
            body: 'Robot luôn nằm ở góc này. Bấm vào robot để mở hoặc đóng bảng làm việc — không che form nhập liệu của bạn.',
        },
        {
            anchor: 'tab-warnings',
            needsPanel: true,
            icon: '⚠️',
            title: 'Tab Cảnh báo',
            body: 'Nhập sai là trường được viền đỏ/vàng kèm gợi ý sửa, và tab này tự bật kèm số đếm. Sửa xong giá trị, cảnh báo tự biến mất.',
        },
        {
            anchor: 'tab-chat',
            needsPanel: true,
            icon: '💬',
            title: 'Tab Trợ lý',
            body: 'Nơi làm việc chính: kiểm tra hồ sơ XML 130 trước khi gửi giám định và hỏi đáp nghiệp vụ BHYT có trích dẫn văn bản.',
        },
        {
            anchor: 'plus',
            needsPanel: true,
            icon: '➕',
            title: 'Nút chọn chế độ',
            body: 'Đây là nút "+" — bấm để chọn chế độ nhập cho ô bên cạnh. Bấm "Tiếp theo", tour sẽ bấm thử nút này giúp bạn.',
        },
        {
            anchor: 'plus-menu',
            needsPanel: true,
            needsPlusMenu: true,
            icon: '📋',
            title: 'Hai chế độ nhập',
            body: 'Menu vừa được mở: "Kiểm tra số vào viện" — gõ số vào viện là hệ thống tự tải XML 130 từ HIS về kiểm tra; "Hỏi thông tin y tế" — hỏi đáp nghiệp vụ BHYT. Chọn xong thì gõ vào ô nhập.',
        },
        {
            anchor: 'attach',
            needsPanel: true,
            icon: '📎',
            title: 'Kiểm tra hồ sơ XML 130',
            body: 'Bấm nút này để nạp file XML 130 (kéo thả cũng được). Nạp từ 2 file trở lên, hệ thống tự đối chiếu chéo giữa các hồ sơ.',
        },
        {
            anchor: 'bangke-all',
            needsPanel: true,
            icon: '📋',
            title: 'Kiểm tra cả lô từ bảng kê',
            body: 'Chỉ có ở màn hình Kiểm tra bảng kê. Bấm Xem thông tin như thường lệ, nút này lấy đúng danh sách phiếu vừa tìm, tải XML 130 từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo — khỏi xuất file, khỏi gõ tay số vào viện. Số trong ngoặc là số hồ sơ sẽ kiểm tra.',
        },
        {
            anchor: 'bangke-all',
            needsPanel: true,
            icon: '⏳',
            title: 'Nếu danh sách quá nhiều hồ sơ',
            body: 'Trước khi chạy, hộp xác nhận cho biết thời gian chờ dự kiến. Nếu danh sách vượt sức máy đang dùng, tôi báo ngay trong khung chat và DỪNG — không kiểm tra một phần, vì đối chiếu chéo chỉ so các hồ sơ trong cùng một lô nên phần bị cắt sẽ lọt lỗi. Cách xử lý: thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi bấm Xem thông tin lần nữa.',
        },
        {
            anchor: 'bangke-one',
            needsPanel: true,
            icon: '🔎',
            title: 'Kiểm tra hồ sơ đang chọn',
            body: 'Bấm chọn một dòng trên bảng kê rồi bấm nút này — chỉ kiểm tra hồ sơ của bệnh nhân đó, chạy ngay không hỏi lại. Chưa chọn dòng nào thì nút còn khóa.',
        },
        {
            anchor: 'input',
            needsPanel: true,
            icon: '💬',
            title: 'Hỏi đáp nghiệp vụ BHYT',
            body: 'Gõ câu hỏi vào ô này — trợ lý trả lời kèm nguồn văn bản trích dẫn, không có căn cứ sẽ nói thẳng "không tìm thấy".',
        },
        {
            anchor: 'clear',
            needsPanel: true,
            icon: '🧹',
            title: 'Xóa lịch sử hội thoại',
            body: 'Muốn panel gọn gàng lại từ đầu, bấm nút này — toàn bộ câu hỏi, kết quả kiểm tra và khay file được dọn sạch.',
        },
    ]

    /** Hiện tour nếu người dùng chưa từng xem. */
    async showIfFirstRun(): Promise<void> {
        if (await this.isDone()) return
        this.show()
    }

    /** Hiện lại tour theo yêu cầu (nút "Xem lại hướng dẫn" ở popup) — bỏ qua cờ đã xem. */
    show(): void {
        if (this.host) return // đang mở rồi thì thôi
        this.steps = OnboardingTour.STEPS.filter((step) => this.anchors.supports(step.anchor))
        this.stepIndex = 0
        this.render()
        this.applyStep()
    }

    // ---------------------------------------------------------------
    // Cờ "đã xem"
    // ---------------------------------------------------------------

    private async isDone(): Promise<boolean> {
        try {
            const stored = await chrome.storage?.local?.get(OnboardingTour.STORAGE_KEY)
            if (stored && stored[OnboardingTour.STORAGE_KEY] === true) return true
        } catch {
            /* storage lỗi → dùng fallback */
        }
        return localStorage.getItem(OnboardingTour.STORAGE_KEY) === '1'
    }

    private markDone(): void {
        try {
            void chrome.storage?.local?.set({ [OnboardingTour.STORAGE_KEY]: true })
        } catch {
            /* còn fallback localStorage */
        }
        try {
            localStorage.setItem(OnboardingTour.STORAGE_KEY, '1')
        } catch {
            /* trang chặn localStorage thì đành hiện lại lần sau */
        }
    }

    // ---------------------------------------------------------------
    // Điều khiển bước
    // ---------------------------------------------------------------

    private next(): void {
        if (this.stepIndex >= this.steps.length - 1) {
            this.closePlusMenuIfOpen()
            this.finish()
            return
        }
        this.goTo(this.stepIndex + 1)
    }

    /** Quay lại bước trước — xem sót thì không phải đóng tour rồi mở lại từ đầu. */
    private prev(): void {
        if (this.stepIndex === 0) return
        this.goTo(this.stepIndex - 1)
    }

    /** Nhảy thẳng tới một bước (bấm vào chấm tiến độ) — xem lại bước bất kỳ. */
    private goTo(index: number): void {
        if (index === this.stepIndex || index < 0 || index >= this.steps.length) return
        this.closePlusMenuIfOpen()
        this.stepIndex = index
        this.applyStep()
    }

    /** Rời bước có menu "+" đang mở → bấm "+" lần nữa để đóng lại cho gọn. */
    private closePlusMenuIfOpen(): void {
        const step = this.steps[this.stepIndex]
        if (step?.needsPlusMenu && this.anchors.getRect('plus-menu')) {
            this.anchors.clickPlus()
        }
    }

    /**
     * Cập nhật nội dung + spotlight cho bước hiện tại. Bước cần panel thì mở
     * panel trước; bước giới thiệu menu "+" thì BẤM NÚT + THẬT cho menu bung ra
     * rồi mới spotlight vào danh sách chế độ.
     */
    private applyStep(): void {
        const step = this.steps[this.stepIndex]
        this.renderStepContent(step)
        if (!step.needsPanel) {
            this.position()
            return
        }
        this.anchors.openChat()
        // Panel mở có animation — chờ ổn định rồi mới thao tác tiếp
        window.setTimeout(() => {
            if (step.needsPlusMenu && !this.anchors.getRect('plus-menu')) {
                this.anchors.clickPlus()
                window.setTimeout(() => this.position(), OnboardingTour.MENU_OPEN_DELAY_MS)
            } else {
                this.position()
            }
        }, OnboardingTour.PANEL_OPEN_DELAY_MS)
    }

    private finish(): void {
        this.closePlusMenuIfOpen()
        this.markDone()
        window.removeEventListener('resize', this.onResize)
        this.host?.remove()
        this.host = null
        this.shadow = null
        // Kết thúc tour ở trạng thái panel chat đang mở — người dùng bắt tay dùng luôn
    }

    // ---------------------------------------------------------------
    // UI
    // ---------------------------------------------------------------

    private render(): void {
        this.host = document.createElement('div')
        this.host.id = EXTENSION_HOST_IDS.onboardingTour
        this.shadow = this.host.attachShadow({ mode: 'open' })
        const dots = this.steps
            .map(
                (step, i) =>
                    `<button class="ob-dot" type="button" data-go="${i}" data-tip="Bước ${i + 1}: ${this.escape(
                        step.title,
                    )}" aria-label="Bước ${i + 1}: ${this.escape(step.title)}"></button>`,
            )
            .join('')
        this.shadow.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="ob-spot"></div>
            <div class="ob-card" role="dialog" aria-label="Hướng dẫn sử dụng">
                <div class="ob-head">
                    <span class="ob-icon"></span>
                    <span class="ob-title"></span>
                </div>
                <p class="ob-body"></p>
                <div class="ob-foot">
                    <div class="ob-tip" hidden></div>
                    <div class="ob-dots">${dots}</div>
                    <button class="ob-skip" type="button" data-tip="Bỏ qua hướng dẫn" aria-label="Bỏ qua hướng dẫn">✕</button>
                    <button class="ob-prev" type="button" data-tip="Quay lại bước trước" aria-label="Quay lại bước trước">←</button>
                    <button class="ob-next" type="button"></button>
                </div>
            </div>
        `
        document.body.appendChild(this.host)
        this.shadow.querySelector('.ob-skip')?.addEventListener('click', () => this.finish())
        this.shadow.querySelector('.ob-prev')?.addEventListener('click', () => this.prev())
        this.shadow.querySelector('.ob-next')?.addEventListener('click', () => this.next())
        this.shadow.querySelector('.ob-dots')?.addEventListener('click', (event) => {
            const dot = (event.target as HTMLElement).closest<HTMLElement>('[data-go]')
            if (dot) this.goTo(Number(dot.dataset.go))
        })
        this.bindTooltip()
        window.addEventListener('resize', this.onResize)
    }

    /**
     * Nút chỉ còn biểu tượng cho gọn hàng, nên phải có tên bước/tên nút khi rê vào.
     * Dùng MỘT ô chú thích chung đặt trên hàng nút thay vì tooltip riêng từng nút:
     * chữ dài mấy cũng nằm gọn trong thẻ, không tràn ra ngoài màn hình.
     */
    private bindTooltip(): void {
        const foot = this.shadow?.querySelector<HTMLElement>('.ob-foot')
        const tip = this.shadow?.querySelector<HTMLElement>('.ob-tip')
        if (!foot || !tip) return
        const show = (event: Event): void => {
            const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-tip]')
            if (!target) return
            tip.textContent = target.dataset.tip ?? ''
            tip.hidden = false
        }
        const hide = (): void => {
            tip.hidden = true
        }
        foot.addEventListener('mouseover', show)
        foot.addEventListener('focusin', show)
        foot.addEventListener('mouseout', hide)
        foot.addEventListener('focusout', hide)
    }

    /** Chặn tiêu đề bước lọt vào HTML thuộc tính (nội dung tĩnh, nhưng phòng xa). */
    private escape(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    }

    private renderStepContent(step: TourStep): void {
        if (!this.shadow) return
        const isLast = this.stepIndex === this.steps.length - 1
        const set = (sel: string, text: string): void => {
            const el = this.shadow?.querySelector(sel)
            if (el) el.textContent = text
        }
        set('.ob-icon', step.icon)
        set('.ob-title', step.title)
        set('.ob-body', step.body)
        const next = this.shadow.querySelector<HTMLElement>('.ob-next')
        if (next) {
            const label = isLast ? 'Bắt đầu dùng' : 'Bước tiếp theo'
            next.textContent = isLast ? '🚀' : '→'
            next.dataset.tip = label
            next.setAttribute('aria-label', label)
        }
        // Bước đầu chưa có gì để quay lại → ẩn hẳn nút cho hàng nút khỏi rối
        const prev = this.shadow.querySelector<HTMLElement>('.ob-prev')
        if (prev) prev.hidden = this.stepIndex === 0
        this.shadow.querySelectorAll('.ob-dot').forEach((dot, i) => {
            dot.classList.toggle('on', i === this.stepIndex)
            dot.setAttribute('aria-current', String(i === this.stepIndex))
        })
    }

    /** Đặt spotlight quanh phần tử đích và thẻ hướng dẫn ở cạnh thuận mắt nhất. */
    private position(): void {
        if (!this.shadow) return
        const spot = this.shadow.querySelector<HTMLElement>('.ob-spot')
        const card = this.shadow.querySelector<HTMLElement>('.ob-card')
        if (!spot || !card) return

        const step = this.steps[this.stepIndex]
        const rect = this.anchors.getRect(step.anchor) ?? this.fallbackRect()
        const pad = 8

        spot.style.left = `${rect.left - pad}px`
        spot.style.top = `${rect.top - pad}px`
        spot.style.width = `${rect.width + pad * 2}px`
        spot.style.height = `${rect.height + pad * 2}px`

        // Đặt thẻ sao cho KHÔNG BAO GIỜ đè lên vùng nút đang sáng.
        // Đo KÍCH THƯỚC THẬT của thẻ (đã render) thay vì hằng số; thử các hướng
        // theo thứ tự hợp mắt với vị trí mục tiêu, lấy hướng đầu tiên vừa nằm gọn
        // trong màn hình vừa không giao với vùng spotlight (kèm lề an toàn).
        const cardW = card.offsetWidth || 320
        const cardH = card.offsetHeight || 190
        const gap = 16
        const margin = 12
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const sides = {
            left: { left: rect.left - cardW - gap, top: centerY - cardH / 2 },
            above: { left: centerX - cardW / 2, top: rect.top - cardH - gap },
            below: { left: centerX - cardW / 2, top: rect.bottom + gap },
            right: { left: rect.right + gap, top: centerY - cardH / 2 },
        }
        // Mục tiêu ở nửa dưới màn hình (hàng nút nhập, robot) → ưu tiên đặt PHÍA TRÊN
        // để không che các nút cùng hàng; ở nửa trên (thanh tab) → ưu tiên bên trái/dưới.
        const order =
            centerY > window.innerHeight * 0.55
                ? [sides.above, sides.left, sides.right, sides.below]
                : [sides.left, sides.below, sides.right, sides.above]

        const safe = {
            left: rect.left - pad - 6,
            top: rect.top - pad - 6,
            right: rect.right + pad + 6,
            bottom: rect.bottom + pad + 6,
        }
        const fits = (c: { left: number; top: number }): boolean =>
            c.left >= margin &&
            c.top >= margin &&
            c.left + cardW <= window.innerWidth - margin &&
            c.top + cardH <= window.innerHeight - margin &&
            // không giao với vùng spotlight
            (c.left + cardW <= safe.left || c.left >= safe.right || c.top + cardH <= safe.top || c.top >= safe.bottom)

        let pos = order.find(fits)
        if (!pos) {
            // Đường cùng (màn hình rất chật): đặt phía trên mục tiêu, kẹp trong khung nhìn
            pos = {
                left: centerX - cardW / 2,
                top: rect.top - cardH - gap >= margin ? rect.top - cardH - gap : margin,
            }
        }
        // Kẹp lần cuối để không bao giờ tràn màn hình dù rơi vào nhánh nào
        card.style.left = `${Math.min(Math.max(margin, pos.left), window.innerWidth - cardW - margin)}px`
        card.style.top = `${Math.min(Math.max(margin, pos.top), window.innerHeight - cardH - margin)}px`
    }

    /** Không đo được phần tử (robot 3D, panel chưa gắn...) → vùng góc phải dưới nơi robot ở. */
    private fallbackRect(): DOMRect {
        return new DOMRect(window.innerWidth - 100, window.innerHeight - 100, 72, 72)
    }

    private getStyles(): string {
        return `
            :host { all: initial; }
            /* QUAN TRỌNG: width khai báo phải LÀ bề rộng thật (gồm padding) —
               thiếu dòng này thẻ rộng hơn tính toán ~36px, gây tràn màn/đè nút. */
            *, *::before, *::after { box-sizing: border-box; }
            /* Lớp phủ đen mờ che TOÀN BỘ trang lẫn panel (z ngang panel nhưng
               host tour gắn vào DOM sau nên vẽ đè lên) — chỉ vùng khoét quanh
               phần tử được chỉ là sáng; pointer-events:none nên nút trong vùng
               sáng vẫn bấm thử được ngay. */
            .ob-spot {
                position: fixed;
                z-index: 2147483647;
                border-radius: 14px;
                box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.62), 0 0 0 3px var(--zc-accent, #667eea);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            .ob-card {
                position: fixed;
                z-index: 2147483647;
                width: 320px;
                max-width: calc(100vw - 24px);
                padding: 16px 18px 14px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid var(--zc-pastel, #e3e9f4);
                box-shadow: 0 14px 44px rgba(0, 0, 0, 0.35);
                color: #1f2937;
                font-family: 'Segoe UI', system-ui, sans-serif;
                transition: left 0.3s ease, top 0.3s ease;
                animation: ob-in 0.3s ease;
            }
            @keyframes ob-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: none; }
            }
            .ob-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
            .ob-icon { font-size: 24px; }
            .ob-title { font-size: 15px; font-weight: 700; color: var(--zc-accent-deep, #4f46e5); }
            .ob-body { margin: 0 0 14px; font-size: 13px; line-height: 1.6; color: #4b5563; }
            /* Hàng chân thẻ: nút chỉ còn biểu tượng nên luôn đủ chỗ, không tràn
               ra ngoài thẻ dù tour có nhiều bước. Tên nút/tên bước hiện ở ô
               .ob-tip ngay phía trên khi rê chuột. */
            .ob-foot { position: relative; display: flex; align-items: center; gap: 6px; }
            .ob-tip {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 0; right: 0;
                padding: 6px 10px;
                border-radius: 8px;
                background: #111827;
                color: #f9fafb;
                font-size: 11.5px; font-weight: 600; line-height: 1.45;
                text-align: center;
                box-shadow: 0 6px 18px rgba(2, 6, 23, 0.28);
                pointer-events: none;
            }
            .ob-tip[hidden] { display: none; }
            .ob-dots { display: flex; flex-wrap: wrap; gap: 2px; margin-right: auto; }
            /* Chấm tiến độ bấm được để xem lại bước bất kỳ — vùng bấm 13px cho dễ
               trúng, còn chấm nhìn thấy vẫn 7px như cũ (::before). Cỡ này đủ để 11
               bước nằm gọn một hàng cạnh 3 nút biểu tượng trong thẻ rộng 320px. */
            .ob-dot {
                width: 13px; height: 13px; padding: 0;
                border: none; background: transparent; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
            }
            .ob-dot::before {
                content: ''; width: 7px; height: 7px; border-radius: 50%;
                background: var(--zc-pastel, #d7dce8);
                transition: background 0.2s ease, transform 0.2s ease;
            }
            .ob-dot:hover::before { background: var(--zc-accent, #667eea); transform: scale(1.25); }
            .ob-dot.on::before { background: var(--zc-accent-deep, #4f46e5); transform: scale(1.35); }
            .ob-skip, .ob-prev, .ob-next {
                flex: none;
                width: 32px; height: 32px; padding: 0;
                display: flex; align-items: center; justify-content: center;
                border: none; border-radius: 999px; cursor: pointer;
                font-family: inherit; font-size: 15px; font-weight: 600; line-height: 1;
                transition: filter 0.15s ease, background 0.15s ease, color 0.15s ease;
            }
            .ob-skip { background: transparent; color: #9ca3af; }
            .ob-skip:hover { background: #f3f4f6; color: #1f2937; }
            .ob-prev {
                background: var(--zc-pastel, #eef1f8);
                color: var(--zc-accent-deep, #4f46e5);
            }
            .ob-prev:hover { filter: brightness(0.96); }
            .ob-prev[hidden] { display: none; }
            .ob-next {
                background: linear-gradient(100deg, var(--zc-accent, #667eea), var(--zc-accent-2, #764ba2));
                color: #fff;
            }
            .ob-next:hover { filter: brightness(1.1); }
        `
    }
}
