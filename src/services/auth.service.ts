import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { redis } from '../config/redis'
import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { Session } from '../models/Session'
import { IUser, User } from '../models/User'
import { createRefreshToken, createVerifyToken, getSessionExpiryDate, getSessionTTLSeconds, hashToken } from '../utils/auth'
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../utils/email'
import { signAccessToken } from '../utils/jwt'
import { blacklistRefreshToken, cacheSession, deleteSessionCache } from '../utils/redis'

interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
}

interface RequestMeta {
  ip?: string
  userAgent?: string
}

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCK_MINUTES = 15

async function markFailedLogin(email: string, userId?: string) {
  const key = `login_attempt:${email}`
  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, LOGIN_LOCK_MINUTES * 60)
  }

  if (userId && attempts >= MAX_LOGIN_ATTEMPTS) {
    await User.findByIdAndUpdate(userId, {
      loginLockedUntil: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000),
    })
  }
}

async function clearFailedLogin(email: string, userId?: string) {
  await redis.del(`login_attempt:${email}`)
  if (userId) {
    await User.findByIdAndUpdate(userId, { loginLockedUntil: null })
  }
}

async function revokeSession(sessionId: string, reason: string) {
  await Session.findOneAndUpdate(
    { sessionId },
    { revokedAt: new Date(), revokeReason: reason }
  )
  await deleteSessionCache(sessionId)
}

async function revokeAllUserSessions(userId: string, reason: string) {
  const sessions = await Session.find({ user: userId, revokedAt: null })
  await Promise.all(sessions.map((session) => revokeSession(session.sessionId, reason)))
}

async function createSession(user: IUser, rememberMe: boolean, meta: RequestMeta) {
  const sessionId = crypto.randomUUID()
  const refreshToken = createRefreshToken()
  const expiresAt = getSessionExpiryDate(rememberMe)
  const ttl = getSessionTTLSeconds(expiresAt)

  await Session.create({
    user: user._id,
    sessionId,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: meta.userAgent ?? '',
    ip: meta.ip ?? '',
    rememberMe,
    expiresAt,
    lastSeenAt: new Date(),
  })

  await cacheSession(
    sessionId,
    {
      userId: String(user._id),
      email: user.email,
      roles: ['user'],
      expiresAt: expiresAt.toISOString(),
    },
    ttl
  )

  const accessToken = signAccessToken({
    userId: String(user._id),
    email: user.email,
    roles: ['user'],
    sessionId,
  })

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresAt,
    expiresInDays: rememberMe ? 14 : 7,
    user: user.toJSON(),
  }
}

export const authService = {
  async register(data: { username: string; email: string; password: string }) {
    const email = data.email.trim().toLowerCase()
    const username = data.username.trim()
    const exists = await User.findOne({ $or: [{ email }, { username }] })

    if (exists) {
      if (exists.email === email) {
        throw Errors.conflict('邮箱已被注册', ERROR_CODES.EMAIL_ALREADY_EXISTS)
      }
      throw Errors.conflict('用户名已被注册', ERROR_CODES.USERNAME_ALREADY_EXISTS)
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const verifyToken = createVerifyToken()

    const user = await User.create({
      username,
      email,
      passwordHash,
      nickname: username,
      emailVerified: false,
      emailVerifyTokenHash: hashToken(verifyToken),
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    await sendEmailVerificationEmail(user.email, verifyToken)
    return user.toJSON()
  },

  async verifyEmail(token: string) {
    const user = await User.findOne({
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpires: { $gt: new Date() },
    })

    if (!user) {
      throw Errors.badRequest('验证链接无效或已过期', ERROR_CODES.INVALID_TOKEN)
    }

    user.emailVerified = true
    user.emailVerifyTokenHash = null
    user.emailVerifyExpires = null
    await user.save()

    return user.toJSON()
  },

  async login(data: LoginInput, meta: RequestMeta) {
    const email = data.email.trim().toLowerCase()
    const user = await User.findOne({ email })
    if (!user) {
      await markFailedLogin(email)
      throw Errors.unauthorized('邮箱或密码错误', ERROR_CODES.INVALID_CREDENTIALS)
    }

    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      throw Errors.locked('账户已锁定，请稍后再试', ERROR_CODES.ACCOUNT_LOCKED)
    }

    if (!user.emailVerified) {
      throw Errors.forbidden('邮箱尚未验证', ERROR_CODES.EMAIL_NOT_VERIFIED)
    }

    const valid = await user.comparePassword(data.password)
    if (!valid) {
      await markFailedLogin(email, String(user._id))
      throw Errors.unauthorized('邮箱或密码错误', ERROR_CODES.INVALID_CREDENTIALS)
    }

    await clearFailedLogin(email, String(user._id))
    return createSession(user, !!data.rememberMe, meta)
  },

  async refresh(refreshToken: string) {
    const blacklisted = await redis.get(`blacklist:refresh:${refreshToken}`)
    if (blacklisted) {
      try {
        const info = JSON.parse(blacklisted) as { userId?: string }
        if (info.userId) {
          await revokeAllUserSessions(info.userId, 'refresh_token_reuse')
        }
      } catch {
        // Ignore malformed blacklist metadata.
      }
      throw Errors.unauthorized('刷新令牌被重用', ERROR_CODES.REFRESH_TOKEN_REUSED)
    }

    const session = await Session.findOne({ refreshTokenHash: hashToken(refreshToken) })
    if (!session || session.revokedAt) {
      throw Errors.unauthorized('刷新令牌无效', ERROR_CODES.REFRESH_TOKEN_INVALID)
    }

    if (session.expiresAt <= new Date()) {
      await revokeSession(session.sessionId, 'expired')
      throw Errors.unauthorized('会话已过期', ERROR_CODES.SESSION_EXPIRED)
    }

    const user = await User.findById(session.user)
    if (!user || !user.emailVerified) {
      throw Errors.forbidden('邮箱尚未验证', ERROR_CODES.EMAIL_NOT_VERIFIED)
    }

    const newRefreshToken = createRefreshToken()
    const ttl = getSessionTTLSeconds(session.expiresAt)

    await blacklistRefreshToken(
      refreshToken,
      ttl,
      JSON.stringify({ userId: String(user._id), sessionId: session.sessionId })
    )

    session.refreshTokenHash = hashToken(newRefreshToken)
    session.lastSeenAt = new Date()
    await session.save()

    await cacheSession(
      session.sessionId,
      {
        userId: String(user._id),
        email: user.email,
        roles: ['user'],
        expiresAt: session.expiresAt.toISOString(),
      },
      ttl
    )

    return {
      accessToken: signAccessToken({
        userId: String(user._id),
        email: user.email,
        roles: ['user'],
        sessionId: session.sessionId,
      }),
      refreshToken: newRefreshToken,
      expiresAt: session.expiresAt,
      expiresInDays: session.rememberMe ? 14 : 7,
      user: user.toJSON(),
    }
  },

  async logout(sessionId: string, refreshToken?: string) {
    const session = await Session.findOne({ sessionId })
    await revokeSession(sessionId, 'logout')

    if (refreshToken && session) {
      const ttl = getSessionTTLSeconds(session.expiresAt)
      await blacklistRefreshToken(
        refreshToken,
        ttl,
        JSON.stringify({ userId: String(session.user), sessionId })
      )
    }
  },

  async forgotPassword(emailInput: string) {
    const email = emailInput.trim().toLowerCase()
    const user = await User.findOne({ email })
    if (!user) return

    const token = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = hashToken(token)
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(email, token)
  },

  async resendVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase()
    const user = await User.findOne({ email })

    if (!user || user.emailVerified) {
      // 不暴露用户是否存在 / 是否已验证，与 forgot-password 策略一致
      return
    }

    // 生成新 token，重置 24 小时有效期
    const verifyToken = createVerifyToken()
    user.emailVerifyTokenHash = hashToken(verifyToken)
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()

    await sendEmailVerificationEmail(email, verifyToken)
  },

  async resetPassword(token: string, password: string) {
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      throw Errors.badRequest('Token 无效或已过期', ERROR_CODES.INVALID_TOKEN)
    }

    user.passwordHash = await bcrypt.hash(password, 12)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    await revokeAllUserSessions(String(user._id), 'password_reset')
  },
}
