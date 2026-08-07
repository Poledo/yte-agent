/**
 * Mô hình BÁO CÁO của một lượt kiểm tra — dạng bảng phẳng, không dính HTML.
 *
 * Vì sao tách khỏi ChatMessageRenderer: renderer sinh HTML cho khung chat, còn
 * báo cáo tải về cần dữ liệu thô để đổ ra Word/Excel/PDF. Một mô hình chung ở
 * giữa giúp ba bộ xuất không phải bóc lại HTML, và mỗi bên giữ đúng một trách nhiệm.
 */

import type { CrossIssue, HosoResult, IssueSeverity, Xml130ValidationResponse, Xml130StreamEvent } from '../ChatModels'
import type { StreamFileStats } from '../ChatMessageRenderer'
import { ReportNaming } from './ReportNaming'

/** Nhãn tiếng Việt của mức độ — dùng chung cho cả ba định dạng xuất. */
export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
    error: 'LỖI',
    warning: 'CẢNH BÁO',
    info: 'THÔNG TIN',
}

/** Nhãn tiếng Việt của nhóm vấn đề. */
export const GROUP_LABELS: Record<string, string> = {
    PatientInfo: 'Thông tin bệnh nhân',
    Diagnosis: 'Chẩn đoán',
    Service: 'Dịch vụ kỹ thuật',
    Drug: 'Thuốc',
    Time: 'Thời gian',
    Finance: 'Tài chính',
    Link: 'Liên kết bảng',
    Admin: 'Hành chính/Giấy tờ',
}

/** Một dòng vấn đề của một hồ sơ. */
export interface ReportIssueRow {
    fileName: string
    hoTen: string
    maLk: string
    maThe: string
    severity: string
    group: string
    table: string
    field: string
    rowIndex: string
    value: string
    message: string
    suggestion: string
    xuatToanRisk: string
}

/** Một dòng vấn đề đối chiếu chéo (liên quan nhiều hồ sơ). */
export interface ReportCrossRow {
    severity: string
    message: string
    suggestion: string
    xuatToanRisk: string
    /** Các hồ sơ liên quan, gộp thành một ô cho dễ đọc trong Word/Excel. */
    hosos: string
}

/** Toàn bộ nội dung một lượt kiểm tra, đủ để dựng file tải về. */
export interface ResultReport {
    /** Tiêu đề in bên trong tài liệu. */
    title: string
    /** Gốc tên file tải về — xem quy ước ở {@link ReportNaming}. */
    fileBase: string
    createdAt: string
    /** Các con số tổng quan (số hồ sơ, số vấn đề...). */
    stats: Array<{ label: string; value: string }>
    summary: string
    crossIssues: ReportCrossRow[]
    issues: ReportIssueRow[]
    /** File không đọc được (đường kiểm tra lô). */
    fileErrors: Array<{ fileName: string; error: string }>
    /** Số hồ sơ không phát hiện vấn đề — chỉ đếm, không liệt kê từng hồ sơ. */
    cleanHosoCount: number
}

/** Dựng {@link ResultReport} từ các dạng kết quả mà API trả về. */
export class ReportBuilder {
    /**
     * Kết quả kiểm tra MỘT file / một số vào viện.
     *
     * @param subject phần nhận diện trong tên file (xem {@link ReportNaming})
     * @param sourceFile tên file XML, dùng làm cột "File" của từng dòng vấn đề
     */
    static fromValidation(result: Xml130ValidationResponse, subject: string, sourceFile: string): ResultReport {
        const results = result.results ?? []
        const issues = results.flatMap((hoso) => ReportBuilder.issueRows(hoso, sourceFile))
        const when = new Date()
        return {
            title: ReportNaming.title(subject),
            fileBase: ReportNaming.fileBase(when, subject),
            createdAt: ReportBuilder.now(when),
            stats: [
                { label: 'Mã CSKCB', value: result.maCskcb || '-' },
                { label: 'Số hồ sơ', value: String(result.hosoCount ?? 0) },
                { label: 'Tổng vấn đề', value: String(result.totalIssues ?? 0) },
                { label: 'Nguy cơ xuất toán', value: result.xuatToanRisk ? 'Có' : 'Không' },
            ],
            summary: [result.summary, result.aiAssessment].filter(Boolean).join('\n'),
            crossIssues: ReportBuilder.crossRows(result.crossIssues ?? []),
            issues,
            fileErrors: [],
            cleanHosoCount: results.filter((hoso) => (hoso.issues?.length ?? 0) === 0).length,
        }
    }

    /**
     * Kết quả kiểm tra LÔ (luồng streaming). Chỉ những hồ sơ CÓ vấn đề được giữ
     * lại trong `perFile` nên báo cáo cũng chỉ liệt kê chừng đó — số hồ sơ sạch
     * ghi riêng thành một con số để người đọc biết phần còn lại đã được soát.
     */
    static fromStream(
        done: Xml130StreamEvent,
        perFile: Map<string, StreamFileStats>,
        fileErrors: Map<string, string>,
        crossIssues: CrossIssue[],
        subject: string,
    ): ResultReport {
        const issues: ReportIssueRow[] = []
        let cleanHosoCount = 0
        for (const [fileName, stats] of perFile) {
            cleanHosoCount += Math.max(0, stats.hosoCount - stats.results.length)
            for (const hoso of stats.results) {
                issues.push(...ReportBuilder.issueRows(hoso, fileName))
            }
        }

        const when = new Date()
        return {
            title: ReportNaming.title(subject),
            fileBase: ReportNaming.fileBase(when, subject),
            createdAt: ReportBuilder.now(when),
            stats: [
                { label: 'Số file', value: String(perFile.size) },
                { label: 'Số hồ sơ đã kiểm tra', value: String(done.hosoCount ?? 0) },
                { label: 'Hồ sơ nguy cơ xuất toán', value: String(done.riskCount ?? 0) },
                { label: 'Tổng vấn đề', value: String(done.issueCount ?? 0) },
                { label: 'Vấn đề đối chiếu chéo', value: String(done.crossCount ?? crossIssues.length) },
            ],
            summary: done.summary ?? '',
            crossIssues: ReportBuilder.crossRows(crossIssues),
            issues,
            fileErrors: [...fileErrors].map(([fileName, error]) => ({ fileName, error })),
            cleanHosoCount,
        }
    }

    private static issueRows(hoso: HosoResult, fileName: string): ReportIssueRow[] {
        return (hoso.issues ?? []).map((issue) => ({
            fileName,
            hoTen: hoso.hoTen || '',
            maLk: hoso.maLk || '',
            maThe: hoso.maThe || '',
            severity: SEVERITY_LABELS[issue.severity] ?? issue.severity,
            group: GROUP_LABELS[issue.group] ?? issue.group,
            table: issue.table ?? '',
            field: issue.field ?? '',
            rowIndex: issue.rowIndex === undefined || issue.rowIndex === null ? '' : String(issue.rowIndex),
            value: issue.value ?? '',
            message: issue.message,
            suggestion: issue.suggestion ?? '',
            xuatToanRisk: issue.xuatToanRisk ? 'Có' : '',
        }))
    }

    private static crossRows(crossIssues: CrossIssue[]): ReportCrossRow[] {
        return crossIssues.map((issue) => ({
            severity: SEVERITY_LABELS[issue.severity] ?? issue.severity,
            message: issue.message,
            suggestion: issue.suggestion ?? '',
            xuatToanRisk: issue.xuatToanRisk ? 'Có' : '',
            hosos: (issue.hosos ?? [])
                .map((ref) => {
                    const parts = [ref.hoTen || ref.maLk || '(không rõ)', ref.fileName]
                    if (ref.thoiDiem) parts.push(ref.thoiDiem)
                    parts.push(ref.phatSinhTruoc ? 'phát sinh trước - hợp lệ' : 'cần rà soát')
                    return parts.join(' · ')
                })
                .join('\n'),
        }))
    }

    /** Thời điểm kiểm tra để in trong tài liệu — dạng người Việt đọc quen. */
    private static now(d: Date): string {
        const pad = (n: number): string => String(n).padStart(2, '0')
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
}
