import { FieldInfo } from '../../shared/models/FieldInfo'
import { readElementValue } from '../../shared/dom/readElementValue'

/**
 * MetadataBuilder
 * Responsible for building FieldInfo from DOM elements
 */
export class MetadataBuilder {
    /**
     * Build FieldInfo from a field element
     *
     * @param fieldElement - The field element
     * @param label - The resolved label text
     * @returns FieldInfo object
     */
    public buildFieldInfo(fieldElement: HTMLElement, label: string): FieldInfo {
        const id = this.extractId(fieldElement)
        const name = this.extractName(fieldElement)
        const type = this.extractType(fieldElement)
        const value = this.extractValue(fieldElement)
        const placeholder = this.extractPlaceholder(fieldElement)
        const required = this.extractRequired(fieldElement)
        const readonly = this.extractReadonly(fieldElement)
        const disabled = this.extractDisabled(fieldElement)

        return {
            id,
            name,
            label: label || name || id,
            type,
            value,
            placeholder,
            required,
            readonly,
            disabled,
            element: fieldElement,
        }
    }

    /**
     * Extract id from element
     * Generate UUID if not present
     *
     * @param element - Field element
     * @returns Element id or generated UUID
     */
    private extractId(element: HTMLElement): string {
        if (element.id) {
            return element.id
        }
        // Generate a unique ID if not present
        return `field_${this.generateUUID()}`
    }

    /**
     * Extract name attribute from element
     *
     * @param element - Field element
     * @returns Name attribute or empty string
     */
    private extractName(element: HTMLElement): string {
        return element.getAttribute('name') || ''
    }

    /**
     * Extract type from element
     *
     * @param element - Field element
     * @returns Field type (input type, or element tag name)
     */
    private extractType(element: HTMLElement): string {
        if (element instanceof HTMLInputElement) {
            return element.type || 'text'
        }
        if (element instanceof HTMLTextAreaElement) {
            return 'textarea'
        }
        if (element instanceof HTMLSelectElement) {
            return 'select'
        }
        return element.tagName.toLowerCase()
    }

    /**
     * Extract current value from element
     *
     * @param element - Field element
     * @returns Current value (string, number, boolean, or null)
     */
    private extractValue(element: HTMLElement): string | number | boolean | null {
        return readElementValue(element)
    }

    /**
     * Extract placeholder attribute from element
     *
     * @param element - Field element
     * @returns Placeholder value or undefined
     */
    private extractPlaceholder(element: HTMLElement): string | undefined {
        const placeholder = element.getAttribute('placeholder')
        return placeholder || undefined
    }

    /**
     * Extract required attribute from element
     *
     * @param element - Field element
     * @returns true if required, false otherwise
     */
    private extractRequired(element: HTMLElement): boolean {
        return element.hasAttribute('required')
    }

    /**
     * Extract readonly attribute from element
     *
     * @param element - Field element
     * @returns true if readonly, false otherwise
     */
    private extractReadonly(element: HTMLElement): boolean {
        return element.hasAttribute('readonly')
    }

    /**
     * Extract disabled attribute from element
     *
     * @param element - Field element
     * @returns true if disabled, false otherwise
     */
    private extractDisabled(element: HTMLElement): boolean {
        return element.hasAttribute('disabled')
    }

    /**
     * Generate a simple UUID v4
     *
     * @returns UUID string
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        })
    }
}
