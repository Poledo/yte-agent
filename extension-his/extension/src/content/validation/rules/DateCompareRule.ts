import { Rule } from '../Rule'
import { ValidationContext } from '../ValidationContext'
import { ValidationResult } from '../ValidationResult'

export interface DateComparison {
    fieldId: string
    compareWith: string
    operator: '<=' | '>=' | '<' | '>'
    message?: string
}

export class DateCompareRule implements Rule {
    id = 'dateCompare'
    name = 'Date Compare Rule'
    priority = 90

    private comparisons: DateComparison[] = [
        {
            fieldId: 'ngayVao',
            compareWith: 'ngayRa',
            operator: '<=',
            message: 'Ngày vào phải nhỏ hơn hoặc bằng ngày ra',
        },
        {
            fieldId: 'ngaySinh',
            compareWith: 'ngayKham',
            operator: '<=',
            message: 'Ngày sinh phải nhỏ hơn hoặc bằng ngày khám',
        },
    ]

    validate(context: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = []

        const relevantComparison = this.comparisons.find((c) => c.fieldId === context.currentField.id)

        if (!relevantComparison) {
            return results
        }

        const fieldValue = context.currentValue
        const compareValue = context.formValues.get(relevantComparison.compareWith)

        if (!fieldValue || !compareValue) {
            return results
        }

        const fieldDate = this.parseDate(fieldValue as string)
        const compareDate = this.parseDate(compareValue as string)

        if (!fieldDate || !compareDate) {
            return results
        }

        if (!this.compareWithOperator(fieldDate, compareDate, relevantComparison.operator)) {
            results.push({
                ruleId: this.id,
                field: context.currentField,
                level: 'warning',
                title: 'Lỗi so sánh ngày',
                message: relevantComparison.message || `Ngày không hợp lệ so với ${relevantComparison.compareWith}`,
                suggestion: `Vui lòng kiểm tra lại ngày tháng`,
                canExplain: false,
                metadata: {
                    fieldId: context.currentField.id,
                    fieldValue: fieldDate.toISOString(),
                    compareValue: compareDate.toISOString(),
                    operator: relevantComparison.operator,
                },
            })
        }

        return results
    }

    addComparison(comparison: DateComparison): void {
        this.comparisons.push(comparison)
    }

    private parseDate(value: string): Date | null {
        try {
            const date = new Date(value)
            return isNaN(date.getTime()) ? null : date
        } catch {
            return null
        }
    }

    private compareWithOperator(date1: Date, date2: Date, operator: '<=' | '>=' | '<' | '>'): boolean {
        switch (operator) {
            case '<=':
                return date1 <= date2
            case '>=':
                return date1 >= date2
            case '<':
                return date1 < date2
            case '>':
                return date1 > date2
        }
    }
}
