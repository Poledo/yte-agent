/**
 * Id của những phần tử "host" mà chính extension chèn vào trang HIS.
 *
 * Gom về một chỗ vì có hai phía cùng cần biết:
 *  - phía DỰNG host (robot, panel trợ lý, tour hướng dẫn) đặt id;
 *  - phía DÒ TRANG (ObstacleWatcher) phải bỏ qua chúng — giao diện của chính mình
 *    không bao giờ được coi là vật cản của trang.
 */
export const EXTENSION_HOST_IDS = {
    /** Robot mascot dạng SVG. */
    robotSvg: 'his-robot-host',
    /** Robot 3D (dựng ở page world). */
    robot3d: 'his-robot3d-host',
    /** Panel trợ lý hợp nhất (chat + cảnh báo). */
    assistantPanel: 'his-assistant-host',
    /** Lớp phủ hướng dẫn lần đầu. */
    onboardingTour: 'zc-onboarding-tour',
} as const

/** Danh sách id để lọc nhanh khi quét DOM. */
export const EXTENSION_HOST_ID_LIST: readonly string[] = Object.values(EXTENSION_HOST_IDS)

/** Bộ chọn CSS khớp mọi host của extension — dùng với `closest()` để bỏ qua cả cây con. */
export const EXTENSION_HOST_SELECTOR: string = EXTENSION_HOST_ID_LIST.map((id) => `#${id}`).join(', ')
