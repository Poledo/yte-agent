/**
 * Quy đổi {@link ResultReport} thành danh sách BẢNG phẳng.
 *
 * Ba bộ xuất (Word/Excel/PDF) đều cần đúng những bảng này với đúng thứ tự cột.
 * Gom về một chỗ để đổi cột chỉ phải sửa một lần và ba file tải về luôn khớp nhau.
 */

import type { ResultReport } from './ResultReport'

export interface ReportTable {
    /** Tiêu đề phần, cũng là tên sheet khi xuất Excel. */
    title: string
    headers: string[]
    rows: string[][]
    /** Ghi chú đặt ngay dưới bảng (vd: đã cắt bớt bao nhiêu dòng). */
    note?: string
}

/**
 * Word và PDF là bản để ĐỌC nên chỉ in tối đa chừng này dòng vấn đề; muốn đủ
 * toàn bộ thì tải Excel. Cắt bớt luôn được ghi rõ thành ghi chú dưới bảng chứ
 * không lặng lẽ bỏ đi.
 */
export const READABLE_ROW_LIMIT = 500

export function buildReportTables(report: ResultReport, rowLimit: number | null = null): ReportTable[] {
    const tables: ReportTable[] = []

    tables.push({
        title: 'Tổng quan',
        headers: ['Mục', 'Giá trị'],
        rows: [
            ['Thời điểm kiểm tra', report.createdAt],
            ...report.stats.map((stat) => [stat.label, stat.value]),
            ['Hồ sơ không phát hiện vấn đề', String(report.cleanHosoCount)],
            ...(report.summary ? [['Nhận xét', report.summary]] : []),
        ],
    })

    if (report.crossIssues.length > 0) {
        tables.push({
            title: 'Đối chiếu chéo',
            headers: ['Mức độ', 'Vấn đề', 'Hồ sơ liên quan', 'Hướng xử lý', 'Nguy cơ xuất toán'],
            rows: report.crossIssues.map((row) => [
                row.severity,
                row.message,
                row.hosos,
                row.suggestion,
                row.xuatToanRisk,
            ]),
        })
    }

    if (report.issues.length > 0) {
        const rows = report.issues.map((row) => [
            row.fileName,
            row.hoTen,
            row.maLk,
            row.maThe,
            row.severity,
            row.group,
            row.table,
            row.field,
            row.rowIndex,
            row.value,
            row.message,
            row.suggestion,
            row.xuatToanRisk,
        ])
        const limited = rowLimit !== null && rows.length > rowLimit
        tables.push({
            title: 'Vấn đề theo hồ sơ',
            headers: [
                'File',
                'Họ tên',
                'Mã LK',
                'Mã thẻ',
                'Mức độ',
                'Nhóm',
                'Bảng',
                'Trường',
                'Dòng',
                'Giá trị',
                'Vấn đề',
                'Hướng xử lý',
                'Nguy cơ xuất toán',
            ],
            rows: limited ? rows.slice(0, rowLimit) : rows,
            note: limited
                ? `Bản này chỉ in ${rowLimit}/${rows.length} dòng cho dễ đọc. Tải bản Excel để có đủ toàn bộ.`
                : undefined,
        })
    }

    if (report.fileErrors.length > 0) {
        tables.push({
            title: 'File không đọc được',
            headers: ['File', 'Lý do'],
            rows: report.fileErrors.map((row) => [row.fileName, row.error]),
        })
    }

    return tables
}
