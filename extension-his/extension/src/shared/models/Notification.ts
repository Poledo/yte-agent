export type NotificationLevel = 'error' | 'warning' | 'info' | 'success'

export interface Notification {
    field: HTMLElement
    level: NotificationLevel
    title: string
    message: string
    suggestion?: string
    canExplain?: boolean
    metadata?: Record<string, unknown>
    timestamp: number
}
