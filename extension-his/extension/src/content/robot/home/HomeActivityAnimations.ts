import { RobotView } from '../RobotView'

/**
 * Ánh xạ id HOẠT ĐỘNG → animation ở lớp trình diễn (task-002 §2 & §10).
 *
 * Đây là ĐIỂM MỞ RỘNG DUY NHẤT cần chạm khi thêm animation mới: thêm một builder
 * vào registry là robot biết "diễn" hoạt động đó. Phần quyết-định (life/) không đổi.
 * Mỗi builder chỉ tác động transform/opacity (nhẹ, task §14) và trả về danh sách
 * Animation LẶP để lớp gọi tự huỷ khi đổi hoạt động.
 */
export type ActivityAnimBuilder = (view: RobotView) => Animation[]

/** Chạy một animation lặp vô hạn trên một bộ phận SVG. */
function loop(el: Element, frames: Keyframe[], duration: number, easing = 'ease-in-out'): Animation {
    return el.animate(frames, { duration, easing, iterations: Infinity, fill: 'none' })
}

/** Uống (cà phê/trà) — nâng tay phải lên miệng theo nhịp, ngửa đầu nhấp. */
const drink: ActivityAnimBuilder = (v) => {
    v.setEyeMode('open')
    return [
        loop(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-92deg)' }, { transform: 'rotate(-92deg)' }, { transform: 'rotate(0deg)' }], 3400),
        loop(v.head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }], 3400),
    ]
}

/**
 * Bộ builder MẶC ĐỊNH — VÀI VÍ DỤ (task §scope "vài ví dụ"). Thêm hoạt động khác =
 * thêm một dòng ở đây, KHÔNG đụng engine hay life/. Id nào chưa có builder sẽ rơi về
 * `genericIdle` (thở nhẹ) — robot vẫn "sống", chỉ chưa có animation riêng.
 */
export const DEFAULT_ACTIVITY_ANIMATIONS: Record<string, ActivityAnimBuilder> = {
    // --- Nghỉ ngơi ---
    sleep: (v) => {
        v.setEyeMode('closed')
        v.setZzzVisible(true)
        return [
            loop(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-1.5px)' }, { transform: 'translateY(0)' }], 4200),
            loop(v.zzzGroup, [{ opacity: 0.3, transform: 'translateY(0)' }, { opacity: 1, transform: 'translateY(-4px)' }, { opacity: 0.3, transform: 'translateY(0)' }], 4200),
        ]
    },
    meditate: (v) => {
        v.setEyeMode('closed')
        return [
            loop(v.float, [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(-1px) scale(1.01,0.99)' }, { transform: 'translateY(0) scale(1,1)' }], 5200),
            loop(v.armLeft, [{ transform: 'rotate(26deg)' }, { transform: 'rotate(30deg)' }, { transform: 'rotate(26deg)' }], 5200),
            loop(v.armRight, [{ transform: 'rotate(-26deg)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(-26deg)' }], 5200),
        ]
    },

    // --- Sở thích ---
    readBook: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.head, [{ transform: 'rotate(0deg) translateY(1px)' }, { transform: 'rotate(2deg) translateY(2px)' }, { transform: 'rotate(0deg) translateY(1px)' }], 3600),
            loop(v.pupils, [{ transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,1px)' }, { transform: 'translate(-3px,1px)' }], 2600),
            loop(v.armLeft, [{ transform: 'rotate(34deg)' }, { transform: 'rotate(34deg)' }], 3600),
            loop(v.armRight, [{ transform: 'rotate(-34deg)' }, { transform: 'rotate(-34deg)' }], 3600),
        ]
    },
    drinkCoffee: drink,
    drinkTea: drink,
    listenMusic: (v) => {
        v.setEyeMode('happy')
        return [
            loop(v.head, [{ transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-7deg)' }], 1600),
            loop(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], 800),
            loop(v.armLeft, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(20deg)' }, { transform: 'rotate(0deg)' }], 800),
            loop(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(0deg)' }], 800),
        ]
    },
    playGame: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.pupils, [{ transform: 'translate(-3px,0)' }, { transform: 'translate(3px,-1px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(-3px,0)' }], 900),
            loop(v.head, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }], 1200),
            loop(v.armLeft, [{ transform: 'rotate(8deg)' }, { transform: 'rotate(16deg)' }, { transform: 'rotate(8deg)' }], 280),
            loop(v.armRight, [{ transform: 'rotate(-8deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(-8deg)' }], 320),
        ]
    },

    // --- Vệ sinh / việc nhà ---
    brushTeeth: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.armRight, [{ transform: 'rotate(-70deg)' }, { transform: 'rotate(-88deg)' }, { transform: 'rotate(-70deg)' }], 320),
            loop(v.head, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }], 640),
        ]
    },
    wateringPlant: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.float, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(2px) rotate(4deg)' }, { transform: 'translateY(2px) rotate(4deg)' }, { transform: 'translateY(0) rotate(0deg)' }], 3600),
            loop(v.armRight, [{ transform: 'rotate(-30deg)' }, { transform: 'rotate(-30deg)' }], 3600),
        ]
    },

    // --- Vận động ---
    gym: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(7px)' }, { transform: 'translateY(0)' }], 1100),
            loop(v.armLeft, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(140deg)' }, { transform: 'rotate(0deg)' }], 1100),
            loop(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-140deg)' }, { transform: 'rotate(0deg)' }], 1100),
        ]
    },
    pushUp: (v) => {
        v.setEyeMode('open')
        return [
            loop(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(6px)' }, { transform: 'translateY(0)' }], 900),
            loop(v.head, [{ transform: 'rotate(6deg)' }, { transform: 'rotate(6deg)' }], 900),
        ]
    },

    // --- Tự bảo trì ---
    chargeBattery: (v) => {
        v.setEyeMode('closed')
        return [
            loop(v.float, [{ transform: 'translateY(4px)' }, { transform: 'translateY(4px)' }], 2000),
            loop(v.antennaTip, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], 1400),
        ]
    },
    oiling: drink,
}

/** Hoạt động chưa có builder riêng — thở nhẹ để robot vẫn "sống". */
const genericIdle: ActivityAnimBuilder = (v) => {
    v.setEyeMode('open')
    return [loop(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], 3200)]
}

/**
 * Sổ đăng ký animation theo id hoạt động. Chỉ cần `register` thêm để mở rộng —
 * không lớp nào khác phải sửa (mirror của ActivityRegistry ở phía view).
 */
export class ActivityAnimator {
    private readonly builders = new Map<string, ActivityAnimBuilder>()

    constructor(private readonly fallback: ActivityAnimBuilder = genericIdle) {}

    register(id: string, builder: ActivityAnimBuilder): this {
        this.builders.set(id, builder)
        return this
    }

    registerAll(map: Record<string, ActivityAnimBuilder>): this {
        for (const [id, builder] of Object.entries(map)) this.builders.set(id, builder)
        return this
    }

    has(id: string): boolean {
        return this.builders.has(id)
    }

    /** Dựng animation cho hoạt động; không có builder riêng → fallback (thở nhẹ). */
    build(id: string, view: RobotView): Animation[] {
        return (this.builders.get(id) ?? this.fallback)(view)
    }
}

/** Tạo animator với đủ bộ ví dụ mặc định. */
export function createDefaultActivityAnimator(): ActivityAnimator {
    return new ActivityAnimator().registerAll(DEFAULT_ACTIVITY_ANIMATIONS)
}
