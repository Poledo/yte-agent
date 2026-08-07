import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { FieldInfo } from '../../shared/models/FieldInfo'
import { readElementValue } from '../../shared/dom/readElementValue'

export type FieldChangeCallback = (fieldId: string, fieldInfo: FieldInfo) => void
export type FieldBlurCallback = (fieldId: string, element: HTMLElement) => void

/** Tên sự kiện đồng bộ, phải trùng với FieldSyncBridge chạy ở page context. */
const FIELD_SYNC_EVENT = '__hisFieldSync__'

/**
 * Binds event listeners to form fields.
 * Listens for: input, change, blur events.
 * Updates field values in the registry when events occur.
 */
export class EventBinder {
    private registry: FieldRegistry
    private boundElements: WeakMap<HTMLElement, { change: () => void; blur: () => void }> = new WeakMap()
    private changeCallbacks: FieldChangeCallback[] = []
    private blurCallbacks: FieldBlurCallback[] = []

    constructor(registry: FieldRegistry) {
        this.registry = registry
    }

    /**
     * Register a callback to be called when a field value changes
     */
    onFieldChange(callback: FieldChangeCallback): void {
        this.changeCallbacks.push(callback)
    }

    /**
     * Register a callback to be called when a field is blurred
     */
    onFieldBlur(callback: FieldBlurCallback): void {
        this.blurCallbacks.push(callback)
    }

    /**
     * Bind events to a form field element
     */
    bindElement(element: HTMLElement): void {
        // Prevent binding multiple times to same element
        if (this.boundElements.has(element)) {
            return
        }

        // Find the field in registry
        const fieldInfo = this.findFieldInRegistry(element)
        if (!fieldInfo) {
            console.warn('[EventBinder] Field not found in registry for element:', element)
            return
        }

        // Create event handlers
        const handleChange = (): void => {
            console.log(`[EventBinder] Change event fired on field: ${fieldInfo.id}`)
            this.updateFieldValue(fieldInfo.id, element)
        }

        const handleBlur = (): void => {
            console.log(`[EventBinder] Blur event fired on field: ${fieldInfo.id}`)
            // Call blur callbacks
            this.blurCallbacks.forEach((callback) => {
                try {
                    callback(fieldInfo.id, element)
                } catch (error) {
                    console.error('[EventBinder] Error in field blur callback:', error)
                }
            })
        }

        // Bind events
        element.addEventListener('input', handleChange)
        element.addEventListener('change', handleChange)
        element.addEventListener('blur', handleBlur)

        // ĐÃ TẮT (theo yêu cầu): không kiểm tra tự động khi trang HIS gán giá trị
        // bằng JavaScript (chọn bệnh nhân từ popup điền hàng loạt trường). Chỉ kiểm
        // tra khi người dùng tự gõ/chọn (input/change/blur).
        // Bật lại: bỏ comment dòng dưới + thêm FieldSyncBridge vào manifest.
        // element.addEventListener(FIELD_SYNC_EVENT, handleChange)
        void FIELD_SYNC_EVENT // giữ tham chiếu, tránh cảnh báo biến không dùng

        // Store references to prevent rebinding
        this.boundElements.set(element, { change: handleChange, blur: handleBlur })

        console.log(`[EventBinder] Bound events to field: ${fieldInfo.id}`)
    }

    /**
     * Unbind events from a form field element
     */
    unbindElement(element: HTMLElement): void {
        if (!this.boundElements.has(element)) {
            return
        }

        const handlers = this.boundElements.get(element)!

        // Remove listeners
        element.removeEventListener('input', handlers.change)
        element.removeEventListener('change', handlers.change)
        element.removeEventListener('blur', handlers.blur)

        // Remove from tracking
        this.boundElements.delete(element)

        console.log('[EventBinder] Unbound events from element')
    }

    /**
     * Bind events to all fields in registry
     */
    bindAll(): void {
        const fields = this.registry.getAll()
        const boundCount = fields.reduce((count, field) => {
            try {
                this.bindElement(field.element)
                return count + 1
            } catch {
                return count
            }
        }, 0)

        console.log(`[EventBinder] Bound events to ${boundCount} field(s)`)
    }

    /**
     * Unbind events from all fields
     */
    unbindAll(): void {
        const fields = this.registry.getAll()
        fields.forEach((field) => {
            try {
                this.unbindElement(field.element)
            } catch {
                // Element may have been removed from DOM
            }
        })

        console.log('[EventBinder] Unbound all events')
    }

    /**
     * Find field in registry by DOM element
     */
    private findFieldInRegistry(element: HTMLElement) {
        const fields = this.registry.getAll()
        return fields.find((field) => field.element === element)
    }

    /**
     * Extract and update field value from DOM element
     */
    private updateFieldValue(fieldId: string, element: HTMLElement): void {
        const value = readElementValue(element)

        // Update registry
        try {
            this.registry.update(fieldId, { value })
            console.log(`[EventBinder] Updated field ${fieldId}: ${value}`)

            // Call registered callbacks
            const fieldInfo = this.registry.get(fieldId)
            if (fieldInfo) {
                this.changeCallbacks.forEach((callback) => {
                    try {
                        callback(fieldId, fieldInfo)
                    } catch (error) {
                        console.error('[EventBinder] Error in field change callback:', error)
                    }
                })
            }
        } catch (error) {
            console.error(`[EventBinder] Failed to update field ${fieldId}:`, error)
        }
    }
}
