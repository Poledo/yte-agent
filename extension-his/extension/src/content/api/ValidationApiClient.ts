import { ApiConfiguration } from './ApiConfiguration'
import { ApiValidationRequest, ApiValidationResponse } from './ApiModels'
import { ApiException } from './ApiException'
import { buildLicenseHeaders } from '../../shared/license/LicenseSettings'

export class ValidationApiClient {
    private config: ApiConfiguration
    private abortControllers: Map<string, AbortController> = new Map()

    constructor(config?: ApiConfiguration) {
        this.config = config || new ApiConfiguration()
    }

    async validate(request: ApiValidationRequest, fieldId?: string): Promise<ApiValidationResponse> {
        const endpoint = this.config.getValidationEndpoint()
        const requestKey = fieldId || 'form'

        // Cancel any existing request for this field
        this.abortExistingRequest(requestKey)

        // Create new AbortController for this request
        const abortController = new AbortController()
        this.abortControllers.set(requestKey, abortController)

        try {
            console.log(`[ValidationApi] POST ${endpoint}`)
            console.log('[ValidationApi] Request:', JSON.stringify(request, null, 2))

            // Setup timeout
            const timeoutId = setTimeout(() => {
                abortController.abort()
            }, this.config.timeout)

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { ...this.config.headers, ...(await buildLicenseHeaders()) },
                body: JSON.stringify(request),
                signal: abortController.signal,
            })

            clearTimeout(timeoutId)

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response)
                throw new ApiException(
                    `HTTP ${response.status}: ${response.statusText}`,
                    `HTTP_${response.status}`,
                    response.status,
                    errorData,
                )
            }

            // Parse response
            const data: ApiValidationResponse = await response.json()

            console.log('[ValidationApi] Response:', JSON.stringify(data, null, 2))

            return data
        } catch (error) {
            clearTimeout(0) // Safe to clear timeout

            // Handle abort (timeout or explicit cancellation)
            if (error instanceof Error && error.name === 'AbortError') {
                const apiError = new ApiException('Request timeout - exceeded ' + this.config.timeout + 'ms', 'TIMEOUT')
                console.log('[ValidationApi] ERROR:', apiError.message)
                throw apiError
            }

            // Handle network errors
            if (error instanceof TypeError) {
                const apiError = new ApiException('Network error: ' + error.message, 'NETWORK_ERROR', undefined, error)
                console.log('[ValidationApi] ERROR:', apiError.message)
                throw apiError
            }

            // Handle ApiException
            if (error instanceof ApiException) {
                console.log('[ValidationApi] ERROR:', error.message)
                throw error
            }

            // Handle unknown errors
            const apiError = new ApiException(
                'Unknown error: ' + (error instanceof Error ? error.message : String(error)),
                'UNKNOWN_ERROR',
                undefined,
                error,
            )
            console.log('[ValidationApi] ERROR:', apiError.message)
            throw apiError
        } finally {
            // Clean up AbortController
            this.abortControllers.delete(requestKey)
        }
    }

    private abortExistingRequest(requestKey: string): void {
        const existingController = this.abortControllers.get(requestKey)
        if (existingController) {
            console.log(`[ValidationApi] Aborting existing request for ${requestKey}`)
            existingController.abort()
            this.abortControllers.delete(requestKey)
        }
    }

    private async parseErrorResponse(response: Response): Promise<any> {
        try {
            const data = await response.json()
            return data
        } catch {
            return {
                error: response.statusText,
            }
        }
    }

    setConfiguration(config: ApiConfiguration): void {
        this.config = config
    }

    getConfiguration(): ApiConfiguration {
        return this.config
    }
}
