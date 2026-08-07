import { RobotConfig } from './RobotConfig'
import { ObstacleWatcher, type PageObstacle } from './ObstacleWatcher'
import { RobotParking, type ParkingLayout, type ParkingSpot } from './RobotParking'

/**
 * Việc robot làm khi đổi chỗ — để hình hài nào cũng diễn được theo kiểu của mình.
 * `bump` (đụng nút → té) và `settled` (đứng yên chỗ mới) là hai mốc để đổi biểu cảm.
 */
export type AvoidanceReact = 'bump' | 'stand' | 'home' | 'settled'

/** Bên biết cách diễn hoạt toàn thân — robot SVG lẫn robot 3D đều dùng PhysicsController. */
export interface AvoidanceMover {
    /** Té ngã (đụng phải nút). */
    fall(): Promise<void>
    /** Nhảy từ chỗ cũ (lệch dx, dy so với chỗ mới) sang chỗ mới. */
    leapFrom(dx: number, dy: number): Promise<void>
}

export interface AvoidanceOptions extends ParkingLayout {
    readonly mover: AvoidanceMover
    /** Diễn biểu cảm kèm theo (không bắt buộc). */
    readonly onReact?: (react: AvoidanceReact) => void
}

/**
 * Robot tự né nút của trang (task: "màn hình có nút ở dưới trùng chỗ robot").
 *
 * Kịch bản: nút xuất hiện đúng chỗ đậu → robot đụng phải, TÉ một cái cho biết, đứng
 * dậy rồi NHẢY LÊN đứng trên mặt nút (hoặc nép sang bên nếu không trèo được). Nút biến
 * mất → nhảy trở xuống chỗ cũ. Nhờ vậy nút của người dùng không bao giờ bị che.
 *
 * Ghép ba việc rời nhau: ObstacleWatcher (rình), RobotParking (chọn chỗ),
 * AvoidanceMover (diễn hoạt) — lớp này chỉ điều phối thứ tự.
 */
export class ObstacleAvoidance {
    private readonly parking: RobotParking
    private readonly watcher: ObstacleWatcher
    private enabled = true
    private moving = false
    private queued: ParkingSpot | null = null
    /** Nút đã đụng rồi thì thôi té lần nữa (trang cuộn hay đổi bố cục vài pixel). */
    private bumpedId: string | null = null

    constructor(
        host: HTMLElement,
        private readonly options: AvoidanceOptions,
    ) {
        this.parking = new RobotParking(host, options)
        this.watcher = new ObstacleWatcher(
            () => this.parking.homeBox(),
            (obstacle) => this.onObstacle(obstacle),
        )
    }

    start(): void {
        this.watcher.start()
    }

    /** Khoảng trống dưới bàn chân trong khung robot (px) — đo xong model mới biết. */
    setFootInset(px: number): void {
        this.parking.setFootInset(px)
        this.watcher.refresh()
    }

    /**
     * Tắt khi robot đang bận việc riêng với cả thân mình (bay lên popup, đang tắt) —
     * lúc đó diễn hoạt né vật cản sẽ giẫm lên hiệu ứng đang chạy.
     */
    setEnabled(value: boolean): void {
        this.enabled = value
        if (value) this.watcher.refresh()
    }

    destroy(): void {
        this.watcher.stop()
    }

    private onObstacle(obstacle: PageObstacle | null): void {
        const spot = this.parking.plan(obstacle)
        // Chỉ té khi đang đậu ở chỗ mặc định mà bị một nút MỚI chắn — đang đứng trên nút này
        // rồi chuyển sang nép bên thì đi luôn, té nữa thành ra nhấp nhổm.
        const isNew = obstacle !== null && obstacle.id !== this.bumpedId
        this.bumpedId = obstacle?.id ?? null
        void this.moveTo(spot, isNew && spot.mode !== 'home' && this.parking.current.mode === 'home')
    }

    private async moveTo(spot: ParkingSpot, bumped: boolean): Promise<void> {
        const from = this.parking.current
        // Chỗ cũ lệch bao nhiêu so với chỗ mới (toạ độ màn hình).
        const dx = spot.right - from.right
        const dy = spot.bottom - from.bottom
        if (dx === 0 && dy === 0) return

        if (!this.enabled) {
            this.parking.apply(spot) // robot đang ẩn/bận: dời chỗ lặng lẽ
            return
        }
        if (this.moving) {
            this.queued = spot // đang nhảy dở: nhớ chỗ mới nhất, xong rồi đi tiếp
            return
        }

        this.moving = true
        try {
            const lively = !ObstacleAvoidance.reduceMotion()
            if (bumped && lively) {
                this.options.onReact?.('bump')
                await this.options.mover.fall()
            }
            this.parking.apply(spot)
            const tiny = Math.abs(dx) < RobotConfig.obstacle.smallStep && Math.abs(dy) < RobotConfig.obstacle.smallStep
            if (lively && !tiny) {
                this.options.onReact?.(spot.mode === 'home' ? 'home' : 'stand')
                await this.options.mover.leapFrom(dx, dy)
            }
            this.options.onReact?.('settled')
        } finally {
            this.moving = false
            const next = this.queued
            this.queued = null
            if (next) void this.moveTo(next, false)
        }
    }

    /** Người dùng chọn "giảm chuyển động" → đổi chỗ ngay, không nhảy nhót. */
    private static reduceMotion(): boolean {
        try {
            return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
        } catch {
            return false
        }
    }
}
