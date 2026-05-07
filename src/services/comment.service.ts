import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { Comment } from '../models/Comment'
import { Like } from '../models/Like'
import { Post } from '../models/Post'
import { notificationService } from './notification.service'
import { sanitizeHtml } from '../utils/sanitize'

interface CreateCommentInput {
  content: string
  parent?: string | null
  replyTo?: string | null
}

export const commentService = {
  async getList(postId: string, viewerId?: string) {
    const comments = await Comment.find({ post: postId, isDeleted: false })
      .populate('author', 'username nickname avatar')
      .populate('replyTo', 'username nickname')
      .sort({ createdAt: 1 })
      .lean()

    const roots: any[] = []
    const map = new Map<string, any>()

    comments.forEach((comment: any) => {
      comment.replies = []
      map.set(String(comment._id), comment)
    })

    comments.forEach((comment: any) => {
      if (comment.parent) {
        map.get(String(comment.parent))?.replies.push(comment)
      } else {
        roots.push(comment)
      }
    })

    if (viewerId && comments.length) {
      const likedIds = await Like.find({
        user: viewerId,
        targetType: 'comment',
        target: { $in: comments.map((c) => c._id) },
      }).distinct('target')
      const likedSet = new Set(likedIds.map(String))

      const markLiked = (list: any[]) => {
        list.forEach((comment: any) => {
          comment.isLiked = likedSet.has(String(comment._id))
          if (comment.replies?.length) markLiked(comment.replies)
        })
      }
      markLiked(roots)
    }

    return roots
  },

  async create(postId: string, authorId: string, data: CreateCommentInput) {
    const post = await Post.findById(postId)
    if (!post) throw Errors.notFound('文章不存在')

    if (data.parent) {
      const parentComment = await Comment.findOne({ _id: data.parent, post: postId })
      if (!parentComment) {
        throw Errors.badRequest('父评论不存在')
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: authorId,
      parent: data.parent ?? null,
      replyTo: data.replyTo ?? null,
      content: sanitizeHtml(data.content),
    })

    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } })

    if (String(post.author) !== authorId) {
      await notificationService.create({
        receiver: String(post.author),
        sender: authorId,
        type: 'comment',
        target: postId,
        targetType: 'post',
      })
    }

    if (data.replyTo && data.replyTo !== authorId) {
      await notificationService.create({
        receiver: data.replyTo,
        sender: authorId,
        type: 'reply',
        target: String(comment._id),
        targetType: 'comment',
      })
    }

    return comment.populate('author', 'username nickname avatar')
  },

  async remove(commentId: string, userId: string) {
    const comment = await Comment.findOne({ _id: commentId, author: userId })
    if (!comment) throw Errors.notFound('评论不存在或无权删除')

    comment.isDeleted = true
    comment.content = '该评论已被删除'
    await comment.save()
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } })
  },

  async like(commentId: string, userId: string) {
    const comment = await Comment.findById(commentId)
    if (!comment) throw Errors.notFound('评论不存在')

    const exists = await Like.exists({ user: userId, target: commentId, targetType: 'comment' })
    if (exists) throw Errors.conflict('已经点赞过了', ERROR_CODES.ALREADY_LIKED)

    await Promise.all([
      Like.create({ user: userId, target: commentId, targetType: 'comment' }),
      Comment.findByIdAndUpdate(commentId, { $inc: { likeCount: 1 } }),
    ])
  },

  async unlike(commentId: string, userId: string) {
    const like = await Like.findOneAndDelete({ user: userId, target: commentId, targetType: 'comment' })
    if (!like) throw Errors.badRequest('尚未点赞')

    await Comment.findByIdAndUpdate(commentId, { $inc: { likeCount: -1 } })
  },
}
