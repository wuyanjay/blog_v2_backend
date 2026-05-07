import { Context } from 'koa'
import { categoryService } from '../services/category/categoryService'
import { success, paginated } from '../utils/response'
import { SUCCESS_CODES } from '../utils/successCodes'

export const categoryController = {

  async getTree(ctx: Context) {
    const tree = await categoryService.getCategoryTree()
    success(ctx, tree)
  },

  async getList(ctx: Context) {
    const list = await categoryService.getCategoryList()
    success(ctx, list)
  },

  async getBySlug(ctx: Context) {
    const category = await categoryService.getCategoryBySlug(ctx.params.slug)
    success(ctx, category)
  },

  async getCategoryPosts(ctx: Context) {
    const { id } = ctx.params
    const cursor = ctx.query.cursor as string | undefined
    const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined
    const includeChildren = ctx.query.includeChildren === 'true'

    const result = await categoryService.getCategoryPosts(id, {
      cursor,
      limit,
      includeChildren,
    })

    paginated(ctx, result.posts, { nextCursor: result.nextCursor })
  },

  async create(ctx: Context) {
    const category = await categoryService.createCategory(ctx.request.body as any)
    success(ctx, category, SUCCESS_CODES.CREATED, 201)
  },

  async update(ctx: Context) {
    const category = await categoryService.updateCategory(ctx.params.id, ctx.request.body as any)
    success(ctx, category)
  },

  async remove(ctx: Context) {
    await categoryService.deleteCategory(ctx.params.id)
    success(ctx, null)
  },

  async recalculate(ctx: Context) {
    await categoryService.recalculatePostCounts()
    success(ctx, null)
  },
}
