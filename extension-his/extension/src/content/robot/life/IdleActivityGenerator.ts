import { Activity, LifePhase } from './LifeTypes'
import { ActivityRegistry } from './ActivityRegistry'
import { RandomEventGenerator } from './RandomEventGenerator'
import { RobotLifeConfig } from './RobotLifeConfig'

/** Một lượt "robot đang làm gì": hoạt động + thời lượng đã bốc. */
export interface ActivityPick {
    readonly activity: Activity
    readonly durationMs: number
}

/**
 * Idle Activity Generator (task-002 §2): quyết định robot làm gì tiếp theo trong pha
 * hiện tại, có trọng số, không lặp lại ngay, và tự bốc thời lượng trong [min,max].
 * Không đụng DOM → tái dùng cho cả robot ở trang lẫn robot trong popup.
 */
export class IdleActivityGenerator {
    private lastId: string | undefined

    constructor(
        private readonly registry: ActivityRegistry,
        private readonly random: RandomEventGenerator,
    ) {}

    /** Bốc hoạt động kế tiếp cho pha `phase`; null nếu pha không có hoạt động nào. */
    next(phase: LifePhase): ActivityPick | null {
        const candidates = this.registry.candidates(phase)
        const avoid = RobotLifeConfig.activity.avoidImmediateRepeat ? this.lastId : undefined
        const activity = this.random.pickWeighted(candidates, avoid)
        if (!activity) return null

        this.lastId = activity.id
        const durationMs = this.random.intBetween(activity.minMs, activity.maxMs)
        return { activity, durationMs }
    }

    /** Quên hoạt động vừa làm (vd sau khi bị gián đoạn để về làm việc). */
    reset(): void {
        this.lastId = undefined
    }
}
