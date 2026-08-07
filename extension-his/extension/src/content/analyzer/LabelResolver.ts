/**
 * LabelResolver
 * Responsible for resolving field labels using priority-based strategy
 */
export class LabelResolver {
    /**
     * Resolve label for a field element using 8 priority levels
     *
     * @param fieldElement - The field element to resolve label for
     * @returns Resolved label text or empty string
     */
    public resolveLabel(fieldElement: HTMLElement): string {
        // Priority 1: <label for="id">
        let label = this.findLabelByFor(fieldElement)
        if (label) return label

        // Priority 2: Parent <label> containing input
        label = this.findNestedLabel(fieldElement)
        if (label) return label

        // Priority 3: aria-label attribute
        label = this.findAriaLabel(fieldElement)
        if (label) return label

        // Priority 4: placeholder attribute
        label = this.findPlaceholder(fieldElement)
        if (label) return label

        // Priority 5: title attribute
        label = this.findTitle(fieldElement)
        if (label) return label

        // Priority 6: previousElementSibling text
        label = this.findPreviousElementText(fieldElement)
        if (label) return label

        // Priority 7: Table cell containing field
        label = this.findTableCellText(fieldElement)
        if (label) return label

        // Priority 8: Nearest text node
        label = this.findNearestText(fieldElement)
        if (label) return label

        return ''
    }

    /**
     * Find label by <label for="id"> association
     *
     * @param fieldElement - Field element with id
     * @returns Label text or empty string
     */
    private findLabelByFor(fieldElement: HTMLElement): string {
        const id = fieldElement.id
        if (!id) return ''

        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
        if (label) {
            return label.textContent?.trim() || ''
        }

        return ''
    }

    /**
     * Find label when field is nested inside <label>
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findNestedLabel(fieldElement: HTMLElement): string {
        const parent = fieldElement.closest('label')
        if (parent) {
            return parent.textContent?.trim() || ''
        }
        return ''
    }

    /**
     * Find label from aria-label attribute
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findAriaLabel(fieldElement: HTMLElement): string {
        const ariaLabel = fieldElement.getAttribute('aria-label')
        if (ariaLabel) {
            return ariaLabel.trim()
        }
        return ''
    }

    /**
     * Find label from placeholder attribute
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findPlaceholder(fieldElement: HTMLElement): string {
        const placeholder = fieldElement.getAttribute('placeholder')
        if (placeholder) {
            return placeholder.trim()
        }
        return ''
    }

    /**
     * Find label from title attribute
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findTitle(fieldElement: HTMLElement): string {
        const title = fieldElement.getAttribute('title')
        if (title) {
            return title.trim()
        }
        return ''
    }

    /**
     * Find label from previousElementSibling text
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findPreviousElementText(fieldElement: HTMLElement): string {
        const previous = fieldElement.previousElementSibling
        if (previous && (previous.tagName === 'LABEL' || previous.tagName === 'SPAN')) {
            const text = previous.textContent?.trim()
            if (text && text.length > 0) {
                return text
            }
        }
        return ''
    }

    /**
     * Find label from table cell containing field
     * Strategy: Look for span/label before input in the same or previous cell
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findTableCellText(fieldElement: HTMLElement): string {
        const cell = fieldElement.closest('td, th')
        if (!cell) return ''

        // First try: Find span/label in same cell
        const span = cell.querySelector('span, label')
        if (span) {
            const text = span.textContent?.trim()
            if (text && text.length > 0 && text.length < 100) {
                return text
            }
        }

        // Second try: Find in previous td (common in 2-column table layouts)
        const previousCell = cell.previousElementSibling as HTMLElement
        if (previousCell && (previousCell.tagName === 'TD' || previousCell.tagName === 'TH')) {
            const prevSpan = previousCell.querySelector('span, label')
            if (prevSpan) {
                const text = prevSpan.textContent?.trim()
                if (text && text.length > 0 && text.length < 100) {
                    return text
                }
            }
            // Fallback to cell text if no span found
            const cellText = previousCell.textContent?.trim()
            if (cellText && cellText.length > 0 && cellText.length < 100) {
                return cellText
            }
        }

        // Third try: Fallback to cell text (clean up field value)
        const text = cell.textContent?.trim()
        if (text && text.length > 0) {
            const fieldText = fieldElement.textContent?.trim() || ''
            const label = text.replace(fieldText, '').trim()
            if (label.length > 0 && label.length < 100) {
                return label
            }
        }

        return ''
    }

    /**
     * Find label from nearest text node
     *
     * @param fieldElement - Field element
     * @returns Label text or empty string
     */
    private findNearestText(fieldElement: HTMLElement): string {
        const parent = fieldElement.parentElement
        if (!parent) return ''

        // Get all text nodes from parent
        const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null)

        let node = walker.nextNode()
        let nearestText = ''

        while (node) {
            const text = (node as Text).textContent?.trim()
            if (text && text.length > 0 && text.length < 100) {
                // Prefer shorter text nodes as they're more likely to be labels
                if (!nearestText || text.length < nearestText.length) {
                    nearestText = text
                }
            }
            node = walker.nextNode()
        }

        return nearestText
    }
}
