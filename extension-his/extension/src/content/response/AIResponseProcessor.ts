import { ApiValidationResponse, ApiIssue } from '../api/ApiModels'
import { ValidationResult } from '../validation/ValidationResult'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { AIResponseMapper } from './AIResponseMapper'

export class AIResponseProcessor {
    process(
        response: ApiValidationResponse,
        localResults: ValidationResult[],
        fieldRegistry: FieldRegistry,
    ): ValidationResult[] {
        console.log('[AI] Processing response...')

        // Step 1: Map API issues to ValidationResult
        const aiResults: ValidationResult[] = []
        for (const issue of response.issues) {
            const result = AIResponseMapper.mapToValidationResult(
                issue as ApiIssue & { explain?: string },
                fieldRegistry,
            )
            if (result) {
                aiResults.push(result)
            }
        }

        console.log(`[AI] ${aiResults.length} issues found`)

        // Step 2: Merge local and AI results
        const mergedResults = this.mergeResults(localResults, aiResults)

        console.log(`[AI] Merged with local results`)

        console.log('[AI] Done')

        return mergedResults
    }

    private mergeResults(localResults: ValidationResult[], aiResults: ValidationResult[]): ValidationResult[] {
        const merged: ValidationResult[] = []
        const seen = new Set<string>()

        // Add all local results first - they cannot be overridden
        for (const local of localResults) {
            merged.push(local)
            seen.add(this.getResultKey(local))
        }

        // Add AI results, checking for duplicates
        for (const ai of aiResults) {
            const key = this.getResultKey(ai)

            if (seen.has(key)) {
                console.log(`[AI] Duplicate detected for: ${ai.field.id} - ${ai.message}`)
                continue
            }

            // Check if local has error for same field, don't add AI warning
            const localErrorForField = localResults.find((r) => r.field.id === ai.field.id && r.level === 'error')

            if (localErrorForField && ai.level !== 'error') {
                console.log(`[AI] Skipping ${ai.level} for ${ai.field.id} - local error already present`)
                continue
            }

            merged.push(ai)
            seen.add(key)
        }

        return merged
    }

    private getResultKey(result: ValidationResult): string {
        // Create unique key from field, message, and code
        return `${result.field.id}|${result.message}|${result.ruleId}`
    }
}
