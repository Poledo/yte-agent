/**
 * Ghi file ZIP tối giản (method "store" — không nén) ngay trong trình duyệt.
 *
 * Vì sao tự viết: .docx và .xlsx đều là gói ZIP chứa XML. Kéo một thư viện zip
 * vào bundle content script chỉ để xuất báo cáo là quá nặng, trong khi phần ZIP
 * cần dùng chỉ có local header + central directory + EOCD. Không nén nên file
 * to hơn một chút, đổi lại không cần deflate.
 *
 * Trách nhiệm duy nhất (SRP): gom danh sách {tên, nội dung} thành một Blob ZIP.
 */

/**
 * Mảng byte cấp phát trên ArrayBuffer thường. Nói rõ kiểu vì `Blob` không nhận
 * `SharedArrayBuffer` — để `Uint8Array` trống sẽ là `ArrayBufferLike` và không
 * gán được vào `BlobPart`.
 */
export type ZipBytes = Uint8Array<ArrayBuffer>

export interface ZipEntry {
    /** Đường dẫn trong gói, luôn dùng dấu "/" (vd "word/document.xml"). */
    name: string
    data: ZipBytes
}

export class ZipWriter {
    private static crcTable: Uint32Array | null = null

    /** Đóng gói các entry thành Blob ZIP. Thứ tự entry được giữ nguyên. */
    static build(entries: ZipEntry[], mimeType: string): Blob {
        const encoder = new TextEncoder()
        const parts: BlobPart[] = []
        const central: ZipBytes[] = []
        const stamp = ZipWriter.dosStamp(new Date())
        let offset = 0

        for (const entry of entries) {
            const name = encoder.encode(entry.name)
            const crc = ZipWriter.crc32(entry.data)
            const size = entry.data.length

            const local = new Uint8Array(30 + name.length)
            const lv = new DataView(local.buffer)
            lv.setUint32(0, 0x04034b50, true)
            lv.setUint16(4, 20, true) // phiên bản tối thiểu để giải nén
            lv.setUint16(6, 0x0800, true) // cờ: tên file mã hóa UTF-8
            lv.setUint16(8, 0, true) // method 0 = store
            lv.setUint16(10, stamp.time, true)
            lv.setUint16(12, stamp.date, true)
            lv.setUint32(14, crc, true)
            lv.setUint32(18, size, true)
            lv.setUint32(22, size, true)
            lv.setUint16(26, name.length, true)
            local.set(name, 30)
            parts.push(local, entry.data)

            const dir = new Uint8Array(46 + name.length)
            const dv = new DataView(dir.buffer)
            dv.setUint32(0, 0x02014b50, true)
            dv.setUint16(4, 20, true) // version made by
            dv.setUint16(6, 20, true) // version needed
            dv.setUint16(8, 0x0800, true)
            dv.setUint16(10, 0, true)
            dv.setUint16(12, stamp.time, true)
            dv.setUint16(14, stamp.date, true)
            dv.setUint32(16, crc, true)
            dv.setUint32(20, size, true)
            dv.setUint32(24, size, true)
            dv.setUint16(28, name.length, true)
            dv.setUint32(42, offset, true)
            dir.set(name, 46)
            central.push(dir)

            offset += local.length + size
        }

        const centralSize = central.reduce((sum, block) => sum + block.length, 0)
        const end = new Uint8Array(22)
        const ev = new DataView(end.buffer)
        ev.setUint32(0, 0x06054b50, true)
        ev.setUint16(8, entries.length, true)
        ev.setUint16(10, entries.length, true)
        ev.setUint32(12, centralSize, true)
        ev.setUint32(16, offset, true)

        return new Blob([...parts, ...central, end], { type: mimeType })
    }

    /** Tiện ích: chuỗi XML → mảng byte UTF-8. */
    static text(value: string): ZipBytes {
        return new TextEncoder().encode(value)
    }

    private static crc32(data: ZipBytes): number {
        const table = (ZipWriter.crcTable ??= ZipWriter.buildCrcTable())
        let crc = 0xffffffff
        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
        }
        return (crc ^ 0xffffffff) >>> 0
    }

    private static buildCrcTable(): Uint32Array {
        const table = new Uint32Array(256)
        for (let i = 0; i < 256; i++) {
            let value = i
            for (let bit = 0; bit < 8; bit++) {
                value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
            }
            table[i] = value >>> 0
        }
        return table
    }

    /** Thời điểm sửa file theo định dạng MS-DOS mà ZIP dùng. */
    private static dosStamp(when: Date): { date: number; time: number } {
        const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()
        const time = (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2)
        return { date, time }
    }
}
