import { RuleRegistry } from './RuleRegistry'
import { RuleExecutor } from './RuleExecutor'
import { ValidationContext } from './ValidationContext'
import { ValidationResult } from './ValidationResult'
import { Rule } from './Rule'

export class ValidationEngine {
    private registry: RuleRegistry
    private executor: RuleExecutor

    constructor() {
        this.registry = new RuleRegistry()
        this.executor = new RuleExecutor(this.registry)
    }

    registerRule(rule: Rule): void {
        this.registry.register(rule)
    }

    unregisterRule(ruleId: string): void {
        this.registry.unregister(ruleId)
    }

    enableRule(ruleId: string): void {
        this.registry.enable(ruleId)
    }

    disableRule(ruleId: string): void {
        this.registry.disable(ruleId)
    }

    validateField(context: ValidationContext): ValidationResult[] {
        console.log(`[ValidationEngine] Validating field: ${context.currentField.id}`)
        const results = this.executor.executeRulesByField(context.currentField.id, context)
        console.log(`[ValidationEngine] Found ${results.length} issues`)
        return results
    }

    validateForm(context: ValidationContext): ValidationResult[] {
        console.log(`[ValidationEngine] Validating entire form`)
        const results = this.executor.executeAll(context)
        console.log(`[ValidationEngine] Found ${results.length} issues`)
        return results
    }

    validate(context: ValidationContext): ValidationResult[] {
        return this.validateField(context)
    }

    getRegistry(): RuleRegistry {
        return this.registry
    }

    getRuleCount(): number {
        return this.registry.getAll().length
    }
}
