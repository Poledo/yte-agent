/**
 * "Ký ức" của robot (task-003 §1.7): nhớ vài việc gần đây đã làm ở nhà để lần sau
 * mở popup có thể chào "hôm qua mình đã…". Lưu bền qua chrome.storage.local.
 *
 * Cố ý tách khỏi life/ (BỘ NÃO thuần logic, không phụ thuộc môi trường): đây là lớp
 * hạ tầng có side-effect (đọc/ghi storage), nên PopupRobot bơm vào như một phụ thuộc.
 */

/** Một mẩu ký ức: đã làm việc gì, vào ngày nào (giờ máy) và lúc nào. */
interface MemoryEntry {
    /** Ngày địa phương dạng YYYY-MM-DD (để so "hôm nay / hôm qua"). */
    readonly date: string
    /** Nhãn hoạt động tiếng Việt (vd "đọc sách"). */
    readonly label: string
    /** Mốc thời gian (ms) để sắp xếp. */
    readonly at: number
}

/** Cho phép bơm kho lưu trữ khác khi test (mặc định = chrome.storage.local). */
export interface MemoryStore {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
}

const STORAGE_KEY = 'robotMemory'
/** Giữ tối đa bấy nhiêu mẩu ký ức gần nhất. */
const MAX_ENTRIES = 24

/** Kho mặc định bọc chrome.storage.local về dạng Promise (an toàn nếu thiếu API). */
class ChromeMemoryStore implements MemoryStore {
    get(key: string): Promise<unknown> {
        return new Promise((resolve) => {
            try {
                chrome.storage?.local?.get({ [key]: null }, (items) => resolve(items?.[key] ?? null))
            } catch {
                resolve(null)
            }
        })
    }

    set(key: string, value: unknown): Promise<void> {
        return new Promise((resolve) => {
            try {
                chrome.storage?.local?.set({ [key]: value }, () => resolve())
            } catch {
                resolve()
            }
        })
    }
}

/** Ngày địa phương dạng YYYY-MM-DD. */
function dateKey(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/** Số ngày lệch giữa hai ngày YYYY-MM-DD (dương nếu `a` sau `b`). */
function daysBetween(a: string, b: string): number {
    const [ay, am, ad] = a.split('-').map(Number)
    const [by, bm, bd] = b.split('-').map(Number)
    const ta = new Date(ay, am - 1, ad).getTime()
    const tb = new Date(by, bm - 1, bd).getTime()
    return Math.round((ta - tb) / 86_400_000)
}

export class RobotMemory {
    private entries: MemoryEntry[] = []

    constructor(private readonly store: MemoryStore = new ChromeMemoryStore()) {}

    /** Nạp ký ức từ storage vào bộ nhớ tạm (gọi một lần khi khởi động). */
    async load(): Promise<void> {
        const raw = await this.store.get(STORAGE_KEY)
        if (Array.isArray(raw)) {
            this.entries = raw.filter(RobotMemory.isEntry)
        }
    }

    /** Ghi nhớ vừa làm hoạt động `label` (ghi đè lên storage, giữ MAX_ENTRIES mới nhất). */
    record(label: string, now: Date): void {
        this.entries.push({ date: dateKey(now), label, at: now.getTime() })
        if (this.entries.length > MAX_ENTRIES) {
            this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES)
        }
        void this.store.set(STORAGE_KEY, this.entries)
    }

    /**
     * Câu chào dựa trên ký ức gần nhất (hoặc null nếu chưa có gì để nhớ).
     * Ưu tiên việc của ngày trước để tạo cảm giác "robot nhớ hôm qua".
     */
    greeting(now: Date): string | null {
        if (this.entries.length === 0) return null
        const today = dateKey(now)
        // Việc gần nhất của một ngày TRƯỚC hôm nay (duyệt từ mới → cũ).
        for (let i = this.entries.length - 1; i >= 0; i--) {
            const e = this.entries[i]
            const diff = daysBetween(today, e.date)
            if (diff <= 0) continue
            const when = diff === 1 ? 'Hôm qua' : 'Hôm trước'
            return `${when} mình đã ${e.label} đấy! 😊`
        }
        // Không có ngày trước → nhắc việc vừa làm trong hôm nay.
        const last = this.entries[this.entries.length - 1]
        return `Lúc nãy mình vừa ${last.label} xong! 😊`
    }

    private static isEntry(value: unknown): value is MemoryEntry {
        return (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as MemoryEntry).date === 'string' &&
            typeof (value as MemoryEntry).label === 'string' &&
            typeof (value as MemoryEntry).at === 'number'
        )
    }
}
