/**
 * Kiểu dữ liệu chung cho hệ sinh hoạt robot (RDD Expansion v2).
 * Tách riêng để mọi module trong `life/` phụ thuộc kiểu, không phụ thuộc nhau.
 */

/** Pha sinh hoạt trong ngày, do TimeScheduler suy ra từ giờ thực. */
export enum LifePhase {
    /** Làm việc bình thường (sáng/chiều). */
    Working = 'working',
    /** Ngủ trưa. */
    Napping = 'napping',
    /** Ngủ tối. */
    Sleeping = 'sleeping',
}

/** Phân loại hoạt động idle — để lọc theo pha / thống kê / mở rộng. */
export type ActivityCategory = 'rest' | 'hobby' | 'chore' | 'exercise' | 'social' | 'work'

/**
 * Một HOẠT ĐỘNG của robot (đọc sách, uống cà phê, tập gym...).
 * Đây là DỮ LIỆU thuần: thêm hàng trăm hoạt động = thêm object, KHÔNG sửa engine.
 * Cách "vẽ" hoạt động (animation) được tra bằng `id` ở lớp trình diễn, nên phần
 * quyết-định (life/) hoàn toàn không phụ thuộc DOM.
 */
export interface Activity {
    /** Định danh duy nhất (khớp với animation ở lớp view sau này). */
    readonly id: string
    /** Tên tiếng Việt để hiển thị/nhật ký. */
    readonly label: string
    readonly category: ActivityCategory
    /** Trọng số chọn ngẫu nhiên (càng lớn càng hay xảy ra). */
    readonly weight: number
    /** Thời lượng tối thiểu/tối đa (ms) trước khi đổi sang hoạt động khác. */
    readonly minMs: number
    readonly maxMs: number
    /** Riêng tư (tắm, thay đồ, ngủ...) → mở popup lúc này robot có phản ứng ngượng. */
    readonly isPrivate?: boolean
    /** Chỉ hợp lệ trong các pha này; bỏ trống = mọi pha. */
    readonly phases?: readonly LifePhase[]
}
