/**
 * Robot Mascot — trợ lý robot "sống" cho extension ZeroCheck AI.
 * Xem tasks/task-ui-robot và Robot-Design-Document-RDD.md.
 *
 * Điểm vào duy nhất cho phần còn lại của content script là RobotMascot.
 */
export { RobotMascot } from './RobotMascot'
export type { RobotResult, RobotMascotOptions } from './RobotMascot'
export type { RobotNotifier } from './RobotNotifier'
export type { RobotRenderer, RobotRendererId, RobotRendererMeta } from './RobotRenderer'
export { ROBOT_RENDERERS, DEFAULT_ROBOT_RENDERER, isRobotRendererId } from './RobotRenderer'
export { createRobotRenderer } from './RobotFactory'
export { loadExtensionConfig, defaultExtensionConfig } from './ExtensionConfig'
export type { ExtensionConfig } from './ExtensionConfig'
