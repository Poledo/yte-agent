import { ValidationContext } from './ValidationContext'
import { ValidationResult } from './ValidationResult'

export interface Rule {
    id: string
    name: string
    priority: number
    validate(context: ValidationContext): ValidationResult[]
}
