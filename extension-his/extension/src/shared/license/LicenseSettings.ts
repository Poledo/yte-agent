/**
 * Khóa bản quyền của cơ sở KCB và các thông tin đi kèm mọi request lên máy chủ.
 *
 * Dịch vụ bán theo TỪNG CƠ SỞ KCB, nên máy chủ phải biết request đến từ cơ sở nào —
 * mã cơ sở khai trong file XML không dùng được cho việc này vì nó là dữ liệu người
 * dùng tự nhập, sửa một chữ là tiền nhảy sang đơn vị khác. Khóa bản quyền là thứ
 * duy nhất trả lời câu hỏi "ai đang gọi" và "ai chịu tiền".
 *
 * Lưu ở chrome.storage.local (theo máy trạm, không đồng bộ lên tài khoản Google):
 * khóa là bí mật của đơn vị, không nên trôi theo tài khoản cá nhân sang máy khác.
 */

/** Tên các key trong chrome.storage.local. */
export const LICENSE_KEY_STORAGE = 'licenseKey'
export const FACILITY_CODE_STORAGE = 'facilityCode'
export const STAFF_CODE_STORAGE = 'staffCode'

/** Header máy chủ đọc để nhận diện đơn vị gọi. */
export const LICENSE_HEADER = 'X-License-Key'
export const FACILITY_HEADER = 'X-Facility-Code'
export const STAFF_HEADER = 'X-Staff-Code'

export interface LicenseSettings {
    /** Khóa bản quyền dạng ZC-{mã cơ sở}-{chuỗi bí mật}. Rỗng = chưa khai. */
    licenseKey: string
    /** Mã cơ sở KCB của máy trạm — chỉ dùng cho thống kê, không dùng để tính tiền. */
    facilityCode: string
    /** Mã nhân viên đang dùng máy trạm — để tra ai đã kiểm hồ sơ nào. */
    staffCode: string
}

const EMPTY: LicenseSettings = { licenseKey: '', facilityCode: '', staffCode: '' }

/** Đọc cấu hình đã lưu. Chưa khai gì thì trả về chuỗi rỗng, KHÔNG ném lỗi. */
export async function loadLicenseSettings(): Promise<LicenseSettings> {
    try {
        const items = await chrome.storage.local.get({
            [LICENSE_KEY_STORAGE]: '',
            [FACILITY_CODE_STORAGE]: '',
            [STAFF_CODE_STORAGE]: '',
        })
        return {
            licenseKey: String(items[LICENSE_KEY_STORAGE] ?? '').trim(),
            facilityCode: String(items[FACILITY_CODE_STORAGE] ?? '').trim(),
            staffCode: String(items[STAFF_CODE_STORAGE] ?? '').trim(),
        }
    } catch {
        // Content script chạy trong trang HIS có thể mất quyền storage khi tiện ích
        // vừa được cập nhật — thà gửi request thiếu header còn hơn chặn nghiệp vụ.
        return EMPTY
    }
}

/** Lưu cấu hình (bỏ khoảng trắng thừa; khóa luôn viết hoa cho khớp lúc cấp). */
export async function saveLicenseSettings(settings: Partial<LicenseSettings>): Promise<void> {
    const payload: Record<string, string> = {}
    if (settings.licenseKey !== undefined) {
        payload[LICENSE_KEY_STORAGE] = settings.licenseKey.trim().toUpperCase()
    }
    if (settings.facilityCode !== undefined) {
        payload[FACILITY_CODE_STORAGE] = settings.facilityCode.trim()
    }
    if (settings.staffCode !== undefined) {
        payload[STAFF_CODE_STORAGE] = settings.staffCode.trim()
    }
    await chrome.storage.local.set(payload)
}

/**
 * Header nhận diện đơn vị cho một request. Trường nào chưa khai thì BỎ HẲN khỏi
 * header thay vì gửi chuỗi rỗng — máy chủ phân biệt "không gửi" với "gửi rỗng".
 */
export async function buildLicenseHeaders(): Promise<Record<string, string>> {
    const settings = await loadLicenseSettings()
    const headers: Record<string, string> = {}
    if (settings.licenseKey) headers[LICENSE_HEADER] = settings.licenseKey
    if (settings.facilityCode) headers[FACILITY_HEADER] = settings.facilityCode
    if (settings.staffCode) headers[STAFF_HEADER] = settings.staffCode
    return headers
}

/**
 * Thông báo tiếng Việt cho hai mã lỗi riêng của phần bản quyền.
 * Trả về null nếu không phải lỗi bản quyền (để chỗ gọi xử lý như lỗi thường).
 */
export function describeLicenseError(status: number, serverMessage?: string): string | null {
    if (status === 401) {
        return (
            serverMessage ||
            'Khóa bản quyền chưa khai hoặc không còn hiệu lực. Mở tiện ích (biểu tượng trên thanh ' +
                'trình duyệt) → mục "Khóa bản quyền" để nhập lại khóa đơn vị được cấp.'
        )
    }
    if (status === 403) {
        return (
            serverMessage ||
            'Hồ sơ khai mã cơ sở KCB không thuộc phạm vi hợp đồng của đơn vị. Kiểm tra lại mã cơ ' +
                'sở trong file, hoặc liên hệ đơn vị cung cấp dịch vụ để mở rộng phạm vi.'
        )
    }
    return null
}
