import { Context } from 'koa'
import { postService } from '../services/post.service'
import { SUCCESS_CODES } from '../utils/successCodes'
import { paginated, success } from '../utils/response'

export const postController = {
  async create(ctx: Context) {
    const post = await postService.create(String(ctx.state.user?.id), ctx.request.body as any)
    success(ctx, post, SUCCESS_CODES.POST_CREATED, 201)
  },

  async getList(ctx: Context) {
    const result = await postService.getList(ctx.query as any, ctx.state.user?.id)
    paginated(ctx, result.posts, { nextCursor: result.nextCursor })
  },

  async getDetail(ctx: Context) {
    const post = await postService.getDetail(ctx.params.id, ctx.ip, ctx.state.user?.id)
    success(ctx, post)
  },

  async update(ctx: Context) {
    const post = await postService.update(
      ctx.params.id,
      String(ctx.state.user?.id),
      ctx.request.body as any
    )
    success(ctx, post, SUCCESS_CODES.POST_UPDATED)
  },

  async remove(ctx: Context) {
    await postService.remove(ctx.params.id, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.POST_DELETED)
  },

  async like(ctx: Context) {
    await postService.like(ctx.params.id, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.LIKE_SUCCESS)
  },

  async unlike(ctx: Context) {
    await postService.unlike(ctx.params.id, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.UNLIKE_SUCCESS)
  },

  async getFeed(ctx: Context) {
    const result = await postService.getFeed(String(ctx.state.user?.id), ctx.query.cursor as string)
    paginated(ctx, result.posts, { nextCursor: result.nextCursor })
  },

  async getTrending(ctx: Context) {
    const posts = await postService.getTrending(ctx.state.user?.id)
    success(ctx, posts)
  },
}
