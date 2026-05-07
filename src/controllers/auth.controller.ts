import { Context } from 'koa'
import { env } from '../config'
import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { authService } from '../services/auth.service'
import { success } from '../utils/response'
import { SUCCESS_CODES } from '../utils/successCodes'

function setRefreshCookie(ctx: Context, refreshToken: string, expiresAt: Date) {
  ctx.cookies.set(env.refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    overwrite: true,
    expires: expiresAt,
    path: '/',
  })
}

function clearRefreshCookie(ctx: Context) {
  ctx.cookies.set(env.refreshCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    overwrite: true,
    expires: new Date(0),
    path: '/',
  })
}

export const authController = {
  async register(ctx: Context) {
    const user = await authService.register(ctx.request.body as any)
    success(ctx, { user }, SUCCESS_CODES.REGISTER_SUCCESS, 201)
  },

  async verifyEmail(ctx: Context) {
    const user = await authService.verifyEmail(String(ctx.query.token))
    success(ctx, { user }, SUCCESS_CODES.EMAIL_VERIFIED)
  },

  async login(ctx: Context) {
    const result = await authService.login(ctx.request.body as any, {
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
    })
    setRefreshCookie(ctx, result.refreshToken, result.expiresAt)
    success(
      ctx,
      {
        accessToken: result.accessToken,
        user: result.user,
        expiresInDays: result.expiresInDays,
      },
      SUCCESS_CODES.LOGIN_SUCCESS
    )
  },

  async refresh(ctx: Context) {
    const refreshToken = ctx.cookies.get(env.refreshCookieName)
    if (!refreshToken) throw Errors.unauthorized('刷新令牌无效', ERROR_CODES.REFRESH_TOKEN_INVALID)

    const result = await authService.refresh(refreshToken)
    setRefreshCookie(ctx, result.refreshToken, result.expiresAt)
    success(
      ctx,
      {
        accessToken: result.accessToken,
        user: result.user,
        expiresInDays: result.expiresInDays,
      },
      SUCCESS_CODES.TOKEN_REFRESHED
    )
  },

  async logout(ctx: Context) {
    const refreshToken = ctx.cookies.get(env.refreshCookieName)
    const sessionId = ctx.state.user?.sessionId
    if (!sessionId) throw Errors.unauthorized('会话已过期', ERROR_CODES.SESSION_EXPIRED)

    await authService.logout(sessionId, refreshToken)
    clearRefreshCookie(ctx)
    success(ctx, null, SUCCESS_CODES.LOGOUT_SUCCESS)
  },

  async forgotPassword(ctx: Context) {
    await authService.forgotPassword(String((ctx.request.body as any).email))
    success(ctx, null, SUCCESS_CODES.PASSWORD_RESET_EMAIL_SENT)
  },

  async resendVerification(ctx: Context) {
    await authService.resendVerification(String((ctx.request.body as any).email))
    success(ctx, null, SUCCESS_CODES.VERIFICATION_EMAIL_RESENT)
  },

  async resetPassword(ctx: Context) {
    const body = ctx.request.body as any
    await authService.resetPassword(body.token, body.password)
    success(ctx, null, SUCCESS_CODES.PASSWORD_RESET_SUCCESS)
  },
}
