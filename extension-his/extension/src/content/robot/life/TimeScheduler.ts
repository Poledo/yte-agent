import { RobotLifeConfig } from './RobotLifeConfig'
import { LifePhase } from './LifeTypes'

type ScheduleCfg = typeof RobotLifeConfig.schedule

/**
 * Time Scheduler (RDD Expansion v2 §1 - Living World).
 * Ánh xạ giờ thực của máy → pha sinh hoạt, có dao động nhẹ mỗi ngày để giờ ngủ
 * không cứng nhắc ("hôm nay 17:20, mai 18:10..."). Jitter TẤT ĐỊNH trong một ngày
 * (seed từ ngày) nên gọi nhiều lần cùng ngày ra cùng kết quả.
 */
export class TimeScheduler {
    constructor(private readonly cfg: ScheduleCfg = RobotLifeConfig.schedule) {}

    /** Pha sinh hoạt tại thời điểm `now`. */
    phaseAt(now: Date): LifePhase {
        const minutes = now.getHours() * 60 + now.getMinutes()
        const jitter = this.dailyJitter(now)
        const sleepStart = this.cfg.sleepStart + jitter

        // Ngủ trưa: [napStart, napEnd)
        if (minutes >= this.cfg.napStart && minutes < this.cfg.napEnd) return LifePhase.Napping

        // Ngủ tối: từ sleepStart (đã lệch) tới wakeUp hôm sau (bao qua nửa đêm).
        if (minutes >= sleepStart || minutes < this.cfg.wakeUp) return LifePhase.Sleeping

        return LifePhase.Working
    }

    /**
     * Dao động phút cho một ngày cụ thể, trong [-jitter, +jitter].
     * Seed = số thứ tự ngày (year*366+dayOfYear) băm nhẹ → ổn định cả ngày.
     */
    private dailyJitter(now: Date): number {
        const daySeed = now.getFullYear() * 366 + this.dayOfYear(now)
        // Băm số nguyên → [0,1)
        const x = Math.sin(daySeed * 12.9898) * 43758.5453
        const unit = x - Math.floor(x)
        const span = this.cfg.dailyJitterMinutes
        return Math.round((unit * 2 - 1) * span)
    }

    private dayOfYear(now: Date): number {
        const start = new Date(now.getFullYear(), 0, 0)
        const diff = now.getTime() - start.getTime()
        return Math.floor(diff / 86_400_000)
    }
}
