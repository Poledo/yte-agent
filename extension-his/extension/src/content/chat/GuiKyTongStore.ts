import {
    GUI_KYTONG_EVENT,
    GUI_KYTONG_PAGE_MARK,
    GUI_KYTONG_REQUEST_EVENT,
    GuiKyTongCapture,
} from '../../shared/his/GuiBhxhChannel'

/**
 * Bộ nhớ đệm tham số lượt "Xuất XML Ký tổng" trên màn hình Gửi danh sách hồ sơ
 * BHXH 4210 của VNPT-HIS (vnpt-his.vncare.vn).
 *
 * Dữ liệu do GuiBhxhSniffer (page context) bắt được từ chính lượt bấm của
 * người dùng (URL IdgStorageUpload + JWT Authorization) và đẩy sang qua
 * CustomEvent — extension KHÔNG tự gọi API tìm kiếm.
 *
 * Chỉ giữ trong bộ nhớ của tab: tải lại trang là mất, người dùng bấm Xuất
 * XML Ký tổng lại thì có lại.
 */
export class GuiKyTongStore {
    private capture: GuiKyTongCapture | null = null
    private readonly listeners: Array<() => void> = []

    constructor() {
        document.addEventListener(GUI_KYTONG_EVENT, (event) => this.onCapture(event as CustomEvent))
        // Người dùng có thể đã bấm Xuất XML TRƯỚC khi content script kịp lắng nghe →
        // xin lại lần chụp gần nhất của sniffer.
        try {
            document.dispatchEvent(new CustomEvent(GUI_KYTONG_REQUEST_EVENT))
        } catch {
            // Không có sniffer (trang khác) → im lặng, coi như chưa xuất lần nào
        }
    }

    /** True nếu đang ở màn hình Gửi danh sách hồ sơ BHXH 4210 — nơi có nút Xuất XML Ký tổng. */
    static isSupportedPage(): boolean {
        if (typeof location === 'undefined') return false
        const func = location.search.toLowerCase()
        return location.pathname.toLowerCase().includes('manager.jsp') && func.includes(GUI_KYTONG_PAGE_MARK)
    }

    /** Người dùng đã bấm Xuất XML Ký tổng lần nào chưa trong phiên trang này. */
    hasCapture(): boolean {
        return this.capture !== null
    }

    /** Tham số lượt xuất gần nhất, null nếu chưa có. */
    getCapture(): GuiKyTongCapture | null {
        return this.capture
    }

    /** Đăng ký nhận thông báo khi có lượt xuất mới (để vẽ lại nút). */
    onChange(listener: () => void): void {
        this.listeners.push(listener)
    }

    private onCapture(event: CustomEvent): void {
        const raw = event.detail
        if (typeof raw !== 'string') return
        try {
            const capture = JSON.parse(raw) as GuiKyTongCapture
            if (!capture || typeof capture.url !== 'string' || capture.url === '') return
            this.capture = capture
            console.log('[GuiKyTongStore] Đã nhớ lượt Xuất XML Ký tổng')
            this.listeners.forEach((listener) => listener())
        } catch (error) {
            console.warn('[GuiKyTongStore] Không đọc được dữ liệu lượt xuất XML Ký tổng:', error)
        }
    }
}
