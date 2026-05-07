import { Context } from 'koa'
import { User } from '../models/User'
import { statsService } from '../services/stats.service'
import { success } from '../utils/response'
import { Errors } from '../errors'

export const statsController = {
  async getStats(ctx: Context) {
    const { period } = (ctx.request.query ?? {}) as { period?: number }
    const periodDays = period ?? await getDaysSinceRegistration(ctx.params.id)
    const data = await statsService.getStats(ctx.params.id, periodDays)
    success(ctx, data)
  },
}

async function getDaysSinceRegistration(userId: string): Promise<number> {
  const user = await User.findById(userId).select('createdAt')
  if (!user) throw Errors.notFound('用户不存在')
  const ms = Date.now() - user.createdAt.getTime()
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
