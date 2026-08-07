import { FieldInfo } from '../../shared/models/FieldInfo'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'

export interface ValidationContext {
    currentPage: string
    currentField: FieldInfo
    currentValue: string | number | boolean
    formValues: Map<string, any>
    fieldRegistry: FieldRegistry
    metadata: Record<string, any>
}
