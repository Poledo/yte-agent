import { afterEach, describe, expect, it, vi } from 'vitest'
import { BatchCapacity } from './BatchCapacity'

/**
 * Giả lập cấu hình máy. BatchCapacity đọc navigator.deviceMemory,
 * navigator.hardwareConcurrency và performance.memory - ba thứ này khác nhau
 * theo từng máy và từng trình duyệt, nên test phải đặt cứng giá trị.
 */
function fakeMachine(memoryGb: number | undefined, cores: number | undefined, heap?: { limit: number; used: number }) {
    vi.stubGlobal('navigator', { deviceMemory: memoryGb, hardwareConcurrency: cores })
    vi.stubGlobal('performance', heap ? { memory: { jsHeapSizeLimit: heap.limit, usedJSHeapSize: heap.used } } : {})
}

const GB = 1024 * 1024 * 1024

afterEach(() => vi.unstubAllGlobals())

describe('BatchCapacity.measure', () => {
    it('máy 16 GB cho phép lô lớn hơn hẳn máy 4 GB', () => {
        fakeMachine(16, 8)
        const manh = new BatchCapacity().measure()

        fakeMachine(4, 8)
        const yeu = new BatchCapacity().measure()

        expect(manh.maxFiles).toBeGreaterThan(yeu.maxFiles)
    })

    it('máy yếu tới đâu cũng còn sàn 50 hồ sơ một lượt', () => {
        fakeMachine(0.25, 2)
        expect(new BatchCapacity().measure().maxFiles).toBeGreaterThanOrEqual(50)
    })

    it('không vượt trần 900 MB dù máy khai RAM rất lớn', () => {
        fakeMachine(256, 32)
        const plan = new BatchCapacity().measure()

        expect(plan.budgetBytes).toBeLessThanOrEqual(900 * 1024 * 1024)
        // 900MB / 256KB mỗi hồ sơ
        expect(plan.maxFiles).toBeLessThanOrEqual(Math.floor((900 * 1024 * 1024) / (256 * 1024)))
    })

    it('heap còn trống ít thì siết ngân sách xuống dù RAM máy lớn', () => {
        fakeMachine(16, 8)
        const khongBietHeap = new BatchCapacity().measure()

        fakeMachine(16, 8, { limit: 2 * GB, used: 1.9 * GB })
        const heapChatHep = new BatchCapacity().measure()

        expect(heapChatHep.budgetBytes).toBeLessThan(khongBietHeap.budgetBytes)
    })

    it('trình duyệt giấu cấu hình thì lùi về mặc định 4 GB / 4 luồng', () => {
        fakeMachine(undefined, undefined)
        const plan = new BatchCapacity().measure()

        expect(plan.memoryGb).toBe(4)
        expect(plan.cores).toBe(4)
        expect(plan.summary).toBe('RAM khoảng 4 GB, 4 luồng CPU')
    })

    it('số luồng tải song song luôn nằm trong khoảng 2 đến 8', () => {
        fakeMachine(8, 1)
        expect(new BatchCapacity().measure().parallelDownloads).toBe(2)

        fakeMachine(8, 64)
        expect(new BatchCapacity().measure().parallelDownloads).toBe(8)

        fakeMachine(8, 12)
        expect(new BatchCapacity().measure().parallelDownloads).toBe(6)
    })
})

describe('BatchCapacity.estimateWait', () => {
    it('lô nhỏ báo bằng giây, lô lớn báo bằng phút', () => {
        fakeMachine(8, 8)
        const capacity = new BatchCapacity()
        const plan = capacity.measure()

        expect(capacity.estimateWait(10, plan)).toMatch(/^khoảng \d+ giây$/)
        expect(capacity.estimateWait(1000, plan)).toMatch(/^khoảng \d+ phút$/)
    })

    it('thời gian chờ tăng theo số hồ sơ', () => {
        fakeMachine(8, 8)
        const capacity = new BatchCapacity()
        const plan = capacity.measure()

        expect(capacity.estimateSeconds(200, plan)).toBeGreaterThan(capacity.estimateSeconds(20, plan))
    })

    it('máy nhiều luồng tải nhanh hơn máy ít luồng với cùng số hồ sơ', () => {
        fakeMachine(8, 16)
        const capacity = new BatchCapacity()
        const nhieuLuong = capacity.measure()

        fakeMachine(8, 2)
        const itLuong = capacity.measure()

        expect(capacity.estimateSeconds(300, nhieuLuong)).toBeLessThan(capacity.estimateSeconds(300, itLuong))
    })
})
