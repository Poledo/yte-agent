import { RobotConfig } from './RobotConfig'

/**
 * Đặc tả một loại "hạt mùa" (cánh hoa / lá / bông tuyết…): glyph, cỡ, thời gian rơi,
 * độ đung đưa ngang và có xoay hay không. Chỉ dữ liệu — không chứa logic.
 */
interface SeasonParticleSpec {
    /** Vài glyph để mỗi hạt trông khác nhau chút. */
    readonly glyphs: string[]
    /** Khoảng cỡ chữ (px). */
    readonly size: [number, number]
    /** Khoảng thời gian rơi (ms). */
    readonly fallMs: [number, number]
    /** Biên độ đung đưa ngang (px). */
    readonly sway: number
    /** Có xoay khi rơi không (cánh hoa/lá xoay; tuyết/nắng thì không). */
    readonly spin: boolean
    /** Độ đục tối đa. */
    readonly opacity: number
    /** Số hạt bắn mỗi nhịp (ms/1 giây) — tuyết dày hơn cánh hoa. */
    readonly perTick: number
}

/**
 * Bảng ánh xạ id-hiệu-ứng-mùa (RobotLifeConfig.seasons[].effects) → cách vẽ hạt.
 * Thêm mùa/hiệu ứng mới = thêm một dòng ở đây, KHÔNG sửa logic (data-driven, đúng
 * tinh thần "mở rộng bằng dữ liệu" của hệ sinh hoạt).
 */
const SEASON_PARTICLES: Record<string, SeasonParticleSpec> = {
    petals: { glyphs: ['🌸', '🌷', '🌼'], size: [10, 14], fallMs: [2600, 4200], sway: 22, spin: true, opacity: 0.95, perTick: 2 },
    leaves: { glyphs: ['🍂', '🍁'], size: [12, 16], fallMs: [2400, 3800], sway: 28, spin: true, opacity: 0.95, perTick: 2 },
    snow: { glyphs: ['❄️', '❅', '·'], size: [8, 13], fallMs: [3000, 5200], sway: 16, spin: false, opacity: 0.9, perTick: 3 },
    sun: { glyphs: ['✨', '☀️'], size: [9, 13], fallMs: [2200, 3400], sway: 12, spin: false, opacity: 0.85, perTick: 1 },
}

/** Lớp gắn cho mọi hạt mùa để dọn sạch khi rời trạng thái chờ. */
const PARTICLE_CLASS = 'season-particle'

/** Có phải id hiệu ứng này vẽ được thành hạt rơi không? */
export function isSeasonParticle(effectId: string): boolean {
    return effectId in SEASON_PARTICLES
}

/** Số hạt nên bắn mỗi nhịp cho một hiệu ứng (0 nếu không phải hạt). */
export function seasonParticleRate(effectId: string): number {
    return SEASON_PARTICLES[effectId]?.perTick ?? 0
}

/**
 * Bắn một đợt "hạt mùa" vào container (shadow root của robot). Mỗi hạt rơi từ trên
 * xuống, đung đưa nhẹ rồi tự dọn — chỉ ở lớp view (task-003 §5), không đụng life/.
 */
export function spawnSeasonParticles(container: HTMLElement, effectId: string, count?: number): void {
    const spec = SEASON_PARTICLES[effectId]
    if (!spec) return
    const { width, height } = RobotConfig.size
    const n = count ?? spec.perTick
    for (let i = 0; i < n; i++) {
        const piece = document.createElement('span')
        piece.className = PARTICLE_CLASS
        piece.textContent = spec.glyphs[Math.floor(Math.random() * spec.glyphs.length)]
        const size = spec.size[0] + Math.random() * (spec.size[1] - spec.size[0])
        const startX = Math.random() * (width + 20) - 10
        piece.style.cssText = `position:absolute; left:${startX}px; top:-16px; font-size:${size}px;
            line-height:1; pointer-events:none; z-index:4; opacity:0; will-change:transform,opacity;`
        container.appendChild(piece)

        const sway = (Math.random() < 0.5 ? -1 : 1) * spec.sway
        const spin = spec.spin ? (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 240) : 0
        const dur = spec.fallMs[0] + Math.random() * (spec.fallMs[1] - spec.fallMs[0])
        const anim = piece.animate(
            [
                { transform: 'translate(0,0) rotate(0deg)', opacity: 0, offset: 0 },
                { transform: `translate(${sway * 0.5}px, ${height * 0.45}px) rotate(${spin * 0.5}deg)`, opacity: spec.opacity, offset: 0.5 },
                { transform: `translate(${sway}px, ${height + 20}px) rotate(${spin}deg)`, opacity: 0, offset: 1 },
            ],
            { duration: dur, easing: 'ease-in', fill: 'forwards' },
        )
        anim.finished.then(() => piece.remove()).catch(() => piece.remove())
    }
}

/** Dọn sạch mọi hạt mùa còn sót (khi có kết quả → ngừng chờ). */
export function clearSeasonParticles(container: HTMLElement): void {
    container.querySelectorAll(`.${PARTICLE_CLASS}`).forEach((p) => p.remove())
}
