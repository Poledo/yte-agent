/**
 * ValidationState
 * Represents the validation state of a field
 */
export interface ValidationState {
    /**
     * Whether the field is valid
     */
    valid: boolean

    /**
     * Validation message or error message
     */
    message: string
}
