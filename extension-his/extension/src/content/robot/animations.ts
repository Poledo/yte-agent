import { RobotView } from './RobotView'

/** Kiểu tuỳ chọn tối giản cho keyframe (transform/opacity). */
type Keyframe = Record<string, string | number>

/** Một mục trong thư viện animation. */
export interface AnimationSpec {
    /** Có lặp vô hạn không (idle/thinking/sleep). */
    loop?: boolean
    /** Dựng danh sách Animation trên các bộ phận của view. */
    build(view: RobotView): Animation[]
}

const EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

function run(el: Element, frames: Keyframe[], duration: number, opts: KeyframeAnimationOptions = {}): Animation {
    return el.animate(frames as Keyframe[], {
        duration,
        easing: 'ease-in-out',
        fill: 'none',
        ...opts,
    })
}

/**
 * Thư viện animation của robot (RDD §9). Mỗi animation chỉ tác động transform/
 * opacity để nhẹ (task §14). Các gesture điều khiển đầu/con-ngươi chỉ chạy khi
 * MouseTracker đã tạm dừng (State không phải Idle/Watching/Hover).
 */
export const ANIMATIONS: Record<string, AnimationSpec> = {
    breathe: {
        loop: true,
        build: (v) => [
            run(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], 3200, {
                iterations: Infinity,
            }),
        ],
    },

    blink: {
        build: (v) => [run(v.openEyes, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)' }, { transform: 'scaleY(1)' }], 170)],
    },

    lookAround: {
        build: (v) => [
            run(
                v.pupils,
                [
                    { transform: 'translate(0,0)' },
                    { transform: 'translate(-3px,0)' },
                    { transform: 'translate(-3px,0)' },
                    { transform: 'translate(3px,0)' },
                    { transform: 'translate(3px,0)' },
                    { transform: 'translate(0,0)' },
                ],
                2200,
            ),
        ],
    },

    scratchHead: {
        build: (v) => [
            run(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-120deg)' }, { transform: 'rotate(-110deg)' }, { transform: 'rotate(-120deg)' }, { transform: 'rotate(0deg)' }], 1400),
            run(v.head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }], 1400),
        ],
    },

    yawn: {
        build: (v) => [
            run(v.head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(0deg) translateY(-1px)' }, { transform: 'rotate(0deg)' }], 1600),
            run(v.float, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.03,0.98)' }, { transform: 'scale(1,1)' }], 1600),
        ],
    },

    wave: {
        build: (v) => [
            run(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(0deg)' }], 1100, { easing: EASE }),
        ],
    },

    nod: {
        build: (v) => [run(v.head, [{ transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(0deg) translateY(3px)' }, { transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(0deg) translateY(3px)' }, { transform: 'rotate(0deg) translateY(0)' }], 900)],
    },

    think: {
        loop: true,
        build: (v) => [
            run(v.head, [{ transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-4deg)' }], 2400, { iterations: Infinity }),
            run(v.armRight, [{ transform: 'rotate(-118deg)' }, { transform: 'rotate(-124deg)' }, { transform: 'rotate(-118deg)' }], 2400, { iterations: Infinity }),
            run(v.antennaTip, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 1200, { iterations: Infinity }),
        ],
    },

    tiltCurious: {
        build: (v) => [run(v.head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(12deg)' }], 400, { fill: 'forwards' })],
    },

    thumbsUp: {
        build: (v) => {
            v.setThumbVisible(true)
            return [
                run(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(-10deg)' }], 600, { fill: 'forwards', easing: EASE }),
                run(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], 600),
            ]
        },
    },

    celebrate: {
        build: (v) => [
            run(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }], 1200, { easing: EASE }),
            run(v.armLeft, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(38deg)' }, { transform: 'rotate(0deg)' }, { transform: 'rotate(38deg)' }, { transform: 'rotate(0deg)' }], 1200),
            run(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-38deg)' }, { transform: 'rotate(0deg)' }, { transform: 'rotate(-38deg)' }, { transform: 'rotate(0deg)' }], 1200),
        ],
    },

    sad: {
        build: (v) => [
            run(v.head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(0deg) translateY(3px)' }], 500, { fill: 'forwards' }),
            run(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }], 500, { fill: 'forwards' }),
        ],
    },

    pointError: {
        build: (v) => [
            run(v.armRight, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(52deg)' }, { transform: 'rotate(44deg)' }, { transform: 'rotate(52deg)' }, { transform: 'rotate(44deg)' }], 1400, { fill: 'forwards' }),
        ],
    },

    dizzy: {
        build: (v) => [
            run(v.head, [{ transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0deg)' }], 900),
        ],
    },

    wake: {
        build: (v) => [
            run(v.head, [{ transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0deg)' }], 700),
            run(v.openEyes, [{ transform: 'scaleY(0.1)' }, { transform: 'scaleY(1)' }], 500),
        ],
    },

    sleepBob: {
        loop: true,
        build: (v) => {
            v.setZzzVisible(true)
            return [
                run(v.float, [{ transform: 'translateY(0)' }, { transform: 'translateY(-1.5px)' }, { transform: 'translateY(0)' }], 4200, { iterations: Infinity }),
                run(v.zzzGroup, [{ opacity: 0.3, transform: 'translateY(0)' }, { opacity: 1, transform: 'translateY(-4px)' }, { opacity: 0.3, transform: 'translateY(0)' }], 4200, { iterations: Infinity }),
            ]
        },
    },
}

/** Tên các animation lặp — để AnimationController biết cái nào cần giữ chạy. */
export type AnimationName = keyof typeof ANIMATIONS
