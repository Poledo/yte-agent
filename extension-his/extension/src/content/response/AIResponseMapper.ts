import { ApiIssue } from '../api/ApiModels'
import { ValidationResult } from '../validation/ValidationResult'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { NotificationLevel } from '../../shared/models/Notification'

export class AIResponseMapper {
    static mapToValidationResult(
        issue: ApiIssue & { explain?: string },
        fieldRegistry: FieldRegistry,
    ): ValidationResult | null {
        // Find field by fieldId
        const field = fieldRegistry.get(issue.field)
        if (!field) {
            console.warn(`[AIResponseMapper] Field not found: ${issue.field}`)
            return null
        }

        // Map severity to NotificationLevel
        const level = this.mapSeverityToLevel(issue.severity)

        const metadata: Record<string, any> = {
            aiCode: issue.code,
            severity: issue.severity,
            canAutoFix: issue.canAutoFix,
        }

        // Store explain in metadata if present
        if (issue.explain) {
            metadata.explain = issue.explain
        }

        const result: ValidationResult = {
            ruleId: `AI_${issue.code}`,
            field: field,
            level: level,
            title: `AI: ${issue.code}`,
            message: issue.message,
            suggestion: issue.suggestion,
            canExplain: !!issue.explain,
            metadata: metadata,
        }

        return result
    }

    private static mapSeverityToLevel(severity: string): NotificationLevel {
        switch (severity.toLowerCase()) {
            case 'error':
                return 'error'
            case 'warning':
                return 'warning'
            case 'info':
                return 'info'
            case 'hint':
                return 'info'
            default:
                console.warn(`[AIResponseMapper] Unknown severity: ${severity}`)
                return 'warning'
        }
    }
}
