import { Context } from 'koa'
import { userService } from '../services/user.service'
import { SUCCESS_CODES } from '../utils/successCodes'
import { success, paginated } from '../utils/response'

export const userController = {
  async getMe(ctx: Context) {
    const user = await userService.getMe(String(ctx.state.user?.id))
    success(ctx, user)
  },

  async updateMe(ctx: Context) {
    const user = await userService.updateMe(String(ctx.state.user?.id), ctx.request.body as any)
    success(ctx, user, SUCCESS_CODES.PROFILE_UPDATED)
  },

  async getProfile(ctx: Context) {
    const profile = await userService.getProfile(
      ctx.params.id,
      ctx.state.user?.id ? String(ctx.state.user.id) : undefined
    )
    success(ctx, profile)
  },

  async follow(ctx: Context) {
    await userService.follow(ctx.params.id, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.FOLLOW_SUCCESS)
  },

  async unfollow(ctx: Context) {
    await userService.unfollow(ctx.params.id, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.UNFOLLOW_SUCCESS)
  },

  async getMyPosts(ctx: Context) {
    const userId = String(ctx.state.user!.id)

    const rawVisibility = ctx.query.visibility as string | undefined
    const visibility =
      rawVisibility === 'public' ? 'public' :
      rawVisibility === 'private' ? 'private' :
      undefined

    const page = ctx.query.page ? Number(ctx.query.page) : undefined
    const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined

    const result = await userService.getMyPosts(userId, { visibility, page, limit })

    paginated(ctx, result.posts, { total: result.total, page: result.page, limit: result.limit })
  },

  async getUserPosts(ctx: Context) {
    const targetUserId = ctx.params.id
    const viewerUserId = ctx.state.user?.id ? String(ctx.state.user.id) : undefined

    const cursor = ctx.query.cursor as string | undefined
    const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined

    const result = await userService.getUserPosts(targetUserId, { cursor, limit }, viewerUserId)

    paginated(ctx, result.posts, { nextCursor: result.nextCursor })
  },
}
