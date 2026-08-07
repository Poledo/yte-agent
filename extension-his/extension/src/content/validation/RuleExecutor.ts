import { RuleRegistry } from './RuleRegistry'
import { ValidationContext } from './ValidationContext'
import { ValidationResult } from './ValidationResult'

export class RuleExecutor {
    constructor(private registry: RuleRegistry) {}

    executeAll(context: ValidationContext): ValidationResult[] {
        const results: ValidationResult[] = []
        const rules = this.registry.getAllByPriority()

        console.log(`[RuleExecutor] Running validation with ${rules.length} rules...`)

        for (const rule of rules) {
            try {
                const ruleResults = rule.validate(context)
                results.push(...ruleResults)
                console.log(`[Rule] ${rule.name} - ${ruleResults.length > 0 ? 'FAIL' : 'PASS'}`)
            } catch (error) {
                console.error(`[Rule] ${rule.name} - ERROR:`, error)
            }
        }

        return results
    }

    executeRule(ruleId: string, context: ValidationContext): ValidationResult[] {
        const rule = this.registry.get(ruleId)
        if (!rule) {
            console.warn(`[RuleExecutor] Rule not found: ${ruleId}`)
            return []
        }

        if (!this.registry.isEnabled(ruleId)) {
            console.warn(`[RuleExecutor] Rule is disabled: ${ruleId}`)
            return []
        }

        try {
            const results = rule.validate(context)
            console.log(`[Rule] ${rule.name} - ${results.length > 0 ? 'FAIL' : 'PASS'}`)
            return results
        } catch (error) {
            console.error(`[Rule] ${rule.name} - ERROR:`, error)
            return []
        }
    }

    executeRulesByField(fieldId: string, context: ValidationContext): ValidationResult[] {
        const rules = this.registry.getAll()
        const relevantRules = rules.filter((rule) => this.isRuleApplicableToField(rule.id, fieldId))

        console.log(`[RuleExecutor] Running ${relevantRules.length} rules for field: ${fieldId}`)

        const results: ValidationResult[] = []
        for (const rule of relevantRules) {
            results.push(...this.executeRule(rule.id, context))
        }

        return results
    }

    private isRuleApplicableToField(_ruleId: string, _fieldId: string): boolean {
        // This can be extended to have rule-field mappings
        return true
    }
}
