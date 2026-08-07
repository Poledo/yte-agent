import { MutationWatcher } from './MutationWatcher'
import { EventBinder, FieldChangeCallback, FieldBlurCallback } from './EventBinder'
import { FormAnalyzer } from '../analyzer/FormAnalyzer'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'

/**
 * Change Tracker orchestrates form field change detection.
 * Combines MutationWatcher (DOM changes) and EventBinder (value changes).
 */
export class ChangeTracker {
    private mutationWatcher: MutationWatcher
    private eventBinder: EventBinder
    private formAnalyzer: FormAnalyzer
    private fieldRegistry: FieldRegistry
    private isActive: boolean = false

    constructor(formAnalyzer: FormAnalyzer, fieldRegistry: FieldRegistry) {
        this.formAnalyzer = formAnalyzer
        this.fieldRegistry = fieldRegistry
        this.mutationWatcher = new MutationWatcher(formAnalyzer, fieldRegistry)
        this.eventBinder = new EventBinder(fieldRegistry)
    }

    /**
     * Register a callback to be called when a field value changes
     */
    onFieldChange(callback: FieldChangeCallback): void {
        this.eventBinder.onFieldChange(callback)
    }

    /**
     * Register a callback to be called when a field is blurred
     */
    onFieldBlur(callback: FieldBlurCallback): void {
        this.eventBinder.onFieldBlur(callback)
    }

    /**
     * Start tracking changes
     */
    start(root: Document | Element = document): void {
        if (this.isActive) {
            console.warn('[ChangeTracker] Already active')
            return
        }

        this.isActive = true

        // Bind events to existing fields
        this.eventBinder.bindAll()

        // Start watching for new elements
        this.mutationWatcher.start(root, (addedElements) => {
            // Scan new elements
            for (const element of addedElements) {
                this.formAnalyzer.scanElement(element, this.fieldRegistry)
                // Bind events to newly added field
                this.bindElement(element)
            }
        })

        console.log('[ChangeTracker] Started tracking form changes')
    }

    /**
     * Stop tracking changes
     */
    stop(): void {
        if (!this.isActive) {
            console.warn('[ChangeTracker] Not active')
            return
        }

        this.isActive = false
        this.mutationWatcher.stop()
        this.eventBinder.unbindAll()

        console.log('[ChangeTracker] Stopped tracking form changes')
    }

    /**
     * Manually bind events to a single element
     */
    bindElement(element: HTMLElement): void {
        if (!this.isActive) {
            console.warn('[ChangeTracker] Not active, cannot bind element')
            return
        }

        this.eventBinder.bindElement(element)
    }

    /**
     * Manually unbind events from a single element
     */
    unbindElement(element: HTMLElement): void {
        this.eventBinder.unbindElement(element)
    }

    /**
     * Get current active status
     */
    isTracking(): boolean {
        return this.isActive
    }

    /**
     * Get EventBinder for manual event binding (e.g., after scan)
     */
    getEventBinder() {
        return this.eventBinder
    }
}
