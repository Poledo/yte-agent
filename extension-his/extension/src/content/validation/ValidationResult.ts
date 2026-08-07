import { NotificationLevel } from '../../shared/models/Notification'
import { FieldInfo } from '../../shared/models/FieldInfo'

export interface ValidationResult {
    ruleId: string
    field: FieldInfo
    level: NotificationLevel
    title: string
    message: string
    suggestion: string
    canExplain: boolean
    metadata: Record<string, any>
}
