/**
 * Physics Controller (RDD §8): các chuyển động TOÀN THÂN bằng cách animate phần
 * tử host (div cố định góc phải dưới): té ngã, đáp nhún (squash & stretch), bay
 * lên popup, rơi từ trên xuống. Chỉ transform + opacity nên rất nhẹ (task §14).
 */
export class PhysicsController {
    private current: Animation | null = null

    constructor(private readonly host: HTMLElement) {}

    /** Té: chao đảo lấy đà → đổ nghiêng theo trọng lực → nảy nhẹ → chống dậy.
     *  Dùng nhiều keyframe + easing riêng để mượt, không "cứng" (task-002 #1). */
    fall(): Promise<void> {
        this.host.style.transformOrigin = '50% 100%'
        return this.animate(
            [
                { transform: 'rotate(0deg) translateY(0)', easing: 'ease-in-out' },
                { transform: 'rotate(-7deg) translateY(0)', offset: 0.12, easing: 'ease-out' }, // chao ngược lấy đà
                { transform: 'rotate(-4deg) translateY(0)', offset: 0.2, easing: 'ease-in' },
                { transform: 'rotate(22deg) translateY(7px)', offset: 0.44, easing: 'cubic-bezier(0.6,0,0.9,0.4)' }, // đổ theo trọng lực
                { transform: 'rotate(19deg) translateY(4px)', offset: 0.52, easing: 'ease-out' }, // nảy nhẹ khi chạm
                { transform: 'rotate(21deg) translateY(6px)', offset: 0.6, easing: 'ease-in-out' },
                { transform: 'rotate(20deg) translateY(6px)', offset: 0.72, easing: 'ease-in-out' }, // nằm ngơ ngác
                { transform: 'rotate(9deg) translateY(2px)', offset: 0.86, easing: 'ease-out' }, // gắng chống dậy
                { transform: 'rotate(-3deg) translateY(0)', offset: 0.94, easing: 'ease-in-out' }, // đứng hơi quá đà
                { transform: 'rotate(0deg) translateY(0)', easing: 'ease-out' },
            ],
            1700,
        )
    }

    /** Đáp xuống đất: nhún nhẹ (u đầu cảm giác "hơi mạnh"). */
    landingSquash(): Promise<void> {
        this.host.style.transformOrigin = '50% 100%'
        return this.animate(
            [
                { transform: 'scale(1, 1)' },
                { transform: 'scale(1.18, 0.82)', offset: 0.35 },
                { transform: 'scale(0.94, 1.06)', offset: 0.62 },
                { transform: 'scale(1, 1)' },
            ],
            520,
        )
    }

    /** Bay lên popup: khựng lại lấy đà rồi vọt lên khỏi mép trên, mờ dần. */
    flyToPopup(): Promise<void> {
        const h = window.innerHeight + 160
        this.host.style.transformOrigin = '50% 50%'
        return this.animate(
            [
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(12px)', opacity: 1, offset: 0.16 },
                { transform: `translateY(-${h * 0.5}px)`, opacity: 1, offset: 0.6 },
                { transform: `translateY(-${h}px)`, opacity: 0 },
            ],
            1000,
            'cubic-bezier(0.5, 0, 0.7, 0.2)',
        )
    }

    /** Rơi từ popup xuống góc phải: rơi nhanh, nảy nhẹ vài cái rồi đứng yên. */
    dropIn(): Promise<void> {
        const h = window.innerHeight + 160
        this.host.style.transformOrigin = '50% 100%'
        return this.animate(
            [
                { transform: `translateY(-${h}px)`, opacity: 0 },
                { transform: `translateY(-${h * 0.4}px)`, opacity: 1, offset: 0.3 },
                { transform: 'translateY(0)', offset: 0.66 },
                { transform: 'translateY(-16px)', offset: 0.78 },
                { transform: 'translateY(0)', offset: 0.88 },
                { transform: 'translateY(-6px)', offset: 0.95 },
                { transform: 'translateY(0)' },
            ],
            1150,
            'cubic-bezier(0.45, 0, 0.9, 0.5)',
        )
    }

    /**
     * Nhảy từ CHỖ CŨ sang chỗ mới theo đường vòng cung (né vật cản: nhảy lên đứng trên
     * nút, nhảy xuống về chỗ cũ, hay bước nép sang bên).
     *
     * Chỗ mới đã được đặt sẵn bằng `right`/`bottom`, nên ở đây chỉ cần bắt đầu bằng độ
     * lệch của chỗ cũ rồi kéo về 0 — mắt người thấy đúng là robot nhảy từ đó tới đây.
     *
     * @param dx Chỗ cũ lệch sang phải bao nhiêu px so với chỗ mới.
     * @param dy Chỗ cũ lệch xuống dưới bao nhiêu px so với chỗ mới.
     */
    leapFrom(dx: number, dy: number): Promise<void> {
        const distance = Math.hypot(dx, dy)
        // Đỉnh vòng cung phải cao hơn CẢ hai đầu, nếu không sẽ thành "trượt" chứ không phải nhảy.
        const apex = Math.min(dy, 0) - Math.max(18, distance * 0.32)
        this.host.style.transformOrigin = '50% 100%'
        return this.animate(
            [
                { transform: `translate(${dx}px, ${dy}px) scale(1, 1)` },
                { transform: `translate(${dx}px, ${dy + 5}px) scale(1.1, 0.9)`, offset: 0.14, easing: 'ease-out' }, // nhún lấy đà
                { transform: `translate(${dx * 0.55}px, ${apex}px) scale(0.92, 1.1)`, offset: 0.5, easing: 'ease-out' }, // vọt lên
                { transform: 'translate(0, 0) scale(1, 1)', offset: 0.76, easing: 'cubic-bezier(0.6,0,0.9,0.5)' }, // chạm chỗ mới
                { transform: 'translate(0, 4px) scale(1.14, 0.86)', offset: 0.85, easing: 'ease-out' }, // nhún khi tiếp đất
                { transform: 'translate(0, -3px) scale(0.97, 1.04)', offset: 0.93, easing: 'ease-in-out' },
                { transform: 'translate(0, 0) scale(1, 1)' },
            ],
            Math.round(620 + Math.min(320, distance * 1.2)),
        )
    }

    /** Nhảy tại chỗ (ăn mừng). */
    hop(): Promise<void> {
        this.host.style.transformOrigin = '50% 100%'
        return this.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)', offset: 0.5 }, { transform: 'translateY(0)' }], 500)
    }

    /** Về đúng tư thế/chỗ đậu. */
    reset(): void {
        this.cancel()
        this.host.style.transform = ''
        this.host.style.opacity = ''
    }

    cancel(): void {
        if (this.current) {
            try {
                this.current.cancel()
            } catch {
                /* đã xong */
            }
            this.current = null
        }
    }

    private animate(frames: Keyframe[], duration: number, easing = 'ease-in-out'): Promise<void> {
        this.cancel()
        const anim = this.host.animate(frames, { duration, easing, fill: 'forwards' })
        this.current = anim
        return anim.finished
            .then(() => {
                // Chốt khung cuối vào inline style rồi HỦY animation: nếu chỉ để
                // fill:'forwards' treo lại, nó sẽ ghi đè mọi thay đổi style sau này
                // (vd host.style.transform='' ở Idle vô tác dụng) → robot kẹt lại
                // vị trí/độ mờ cuối và "biến mất luôn" khi bật lại (task-002 #3).
                try {
                    anim.commitStyles()
                } catch {
                    /* commitStyles không khả dụng — bỏ qua, đã có fill giữ tạm */
                }
                try {
                    anim.cancel()
                } catch {
                    /* đã xong */
                }
                if (this.current === anim) this.current = null
            })
            .catch(() => undefined)
    }
}
