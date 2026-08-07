import { RobotView } from './RobotView'
import { ANIMATIONS, AnimationName } from './animations'

/**
 * Animation Controller (RDD §2): phát và HỦY animation cho robot.
 *
 * Phân hai lớp:
 *  - "base": một animation nền lặp vô hạn (breathe / think / sleepBob) gắn với
 *    trạng thái hiện tại.
 *  - "gesture": animation một lần (blink, wave, nod...). Gesture mới hủy gesture cũ.
 *
 * Khi StateMachine đổi state, nó gọi cancelAll() rồi set base + gesture mới →
 * "animation đang chạy phải bị hủy" đúng yêu cầu (task §11).
 */
export class AnimationController {
    private baseAnims: Animation[] = []
    private gestureAnims: Animation[] = []
    private reduceMotion = false

    constructor(private readonly view: RobotView) {}

    setReduceMotion(value: boolean): void {
        this.reduceMotion = value
        if (value) this.cancelAll()
    }

    /** Đặt animation nền lặp cho state hiện tại (hoặc null để dừng nền). */
    setBase(name: AnimationName | null): void {
        this.cancelList(this.baseAnims)
        this.baseAnims = []
        if (!name || this.reduceMotion) return
        this.baseAnims = ANIMATIONS[name].build(this.view)
    }

    /** Phát một gesture một lần; trả về Promise hoàn tất khi animation kết thúc. */
    playGesture(name: AnimationName): Promise<void> {
        this.cancelList(this.gestureAnims)
        this.gestureAnims = []
        if (this.reduceMotion) return Promise.resolve()

        const anims = ANIMATIONS[name].build(this.view)
        this.gestureAnims = anims
        if (anims.length === 0) return Promise.resolve()
        return Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined)
    }

    cancelGestures(): void {
        this.cancelList(this.gestureAnims)
        this.gestureAnims = []
    }

    cancelAll(): void {
        this.cancelList(this.baseAnims)
        this.cancelList(this.gestureAnims)
        this.baseAnims = []
        this.gestureAnims = []
    }

    private cancelList(list: Animation[]): void {
        for (const a of list) {
            try {
                a.cancel()
            } catch {
                /* animation đã kết thúc — bỏ qua */
            }
        }
    }
}
