import { FormAnalyzer } from '../analyzer/FormAnalyzer'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'

export type MutationCallback = (addedElements: HTMLElement[]) => void

/**
 * Watches for DOM mutations (new elements added).
 * Uses MutationObserver to detect when new form fields are added to the page.
 */
export class MutationWatcher {
    private observer: MutationObserver | null = null
    private callback: MutationCallback | null = null
    private analyzer: FormAnalyzer
    private registry: FieldRegistry

    constructor(analyzer: FormAnalyzer, registry: FieldRegistry) {
        this.analyzer = analyzer
        this.registry = registry
    }

    /**
     * Start watching for DOM mutations
     */
    start(root: Document | Element = document, callback?: MutationCallback): void {
        this.callback = callback || this.defaultCallback.bind(this)

        const config: MutationObserverInit = {
            childList: true, // Watch for added/removed nodes
            subtree: true, // Watch all descendants
            attributes: false, // Don't watch attribute changes
            characterData: false, // Don't watch text content changes
        }

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations)
        })

        this.observer.observe(root, config)
        console.log('[MutationWatcher] Started watching for DOM changes')
    }

    /**
     * Stop watching for DOM mutations
     */
    stop(): void {
        if (this.observer) {
            this.observer.disconnect()
            this.observer = null
            console.log('[MutationWatcher] Stopped watching')
        }
    }

    /**
     * Handle mutations and extract newly added form field elements
     */
    private handleMutations(mutations: MutationRecord[]): void {
        const addedElements: HTMLElement[] = []

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Check newly added nodes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement

                        // Check if the element itself is a field
                        if (this.isFormField(element)) {
                            addedElements.push(element)
                        }

                        // Check if element contains any fields
                        const fieldsInElement = this.findFieldsInElement(element)
                        addedElements.push(...fieldsInElement)
                    }
                })
            }
        }

        // Process found elements
        if (addedElements.length > 0) {
            // Remove duplicates
            const unique = Array.from(new Set(addedElements))
            console.log(`[MutationWatcher] Detected ${unique.length} new field(s)`)
            this.callback!(unique)
        }
    }

    /**
     * Check if element is a form field
     */
    private isFormField(element: HTMLElement): boolean {
        const fieldTags = ['INPUT', 'TEXTAREA', 'SELECT']
        return fieldTags.includes(element.tagName.toUpperCase())
    }

    /**
     * Find all form fields within an element
     */
    private findFieldsInElement(element: HTMLElement): HTMLElement[] {
        const selector = 'input, textarea, select'
        return Array.from(element.querySelectorAll(selector)) as HTMLElement[]
    }

    /**
     * Default callback: scan new elements and register them
     */
    private defaultCallback(addedElements: HTMLElement[]): void {
        for (const element of addedElements) {
            // Scan just this element
            this.analyzer.scanElement(element, this.registry)
        }

        const totalFields = this.registry.size()
        console.log(`[MutationWatcher] Total fields now: ${totalFields}`)
    }
}
