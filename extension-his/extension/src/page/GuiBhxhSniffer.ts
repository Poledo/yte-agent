/**
 * GuiBhxhSniffer — chạy trong PAGE CONTEXT (MAIN world) trên VNPT-HIS
 * (vnpt-his.vncare.vn), bắt tham số của lượt "Xuất XML KMH" ở màn hình
 * Gửi bảo hiểm 4210.
 *
 * Vì sao cần: content script nằm ở isolated world không đọc được body request
 * của trang, mà webRequest MV3 cũng không đọc được nội dung. Script này vá
 * XMLHttpRequest/fetch ngay trong context của trang nên đọc được body NGAY
 * LÚC người dùng bấm Xuất XML KMH — extension giữ lại bộ tham số đó để gọi
 * lấy file XML khi người dùng bấm kiểm tra, không phải đoán lại tham số.
 *
 * An toàn với trang HIS: chỉ ĐỌC, luôn gọi hàm gốc trước và trả nguyên kết
 * quả; mọi lỗi phân tích đều nuốt trong try/catch để không hỏng nghiệp vụ HIS.
 */

import {
    GUI_BHXH_API_MARK,
    GUI_BHXH_EVENT,
    GUI_BHXH_FUNC_MARK,
    GUI_BHXH_REQUEST_EVENT,
    GUI_KYTONG_API_MARK,
    GUI_KYTONG_EVENT,
    GUI_KYTONG_REQUEST_EVENT,
    GuiBhxhExportCapture,
    GuiKyTongCapture,
} from '../shared/his/GuiBhxhChannel'

/** Cờ chống vá chồng khi script bị nạp hai lần (iframe/tải lại một phần). */
const INSTALLED_FLAG = '__zcGuiBhxhSnifferInstalled__'

/** Lần chụp gần nhất — giữ lại để trả lời khi content script xin. */
let lastCapture: GuiBhxhExportCapture | null = null

/** Lượt tải XML Ký tổng gần nhất (URL + JWT) — cũng giữ lại để trả lời khi được hỏi. */
let lastKyTong: GuiKyTongCapture | null = null

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
}

/**
 * Đọc body request và rút tham số nếu đây là lượt XUAT.XML. Trả null nếu không
 * phải (request nghiệp vụ khác) — người gọi tự bỏ qua.
 */
function captureFrom(url: string, body: unknown): GuiBhxhExportCapture | null {
    try {
        if (!url.toLowerCase().includes(GUI_BHXH_API_MARK)) return null
        const raw = typeof body === 'string' ? body : text(body)
        if (raw === '' || !raw.toLowerCase().includes(GUI_BHXH_FUNC_MARK)) return null

        const payload = JSON.parse(raw) as { func?: string; params?: unknown[]; uuid?: unknown } | null
        if (payload?.func !== 'ajaxCALL_SP_X' || !Array.isArray(payload.params)) return null
        const paramsJson = text(payload.params[1])
        if (paramsJson === '') return null

        const inner = JSON.parse(paramsJson) as Record<string, unknown> | null
        if (!inner) return null

        const maLkList = text(inner.DS_MALK)
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '' && s !== '-1')

        return {
            paramsJson,
            maLkList,
            hcode: text(inner.HCODE),
            uuid: text(payload.uuid),
            at: Date.now(),
        }
    } catch {
        // Body không phải JSON mong đợi → không phải lượt xuất XML, bỏ qua
        return null
    }
}

/**
 * Đọc giá trị header (không phân biệt hoa thường) từ đủ dạng headers mà trang
 * có thể truyền: object thường, Headers, hoặc mảng cặp [tên, giá trị].
 */
function headerValue(headers: unknown, name: string): string {
    try {
        if (!headers) return ''
        if (typeof (headers as Headers).get === 'function') return text((headers as Headers).get(name))
        if (Array.isArray(headers)) {
            for (const pair of headers) {
                if (Array.isArray(pair) && text(pair[0]).toLowerCase() === name) return text(pair[1])
            }
            return ''
        }
        const record = headers as Record<string, unknown>
        for (const key of Object.keys(record)) {
            if (key.toLowerCase() === name) return text(record[key])
        }
        return ''
    } catch {
        return ''
    }
}

/**
 * Nhận diện lượt tải file XML Ký tổng (IdgStorageUpload?xmlid=...). URL và JWT
 * nằm sẵn trên request nên bắt được NGAY lúc gọi, không cần đọc phản hồi.
 */
function captureKyTongFrom(url: string, headers: unknown): GuiKyTongCapture | null {
    try {
        if (!url.toLowerCase().includes(GUI_KYTONG_API_MARK)) return null
        return { url, auth: headerValue(headers, 'authorization'), at: Date.now() }
    } catch {
        return null
    }
}

function emitKyTong(capture: GuiKyTongCapture): void {
    try {
        document.dispatchEvent(new CustomEvent(GUI_KYTONG_EVENT, { detail: JSON.stringify(capture) }))
    } catch {
        // Không để lỗi của sniffer ảnh hưởng trang HIS
    }
}

function publishKyTong(capture: GuiKyTongCapture | null): void {
    if (!capture) return
    lastKyTong = capture
    emitKyTong(capture)
    console.log('[GuiBhxhSniffer] Đã ghi nhận lượt Xuất XML Ký tổng')
}

function emit(capture: GuiBhxhExportCapture): void {
    try {
        // detail là CHUỖI: đi qua ranh giới hai world an toàn, không dính tham chiếu.
        document.dispatchEvent(new CustomEvent(GUI_BHXH_EVENT, { detail: JSON.stringify(capture) }))
    } catch {
        // Không để lỗi của sniffer ảnh hưởng trang HIS
    }
}

function publish(url: string, body: unknown): void {
    const capture = captureFrom(url, body)
    if (!capture) return
    lastCapture = capture
    emit(capture)
    console.log(
        `[GuiBhxhSniffer] Đã ghi nhận lượt Xuất XML KMH: ${capture.maLkList.length} bệnh nhân, cơ sở ${capture.hcode}`,
    )
}

/** Đọc nội dung phản hồi KHÔNG cần — chỉ cần body REQUEST, nên không gắn load listener. */
function patchXhr(): void {
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader
    const URL_KEY = '__zcUrl'
    const HEADERS_KEY = '__zcHeaders'
    type AnyFn = (...args: unknown[]) => void

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]): void {
        try {
            ;(this as unknown as Record<string, unknown>)[URL_KEY] = text(args[1])
        } catch {
            // Không cản trở lời gọi gốc
        }
        return (originalOpen as unknown as AnyFn).apply(this, args)
    } as typeof XMLHttpRequest.prototype.open

    // Header được đặt SAU open, TRƯỚC send — gom lại để lúc send còn đọc được JWT.
    XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, ...args: unknown[]): void {
        try {
            const self = this as unknown as Record<string, unknown>
            const record = (self[HEADERS_KEY] ??= {}) as Record<string, string>
            record[text(args[0]).toLowerCase()] = text(args[1])
        } catch {
            // Không cản trở lời gọi gốc
        }
        return (originalSetHeader as unknown as AnyFn).apply(this, args)
    } as typeof XMLHttpRequest.prototype.setRequestHeader

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: unknown[]): void {
        try {
            const self = this as unknown as Record<string, unknown>
            const url = text(self[URL_KEY])
            publishKyTong(captureKyTongFrom(url, self[HEADERS_KEY]))
            publish(url, args[0])
        } catch {
            // Không cản trở lời gọi gốc
        }
        return (originalSend as unknown as AnyFn).apply(this, args)
    } as typeof XMLHttpRequest.prototype.send
}

function patchFetch(): void {
    if (typeof window.fetch !== 'function') return
    const originalFetch = window.fetch

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        try {
            const url =
                typeof input === 'string' ? input : input instanceof URL ? input.href : text((input as Request).url)
            publishKyTong(captureKyTongFrom(url, init?.headers))
            const body = init?.body
            if (typeof body === 'string') publish(url, body)
        } catch {
            // Không cản trở lời gọi gốc
        }
        return originalFetch.call(window, input as RequestInfo, init)
    }
}

function install(): void {
    const flags = window as unknown as Record<string, unknown>
    if (flags[INSTALLED_FLAG]) return
    flags[INSTALLED_FLAG] = true

    patchXhr()
    patchFetch()

    // Content script nạp SAU (document_idle) hoặc người dùng bấm Xuất XML trước khi
    // mở panel → trả lại lần chụp gần nhất khi được hỏi.
    document.addEventListener(GUI_BHXH_REQUEST_EVENT, () => {
        if (lastCapture) emit(lastCapture)
    })
    document.addEventListener(GUI_KYTONG_REQUEST_EVENT, () => {
        if (lastKyTong) emitKyTong(lastKyTong)
    })

    console.log('[GuiBhxhSniffer] Đã cài trong page context')
}

install()
