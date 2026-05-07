import { Context, Next } from 'koa'
import { AppError } from '../errors/AppError'
import { logger } from '../utils/logger'

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next()
  } catch (err: any) {
    const isAppError = err instanceof AppError || err?.isOperational === true

    const status = err.status ?? err.statusCode ?? 500
    const code = isAppError ? err.code : (err.code ?? 'INTERNAL_ERROR')
    const message = err.message ?? '服务器内部错误'

    ctx.status = status
    ctx.body = {
      code,
      message,
      data: null,
    }

    if (!isAppError || status >= 500) {
      logger.error({
        message,
        code,
        status,
        stack: err.stack,
        path: ctx.path,
        method: ctx.method,
      })
    }

    ctx.app.emit('error', err, ctx)
  }
}
