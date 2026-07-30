import { Types } from 'mongoose'
import { Follow } from '../models/Follow'
import { Post } from '../models/Post'
import { ViewLog } from '../models/ViewLog'
import { User } from '../models/User'
import { Errors } from '../errors'
import { logger } from '../utils/logger'

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

function isOwner(currentId: string | undefined, userId: string): boolean {
  return currentId !== undefined && currentId === userId
}

export const statsService = {
  async getStats(userId: string, days?: number, currentId?: string) {
    try {
      const user = await User.findById(userId).select('_id')
      if (!user) throw Errors.notFound('用户不存在')

      const authorId = new Types.ObjectId(userId)
      const owner = isOwner(currentId, userId)
      const visibility = owner ? {} : { visibility: 'public' as const }
      const now = new Date()
      const periodMs = days ? days * 24 * 60 * 60 * 1000 : 0
      const start = days ? new Date(now.getTime() - periodMs) : null
      const prevStart = days ? new Date(now.getTime() - 2 * periodMs) : null
      const postDate = start ? { createdAt: { $gte: start } } : {}
      const viewDate = start ? { createdAt: { $gte: start } } : {}

      const postIds = await Post
        .find({ author: authorId, ...visibility })
        .select('_id')
        .lean()
        .then((posts) => posts.map((post) => post._id))

      const [
        totalPosts,
        totalViews,
        totalFollowers,
        currentPosts,
        previousPosts,
        currentViews,
        previousViews,
        currentFollowers,
        previousFollowers,
        recentCreated,
        recentViewedIds,
      ] = await Promise.all([
        Post.countDocuments({ author: authorId, ...visibility }),

        Post.aggregate([
          { $match: { author: authorId, ...visibility } },
          { $group: { _id: null, total: { $sum: '$viewCount' } } },
        ]).then((rows) => rows[0]?.total ?? 0),

        Follow.countDocuments({ following: authorId }),

        days
          ? Post.countDocuments({
              author: authorId,
              ...visibility,
              ...postDate,
            })
          : Promise.resolve(0),

        days && start && prevStart
          ? Post.countDocuments({
              author: authorId,
              ...visibility,
              createdAt: { $gte: prevStart, $lt: start },
            })
          : Promise.resolve(0),

        days && postIds.length > 0
          ? ViewLog.countDocuments({
              post: { $in: postIds },
              ...viewDate,
            })
          : Promise.resolve(0),

        days && start && prevStart && postIds.length > 0
          ? ViewLog.countDocuments({
              post: { $in: postIds },
              createdAt: { $gte: prevStart, $lt: start },
            })
          : Promise.resolve(0),

        days && start
          ? Follow.countDocuments({
              following: authorId,
              createdAt: { $gte: start },
            })
          : Promise.resolve(0),

        days && start && prevStart
          ? Follow.countDocuments({
              following: authorId,
              createdAt: { $gte: prevStart, $lt: start },
            })
          : Promise.resolve(0),

        Post.find({
          author: authorId,
          ...visibility,
          ...postDate,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('author', 'username nickname avatar')
          .select(
            'title slug summary cover tags visibility viewCount likeCount commentCount readTime createdAt updatedAt',
          )
          .lean(),

        postIds.length === 0
          ? Promise.resolve([] as Types.ObjectId[])
          : ViewLog.aggregate([
              {
                $match: {
                  post: { $in: postIds },
                  ...viewDate,
                },
              },
              {
                $group: {
                  _id: '$post',
                  lastViewedAt: { $max: '$createdAt' },
                },
              },
              { $sort: { lastViewedAt: -1 } },
              { $limit: 5 },
            ]).then((rows) => rows.map((row) => row._id)),
      ])

      const viewedPosts = await Post
        .find({ _id: { $in: recentViewedIds }, ...visibility })
        .populate('author', 'username nickname avatar')
        .select(
          'title slug summary cover tags visibility viewCount likeCount commentCount readTime createdAt updatedAt',
        )
        .lean()

      const viewedIds = (recentViewedIds as Types.ObjectId[]).map(String)
      const recentViewed = viewedIds
        .map((id) => viewedPosts.find((post) => String(post._id) === id))
        .filter(Boolean)

      const periodStats = days
        ? {
            posts: currentPosts,
            views: currentViews,
            followers: currentFollowers,
          }
        : {
            posts: totalPosts,
            views: totalViews,
            followers: totalFollowers,
          }

      const changes = days
        ? {
            posts: calcChange(currentPosts, previousPosts),
            views: calcChange(currentViews, previousViews),
            followers: calcChange(currentFollowers, previousFollowers),
          }
        : {
            posts: null,
            views: null,
            followers: null,
          }

      return {
        totals: {
          posts: totalPosts,
          views: totalViews,
          followers: totalFollowers,
        },
        periodStats,
        changes,
        recentPosts: {
          created: recentCreated,
          viewed: recentViewed,
        },
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'isOperational' in error) {
        throw error
      }
      logger.error('Stats query failed', { error, userId, days })
      throw Errors.internal('统计数据查询失败')
    }
  },
}
