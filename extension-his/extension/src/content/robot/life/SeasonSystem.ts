import { RobotLifeConfig, SeasonDef } from './RobotLifeConfig'
import { StageTimeline } from './StageTimeline'

/**
 * Season Effect System (task-002 §6): chờ AI càng lâu → chuyển mùa, mỗi mùa có hiệu
 * ứng môi trường riêng (hoa/bướm, nắng/ve, lá vàng/gió, tuyết/áo khoác).
 * Trả về danh sách `effects` (chuỗi id) để lớp view tự dựng particle tương ứng.
 */
export class SeasonSystem {
    private readonly timeline: StageTimeline<SeasonDef>

    constructor(seasons: readonly SeasonDef[] = RobotLifeConfig.seasons) {
        this.timeline = new StageTimeline<SeasonDef>(seasons)
    }

    seasonAt(elapsedMs: number): SeasonDef | null {
        return this.timeline.at(elapsedMs)
    }

    seasonCrossed(prevMs: number, elapsedMs: number): SeasonDef | null {
        return this.timeline.crossed(prevMs, elapsedMs)
    }
}
