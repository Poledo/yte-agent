import { Activity, LifePhase } from './LifeTypes'

/**
 * Kho hoạt động (Idle Activity Generator - phần lưu trữ).
 *
 * Là điểm mở rộng cốt lõi của v2: mọi hoạt động mới chỉ cần `register()` vào đây,
 * không lớp nào khác phải sửa. Giữ thứ tự đăng ký để kết quả tất định khi test.
 */
export class ActivityRegistry {
    private readonly items = new Map<string, Activity>()

    /** Đăng ký một hoạt động. Trùng id → ghi đè và cảnh báo (tránh nuốt lỗi). */
    register(activity: Activity): this {
        if (this.items.has(activity.id)) {
            console.warn(`[ActivityRegistry] Trùng id "${activity.id}", ghi đè bản cũ.`)
        }
        this.items.set(activity.id, activity)
        return this
    }

    registerAll(list: readonly Activity[]): this {
        for (const a of list) this.register(a)
        return this
    }

    get(id: string): Activity | undefined {
        return this.items.get(id)
    }

    all(): Activity[] {
        return [...this.items.values()]
    }

    /** Các hoạt động hợp lệ trong một pha (phases rỗng = mọi pha). */
    candidates(phase: LifePhase): Activity[] {
        return this.all().filter((a) => !a.phases || a.phases.includes(phase))
    }
}
