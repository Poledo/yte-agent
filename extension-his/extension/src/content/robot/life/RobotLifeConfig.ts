/**
 * Cấu hình HỆ SINH HOẠT của robot (RDD Expansion v2).
 *
 * Mọi ngưỡng thời gian/xác suất gom về đây để KHÔNG hardcode rải rác và để sau này
 * bơm từ web-admin xuống (chỉ cần thay object này bằng cấu hình tải về, phần còn lại
 * của kiến trúc không đổi — đúng yêu cầu "mở rộng không sửa kiến trúc").
 *
 * Đơn vị thời gian: phút cho lịch ngày; mili-giây cho leo thang chờ AI.
 */
export const RobotLifeConfig = {
    /**
     * Lịch sinh hoạt theo giờ trong ngày (giờ địa phương của máy).
     * Mỗi mốc = phút kể từ 00:00. TimeScheduler nội suy pha giữa các mốc.
     */
    schedule: {
        wakeUp: 6 * 60, // 06:00 thức dậy
        napStart: 11 * 60, // 11:00 ngủ trưa
        napEnd: 14 * 60, // 14:00 dậy
        sleepStart: 17 * 60, // 17:00 bắt đầu buồn ngủ tối (bị lệch bởi jitter)
        sleepEnd: 6 * 60, // 06:00 hôm sau
        /** Dao động ngẫu nhiên mỗi ngày (± phút) để giờ ngủ không cứng nhắc. */
        dailyJitterMinutes: 60,
    },

    /** Leo thang khi chờ AI lâu (task-002 §5). elapsed(ms) ≥ atMs → stage. */
    waitEscalation: [
        { atMs: 0, id: 'think', label: 'suy nghĩ' },
        { atMs: 3_000, id: 'sit', label: 'ngồi xuống' },
        { atMs: 10_000, id: 'magnifier', label: 'lấy kính lúp' },
        { atMs: 20_000, id: 'tea', label: 'uống trà' },
        { atMs: 40_000, id: 'read', label: 'đọc sách' },
        { atMs: 60_000, id: 'meditate', label: 'ngồi thiền' },
        { atMs: 120_000, id: 'fishing', label: 'câu cá' },
        { atMs: 300_000, id: 'camp', label: 'dựng lều' },
        { atMs: 600_000, id: 'campfire', label: 'đốt lửa' },
        { atMs: 1_200_000, id: 'buildHouse', label: 'dựng nhà' },
        { atMs: 1_800_000, id: 'aged', label: 'già đi' },
    ],

    /** Bốn mùa khi chờ AI cực lâu (task-002 §6). elapsed(ms) ≥ atMs → mùa. */
    seasons: [
        { atMs: 0, id: 'spring', label: 'Mùa xuân', effects: ['petals', 'butterfly'] },
        { atMs: 45_000, id: 'summer', label: 'Mùa hè', effects: ['sun', 'cicada'] },
        { atMs: 90_000, id: 'autumn', label: 'Mùa thu', effects: ['leaves', 'wind'] },
        { atMs: 135_000, id: 'winter', label: 'Mùa đông', effects: ['snow', 'coat'] },
    ],

    /** Hoá già theo thời gian chờ (task-002 §7). elapsed(ms) ≥ atMs → giai đoạn. */
    aging: [
        { atMs: 10_000, id: 'dust', label: 'bám bụi' },
        { atMs: 30_000, id: 'dustMore', label: 'bụi nhiều hơn' },
        { atMs: 45_000, id: 'rust', label: 'rỉ sét' },
        { atMs: 60_000, id: 'loose', label: 'ốc vít lỏng' },
        { atMs: 90_000, id: 'grayHair', label: 'đầu bạc' },
        { atMs: 120_000, id: 'cane', label: 'chống gậy' },
        { atMs: 150_000, id: 'slow', label: 'đi rất chậm' },
        { atMs: 180_000, id: 'elder', label: 'thành ông lão' },
    ],

    /** Chọn hoạt động idle: khoảng cách giữa hai lần đổi hoạt động (ms). */
    activity: {
        minMs: 8_000,
        maxMs: 20_000,
        /** Không lặp lại ngay hoạt động vừa làm. */
        avoidImmediateRepeat: true,
    },

    /**
     * Chế độ NGẪU NHIÊN của leo thang chờ AI (bật/tắt ở web-admin). Khi bật, robot KHÔNG
     * leo thang theo mốc cố định nữa mà đổi hoạt động NGẪU NHIÊN sau mỗi khoảng thời gian
     * ngẫu nhiên trong [minMs, maxMs]. Dùng chung pool stage với `waitEscalation`.
     */
    waitRandom: {
        minMs: 4_000,
        maxMs: 12_000,
        /** Không bốc lại ngay hoạt động vừa diễn. */
        avoidImmediateRepeat: true,
    },
} as const

export type WaitStageDef = (typeof RobotLifeConfig.waitEscalation)[number]
export type SeasonDef = (typeof RobotLifeConfig.seasons)[number]
export type AgingStageDef = (typeof RobotLifeConfig.aging)[number]
