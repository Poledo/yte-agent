export interface ApiErrorDetails {
    code: string
    message: string
    statusCode?: number
    details?: any
}

export class ApiException extends Error {
    code: string
    statusCode?: number
    details?: any

    constructor(message: string, code: string = 'API_ERROR', statusCode?: number, details?: any) {
        super(message)
        this.name = 'ApiException'
        this.code = code
        this.statusCode = statusCode
        this.details = details

        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, ApiException.prototype)
    }

    isTimeout(): boolean {
        return this.code === 'TIMEOUT'
    }

    isNetworkError(): boolean {
        return this.code === 'NETWORK_ERROR'
    }

    isHttpError(): boolean {
        return this.code.startsWith('HTTP_')
    }

    toErrorDetails(): ApiErrorDetails {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        }
    }
}
