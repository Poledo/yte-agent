// Kiểm tra bản mới của chính extension (cơ chế tự host, không qua Chrome Web Store).
//
// Máy chủ phát hành hai file (xem ExtensionReleaseController phía API):
//   /api/extension-release/update.xml      — version mới nhất + URL tải .crx
//   /api/extension-release/zerocheck-ai.crx — gói cài đã ký
//
// Có HAI đường cập nhật:
// 1. TỰ ĐỘNG: extension cài bằng .crx + chính sách máy trạm (ExtensionInstallForcelist)
//    thì Chrome tự hỏi update.xml ~5 giờ/lần và tự lên đời, không cần ai bấm.
// 2. CHỦ ĐỘNG: nút "Kiểm tra bản mới" trong popup gọi checkForUpdate() so version ngay;
//    nếu có bản mới thì gọi chrome.runtime.requestUpdateCheck() ép Chrome tải luôn
//    thay vì chờ chu kỳ 5 giờ. Chỉ có tác dụng khi extension cài dạng .crx — bản
//    "Load unpacked" (chế độ nhà phát triển) Chrome từ chối cập nhật, popup sẽ nói rõ.

import { ApiConfiguration } from '../content/api/ApiConfiguration'

export const CHECK_UPDATE_MESSAGE = 'zc-check-update'
export const FORCE_UPDATE_MESSAGE = 'zc-force-update'

export interface UpdateCheckResult {
    /** 'up-to-date' | 'update-available' | 'update-downloading' | 'not-supported' | 'error' */
    status: string
    /** Version đang chạy. */
    currentVersion: string
    /** Version mới nhất trên máy chủ (nếu hỏi được). */
    latestVersion?: string
    message: string
}

const api = new ApiConfiguration()

/** So sánh version dạng a.b.c: trả <0 nếu a cũ hơn b, 0 nếu bằng, >0 nếu a mới hơn. */
export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
    const len = Math.max(pa.length, pb.length)
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
        if (diff !== 0) return diff
    }
    return 0
}

/** Đọc version mới nhất từ update.xml trên máy chủ. */
async function fetchLatestVersion(signal?: AbortSignal): Promise<string> {
    const response = await fetch(`${api.baseUrl}/api/extension-release/update.xml`, {
        cache: 'no-store',
        signal,
    })
    if (!response.ok) {
        throw new Error(`Máy chủ trả về ${response.status}`)
    }
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml')
    const version = xml.querySelector('app updatecheck')?.getAttribute('version')
    if (!version) {
        throw new Error('File update.xml không có thông tin version')
    }
    return version
}

/**
 * Hỏi máy chủ có bản mới không. Chỉ SO SÁNH — không tải gì cả; việc tải do
 * Chrome tự làm (requestUpdateCheck hoặc chu kỳ tự động).
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
    const currentVersion = chrome.runtime.getManifest().version
    try {
        const latestVersion = await fetchLatestVersion()
        if (compareVersions(latestVersion, currentVersion) > 0) {
            return {
                status: 'update-available',
                currentVersion,
                latestVersion,
                message: `Có bản mới ${latestVersion} (đang dùng ${currentVersion}).`,
            }
        }
        return {
            status: 'up-to-date',
            currentVersion,
            latestVersion,
            message: `Đang dùng bản mới nhất (${currentVersion}).`,
        }
    } catch {
        return {
            status: 'error',
            currentVersion,
            message: 'Không hỏi được máy chủ. Kiểm tra kết nối mạng rồi thử lại.',
        }
    }
}

/**
 * Ép Chrome tải và cài bản mới NGAY (không chờ chu kỳ 5 giờ).
 *
 * Chrome chỉ cho cập nhật extension cài dạng đóng gói (.crx / chính sách máy trạm).
 * Bản "Load unpacked" của chế độ nhà phát triển luôn bị từ chối — báo rõ để người
 * dùng biết phải cài lại bằng file .crx thay vì tưởng nút hỏng.
 */
export async function forceUpdate(): Promise<UpdateCheckResult> {
    const check = await checkForUpdate()
    if (check.status === 'error') return check
    if (check.status === 'up-to-date') return check

    // requestUpdateCheck là API MV2 nhưng Chrome vẫn giữ cho extension đóng gói ở MV3;
    // bộ type @types/chrome mới đã bỏ khai báo nên phải cast để gọi được.
    const requestUpdateCheck = (
        chrome.runtime as unknown as {
            requestUpdateCheck?: (cb: (result: string) => void) => void
        }
    ).requestUpdateCheck

    const status = await new Promise<string>((resolve) => {
        if (typeof requestUpdateCheck !== 'function') {
            resolve('not-supported')
            return
        }
        try {
            requestUpdateCheck((result) => {
                if (chrome.runtime.lastError) {
                    resolve('error')
                    return
                }
                resolve(result)
            })
        } catch {
            resolve('not-supported')
        }
    })

    if (status === 'update_available' || status === 'throttled') {
        return {
            ...check,
            status: 'update-downloading',
            message: `${check.message} Chrome đang tải bản mới — mở lại tiện ích sau vài phút.`,
        }
    }
    if (status === 'no_update') {
        // Chrome cho rằng đang là bản mới nhất: gần như chắc chắn extension cài dạng
        // unpacked (chế độ nhà phát triển) — dạng này Chrome KHÔNG BAO GIỜ tự cập nhật.
        return {
            ...check,
            status: 'not-supported',
            message:
                'Tiện ích đang cài ở chế độ nhà phát triển nên Chrome không cho tự cập nhật. ' +
                'Hãy gỡ bản cũ và cài lại bằng file .crx do đơn vị cung cấp.',
        }
    }
    return {
        ...check,
        status: 'error',
        message: 'Không cập nhật được. Hãy gỡ bản cũ và cài lại bằng file .crx mới nhất.',
    }
}
