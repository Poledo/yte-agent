import {
    PAYMENT_LIST_EVENT,
    PAYMENT_LIST_PAGE_MARK,
    PAYMENT_LIST_REQUEST_EVENT,
    PAYMENT_ROW_EVENT,
    PaymentListSnapshot,
    PaymentRowSelection,
    PaymentTicket,
} from '../../shared/his/PaymentListChannel'

/**
 * Bộ nhớ đệm danh sách phiếu thanh toán mà người dùng vừa tìm kiếm trên màn hình
 * "Kiểm tra bảng kê" của HIS.
 *
 * Dữ liệu do PaymentListSniffer (page context) bắt được từ chính lượt tìm kiếm của
 * người dùng và đẩy sang qua CustomEvent — extension KHÔNG gọi lại API tìm kiếm.
 * Nhờ vậy bấm nút kiểm tra hàng loạt là có ngay danh sách số vào viện.
 *
 * Chỉ giữ trong bộ nhớ của tab: tải lại trang là mất, người dùng tìm kiếm lại thì có lại.
 */
export class PaymentListStore {
    private snapshot: PaymentListSnapshot | null = null
    /** Dòng phiếu thanh toán người dùng đang chọn trên bảng kê. */
    private selectedRow: PaymentRowSelection | null = null
    private readonly listeners: Array<() => void> = []

    constructor() {
        document.addEventListener(PAYMENT_LIST_EVENT, (event) => this.onSnapshot(event as CustomEvent))
        document.addEventListener(PAYMENT_ROW_EVENT, (event) => this.onRow(event as CustomEvent))
        // Người dùng có thể đã bấm Xem thông tin TRƯỚC khi content script kịp lắng nghe →
        // xin lại lần chụp gần nhất của sniffer.
        try {
            document.dispatchEvent(new CustomEvent(PAYMENT_LIST_REQUEST_EVENT))
        } catch {
            // Không có sniffer (trang khác) → im lặng, coi như chưa tìm kiếm
        }
    }

    /** True nếu đang ở màn hình Kiểm tra bảng kê — nơi nút kiểm tra hàng loạt có nghĩa. */
    static isSupportedPage(): boolean {
        return typeof location !== 'undefined' && location.pathname.toLowerCase().includes(PAYMENT_LIST_PAGE_MARK)
    }

    /** Người dùng đã bấm Xem thông tin lần nào chưa (kể cả lần tìm ra 0 phiếu). */
    hasSearched(): boolean {
        return this.snapshot !== null
    }

    getTickets(): PaymentTicket[] {
        return this.snapshot?.items ?? []
    }

    /** Danh sách số vào viện, bỏ trùng, giữ đúng thứ tự hiển thị trên bảng kê. */
    getAdmissionNumbers(): string[] {
        const seen = new Set<string>()
        const numbers: string[] = []
        for (const ticket of this.getTickets()) {
            if (seen.has(ticket.soVaoVien)) continue
            seen.add(ticket.soVaoVien)
            numbers.push(ticket.soVaoVien)
        }
        return numbers
    }

    /** Phiếu thanh toán của một số vào viện, null nếu số đó không có trong danh sách đã nhớ. */
    findTicket(soVaoVien: string): PaymentTicket | null {
        return this.getTickets().find((item) => item.soVaoVien === soVaoVien) ?? null
    }

    /** Số vào viện của dòng đang chọn, null nếu người dùng chưa chọn dòng nào. */
    getSelectedAdmission(): string | null {
        return this.selectedRow?.soVaoVien ?? null
    }

    /**
     * Tên bệnh nhân của dòng đang chọn. Ưu tiên TEN_BENH_NHAN từ API thông tin hành chính;
     * chưa có thì lấy từ chính danh sách phiếu thanh toán đã nhớ, không có nữa thì null.
     */
    getSelectedPatientName(): string | null {
        const row = this.selectedRow
        if (!row) return null
        if (row.tenBenhNhan !== '') return row.tenBenhNhan
        const ticket = this.findTicket(row.soVaoVien)
        return ticket && ticket.tenBenhNhan !== '' ? ticket.tenBenhNhan : null
    }

    /** Đăng ký nhận thông báo khi danh sách hoặc dòng đang chọn thay đổi (để vẽ lại nút). */
    onChange(listener: () => void): void {
        this.listeners.push(listener)
    }

    private onSnapshot(event: CustomEvent): void {
        const snapshot = PaymentListStore.parse<PaymentListSnapshot>(event)
        if (!snapshot || !Array.isArray(snapshot.items)) return
        this.snapshot = snapshot
        // Danh sách mới thì lựa chọn cũ không còn nghĩa
        this.selectedRow = null
        console.log(`[PaymentListStore] Đã nhớ ${snapshot.items.length} phiếu thanh toán`)
        this.notify()
    }

    private onRow(event: CustomEvent): void {
        const row = PaymentListStore.parse<PaymentRowSelection>(event)
        if (!row || typeof row.soVaoVien !== 'string' || row.soVaoVien === '') return
        this.selectedRow = row
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener())
    }

    /** Đọc detail dạng chuỗi JSON do sniffer gửi sang; dữ liệu hỏng thì bỏ qua. */
    private static parse<T>(event: CustomEvent): T | null {
        const raw = event.detail
        if (typeof raw !== 'string') return null
        try {
            return JSON.parse(raw) as T
        } catch (error) {
            console.warn('[PaymentListStore] Không đọc được dữ liệu bảng kê:', error)
            return null
        }
    }
}
