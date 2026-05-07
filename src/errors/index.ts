import { AppError } from './AppError'
import { ERROR_CODES } from './errorCodes'

export const Errors = {
  badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, ERROR_CODES.BAD_REQUEST, details)
  },

  unauthorized(message = '未授权', code: string = ERROR_CODES.UNAUTHORIZED) {
    return new AppError(message, 401, code)
  },

  forbidden(message = '禁止访问', code: string = ERROR_CODES.FORBIDDEN) {
    return new AppError(message, 403, code)
  },

  notFound(message = '资源不存在') {
    return new AppError(message, 404, ERROR_CODES.NOT_FOUND)
  },

  conflict(message: string, code: string, details?: unknown) {
    return new AppError(message, 409, code, details)
  },

  validation(message: string, details?: unknown) {
    return new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, details)
  },

  locked(message = '账户已锁定', code: string = ERROR_CODES.ACCOUNT_LOCKED) {
    return new AppError(message, 423, code)
  },

  tooManyRequests(message = '请求过于频繁，请稍后再试') {
    return new AppError(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED)
  },

  internal(message = '服务器内部错误', details?: unknown) {
    return new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR, details)
  },
}

export { AppError } from './AppError'
export { ERROR_CODES } from './errorCodes'
