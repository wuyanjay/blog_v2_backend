import { Types } from 'mongoose'
import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { Follow } from '../models/Follow'
import { Like } from '../models/Like'
import { Post } from '../models/Post'
import { User } from '../models/User'
import { notificationService } from './notification.service'
import { sanitizeHtml } from '../utils/sanitize'

export const userService = {
  async getMe(userId: string) {
    const user = await User.findById(userId)
    if (!user) throw Errors.notFound('用户不存在')
    return user.toJSON()
  },

  async updateMe(
    userId: string,
    data: Partial<{ nickname: string; avatar: string; bio: string }>
  ) {
    const user = await User.findById(userId)
    if (!user) throw Errors.notFound('用户不存在')

    if (typeof data.nickname === 'string') user.nickname = data.nickname.trim()
    if (typeof data.avatar === 'string') user.avatar = data.avatar.trim()
    if (typeof data.bio === 'string') user.bio = sanitizeHtml(data.bio).trim()
    await user.save()

    return user.toJSON()
  },

  async getProfile(targetId: string, viewerId?: string) {
    const user = await User.findById(targetId).select(
      'username nickname avatar bio followersCount followingCount postsCount totalLikes'
    )
    if (!user) throw Errors.notFound('用户不存在')

    const profile = user.toJSON() as Record<string, unknown>
    if (viewerId) {
      profile.isFollowing = !!(await Follow.exists({
        follower: viewerId,
        following: targetId,
      }))
    }

    return profile
  },

  async follow(targetId: string, userId: string) {
    if (targetId === userId) {
      throw Errors.badRequest('不能关注自己')
    }

    const target = await User.findById(targetId)
    if (!target) throw Errors.notFound('用户不存在')

    const exists = await Follow.exists({ follower: userId, following: targetId })
    if (exists) throw Errors.conflict('已经关注过该用户', ERROR_CODES.ALREADY_FOLLOWED)

    await Follow.create({ follower: userId, following: targetId })
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } }),
    ])

    await notificationService.create({
      receiver: targetId,
      sender: userId,
      type: 'follow',
    })
  },

  async unfollow(targetId: string, userId: string) {
    const follow = await Follow.findOneAndDelete({ follower: userId, following: targetId })
    if (!follow) throw Errors.badRequest('尚未关注该用户')

    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } }),
    ])
  },

  async getUserPosts(
    targetUserId: string,
    query: { cursor?: string; limit?: number },
    viewerUserId?: string
  ) {
    const targetExists = await User.exists({ _id: targetUserId })
    if (!targetExists) throw Errors.notFound('用户不存在')

    const { cursor, limit: rawLimit } = query
    const limit = Math.min(rawLimit ?? 20, 50)

    const filter: Record<string, unknown> = {
      author: new Types.ObjectId(targetUserId),
      visibility: 'public',
    }

    if (cursor) {
      filter._id = { $lt: new Types.ObjectId(cursor) }
    }

    const posts = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username nickname avatar')
      .select('title slug summary cover tags viewCount likeCount commentCount readTime createdAt updatedAt')
      .lean()

    const hasMore = posts.length > limit
    const result = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? String(result[result.length - 1]._id) : null

    if (viewerUserId && result.length > 0) {
      const likedTargetIds = await Like.find({
        user: viewerUserId,
        target: { $in: result.map((p: any) => p._id) },
        targetType: 'post',
      }).distinct('target')

      const likedSet = new Set(likedTargetIds.map(String))
      result.forEach((p: any) => {
        p.isLiked = likedSet.has(String(p._id))
      })
    }

    return { posts: result, nextCursor }
  },

  async getMyPosts(
    userId: string,
    query: {
      visibility?: 'public' | 'private'
      page?: number
      limit?: number
    }
  ) {
    const { visibility, page = 1, limit: rawLimit } = query
    const limit = Math.min(rawLimit ?? 20, 50)
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {
      author: new Types.ObjectId(userId),
    }

    if (visibility) {
      filter.visibility = visibility
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username nickname avatar')
        .select('title slug summary cover tags visibility viewCount likeCount commentCount readTime createdAt updatedAt')
        .lean(),
      Post.countDocuments(filter),
    ])

    return { posts, total, page, limit }
  },
}
