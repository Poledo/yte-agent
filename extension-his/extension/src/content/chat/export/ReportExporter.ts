/**
 * Hợp đồng chung cho các bộ xuất báo cáo + vài tiện ích dùng lại.
 *
 * Mỗi định dạng là một class riêng cài {@link IReportExporter}; thanh "Tải kết quả"
 * chỉ biết interface này nên thêm định dạng mới không phải sửa thanh nút.
 */

import type { ResultReport } from './ResultReport'

export interface IReportExporter {
    /** Khóa định danh, dùng làm data-format trên nút. */
    readonly id: string
    /** Biểu tượng hiện trên nút. */
    readonly icon: string
    /** Chú thích khi rê chuột — tiếng Việt, nói rõ sẽ ra file gì. */
    readonly label: string
    export(report: ResultReport): Promise<void>
}

/**
 * Biểu tượng file theo đúng màu nhận diện của từng định dạng (đỏ PDF, xanh Word,
 * xanh lá Excel) — vẽ bằng SVG nội tuyến nên không phải kèm ảnh vào gói extension
 * và không bị mờ ở màn hình độ phân giải cao. Dùng chung một hình trang giấy gấp
 * góc, chỉ khác màu và chữ, để ba nút nhìn cùng một bộ.
 */
export function fileTypeIcon(color: string, text: string, fontSize: number): string {
    return (
        '<svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true">' +
        `<path d="M6 2h8l6 6v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 21V4.5A2.5 2.5 0 0 1 6.5 2z" fill="${color}"/>` +
        '<path d="M14 2l6 6h-4.5A1.5 1.5 0 0 1 14 6.5z" fill="#ffffff" opacity="0.4"/>' +
        `<text x="12" y="18.5" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" ` +
        `font-size="${fontSize}" font-weight="700" letter-spacing="-0.3">${text}</text>` +
        '</svg>'
    )
}

/** Escape ký tự đặc biệt của XML (dùng cho cả OOXML lẫn HTML in ra PDF). */
export function escapeXml(value: string): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * Tên file an toàn cho Windows: bỏ ký tự cấm, gộp khoảng trắng, cắt cho ngắn.
 * Giữ nguyên dấu tiếng Việt vì Windows và Chrome đều nhận.
 */
export function safeFileName(title: string): string {
    const cleaned = title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    return (cleaned || 'Ket qua kiem tra').slice(0, 80)
}

/** Đưa Blob xuống máy qua thẻ <a download> rồi thu hồi URL tạm. */
export function saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Chờ trình duyệt kịp bắt đầu tải rồi mới thu hồi
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
