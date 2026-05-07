import { Context, Next } from 'koa'
import { verifyAccessToken } from '../utils/jwt'
import { getSessionCache } from '../utils/redis'
import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'

export async function authenticate(ctx: Context, next: Next) {
  const authHeader = ctx.get('authorization')
  if (!authHeader) throw Errors.unauthorized('缺少访问令牌', ERROR_CODES.NO_ACCESS_TOKEN)
  if (!authHeader.startsWith('Bearer '))
    throw Errors.unauthorized('访问令牌格式无效', ERROR_CODES.INVALID_ACCESS_TOKEN)

  const token = authHeader.slice(7).trim()

  try {
    const payload = verifyAccessToken(token)
    const session = await getSessionCache(payload.sessionId)
    if (!session) throw Errors.unauthorized('会话已过期', ERROR_CODES.SESSION_EXPIRED)

    ctx.state.user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles,
      sessionId: payload.sessionId,
    }
    ctx.state.token = token
  } catch (error: any) {
    if (error?.isOperational) throw error
    if (error?.name === 'TokenExpiredError')
      throw Errors.unauthorized('访问令牌已过期', ERROR_CODES.ACCESS_TOKEN_EXPIRED)
    throw Errors.unauthorized('访问令牌无效', ERROR_CODES.INVALID_ACCESS_TOKEN)
  }

  await next()
}

export async function optionalAuth(ctx: Context, next: Next) {
  const authHeader = ctx.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7).trim()
      const payload = verifyAccessToken(token)
      const session = await getSessionCache(payload.sessionId)
      if (session) {
        ctx.state.user = {
          id: payload.userId,
          email: payload.email,
          roles: payload.roles,
          sessionId: payload.sessionId,
        }
        ctx.state.token = token
      }
    } catch {
      // Keep public routes resilient to expired or malformed tokens.
    }
  }

  await next()
}
