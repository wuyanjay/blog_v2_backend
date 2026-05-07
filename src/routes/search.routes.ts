import Router from '@koa/router'
import { Errors } from '../errors'
import { Post } from '../models/Post'
import { User } from '../models/User'
import { success } from '../utils/response'

const router = new Router()

router.get('/', async (ctx) => {
  const { q, page = '1', limit = '20' } = ctx.query as Record<string, string>
  if (!q?.trim()) throw Errors.badRequest('搜索关键词不能为空')

  const currentPage = Math.max(1, Number(page))
  const pageSize = Math.min(50, Number(limit))
  const skip = (currentPage - 1) * pageSize

  const [posts, total] = await Promise.all([
    Post.find(
      { $text: { $search: q }, visibility: 'public' },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('author', 'username nickname avatar')
      .lean(),
    Post.countDocuments({ $text: { $search: q }, visibility: 'public' }),
  ])

  success(ctx, { posts, total, page: currentPage, limit: pageSize })
})

router.get('/users', async (ctx) => {
  const { q, limit = '20' } = ctx.query as Record<string, string>
  if (!q?.trim()) throw Errors.badRequest('关键词不能为空')

  const regex = new RegExp(q, 'i')
  const users = await User.find({
    $or: [{ username: regex }, { nickname: regex }],
  })
    .select('username nickname avatar bio followersCount postsCount')
    .limit(Math.min(50, Number(limit)))
    .lean()

  success(ctx, users)
})

export default router
