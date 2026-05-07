import { Context } from 'koa'
import { notificationService } from '../services/notification.service'
import { SUCCESS_CODES } from '../utils/successCodes'
import { success } from '../utils/response'

export const notificationController = {
  async getList(ctx: Context) {
    const page = Number(ctx.query.page ?? 1)
    const limit = Number(ctx.query.limit ?? 20)
    const data = await notificationService.getList(String(ctx.state.user?.id), page, limit)
    success(ctx, data)
  },

  async markAllRead(ctx: Context) {
    await notificationService.markAllRead(String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.NOTIFICATIONS_READ_ALL)
  },

  async getUnreadCount(ctx: Context) {
    const count = await notificationService.getUnreadCount(String(ctx.state.user?.id))
    success(ctx, { count })
  },
}
