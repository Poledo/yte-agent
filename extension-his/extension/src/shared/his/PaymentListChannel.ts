/**
 * Kênh liên lạc giữa hai "thế giới" JavaScript cho màn hình Kiểm tra bảng kê:
 * - PaymentListSniffer (src/page) chạy trong PAGE CONTEXT (world MAIN), bắt được
 *   phản hồi API danh sách phiếu thanh toán của HIS;
 * - PaymentListStore (src/content) chạy trong isolated world, giữ bộ nhớ đệm cho ChatPanel.
 *
 * Hai bên nằm ở hai bundle khác nhau nên tên sự kiện/khóa đặt tập trung tại đây,
 * không lặp chuỗi ở hai nơi.
 */

/** Sniffer phát sự kiện này mỗi khi HIS trả về danh sách phiếu thanh toán. */
export const PAYMENT_LIST_EVENT = '__zcPaymentList__'

/**
 * Content script phát sự kiện này lúc khởi tạo để xin lại lần chụp gần nhất —
 * người dùng có thể đã bấm Xem thông tin TRƯỚC khi content script kịp lắng nghe.
 */
export const PAYMENT_LIST_REQUEST_EVENT = '__zcPaymentListRequest__'

/** Chuỗi nhận diện API danh sách phiếu thanh toán trong URL của HIS. */
export const PAYMENT_LIST_API_MARK = 'danhsachphieuthanhtoan'

/** Sniffer phát sự kiện này khi người dùng chọn (bấm) một dòng trên bảng kê. */
export const PAYMENT_ROW_EVENT = '__zcPaymentRow__'

/**
 * Các API HIS gọi ngay khi người dùng bấm chọn một dòng phiếu thanh toán.
 * Số vào viện nằm trên query string nên chỉ cần đọc URL, không cần đọc phản hồi.
 */
export const PAYMENT_ROW_API_MARKS = ['getsolanguibhxh', 'ktbk_thongtinhanhchinh']

/**
 * API thông tin hành chính — phản hồi có TEN_BENH_NHAN, dùng để hiện tên bệnh nhân
 * trên nút kiểm tra. Đây là API duy nhất trong nhóm trên cần đọc nội dung phản hồi.
 */
export const PAYMENT_ROW_INFO_MARK = 'ktbk_thongtinhanhchinh'

/** Tên tham số chứa số vào viện trên URL các API chọn dòng. */
export const PAYMENT_ROW_PARAM = 'sovaovien'

/** Đường dẫn màn hình Kiểm tra bảng kê — nơi nút kiểm tra hàng loạt xuất hiện. */
export const PAYMENT_LIST_PAGE_MARK = 'kiemtrabangke'

/** Một dòng phiếu thanh toán, rút gọn từ phản hồi HIS (chỉ giữ trường cần dùng). */
export interface PaymentTicket {
    /** SOVAOVIEN — khóa để tải file XML 130 tương ứng. */
    soVaoVien: string
    /** SOPHIEUTHANHTOAN, vd "5876/2026". */
    soPhieu: string
    tenBenhNhan: string
    /** NGAY_KHAM_BENH, vd "30/07/2026". */
    ngayKham: string
}

/** Một lần người dùng bấm Xem thông tin: kết quả + thời điểm. */
export interface PaymentListSnapshot {
    items: PaymentTicket[]
    /** Thời điểm nhận được phản hồi (epoch ms). */
    at: number
    /** URL API đã gọi — để đối chiếu khi cần gỡ lỗi. */
    url: string
}

/** Dòng phiếu thanh toán người dùng đang chọn trên bảng kê. */
export interface PaymentRowSelection {
    soVaoVien: string
    /** TEN_BENH_NHAN — rỗng khi API thông tin hành chính chưa trả về. */
    tenBenhNhan: string
    /** Thời điểm phát hiện lượt chọn (epoch ms). */
    at: number
    /** URL API đã gọi — để đối chiếu khi cần gỡ lỗi. */
    url: string
}
