import { Context } from 'koa'
import { commentService } from '../services/comment.service'
import { SUCCESS_CODES } from '../utils/successCodes'
import { success } from '../utils/response'

export const commentController = {
  async getList(ctx: Context) {
    const comments = await commentService.getList(
      ctx.params.postId,
      ctx.state.user?.id ? String(ctx.state.user.id) : undefined
    )
    success(ctx, comments)
  },

  async create(ctx: Context) {
    const comment = await commentService.create(
      ctx.params.postId,
      String(ctx.state.user?.id),
      ctx.request.body as any
    )
    success(ctx, comment, SUCCESS_CODES.COMMENT_CREATED, 201)
  },

  async remove(ctx: Context) {
    await commentService.remove(ctx.params.commentId, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.COMMENT_DELETED)
  },

  async like(ctx: Context) {
    await commentService.like(ctx.params.commentId, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.LIKE_SUCCESS)
  },

  async unlike(ctx: Context) {
    await commentService.unlike(ctx.params.commentId, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.UNLIKE_SUCCESS)
  },
}
