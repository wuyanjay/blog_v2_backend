import { Context, Next } from 'koa'
import { redis } from '../config/redis'
import { Errors } from '../errors'

interface RateLimitOptions {
  windowMs: number
  max: number
  keyPrefix?: string
}

export function rateLimit(options: RateLimitOptions) {
  return async (ctx: Context, next: Next) => {
    const key = `rl:${options.keyPrefix ?? ctx.path}:${ctx.ip}`
    const ttl = Math.ceil(options.windowMs / 1000)
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, ttl)
    }

    ctx.set('X-RateLimit-Limit', String(options.max))
    ctx.set('X-RateLimit-Remaining', String(Math.max(0, options.max - current)))

    if (current > options.max) {
      throw Errors.tooManyRequests()
    }

    await next()
  }
}
