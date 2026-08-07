import { describe, expect, it, vi } from 'vitest'
import { FieldInfo } from '../../shared/models/FieldInfo'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { Rule } from './Rule'
import { RuleExecutor } from './RuleExecutor'
import { RuleRegistry } from './RuleRegistry'
import { ValidationContext } from './ValidationContext'
import { ValidationResult } from './ValidationResult'

const ctx: ValidationContext = {
    currentPage: 'https://yte.vnpthis.vn/web_his/kiemtrabangke',
    currentField: { id: 'icdVao', name: 'icdVao', label: 'ICD vào', type: 'text', value: null } as FieldInfo,
    currentValue: 'C84.2',
    formValues: new Map(),
    fieldRegistry: {} as FieldRegistry,
    metadata: {},
}

function stubRule(id: string, priority: number, results: ValidationResult[] = []): Rule {
    return { id, name: id, priority, validate: () => results }
}

function hit(ruleId: string): ValidationResult {
    return {
        ruleId,
        field: ctx.currentField,
        level: 'error',
        title: ruleId,
        message: ruleId,
        canExplain: false,
    } as ValidationResult
}

describe('RuleRegistry', () => {
    it('sắp xếp luật theo độ ưu tiên giảm dần', () => {
        const registry = new RuleRegistry()
        registry.register(stubRule('thap', 10))
        registry.register(stubRule('cao', 100))
        registry.register(stubRule('vua', 50))

        expect(registry.getAllByPriority().map((r) => r.id)).toEqual(['cao', 'vua', 'thap'])
    })

    it('luật bị tắt không còn xuất hiện trong danh sách chạy', () => {
        const registry = new RuleRegistry()
        registry.register(stubRule('a', 10))
        registry.register(stubRule('b', 20))

        registry.disable('a')
        expect(registry.getAll().map((r) => r.id)).toEqual(['b'])
        expect(registry.isEnabled('a')).toBe(false)

        registry.enable('a')
        expect(registry.getAll()).toHaveLength(2)
    })

    it('đăng ký trùng id thì luật sau thay luật trước, không nhân đôi', () => {
        const registry = new RuleRegistry()
        registry.register(stubRule('trung', 10))
        registry.register(stubRule('trung', 99))

        expect(registry.getAll()).toHaveLength(1)
        expect(registry.get('trung')?.priority).toBe(99)
    })
})

describe('RuleExecutor', () => {
    it('gộp kết quả của mọi luật đang bật', () => {
        const registry = new RuleRegistry()
        registry.register(stubRule('a', 20, [hit('a')]))
        registry.register(stubRule('b', 10, [hit('b')]))

        const results = new RuleExecutor(registry).executeAll(ctx)
        expect(results.map((r) => r.ruleId)).toEqual(['a', 'b'])
    })

    it('một luật ném lỗi không làm chết các luật còn lại', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const registry = new RuleRegistry()
        registry.register({
            id: 'hong',
            name: 'hong',
            priority: 100,
            validate: () => {
                throw new Error('lỗi giả lập')
            },
        })
        registry.register(stubRule('lanh', 50, [hit('lanh')]))

        const results = new RuleExecutor(registry).executeAll(ctx)
        expect(results.map((r) => r.ruleId)).toEqual(['lanh'])
    })

    it('không chạy luật đã tắt khi gọi đích danh', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const registry = new RuleRegistry()
        registry.register(stubRule('a', 10, [hit('a')]))
        registry.disable('a')

        expect(new RuleExecutor(registry).executeRule('a', ctx)).toHaveLength(0)
    })

    it('gọi luật không tồn tại thì trả rỗng, không ném lỗi', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(new RuleExecutor(new RuleRegistry()).executeRule('khong-co', ctx)).toHaveLength(0)
    })
})
