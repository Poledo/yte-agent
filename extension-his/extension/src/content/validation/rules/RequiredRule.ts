import { Rule } from '../Rule'
import { ValidationContext } from '../ValidationContext'
import { ValidationResult } from '../ValidationResult'

export class RequiredRule implements Rule {
    id = 'required'
    name = 'Required Rule'
    priority = 100

    private requiredFields: Set<string> = new Set(['maBenhNhan', 'ngayKham', 'ngayVao', 'ngayRa'])

    validate(context: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = []

        if (!this.requiredFields.has(context.currentField.id)) {
            return results
        }

        const value = context.currentValue

        if (value === null || value === undefined || value === '' || value === 0) {
            results.push({
                ruleId: this.id,
                field: context.currentField,
                level: 'error',
                title: 'Trường bắt buộc',
                message: `Trường "${context.currentField.label}" không được để trống`,
                suggestion: `Vui lòng nhập giá trị cho "${context.currentField.label}"`,
                canExplain: false,
                metadata: {
                    fieldId: context.currentField.id,
                    value: value,
                },
            })
        }

        return results
    }

    addRequiredField(fieldId: string): void {
        this.requiredFields.add(fieldId)
    }

    removeRequiredField(fieldId: string): void {
        this.requiredFields.delete(fieldId)
    }
}
