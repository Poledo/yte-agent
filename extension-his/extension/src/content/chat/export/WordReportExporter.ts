/**
 * Xuất báo cáo ra .docx (Word).
 *
 * .docx là gói ZIP chứa OOXML — dựng tay ba phần tối thiểu ([Content_Types],
 * quan hệ gốc, word/document.xml) là Word mở được, khỏi kéo thư viện vào bundle.
 * Trang đặt NGANG vì bảng vấn đề có 13 cột, để dọc thì chữ bị bóp nát.
 */

import { ZipWriter, type ZipEntry } from '../../../shared/file/ZipWriter'
import { escapeXml, fileTypeIcon, safeFileName, saveBlob, type IReportExporter } from './ReportExporter'
import { buildReportTables, READABLE_ROW_LIMIT, type ReportTable } from './ReportTables'
import type { ResultReport } from './ResultReport'

export class WordReportExporter implements IReportExporter {
    readonly id = 'word'
    readonly icon = fileTypeIcon('#2b579a', 'W', 10)
    readonly label = 'Tải bản Word (.docx)'

    /** Khổ A4 ngang, trừ lề trái/phải 1440 twip mỗi bên. */
    private static readonly USABLE_WIDTH = 16838 - 1440 * 2

    async export(report: ResultReport): Promise<void> {
        const tables = buildReportTables(report, READABLE_ROW_LIMIT)
        const body =
            this.heading(report.title, 1) +
            this.paragraph(`Xuất lúc ${report.createdAt} từ extension ZeroCheck AI`, { italic: true }) +
            tables.map((table) => this.section(table)).join('') +
            this.sectionProperties()

        const document =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
            `<w:body>${body}</w:body></w:document>`

        const entries: ZipEntry[] = [
            { name: '[Content_Types].xml', data: ZipWriter.text(WordReportExporter.CONTENT_TYPES) },
            { name: '_rels/.rels', data: ZipWriter.text(WordReportExporter.ROOT_RELS) },
            { name: 'word/document.xml', data: ZipWriter.text(document) },
        ]
        saveBlob(
            ZipWriter.build(entries, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            `${safeFileName(report.fileBase)}.docx`,
        )
    }

    private section(table: ReportTable): string {
        const width = Math.floor(WordReportExporter.USABLE_WIDTH / table.headers.length)
        const header = this.row(table.headers, width, true)
        const rows = table.rows.map((cells) => this.row(cells, width, false)).join('')
        const note = table.note ? this.paragraph(table.note, { italic: true }) : ''
        return (
            this.heading(table.title, 2) +
            '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>' +
            ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
                .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`)
                .join('') +
            `</w:tblBorders></w:tblPr>${header}${rows}</w:tbl>` +
            note
        )
    }

    private row(cells: string[], width: number, header: boolean): string {
        const tcs = cells
            .map(
                (cell) =>
                    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>` +
                    (header ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF1F8"/>' : '') +
                    `</w:tcPr>${this.paragraph(cell, { bold: header })}</w:tc>`,
            )
            .join('')
        return `<w:tr>${tcs}</w:tr>`
    }

    private heading(text: string, level: 1 | 2): string {
        return this.paragraph(text, { bold: true, size: level === 1 ? 32 : 26, spaceBefore: 240 })
    }

    /** Một đoạn văn; xuống dòng trong ô được giữ bằng <w:br/>. */
    private paragraph(
        text: string,
        options: { bold?: boolean; italic?: boolean; size?: number; spaceBefore?: number } = {},
    ): string {
        const runProps =
            '<w:rPr>' +
            (options.bold ? '<w:b/>' : '') +
            (options.italic ? '<w:i/>' : '') +
            (options.size ? `<w:sz w:val="${options.size}"/>` : '<w:sz w:val="20"/>') +
            '</w:rPr>'
        const runs = String(text ?? '')
            .split('\n')
            .map((line, index) => {
                const br = index > 0 ? '<w:br/>' : ''
                return `<w:r>${runProps}${br}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`
            })
            .join('')
        const paraProps = options.spaceBefore ? `<w:pPr><w:spacing w:before="${options.spaceBefore}"/></w:pPr>` : ''
        return `<w:p>${paraProps}${runs}</w:p>`
    }

    private sectionProperties(): string {
        return (
            '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' +
            '<w:pgMar w:top="1134" w:right="1440" w:bottom="1134" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>' +
            '</w:sectPr>'
        )
    }

    private static readonly CONTENT_TYPES =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>'

    private static readonly ROOT_RELS =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>'
}
