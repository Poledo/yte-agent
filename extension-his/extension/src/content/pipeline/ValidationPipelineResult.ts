import { ValidationResult } from '../validation/ValidationResult'
import { ValidationDecision } from './ValidationDecision'

export interface ValidationPipelineResult {
    decision: ValidationDecision
    localPassed: boolean
    localResults: ValidationResult[]
    remoteCalled: boolean
    remoteResult: any
    requestBody?: Record<string, any>
    /**
     * Thông báo lỗi khi KHÔNG gọi được Backend API (mất kết nối, timeout).
     * null = gọi thành công hoặc chưa cần gọi. UI phải hiển thị cho người dùng
     * biết kết quả chỉ gồm kiểm tra cục bộ.
     */
    remoteError?: string | null
}
