/**
 * Thanh "Tải kết quả" gắn dưới mỗi tin nhắn kết quả kiểm tra.
 *
 * Giữ luôn dữ liệu báo cáo của các lượt kiểm tra GẦN ĐÂY, không chỉ lượt cuối:
 * bản báo cáo nhẹ hơn hẳn phần HTML mà khung chat vốn đã giữ lại cho cùng lượt
 * đó, nên tải lại kết quả cũ không tốn thêm gì đáng kể. Chỉ chặn ở chỗ số lượt
 * giữ tối đa để phiên làm việc dài không phình bộ nhớ vô hạn — lượt quá cũ thì
 * thanh tải đổi thành một dòng ghi chú, nói rõ vì sao không tải được nữa.
 *
 * Trách nhiệm duy nhất (SRP): dựng thanh nút + quyết định lượt nào còn tải được.
 * Việc sinh file thuộc về các {@link IReportExporter}.
 */

import type { IReportExporter } from './ReportExporter'
import type { ResultReport } from './ResultReport'

interface KeptResult {
    bar: HTMLElement
    report: ResultReport
}

export class ResultDownloadBars {
    /** Số lượt kiểm tra gần nhất còn tải lại được. */
    private static readonly MAX_KEPT = 10

    private readonly kept: KeptResult[] = []

    constructor(private readonly exporters: IReportExporter[]) {}

    /** Gắn thanh tải vào tin nhắn kết quả. */
    attach(message: HTMLElement, report: ResultReport): void {
        const bar = document.createElement('div')
        bar.className = 'chat-download'
        bar.innerHTML =
            '<span class="chat-download-label">Tải kết quả</span>' +
            this.exporters
                .map(
                    (exporter) =>
                        `<button class="chat-download-btn" type="button" data-format="${exporter.id}" ` +
                        `title="${this.escapeAttr(exporter.label)}" aria-label="${this.escapeAttr(exporter.label)}">${exporter.icon}</button>`,
                )
                .join('')
        bar.addEventListener('click', (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-format]')
            if (button) void this.run(button, bar, report)
        })
        message.appendChild(bar)

        this.kept.push({ bar, report })
        while (this.kept.length > ResultDownloadBars.MAX_KEPT) {
            this.expire(this.kept.shift())
        }
    }

    /** Xóa lịch sử hội thoại → không còn tin nhắn nào, thả luôn dữ liệu báo cáo. */
    clear(): void {
        this.kept.length = 0
    }

    private async run(button: HTMLButtonElement, bar: HTMLElement, report: ResultReport): Promise<void> {
        const exporter = this.exporters.find((item) => item.id === button.dataset.format)
        if (!exporter) return
        const buttons = bar.querySelectorAll<HTMLButtonElement>('[data-format]')
        buttons.forEach((item) => (item.disabled = true))
        bar.classList.add('chat-download-busy')
        try {
            await exporter.export(report)
        } catch (error) {
            const note = document.createElement('span')
            note.className = 'chat-download-error'
            note.textContent = `Không tạo được file: ${error instanceof Error ? error.message : 'lỗi không rõ'}`
            bar.querySelector('.chat-download-error')?.remove()
            bar.appendChild(note)
        } finally {
            buttons.forEach((item) => (item.disabled = false))
            bar.classList.remove('chat-download-busy')
        }
    }

    /** Lượt quá cũ: bỏ dữ liệu, thay nút bằng ghi chú cho khỏi bấm vào chỗ đã rỗng. */
    private expire(entry: KeptResult | undefined): void {
        if (!entry) return
        entry.bar.classList.add('chat-download-expired')
        entry.bar.innerHTML =
            '<span class="chat-download-note">Đã qua nhiều lượt kiểm tra nên bản tải của lượt này không còn được giữ. ' +
            'Kiểm tra lại để tải bản mới.</span>'
    }

    private escapeAttr(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    }
}
