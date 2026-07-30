import { Context } from 'koa'
import { statsService } from '../services/stats.service'
import { success } from '../utils/response'

export const statsController = {
  async getStats(ctx: Context) {
    const { period } = (ctx.request.query ?? {}) as { period?: number }
    const currentId = ctx.state.user?.id as string | undefined
    const data = await statsService.getStats(ctx.params.id, period, currentId)
    success(ctx, data)
  },
}
