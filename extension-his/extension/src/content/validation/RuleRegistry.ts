import { Rule } from './Rule'

export class RuleRegistry {
    private rules: Map<string, Rule> = new Map()
    private disabledRules: Set<string> = new Set()

    register(rule: Rule): void {
        this.rules.set(rule.id, rule)
        console.log(`[RuleRegistry] Registered rule: ${rule.name}`)
    }

    unregister(ruleId: string): void {
        this.rules.delete(ruleId)
        this.disabledRules.delete(ruleId)
        console.log(`[RuleRegistry] Unregistered rule: ${ruleId}`)
    }

    enable(ruleId: string): void {
        this.disabledRules.delete(ruleId)
    }

    disable(ruleId: string): void {
        this.disabledRules.add(ruleId)
    }

    get(ruleId: string): Rule | undefined {
        return this.rules.get(ruleId)
    }

    getAll(): Rule[] {
        return Array.from(this.rules.values()).filter((rule) => !this.disabledRules.has(rule.id))
    }

    getAllByPriority(): Rule[] {
        return this.getAll().sort((a, b) => b.priority - a.priority)
    }

    isEnabled(ruleId: string): boolean {
        return !this.disabledRules.has(ruleId)
    }
}
