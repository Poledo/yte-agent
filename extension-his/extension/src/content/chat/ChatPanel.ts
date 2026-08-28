import { BatchCapacity, CapacityPlan } from './BatchCapacity'
import { ChatApiClient } from './ChatApiClient'
import { ChatMessageRenderer, StreamFileStats } from './ChatMessageRenderer'
import { CrossIssue, Xml130StreamEvent, Xml130ValidationResponse } from './ChatModels'
import {
    ExcelReportExporter,
    PdfReportExporter,
    ReportBuilder,
    ReportNaming,
    ResultDownloadBars,
    WordReportExporter,
} from './export'
import { IHisXmlDownloader, HisXmlDownloader } from './HisXmlDownloader'
import { GuiBhxhStore } from './GuiBhxhStore'
import { GuiBhxhXmlDownloader } from './GuiBhxhXmlDownloader'
import { GuiKyTongStore } from './GuiKyTongStore'
import { GuiKyTongXmlDownloader } from './GuiKyTongXmlDownloader'
import { PaymentListStore } from './PaymentListStore'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { UnifiedAssistantPanel } from '../ui/UnifiedAssistantPanel'
import { RobotNotifier, RobotResult } from '../robot'

/**
 * Trạng thái một file trong khay chờ kiểm tra. Khay chỉ là chỗ CHỜ: kiểm tra xong là
 * file rời khay (giải phóng bộ nhớ), kết quả nằm lại trong khung chat.
 */
type QueuedStatus = 'pending' | 'checking'

interface QueuedFile {
    id: number
    file: File
    status: QueuedStatus
    abort: AbortController | null
    /** Ghi chú trạng thái ngắn hiển thị trên chip (đang trong lô, lý do chưa kiểm tra được...). */
    note: string
}

/** Chế độ khung chat: kiểm tra theo số vào viện, hoặc hỏi nghiệp vụ. */
type ChatMode = 'svv' | 'hoi'

/**
 * View tab "Trợ lý" trong UnifiedAssistantPanel: chat kiểm tra hồ sơ XML 130.
 * Render vào container do UnifiedAssistantPanel cấp (Shadow DOM chung).
 *
 * Hỗ trợ 3 luồng:
 * 1. Upload/kéo-thả file .xml → gọi API validate → hiển thị kết quả.
 * 2. Gõ số vào viện (vd "kiểm tra số vào viện 12376208") → tải XML 130 từ HIS
 *    bằng phiên đang đăng nhập → validate khả năng xuất toán.
 * 3. Gõ câu hỏi nghiệp vụ → gọi API hỏi đáp RAG.
 */
export class ChatPanel {
    private readonly apiClient: ChatApiClient
    private readonly xmlDownloader: IHisXmlDownloader
    private readonly renderer: ChatMessageRenderer
    private readonly container: HTMLElement
    private readonly panel: UnifiedAssistantPanel
    /** Danh sách phiếu thanh toán người dùng vừa tìm trên màn hình Kiểm tra bảng kê. */
    private readonly paymentList: PaymentListStore
    /** Tham số lượt "Xuất XML KMH" trên màn hình Gửi bảo hiểm 4210 (VNPT-HIS). */
    private readonly guiBhxh: GuiBhxhStore
    private readonly guiBhxhDownloader = new GuiBhxhXmlDownloader()
    /** Tham số lượt "Xuất XML Ký tổng" trên màn hình Gửi DSHS BHXH 4210 (VNPT-HIS). */
    private readonly guiKyTong: GuiKyTongStore
    private readonly guiKyTongDownloader = new GuiKyTongXmlDownloader()
    /** Hộp thoại xác nhận trong panel — thay cho window.confirm mặc định. */
    private readonly confirmDialog: ConfirmDialog
    /** Đo cấu hình máy đang dùng để giới hạn số hồ sơ mỗi lô. */
    private readonly capacity = new BatchCapacity()
    /** Thanh "Tải kết quả" dưới mỗi lượt kiểm tra (PDF / Word / Excel). */
    private readonly downloads = new ResultDownloadBars([
        new PdfReportExporter(),
        new WordReportExporter(),
        new ExcelReportExporter(),
    ])

    /**
     * Chế độ hiện tại: quyết định placeholder và cách hiểu nội dung ô nhập.
     * Mặc định là hỏi thông tin y tế — mở panel lên gõ câu hỏi được ngay; kiểm tra hồ sơ
     * đã có nút riêng (📎, thanh bảng kê) nên không cần đặt làm chế độ mặc định.
     */
    private mode: ChatMode = 'hoi'

    private messagesEl: HTMLElement | null = null
    private inputEl: HTMLInputElement | null = null
    private fileInputEl: HTMLInputElement | null = null
    private sendBtnEl: HTMLButtonElement | null = null

    private isBusy = false
    /** Điều khiển hủy request đang chạy khi người dùng bấm Dừng. */
    private abortController: AbortController | null = null

    /** Tin nhắn chào hiện tại — giữ lại để thu gọn/mở lại. */
    private welcomeEl: HTMLElement | null = null
    private welcomeCollapsed = false
    /** Người dùng đã tự bấm thu gọn/mở lại → thôi tự động can thiệp nữa. */
    private welcomeUserDecided = false

    /** Robot mascot (tùy chọn) — nhận thông báo để biểu cảm theo trạng thái kiểm tra. */
    private robot: RobotNotifier | null = null

    /** Hàng đợi file đính kèm chờ kiểm tra. */
    private fileQueue: QueuedFile[] = []
    private fileSeq = 0
    private trayEl: HTMLElement | null = null

    /** Menu bật ra khi bấm nút "+". */
    private plusMenuEl: HTMLElement | null = null

    /**
     * Danh sách chế độ hiển thị trong menu "+". Thêm option mới chỉ cần thêm một dòng.
     */
    private static readonly MODE_OPTIONS: { mode: ChatMode; icon: string; label: string }[] = [
        { mode: 'hoi', icon: '💬', label: 'Hỏi thông tin y tế' },
        { mode: 'svv', icon: '🔢', label: 'Kiểm tra số vào viện' },
    ]

    constructor(
        panel: UnifiedAssistantPanel,
        apiClient?: ChatApiClient,
        xmlDownloader?: IHisXmlDownloader,
        renderer?: ChatMessageRenderer,
        paymentList?: PaymentListStore,
        guiBhxh?: GuiBhxhStore,
        guiKyTong?: GuiKyTongStore,
    ) {
        this.apiClient = apiClient ?? new ChatApiClient()
        this.xmlDownloader = xmlDownloader ?? new HisXmlDownloader()
        this.renderer = renderer ?? new ChatMessageRenderer()
        this.paymentList = paymentList ?? new PaymentListStore()
        this.guiBhxh = guiBhxh ?? new GuiBhxhStore()
        this.guiKyTong = guiKyTong ?? new GuiKyTongStore()
        this.panel = panel
        this.container = panel.getTabContainer('chat')
        this.container.classList.add('chat-root')
        this.confirmDialog = new ConfirmDialog(this.container)
        panel.addStyles(this.getStyles())
        panel.addStyles(ConfirmDialog.styles())
        this.createUI()
        // Người dùng tìm kiếm lại trên bảng kê → cập nhật số lượng trên nút
        this.paymentList.onChange(() => this.renderPaymentBar())
        // Người dùng bấm Xuất XML KMH → mở khóa/cập nhật số lượng nút kiểm tra
        this.guiBhxh.onChange(() => this.renderGuiBhxhBar())
        // Người dùng bấm Xuất XML Ký tổng → mở khóa nút kiểm tra
        this.guiKyTong.onChange(() => this.renderGuiKyTongBar())
    }

    /**
     * Bật/tắt trạng thái đang xử lý: vòng xoay trên nút nổi (giống tab Cảnh báo),
     * khóa ô nhập và nút gửi/đính kèm để tránh gửi chồng yêu cầu.
     */
    private setBusy(busy: boolean): void {
        this.isBusy = busy
        if (busy) {
            this.panel.beginChecking()
        } else {
            this.panel.endChecking()
        }
        // Robot suy nghĩ trong lúc xử lý. Khi xong, notifyThinking(false) chỉ đưa
        // robot về "lắng nghe" nếu chưa có kết quả nào đặt cảm xúc khác (có guard bên trong).
        this.robot?.notifyThinking(busy)

        this.container.classList.toggle('chat-busy', busy)
        if (this.inputEl) {
            this.inputEl.disabled = busy
            this.inputEl.placeholder = busy ? 'Đang xử lý — bấm ■ để dừng...' : this.placeholderFor(this.mode)
        }
        // Đính kèm + nút "+" khóa khi bận; nút gửi biến thành nút Dừng (vẫn bấm được).
        const attachBtn = this.container.querySelector<HTMLButtonElement>('.chat-attach')
        if (attachBtn) attachBtn.disabled = busy
        const plusBtn = this.container.querySelector<HTMLButtonElement>('.chat-plus')
        if (plusBtn) plusBtn.disabled = busy
        if (busy) this.hidePlusMenu()
        if (this.sendBtnEl) {
            this.sendBtnEl.disabled = false
            this.sendBtnEl.classList.toggle('chat-stop', busy)
            this.sendBtnEl.textContent = busy ? '■' : '➤'
            this.sendBtnEl.title = busy ? 'Dừng' : 'Gửi'
        }

        if (!busy) {
            this.inputEl?.focus()
        }

        // Vẽ lại khay file để các nút ▶ / ✕ / "Kiểm tra tất cả" khóa-mở theo trạng thái bận
        this.renderTray()
        this.renderPaymentBar()
        this.renderGuiBhxhBar()
        this.renderGuiKyTongBar()
    }

    /** Hủy request đang chạy (người dùng bấm Dừng). Không gây lỗi ngoại lệ. */
    private abortCurrent(): void {
        this.abortController?.abort()
    }

    /** True nếu lỗi là do người dùng chủ động hủy (bấm Dừng). */
    private isAbort(error: unknown): boolean {
        return error instanceof DOMException && error.name === 'AbortError'
    }

    /** Bong bóng chat "đang xử lý" có vòng xoay động (thay cho ký tự ⏳ tĩnh). */
    private addLoadingMessage(text: string): HTMLElement {
        return this.addBotHtml(`<span class="chat-spinner"></span><span class="chat-loading-text">${text}</span>`)
    }

    /** Focus ô nhập chat (gọi khi tab Trợ lý được mở) */
    focusInput(): void {
        this.inputEl?.focus()
    }

    /** Gắn robot mascot để phản ứng theo trạng thái/kết quả kiểm tra (tùy chọn). */
    attachRobot(robot: RobotNotifier): void {
        this.robot = robot
    }

    // ---------------------------------------------------------------
    // UI
    // ---------------------------------------------------------------

    private createUI(): void {
        this.container.innerHTML = `
            <div class="chat-messages"></div>
            <div class="chat-drop-hint">📄 Thả file XML vào đây để kiểm tra</div>
            <div class="chat-bangke" hidden></div>
            <div class="chat-guibhxh" hidden></div>
            <div class="chat-kytong" hidden></div>
            <div class="chat-tray" hidden></div>
            <div class="chat-input-wrap">
                <div class="chat-plus-menu" hidden></div>
                <div class="chat-input-row">
                    <button class="chat-clear" title="Xóa lịch sử hội thoại">🧹</button>
                    <button class="chat-attach" title="Đính kèm file XML 130">📎</button>
                    <div class="chat-input-box">
                        <button class="chat-plus" title="Chọn lựa chọn">+</button>
                        <input class="chat-input" type="text" />
                        <button class="chat-send" title="Gửi">➤</button>
                    </div>
                </div>
            </div>
            <input class="chat-file" type="file" accept=".xml" multiple hidden />
        `

        this.messagesEl = this.container.querySelector('.chat-messages')
        this.inputEl = this.container.querySelector('.chat-input')
        this.fileInputEl = this.container.querySelector('.chat-file')
        this.sendBtnEl = this.container.querySelector('.chat-send')
        this.trayEl = this.container.querySelector('.chat-tray')
        this.plusMenuEl = this.container.querySelector('.chat-plus-menu')
        if (this.inputEl) this.inputEl.placeholder = this.placeholderFor(this.mode)

        this.attachEvents()
        this.showWelcome()
        this.renderPaymentBar()
        this.renderGuiBhxhBar()
        this.renderGuiKyTongBar()

        console.log('[ChatPanel] UI created')
    }

    /**
     * Lời chào mở đầu — dùng khi khởi tạo và sau khi xóa lịch sử hội thoại.
     * Mở sẵn khi chưa hỏi gì; có nút thu gọn về một biểu tượng để nhường chỗ cho
     * kết quả kiểm tra (xem {@link collapseWelcomeOnFirstUse}).
     */
    private showWelcome(): void {
        this.welcomeEl = null
        const message = this.addBotHtml(
            '<button class="chat-welcome-toggle" type="button">💡</button>' +
            '<div class="chat-welcome-body">' +
            'Xin chào! Bạn gõ câu hỏi nghiệp vụ BHYT vào ô bên dưới là tôi trả lời ngay.<br/>' +
                'Bấm nút <b>+</b> để đổi chế độ:<br/>' +
                '• <b>Hỏi thông tin y tế</b> — hỏi nghiệp vụ BHYT (đang chọn sẵn).<br/>' +
                '• <b>Kiểm tra số vào viện</b> — tải hồ sơ XML 130 từ HIS và kiểm tra xuất toán.<br/>' +
                'Hoặc bấm 📎 để đính kèm nhiều file <b>XML 130</b> kiểm tra hàng loạt — ' +
                'từ 2 file trở lên sẽ tự động <b>đối chiếu chéo</b> giữa các hồ sơ ' +
                '(trùng giường, trùng giờ bác sĩ, trùng đợt điều trị).<br/>' +
                'Riêng ở màn hình <b>Kiểm tra bảng kê</b>, sau khi bấm <b>Xem thông tin</b> sẽ có thêm hai nút ' +
                'ngay trên ô nhập, khỏi phải xuất file hay gõ tay số vào viện:<br/>' +
                '• <b>📋 Kiểm tra (n) file XML130</b> — lấy trọn danh sách phiếu vừa tìm, ' +
                'tải hồ sơ từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo.<br/>' +
                '• <b>🔎 Kiểm tra XML130 cho BN</b> — chỉ hồ sơ của dòng bảng kê bạn đang chọn ' +
                '(chưa chọn dòng nào thì nút còn khóa).' +
                '</div>',
        )
        message.classList.add('chat-msg-wide', 'chat-welcome')
        message
            .querySelector('.chat-welcome-toggle')
            ?.addEventListener('click', () => this.setWelcomeCollapsed(!this.welcomeCollapsed, true))
        this.welcomeEl = message
        this.welcomeCollapsed = false
        this.welcomeUserDecided = false
        this.syncWelcomeToggle()
    }

    /**
     * Người dùng bắt đầu hỏi/kiểm tra → lời chào tự thu về một biểu tượng để nhường
     * chỗ cho kết quả. Chỉ tự thu MỘT lần: sau đó đóng hay mở là quyền người dùng.
     */
    private collapseWelcomeOnFirstUse(): void {
        if (!this.welcomeEl || this.welcomeCollapsed || this.welcomeUserDecided) return
        this.setWelcomeCollapsed(true, false)
    }

    private setWelcomeCollapsed(collapsed: boolean, byUser: boolean): void {
        if (!this.welcomeEl) return
        this.welcomeCollapsed = collapsed
        if (byUser) this.welcomeUserDecided = true
        this.welcomeEl.classList.toggle('chat-welcome-collapsed', collapsed)
        this.syncWelcomeToggle()
    }

    private syncWelcomeToggle(): void {
        const button = this.welcomeEl?.querySelector<HTMLButtonElement>('.chat-welcome-toggle')
        if (!button) return
        const label = this.welcomeCollapsed ? 'Mở lại hướng dẫn nhanh' : 'Thu gọn hướng dẫn nhanh'
        button.title = label
        button.setAttribute('aria-label', label)
        button.setAttribute('aria-expanded', String(!this.welcomeCollapsed))
    }

    /**
     * Xóa toàn bộ lịch sử hội thoại (câu hỏi, kết quả kiểm tra XML, khay file)
     * để panel trống trải dễ nhìn. Không xóa khi đang có lượt kiểm tra chạy.
     */
    private clearHistory(): void {
        if (this.isBusy) return
        this.fileQueue = []
        this.renderTray()
        if (this.messagesEl) this.messagesEl.innerHTML = ''
        this.downloads.clear()
        this.showWelcome()
    }

    /** Gắn thanh "Tải kết quả" cho một lượt kiểm tra một hồ sơ / một file. */
    private attachDownload(
        message: HTMLElement,
        result: Xml130ValidationResponse,
        subject: string,
        sourceFile: string,
    ): void {
        this.downloads.attach(message, ReportBuilder.fromValidation(result, subject, sourceFile))
    }

    /**
     * Phần nhận diện của tên file khi kiểm tra theo số vào viện: tên bệnh nhân kèm
     * ngày khám. Ưu tiên bảng kê vì đó là thứ người dùng đang nhìn thấy; gõ tay số
     * vào viện thì lấy từ chính hồ sơ XML (API trả HO_TEN và NGAY_VAO), cùng lắm
     * mới quay về số vào viện.
     */
    private patientSubject(admissionNo: string, result: Xml130ValidationResponse): string {
        const ticket = this.paymentList.findTicket(admissionNo)
        const hoso = result.results?.[0]
        const name = ticket?.tenBenhNhan || hoso?.hoTen || ''
        const subject = ReportNaming.fromPatient(name, ticket?.ngayKham || hoso?.ngayVao || '')
        return subject === '' ? `số vào viện ${admissionNo}` : subject
    }

    private attachEvents(): void {
        const clearBtn = this.container.querySelector('.chat-clear')
        clearBtn?.addEventListener('click', () => this.clearHistory())

        const sendBtn = this.container.querySelector('.chat-send')
        // Khi đang bận, nút này là nút Dừng; ngược lại là nút Gửi.
        sendBtn?.addEventListener('click', () => {
            if (this.isBusy) this.abortCurrent()
            else this.handleSend()
        })

        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!this.isBusy) this.handleSend()
            }
        })

        // Người dùng đang gõ câu hỏi → robot nghiêng đầu nhìn ô nhập (task §6)
        this.inputEl?.addEventListener('input', () => {
            if (!this.isBusy) this.robot?.notifyTyping()
        })

        // Nút "+" mở menu chọn chế độ
        const plusBtn = this.container.querySelector('.chat-plus')
        plusBtn?.addEventListener('click', (e) => {
            e.stopPropagation()
            this.togglePlusMenu()
        })
        // Bấm ra ngoài menu thì đóng
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            if (!target.closest('.chat-plus') && !target.closest('.chat-plus-menu')) {
                this.hidePlusMenu()
            }
        })

        // Đính kèm file (nhiều file)
        const attachBtn = this.container.querySelector('.chat-attach')
        attachBtn?.addEventListener('click', () => this.fileInputEl?.click())

        this.fileInputEl?.addEventListener('change', () => {
            if (this.fileInputEl?.files?.length) {
                this.addFilesToQueue(this.fileInputEl.files)
            }
            if (this.fileInputEl) {
                this.fileInputEl.value = '' // Cho phép chọn lại cùng file
            }
        })

        // Khi mở một khối chi tiết (details), cuộn nó vào tầm nhìn để nội dung
        // bung ra không bị khuất dưới đáy khung chat. 'toggle' không bubble
        // nên phải bắt ở capture phase.
        this.messagesEl?.addEventListener(
            'toggle',
            (e) => {
                const details = e.target
                if (details instanceof HTMLDetailsElement && details.open) {
                    details.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                }
            },
            true,
        )

        // Kéo-thả nhiều file vào tab chat
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.container.classList.add('dragging')
        })
        this.container.addEventListener('dragleave', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.container.classList.remove('dragging')
        })
        this.container.addEventListener('drop', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.container.classList.remove('dragging')
            if (e.dataTransfer?.files?.length) {
                this.addFilesToQueue(e.dataTransfer.files)
            }
        })
    }

    // ---------------------------------------------------------------
    // Chế độ khung chat (Số vào viện / Hỏi)
    // ---------------------------------------------------------------

    /** Placeholder tương ứng từng chế độ. */
    private placeholderFor(mode: ChatMode): string {
        return mode === 'svv' ? 'Nhập số vào viện để kiểm tra XML 130...' : 'Nhập câu hỏi nghiệp vụ BHYT...'
    }

    /** Đổi chế độ: cập nhật placeholder + focus. */
    private setMode(mode: ChatMode): void {
        this.mode = mode
        if (this.inputEl && !this.isBusy) {
            this.inputEl.placeholder = this.placeholderFor(mode)
        }
        this.inputEl?.focus()
    }

    /** Bật/tắt menu "+". Danh sách chế độ lấy từ MODE_OPTIONS (dễ mở rộng). */
    private togglePlusMenu(): void {
        if (!this.plusMenuEl) return
        if (!this.plusMenuEl.hidden) {
            this.hidePlusMenu()
            return
        }
        this.plusMenuEl.innerHTML = ChatPanel.MODE_OPTIONS.map(
            (o) => `
                <div class="chat-menu-item${o.mode === this.mode ? ' active' : ''}" data-mode="${o.mode}">
                    <span class="chat-menu-icon">${o.icon}</span>
                    <span class="chat-menu-label">${o.label}</span>
                    ${o.mode === this.mode ? '<span class="chat-menu-check">✓</span>' : ''}
                </div>`,
        ).join('')
        this.plusMenuEl.hidden = false

        this.plusMenuEl.querySelectorAll<HTMLElement>('.chat-menu-item').forEach((el) => {
            el.addEventListener('click', () => {
                this.setMode(el.dataset.mode as ChatMode)
                this.hidePlusMenu()
            })
        })
    }

    private hidePlusMenu(): void {
        if (this.plusMenuEl) {
            this.plusMenuEl.hidden = true
            this.plusMenuEl.innerHTML = ''
        }
    }

    // ---------------------------------------------------------------
    // Luồng xử lý tin nhắn
    // ---------------------------------------------------------------

    private handleSend(): void {
        if (!this.inputEl || this.isBusy) return

        const text = this.inputEl.value.trim()
        if (!text) return

        if (this.mode === 'svv') {
            // Chế độ số vào viện: lấy dãy số trong nội dung
            const admissionNo = text.match(/\d+/)?.[0]
            if (!admissionNo) {
                this.addBotHtml(
                    'Đang ở chế độ <b>Số vào viện</b> — hãy nhập một số vào viện (dãy số). ' +
                        'Muốn hỏi nghiệp vụ thì bấm nút <b>Hỏi</b> phía trên.',
                )
                return
            }
            this.inputEl.value = ''
            this.addUserMessage(text)
            void this.handleAdmissionCheck(admissionNo)
            return
        }

        // Chế độ hỏi nghiệp vụ
        if (this.isTooVague(text)) {
            this.inputEl.value = ''
            this.addUserMessage(text)
            this.addBotHtml('Câu hỏi hơi ngắn nên tôi chưa rõ ý. Bạn nêu cụ thể hơn giúp tôi nhé.')
            return
        }
        this.inputEl.value = ''
        this.addUserMessage(text)
        void this.handleQuestion(text)
    }

    /**
     * Câu hỏi quá ngắn/vô nghĩa để trả lời (vd "a", "aa", "???", "..").
     * Ngưỡng: dưới 3 ký tự chữ, hoặc chỉ một ký tự lặp lại, hoặc không có chữ cái nào.
     */
    private isTooVague(text: string): boolean {
        const trimmed = text.trim()
        // Đếm ký tự chữ (gồm tiếng Việt có dấu)
        const letters = trimmed.replace(/[^\p{L}]/gu, '')
        if (letters.length < 3) return true
        // Toàn một ký tự lặp lại: "aaa", "kkk"
        if (/^(\p{L})\1*$/u.test(letters)) return true
        return false
    }

    // ---------------------------------------------------------------
    // Khay file: đính kèm nhiều → kiểm tra từng file / tất cả
    // ---------------------------------------------------------------

    /** Thêm file vào khay chờ (KHÔNG kiểm tra ngay — chờ người dùng bấm). */
    private addFilesToQueue(list: FileList): void {
        // Đang xử lý: chặn cả đường kéo-thả (nút 📎 đã bị khóa sẵn)
        if (this.isBusy) {
            this.addBotHtml('⏳ Đang xử lý lượt kiểm tra hiện tại — chờ xong rồi thêm file nhé.')
            return
        }
        const incoming = Array.from(list)
        const xmlFiles = incoming.filter((f) => f.name.toLowerCase().endsWith('.xml'))
        const skipped = incoming.length - xmlFiles.length
        if (skipped > 0) {
            this.addBotHtml(`⚠ Đã bỏ qua ${skipped} file không phải <b>.xml</b> (chỉ nhận hồ sơ XML 130).`)
        }
        for (const file of xmlFiles) {
            this.fileQueue.push({ id: ++this.fileSeq, file, status: 'pending', abort: null, note: '' })
        }
        this.renderTray()
    }

    /** Vẽ lại khay file từ trạng thái fileQueue. */
    private renderTray(): void {
        if (!this.trayEl) return
        if (this.fileQueue.length === 0) {
            this.trayEl.hidden = true
            this.trayEl.innerHTML = ''
            return
        }
        this.trayEl.hidden = false

        const pending = this.fileQueue.filter((f) => f.status === 'pending').length
        const checking = this.fileQueue.some((f) => f.status === 'checking')

        // Đang xử lý (check file / hỏi đáp): khóa mọi nút hành động, chỉ chừa nút Dừng ■
        const lock = this.isBusy ? 'disabled' : ''
        const rows = this.fileQueue
            .map((f) => {
                const actions =
                    f.status === 'checking'
                        ? `<button class="chat-file-btn stop" data-act="stop" data-id="${f.id}" title="Dừng">■</button>`
                        : `<button class="chat-file-btn go" data-act="check" data-id="${f.id}" title="Kiểm tra file này" ${lock}>▶</button>
                           <button class="chat-file-btn" data-act="remove" data-id="${f.id}" title="Xóa" ${lock}>✕</button>`

                const icon =
                    f.status === 'checking'
                        ? '<span class="chat-spinner"></span>'
                        : '<span class="chat-file-ic">📄</span>'

                const note = f.note ? `<span class="chat-file-note">${this.escape(f.note)}</span>` : ''

                return `
                    <div class="chat-file-chip ${f.status}">
                        ${icon}
                        <span class="chat-file-name" title="${this.escape(f.file.name)}">${this.escape(f.file.name)}</span>
                        ${note}
                        <span class="chat-file-actions">${actions}</span>
                    </div>`
            })
            .join('')

        const toolbar = `
            <div class="chat-tray-toolbar">
                <button class="chat-tray-btn primary" data-act="check-all" ${pending === 0 || checking || this.isBusy ? 'disabled' : ''}
                    title="Kiểm tra kèm đối chiếu chéo giữa các hồ sơ (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị)">
                    Kiểm tra tất cả${pending > 0 ? ` (${pending})` : ''}
                </button>
                ${checking ? '<button class="chat-tray-btn danger" data-act="stop-all">Dừng tất cả</button>' : ''}
                <button class="chat-tray-btn" data-act="clear-all" ${lock}>Xóa hết</button>
            </div>`

        this.trayEl.innerHTML = `<div class="chat-tray-list">${rows}</div>${toolbar}`
        this.bindTrayEvents()
    }

    private bindTrayEvents(): void {
        this.trayEl?.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
            el.addEventListener('click', () => {
                const act = el.dataset.act
                const id = el.dataset.id ? Number(el.dataset.id) : null
                if (act === 'check' && id) void this.checkOne(id)
                else if (act === 'stop' && id) this.stopOne(id)
                else if (act === 'remove' && id) this.removeQueued(id)
                else if (act === 'check-all') void this.checkAll()
                else if (act === 'stop-all') this.stopAll()
                else if (act === 'clear-all') this.clearAll()
            })
        })
    }

    /** Kiểm tra một file trong khay; kết quả hiện thành tin nhắn trong chat. */
    private async checkOne(id: number): Promise<void> {
        const item = this.fileQueue.find((f) => f.id === id)
        if (!item || item.status === 'checking' || this.isBusy) return

        item.status = 'checking'
        item.note = ''
        item.abort = new AbortController()
        // Khóa toàn bộ nút (📎, +, ▶, gửi) trong lúc kiểm tra; nút gửi thành nút Dừng
        // và dừng đúng lượt kiểm tra này
        this.abortController = item.abort
        this.setBusy(true)

        let checked = false
        try {
            const result = await this.apiClient.validateXml130(item.file, item.file.name, item.abort.signal)
            checked = true
            // Kết quả chi tiết hiện thành tin nhắn (có tên file làm tiêu đề)
            const message = this.addBotHtml(
                `<div class="chat-file-result-head">📄 ${this.escape(item.file.name)}</div>` +
                    this.renderer.renderValidationResult(result),
            )
            message.classList.add('chat-msg-wide')
            this.attachDownload(message, result, ReportNaming.fromXmlFile(item.file.name), item.file.name)
            this.robot?.notifyResult(
                this.resultFor(result.xuatToanRisk === true, result.found === false || result.hosoCount === 0),
            )
        } catch (error) {
            // Chưa kiểm tra được: giữ file lại trong khay để bấm ▶ thử lại, lý do báo trong chat
            const stopped = this.isAbort(error)
            item.status = 'pending'
            item.note = stopped ? 'Đã dừng, bấm ▶ để kiểm tra lại' : 'Chưa kiểm tra được, bấm ▶ để thử lại'
            this.addBotHtml(
                `<div class="chat-file-result-head">📄 ${this.escape(item.file.name)}</div>` +
                    (stopped ? '⏹ Đã dừng theo yêu cầu.' : this.renderEndOrError(error)),
            )
        } finally {
            item.abort = null
            // Kiểm tra xong thì file rời khay — nội dung hồ sơ không nằm lại trong bộ nhớ
            if (checked) this.releaseFiles([item])
            this.setBusy(false) // setBusy tự vẽ lại khay file
        }
    }

    /**
     * Kiểm tra tất cả file đang chờ bằng luồng STREAMING: đối chiếu chéo trả về
     * trước một cục, sau đó kết quả từng hồ sơ đẩy về dần kèm tiến độ — file lớn
     * hàng nghìn hồ sơ không phải chờ trắng màn hình. Dùng cả khi chỉ có 1 file
     * (một file vẫn chứa nhiều hồ sơ và vẫn cần đối chiếu chéo).
     */
    private async checkAll(): Promise<void> {
        if (this.isBusy) return
        const pending = this.fileQueue.filter((f) => f.status === 'pending')
        if (pending.length === 0) return
        await this.checkBatch(pending)
    }

    /**
     * Gửi các file lên endpoint lô STREAMING:
     * 1. "cross" — toàn bộ kết quả đối chiếu chéo hiện NGAY thành một tin nhắn;
     * 2. "hoso" — cập nhật thanh tiến độ (100/2000, bao nhiêu nguy cơ...);
     * 3. "done" — render tổng kết chi tiết từng file (chỉ render hồ sơ có vấn đề).
     */
    private async checkBatch(items: QueuedFile[], subject = ''): Promise<void> {
        // Chặn sớm lô vượt sức máy đang dùng (và vượt giới hạn upload của API) — báo
        // hướng xử lý thay vì để request chết giữa chừng với thông báo "không kết nối được".
        const plan = this.capacity.measure()
        const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0)
        if (totalBytes > plan.budgetBytes) {
            this.addBotHtml(
                `⚠ Lô đang chọn nặng ${this.mb(totalBytes)}MB — vượt mức máy này kham được ` +
                    `(${plan.summary} → tối đa ${this.mb(plan.budgetBytes)}MB mỗi lượt). ` +
                    'Hãy chia nhỏ theo tuần (bấm ✕ bớt file rồi "Kiểm tra tất cả" từng đợt). ' +
                    'Lưu ý: đối chiếu chéo chỉ so các file trong cùng một đợt.',
            )
            return
        }

        // Kiểm tra nhiều file → kết quả dài; tự phóng to NẾU người dùng bật
        // cài đặt "Tự phóng to panel khi kiểm tra nhiều file" trong popup
        this.panel.maximizeForBatchCheck()

        const abort = new AbortController()
        for (const item of items) {
            item.status = 'checking'
            item.note = 'Trong lô'
            item.abort = abort // dùng chung: bấm ■ ở bất kỳ file nào sẽ dừng cả lô
        }
        // Khóa toàn bộ nút trong lúc chạy lô; nút gửi thành nút Dừng và dừng cả lô
        this.abortController = abort
        this.setBusy(true)

        // Tin nhắn tiến độ — cập nhật tại chỗ theo từng sự kiện stream
        const progress = this.addBotHtml(
            '<div class="chat-stream-status"><span class="chat-spinner"></span>' +
                `<span class="chat-stream-text">Đang tải ${items.length} file lên máy chủ...</span></div>` +
                '<div class="chat-progress"><div class="chat-progress-bar" style="width:0%"></div></div>' +
                '<div class="chat-stream-stats"></div>',
        )
        progress.classList.add('chat-msg-wide')
        const textEl = progress.querySelector<HTMLElement>('.chat-stream-text')
        const barEl = progress.querySelector<HTMLElement>('.chat-progress-bar')
        const statsEl = progress.querySelector<HTMLElement>('.chat-stream-stats')

        // Bộ gom kết quả theo file (chỉ giữ hồ sơ có vấn đề — tránh nổ DOM với lô nghìn hồ sơ)
        const perFile = new Map<string, StreamFileStats>()
        for (const item of items) {
            perFile.set(item.file.name, { results: [], hosoCount: 0, issueCount: 0, riskCount: 0 })
        }
        const fileErrors = new Map<string, string>()
        /** Giữ lại để đưa vào bản tải về — phần chéo chỉ tới một lần, ngay đầu luồng. */
        let crossIssues: CrossIssue[] = []
        let doneEvent: Xml130StreamEvent | null = null
        let totalHoso = 0
        /** Đã kiểm tra xong cả lô → file rời khay; dở dang thì giữ lại để chạy lại. */
        let checked = false

        this.panel.setBatchProgress('Đang tải file lên...')
        try {
            await this.apiClient.validateXml130BatchStream(
                items.map((item) => ({ blob: item.file, name: item.file.name })),
                (event) => {
                    if (event.type === 'start') {
                        totalHoso = event.hosoCount ?? 0
                        if (textEl) {
                            textEl.innerHTML = `Đã nhận <b>${event.fileCount}</b> file (<b>${event.hosoCount}</b> hồ sơ). Đang đối chiếu chéo giữa các hồ sơ...`
                        }
                        this.panel.setBatchProgress(`Đối chiếu chéo ${event.hosoCount ?? 0} hồ sơ...`)
                    } else if (event.type === 'fileError' && event.fileName) {
                        fileErrors.set(event.fileName, event.error ?? 'Không đọc được')
                    } else if (event.type === 'cross') {
                        // Phần chéo xong TRƯỚC — hiện ngay thành tin nhắn riêng.
                        // Chỉ 0-1 hồ sơ thì đối chiếu chéo vô nghĩa — không hiện gì
                        // (trừ khi có vấn đề thật, để không bao giờ nuốt cảnh báo).
                        crossIssues = event.crossIssues ?? []
                        if (crossIssues.length > 0 || totalHoso > 1) {
                            this.addBotHtml(
                                this.renderer.renderStreamCross(crossIssues, event.conflicts ?? []),
                            ).classList.add('chat-msg-wide')
                        }
                        if (textEl) {
                            textEl.innerHTML =
                                totalHoso > 1
                                    ? 'Đối chiếu chéo xong (kết quả ở trên). Đang kiểm tra từng hồ sơ...'
                                    : 'Đang kiểm tra hồ sơ...'
                        }
                    } else if (event.type === 'hoso') {
                        const stats = perFile.get(event.fileName ?? '')
                        if (stats && event.result) {
                            stats.hosoCount++
                            stats.issueCount += event.result.issueCount
                            if (event.result.xuatToanRisk) stats.riskCount++
                            if (event.result.issueCount > 0) stats.results.push(event.result)
                        }
                        const index = event.index ?? 0
                        const total = event.total ?? 0
                        if (textEl) {
                            textEl.innerHTML = `Đang kiểm tra hồ sơ <b>${index}/${total}</b>...`
                        }
                        if (barEl && total > 0) {
                            barEl.style.width = `${Math.round((index / total) * 100)}%`
                        }
                        if (statsEl) {
                            statsEl.innerHTML =
                                `⚠ <b>${event.riskCount ?? 0}</b> hồ sơ nguy cơ xuất toán · ` +
                                `✔ <b>${index - (event.riskCount ?? 0)}</b> không · ` +
                                `tổng <b>${event.issueCount ?? 0}</b> vấn đề`
                        }
                        // Tiến độ trên header panel — nhìn thấy dù đang cuộn ở đâu
                        this.panel.setBatchProgress(
                            `${index}/${total} · ⚠ ${event.riskCount ?? 0}`,
                            total > 0 ? (index / total) * 100 : null,
                        )
                    } else if (event.type === 'done') {
                        doneEvent = event
                    }
                },
                abort.signal,
            )

            checked = true

            // Tin nhắn tiến độ trở thành tổng kết chi tiết; header báo xong rồi tự ẩn
            if (doneEvent) {
                this.setMessageHtml(progress, this.renderer.renderStreamSummary(doneEvent, perFile, fileErrors))
                const done: Xml130StreamEvent = doneEvent
                this.downloads.attach(
                    progress,
                    ReportBuilder.fromStream(done, perFile, fileErrors, crossIssues, subject),
                )
                const riskCount = done.riskCount ?? 0
                const hosoCount = done.hosoCount ?? 0
                this.panel.completeBatchProgress(`✔ Xong ${hosoCount} hồ sơ · ⚠ ${riskCount}`)
                // Có hồ sơ nguy cơ → buồn; sạch toàn bộ (từ 1 hồ sơ trở lên) → ăn mừng.
                this.robot?.notifyResult(riskCount > 0 ? 'aiError' : hosoCount > 0 ? 'allValid' : 'warning')
            } else {
                this.panel.setBatchProgress(null)
            }
        } catch (error) {
            const stopped = this.isAbort(error)
            // Lô dở dang: file ở lại khay để bấm "Kiểm tra tất cả" chạy lại, không phải tải lần nữa
            for (const item of items) {
                item.status = 'pending'
                item.note = stopped ? 'Đã dừng, kiểm tra lại được' : 'Chưa kiểm tra được, thử lại được'
            }
            this.panel.setBatchProgress(null)

            // Bấm Dừng: phần ĐÃ kiểm tra không mất — render tổng kết dở dang kèm ghi chú
            const checkedCount = [...perFile.values()].reduce((sum, s) => sum + s.hosoCount, 0)
            if (stopped && checkedCount > 0) {
                const partialDone: Xml130StreamEvent = {
                    type: 'done',
                    hosoCount: checkedCount,
                    riskCount: [...perFile.values()].reduce((sum, s) => sum + s.riskCount, 0),
                    issueCount: [...perFile.values()].reduce((sum, s) => sum + s.issueCount, 0),
                    summary:
                        'Đã dừng theo yêu cầu — bên dưới là kết quả của phần hồ sơ ĐÃ kiểm tra (kiểm tra lại bất cứ lúc nào, mỗi lần chạy độc lập, không lưu dở dang trên máy chủ).',
                }
                this.setMessageHtml(
                    progress,
                    '<div class="chat-banner chat-banner-warn">⏹ Đã dừng theo yêu cầu</div>' +
                        this.renderer.renderStreamSummary(partialDone, perFile, fileErrors),
                )
                // Dừng giữa chừng vẫn tải được phần đã kiểm tra
                this.downloads.attach(
                    progress,
                    ReportBuilder.fromStream(
                        partialDone,
                        perFile,
                        fileErrors,
                        crossIssues,
                        [subject, 'đã dừng giữa chừng'].filter((part) => part !== '').join(' '),
                    ),
                )
            } else {
                this.setMessageHtml(progress, this.renderEndOrError(error))
            }
        } finally {
            for (const item of items) {
                item.abort = null
            }
            // Kiểm tra xong: bỏ file khỏi khay để giải phóng bộ nhớ — kết quả đã nằm
            // trong khung chat, không cần xem lại từng file.
            if (checked) this.releaseFiles(items)
            this.setBusy(false) // setBusy tự vẽ lại khay file
        }
    }

    /**
     * Gỡ file khỏi khay sau khi kiểm tra xong. Nội dung XML (nhất là hồ sơ tải từ HIS)
     * chỉ nằm trong RAM của tab, giữ lại không còn tác dụng gì nên bỏ đi ngay.
     */
    private releaseFiles(items: QueuedFile[]): void {
        const ids = new Set(items.map((item) => item.id))
        this.fileQueue = this.fileQueue.filter((item) => !ids.has(item.id))
    }

    private stopOne(id: number): void {
        this.fileQueue.find((f) => f.id === id)?.abort?.abort()
    }

    private stopAll(): void {
        this.fileQueue.forEach((f) => f.abort?.abort())
    }

    private removeQueued(id: number): void {
        const item = this.fileQueue.find((f) => f.id === id)
        item?.abort?.abort()
        this.fileQueue = this.fileQueue.filter((f) => f.id !== id)
        this.renderTray()
    }

    private clearAll(): void {
        this.stopAll()
        this.fileQueue = []
        this.renderTray()
    }

    // ---------------------------------------------------------------
    // Kiểm tra hàng loạt từ danh sách phiếu thanh toán (màn hình Kiểm tra bảng kê)
    // ---------------------------------------------------------------

    /**
     * Thanh hai nút lấy hồ sơ từ bảng kê (mỗi nút một nửa chiều ngang):
     * kiểm tra cả danh sách vừa tìm, hoặc chỉ dòng đang chọn.
     * Chỉ hiện trên màn hình Kiểm tra bảng kê.
     */
    private renderPaymentBar(): void {
        const bar = this.container.querySelector<HTMLElement>('.chat-bangke')
        if (!bar) return
        if (!PaymentListStore.isSupportedPage()) {
            bar.hidden = true
            bar.innerHTML = ''
            return
        }

        const count = this.paymentList.getAdmissionNumbers().length
        const selected = this.paymentList.getSelectedAdmission()
        const patient = this.paymentList.getSelectedPatientName()
        const lockAll = this.isBusy ? 'disabled' : ''
        const lockOne = this.isBusy || selected === null ? 'disabled' : ''
        // Chưa chọn dòng thì nút khóa; chọn rồi mà chưa lấy được tên thì để nhãn chung,
        // nút vẫn bấm được vì số vào viện mới là thứ cần để tải hồ sơ.
        const who = selected === null ? '' : (patient ?? 'Bệnh nhân đang chọn')
        bar.hidden = false
        bar.innerHTML = `
            <div class="chat-bangke-row">
                <button class="chat-bangke-btn" data-act="all" ${lockAll}
                    title="Lấy số vào viện từ danh sách phiếu thanh toán vừa tìm được, tải toàn bộ XML 130 rồi kiểm tra một lượt kèm đối chiếu chéo">
                    📋 Kiểm tra${count > 0 ? ` (${count})` : ''} file XML130
                </button>
                <button class="chat-bangke-btn" data-act="one" ${lockOne}
                    title="${
                        selected === null
                            ? 'Hãy bấm chọn một dòng trên bảng kê trước'
                            : `Kiểm tra XML130 cho BN: ${this.escape(who)}`
                    }">
                    🔎 Kiểm tra XML130 cho BN:${who === '' ? '' : `<span class="chat-bangke-sub">${this.escape(who)}</span>`}
                </button>
            </div>`
        bar.querySelector('[data-act="all"]')?.addEventListener('click', () => void this.checkFromPaymentList())
        bar.querySelector('[data-act="one"]')?.addEventListener('click', () => void this.checkSelectedRow())
    }

    // ---------------------------------------------------------------
    // Kiểm tra theo lô từ màn hình Gửi bảo hiểm 4210 (VNPT-HIS vncare)
    // ---------------------------------------------------------------

    /**
     * Nút kiểm tra theo lô trên màn hình Gửi bảo hiểm 4210: người dùng chọn nhiều
     * bệnh nhân, bấm "Xuất XML KMH" một lần (sniffer bắt tham số), rồi bấm nút này
     * để extension gọi lại đúng lượt xuất đó lấy file XML gộp và kiểm tra một lượt.
     */
    private renderGuiBhxhBar(): void {
        const bar = this.container.querySelector<HTMLElement>('.chat-guibhxh')
        if (!bar) return
        if (!GuiBhxhStore.isSupportedPage()) {
            bar.hidden = true
            bar.innerHTML = ''
            return
        }

        const capture = this.guiBhxh.getCapture()
        const count = capture?.maLkList.length ?? 0
        const lock = this.isBusy || capture === null ? 'disabled' : ''
        bar.hidden = false
        bar.innerHTML = `
            <div class="chat-bangke-row">
                <button class="chat-guibhxh-btn" data-act="kmh" ${lock}
                    title="${
                        capture === null
                            ? 'Hãy tick chọn bệnh nhân rồi bấm nút "Xuất XML KMH" của HIS trước — tôi sẽ dùng đúng lượt xuất đó để lấy file kiểm tra'
                            : `Tải file XML KMH của lượt xuất vừa bấm (${count} bệnh nhân) rồi kiểm tra một lượt kèm đối chiếu chéo`
                    }">
                    📋 Kiểm tra XML KMH${count > 0 ? ` (${this.num(count)} bệnh nhân)` : ''}
                </button>
            </div>`
        bar.querySelector('[data-act="kmh"]')?.addEventListener('click', () => void this.checkFromGuiBhxh())
    }

    /**
     * Gọi lại RestService với đúng tham số của lượt "Xuất XML KMH" người dùng vừa bấm
     * → nhận file XML gộp nhiều hồ sơ → đưa vào khay → kiểm tra một lượt như kéo-thả file.
     */
    private async checkFromGuiBhxh(): Promise<void> {
        if (this.isBusy) return

        const capture = this.guiBhxh.getCapture()
        if (capture === null) {
            this.addBotHtml(
                '⚠ Chưa có lượt xuất XML nào để dùng.<br/>' +
                    'Hãy tick chọn bệnh nhân rồi bấm nút <b>Xuất XML KMH</b> của HIS trước — tôi bắt tham số ' +
                    'từ đúng lượt bấm đó và gọi lại để lấy file, không tự tìm kiếm lần nữa.',
            )
            return
        }
        const count = capture.maLkList.length
        if (count === 0) {
            this.addBotHtml('⚠ Lượt xuất vừa rồi không có bệnh nhân nào. Hãy chọn lại rồi bấm <b>Xuất XML KMH</b>.')
            return
        }

        // Cùng nguyên tắc với bảng kê: không tự cắt bớt danh sách — đối chiếu chéo
        // thiếu hồ sơ còn nguy hiểm hơn không kiểm tra. Chỉ bộ nhớ mới chặn được lô.
        const plan = this.capacity.measure()
        if (count > plan.maxFiles) {
            this.addBotHtml(
                `⚠ Lượt xuất có <b>${this.num(count)}</b> bệnh nhân, vượt sức bộ nhớ cho một lượt ` +
                    `(<b>${this.num(plan.maxFiles)}</b> hồ sơ).<br/>` +
                    `Máy đang dùng: ${plan.summary} — tải file gộp chừng đó hồ sơ vào bộ nhớ tab sẽ làm treo trình duyệt.<br/>` +
                    'Hãy chọn ít bệnh nhân hơn rồi bấm <b>Xuất XML KMH</b> lại.',
            )
            return
        }

        const wait = this.capacity.estimateWait(count, plan)
        const agreed = await this.confirmDialog.ask({
            icon: '📋',
            title: 'Kiểm tra XML KMH',
            messageHtml:
                `Bạn muốn kiểm tra file XML KMH của lượt xuất vừa bấm (<b>${this.num(count)}</b> bệnh nhân)?<br/>` +
                'File sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>' +
                `Thời gian chờ dự kiến: <b>${wait}</b> (máy đang dùng: ${plan.summary}).<br/>` +
                'Trong lúc chạy vẫn xem được tiến độ và bấm <b>Dừng</b> bất cứ lúc nào.',
            confirmLabel: `Kiểm tra ${this.num(count)} hồ sơ`,
            cancelLabel: 'Để sau',
        })
        if (!agreed) return

        const abort = new AbortController()
        this.abortController = abort
        this.setBusy(true)

        const loading = this.addLoadingMessage('Đang tải file XML KMH từ HIS...')
        try {
            const xml = await this.guiBhxhDownloader.download(capture, abort.signal)
            const stamp = new Date(capture.at)
            const pad = (n: number) => String(n).padStart(2, '0')
            const name = `KMH_${capture.hcode || 'hoso'}_${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(
                stamp.getDate(),
            )}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.xml`
            const file = new File([xml], name, { type: 'text/xml' })

            if (file.size > plan.budgetBytes) {
                this.setMessageHtml(
                    loading,
                    `⚠ File XML nặng ${this.mb(file.size)} — vượt ngân sách bộ nhớ của máy này ` +
                        `(${plan.summary} → tối đa ${this.mb(plan.budgetBytes)}MB mỗi lượt).<br/>` +
                        'Hãy chọn ít bệnh nhân hơn rồi bấm <b>Xuất XML KMH</b> lại.',
                )
                return
            }

            this.setMessageHtml(
                loading,
                `Đã tải file <b>${this.escape(name)}</b> (${this.mb(file.size)}, ${this.num(count)} bệnh nhân) — đang đưa vào kiểm tra...`,
            )

            const item: QueuedFile = {
                id: ++this.fileSeq,
                file,
                status: 'pending' as QueuedStatus,
                abort: null,
                note: '',
            }
            this.fileQueue.push(item)
            this.renderTray()
            await this.checkBatch([item])
        } catch (error) {
            this.setMessageHtml(loading, this.renderEndOrError(error))
        } finally {
            this.setBusy(false)
        }
    }


    // ---------------------------------------------------------------
    // Kiểm tra XML Ký tổng từ màn hình Gửi danh sách hồ sơ BHXH 4210 (VNPT-HIS)
    // ---------------------------------------------------------------

    /**
     * Nút kiểm tra XML Ký tổng trên màn hình Gửi DSHS BHXH 4210: người dùng bấm
     * "Xuất XML Ký tổng" (sniffer bắt URL + JWT), rồi bấm nút này để extension gọi
     * lại đúng liên kết đó lấy file XML đã ký số và kiểm tra một lượt.
     */
    private renderGuiKyTongBar(): void {
        const bar = this.container.querySelector<HTMLElement>('.chat-kytong')
        if (!bar) return
        if (!GuiKyTongStore.isSupportedPage()) {
            bar.hidden = true
            bar.innerHTML = ''
            return
        }

        const capture = this.guiKyTong.getCapture()
        const lock = this.isBusy || capture === null ? 'disabled' : ''
        bar.hidden = false
        bar.innerHTML = `
            <div class="chat-bangke-row">
                <button class="chat-kytong-btn" data-act="kytong" ${lock}
                    title="${
                        capture === null
                            ? 'Hãy bấm nút "Xuất XML Ký tổng" của HIS trước — tôi sẽ dùng đúng lượt xuất đó để lấy file kiểm tra'
                            : 'Tải file XML Ký tổng của lượt xuất vừa bấm rồi kiểm tra một lượt kèm đối chiếu chéo'
                    }">
                    📋 Kiểm tra XML Ký tổng
                </button>
            </div>`
        bar.querySelector('[data-act="kytong"]')?.addEventListener('click', () => void this.checkFromGuiKyTong())
    }

    /**
     * Gọi lại IdgStorageUpload với đúng URL + JWT của lượt "Xuất XML Ký tổng"
     * người dùng vừa bấm → nhận file XML gộp đã ký số → đưa vào khay → kiểm tra
     * một lượt như kéo-thả file.
     */
    private async checkFromGuiKyTong(): Promise<void> {
        if (this.isBusy) return

        const capture = this.guiKyTong.getCapture()
        if (capture === null) {
            this.addBotHtml(
                '⚠ Chưa có lượt xuất XML nào để dùng.<br/>' +
                    'Hãy bấm nút <b>Xuất XML Ký tổng</b> của HIS trước — tôi bắt liên kết tải ' +
                    'từ đúng lượt bấm đó và gọi lại để lấy file, không tự tìm kiếm lần nữa.',
            )
            return
        }

        const plan = this.capacity.measure()
        const agreed = await this.confirmDialog.ask({
            icon: '📋',
            title: 'Kiểm tra XML Ký tổng',
            messageHtml:
                'Bạn muốn kiểm tra file XML Ký tổng của lượt xuất vừa bấm?<br/>' +
                'File sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>' +
                `Máy đang dùng: ${plan.summary}.<br/>` +
                'Trong lúc chạy vẫn xem được tiến độ và bấm <b>Dừng</b> bất cứ lúc nào.',
            confirmLabel: 'Kiểm tra',
            cancelLabel: 'Để sau',
        })
        if (!agreed) return

        const abort = new AbortController()
        this.abortController = abort
        this.setBusy(true)

        const loading = this.addLoadingMessage('Đang tải file XML Ký tổng từ HIS...')
        try {
            const xml = await this.guiKyTongDownloader.download(capture, abort.signal)
            const stamp = new Date(capture.at)
            const pad = (n: number) => String(n).padStart(2, '0')
            const name = `KyTong_${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}_${pad(
                stamp.getHours(),
            )}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.xml`
            const file = new File([xml], name, { type: 'text/xml' })

            if (file.size > plan.budgetBytes) {
                this.setMessageHtml(
                    loading,
                    `⚠ File XML nặng ${this.mb(file.size)} — vượt ngân sách bộ nhớ của máy này ` +
                        `(${plan.summary} → tối đa ${this.mb(plan.budgetBytes)}MB mỗi lượt).<br/>` +
                        'Hãy xuất lô ít hồ sơ hơn rồi bấm <b>Xuất XML Ký tổng</b> lại.',
                )
                return
            }

            this.setMessageHtml(
                loading,
                `Đã tải file <b>${this.escape(name)}</b> (${this.mb(file.size)}) — đang đưa vào kiểm tra...`,
            )

            const item: QueuedFile = {
                id: ++this.fileSeq,
                file,
                status: 'pending' as QueuedStatus,
                abort: null,
                note: '',
            }
            this.fileQueue.push(item)
            this.renderTray()
            await this.checkBatch([item])
        } catch (error) {
            this.setMessageHtml(loading, this.renderEndOrError(error))
        } finally {
            this.setBusy(false)
        }
    }

    /**
     * Kiểm tra hồ sơ của dòng phiếu thanh toán đang chọn. Chỉ một file nên chạy thẳng,
     * không hỏi xác nhận. Nút đã bị khóa khi chưa chọn dòng nào — đây chỉ là chốt chặn.
     */
    private async checkSelectedRow(): Promise<void> {
        if (this.isBusy) return
        const soVaoVien = this.paymentList.getSelectedAdmission()
        if (soVaoVien === null) {
            this.addBotHtml('⚠ Hãy bấm chọn một dòng trên bảng kê trước, rồi bấm lại nút này.')
            return
        }
        await this.handleAdmissionCheck(soVaoVien)
    }

    /**
     * Lấy số vào viện từ danh sách phiếu thanh toán đã tìm được → tải toàn bộ XML 130
     * từ HIS → đưa vào khay file → kiểm tra một lượt như khi chọn nhiều file.
     */
    private async checkFromPaymentList(): Promise<void> {
        if (this.isBusy) return

        // Chưa tìm kiếm hoặc tìm không ra phiếu nào → không cho kiểm tra, báo ngay trong khung chat
        if (!this.paymentList.hasSearched()) {
            this.addBotHtml(
                '⚠ Chưa có danh sách phiếu thanh toán nào.<br/>' +
                    'Hãy bấm <b>Xem thông tin</b> trên màn hình <b>Kiểm tra bảng kê</b> trước — tôi sẽ lấy số vào viện ' +
                    'từ đúng danh sách bạn vừa tìm, không tìm lại lần nữa.',
            )
            return
        }
        const numbers = this.paymentList.getAdmissionNumbers()
        if (numbers.length === 0) {
            this.addBotHtml(
                '⚠ Danh sách phiếu thanh toán vừa tìm <b>không có phiếu nào</b> nên chưa có gì để kiểm tra.<br/>' +
                    'Hãy đổi điều kiện tìm kiếm (ngày, đơn vị, trạng thái) rồi tìm lại.',
            )
            return
        }

        // Đã bấm kiểm tra cả lô thì kiểm tra TRỌN danh sách, không tự cắt bớt: kết quả
        // thiếu hồ sơ còn nguy hiểm hơn không kiểm tra, vì đối chiếu chéo sẽ bỏ sót cặp
        // trùng nằm ở phần bị cắt. Chỉ BỘ NHỚ mới chặn được lô: chờ lâu thì báo trước
        // trong hộp xác nhận rồi để người dùng tự quyết, vì bảng kê cả tháng lên tới
        // hàng trăm hồ sơ là chuyện thường và chia nhỏ ra tìm lại còn mất công hơn.
        const plan = this.capacity.measure()
        if (numbers.length > plan.maxFiles) {
            this.addBotHtml(
                `⚠ Danh sách có <b>${this.num(numbers.length)}</b> hồ sơ, vượt sức bộ nhớ cho một lượt ` +
                    `(<b>${this.num(plan.maxFiles)}</b> hồ sơ).<br/>` +
                    `Máy đang dùng: ${plan.summary} — tải chừng đó hồ sơ vào bộ nhớ tab sẽ làm treo trình duyệt.<br/>` +
                    'Tôi <b>không cắt bớt danh sách</b> để chạy một phần, vì đối chiếu chéo sẽ bỏ sót ' +
                    'những hồ sơ nằm ngoài phần được kiểm tra.<br/>' +
                    'Hãy thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi tìm lại.',
            )
            return
        }

        const targets = numbers
        const wait = this.capacity.estimateWait(targets.length, plan)

        const agreed = await this.confirmDialog.ask({
            icon: '📋',
            title: 'Kiểm tra hàng loạt',
            messageHtml:
                `Bạn muốn kiểm tra <b>${this.num(targets.length)}</b> file XML130 lấy từ danh sách phiếu thanh toán vừa tìm?<br/>` +
                'Hồ sơ sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>' +
                `Thời gian chờ dự kiến: <b>${wait}</b> (máy đang dùng: ${plan.summary}).<br/>` +
                'Trong lúc chạy vẫn xem được tiến độ từng hồ sơ và bấm <b>Dừng</b> bất cứ lúc nào.',
            confirmLabel: `Kiểm tra ${this.num(targets.length)} file`,
            cancelLabel: 'Để sau',
        })
        if (!agreed) return

        const abort = new AbortController()
        this.abortController = abort
        this.setBusy(true)

        const loading = this.addLoadingMessage(`Đang tải <b>0/${targets.length}</b> hồ sơ XML 130 từ HIS...`)
        const textEl = loading.querySelector<HTMLElement>('.chat-loading-text')

        let files: File[] = []
        let errors: Array<{ soVaoVien: string; message: string }> = []
        let outOfMemory = false
        try {
            const downloaded = await this.downloadAdmissionFiles(targets, plan, abort.signal, (done) => {
                if (textEl) textEl.innerHTML = `Đang tải <b>${done}/${targets.length}</b> hồ sơ XML 130 từ HIS...`
                this.panel.setBatchProgress(`Tải hồ sơ ${done}/${targets.length}`, (done / targets.length) * 100)
            })
            files = downloaded.files
            errors = downloaded.errors
            outOfMemory = downloaded.outOfMemory
        } finally {
            this.panel.setBatchProgress(null)
            this.setBusy(false)
        }

        const stopped = abort.signal.aborted
        this.setMessageHtml(
            loading,
            `${stopped ? '⏹ Đã dừng khi tải — ' : ''}Đã tải <b>${files.length}/${targets.length}</b> hồ sơ từ HIS.` +
                (errors.length > 0 ? ` <span class="chat-file-note error">${errors.length} hồ sơ không tải được</span>` : ''),
        )
        // Chạm ngưỡng bộ nhớ giữa chừng: dừng hẳn chứ không kiểm tra phần đã tải, vì lô
        // thiếu hồ sơ cho kết quả đối chiếu chéo sai lệch mà nhìn vào vẫn tưởng đủ.
        if (outOfMemory) {
            this.addBotHtml(
                `⚠ Đã dừng ở <b>${files.length}/${targets.length}</b> hồ sơ vì chạm ngưỡng bộ nhớ của máy này ` +
                    `(${plan.summary} → tối đa ${this.mb(plan.budgetBytes)}MB mỗi lượt) — lô này nặng hơn dự tính.<br/>` +
                    'Tôi <b>chưa kiểm tra</b> phần đã tải, vì lô thiếu hồ sơ sẽ làm đối chiếu chéo bỏ sót.<br/>' +
                    'Hãy thu hẹp điều kiện tìm kiếm cho danh sách ngắn lại rồi tìm lại.',
            )
            return
        }
        if (errors.length > 0) {
            const shown = errors.slice(0, 10)
            this.addBotHtml(
                `⚠ <b>${errors.length}</b> hồ sơ không tải được từ HIS (đã bỏ qua, phần còn lại vẫn kiểm tra):<br/>` +
                    shown
                        .map((e) => `• Số vào viện <b>${this.escape(e.soVaoVien)}</b>: ${this.escape(e.message)}`)
                        .join('<br/>') +
                    (errors.length > shown.length ? `<br/>• ... và ${errors.length - shown.length} hồ sơ khác` : ''),
            ).classList.add('chat-msg-wide')
        }

        if (files.length === 0) {
            if (!stopped) this.addBotHtml('Không tải được hồ sơ nào nên chưa kiểm tra được. Kiểm tra lại phiên đăng nhập HIS rồi thử lại.')
            return
        }

        const items: QueuedFile[] = files.map((file) => ({
            id: ++this.fileSeq,
            file,
            status: 'pending' as QueuedStatus,
            abort: null,
            note: '',
        }))
        this.fileQueue.push(...items)
        this.renderTray()
        // Lô nhiều hồ sơ: không có tên riêng nào đại diện được, tên file chỉ còn
        // tiền tố thời điểm kiểm tra — đúng thứ để phân biệt giữa các lượt.
        await this.checkBatch(items)
    }

    /**
     * Tải XML 130 của nhiều số vào viện, chạy song song theo số luồng của máy.
     * Hồ sơ lỗi được gom lại chứ không làm hỏng cả lô; giữ nguyên thứ tự bảng kê.
     * Dừng sớm khi tổng dung lượng chạm ngân sách bộ nhớ của máy — biết trước khi
     * tải hết còn hơn tải xong mới báo là quá sức.
     */
    private async downloadAdmissionFiles(
        numbers: string[],
        plan: CapacityPlan,
        signal: AbortSignal,
        onProgress: (done: number) => void,
    ): Promise<{ files: File[]; errors: Array<{ soVaoVien: string; message: string }>; outOfMemory: boolean }> {
        const slots: Array<File | null> = new Array(numbers.length).fill(null)
        const errors: Array<{ soVaoVien: string; message: string }> = []
        let cursor = 0
        let done = 0
        let bytes = 0
        let outOfMemory = false

        const worker = async (): Promise<void> => {
            while (!signal.aborted && !outOfMemory) {
                const index = cursor++
                if (index >= numbers.length) return
                const soVaoVien = numbers[index]
                try {
                    const xml = await this.xmlDownloader.downloadXml130(soVaoVien, signal)
                    if (xml === null) {
                        throw new Error('Chưa cấu hình kết nối HIS trong extension')
                    }
                    const file = new File([xml], `xml130_${soVaoVien}.xml`, { type: 'text/xml' })
                    slots[index] = file
                    bytes += file.size
                    if (bytes > plan.budgetBytes) outOfMemory = true // các luồng còn lại dừng theo
                } catch (error) {
                    if (this.isAbort(error)) return // người dùng bấm Dừng
                    errors.push({
                        soVaoVien,
                        message: error instanceof Error ? error.message : 'Lỗi tải hồ sơ',
                    })
                }
                onProgress(++done)
            }
        }

        const workerCount = Math.min(plan.parallelDownloads, numbers.length)
        await Promise.all(Array.from({ length: workerCount }, () => worker()))

        return { files: slots.filter((file): file is File => file !== null), errors, outOfMemory }
    }

    /** Kiểm tra theo số vào viện: tải XML 130 từ HIS (dùng phiên đang đăng nhập) rồi validate */
    private async handleAdmissionCheck(admissionNo: string): Promise<void> {
        const loading = this.addLoadingMessage(
            `Đang tải hồ sơ XML 130 của số vào viện <b>${this.escape(admissionNo)}</b> từ HIS...`,
        )
        this.abortController = new AbortController()
        const signal = this.abortController.signal
        this.setBusy(true)

        try {
            const xmlContent = await this.xmlDownloader.downloadXml130(admissionNo, signal)

            if (xmlContent === null) {
                this.setMessageHtml(
                    loading,
                    'Chưa cấu hình kết nối HIS nên tôi không tự tải được hồ sơ theo số vào viện.<br/>' +
                        'Bạn hãy xuất file <b>XML 130</b> từ HIS rồi đính kèm (nút 📎) hoặc kéo-thả vào đây để kiểm tra.',
                )
                return
            }

            this.setMessageHtml(
                loading,
                '<span class="chat-spinner"></span><span class="chat-loading-text">Đã tải xong, đang kiểm tra khả năng xuất toán...</span>',
            )
            const blob = new Blob([xmlContent], { type: 'text/xml' })
            const result = await this.apiClient.validateXml130(blob, `xml130_${admissionNo}.xml`, signal)
            loading.classList.add('chat-msg-wide')
            this.setMessageHtml(loading, this.renderer.renderValidationResult(result))
            this.attachDownload(loading, result, this.patientSubject(admissionNo, result), `xml130_${admissionNo}.xml`)
            this.robot?.notifyResult(
                this.resultFor(result.xuatToanRisk === true, result.found === false || result.hosoCount === 0),
            )
        } catch (error) {
            this.setMessageHtml(loading, this.renderEndOrError(error))
        } finally {
            this.setBusy(false)
        }
    }

    /** Hỏi đáp nghiệp vụ qua API RAG */
    private async handleQuestion(question: string): Promise<void> {
        const loading = this.addLoadingMessage('Đang tìm câu trả lời...')
        this.abortController = new AbortController()
        this.setBusy(true)

        try {
            const response = await this.apiClient.ask(question, this.abortController.signal)
            this.setMessageHtml(loading, this.renderer.renderAnswer(response))
        } catch (error) {
            this.setMessageHtml(loading, this.renderEndOrError(error))
        } finally {
            this.setBusy(false)
        }
    }

    // ---------------------------------------------------------------
    // Helpers hiển thị tin nhắn
    // ---------------------------------------------------------------

    private addUserMessage(text: string): void {
        this.appendMessage('user', this.escape(text))
    }

    private addBotHtml(html: string): HTMLElement {
        return this.appendMessage('bot', html)
    }

    private appendMessage(role: 'user' | 'bot', html: string): HTMLElement {
        // Có tin nhắn mới nghĩa là đã bắt đầu hỏi/kiểm tra → thu lời chào lại
        this.collapseWelcomeOnFirstUse()
        const message = document.createElement('div')
        message.className = `chat-msg chat-msg-${role}`
        message.innerHTML = html
        this.messagesEl?.appendChild(message)
        this.scrollToBottom()
        return message
    }

    private setMessageHtml(message: HTMLElement, html: string): void {
        message.innerHTML = html
        this.scrollToBottom()
    }

    private scrollToBottom(): void {
        if (this.messagesEl) {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight
        }
    }

    /**
     * Suy ra phản ứng cảm xúc của robot từ kết quả kiểm tra:
     * có nguy cơ xuất toán → buồn (sad); thiếu thông tin → bối rối (gãi đầu);
     * đạt → giơ ngón cái (success).
     */
    private resultFor(risk: boolean, incomplete: boolean): RobotResult {
        if (risk) return 'aiError'
        if (incomplete) return 'warning'
        return 'success'
    }

    /** Người dùng bấm Dừng → thông báo trung tính; ngược lại → thông báo lỗi. */
    private renderEndOrError(error: unknown): string {
        if (this.isAbort(error)) {
            return '<span class="chat-loading-text">⏹ Đã dừng theo yêu cầu.</span>'
        }
        return this.buildErrorHtml(error)
    }

    private buildErrorHtml(error: unknown): string {
        // Thông báo từ ChatApiClient đã tự chứa hướng xử lý — không nối thêm câu chung chung
        const detail = error instanceof Error ? error.message : String(error)
        return `❌ ${this.escape(detail)}`
    }

    /** Số lượng hồ sơ có dấu phân cách nghìn kiểu Việt Nam (1.200). */
    private num(value: number): string {
        return value.toLocaleString('vi-VN')
    }

    /** Dung lượng quy ra MB, làm tròn để đọc nhanh. */
    private mb(bytes: number): string {
        return this.num(Math.round(bytes / 1024 / 1024))
    }

    private escape(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }

    // ---------------------------------------------------------------
    // Styles (scoped trong Shadow DOM của UnifiedAssistantPanel)
    // ---------------------------------------------------------------

    private getStyles(): string {
        return `
            .chat-root {
                background: #f8fafc;
                /* Mốc định vị cho hộp thoại xác nhận (.zc-confirm phủ đúng vùng khung chat) */
                position: relative;
            }

            .chat-root.dragging {
                outline: 3px dashed var(--zc-accent-deep, #2563eb);
                outline-offset: -6px;
            }

            .chat-root.dragging .chat-drop-hint { display: block; }

            .chat-drop-hint {
                display: none;
                text-align: center;
                padding: 6px;
                font-size: 12px;
                color: var(--zc-accent-deep, #2563eb);
                background: var(--zc-pastel, #eff6ff);
            }

            .chat-messages {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #f8fafc;
            }

            .chat-msg {
                max-width: 92%;
                padding: 10px 12px;
                border-radius: 12px;
                font-size: 13px;
                line-height: 1.55;
                color: #1f2937;
                word-wrap: break-word;
            }

            .chat-msg-user {
                align-self: flex-end;
                background: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
                border-bottom-right-radius: 4px;
            }

            .chat-msg-bot {
                align-self: flex-start;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-bottom-left-radius: 4px;
            }

            /* Tin nhắn kết quả kiểm tra: chiếm hết chiều ngang để nội dung bung ra đủ rộng */
            .chat-msg-wide {
                max-width: 100%;
                align-self: stretch;
            }

            /* Thanh "Tải kết quả" dưới mỗi lượt kiểm tra: chữ nhỏ + 3 biểu tượng,
               không lấn phần kết quả ở trên. */
            .chat-download {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px dashed #e5e7eb;
            }

            .chat-download-label {
                font-size: 11.5px;
                font-weight: 600;
                color: #6b7280;
            }

            .chat-download-btn {
                width: 28px;
                height: 28px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #f9fafb;
                cursor: pointer;
                line-height: 1;
                transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
            }

            .chat-download-btn svg {
                display: block;
            }

            .chat-download-btn:hover:not(:disabled) {
                background: #eef2ff;
                border-color: var(--zc-accent, #667eea);
                transform: translateY(-1px);
            }

            .chat-download-btn:disabled {
                opacity: 0.5;
                cursor: default;
            }

            .chat-download-busy .chat-download-label::after {
                content: ' - đang tạo file...';
                font-weight: 500;
            }

            .chat-download-error {
                flex: 1 1 100%;
                font-size: 11.5px;
                color: #b91c1c;
            }

            .chat-download-note {
                font-size: 11.5px;
                font-style: italic;
                color: #9ca3af;
            }

            /* Lời chào: mở sẵn lúc chưa hỏi gì, thu về đúng một biểu tượng 💡 khi
               bắt đầu làm việc — bấm biểu tượng là mở lại. */
            .chat-welcome { position: relative; }
            .chat-welcome-body { padding-right: 22px; }
            .chat-welcome-toggle {
                position: absolute;
                top: 6px;
                right: 8px;
                border: none;
                background: transparent;
                cursor: pointer;
                font-size: 15px;
                line-height: 1;
                padding: 2px 4px;
                border-radius: 6px;
                opacity: 0.5;
                transition: opacity 0.15s ease, background 0.15s ease;
            }
            .chat-welcome-toggle:hover { opacity: 1; background: rgba(15, 23, 42, 0.07); }
            /* Thu gọn: giữ biểu tượng 💡 đúng chỗ cũ (mép phải) để mắt không phải
               đi tìm — chỉ có phần nội dung biến mất, nút thì không nhảy chỗ. */
            .chat-welcome-collapsed {
                max-width: max-content;
                align-self: flex-end;
                padding: 4px 6px;
                border-radius: 999px;
            }
            .chat-welcome-collapsed .chat-welcome-body { display: none; }
            .chat-welcome-collapsed .chat-welcome-toggle { position: static; opacity: 0.85; }

            .chat-input-row {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 10px;
                border-top: 1px solid #e5e7eb;
                background: #ffffff;
                flex-shrink: 0;
            }

            /* Khung nhập bo tròn — chứa input + nút "+" + nút gửi. 📎 nằm NGOÀI khung. */
            .chat-input-box {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 2px;
                border: 1px solid #d1d5db;
                border-radius: 22px;
                padding: 2px 6px;
                background: #ffffff;
                transition: border-color 0.15s;
            }
            .chat-input-box:focus-within { border-color: var(--zc-accent-deep, #2563eb); }

            /* Nút icon: ô vuông căn giữa cả 2 chiều để glyph luôn ở giữa */
            .chat-attach, .chat-clear, .chat-send, .chat-plus {
                display: grid;
                place-items: center;
                width: 32px;
                height: 32px;
                padding: 0;
                background: none;
                border: none;
                cursor: pointer;
                border-radius: 50%;
                transition: background 0.15s;
                flex-shrink: 0;
            }
            .chat-attach { font-size: 17px; }
            .chat-clear { font-size: 15px; }
            .chat-send { font-size: 16px; color: var(--zc-accent-deep, #2563eb); }
            .chat-plus { font-size: 21px; color: var(--zc-accent-deep, #2563eb); place-items: normal; }
            .chat-attach:hover, .chat-clear:hover, .chat-send:hover, .chat-plus:hover { background: #f1f5f9; }
            .chat-busy .chat-clear { opacity: 0.4; cursor: not-allowed; }
            .chat-busy .chat-clear:hover { background: none; }
            .chat-plus:disabled { opacity: 0.4; cursor: not-allowed; }
            .chat-plus:disabled:hover { background: none; }

            /* Nút gửi khi đang bận trở thành nút Dừng (đỏ), vẫn bấm được */
            .chat-send.chat-stop {
                color: #dc2626;
                font-size: 15px;
            }
            .chat-send.chat-stop:hover { background: #fef2f2; }

            .chat-input {
                flex: 1;
                min-width: 0;
                border: none;
                background: transparent;
                padding: 8px 6px;
                font-size: 13px;
                outline: none;
                color: #1f2937;
            }

            /* ---- Menu chọn chế độ (bật từ nút "+") ---- */
            .chat-input-wrap { position: relative; }

            .chat-plus-menu {
                position: absolute;
                left: 44px;
                bottom: calc(100% + 4px);
                min-width: 210px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
                overflow: hidden;
                z-index: 10;
            }
            .chat-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #1f2937;
            }
            .chat-menu-item:hover { background: var(--zc-pastel, #eff6ff); }
            .chat-menu-item.active { background: #f8fafc; font-weight: 600; }
            .chat-menu-icon { font-size: 15px; }
            .chat-menu-label { flex: 1; }
            .chat-menu-check { color: var(--zc-accent-deep, #2563eb); font-weight: 700; }

            /* ---- Khay file đính kèm ---- */
            /* Thanh nút lấy hồ sơ từ bảng kê — chỉ hiện trên màn hình Kiểm tra bảng kê */
            .chat-bangke {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-bangke[hidden] { display: none; }
            /* Hai nút chia đôi chiều ngang, cao bằng nhau dù chữ dài ngắn khác nhau */
            .chat-bangke-row { display: flex; gap: 8px; }
            .chat-bangke-btn {
                flex: 1 1 0;
                min-width: 0;
                padding: 9px 8px;
                border: 1px solid var(--zc-accent-deep, #2563eb);
                border-radius: 8px;
                background: #ffffff;
                color: var(--zc-accent-deep, #2563eb);
                font-size: 12.5px;
                font-weight: 600;
                line-height: 1.35;
                text-align: center;
                cursor: pointer;
            }
            /* Tên bệnh nhân của dòng đang chọn — dòng phụ dưới nhãn nút */
            .chat-bangke-sub {
                display: block;
                margin-top: 2px;
                font-size: 11.5px;
                font-weight: 700;
                color: #1f2937;
            }
            .chat-bangke-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-bangke-btn:disabled { opacity: 0.55; cursor: default; }
            /* Thanh nút màn hình Gửi bảo hiểm 4210 (VNPT-HIS) — cùng kiểu thanh bảng kê */
            .chat-guibhxh {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-guibhxh[hidden] { display: none; }
            .chat-guibhxh-btn {
                flex: 1 1 0;
                min-width: 0;
                padding: 9px 8px;
                border: 1px solid var(--zc-accent-deep, #2563eb);
                border-radius: 8px;
                background: #ffffff;
                color: var(--zc-accent-deep, #2563eb);
                font-size: 12.5px;
                font-weight: 600;
                line-height: 1.35;
                text-align: center;
                cursor: pointer;
            }
            .chat-guibhxh-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-guibhxh-btn:disabled { opacity: 0.55; cursor: default; }
            /* Thanh nút màn hình Gửi DSHS BHXH 4210 (VNPT-HIS) — cùng kiểu thanh bảng kê */
            .chat-kytong {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-kytong[hidden] { display: none; }
            .chat-kytong-btn {
                flex: 1 1 0;
                min-width: 0;
                padding: 9px 8px;
                border: 1px solid var(--zc-accent-deep, #2563eb);
                border-radius: 8px;
                background: #ffffff;
                color: var(--zc-accent-deep, #2563eb);
                font-size: 12.5px;
                font-weight: 600;
                line-height: 1.35;
                text-align: center;
                cursor: pointer;
            }
            .chat-kytong-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-kytong-btn:disabled { opacity: 0.55; cursor: default; }



            .chat-tray {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                max-height: 190px;
                overflow-y: auto;
                flex-shrink: 0;
            }
            .chat-tray-list { display: flex; flex-direction: column; gap: 6px; }
            .chat-file-chip {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-left: 3px solid #cbd5e1;
                border-radius: 8px;
            }
            .chat-file-chip.checking { border-left-color: var(--zc-accent-deep, #2563eb); }
            .chat-file-ic { flex-shrink: 0; font-size: 13px; }
            .chat-file-name {
                flex: 1;
                min-width: 0;
                font-size: 12px;
                color: #1f2937;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .chat-file-note {
                font-size: 11px;
                flex-shrink: 0;
                color: #6b7280;
            }
            /* Dùng trong tin nhắn tổng kết tải hồ sơ: số hồ sơ không tải được */
            .chat-file-note.error { color: #dc2626; }
            .chat-file-actions { display: flex; gap: 2px; flex-shrink: 0; }
            .chat-file-btn {
                border: none;
                background: none;
                cursor: pointer;
                font-size: 12px;
                padding: 3px 6px;
                border-radius: 6px;
                color: #64748b;
            }
            .chat-file-btn:hover:not(:disabled) { background: #f1f5f9; }
            .chat-file-btn.go { color: var(--zc-accent-deep, #2563eb); }
            .chat-file-btn.stop { color: #dc2626; }
            .chat-file-btn:disabled { opacity: 0.35; cursor: not-allowed; }

            .chat-tray-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }
            .chat-tray-btn {
                border: 1px solid #d1d5db;
                background: #ffffff;
                cursor: pointer;
                font-size: 12px;
                padding: 5px 10px;
                border-radius: 8px;
                color: #374151;
            }
            .chat-tray-btn:hover:not(:disabled) { background: #f1f5f9; }
            .chat-tray-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .chat-tray-btn.primary {
                background: var(--zc-accent-deep, #2563eb);
                border-color: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
            }
            .chat-tray-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
            .chat-tray-btn.danger {
                background: #fef2f2;
                border-color: #fecaca;
                color: #dc2626;
            }

            /* ---- Tiến độ kiểm tra lô (streaming) ---- */

            .chat-stream-status {
                display: flex;
                align-items: center;
                font-size: 13px;
                color: #1f2937;
            }

            .chat-progress {
                margin-top: 8px;
                height: 8px;
                border-radius: 4px;
                background: #e2e8f0;
                overflow: hidden;
            }

            .chat-progress-bar {
                height: 100%;
                border-radius: 4px;
                background: linear-gradient(90deg, var(--zc-accent-deep, #2563eb), #7c3aed);
                transition: width 0.2s ease;
            }

            .chat-stream-stats {
                margin-top: 6px;
                font-size: 12px;
                color: #475569;
            }

            /* ---- Khối sổ dọc (accordion): tóm tắt trước, bấm để xem chi tiết ---- */

            .chat-expand {
                margin-top: 8px;
                border: 1px solid #dbeafe;
                border-radius: 8px;
                background: #f8fafc;
            }

            .chat-expand > summary {
                cursor: pointer;
                list-style: none;
                padding: 8px 10px;
                font-size: 12px;
                font-weight: 600;
                color: var(--zc-accent-deep, #2563eb);
                user-select: none;
            }

            .chat-expand > summary::-webkit-details-marker { display: none; }

            /* Chevron "›" xoay xuống khi mở — tránh dùng tam giác ▸ vì dễ nhầm nút ▶ Kiểm tra */
            .chat-expand > summary::before {
                content: '\\203A';
                display: inline-block;
                width: 12px;
                margin-right: 4px;
                font-size: 14px;
                line-height: 1;
                transition: transform 0.2s ease;
            }

            .chat-expand[open] > summary::before { transform: rotate(90deg); }

            .chat-expand > summary:hover { background: var(--zc-pastel, #eff6ff); border-radius: 8px; }

            .chat-expand-body {
                padding: 4px 10px 10px;
            }

            .chat-expand[open] .chat-expand-body {
                animation: chat-slide-down 0.22s ease;
            }

            @keyframes chat-slide-down {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: none; }
            }

            /* ---- Sơ đồ xung đột giữa các file ---- */

            .chat-conflict-map {
                margin-top: 8px;
                border: 1px solid #fde68a;
                background: #fffbeb;
                border-radius: 8px;
                padding: 8px 10px;
            }

            .chat-conflict-title {
                font-size: 12px;
                font-weight: 700;
                color: #92400e;
                margin-bottom: 6px;
            }

            .chat-conflict-row {
                display: flex;
                align-items: baseline;
                gap: 6px;
                flex-wrap: wrap;
                font-size: 12px;
                padding: 2px 0;
            }

            .chat-conflict-file { font-weight: 600; color: #1f2937; }
            .chat-conflict-arrow { color: #d97706; font-weight: 700; }
            .chat-conflict-others { color: #4b5563; }

            /* ---- Hồ sơ liên quan một vấn đề chéo: ai trước (hợp lệ) / ai cần rà soát ---- */

            .chat-ref-list {
                margin: 4px 0 0 17px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .chat-ref-row {
                display: flex;
                align-items: baseline;
                gap: 8px;
                flex-wrap: wrap;
                font-size: 11px;
            }

            .chat-ref-name { font-weight: 600; color: #1f2937; }
            .chat-ref-file { color: #6b7280; }

            .chat-ref-badge {
                font-size: 10px;
                font-weight: 700;
                padding: 1px 7px;
                border-radius: 9px;
                white-space: nowrap;
            }

            .chat-ref-first {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .chat-ref-review {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }

            /* ---- Kết quả kiểm tra lô + đối chiếu chéo ---- */

            .chat-cross-group {
                border: 1px solid #c7d2fe;
                background: #eef2ff;
                border-radius: 8px;
                padding: 8px;
            }

            .chat-cross-clean {
                font-size: 12px;
                color: #15803d;
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 8px 10px;
                margin-top: 6px;
            }

            .chat-batch-file {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #ffffff;
                margin-top: 8px;
                padding: 0;
            }

            .chat-batch-file summary {
                cursor: pointer;
                list-style: none;
                display: flex;
                align-items: baseline;
                flex-wrap: wrap;
                gap: 4px 8px;
                padding: 8px 10px;
                font-size: 12px;
                color: #334155;
                user-select: none;
            }

            .chat-batch-file summary::-webkit-details-marker { display: none; }

            /* Chevron "›" xoay xuống khi mở (không dùng tam giác ▶ mặc định — giống nút Kiểm tra) */
            .chat-batch-file summary::before {
                content: '\\203A';
                display: inline-block;
                width: 10px;
                flex-shrink: 0;
                font-size: 14px;
                line-height: 1;
                color: #64748b;
                transition: transform 0.2s ease;
                align-self: center;
            }

            .chat-batch-file[open] > summary::before { transform: rotate(90deg); }

            .chat-batch-file summary:hover { background: #f8fafc; }

            .chat-batch-file-name {
                font-weight: 600;
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .chat-batch-who {
                font-weight: 400;
                color: #334155;
                background: #f1f5f9;
                border-radius: 8px;
                padding: 1px 8px;
                font-size: 11px;
            }

            .chat-batch-note {
                font-weight: 400;
                color: #6b7280;
                margin-left: auto;
                font-size: 11px;
                flex-shrink: 0;
            }

            .chat-batch-file-body {
                padding: 8px 10px;
                border-top: 1px dashed #e5e7eb;
            }

            .chat-file-result-head {
                font-weight: 600;
                font-size: 12px;
                color: #334155;
                margin-bottom: 6px;
                padding-bottom: 4px;
                border-bottom: 1px dashed #e5e7eb;
            }

            /* ---- Trạng thái đang xử lý ---- */

            /* Vòng xoay trong bong bóng chat, đồng bộ với vòng xoay trên nút nổi */
            .chat-spinner {
                display: inline-block;
                width: 12px;
                height: 12px;
                margin-right: 8px;
                vertical-align: -1px;
                border: 2px solid #cbd5e1;
                border-top-color: var(--zc-accent-deep, #2563eb);
                border-radius: 50%;
                animation: chat-spin 0.7s linear infinite;
            }

            @keyframes chat-spin {
                to { transform: rotate(360deg); }
            }

            .chat-loading-text { color: #64748b; }

            /* Khóa thao tác khi đang chờ kết quả để không gửi chồng yêu cầu */
            .chat-busy .chat-input {
                background: #f8fafc;
                color: #94a3b8;
                cursor: not-allowed;
            }

            /* Khi bận chỉ khóa nút đính kèm; nút gửi thành nút Dừng vẫn bấm được */
            .chat-busy .chat-attach {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .chat-busy .chat-attach:hover { background: none; }

            /* ---- Kết quả kiểm tra XML 130 ---- */

            .chat-banner {
                padding: 10px 12px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 8px;
            }

            .chat-banner-risk {
                background: #fee2e2;
                color: #b91c1c;
                border: 1px solid #fecaca;
            }

            .chat-banner-ok {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .chat-banner-warn {
                background: #fef9c3;
                color: #854d0e;
                border: 1px solid #fde68a;
            }

            .chat-result-summary {
                font-size: 12px;
                color: #4b5563;
                margin-bottom: 6px;
            }

            .chat-result-text {
                font-size: 12px;
                color: #374151;
                margin-bottom: 6px;
            }

            .chat-result-ai {
                font-size: 12px;
                color: #4338ca;
                background: #eef2ff;
                border-radius: 6px;
                padding: 6px 8px;
                margin-bottom: 6px;
            }

            .chat-hoso {
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                padding: 10px;
                margin-top: 8px;
                background: #ffffff;
            }

            .chat-hoso-header {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .chat-hoso-name {
                font-weight: 600;
                font-size: 13px;
                color: #111827;
            }

            .chat-hoso-meta {
                font-size: 11px;
                color: #6b7280;
                margin: 2px 0 6px;
            }

            .chat-hoso-clean {
                font-size: 12px;
                color: #15803d;
            }

            .chat-badge-risk {
                display: inline-block;
                background: #dc2626;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                white-space: nowrap;
            }

            .chat-issue-group { margin-top: 8px; }

            .chat-issue-group-title {
                font-size: 12px;
                font-weight: 700;
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 3px;
                margin-bottom: 6px;
            }

            .chat-issue {
                padding: 6px 8px;
                border-radius: 6px;
                margin-bottom: 4px;
                background: #f9fafb;
            }

            .chat-issue-line {
                display: flex;
                align-items: baseline;
                gap: 6px;
                flex-wrap: wrap;
            }

            .chat-issue-message {
                font-size: 12px;
                color: #1f2937;
                flex: 1;
                min-width: 0;
            }

            /* Badge số lần lặp của một lỗi đã được gộp (vd ×22) */
            .chat-issue-count {
                font-size: 10px;
                font-weight: 700;
                color: #475569;
                background: #e2e8f0;
                border-radius: 9px;
                padding: 1px 7px;
                white-space: nowrap;
            }

            .chat-sev { font-size: 11px; }
            .chat-sev-error { color: #dc2626; }
            .chat-sev-warning { color: #f59e0b; }
            .chat-sev-info { color: #3b82f6; }

            .chat-issue-location {
                font-size: 11px;
                color: #6b7280;
                margin-top: 2px;
                margin-left: 17px;
            }

            .chat-issue-suggestion {
                font-size: 11px;
                color: #92400e;
                background: #fffbeb;
                border-left: 3px solid #f59e0b;
                border-radius: 4px;
                padding: 4px 8px;
                margin-top: 4px;
                margin-left: 17px;
                white-space: pre-wrap;
            }

            /* ---- Hỏi đáp RAG ---- */

            .chat-answer { white-space: pre-wrap; }

            .chat-citations {
                margin-top: 8px;
                font-size: 12px;
            }

            .chat-citations summary {
                cursor: pointer;
                color: var(--zc-accent-deep, #2563eb);
                font-weight: 600;
            }

            .chat-citations ul {
                margin: 6px 0 0;
                padding-left: 16px;
            }

            .chat-citation { margin-bottom: 6px; }

            .chat-citation-excerpt {
                color: #6b7280;
                font-style: italic;
                margin-top: 2px;
            }
        `
    }
}
