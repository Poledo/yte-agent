/**
 * FieldSyncBridge — chạy trong PAGE CONTEXT (MAIN world), không phải content script.
 *
 * Vì sao cần:
 * Content script của Chrome chạy trong "isolated world" — có context JavaScript
 * riêng. Vá HTMLInputElement.prototype ở content script KHÔNG ảnh hưởng tới mã
 * JavaScript của trang HIS. Vì vậy khi HIS gán giá trị bằng JS (chọn bệnh nhân từ
 * popup danh sách thì trang tự điền hàng loạt trường: giới tính, ngày sinh, ICD...),
 * không sự kiện nào phát ra và extension hoàn toàn không hay biết → không kiểm tra.
 *
 * Script này chạy ĐÚNG trong context của trang nên vá được các setter thật:
 * - HTMLInputElement/HTMLTextAreaElement/HTMLSelectElement .value
 * - jQuery.fn.val() (jQuery đặt option.selected cho <select> chứ không gán .value
 *   nên setter ở trên không bắt được)
 *
 * An toàn với trang HIS: KHÔNG phát sự kiện 'input'/'change' gốc (sẽ kích hoạt
 * nhầm logic nghiệp vụ của HIS). Chỉ phát một sự kiện riêng có tên namespace mà
 * chỉ extension lắng nghe. DOM dùng chung giữa hai world nên content script bắt được.
 */

/** Tên sự kiện riêng của extension — trang HIS không dùng tên này. */
const SYNC_EVENT = '__hisFieldSync__'

function notifyFieldChanged(element: Element): void {
    try {
        element.dispatchEvent(new CustomEvent(SYNC_EVENT, { bubbles: true }))
    } catch {
        // Không để lỗi của bridge làm hỏng trang HIS
    }
}

/**
 * Vá setter .value của một prototype: gọi setter gốc trước, sau đó báo cho
 * extension nếu giá trị thực sự đổi.
 */
function patchValueSetter(prototype: object, label: string): void {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    if (!descriptor?.set || !descriptor.get) {
        return
    }

    const originalGet = descriptor.get
    const originalSet = descriptor.set

    Object.defineProperty(prototype, 'value', {
        get(): unknown {
            return originalGet.call(this)
        },
        set(newValue: unknown): void {
            const oldValue = originalGet.call(this)
            originalSet.call(this, newValue)

            if (oldValue !== originalGet.call(this)) {
                notifyFieldChanged(this as Element)
            }
        },
        configurable: true,
        enumerable: descriptor.enumerable,
    })

    console.log(`[FieldSyncBridge] Đã theo dõi ${label}.value`)
}

/** Đọc giá trị hiện tại của element (dùng để biết jQuery có làm đổi giá trị không). */
function currentValue(element: Element): unknown {
    return (element as unknown as { value?: unknown }).value
}

/** Cờ đánh dấu hàm đã được vá — tránh vá chồng nhiều lần gây phát sự kiện trùng. */
const PATCHED_FLAG = '__hisFieldSyncPatched__'

/**
 * Vá jQuery.fn.val — với <select>, jQuery đặt option.selected thay vì gán
 * select.value nên setter prototype không bắt được.
 */
function patchJQueryVal(): void {
    const jq = (window as unknown as Record<string, unknown>).jQuery as
        | { fn: { val: ((...args: unknown[]) => unknown) & { [PATCHED_FLAG]?: boolean } } }
        | undefined

    if (!jq?.fn?.val || jq.fn.val[PATCHED_FLAG]) {
        return
    }

    const originalVal = jq.fn.val
    const patched = function (this: ArrayLike<Element>, ...args: unknown[]): unknown {
        // Chỉ quan tâm khi GÁN giá trị (val(x)), không phải khi ĐỌC (val())
        if (args.length === 0) {
            return originalVal.apply(this, args)
        }

        const before: unknown[] = []
        for (let i = 0; i < this.length; i++) {
            before.push(currentValue(this[i]))
        }

        const result = originalVal.apply(this, args)

        for (let i = 0; i < this.length; i++) {
            if (currentValue(this[i]) !== before[i]) {
                notifyFieldChanged(this[i])
            }
        }

        return result
    } as typeof jq.fn.val

    patched[PATCHED_FLAG] = true
    jq.fn.val = patched

    console.log('[FieldSyncBridge] Đã theo dõi jQuery.fn.val()')
}

function install(): void {
    patchValueSetter(HTMLInputElement.prototype, 'HTMLInputElement')
    patchValueSetter(HTMLTextAreaElement.prototype, 'HTMLTextAreaElement')
    patchValueSetter(HTMLSelectElement.prototype, 'HTMLSelectElement')

    // jQuery có thể được nạp sau script này → thử lại khi trang tải xong
    patchJQueryVal()
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchJQueryVal, { once: true })
    }
    window.addEventListener('load', patchJQueryVal, { once: true })

    console.log('[FieldSyncBridge] Đã cài trong page context')
}

install()
