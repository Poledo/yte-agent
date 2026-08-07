// Content Script — chạy trong isolated world của Chrome.
//
// Việc bắt các thay đổi giá trị do JavaScript của trang HIS gây ra (chọn bệnh
// nhân từ popup danh sách thì trang điền hàng loạt trường) KHÔNG làm được ở đây:
// isolated world có context JS riêng, vá prototype tại đây không ảnh hưởng mã
// của trang. Việc đó do src/page/FieldSyncBridge.ts đảm nhiệm — script chạy
// trong page context (world MAIN, khai báo ở manifest), phát sự kiện
// __hisFieldSync__ để EventBinder ở đây bắt được.

import { FieldRegistry } from '../shared/registry/FieldRegistry'
import { FormAnalyzer } from './analyzer/FormAnalyzer'
import { ChangeTracker } from './tracker/ChangeTracker'
import { NotificationManager } from './notification/NotificationManager'
import { WarningListView } from './notification/WarningListView'
import { UnifiedAssistantPanel } from './ui/UnifiedAssistantPanel'
import { OnboardingTour } from './ui/OnboardingTour'
import { applyPastelTheme } from '../shared/PastelTheme'
import { ValidationEngine, RequiredRule, DateCompareRule, RegexRule, ICDInactiveRule } from './validation'
import { ValidationPipeline } from './pipeline'
import { ChatPanel, PaymentListStore } from './chat'
import { createRobotRenderer, loadExtensionConfig } from './robot'
import type { RobotRenderer } from './robot'
import { PopupController } from './robot/PopupController'
import { LifeDirector } from './robot/life'

console.log('ZeroCheck AI Loaded')

/**
 * Bật/tắt kiểm tra realtime từng trường — gọi POST /api/validation mỗi khi một
 * trường trên form HIS thay đổi (gồm cả khi popup điền giá trị qua FieldSyncBridge).
 *
 * ĐANG TẮT theo yêu cầu: giữ nguyên toàn bộ code (engine, pipeline, tracker,
 * FieldSyncBridge) nhưng KHÔNG tự gọi API. Đổi thành true để bật lại.
 * Không ảnh hưởng tính năng kiểm tra XML 130 ở khung chat (dùng luồng riêng).
 */
const ENABLE_REALTIME_FIELD_VALIDATION = true

// Initialize content script
async function initializeContent(): Promise<void> {
    console.log('Content script initialization started')

    // Initialize Field Registry
    const fieldRegistry = new FieldRegistry()
    console.log('[FieldRegistry] Initialized')

    // Initialize Form Analyzer
    const formAnalyzer = new FormAnalyzer()
    console.log('[FormAnalyzer] Initialized')

    // Initialize Change Tracker for dynamic form changes (start early to catch mutations)
    const changeTracker = new ChangeTracker(formAnalyzer, fieldRegistry)
    console.log('[ChangeTracker] Initialized')

    // Initialize Validation Engine
    const validationEngine = new ValidationEngine()

    // Register rules
    validationEngine.registerRule(new RequiredRule())
    validationEngine.registerRule(new DateCompareRule())
    validationEngine.registerRule(new RegexRule())
    validationEngine.registerRule(new ICDInactiveRule())

    console.log('[ValidationEngine] Initialized with', validationEngine.getRuleCount(), 'rules')

    // Initialize Validation Pipeline
    const validationPipeline = new ValidationPipeline(validationEngine)

    // Register page mappings
    validationPipeline.registerPageMapping('Diagnosis', [
        'maBenhNhan',
        'ngaySinh',
        'gioiTinh',
        'icdVao',
        'icdRa',
        'icdChuan',
        'chanDoan',
        'tenBacSi',
    ])
    validationPipeline.registerPageMapping('PatientIntake', [
        'maBenhNhan',
        'hoTen',
        'ngaySinh',
        'gioiTinh',
        'danToc',
        'quocGia',
        'soBhyt',
        'cccd',
        'soDienThoai',
        'diaChi',
    ])
    validationPipeline.registerPageMapping('MedicalEncounter', [
        'maBenhNhan',
        'ngayKham',
        'ngayVao',
        'ngayRa',
        'khoa',
        'phong',
        'giuong',
        'trieuChung',
        'chanDoanBan',
        'chanDoanPhu',
    ])

    console.log('[ValidationPipeline] Initialized')

    // Debounce timers per field to avoid multiple validations during typing
    const debounceTimers: Record<string, number> = {}
    const focusedFields: Set<string> = new Set()
    const DEBOUNCE_DELAY = 300 // ms (reduced for faster ICD validation)

    // Trường phụ thuộc: đổi giới tính / ngày sinh thì các mã ICD đã nhập phải được
    // kiểm tra lại (ICD gắn điều kiện giới tính, độ tuổi). Không có bản đồ này,
    // đổi giới tính sau khi nhập ICD sẽ không phát hiện xung đột.
    // So khớp không phân biệt hoa thường vì id trường trên HIS có nhiều biến thể
    // (gioiTinh, cbGioiTinh, gender...).
    const FIELD_DEPENDENCIES: Record<string, string[]> = {
        gioitinh: ['icdVao', 'icdRa'],
        cbgioitinh: ['icdVao', 'icdRa'],
        gender: ['icdVao', 'icdRa'],
        ngaysinh: ['icdVao', 'icdRa'],
        dateofbirth: ['icdVao', 'icdRa'],
    }

    const getDependentFields = (changedFieldId: string): string[] =>
        FIELD_DEPENDENCIES[changedFieldId.toLowerCase()] ?? []

    // Chống spam thông báo mất kết nối: chỉ báo lại sau mỗi 30 giây
    let lastConnectionErrorAt = 0
    const CONNECTION_ERROR_COOLDOWN = 30_000 // ms

    // Initialize unified UI: ONE floating button + ONE panel with 2 tabs (Cảnh báo / Trợ lý)
    const assistantPanel = new UnifiedAssistantPanel()
    console.log('[UnifiedAssistantPanel] Initialized')

    // Robot mascot: thay nút nổi 🤖 mặc định làm "launcher". Bấm robot → mở/đóng panel.
    // Bật/tắt qua công tắc trong popup (chrome.storage key robotEnabled).
    // Hình hài robot (Nút thường / Trợ lý động / Trợ lý 3D) + ngưỡng sinh hoạt lấy từ web-admin qua API
    // khi trang tải xong; lỗi/offline thì rơi về mặc định (Bi) nên robot luôn xuất hiện.
    const config = await loadExtensionConfig()
    console.log('[ExtensionConfig] robotRenderer =', config.robotRenderer)
    // Màu chủ đạo = nguyên màu robot cấu hình trên web admin (1 màu phẳng):
    // đặt biến --zc-* ở documentElement để thấm vào mọi shadow root (panel, chat, tour).
    applyPastelTheme(document.documentElement, config.appearance.color)
    const robot: RobotRenderer = createRobotRenderer(config.robotRenderer, config.thresholds, config.appearance)
    // Nút nổi 🤖 mặc định KHỞI TẠO ẨN (tránh "nhấp nháy nút rồi mới ra robot" lúc chờ tải
    // model 3D 1–2s). Chỉ HIỆN lại khi hình hài là "Nút thường" (không tự làm launcher):
    // giữ nút tròn mặc định làm launcher, đồng bộ ẩn/hiện theo công tắc robot trong popup.
    // Hình hài robot mascot tự làm launcher → cứ để ẩn, robot xuất hiện khi tải xong.
    if (robot.providesLauncher !== false) {
        assistantPanel.useExternalLauncher()
    } else {
        new PopupController((enabled) => {
            assistantPanel.setLauncherVisible(enabled)
            if (!enabled) assistantPanel.close() // tắt robot → đóng panel nếu đang mở
        }).init()
    }
    robot.onActivate(() => {
        if (assistantPanel.isPanelOpen()) {
            assistantPanel.close() // close() phát onClose → robot.notifyChatClosed()
        } else {
            assistantPanel.open('chat')
            robot.notifyChatOpened()
        }
    })
    // Đóng panel bằng nút ✕ / phím Esc cũng phải đưa robot về trạng thái ban đầu,
    // nếu không robot kẹt ở tư thế "lắng nghe" (nhắm mắt cười).
    assistantPanel.onClose(() => robot.notifyChatClosed())
    console.log('[RobotMascot] Initialized')

    // Tour hướng dẫn TƯƠNG TÁC lần đầu: tự mở panel chat và spotlight vào đúng
    // nút thật (robot → tab Cảnh báo → 📎 → ô nhập). Chỉ hiện một lần;
    // popup có nút "Xem lại hướng dẫn" gửi message để mở lại bất cứ lúc nào.
    const onboardingTour = new OnboardingTour({
        openChat: () => {
            if (!assistantPanel.isPanelOpen()) {
                assistantPanel.open('chat')
                robot.notifyChatOpened()
            } else {
                assistantPanel.open('chat') // đảm bảo đang ở đúng tab Trợ lý
            }
        },
        clickPlus: () => assistantPanel.clickPlusButton(),
        getRect: (kind) => assistantPanel.getUiRect(kind),
        // Hai nút bảng kê chỉ có trên màn hình Kiểm tra bảng kê — màn hình khác thì
        // bỏ hẳn các bước đó thay vì chỉ tay vào chỗ trống.
        supports: (kind) =>
            kind === 'bangke-all' || kind === 'bangke-one' ? PaymentListStore.isSupportedPage() : true,
    })
    void onboardingTour.showIfFirstRun()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === 'zc-show-onboarding') {
            onboardingTour.show()
            sendResponse({ ok: true })
        }
    })

    // Warning tab view (renders validation notifications)
    const warningView = new WarningListView(assistantPanel)

    // Initialize Notification Manager FIRST (before callbacks use it)
    const notificationManager = new NotificationManager(warningView, (notification) => {
        console.log('[NotificationManager] Explain button clicked:', notification)
        // TODO: Handle explanation in future task
    })
    console.log('[NotificationManager] Initialized')

    // Hook validation to field changes with debounce
    changeTracker.onFieldChange((fieldId) => {
        // Kiểm tra realtime đang TẮT — giữ code, không tự gọi /api/validation.
        if (!ENABLE_REALTIME_FIELD_VALIDATION) return
        console.log(`[Validation] Field changed: ${fieldId}`)

        // Skip validation for search/display fields (textIcdVao, textIcdRa, textIcdChuan)
        // Only validate when actual code fields change (icdVao, icdRa, icdChuan) or direct user input
        if (['textIcdVao', 'textIcdRa', 'textIcdChuan'].includes(fieldId)) {
            console.log(`[Validation] Skipping search field: ${fieldId}`)
            return
        }

        // Ensure field has focus listener
        const field = fieldRegistry.get(fieldId)
        if (field && !field.element.hasAttribute('data-has-focus-listener')) {
            field.element.addEventListener('focus', () => {
                focusedFields.add(fieldId)
                console.log(`[Focus] Field ${fieldId} focused`)
            })
            field.element.setAttribute('data-has-focus-listener', 'true')
        }

        // Mark field as focused
        focusedFields.add(fieldId)

        // Trường thay đổi + các trường phụ thuộc nó (vd đổi giới tính → check lại ICD đã nhập)
        const fieldsToValidate = [fieldId, ...getDependentFields(fieldId)]

        // Clear previous timer for this field
        if (debounceTimers[fieldId]) {
            clearTimeout(debounceTimers[fieldId])
        }

        // Set new timer
        debounceTimers[fieldId] = setTimeout(async () => {
            delete debounceTimers[fieldId]

            // Đọc lại giá trị thật từ DOM trước khi kiểm tra.
            // Trang HIS gán giá trị bằng JS (chọn "Nữ" ở cbgioitinh thì trang tự
            // gán input gioitinh = 0) mà không sinh sự kiện input/change, nên nếu
            // tin vào giá trị đã lưu thì hệ thống kiểm tra nhầm dữ liệu cũ.
            const refreshed = fieldRegistry.refreshValues()
            if (refreshed > 0) {
                console.log(`[Validation] Đã đồng bộ ${refreshed} trường với giá trị thật trên form`)
            }

            for (const fId of fieldsToValidate) {
                const isDependent = fId !== fieldId
                const validateField = fieldRegistry.get(fId)
                if (!validateField) {
                    if (!isDependent) {
                        console.warn(`[Validation] Field ${fId} not found in registry`)
                    }
                    continue
                }

                const currentValue = validateField.value ?? ''

                // Trường gốc: chỉ hiển thị khi đang focus (hành vi cũ).
                // Trường phụ thuộc: kiểm tra lại bất kể focus, nhưng chỉ khi đã có giá trị
                // (chưa nhập ICD thì không có gì để check lại).
                if (isDependent) {
                    if (currentValue === '') {
                        continue
                    }
                    console.log(`[Validation] Re-checking dependent field ${fId} (triggered by ${fieldId})`)
                } else if (!focusedFields.has(fId)) {
                    console.log(`[Validation] Field ${fId} not focused, skipping result display`)
                    continue
                }

                console.log(`[Validation] Validating field: ${fId}, value: "${validateField.value}"`)

                const formValues = new Map()
                // Collect all form values for cross-field validation
                fieldRegistry.getAll().forEach((f) => {
                    formValues.set(f.id, f.value)
                })

                const context = {
                    currentPage: window.location.href,
                    currentField: validateField,
                    currentValue: currentValue,
                    formValues: formValues,
                    fieldRegistry: fieldRegistry,
                    metadata: {},
                }

                // Chỉ báo "đang kiểm tra" trên nút nổi trong suốt lượt kiểm tra
                assistantPanel.beginChecking()
                let pipelineResult
                try {
                    pipelineResult = await validationPipeline.validateField(context)
                } finally {
                    assistantPanel.endChecking()
                }

                console.log(
                    `[Pipeline] Decision: ${pipelineResult.decision}, Local Passed: ${pipelineResult.localPassed}, Remote Called: ${pipelineResult.remoteCalled}`,
                )

                // Mất kết nối máy chủ: báo cho người dùng biết (có cooldown chống spam)
                if (pipelineResult.remoteError) {
                    const now = Date.now()
                    if (now - lastConnectionErrorAt > CONNECTION_ERROR_COOLDOWN) {
                        lastConnectionErrorAt = now
                        notificationManager.notify({
                            field: validateField.element,
                            level: 'warning',
                            title: 'Mất kết nối máy chủ kiểm tra',
                            message: pipelineResult.remoteError,
                            suggestion: 'Kiểm tra Backend API đang chạy; các cảnh báo hiển thị hiện tại chỉ là kiểm tra cục bộ.',
                            canExplain: false,
                            metadata: { fieldLabel: validateField.label },
                            timestamp: Date.now(),
                        })
                    }
                }

                // Show results from pipeline (local + remote)
                const resultsToDisplay = pipelineResult.localResults

                if (resultsToDisplay.length > 0) {
                    console.log(`[ValidationResults] ${fId}:`, resultsToDisplay)
                    // Show all errors as notifications
                    resultsToDisplay.forEach((result) => {
                        notificationManager.notify({
                            field: result.field.element,
                            level: result.level,
                            title: result.title,
                            message: result.message,
                            suggestion: result.suggestion,
                            canExplain: result.canExplain,
                            metadata: {
                                ...result.metadata,
                                fieldLabel: result.field.label,
                            },
                            timestamp: Date.now(),
                        })
                    })
                } else if (!pipelineResult.remoteError) {
                    // Field validation passed - remove error for this field.
                    // Khi mất kết nối thì KHÔNG xóa cảnh báo cũ — kết quả rỗng
                    // do không kiểm tra được, không có nghĩa là trường đã đúng.
                    console.log(`[Validation] Field ${fId}: PASS`)
                    notificationManager.clearFieldError(validateField.element)
                }
            }
        }, DEBOUNCE_DELAY)
    })

    // Handle field blur
    // Notification stays until field is fixed (passes validation)
    changeTracker.onFieldBlur((fieldId, _element) => {
        console.log(`[Blur] Field ${fieldId} - user left field`)
        focusedFields.delete(fieldId)

        // Cancel any pending validation for this field
        // Notification will stay visible until user fixes it
        if (debounceTimers[fieldId]) {
            clearTimeout(debounceTimers[fieldId])
            delete debounceTimers[fieldId]
        }
    })

    // Start tracking DOM changes and field value changes
    changeTracker.start(document)
    console.log('[ChangeTracker] Started monitoring for form changes')

    // Scan page after a small delay to allow JS to render forms
    // Use requestAnimationFrame for better performance
    let scanAttempt = 0
    const maxScanAttempts = 5

    const performScan = (): void => {
        scanAttempt++
        console.log(`[Scan] Attempt ${scanAttempt} - Starting form analysis on page...`)

        const fieldsBefore = fieldRegistry.size()
        formAnalyzer.scan(document, fieldRegistry)
        const fieldsAfter = fieldRegistry.size()
        const newFieldsFound = fieldsAfter - fieldsBefore

        console.log(`[Scan Complete] Found ${fieldsAfter} total field(s) on page (${newFieldsFound} new)`)

        // Bind events to newly discovered fields
        if (newFieldsFound > 0) {
            // Re-bind all fields after scan to ensure event listeners are attached
            const eventBinder = changeTracker.getEventBinder()
            if (eventBinder) {
                eventBinder.bindAll()
            }
        }

        if (fieldsAfter === 0 && scanAttempt < maxScanAttempts) {
            // Retry after a short delay if no fields found
            console.log(`[Scan] No fields found, retrying in 500ms...`)
            setTimeout(performScan, 500)
        } else if (fieldsAfter === 0) {
            console.warn('[Warning] No form fields detected after multiple attempts')
        } else {
            const allFields = fieldRegistry.getAll()
            console.log('[Fields]', allFields)
        }
    }

    // Start scanning after DOM is ready (use requestAnimationFrame for better timing)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            requestAnimationFrame(performScan)
        })
    } else {
        // DOM already loaded
        requestAnimationFrame(performScan)
    }

    // Initialize Chat tab (Kiểm tra hồ sơ XML 130 + hỏi đáp nghiệp vụ) in unified panel
    const chatPanel = new ChatPanel(assistantPanel)
    chatPanel.attachRobot(robot) // robot biểu cảm theo trạng thái/kết quả kiểm tra
    console.log('[ChatPanel] Initialized')

    // Focus chat input whenever the "Trợ lý" tab becomes active + robot chuyển sang "lắng nghe"
    assistantPanel.onTabChange((tab) => {
        if (tab === 'chat') {
            chatPanel.focusInput()
            robot.notifyChatOpened()
        }
    })

    // Expose objects globally for testing
    ;(window as unknown as Record<string, unknown>).hisAssistantPanel = assistantPanel
    ;(window as unknown as Record<string, unknown>).hisChatPanel = chatPanel
    ;(window as unknown as Record<string, unknown>).aiValidationNotifier = notificationManager
    ;(window as unknown as Record<string, unknown>).validationEngine = validationEngine
    ;(window as unknown as Record<string, unknown>).validationPipeline = validationPipeline
    ;(window as unknown as Record<string, unknown>).fieldRegistry = fieldRegistry
    ;(window as unknown as Record<string, unknown>).hisRobot = robot
    // Bộ não sinh hoạt v2 (RDD Expansion): đã wire vào robot — leo thang khi chờ AI
    // lâu (RobotMascot) và robot sống trong popup (PopupRobot). Expose thêm một
    // instance để thử nhanh trong console:
    //   hisRobotLife.currentPhase(new Date()); hisRobotLife.nextActivity(new Date())
    ;(window as unknown as Record<string, unknown>).hisRobotLife = new LifeDirector()
}

void initializeContent()
