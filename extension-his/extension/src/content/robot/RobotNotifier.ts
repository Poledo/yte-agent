import { RobotResult } from './RobotMascot'

/**
 * Cổng thông báo tối giản để các view (ChatPanel...) điều khiển cảm xúc robot mà
 * KHÔNG phụ thuộc trực tiếp vào lớp RobotMascot (Dependency Inversion). RobotMascot
 * thoả interface này về mặt cấu trúc nên truyền thẳng vào được.
 */
export interface RobotNotifier {
    /** AI/hệ thống bắt đầu hoặc kết thúc xử lý → robot suy nghĩ / thôi suy nghĩ. */
    notifyThinking(active: boolean): void
    /** Có kết quả kiểm tra → robot phản ứng cảm xúc tương ứng. */
    notifyResult(result: RobotResult): void
    /** Người dùng đang gõ trong ô nhập → robot nghiêng đầu nhìn ô nhập. */
    notifyTyping(): void
}
