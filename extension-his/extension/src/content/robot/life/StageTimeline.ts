/** Một mốc trên trục thời gian trôi (elapsed): đạt `atMs` thì kích hoạt stage. */
export interface TimedStage {
    readonly atMs: number
    readonly id: string
}

/**
 * Trục thời gian theo mốc (dùng chung cho Wait Escalation, Season, Aging).
 * Gom logic "tìm stage cuối cùng có atMs ≤ elapsed" về một chỗ (tránh lặp code).
 * Danh sách được sắp tăng theo atMs khi khởi tạo nên tra cứu ổn định.
 */
export class StageTimeline<T extends TimedStage> {
    private readonly stages: T[]

    constructor(stages: readonly T[]) {
        this.stages = [...stages].sort((a, b) => a.atMs - b.atMs)
    }

    /** Stage hiện hành tại `elapsedMs` (null nếu chưa tới mốc đầu tiên). */
    at(elapsedMs: number): T | null {
        let current: T | null = null
        for (const s of this.stages) {
            if (elapsedMs >= s.atMs) current = s
            else break
        }
        return current
    }

    /** Có phải `elapsedMs` vừa vượt qua một mốc so với `prevMs`? (để bắn hiệu ứng 1 lần) */
    crossed(prevMs: number, elapsedMs: number): T | null {
        const before = this.at(prevMs)
        const after = this.at(elapsedMs)
        if (after && after.id !== before?.id) return after
        return null
    }

    all(): readonly T[] {
        return this.stages
    }
}
