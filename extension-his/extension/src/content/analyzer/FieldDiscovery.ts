/**
 * FieldDiscovery
 * Responsible for discovering form field elements in the DOM
 */
export class FieldDiscovery {
    /**
     * Selector for form field elements
     */
    private readonly FIELD_SELECTORS = 'input, textarea, select'

    /**
     * Discover all form field elements within a root node
     *
     * @param root - Document or Element to search within
     * @returns Array of discovered field elements
     */
    public discoverFields(root: Document | Element): HTMLElement[] {
        const elements = root.querySelectorAll(this.FIELD_SELECTORS)
        return Array.from(elements)
            .filter((element): element is HTMLElement => element instanceof HTMLElement)
            .filter((element) => this.isValidField(element))
    }

    /**
     * Check if an element is a valid form field
     * Excludes hidden inputs and certain types
     * Note: FieldSyncBridge (page context) sẽ báo khi trang gán giá trị cho field ẩn
     *
     * @param element - Element to validate
     * @returns true if element is a valid form field
     */
    private isValidField(element: HTMLElement): boolean {
        // Check if element is hidden
        if (element.style.display === 'none' || element.style.visibility === 'hidden') {
            return false
        }

        // For input elements, check type
        if (element instanceof HTMLInputElement) {
            const type = element.type.toLowerCase()

            // Exclude button-like inputs and hidden inputs
            if (['button', 'submit', 'reset', 'hidden', 'image'].includes(type)) {
                return false
            }
        }

        // Check if element is in document (not detached)
        if (!document.contains(element)) {
            return false
        }

        return true
    }
}
