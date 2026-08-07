import { RobotConfig } from './RobotConfig'

/**
 * Popup Controller (RDD §2, task §2 & §10): cầu nối giữa công tắc Enable/Disable
 * trong popup của extension và robot trên trang.
 *
 * Trạng thái bật/tắt lưu ở chrome.storage.local (key robotEnabled). Popup ghi,
 * content lắng nghe onChanged nên đổi công tắc có hiệu lực NGAY, ở mọi trạng thái
 * (task §10 — không khoá công tắc). Robot sống trong trang không thể vào cửa sổ
 * popup thật, nên "bay lên popup" được diễn giải là bay khỏi mép trên rồi ngủ.
 */
export class PopupController {
    private enabled = true

    constructor(private readonly onChange: (enabled: boolean) => void) {}

    /** Đọc trạng thái ban đầu + lắng nghe thay đổi từ popup. */
    init(): void {
        const key = RobotConfig.storageKey.enabled
        try {
            chrome.storage?.local?.get({ [key]: true }, (items) => {
                this.enabled = items[key] !== false
                this.onChange(this.enabled)
            })
            chrome.storage?.onChanged?.addListener((changes, area) => {
                if (area !== 'local' || !changes[key]) return
                const next = changes[key].newValue !== false
                if (next === this.enabled) return
                this.enabled = next
                this.onChange(next)
            })
        } catch (error) {
            console.warn('[Robot][PopupController] Không đọc được cấu hình, mặc định BẬT', error)
            this.onChange(true)
        }
    }

    isEnabled(): boolean {
        return this.enabled
    }

    /** Ghi trạng thái mới (nếu sau này robot tự có nút bật/tắt). */
    setEnabled(value: boolean): void {
        this.enabled = value
        try {
            chrome.storage?.local?.set({ [RobotConfig.storageKey.enabled]: value })
        } catch (error) {
            console.warn('[Robot][PopupController] Không ghi được cấu hình', error)
        }
    }
}
