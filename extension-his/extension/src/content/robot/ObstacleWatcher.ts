import { RobotConfig } from './RobotConfig'
import { EXTENSION_HOST_SELECTOR } from '../../shared/dom/ExtensionHostIds'

/** Khung chữ nhật trong hệ toạ độ khung nhìn (viewport). */
export interface ViewportBox {
    left: number
    top: number
    width: number
    height: number
}

/** Nút bấm của trang đang nằm đè lên chỗ đậu của robot. */
export interface PageObstacle extends ViewportBox {
    /** Nhãn nhận dạng — đổi nghĩa là vật cản đã khác (đổi nút, đổi chỗ, đổi cỡ). */
    key: string
    /** Định danh theo ĐÚNG phần tử: cuộn trang làm `key` đổi nhưng `id` thì không. */
    id: string
    /** Chữ trên nút, dùng khi ghi log chẩn đoán (vd "Ký số"). */
    label: string
}

/**
 * Dò xem có nút bấm nào của TRANG đang chiếm chỗ đậu của robot hay không.
 *
 * Cách dò: bắn vài điểm vào đúng ô robot sẽ đứng rồi hỏi `elementsFromPoint` phần tử
 * nào nằm trên đó — rẻ hơn và đúng hơn nhiều so với quét toàn bộ nút của trang, vì nó
 * tính luôn cả lớp phủ, z-index và phần tử bị ẩn.
 *
 * KHÔNG dùng polling (đúng Chrome Extension Rules): chỉ quét lại khi DOM đổi
 * (MutationObserver), khi cuộn hoặc khi đổi cỡ cửa sổ, có chờ trang lặng để gộp
 * nhiều thay đổi làm một lần quét.
 *
 * Hạn chế đã biết: nút nằm trong iframe hoặc trong shadow DOM của trang thì
 * `elementsFromPoint` chỉ trả về phần tử bọc ngoài → coi như không có vật cản.
 */
export class ObstacleWatcher {
    private static readonly ids = new WeakMap<Element, string>()
    private static idSeed = 0

    private observer: MutationObserver | null = null
    private settleTimer: number | null = null
    private frame = 0
    private lastKey = ''
    private started = false

    private readonly onDomChange = (records: MutationRecord[]): void => {
        if (this.isOwnChange(records)) return // robot tự cựa quậy — không phải trang đổi
        this.schedule()
    }
    private readonly onViewportChange = (): void => this.schedule()

    /**
     * @param homeBox Trả về ô robot ĐẬU MẶC ĐỊNH (không phải chỗ đang đứng) — nhờ vậy
     *                lúc robot đã tránh đi rồi vẫn biết chỗ cũ còn bị chiếm hay đã trống.
     * @param onChange Gọi khi vật cản xuất hiện, đổi khác hoặc biến mất.
     */
    constructor(
        private readonly homeBox: () => ViewportBox,
        private readonly onChange: (obstacle: PageObstacle | null) => void,
    ) {}

    start(): void {
        if (this.started) return
        this.started = true
        this.observer = new MutationObserver(this.onDomChange)
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden', 'disabled'],
        })
        window.addEventListener('resize', this.onViewportChange, { passive: true })
        window.addEventListener('scroll', this.onViewportChange, { passive: true, capture: true })
        this.schedule()
    }

    stop(): void {
        if (!this.started) return
        this.started = false
        this.observer?.disconnect()
        this.observer = null
        window.removeEventListener('resize', this.onViewportChange)
        window.removeEventListener('scroll', this.onViewportChange, true)
        this.clearPending()
    }

    /** Quét lại ngay (vd sau khi đóng/mở panel trợ lý, sau khi robot đổi chỗ). */
    refresh(): void {
        this.schedule()
    }

    // ---------------------------------------------------------------
    // Lên lịch quét
    // ---------------------------------------------------------------

    private schedule(): void {
        if (!this.started) return
        if (this.settleTimer !== null) clearTimeout(this.settleTimer)
        this.settleTimer = window.setTimeout(() => {
            this.settleTimer = null
            // Quét trong khung hình kế tiếp: bố cục đã ổn định, đo rect mới chuẩn.
            cancelAnimationFrame(this.frame)
            this.frame = requestAnimationFrame(() => this.scan())
        }, RobotConfig.obstacle.settleMs)
    }

    private clearPending(): void {
        if (this.settleTimer !== null) {
            clearTimeout(this.settleTimer)
            this.settleTimer = null
        }
        cancelAnimationFrame(this.frame)
        this.frame = 0
    }

    private scan(): void {
        if (!this.started) return
        const obstacle = this.findObstacle(this.homeBox())
        const key = obstacle?.key ?? ''
        if (key === this.lastKey) return
        this.lastKey = key
        this.onChange(obstacle)
    }

    // ---------------------------------------------------------------
    // Dò vật cản
    // ---------------------------------------------------------------

    private findObstacle(home: ViewportBox): PageObstacle | null {
        const cfg = RobotConfig.obstacle
        const bandTop = window.innerHeight - cfg.bandHeight
        let best: PageObstacle | null = null

        for (const point of ObstacleWatcher.samplePoints(home)) {
            const top = this.topElementAt(point.x, point.y)
            if (!top) continue

            for (const button of ObstacleWatcher.buttonsAt(top, cfg.selector)) {
                const rect = button.getBoundingClientRect()
                if (rect.width < cfg.minSize || rect.height < cfg.minSize) continue
                if (rect.height > cfg.bandHeight) continue // cao quá thì là khung/lớp phủ, không phải nút
                if (rect.top < bandTop) continue // không phải nút ở đáy trang
                if (!ObstacleWatcher.overlaps(rect, home)) continue
                // Khối chỉ "trông như nút" (dòng lưới, thẻ có con trỏ bàn tay) mà cuộn được thì bỏ:
                // nó trôi đi khi cuộn, chỉ nút GHIM ở đáy mới thực sự tranh chỗ với robot.
                if (!button.matches(cfg.selector) && !ObstacleWatcher.isPinned(button)) continue

                // Nhiều nút cùng chắn → lấy nút có mặt trên CAO nhất, vì đó là mặt robot đụng phải.
                if (best === null || rect.top < best.top) best = ObstacleWatcher.describe(button, rect)
            }
        }
        return best
    }

    /**
     * Các nút ứng viên tại một điểm dò.
     *
     * Điểm dò hiếm khi rơi trúng giữa nút: thanh công cụ đáy trang có khe giữa các nút và
     * phần đệm dưới nút, nên `elementsFromPoint` thường trả về chính THANH chứ không phải
     * nút. Vì vậy: trúng khối bấm được thì lấy khối đó, trúng khối chứa nút thì lấy các nút
     * bên trong (chỗ gọi vẫn lọc tiếp theo cỡ, theo dải đáy và theo phần chồng lấn).
     */
    private static buttonsAt(element: Element, selector: string): HTMLElement[] {
        const own = ObstacleWatcher.clickableAncestor(element, selector)
        if (own) return [own]
        // Nền trang trống (body/html) thì không có gì chắn — khỏi quét cả trang cho tốn.
        if (element === document.body || element === document.documentElement) return []
        return Array.from(element.querySelectorAll<HTMLElement>(selector)).slice(0, RobotConfig.obstacle.maxCandidates)
    }

    /**
     * Khối bấm được NGOÀI CÙNG bọc lấy điểm dò.
     *
     * Nhiều nút trong HIS không phải thẻ `<button>`: nút nổi Smart CA chẳng hạn là mấy lớp
     * `<div>` lồng nhau (`smartca-ad-float-button-scanner-wrapper`). Nên ngoài bộ chọn còn
     * xét thêm dấu hiệu bấm được: có `onclick`, tên lớp/id chứa "button/btn/fab", hoặc con
     * trỏ hình bàn tay. Leo tới khối ngoài cùng còn bấm được để lấy trọn khung của nút
     * (đứng lên phải đứng trên nóc cả cụm, không phải trên cái icon bên trong).
     */
    private static clickableAncestor(element: Element, selector: string): HTMLElement | null {
        let node: Element | null = element
        let found: HTMLElement | null = null
        for (let depth = 0; node !== null && depth < RobotConfig.obstacle.maxClimb; depth++) {
            if (node === document.body || node === document.documentElement) break
            if (ObstacleWatcher.isClickable(node, selector)) found = node as HTMLElement
            else if (found !== null) break // hết cụm bấm được → giữ khối ngoài cùng đã thấy
            node = node.parentElement
        }
        return found
    }

    /** Nút có bị GHIM vào khung nhìn không (chính nó hoặc khối cha `fixed`/`sticky`). */
    private static isPinned(element: Element): boolean {
        let node: Element | null = element
        for (let depth = 0; node !== null && depth < RobotConfig.obstacle.maxClimb; depth++) {
            const position = window.getComputedStyle(node).position
            if (position === 'fixed' || position === 'sticky') return true
            node = node.parentElement
        }
        return false
    }

    private static isClickable(element: Element, selector: string): boolean {
        if (element.matches(selector)) return true
        if (element.hasAttribute('onclick')) return true
        const className = typeof element.className === 'string' ? element.className : ''
        if (RobotConfig.obstacle.clickableName.test(`${element.id} ${className}`)) return true
        return window.getComputedStyle(element).cursor === 'pointer'
    }

    /** Phần tử trên cùng tại một điểm, bỏ qua mọi giao diện của chính extension. */
    private topElementAt(x: number, y: number): Element | null {
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return null
        for (const element of document.elementsFromPoint(x, y)) {
            if (element.closest(EXTENSION_HOST_SELECTOR)) continue
            return element
        }
        return null
    }

    /**
     * Chín điểm dò trải trên nửa dưới ô robot — nơi thân và chân robot chạm vào trang.
     * Hàng dưới cùng lùi vào 6px chứ không sát mép: nút có đáy trùng đúng mép ô robot thì
     * điểm ngay trên đường biên lại rơi ra ngoài nút, dò không thấy.
     */
    private static samplePoints(box: ViewportBox): Array<{ x: number; y: number }> {
        const xs = [box.left + 4, box.left + box.width / 2, box.left + box.width - 4]
        const ys = [box.top + box.height - 6, box.top + box.height * 0.78, box.top + box.height * 0.55]
        return xs.flatMap((x) => ys.map((y) => ({ x, y })))
    }

    private static overlaps(rect: DOMRect, box: ViewportBox): boolean {
        return (
            rect.left < box.left + box.width &&
            rect.right > box.left &&
            rect.top < box.top + box.height &&
            rect.bottom > box.top
        )
    }

    private static describe(button: HTMLElement, rect: DOMRect): PageObstacle {
        // Nút chỉ có icon thì không có chữ — lấy tới `title`/`aria-label` cho dễ đọc log.
        const texts = [button.textContent, button.getAttribute('title'), button.getAttribute('aria-label')]
        const label = (texts.find((text) => (text ?? '').trim() !== '') ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
        // Làm tròn theo bậc để xê dịch vài pixel (cuộn mượt, hiệu ứng) không tính là vật cản mới.
        const snap = (value: number): number => Math.round(value / 4) * 4
        const id = ObstacleWatcher.identify(button)
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            label,
            id,
            key: `${id}|${snap(rect.left)},${snap(rect.top)},${snap(rect.width)},${snap(rect.height)}`,
        }
    }

    /**
     * Số hiệu riêng cho từng phần tử, nhớ bằng `WeakMap` nên phần tử bị gỡ khỏi trang là
     * quên luôn. Nhờ vậy robot phân biệt được "vẫn cái nút cũ, chỉ trôi theo trang" (không
     * té lại) với "một nút khác chắn đường".
     */
    private static identify(element: Element): string {
        const known = ObstacleWatcher.ids.get(element)
        if (known !== undefined) return known
        const id = `${element.tagName}#${(ObstacleWatcher.idSeed += 1)}`
        ObstacleWatcher.ids.set(element, id)
        return id
    }

    /** Mọi thay đổi đều đến từ giao diện của extension (robot cựa quậy) → khỏi quét lại. */
    private isOwnChange(records: MutationRecord[]): boolean {
        return records.every((record) => {
            const target = record.target
            const element = target instanceof Element ? target : target.parentElement
            return element?.closest(EXTENSION_HOST_SELECTOR) != null
        })
    }
}
