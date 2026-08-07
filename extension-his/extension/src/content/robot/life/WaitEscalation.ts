import { RobotLifeConfig, WaitStageDef } from './RobotLifeConfig'
import { StageTimeline } from './StageTimeline'
import { RandomStageSequencer } from './RandomStageSequencer'
import { RandomEventGenerator } from './RandomEventGenerator'

/** Tuỳ chọn cho leo thang chờ AI. */
export interface WaitEscalationOptions {
    /** Bật chế độ NGẪU NHIÊN: đổi hoạt động ngẫu nhiên theo thời gian ngẫu nhiên. */
    random?: boolean
    /** Nguồn ngẫu nhiên (tách rời để test tất định). */
    rng?: RandomEventGenerator
}

/**
 * Leo thang khi chờ AI lâu (task-002 §5): 0-3s suy nghĩ → 3-10s ngồi → ... → 30ph già.
 * Chỉ QUYẾT ĐỊNH stage theo thời gian; việc diễn hoạt tra theo `stage.id` ở lớp view.
 *
 * Hai chiến lược hoán đổi được (cùng bề mặt `at`/`crossed`):
 *  - Mặc định: StageTimeline theo mốc cố định (leo thang tuyến tính).
 *  - `random`: RandomStageSequencer bốc stage ngẫu nhiên theo khoảng thời gian ngẫu nhiên.
 */
export class WaitEscalation {
    private readonly timeline: StageTimeline<WaitStageDef>
    private readonly sequencer: RandomStageSequencer<WaitStageDef> | null

    constructor(stages: readonly WaitStageDef[] = RobotLifeConfig.waitEscalation, options?: WaitEscalationOptions) {
        this.timeline = new StageTimeline<WaitStageDef>(stages)
        this.sequencer = options?.random
            ? new RandomStageSequencer<WaitStageDef>(
                  stages,
                  options.rng ?? new RandomEventGenerator(),
                  RobotLifeConfig.waitRandom.minMs,
                  RobotLifeConfig.waitRandom.maxMs,
                  RobotLifeConfig.waitRandom.avoidImmediateRepeat,
              )
            : null
    }

    /** Stage hiện hành theo số ms đã chờ. */
    stageAt(elapsedMs: number): WaitStageDef | null {
        return this.sequencer ? this.sequencer.at(elapsedMs) : this.timeline.at(elapsedMs)
    }

    /** Stage vừa bước sang (để bắn animation đúng một lần). */
    stageCrossed(prevMs: number, elapsedMs: number): WaitStageDef | null {
        return this.sequencer ? this.sequencer.crossed(prevMs, elapsedMs) : this.timeline.crossed(prevMs, elapsedMs)
    }

    /** Bắt đầu phiên chờ mới: chế độ ngẫu nhiên bốc lại chuỗi mới (timeline không cần). */
    reset(): void {
        this.sequencer?.reset()
    }
}
