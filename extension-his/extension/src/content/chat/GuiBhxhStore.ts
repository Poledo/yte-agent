import {
    GUI_BHXH_EVENT,
    GUI_BHXH_PAGE_MARK,
    GUI_BHXH_REQUEST_EVENT,
    GuiBhxhExportCapture,
} from '../../shared/his/GuiBhxhChannel'

/**
 * Bộ nhớ đệm tham số lượt "Xuất XML KMH" trên màn hình Gửi bảo hiểm 4210
 * của VNPT-HIS (vnpt-his.vncare.vn).
 *
 * Dữ liệu do GuiBhxhSniffer (page context) bắt được từ chính lượt bấm của
 * người dùng và đẩy sang qua CustomEvent — extension KHÔNG tự gọi API tìm
 * kiếm: mọi tham số phiên (DS_MALK, ngày, HCODE) đều lấy từ request gốc.
 *
 * Chỉ giữ trong bộ nhớ của tab: tải lại trang là mất, người dùng bấm Xuất
 * XML KMH lại thì có lại.
 */
export class GuiBhxhStore {
    private capture: GuiBhxhExportCapture | null = null
    private readonly listeners: Array<() => void> = []

    constructor() {
        document.addEventListener(GUI_BHXH_EVENT, (event) => this.onCapture(event as CustomEvent))
        // Người dùng có thể đã bấm Xuất XML TRƯỚC khi content script kịp lắng nghe →
        // xin lại lần chụp gần nhất của sniffer.
        try {
            document.dispatchEvent(new CustomEvent(GUI_BHXH_REQUEST_EVENT))
        } catch {
            // Không có sniffer (trang khác) → im lặng, coi như chưa xuất lần nào
        }
    }

    /** True nếu đang ở màn hình Gửi bảo hiểm 4210 — nơi nút kiểm tra theo lô có nghĩa. */
    static isSupportedPage(): boolean {
        if (typeof location === 'undefined') return false
        const func = location.search.toLowerCase()
        return location.pathname.toLowerCase().includes('manager.jsp') && func.includes(GUI_BHXH_PAGE_MARK)
    }

    /** Người dùng đã bấm Xuất XML KMH lần nào chưa trong phiên trang này. */
    hasCapture(): boolean {
        return this.capture !== null
    }

    /** Tham số lượt xuất gần nhất, null nếu chưa có. */
    getCapture(): GuiBhxhExportCapture | null {
        return this.capture
    }

    /** Danh sách mã liên kết bệnh nhân của lượt xuất gần nhất. */
    getMaLkList(): string[] {
        return this.capture?.maLkList ?? []
    }

    /** Đăng ký nhận thông báo khi có lượt xuất mới (để vẽ lại nút). */
    onChange(listener: () => void): void {
        this.listeners.push(listener)
    }

    private onCapture(event: CustomEvent): void {
        const raw = event.detail
        if (typeof raw !== 'string') return
        try {
            const capture = JSON.parse(raw) as GuiBhxhExportCapture
            if (!capture || typeof capture.paramsJson !== 'string' || capture.paramsJson === '') return
            this.capture = capture
            console.log(`[GuiBhxhStore] Đã nhớ lượt Xuất XML KMH (${capture.maLkList.length} bệnh nhân)`)
            this.listeners.forEach((listener) => listener())
        } catch (error) {
            console.warn('[GuiBhxhStore] Không đọc được dữ liệu lượt xuất XML:', error)
        }
    }
}
