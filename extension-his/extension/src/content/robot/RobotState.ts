/**
 * Các trạng thái của robot (State Machine) và cảm xúc (Emotion Engine).
 *
 * Mọi animation đều đi qua State Machine: không gọi animation trực tiếp mà
 * dispatch state; StateMachine hủy animation đang chạy rồi chạy animation của
 * state mới (theo RDD mục 3 & 13).
 */

/** Trạng thái lõi + tương tác (RDD §3). */
export enum RobotState {
    Boot = 'Boot',
    Idle = 'Idle',
    LongIdle = 'LongIdle',
    Watching = 'Watching',
    Hover = 'Hover',
    Listening = 'Listening', // mở chat, chờ lệnh
    Typing = 'Typing', // người dùng đang gõ câu hỏi
    Thinking = 'Thinking', // AI đang xử lý
    Explaining = 'Explaining', // AI trả lời
    Happy = 'Happy',
    Celebrate = 'Celebrate', // toàn bộ hợp lệ
    Sad = 'Sad',
    Confused = 'Confused', // có cảnh báo → gãi đầu, bối rối
    PointError = 'PointError',
    Sleeping = 'Sleeping',
    WakeUp = 'WakeUp',
    Flying = 'Flying', // bay lên popup (khi Disable)
    Falling = 'Falling', // rơi xuống trang (khi Enable)
    Landing = 'Landing',
    Fell = 'Fell', // té do mất thăng bằng
    Disabled = 'Disabled', // ngủ trên popup
}

/** Cảm xúc quyết định biểu cảm khuôn mặt (RDD §4). */
export enum RobotEmotion {
    Neutral = 'Neutral',
    Happy = 'Happy',
    Curious = 'Curious',
    Focused = 'Focused',
    Sleepy = 'Sleepy',
    Proud = 'Proud',
    Embarrassed = 'Embarrassed',
    Sad = 'Sad',
    Surprised = 'Surprised',
}

/**
 * Độ ưu tiên nguồn tác động (RDD §4): Critical > User Click > Validation > Mouse > Idle.
 * Số lớn hơn = ưu tiên cao hơn, được phép ngắt trạng thái ưu tiên thấp.
 */
export enum StatePriority {
    Idle = 0,
    Mouse = 1,
    Validation = 2,
    UserClick = 3,
    Critical = 4, // Enable/Disable, té — luôn ngắt được mọi thứ
}
