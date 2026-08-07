import { TimeScheduler } from './TimeScheduler'
import { ActivityRegistry } from './ActivityRegistry'
import { RandomEventGenerator } from './RandomEventGenerator'
import { IdleActivityGenerator, ActivityPick } from './IdleActivityGenerator'
import { WaitEscalation } from './WaitEscalation'
import { SeasonSystem } from './SeasonSystem'
import { AgingSystem } from './AgingSystem'
import { DEFAULT_ACTIVITIES } from './activities'
import { LifePhase } from './LifeTypes'
import { WaitStageDef, SeasonDef, AgingStageDef } from './RobotLifeConfig'

/** Ảnh chụp trạng thái "chờ AI lâu" tại một thời điểm. */
export interface WaitSnapshot {
    readonly stage: WaitStageDef | null
    readonly season: SeasonDef | null
    readonly aging: AgingStageDef | null
}

/**
 * Ngưỡng thời gian có thể bơm từ web-admin xuống (task-003 §1.6). Chỉ ghi đè mốc thời
 * gian của các stage đã có; id/label giữ nguyên để lớp view vẫn ánh xạ đúng hiệu ứng.
 */
export interface LifeThresholdOverride {
    readonly waitEscalation?: readonly WaitStageDef[]
    readonly seasons?: readonly SeasonDef[]
    readonly aging?: readonly AgingStageDef[]
    /** Bật chế độ NGẪU NHIÊN cho leo thang chờ AI (đổi hoạt động ngẫu nhiên theo thời gian). */
    readonly waitEscalationRandom?: boolean
}

/**
 * Life Director — BỘ NÃO tổng hợp của hệ sinh hoạt v2 (RDD Expansion).
 *
 * Gom mọi module quyết-định lại sau một mặt tiền thuần logic (không DOM):
 *  - TimeScheduler  → đang là pha nào trong ngày.
 *  - IdleActivityGenerator → làm hoạt động gì tiếp theo (dùng cho popup "ngôi nhà").
 *  - WaitEscalation / SeasonSystem / AgingSystem → diễn biến khi chờ AI lâu.
 *
 * Lớp trình diễn (robot ở trang / robot ở popup) chỉ việc hỏi Director rồi tra
 * animation theo id. Nhờ vậy thêm hoạt động/hiệu ứng = thêm dữ liệu, không sửa não.
 */
export class LifeDirector {
    private readonly scheduler: TimeScheduler
    private readonly idle: IdleActivityGenerator
    private readonly wait: WaitEscalation
    private readonly season: SeasonSystem
    private readonly aging: AgingSystem

    constructor(options?: {
        registry?: ActivityRegistry
        random?: RandomEventGenerator
        scheduler?: TimeScheduler
        /** Ngưỡng thời gian bơm từ web-admin (nếu có) — mặc định dùng RobotLifeConfig. */
        thresholds?: LifeThresholdOverride
    }) {
        const registry = options?.registry ?? new ActivityRegistry().registerAll(DEFAULT_ACTIVITIES)
        const random = options?.random ?? new RandomEventGenerator()
        this.scheduler = options?.scheduler ?? new TimeScheduler()
        this.idle = new IdleActivityGenerator(registry, random)
        this.wait = new WaitEscalation(options?.thresholds?.waitEscalation, {
            random: options?.thresholds?.waitEscalationRandom === true,
        })
        this.season = new SeasonSystem(options?.thresholds?.seasons)
        this.aging = new AgingSystem(options?.thresholds?.aging)
    }

    /** Pha sinh hoạt hiện tại theo giờ máy. */
    currentPhase(now: Date): LifePhase {
        return this.scheduler.phaseAt(now)
    }

    /** Hoạt động kế tiếp cho popup "ngôi nhà" (theo pha hiện tại). */
    nextActivity(now: Date): ActivityPick | null {
        return this.idle.next(this.scheduler.phaseAt(now))
    }

    /** Trạng thái chờ AI tại `elapsedMs` (leo thang + mùa + hoá già). */
    waitSnapshot(elapsedMs: number): WaitSnapshot {
        return {
            stage: this.wait.stageAt(elapsedMs),
            season: this.season.seasonAt(elapsedMs),
            aging: this.aging.stageAt(elapsedMs),
        }
    }

    /** Các mốc VỪA vượt qua giữa hai lần cập nhật (để bắn hiệu ứng đúng một lần). */
    waitCrossings(prevMs: number, elapsedMs: number): WaitSnapshot {
        return {
            stage: this.wait.stageCrossed(prevMs, elapsedMs),
            season: this.season.seasonCrossed(prevMs, elapsedMs),
            aging: this.aging.stageCrossed(prevMs, elapsedMs),
        }
    }

    /** Quên hoạt động vừa làm (khi bị gọi về làm việc). */
    resetActivity(): void {
        this.idle.reset()
    }

    /** Bắt đầu phiên chờ AI mới — chế độ ngẫu nhiên bốc lại chuỗi hoạt động mới. */
    resetWait(): void {
        this.wait.reset()
    }
}
