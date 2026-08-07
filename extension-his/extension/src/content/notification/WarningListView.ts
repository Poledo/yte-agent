import { Notification, NotificationLevel } from '../../shared/models/Notification'
import { UnifiedAssistantPanel } from '../ui/UnifiedAssistantPanel'

export type ExplainCallback = (notification: Notification) => void

/**
 * View tab "Cảnh báo" trong UnifiedAssistantPanel.
 * Kế thừa logic danh sách cảnh báo của AssistantBubble cũ:
 * - Theo dõi cảnh báo đang hoạt động theo từng field.
 * - Render danh sách, cho phép bỏ qua (dismiss) từng cảnh báo.
 * - Cập nhật badge/chấm đỏ thông qua UnifiedAssistantPanel.
 */
export class WarningListView {
    private readonly panel: UnifiedAssistantPanel
    private readonly container: HTMLElement
    private activeErrors: Map<string, Notification> = new Map()
    private explainCallback: ExplainCallback | null = null

    constructor(panel: UnifiedAssistantPanel) {
        this.panel = panel
        this.container = panel.getTabContainer('warnings')
        this.container.classList.add('wl-container')
        panel.addStyles(this.getStyles())
        this.render()
        console.log('[WarningListView] UI created')
    }

    /** Nhận cảnh báo mới từ NotificationManager */
    show(notification: Notification): void {
        const fieldId = this.resolveFieldId(notification.field)
        this.activeErrors.set(fieldId, notification)

        this.render()
        this.panel.setWarningCount(this.activeErrors.size)
        this.panel.flagNewWarning()

        console.log(`[WarningListView] Notification displayed (Active errors: ${this.activeErrors.size})`)
    }

    /** Xóa cảnh báo của một field (khi validation pass) */
    clearField(fieldElement: HTMLElement): void {
        const fieldId = this.resolveFieldId(fieldElement)
        if (!this.activeErrors.delete(fieldId)) return

        this.render()
        this.panel.setWarningCount(this.activeErrors.size)

        console.log(`[WarningListView] Cleared error for field: ${fieldId}`)
    }

    /** Xóa toàn bộ cảnh báo */
    clearAll(): void {
        this.activeErrors.clear()
        this.render()
        this.panel.setWarningCount(0)

        console.log('[WarningListView] Cleared all errors')
    }

    /** Ẩn UI cảnh báo (đóng panel nếu đang mở ở tab Cảnh báo) */
    hide(): void {
        if (this.panel.isPanelOpen() && this.panel.getActiveTab() === 'warnings') {
            this.panel.close()
        }
    }

    /** Đăng ký callback cho nút "Giải thích" */
    onExplain(callback: ExplainCallback): void {
        this.explainCallback = callback
    }

    // ---------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------

    private render(): void {
        if (this.activeErrors.size === 0) {
            this.container.innerHTML = '<div class="wl-empty">✅ Không có cảnh báo nào</div>'
            return
        }

        let html = '<div class="wl-list">'
        this.activeErrors.forEach((notification, fieldId) => {
            const levelColor = this.getLevelColor(notification.level)
            const fieldLabel = (notification.metadata?.fieldLabel as string) || fieldId
            html += `
                <div class="wl-item" data-field="${fieldId}">
                    <div class="wl-item-header">
                        <span class="wl-item-field">${fieldLabel}</span>
                        <button class="wl-item-dismiss" title="Bỏ qua" data-field="${fieldId}">✕</button>
                    </div>
                    <div class="wl-item-level" style="border-color: ${levelColor}; color: ${levelColor};">
                        ${this.getLevelText(notification.level)}
                    </div>
                    <div class="wl-item-message">${notification.message}</div>
                    ${notification.suggestion ? `<div class="wl-item-suggestion">💡 ${notification.suggestion}</div>` : ''}
                    ${notification.canExplain ? `<button class="wl-item-explain" data-field="${fieldId}">📖 Giải thích</button>` : ''}
                </div>
            `
        })
        html += '</div>'
        this.container.innerHTML = html

        this.attachItemHandlers()
    }

    private attachItemHandlers(): void {
        this.container.querySelectorAll('.wl-item-dismiss').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation()
                const fieldId = (btn as HTMLElement).getAttribute('data-field')
                if (fieldId) {
                    this.activeErrors.delete(fieldId)
                    this.render()
                    this.panel.setWarningCount(this.activeErrors.size)
                }
            })
        })

        this.container.querySelectorAll('.wl-item-explain').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation()
                const fieldId = (btn as HTMLElement).getAttribute('data-field')
                const notification = fieldId ? this.activeErrors.get(fieldId) : undefined
                if (notification && this.explainCallback) {
                    this.explainCallback(notification)
                }
            })
        })
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private resolveFieldId(fieldElement: HTMLElement): string {
        return fieldElement.id || fieldElement.className
    }

    private getLevelColor(level: NotificationLevel): string {
        const colors: Record<NotificationLevel, string> = {
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6',
            success: '#10b981',
        }
        return colors[level]
    }

    private getLevelText(level: NotificationLevel): string {
        const texts: Record<NotificationLevel, string> = {
            error: 'LỖI',
            warning: 'CẢNH BÁO',
            info: 'THÔNG TIN',
            success: 'THÀNH CÔNG',
        }
        return texts[level]
    }

    private getStyles(): string {
        return `
            .wl-container {
                padding: 12px;
                overflow-y: auto;
                background: #f8fafc;
            }

            .wl-empty {
                padding: 24px 16px;
                text-align: center;
                color: #6b7280;
                font-size: 13px;
            }

            .wl-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .wl-item {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                background: #ffffff;
            }

            .wl-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .wl-item-field {
                font-weight: 600;
                color: #1f2937;
                font-size: 13px;
            }

            .wl-item-dismiss {
                background: transparent;
                border: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
            }

            .wl-item-dismiss:hover { color: #1f2937; }

            .wl-item-level {
                display: inline-block;
                border-left: 3px solid;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 8px;
            }

            .wl-item-message {
                color: #4b5563;
                font-size: 12px;
                line-height: 1.5;
                margin-bottom: 8px;
            }

            .wl-item-suggestion {
                background: #f0fdf4;
                border-left: 3px solid #10b981;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                color: #065f46;
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.6;
            }

            .wl-item-explain {
                margin-top: 8px;
                background: #3b82f6;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }

            .wl-item-explain:hover { background: #2563eb; }
        `
    }
}
