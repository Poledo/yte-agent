export class ApiConfiguration {
  baseUrl: string
  timeout: number
  retryCount: number
  retryDelay: number
  headers: Record<string, string>

  constructor(
    // baseUrl: string = 'https://localhost:44350',
    baseUrl: string = 'https://cbyts.vnpt.vn',
    timeout: number = 5000,
    retryCount: number = 0,
    retryDelay: number = 1000,
  ) {
    this.baseUrl = baseUrl
    this.timeout = timeout
    this.retryCount = retryCount
    this.retryDelay = retryDelay
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  getValidationEndpoint(): string {
    return `${this.baseUrl}/api/validation`
  }
}
