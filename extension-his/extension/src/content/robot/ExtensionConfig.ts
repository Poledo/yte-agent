import { ApiConfiguration } from '../api/ApiConfiguration'
import { RobotLifeConfig } from './life'
import type { LifeThresholdOverride } from './life'
import { DEFAULT_ROBOT_RENDERER, isRobotRendererId, RobotRendererId } from './RobotRenderer'
import { LICENSE_HEADER, LICENSE_KEY_STORAGE, loadLicenseSettings } from '../../shared/license/LicenseSettings'

/**
 * Cấu hình extension lấy từ web-admin qua API (task-003 §1.6, Part 2).
 * Được nạp MỘT LẦN khi trang HIS tải xong; quyết định chọn hình hài robot nào và
 * (tuỳ chọn) ghi đè các mốc thời gian của hệ sinh hoạt.
 */
export interface ExtensionConfig {
    /** Hình hài robot: 'svg' | 'svgAnim' | 'three'. */
    readonly robotRenderer: RobotRendererId
    /** Ngưỡng thời gian đã trộn với mặc định (id/label giữ nguyên). */
    readonly thresholds: LifeThresholdOverride
    /** Diện mạo robot 3D (màu/cỡ/logo) chỉnh từ web-admin. */
    readonly appearance: RobotAppearance
}

/**
 * Diện mạo robot 3D chỉnh nhanh từ web-admin (task-003 Part 2): màu thương hiệu, cỡ, logo.
 * Chỉ áp cho hình hài 3D ('three'). Giá trị `null` = dùng mặc định đóng gói sẵn.
 */
export interface RobotAppearance {
    /** Màu thương hiệu hex #RRGGBB, hoặc null → xanh VNPT mặc định. */
    readonly color: string | null
    /** Cỡ robot theo phần trăm (100 = mặc định), đã kẹp [40, 200]. */
    readonly scale: number
    /** Hiện logo trên ngực robot hay không. */
    readonly showLogo: boolean
    /** Logo tuỳ chỉnh dạng data URL, hoặc null → dùng logo VNPT mặc định. */
    readonly logoDataUrl: string | null
}

/** Một mốc ghi đè từ API: chỉ đổi thời điểm `atMs` của stage có sẵn (theo id). */
interface StageOverride {
    id: string
    atMs: number
}

/** Cấu hình thô do API trả về (chưa kiểm chứng). */
interface RawConfig {
    robotRenderer?: unknown
    life?: {
        waitEscalation?: StageOverride[]
        seasons?: StageOverride[]
        aging?: StageOverride[]
        waitEscalationRandom?: unknown
    }
    appearance?: {
        color?: unknown
        scale?: unknown
        showLogo?: unknown
        logoDataUrl?: unknown
    }
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

const ENDPOINT_PATH = '/api/extension-config'
const FETCH_TIMEOUT_MS = 4000

/** Key trong chrome.storage.local giữ bản cấu hình đã tải gần nhất. */
const CONFIG_CACHE_STORAGE = 'extensionConfigCache'

/**
 * Trong khoảng này thì dùng thẳng bản trong bộ nhớ đệm, không chạm mạng: nhân viên mở
 * dăm bảy tab HIS trong một phút là chuyện thường, không nên thành dăm bảy request.
 * Quá hạn cũng chỉ gửi một request kèm ETag — máy chủ thường trả 304 rỗng.
 */
const CACHE_TTL_MS = 5 * 60 * 1000

/** Bản cấu hình lưu đệm, gắn với ĐÚNG khóa bản quyền đã dùng để lấy nó. */
interface CachedConfig {
    /** Khóa bản quyền lúc tải. Đổi khóa ⇒ cơ sở khác ⇒ bản đệm này vô giá trị. */
    licenseKey: string
    /** ETag máy chủ trả về, gửi lại qua If-None-Match để xin 304. */
    etag: string
    /** Thời điểm tải (Date.now()). */
    fetchedAt: number
    /** Nội dung thô như máy chủ trả — kiểm chứng lại lúc đọc ra, không tin bộ nhớ đệm. */
    raw: RawConfig
}

/** Diện mạo mặc định: xanh VNPT, cỡ 100%, KHÔNG logo (logo mặc định là placeholder xấu). */
export function defaultRobotAppearance(): RobotAppearance {
    return { color: null, scale: 100, showLogo: false, logoDataUrl: null }
}

/** Cấu hình an toàn khi chưa/không lấy được từ API. */
export function defaultExtensionConfig(): ExtensionConfig {
    return { robotRenderer: DEFAULT_ROBOT_RENDERER, thresholds: {}, appearance: defaultRobotAppearance() }
}

/**
 * Nạp cấu hình từ API (GET /api/extension-config). Mọi lỗi (offline, 4xx/5xx, JSON
 * sai) đều rơi về mặc định để robot luôn chạy — KHÔNG chặn trang HIS.
 *
 * Cấu hình ăn theo cơ sở KCB nên request mang theo khóa bản quyền: máy chủ đọc khóa,
 * tra ra cơ sở, rồi trả cấu hình riêng của cơ sở đó (hoặc của tuyến trên nếu cơ sở
 * chưa tự đặt). Chưa khai khóa thì vẫn gọi bình thường và nhận cấu hình chung —
 * robot phải xuất hiện kể cả trên máy chưa kích hoạt bản quyền.
 */
export async function loadExtensionConfig(baseUrl: string = new ApiConfiguration().baseUrl): Promise<ExtensionConfig> {
    const { licenseKey } = await loadLicenseSettings()
    const cached = await readCache(licenseKey)

    // Còn hạn thì khỏi chạm mạng luôn: robot lên ngay lúc trang HIS vừa tải xong.
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return parseConfig(cached.raw)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (licenseKey) headers[LICENSE_HEADER] = licenseKey
        // Chỉ gửi If-None-Match khi bản đệm ứng với ĐÚNG khóa hiện tại — gửi ETag của
        // cơ sở cũ mà máy chủ trả 304 là robot đứng nguyên diện mạo cơ sở cũ.
        if (cached?.etag) headers['If-None-Match'] = cached.etag

        const res = await fetch(`${baseUrl}${ENDPOINT_PATH}`, {
            method: 'GET',
            headers,
            signal: controller.signal,
        })

        if (res.status === 304 && cached) {
            // Không đổi: gia hạn bản đệm để lần sau lại đi đường tắt phía trên.
            await writeCache({ ...cached, fetchedAt: Date.now() })
            return parseConfig(cached.raw)
        }

        if (!res.ok) {
            // Máy chủ trục trặc mà tay đang có bản đệm thì dùng bản đệm: diện mạo hơi
            // cũ vẫn hơn là robot đột ngột đổi về mặc định giữa ca trực.
            return cached ? parseConfig(cached.raw) : defaultExtensionConfig()
        }

        const raw = (await res.json()) as RawConfig
        await writeCache({
            licenseKey,
            etag: res.headers.get('ETag') ?? '',
            fetchedAt: Date.now(),
            raw,
        })
        return parseConfig(raw)
    } catch {
        return cached ? parseConfig(cached.raw) : defaultExtensionConfig()
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Theo dõi khóa bản quyền: đổi khóa là đổi cơ sở, mà cấu hình robot ăn theo cơ sở.
 * Không có chỗ này thì nhập khóa cơ sở mới xong vẫn thấy robot của cơ sở cũ cho tới
 * lúc tải lại trang — người dùng tưởng khóa không nhận.
 *
 * Chỉ xóa bộ nhớ đệm; lần gọi `loadExtensionConfig()` kế tiếp sẽ tải lại. Trả về hàm
 * gỡ theo dõi để nơi gọi dọn dẹp nếu cần.
 */
export function watchLicenseKeyChanges(onChanged?: () => void): () => void {
    const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string,
    ): void => {
        if (areaName !== 'local' || !(LICENSE_KEY_STORAGE in changes)) return
        const { oldValue, newValue } = changes[LICENSE_KEY_STORAGE]
        if (oldValue === newValue) return
        void clearConfigCache().then(() => onChanged?.())
    }

    try {
        chrome.storage.onChanged.addListener(listener)
    } catch {
        // Tiện ích vừa cập nhật thì content script cũ mất quyền storage — bỏ qua,
        // cùng lắm là phải tải lại trang mới thấy cấu hình mới.
        return () => {}
    }

    return () => {
        try {
            chrome.storage.onChanged.removeListener(listener)
        } catch {
            /* đã mất quyền storage, không còn gì để gỡ */
        }
    }
}

/** Xóa bản cấu hình đang đệm (dùng khi đổi khóa bản quyền). */
export async function clearConfigCache(): Promise<void> {
    try {
        await chrome.storage.local.remove(CONFIG_CACHE_STORAGE)
    } catch {
        /* mất quyền storage: coi như không có gì để xóa */
    }
}

/** Đọc bản đệm, CHỈ khi nó ứng với đúng khóa bản quyền đang dùng. */
async function readCache(licenseKey: string): Promise<CachedConfig | null> {
    try {
        const items = await chrome.storage.local.get({ [CONFIG_CACHE_STORAGE]: null })
        const cached = items[CONFIG_CACHE_STORAGE] as CachedConfig | null
        if (!cached || typeof cached !== 'object' || !cached.raw) return null
        if (cached.licenseKey !== licenseKey) return null
        if (typeof cached.fetchedAt !== 'number') return null
        return cached
    } catch {
        return null
    }
}

async function writeCache(entry: CachedConfig): Promise<void> {
    try {
        await chrome.storage.local.set({ [CONFIG_CACHE_STORAGE]: entry })
    } catch {
        /* không lưu được thì lần sau tải lại, không ảnh hưởng gì */
    }
}

/** Kiểm chứng + trộn cấu hình thô về ExtensionConfig chuẩn. */
function parseConfig(raw: RawConfig): ExtensionConfig {
    const robotRenderer = isRobotRendererId(raw.robotRenderer) ? raw.robotRenderer : DEFAULT_ROBOT_RENDERER
    const thresholds: LifeThresholdOverride = {
        waitEscalation: mergeStages(RobotLifeConfig.waitEscalation, raw.life?.waitEscalation),
        seasons: mergeStages(RobotLifeConfig.seasons, raw.life?.seasons),
        aging: mergeStages(RobotLifeConfig.aging, raw.life?.aging),
        waitEscalationRandom: raw.life?.waitEscalationRandom === true,
    }
    return { robotRenderer, thresholds, appearance: parseAppearance(raw.appearance) }
}

/** Kiểm chứng diện mạo thô: màu hex hợp lệ, cỡ kẹp [40,200], logo data URL đúng dạng. */
function parseAppearance(raw: RawConfig['appearance']): RobotAppearance {
    const color = typeof raw?.color === 'string' && HEX_COLOR.test(raw.color) ? raw.color : null
    const scaleNum = typeof raw?.scale === 'number' && Number.isFinite(raw.scale) ? Math.round(raw.scale) : 100
    const scale = Math.min(200, Math.max(40, scaleNum || 100))
    const showLogo = raw?.showLogo === true
    const logoDataUrl =
        typeof raw?.logoDataUrl === 'string' && raw.logoDataUrl.startsWith('data:image/') ? raw.logoDataUrl : null
    return { color, scale, showLogo, logoDataUrl }
}

/**
 * Trộn mốc ghi đè lên mặc định THEO id: chỉ thay `atMs`, giữ nguyên id/label/effects
 * để lớp view vẫn ánh xạ đúng hiệu ứng. Bỏ qua id lạ (không có trong mặc định).
 */
function mergeStages<T extends { id: string; atMs: number }>(defaults: readonly T[], overrides?: StageOverride[]): readonly T[] {
    if (!overrides || overrides.length === 0) return defaults
    const byId = new Map(overrides.map((o) => [o.id, o.atMs]))
    return defaults.map((d) => (byId.has(d.id) ? { ...d, atMs: byId.get(d.id) as number } : d))
}
