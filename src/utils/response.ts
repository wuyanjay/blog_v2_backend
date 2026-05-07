import { Context } from 'koa'
import { SUCCESS_CODES, SUCCESS_MESSAGES } from './successCodes'
import type { SuccessCode } from './successCodes'

export function success<T>(
  ctx: Context,
  data: T,
  code: SuccessCode = SUCCESS_CODES.OK,
  httpStatus = 200,
) {
  ctx.status = httpStatus
  ctx.body = { code, message: SUCCESS_MESSAGES[code], data }
}

export function paginated<T>(
  ctx: Context,
  data: T[],
  meta: { total?: number; page?: number; limit?: number; nextCursor?: string | null },
  code: SuccessCode = SUCCESS_CODES.OK,
) {
  ctx.status = 200
  ctx.body = { code, message: SUCCESS_MESSAGES[code], data, meta }
}
