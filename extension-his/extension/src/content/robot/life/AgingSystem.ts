import { RobotLifeConfig, AgingStageDef } from './RobotLifeConfig'
import { StageTimeline } from './StageTimeline'

/**
 * Aging System (task-002 §7): chờ AI càng lâu robot càng "già" (bụi → rỉ sét → đầu
 * bạc → ông lão). Chỉ là hiệu ứng hình, KHÔNG ảnh hưởng dữ liệu. Khi có kết quả thì
 * đảo ngược toàn bộ (task-002 §8) — lớp view chỉ cần gỡ theo `stage.id`.
 */
export class AgingSystem {
    private readonly timeline: StageTimeline<AgingStageDef>

    constructor(aging: readonly AgingStageDef[] = RobotLifeConfig.aging) {
        this.timeline = new StageTimeline<AgingStageDef>(aging)
    }

    stageAt(elapsedMs: number): AgingStageDef | null {
        return this.timeline.at(elapsedMs)
    }

    stageCrossed(prevMs: number, elapsedMs: number): AgingStageDef | null {
        return this.timeline.crossed(prevMs, elapsedMs)
    }
}
