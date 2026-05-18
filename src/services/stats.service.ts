import { Types } from 'mongoose'
import { Follow } from '../models/Follow'
import { Post } from '../models/Post'
import { ViewLog } from '../models/ViewLog'
import { User } from '../models/User'
import { Errors } from '../errors'
import { logger } from '../utils/logger'

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function isOwner(currentUserId: string | undefined, targetUserId: string): boolean {
  return currentUserId !== undefined && currentUserId === targetUserId
}

export const statsService = {
  async getStats(userId: string, periodDays: number, currentUserId?: string) {
    try {
      const user = await User.findById(userId).select('followersCount')
      if (!user) throw Errors.notFound('用户不存在')

      const authorId = new Types.ObjectId(userId)
      const owner = isOwner(currentUserId, userId)

      const now = new Date()
      const periodMs = periodDays * 24 * 60 * 60 * 1000
      const currentStart = new Date(now.getTime() - periodMs)
      const previousStart = new Date(now.getTime() - 2 * periodMs)

      const userPostIds = await Post
        .find({ author: authorId })
        .select('_id')
        .lean()
        .then((posts) => posts.map((p) => p._id))

      const visibilityFilter = owner ? {} : { visibility: 'public' as const }

      const [
        totalPosts,
        totalViews,
        currentPosts,
        previousPosts,
        currentViews,
        previousViews,
        currentFollowers,
        previousFollowers,
        recentCreated,
        recentViewedIds,
      ] = await Promise.all([
        Post.countDocuments({ author: authorId, ...visibilityFilter }),

        Post.aggregate([
          { $match: { author: authorId, ...visibilityFilter } },
          { $group: { _id: null, total: { $sum: '$viewCount' } } },
        ]).then((r) => r[0]?.total ?? 0),

        Post.countDocuments({
          author: authorId,
          ...visibilityFilter,
          createdAt: { $gte: currentStart },
        }),

        Post.countDocuments({
          author: authorId,
          ...visibilityFilter,
          createdAt: { $gte: previousStart, $lt: currentStart },
        }),

        Post.aggregate([
          { $match: { author: authorId, ...visibilityFilter, createdAt: { $gte: currentStart } } },
          { $group: { _id: null, total: { $sum: '$viewCount' } } },
        ]).then((r) => r[0]?.total ?? 0),

        Post.aggregate([
          { $match: { author: authorId, ...visibilityFilter, createdAt: { $gte: previousStart, $lt: currentStart } } },
          { $group: { _id: null, total: { $sum: '$viewCount' } } },
        ]).then((r) => r[0]?.total ?? 0),

        Follow.countDocuments({
          following: authorId,
          createdAt: { $gte: currentStart },
        }),

        Follow.countDocuments({
          following: authorId,
          createdAt: { $gte: previousStart, $lt: currentStart },
        }),

        Post.find({ author: authorId, ...(owner ? {} : { visibility: 'public' }) })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('author', 'username nickname avatar')
          .select('title slug summary cover tags viewCount likeCount commentCount readTime createdAt updatedAt visibility')
          .lean(),

        userPostIds.length === 0
          ? Promise.resolve([] as Types.ObjectId[])
          : ViewLog.aggregate([
              { $match: { post: { $in: userPostIds } } },
              {
                $group: {
                  _id: '$post',
                  lastViewedAt: { $max: '$createdAt' },
                },
              },
              { $sort: { lastViewedAt: -1 } },
              { $limit: 5 },
            ]).then((results) => results.map((r) => r._id)),
      ])

      const recentViewedPosts = await Post
        .find({ _id: { $in: recentViewedIds }, ...(owner ? {} : { visibility: 'public' }) })
        .populate('author', 'username nickname avatar')
        .select('title slug summary cover tags viewCount likeCount commentCount readTime createdAt updatedAt')
        .lean()

      const viewedIdStrings = (recentViewedIds as Types.ObjectId[]).map((id) => id.toString())
      const recentViewed = viewedIdStrings
        .map((id) => recentViewedPosts.find((p) => (p as any)._id.toString() === id))
        .filter(Boolean)

      return {
        totals: {
          posts: totalPosts,
          views: totalViews,
          followers: user.followersCount,
        },
        periodStats: {
          posts: currentPosts,
          views: currentViews,
          followers: currentFollowers,
        },
        changes: {
          posts: calcChange(currentPosts, previousPosts),
          views: calcChange(currentViews, previousViews),
          followers: calcChange(currentFollowers, previousFollowers),
        },
        recentPosts: {
          created: recentCreated,
          viewed: recentViewed,
        },
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'isOperational' in error) {
        throw error
      }
      logger.error('Stats query failed', { error, userId, periodDays })
      throw Errors.internal('统计数据查询失败')
    }
  },
}
