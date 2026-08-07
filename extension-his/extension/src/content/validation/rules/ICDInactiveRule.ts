import { Rule } from '../Rule'
import { ValidationContext } from '../ValidationContext'
import { ValidationResult } from '../ValidationResult'

export class ICDInactiveRule implements Rule {
    id = 'icdInactive'
    name = 'ICD Inactive Rule'
    priority = 80

    // Hardcoded inactive ICD codes for demo
    private inactiveICDCodes: Set<string> = new Set(['C84.2', 'C83.4', 'C83.6', 'C85.0', 'C88.1'])

    validate(context: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = []

        // Only validate icdVao, icdRa, icdChuan fields
        const fieldName = context.currentField.name
        const fieldId = context.currentField.id

        console.log(`[ICDInactiveRule] Checking field: ${fieldId} (${fieldName}), value: "${context.currentValue}"`)

        if (
            !['icdVao', 'icdRa', 'icdChuan'].includes(fieldName) &&
            !['icdVao', 'icdRa', 'icdChuan'].includes(fieldId)
        ) {
            return results
        }

        // Get code value from field
        const icdCode = String(context.currentValue).trim().toUpperCase()

        console.log(`[ICDInactiveRule] Validating ICD code: "${icdCode}"`)

        if (!icdCode) {
            console.log(`[ICDInactiveRule] Code is empty, skipping`)
            return results
        }

        // Check if code is inactive
        if (this.inactiveICDCodes.has(icdCode)) {
            console.log(`[ICDInactiveRule] Code "${icdCode}" is INACTIVE - adding warning`)
            results.push({
                ruleId: this.id,
                field: context.currentField,
                level: 'warning',
                title: 'ICD đã ngừng sử dụng',
                message: `Mã ICD "${icdCode}" đã không còn được sử dụng`,
                suggestion: `Vui lòng kiểm tra lại mã ICD phù hợp`,
                canExplain: true,
                metadata: {
                    fieldId: context.currentField.id,
                    icdCode: icdCode,
                    reason: 'Inactive ICD code',
                },
            })
        } else {
            console.log(`[ICDInactiveRule] Code "${icdCode}" is ACTIVE - no warning`)
        }

        return results
    }

    addInactiveICDCode(code: string): void {
        this.inactiveICDCodes.add(code.toUpperCase())
    }

    removeInactiveICDCode(code: string): void {
        this.inactiveICDCodes.delete(code.toUpperCase())
    }

    isICDInactive(code: string): boolean {
        return this.inactiveICDCodes.has(code.toUpperCase())
    }
}
