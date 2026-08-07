import type { RobotRenderer } from './RobotRenderer'
import type { RobotResult } from './RobotMascot'

/**
 * Hình hài "Nút thường" (id `svg`): KHÔNG có robot mascot — trả extension về đúng bản
 * gốc trước khi có robot: chỉ còn NÚT TRÒN 🤖 mặc định của panel làm launcher, không
 * animation, không nhân vật, không sống trong trang.
 *
 * Vì panel đã tự có nút nổi tròn (`.ua-toggle`) mở/đóng chính nó, hình hài này chỉ
 * cần KHÔNG chiếm quyền launcher và bỏ qua mọi tín hiệu cảm xúc:
 *  - `providesLauncher = false` → content KHÔNG gọi `useExternalLauncher()`, giữ nút
 *    mặc định của panel; đồng thời content đồng bộ ẩn/hiện nút theo công tắc robot
 *    trong popup (tắt robot → ẩn luôn nút trợ lý).
 *  - mọi `notify*` là no-op (không có nhân vật để phản ứng).
 *
 * Tuân thủ OCP/DIP: là một `RobotRenderer` như các hình hài khác, nơi dùng không đổi.
 */
export class PlainButtonRenderer implements RobotRenderer {
    readonly providesLauncher = false

    onActivate(_cb: () => void): void {
        // Panel tự xử lý mở/đóng qua nút nổi mặc định — không cần robot đứng giữa.
    }

    notifyChatOpened(): void {}
    notifyChatClosed(): void {}
    notifyTyping(): void {}
    notifyThinking(_active: boolean): void {}
    notifyResult(_result: RobotResult): void {}
    destroy(): void {}
}
