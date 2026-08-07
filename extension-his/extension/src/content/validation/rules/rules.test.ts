import { describe, expect, it } from 'vitest'
import { FieldInfo } from '../../../shared/models/FieldInfo'
import { FieldRegistry } from '../../../shared/registry/FieldRegistry'
import { ValidationContext } from '../ValidationContext'
import { DateCompareRule } from './DateCompareRule'
import { ICDInactiveRule } from './ICDInactiveRule'
import { RequiredRule } from './RequiredRule'

function field(id: string, label = id): FieldInfo {
    return { id, name: id, label, type: 'text', value: null } as FieldInfo
}

/** Ngữ cảnh tối thiểu: các luật dưới đây chỉ đọc currentField, currentValue, formValues. */
function context(id: string, value: string | number | boolean, form: Record<string, unknown> = {}): ValidationContext {
    return {
        currentPage: 'https://yte.vnpthis.vn/web_his/kiemtrabangke',
        currentField: field(id),
        currentValue: value,
        formValues: new Map(Object.entries(form)),
        fieldRegistry: {} as FieldRegistry,
        metadata: {},
    }
}

describe('RequiredRule', () => {
    it('báo lỗi khi trường bắt buộc để trống', () => {
        const results = new RequiredRule().validate(context('maBenhNhan', ''))

        expect(results).toHaveLength(1)
        expect(results[0].level).toBe('error')
        expect(results[0].ruleId).toBe('required')
    })

    it('coi số 0 là chưa nhập với trường bắt buộc', () => {
        expect(new RequiredRule().validate(context('ngayKham', 0))).toHaveLength(1)
    })

    it('không báo gì khi đã có giá trị', () => {
        expect(new RequiredRule().validate(context('maBenhNhan', 'BN0001'))).toHaveLength(0)
    })

    it('bỏ qua trường không nằm trong danh sách bắt buộc', () => {
        expect(new RequiredRule().validate(context('ghiChu', ''))).toHaveLength(0)
    })

    it('thêm được trường bắt buộc lúc chạy', () => {
        const rule = new RequiredRule()
        expect(rule.validate(context('ghiChu', ''))).toHaveLength(0)

        rule.addRequiredField('ghiChu')
        expect(rule.validate(context('ghiChu', ''))).toHaveLength(1)

        rule.removeRequiredField('ghiChu')
        expect(rule.validate(context('ghiChu', ''))).toHaveLength(0)
    })
})

describe('DateCompareRule', () => {
    it('bắt lỗi ngày vào sau ngày ra', () => {
        const results = new DateCompareRule().validate(
            context('ngayVao', '2026-07-20', { ngayRa: '2026-07-10' }),
        )

        expect(results).toHaveLength(1)
        expect(results[0].message).toContain('Ngày vào phải nhỏ hơn hoặc bằng ngày ra')
    })

    it('không báo khi ngày vào trước ngày ra', () => {
        expect(
            new DateCompareRule().validate(context('ngayVao', '2026-07-10', { ngayRa: '2026-07-20' })),
        ).toHaveLength(0)
    })

    it('cho phép hai ngày bằng nhau (vào ra trong ngày)', () => {
        expect(
            new DateCompareRule().validate(context('ngayVao', '2026-07-10', { ngayRa: '2026-07-10' })),
        ).toHaveLength(0)
    })

    it('im lặng khi thiếu vế so sánh, không đoán bừa', () => {
        expect(new DateCompareRule().validate(context('ngayVao', '2026-07-20'))).toHaveLength(0)
    })

    it('im lặng khi ngày không đọc được thay vì báo lỗi sai', () => {
        expect(
            new DateCompareRule().validate(context('ngayVao', 'chưa rõ', { ngayRa: '2026-07-20' })),
        ).toHaveLength(0)
    })

    it('bắt lỗi ngày sinh sau ngày khám', () => {
        expect(
            new DateCompareRule().validate(context('ngaySinh', '2026-07-20', { ngayKham: '2026-07-10' })),
        ).toHaveLength(1)
    })
})

describe('ICDInactiveRule', () => {
    it('cảnh báo mã ICD đã ngừng hiệu lực', () => {
        const results = new ICDInactiveRule().validate(context('icdVao', 'C84.2'))

        expect(results).toHaveLength(1)
        expect(results[0].level).toBe('warning')
    })

    it('không phân biệt hoa thường và bỏ khoảng trắng thừa', () => {
        expect(new ICDInactiveRule().validate(context('icdRa', ' c84.2 '))).toHaveLength(1)
    })

    it('mã còn hiệu lực thì im lặng', () => {
        expect(new ICDInactiveRule().validate(context('icdVao', 'J18.9'))).toHaveLength(0)
    })

    it('chỉ soi các trường ICD, không đụng trường khác', () => {
        expect(new ICDInactiveRule().validate(context('ghiChu', 'C84.2'))).toHaveLength(0)
    })
})
