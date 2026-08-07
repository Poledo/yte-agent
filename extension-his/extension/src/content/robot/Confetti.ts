import { RobotConfig } from './RobotConfig'

const COLORS = [RobotConfig.color.vnptBlue, RobotConfig.color.vnptBlueLight, RobotConfig.color.happy, RobotConfig.color.think, '#FF6B8B']

/**
 * Tung hoa giấy nhỏ quanh robot khi toàn bộ hồ sơ hợp lệ (task §8).
 * Sinh vài mảnh giấy vào container (shadow root của robot), rơi + xoay rồi tự dọn.
 */
export function burstConfetti(container: HTMLElement, count = 16): void {
    const originX = RobotConfig.size.width / 2
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('span')
        const color = COLORS[i % COLORS.length]
        const size = 5 + (i % 3) * 2
        piece.style.cssText = `
            position:absolute; left:${originX}px; top:8px; width:${size}px; height:${size * 1.4}px;
            background:${color}; border-radius:1px; pointer-events:none; z-index:5; opacity:0;`
        container.appendChild(piece)

        const dx = (i / count - 0.5) * 140 + (i % 2 ? 8 : -8)
        const dy = 60 + (i % 4) * 26
        const rot = (i % 2 ? 1 : -1) * (180 + (i % 3) * 120)
        const anim = piece.animate(
            [
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
                { transform: `translate(${dx * 0.5}px, -18px) rotate(${rot * 0.3}deg)`, opacity: 1, offset: 0.25 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0, offset: 1 },
            ],
            { duration: 1100 + (i % 5) * 120, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' },
        )
        anim.finished.then(() => piece.remove()).catch(() => piece.remove())
    }
}
