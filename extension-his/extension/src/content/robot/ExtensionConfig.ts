import { ApiConfiguration } from '../api/ApiConfiguration'
import { RobotLifeConfig } from './life'
import type { LifeThresholdOverride } from './life'
import { DEFAULT_ROBOT_RENDERER, isRobotRendererId, RobotRendererId } from './RobotRenderer'

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
 */
export async function loadExtensionConfig(baseUrl: string = new ApiConfiguration().baseUrl): Promise<ExtensionConfig> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const res = await fetch(`${baseUrl}${ENDPOINT_PATH}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
        if (!res.ok) return defaultExtensionConfig()
        return parseConfig((await res.json()) as RawConfig)
    } catch {
        return defaultExtensionConfig()
    } finally {
        clearTimeout(timer)
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
