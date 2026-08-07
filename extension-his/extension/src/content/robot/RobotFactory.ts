import { ThreeRobotRenderer } from './three/ThreeRobotRenderer'
import { PlainButtonRenderer } from './PlainButtonRenderer'
import { RobotRenderer, RobotRendererId } from './RobotRenderer'
import type { LifeThresholdOverride } from './life'
import type { RobotAppearance } from './ExtensionConfig'

/**
 * Chọn & dựng hình hài robot theo cấu hình web-admin (task-003 Part 2). Đây là nơi
 * DUY NHẤT biết id → lớp trình diễn nào; nơi dùng chỉ cầm RobotRenderer (DIP + OCP).
 * `appearance` (màu/cỡ/logo) chỉ áp cho hình hài 3D; hình hài SVG bỏ qua.
 */
export function createRobotRenderer(
    id: RobotRendererId,
    thresholds?: LifeThresholdOverride,
    appearance?: RobotAppearance,
): RobotRenderer {
    switch (id) {
        case 'three':
            return new ThreeRobotRenderer(thresholds, appearance)
        case 'svgAnim':
            // "Trợ lý động" bản mới: robot "Bé Bi" three.js dựng thuần khối (không model,
            // tải nhanh), chuyển động nội suy mượt. Lỗi WebGL → tự rơi về robot SVG cũ.
            return new ThreeRobotRenderer(thresholds, appearance, 'cute')
        case 'svg':
        default:
            // "Bi": không robot — giữ nút nổi tròn mặc định của panel (như bản gốc).
            return new PlainButtonRenderer()
    }
}
