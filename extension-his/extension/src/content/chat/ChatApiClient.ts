import {
  Xml130ValidationResponse,
  Xml130BatchValidationResponse,
  Xml130StreamEvent,
  AssistantAskResponse,
} from './ChatModels'
import { buildLicenseHeaders, describeLicenseError } from '../../shared/license/LicenseSettings'

/**
 * Client gọi Backend API cho tính năng chat:
 * - Kiểm tra hồ sơ XML 130 (multipart upload)
 * - Hỏi đáp nghiệp vụ (RAG)
 *
 * Base URL cố định trỏ tới hệ thống đã deploy trên VNPT Cloud.
 */
export class ChatApiClient {
  //   private static readonly BASE_URL = 'https://localhost:44350'
  private static readonly BASE_URL = 'https://cbyts.vnpt.vn'
  // Hỏi đáp RAG có thể gồm 2 lượt gọi AI ở backend (rerank + trả lời);
  // khi chạy model local trên CPU mỗi lượt có thể tới 120s — timeout phía
  // extension phải dài hơn tổng đó.
  private static readonly REQUEST_TIMEOUT = 180000 // ms

  // Kiểm tra lô cả tháng file: upload + kiểm tra hàng nghìn hồ sơ có thể
  // mất nhiều phút — timeout riêng, dài hơn hẳn request thường.
  private static readonly BATCH_REQUEST_TIMEOUT = 900000 // 15 phút

  /** Kiểm tra hồ sơ XML 130 - upload file XML lên API validate */
  async validateXml130(file: Blob, fileName: string, signal?: AbortSignal): Promise<Xml130ValidationResponse> {
    const baseUrl = await this.getBaseUrl()
    const formData = new FormData()
    formData.append('file', file, fileName)

    const response = await this.fetchWithTimeout(
      `${baseUrl}/api/xml130/validate?useAi=false`,
      { method: 'POST', body: formData, headers: await buildLicenseHeaders() },
      signal,
    )

    await ChatApiClient.throwIfLicenseError(response)
    if (!response.ok) {
      throw new Error(`API kiểm tra XML trả về lỗi HTTP ${response.status}`)
    }

    return (await response.json()) as Xml130ValidationResponse
  }

  /**
   * Kiểm tra NHIỀU file XML 130 cùng lúc: ngoài kiểm tra từng file, backend còn
   * đối chiếu CHÉO giữa toàn bộ hồ sơ (trùng giường, trùng giờ bác sĩ,
   * trùng đợt điều trị...).
   */
  async validateXml130Batch(
    files: { blob: Blob; name: string }[],
    signal?: AbortSignal,
  ): Promise<Xml130BatchValidationResponse> {
    const baseUrl = await this.getBaseUrl()
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file.blob, file.name)
    }

    const response = await this.fetchWithTimeout(
      `${baseUrl}/api/xml130/validate-batch`,
      { method: 'POST', body: formData, headers: await buildLicenseHeaders() },
      signal,
      ChatApiClient.BATCH_REQUEST_TIMEOUT,
    )

    await ChatApiClient.throwIfLicenseError(response)
    if (response.status === 413) {
      throw new Error(
        'Lô file quá lớn so với giới hạn máy chủ (HTTP 413). ' +
          'Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.',
      )
    }
    if (!response.ok) {
      throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${response.status}`)
    }

    return (await response.json()) as Xml130BatchValidationResponse
  }

  /**
   * Kiểm tra lô kiểu STREAMING: server đẩy từng dòng JSON (NDJSON) —
   * đối chiếu chéo trả về trước một cục, sau đó kết quả từng hồ sơ kèm tiến độ.
   * Không đặt timeout tổng (lô nghìn hồ sơ chạy nhiều phút) — dừng bằng signal.
   */
  async validateXml130BatchStream(
    files: { blob: Blob; name: string }[],
    onEvent: (event: Xml130StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const baseUrl = await this.getBaseUrl()
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file.blob, file.name)
    }

    let response: Response
    try {
      response = await fetch(`${baseUrl}/api/xml130/validate-batch-stream`, {
        method: 'POST',
        body: formData,
        headers: await buildLicenseHeaders(),
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new DOMException('Đã dừng theo yêu cầu.', 'AbortError')
      }
      throw new Error('Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.')
    }

    await ChatApiClient.throwIfLicenseError(response)
    if (response.status === 413) {
      throw new Error(
        'Lô file quá lớn so với giới hạn máy chủ (HTTP 413). ' +
          'Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.',
      )
    }
    if (!response.ok || !response.body) {
      throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${response.status}`)
    }

    // Đọc NDJSON: gom bytes thành dòng, mỗi dòng một sự kiện
    const streamReader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await streamReader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newlineIndex: number
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (line) {
          onEvent(JSON.parse(line) as Xml130StreamEvent)
        }
      }
    }
    const rest = buffer.trim()
    if (rest) {
      onEvent(JSON.parse(rest) as Xml130StreamEvent)
    }
  }

  /** Hỏi đáp nghiệp vụ (RAG) */
  async ask(question: string, signal?: AbortSignal): Promise<AssistantAskResponse> {
    const baseUrl = await this.getBaseUrl()

    const response = await this.fetchWithTimeout(
      `${baseUrl}/api/assistant/ask`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await buildLicenseHeaders()) },
        body: JSON.stringify({ question }),
      },
      signal,
    )

    await ChatApiClient.throwIfLicenseError(response)
    if (!response.ok) {
      throw new Error(`API hỏi đáp trả về lỗi HTTP ${response.status}`)
    }

    return (await response.json()) as AssistantAskResponse
  }

  /**
   * Ném lỗi có hướng dẫn tiếng Việt khi máy chủ từ chối vì bản quyền (401) hoặc vì
   * hồ sơ nằm ngoài phạm vi hợp đồng (403).
   *
   * Tách riêng khỏi nhánh "lỗi HTTP" chung vì đây là hai tình huống người dùng TỰ
   * xử lý được — nói "lỗi HTTP 401" thì họ chỉ biết gọi hỗ trợ.
   */
  private static async throwIfLicenseError(response: Response): Promise<void> {
    if (response.status !== 401 && response.status !== 403) return

    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    const message = describeLicenseError(response.status, payload?.message)
    if (message) {
      throw new Error(message)
    }
  }

  /** URL đang cấu hình (để hiển thị trong thông báo lỗi/hướng dẫn) */
  async getConfiguredBaseUrl(): Promise<string> {
    return this.getBaseUrl()
  }

  /** Base URL cố định (VNPT Cloud). */
  private async getBaseUrl(): Promise<string> {
    return ChatApiClient.BASE_URL
  }

  /**
   * fetch có timeout + hỗ trợ hủy từ ngoài (nút Dừng).
   * Phân biệt 3 loại kết thúc: hết giờ, người dùng hủy, và lỗi kết nối —
   * hủy do người dùng ném DOMException 'AbortError' để caller nhận biết
   * và KHÔNG hiển thị như lỗi.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
    timeoutMs: number = ChatApiClient.REQUEST_TIMEOUT,
  ): Promise<Response> {
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    // Người dùng bấm Dừng → hủy request đang chạy
    const onExternalAbort = (): void => controller.abort()
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort()
      else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (timedOut) {
          throw new Error(
            `Máy chủ xử lý quá lâu (quá ${Math.round(timeoutMs / 1000)} giây). ` +
              'Lô quá nhiều file thì chia nhỏ theo tuần rồi thử lại.',
          )
        }
        // Người dùng chủ động hủy → giữ AbortError để caller bỏ qua (không báo lỗi)
        throw new DOMException('Đã dừng theo yêu cầu.', 'AbortError')
      }
      // TypeError "Failed to fetch": API không chạy, sai địa chỉ, hoặc chứng chỉ HTTPS
      // tự ký chưa được trình duyệt tin cậy
      throw new Error('Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.')
    } finally {
      clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }
}
