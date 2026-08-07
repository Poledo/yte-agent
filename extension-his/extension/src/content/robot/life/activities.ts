import { Activity, LifePhase } from './LifeTypes'

/**
 * DỮ LIỆU hoạt động mẫu cho popup "ngôi nhà" của robot (task-002 §2).
 * Đây chỉ là VÀI VÍ DỤ — thêm hàng trăm hoạt động = thêm phần tử vào mảng này,
 * không đụng bất kỳ lớp engine nào. Sau này có thể tải danh sách từ web-admin.
 *
 * Quy ước `id` trùng tên animation sẽ hiện thực ở lớp view (chưa bắt buộc có ngay).
 */
export const DEFAULT_ACTIVITIES: readonly Activity[] = [
    // --- Nghỉ ngơi ---
    { id: 'sleep', label: 'ngủ', category: 'rest', weight: 5, minMs: 15_000, maxMs: 40_000, isPrivate: true, phases: [LifePhase.Sleeping, LifePhase.Napping] },
    { id: 'meditate', label: 'ngồi thiền', category: 'rest', weight: 2, minMs: 10_000, maxMs: 20_000 },
    { id: 'stargaze', label: 'ngắm sao', category: 'rest', weight: 1, minMs: 10_000, maxMs: 18_000, phases: [LifePhase.Sleeping] },

    // --- Sở thích ---
    { id: 'readBook', label: 'đọc sách', category: 'hobby', weight: 4, minMs: 12_000, maxMs: 24_000, phases: [LifePhase.Working] },
    { id: 'drinkCoffee', label: 'uống cà phê', category: 'hobby', weight: 3, minMs: 8_000, maxMs: 14_000, phases: [LifePhase.Working] },
    { id: 'drinkTea', label: 'uống trà', category: 'hobby', weight: 3, minMs: 8_000, maxMs: 14_000, phases: [LifePhase.Working] },
    { id: 'playRubik', label: 'chơi Rubik', category: 'hobby', weight: 2, minMs: 10_000, maxMs: 20_000, phases: [LifePhase.Working] },
    { id: 'playGame', label: 'chơi game', category: 'hobby', weight: 2, minMs: 12_000, maxMs: 22_000, phases: [LifePhase.Working] },
    { id: 'listenMusic', label: 'nghe nhạc', category: 'hobby', weight: 3, minMs: 10_000, maxMs: 20_000 },
    { id: 'writeDiary', label: 'viết nhật ký', category: 'hobby', weight: 1, minMs: 10_000, maxMs: 16_000, phases: [LifePhase.Sleeping] },

    // --- Vệ sinh / việc nhà (một số riêng tư) ---
    { id: 'shower', label: 'tắm', category: 'chore', weight: 1, minMs: 8_000, maxMs: 14_000, isPrivate: true },
    { id: 'brushTeeth', label: 'đánh răng', category: 'chore', weight: 2, minMs: 6_000, maxMs: 10_000 },
    { id: 'wateringPlant', label: 'tưới cây', category: 'chore', weight: 2, minMs: 8_000, maxMs: 14_000, phases: [LifePhase.Working] },

    // --- Vận động ---
    { id: 'gym', label: 'tập gym', category: 'exercise', weight: 2, minMs: 10_000, maxMs: 18_000, phases: [LifePhase.Working] },
    { id: 'pushUp', label: 'chống đẩy', category: 'exercise', weight: 2, minMs: 8_000, maxMs: 14_000, phases: [LifePhase.Working] },
    { id: 'martialArts', label: 'tập võ', category: 'exercise', weight: 1, minMs: 10_000, maxMs: 16_000, phases: [LifePhase.Working] },

    // --- Tự bảo trì (đúng chất robot) ---
    { id: 'chargeBattery', label: 'sạc pin', category: 'work', weight: 3, minMs: 12_000, maxMs: 22_000 },
    { id: 'oiling', label: 'tra dầu', category: 'work', weight: 2, minMs: 8_000, maxMs: 14_000 },
    { id: 'selfRepair', label: 'sửa chính mình', category: 'work', weight: 1, minMs: 10_000, maxMs: 18_000 },
    { id: 'learnCoding', label: 'học lập trình', category: 'work', weight: 2, minMs: 12_000, maxMs: 22_000, phases: [LifePhase.Working] },
]
