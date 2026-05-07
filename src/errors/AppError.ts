export class AppError extends Error {
  public status: number
  public code: string
  public details?: unknown
  public isOperational: boolean

  constructor(
    message: string,
    status = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
    this.isOperational = true

    Error.captureStackTrace?.(this, this.constructor)
  }
}
