import { ValidationContext } from '../validation/ValidationContext'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'

export interface PageMapping {
    name: string
    fields: string[]
}

export class ValidationRequestBuilder {
    private pageMapping: Map<string, PageMapping> = new Map()

    registerPageMapping(page: string, mapping: PageMapping): void {
        this.pageMapping.set(page, mapping)
    }

    buildRequest(
        context: ValidationContext,
        trigger: { event: string; field: string },
        sessionId: string,
        userId: string = 'unknown',
    ): Record<string, any> {
        const pageName = this.extractPageName(context.currentPage)

        // Get field mappings for this page
        const mapping = this.pageMapping.get(pageName)
        const fieldsToInclude = mapping?.fields || this.getAllFieldIds(context.fieldRegistry)

        // Build form object with only mapped fields
        const form: Record<string, any> = {}
        for (const fieldId of fieldsToInclude) {
            const field = context.fieldRegistry.get(fieldId)
            if (field) {
                form[fieldId] = field.value ?? null
            }
        }

        const request = {
            page: pageName,
            trigger: {
                event: trigger.event,
                field: trigger.field,
            },
            context: {
                timestamp: new Date().toISOString(),
                extensionVersion: '1.0.0',
                sessionId: sessionId,
                userId: userId,
            },
            form: form,
        }

        console.log('[ValidationRequestBuilder] Built request for page:', pageName)
        return request
    }

    private extractPageName(url: string): string {
        // Extract page name from URL or use default
        try {
            const urlObj = new URL(url)
            // Try to extract meaningful page name from pathname
            const path = urlObj.pathname
            const segments = path.split('/').filter((s) => s.length > 0)
            if (segments.length > 0) {
                // Return last segment as page name, or use 'Unknown'
                const name = segments[segments.length - 1]
                // Capitalize first letter
                return name.charAt(0).toUpperCase() + name.slice(1)
            }
        } catch {
            // Ignore URL parsing errors
        }
        return 'Diagnosis' // Default page
    }

    private getAllFieldIds(registry: FieldRegistry): string[] {
        return registry.getAll().map((f) => f.id)
    }
}
