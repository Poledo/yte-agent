import { RobotState, StatePriority } from './RobotState'

/** Mức "khoá" của mỗi state: nguồn tác động phải có ưu tiên ≥ mức này mới ngắt được. */
const HOLDING: Record<RobotState, StatePriority> = {
    [RobotState.Boot]: StatePriority.UserClick,
    [RobotState.Idle]: StatePriority.Idle,
    [RobotState.LongIdle]: StatePriority.Idle,
    [RobotState.Watching]: StatePriority.Idle,
    [RobotState.Hover]: StatePriority.Idle,
    [RobotState.Sleeping]: StatePriority.Idle,
    [RobotState.Listening]: StatePriority.Validation,
    [RobotState.Typing]: StatePriority.Validation,
    [RobotState.Thinking]: StatePriority.Validation,
    [RobotState.Explaining]: StatePriority.Validation,
    [RobotState.Happy]: StatePriority.Validation,
    [RobotState.Celebrate]: StatePriority.Validation,
    [RobotState.Sad]: StatePriority.Validation,
    [RobotState.Confused]: StatePriority.Validation,
    [RobotState.PointError]: StatePriority.Validation,
    [RobotState.WakeUp]: StatePriority.UserClick,
    [RobotState.Landing]: StatePriority.UserClick,
    [RobotState.Flying]: StatePriority.Critical,
    [RobotState.Falling]: StatePriority.Critical,
    [RobotState.Fell]: StatePriority.Critical,
    [RobotState.Disabled]: StatePriority.Critical,
}

export type StateEnterHandler = (to: RobotState, from: RobotState) => void

/**
 * State Machine của robot (task §11, RDD §3).
 *
 * Không dùng bảng liệt kê từng cặp chuyển tiếp mà dùng MÔ HÌNH ƯU TIÊN:
 * mỗi state có mức khoá; một dispatch chỉ thành công nếu nguồn tác động có
 * ưu tiên ≥ mức khoá của state hiện tại (Critical = Enable/Disable/té luôn ngắt
 * được). Nhờ vậy chuột không kéo robot ra khỏi lúc đang "suy nghĩ", nhưng
 * Enable/Disable thì cắt ngang mọi thứ. Mỗi lần đổi state, onEnter được gọi để
 * controller huỷ animation cũ và chạy animation mới.
 */
export class StateMachine {
    private currentState: RobotState

    constructor(
        initial: RobotState,
        private readonly onEnter: StateEnterHandler,
    ) {
        this.currentState = initial
    }

    get state(): RobotState {
        return this.currentState
    }

    is(...states: RobotState[]): boolean {
        return states.includes(this.currentState)
    }

    /**
     * Yêu cầu chuyển sang state mới với một mức ưu tiên nguồn.
     * @returns true nếu chuyển thành công.
     */
    dispatch(to: RobotState, source: StatePriority = StatePriority.Idle): boolean {
        if (to === this.currentState) return false
        if (source < HOLDING[this.currentState]) return false
        this.transition(to)
        return true
    }

    /** Ép chuyển state bất kể ưu tiên (dùng cho chuỗi vật lý nội bộ: Falling→Landing→Idle). */
    force(to: RobotState): void {
        if (to === this.currentState) return
        this.transition(to)
    }

    private transition(to: RobotState): void {
        const from = this.currentState
        this.currentState = to
        this.onEnter(to, from)
    }
}
