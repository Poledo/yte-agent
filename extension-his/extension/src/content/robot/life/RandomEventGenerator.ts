/** Nguồn ngẫu nhiên có thể bơm vào để test tất định. */
export type Rng = () => number

/** Phần tử có trọng số để chọn ngẫu nhiên. */
export interface Weighted {
    readonly id: string
    readonly weight: number
}

/**
 * Bộ sinh sự kiện ngẫu nhiên (Random Event Generator).
 * Chọn theo trọng số, tránh lặp lại ngay phần tử vừa chọn. RNG tách rời để test.
 */
export class RandomEventGenerator {
    constructor(private readonly rng: Rng = Math.random) {}

    /** Chọn 1 phần tử theo trọng số; `avoidId` để không lặp lại ngay. */
    pickWeighted<T extends Weighted>(items: readonly T[], avoidId?: string): T | null {
        const pool = avoidId && items.length > 1 ? items.filter((i) => i.id !== avoidId) : items
        const total = pool.reduce((s, i) => s + Math.max(0, i.weight), 0)
        if (pool.length === 0 || total <= 0) return null

        let r = this.rng() * total
        for (const item of pool) {
            r -= Math.max(0, item.weight)
            if (r <= 0) return item
        }
        return pool[pool.length - 1] // phòng sai số dấu phẩy động
    }

    /** Chọn 1 phần tử ĐỀU NHAU (uniform); `avoidId` để không lặp lại ngay. */
    pick<T extends { id: string }>(items: readonly T[], avoidId?: string): T | null {
        const pool = avoidId && items.length > 1 ? items.filter((i) => i.id !== avoidId) : items
        if (pool.length === 0) return null
        return pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))]
    }

    /** Số nguyên trong [min, max]. */
    intBetween(min: number, max: number): number {
        return Math.floor(min + this.rng() * (max - min + 1))
    }
}
