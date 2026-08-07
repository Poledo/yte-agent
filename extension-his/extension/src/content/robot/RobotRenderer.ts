import type { RobotResult } from './RobotMascot'

/**
 * Ba "hình hài" robot mà web-admin có thể chọn (task-003 Part 2). Chọn nào cũng dùng
 * chung BỘ NÃO (life/) và cùng luồng nghiệp vụ — chỉ khác lớp trình diễn:
 *  - svg     → "Nút thường": KHÔNG có robot — chỉ nút tròn 🤖 thường của panel (như bản
 *              gốc, trước khi có robot mascot). Nhẹ nhất, mặc định. Ẩn/hiện theo công tắc
 *              robot trong popup: tắt robot → ẩn luôn nút trợ lý.
 *  - svgAnim → "Trợ lý động": robot SVG sinh động (cử động thường xuyên) làm launcher.
 *  - three   → "Trợ lý 3D": robot 3D (ThreeJS), tải riêng (web_accessible_resource) khi chọn
 *              để KHÔNG làm nặng content script trên mọi trang HIS.
 */
export type RobotRendererId = 'svg' | 'svgAnim' | 'three'

/** Mô tả một hình hài để hiển thị ở web-admin (tên tiếng Việt, id kỹ thuật). */
export interface RobotRendererMeta {
    readonly id: RobotRendererId
    readonly name: string
    readonly desc: string
}

/** Danh mục robot chọn được — nguồn sự thật dùng chung cho extension và web-admin. */
export const ROBOT_RENDERERS: readonly RobotRendererMeta[] = [
    { id: 'svg', name: 'Nút thường', desc: 'Chỉ nút tròn mở trợ lý — không robot, như bản gốc' },
    { id: 'svgAnim', name: 'Trợ lý động', desc: 'Robot Bé Bi 3D dễ thương, chuyển động mượt — nhẹ, không cần tải model' },
    { id: 'three', name: 'Trợ lý 3D', desc: 'Robot Pé Q 3D — tải riêng khi chọn, sinh động nhất' },
]

/** id mặc định khi chưa/không lấy được cấu hình từ API. */
export const DEFAULT_ROBOT_RENDERER: RobotRendererId = 'svg'

/** Có phải một id hình hài hợp lệ không. */
export function isRobotRendererId(value: unknown): value is RobotRendererId {
    return value === 'svg' || value === 'svgAnim' || value === 'three'
}

/**
 * Giao diện chung cho mọi hình hài robot (SVG / ThreeJS). Đây đúng là bề mặt mà
 * content script đang gọi vào RobotMascot, tách thành interface để hoán đổi được
 * hình hài mà không sửa nơi dùng (OCP + DIP).
 */
export interface RobotRenderer {
    /**
     * Hình hài này CÓ tự làm "launcher" thay nút nổi mặc định của panel không.
     * - true / bỏ trống: robot chính là nút mở panel → content ẩn nút nổi mặc định
     *   (`useExternalLauncher`). Đây là hành vi của mọi hình hài robot.
     * - false: hình hài KHÔNG có nút riêng (ví dụ "Bi" = nút tròn thường) → giữ
     *   nguyên nút nổi 🤖 mặc định của panel làm launcher, y như khi chưa có robot.
     */
    readonly providesLauncher?: boolean
    /** Đăng ký hành động khi người dùng bấm vào robot (mở panel trợ lý). */
    onActivate(cb: () => void): void
    /** Mở khung chat → robot vui vẻ, đứng chờ lệnh. */
    notifyChatOpened(): void
    /** Đóng khung chat → về idle. */
    notifyChatClosed(): void
    /** Người dùng đang gõ câu hỏi → nghiêng đầu nhìn ô nhập. */
    notifyTyping(): void
    /** AI/hệ thống đang xử lý → suy nghĩ. */
    notifyThinking(active: boolean): void
    /** Có kết quả kiểm tra → phản ứng cảm xúc. */
    notifyResult(result: RobotResult): void
    /** Dọn dẹp khi gỡ robot. */
    destroy(): void
}
