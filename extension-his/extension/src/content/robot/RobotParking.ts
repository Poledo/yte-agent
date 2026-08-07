import { RobotConfig } from './RobotConfig'
import type { PageObstacle, ViewportBox } from './ObstacleWatcher'

/** Kiểu chỗ đậu robot chọn khi gặp vật cản. */
export type ParkingMode =
    /** Chỗ đậu mặc định (góc phải dưới) — đường thông thoáng. */
    | 'home'
    /** Nhảy lên ĐỨNG trên mặt nút. */
    | 'stand'
    /** Nép sang bên trái nút. */
    | 'dodge'
    /** Không đứng lên cũng không nép được → nhấc hẳn lên phía trên vật cản. */
    | 'lift'

/** Một chỗ đậu cụ thể, tính bằng khoảng cách tới mép phải/đáy khung nhìn. */
export interface ParkingSpot {
    mode: ParkingMode
    right: number
    bottom: number
}

/** Chỗ đậu mặc định và kích thước khung của một robot (mỗi hình hài một cỡ). */
export interface ParkingLayout {
    readonly home: { right: number; bottom: number }
    readonly size: { width: number; height: number }
}

/**
 * Quyết định robot nên đứng ở đâu khi có nút của trang chiếm chỗ đậu, rồi đặt robot
 * vào đó.
 *
 * Chỉ lo VỊ TRÍ (đặt `right`/`bottom` của host), không lo diễn hoạt — phần nhảy/té do
 * PhysicsController lo, phần rình vật cản do ObstacleWatcher lo (mỗi lớp một việc).
 *
 * Vì sao đổi `right`/`bottom` chứ không đổi `transform`: các trạng thái của robot
 * (ngồi thấp, té, bay) đã dùng `transform` rồi và hay đặt lại về rỗng — đặt chỗ đậu
 * bằng thuộc tính khác thì hai bên không giẫm chân nhau.
 */
export class RobotParking {
    private spot: ParkingSpot
    /** Khoảng TRỐNG dưới bàn chân bên trong khung robot (px) — xem `setFootInset`. */
    private footInset = 0

    constructor(
        private readonly host: HTMLElement,
        private readonly layout: ParkingLayout,
    ) {
        this.spot = { mode: 'home', right: layout.home.right, bottom: layout.home.bottom }
    }

    /** Chỗ robot đang đứng. */
    get current(): ParkingSpot {
        return this.spot
    }

    /**
     * Khung robot rộng hơn thân robot (chừa chỗ quơ tay, nhảy) nên mép dưới khung không
     * phải bàn chân. Báo khoảng trống đó vào đây thì robot mới đứng ĐÚNG mặt nút chứ không
     * lơ lửng phía trên. Robot 3D đo được sau khi tải xong model nên đặt sau, không phải
     * lúc dựng.
     */
    setFootInset(px: number): void {
        this.footInset = Math.max(0, Math.round(px))
    }

    /**
     * Ô THÂN robot khi đậu mặc định — dùng để dò vật cản, không đổi theo chỗ đang đứng.
     * Đã trừ phần trống dưới chân: nút lọt hẳn trong khoảng trống đó thì robot có che đâu
     * mà phải tránh.
     */
    homeBox(): ViewportBox {
        const { home, size } = this.layout
        const height = Math.max(1, size.height - this.footInset)
        return {
            left: window.innerWidth - home.right - size.width,
            top: window.innerHeight - home.bottom - size.height,
            width: size.width,
            height,
        }
    }

    /** Chọn chỗ đậu hợp lý nhất với vật cản đang có (null = đường đã thông). */
    plan(obstacle: PageObstacle | null): ParkingSpot {
        const { home, size } = this.layout
        if (!obstacle) return { mode: 'home', right: home.right, bottom: home.bottom }

        const cfg = RobotConfig.obstacle
        // Đứng trên nút: BÀN CHÂN đặt đúng mép trên của nút → robot KHÔNG còn che nút nữa.
        const standBottom = Math.round(window.innerHeight - obstacle.top - this.footInset)
        const rise = standBottom - home.bottom
        const box = this.homeBox()
        const footOnButton = Math.min(obstacle.left + obstacle.width, box.left + box.width) - Math.max(obstacle.left, box.left)
        const standable =
            rise >= cfg.minStandRise && // thấp hơn cả chỗ đang đậu thì trèo làm gì
            rise <= cfg.maxStandRise &&
            obstacle.height >= cfg.minStandThickness &&
            footOnButton >= size.width * cfg.minFootShare &&
            standBottom + size.height <= window.innerHeight - cfg.edgeGap
        if (standable) return { mode: 'stand', right: home.right, bottom: standBottom }

        // Không trèo được thì nép sang trái nút, miễn là còn nằm trong màn hình.
        const dodgeRight = Math.round(window.innerWidth - obstacle.left + cfg.dodgeGap)
        if (dodgeRight + size.width <= window.innerWidth - cfg.edgeGap) {
            return { mode: 'dodge', right: dodgeRight, bottom: home.bottom }
        }

        // Nút quá to/quá rộng (thanh công cụ kín đáy) → nhấc robot lên trên nó.
        const ceiling = window.innerHeight - size.height - cfg.edgeGap
        return { mode: 'lift', right: home.right, bottom: Math.max(home.bottom, Math.min(standBottom, ceiling)) }
    }

    /** Đặt robot vào chỗ đã chọn. */
    apply(spot: ParkingSpot): void {
        this.spot = spot
        this.host.style.right = `${spot.right}px`
        this.host.style.bottom = `${spot.bottom}px`
    }
}
