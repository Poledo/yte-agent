/**
 * Xuất báo cáo ra .xlsx (Excel) — mỗi phần một sheet.
 *
 * Đây là bản ĐẦY ĐỦ: không cắt bớt dòng như Word/PDF, vì Excel là nơi người dùng
 * lọc và đối chiếu tiếp. Dùng inlineStr nên không cần sharedStrings, và bỏ qua
 * styles.xml (phần tùy chọn của chuẩn) để gói chỉ còn vài file.
 */

import { ZipWriter, type ZipEntry } from '../../../shared/file/ZipWriter'
import { escapeXml, fileTypeIcon, safeFileName, saveBlob, type IReportExporter } from './ReportExporter'
import { buildReportTables, type ReportTable } from './ReportTables'
import type { ResultReport } from './ResultReport'

export class ExcelReportExporter implements IReportExporter {
    readonly id = 'excel'
    readonly icon = fileTypeIcon('#217346', 'X', 10)
    readonly label = 'Tải bản Excel (.xlsx) - đầy đủ, lọc được'

    private static readonly NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    private static readonly NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    /** Excel giới hạn tên sheet 31 ký tự và cấm : \ / ? * [ ] */
    private static readonly SHEET_NAME_MAX = 31

    async export(report: ResultReport): Promise<void> {
        const tables = buildReportTables(report)
        const names = this.uniqueSheetNames(tables)

        const entries: ZipEntry[] = [
            { name: '[Content_Types].xml', data: ZipWriter.text(this.contentTypes(tables.length)) },
            { name: '_rels/.rels', data: ZipWriter.text(ExcelReportExporter.ROOT_RELS) },
            { name: 'xl/workbook.xml', data: ZipWriter.text(this.workbook(names)) },
            { name: 'xl/_rels/workbook.xml.rels', data: ZipWriter.text(this.workbookRels(tables.length)) },
            ...tables.map((table, index) => ({
                name: `xl/worksheets/sheet${index + 1}.xml`,
                data: ZipWriter.text(this.sheet(table)),
            })),
        ]

        saveBlob(
            ZipWriter.build(entries, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
            `${safeFileName(report.fileBase)}.xlsx`,
        )
    }

    private sheet(table: ReportTable): string {
        const rows = [table.headers, ...table.rows, ...(table.note ? [[table.note]] : [])]
        const body = rows
            .map((cells, rowIndex) => {
                const cellsXml = cells
                    .map((value, colIndex) => {
                        const ref = `${this.columnName(colIndex)}${rowIndex + 1}`
                        // Ô nhiều dòng: Excel chỉ xuống dòng khi bật wrapText (cần styles.xml),
                        // nên nối bằng " | " cho đọc được ngay mà gói vẫn tối giản.
                        const text = String(value ?? '').replace(/\n/g, ' | ')
                        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`
                    })
                    .join('')
                return `<row r="${rowIndex + 1}">${cellsXml}</row>`
            })
            .join('')

        const cols = `<cols><col min="1" max="${Math.max(1, table.headers.length)}" width="26" customWidth="1"/></cols>`
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            `<worksheet xmlns="${ExcelReportExporter.NS}">${cols}<sheetData>${body}</sheetData></worksheet>`
        )
    }

    /** Chỉ số cột 0 → "A", 26 → "AA". */
    private columnName(index: number): string {
        let name = ''
        let n = index
        do {
            name = String.fromCharCode(65 + (n % 26)) + name
            n = Math.floor(n / 26) - 1
        } while (n >= 0)
        return name
    }

    /** Tên sheet đã cắt ngắn, bỏ ký tự cấm và bảo đảm không trùng nhau. */
    private uniqueSheetNames(tables: ReportTable[]): string[] {
        const used = new Set<string>()
        return tables.map((table, index) => {
            const base =
                table.title.replace(/[:\\/?*[\]]/g, ' ').slice(0, ExcelReportExporter.SHEET_NAME_MAX) ||
                `Phần ${index + 1}`
            let name = base
            let suffix = 2
            while (used.has(name)) {
                name = `${base.slice(0, ExcelReportExporter.SHEET_NAME_MAX - 2)} ${suffix++}`
            }
            used.add(name)
            return name
        })
    }

    private workbook(names: string[]): string {
        const sheets = names
            .map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
            .join('')
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            `<workbook xmlns="${ExcelReportExporter.NS}" xmlns:r="${ExcelReportExporter.NS_REL}">` +
            `<sheets>${sheets}</sheets></workbook>`
        )
    }

    private workbookRels(count: number): string {
        const rels = Array.from(
            { length: count },
            (_, index) =>
                `<Relationship Id="rId${index + 1}" Type="${ExcelReportExporter.NS_REL}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        ).join('')
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
        )
    }

    private contentTypes(count: number): string {
        const sheets = Array.from(
            { length: count },
            (_, index) =>
                `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        ).join('')
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            sheets +
            '</Types>'
        )
    }

    private static readonly ROOT_RELS =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
}
