/**
 * Đo cấu hình MÁY ĐANG DÙNG để quyết định một lô kiểm tra được phép lớn tới đâu.
 *
 * Vì sao cần: hồ sơ XML 130 tải từ HIS nằm hoàn toàn trong RAM của tab (không ghi ra
 * ổ đĩa). Máy 4GB và máy 16GB chịu được số lượng rất khác nhau, nên hạn mức phải tính
 * theo máy thật chứ không đặt cứng một con số cho mọi máy.
 *
 * Chặn duy nhất là BỘ NHỚ. Thời gian chờ chỉ để BÁO TRƯỚC trong hộp xác nhận chứ không
 * chặn: bảng kê cả tháng của một khoa lên tới hàng trăm, thậm chí hơn nghìn hồ sơ, và
 * chờ vài phút một lượt vẫn hơn hẳn việc phải chia nhỏ ra tìm lại nhiều lần. Người dùng
 * thấy tiến độ từng hồ sơ và bấm Dừng được bất cứ lúc nào, nên quyền quyết định chờ hay
 * không là của họ.
 *
 * Lớp này chỉ ĐO và TÍNH; việc hỏi người dùng và tải file do ChatPanel lo.
 */

/** Hạn mức suy ra từ cấu hình máy tại thời điểm đo. */
export interface CapacityPlan {
    /** RAM máy (GB) do trình duyệt báo — con số làm tròn, có bản Chrome chặn trần ở 8. */
    memoryGb: number
    /** Số luồng CPU. */
    cores: number
    /** Ngân sách RAM cho một lô (byte). */
    budgetBytes: number
    /** Số hồ sơ tối đa kiểm tra được trong một lô — do bộ nhớ quyết định. */
    maxFiles: number
    /** Số hồ sơ tải song song từ HIS — theo số luồng CPU. */
    parallelDownloads: number
    /** Mô tả cấu hình máy để hiện trong hộp xác nhận, vd "RAM 8 GB trở lên, 12 luồng CPU". */
    summary: string
}

/** Thông tin heap của tab — Chrome có, chuẩn web thì không nên phải khai báo riêng. */
interface HeapInfo {
    jsHeapSizeLimit: number
    usedJSHeapSize: number
}

export class BatchCapacity {
    /** Máy không báo RAM (trình duyệt ẩn thông tin) → coi như cấu hình phổ thông. */
    private static readonly DEFAULT_MEMORY_GB = 4
    private static readonly DEFAULT_CORES = 4

    /** Phần RAM máy dành cho một lô — chừa chỗ cho HIS, trình duyệt và hệ điều hành. */
    private static readonly MEMORY_SHARE = 0.2
    /** Phần heap còn trống của tab được phép dùng. */
    private static readonly HEAP_SHARE = 0.6
    /** Trần cứng: khớp giới hạn dung lượng một lần upload của API (chừa biên an toàn). */
    private static readonly HARD_MAX_BYTES = 900 * 1024 * 1024
    /**
     * RAM ước tính cho MỘT hồ sơ XML 130: nội dung thực tế trung bình khoảng 90KB,
     * nhân lên cho hồ sơ lớn và cho bản sao lúc gói dữ liệu gửi lên máy chủ.
     */
    private static readonly BYTES_PER_FILE = 256 * 1024
    /** Sàn: máy yếu tới đâu cũng cho kiểm tra tối thiểu chừng này hồ sơ một lượt. */
    private static readonly MIN_FILES = 50

    /** Thời gian HIS trả một file XML 130 (giây) — ước lượng theo tốc độ quan sát được. */
    private static readonly DOWNLOAD_SECONDS_PER_FILE = 0.8
    /** Thời gian máy chủ kiểm tra một hồ sơ (giây) — theo p95 đo bằng k6. */
    private static readonly VALIDATE_SECONDS_PER_FILE = 0.15

    private static readonly BYTES_PER_GB = 1024 * 1024 * 1024
    private static readonly SECONDS_PER_MINUTE = 60

    /** Đo lại mỗi lần kiểm tra: heap đang dùng thay đổi theo phiên làm việc. */
    measure(): CapacityPlan {
        const memoryGb = this.readMemoryGb()
        const cores = this.readCores()
        const budgetBytes = this.budgetOf(memoryGb)

        return {
            memoryGb,
            cores,
            budgetBytes,
            maxFiles: Math.max(
                BatchCapacity.MIN_FILES,
                Math.floor(budgetBytes / BatchCapacity.BYTES_PER_FILE),
            ),
            // Tải song song theo số luồng, giữ trong khoảng 2-8 để không dồn tải lên HIS
            parallelDownloads: Math.min(8, Math.max(2, Math.round(cores / 2))),
            summary: `RAM khoảng ${memoryGb} GB, ${cores} luồng CPU`,
        }
    }

    /**
     * Ước tính thời gian chờ của một lô: tải từ HIS (chia đều cho số luồng tải song song)
     * cộng thời gian máy chủ kiểm tra từng hồ sơ. Trả về số giây, làm tròn lên.
     */
    estimateSeconds(fileCount: number, plan: CapacityPlan): number {
        const download = (fileCount * BatchCapacity.DOWNLOAD_SECONDS_PER_FILE) / plan.parallelDownloads
        const validate = fileCount * BatchCapacity.VALIDATE_SECONDS_PER_FILE
        return Math.ceil(download + validate)
    }

    /** Thời gian chờ ước tính, viết thành câu để hiện trong hộp xác nhận. */
    estimateWait(fileCount: number, plan: CapacityPlan): string {
        const seconds = this.estimateSeconds(fileCount, plan)
        if (seconds < BatchCapacity.SECONDS_PER_MINUTE) return `khoảng ${seconds} giây`
        const minutes = Math.round(seconds / BatchCapacity.SECONDS_PER_MINUTE)
        return `khoảng ${minutes} phút`
    }

    /** Ngân sách = phần RAM máy cho phép, kẹp thêm bởi heap còn trống và trần của API. */
    private budgetOf(memoryGb: number): number {
        const byMemory = memoryGb * BatchCapacity.BYTES_PER_GB * BatchCapacity.MEMORY_SHARE
        const byHeap = this.freeHeapBytes()
        const budget = byHeap === null ? byMemory : Math.min(byMemory, byHeap * BatchCapacity.HEAP_SHARE)
        return Math.min(budget, BatchCapacity.HARD_MAX_BYTES)
    }

    /** Heap còn trống của tab, null nếu trình duyệt không cho biết. */
    private freeHeapBytes(): number | null {
        const memory = (performance as Performance & { memory?: HeapInfo }).memory
        if (!memory || !memory.jsHeapSizeLimit) return null
        return Math.max(0, memory.jsHeapSizeLimit - memory.usedJSHeapSize)
    }

    private readMemoryGb(): number {
        const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        return typeof value === 'number' && value > 0 ? value : BatchCapacity.DEFAULT_MEMORY_GB
    }

    private readCores(): number {
        const value = navigator.hardwareConcurrency
        return typeof value === 'number' && value > 0 ? value : BatchCapacity.DEFAULT_CORES
    }
}
