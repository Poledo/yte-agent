/**
 * Điểm tích hợp HIS: tải file XML 130 theo số vào viện.
 */
export interface IHisXmlDownloader {
    /**
     * Tải nội dung XML 130 của một hồ sơ theo định danh (số vào viện).
     * @param signal AbortSignal để hủy khi người dùng bấm Dừng.
     * @returns text XML, hoặc null nếu chưa cấu hình endpoint HIS.
     */
    downloadXml130(identifier: string, signal?: AbortSignal): Promise<string | null>
}

/**
 * Implement mặc định: đọc URL template từ chrome.storage.local (key "hisXmlEndpoint").
 *
 * Template chứa placeholder {soVaoVien} (hoặc {patientCode} để tương thích cũ) —
 * sẽ được thay bằng giá trị người dùng nhập. Chưa cấu hình → dùng URL mặc định
 * của cơ sở (có thể đổi trong popup extension).
 *
 * XÁC THỰC: fetch chạy trong content script trên chính trang HIS mà người dùng
 * ĐÃ ĐĂNG NHẬP, nên cùng origin — trình duyệt tự đính kèm cookie phiên
 * (credentials: 'include'). Extension KHÔNG tự đăng nhập, KHÔNG xử lý captcha:
 * con người đã đăng nhập, tool chỉ dùng lại phiên đang mở.
 */
export class HisXmlDownloader implements IHisXmlDownloader {
    private static readonly STORAGE_KEY_ENDPOINT = 'hisXmlEndpoint'

    /**
     * URL mặc định KHÔNG hardcode domain: {origin} được thay bằng origin của
     * trang HIS đang mở (yte-ninhthuan / yte-khanhhoa / ... đều tự khớp).
     * loaiKcb/coBaoHiem/maHoa mặc định theo link xuất XML CV130.
     */
    static readonly DEFAULT_ENDPOINT =
        '{origin}/web_his/api/xuatFileXmlCV130?loaiKcb=1&coBaoHiem=1&maHoa=0&soVaoVien={soVaoVien}'

    async downloadXml130(identifier: string, signal?: AbortSignal): Promise<string | null> {
        const template = (await this.getEndpointTemplate()) ?? HisXmlDownloader.DEFAULT_ENDPOINT
        if (!template) {
            console.log('[HisXmlDownloader] Chưa cấu hình hisXmlEndpoint')
            return null
        }

        // {origin} → domain HIS đang mở; giữ tương thích URL tuyệt đối người dùng tự đặt
        const origin = typeof location !== 'undefined' ? location.origin : ''
        const encoded = encodeURIComponent(identifier)
        const url = template
            .replace('{origin}', origin)
            .replace('{soVaoVien}', encoded)
            .replace('{patientCode}', encoded)
        console.log(`[HisXmlDownloader] GET ${url}`)

        // Gửi kèm cookie phiên HIS hiện tại (cùng origin với trang đang mở)
        const response = await fetch(url, { credentials: 'include', signal })

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                'HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (!response.ok) {
            throw new Error(`HIS trả về lỗi HTTP ${response.status} khi tải XML 130.`)
        }

        const text = await response.text()

        // HIS chưa đăng nhập thường trả HTML trang login (200) thay vì XML —
        // nhận diện để báo đúng nguyên nhân thay vì đẩy HTML vào bộ validate.
        const head = text.trimStart().slice(0, 200).toLowerCase()
        if (
            !head.startsWith('<?xml') &&
            (head.includes('<!doctype html') || head.includes('dangnhap') || head.includes('loginform'))
        ) {
            throw new Error(
                'Chưa đăng nhập HIS hoặc không có quyền tải hồ sơ này. ' +
                    'Hãy đăng nhập vào HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (text.trim() === '') {
            // HIS không trả về nội dung nào → không tải được hồ sơ
            throw new Error('Không tìm thấy hồ sơ cho số vào viện này. Kiểm tra lại số vào viện.')
        }

        return text
    }

    /** Đọc URL template từ cấu hình extension (null nếu chưa đặt). */
    private async getEndpointTemplate(): Promise<string | null> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const data = await chrome.storage.local.get(HisXmlDownloader.STORAGE_KEY_ENDPOINT)
                const template = data[HisXmlDownloader.STORAGE_KEY_ENDPOINT]
                if (typeof template === 'string' && template.trim() !== '') {
                    return template.trim()
                }
            }
        } catch (error) {
            console.warn('[HisXmlDownloader] Không đọc được cấu hình endpoint:', error)
        }
        return null
    }
}
