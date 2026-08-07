/**
 * Kênh liên lạc giữa popup và service worker cho chức năng "Nạp danh mục HIS".
 *
 * Việc nạp chạy ở SERVICE WORKER chứ không ở popup: tải hàng chục file danh mục
 * mất vài phút, mà popup đóng lại ngay khi người dùng bấm ra ngoài. Đặt ở service
 * worker thì đóng popup xong mở lại vẫn thấy tiến độ đang chạy tiếp.
 *
 * Tên message và kiểu dữ liệu đặt tập trung ở đây vì popup và background là hai
 * bundle khác nhau.
 */

/** Popup → background: bắt đầu nạp danh mục. */
export const CATALOG_IMPORT_START = 'zc-catalog-import-start'

/** Popup → background: xin trạng thái hiện tại (lúc popup vừa mở lại). */
export const CATALOG_IMPORT_STATUS = 'zc-catalog-import-status'

/** Popup → background: dừng lượt nạp đang chạy. */
export const CATALOG_IMPORT_CANCEL = 'zc-catalog-import-cancel'

/** Background → popup: tiến độ thay đổi (popup có thể đã đóng, gửi lỗi thì bỏ qua). */
export const CATALOG_IMPORT_PROGRESS = 'zc-catalog-import-progress'

/** Kết quả nạp của MỘT file danh mục. */
export type CatalogFileStatus = 'pending' | 'downloading' | 'uploading' | 'imported' | 'skipped' | 'failed'

export interface CatalogFileProgress {
    /** URL file xuất trên HIS. */
    url: string
    /** Tên danh mục tiếng Việt (đọc từ nhãn nút trên trang HIS) để hiện lên popup. */
    label: string
    /** Tên file HIS trả về (Content-Disposition) — dùng để nhận diện loại danh mục. */
    fileName: string
    status: CatalogFileStatus
    /** Thông báo tiếng Việt của API, hoặc lý do thất bại. */
    message: string
}

/** Toàn bộ trạng thái một lượt nạp danh mục. */
export interface CatalogImportState {
    running: boolean
    /** Mô tả bước đang làm, hiện thẳng lên popup. */
    phase: string
    /** Mã cơ sở KCB đọc từ thẻ script data-cmu-dvtt của trang HIS. */
    facilityCode: string
    files: CatalogFileProgress[]
    /** Lỗi làm hỏng cả lượt nạp (không mở được trang HIS, không tìm thấy file...). */
    error: string
    /** Lượt nạp đã kết thúc trọn vẹn. */
    finished: boolean
}

/** Trạng thái rỗng — dùng khi chưa từng nạp lần nào. */
export function emptyCatalogImportState(): CatalogImportState {
    return { running: false, phase: '', facilityCode: '', files: [], error: '', finished: false }
}

/** Đường dẫn trang xuất danh mục của HIS ({origin} lấy theo tab HIS đang mở). */
export const CATALOG_EXPORT_PAGE_PATH = '/web_his/export_categories'

/**
 * Mẫu nhận diện link tải file danh mục trên trang xuất danh mục.
 *
 * Trang HIS KHÔNG có thẻ <a href> nào — 20 nút tải là <input type="button">, URL
 * nằm trong script inline dạng TƯƠNG ĐỐI (`var url = "exporter_dmduoc?url=0";`).
 * Vì vậy mẫu này bắt phần đuôi tương đối, và mọi ứng viên phải nối lại bằng
 * `new URL(candidate, location.href)` chứ không phải `location.origin`.
 */
export const CATALOG_EXPORTER_PATTERN = 'exporter_[A-Za-z0-9_]*\\?url=[A-Za-z0-9]+'

/** Một mục danh mục xuất được trên trang HIS. */
export interface CatalogExportItem {
    /** Giá trị tham số ?url= trên link xuất. */
    token: string
    /** id của nút bấm tương ứng trên trang HIS. */
    elementId: string
    /** Nhãn tiếng Việt hiện lên popup. */
    label: string
}

/** Đường dẫn xuất danh mục (phần sau origin) khi phải tự dựng link. */
export const CATALOG_EXPORTER_PATH = '/web_his/exporter_dmduoc'

/**
 * Danh sách 20 danh mục xuất được, chép từ chính trang
 * /web_his/export_categories. Chỉ dùng làm PHƯƠNG ÁN DỰ PHÒNG khi quét trang
 * không ra link nào (HIS đổi giao diện, script chưa chạy...). Bình thường
 * extension đọc thẳng từ DOM để tự bắt kịp khi HIS thêm danh mục mới.
 */
export const CATALOG_EXPORT_ITEMS: CatalogExportItem[] = [
    { token: '0', elementId: 'xetnghiem', label: 'Xét nghiệm' },
    { token: '1', elementId: 'CDHA', label: 'CĐHA' },
    { token: '2', elementId: 'dichvu', label: 'Dịch vụ' },
    { token: '3', elementId: 'Duoc_loaivt', label: 'Dược loại vật tư' },
    { token: '4', elementId: 'nhomvattu', label: 'Nhóm vật tư' },
    { token: '5', elementId: 'nuocSX', label: 'Dược nước SX' },
    { token: '6', elementId: 'duocNVduoc', label: 'Dược NV Dược' },
    { token: '7', elementId: 'dongy', label: 'Bài thuốc Đông y' },
    { token: '8', elementId: 'khovattu', label: 'Kho vật tư' },
    { token: '9', elementId: 'khosulyNV', label: 'Kho xử lý NV' },
    { token: '0s', elementId: 'nhanvien', label: 'Nhân viên' },
    { token: '1s', elementId: 'phongban', label: 'Phòng ban' },
    { token: '2s', elementId: 'phongkham', label: 'Phòng khám' },
    { token: '3s', elementId: 'loaigiuong', label: 'Loại giường' },
    { token: '4s', elementId: 'giuongbenh', label: 'Giường bệnh' },
    { token: '5s', elementId: 'phuthu', label: 'Phụ thu' },
    { token: '6s', elementId: 'chuyenvien', label: 'Chuyển viện' },
    { token: '7s', elementId: 'vattu', label: 'Vật tư' },
    { token: '8s', elementId: 'nhaSX', label: 'Dược nhà SX' },
    { token: '9s', elementId: 'nhaCC', label: 'Dược nhà CC' },
]

/**
 * Bỏ phần rác ở đầu nhãn nút HIS ("1. Xuất DM Xét nghiệm" → "Xét nghiệm") để
 * popup hiện gọn.
 */
export function cleanCatalogLabel(raw: string): string {
    return raw
        .replace(/^\s*\d+\s*[.)]\s*/, '')
        .replace(/^\s*Xuất\s+(DM|Kho)?\s*/i, (m) => (/Kho/i.test(m) ? 'Kho ' : ''))
        .trim()
}
