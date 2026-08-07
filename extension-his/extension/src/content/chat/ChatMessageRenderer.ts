import {
    Xml130ValidationResponse,
    Xml130BatchValidationResponse,
    Xml130StreamEvent,
    StreamConflictEntry,
    BatchFileResult,
    CrossIssue,
    HosoResult,
    ValidationIssue,
    IssueSeverity,
    IssueGroup,
    AssistantAskResponse,
} from './ChatModels'

/** Thống kê một file gom được trong quá trình stream. */
export interface StreamFileStats {
    /** Chỉ giữ các hồ sơ CÓ vấn đề — hồ sơ sạch chỉ đếm, không render (tránh nổ DOM với lô nghìn hồ sơ). */
    results: HosoResult[]
    hosoCount: number
    issueCount: number
    riskCount: number
}

/**
 * Render nội dung HTML cho các loại tin nhắn bot trong chat panel.
 * Mọi dữ liệu động đều được escape để tránh XSS.
 */
export class ChatMessageRenderer {
    private static readonly GROUP_TITLES: Record<IssueGroup, string> = {
        PatientInfo: 'Thông tin bệnh nhân',
        Diagnosis: 'Chẩn đoán',
        Service: 'Dịch vụ kỹ thuật',
        Drug: 'Thuốc',
        Time: 'Thời gian',
        Finance: 'Tài chính',
        Link: 'Liên kết bảng',
        Admin: 'Hành chính/Giấy tờ',
    }

    private static readonly GROUP_ORDER: IssueGroup[] = [
        'PatientInfo',
        'Diagnosis',
        'Service',
        'Drug',
        'Time',
        'Finance',
        'Link',
        'Admin',
    ]

    /** Render kết quả kiểm tra hồ sơ XML 130 */
    renderValidationResult(result: Xml130ValidationResponse): string {
        // File tải về được nhưng không đủ dữ liệu để kiểm tra — báo trung tính,
        // KHÔNG hiển thị banner "đạt" gây hiểu nhầm (khác với lỗi không tải được file).
        if (result.found === false || result.hosoCount === 0) {
            const msg = result.summary || 'File XML 130 không đủ thông tin để kiểm tra.'
            return `<div class="chat-banner chat-banner-warn">⚠ XML 130 không đủ thông tin</div>
                <div class="chat-result-text">${this.escape(msg)}</div>`
        }

        const banner = result.xuatToanRisk
            ? '<div class="chat-banner chat-banner-risk">⚠ Hồ sơ có nguy cơ xuất toán</div>'
            : '<div class="chat-banner chat-banner-ok">✔ Hồ sơ đạt</div>'

        const summaryParts: string[] = []
        if (result.maCskcb) {
            summaryParts.push(`Mã CSKCB: <b>${this.escape(result.maCskcb)}</b>`)
        }
        summaryParts.push(`Số hồ sơ: <b>${result.hosoCount}</b>`)
        summaryParts.push(`Tổng vấn đề: <b>${result.totalIssues}</b>`)

        let html = banner
        html += `<div class="chat-result-summary">${summaryParts.join(' · ')}</div>`

        if (result.summary) {
            html += `<div class="chat-result-text">${this.escape(result.summary)}</div>`
        }
        if (result.aiAssessment) {
            html += `<div class="chat-result-ai">🧠 ${this.escape(result.aiAssessment)}</div>`
        }

        // File chứa nhiều hồ sơ → hiện phần đối chiếu chéo TRONG file
        // (khi kiểm tra lô, phần chéo nằm ở cấp lô nên mảng này rỗng — không hiện gì thêm)
        if (result.crossIssues && result.crossIssues.length > 0) {
            html += this.renderCrossIssues(result.crossIssues)
        }

        // Chi tiết mở sẵn (bấm tiêu đề vẫn thu gọn được)
        const hosoHtml = (result.results ?? []).map((hoso) => this.renderHoso(hoso)).join('')
        if (hosoHtml) {
            html += this.wrapExpand(
                result.totalIssues > 0
                    ? `Chi tiết ${result.totalIssues} vấn đề (${result.hosoCount} hồ sơ)`
                    : `Chi tiết ${result.hosoCount} hồ sơ`,
                hosoHtml,
                true,
            )
        }

        return html
    }

    /**
     * Khối sổ dọc (accordion): bấm tiêu đề để đóng/mở, có animation trượt xuống.
     * open = true → mở sẵn khi hiển thị (vẫn thu gọn lại được).
     */
    private wrapExpand(label: string, innerHtml: string, open = false): string {
        return `
            <details class="chat-expand"${open ? ' open' : ''}>
                <summary>${this.escape(label)}</summary>
                <div class="chat-expand-body">${innerHtml}</div>
            </details>`
    }

    /**
     * Render kết quả kiểm tra LÔ nhiều file XML 130:
     * banner chung → phần đối chiếu chéo giữa các hồ sơ → chi tiết từng file (thu gọn).
     */
    renderBatchValidationResult(batch: Xml130BatchValidationResponse): string {
        // Không hiện banner "lô đạt/nguy cơ" — dễ hiểu nhầm là TẤT CẢ file đều vậy;
        // trạng thái từng file đã ghi ngay trên dòng của file đó.
        let html = `<div class="chat-result-summary">Số file: <b>${batch.fileCount}</b> · Số hồ sơ: <b>${batch.hosoCount}</b> · Tổng vấn đề: <b>${batch.totalIssues}</b></div>`
        if (batch.summary) {
            html += `<div class="chat-result-text">${this.escape(batch.summary)}</div>`
        }

        // Sơ đồ xung đột: chỉ ra ngay FILE NÀO đụng FILE NÀO (2 file hoặc nhiều hơn)
        html += this.renderConflictMap(batch.files ?? [])

        html += this.renderCrossIssues(batch.crossIssues ?? [])

        for (const file of batch.files ?? []) {
            const inner = file.error
                ? `<div class="chat-issue chat-issue-error">❌ ${this.escape(file.error)}</div>`
                : file.result
                  ? this.renderValidationResult(file.result)
                  : ''
            const note = file.error
                ? 'Không đọc được'
                : file.result?.found === false || file.result?.hosoCount === 0
                  ? 'Không đủ thông tin'
                  : file.result?.xuatToanRisk
                    ? `${file.result.totalIssues} vấn đề — nguy cơ xuất toán`
                    : `${file.result?.totalIssues ?? 0} vấn đề`
            html += `
                <details class="chat-batch-file" open>
                    <summary>
                        <span class="chat-batch-file-name">📄 ${this.escape(file.fileName)}</span>
                        ${this.buildFileHosoLabel(file)}
                        <span class="chat-batch-note">${this.escape(note)}</span>
                    </summary>
                    <div class="chat-batch-file-body">${inner}</div>
                </details>`
        }

        return html
    }

    /**
     * Thông tin hồ sơ hiện ngay trên dòng file (không cần mở chi tiết):
     * tên bệnh nhân + mã liên kết của hồ sơ đầu, kèm số hồ sơ còn lại nếu file có nhiều.
     */
    private buildFileHosoLabel(file: BatchFileResult): string {
        const results = file.result?.results ?? []
        if (results.length === 0) {
            return ''
        }
        const first = results[0]
        const parts: string[] = []
        if (first.hoTen) parts.push(first.hoTen)
        if (first.maLk) parts.push(`MA_LK ${first.maLk}`)
        if (parts.length === 0) {
            return ''
        }
        const extra = results.length > 1 ? ` +${results.length - 1} hồ sơ khác` : ''
        return `<span class="chat-batch-who">👤 ${this.escape(parts.join(' · '))}${this.escape(extra)}</span>`
    }

    /**
     * Sơ đồ xung đột giữa các FILE: mỗi file có xung đột hiện một dòng
     * "file này ⇄ đụng những file nào" để người dùng thấy ngay không cần mở chi tiết.
     */
    private renderConflictMap(files: StreamConflictEntry[]): string {
        const conflicted = files.filter((f) => (f.conflictWith?.length ?? 0) > 0)
        if (conflicted.length === 0) {
            return ''
        }

        // Mỗi CẶP file chỉ hiện một dòng (không lặp "A ⇄ B" rồi "B ⇄ A")
        const seenPairs = new Set<string>()
        const rowsHtml: string[] = []
        for (const f of conflicted) {
            const others = (f.conflictWith ?? []).filter((o) => {
                const key = [f.fileName, o].sort().join('|')
                if (seenPairs.has(key)) return false
                seenPairs.add(key)
                return true
            })
            if (others.length === 0) continue
            rowsHtml.push(`
                <div class="chat-conflict-row">
                    <span class="chat-conflict-file">📄 ${this.escape(f.fileName)}</span>
                    <span class="chat-conflict-arrow">⇄</span>
                    <span class="chat-conflict-others">${others.map((o) => this.escape(o)).join(' · ')}</span>
                </div>`)
        }
        const rows = rowsHtml.join('')

        return `
            <div class="chat-conflict-map">
                <div class="chat-conflict-title">⚠ ${conflicted.length} file có hồ sơ xung đột/chồng chéo với nhau:</div>
                ${rows}
            </div>`
    }

    /** Phần "đối chiếu chéo": các vấn đề liên quan NHIỀU hồ sơ (trùng giường, trùng giờ bác sĩ...). */
    private renderCrossIssues(crossIssues: CrossIssue[]): string {
        if (crossIssues.length === 0) {
            return '<div class="chat-cross-clean">🔗 Đối chiếu chéo giữa các hồ sơ: không phát hiện trùng giường, trùng giờ bác sĩ hay trùng đợt điều trị.</div>'
        }

        const items = crossIssues
            .map((issue) => {
                const icon = this.getSeverityIcon(issue.severity)
                const riskBadge = issue.xuatToanRisk ? '<span class="chat-badge-risk">Nguy cơ xuất toán</span>' : ''
                const suggestion = issue.suggestion
                    ? `<div class="chat-issue-suggestion">💡 ${this.escape(issue.suggestion)}</div>`
                    : ''
                const hososLine = this.renderCrossHosoRefs(issue)

                return `
                    <div class="chat-issue chat-issue-${issue.severity}">
                        <div class="chat-issue-line">
                            ${icon}
                            <span class="chat-issue-message">${this.escape(issue.message)}</span>
                            ${riskBadge}
                        </div>
                        ${hososLine}
                        ${suggestion}
                    </div>`
            })
            .join('')

        // Mở sẵn — đây là thông tin quan trọng nhất của lần kiểm tra lô;
        // người dùng vẫn bấm tiêu đề để thu gọn được
        return this.wrapExpand(
            `🔗 Đối chiếu chéo giữa các hồ sơ — ${crossIssues.length} vấn đề`,
            `<div class="chat-issue-group chat-cross-group">${items}</div>`,
            true,
        )
    }

    /**
     * Danh sách hồ sơ liên quan một vấn đề chéo, đánh dấu rõ:
     * - "Phát sinh trước — hợp lệ" (xanh): hồ sơ tiếp nhận/bắt đầu sớm hơn;
     * - "Cần rà soát" (cam): các hồ sơ còn lại (hoặc tất cả, nếu trùng đúng thời điểm).
     */
    private renderCrossHosoRefs(issue: CrossIssue): string {
        const refs = issue.hosos ?? []
        if (refs.length === 0) {
            return ''
        }

        const rows = refs
            .map((h) => {
                const name = this.escape(h.hoTen || h.maLk || '(không rõ)')
                const time = h.thoiDiem ? ` · ${this.escape(h.thoiDiem)}` : ''
                const badge = h.phatSinhTruoc
                    ? '<span class="chat-ref-badge chat-ref-first">✔ Phát sinh trước — hợp lệ</span>'
                    : '<span class="chat-ref-badge chat-ref-review">Cần rà soát</span>'
                return `
                    <div class="chat-ref-row">
                        <span class="chat-ref-name">${name}</span>
                        <span class="chat-ref-file">📄 ${this.escape(h.fileName)}${time}</span>
                        ${badge}
                    </div>`
            })
            .join('')

        return `<div class="chat-ref-list">${rows}</div>`
    }

    /** Render câu trả lời hỏi đáp nghiệp vụ (RAG) */
    renderAnswer(response: AssistantAskResponse): string {
        let html = `<div class="chat-answer">${this.escape(response.answer)}</div>`

        const citations = response.citations ?? []
        if (citations.length > 0) {
            const items = citations
                .map((citation) => {
                    const docNumber = citation.docNumber ? ` (${this.escape(citation.docNumber)})` : ''
                    const excerpt = citation.excerpt
                        ? `<div class="chat-citation-excerpt">${this.escape(citation.excerpt)}</div>`
                        : ''
                    return `<li class="chat-citation"><b>${this.escape(citation.title)}</b>${docNumber}${excerpt}</li>`
                })
                .join('')

            html += `
                <details class="chat-citations">
                    <summary>📚 Nguồn tham khảo (${citations.length})</summary>
                    <ul>${items}</ul>
                </details>
            `
        }

        return html
    }

    /**
     * Kết quả đối chiếu chéo trong luồng streaming — hiện NGAY khi sự kiện "cross"
     * về (trước khi kiểm tra từng hồ sơ): sơ đồ file ⇄ file + danh sách vấn đề chéo.
     */
    renderStreamCross(crossIssues: CrossIssue[], conflicts: StreamConflictEntry[]): string {
        return this.renderConflictMap(conflicts) + this.renderCrossIssues(crossIssues)
    }

    /** Tổng kết cuối của luồng streaming: thống kê chung + từng file (chỉ render hồ sơ có vấn đề). */
    renderStreamSummary(
        done: Xml130StreamEvent,
        perFile: Map<string, StreamFileStats>,
        fileErrors: Map<string, string>,
    ): string {
        let html = `<div class="chat-result-summary">✅ Đã kiểm tra xong <b>${done.hosoCount ?? 0}</b> hồ sơ · `
            + `⚠ <b>${done.riskCount ?? 0}</b> hồ sơ nguy cơ xuất toán · `
            + `tổng <b>${done.issueCount ?? 0}</b> vấn đề · `
            + `đối chiếu chéo <b>${done.crossCount ?? 0}</b> vấn đề (đã hiện ở trên)</div>`
        if (done.summary) {
            html += `<div class="chat-result-text">${this.escape(done.summary)}</div>`
        }

        for (const [fileName, error] of fileErrors) {
            html += `
                <details class="chat-batch-file" open>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(fileName)}</span>
                        <span class="chat-batch-note">Không đọc được</span></summary>
                    <div class="chat-batch-file-body"><div class="chat-issue chat-issue-error">❌ ${this.escape(error)}</div></div>
                </details>`
        }

        for (const [fileName, stats] of perFile) {
            if (fileErrors.has(fileName)) continue
            const note = stats.hosoCount === 0
                ? 'Không đủ thông tin'
                : stats.riskCount > 0
                  ? `${stats.riskCount}/${stats.hosoCount} hồ sơ nguy cơ xuất toán · ${stats.issueCount} vấn đề`
                  : `${stats.hosoCount} hồ sơ · ${stats.issueCount} vấn đề`
            const cleanCount = stats.hosoCount - stats.results.length
            const body =
                stats.results.map((hoso) => this.renderHoso(hoso)).join('') +
                (cleanCount > 0
                    ? `<div class="chat-hoso-clean">✔ ${cleanCount} hồ sơ còn lại không phát hiện vấn đề.</div>`
                    : '')
            // File có vấn đề mở sẵn; file sạch thu gọn để lô lớn không quá dài
            html += `
                <details class="chat-batch-file"${stats.results.length > 0 ? ' open' : ''}>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(fileName)}</span>
                        <span class="chat-batch-note">${this.escape(note)}</span></summary>
                    <div class="chat-batch-file-body">${body}</div>
                </details>`
        }

        return html
    }

    /** Render một hồ sơ bệnh nhân trong kết quả */
    renderHoso(hoso: HosoResult): string {
        const riskBadge = hoso.xuatToanRisk ? '<span class="chat-badge-risk">Nguy cơ xuất toán</span>' : ''
        const header = `
            <div class="chat-hoso-header">
                <span class="chat-hoso-name">${this.escape(hoso.hoTen || hoso.maLk)}</span>
                ${riskBadge}
            </div>
            <div class="chat-hoso-meta">Mã LK: ${this.escape(hoso.maLk)} · Mã thẻ: ${this.escape(hoso.maThe)} · ${hoso.issueCount} vấn đề</div>
        `

        if (!hoso.issues || hoso.issues.length === 0) {
            return `<div class="chat-hoso">${header}<div class="chat-hoso-clean">Không phát hiện vấn đề</div></div>`
        }

        let groupsHtml = ''
        for (const group of ChatMessageRenderer.GROUP_ORDER) {
            const issues = hoso.issues.filter((issue) => issue.group === group)
            if (issues.length === 0) continue

            const title = ChatMessageRenderer.GROUP_TITLES[group]
            const issuesHtml = this.renderDedupedIssues(issues)
            groupsHtml += `
                <div class="chat-issue-group">
                    <div class="chat-issue-group-title">${title} (${issues.length})</div>
                    ${issuesHtml}
                </div>
            `
        }

        return `<div class="chat-hoso">${header}${groupsHtml}</div>`
    }

    /**
     * Gộp các vấn đề lặp lại (cùng bảng/trường/thông báo, chỉ khác dòng) thành MỘT
     * mục kèm badge ×N và danh sách dòng — tránh "TT_THAU dài 34 ký tự..." lặp
     * hàng chục lần khi cả bảng cùng dính một lỗi.
     */
    private renderDedupedIssues(issues: ValidationIssue[]): string {
        const groups = new Map<string, { issue: ValidationIssue; rows: number[]; count: number }>()
        for (const issue of issues) {
            const key = `${issue.severity}|${issue.table ?? ''}|${issue.field ?? ''}|${issue.message}`
            const existing = groups.get(key)
            if (existing) {
                existing.count++
                if (issue.rowIndex !== undefined && issue.rowIndex !== null) existing.rows.push(issue.rowIndex)
            } else {
                groups.set(key, {
                    issue,
                    rows: issue.rowIndex !== undefined && issue.rowIndex !== null ? [issue.rowIndex] : [],
                    count: 1,
                })
            }
        }
        return [...groups.values()].map((g) => this.renderIssue(g.issue, g.count, g.rows)).join('')
    }

    /** Render một vấn đề (đã gộp): icon severity + message + badge ×N + suggestion + badge xuất toán */
    private renderIssue(issue: ValidationIssue, count = 1, rows: number[] = []): string {
        const icon = this.getSeverityIcon(issue.severity)
        const countBadge = count > 1 ? `<span class="chat-issue-count">×${count}</span>` : ''
        const riskBadge = issue.xuatToanRisk ? '<span class="chat-badge-risk">Nguy cơ xuất toán</span>' : ''
        const location = this.buildIssueLocation(issue, rows)
        const suggestion = issue.suggestion
            ? `<div class="chat-issue-suggestion">💡 ${this.escape(issue.suggestion)}</div>`
            : ''

        return `
            <div class="chat-issue chat-issue-${issue.severity}">
                <div class="chat-issue-line">
                    ${icon}
                    <span class="chat-issue-message">${this.escape(issue.message)}</span>
                    ${countBadge}
                    ${riskBadge}
                </div>
                ${location}
                ${suggestion}
            </div>
        `
    }

    /** Dòng phụ: vị trí lỗi (bảng/trường/các dòng/giá trị) nếu có */
    private buildIssueLocation(issue: ValidationIssue, rows: number[] = []): string {
        const parts: string[] = []
        if (issue.table) parts.push(`Bảng: ${this.escape(issue.table)}`)
        if (issue.field) parts.push(`Trường: ${this.escape(issue.field)}`)

        if (rows.length > 1) {
            const shown = rows.slice(0, 10).join(', ')
            const more = rows.length > 10 ? ` (+${rows.length - 10} dòng nữa)` : ''
            parts.push(`Dòng: ${shown}${more}`)
        } else if (issue.rowIndex !== undefined && issue.rowIndex !== null) {
            parts.push(`Dòng: ${issue.rowIndex}`)
        }

        if (issue.value) parts.push(`Giá trị: "${this.escape(issue.value)}"`)

        return parts.length > 0 ? `<div class="chat-issue-location">${parts.join(' · ')}</div>` : ''
    }

    private getSeverityIcon(severity: IssueSeverity): string {
        return `<span class="chat-sev chat-sev-${severity}">●</span>`
    }

    /** Escape HTML để tránh XSS từ dữ liệu server/người dùng */
    private escape(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }
}
