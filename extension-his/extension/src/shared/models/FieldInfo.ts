/**
 * FieldInfo
 * Represents the information of a single field in the web page
 */
export interface FieldInfo {
    /**
     * Unique identifier for the field
     */
    id: string

    /**
     * Field name attribute
     */
    name: string

    /**
     * Field label or accessible name
     */
    label: string

    /**
     * Field type (text, email, password, number, date, etc.)
     */
    type: string

    /**
     * Current value of the field
     */
    value: string | number | boolean | null

    /**
     * Whether the field is required
     */
    required: boolean

    /**
     * Whether the field is readonly
     */
    readonly: boolean

    /**
     * Whether the field is disabled
     */
    disabled: boolean

    /**
     * Reference to the DOM element
     */
    element: HTMLElement

    /**
     * Placeholder text if available
     */
    placeholder?: string
}
