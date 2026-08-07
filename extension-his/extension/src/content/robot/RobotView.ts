import { buildRobotSvg } from './RobotSvg'
import { RobotConfig } from './RobotConfig'

/** Ba bộ mắt có sẵn trong SVG. */
export type EyeMode = 'open' | 'happy' | 'closed'

/**
 * Lớp "khung nhìn" của robot: dựng SVG vào container và cung cấp các setter
 * CẤP THẤP (đặt con ngươi, nghiêng đầu, đổi miệng...). KHÔNG chứa logic
 * animation hay quyết định trạng thái (SRP) — AnimationController/EmotionEngine
 * mới là nơi phối hợp các setter này.
 */
export class RobotView {
    readonly svg: SVGSVGElement
    readonly float: SVGGElement
    readonly head: SVGGElement
    readonly pupils: SVGGElement
    readonly armLeft: SVGGElement
    readonly armRight: SVGGElement
    readonly mouth: SVGPathElement
    readonly antennaTip: SVGCircleElement

    private readonly eyeSets: Record<EyeMode, SVGGElement>
    private readonly cheeks: SVGGElement
    private readonly sweat: SVGPathElement
    private readonly zzz: SVGGElement
    private readonly thumb: SVGRectElement

    constructor(container: HTMLElement) {
        container.innerHTML = buildRobotSvg()
        const q = <T extends Element>(id: string): T => {
            const el = container.querySelector<T>(`#${id}`)
            if (!el) throw new Error(`[RobotView] Thiếu phần tử SVG #${id}`)
            return el
        }
        this.svg = container.querySelector('svg') as unknown as SVGSVGElement
        this.float = q('robot-float')
        this.head = q('robot-head')
        this.pupils = q('robot-pupils')
        this.armLeft = q('robot-arm-l')
        this.armRight = q('robot-arm-r')
        this.mouth = q('robot-mouth')
        this.antennaTip = q('robot-antenna-tip')
        this.eyeSets = {
            open: q('robot-eyes-open'),
            happy: q('robot-eyes-happy'),
            closed: q('robot-eyes-closed'),
        }
        this.cheeks = q('robot-cheeks')
        this.sweat = q('robot-sweat')
        this.zzz = q('robot-zzz')
        this.thumb = q('robot-thumb')
    }

    /** Dịch con ngươi theo hướng nhìn (đơn vị px trong hệ toạ độ SVG). */
    setPupilOffset(dx: number, dy: number): void {
        const m = RobotConfig.mouse.pupilMaxShift
        const cx = Math.max(-m, Math.min(m, dx))
        const cy = Math.max(-m, Math.min(m, dy))
        this.pupils.style.transform = `translate(${cx}px, ${cy}px)`
    }

    /** Nghiêng/ngửa đầu (độ). Dương = nghiêng phải. */
    setHeadTilt(deg: number): void {
        this.head.style.transform = `rotate(${deg}deg)`
    }

    /** Chọn bộ mắt hiển thị (mở/vui/nhắm). */
    setEyeMode(mode: EyeMode): void {
        ;(Object.keys(this.eyeSets) as EyeMode[]).forEach((key) => {
            this.eyeSets[key].style.opacity = key === mode ? '1' : '0'
        })
    }

    /** Đổi hình miệng bằng thuộc tính path d. */
    setMouthPath(d: string): void {
        this.mouth.setAttribute('d', d)
    }

    setCheeksVisible(visible: boolean): void {
        this.cheeks.style.opacity = visible ? '1' : '0'
    }

    setSweatVisible(visible: boolean): void {
        this.sweat.style.opacity = visible ? '1' : '0'
    }

    setZzzVisible(visible: boolean): void {
        this.zzz.style.opacity = visible ? '1' : '0'
    }

    setThumbVisible(visible: boolean): void {
        this.thumb.style.opacity = visible ? '1' : '0'
    }

    /** CSS đặt gốc biến đổi cho từng bộ phận — inject vào shadow root cùng robot. */
    static partOriginCss(): string {
        return `
            #robot-head { transform-box: fill-box; transform-origin: 50% 92%; }
            #robot-pupils { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-eyes-open { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-arm-l { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-arm-r { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-float { transform-box: fill-box; transform-origin: 50% 100%; }
            #robot-antenna-tip { transform-box: fill-box; transform-origin: 50% 50%; }
        `
    }

    /** Bộ mắt "mở" — dùng cho hiệu ứng chớp mắt (scaleY). */
    get openEyes(): SVGGElement {
        return this.eyeSets.open
    }

    /** Nhóm chữ "Zzz" — dùng cho animation bồng bềnh khi ngủ. */
    get zzzGroup(): SVGGElement {
        return this.zzz
    }
}
