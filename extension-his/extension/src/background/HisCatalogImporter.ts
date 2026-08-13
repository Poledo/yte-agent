import { ApiConfiguration } from '../content/api/ApiConfiguration'
import {
    CATALOG_EXPORT_ITEMS,
    CATALOG_EXPORT_PAGE_PATH,
    CATALOG_EXPORTER_PATH,
    CATALOG_EXPORTER_PATTERN,
    CATALOG_IMPORT_PROGRESS,
    cleanCatalogLabel,
    emptyCatalogImportState,
    type CatalogFileProgress,
    type CatalogImportState,
} from '../shared/his/CatalogImportChannel'
import { buildLicenseHeaders } from '../shared/license/LicenseSettings'

/** Một file danh mục tìm được trên trang xuất danh mục. */
interface ScrapedFile {
    url: string
    /** Nhãn nút trên trang HIS, vd "1. Xuất DM Xét nghiệm" (có thể rỗng). */
    label: string
}

/** Kết quả quét trang xuất danh mục của HIS. */
interface ScrapeResult {
    /** Mã cơ sở KCB đọc từ `<script ... data-cmu-dvtt="58028">`. */
    dvtt: string
    /** Danh sách file danh mục tìm được trên trang. */
    files: ScrapedFile[]
    /** URL thật của trang sau khi tải xong (phát hiện HIS đá về trang đăng nhập). */
    pageUrl: string
}

/** Kết quả tải MỘT file danh mục từ HIS (chạy trong tab HIS). */
interface DownloadResult {
    ok: boolean
    fileName?: string
    contentType?: string
    /** Nội dung file mã hóa base64 — chỉ chuỗi mới đi qua được kênh executeScript. */
    base64?: string
    size?: number
    error?: string
}

/**
 * Nạp toàn bộ danh mục HIS về hệ thống chỉ bằng một nút bấm.
 *
 * Luồng: tìm tab HIS người dùng ĐANG ĐĂNG NHẬP → mở trang xuất danh mục
 * `{origin}/web_his/export_categories` ở tab nền → quét mã cơ sở KCB
 * (`data-cmu-dvtt`) cùng toàn bộ link `/web_his/exporter_*` → tải từng file bằng
 * chính phiên đăng nhập đó → đẩy về API `/api/catalog/import`.
 *
 * XÁC THỰC: giống HisXmlDownloader — extension KHÔNG tự đăng nhập, KHÔNG xử lý
 * captcha. Con người đã đăng nhập HIS, tiện ích chỉ dùng lại phiên đang mở
 * (fetch cùng origin trong tab HIS, `credentials: 'include'`).
 *
 * BỎ QUA FILE KHÔNG ĐỔI: API nhận `skipUnchanged=true`, so SHA-256 nội dung với
 * bản đang hiệu lực. Danh mục thuốc hàng chục nghìn dòng mà không đổi thì không
 * bị nạp lại, nên bấm nút này mỗi ngày cũng rẻ.
 */
export class HisCatalogImporter {
    /** Chỉ cho phép một lượt nạp tại một thời điểm. */
    private static instance: HisCatalogImporter | null = null

    static shared(): HisCatalogImporter {
        HisCatalogImporter.instance ??= new HisCatalogImporter()
        return HisCatalogImporter.instance
    }

    private state: CatalogImportState = emptyCatalogImportState()
    private cancelled = false
    private readonly api = new ApiConfiguration()

    /** Trạng thái hiện tại — popup mở lại giữa chừng vẫn thấy đúng tiến độ. */
    getState(): CatalogImportState {
        return this.state
    }

    /** Người dùng bấm Dừng: dừng trước file kế tiếp (file đang chạy vẫn chạy nốt). */
    cancel(): void {
        if (this.state.running) {
            this.cancelled = true
            this.patch({ phase: 'Đang dừng…' })
        }
    }

    /** Bắt đầu một lượt nạp. Đang chạy dở thì giữ nguyên lượt cũ. */
    async start(): Promise<CatalogImportState> {
        if (this.state.running) return this.state

        this.cancelled = false
        this.state = { ...emptyCatalogImportState(), running: true, phase: 'Đang tìm trang HIS đang mở…' }
        this.broadcast()

        let createdTabId: number | null = null
        try {
            const origin = await this.findHisOrigin()
            const opened = await this.openExportPage(origin)
            createdTabId = opened.created ? opened.tabId : null

            this.patch({ phase: 'Đang đọc trang xuất danh mục…' })
            const scraped = await this.scrape(opened.tabId)

            // Quét không ra link (HIS đổi giao diện, script chưa kịp gắn sự kiện…)
            // thì dùng danh sách 20 danh mục chép sẵn từ trang xuất danh mục.
            const found = scraped.files.length > 0 ? scraped.files : this.defaultFiles(origin)
            if (found.length === 0) {
                throw new Error(
                    'Không tìm thấy file danh mục nào trên trang xuất danh mục của HIS. ' +
                        'Hãy kiểm tra đã đăng nhập HIS và mở được trang ' +
                        `${origin}${CATALOG_EXPORT_PAGE_PATH} hay chưa.`,
                )
            }

            this.patch({
                facilityCode: scraped.dvtt,
                files: found.map((file) => this.newFileProgress(file)),
                phase: scraped.dvtt
                    ? `Tìm thấy ${found.length} danh mục của cơ sở ${scraped.dvtt}.`
                    : `Tìm thấy ${found.length} danh mục.`,
            })

            await this.importAll(opened.tabId, scraped.dvtt)

            this.patch({ phase: this.summary(), running: false, finished: true })
        } catch (error) {
            this.patch({
                running: false,
                finished: true,
                phase: '',
                error: error instanceof Error ? error.message : String(error),
            })
        } finally {
            // Tab do tiện ích tự mở thì tự dọn, không để lại tab lạ cho người dùng
            if (createdTabId != null) {
                try {
                    await chrome.tabs.remove(createdTabId)
                } catch {
                    /* tab có thể đã bị đóng tay */
                }
            }
        }

        return this.state
    }

    /** Tải rồi nạp lần lượt từng file — chạy tuần tự để không dội request vào HIS. */
    private async importAll(tabId: number, facilityCode: string): Promise<void> {
        const total = this.state.files.length
        for (let index = 0; index < total; index++) {
            if (this.cancelled) {
                this.patch({ phase: `Đã dừng theo yêu cầu (${index}/${total} danh mục).` })
                return
            }

            const file = this.state.files[index]
            this.updateFile(index, { status: 'downloading', message: 'Đang tải từ HIS…' })
            this.patch({ phase: `Đang xử lý danh mục ${index + 1}/${total}…` })

            const downloaded = await this.download(tabId, file.url)
            if (!downloaded.ok) {
                this.updateFile(index, { status: 'failed', message: downloaded.error ?? 'Không tải được file.' })
                continue
            }

            const fileName = downloaded.fileName ?? this.fallbackFileName(file.url)
            this.updateFile(index, { fileName, status: 'uploading', message: 'Đang nạp vào hệ thống…' })

            const uploaded = await this.upload(
                fileName,
                downloaded.contentType ?? 'application/octet-stream',
                downloaded.base64 ?? '',
                facilityCode,
            )
            this.updateFile(index, uploaded)
        }
    }

    /** Đẩy một file lên API danh mục. Trả về trạng thái đã diễn giải cho popup. */
    private async upload(
        fileName: string,
        contentType: string,
        base64: string,
        facilityCode: string,
    ): Promise<Partial<CatalogFileProgress>> {
        try {
            const form = new FormData()
            form.append('file', new Blob([this.base64ToBytes(base64)], { type: contentType }), fileName)

            const query = new URLSearchParams({ skipUnchanged: 'true' })
            if (facilityCode) query.set('facility', facilityCode)

            const response = await fetch(`${this.api.baseUrl}/api/catalog/import?${query.toString()}`, {
                method: 'POST',
                headers: await buildLicenseHeaders(),
                body: form,
            })
            const payload = (await response.json().catch(() => null)) as {
                message?: string
                skipped?: boolean
            } | null

            if (!response.ok) {
                return {
                    status: 'failed',
                    message: payload?.message ?? `Hệ thống trả về lỗi HTTP ${response.status}.`,
                }
            }
            return {
                status: payload?.skipped ? 'skipped' : 'imported',
                message: payload?.message ?? 'Đã nạp.',
            }
        } catch (error) {
            return {
                status: 'failed',
                message:
                    error instanceof Error
                        ? `Không gửi được về hệ thống: ${error.message}`
                        : 'Không gửi được về hệ thống.',
            }
        }
    }

    /** Tìm origin HIS từ các tab đang mở (ưu tiên tab đang xem). */
    private async findHisOrigin(): Promise<string> {
        const pattern = 'https://*.vnpthis.vn/*'
        const active = await chrome.tabs.query({ url: pattern, active: true, currentWindow: true })
        const candidates = active.length > 0 ? active : await chrome.tabs.query({ url: pattern })

        for (const tab of candidates) {
            if (tab.url) return new URL(tab.url).origin
        }
        throw new Error(
            'Chưa mở trang HIS nào. Hãy đăng nhập HIS trên trình duyệt rồi bấm lại nút "Nạp danh mục HIS".',
        )
    }

    /** Mở (hoặc dùng lại) tab trang xuất danh mục và chờ tải xong. */
    private async openExportPage(origin: string): Promise<{ tabId: number; created: boolean }> {
        const target = `${origin}${CATALOG_EXPORT_PAGE_PATH}`

        const existing = await chrome.tabs.query({ url: `${target}*` })
        const reusable = existing.find((tab) => tab.id != null)
        if (reusable?.id != null) {
            await this.waitForLoad(reusable.id)
            return { tabId: reusable.id, created: false }
        }

        // active: false — mở tab nền để popup KHÔNG bị đóng (popup đóng ngay khi
        // mất tiêu điểm), người dùng vẫn theo dõi được tiến độ.
        const tab = await chrome.tabs.create({ url: target, active: false })
        if (tab.id == null) {
            throw new Error(`Không mở được trang xuất danh mục ${target}.`)
        }
        await this.waitForLoad(tab.id)
        return { tabId: tab.id, created: true }
    }

    /** Chờ tab tải xong (tối đa 45 giây — trang HIS nặng, mạng nội bộ có thể chậm). */
    private async waitForLoad(tabId: number, timeoutMs = 45_000): Promise<void> {
        const deadline = Date.now() + timeoutMs
        while (Date.now() < deadline) {
            const tab = await chrome.tabs.get(tabId)
            if (tab.status === 'complete') return
            await new Promise((resolve) => setTimeout(resolve, 300))
        }
        throw new Error('Trang xuất danh mục của HIS tải quá lâu. Kiểm tra lại kết nối tới HIS rồi thử lại.')
    }

    /**
     * Quét trang xuất danh mục: lấy mã cơ sở KCB và mọi link file xuất.
     *
     * Trang HIS không có thẻ <a> nào — 20 nút tải là `<input type="button">` và
     * URL nằm trong script inline dưới dạng TƯƠNG ĐỐI:
     *   `$("#xetnghiem").click(function(evt) { var url = "exporter_dmduoc?url=0"; … })`
     * Nên phải (1) quét chuỗi trong script chứ không chỉ thuộc tính, (2) nối URL
     * theo `location.href` (base là /web_his/) chứ không phải origin, (3) ghép id
     * nút với link để lấy nhãn tiếng Việt hiện lên popup.
     *
     * Hàm truyền vào executeScript bị tuần tự hóa nên phải TỰ CHỨA — không tham
     * chiếu biến ngoài, mọi tham số đưa qua `args`.
     */
    private async scrape(tabId: number): Promise<ScrapeResult> {
        const [injection] = await chrome.scripting.executeScript({
            target: { tabId },
            args: [CATALOG_EXPORTER_PATTERN],
            func: (pattern: string) => {
                const html = document.documentElement.outerHTML

                // Mã cơ sở KCB nằm ở thuộc tính data-cmu-dvtt của script cảnh báo ICD
                let dvtt = document.querySelector('script[data-cmu-dvtt]')?.getAttribute('data-cmu-dvtt') ?? ''
                if (!dvtt) {
                    dvtt = html.match(/data-cmu-dvtt\s*=\s*["']([^"']+)["']/)?.[1] ?? ''
                }

                // Map giữ thứ tự chèn → thứ tự nạp đúng như thứ tự nút trên trang
                const found = new Map<string, string>()
                const add = (raw: string, label: string): void => {
                    try {
                        // Base là location.href: link "exporter_dmduoc?url=0" phải nối
                        // vào /web_his/, nối vào origin sẽ ra URL sai hoàn toàn.
                        const href = new URL(raw.replace(/&amp;/g, '&'), location.href).href
                        const current = found.get(href)
                        if (current == null || (!current && label)) found.set(href, label)
                    } catch {
                        /* mảnh chuỗi không phải URL hợp lệ */
                    }
                }

                // 1) Ghép id nút ↔ link trong trình xử lý click để lấy nhãn tiếng Việt
                const paired = new RegExp(
                    `#([A-Za-z0-9_-]+)"\\s*\\)\\s*\\.click\\([\\s\\S]{0,400}?(${pattern})`,
                    'g',
                )
                for (const match of html.matchAll(paired)) {
                    const el = document.getElementById(match[1])
                    const label =
                        (el instanceof HTMLInputElement ? el.value : el?.textContent) ?? ''
                    add(match[2], label.trim())
                }

                // 2) Quét toàn bộ HTML: bắt cả link không gắn với nút nào (thẻ <a>,
                //    onclick, hoặc danh mục HIS mới thêm sau này)
                for (const match of html.matchAll(new RegExp(pattern, 'g'))) {
                    add(match[0], '')
                }

                const files = Array.from(found, ([url, label]) => ({ url, label }))
                return { dvtt, files, pageUrl: location.href }
            },
        })

        const result = injection?.result as ScrapeResult | undefined
        if (!result) {
            throw new Error('Không đọc được nội dung trang xuất danh mục của HIS.')
        }
        return result
    }

    /**
     * Tải một file danh mục NGAY TRONG tab HIS: cùng origin nên trình duyệt tự
     * đính kèm cookie phiên người dùng đang đăng nhập.
     */
    private async download(tabId: number, url: string): Promise<DownloadResult> {
        try {
            const [injection] = await chrome.scripting.executeScript({
                target: { tabId },
                args: [url],
                func: async (fileUrl: string) => {
                    try {
                        const response = await fetch(fileUrl, { credentials: 'include' })
                        if (response.status === 401 || response.status === 403) {
                            return {
                                ok: false,
                                error: 'HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại HIS rồi thử lại.',
                            }
                        }
                        if (!response.ok) {
                            return { ok: false, error: `HIS trả về lỗi HTTP ${response.status}.` }
                        }

                        const disposition = response.headers.get('content-disposition') ?? ''
                        const contentType = response.headers.get('content-type') ?? ''

                        // Chưa đăng nhập thì HIS trả HTML trang login kèm mã 200 —
                        // nhận diện để báo đúng nguyên nhân thay vì nạp rác vào danh mục
                        if (contentType.toLowerCase().includes('text/html')) {
                            return {
                                ok: false,
                                error: 'HIS trả về trang HTML thay vì file danh mục (thường do chưa đăng nhập hoặc không có quyền xuất danh mục này).',
                            }
                        }

                        let fileName = ''
                        const utf8 = disposition.match(/filename\*\s*=\s*[^']*''([^;]+)/i)
                        if (utf8) {
                            fileName = decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''))
                        } else {
                            fileName = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]?.trim() ?? ''
                        }

                        const bytes = new Uint8Array(await response.arrayBuffer())
                        if (bytes.length === 0) {
                            return { ok: false, error: 'HIS trả về file rỗng.' }
                        }

                        // Chỉ chuỗi mới qua được kênh executeScript → mã hóa base64
                        let binary = ''
                        const chunk = 0x8000
                        for (let i = 0; i < bytes.length; i += chunk) {
                            binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
                        }
                        return {
                            ok: true,
                            fileName,
                            contentType,
                            base64: btoa(binary),
                            size: bytes.length,
                        }
                    } catch (error) {
                        return { ok: false, error: error instanceof Error ? error.message : String(error) }
                    }
                },
            })

            return (injection?.result as DownloadResult | undefined) ?? { ok: false, error: 'Không nhận được phản hồi từ tab HIS.' }
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
    }

    /** base64 → nội dung nhị phân (service worker không có Buffer). */
    private base64ToBytes(base64: string): ArrayBuffer {
        const binary = atob(base64)
        const buffer = new ArrayBuffer(binary.length)
        const bytes = new Uint8Array(buffer)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return buffer
    }

    /** Tên file dự phòng khi HIS không trả Content-Disposition. */
    private fallbackFileName(url: string): string {
        const parsed = new URL(url)
        const last = parsed.pathname.split('/').filter(Boolean).pop() ?? 'danh_muc'
        const suffix = parsed.searchParams.get('url')
        return suffix ? `${last}_${suffix}.xls` : `${last}.xls`
    }

    private newFileProgress(file: ScrapedFile): CatalogFileProgress {
        const fileName = this.fallbackFileName(file.url)
        return {
            url: file.url,
            label: cleanCatalogLabel(file.label) || fileName,
            fileName,
            status: 'pending',
            message: 'Chờ xử lý',
        }
    }

    /** Danh sách danh mục chép sẵn, dùng khi quét trang HIS không ra link nào. */
    private defaultFiles(origin: string): ScrapedFile[] {
        return CATALOG_EXPORT_ITEMS.map((item) => ({
            url: `${origin}${CATALOG_EXPORTER_PATH}?url=${item.token}`,
            label: item.label,
        }))
    }

    /** Câu tổng kết cuối lượt nạp, hiện ở đầu popup. */
    private summary(): string {
        const count = (status: CatalogFileProgress['status']): number =>
            this.state.files.filter((f) => f.status === status).length
        const parts = [`${count('imported')} danh mục đã nạp`]
        if (count('skipped') > 0) parts.push(`${count('skipped')} không đổi`)
        if (count('failed') > 0) parts.push(`${count('failed')} lỗi`)
        return `Xong: ${parts.join(', ')}.`
    }

    private updateFile(index: number, changes: Partial<CatalogFileProgress>): void {
        const files = this.state.files.slice()
        files[index] = { ...files[index], ...changes }
        this.patch({ files })
    }

    private patch(changes: Partial<CatalogImportState>): void {
        this.state = { ...this.state, ...changes }
        this.broadcast()
    }

    /** Gửi trạng thái cho popup. Popup đã đóng → không có nơi nhận, bỏ qua. */
    private broadcast(): void {
        chrome.runtime
            .sendMessage({ type: CATALOG_IMPORT_PROGRESS, state: this.state })
            .catch(() => {
                /* popup đang đóng — lượt nạp vẫn chạy tiếp ở service worker */
            })
    }
}
