/**
 * Giao thức cầu nối giữa content script (isolated world) và module ThreeJS chạy ở
 * PAGE world (task-003 Part 2). Hai world có `window` riêng nhưng CHUNG DOM, nên ta
 * truyền tin bằng CustomEvent phát trên `document` (node DOM dùng chung) — cả hai
 * phía đều nghe được.
 *
 * Vì sao ThreeJS phải chạy ở page world & tải riêng? Gói ThreeJS nặng; nếu nhét vào
 * content script thì mọi trang HIS đều phải tải. Ta đóng gói robot 3D thành một
 * web_accessible_resource, chỉ chèn khi web-admin chọn "Bi 3D" → content script vẫn nhẹ.
 */

/** content → 3D: ra lệnh cho robot 3D phản ứng. */
export const ROBOT3D_CMD = 'his-robot3d:cmd'
/** 3D → content: người dùng bấm vào robot 3D (mở panel trợ lý). */
export const ROBOT3D_ACTIVATE = 'his-robot3d:activate'
/** 3D → content: scene đã dựng xong (để content biết không cần fallback). */
export const ROBOT3D_READY = 'his-robot3d:ready'
/** 3D → content: dựng scene/tải model thất bại → content quay về SVG ngay. */
export const ROBOT3D_FAILED = 'his-robot3d:failed'

/** Các lệnh điều khiển robot 3D — ánh xạ 1-1 với API RobotRenderer + công tắc bật/tắt. */
export type Robot3DCommand =
    | { readonly type: 'chatOpened' }
    | { readonly type: 'chatClosed' }
    | { readonly type: 'typing' }
    // `random`: bật chế độ NGẪU NHIÊN lúc chờ AI (cờ waitEscalationRandom từ web-admin).
    // Đi kèm ngay trong lệnh vì nó quyết định CÁCH robot 3D diễn trạng thái "đang xử lý".
    | { readonly type: 'thinking'; readonly active: boolean; readonly random: boolean }
    | { readonly type: 'result'; readonly result: string }
    | { readonly type: 'enabled'; readonly value: boolean }
    // Chờ AI CỰC LÂU: robot HOÁ GIÀ + đổi MÙA (task-002 §6/§7). Content chạy đồng hồ chờ
    // (tái dùng LifeDirector), gửi id giai đoạn hoá-già + mùa hiện tại; null = trở về bình
    // thường (hết chờ). Page world tô màu vật liệu 3D theo giai đoạn (thay cho CSS filter).
    | { readonly type: 'life'; readonly aging: string | null; readonly season: string | null }
    // Diện mạo robot 3D chỉnh từ web-admin: màu thương hiệu (hex hoặc null), cỡ (%),
    // hiện/ẩn logo, logo tuỳ chỉnh (data URL hoặc null). Gửi khi scene sẵn sàng.
    | {
          readonly type: 'appearance'
          readonly color: string | null
          readonly scale: number
          readonly showLogo: boolean
          readonly logoDataUrl: string | null
      }
    | { readonly type: 'destroy' }
