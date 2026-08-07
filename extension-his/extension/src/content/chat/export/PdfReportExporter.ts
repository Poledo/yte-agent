/**
 * Xuất báo cáo ra PDF qua hộp in của trình duyệt ("Đích: Lưu thành PDF").
 *
 * Vì sao không tự sinh file PDF: PDF không có sẵn font tiếng Việt, muốn ra chữ
 * có dấu phải nhúng và cắt (subset) font TrueType — nặng và dễ sai. Trình duyệt
 * đã làm sẵn việc đó khi in, nên ta dựng một trang in sạch trong iframe ẩn rồi
 * gọi print(): chữ có dấu chuẩn, người dùng chọn "Lưu thành PDF" là xong.
 */

import { escapeXml, fileTypeIcon, type IReportExporter } from './ReportExporter'
import { buildReportTables, READABLE_ROW_LIMIT, type ReportTable } from './ReportTables'
import type { ResultReport } from './ResultReport'

export class PdfReportExporter implements IReportExporter {
    readonly id = 'pdf'
    readonly icon = fileTypeIcon('#e2453b', 'PDF', 7)
    readonly label = 'Tải bản PDF (mở hộp in → chọn "Lưu thành PDF")'

    /** Dọn iframe nếu người dùng bỏ hộp in mà trình duyệt không báo afterprint. */
    private static readonly CLEANUP_MS = 120_000

    async export(report: ResultReport): Promise<void> {
        const frame = document.createElement('iframe')
        frame.setAttribute('aria-hidden', 'true')
        // Không dùng display:none — iframe ẩn kiểu đó sẽ không in ra gì
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;'
        const loaded = new Promise<void>((resolve) => {
            frame.addEventListener('load', () => resolve(), { once: true })
        })
        frame.srcdoc = this.buildHtml(report)
        document.body.appendChild(frame)
        await loaded

        const view = frame.contentWindow
        if (!view) {
            frame.remove()
            return
        }
        const cleanup = (): void => frame.remove()
        view.addEventListener('afterprint', cleanup, { once: true })
        window.setTimeout(cleanup, PdfReportExporter.CLEANUP_MS)
        view.focus()
        view.print()
    }

    private buildHtml(report: ResultReport): string {
        const tables = buildReportTables(report, READABLE_ROW_LIMIT)
        const sections = tables.map((table) => this.section(table)).join('')
        // <title> đặt bằng gốc tên file, vì hộp in của Chrome lấy chính nó làm
        // tên mặc định khi chọn "Lưu thành PDF".
        return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>${escapeXml(report.fileBase)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 10.5px; margin: 0; }
    h1 { font-size: 17px; margin: 0 0 4px; color: #4f46e5; }
    h2 { font-size: 13px; margin: 16px 0 6px; color: #4f46e5; page-break-after: avoid; }
    .meta { color: #6b7280; font-size: 10px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; vertical-align: top; word-wrap: break-word; }
    th { background: #eef1f8; text-align: left; font-weight: 700; }
    tr { page-break-inside: avoid; }
    .note { color: #6b7280; font-style: italic; margin-top: 4px; }
</style></head><body>
<h1>${escapeXml(report.title)}</h1>
<div class="meta">Xuất lúc ${escapeXml(report.createdAt)} từ extension ZeroCheck AI</div>
${sections}
</body></html>`
    }

    private section(table: ReportTable): string {
        const head = table.headers.map((cell) => `<th>${escapeXml(cell)}</th>`).join('')
        const body = table.rows
            .map(
                (cells) =>
                    `<tr>${cells.map((cell) => `<td>${escapeXml(String(cell ?? '')).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`,
            )
            .join('')
        const note = table.note ? `<div class="note">${escapeXml(table.note)}</div>` : ''
        return `<h2>${escapeXml(table.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`
    }
}
