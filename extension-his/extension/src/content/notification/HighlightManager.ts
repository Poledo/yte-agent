import { NotificationLevel } from '../../shared/models/Notification'

/**
 * Manages visual highlighting of form fields.
 * Adds colored borders based on notification level.
 */
export class HighlightManager {
    private readonly highlightClass = 'ai-validation-highlight'
    private readonly highlightedElements: Map<HTMLElement, NotificationLevel> = new Map()

    constructor() {
        this.injectStyles()
    }

    /**
     * Show highlight on a field element
     */
    show(element: HTMLElement, level: NotificationLevel): void {
        // Remove previous highlight if exists
        if (this.highlightedElements.has(element)) {
            this.clear(element)
        }

        // Add highlight class
        element.classList.add(this.highlightClass, `${this.highlightClass}--${level}`)
        this.highlightedElements.set(element, level)

        console.log(`[HighlightManager] Highlighted field with level: ${level}`)
    }

    /**
     * Clear highlight from a field element
     */
    clear(element: HTMLElement): void {
        const level = this.highlightedElements.get(element)
        if (!level) {
            return
        }

        element.classList.remove(this.highlightClass, `${this.highlightClass}--${level}`)
        this.highlightedElements.delete(element)

        console.log('[HighlightManager] Cleared highlight')
    }

    /**
     * Clear all highlights
     */
    clearAll(): void {
        for (const element of this.highlightedElements.keys()) {
            this.clear(element)
        }

        console.log('[HighlightManager] Cleared all highlights')
    }

    /**
     * Inject CSS styles for highlights
     */
    private injectStyles(): void {
        // Check if already injected
        if (document.getElementById('ai-validation-highlight-styles')) {
            return
        }

        const style = document.createElement('style')
        style.id = 'ai-validation-highlight-styles'
        style.textContent = `
            .ai-validation-highlight {
                border: 2px solid !important;
                border-radius: 4px !important;
                box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
            }

            .ai-validation-highlight--error {
                border-color: #dc2626 !important;
                background-color: rgba(220, 38, 38, 0.02) !important;
            }

            .ai-validation-highlight--warning {
                border-color: #f59e0b !important;
                background-color: rgba(245, 158, 11, 0.02) !important;
            }

            .ai-validation-highlight--info {
                border-color: #3b82f6 !important;
                background-color: rgba(59, 130, 246, 0.02) !important;
            }

            .ai-validation-highlight--success {
                border-color: #10b981 !important;
                background-color: rgba(16, 185, 129, 0.02) !important;
            }
        `

        document.head.appendChild(style)
        console.log('[HighlightManager] Styles injected')
    }
}
