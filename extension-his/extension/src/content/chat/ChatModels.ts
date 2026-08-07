// Kiểu dữ liệu cho tính năng "Chat kiểm tra hồ sơ XML 130"

export type IssueSeverity = 'error' | 'warning' | 'info'

export type IssueGroup =
    | 'PatientInfo'
    | 'Diagnosis'
    | 'Service'
    | 'Drug'
    | 'Time'
    | 'Finance'
    | 'Link'
    | 'Admin'

export interface ValidationIssue {
    ruleId: string
    severity: IssueSeverity
    group: IssueGroup
    table?: string
    field?: string
    rowIndex?: number
    value?: string
    message: string
    suggestion?: string
    xuatToanRisk: boolean
}

export interface HosoResult {
    maLk: string
    hoTen: string
    maThe: string
    /** Ngày vào viện dạng dd/MM/yyyy lấy từ XML1/NGAY_VAO, thiếu khi file ghi sai ngày. */
    ngayVao?: string
    issueCount: number
    xuatToanRisk: boolean
    issues: ValidationIssue[]
    groupCounts: Record<string, number>
}

export interface Xml130ValidationResponse {
    found: boolean
    maCskcb: string
    hosoCount: number
    totalIssues: number
    xuatToanRisk: boolean
    summary: string
    aiAssessment?: string
    results: HosoResult[]
    /** Vấn đề đối chiếu chéo giữa các hồ sơ TRONG file (file có nhiều hồ sơ). */
    crossIssues?: CrossIssue[]
}

// ---- Kiểm tra lô nhiều file XML 130 + đối chiếu chéo ----

/** Tham chiếu một hồ sơ liên quan đến vấn đề kiểm tra chéo. */
export interface CrossHosoRef {
    fileName: string
    maLk?: string
    hoTen?: string
    maThe?: string
    /** Thời điểm liên quan đến xung đột (giờ vào giường / thực hiện / tiếp nhận). */
    thoiDiem?: string
    /** True nếu hồ sơ phát sinh trước — được coi là hợp lệ trong xung đột. */
    phatSinhTruoc?: boolean
}

/** Vấn đề phát hiện khi đối chiếu chéo giữa nhiều hồ sơ (trùng giường, trùng giờ bác sĩ...). */
export interface CrossIssue {
    ruleId: string
    severity: IssueSeverity
    message: string
    suggestion?: string
    xuatToanRisk: boolean
    hosos: CrossHosoRef[]
}

/** Kết quả kiểm tra một file trong lô. */
export interface BatchFileResult {
    fileName: string
    result?: Xml130ValidationResponse | null
    error?: string | null
    /** Tên các file khác có hồ sơ xung đột/chồng chéo với file này. */
    conflictWith?: string[]
}

/** Kết quả kiểm tra lô nhiều file XML 130. */
export interface Xml130BatchValidationResponse {
    fileCount: number
    hosoCount: number
    files: BatchFileResult[]
    crossIssues: CrossIssue[]
    totalIssues: number
    xuatToanRisk: boolean
    summary?: string
}

// ---- Kiểm tra lô kiểu streaming (NDJSON) ----

/** Một file và danh sách file khác xung đột với nó (trong sự kiện "cross"). */
export interface StreamConflictEntry {
    fileName: string
    conflictWith?: string[]
}

/**
 * Một sự kiện trong stream kiểm tra lô:
 * start → fileError* → cross (toàn bộ đối chiếu chéo) → hoso* (từng hồ sơ + tiến độ) → done.
 */
export interface Xml130StreamEvent {
    type: 'start' | 'fileError' | 'cross' | 'hoso' | 'done'
    fileCount?: number
    hosoCount?: number
    fileName?: string
    error?: string
    crossIssues?: CrossIssue[]
    conflicts?: StreamConflictEntry[]
    index?: number
    total?: number
    result?: HosoResult
    riskCount?: number
    issueCount?: number
    crossCount?: number
    summary?: string
}

export interface Citation {
    documentId: string
    title: string
    docNumber: string
    excerpt: string
}

export interface AssistantAskResponse {
    answer: string
    citations: Citation[]
    fromLlm: boolean
}
