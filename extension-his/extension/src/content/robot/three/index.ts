import { ThreeRobotScene, SceneState } from './ThreeRobotScene'
import { CuteRobotScene } from './CuteRobotScene'
import { ROBOT3D_CMD, ROBOT3D_ACTIVATE, ROBOT3D_READY, ROBOT3D_FAILED, Robot3DCommand } from './Robot3DProtocol'

/**
 * Điểm vào của robot 3D chạy ở PAGE world (task-003 Part 2 + task-004). Được content
 * script chèn dưới dạng <script type="module"> (web_accessible_resource) khi web-admin
 * chọn "Bi 3D". Dựng scene ThreeJS bằng model có xương `RobotExpressive.glb`, bắc cầu
 * lệnh/biểu cảm qua CustomEvent trên `document`.
 *
 * Model `.glb` nằm CÙNG thư mục với file này (dist/robot3d/) và cũng là
 * web_accessible_resource, nên lấy URL qua `import.meta.url` — KHÔNG cần content script
 * (isolated world) truyền `chrome.runtime.getURL` sang.
 */
function boot(): void {
    // Tránh dựng trùng nếu bị chèn hai lần.
    if ((window as unknown as { __hisRobot3d?: boolean }).__hisRobot3d) return
    ;(window as unknown as { __hisRobot3d?: boolean }).__hisRobot3d = true
    // Dấu vết để chẩn đoán: nếu KHÔNG thấy log này trong console (page world) nghĩa là
    // module 3D chưa chạy (CSP chặn / chưa tải) → content sẽ tự rơi về robot SVG sau 4s.
    console.log('[Robot3D] Module page-world đã khởi động')

    // URL của chính file này: chrome-extension://<id>/robot3d/index.js → thay tên file
    // để ra URL model cùng thư mục. KHÔNG dùng `new URL(literal, import.meta.url)` để
    // Vite không cố resolve model như asset lúc build (model nằm ở public/, không ở src).
    // Khi chạy qua vite dev (trang preview) selfUrl trỏ vào /src/... → asset nằm ở
    // public/robot3d/ được vite phục vụ tại /robot3d/.
    const selfUrl = import.meta.url
    const dir = selfUrl.includes('/src/content/robot/three/')
        ? new URL('/robot3d/', selfUrl).href
        : selfUrl.slice(0, selfUrl.lastIndexOf('/') + 1)
    const modelUrl = dir + 'RobotExpressive.glb'
    const logoUrl = dir + 'vnpt-logo.png' // logo VNPT trên ngực (cùng thư mục web_accessible)

    const activate = (): void => void document.dispatchEvent(new CustomEvent(ROBOT3D_ACTIVATE))
    const ready = (): void => void document.dispatchEvent(new CustomEvent(ROBOT3D_READY))
    const failed = (err: unknown): void => {
        console.warn('[Robot3D] Không dựng được robot 3D, quay về SVG', err)
        document.dispatchEvent(new CustomEvent(ROBOT3D_FAILED))
        ;(window as unknown as { __hisRobot3d?: boolean }).__hisRobot3d = false
    }

    // Hình hài chọn qua query của chính script này (?variant=cute):
    // - 'cute'   → "Bé Bi" dựng thuần khối (option "Trợ lý động") — nhẹ, không model.
    // - mặc định → robot model RobotExpressive.glb (option "Trợ lý 3D").
    // Fallback global __HIS_ROBOT_VARIANT: cho trang preview chạy qua vite dev
    // (dev server có thể can thiệp query của module TS).
    const variant =
        new URL(selfUrl).searchParams.get('variant') ??
        (window as unknown as { __HIS_ROBOT_VARIANT?: string }).__HIS_ROBOT_VARIANT ??
        null
    const scene =
        variant === 'cute'
            ? new CuteRobotScene(activate, ready, failed)
            : new ThreeRobotScene(modelUrl, activate, ready, failed, { logoUrl })

    const onCmd = (event: Event): void => {
        const cmd = (event as CustomEvent<Robot3DCommand>).detail
        if (!cmd) return
        switch (cmd.type) {
            case 'chatOpened':
                scene.setState('listening')
                break
            case 'chatClosed':
                scene.setState('idle')
                break
            case 'typing':
                scene.setState('typing')
                break
            case 'thinking':
                // Cấu hình chế độ chờ ngẫu nhiên TRƯỚC khi vào trạng thái để scene diễn đúng.
                scene.setWaitRandom(cmd.random)
                scene.setState(cmd.active ? 'thinking' : 'listening')
                break
            case 'result':
                scene.setState(mapResult(cmd.result))
                break
            case 'enabled':
                scene.setEnabled(cmd.value)
                break
            case 'life':
                scene.setLife(cmd.aging, cmd.season) // hoá già + đổi mùa lúc chờ AI lâu
                break
            case 'appearance':
                // Diện mạo từ web-admin: tô màu thương hiệu, đổi cỡ, hiện/ẩn/thay logo.
                scene.setAppearance({
                    color: cmd.color,
                    scale: cmd.scale,
                    showLogo: cmd.showLogo,
                    logoDataUrl: cmd.logoDataUrl,
                })
                break
            case 'destroy':
                document.removeEventListener(ROBOT3D_CMD, onCmd)
                scene.dispose()
                ;(window as unknown as { __hisRobot3d?: boolean }).__hisRobot3d = false
                break
        }
    }

    document.addEventListener(ROBOT3D_CMD, onCmd)
}

/** Ánh xạ kết quả kiểm tra → biểu cảm scene (giống RobotMascot.notifyResult). */
function mapResult(result: string): SceneState {
    switch (result) {
        case 'allValid':
            return 'celebrate'
        case 'warning':
            return 'confused'
        case 'localError':
            return 'pointError' // lỗi tự sửa được: robot "chỉ" ra lỗi (khác aiError)
        case 'aiError':
            return 'sad'
        case 'success':
        default:
            return 'happy'
    }
}

boot()
