import { RandomEventGenerator } from './RandomEventGenerator'

/**
 * Sinh chuỗi stage NGẪU NHIÊN theo thời gian ngẫu nhiên — dùng cho chế độ "random"
 * của leo thang chờ AI (thay cho StageTimeline mốc-cố-định).
 *
 * Lịch được dựng DẦN và ỔN ĐỊNH trong một phiên: mốc đầu tại 0, mỗi mốc kế tiếp =
 * mốc trước + khoảng ngẫu nhiên trong [minMs, maxMs]; stage tại mỗi mốc bốc ngẫu nhiên
 * (tránh lặp lại ngay). Vì `elapsed` chỉ tăng, cùng một `elapsed` luôn cho cùng stage
 * → snapshot (`at`) và mốc-vừa-vượt (`crossed`) khớp nhau, không nhấp nháy.
 *
 * Cùng bề mặt với StageTimeline (`at`/`crossed`) nên WaitEscalation hoán đổi được hai
 * chiến lược mà nơi dùng không đổi (OCP/DIP). `reset()` để mỗi phiên chờ mới re-random.
 */
export class RandomStageSequencer<T extends { id: string }> {
    private readonly points: { atMs: number; stage: T }[] = []
    private coveredMs = 0

    constructor(
        private readonly stages: readonly T[],
        private readonly rng: RandomEventGenerator,
        private readonly minMs: number,
        private readonly maxMs: number,
        private readonly avoidRepeat: boolean,
    ) {}

    /** Stage đang hoạt động tại `elapsedMs` (mở rộng lịch nếu cần). */
    at(elapsedMs: number): T | null {
        this.ensureCovered(elapsedMs)
        let current: T | null = null
        for (const p of this.points) {
            if (elapsedMs >= p.atMs) current = p.stage
            else break
        }
        return current
    }

    /** Stage VỪA bước sang giữa `prevMs` và `elapsedMs` (để bắn hiệu ứng đúng một lần). */
    crossed(prevMs: number, elapsedMs: number): T | null {
        const before = this.at(prevMs)
        const after = this.at(elapsedMs)
        if (after && after.id !== before?.id) return after
        return null
    }

    /** Xoá lịch → phiên chờ kế tiếp bốc chuỗi ngẫu nhiên mới. */
    reset(): void {
        this.points.length = 0
        this.coveredMs = 0
    }

    /** Dựng lịch tới khi phủ quá `elapsedMs` (mốc đầu tại 0, sau đó cách ngẫu nhiên). */
    private ensureCovered(elapsedMs: number): void {
        if (this.stages.length === 0) return
        if (this.points.length === 0) {
            const first = this.rng.pick(this.stages)
            if (!first) return
            this.points.push({ atMs: 0, stage: first })
        }
        while (this.coveredMs <= elapsedMs) {
            const gap = Math.max(1, this.rng.intBetween(this.minMs, this.maxMs))
            this.coveredMs += gap
            const prevId = this.points[this.points.length - 1]?.stage.id
            const next = this.rng.pick(this.stages, this.avoidRepeat ? prevId : undefined)
            if (!next) break
            this.points.push({ atMs: this.coveredMs, stage: next })
        }
    }
}
