// Background Service Worker
// Entry point for background tasks

import {
    CATALOG_IMPORT_CANCEL,
    CATALOG_IMPORT_START,
    CATALOG_IMPORT_STATUS,
} from '../shared/his/CatalogImportChannel'
import {
    CHECK_UPDATE_MESSAGE,
    FORCE_UPDATE_MESSAGE,
    checkForUpdate,
    forceUpdate,
} from './ExtensionUpdater'
import { HisCatalogImporter } from './HisCatalogImporter'

console.log('ZeroCheck AI Background Service Worker loaded')

// Initialize background tasks
function initializeBackground(): void {
    console.log('Background initialization started')
    listenCatalogImport()
    listenUpdateCheck()
}

/**
 * Nút "Kiểm tra bản mới" ở popup: hỏi máy chủ có bản mới không và (nếu có) ép
 * Chrome tải ngay thay vì chờ chu kỳ tự động ~5 giờ. Xem ExtensionUpdater.
 */
function listenUpdateCheck(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === CHECK_UPDATE_MESSAGE) {
            void checkForUpdate().then(sendResponse)
            return true // trả lời bất đồng bộ
        }
        if (message?.type === FORCE_UPDATE_MESSAGE) {
            void forceUpdate().then(sendResponse)
            return true
        }
        return false
    })
}

/**
 * Nút "Nạp danh mục HIS" ở popup chỉ gửi lệnh; việc nạp chạy tại đây.
 *
 * Vì sao không chạy thẳng trong popup? Popup đóng ngay khi người dùng bấm ra ngoài
 * cửa sổ, trong khi tải và nạp vài chục danh mục mất vài phút. Đặt ở service worker
 * thì đóng popup rồi mở lại vẫn thấy tiến độ chạy tiếp.
 */
function listenCatalogImport(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        const importer = HisCatalogImporter.shared()

        if (message?.type === CATALOG_IMPORT_START) {
            // Không await: trả trạng thái "đang chạy" ngay, tiến độ đẩy về sau qua broadcast
            void importer.start()
            sendResponse({ state: importer.getState() })
            return false
        }
        if (message?.type === CATALOG_IMPORT_STATUS) {
            sendResponse({ state: importer.getState() })
            return false
        }
        if (message?.type === CATALOG_IMPORT_CANCEL) {
            importer.cancel()
            sendResponse({ state: importer.getState() })
            return false
        }
        return false
    })
}

initializeBackground()
