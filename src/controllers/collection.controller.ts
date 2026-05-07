import { Context } from 'koa'
import { collectionService } from '../services/collection.service'
import { SUCCESS_CODES } from '../utils/successCodes'
import { success } from '../utils/response'

export const collectionController = {
  async list(ctx: Context) {
    const collections = await collectionService.list(String(ctx.state.user?.id))
    success(ctx, collections)
  },

  async add(ctx: Context) {
    await collectionService.add(ctx.params.postId, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.COLLECTION_ADDED, 201)
  },

  async remove(ctx: Context) {
    await collectionService.remove(ctx.params.postId, String(ctx.state.user?.id))
    success(ctx, null, SUCCESS_CODES.COLLECTION_REMOVED)
  },
}
