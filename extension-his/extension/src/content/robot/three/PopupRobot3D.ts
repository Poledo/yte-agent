import { ThreeRobotScene } from './ThreeRobotScene'
import { RobotConfig } from '../RobotConfig'
import type { RobotAppearance } from '../ExtensionConfig'

/** Các vùng chữ dưới sân khấu robot trong popup (caption + trạng thái). */
export interface PopupRobot3DUi {
    readonly caption: HTMLElement | null
    readonly state: HTMLElement | null
}

/**
 * Robot 3D "sống trong ngôi nhà" (popup). Là bản 3D của `PopupRobot` (SVG): mount
 * `ThreeRobotScene` vào ngay sân khấu popup thay vì góc cố định, chỉ để NGẮM (không
 * click-to-activate) nhưng vẫn nhìn theo chuột. Popup là trang extension bình thường
 * nên nạp three trực tiếp (không cần cầu nối page-world như ở content script).
 *
 * ĐỒNG BỘ CÔNG TẮC (task-002 §2, sửa lỗi trùng robot): robot chỉ ở MỘT nơi.
 *  - BẬT: robot "xuống trang HIS làm việc" → NHÀ (popup) TRỐNG, ẩn hẳn khu robot để
 *    KHÔNG hiện đồng thời cả trong popup lẫn ngoài content (đúng lỗi người dùng báo).
 *  - TẮT: robot "về nhà nghỉ" → hiện trong popup, bay rớt vào chỗ.
 * Nghe `chrome.storage.onChanged` nên bật/tắt có hiệu lực NGAY.
 *
 * An toàn: nếu dựng 3D lỗi (model/asset/WebGL) → gọi `onFail` để popup rơi về robot SVG,
 * đúng nguyên tắc "robot LUÔN hiện, không kẹt".
 */
export class PopupRobot3D {
    private scene: ThreeRobotScene | null = null
    private onFail: (() => void) | null = null
    private ready = false
    private enabled = true
    private applied = false
    private storageListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null =
        null

    constructor(
        private readonly stage: HTMLElement,
        private readonly ui: PopupRobot3DUi,
        private readonly appearance?: RobotAppearance,
    ) {}

    /** Bắt đầu dựng robot 3D; `onFail` được gọi nếu không dựng được (để rơi về SVG). */
    start(onFail?: () => void): void {
        this.onFail = onFail ?? null
        try {
            const modelUrl = chrome.runtime.getURL('robot3d/RobotExpressive.glb')
            const logoUrl = chrome.runtime.getURL('robot3d/vnpt-logo.png')
            this.setText('Đang thức dậy…', '')
            this.scene = new ThreeRobotScene(
                modelUrl,
                () => {},
                () => {
                    this.ready = true
                    this.applyEnabled() // model xong → phản chiếu đúng trạng thái công tắc
                },
                () => this.fail(),
                {
                    container: this.stage,
                    width: this.stage.clientWidth || 96,
                    height: this.stage.clientHeight || 108,
                    interactive: false,
                    logoUrl,
                    // Diện mạo web-admin (màu/cỡ/logo tuỳ chỉnh) — giống hệt robot ngoài content.
                    color: this.appearance?.color,
                    scale: this.appearance?.scale,
                    showLogo: this.appearance?.showLogo,
                    logoDataUrl: this.appearance?.logoDataUrl,
                },
            )
            this.scene.setState('idle') // đứng rảnh + tự cựa quậy cho "sống"
            this.watchEnabled() // đọc + theo dõi công tắc robotEnabled
        } catch {
            this.fail()
        }
    }

    /** Đọc trạng thái bật/tắt hiện tại rồi lắng nghe thay đổi để đồng bộ ngay. */
    private watchEnabled(): void {
        const key = RobotConfig.storageKey.enabled
        try {
            chrome.storage?.local?.get({ [key]: true }, (items) => {
                this.enabled = items[key] !== false
                this.applyEnabled()
            })
            this.storageListener = (changes, area): void => {
                if (area !== 'local' || !changes[key]) return
                this.enabled = changes[key].newValue !== false
                this.applyEnabled()
            }
            chrome.storage?.onChanged?.addListener(this.storageListener)
        } catch {
            this.enabled = true
            this.applyEnabled()
        }
    }

    /**
     * Phản chiếu công tắc (robot chỉ ở MỘT nơi):
     *  - BẬT: robot RỜI nhà ra trang HIS → bay XUỐNG một đoạn rồi biến mất, xong ẩn cả khu.
     *  - TẮT: robot VỀ nhà → hiện khu + bay rớt vào chỗ; nếu là chuyển-nhà thì ĐỢI robot
     *    content bay-ra khỏi trang trước (`LEAVE_MS`) rồi mới thả xuống, không chồng chéo.
     * Chỉ chạy khi model đã sẵn sàng.
     */
    private applyEnabled(): void {
        if (!this.scene || !this.ready) return
        const home = this.homeContainer()
        const first = !this.applied
        const isToggle = this.applied && this.enabled !== this.wasEnabled
        this.wasEnabled = this.enabled
        this.applied = true
        if (this.enabled) {
            if (isToggle) {
                // Vừa bấm BẬT: bay XUỐNG (về phía trang) rồi ẩn cả "ngôi nhà" khi xong.
                this.scene.flyOut({ dir: 'down', onDone: () => (home.style.display = 'none') })
            } else {
                home.style.display = 'none' // lần đầu / không đổi: nhà trống ngay
            }
        } else {
            home.style.display = ''
            this.setText('ZeroCheck AI', '🏠 Đang ở nhà nghỉ ngơi')
            if (first) this.scene.flyIn() // mở popup lúc đang tắt: bay vào luôn
            else if (isToggle) this.scene.flyIn({ delayMs: PopupRobot3D.LEAVE_MS }) // đợi content rời trang
        }
    }

    /** Đợi robot RỜI chỗ (bên content) bay-ra xong rồi mới thả robot popup xuống — khớp scene. */
    private static readonly LEAVE_MS = 720
    private wasEnabled = true

    /** Khu bao "ngôi nhà" (robot + chú thích + trạng thái) — ẩn/hiện trọn khối. */
    private homeContainer(): HTMLElement {
        return this.stage.parentElement ?? this.stage
    }

    /** [TẠM — nút TEST] Hiện robot (kể cả khi đang ẩn vì bật) rồi diễn màn "đi tới va màn hình". */
    demoWalkToScreen(): void {
        if (!this.scene || !this.ready) return
        this.homeContainer().style.display = '' // đảm bảo THẤY robot để xem thử
        this.scene.playWalkToScreen()
    }

    private fail(): void {
        this.scene?.dispose()
        this.scene = null
        this.onFail?.()
    }

    private setText(caption: string, state: string): void {
        if (this.ui.caption) this.ui.caption.textContent = caption
        if (this.ui.state) this.ui.state.textContent = state
    }

    /** Dọn dẹp khi đóng popup. */
    destroy(): void {
        if (this.storageListener) {
            try {
                chrome.storage?.onChanged?.removeListener(this.storageListener)
            } catch {
                /* API không sẵn — bỏ qua */
            }
            this.storageListener = null
        }
        this.scene?.dispose()
        this.scene = null
    }
}
