import { Rule } from '../Rule'
import { ValidationContext } from '../ValidationContext'
import { ValidationResult } from '../ValidationResult'

export interface RegexPattern {
    fieldId: string
    pattern: RegExp
    message?: string
}

export class RegexRule implements Rule {
    id = 'regex'
    name = 'Regex Rule'
    priority = 85

    private patterns: RegexPattern[] = [
        {
            fieldId: 'soBhyt',
            pattern: /^([0-9]{15}|[0-9]{12})$/,
            message: 'Mã BHYT phải có 12 hoặc 15 chữ số',
        },
        {
            fieldId: 'cccd',
            pattern: /^[0-9]{12}$/,
            message: 'CCCD phải có đúng 12 chữ số',
        },
        {
            fieldId: 'maBenhNhan',
            pattern: /^[A-Z0-9]{1,20}$/,
            message: 'Mã bệnh nhân chỉ chứa chữ in hoa và số',
        },
        {
            fieldId: 'nhapsttbatso',
            pattern: /^[0-9]+$/,
            message: 'Số STT bắt số phải chỉ chứa số',
        },
    ]

    validate(context: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = []

        const relevantPattern = this.patterns.find((p) => p.fieldId === context.currentField.id)

        if (!relevantPattern || !context.currentValue) {
            return results
        }

        const value = String(context.currentValue).trim()

        if (!relevantPattern.pattern.test(value)) {
            results.push({
                ruleId: this.id,
                field: context.currentField,
                level: 'error',
                title: 'Định dạng không hợp lệ',
                message: relevantPattern.message || `Định dạng của "${context.currentField.label}" không hợp lệ`,
                suggestion: `Vui lòng nhập đúng định dạng`,
                canExplain: false,
                metadata: {
                    fieldId: context.currentField.id,
                    value: value,
                    pattern: relevantPattern.pattern.source,
                },
            })
        }

        return results
    }

    addPattern(pattern: RegexPattern): void {
        this.patterns.push(pattern)
    }

    removePattern(fieldId: string): void {
        this.patterns = this.patterns.filter((p) => p.fieldId !== fieldId)
    }
}
