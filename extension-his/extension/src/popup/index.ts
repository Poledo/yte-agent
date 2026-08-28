// Popup Script
// Handles popup UI interactions

import { PopupRobot } from '../content/robot/home'
import { PopupRobot3D } from '../content/robot/three/PopupRobot3D'
import { loadExtensionConfig } from '../content/robot/ExtensionConfig'
import { applyPastelTheme } from '../shared/PastelTheme'
import {
    CATALOG_IMPORT_CANCEL,
    CATALOG_IMPORT_PROGRESS,
    CATALOG_IMPORT_START,
    CATALOG_IMPORT_STATUS,
    type CatalogFileProgress,
    type CatalogImportState,
} from '../shared/his/CatalogImportChannel'
import { loadLicenseSettings, saveLicenseSettings } from '../shared/license/LicenseSettings'
import {
    CHECK_UPDATE_MESSAGE,
    FORCE_UPDATE_MESSAGE,
    type UpdateCheckResult,
} from '../background/ExtensionUpdater'

function initializePopup(): void {
    console.log('Popup initialized')

    const versionElement = document.getElementById('version')
    if (versionElement) {
        versionElement.textContent = chrome.runtime.getManifest().version
    }

    initializeSettings()
    initializeLicenseSettings()
    initializePopupRobot()
    initializeGuideButton()
    initializeCatalogImport()
    initializeUpdateCheck()
}

/**
 * Nút "Kiểm tra bản mới": hỏi máy chủ có bản mới không; nếu có thì đổi nút thành
 * "Cập nhật ngay" để ép Chrome tải bản mới luôn (không chờ chu kỳ tự động ~5 giờ).
 * Việc so version và gọi Chrome chạy ở service worker (xem ExtensionUpdater).
 */
function initializeUpdateCheck(): void {
    const button = document.getElementById('checkUpdate') as HTMLButtonElement | null
    const status = document.getElementById('updateStatus')
    if (!button || !status) return

    let hasUpdate = false

    const showStatus = (message: string, tone: 'ok' | 'warn' | 'error'): void => {
        status.textContent = message
        status.dataset.tone = tone
        status.hidden = false
    }

    const handleResult = (result: UpdateCheckResult | undefined): void => {
        button.disabled = false
        if (!result) {
            showStatus('Không kiểm tra được. Hãy tải lại tiện ích rồi thử lại.', 'error')
            return
        }
        if (result.status === 'update-available') {
            hasUpdate = true
            button.textContent = '⬇ Cập nhật ngay'
            showStatus(result.message, 'warn')
            return
        }
        if (result.status === 'update-downloading') {
            showStatus(result.message, 'warn')
            return
        }
        if (result.status === 'not-supported') {
            showStatus(result.message, 'error')
            return
        }
        if (result.status === 'error') {
            showStatus(result.message, 'error')
            return
        }
        showStatus(result.message, 'ok')
    }

    button.addEventListener('click', () => {
        button.disabled = true
        status.hidden = true
        const type = hasUpdate ? FORCE_UPDATE_MESSAGE : CHECK_UPDATE_MESSAGE
        chrome.runtime.sendMessage({ type }, (response) => {
            if (chrome.runtime.lastError) {
                handleResult(undefined)
                return
            }
            handleResult(response as UpdateCheckResult | undefined)
        })
    })
}

/**
 * Ô khai khóa bản quyền của cơ sở KCB.
 *
 * Đây là màn hình DUY NHẤT người dùng khai được khóa, nên mọi thông báo lỗi 401
 * ở panel chat đều chỉ về đây (xem describeLicenseError trong LicenseSettings).
 *
 * Lưu cả 3 ô trong MỘT lượt bấm chứ không tự lưu theo từng phím: khóa dài, gõ dở
 * dang mà đã lưu thì request kế tiếp gửi khóa cụt và bị máy chủ từ chối.
 */
function initializeLicenseSettings(): void {
    const keyInput = document.getElementById('licenseKey') as HTMLInputElement | null
    const facilityInput = document.getElementById('facilityCode') as HTMLInputElement | null
    const staffInput = document.getElementById('staffCode') as HTMLInputElement | null
    const saveButton = document.getElementById('saveLicense') as HTMLButtonElement | null
    const status = document.getElementById('licenseStatus')
    if (!keyInput || !facilityInput || !staffInput || !saveButton || !status) return

    const showStatus = (message: string, tone: 'ok' | 'error'): void => {
        status.textContent = message
        status.dataset.tone = tone
        status.hidden = false
    }

    void loadLicenseSettings().then((settings) => {
        keyInput.value = settings.licenseKey
        facilityInput.value = settings.facilityCode
        staffInput.value = settings.staffCode
        if (!settings.licenseKey) {
            showStatus('Chưa khai khóa bản quyền - nhập khóa đơn vị được cấp rồi bấm Lưu.', 'error')
        }
    })

    saveButton.addEventListener('click', () => {
        const licenseKey = keyInput.value.trim()
        if (!licenseKey) {
            showStatus('Chưa nhập khóa bản quyền.', 'error')
            keyInput.focus()
            return
        }

        saveButton.disabled = true
        saveLicenseSettings({ licenseKey, facilityCode: facilityInput.value, staffCode: staffInput.value })
            .then(async () => {
                // Đọc lại từ storage để ô hiển thị đúng thứ ĐÃ lưu (khóa được viết hoa,
                // khoảng trắng bị cắt) chứ không phải thứ người dùng vừa gõ.
                const saved = await loadLicenseSettings()
                keyInput.value = saved.licenseKey
                facilityInput.value = saved.facilityCode
                staffInput.value = saved.staffCode
                showStatus('Đã lưu. Khóa có hiệu lực ngay, không cần tải lại trang HIS.', 'ok')
            })
            .catch(() => {
                showStatus('Không lưu được khóa. Hãy tải lại tiện ích rồi thử lại.', 'error')
            })
            .finally(() => {
                saveButton.disabled = false
            })
    })
}

/**
 * Nút "Nạp danh mục HIS": lấy toàn bộ danh mục từ HIS người dùng đang đăng nhập
 * (thuốc, vật tư, dịch vụ kỹ thuật, CĐHA, xét nghiệm, giường, nhân viên...) và nạp
 * vào hệ thống để đối chiếu hồ sơ XML 130.
 *
 * Popup chỉ ra lệnh và vẽ tiến độ; việc tải/nạp chạy ở service worker nên đóng
 * popup giữa chừng cũng không mất lượt nạp (xem HisCatalogImporter).
 */
function initializeCatalogImport(): void {
    const button = document.getElementById('importCatalog') as HTMLButtonElement | null
    const cancelButton = document.getElementById('catalogCancel') as HTMLButtonElement | null
    if (!button) return

    button.addEventListener('click', () => {
        button.disabled = true
        chrome.runtime.sendMessage({ type: CATALOG_IMPORT_START }, (response) => {
            if (chrome.runtime.lastError || !response?.state) {
                button.disabled = false
                renderCatalogState({
                    running: false,
                    phase: '',
                    facilityCode: '',
                    files: [],
                    finished: true,
                    error: 'Không khởi động được việc nạp danh mục. Hãy tải lại tiện ích rồi thử lại.',
                })
                return
            }
            renderCatalogState(response.state as CatalogImportState)
        })
    })

    cancelButton?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: CATALOG_IMPORT_CANCEL }, (response) => {
            if (!chrome.runtime.lastError && response?.state) {
                renderCatalogState(response.state as CatalogImportState)
            }
        })
    })

    // Service worker đẩy tiến độ về mỗi khi trạng thái đổi
    chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === CATALOG_IMPORT_PROGRESS) {
            renderCatalogState(message.state as CatalogImportState)
        }
    })

    // Mở lại popup giữa lượt nạp → hiện đúng tiến độ đang chạy
    chrome.runtime.sendMessage({ type: CATALOG_IMPORT_STATUS }, (response) => {
        if (chrome.runtime.lastError || !response?.state) return
        const state = response.state as CatalogImportState
        if (state.running || state.files.length > 0 || state.error) {
            renderCatalogState(state)
        }
    })
}

/** Nhãn tiếng Việt cho từng trạng thái nạp của một file danh mục. */
const CATALOG_STATUS_LABELS: Record<CatalogFileProgress['status'], string> = {
    pending: 'Chờ',
    downloading: 'Đang tải',
    uploading: 'Đang nạp',
    imported: 'Đã nạp',
    skipped: 'Không đổi',
    failed: 'Lỗi',
}

/** Vẽ lại toàn bộ bảng tiến độ nạp danh mục theo trạng thái mới nhất. */
function renderCatalogState(state: CatalogImportState): void {
    const button = document.getElementById('importCatalog') as HTMLButtonElement | null
    const panel = document.getElementById('catalogPanel')
    const phase = document.getElementById('catalogPhase')
    const errorBox = document.getElementById('catalogError')
    const list = document.getElementById('catalogFiles')
    const cancelButton = document.getElementById('catalogCancel') as HTMLButtonElement | null
    if (!button || !panel || !phase || !errorBox || !list || !cancelButton) return

    button.disabled = state.running
    panel.hidden = false
    phase.textContent = state.phase
    errorBox.textContent = state.error
    errorBox.hidden = state.error === ''
    cancelButton.hidden = !state.running

    list.replaceChildren(
        ...state.files.map((file) => {
            const row = document.createElement('div')

            const line = document.createElement('div')
            line.className = 'catalog-file'

            // Hiện tên danh mục tiếng Việt (nhãn nút trên HIS); tên file thật và
            // URL để ở tooltip cho người quản trị đối chiếu khi có lỗi.
            const name = document.createElement('span')
            name.className = 'catalog-file-name'
            name.textContent = file.label || file.fileName
            name.title = `${file.fileName}\n${file.url}`

            const status = document.createElement('span')
            status.className = 'catalog-file-status'
            status.dataset.status = file.status
            status.textContent = CATALOG_STATUS_LABELS[file.status]

            line.append(name, status)
            row.append(line)

            // Chỉ file lỗi mới cần nêu lý do; nạp thành công đã tự rõ
            if (file.status === 'failed' && file.message) {
                const reason = document.createElement('div')
                reason.className = 'catalog-file-error'
                reason.textContent = file.message
                row.append(reason)
            }
            return row
        }),
    )
}

/**
 * Nút "Xem lại hướng dẫn sử dụng": gửi message cho content script trên tab đang mở
 * để hiện lại tour 3 bước (OnboardingTour). Tab không phải trang HIS (không có
 * content script) → hiện dòng nhắc thay vì im lặng.
 */
function initializeGuideButton(): void {
    const button = document.getElementById('showOnboarding') as HTMLButtonElement | null
    const hint = document.getElementById('onboardingHint')
    if (!button) return

    button.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id
            if (tabId == null) {
                if (hint) hint.hidden = false
                return
            }
            chrome.tabs.sendMessage(tabId, { type: 'zc-show-onboarding' }, () => {
                if (chrome.runtime.lastError) {
                    // Không có content script trên tab này (không phải trang HIS)
                    if (hint) hint.hidden = false
                    return
                }
                window.close() // đóng popup để người dùng thấy tour ngay
            })
        })
    })
}

/**
 * Robot "sống trong ngôi nhà" là chính cửa sổ popup (task-002 §2). Hình hài popup ăn
 * theo cấu hình web-admin: chọn "Trợ lý 3D" (`three`) → mount robot 3D ngay trong popup;
 * còn lại → robot SVG (PopupRobot). 3D lỗi → tự rơi về SVG để robot LUÔN hiện.
 */
function initializePopupRobot(): void {
    const stage = document.getElementById('popup-robot')
    if (!stage) return
    const ui = {
        caption: document.getElementById('popup-robot-caption'),
        state: document.getElementById('popup-robot-state'),
    }
    const startSvg = (): void => {
        new PopupRobot(stage, ui).start()
    }
    // Cấu hình lấy bất đồng bộ; lỗi/timeout → mặc định (không phải 'three') → robot SVG.
    loadExtensionConfig()
        .then((config) => {
            // Popup cũng dùng nguyên màu robot cấu hình trên web admin
            applyPastelTheme(document.documentElement, config.appearance.color)
            if (config.robotRenderer === 'three') {
                const robot3d = new PopupRobot3D(stage, ui, config.appearance)
                robot3d.start(startSvg) // 3D lỗi → rơi về SVG
                bindTestWalk(robot3d)
            } else {
                startSvg()
            }
        })
        .catch(startSvg)
}

/** [TẠM] Nút test màn "đi tới va màn hình" — hiện nút + gọi demo trên robot 3D popup; bỏ khi test xong. */
function bindTestWalk(robot3d: PopupRobot3D): void {
    const btn = document.getElementById('popup-test-walk') as HTMLButtonElement | null
    if (!btn) return
    btn.hidden = false
    btn.addEventListener('click', () => robot3d.demoWalkToScreen())
}

/**
 * Các cài đặt bật/tắt — lưu chrome.storage.local:
 * - autoOpenOnWarning (mặc định BẬT): tự mở panel khi có cảnh báo.
 * - autoMaximizeOnBatch (mặc định TẮT): tự phóng to panel khi kiểm tra nhiều file XML 130.
 * Content script lắng nghe storage.onChanged nên thay đổi có hiệu lực ngay,
 * không cần reload trang HIS.
 */
function initializeSettings(): void {
    bindToggle('autoOpenOnWarning', true)
    bindToggle('autoMaximizeOnBatch', false)
    // robotEnabled (mặc định BẬT): tắt → robot bay lên ngủ; bật → robot nhảy ra rơi về góc.
    // Nhãn đổi theo trạng thái nút gạt: bật → "Bật trợ lý robot", tắt → "Tắt trợ lý robot".
    bindToggle('robotEnabled', true, {
        el: document.getElementById('robotEnabledLabel'),
        on: 'Trợ lý robot đang bật',
        off: 'Trợ lý robot đang tắt',
    })
}

/** Nhãn động cho một nút gạt: đổi chữ theo trạng thái bật/tắt. */
interface DynamicLabel {
    el: HTMLElement | null
    on: string
    off: string
}

/** Nối một checkbox với key chrome.storage.local cùng tên (id = key). */
function bindToggle(key: string, defaultValue: boolean, dynamicLabel?: DynamicLabel): void {
    const checkbox = document.getElementById(key) as HTMLInputElement | null
    if (!checkbox) return

    const syncLabel = (): void => {
        if (dynamicLabel?.el) {
            dynamicLabel.el.textContent = checkbox.checked ? dynamicLabel.on : dynamicLabel.off
        }
    }

    chrome.storage.local.get({ [key]: defaultValue }, (items) => {
        checkbox.checked = items[key] === true || (defaultValue && items[key] !== false)
        syncLabel()
    })

    checkbox.addEventListener('change', () => {
        chrome.storage.local.set({ [key]: checkbox.checked })
        syncLabel()
    })
}

initializePopup()
