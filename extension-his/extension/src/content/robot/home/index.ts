/**
 * "Ngôi nhà" của robot trong popup extension (task-002 §2, §3, §4) — barrel export.
 * PopupRobot mount robot thứ hai trong popup, dùng chung RobotView + life/LifeDirector
 * với robot ở trang. ActivityAnimator là điểm mở rộng animation theo id hoạt động.
 */
export { PopupRobot } from './PopupRobot'
export type { PopupRobotHooks, PopupRobotDeps } from './PopupRobot'
export { ActivityAnimator, createDefaultActivityAnimator, DEFAULT_ACTIVITY_ANIMATIONS } from './HomeActivityAnimations'
export type { ActivityAnimBuilder } from './HomeActivityAnimations'
