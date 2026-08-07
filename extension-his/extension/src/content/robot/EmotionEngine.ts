import { RobotView } from './RobotView'
import { RobotEmotion } from './RobotState'

/** Bộ hình miệng theo cảm xúc (toạ độ trong hệ SVG của robot). */
const MOUTH = {
    neutral: 'M42 51 Q48 54 54 51',
    smile: 'M41 50 Q48 58 55 50',
    grin: 'M40 49 Q48 60 56 49 Q48 55 40 49',
    sad: 'M42 54 Q48 49 54 54',
    flat: 'M43 52 L53 52',
    open: 'M44 50 Q48 57 52 50 Q48 53 44 50',
    small: 'M45 51 Q48 55 51 51',
} as const

/**
 * Emotion Engine (RDD §4): quyết định BIỂU CẢM khuôn mặt cho mỗi cảm xúc.
 * Chỉ ánh xạ cảm xúc → mắt + miệng + phụ trợ; không tự chạy animation.
 */
export class EmotionEngine {
    private current: RobotEmotion = RobotEmotion.Neutral

    constructor(private readonly view: RobotView) {}

    get emotion(): RobotEmotion {
        return this.current
    }

    /** Áp một cảm xúc lên khuôn mặt robot. */
    set(emotion: RobotEmotion): void {
        this.current = emotion
        const v = this.view

        // Mặc định gỡ phụ trợ, từng nhánh bật lại nếu cần.
        v.setCheeksVisible(false)
        v.setSweatVisible(false)

        switch (emotion) {
            case RobotEmotion.Happy:
                v.setEyeMode('happy')
                v.setMouthPath(MOUTH.smile)
                break
            case RobotEmotion.Proud:
                v.setEyeMode('happy')
                v.setMouthPath(MOUTH.grin)
                v.setCheeksVisible(true)
                break
            case RobotEmotion.Curious:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.small)
                break
            case RobotEmotion.Focused:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.flat)
                break
            case RobotEmotion.Sleepy:
                v.setEyeMode('closed')
                v.setMouthPath(MOUTH.small)
                break
            case RobotEmotion.Embarrassed:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.flat)
                v.setCheeksVisible(true)
                v.setSweatVisible(true)
                break
            case RobotEmotion.Sad:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.sad)
                break
            case RobotEmotion.Surprised:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.open)
                break
            case RobotEmotion.Neutral:
            default:
                v.setEyeMode('open')
                v.setMouthPath(MOUTH.neutral)
                break
        }
    }
}
