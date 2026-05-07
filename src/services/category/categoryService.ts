import { Types } from 'mongoose'
import { Category, type ICategory } from '../../models/Category'
import { Post } from '../../models/Post'
import { Errors } from '../../errors'
import { ERROR_CODES } from '../../errors/errorCodes'

export const categoryService = {

  // ── Query ────────────────────────────────────────────────────────

  async getCategoryTree(): Promise<ICategory[]> {
    const all = await Category.find()
      .sort({ order: 1, name: 1 })
      .lean()

    const map = new Map<string, ICategory & { children: ICategory[] }>()
    all.forEach((cat) => {
      map.set(String(cat._id), { ...cat, children: [] })
    })

    const roots: (ICategory & { children: ICategory[] })[] = []
    all.forEach((cat) => {
      const node = map.get(String(cat._id))!
      if (!cat.parent) {
        roots.push(node)
      } else {
        const parent = map.get(String(cat.parent))
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      }
    })

    return roots as unknown as ICategory[]
  },

  async getCategoryList(): Promise<ICategory[]> {
    return Category.find()
      .sort({ order: 1, name: 1 })
      .lean()
  },

  async getCategoryBySlug(slug: string): Promise<ICategory> {
    const category = await Category.findOne({ slug }).lean()
    if (!category) throw Errors.notFound('分类不存在')
    return category
  },

  async getCategoryPosts(
    categoryId: string,
    query: { cursor?: string; limit?: number; includeChildren?: boolean }
  ) {
    const { cursor, includeChildren = false } = query
    const limit = Math.min(query.limit ?? 20, 50)

    const category = await Category.findById(categoryId).lean()
    if (!category) throw Errors.notFound('分类不存在')

    let categoryIds: Types.ObjectId[] = [new Types.ObjectId(categoryId)]
    if (includeChildren) {
      const children = await Category.find({ parent: categoryId }).select('_id').lean()
      categoryIds = categoryIds.concat(children.map((c) => c._id as Types.ObjectId))
    }

    const filter: Record<string, unknown> = {
      category:   { $in: categoryIds },
      visibility: 'public',
    }

    if (cursor) {
      filter._id = { $lt: new Types.ObjectId(cursor) }
    }

    const posts = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username nickname avatar')
      .populate('category', 'name slug')
      .select('title slug summary cover tags category viewCount likeCount commentCount readTime createdAt updatedAt')
      .lean()

    const hasMore = posts.length > limit
    const result  = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? String(result[result.length - 1]._id) : null

    return { category, posts: result, nextCursor }
  },

  // ── Admin ────────────────────────────────────────────────────────

  async createCategory(data: {
    name: string
    slug?: string
    description?: string
    parent?: string | null
    order?: number
  }): Promise<ICategory> {
    if (data.parent) {
      const parentExists = await Category.exists({ _id: data.parent })
      if (!parentExists) throw Errors.notFound('父分类不存在')
    }

    const duplicate = await Category.exists({
      name:   data.name,
      parent: data.parent ?? null,
    })
    if (duplicate) {
      throw Errors.conflict('同级分类下已存在同名分类', ERROR_CODES.CONFLICT)
    }

    const category = await Category.create({
      name:        data.name,
      description: data.description ?? '',
      parent:      data.parent ?? null,
      order:       data.order ?? 0,
      ...(data.slug ? { slug: data.slug } : {}),
    })

    return category
  },

  async updateCategory(
    id: string,
    data: {
      name?: string
      description?: string
      parent?: string | null
      order?: number
    }
  ): Promise<ICategory> {
    const category = await Category.findById(id)
    if (!category) throw Errors.notFound('分类不存在')

    if (data.parent !== undefined && data.parent !== null) {
      if (data.parent === id) throw Errors.badRequest('不能将分类的父分类设为自身')
      const parentExists = await Category.exists({ _id: data.parent })
      if (!parentExists) throw Errors.notFound('父分类不存在')
    }

    Object.assign(category, data)
    await category.save()
    return category
  },

  async deleteCategory(id: string): Promise<void> {
    const category = await Category.findById(id)
    if (!category) throw Errors.notFound('分类不存在')

    const hasChildren = await Category.exists({ parent: id })
    if (hasChildren) {
      throw Errors.conflict('请先删除或移动该分类下的子分类', ERROR_CODES.CONFLICT)
    }

    await Post.updateMany({ category: id }, { $set: { category: null } })
    await Category.findByIdAndDelete(id)
  },

  async recalculatePostCounts(): Promise<void> {
    const counts = await Post.aggregate([
      { $match: { visibility: 'public', category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])

    const countMap = new Map<string, number>()
    counts.forEach((c) => countMap.set(String(c._id), c.count))

    const allCategories = await Category.find().select('_id')
    const updates = allCategories.map((cat) =>
      Category.updateOne(
        { _id: cat._id },
        { postCount: countMap.get(String(cat._id)) ?? 0 }
      )
    )
    await Promise.all(updates)
  },
}
