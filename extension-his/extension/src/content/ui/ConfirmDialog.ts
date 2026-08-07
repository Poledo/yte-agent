/**
 * Hộp thoại xác nhận trong Shadow DOM của extension.
 *
 * Vì sao không dùng window.confirm: hộp thoại mặc định của trình duyệt xấu, không
 * theo giao diện extension, chặn cứng luồng JS và trên một số trang bị chặn hẳn.
 * Lớp này chỉ lo phần hỏi–đáp có/không, không biết gì về nghiệp vụ gọi nó.
 */
export interface ConfirmOptions {
    /** Tiêu đề ngắn, ví dụ "Kiểm tra hàng loạt". */
    title: string
    /** Nội dung câu hỏi — cho phép HTML đã được bên gọi làm sạch. */
    messageHtml: string
    /** Nhãn nút đồng ý. */
    confirmLabel?: string
    /** Nhãn nút hủy. */
    cancelLabel?: string
    /** Biểu tượng hiển thị cạnh tiêu đề. */
    icon?: string
}

export class ConfirmDialog {
    private readonly host: HTMLElement
    private overlay: HTMLElement | null = null
    private settle: ((ok: boolean) => void) | null = null
    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.preventDefault()
            this.close(false)
        } else if (event.key === 'Enter') {
            event.preventDefault()
            this.close(true)
        }
    }

    /** @param host phần tử chứa hộp thoại — phải có position khác static. */
    constructor(host: HTMLElement) {
        this.host = host
    }

    /** Hỏi người dùng, trả về true nếu đồng ý. Mở hộp mới sẽ hủy hộp đang mở. */
    ask(options: ConfirmOptions): Promise<boolean> {
        this.close(false)

        return new Promise<boolean>((resolve) => {
            this.settle = resolve

            const overlay = document.createElement('div')
            overlay.className = 'zc-confirm'
            overlay.innerHTML = `
                <div class="zc-confirm-box" role="dialog" aria-modal="true">
                    <div class="zc-confirm-head">
                        <span class="zc-confirm-icon">${options.icon ?? '❓'}</span>
                        <span class="zc-confirm-title"></span>
                    </div>
                    <div class="zc-confirm-text">${options.messageHtml}</div>
                    <div class="zc-confirm-actions">
                        <button class="zc-confirm-btn cancel"></button>
                        <button class="zc-confirm-btn ok"></button>
                    </div>
                </div>`

            // Tiêu đề và nhãn nút gán bằng textContent để dữ liệu từ HIS không thành HTML
            const title = overlay.querySelector<HTMLElement>('.zc-confirm-title')
            if (title) title.textContent = options.title
            const cancelBtn = overlay.querySelector<HTMLButtonElement>('.zc-confirm-btn.cancel')
            const okBtn = overlay.querySelector<HTMLButtonElement>('.zc-confirm-btn.ok')
            if (cancelBtn) cancelBtn.textContent = options.cancelLabel ?? 'Hủy'
            if (okBtn) okBtn.textContent = options.confirmLabel ?? 'Đồng ý'

            cancelBtn?.addEventListener('click', () => this.close(false))
            okBtn?.addEventListener('click', () => this.close(true))
            // Bấm ra nền tối = hủy; bấm trong hộp thì không đóng
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) this.close(false)
            })
            overlay.addEventListener('keydown', this.onKeyDown)

            this.host.appendChild(overlay)
            this.overlay = overlay
            // requestAnimationFrame để trình duyệt kịp vẽ trạng thái đầu → có hiệu ứng hiện lên
            requestAnimationFrame(() => overlay.classList.add('open'))
            okBtn?.focus()
        })
    }

    private close(ok: boolean): void {
        this.overlay?.remove()
        this.overlay = null
        const settle = this.settle
        this.settle = null
        settle?.(ok)
    }

    /** CSS của hộp thoại — bên gọi nạp một lần vào Shadow DOM chung. */
    static styles(): string {
        return `
            .zc-confirm {
                position: absolute;
                inset: 0;
                z-index: 30;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(15, 23, 42, 0.45);
                opacity: 0;
                transition: opacity 0.15s ease;
            }
            .zc-confirm.open { opacity: 1; }

            .zc-confirm-box {
                width: 100%;
                max-width: 340px;
                background: #ffffff;
                border-radius: 14px;
                box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
                padding: 16px;
                transform: translateY(8px) scale(0.97);
                transition: transform 0.15s ease;
            }
            .zc-confirm.open .zc-confirm-box { transform: none; }

            .zc-confirm-head {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            .zc-confirm-icon { font-size: 18px; }
            .zc-confirm-title {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
            }
            .zc-confirm-text {
                font-size: 13px;
                line-height: 1.55;
                color: #334155;
            }
            .zc-confirm-text b { color: var(--zc-accent-deep, #2563eb); }

            .zc-confirm-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 16px;
            }
            .zc-confirm-btn {
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                color: #475569;
            }
            .zc-confirm-btn.cancel:hover { background: #f1f5f9; }
            .zc-confirm-btn.ok {
                border-color: var(--zc-accent-deep, #2563eb);
                background: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
            }
            .zc-confirm-btn.ok:hover { filter: brightness(1.08); }
            .zc-confirm-btn:focus-visible { outline: 2px solid var(--zc-accent-deep, #2563eb); outline-offset: 2px; }
        `
    }
}
