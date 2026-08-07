import { ValidationEngine } from '../validation/ValidationEngine'
import { ValidationContext } from '../validation/ValidationContext'
import { ValidationApiClient } from './ValidationApiClient'
import { ValidationRequestBuilder } from './ValidationRequestBuilder'
import { ValidationDecision } from './ValidationDecision'
import { ValidationPipelineResult } from './ValidationPipelineResult'
import { ApiConfiguration } from '../api/ApiConfiguration'
import { ApiValidationRequest, ApiValidationResponse } from '../api/ApiModels'
import { AIResponseProcessor } from '../response/AIResponseProcessor'

export class ValidationPipeline {
    private engine: ValidationEngine
    private apiClient: ValidationApiClient
    private requestBuilder: ValidationRequestBuilder
    private responseProcessor: AIResponseProcessor
    private sessionId: string
    private userId: string

    constructor(engine: ValidationEngine, sessionId?: string, userId?: string, apiConfig?: ApiConfiguration) {
        this.engine = engine
        this.apiClient = new ValidationApiClient(apiConfig)
        this.requestBuilder = new ValidationRequestBuilder()
        this.responseProcessor = new AIResponseProcessor()
        this.sessionId = sessionId || this.generateSessionId()
        this.userId = userId || 'unknown'
    }

    async validateField(context: ValidationContext): Promise<ValidationPipelineResult> {
        console.log(`[Pipeline] Starting validation for field: ${context.currentField.id}`)

        // Step 1: Local Validation
        console.log('[Pipeline] Running local validation...')
        const localResults = this.engine.validateField(context)

        // Check if any local errors (level: 'error')
        const hasLocalErrors = localResults.some((r) => r.level === 'error')

        if (hasLocalErrors) {
            console.log('[Pipeline] Local validation FAILED - stopping pipeline')
            return {
                decision: ValidationDecision.LOCAL_FAILED,
                localPassed: false,
                localResults: localResults,
                remoteCalled: false,
                remoteResult: null,
                requestBody: undefined,
            }
        }

        console.log('[Pipeline] Local validation PASSED - continuing to remote validation')

        // Step 2: Build Request
        console.log('[Pipeline] Building validation request...')
        const trigger = {
            event: 'change',
            field: context.currentField.id,
        }
        const requestBody = this.requestBuilder.buildRequest(
            context,
            trigger,
            this.sessionId,
            this.userId,
        ) as ApiValidationRequest

        // Step 3: Call Validation API
        console.log('[Pipeline] Calling Validation API...')
        const { result: remoteResult, error: remoteError } = await this.callValidationApi(
            requestBody,
            context.currentField.id,
        )

        // Step 4: Process AI Response
        let finalResults = localResults
        if (remoteResult && remoteResult.isValid !== undefined) {
            const apiResponse = remoteResult as ApiValidationResponse
            finalResults = this.responseProcessor.process(apiResponse, localResults, context.fieldRegistry)
            console.log(`[Pipeline] Processed AI response - ${finalResults.length} total results`)
        }

        return {
            decision: ValidationDecision.REMOTE_REQUIRED,
            localPassed: true,
            localResults: finalResults,
            remoteCalled: true,
            remoteResult: remoteResult,
            requestBody: requestBody,
            remoteError: remoteError,
        }
    }

    async validateForm(context: ValidationContext): Promise<ValidationPipelineResult> {
        console.log('[Pipeline] Starting form validation')

        // Step 1: Local Validation
        console.log('[Pipeline] Running local validation for entire form...')
        const localResults = this.engine.validateForm(context)

        // Check if any local errors (level: 'error')
        const hasLocalErrors = localResults.some((r) => r.level === 'error')

        if (hasLocalErrors) {
            console.log('[Pipeline] Local validation FAILED - stopping pipeline')
            return {
                decision: ValidationDecision.LOCAL_FAILED,
                localPassed: false,
                localResults: localResults,
                remoteCalled: false,
                remoteResult: null,
                requestBody: undefined,
            }
        }

        console.log('[Pipeline] Local validation PASSED - continuing to remote validation')

        // Step 2: Build Request
        console.log('[Pipeline] Building validation request...')
        const trigger = {
            event: 'FormSubmit',
            field: 'form',
        }
        const requestBody = this.requestBuilder.buildRequest(
            context,
            trigger,
            this.sessionId,
            this.userId,
        ) as ApiValidationRequest

        // Step 3: Call Validation API
        console.log('[Pipeline] Calling Validation API...')
        const { result: remoteResult, error: remoteError } = await this.callValidationApi(requestBody, 'form')

        // Step 4: Process AI Response
        let finalResults = localResults
        if (remoteResult && remoteResult.isValid !== undefined) {
            const apiResponse = remoteResult as ApiValidationResponse
            finalResults = this.responseProcessor.process(apiResponse, localResults, context.fieldRegistry)
            console.log(`[Pipeline] Processed AI response - ${finalResults.length} total results`)
        }

        return {
            decision: ValidationDecision.REMOTE_REQUIRED,
            localPassed: true,
            localResults: finalResults,
            remoteCalled: true,
            remoteResult: remoteResult,
            requestBody: requestBody,
            remoteError: remoteError,
        }
    }

    /**
     * Gọi Validation API. Lỗi kết nối KHÔNG được nuốt im lặng nữa:
     * trả về error message để UI báo người dùng biết kết quả chỉ gồm kiểm tra cục bộ.
     */
    private async callValidationApi(
        request: ApiValidationRequest,
        fieldId: string,
    ): Promise<{ result: any; error: string | null }> {
        try {
            const result = await this.apiClient.validate(request, fieldId)
            return { result, error: null }
        } catch (error) {
            console.error('[Pipeline] API call failed:', error)
            const detail = error instanceof Error ? error.message : String(error)
            return {
                result: null,
                error: `Không kết nối được máy chủ kiểm tra (${detail}). Kết quả hiển thị chỉ gồm kiểm tra cục bộ — các kiểm tra ICD, danh mục, BHYT chưa được thực hiện.`,
            }
        }
    }

    registerPageMapping(page: string, fields: string[]): void {
        this.requestBuilder.registerPageMapping(page, { name: page, fields: fields })
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    setApiConfiguration(config: ApiConfiguration): void {
        this.apiClient.setConfiguration(config)
    }

    getApiConfiguration(): ApiConfiguration {
        return this.apiClient.getConfiguration()
    }
}
