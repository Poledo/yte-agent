export interface ApiTrigger {
    event: string
    field: string
}

export interface ApiContext {
    timestamp: string
    extensionVersion: string
    sessionId: string
    userId: string
}

export interface ApiValidationRequest {
    page: string
    trigger: ApiTrigger
    context: ApiContext
    form: Record<string, any>
}

export interface ApiIssue {
    code: string
    severity: 'Error' | 'Warning' | 'Info'
    field: string
    message: string
    suggestion: string
    canAutoFix: boolean
}

export interface ApiValidationResponse {
    isValid: boolean
    issues: ApiIssue[]
    summary: string
}
