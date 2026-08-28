import { GuiKyTongCapture } from '../../shared/his/GuiBhxhChannel'

/**
 * Tải file XML Ký tổng (QĐ 130, đã ký số) từ VNPT-HIS bằng cách gọi lại đúng
 * liên kết IdgStorageUpload mà người dùng vừa bấm (do GuiBhxhSniffer bắt được).
 *
 * XÁC THỰC: fetch chạy trong content script trên chính trang HIS mà người dùng
 * ĐÃ ĐĂNG NHẬP — cùng origin nên trình duyệt tự đính cookie phiên
 * (credentials: 'include'); JWT gửi nguyên như request gốc qua header
 * Authorization. Extension KHÔNG tự đăng nhập.
 *
 * Response là JSON { code, message, results } — results là CHUỖI XML cần lấy.
 */
export class GuiKyTongXmlDownloader {
    /**
     * Gọi IdgStorageUpload lấy file XML. Trả text XML (một file gộp nhiều hồ sơ).
     * @param capture URL + JWT của lượt xuất do sniffer bắt được.
     * @param signal AbortSignal để hủy khi người dùng bấm Dừng.
     */
    async download(capture: GuiKyTongCapture, signal?: AbortSignal): Promise<string> {
        console.log(`[GuiKyTongXmlDownloader] GET ${capture.url}`)

        const headers: Record<string, string> = { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest' }
        if (capture.auth !== '') headers.Authorization = capture.auth

        const response = await fetch(capture.url, {
            method: 'GET',
            credentials: 'include',
            headers,
            signal,
        })

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                'HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào VNPT-HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (!response.ok) {
            throw new Error(`HIS trả về lỗi HTTP ${response.status} khi tải XML Ký tổng.`)
        }

        const text = await response.text()

        // HIS hết phiên thường trả HTML trang login (200) thay vì JSON — nhận diện
        // để báo đúng nguyên nhân thay vì đẩy HTML vào bộ validate.
        const head = text.trimStart().slice(0, 200).toLowerCase()
        if (head.includes('<!doctype html') || head.includes('dangnhap') || head.includes('login')) {
            throw new Error(
                'Chưa đăng nhập HIS hoặc phiên đã hết hạn. ' +
                    'Hãy đăng nhập vào VNPT-HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (text.trim() === '') {
            throw new Error('HIS không trả về nội dung nào cho lượt xuất này.')
        }

        // Response chuẩn: JSON { code, message, results: "<XML>" }
        try {
            const payload = JSON.parse(text) as { code?: number; message?: string; results?: unknown } | null
            const results = typeof payload?.results === 'string' ? payload.results : ''
            if (results.trim() !== '') return results
            if (payload && typeof payload.code === 'number' && payload.code !== 200) {
                throw new Error(`HIS từ chối lượt tải: ${payload.message ?? `mã lỗi ${payload.code}`}.`)
            }
        } catch (error) {
            // Lỗi nghiệp vụ ném ở trên thì giữ nguyên; lỗi parse JSON thì rơi xuống dưới
            if (error instanceof Error && error.message.startsWith('HIS từ chối')) throw error
        }

        // Không phải JSON bọc — có thể HIS trả thẳng XML, dùng được thì dùng.
        if (head.startsWith('<?xml')) return text
        throw new Error('Phản hồi của HIS không đúng định dạng mong đợi (thiếu nội dung XML).')
    }
}
