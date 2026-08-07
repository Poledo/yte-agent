/**
 * Hệ SINH HOẠT robot (RDD Expansion v2) — barrel export.
 * Tất cả là logic quyết-định thuần (không DOM), tái dùng cho robot ở trang & popup.
 * Điểm mở rộng: đăng ký thêm Activity vào ActivityRegistry / bơm cấu hình web-admin
 * vào RobotLifeConfig là đủ, không sửa engine (xem docs/13_LifeSystem).
 */
export { LifeDirector } from './LifeDirector'
export type { WaitSnapshot, LifeThresholdOverride } from './LifeDirector'
export { TimeScheduler } from './TimeScheduler'
export { ActivityRegistry } from './ActivityRegistry'
export { IdleActivityGenerator } from './IdleActivityGenerator'
export type { ActivityPick } from './IdleActivityGenerator'
export { RandomEventGenerator } from './RandomEventGenerator'
export type { Rng, Weighted } from './RandomEventGenerator'
export { WaitEscalation } from './WaitEscalation'
export type { WaitEscalationOptions } from './WaitEscalation'
export { RandomStageSequencer } from './RandomStageSequencer'
export { SeasonSystem } from './SeasonSystem'
export { AgingSystem } from './AgingSystem'
export { StageTimeline } from './StageTimeline'
export type { TimedStage } from './StageTimeline'
export { DEFAULT_ACTIVITIES } from './activities'
export { RobotLifeConfig } from './RobotLifeConfig'
export type { WaitStageDef, SeasonDef, AgingStageDef } from './RobotLifeConfig'
export { LifePhase } from './LifeTypes'
export type { Activity, ActivityCategory } from './LifeTypes'
