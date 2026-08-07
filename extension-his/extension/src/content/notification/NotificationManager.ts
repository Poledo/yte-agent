import { Notification } from '../../shared/models/Notification'
import { HighlightManager } from './HighlightManager'
import { WarningListView, ExplainCallback } from './WarningListView'
import { SoundManager } from './SoundManager'

/**
 * Orchestrates all notification UI components.
 * Entry point for triggering notifications.
 */
export class NotificationManager {
    private highlightManager: HighlightManager
    private warningView: WarningListView
    private soundManager: SoundManager
    private activeNotification: Notification | null = null
    private highlightedElements: Set<HTMLElement> = new Set()

    constructor(warningView: WarningListView, explainCallback?: ExplainCallback) {
        this.highlightManager = new HighlightManager()
        this.warningView = warningView
        this.soundManager = new SoundManager()

        if (explainCallback) {
            this.warningView.onExplain(explainCallback)
        }

        console.log('[NotificationManager] Initialized')
    }

    /**
     * Show a notification
     */
    notify(notification: Notification): void {
        this.activeNotification = notification

        // Highlight the field
        this.highlightManager.show(notification.field, notification.level)
        this.highlightedElements.add(notification.field)

        // Show in warning tab (badge/dot handled by UnifiedAssistantPanel)
        this.warningView.show(notification)

        // Play sound
        this.playSound(notification.level)

        console.log(`[NotificationManager] Notification sent: ${notification.title}`)
    }

    /**
     * Clear notification for a specific field
     */
    clear(element: HTMLElement): void {
        this.highlightManager.clear(element)
        this.highlightedElements.delete(element)
        this.warningView.clearField(element)

        // If this was the active notification's field, clear it
        if (this.activeNotification?.field === element) {
            this.activeNotification = null
        }

        console.log('[NotificationManager] Cleared notification for field')
    }

    /**
     * Clear error for a specific field (when validation passes)
     */
    clearFieldError(element: HTMLElement): void {
        this.highlightManager.clear(element)
        this.highlightedElements.delete(element)
        this.warningView.clearField(element)

        console.log('[NotificationManager] Cleared validation error for field')
    }

    /**
     * Clear all notifications
     */
    clearAll(): void {
        this.highlightManager.clearAll()
        this.highlightedElements.clear()
        this.warningView.clearAll()
        this.warningView.hide()
        this.activeNotification = null

        console.log('[NotificationManager] Cleared all notifications')
    }

    /**
     * Set explain callback
     */
    setExplainCallback(callback: ExplainCallback): void {
        this.warningView.onExplain(callback)
    }

    /**
     * Mute sounds
     */
    muteSound(): void {
        this.soundManager.mute()
    }

    /**
     * Unmute sounds
     */
    unmuteSound(): void {
        this.soundManager.unmute()
    }

    /**
     * Play sound based on notification level
     */
    private playSound(level: string): void {
        switch (level) {
            case 'error':
                this.soundManager.playError()
                break
            case 'warning':
                this.soundManager.playWarning()
                break
            case 'success':
                this.soundManager.playSuccess()
                break
            default:
                // info - no sound
                break
        }
    }
}
