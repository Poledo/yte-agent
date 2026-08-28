import { GuiBhxhExportCapture } from '../../shared/his/GuiBhxhChannel'

/**
 * Tải file XML KMH (QĐ 130) từ VNPT-HIS bằng cách gọi lại RestService với
 * ĐÚNG bộ tham số của lượt "Xuất XML KMH" mà người dùng vừa bấm
 * (do GuiBhxhSniffer bắt được).
 *
 * XÁC THỰC: fetch chạy trong content script trên chính trang HIS mà người dùng
 * ĐÃ ĐĂNG NHẬP — cùng origin nên trình duyệt tự đính cookie phiên
 * (credentials: 'include'). Extension KHÔNG tự đăng nhập: con người đã đăng
 * nhập, tool chỉ dùng lại phiên đang mở.
 */
export class GuiBhxhXmlDownloader {
    /**
     * Gọi RestService lấy file XML. Trả text XML (một file gộp nhiều hồ sơ).
     * @param capture Tham số lượt xuất do sniffer bắt được.
     * @param signal AbortSignal để hủy khi người dùng bấm Dừng.
     */
    async download(capture: GuiBhxhExportCapture, signal?: AbortSignal): Promise<string> {
        const url = `${location.origin}/vnpthis/RestService`
        // uuid (JWT của phiên) gửi nguyên như request gốc — thiếu nó HIS có thể từ chối lượt gọi lại.
        const payload: Record<string, unknown> = { func: 'ajaxCALL_SP_X', params: ['XUAT.XML', capture.paramsJson] }
        if (capture.uuid !== '') payload.uuid = capture.uuid
        const body = JSON.stringify(payload)
        console.log(`[GuiBhxhXmlDownloader] POST ${url} (${capture.maLkList.length} bệnh nhân)`)

        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'text/plain; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body,
            signal,
        })

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                'HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào VNPT-HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (!response.ok) {
            throw new Error(`HIS trả về lỗi HTTP ${response.status} khi tải XML KMH.`)
        }

        const text = await response.text()

        // HIS hết phiên thường trả HTML trang login (200) thay vì XML — nhận diện
        // để báo đúng nguyên nhân thay vì đẩy HTML vào bộ validate.
        const head = text.trimStart().slice(0, 200).toLowerCase()
        if (
            !head.startsWith('<?xml') &&
            (head.includes('<!doctype html') || head.includes('dangnhap') || head.includes('login'))
        ) {
            throw new Error(
                'Chưa đăng nhập HIS hoặc phiên đã hết hạn. ' +
                    'Hãy đăng nhập vào VNPT-HIS trên trình duyệt rồi thử lại.',
            )
        }
        if (text.trim() === '') {
            throw new Error('HIS không trả về nội dung nào cho lượt xuất này.')
        }

        return text
    }
}
