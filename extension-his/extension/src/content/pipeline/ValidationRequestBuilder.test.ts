import { describe, expect, it } from 'vitest'
import { FieldInfo } from '../../shared/models/FieldInfo'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { ValidationContext } from '../validation/ValidationContext'
import { ValidationRequestBuilder } from './ValidationRequestBuilder'

function field(id: string, value: string | number | null): FieldInfo {
    return { id, name: id, label: id, type: 'text', value } as FieldInfo
}

/** FieldRegistry thật cần element DOM; ở đây chỉ cần hai hàm đọc. */
function registryOf(fields: FieldInfo[]): FieldRegistry {
    const map = new Map(fields.map((f) => [f.id, f]))
    return { get: (id: string) => map.get(id), getAll: () => fields } as unknown as FieldRegistry
}

function contextOf(url: string, fields: FieldInfo[]): ValidationContext {
    return {
        currentPage: url,
        currentField: fields[0],
        currentValue: fields[0].value as string,
        formValues: new Map(),
        fieldRegistry: registryOf(fields),
        metadata: {},
    }
}

const trigger = { event: 'blur', field: 'icdVao' }

describe('ValidationRequestBuilder', () => {
    it('lấy tên trang từ đoạn cuối đường dẫn và viết hoa chữ đầu', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('https://yte-ninhthuan.vnpthis.vn/web_his/kiemtrabangke', [field('icdVao', 'J18.9')]),
            trigger,
            'phien-1',
        )

        expect(request.page).toBe('Kiemtrabangke')
    })

    it('URL không đọc được thì lùi về trang mặc định thay vì ném lỗi', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('khong-phai-url', [field('icdVao', 'J18.9')]),
            trigger,
            'phien-1',
        )

        expect(request.page).toBe('Diagnosis')
    })

    it('chưa khai báo trang thì gửi toàn bộ trường đang có', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('https://his.vn/web_his/kham', [field('icdVao', 'J18.9'), field('gioiTinh', 'Nữ')]),
            trigger,
            'phien-1',
        )

        expect(Object.keys(request.form)).toEqual(['icdVao', 'gioiTinh'])
    })

    it('đã khai báo trang thì chỉ gửi đúng các trường của trang đó', () => {
        const builder = new ValidationRequestBuilder()
        builder.registerPageMapping('Kham', { name: 'Khám bệnh', fields: ['icdVao'] })

        const request = builder.buildRequest(
            contextOf('https://his.vn/web_his/kham', [field('icdVao', 'J18.9'), field('ghiChu', 'nội bộ')]),
            trigger,
            'phien-1',
        )

        expect(request.form).toEqual({ icdVao: 'J18.9' })
        expect(request.form.ghiChu).toBeUndefined()
    })

    it('trường rỗng gửi null chứ không bỏ khỏi phiếu gửi', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('https://his.vn/web_his/kham', [field('icdVao', null)]),
            trigger,
            'phien-1',
        )

        expect(request.form).toHaveProperty('icdVao', null)
    })

    it('mang theo sessionId và userId để máy chủ truy vết được', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('https://his.vn/web_his/kham', [field('icdVao', 'J18.9')]),
            trigger,
            'phien-abc',
            'bs.an',
        )

        expect(request.context.sessionId).toBe('phien-abc')
        expect(request.context.userId).toBe('bs.an')
        expect(request.trigger).toEqual(trigger)
    })

    it('không truyền userId thì ghi unknown, không để trống', () => {
        const request = new ValidationRequestBuilder().buildRequest(
            contextOf('https://his.vn/web_his/kham', [field('icdVao', 'J18.9')]),
            trigger,
            'phien-abc',
        )

        expect(request.context.userId).toBe('unknown')
    })
})
