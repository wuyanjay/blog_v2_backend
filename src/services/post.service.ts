import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { Collection } from '../models/Collection'
import { Follow } from '../models/Follow'
import { Like } from '../models/Like'
import { Category } from '../models/Category'
import { Post } from '../models/Post'
import { User } from '../models/User'
import { sanitizeHtml } from '../utils/sanitize'
import { getTrendingPostIds, recordView, updateHotScore } from '../utils/redis'
import type { PostVisibility } from '../types'
import { notificationService } from './notification.service'

interface PostInput {
  title: string
  content_html: string
  content_json: string
  summary?: string
  cover?: string
  tags?: string[]
  category?: string | null
  visibility?: PostVisibility
}

interface PostQuery {
  cursor?: string
  limit?: string | number
  tag?: string
  sort?: 'latest' | 'hot'
}

function normalizePostInput(data: Partial<PostInput>) {
  const result: Partial<PostInput> = {}

  if (typeof data.title === 'string') result.title = data.title.trim()
  if (typeof data.content_html === 'string') result.content_html = sanitizeHtml(data.content_html)
  if (typeof data.content_json === 'string') result.content_json = data.content_json
  if (typeof data.summary === 'string') result.summary = data.summary.trim()
  if (typeof data.cover === 'string') result.cover = data.cover.trim()
  if (Array.isArray(data.tags)) {
    result.tags = [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))]
  }
  if (data.visibility) result.visibility = data.visibility
  if (data.category !== undefined) result.category = data.category || null

  return result
}

function defaultTitle() {
  const now = new Date()
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19)
  return `未命名博客_${timestamp}`
}

function publishedDelta(previous: PostVisibility, next: PostVisibility) {
  if (previous !== 'public' && next === 'public') return 1
  if (previous === 'public' && next !== 'public') return -1
  return 0
}

export const postService = {
  async create(authorId: string, data: Partial<PostInput>) {
    const input = { ...data }
    if (!input.title) {
      input.title = defaultTitle()
    }
    const normalized = normalizePostInput(input)
    const post = await Post.create({ ...normalized, author: authorId })

    if (post.visibility === 'public') {
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } })
      if (post.category) {
        await Category.findByIdAndUpdate(post.category, { $inc: { postCount: 1 } })
      }
    }

    await post.populate('author', 'username nickname avatar')
    await post.populate('category', 'name slug')
    return post
  },

  async getList(query: PostQuery, viewerId?: string) {
    const limit = Math.min(Number(query.limit ?? 20), 50)
    const filter: Record<string, unknown> = { visibility: 'public' }

    if (query.cursor) filter._id = { $lt: query.cursor }
    if (query.tag) filter.tags = query.tag

    const sort =
      query.sort === 'hot'
        ? { likeCount: -1, viewCount: -1, _id: -1 }
        : { createdAt: -1, _id: -1 }

    const posts = await Post.find(filter)
      .sort(sort as any)
      .limit(limit + 1)
      .populate('author', 'username nickname avatar')
      .lean()

    const hasMore = posts.length > limit
    const result = hasMore ? posts.slice(0, limit) : posts

    if (viewerId && result.length) {
      const likedIds = await Like.find({
        user: viewerId,
        targetType: 'post',
        target: { $in: result.map((post) => post._id) },
      }).distinct('target')
      const likedSet = new Set(likedIds.map(String))

      const collectionIds = await Collection.find({
        user: viewerId,
        post: { $in: result.map((post) => post._id) },
      }).distinct('post')
      const collectionSet = new Set(collectionIds.map(String))

      result.forEach((post: any) => {
        post.isLiked = likedSet.has(String(post._id))
        post.isCollected = collectionSet.has(String(post._id))
      })
    }

    return {
      posts: result,
      nextCursor: hasMore ? String(result[result.length - 1]._id) : null,
    }
  },

  async getDetail(id: string, viewerIp: string, viewerId?: string) {
    const post = await Post.findOne({ _id: id })
      .populate('author', 'username nickname avatar bio followersCount postsCount totalLikes')
      .populate('category', 'name slug')
      .lean()

    if (!post) throw Errors.notFound('文章不存在')

    // 确保旧文档（无 category 字段）也返回该字段
    if (!('category' in post)) {
      ;(post as any).category = null
    }

    const isAuthor = viewerId && String((post as any).author._id) === viewerId
    if (!isAuthor && (post as any).visibility !== 'public') {
      throw Errors.notFound('文章不存在')
    }

    if (await recordView(id, viewerIp)) {
      await updateHotScore(id, 1)
      ;(post as any).viewCount += 1
    }

    if (viewerId) {
      ;(post as any).isLiked = !!(await Like.exists({
        user: viewerId,
        target: id,
        targetType: 'post',
      }))
      ;(post as any).isCollected = !!(await Collection.exists({
        user: viewerId,
        post: id,
      }))
      ;(post as any).isFollowing = !!(await Follow.exists({
        follower: viewerId,
        following: (post as any).author._id,
      }))
    }

    return post
  },

  async update(id: string, authorId: string, data: Partial<PostInput>) {
    const post = await Post.findOne({ _id: id, author: authorId })
    if (!post) throw Errors.notFound('文章不存在或无权操作')

    const previousVisibility = post.visibility
    const previousCategory = post.category
    Object.assign(post, normalizePostInput(data))
    await post.save()

    const delta = publishedDelta(previousVisibility, post.visibility)
    if (delta !== 0) {
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: delta } })
    }

    if (post.visibility === 'public') {
      if (previousVisibility !== 'public' && post.category) {
        await Category.findByIdAndUpdate(post.category, { $inc: { postCount: 1 } })
      } else if (previousVisibility === 'public' && String(post.category ?? '') !== String(previousCategory ?? '')) {
        if (previousCategory) await Category.findByIdAndUpdate(previousCategory, { $inc: { postCount: -1 } })
        if (post.category) await Category.findByIdAndUpdate(post.category, { $inc: { postCount: 1 } })
      }
    } else if (previousVisibility === 'public' && previousCategory) {
      await Category.findByIdAndUpdate(previousCategory, { $inc: { postCount: -1 } })
    }

    await post.populate('author', 'username nickname avatar')
    await post.populate('category', 'name slug')
    return post
  },

  async remove(id: string, authorId: string) {
    const post = await Post.findOneAndDelete({ _id: id, author: authorId })
    if (!post) throw Errors.notFound('文章不存在或无权操作')

    if (post.visibility === 'public') {
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: -1 } })
      if (post.category) {
        await Category.findByIdAndUpdate(post.category, { $inc: { postCount: -1 } })
      }
    }

    await Promise.all([
      Like.deleteMany({ target: id, targetType: 'post' }),
      Collection.deleteMany({ post: id }),
    ])
  },

  async like(postId: string, userId: string) {
    const post = await Post.findById(postId)
    if (!post) throw Errors.notFound('文章不存在')

    const exists = await Like.exists({ user: userId, target: postId, targetType: 'post' })
    if (exists) throw Errors.conflict('已经点赞过了', ERROR_CODES.ALREADY_LIKED)

    await Promise.all([
      Like.create({ user: userId, target: postId, targetType: 'post' }),
      Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } }),
      User.findByIdAndUpdate(post.author, { $inc: { totalLikes: 1 } }),
      updateHotScore(postId, 3),
    ])

    if (String(post.author) !== userId) {
      await notificationService.create({
        receiver: String(post.author),
        sender: userId,
        type: 'like',
        target: postId,
        targetType: 'post',
      })
    }
  },

  async unlike(postId: string, userId: string) {
    const like = await Like.findOneAndDelete({ user: userId, target: postId, targetType: 'post' })
    if (!like) throw Errors.badRequest('尚未点赞')

    const post = await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } })
    if (post) {
      await User.findByIdAndUpdate(post.author, { $inc: { totalLikes: -1 } })
    }
  },

  async getFeed(userId: string, cursor?: string) {
    const followingIds = await Follow.find({ follower: userId }).distinct('following')
    const filter: Record<string, unknown> = {
      author: { $in: followingIds },
      visibility: 'public',
    }

    if (cursor) filter._id = { $lt: cursor }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(21)
      .populate('author', 'username nickname avatar')
      .lean()

    const hasMore = posts.length > 20
    return {
      posts: hasMore ? posts.slice(0, 20) : posts,
      nextCursor: hasMore ? String(posts[19]._id) : null,
    }
  },

  async getTrending(viewerId?: string) {
    const ids = await getTrendingPostIds(10)
    if (!ids.length) return []

    const posts = await Post.find({ _id: { $in: ids }, visibility: 'public' })
      .sort({ score: -1, _id: -1 })
      .populate('author', 'username nickname avatar')
      .lean()

    if (viewerId) {
      const likedIds = await Like.find({
        user: viewerId,
        targetType: 'post',
        target: { $in: posts.map((p) => p._id) },
      }).distinct('target')
      const likedSet = new Set(likedIds.map(String))

      const collectionIds = await Collection.find({
        user: viewerId,
        post: { $in: posts.map((p) => p._id) },
      }).distinct('post')
      const collectionSet = new Set(collectionIds.map(String))

      ;(posts as any[]).forEach((post) => {
        post.isLiked = likedSet.has(String(post._id))
        post.isCollected = collectionSet.has(String(post._id))
      })
    }

    const postMap = new Map(posts.map((post) => [String(post._id), post]))
    return ids.map((id) => postMap.get(id)).filter(Boolean)
  },
}
