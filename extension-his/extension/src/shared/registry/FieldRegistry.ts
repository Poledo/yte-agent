import { FieldInfo } from '../models/FieldInfo'
import { ValidationState } from '../models/ValidationState'
import { readElementValue } from '../dom/readElementValue'

/**
 * FieldRegistry
 * Central registry for managing all fields on a web page
 * Prevents duplicate registration using element identity tracking
 */
export class FieldRegistry {
    /**
     * Main storage: fieldId -> FieldInfo
     */
    private fields = new Map<string, FieldInfo>()

    /**
     * Element tracking: HTMLElement -> fieldId
     * Prevents duplicate registration of the same element
     */
    private elementMap = new WeakMap<HTMLElement, string>()

    /**
     * Validation state storage: fieldId -> ValidationState
     */
    private validationStates = new Map<string, ValidationState>()

    /**
     * Đọc lại giá trị của TẤT CẢ field trực tiếp từ DOM.
     *
     * Vì sao cần: FieldInfo.value là ảnh chụp, chỉ được cập nhật khi sự kiện
     * input/change kích hoạt trên chính element đó. Phần mềm HIS gán giá trị
     * bằng JavaScript (vd chọn "Nữ" ở select cbgioitinh thì trang tự gán
     * input gioitinh = 0) — thao tác gán này không sinh sự kiện, nên registry
     * giữ giá trị cũ và hệ thống kiểm tra nhầm dữ liệu.
     *
     * Gọi hàm này ngay trước mỗi lượt kiểm tra để luôn làm việc với giá trị thật.
     *
     * @returns Số field có giá trị thay đổi so với ảnh chụp cũ (phục vụ log/debug)
     */
    public refreshValues(): number {
        let changed = 0

        this.fields.forEach((fieldInfo) => {
            // Element đã bị gỡ khỏi trang thì giữ nguyên giá trị cuối cùng
            if (!fieldInfo.element.isConnected) {
                return
            }

            const liveValue = readElementValue(fieldInfo.element)
            if (liveValue !== fieldInfo.value) {
                fieldInfo.value = liveValue
                changed++
            }
        })

        return changed
    }

    /**
     * Register a new field or update if already exists
     * If the element is already registered, update the existing field
     *
     * @param fieldInfo - The field information to register
     */
    public register(fieldInfo: FieldInfo): void {
        // Check if this element is already registered
        if (this.elementMap.has(fieldInfo.element)) {
            // Update existing field
            const existingId = this.elementMap.get(fieldInfo.element)!
            this.fields.set(existingId, fieldInfo)
        } else {
            // Register new field
            this.fields.set(fieldInfo.id, fieldInfo)
            this.elementMap.set(fieldInfo.element, fieldInfo.id)
        }
    }

    /**
     * Unregister a field by its ID
     *
     * @param fieldId - The field ID to unregister
     */
    public unregister(fieldId: string): void {
        const fieldInfo = this.fields.get(fieldId)
        if (fieldInfo) {
            this.fields.delete(fieldId)
            this.validationStates.delete(fieldId)
            // ElementMap will be garbage collected when element is removed from DOM
        }
    }

    /**
     * Update a field with partial information
     * Merges the provided data with existing field data
     *
     * @param fieldId - The field ID to update
     * @param partialField - Partial field information to merge
     */
    public update(fieldId: string, partialField: Partial<FieldInfo>): void {
        const existing = this.fields.get(fieldId)
        if (!existing) {
            throw new Error(`Field with id "${fieldId}" not found`)
        }

        const updated: FieldInfo = {
            ...existing,
            ...partialField,
            // Ensure element reference is always set
            element: partialField.element ?? existing.element,
        }

        this.fields.set(fieldId, updated)
    }

    /**
     * Get a field by its ID
     *
     * @param fieldId - The field ID
     * @returns The field information or undefined if not found
     */
    public get(fieldId: string): FieldInfo | undefined {
        return this.fields.get(fieldId)
    }

    /**
     * Get all registered fields
     *
     * @returns Array of all registered fields
     */
    public getAll(): FieldInfo[] {
        return Array.from(this.fields.values())
    }

    /**
     * Check if a field exists by ID
     *
     * @param fieldId - The field ID
     * @returns true if field exists, false otherwise
     */
    public exists(fieldId: string): boolean {
        return this.fields.has(fieldId)
    }

    /**
     * Get the number of registered fields
     *
     * @returns Total number of fields
     */
    public size(): number {
        return this.fields.size
    }

    /**
     * Clear all registered fields and validation states
     */
    public clear(): void {
        this.fields.clear()
        this.validationStates.clear()
    }

    /**
     * Set validation state for a field
     *
     * @param fieldId - The field ID
     * @param state - The validation state
     */
    public setValidationState(fieldId: string, state: ValidationState): void {
        if (!this.exists(fieldId)) {
            throw new Error(`Field with id "${fieldId}" not found`)
        }
        this.validationStates.set(fieldId, state)
    }

    /**
     * Get validation state for a field
     *
     * @param fieldId - The field ID
     * @returns The validation state or undefined if not set
     */
    public getValidationState(fieldId: string): ValidationState | undefined {
        return this.validationStates.get(fieldId)
    }

    /**
     * Get all validation states
     *
     * @returns Map of all validation states keyed by fieldId
     */
    public getAllValidationStates(): Map<string, ValidationState> {
        return new Map(this.validationStates)
    }
}
