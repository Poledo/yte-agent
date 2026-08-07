/**
 * PaymentListSniffer — chạy trong PAGE CONTEXT (MAIN world), không phải content script.
 *
 * Vì sao cần:
 * Màn hình "Kiểm tra bảng kê" của HIS lấy danh sách phiếu thanh toán bằng AJAX
 * (jqGrid). Content script nằm ở isolated world nên không thấy phản hồi đó, mà
 * chrome.webRequest của MV3 cũng KHÔNG đọc được nội dung phản hồi. Script này chạy
 * đúng trong context của trang nên vá được XMLHttpRequest/fetch thật để đọc kết quả
 * NGAY LÚC người dùng bấm Xem thông tin — nhờ vậy khi bấm nút kiểm tra hàng loạt, extension
 * dùng lại danh sách đã có, không phải gọi HIS tìm kiếm lần nữa.
 *
 * An toàn với trang HIS: chỉ ĐỌC, luôn gọi hàm gốc trước và trả nguyên kết quả;
 * mọi lỗi phân tích đều nuốt trong try/catch để không làm hỏng nghiệp vụ của HIS.
 */

import {
    PAYMENT_LIST_API_MARK,
    PAYMENT_LIST_EVENT,
    PAYMENT_LIST_REQUEST_EVENT,
    PAYMENT_ROW_API_MARKS,
    PAYMENT_ROW_EVENT,
    PAYMENT_ROW_INFO_MARK,
    PAYMENT_ROW_PARAM,
    PaymentListSnapshot,
    PaymentRowSelection,
    PaymentTicket,
} from '../shared/his/PaymentListChannel'

/** Cờ chống vá chồng khi script bị nạp hai lần (trang có iframe/tải lại một phần). */
const INSTALLED_FLAG = '__zcPaymentListSnifferInstalled__'

/** Lần chụp gần nhất — giữ lại để trả lời khi content script xin (xem PAYMENT_LIST_REQUEST_EVENT). */
let lastSnapshot: PaymentListSnapshot | null = null

/** Dòng đang chọn gần nhất — cũng trả lại khi content script xin. */
let lastRow: PaymentRowSelection | null = null

function isPaymentListUrl(url: string): boolean {
    return url.toLowerCase().includes(PAYMENT_LIST_API_MARK)
}

function isRowSelectUrl(url: string): boolean {
    const lower = url.toLowerCase()
    return PAYMENT_ROW_API_MARKS.some((mark) => lower.includes(mark))
}

/** API thông tin hành chính — cần đọc phản hồi để lấy tên bệnh nhân. */
function isRowInfoUrl(url: string): boolean {
    return url.toLowerCase().includes(PAYMENT_ROW_INFO_MARK)
}

/** Đọc số vào viện trên query string, '' nếu URL không có. */
function admissionOf(url: string): string {
    try {
        return (new URL(url, location.href).searchParams.get(PAYMENT_ROW_PARAM) ?? '').trim()
    } catch {
        return '' // URL lạ → coi như không nhận ra
    }
}

/**
 * Ghi nhận dòng người dùng vừa chọn. Số vào viện nằm ngay trên query string nên biết
 * NGAY lúc gọi — nút kiểm tra mở khóa liền, không phải chờ phản hồi.
 */
function publishRow(url: string): void {
    const soVaoVien = admissionOf(url)
    if (soVaoVien === '') return
    if (lastRow?.soVaoVien === soVaoVien) return // vẫn dòng cũ (HIS gọi nhiều API cho một lượt chọn)
    lastRow = { soVaoVien, tenBenhNhan: '', at: Date.now(), url }
    emitRow(lastRow)
    console.log(`[PaymentListSniffer] Dòng đang chọn: số vào viện ${soVaoVien}`)
}

/**
 * Bổ sung tên bệnh nhân cho dòng đang chọn từ phản hồi API thông tin hành chính.
 * Bỏ qua nếu người dùng đã kịp chọn dòng khác trong lúc chờ phản hồi.
 */
function publishRowName(url: string, body: string): void {
    const soVaoVien = admissionOf(url)
    if (soVaoVien === '' || lastRow?.soVaoVien !== soVaoVien) return
    try {
        const info = JSON.parse(body) as Record<string, unknown> | null
        const tenBenhNhan = text(info?.TEN_BENH_NHAN).trim()
        if (tenBenhNhan === '' || tenBenhNhan === lastRow.tenBenhNhan) return
        lastRow = { ...lastRow, tenBenhNhan }
        emitRow(lastRow)
    } catch {
        // Phản hồi không phải JSON → giữ nguyên, nút vẫn dùng số vào viện
    }
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
}

/**
 * Rút các dòng phiếu thanh toán từ phản hồi. HIS trả về mảng thuần, nhưng jqGrid
 * cũng hay dùng dạng { rows: [...] } nên nhận cả hai cho chắc.
 * Trả về null nếu phản hồi không phải danh sách (không phải thứ ta quan tâm).
 */
function toTickets(payload: unknown): PaymentTicket[] | null {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { rows?: unknown })?.rows)
          ? (payload as { rows: unknown[] }).rows
          : null
    if (!rows) return null

    const tickets: PaymentTicket[] = []
    for (const row of rows) {
        const record = row as Record<string, unknown> | null
        const soVaoVien = text(record?.SOVAOVIEN).trim()
        if (soVaoVien === '') continue // dòng không có số vào viện thì không tải được XML 130
        tickets.push({
            soVaoVien,
            soPhieu: text(record?.SOPHIEUTHANHTOAN),
            tenBenhNhan: text(record?.TEN_BENH_NHAN),
            ngayKham: text(record?.NGAY_KHAM_BENH),
        })
    }
    return tickets
}

function dispatch(eventName: string, payload: unknown): void {
    try {
        // detail là CHUỖI: dữ liệu đi qua ranh giới hai world an toàn, không dính
        // tham chiếu object của trang.
        document.dispatchEvent(new CustomEvent(eventName, { detail: JSON.stringify(payload) }))
    } catch {
        // Không để lỗi của sniffer ảnh hưởng trang HIS
    }
}

function emit(snapshot: PaymentListSnapshot): void {
    dispatch(PAYMENT_LIST_EVENT, snapshot)
}

function emitRow(row: PaymentRowSelection): void {
    dispatch(PAYMENT_ROW_EVENT, row)
}

/** Phân tích phản hồi và phát cho content script (kể cả khi tìm được 0 phiếu). */
function publish(url: string, body: string): void {
    try {
        const tickets = toTickets(JSON.parse(body))
        if (!tickets) return
        lastSnapshot = { items: tickets, at: Date.now(), url }
        emit(lastSnapshot)
        console.log(`[PaymentListSniffer] Đã ghi nhận ${tickets.length} phiếu thanh toán`)
    } catch {
        // Phản hồi không phải JSON (trang login, lỗi HTML...) → bỏ qua
    }
}

/** Đọc nội dung phản hồi XHR theo responseType mà trang đặt. */
function readXhrBody(xhr: XMLHttpRequest): string | null {
    try {
        if (xhr.responseType === '' || xhr.responseType === 'text') return xhr.responseText
        if (xhr.responseType === 'json') return JSON.stringify(xhr.response)
    } catch {
        // responseText ném lỗi khi responseType khác → coi như không đọc được
    }
    return null
}

function patchXhr(): void {
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    /** Khóa lưu URL trên chính đối tượng XHR để lúc send còn biết đang gọi đâu. */
    const URL_KEY = '__zcUrl'

    // open/send có nhiều overload; nhận ...args rồi chuyển nguyên xi cho hàm gốc để
    // giữ đúng ngữ nghĩa (kể cả XHR đồng bộ), ép kiểu ở khâu gán cho khớp overload.
    type AnyFn = (...args: unknown[]) => void

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]): void {
        try {
            const url = text(args[1])
            ;(this as unknown as Record<string, unknown>)[URL_KEY] = url
            // Chọn dòng: biết ngay từ URL, không cần chờ phản hồi
            if (isRowSelectUrl(url)) publishRow(url)
        } catch {
            // Không cản trở lời gọi gốc
        }
        return (originalOpen as unknown as AnyFn).apply(this, args)
    } as typeof XMLHttpRequest.prototype.open

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: unknown[]): void {
        try {
            const url = text((this as unknown as Record<string, unknown>)[URL_KEY])
            if (isPaymentListUrl(url) || isRowInfoUrl(url)) {
                this.addEventListener('load', () => {
                    const body = readXhrBody(this)
                    if (!body) return
                    if (isPaymentListUrl(url)) {
                        publish(url, body)
                    } else {
                        publishRowName(url, body)
                    }
                })
            }
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
        const promise = originalFetch.call(window, input as RequestInfo, init)
        try {
            const url =
                typeof input === 'string' ? input : input instanceof URL ? input.href : text((input as Request).url)
            if (isRowSelectUrl(url)) publishRow(url)
            if (isPaymentListUrl(url) || isRowInfoUrl(url)) {
                // clone() để không "tiêu thụ" body của trang
                void promise
                    .then((response) => response.clone().text())
                    .then((body) => (isPaymentListUrl(url) ? publish(url, body) : publishRowName(url, body)))
                    .catch(() => undefined)
            }
        } catch {
            // Không cản trở lời gọi gốc
        }
        return promise
    }
}

function install(): void {
    const flags = window as unknown as Record<string, unknown>
    if (flags[INSTALLED_FLAG]) return
    flags[INSTALLED_FLAG] = true

    patchXhr()
    patchFetch()

    // Content script nạp SAU (document_idle) hoặc người dùng bấm Xem thông tin trước khi
    // mở panel → trả lại lần chụp gần nhất khi được hỏi.
    document.addEventListener(PAYMENT_LIST_REQUEST_EVENT, () => {
        if (lastSnapshot) emit(lastSnapshot)
        if (lastRow) emitRow(lastRow)
    })

    console.log('[PaymentListSniffer] Đã cài trong page context')
}

install()
